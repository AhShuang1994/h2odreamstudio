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
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, posix } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src/content/pages");
const OUT = join(ROOT, "public");
const DOMAIN = "https://www.h2o-dreamer-studio.com";

/** 走 Next 路由的核心页 —— 中文版在 /zh 下，内容页的导航要跟着换。 */
const CORE_PATHS = new Set(["/", "/about", "/contact", "/pricing"]);

// ── HTML 小工具 ──────────────────────────────────────────────────────

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr",
]);

/** 属性值里的实体还原成原文 —— 标注里存的是转义过的 HTML 片段。 */
function decodeAttr(v) {
  return v
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * 从 `<` 扫到配对的 `>`，跳过引号里的内容。
 *
 * ⚠️ 不能用 `<[^>]*>` 这类正则：双语标注的值里带着 `<em>` 这样的标签，
 * 属性值里真的有 `>`。这是这个脚本最容易踩的坑。
 */
function tagEnd(html, start) {
  let quote = null;
  for (let i = start + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i + 1;
    }
  }
  throw new Error(`偏移 ${start} 处的标签没有闭合`);
}

/** 依次吐出文档里的每个标签。 */
function* iterTags(html, from = 0) {
  for (let i = html.indexOf("<", from); i !== -1; i = html.indexOf("<", i)) {
    if (!/[a-zA-Z/]/.test(html[i + 1] ?? "")) {
      i++;
      continue;
    }
    const end = tagEnd(html, i);
    const raw = html.slice(i, end);
    const name = /^<\/?\s*([a-zA-Z0-9]+)/.exec(raw)?.[1]?.toLowerCase();
    if (name) {
      yield {
        start: i,
        end,
        raw,
        name,
        isClose: raw[1] === "/",
        selfClose: raw.endsWith("/>") || VOID_TAGS.has(name),
      };
    }
    i = end;
  }
}

/** 从 `open` 处的开始标签找到它的配对结束标签，返回内部区间与整体终点。 */
function matchElement(html, openStart) {
  const openEnd = tagEnd(html, openStart);
  const name = /^<\s*([a-zA-Z0-9]+)/.exec(html.slice(openStart))[1].toLowerCase();
  if (VOID_TAGS.has(name) || html.slice(openStart, openEnd).endsWith("/>")) {
    return { name, innerStart: openEnd, innerEnd: openEnd, end: openEnd };
  }
  let depth = 1;
  for (const tag of iterTags(html, openEnd)) {
    if (tag.name !== name || tag.selfClose) continue;
    if (tag.isClose) {
      if (--depth === 0) {
        return { name, innerStart: openEnd, innerEnd: tag.start, end: tag.end };
      }
    } else {
      depth++;
    }
  }
  throw new Error(`<${name}> 没有配对的结束标签（偏移 ${openStart}）`);
}

/** 页面里所有带双语标注的开始标签，按出现顺序。 */
function* annotatedTags(html) {
  for (const tag of iterTags(html)) {
    if (!tag.isClose && /\sdata-lang-(?:en|cn)=/.test(tag.raw)) yield tag;
  }
}

