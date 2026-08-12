/**
 * 生成 parallax/<section>.motion.json —— 链条第二环，每屏一次，必须先于美术。
 *
 * 改 k 只要改一行代码，改图要重新生成 → 抠图 → 补画布，成本差一个量级。
 * 所以这一环把尺寸定死了才准出图。
 *
 * ⚠️ 几何一律从**实测的滚动距离**反算，不写死 px。
 * 版面已冻结，hero 的真实高度是量出来的（desktop 828 / mobile 857），
 * 不用「阅读时长 × 滚动速度」去估 —— 估出来的数与真实版面对不上。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const K_DEF =
  "layer scroll speed / page scroll speed; 1=follows content, 0=pinned to viewport";

/** 实测值（1440×900 与 430×932 上量的 section 高度）。 */
const MEASURED = {
  desktop: { vw: 1440, vh: 900, heroH: 828, pageH: 6373 },
  mobile: { vw: 430, vh: 932, heroH: 857, pageH: 8119 },
};

/**
 * ⚠️ 画布必须按**支持的最大视口**算，不能按参考视口算。
 *
 * 第一版按 1440×900 算，多分辨率验收当场报：1920 宽要 1580px、只给了 1326px，
 * 滚到一半露白；1440 那档更险，只多出 1px 余量。
 * hero 高度是 0.92svh，视口一高 S 就跟着涨，两边一起放大。
 *
 * 这就是 LESSONS 第 1 条那句「与运动距离相互作用的几何量都要反算」——
 * 反算的基准得是最坏情况，不是手边那台显示器。
 */
const DESIGN_FOR = {
  desktop: { vw: 3440, vh: 1440 },
  mobile: { vw: 480, vh: 1080 },
};

/** hero 高度占视口高的比例（min-h-[92svh] 的实测折算）。 */
const HERO_VH_RATIO = MEASURED.desktop.heroH / MEASURED.desktop.vh;

const round50 = (n) => Math.ceil(n / 50) * 50;

/** 最坏情况下的滚动行程 —— 画布用它，不用参考视口那个。 */
function worstS(bp) {
  return round50(DESIGN_FOR[bp].vh * HERO_VH_RATIO);
}

/** canvasH ≥ viewportH + S × |1 − k|；canvasW ≥ viewportW × 1.15 */
function coverCanvas(bp, _S, k) {
  const { vw, vh } = DESIGN_FOR[bp];
  const S = worstS(bp);
  return {
    w: Math.ceil((vw * 1.15) / 2) * 2,
    h: Math.ceil((vh + S * Math.abs(1 - k)) / 2) * 2,
    netTravel: Math.round(S * Math.abs(1 - k)),
    sizedFor: `${vw}×${vh}（支持的最大视口），S=${S}`,
  };
}

/**
 * canvas 比例 → 拿去出图的比例。
 * 超过 1:2 一律 9:16 —— 极端竖比会让模型自己加戏（链条级教训 #1）。
 */
function genRatioFor(w, h) {
  const r = h / w;
  if (r > 2) return { ratio: "9:16", rw: 9, rh: 16 };
  if (r > 1.45) return { ratio: "3:4", rw: 3, rh: 4 };
  if (r > 1.15) return { ratio: "5:6", rw: 5, rh: 6 };
  if (r > 0.85) return { ratio: "1:1", rw: 1, rh: 1 };
  if (r > 0.6) return { ratio: "3:2", rw: 3, rh: 2 };
  return { ratio: "16:9", rw: 16, rh: 9 };
}

/**
 * WebP 字节估算。近黑、低频、带 alpha 的图，实测大致 0.08 字节/像素。
 * 这只是个量级估算，用来在**出图之前**就拦住会破 ADR-0008 的层 ——
 * 图已经生成再来发现超重，返工成本高一个量级。
 */
const estWebpBytes = (w, h) => Math.round(w * h * 0.08);

