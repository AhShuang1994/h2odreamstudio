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
 * · **`.html` 结尾**（`/blog/website-cost-malaysia.html`）：文章页的已收录地址
 *   带扩展名。客户端路由匹配不到字面 `.html` 的路径，`<Link>` 会预取一个 miss
 *   然后照样整页跳。
 *
 * 整页跳转本来就是这些地址今天的行为，`src/motion/head-inline.js` 的幕布覆盖
 * 跨文档导航，所以没有回归。
 *
 * 原先这段逻辑叫 `NavLink`，住在 `Nav.tsx` 里。内容页迁进 Next 路由之后
 * 页脚和正文里也要用，才提出来。
 */
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
  if ((href !== "/" && href.endsWith("/")) || href.endsWith(".html")) {
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
