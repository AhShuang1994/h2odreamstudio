/**
 * 生成 parallax/<section>.json —— 链条第三环，**下游 agent 的唯一入口**。
 * 它不必再去拼 project.json 和 motion.json，两者的内容都在这里。
 *
 * 只写规格，不写 CSS/JS/组件。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const read = (f) => JSON.parse(readFileSync(join(process.cwd(), "parallax", f), "utf8"));
const project = read("project.json");
const m0 = read("s0-overture.motion.json");
const m1 = read("s1-drop.motion.json");
const s1meta = project.sections.find((s) => s.id === "s1-drop");

const SB = project.styleBible;

/** 两张图共用的硬约束 —— 每条 prompt 都要带。 */
const BLACK_PLATE = [
  "Render on a PURE BLACK background (#000000, absolutely flat, no gradient, no vignette).",
  "The plate is composited with CSS mix-blend-mode: screen, so black = fully transparent.",
  "Do NOT include an alpha channel, do NOT cut out, do NOT add a checkerboard.",
  "Nothing in the image may be pure black except the background itself.",
].join(" ");

const NO_CROSS_LAYER = [
  "This layer is composited separately from every other layer.",
  "Therefore: no cast shadows onto anything, no reflections of anything, no objects that",
  "continue outside this layer's subject. The layer must read correctly in isolation.",
].join(" ");

// ── s0 序幕 ──────────────────────────────────────────────────────────
// 序幕不出新图：遮罩是 SVG 轮廓，洞里透出的就是 s1 的球体。
const s0 = {
  parent: ["project.json", "s0-overture.motion.json"],
  section: "s0-overture",
  styleDelta: {
    "palette-shift": "全黑起步，只有洞里那颗球有色 —— 全站明度最低的一屏",
    "fog-density": "0（洞外是纯黑，不是雾）",
  },
  kDefinition: m0.kDefinition,
  driver: m0.driver,
  timeline: m0.timeline,
  breakpoints: m0.breakpoints,
  gates: m0.gates,
  art: [
    {
      id: "s0-mask-drop",
      sharedAcross: ["desktop", "mobile"],
      content:
        "水滴轮廓，**单个 SVG path，不出位图**。宽高比 3:4，顶端收尖、底部饱满，" +
        "左右对称。它只当遮罩用，本身没有颜色也没有描边。",
      asset: "svg-path",
      file: "public/assets/parallax/drop-mask.svg",
      generate: false,
      why: "遮罩主体是矢量轮廓不是图片 —— ERA 的拱门穿透便宜就便宜在这里。",
    },
    {
      id: "s0-orb-reveal",
      sharedAcross: ["desktop", "mobile"],
      content: "洞里透出的球体。**复用 s1-L2-orb 那一张，不另出图。**",
      asset: "reuse",
      reuseOf: "s1-L2-orb",
      generate: false,
      why: "序幕和首屏看到的必须是同一颗球，否则穿过去等于换了个东西。",
    },
  ],
};

// ── s1 首屏 ──────────────────────────────────────────────────────────
const orbCanvas = m1.breakpoints.desktop.layers.find((l) => l.id === "s1-L2-orb").canvas;
const surfCanvas = m1.breakpoints.desktop.layers.find((l) => l.id === "s1-L3-surface").canvas;

const ORB_PROMPT = [
  SB,
  "",
  "SUBJECT — s1-L2-orb (the brand's liquid orb, the single hero object of this screen):",
  "A soap-film iridescent multi-lobed fluid form, like several water droplets fused into one",
  "suspended mass. Thin-film interference across the membrane produces orange, cyan, blue and",
  "violet banding — this orb is the ONLY place in the entire site where more than one hue appears.",
  "The interior is alive: membrane undulations, caustic light travelling inside the body,",
  "a slow breathing swell. It is lit from its own inside, not from outside.",
  "It must read as a photographed physical fluid, not as a 3D render and not as an illustration.",
  "",
  "COMPOSITION:",
  "Portrait 3:4. The orb occupies roughly 78% of the frame width, centred horizontally,",
  "with its mass sitting slightly BELOW centre so there is clean empty space above it.",
  "Silhouette must stay a single readable blob — no satellite droplets flying off,",
  "no splash, no ring, no halo ring, no lens flare.",
  "",
  BLACK_PLATE,
  NO_CROSS_LAYER,
  "",
  "NEGATIVE: no text, no watermark, no glass sphere, no crystal ball, no planet, no bubble with",
  "a visible hard rim, no studio reflection highlights, no reflected environment, no ground plane,",
  "no water surface, no horizon, no cast shadow, no drop shadow, no white or grey background,",
  "no vignette, no dust specks outside the orb.",
].join("\n");

