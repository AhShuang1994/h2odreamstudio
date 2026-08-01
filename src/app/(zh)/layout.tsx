import type { Metadata, Viewport } from "next";
import "../globals.css";
import { Shell } from "@/components/Shell";

/** 附加语言（中文）的 root layout，覆盖 `/zh` 下的核心页。见 ADR-0002。 */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.h2o-dreamer-studio.com"),
  title: {
    default: "H2ODreamer Studio · 网站设计",
    template: "%s · H2ODreamer Studio",
  },
  description:
    "H2ODreamer Studio — 帮你迈出梦想的第一步。马来西亚柔佛的一人网站设计工作室，做网站设计、Shopify 迁移与婚礼电子请柬。",
  openGraph: {
    siteName: "H2ODreamer Studio",
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
    images: [{ url: "/og/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/og-image.jpg"],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  return <Shell lang="zh">{children}</Shell>;
}
