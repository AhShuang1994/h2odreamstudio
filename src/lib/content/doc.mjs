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
import {
  englishTitle,
  englishDescription,
  urlsFor,
  attrOf,
  iterTags,
  textOf,
  matchElement,
  collapse,
  rewriteUrls,
} from "./html.mjs";

const ROOT = process.cwd();

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

function load(section, file) {
  const rel = `${section.id}/${file}`;
  const source = readFileSync(join(ROOT, section.dir, file), "utf8");
  const head = source.split("</head>")[0] ?? source;
  const zh = chineseMeta(source);
  const dir = section.id;
  const title = { en: englishTitle(source), zh: zh.title };
  const description = { en: englishDescription(source), zh: zh.description };
  const raw = mainInner(source);

  return {
    section: section.id,
    /** 不带扩展名的文件名 —— Next 动态路由的 `[slug]`。 */
    slug: file.replace(/\.html$/, ""),
    /** 相对 `src/content/pages/` 的路径，也是英文版在 `public/` 下的输出路径。 */
    rel,
    /** 原稿所在目录，`toAbsolute()` 拿它把相对链接接对。 */
    dir,
    isIndex: file === "index.html",
    /** 两种语言的**已收录地址**，一个字都不能动。 */
    urls: urlsFor(rel),
    source,
    title,
    description,
    headStyle: headStyleOf(head),
    meta: {
      image: metaOf(head, "og:image"),
      datePublished: metaOf(head, "article:published_time"),
      section: metaOf(head, "article:section"),
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