function withGen(canvas, strategy = "transparent") {
  const g = genRatioFor(canvas.w, canvas.h);
  const genH = Math.round((canvas.w * g.rh) / g.rw);
  return {
    canvas: { w: canvas.w, h: canvas.h },
    genRatio: g.ratio,
    padTop: Math.max(0, canvas.h - genH),
    padStrategy: strategy,
    estBytes: estWebpBytes(canvas.w, canvas.h),
    netTravel: canvas.netTravel,
  };
}

// ── s0 序幕：时间驱动，不是滚动驱动 ──────────────────────────────────
//
// 水滴遮罩要长到完全盖过视口才算「穿过去」。终值必须由视口反算 ——
// 写死 vw 会在竖屏上不够（LESSONS #1：与运动量相互作用的几何都要反算）。
//
//   finalW = max(vw, vh × 水滴宽高比) × 1.3
//
// 再配一个像素兜底：视口高被报成 0 时（这个环境真的出现过），vh 项归零，
// max 仍能落到 vw 上，不会算出 0 而让穿透永远完不成。
const DROP_ASPECT = 3 / 4; // 水滴：宽 3 高 4

function overtureFor(bp) {
  const { vw, vh } = MEASURED[bp];
  const finalW = Math.round(Math.max(vw, vh * DROP_ASPECT, 320) * 1.3);
  return {
    startW: Math.round(Math.min(vw, vh) * 0.18),
    peekW: Math.round(Math.min(vw, vh) * 0.26),
    finalW,
    finalWvw: +((finalW / vw) * 100).toFixed(0),
    coversViewport: finalW >= vw && finalW / DROP_ASPECT >= vh,
  };
}

const s0 = {
  parent: "project.json",
  section: "s0-overture",
  driver: "time",
  note:
    "序幕是时间驱动不是滚动驱动，所以没有 scrollDistance，也不占页面高度。" +
    "下游实现时它是一层覆盖在 hero 之上的遮罩，hero 本身照常渲染在下面。",
  kDefinition: K_DEF,
  timeline: {
    total: 900,
    unit: "ms",
    easing: "cubic-bezier(0.6, 0, 0, 1)",
    easingNote:
      "专供穿透的曲线，极端后段爆发：前半段几乎不动，最后一下猛冲。别拿它做别的动效。",
    keyframes: [
      { t: 0, dropW: "startW", orbScale: 0.75, label: "静止，只见一个小水滴轮廓" },
      { t: 260, dropW: "peekW", orbScale: 0.82, label: "缓缓张开，看清洞里是那颗球" },
      { t: 900, dropW: "finalW", orbScale: 1.0, label: "猛冲穿过，遮罩越过视口边界" },
    ],
    concurrent:
      "洞放大的同时，洞里的球体 scale 0.75 → 1 迎上来。" +
      "「前景放大 + 后景 0.75→1 同步」是 ERA 四次穿透的通用配方 —— " +
      "少了后景那一半，穿过去会像撞墙。",
  },
  breakpoints: {
    desktop: { ...overtureFor("desktop"), viewport: MEASURED.desktop },
    mobile: { ...overtureFor("mobile"), viewport: MEASURED.mobile },
  },
  gates: [
    "首访才播：sessionStorage 记住",
    "减弱动态偏好下整段不执行",
    "hero 文字必须在遮罩下方照常绘制，不能 opacity:0 —— 见 project.json 的 opening.gates",
  ],
  transition: {
    in: { type: null, notes: "站点入口，没有上一屏" },
    out: {
      type: "zoom-through",
      requires: "遮罩层本身就是「洞」，终值必须完全越过视口（coversViewport 已验算）",
    },
  },
};

