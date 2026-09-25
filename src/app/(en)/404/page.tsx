import type { Metadata } from "next";
import { NotFoundPage } from "@/components/pages/NotFound";

/**
 * 全站 404（#93）。
 *
 * ⚠️ 这是一条**普通路由**，不是 `app/not-found.tsx`。原因见 ADR-0002：
 * `app/(en)` 与 `app/(zh)` 是两个并列的 root layout，它们之上没有共同的根布局，
 * 所以 `not-found.tsx` 不会被任何 layout 包住：那一份拿不到 `Shell`、也拿不到
 * 样式表，自己再渲染一个 `<html>` 就成了 `<body>` 里套 `<html>`（实测如此）。
 *
 * 走 `/404` 这条真实路由则一切照常：`trailingSlash: false` 把它导出成
 * `out/404.html`，正好盖掉 Next 的内建 404: Cloudflare Pages 对未匹配路径
 * 返回的就是这一份。外壳、导航、页脚、幕布、平滑滚动全部与其余页面同源。
 *
 * **不要给它加 canonical**：全站唯一没有 canonical 的页面就是它，
 * `scripts/lib/exported-pages.mjs` 也正是按这一点把它排除在收录范围外。
 */
/**
 * ⚠️ 已知的一处小落差：**这份 metadata 里只有 robots 生效**。
 *
 * Next 对 `/404` 这条路径自己有一套特殊处理（它本来就要往这个文件名写内建 404），
 * 结果是 title 与 description 落回 root layout 的默认值，robots 换成它自己那条
 * `noindex`。页面正文、外壳、样式表全部照常，只有浏览器标签页上写的是站点默认标题。
 *
 * 没为这件事加机制：绕开它要把路由改成别的名字再在构建后改名，而改名之后导航里
 * 那个语言切换按钮会指向一个被改掉的地址（它是按路径推出来的），为一个 noindex
 * 错误页的标签页标题不值得。`/zh/404` 不撞这个特殊处理，它的标题是对的。
 */
export const metadata: Metadata = {
  title: "404 · Page not found",
  description: "This page could not be found. 这个页面走丢了。",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <NotFoundPage lang="en" />;
}
