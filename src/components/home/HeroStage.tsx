import { HERO_LAYERS } from "@/content/parallax";

/**
 * 首屏的分层舞台。四层，从远到近：暗空 → 水汽 → 液态球体 → 水面。
 *
 * 层的**滚动位移**由 `Parallax.tsx` 扫 `[data-hero-layer]` 驱动，
 * 这里只负责摆位与合成方式。k 值写在 data 属性上，两端各一份。
 *
 * 合成：球体与水面都是**黑底发光板**，走 `mix-blend-mode: screen` ——
 * 黑色在 screen 下等于透明，所以两张图都不用抠、也不用补透明画布。
 * 这正是本站现有球体一直在用的合成方式。
 *
 * 舞台整体 `isolation: isolate`，让 screen 只在四层之间发生，
 * 不去和页面其它内容混。
 */
export function HeroStage() {
  const { void: base, mist, orb } = HERO_LAYERS;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 isolate overflow-hidden bg-bg"
    >
      <div
        data-hero-layer
        data-k-desktop={base.k.desktop}
        data-k-mobile={base.k.mobile}
        className="absolute inset-x-0 -top-[20%] h-[140%]"
        style={{ background: base.background }}
      />

      <div
        data-hero-layer
        data-k-desktop={mist.k.desktop}
        data-k-mobile={mist.k.mobile}
        className="absolute inset-x-0 -top-[20%] h-[140%]"
        style={{ background: mist.background }}
      />

      {/* 球体跨过中线往右溢出；左侧那块干净暗区是标题与行动按钮的地盘，
          球体只允许轻微探入（ADR-0001）。

          ⚠️ 这一层套了三个盒子，**每个盒子的 transform 只有一个主人**，
          不是多余嵌套：

            外盒  ← Parallax 写 y（滚动位移）
            中盒  ← Tailwind 的 -translate-y-1/2（垂直居中）
            img   ← Overture 写 scale（序幕里 0.75 → 1 迎上来）

          第一版把居中和滚动位移挂在同一个元素上，GSAP 的 `y: 0` 起手就把
          `-translate-y-1/2` 冲掉，球体当场往下跳半个自己的高度。 */}
      <div
        data-hero-layer
        data-k-desktop={orb.k.desktop}
        data-k-mobile={orb.k.mobile}
        className="absolute -right-[24%] top-[44%] w-[86%] mix-blend-screen sm:-right-[10%] sm:w-[54%] lg:-right-[6%] lg:w-[40%]"
      >
        <div className="-translate-y-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-orb
            src={orb.src}
            alt=""
            width={orb.w}
            height={orb.h}
            fetchPriority="high"
            className="h-auto w-full"
          />
        </div>
      </div>

      {/* ⚠️ 水面层（s1-L3-surface）**暂时不渲染**。
          素材、规格、生成器都还在（parallax/s1-drop.json · scripts/gen-caustics.py），
          随时能接回来，但现在挂上去不好看：

          · 它是从水下看水面的图，摆在首屏底部等于观众俯视脚下的水面 ——
            而这一屏的设定是「悬在水面之上」，语义拧着
          · 横向平铺的规律性一眼看得出来，读起来像发光的蜂窝布料不像水
          · 紫色网格与球体的橙青虹彩互相抢视觉重音

          代价要记住：**它原本是 s1 → s2 那次 zoom-through 的「洞」**。
          去掉之后那次转场需要重新找一个洞（球体本身是最自然的候选：
          穿过球体进入水下）。这条没定之前，转场先不做。 */}
    </div>
  );
}