const SURFACE_PROMPT = [
  SB,
  "",
  "SUBJECT — s1-L3-surface (the underside of a calm water surface, seen from just below it):",
  "A horizontal band of water-surface caustics: the rippling net of light that forms on the",
  "underside of calm water. Cold white shading to indigo (#7c82f0), brightest filaments tipping",
  "toward #9aa0ff. Fine suspended particles drift in the water immediately beneath it.",
  "Photographic underwater look — real refraction, real caustic geometry. Not an abstract",
  "wave graphic, not a vector pattern, not a 3D render.",
  "",
  "COMPOSITION — this is a TILE, read this carefully:",
  "Portrait 3:4. The water surface itself sits as a horizontal band across the UPPER THIRD",
  "of the frame; everything below it is progressively darker open water fading to black.",
  "The image must tile SEAMLESSLY left-to-right: the caustic pattern at the left edge must",
  "continue exactly into the right edge, with no feature straddling either edge and no",
  "vignetting or brightness falloff toward the sides. Even illumination across the full width.",
  "",
  BLACK_PLATE,
  NO_CROSS_LAYER,
  "",
  "NEGATIVE: no text, no watermark, no sky, no horizon line above the water, no boat, no shore,",
  "no swimmer, no fish, no bubbles rising, no sun disc, no god rays fanning from a point,",
  "no vignette, no darker corners, no visible seam, no orb or sphere of any kind.",
].join("\n");

const STYLE_PLATE_PROMPT = [
  SB,
  "",
  "MASTER STYLE PLATE — one complete un-layered scene, used only as the style reference",
  "for every layer prompt that follows. Do not use it on the site.",
  "",
  "SCENE: Looking slightly upward from just above a black, still water surface at night.",
  "A soap-film iridescent liquid orb hangs to the right of centre, glowing from within;",
  "the left third of the frame is clean, empty, near-black space. Below, the water surface",
  "carries a faint net of cold indigo caustics. Volumetric haze, fine suspended particles,",
  "very light film grain.",
  "",
  "Landscape 3:2. Near-black overall — the whole image should sit between 2% and 16% luminance",
  "except the orb itself. The orb is the only saturated, multi-hued thing in the frame.",
  "",
  "NEGATIVE: no text, no watermark, no people, no boat, no shore, no sky detail, no stars,",
  "no warm colours anywhere except inside the orb, no bright background, no vignette.",
].join("\n");

