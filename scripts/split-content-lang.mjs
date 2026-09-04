/**
 * 静态内容页的语言拆分 —— 构建期运行（#76）。
 *
 * 输入是 `src/content/pages/` 下的**双语原稿**：每个文本节点成对挂着
 * `data-lang-en` / `data-lang-cn`，渲染出来的是中文，靠一段 JS 在运行时改
 * innerHTML 来切换。那套方案要拆掉 —— 隐藏的那一半量不到宽度，逐行揭示会
 * 失败；同页两套正文也不是搜索引擎推荐的做法。见 ADR-0002。
 *
 * 输出两份单语页面：
 *   public/blog/x.html        ← 英文，**沿用已收录的原地址**
 *   public/zh/blog/x.html     ← 中文，落在 /zh 下的对应地址
 *
 * 原稿不动，所以脚本可重复运行、同输入同输出。**不要手改 public/blog/**
 * 与 public/zh/** —— 改原稿。
 *
 * 正文一字不改：两份输出的文本逐字来自原稿的两个标注，脚本只做五件事 ——
 * 挑语言、改 `<html lang>`、补 canonical 与 hreflang、把相对地址接对，
 * 以及从页面上那段**可见**问答生成 FAQPage 结构化数据（#82）。
 *
 * ⚠️ 解析与塌语言的原语已经搬进 `src/lib/content/`，因为内容页正在迁进 Next
 * 路由，两边必须对同一份原稿给出逐字相同的结果。**这里只剩「拼一份完整 HTML
 * 文档」的活** —— head 改写、语言切换器、动效外壳。等最后一个家族迁完，
 * 整个脚本删掉，`src/lib/content/` 留下。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { headInline, bodyScripts } from "./lib/motion-tags.mjs";
import { listDocs } from "../src/lib/content/doc.mjs";
import { SECTIONS } from "../src/lib/content/manifest.mjs";
import { collapse, visibleFaq, rewriteUrls } from "../src/lib/content/html.mjs";

const OUT = join(process.cwd(), "public");
const DOMAIN = "https://www.h2o-dreamer-studio.com";

/** 走 Next 路由的核心页 —— 中文版在 /zh 下，内容页的导航要跟着换。 */
const CORE_PATHS = new Set(["/", "/about", "/contact", "/pricing"]);

/**
 * 中文版的站内地址：核心页与内容页都挪到 /zh 下，资源与静态服务页不动。
 *
 * ⚠️ 口径与 `src/lib/i18n.ts` 的 `localize()` 逐字对应 —— 两边对同一个地址必须
 * 给出同一个答案，否则核心页与内容页的导航会分叉。等这个脚本删掉就只剩那一份。
 */
function localize(href) {
  if (!href.startsWith("/")) return href;
  const [path, hash] = href.split("#");
  const zh = CORE_PATHS.has(path)
    ? path === "/"
      ? "/zh"
      : `/zh${path}`
    : /^\/(blog|case-studies)\//.test(path)
      ? `/zh${path}`
      : null;
  if (zh === null) return href;
  return hash === undefined ? zh : `${zh}#${hash}`;
}

