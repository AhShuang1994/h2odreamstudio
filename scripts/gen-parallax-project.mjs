/**
 * 生成 parallax/project.json —— 站级规格，后两环（motion-spec / art-director）读它。
 *
 * copy budget 按 skill 的几何公式算，两端各算一份取 min，再向下取整到整行倍数。
 * 与常规立项不同的一点：**本站文案是冻结的**（#66 规定七区块文案一字不改），
 * 所以这里额外把实际字数与预算并排放，超了就标出来 —— 由版面让步，不是文案让步。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BP = {
  desktop: { w: 1440, h: 900, master: { w: 2560, h: 1600 }, composition: "landscape" },
  mobile: { w: 430, h: 932, master: { w: 1290, h: 2796 }, composition: "portrait" },
};

/** 编辑常规上限（skill 的表）。 */
const EDITORIAL = { zh: { headline: 14, sub: 40 }, en: { headline: 45, sub: 120 } };

const LINE_HEIGHT = 1.1; // 展示字号的行高倍数

/** 几何上界：每行字符数 × 行数 × 0.85。 */
function geometric(bp, safe, fontPx, share) {
  const wPx = (safe.x[1] - safe.x[0]) * BP[bp].w;
  const hPx = (safe.y[1] - safe.y[0]) * BP[bp].h * share;
  const perLine = { zh: Math.floor(wPx / fontPx), en: Math.floor(wPx / (fontPx * 0.5)) };
  const lines = Math.max(1, Math.floor(hPx / (fontPx * LINE_HEIGHT)));
  return {
    perLine,
    lines,
    zh: Math.floor(perLine.zh * lines * 0.85),
    en: Math.floor(perLine.en * lines * 0.85),
  };
}

/** 取几何与编辑的较小者，再向下取整到整行倍数。 */
function budgetFor(geo, key, lang) {
  const cap = Math.min(geo[lang], EDITORIAL[lang][key]);
  const per = geo.perLine[lang];
  return Math.max(per, Math.floor(cap / per) * per);
}

function sectionBudget(safe, font, texts) {
  const per = {};
  for (const bp of ["desktop", "mobile"]) {
    // 安全区高度里 headline 占 ~55%，sub 分剩下的（sub 字号取标题的 0.30）
    const gh = geometric(bp, safe[bp], font[bp], 0.55);
    const gs = geometric(bp, safe[bp], Math.round(font[bp] * 0.3), 0.45);
    per[bp] = {
      zh: { headline: budgetFor(gh, "headline", "zh"), sub: budgetFor(gs, "sub", "zh") },
      en: { headline: budgetFor(gh, "headline", "en"), sub: budgetFor(gs, "sub", "en") },
    };
  }
  const min = (lang, key) => Math.min(per.desktop[lang][key], per.mobile[lang][key]);
  const budget = {
    zh: { headline: min("zh", "headline"), sub: min("zh", "sub") },
    en: { headline: min("en", "headline"), sub: min("en", "sub") },
  };
  const over = [];
  for (const lang of ["zh", "en"])
    for (const key of ["headline", "sub"]) {
      const actual = texts?.[lang]?.[key]?.length ?? 0;
      if (actual > budget[lang][key]) over.push(`${lang}.${key} ${actual}>${budget[lang][key]}`);
    }
  return { budgetPerBp: per, budget, over };
}


/** 文案冻结 → 反过来求字号：找能装下实际文案的最大字号。 */
function fits(bp, safe, f, share, text) {
  const W = (safe.x[1]-safe.x[0]) * BP[bp].w;
  const H = (safe.y[1]-safe.y[0]) * BP[bp].h * share;
  for (const lang of ['zh','en']) {
    const L = text?.[lang]?.length ?? 0;
    if (!L) continue;
    const perLine = Math.floor(lang==='zh' ? W/f : W/(f*0.5));
    if (perLine < 1) return false;
    const lines = Math.ceil(L / (perLine * 0.85));
    if (lines * f * LINE_HEIGHT > H) return false;
  }
  return true;
}

/** 从设计初值往下找最大可行字号；floor 以下就是安全区本身太小。 */
function autoFit(safe, font, texts) {
  const out = {};
  for (const bp of ['desktop','mobile']) {
    const floor = bp === 'desktop' ? 24 : 18;
    let head = font[bp];
    while (head > floor && !fits(bp, safe[bp], head, 0.55, {zh: texts.zh.headline, en: texts.en.headline})) head -= 2;
    let sub = Math.max(14, Math.round(head * 0.3));
    while (sub > 12 && !fits(bp, safe[bp], sub, 0.45, {zh: texts.zh.sub, en: texts.en.sub})) sub -= 1;
    out[bp] = { headline: head, sub, designed: font[bp], shrunk: head < font[bp] };
  }
  return out;
}

