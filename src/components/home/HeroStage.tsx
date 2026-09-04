import { HERO_LAYERS, HERO_RIVER } from "@/content/parallax";

/**
 * 首屏舞台。三层，从远到近：暗空 → 星河视频 → 暗罩。
 *
 * 视频的**播放进度**由 `HeroScrub.tsx` 按滚动位置拉，这里只负责摆位与合成。
 * 它不自动播放、不循环、没有音轨 —— 一帧都不动，除非有人滚。
 *
 * 合成：视频是**黑底发光板**，走 `mix-blend-mode: screen` —— 黑色在 screen 下
 * 等于透明，所以不用抠、也不用带 alpha 通道的编码格式（ADR-0001）。
 * 舞台整体 `isolation: isolate`，让 screen 只在这几层之间发生。
 *
 * ⚠️ 这里**不再有 `data-hero-layer`**。原来那套多层不同 k 值的位移与「整屏定住
 * 拉视频进度条」是同一块屏幕的两种互斥方案，视频接管之后前者自然退场；
 * `Parallax.tsx` 里的 `buildHeroLayers` 因此扫不到东西，成了休眠代码 —— 留着是
 * 因为它是这套 k 值机制的文档本体，想退回分层版随时能接回来。
 *
 * ## 水面层拿掉了（2026-09-04）
 *
 * 它原本在退场段以 k=1.5 往上刷过视口，读作「你在往下沉」。真机上不成立：
 * 视频本身已经是一片流动的星河，再叠一层规律的横向波纹，两个纹理互相打架 ——
 * 看到的是网格，不是水。这与球体版当初否掉它的理由是同一条（那时的说法是
 * 「横向平铺的规律性一眼看得出来，读起来像发光的蜂窝布料不像水」）。
 *
 * 规格与素材都还在（`HERO_LAYERS.surface`、`assets/parallax/s1-l3-surface.webp`、
 * `scripts/gen-parallax-art.mjs`），随时能接回来。驱动它的 `HeroDive.tsx` 已经
 * 删掉 —— 那个组件除了推这一层没有别的任务。
 *
 * **代价要记住**：它原本是 s1 → s2 那次 zoom-through 的「洞」。去掉之后那次
 * 转场需要重新找一个洞（穿过星河尽头那个光环是最自然的候选）。这条没定之前，
 * 转场先不做。
 */
export function HeroStage() {
  const { void: base } = HERO_LAYERS;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 isolate overflow-hidden bg-bg"
    >
      <div className="absolute inset-0" style={{ background: base.background }} />

      {/* `data-orb` 是给序幕认的 —— 穿过水滴那一下要把它从 0.75 放到 1。
          原来挂在静态球体图上，球体现在是视频的第 0 帧，标记就跟过来。

          `preload="none"` 是 ADR-0008 的硬要求：首屏交给 poster，1.3MB 的视频
          等 load 事件之后由 HeroScrub 主动拉。不要改成 auto。 */}
      <video
        data-hero-river
        data-orb
        src={HERO_RIVER.src}
        poster={HERO_RIVER.poster}
        width={HERO_RIVER.w}
        height={HERO_RIVER.h}
        preload="none"
        muted
        playsInline
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
      />

      {/* 暗罩。理由与实测数字见 HERO_RIVER.scrim 的注释 —— 这是可读性硬件，
          不是氛围渐变。两端各一道：手机文案占满宽度压上半屏，桌面文案在左侧
          压左边。 */}
      <div
        className="absolute inset-0 sm:hidden"
        style={{ background: HERO_RIVER.scrim.mobile }}
      />
      <div
        className="absolute inset-0 hidden sm:block"
        style={{ background: HERO_RIVER.scrim.desktop }}
      />
    </div>
  );
}
