/**
 * 双语原稿的 HTML 原语 —— 解析、塌成单语、改写站内地址。
 *
 * 这些函数原先住在 `scripts/split-content-lang.mjs` 里。抽出来是因为内容页要迁
 * 进 Next 路由（见 `docs/adr/0002-bilingual-separate-routes.md` 与迁移计划）：
 * 迁移期间脚本与 Next 服务端组件必须对同一份原稿给出**逐字相同**的结果。
 *
 * **写成 `.mjs` 而不是 `.ts` 是刻意的**：Node 跑的脚本 import 不了 `.ts`。同一个
 * 文件被两边 import，分叉就不是靠注释约束，而是结构上不可能发生。最后一个家族
 * 迁完之后脚本删掉，这个模块留下。类型见同目录的 `doc.d.mts`。
 */
import { posix } from "node:path";

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr",
]);

/** 属性值里的实体还原成原文 —— 标注里存的是转义过的 HTML 片段。 */
export function decodeAttr(v) {
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
 * 属性值里真的有 `>`。这是这套解析最容易踩的坑 —— 下面每个函数都建在它上面，
 * **任何一个都不要用正则重新实现**。
 */
export function tagEnd(html, start) {
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
export function* iterTags(html, from = 0) {
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
export function matchElement(html, openStart) {
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
export function* annotatedTags(html) {
  for (const tag of iterTags(html)) {
    if (!tag.isClose && /\sdata-lang-(?:en|cn)=/.test(tag.raw)) yield tag;
  }
}

/** 去掉标签，把 HTML 片段压成纯文本。 */
export function textOf(html) {
  return decodeAttr(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * 把每个带双语标注的元素塌成一种语言：内部内容换成该语言的标注值，
 * 两个标注属性一并删掉。这与原先那段运行时 JS 做的事逐字一致。
 */
export function collapse(html, lang) {
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

/**
 * 页面上那段可见问答 —— FAQPage 结构化数据的**唯一**来源。
 *
 * Google 明令禁止用页面上不可见的内容做 FAQ 标记。旧站的 16 个内容页把 74 条
 * 问答只写在 JSON-LD 里、页面上一个字都看不到（#82），所以现在反过来做：
 * 问答先渲染成可见的 `<details class="faq-item">`，标记从它生成。原稿里没有可见
 * 问答的页面（两个索引页）就没有 FAQPage —— 这条路上不可能再出现不可见的标记。
 *
 * ⚠️ 调用方必须传**已经塌成单语、且即将注入页面的那个字符串**。问答与页面上
 * 看到的逐字相同这件事，是靠「同一个输入」保证的，不是靠事后比对。
 */
export function visibleFaq(body) {
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

/**
 * 相对地址 → 站点根绝对地址，顺便把 `…/index.html` 归成目录形态。
 *
 * 目录形态才是索引页的规范地址（sitemap 与 canonical 里写的是 `/blog/`），
 * 原稿里那些 `index.html` 是相对链接的写法，不是规范地址。
 */
export function normalizePath(path) {
  return path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
}

/** 原稿里的相对地址 → 站点根绝对地址。原稿都在 <dir>/x.html 这一层。 */
export function toAbsolute(href, dir) {
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;
  const [path, hash] = href.split("#");
  const abs = normalizePath(
    href.startsWith("/") ? posix.normalize(path) : posix.normalize(posix.join("/", dir, path || ".")),
  );
  return hash === undefined ? abs : `${abs}#${hash}`;
}

/**
 * 改写 href / src / poster 里的站内地址。
 *
 * `localize` 由调用方给：英文版传恒等函数，中文版传把站内地址挪进 `/zh` 的那个。
 * 之所以是参数而不是写死，是因为脚本（纯 Node）与 Next 侧（TypeScript）各自持有
 * 一份 —— 迁移完成后只剩 `src/lib/i18n.ts` 那一份。
 */
export function rewriteUrls(html, dir, localize) {
  return html.replace(
    /\b(href|src|poster)="([^"]*)"/g,
    (whole, attrName, value) => `${attrName}="${localize(toAbsolute(value, dir))}"`,
  );
}

/**
 * 每页两种语言的地址。
 *
 * 文章页带 `.html`、索引页是目录形态 —— 这两种都是**已收录的原样**，
 * 一个字都不能动，llms.txt 给 AI 的引文地址也是它们。
 */
export function urlsFor(rel) {
  const path = normalizePath(`/${rel}`);
  return { en: path, zh: `/zh${path}` };
}

/** 取标签上某个属性的值。 */
export function attrOf(tagRaw, name) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tagRaw)?.[1] ?? null;
}

/** 截到词边界，不切半个词。中文没有词间空格，直接硬截。 */
export function trim(text, max, lang = "en") {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  if (lang === "zh") return `${cut}…`;
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

const LANG_ATTR = { en: "data-lang-en", zh: "data-lang-cn" };

/**
 * description 的长度门槛，按语言分开。
 *
 * 一个汉字顶好几个英文字母的信息量：60 个汉字在导语里已经算长，而 60 个英文
 * 字母才一句话。搜索结果里的显示上限也差不多是这个比例（英文约 160、中文约 80）。
 * 拿英文那套去卡中文，会把本来合格的导语全判成「太短」。
 */
const DESC_LIMITS = { en: { min: 60, max: 160 }, zh: { min: 30, max: 80 } };

/**
 * title 取 `<h1>` 上该语言的标注 —— 那是作者自己写的标题，不是新造的。
 *
 * 英文版一直这么取（原稿的 `<title>` 是中文）。服务页迁进 Next 之后中文版也走
 * 这条：那四页历史上只有一个英文地址，`<title>` 与 description 从来只有英文，
 * 但作者在 `<h1>` 上写过中文。
 */
export function titleFromH1(source, lang) {
  for (const tag of annotatedTags(source)) {
    if (tag.name !== "h1") continue;
    const v = attrOf(tag.raw, LANG_ATTR[lang]);
    if (v) return `${textOf(decodeAttr(v))} · H2ODreamer Studio`;
  }
  throw new Error(`找不到带 ${LANG_ATTR[lang]} 标注的 <h1>`);
}

/**
 * description 取正文里第一段有实质长度的该语言标注。
 * 内容页的第一段是「快速答案」或导语，本来就是写给人一眼看懂的。
 */
export function descriptionFromBody(source, lang) {
  const { min, max } = DESC_LIMITS[lang];
  const body = source.split("</head>")[1] ?? source;
  for (const tag of annotatedTags(body)) {
    if (tag.name !== "p") continue;
    const v = attrOf(tag.raw, LANG_ATTR[lang]);
    if (!v) continue;
    const text = textOf(decodeAttr(v));
    if (text.length >= min) return trim(text, max, lang);
  }
  throw new Error(`找不到够长的 ${LANG_ATTR[lang]} 段落做 description（至少 ${min} 字）`);
}
