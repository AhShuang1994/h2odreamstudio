"use client";

import { useEffect } from "react";
import { DESKTOP, REDUCED_MOTION, desktopMotionAllowed } from "@/lib/motion";

/**
 * 遮罩视差。渲染 null —— 与 Reveal 一样是全局扫描器，自己去找
 * `[data-mask-parallax]`，版面里不多任何一层盒子。
 *
 * ⚠️ 属性名是 `data-mask-parallax` 不是 `data-parallax`：冻结的样板站
 * `demos/wedding-premium-2.html` 里已经有一套自己的 `data-parallax="0.03"`
 * 做标题位移，同名会撞。那批样板站不归本次范围，改不得。
 *
 * 本站的「视差」**专指这一种**：图片比它的裁切框大一截，滚动时在框内反向
 * 慢速位移。不是多图层不同速度的背景。见 CONTEXT.md 的「遮罩视差」词条。
 *
 * 它是配料不是主菜 —— 实测 ERA 的 26 处视差全是同一招，真正撑起质感的是
 * 逐行揭示与滚动惯性（ADR-0001）。本站图片密度远低于它，**只用在三处**：
 * 案例缩略图、创始人照片（首页与关于页）、hero（归 #91）。不要往别处加。
 */

/** 图片放大到裁切框的 120%，上下各多出 10% 的余量。 */
const SCALE = 1.2;
/**
 * 位移幅度（占裁切框高度的百分比）。
 *
 * 变换的合成顺序是先位移再缩放，视觉位移 = SHIFT × SCALE = 7.2%，
 * 而每一侧的余量是 (SCALE − 1) / 2 = 10% —— 位移到两端仍留 2.8% 的边，
 * 不会把裁切框的边露出来。
 *
 * 实测一张 348px 高的缩略图：余量 34.8px、极值位移 25.1px，剩 9.7px。
 * 调大这个数之前先按上面那两条式子算一遍，别凭感觉。
 */
const SHIFT = 6;

export function Parallax() {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      let ctx: gsap.Context | null = null;

      const build = () => {
        // 关掉时必须是**干净的静态图**：不放大、不位移，裁切构图与
        // 没有这个组件时逐像素一致。
        if (!desktopMotionAllowed()) return;

        ctx = gsap.context(() => {
          for (const box of document.querySelectorAll<HTMLElement>("[data-mask-parallax]")) {
            const img = box.querySelector("img");
            if (!img) continue;
            gsap.fromTo(
              img,
              { yPercent: -SHIFT, scale: SCALE },
              {
                yPercent: SHIFT,
                ease: "none",
                scrollTrigger: {
                  trigger: box,
                  // 从框刚进视口到框完全离开，全程跟着滚动走
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          }
        });
      };

      const rebuild = () => {
        ctx?.revert();
        ctx = null;
        build();
      };

      build();

      // 跨过桌面门槛或打开减弱动态偏好时当场生效
      const queries = [window.matchMedia(REDUCED_MOTION), window.matchMedia(DESKTOP)];
      for (const q of queries) q.addEventListener("change", rebuild);

      cleanup = () => {
        for (const q of queries) q.removeEventListener("change", rebuild);
        ctx?.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
