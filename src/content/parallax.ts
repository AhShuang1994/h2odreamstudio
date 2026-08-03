/**
 * 首屏 parallax 的实现常量。
 *
 * **真相在 `parallax/s1-drop.json` 与 `parallax/s0-overture.motion.json`**，
 * 那两份由 `scripts/gen-parallax-*.mjs` 生成。这里是把用到的数搬过来，
 * 改规格要回去改生成器重跑，再同步这一份 —— 别只改这里。
 */

/** k = 该层滚动速度 ÷ 页面滚动速度。1 = 跟随内容，0 = 钉死在视口上。 */
export type LayerK = { desktop: number; mobile: number };

export const HERO_LAYERS = {
  /** 水面之上的暗空。纯渐变，不出图。 */
  void: {
    k: { desktop: 0.05, mobile: 0.35 } as LayerK,
    background: "linear-gradient(180deg, #07080b 0%, #0a0b10 62%, #0e1015 100%)",
  },
  /** 远景水汽。两个径向渐变，不出图 —— 出图要 776KB，而它没有需要画的细节。 */
  mist: {
    k: { desktop: 0.25, mobile: 0.45 } as LayerK,
    background:
      "radial-gradient(60% 45% at 68% 38%, rgba(124,130,240,0.10), transparent 70%), " +
      "radial-gradient(45% 35% at 22% 72%, rgba(154,160,255,0.06), transparent 70%)",
  },
  /** 液态球体，品牌图形本体。跨过画面中线，左侧留干净暗区（ADR-0001）。 */
  orb: {
    k: { desktop: 0.55, mobile: 0.7 } as LayerK,
    src: "/assets/parallax/s1-l2-orb.webp",
    w: 1296,
    h: 1728,
  },
  /**
   * 水面。这层是 s1 → s2 那次 zoom-through 的「洞」，所以 k > 1。
   *
   * ⚠️ 只在**退场段**才动。k=1.5 从头跟到尾的话滚 150px 它就爬进标题了
   * （实测），而 k>1 是 zoom-through 的硬要求，不能降 —— 降的是起跑时机。
   */
  surface: {
    k: { desktop: 1.5, mobile: 1.3 } as LayerK,
    src: "/assets/parallax/s1-l3-surface.webp",
    w: 1280,
    h: 2160,
    /** 程序化生成的图左右真无缝（接缝差 1.45 < 画面内部中位 2.21），直接平铺。 */
    exitOnly: true,
  },
} as const;

/**
 * 序幕：穿过一滴水。
 *
 * 几何全部由视口反算 —— 写死 vw 在竖屏上盖不住（mobile 实际需要 211vw）。
 * 那个 320px 兜底是防视口高被报成 0。
 */
export const OVERTURE = {
  durationMs: 900,
  /** 专供穿透：前半段几乎不动，最后一下猛冲。别拿它做别的动效。 */
  ease: "cubic-bezier(0.6, 0, 0, 1)",
  /** 水滴宽高比 3:4。 */
  aspect: 0.75,
  flagKey: "h2od-overture-seen",
  dropWidths(vw: number, vh: number) {
    return {
      start: Math.min(vw, vh) * 0.18,
      peek: Math.min(vw, vh) * 0.26,
      final: Math.max(vw, vh * 0.75, 320) * 1.3,
    };
  },
} as const;
