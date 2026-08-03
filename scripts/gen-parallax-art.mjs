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
  "underside of calm water. Fine suspended particles drift in the water immediately beneath it.",
  "Photographic underwater look — real refraction, real caustic geometry. Not an abstract",
  "wave graphic, not a vector pattern, not a 3D render.",
  "",
  "COLOUR — this is the part the last attempt got wrong:",
  "The caustics must be INDIGO (#7c82f0), not white and not sky blue. Only the very thinnest",
  "filament tips may reach #9aa0ff. Measured on the previous attempt the brightest 2% averaged",
  "RGB(227,227,244) — almost pure white. Pull the whole band toward indigo: the brightest",
  "pixels should sit near RGB(154,160,255) and the mid-bright body near RGB(124,130,240).",
  "No cyan, no teal, no warm tones anywhere.",
  "",
  "COMPOSITION — three hard requirements:",
  "1. Portrait 3:4. The caustic band sits across the UPPER THIRD but must NOT touch the top",
  "   edge — leave the top 12% of the frame as pure flat black, with the band fading INTO that",
  "   black. The previous attempt ran the band straight off the top edge, which becomes a hard",
  "   horizontal line across the whole screen once composited.",
  "2. Everything below the band fades progressively to pure black by 65% frame height.",
  "3. EVEN illumination across the full width. The previous attempt was 2.08× brighter in the",
  "   centre than at the edges. No centre hotspot, no falloff toward the sides, no vignette.",
  "   Imagine the light source is an infinitely wide overcast sky, not a lamp.",
  "",
  BLACK_PLATE,
  NO_CROSS_LAYER,
  "",
  "NEGATIVE: no text, no watermark, no sky, no horizon line above the water, no boat, no shore,",
  "no swimmer, no fish, no bubbles rising, no sun disc, no god rays fanning from a point,",
  "no centre hotspot, no vignette, no darker corners, no white highlights, no cyan,",
  "no orb or sphere of any kind.",
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
      sharedWhy: "水平同质的带 —— 两端共用一条，宽度靠平铺补。",
      content: "水面（从下方看的焦散网）。这层就是 s1 → s2 那次 zoom-through 的「洞」。",
      asset: "procedural",
      generate: false,
      generator: "scripts/gen-caustics.py",
      status: "已落地。**改成程序化生成，不再走出图模型** —— 理由见 review。",
      genCanvas: surfCanvas,
      genRatio: "3:4",
      /**
       * ⚠️ 平铺方式改成**镜像**，不是简单 repeat-x。
       *
       * 第一版实测：左右边缘列平均差 15.7、最大行差 220.6，横向还有 2.08 倍的
       * 中心热点 —— 直接 repeat-x 会出现规律明暗波纹加每个接缝一条硬线。
       *
       * 让模型画「左右能对上的图」这件事基本不可靠，别再要第二次。
       * 改成镜像平铺：正向一张 + 水平翻转一张拼成 2× 宽，**接缝天然为零**。
       * 焦散是无序纹理，对称几乎看不出来。
       */
      repeat: "mirror-x",
      repeatImpl:
        "两个背景层：第一层原图，第二层 transform: scaleX(-1) 或 CSS " +
        "`image-rendering` 侧的水平翻转；合起来构成一个 2× 宽的无缝循环单元。",
      blend: "screen",
      padStrategy: "black-plate",
      /**
       * 顶边硬边的兜底。LESSONS #4：硬边归合成期解决，不要指望出图时就没有。
       * 就算重出的图顶边仍有残留，这层 mask 也能把它化掉。
       */
      topFadeMask:
        "mask-image: linear-gradient(180deg, transparent 0%, #000 14%) —— 顶边 14% 渐隐",
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
  /** Phase 4 回检 —— 全部是量出来的数字，不是看出来的。 */
  review: {
    date: "2026-08-02",
    method: "PIL + numpy 逐像素量测，非目视",
    "s1-L2-orb": {
      verdict: "通过，直接用",
      底色: "四角均值 RGB 2~4、最大 47。screen 合成下把站底色抬亮约 1%，看不出",
      亮度分离: "中位 5.5 / P95 185 / 峰值 255 —— 主体与底黑拉得开",
      构图: "宽占画面 80%（规格 ~78%）· 中心 y 0.519（规格「略低于 0.5」）· 上方干净留白 22%",
      尺寸: "1728×2304 = 3:4，与 genRatio 一致；缩到 canvas 宽 1296 后 padTop 176，与 motion 规格吻合",
      内容: "多瓣融合、虹彩橙青蓝紫齐全、内部有焦散、无卫星水滴、无飞溅、无硬边气泡环、无镜头光晕",
    },
    "s1-L3-surface": {
      verdict: "两次生成均不合格 → 改为程序化生成，已落地",
      最终方案:
        "scripts/gen-caustics.py —— 八个方向不同的平面波叠加取零交叉。" +
        "横向频率取整数 → 左右天然无缝；无光源 → 横向天然均匀；颜色直接取自 Palette。" +
        "实测 中心/边缘 0.91 · 接缝比值 1.15 · 顶 12% 亮度 0.00 · 50KB（AI 版估算 212KB）。",
      第二次生成:
        "顶边留黑修好了（顶 12% 亮度 0.2、两角全黑），但横向均匀反而更糟：" +
        "中心/边缘 2.08 → 8.46，两端几乎纯黑；色相几乎没动（最亮 2% 仍是 228,225,241）。" +
        "而且下载的 PNG 本身是坏的（没有 IEND 块，第 1315 行一刀切为 0）。",
      为什么不做后期兜底:
        "一度提出用脚本把横向剖面归一化，实测不成立并已收回：" +
        "两端不是偏暗而是**空的**（8 段里首尾都是 0），归一化能拉亮暗区，" +
        "不能凭空造出不存在的内容 —— 中心/边缘只从 77 降到 22。",
      指标过不等于图对:
        "程序化第一版八项指标全过（均匀 1.05、无缝 0.91、顶边 0.00），" +
        "但图是一片竖条纹不是焦散 —— 基函数写成了沿 x 单向传播的波。" +
        "改成二维波矢才对。**每一版都要看图，不能只看数字。**",
      问题1_拼不上:
        "左右边缘列平均差 15.7、最大行差 220.6；横向亮度剖面 [83,113,158,177,151,122,95,74]，" +
        "中心/边缘 2.08 倍热点。repeat-x 会出规律明暗波纹加接缝硬线。" +
        "**处置：不再要求模型做无缝，改镜像平铺。**",
      问题2_顶边硬边:
        "顶部两角均值 RGB(111,126,168) 与 (92,109,190)，亮带一路顶到 y=0.00。" +
        "screen 合成后是一条横贯全屏的硬边（婚礼站 LESSONS #4 同一个坑）。" +
        "**处置：prompt 要求顶部 12% 留纯黑，另加 CSS 顶边渐隐兜底。**",
      问题3_色相偏白:
        "最亮 2% 平均 RGB(227,227,244) 近乎纯白；中亮区 (124,136,194)。" +
        "目标是 #7c82f0 (124,130,240) 与 #9aa0ff (154,160,255)。" +
        "**处置：prompt 里写死目标 RGB 数值，并把 white highlights 加进 NEGATIVE。**",
      合格项: "水面带位置（上三分之一）✓ · 下方渐暗到黑 ✓ · 尺寸 3:4 ✓ · 无天空无地平线无杂物 ✓",
    },
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