// ── s1 首屏：滚动驱动 ────────────────────────────────────────────────
//
// 分层。L3 是水面 —— 它就是 s1 → s2 那次 zoom-through 的「洞」，
// 所以它的 k 必须 > 1（技能里这条是硬性的）。
const S1_LAYERS = [
  {
    id: "s1-L0-void",
    z: 0,
    role: "水面之上的暗空。纯垂直渐变，没有纹理。",
    k: { desktop: 0.05, mobile: 0.35 },
    fill: "cover",
    alpha: false,
    blend: "normal",
    // 纯渐变不出图：零资产、零接缝、还省带宽（技能第 3 节的首选路子）
    strategy: "css-gradient",
    gradient: "linear-gradient(180deg, #07080b 0%, #0a0b10 62%, #0e1015 100%)",
  },
  {
    id: "s1-L1-mist",
    z: 1,
    role: "远景水汽与悬浮微粒，铺满，极淡。",
    k: { desktop: 0.25, mobile: 0.45 },
    fill: "cover",
    alpha: true,
    blend: "screen",
    // 铺满层按最坏视口算出来是 3956×2454 ≈ 776KB —— 一层就把 ADR-0008 的
    // 800KB 首屏总重吃光。而这层是纯低频光雾，没有任何需要模型画的细节：
    // 两三个 radial-gradient 加站上已有的噪点层就够，零字节、零接缝、还不用抠图。
    strategy: "css-radial",
    gradient:
      "radial-gradient(60% 45% at 68% 38%, rgba(124,130,240,0.10), transparent 70%), " +
      "radial-gradient(45% 35% at 22% 72%, rgba(154,160,255,0.06), transparent 70%)",
  },
  {
    id: "s1-L2-orb",
    z: 2,
    role: "液态球体 —— 品牌图形本体，跨过画面中线，左侧留干净暗区。",
    k: { desktop: 0.55, mobile: 0.7 },
    fill: "object",
    // 球体是离散主体，画布是它自己的框，不是视口。
    // 设计尺寸取视口短边的 0.9，再按位移补足。
    objectScale: 0.9,
    alpha: true,
    blend: "screen",
    strategy: "transparent",
  },
  {
    id: "s1-L3-surface",
    z: 3,
    role: "水面。这层就是 s1 → s2 那次 zoom-through 的「洞」。",
    k: { desktop: 1.5, mobile: 1.3 },
    fill: "bottom",
    alpha: true,
    // Gate B 第 6 条：水面全是焦散、半透明与水花，rembg 那类显著性抠图会把它
    // 整张判成背景（这个坑在婚礼站踩过三次）。走第二条路 —— 画在纯黑上、
    // blend: screen、**完全不抠图**。这也正是本站现有球体的合成方式。
    blend: "screen",
    // 这层真的需要纹理（焦散），不能交给 CSS。但水面是横向重复的东西 ——
    // 出一条可左右无缝拼接的窄条，用 repeat-x 铺开，宽度就不必跟着视口涨。
    // 3956 宽 → 1280 宽，字节掉到三分之一。
    strategy: "tile-x",
    tileW: 1280,
    /**
     * ⚠️ 只在**退场那一段**才动，不是整屏跟着滚。
     *
     * Gate B 第 7 条实测：k=1.5 从头跟到尾的话，滚到 150px 水面上缘就已经
     * 爬到标题里了（0.72vh 起步，每滚 1px 相对文字上移 0.5px）。
     * k>1 是 zoom-through 的硬要求，所以不能降 k —— 要降的是它「什么时候开始动」。
     *
     * 抄 ERA 的 img-out：trigger 从「区块底边碰到视口底边」才起算，
     * 到「区块底边离开视口顶边」结束。那时文字早已滚出画面。
     */
    triggerWindow: { start: "bottom bottom", end: "bottom top" },
  },
];

