/**
 * `doc.mjs` 的类型声明。
 *
 * 手写而不是从 JS 推断，因为 TSX 那边要拿它当路由的数据源：推断出来的
 * `any` 会让「slug 打错」这类错误留到构建期才炸。模块本体是 `.mjs`：脚本
 * （纯 Node）与 Next 侧必须 import 同一个文件，见该文件头部的说明。
 */
export type ContentLang = "en" | "zh";

export interface ContentDoc {
  section: string;
  /** 不带扩展名的文件名：Next 动态路由的 `[slug]`。 */
  slug: string;
  /** 相对 `src/content/pages/` 的路径。 */
  rel: string;
  dir: string;
  isIndex: boolean;
  /** 两种语言的**已收录地址**，一个字都不能动。 */
  urls: Record<ContentLang, string>;
  source: string;
  title: Record<ContentLang, string>;
  description: Record<ContentLang, string>;
  /** head 里的内联 `<style>`、博客首页靠它，别丢。 */
  headStyle: string | null;
  meta: {
    image: string | null;
    datePublished: string | null;
    section: string | null;
    ogType: "website" | "article";
  };
  /** 正文，塌成一种语言、站内地址已改绝对。 */
  bodyHtml(lang: ContentLang, localize?: (href: string) => string): string;
  /** 原稿自带的 JSON-LD 块，英文版换过 headline 与 description。 */
  jsonLd(lang: ContentLang): string[];
}

export function listDocs(sectionId?: string): ContentDoc[];
export function getDoc(sectionId: string, slug: string): ContentDoc;
