"use client";

import { useEffect } from "react";

/**
 * 核心页的三样滚动动效：逐行揭示、遮罩视差、平滑滚动。
 * 第四样（幕布转场）在 `public/js/curtain.js` —— 它要同时服务静态内容页，
 * 不能活在这个包里。
 *
 * 实测参考站得到的事实是：183 个滚动触发器里 pin = 0，主力是 121 处进场揭示。
 * 「高级」不来自视差 —— 所以这里的顺序也是揭示优先，视差只是配料。见 #66。
 *
 * 三条边界：
 *   1. **减弱动态偏好下整套不启动**，直接把 armed 类摘掉让内容裸奔。
 *   2. **平滑滚动只在桌面**：移动端系统原生手感更好，低端机接管会掉帧。
 *   3. gsap 全部走动态 import —— 它不该出现在首屏的关键请求链里（ADR-0008
 *      的首屏 JS < 200KB 是按 HTML 里直接引的脚本算的）。
 */

/** 平滑滚动的启用条件：够宽 + 真鼠标。触摸屏一律不接管。 */
const DESKTOP = "(min-width: 1024px) and (pointer: fine)";

export function SiteMotion() {
  useEffect(() => {
    const root = document.documentElement;
    /**
     * 摘掉 armed 类 —— 它是 `[data-reveal]` 的隐藏开关（globals.css）。
     * 动效起不来时必须调用，否则内容会永远停在 opacity:0。
     */
    const disarm = () => root.classList.remove("motion-armed");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      disarm();
      return;
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];
    // gsap 没加载出来（网络断了、CDN 被墙、脚本报错）也得把内容放出来
    const failsafe = window.setTimeout(disarm, 2500);

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);

      // 中文是子集字体，字体到位之前算出来的断行是错的 —— 切早了整段会散
      if (document.fonts) await document.fonts.ready;
      if (disposed) return;

      // 平滑滚动先建：它会重算所有触发点，放在后面等于白算一遍
      if (window.matchMedia(DESKTOP).matches) {
        const { ScrollSmoother } = await import("gsap/ScrollSmoother");
        if (disposed) return;
        gsap.registerPlugin(ScrollSmoother);
        const smoother = ScrollSmoother.create({
          wrapper: "#smooth-wrapper",
          content: "#smooth-content",
          smooth: 1.1,
          // 视差自己用 ScrollTrigger 做，不走 smoother 的 data-speed
          effects: false,
        });
        cleanups.push(() => smoother.kill());
      }

      const ctx = gsap.context(() => {
        /**
         * 逐行揭示 —— `type: "lines"`，**永远不切字**。
         * 中文没有词边界，逐字会把句子拆散架；这条是词汇表写死的（「逐行揭示」）。
         * `autoSplit` 让字体或宽度变化后重新断行，`mask` 给每行套一层遮罩，
         * 行从遮罩底下升上来而不是整块淡入。
         */
        for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal="lines"]')) {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 0.9,
                ease: "power3.out",
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              }),
          });
        }

        /**
         * 整块揭示 —— 卡片、图片这类没有行的东西。
         *
         * 必须写成 fromTo：`gsap.from` 的终点取的是**创建那一刻的当前值**，而
         * 这一刻 `.motion-armed` 还挂在 <html> 上、元素正好是 opacity:0 ——
         * 于是终点被读成 0，动画变成 0 → 0，内容永远不出来。
         */
        for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal="block"]')) {
          gsap.fromTo(
            el,
            { y: 26, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        }

        /**
         * 遮罩视差 —— 图片比裁切框高 18%，滚动时在框内慢速位移。
         * 本站的 parallax 专指这一种，不指多图层不同速度的背景。
         * 位移区间选在 [-8, 0]：两端都保证图片仍然盖满框，不会露出底。
         */
        for (const frame of gsap.utils.toArray<HTMLElement>("[data-parallax]")) {
          const layer = frame.querySelector("img, video");
          if (!layer) continue;
          gsap.fromTo(
            layer,
            { yPercent: -8 },
            {
              yPercent: 0,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }
      });
      cleanups.push(() => ctx.revert());

      // 起始状态已经由上面的 from 写进行内样式，这时候放开隐藏才不会闪一下
      root.classList.add("motion-ready");
      disarm();
    })().catch(disarm);

    return () => {
      disposed = true;
      window.clearTimeout(failsafe);
      root.classList.remove("motion-ready");
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
