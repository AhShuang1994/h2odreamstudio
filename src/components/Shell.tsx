import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { Inter, Instrument_Serif } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { Reveal } from "@/components/Reveal";
import type { Lang } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * 拉丁标题字。高对比 editorial 衬线，与中文的思源宋体是同一把声音 ——
 * 此前两边分别是 Inter 与宋体，英文页与中文页看起来像两个品牌。
 *
 * 只有 400 一个字重，`globals.css` 里的 h1/h2 因此锁死 400，别改。
 * next/font 会在构建期把字体下载下来自托管，不产生对外请求。
 */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

/**
 * 构建期读进来内联。同一份源码也被 `scripts/split-content-lang.mjs` 注进
 * 静态内容页 —— 幕布覆盖全部页面，两边的行为必须逐字一致，见 ADR-0001。
 */
const headInline = readFileSync(
  join(process.cwd(), "src/motion/head-inline.js"),
  "utf8",
);

/**
 * `<html>` 外壳。中英各有一个 root layout（`app/(en)` 与 `app/(zh)`），
 * 两个都渲染这个组件，只是 lang 不同 —— 根元素的语言标记必须与页面正文
 * 一致，所以它不能是运行时切换的，见 ADR-0002。
 */
export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html
      lang={lang === "zh" ? "zh" : "en"}
      className={`${inter.variable} ${instrumentSerif.variable}`}
    >
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
        {/* 幕布样式与逐行揭示的预备态，必须在首帧之前生效 —— 交给 React
            就要等水合，标题会先亮一下再被藏起来。 */}
        <script dangerouslySetInnerHTML={{ __html: headInline }} />
      </head>
      <body className="font-sans antialiased">
        <Reveal />
        <Nav lang={lang} />
        {children}
        <Footer lang={lang} />
        <WhatsAppFab lang={lang} />
        {/* 平滑滚动与幕布走这一份原生脚本，核心页与静态内容页共用。
            defer 保序，Lenis 必须排在前面。见 public/js/motion.js。 */}
        <script src="/js/lenis.min.js" defer />
        <script src="/js/motion.js" defer />
      </body>
    </html>
  );
}
