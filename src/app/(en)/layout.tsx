import type { Metadata, Viewport } from "next";
import "../globals.css";
import { Shell } from "@/components/Shell";

/**
 * 主语言（英文）的 root layout，覆盖根路径下的核心页。
 * 中文那份在 `app/(zh)/layout.tsx` —— 两个 root layout 是 Next 里让
 * `<html lang>` 分语言取值的唯一办法，见 ADR-0002。
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.h2o-dreamer-studio.com"),
  title: {
    default: "H2ODreamer Studio · Web Design Malaysia",
    template: "%s · H2ODreamer Studio",
  },
  description:
    "H2ODreamer Studio — helping dreamers take their first step online. Web design, Shopify migration and wedding e-invitations, from a one-person studio in Johor, Malaysia.",
  openGraph: {
    siteName: "H2ODreamer Studio",
    type: "website",
    locale: "en_US",
    alternateLocale: "zh_CN",
    images: [{ url: "/og/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/og-image.jpg"],
  },
  icons: { icon: "/favicon.svg" },
};

/**
 * ⚠️ `viewportFit: "cover"` 不是为了好看，是 iOS Safari 的必需品。
 *
 * 不加的话：可滚动的正文照样**满屏绘制**（状态栏那条能看到字，还被 Safari
 * 糊了一层所以发灰），但 `position: fixed` 的元素被关在 layout viewport 里，
 * 而它的顶边在状态栏**下面** —— 导航永远够不到屏幕最顶，上面那条就一直漏正文。
 *
 * 加了之后 layout viewport 铺满整屏，fixed 才贴得到真正的顶边；代价是内容也会
 * 伸进安全区，所以 Nav 要补 `env(safe-area-inset-top)`、WhatsAppFab 要补
 * `env(safe-area-inset-bottom)`。三处是一套，改一处就要看另外两处。
 */
export const viewport: Viewport = {
  themeColor: "#07080b",
  viewportFit: "cover",
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}
