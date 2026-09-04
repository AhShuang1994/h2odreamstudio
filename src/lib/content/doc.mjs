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
import { englishTitle, englishDescription, urlsFor, attrOf, iterTags, textOf } from "./html.mjs";

const ROOT = process.cwd();

/** 原稿里 head 上的中文 title / description —— 中文版原样沿用。 */
function chineseMeta(source) {
  const head = source.split("</head>")[0] ?? source;
  const title = /<title>([\s\S]*?)<\/title>/.exec(head)?.[1] ?? "";
  let description = "";
  for (const tag of iterTags(head)) {
    if (tag.name === "meta" && attrOf(tag.raw, "name") === "description") {
      description = attrOf(tag.raw, "content") ?? "";
      break;
    }
  }
  return { title: textOf(title), description };
}

function load(section, file) {
  const rel = `${section.id}/${file}`;
  const source = readFileSync(join(ROOT, section.dir, file), "utf8");
  const zh = chineseMeta(source);
  return {
    section: section.id,
    /** 不带扩展名的文件名 —— 未来 Next 动态路由的 `[slug]`。 */
    slug: file.replace(/\.html$/, ""),
    /** 相对 `src/content/pages/` 的路径，也是英文版在 `public/` 下的输出路径。 */
    rel,
    /** 原稿所在目录，`toAbsolute()` 拿它把相对链接接对。 */
    dir: section.id,
    isIndex: file === "index.html",
    /** 两种语言的**已收录地址**，一个字都不能动。 */
    urls: urlsFor(rel),
    source,
    title: { en: englishTitle(source), zh: zh.title },
    description: { en: englishDescription(source), zh: zh.description },
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