function s1For(bp) {
  const { vw, vh, heroH } = MEASURED[bp];
  const S = round50(heroH); // 首屏从页顶开始，可见行程 = 它自己的高度
  const layers = S1_LAYERS.map((L) => {
    const k = L.k[bp];
    const base = { id: L.id, z: L.z, k, role: L.role, alpha: L.alpha, blend: L.blend };
    if (L.strategy === "css-gradient" || L.strategy === "css-radial") {
      return {
        ...base,
        anchor: "cover",
        canvas: null,
        genRatio: null,
        padTop: 0,
        padStrategy: L.strategy,
        gradient: L.gradient,
        estBytes: 0,
        netTravel: Math.round(S * Math.abs(1 - k)),
      };
    }
    if (L.fill === "object") {
      const D = DESIGN_FOR[bp];
      const size = Math.round(Math.min(D.vw, D.vh) * L.objectScale);
      const travel = Math.round(worstS(bp) * Math.abs(1 - k));
      const canvas = {
        w: Math.ceil(size / 2) * 2,
        h: Math.ceil((size + travel) / 2) * 2,
        netTravel: travel,
      };
      return { ...base, anchor: "center-right", ...withGen(canvas) };
    }
    const canvas = coverCanvas(bp, S, k);
    if (L.strategy === "tile-x") {
      // 横向可无缝拼接：宽度固定成一条，不跟视口涨
      canvas.w = L.tileW;
      if (L.triggerWindow) {
        // 只在退场段跑：行程 = 一个视口高，不是整个 S
        const Sexit = DESIGN_FOR[bp].vh;
        const travel = Math.round(Sexit * Math.abs(1 - k));
        canvas.h = Math.ceil((DESIGN_FOR[bp].vh + travel) / 2) * 2;
        canvas.netTravel = travel;
      }
      return {
        ...base,
        anchor: "bottom",
        repeat: "repeat-x",
        tileW: L.tileW,
        triggerWindow: L.triggerWindow,
        ...withGen(canvas, "tile-x"),
      };
    }
    return { ...base, anchor: L.fill === "bottom" ? "bottom" : "cover", ...withGen(canvas) };
  });
  const ks = layers.map((l) => l.k);
  return { scrollDistance: S, scrollDistanceSource: `实测 hero 高度 ${heroH}px，取整到 50`, kSpread: [Math.min(...ks), Math.max(...ks)], viewport: { vw, vh }, layers };
}

const s1 = {
  parent: "project.json",
  section: "s1-drop",
  driver: "scroll",
  kDefinition: K_DEF,
  breakpoints: { desktop: s1For("desktop"), mobile: s1For("mobile") },
  mobileKNote:
    "手机端 k 带收窄到 0.35~0.7（技能建议 0.3~0.9）—— 屏小滚得快，desktop 那套跨度搬过来会晕。" +
    "唯一的例外是 L3 水面：它是 zoom-through 的洞，k 必须 > 1，所以留在 1.3。这是有意偏离，不是漏改。",
  transition: {
    in: { type: "zoom-through", notes: "承接 s0 序幕，落进画面" },
    out: { type: "zoom-through", requires: "L3-surface k ≥ 1.3（desktop 1.5 / mobile 1.3）✓" },
  },
};

const dir = join(process.cwd(), "parallax");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "s0-overture.motion.json"), JSON.stringify(s0, null, 2) + "\n", "utf8");
writeFileSync(join(dir, "s1-drop.motion.json"), JSON.stringify(s1, null, 2) + "\n", "utf8");

// ── 人类可读的核对表 ────────────────────────────────────────────────
console.log("=== s0-overture（时间驱动，900ms）===");
for (const bp of ["desktop", "mobile"]) {
  const o = s0.breakpoints[bp];
  console.log(
    `  ${bp.padEnd(8)} 视口 ${o.viewport.vw}×${o.viewport.vh}  水滴宽 ${o.startW} → ${o.peekW} → ${o.finalW}px (${o.finalWvw}vw)  完全盖过视口: ${o.coversViewport ? "✓" : "✗"}`,
  );
}

