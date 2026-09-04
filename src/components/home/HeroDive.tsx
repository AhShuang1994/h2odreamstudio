"use client";

import { useEffect } from "react";
import { HERO_LAYERS } from "@/content/parallax";
import { motionAllowed } from "@/lib/motion";

/**
 * 潜下水 —— s1 → s2 的穿透。
 *
 * 首屏那一屏被 `sticky` 咬住不动，直到舞台底边追上视口底边才松口。松口之后
 * 整个首屏往上滚出视口，这段路正好一个视口高 —— 水面层就在这段路上，以
 * **比页面快的速度**往上刷过去。比页面快，读作「你在往下沉」。
 *
 * ## 位移量就是 k 的定义，没有另外调的旋钮
 *
 * `k = 该层滚动速度 ÷ 页面滚动速度`。退场段页面走一个视口高，其中 1.0 份由
 * 首屏自己滚出去提供，所以这一层**自己只需要再走 `(k - 1) × 视口高`**。
 * desktop k=1.5 → 自己走 0.5 屏；mobile k=1.3 → 0.3 屏。
 *
 * 起跑点由 `HERO_LAYERS.surface.peek` 定：图钉在首屏盒子下方，先往上提自身
 * 高度的 15%。露出来的是图顶部那段纯黑（实测亮度 0.2），所以文案还在的时候
 * 什么都看不见 —— ADR-0001 的左侧干净暗区不受影响。有了这个起跑点，位移才
 * 能老实等于 `(k - 1) × 视口高`；从画面外起跑的话，光是把图挪进视口就得超速。
 *
 * 看到的顺序：纯黑 → 远处细密的焦散 → 近处大格子从头顶掠过。近的最后到，
 * 因为那正是你沉下去、水面从上方划走的那一刻。
 *
 * 渲染 null，与 `HeroScrub` 一样是扫描器，不往版面里加盒子。
 */
export function HeroDive() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-hero-stage]");
    const surface = document.querySelector<HTMLElement>("[data-hero-surface]");
    if (!stage || !surface) return;

    // 减弱动态偏好：不位移。水面停在起跑点，也就是屏幕上看不见 —— 这一层
    // 除了转场没有别的任务，静止的它不该出现在版面里。
    if (!motionAllowed()) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const mm = gsap.matchMedia();
      const rest = () => -HERO_LAYERS.surface.peek * surface.offsetHeight;

      // 两端只有 k 不同。`md` 断点与 RiverThread 用的那条一致。
      const build = (k: number) => () => {
        gsap.fromTo(
          surface,
          { y: rest },
          {
            // 函数式取值配 invalidateOnRefresh —— 视口一变（转屏、开合工具栏）
            // 就重算，不用自己听 resize
            y: () => rest() - (k - 1) * window.innerHeight,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              // 舞台底边碰到视口底边时起跑（正是 sticky 松口那一刻），
              // 舞台底边升到视口顶边时收尾（首屏整个走完）。
              start: "bottom bottom",
              end: "bottom top",
              // 与 HeroScrub / RiverThread 同一条理由：桌面端已经有 Lenis 的
              // 平滑滚动，再叠一层缓动是多余的滞后。
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      };

      mm.add("(min-width: 768px)", build(HERO_LAYERS.surface.k.desktop));
      mm.add("(max-width: 767px)", build(HERO_LAYERS.surface.k.mobile));

      cleanup = () => mm.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