/** 去掉标签，把 HTML 片段压成纯文本。 */
function textOf(html) {
  return decodeAttr(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * 把每个带双语标注的元素塌成一种语言：内部内容换成该语言的标注值，
 * 两个标注属性一并删掉。这与原先那段运行时 JS 做的事逐字一致。
 */
function collapse(html, lang) {
  const attr = lang === "zh" ? "data-lang-cn" : "data-lang-en";
  let out = "";
  let cursor = 0;
  for (const tag of annotatedTags(html)) {
    // 嵌套在已处理元素里的标注已经随内容一起被换掉了，跳过
    if (tag.start < cursor) continue;
    const { innerStart, innerEnd } = matchElement(html, tag.start);
    const picked = new RegExp(`\\s${attr}="([^"]*)"`).exec(tag.raw);
    const cleanOpen = tag.raw.replace(/\s+data-lang-(?:en|cn)="[^"]*"/g, "");

    out += html.slice(cursor, tag.start) + cleanOpen;
    out += picked ? decodeAttr(picked[1]) : html.slice(innerStart, innerEnd);
    cursor = innerEnd;
  }
  return out + html.slice(cursor);
}

// ── FAQ ─────────────────────────────────────────────────────────────

/**
 * 页面上那段可见问答 —— FAQPage 结构化数据的**唯一**来源。
 *
 * Google 明令禁止用页面上不可见的内容做 FAQ 标记。旧站的 16 个内容页把 74 条
 * 问答只写在 JSON-LD 里、页面上一个字都看不到（#82），所以现在反过来做：
 * 问答先渲染成可见的 `<details class="faq-item">`，标记从它生成。原稿里没有可见
 * 问答的页面（两个索引页）就没有 FAQPage —— 这条路上不可能再出现不可见的标记。
 */
function visibleFaq(body) {
  const items = [];
  for (const m of body.matchAll(/<details class="faq-item"[^>]*>([\s\S]*?)<\/details>/g)) {
    const summary = /<summary>([\s\S]*?)<\/summary>/.exec(m[1])?.[1] ?? "";
    const answer = /<div class="faq-answer"[^>]*>([\s\S]*?)<\/div>/.exec(m[1])?.[1] ?? "";
    // 展开图标（+）是装饰，不是问题的一部分
    const question = textOf(summary.replace(/<span class="faq-chevron">[\s\S]*?<\/span>/g, ""));
    if (question && answer) items.push({ question, answer: textOf(answer) });
  }
  return items;
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

// ── 幕布转场 ────────────────────────────────────────────────────────

/**
 * 内容页也要有幕布，用的是核心页那份实现原文。
 *
 * 只给核心页做转场会造成「点关于页有幕布、点 blog 白屏硬跳」的不一致，
 * 比完全没有幕布更糟 —— 所以这段注入是 #66 的硬要求，不是锦上添花。
 *
 * 同步加载、不带 defer：带着幕布到达的那一下必须在首次绘制之前成立。
 * 脚本自己会在减弱动态偏好下整套让开。
 */
const CURTAIN =
  `  <!-- 幕布转场 —— 与核心页共用一份实现，见 public/js/curtain.js -->\n` +
  `  <script src="/js/curtain.js"></script>\n\n`;

// ── 地址 ────────────────────────────────────────────────────────────

/**
 * 相对地址 → 站点根绝对地址，顺便把 `…/index.html` 归成目录形态。
 *
 * 目录形态才是索引页的规范地址（sitemap 与 canonical 里写的是 `/blog/`），
 * 原稿里那些 `index.html` 是相对链接的写法，不是规范地址。
 */
function normalizePath(path) {
  return path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
}

/** 原稿里的相对地址 → 站点根绝对地址。原稿都在 <dir>/x.html 这一层。 */
function toAbsolute(href, dir) {
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;
  const [path, hash] = href.split("#");
  const abs = normalizePath(
    href.startsWith("/") ? posix.normalize(path) : posix.normalize(posix.join("/", dir, path || ".")),
  );
  return hash === undefined ? abs : `${abs}#${hash}`;
}

/** 中文版的站内地址：核心页与内容页都挪到 /zh 下，资源与静态服务页不动。 */
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

/** 改写 href / src / srcset / poster 里的站内地址。 */
function rewriteUrls(html, dir, lang) {
  return html.replace(
    /\b(href|src|poster)="([^"]*)"/g,
    (whole, attrName, value) => {
      const abs = toAbsolute(value, dir);
      const final = lang === "zh" ? localize(abs) : abs;
      return `${attrName}="${final}"`;
    },
  );
}

// ── head ────────────────────────────────────────────────────────────

/**
 * 每页两种语言的地址。
 *
 * 文章页带 `.html`、索引页是目录形态 —— 这两种都是**已收录的原样**，
 * 一个字都不能动，llms.txt 给 AI 的引文地址也是它们。
 */
function urlsFor(rel) {
  const path = normalizePath(`/${rel}`);
  return { en: path, zh: `/zh${path}` };
}

/** 取标签上某个属性的值。 */
function attrOf(tagRaw, name) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tagRaw)?.[1] ?? null;
}

