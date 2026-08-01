import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { SiteMotion } from "@/components/motion/SiteMotion";
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
        {/* 幕布转场。同步执行、不能 defer —— 带着幕布到达的那一下必须在首次
            绘制之前就成立，晚一帧就会先闪出新页内容再被盖上。内容页由
            scripts/split-content-lang.mjs 注入同一个文件，两边行为一致。 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/js/curtain.js" />
        {/* 逐行揭示的隐藏开关。同样要赶在首次绘制之前：先看见文字再被藏起来
            比没有动效更难看。摘除它的责任在 SiteMotion，含超时兜底。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)" +
              "document.documentElement.classList.add('motion-armed')}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {/* Nav 与悬浮按钮是 fixed 定位，必须留在 smooth-content 外面 ——
            平滑滚动靠 transform 推动内容，被 transform 的祖先会让 fixed 失效。 */}
        <Nav lang={lang} />
        <div id="smooth-wrapper">
          <div id="smooth-content">
            {children}
            <Footer lang={lang} />
          </div>
        </div>
        <WhatsAppFab lang={lang} />
        <SiteMotion />
      </body>
    </html>
  );
}