// ── 七屏 ────────────────────────────────────────────────────────────
const RAW = [
  {
    id: "s1-drop",
    section: "hero",
    act: "establish",
    mood: 3,
    depth: "水面之上",
    motifBeat: "一滴水悬在暗色水面上方，尚未落下。全站唯一允许多彩的一屏（ADR-0007），虹彩只在这滴水上。",
    palette: ["#07080b", "#0e1015", "#7c82f0"],
    font: { desktop: 72, mobile: 40 },
    safe: {
      desktop: { x: [0.08, 0.52], y: [0.3, 0.72], bgValue: "0.02–0.08" },
      mobile: { x: [0.07, 0.93], y: [0.14, 0.56], bgValue: "0.02–0.08" },
    },
    text: {
      zh: { headline: "我帮马来西亚的小生意，做会带来生意的网站。", sub: "" },
      en: { headline: "I build websites that bring Malaysian small businesses real customers.", sub: "" },
    },
    transitionOut: { type: "zoom-through", horizonY: { desktop: 0.72, mobile: 0.64 } },
    note: "洞 = 水面本身。穿过它进入水下，该层 k 必须 > 1（传给 motion-spec）。",
  },
  {
    id: "s2-ripple",
    section: "what",
    act: "establish",
    mood: 4,
    depth: "水面",
    motifBeat: "落点的同心涟漪向外扩散，波纹压着「快速答案」卡片的上缘走。",
    palette: ["#07080b", "#0e1015", "#7c82f0"],
    font: { desktop: 34, mobile: 26 },
    safe: {
      desktop: { x: [0.08, 0.72], y: [0.24, 0.78], bgValue: "0.05–0.12" },
      mobile: { x: [0.07, 0.93], y: [0.16, 0.84], bgValue: "0.05–0.12" },
    },
    text: {
      zh: { headline: "H2ODreamer Studio 是做什么的？", sub: "" },
      en: { headline: "What is H2ODreamer Studio?", sub: "" },
    },
    transitionOut: { type: "continuous", horizonY: { desktop: 0.5, mobile: 0.46 } },
  },
  {
    id: "s3-current",
    section: "services",
    act: "develop",
    mood: 6,
    depth: "浅水层",
    motifBeat: "四道水流分头流走，一道对应一项服务；流末汇成一个圆形涡口。",
    palette: ["#0e1015", "#14161d", "#7c82f0"],
    font: { desktop: 44, mobile: 30 },
    safe: {
      desktop: { x: [0.08, 0.62], y: [0.18, 0.42], bgValue: "0.06–0.14" },
      mobile: { x: [0.07, 0.93], y: [0.1, 0.36], bgValue: "0.06–0.14" },
    },
    text: {
      zh: { headline: "帮你把生意，搬到客户找得到的地方", sub: "" },
      en: { headline: "Getting your business where customers can find it", sub: "" },
    },
    transitionOut: { type: "match-cut", horizonY: { desktop: 0.49, mobile: 0.45 } },
    note: "涡口（圆）→ 下屏光柱在水中打出的圆形光斑，同位置同尺寸。",
  },
  {
    id: "s4-open",
    section: "work",
    act: "develop",
    mood: 7,
    depth: "开阔水层",
    motifBeat: "母题在这一屏**退场**——光柱与光斑是氛围不是母题拍点，主角让给作品缩略图本身。圆形光斑仍要接住上一屏的涡口（match-cut 的落点）。",
    palette: ["#0e1015", "#14161d", "#9aa0ff"],
    font: { desktop: 44, mobile: 30 },
    safe: {
      desktop: { x: [0.08, 0.6], y: [0.16, 0.4], bgValue: "0.06–0.16" },
      mobile: { x: [0.07, 0.93], y: [0.09, 0.34], bgValue: "0.06–0.16" },
    },
    text: {
      zh: { headline: "每个作品背后，都有一个设计决策", sub: "" },
      en: { headline: "Every project has a design decision behind it", sub: "" },
    },
    transitionOut: { type: "continuous", horizonY: { desktop: 0.47, mobile: 0.42 } },
  },
  {
    id: "s5-diver",
    section: "founder",
    act: "develop",
    mood: 6,
    depth: "中深水层",
    motifBeat: "光柱里悬着一个人形轮廓 —— 这一屏的真实照片就是那个人，母题让位给人。",
    palette: ["#0e1015", "#14161d", "#7c82f0"],
    font: { desktop: 34, mobile: 26 },
    safe: {
      desktop: { x: [0.28, 0.82], y: [0.24, 0.74], bgValue: "0.06–0.14" },
      mobile: { x: [0.07, 0.93], y: [0.42, 0.9], bgValue: "0.06–0.14" },
    },
    text: {
      zh: { headline: "阿爽 · Hui Huang Ong", sub: "" },
      en: { headline: "Ah Shuang · Hui Huang Ong", sub: "" },
    },
    transitionOut: { type: "hard-cut", horizonY: { desktop: 0.46, mobile: 0.41 } },
    note: "hard-cut 处 palette 与上屏共享 #0e1015 / #14161d；母题在下一屏立刻回来（洋流）。",
  },
  {
    id: "s6-eddy",
    section: "faq",
    act: "resolve",
    mood: 5,
    depth: "深水层",
    motifBeat: "洋流回旋，一圈一圈把问题绕进去；旋涡中心是一个暗的洞眼。",
    palette: ["#07080b", "#0e1015", "#7c82f0"],
    font: { desktop: 44, mobile: 30 },
    safe: {
      desktop: { x: [0.08, 0.58], y: [0.14, 0.36], bgValue: "0.02–0.10" },
      mobile: { x: [0.07, 0.93], y: [0.08, 0.32], bgValue: "0.02–0.10" },
    },
    text: {
      zh: { headline: "开始前，你可能想问的", sub: "" },
      en: { headline: "What you might want to ask first", sub: "" },
    },
    transitionOut: { type: "zoom-through", horizonY: { desktop: 0.44, mobile: 0.4 } },
    note: "洞 = 旋涡中心的洞眼，该层 k 必须 > 1。洞内透出的是靛紫生物光，与下屏开场 palette 一致。",
  },
  {
    id: "s7-jelly",
    section: "contact",
    act: "resolve",
    mood: 9,
    depth: "深海",
    motifBeat: "水母主体现身，靛紫生物光自伞内亮起 —— 母题走到终点，也是品牌图形本体。",
    palette: ["#07080b", "#7c82f0", "#9aa0ff"],
    font: { desktop: 48, mobile: 32 },
    safe: {
      desktop: { x: [0.08, 0.56], y: [0.28, 0.7], bgValue: "0.02–0.10" },
      mobile: { x: [0.07, 0.93], y: [0.12, 0.58], bgValue: "0.02–0.10" },
    },
    text: {
      zh: {
        headline: "有想法，就从一滴水开始",
        sub: "告诉我你的生意在做什么、卡在哪里。我会给你一个诚实的判断：需不需要做网站、做哪一种、大概多少钱。免费，不绕弯。",
      },
      en: {
        headline: "Got an idea? Start from a single drop",
        sub: "Tell me what your business does and where it is stuck. I will give you an honest read: whether you need a site, which kind, and roughly what it costs. Free, no runaround.",
      },
    },
    transitionOut: null,
  },
];

