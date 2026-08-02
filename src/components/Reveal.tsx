"use client";

import { useEffect } from "react";
import { motionAllowed } from "@/lib/motion";

/** 与 globals.css 的 @font-face unicode-range 同一套中日韩区段。 */
const CJK = "\\u2E80-\\u303F\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\uFF00-\\uFFEF";
/** 中文避头点：不能出现在行首。 */
const NO_LINE_START = "，。、；：！？）】》〉」』〕｝”’…—·";
/** 中文避尾点：不能出现在行末。 */
const NO_LINE_END = "（【《〈「『〔｛“‘";

/**
 * SplitText 的分词规则。
 *
 * 它靠「词」的包围盒归行，而默认按空格分词 —— 中文没有空格，整段就是一个词，
 * 包围盒横跨两行，归出来只有一行（实测中文 h1 两行被切成一个 line）。
 *
 * 但也不能简单地逐字符分：SplitText 把每个词包成 inline-block，浏览器在任意
 * 两个 inline-block 之间都可以断行 —— 实测把 `Shopify` 断成 `Shop` / `ify`、
 * 把 `RM 2,500` 断成 `2,50` / `0`。
 *
 * 所以只在**中文字之间**和**空格两侧**切开，并守住避头避尾点：拉丁词与数字
 * 整块留在一个盒子里，中文按字断行，标点不会跑到行首行尾。
 *
 * 空格两侧都切，是为了让空格自己成为一个「词」—— SplitText 对纯空格的词
 * 直接插一个文本节点、不包盒子，多余的空格补偿逻辑也就不会触发。只切一侧会
 * 让它以为分隔符被吃掉了而补回一个空格，渲染出双空格（实测 `RM  590`）。
 */
const WORD_DELIMITER = new RegExp(
  `(?<=[${CJK}])(?<![${NO_LINE_END}])(?![${NO_LINE_START}])|(?<=\\s)|(?=\\s)`,
);

/**
 * 逐行揭示。渲染 null —— 全站只挂一个，自己去扫 `[data-reveal]`。
 *
 * 做成一个全局扫描器而不是包裹组件，是为了不往版面里塞多余的 div：标题与
 * 段落只需要多一个属性，不需要多一层盒子。节奏参数也就只有这一份。
 *
 * **中文按行，永不逐字** —— 中文没有词边界，逐字会散架。见 CONTEXT.md
 * 的「逐行揭示」词条。
 *
 * gsap 走动态 import：它不参与首屏渲染，没有理由压在关键路径上。这样它落在
 * 独立的异步 chunk 里，不计入首屏 JS 预算（ADR-0008 的「按需引入」）。
 */
export function Reveal() {
  useEffect(() => {
    if (!motionAllowed()) return;

    let revert: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger, SplitText);

      const ctx = gsap.context(() => {
        for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
          SplitText.create(el, {
            type: "lines",
            // 中文断行的关键，规则见文件头 WORD_DELIMITER 的注释。
            // 这只影响量行的中间态 —— type 里没有 chars/words，最终留在 DOM 里
            // 的只有行，中文不逐字，见 CONTEXT.md 的「逐行揭示」词条。
            wordDelimiter: { delimiter: WORD_DELIMITER, replaceWith: "" },
            // 行被裹进一层 overflow 隐藏的遮罩，行从遮罩下方推上来
            mask: "lines",
            // 字体加载完与窗口尺寸变化时自动重切 —— 中文子集是异步加载的，
            // 不重切会按 fallback 字体的断行位置定行，换字体后就错位
            autoSplit: true,
            // 3.13 起 SplitText 自带无障碍处理：整段文本回填成 aria-label，
            // 屏幕阅读器读到的是连续文本，不是被切碎的行
            aria: "auto",
            onSplit(self) {
              // 揭幕前的隐藏态由 CSS 类给（见 globals.css 与 Shell 的内联脚本），
              // 这里改成由行遮罩接管，元素本身恢复可见
              gsap.set(el, { opacity: 1 });
              return gsap.from(self.lines, {
                yPercent: 100,
                duration: 0.9,
                stagger: 0.08,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              });
            },
          });
        }
      });

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return null;
}