/** 英文 title 取 h1 的英文标注 —— 那是作者自己写的英文标题，不是新造的。 */
function englishTitle(source) {
  for (const tag of annotatedTags(source)) {
    if (tag.name !== "h1") continue;
    const en = attrOf(tag.raw, "data-lang-en");
    if (en) return `${textOf(decodeAttr(en))} · H2ODreamer Studio`;
  }
  throw new Error("找不到带英文标注的 <h1>");
}

/**
 * 英文 description 取正文里第一段有实质长度的英文标注。
 * 内容页的第一段是「快速答案」或导语，本来就是写给人一眼看懂的。
 */
function englishDescription(source) {
  const body = source.split("</head>")[1] ?? source;
  for (const tag of annotatedTags(body)) {
    if (tag.name !== "p") continue;
    const en = attrOf(tag.raw, "data-lang-en");
    if (!en) continue;
    const text = textOf(decodeAttr(en));
    if (text.length >= 60) return trim(text, 160);
  }
  throw new Error("找不到够长的英文段落做 description");
}

/** 截到词边界，不切半个词。 */
function trim(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
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

function rewriteHead(head, { lang, rel, title, description }) {
  const urls = urlsFor(rel);
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

// ── 语言切换 ────────────────────────────────────────────────────────

/**
 * 运行时切换的按钮换成指向对应语言地址的链接。
 *
 * `id` 保留 —— `js/main.js` 用它把切换器复制进手机汉堡菜单。切换本身那段
 * 逻辑会认出这是 `<a>` 然后让开，见该文件里的注释。
 */
function rewriteLangToggle(html, rel, lang) {
  const urls = urlsFor(rel);
  const target = lang === "zh" ? urls.en : urls.zh;
  const other = lang === "zh" ? "English" : "中文";
  return html.replace(
    /<button class="lang-toggle" id="langToggle"[\s\S]*?<\/button>/,
    `<a class="lang-toggle" id="langToggle" href="${target}"` +
      ` hreflang="${lang === "zh" ? "en" : "zh-CN"}"` +
      ` aria-label="Switch to ${other} / 切换语言">\n` +
      `        <span class="lang-en${lang === "en" ? " active" : ""}">EN</span>` +
      ` / <span class="lang-cn${lang === "zh" ? " active" : ""}">中文</span>\n` +
      `      </a>`,
  );
}

// ── 主流程 ──────────────────────────────────────────────────────────

function render(source, { rel, dir, lang, title, description }) {
  const cut = source.indexOf("</head>");
  const head = rewriteHead(source.slice(0, cut), { lang, rel, title, description });
  const body = collapse(source.slice(cut), lang);
  // FAQPage 生成在 body 塌成单语之后 —— 标记里的问答与页面上看到的逐字相同
  let html = head + faqScript(body) + CURTAIN + body;
  html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${lang === "zh" ? "zh" : "en"}"`);
  html = rewriteUrls(html, dir, lang);
  html = rewriteLangToggle(html, rel, lang);
  return html;
}

function main() {
  const dirs = readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let count = 0;
  for (const dir of dirs) {
    for (const file of readdirSync(join(SRC, dir)).filter((f) => f.endsWith(".html"))) {
      const rel = `${dir}/${file}`;
      const source = readFileSync(join(SRC, rel), "utf8");
      const title = englishTitle(source);
      const description = englishDescription(source);

      for (const [lang, outRel] of [
        ["en", rel],
        ["zh", `zh/${rel}`],
      ]) {
        const target = join(OUT, outRel);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, render(source, { rel, dir, lang, title, description }), "utf8");
      }
      count++;
    }
  }
  console.log(`split-content-lang: ${count} 个双语原稿 → ${count * 2} 份单语页面`);
}

main();