const sections = RAW.map((s) => {
  const fitted = autoFit(s.safe, s.font, s.text);
  const fittedFont = { desktop: fitted.desktop.headline, mobile: fitted.mobile.headline };
  const { budgetPerBp, budget, over } = sectionBudget(s.safe, fittedFont, s.text);
  return {
    id: s.id,
    section: s.section,
    mood: s.mood,
    depth: s.depth,
    paletteShift: s.palette,
    motifBeat: s.motifBeat,
    displayFontPx: fitted,
    textSafeArea: s.safe,
    copy: { frozen: true, budgetPerBp, budget, text: s.text, overBudget: over },
    transitionOut: s.transitionOut,
    ...(s.note ? { note: s.note } : {}),
  };
});

const project = {
  project: "H2ODreamer Studio — 首页",
  mode: "motif",
  breakpoints: BP,
  refs: ["era-residence"],
  refUsage: {
    "转场手法": "era-residence —— zoom-through 的「前景 scale↑ + 后景 scale 0.75→1 同步」配方",
    "分层与速度": "era-residence —— 极窄 k 带（实测 0.72~1.09），不拉远景",
    "排版反差": "era-residence —— 展示字与正文 14.8:1 的反差本身就是设计语言",
    "配色": "本项目自有 —— ADR-0007 近黑 + 单一靛紫。**不取 ERA 的暖米白**，两者互斥",
    "母题": "本项目自有 —— CONTEXT.md 的水母题",
  },
  storyBible: {
    logline:
      "向下滚动就是向下潜。从悬在水面之上的一滴水开始，穿过水面、随水流散开、进入开阔水层看见作品与人，最后在深海里遇见那只发着靛紫光的水母 —— 它就是这个品牌的图形本体。",
    thread: "再大的海，也是从一滴水开始",
    engines: ["motif", "space-axis", "color-arc"],
    motif: {
      element: "水 —— 滴 → 涟漪 → 流 → 海 → 水母",
      appearsIn: ["s1-drop", "s2-ripple", "s3-current", "s6-eddy", "s7-jelly"],
      density: "5/7 = 71%（Gate A 要求 60~80%：低于 60 连不起来，高于 80 会吵）",
    },
    spaceAxis: "水面之上 → 水面 → 浅水层 → 开阔水层 → 中深水层 → 深水层 → 深海",
    colorArc:
      "明度弧线，不是色相弧线：首屏最亮（水面透光）→ 中段回落 → 末屏靠水母的生物光重新提亮。色域锁死在 ADR-0007 的近黑 + 单一靛紫内。",
    arc: RAW.map((s) => ({ section: s.id, act: s.act, mood: s.mood })),
  },
  styleBible: [
    "STYLE BIBLE:",
    "Medium: 写实水下摄影感的暗调合成 —— 真实水体、悬浮微粒与焦散光。不是插画、不是 3D 渲染感、不是抽象波纹图形。",
    "Palette: #07080b 水体 · #0e1015 近景水层 · #14161d 中景 · #7c82f0 焦散与生物光 · #9aa0ff 高光尖端。除 s1 的那滴水外全站不出现第二个色相。",
    "Light: 单一光源自画面上方偏左 12° 射入，冷白偏靛约 7200K；强度随下潜逐屏衰减。s1 可见直射，s2 之后一律是散射光柱。",
    "Atmosphere: 体积雾随深度递增 —— s1 通透度 85%，s7 降到 45%。无地平线，用光柱与悬浮微粒替代纵深线索。",
    "Texture: 极淡胶片颗粒，不透明度 0.035，与站上 body::after 的噪点层同源。无纸纹、无笔触、无描边。",
    "Camera: 35mm 等效、轻微仰视、透视克制。水面线自 s1 的 0.72 逐屏上移出画，s4 之后无水面线，改用光柱汇聚线当基准。",
  ].join("\n"),
  styleLock: {
    locked: ["medium", "texture", "lineweight", "camera"],
    mutable: ["palette-shift", "light-direction", "fog-density", "horizon-y"],
  },
  constraints: [
    "文案冻结（#66）：七区块文案一字不改。copy.text 已填入实际文案，copy.frozen = true。**超预算时由版面让步，不许改文案。**",
    "结构冻结：七个区块一个不加不减、顺序不动。不许为了叙事插屏。",
    "ADR-0007：除 s1 的那滴水外，全站严格单一靛紫。不许为了「海的层次」引入第二个色相。",
    "ADR-0008：首屏 JS < 200KB、首屏总重 < 800KB（不含 hero 视频）。分层图是净增重量，motion-spec 算 canvas 时要连着预算一起算。",
    "首页维持 8~10 屏。ERA 的 24 屏长度明确不学 —— 本站唯一 KPI 是即时通讯点击，不是逗留时长。",
    "减弱动态偏好与移动端：全部层退化为静态合成图，不做逐层位移。",
  ],
  sections,
};

const dir = join(process.cwd(), "parallax");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "project.json"), JSON.stringify(project, null, 2) + "\n", "utf8");

// —— 控制台核对表 ——
console.log("屏  预算(zh head/sub)   预算(en head/sub)  实际 zh/en head  超预算");
for (const s of sections) {
  const b = s.copy.budget;
  const a = s.copy.text;
  console.log(
    s.id.padEnd(12),
    `${String(b.zh.headline).padStart(3)}/${String(b.zh.sub).padStart(3)}`,
    `      ${String(b.en.headline).padStart(3)}/${String(b.en.sub).padStart(3)}`,
    `      ${String(a.zh.headline.length).padStart(3)}/${String(a.en.headline.length).padStart(3)}`,
    "     ",
    s.copy.overBudget.join(" ") || "—",
  );
}
console.log("\n写入 parallax/project.json");
