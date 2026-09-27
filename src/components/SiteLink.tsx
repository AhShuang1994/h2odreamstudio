import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 站内链接：两类地址绕开 `next/link`，走原生 `<a>`。
 *
 * `trailingSlash: false`（ADR-0003，不能改）让 `next/link` 对这两类地址给出
 * 错误的行为：
 *
 * · **尾斜杠**（`/blog/`），索引页的规范地址**带**尾斜杠，sitemap 与
 *   canonical 都是那个形态。`<Link>` 会把它规范掉，点一下多一次跳转。
 * · **内容页文章**（`/blog/website-cost-malaysia`）与 **`.html` 结尾**的静态页：
 *   正文是整页 HTML 注入，一直是整页跳转。文章地址已不带扩展名（与 canonical
 *   一致，见 `src/lib/content/html.mjs` 的 `pageUrl`），所以按路径识别，不再按
 *   扩展名。
 *
 * 整页跳转本来就是这些地址今天的行为，`src/motion/head-inline.js` 的幕布覆盖
 * 跨文档导航，所以没有回归。
 *
 * 原先这段逻辑叫 `NavLink`，住在 `Nav.tsx` 里。内容页迁进 Next 路由之后
 * 页脚和正文里也要用，才提出来。
 */
const CONTENT_ARTICLE = /^(\/zh)?\/(blog|case-studies)\/[^/?#]+/;

export function SiteLink({
  href,
  className,
  onClick,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  /** 语言切换要 hrefLang 与 aria-label。两种分支都原样透传。 */
  hrefLang?: string;
  "aria-label"?: string;
}) {
  if (
    (href !== "/" && href.endsWith("/")) ||
    href.endsWith(".html") ||
    CONTENT_ARTICLE.test(href)
  ) {
    return (
      <a href={href} className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
