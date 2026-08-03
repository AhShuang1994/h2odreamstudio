"use client";

import { useEffect, useRef, useState } from "react";
import { OVERTURE } from "@/content/parallax";
import { motionAllowed } from "@/lib/motion";

/**
 * 序幕 —— 穿过一滴水。
 *
 * 一块盖满视口的暗板，中间挖一个水滴形的洞；洞里看到的就是下面的 hero
 * （连同那颗球）。水滴急速放大越过视口边界 → 暗板消失 → 人已经在首屏里了。
 *
 * ## 为什么用 SVG `<mask>` 而不是 CSS `mask-composite`
 *
 * CSS 的 `mask-composite: subtract` 在 Safari 上要写 `-webkit-` 前缀且关键字
 * 不同，踩了会在一部分设备上整屏黑。SVG 的 `<mask>` 是普遍支持的老功能，
 * 白色留、黑色挖，行为一致。
 *
 * ## 三条硬限制（project.json 的 opening.gates）
 *
 * - 首访才播，`sessionStorage` 记住
 * - 减弱动态偏好下整段不执行
 * - ⚠️ **hero 文字在暗板下方照常绘制，绝不能 opacity:0** —— 盖住不等于没画，
 *   最大内容绘制照常计时。真正拖 LCP 的是「揭示前先藏起来」那种写法。
 */
export function Overture() {
  // 服务端与首帧一律不渲染：先判定，判定通过才挂上去。
  const [armed, setArmed] = useState(false);
  const dropRef = useRef<SVGPathElement>(null);
  const sheetRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!motionAllowed()) return;
    try {
      if (sessionStorage.getItem(OVERTURE.flagKey)) return;
      sessionStorage.setItem(OVERTURE.flagKey, "1");
    } catch {
      // 隐私模式下 sessionStorage 会抛 —— 那就每次都播，不值得为它放弃序幕
    }
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const sheet = sheetRef.current;
    const drop = dropRef.current;
    if (!sheet || !drop) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { start, peek, final } = OVERTURE.dropWidths(vw, vh);

      // viewBox 是 2000 单位、`slice` 铺满，所以 1 单位 = max(vw,vh)/2000 px。
      // 水滴在 viewBox 里基准宽 75 单位 → 换算出目标 scale。
      const unit = Math.max(vw, vh) / 2000;
      const toScale = (px: number) => px / (75 * unit);

      const orb = document.querySelector<HTMLElement>("[data-orb]");
      const tl = gsap.timeline({
        onComplete: () => sheet.remove(), // 播完直接摘掉，不留在 DOM 里挡事件
      });

      tl.set(drop, { transformOrigin: "center", scale: toScale(start) })
        .set(orb, { scale: 0.75, transformOrigin: "center" })
        // 前段：缓缓张开，让人看清洞里是什么
        .to(drop, { scale: toScale(peek), duration: 0.29, ease: "power2.inOut" })
        .to(orb, { scale: 0.82, duration: 0.29, ease: "power2.inOut" }, "<")
        // 后段：猛冲穿过。「前景放大 + 后景 0.75→1 同步」是穿透的通用配方 ——
        // 少了后景那一半，穿过去会像撞墙。
        .to(drop, {
          scale: toScale(final),
          duration: 0.61,
          ease: "cubic-bezier(0.6, 0, 0, 1)",
        })
        .to(orb, { scale: 1, duration: 0.61, ease: "power2.out" }, "<");

      // 兜底：动画没跑完（切标签页、gsap 出错）也必须放人进去
      const failsafe = window.setTimeout(() => sheet.remove(), OVERTURE.durationMs + 1200);
      cleanup = () => {
        window.clearTimeout(failsafe);
        tl.kill();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [armed]);

  if (!armed) return null;

  return (
    <svg
      ref={sheetRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9997] h-full w-full"
      viewBox="-1000 -1000 2000 2000"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <mask id="overture-drop">
          <rect x="-1000" y="-1000" width="2000" height="2000" fill="#fff" />
          {/* 水滴：顶端收尖、底部饱满，宽 75 高 100，居中在原点。
              黑色 = 挖掉，所以这里能看到下面的 hero。 */}
          <path
            ref={dropRef}
            fill="#000"
            d="M0-50C20-18 37.5-2 37.5 14 37.5 34 20 50 0 50-20 50-37.5 34-37.5 14-37.5-2-20-18 0-50Z"
          />
        </mask>
      </defs>
      <rect
        x="-1000"
        y="-1000"
        width="2000"
        height="2000"
        fill="#07080b"
        mask="url(#overture-drop)"
      />
    </svg>
  );
}