/** 可见问答 → FAQPage 的 JSON-LD 块。没有问答就不产出，返回空串。 */
function faqScript(body) {
  const items = visibleFaq(body);
  if (items.length === 0) return "";
  const node = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const json = JSON.stringify(node, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return (
    `  <!-- FAQ — 由页面上那段可见问答生成，见 scripts/split-content-lang.mjs -->\n` +
    `  <script type="application/ld+json">\n${json}\n  </script>\n\n`
  );
}

function escapeAttr(v) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** 换掉 head 里一处 meta 的 content；没有这条就原样返回。 */
function setMeta(head, matcher, value) {
  return head.replace(matcher, (whole) =>
    whole.replace(/content="[^"]*"/, `content="${escapeAttr(value)}"`),
  );
}

function rewriteHead(head, { lang, urls, title, description }) {
  const self = `${DOMAIN}${urls[lang]}`;
  let out = head;

  if (lang === "en") {
    out = out.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>`,
    );
    out = setMeta(out, /<meta\s+name="description"[^>]*>/, description);
    out = setMeta(out, /<meta\s+property="og:title"[^>]*>/, title);
    out = setMeta(out, /<meta\s+property="og:description"[^>]*>/, description);
    out = setMeta(out, /<meta\s+name="twitter:title"[^>]*>/, title);
    out = setMeta(out, /<meta\s+name="twitter:description"[^>]*>/, description);
    // 中文关键词对英文页没有意义，留着只会是噪音
    out = out.replace(/\s*<meta\s+name="keywords"[^>]*>\n?/, "\n");
    // BlogPosting / Article 的 headline 与 description 跟着走
    out = out.replace(
      /("headline":\s*)"(?:[^"\\]|\\.)*"/,
      (_, k) => `${k}${JSON.stringify(title)}`,
    );
    out = out.replace(
      /("@type":\s*"(?:BlogPosting|Article)"[\s\S]*?"description":\s*)"(?:[^"\\]|\\.)*"/,
      (_, k) => `${k}${JSON.stringify(description)}`,
    );
  }

  out = setMeta(out, /<meta\s+property="og:url"[^>]*>/, self);
  out = setMeta(
    out,
    /<meta\s+property="og:locale"[^>]*>/,
    lang === "zh" ? "zh_CN" : "en_US",
  );
  out = setMeta(
    out,
    /<meta\s+property="og:locale:alternate"[^>]*>/,
    lang === "zh" ? "en_US" : "zh_CN",
  );

  // canonical 指向自己，hreflang 中英双向互指、x-default 给主语言
  const links =
    `<link rel="canonical" href="${self}">\n` +
    `  <link rel="alternate" hreflang="en" href="${DOMAIN}${urls.en}">\n` +
    `  <link rel="alternate" hreflang="zh-CN" href="${DOMAIN}${urls.zh}">\n` +
    `  <link rel="alternate" hreflang="x-default" href="${DOMAIN}${urls.en}">`;
  out = out.replace(/<link\s+rel="canonical"[^>]*>/, links);

  return out;
}

/**
 * 运行时切换的按钮换成指向对应语言地址的链接。
 *
 * `id` 保留 —— `js/main.js` 用它把切换器复制进手机汉堡菜单。切换本身那段
 * 逻辑会认出这是 `<a>` 然后让开，见该文件里的注释。
 */
function rewriteLangToggle(html, urls, lang) {
  const target = lang === "zh" ? urls.en : urls.zh;
  const other = lang === "zh" ? "English" : "中文";
  return html.replace(
    /<button class="lang-toggle" id="langToggle"[\s\S]*?<\/button>/,
    `<a class="lang-toggle" id="langToggle" href="${target}"` +
      ` hreflang="${lang === "zh" ? "en" : "zh-CN"}"` +
      ` aria-label="Switch to ${other} / 切换语言">\n` +
      // 中文在前，与核心页的 LangToggle 一致（src/components/LangToggle.tsx）。
      `        <span class="lang-cn${lang === "zh" ? " active" : ""}">中文</span>` +
      ` / <span class="lang-en${lang === "en" ? " active" : ""}">EN</span>\n` +
      `      </a>`,
  );
}

/**
 * 注入动效外壳（#89）。幕布必须覆盖**全部**页面，包括这些静态内容页 ——
 * 只覆盖核心页会造成「点关于页有幕布、点 blog 白屏硬跳」，见 ADR-0001。
 *
 * 内联那段要早于首帧，所以进 `<head>`；外壳本体 defer 到 `</body>` 之前。
 */
function injectMotion(html) {
  return html
    .replace("</head>", `  <script>${headInline}</script>\n</head>`)
    .replace("</body>", `  ${bodyScripts}\n</body>`);
}

function render(doc, lang) {
  const { source, dir, urls } = doc;
  const cut = source.indexOf("</head>");
  const head = rewriteHead(source.slice(0, cut), {
    lang,
    urls,
    title: doc.title.en,
    description: doc.description.en,
  });
  const body = collapse(source.slice(cut), lang);
  // FAQPage 生成在 body 塌成单语之后 —— 标记里的问答与页面上看到的逐字相同
  let html = head + faqScript(body) + body;
  html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${lang === "zh" ? "zh" : "en"}"`);
  html = rewriteUrls(html, dir, lang === "zh" ? localize : (href) => href);
  return injectMotion(rewriteLangToggle(html, urls, lang));
}

function main() {
  // 已经迁进 Next 路由的家族由 src/app/** 渲染，这里不再产出 —— 见 manifest.mjs。
  // 陈旧产物由 scripts/clean-legacy-output.mjs 在本脚本之前清掉，否则会和路由撞车。
  const owned = new Set(SECTIONS.filter((s) => s.nextOwned).map((s) => s.id));
  const docs = listDocs().filter((d) => !owned.has(d.section));
  if (docs.length === 0) {
    console.log("split-content-lang: 所有家族都已迁进 Next 路由，这个脚本可以删了");
    return;
  }
  for (const doc of docs) {
    for (const [lang, outRel] of [
      ["en", doc.rel],
      ["zh", `zh/${doc.rel}`],
    ]) {
      const target = join(OUT, outRel);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, render(doc, lang), "utf8");
    }
  }
  console.log(`split-content-lang: ${docs.length} 个双语原稿 → ${docs.length * 2} 份单语页面`);
}

main();
