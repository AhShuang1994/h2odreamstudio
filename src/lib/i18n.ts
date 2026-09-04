import type { Bilingual } from "@/content/site";

/**
 * 语言原语。
 *
 * **英文是主语言**，占据根路径；**中文是附加语言**，占据 `/zh`。见 CONTEXT.md
 * 的「主语言」词条与 docs/adr/0002-bilingual-separate-routes.md。
 *
 * 每个页面只渲染一种语言 —— 不要再把两种语言同时塞进 DOM 靠 CSS 显隐。
 * 隐藏的那一半量不到宽度，逐行揭示动效会直接失败；同页两套正文本来也不是
 * 搜索引擎推荐的做法。
 */
export type Lang = "en" | "zh";

export const LANGS = ["en", "zh"] as const;

/** 取双语内容里的一种。 */
export function t(b: Bilingual, lang: Lang): string {
  return lang === "zh" ? b.cn : b.en;
}

/**
 * 走 Next 路由、中英各有一份的页面。
 */
export const CORE_PATHS = ["/", "/about", "/contact", "/pricing"] as const;

/**
 * `public/` 下**已经拆了语言**的两棵内容树（#76 做完了）：
 * `out/blog/` 与 `out/zh/blog/`、`out/case-studies/` 与 `out/zh/case-studies/`。
 *
 * landing-page、wedding-* 这些手写服务页还是两种语言共用一份，不在此列。
 *
 * 口径与 `scripts/split-content-lang.mjs` 的 `localize()` 逐字对应 ——
 * 两边对同一个地址必须给出同一个答案，否则核心页与内容页的导航会分叉。
 */
const LOCALIZED_CONTENT = /^\/(blog|case-studies)\//;

/** 一个核心页在两种语言下的地址。 */
export function pathsFor(path: string): Record<Lang, string> {
  return { en: path, zh: path === "/" ? "/zh" : `/zh${path}` };
}

/** 把站内链接改写成目标语言的地址；没有对应语言版本的原样返回。 */
export function localize(href: string, lang: Lang): string {
  if (lang === "en") return href;
  const [path, hash] = href.split("#");
  const base = path === "" ? "/" : path;
  const zh = (CORE_PATHS as readonly string[]).includes(base)
    ? pathsFor(base).zh
    : LOCALIZED_CONTENT.test(base)
      ? `/zh${base}`
      : null;
  if (zh === null) return href;
  return hash === undefined ? zh : `${zh}#${hash}`;
}

const CONTENT_PATH = /^(\/zh)?\/(blog|case-studies)(\/.*)?$/;

/**
 * 内容页地址的**规范形态**：索引页带尾斜杠（`/blog/`），文章页带扩展名
 * （`/blog/x.html`）。都是已收录的原样，一个字不能动。
 *
 * 需要这一步是因为进来的路径形态不统一：Next 路由给的是 `/blog`，浏览器地址栏
 * 可能是 `/blog/`，而 Cloudflare 会把 `/blog/x.html` 剥成 `/blog/x`。三种都要
 * 归到同一个答案上，否则语言切换会指向一条需要跳转的地址。
 *
 * 不是内容页就返回 null。
 */
function canonicalContent(pathname: string): string | null {
  const m = CONTENT_PATH.exec(pathname);
  if (!m) return null;
  const [, zh = "", section, rest] = m;
  const slug = (rest ?? "")
    .replace(/^\//, "")
    .replace(/\/+$/, "")
    .replace(/\.html$/, "");
  return slug ? `${zh}/${section}/${slug}.html` : `${zh}/${section}/`;
}

/**
 * 当前地址在另一种语言下的对应地址。
 *
 * 语言切换必须落在**当前页面**的另一语言版本，不能把人丢回首页 ——
 * 这是 ADR-0002 写死的一条。
 */
export function otherLangHref(pathname: string, lang: Lang): string {
  const content = canonicalContent(pathname);
  if (content) return lang === "zh" ? content.replace(/^\/zh/, "") : `/zh${content}`;

  const p = pathname.replace(/\/+$/, "") || "/";
  if (lang === "zh") {
    if (p === "/zh") return "/";
    return p.startsWith("/zh/") ? p.slice(3) : "/";
  }
  return pathsFor(p).zh;
}