console.log("\n=== s1-drop（滚动驱动）===");
for (const bp of ["desktop", "mobile"]) {
  const b = s1.breakpoints[bp];
  console.log(`  ${bp}  视口 ${b.viewport.vw}×${b.viewport.vh}  S=${b.scrollDistance}px  k 带 ${b.kSpread[0]}~${b.kSpread[1]}`);
  console.log("    层                k     净位移   canvas         genRatio  padTop   估重   策略");
  for (const l of b.layers) {
    const c = l.canvas ? `${l.canvas.w}×${l.canvas.h}` : "—（不出图）";
    const kb = l.estBytes ? (l.estBytes / 1024).toFixed(0) + "KB" : "0";
    console.log(
      `    ${l.id.padEnd(16)} ${String(l.k).padStart(4)}  ${String(l.netTravel).padStart(6)}   ${c.padEnd(14)} ${String(l.genRatio ?? "—").padEnd(9)} ${String(l.padTop).padStart(6)} ${kb.padStart(6)}  ${l.padStrategy}`,
    );
  }
  const total = b.layers.reduce((n, l) => n + (l.estBytes ?? 0), 0);
  b.artBytesEstimate = total;
  console.log(`    分层美术合计 ${(total / 1024).toFixed(0)}KB（ADR-0008 首屏总重上限 800KB，现有 HTML+JS+CSS 约 183KB、字体约 62KB）`);
}

// ── 多分辨率验收（LESSONS #3）────────────────────────────────────────
console.log("\n=== 多分辨率验收：序幕终值是否仍能盖过视口 ===");
for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [3440, 1440], [430, 932], [375, 667]]) {
  const finalW = Math.round(Math.max(w, h * DROP_ASPECT, 320) * 1.3);
  const ok = finalW >= w && finalW / DROP_ASPECT >= h;
  console.log(`  ${String(w).padStart(4)}×${String(h).padStart(4)}  finalW ${String(finalW).padStart(5)}px  ${ok ? "✓" : "✗ 盖不住"}`);
}

/**
 * 逐层 × 逐分辨率验算，用的是**交付里真实的 canvas 数字**，不是重算一遍。
 * 第一版这里拿了个手写的 have 值，与交付脱节，改完 canvas 表还在报旧错。
 */
console.log("\n=== 多分辨率验收：每层画布够不够（不露白）===");
const GRID = {
  desktop: [[1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [3440, 1440]],
  mobile: [[375, 667], [430, 932], [480, 1080]],
};
let allOk = true;
for (const bp of ["desktop", "mobile"]) {
  for (const L of s1.breakpoints[bp].layers) {
    if (!L.canvas) continue; // CSS 渐变层没有画布
    for (const [w, h] of GRID[bp]) {
      const S = L.triggerWindow ? h : round50(h * HERO_VH_RATIO);
      const needH = Math.ceil(h + S * Math.abs(1 - L.k));
      const needW = Math.ceil(w * 1.15);
      // 两类层不受「宽度要盖满视口」约束：
      //   离散主体（球体）—— 它只需容下自身 + 位移
      //   repeat-x 平铺条 —— 宽度靠重复补，本来就不该跟视口涨
      const exemptW = L.anchor === "center-right" || L.repeat === "repeat-x";
      const okH = L.anchor === "center-right" ? true : L.canvas.h >= needH;
      const okW = exemptW ? true : L.canvas.w >= needW;
      if (!okH || !okW) {
        allOk = false;
        console.log(
          `  ✗ ${bp} ${L.id} @${w}×${h}  高 需${needH} 有${L.canvas.h}${okH ? "" : " ←"}  宽 需${needW} 有${L.canvas.w}${okW ? "" : " ←"}`,
        );
      }
    }
  }
}
console.log(allOk ? "  ✓ 全部分辨率、全部图层都够" : "  ↑ 上面这些不够，改 DESIGN_FOR 或改用 CSS");
