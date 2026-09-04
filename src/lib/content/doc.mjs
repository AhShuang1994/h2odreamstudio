/**
 * 双语原稿的加载器 —— 把 `src/content/pages/**` 读成一组 ContentDoc。
 *
 * 每份原稿是一个完整的独立 HTML 文档，两种语言并存在 `data-lang-en` /
 * `data-lang-cn` 属性里。这里只负责**读出来 + 算出两种语言的地址与 meta**；
 * 塌成单语、改地址这些动作归 `html.mjs`，由调用方按需要调。
 *
 * 之所以英文的 title / description 在这里就算好：它们取自原稿里作者自己写的
 * `<h1>` 与第一段英文标注（不是新造的文案），两个消费者要拿到同一份。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SECTIONS } from "./manifest.mjs";
import prices from "../../content/prices.json" with { type: "json" };
import {
  titleFromH1,
  descriptionFromBody,
  urlsFor,
  attrOf,
  iterTags,
  textOf,
  matchElement,
  collapse,
  rewriteUrls,
} from "./html.mjs";

const ROOT = process.cwd();

/**
 * 把 `{{starter}}` 这类占位符换成 `src/content/prices.json` 里的价格。
 *
 * 在解析之前对**整份原稿**跑一遍，所以可见文本、成对的 `data-lang-*` 属性值、
 * 以及 JSON-LD 三处一起命中 —— 三处脱节正是这四个页面以前的老毛病。
 *
 * `{{starterNum}}` 给 JSON-LD 的 `minPrice` 用：它是数字，不能带 `RM ` 和逗号。
 *
 * 用不存在的键会抛错，不是静默留着占位符 —— 页面上出现 `{{typo}}` 比构建失败
 * 难发现得多，而这是商业页面上的价格。
 */
function fillPrices(source, rel) {
  return source.replace(/\{\{(\w+)\}\}/g, (whole, key) => {
    const num = key.endsWith("Num");
    const value = prices[num ? key.slice(0, -3) : key];
    if (value === undefined) throw new Error(`${rel} 里的 ${whole} 在 prices.json 里没有对应的键`);
    return num ? value.replace(/[^0-9]/g, "") : value;
  });
}

/** 有没有汉字 —— 用来判断原稿 head 上那份 meta 到底是不是中文的。 */
function hasCJK(text) {
  return /[一-鿿]/.test(text ?? "");
}

/** head 里某条 meta 的 content。`key` 是 name= 或 property= 的值。 */
function metaOf(head, key) {
  for (const tag of iterTags(head)) {
    if (tag.name !== "meta") continue;
    if (attrOf(tag.raw, "name") === key || attrOf(tag.raw, "property") === key) {
      return attrOf(tag.raw, "content");
    }
  }
  return null;
}

/** 原稿里 head 上的中文 title / description —— 中文版原样沿用。 */
function chineseMeta(source) {
  const head = source.split("</head>")[0] ?? source;
  const title = /<title>([\s\S]*?)<\/title>/.exec(head)?.[1] ?? "";
  return { title: textOf(title), description: metaOf(head, "description") ?? "" };
}

/**
 * `<main>` 的内部内容 —— 正文，也是**唯一**要搬进 Next 路由的部分。
 *
 * 已实测：22 份原稿每份恰好一个 `<main>`。它之外的 `<head>`、`<nav>`、
 * WhatsApp 悬浮按钮、`<footer>`、`<script src="../js/main.min.js">` 全是外壳，
 * 迁进 Next 之后由 `Shell.tsx` 那一套替换。
 */
function mainInner(source) {
  const open = source.indexOf("<main");
  if (open === -1) throw new Error("原稿里找不到 <main>");
  const { innerStart, innerEnd } = matchElement(source, open);
  return source.slice(innerStart, innerEnd);
}

/**
 * head 里的内联 `<style>`。
 *
 * ⚠️ 不是可有可无：`blog/index.html` 用它定义了 blog-grid / blog-card 等 11 个类，
 * **任何样式表里都没有**。不带过去，博客首页会完全裸奔。
 */
function headStyleOf(head) {
  const open = head.indexOf("<style");
  if (open === -1) return null;
  const { innerStart, innerEnd } = matchElement(head, open);
  return head.slice(innerStart, innerEnd);
}

/** head 里的 JSON-LD 块，原样取出（原稿自带 BlogPosting / Article 节点）。 */
function jsonLdBlocks(head) {
  const blocks = [];
  for (const tag of iterTags(head)) {
    if (tag.name !== "script" || tag.isClose) continue;
    if (attrOf(tag.raw, "type") !== "application/ld+json") continue;
    const { innerStart, innerEnd } = matchElement(head, tag.start);
    blocks.push(head.slice(innerStart, innerEnd).trim());
  }
  return blocks;
}

