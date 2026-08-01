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

export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}
