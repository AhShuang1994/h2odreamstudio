import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { SmoothScroll } from "@/components/SmoothScroll";
import type { Lang } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * `<html>` 外壳。中英各有一个 root layout（`app/(en)` 与 `app/(zh)`），
 * 两个都渲染这个组件，只是 lang 不同 —— 根元素的语言标记必须与页面正文
 * 一致，所以它不能是运行时切换的，见 ADR-0002。
 */
export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang === "zh" ? "zh" : "en"} className={inter.variable}>
      <head>
        {/* 只有中文页预加载中文正文字重 —— 它是中文首屏立刻要用的。英文页
            正文全是拉丁字符走 Inter，预加载一份 CJK 子集纯属浪费带宽。
            600 与宋体等浏览器按需拉，避免挤在首屏关键路径上。见 ADR-0008。 */}
        {lang === "zh" && (
          <link
            rel="preload"
            href="/fonts/NotoSansSC-400.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="font-sans antialiased">
        <SmoothScroll />
        <Nav lang={lang} />
        {children}
        <Footer lang={lang} />
        <WhatsAppFab lang={lang} />
      </body>
    </html>
  );
}