/** 地址的目录部分，去掉首尾斜杠 —— `/blog/x.html` → `blog`，`/landing-page` → ``。 */
function dirOf(url) {
  return url.replace(/^\//, "").replace(/[^/]*$/, "").replace(/\/$/, "");
}

function load(section, file) {
  const rel = `${section.id}/${file}`;
  const slug = file.replace(/\.html$/, "");
  const raw0 = readFileSync(join(ROOT, section.dir, file), "utf8");
  const source = section.prices ? fillPrices(raw0, rel) : raw0;
  const head = source.split("</head>")[0] ?? source;
  const zh = chineseMeta(source);

  // 英文一直从 <h1> 的标注取（原稿的 <title> 是中文）。中文优先用原稿 head 上
  // 那份手写的 —— 它是已收录的中文标题；但服务页那四份 head 只有英文（历史上
  // 它们只有一个英文地址），那时退回同样从 <h1> 的中文标注取。
  const zhHead = hasCJK(zh.title);
  const title = { en: titleFromH1(source, "en"), zh: zhHead ? zh.title : titleFromH1(source, "zh") };
  const description = {
    en: descriptionFromBody(source, "en"),
    zh: hasCJK(zh.description) ? zh.description : descriptionFromBody(source, "zh"),
  };
  const raw = mainInner(source);

  /**
   * 两种语言的**已收录地址**，一个字都不能动。
   *
   * 默认从相对路径推（文章页带 `.html`、索引页是目录形态）。服务页的地址不带
   * 分区名（`/landing-page` 而不是 `/services/landing-page`），推不出来，
   * 由 manifest 显式给。
   */
  const urls = section.url
    ? { en: section.url(slug), zh: `/zh${section.url(slug)}` }
    : urlsFor(rel);
  const dir = dirOf(urls.en);

  return {
    section: section.id,
    /** 不带扩展名的文件名 —— Next 动态路由的 `[slug]`。 */
    slug,
    /** 相对 `src/content/pages/` 的路径，也是英文版在 `public/` 下的输出路径。 */
    rel,
    /**
     * 相对链接的基准目录 —— 取自**地址**，不是分区名。
     *
     * 原稿里的图片写成 `assets/portfolio/x.webp` 这种相对路径。文章页住在
     * `/blog/x.html`，基准是 `blog/`，两者恰好同名；服务页住在根上的
     * `/landing-page`，基准是空 —— 拿分区名会解析成 `/services/assets/...`，
     * 32 张图全部 404（`assets.test.ts` 抓到过）。
     */
    dir,
    isIndex: file === "index.html",
    urls,
    source,
    title,
    description,
    headStyle: headStyleOf(head),
    meta: {
      image: metaOf(head, "og:image"),
      datePublished: metaOf(head, "article:published_time"),
      section: metaOf(head, "article:section"),
      /** 原稿自己声明的 og:type —— 文章是 article，服务页与索引页是 website。 */
      ogType: metaOf(head, "og:type") === "article" ? "article" : "website",
    },

    /**
     * 正文，塌成一种语言、站内地址已改绝对。
     *
     * `localize` 由调用方给：Next 侧传 `src/lib/i18n.ts` 那一份（`href =>
     * localize(href, lang)`），英文版本来就是恒等。传进来而不是写死，是因为
     * 迁移期间脚本（纯 Node）也用这个模块，而它 import 不了 `.ts`。
     */
    bodyHtml(lang, localize = (href) => href) {
      return rewriteUrls(collapse(raw, lang), dir, localize);
    },

    /**
     * 原稿自带的 JSON-LD，原样返回；英文版把 headline 与 description 换成
     * 英文那一份 —— 与 `scripts/split-content-lang.mjs` 里 `rewriteHead()` 做的
     * 是同两处替换，所以 `content-lang.test.ts` 的块数不变量继续成立。
     *
     * **不要往里加 businessNode()** —— `geo.test.ts` 只要求 8 个核心页带
     * `#business`，加了会打破块数断言。
     */
    jsonLd(lang) {
      const blocks = jsonLdBlocks(head);
      if (lang !== "en") return blocks;
      return blocks.map((b) =>
        b
          .replace(/("headline":\s*)"(?:[^"\\]|\\.)*"/, (_, k) => `${k}${JSON.stringify(title.en)}`)
          .replace(
            /("@type":\s*"(?:BlogPosting|Article)"[\s\S]*?"description":\s*)"(?:[^"\\]|\\.)*"/,
            (_, k) => `${k}${JSON.stringify(description.en)}`,
          ),
      );
    },
  };
}

/** 全部原稿，按分区表顺序、目录内按文件名。不传 `sectionId` 就是全部。 */
export function listDocs(sectionId) {
  const sections = sectionId ? SECTIONS.filter((s) => s.id === sectionId) : SECTIONS;
  return sections.flatMap((section) =>
    readdirSync(join(ROOT, section.dir))
      .filter((f) => f.endsWith(".html"))
      .sort()
      .map((file) => load(section, file)),
  );
}

/** 取一份原稿。找不到就抛 —— 静态导出期拿不到的 slug 是构建错误，不是 404。 */
export function getDoc(sectionId, slug) {
  const doc = listDocs(sectionId).find((d) => d.slug === slug);
  if (!doc) throw new Error(`${sectionId} 下没有 ${slug} 这份原稿`);
  return doc;
}