const s1 = {
  parent: ["project.json", "s1-drop.motion.json"],
  section: "s1-drop",
  styleDelta: {
    "palette-shift": "全站最亮的一屏（水面之上，直射光可见），通透度 85%",
    "light-direction": "上方偏左 12°，直射可见 —— s2 之后改为散射",
    "horizon-y": `水面线 desktop ${s1meta.transitionOut.horizonY.desktop} / mobile ${s1meta.transitionOut.horizonY.mobile}`,
  },
  kDefinition: m1.kDefinition,
  driver: m1.driver,
  breakpoints: m1.breakpoints,
  mobileKNote: m1.mobileKNote,
  transition: m1.transition,
  textSafeArea: s1meta.textSafeArea,
  gateB: {
    "1-跨层连续物体": "过 —— 球体与水面各自独立，没有跨层的同一个物体",
    "2-跨层投影": "过 —— 两条 prompt 都写死禁止投影与反射（球体不在水面留倒影）",
    "3-明度分离":
      "有意偏离：两张图都是黑底发光板（blend: screen），不适用「由远及近明度递减」。" +
      "改用发光强度分离：CSS 雾层最弱 → 水面焦散居中 → 球体最亮。",
    "4-剪影可读性": "过 —— 球体是单一团块、水面是横向带，两端共用同一张，裁切不改变可读性",
    "5-Overscan": "过 —— 数字原样取自 motion.json，未自行修改",
    "6-抠图可行性":
      "两层都含半透明/发光/水花，rembg 会整张判成背景（婚礼站踩过三次）。" +
      "按 Gate B 第 6 条第二条路降级：纯黑底 + blend screen，**完全不抠图**。",
    "7-文字安全区":
      "第一版没过。k=1.5 的水面从头跟到尾，滚 150px 就爬进标题。" +
      "已回退给 motion-spec 修：加 triggerWindow 只在退场段动，文字可见期间位移恒为 0。",
  },
  art: [
    {
      id: "s1-L0-void",
      sharedAcross: ["desktop", "mobile"],
      content: "水面之上的暗空。纯垂直渐变。",
      asset: "css",
      generate: false,
      css: m1.breakpoints.desktop.layers.find((l) => l.id === "s1-L0-void").gradient,
    },
    {
      id: "s1-L1-mist",
      sharedAcross: ["desktop", "mobile"],
      content: "远景水汽。两个径向渐变叠站上已有的噪点层。",
      asset: "css",
      generate: false,
      css: m1.breakpoints.desktop.layers.find((l) => l.id === "s1-L1-mist").gradient,
      why: "按最坏视口出图是 3956×2454 ≈ 776KB，一层吃光 ADR-0008 的首屏总重；而它没有任何需要模型画的细节。",
    },
    {
      id: "s1-L2-orb",
      sharedAcross: ["desktop", "mobile"],
      sharedWhy:
        "左右对称、居中的独立物体 —— 裁掉两侧仍认得出是什么，两端同为 3:4，一张图两端复用。",
      content:
        "液态球体，品牌图形本体。全站唯一允许多彩的东西（ADR-0007）。内部有膜的起伏与焦散流动。",
      asset: "image",
      generate: true,
      genCanvas: orbCanvas,
      genRatio: "3:4",
      blend: "screen",
      padStrategy: "black-plate",
      seed: "public/assets/bg-1.webp",
      seedNote:
        "**必须以现有素材作参考图做图生图，不要从零文生图。** 现行站已经在用这颗球（1024×1024），" +
        "ADR-0001 明确要求品牌连续性优先于新鲜感 —— 换一颗新的球等于换 logo。",
      file: "public/assets/parallax/s1-l2-orb.webp",
      prompt: ORB_PROMPT,
    },
    {
      id: "s1-L3-surface",
      sharedAcross: ["desktop", "mobile"],
      sharedWhy: "水平同质的带 —— 横向可无缝拼接，两端共用一条，宽度靠 repeat-x 补。",
      content: "水面（从下方看的焦散网）。这层就是 s1 → s2 那次 zoom-through 的「洞」。",
      asset: "image",
      generate: true,
      genCanvas: surfCanvas,
      genRatio: "3:4",
      repeat: "repeat-x",
      blend: "screen",
      padStrategy: "black-plate",
      file: "public/assets/parallax/s1-l3-surface.webp",
      prompt: SURFACE_PROMPT,
    },
  ],
  masterStylePlate: {
    purpose: "风格基准。先出这张，确认后作为参考图带进上面两条 prompt。它本身不上站。",
    genRatio: "3:2",
    file: "docs/parallax/s1-style-plate.webp",
    prompt: STYLE_PLATE_PROMPT,
  },
  pipeline: [
    "① 出 master style plate → 阿爽确认风格",
    "② 以 style plate 作参考图，出 s1-L2-orb（同时再带 bg-1.webp 作形体种子）与 s1-L3-surface",
    "③ **不跑抠图** —— 两张都是黑底发光板，blend: screen 时黑色即透明",
    "④ **不跑补画布** —— 黑底延伸在 screen 下是无操作，位置交给 CSS background-position: bottom",
    "⑤ 转 WebP 后核对实际字节：估算 desktop 409KB / mobile 165KB，超了回来调 canvas",
  ],
};

writeFileSync(
  join(process.cwd(), "parallax", "s0-overture.json"),
  JSON.stringify(s0, null, 2) + "\n",
  "utf8",
);
writeFileSync(
  join(process.cwd(), "parallax", "s1-drop.json"),
  JSON.stringify(s1, null, 2) + "\n",
  "utf8",
);

console.log("=== 图层表（两端并排）===");
console.log("层                共用?  k(D/M)     canvas(D)      genRatio  出图?  合成");
for (const a of s1.art) {
  const d = m1.breakpoints.desktop.layers.find((l) => l.id === a.id);
  const mo = m1.breakpoints.mobile.layers.find((l) => l.id === a.id);
  const c = d.canvas ? `${d.canvas.w}×${d.canvas.h}` : "—";
  console.log(
    `${a.id.padEnd(16)} ${(a.sharedAcross ? "共用" : "两套").padEnd(5)} ${String(d.k).padStart(4)}/${String(mo.k).padEnd(5)} ${c.padEnd(14)} ${String(d.genRatio ?? "—").padEnd(9)} ${(a.generate ? "是" : "否").padEnd(5)} ${d.blend}`,
  );
}
const gen = s1.art.filter((a) => a.generate).length;
console.log(`\n要生成的图：${gen} 张 + 1 张 style plate = ${gen + 1} 次生成`);
console.log("抠图：0 次（两张都是黑底发光板）· 补画布：0 次（黑底在 screen 下是无操作）");
