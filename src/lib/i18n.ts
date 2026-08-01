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
 *
 * `public/` 下的静态内容页（blog、案例拆解、手写服务页）还没拆语言 —— 那是
 * #76 的事。在那之前它们的地址两种语言共用，`localize` 会原样放行。
 */
export const CORE_PATHS = ["/", "/about", "/contact", "/pricing"] as const;

/** 一个核心页在两种语言下的地址。 */
export function pathsFor(path: string): Record<Lang, string> {
  return { en: path, zh: path === "/" ? "/zh" : `/zh${path}` };
}

/** 把站内链接改写成目标语言的地址；核心页之外原样返回。 */
export function localize(href: string, lang: Lang): string {
  if (lang === "en") return href;
  const [path, hash] = href.split("#");
  const base = path === "" ? "/" : path;
  if (!(CORE_PATHS as readonly string[]).includes(base)) return href;
  const zh = pathsFor(base).zh;
  return hash === undefined ? zh : `${zh}#${hash}`;
}

/**
 * 当前地址在另一种语言下的对应地址。
 *
 * 语言切换必须落在**当前页面**的另一语言版本，不能把人丢回首页 ——
 * 这是 ADR-0002 写死的一条。
 */
export function otherLangHref(pathname: string, lang: Lang): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (lang === "zh") {
    if (p === "/zh") return "/";
    return p.startsWith("/zh/") ? p.slice(3) : "/";
  }
  return pathsFor(p).zh;
}
