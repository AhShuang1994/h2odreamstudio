"use client";

import { useEffect, useRef, useState } from "react";
import { LOGO_SILHOUETTE, OVERTURE } from "@/content/parallax";
import { motionAllowed } from "@/lib/motion";

/**
 * logo 在屏幕上宽 `px` 时的变换。路径原点在太阳里，缩放以它为轴
 * （viewBox 的 0 0 = 屏幕正中）。`centered` 时平移 = -scale × center，logo 整体
 * 居中；否则平移归零，太阳居中。
 */
function logoFrame(px: number, centered: boolean) {
  // viewBox 是 2000 单位、`slice` 铺满，所以 1 单位 = max(vw,vh)/2000 px。
  // logo 路径宽 100 单位 → 换算出目标 scale。
  const unit = Math.max(window.innerWidth, window.innerHeight) / 2000;
  const scale = px / (100 * unit);
  const [cx, cy] = LOGO_SILHOUETTE.center;
  return centered ? { scale, x: -scale * cx, y: -scale * cy } : { scale, x: 0, y: 0 };
}

/**
 * 序幕：穿过 logo。
 *
 * 一块盖满视口的暗板，中间挖一个 logo 形状的洞。洞里看到的就是下面的 hero
 * （连同那颗球）。logo 急速放大，镜头同时对准太阳，从太阳里穿过去 →
 * 暗板消失 → 人已经在首屏里了。
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
 * - ⚠️ **hero 文字在暗板下方照常绘制，绝不能 opacity:0**：盖住不等于没画，
 *   最大内容绘制照常计时。真正拖 LCP 的是「揭示前先藏起来」那种写法。
 */
export function Overture() {
  // 服务端与首帧一律不渲染：先判定，判定通过才挂上去。
  const [armed, setArmed] = useState(false);
  const logoRef = useRef<SVGPathElement>(null);
  const sheetRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!motionAllowed()) return;
    try {
      if (sessionStorage.getItem(OVERTURE.flagKey)) return;
      sessionStorage.setItem(OVERTURE.flagKey, "1");
    } catch {
      // 隐私模式下 sessionStorage 会抛：那就每次都播，不值得为它放弃序幕
    }
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const sheet = sheetRef.current;
    const logo = logoRef.current;
    if (!sheet || !logo) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      const { start, peek, final } = OVERTURE.logoWidths(window.innerWidth, window.innerHeight);

      // gsap 只补间这三个数，transform 属性由我们自己写。让 gsap 直接动 SVG
      // 的 transform 要它先解析现有属性，跟 svgOrigin 叠在一起会算出 NaN。
      const frame = logoFrame(start, true);
      const paint = () =>
        logo.setAttribute("transform", `translate(${frame.x} ${frame.y}) scale(${frame.scale})`);

      const orb = document.querySelector<HTMLElement>("[data-orb]");
      const tl = gsap.timeline({
        onUpdate: paint,
        onComplete: () => sheet.remove(), // 播完直接摘掉，不留在 DOM 里挡事件
      });

      tl.set(orb, { scale: 0.75, transformOrigin: "center" })
        // 前段：缓缓张开，让人看清是 logo、洞里是什么
        .to(frame, { ...logoFrame(peek, true), duration: 0.29, ease: "power2.inOut" })
        .to(orb, { scale: 0.82, duration: 0.29, ease: "power2.inOut" }, "<")
        // 后段：一边猛冲一边把太阳拉到正中，从太阳里穿过去。
        // 「前景放大 + 后景 0.75→1 同步」是穿透的通用配方，
        // 少了后景那一半，穿过去会像撞墙。
        .to(frame, {
          ...logoFrame(final, false),
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

  // gsap 是动态 import，到手前这一帧就得是起始画面，不然 logo 会先以原始
  // 大小歪在太阳的位置上闪一下，再跳到正中。
  const first = logoFrame(OVERTURE.logoWidths(window.innerWidth, window.innerHeight).start, true);

  return (
    <svg
      ref={sheetRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9997] h-full w-full"
      viewBox="-1000 -1000 2000 2000"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <mask id="overture-logo">
          <rect x="-1000" y="-1000" width="2000" height="2000" fill="#fff" />
          {/* logo 剪影，黑色 = 挖掉，所以这里能看到下面的 hero。 */}
          <path
            ref={logoRef}
            fill="#000"
            d={LOGO_SILHOUETTE.path}
            transform={`translate(${first.x} ${first.y}) scale(${first.scale})`}
          />
        </mask>
      </defs>
      <rect
        x="-1000"
        y="-1000"
        width="2000"
        height="2000"
        fill="#07080b"
        mask="url(#overture-logo)"
      />
    </svg>
  );
}
