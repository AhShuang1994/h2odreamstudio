import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { MobileMenu } from "@/components/MobileMenu";
import { Reveal } from "@/components/Reveal";
import { Parallax } from "@/components/Parallax";
import { Overture } from "@/components/Overture";
import type { Lang } from "@/lib/i18n";
import { assetUrl } from "@/lib/asset-url.mjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * 构建期读进来内联。幕布覆盖全部页面（ADR-0001）：内容页迁进 Next 路由之后
 * 它们也从这里拿，全站只剩这一条注入路径。
 */
const headInline = readFileSync(
  join(process.cwd(), "src/motion/head-inline.js"),
  "utf8",
);

/**
 * GA4。旧静态站每页 head 里各有一份，迁进 Next 时内容页只搬 `<main>`，
 * 这份就跟着外壳一起丢了（2026-09-25 上线到补回之间没有数据）。
 * WhatsApp 点击靠 GA 的「出站点击」自动记（ADR-0009），这里不用另外埋点。
 */
const GA_ID = "G-45NTTZBZC4";

/**
 * `<html>` 外壳。中英各有一个 root layout（`app/(en)` 与 `app/(zh)`），
 * 两个都渲染这个组件，只是 lang 不同：根元素的语言标记必须与页面正文
 * 一致，所以它不能是运行时切换的，见 ADR-0002。
 */
export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang === "zh" ? "zh" : "en"} className={inter.variable}>
      <head>
        {/* 只有中文页预加载中文正文字重：它是中文首屏立刻要用的。英文页
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
        {/* 幕布样式与逐行揭示的预备态，必须在首帧之前生效：交给 React
            就要等水合，标题会先亮一下再被藏起来。 */}
        <script dangerouslySetInnerHTML={{ __html: headInline }} />
      </head>
      <body className="font-sans antialiased">
        {/* 背景流星，样式与节奏见 globals.css 的 .meteors。 */}
        <div className="meteors" aria-hidden="true">
          <span style={{ top: "8%", left: "85%", "--d": "14s", "--delay": "2s" } as CSSProperties} />
          <span style={{ top: "30%", left: "60%", "--d": "19s", "--delay": "9s" } as CSSProperties} />
          <span style={{ top: "5%", left: "45%", "--d": "23s", "--delay": "15s" } as CSSProperties} />
        </div>
        <Reveal />
        <Parallax />
        <Overture />
        <Nav lang={lang} />
        {children}
        <Footer lang={lang} />
        <MobileMenu lang={lang} />
        <WhatsAppFab lang={lang} />
        {/* 平滑滚动与幕布走这一份原生脚本，核心页与静态内容页共用。
            defer 保序，Lenis 必须排在前面。见 public/js/motion.js。 */}
        <script src={assetUrl("/js/lenis.min.js")} defer />
        <script src={assetUrl("/js/motion.js")} defer />
        {/* lazyOnload：等页面 load 完、浏览器空下来才拉 gtag.js。它压缩后
            173 KiB，占首页全部 JS 的将近一半，不该跟首屏抢带宽和主线程。
            代价是 load 之前就离开或点 WhatsApp 的访客记不到，这几秒里很少见。 */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
        <Script id="ga-init" strategy="lazyOnload">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
