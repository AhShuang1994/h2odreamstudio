/**
 * 由 parallax/project.json 生成 parallax/storyboard.html。
 * 只替换模板里 `const DATA = /*__DATA__*​/ { ... };` 那一个对象，HTML 不动。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE = join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  ".claude/skills/parallax-story-architect/references/storyboard-template.html",
);

const p = JSON.parse(readFileSync(join(process.cwd(), "parallax/project.json"), "utf8"));

const ACT_CN = { establish: "建立", develop: "推进", resolve: "收束" };

const data = {
  project: p.project,
  mode: p.mode,
  logline: p.storyBible.logline,
  engines: p.storyBible.engines,
  motif: p.storyBible.motif.element,
  breakpoints: {
    desktop: { w: p.breakpoints.desktop.w, h: p.breakpoints.desktop.h },
    mobile: { w: p.breakpoints.mobile.w, h: p.breakpoints.mobile.h },
  },
  sections: p.sections.map((s) => ({
    id: s.id,
    act: ACT_CN[p.storyBible.arc.find((a) => a.section === s.id)?.act] ?? "",
    mood: s.mood,
    // 模板的 time 字段这里放「深度」—— 本站的轴是空间不是时间
    time: s.depth,
    palette: s.paletteShift,
    motifBeat: s.motifBeat,
    safe: {
      desktop: { x: s.textSafeArea.desktop.x, y: s.textSafeArea.desktop.y },
      mobile: { x: s.textSafeArea.mobile.x, y: s.textSafeArea.mobile.y },
    },
    budget: s.copy.budget,
    transitionOut: s.transitionOut ?? undefined,
  })),
};

const tpl = readFileSync(TEMPLATE, "utf8");
const lines = tpl.split("\n");
const start = lines.findIndex((l) => l.includes("const DATA"));
if (start < 0) throw new Error("模板里找不到 const DATA");
let end = -1;
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i].trim() === "};") {
    end = i;
    break;
  }
}
if (end < 0) throw new Error("找不到 DATA 对象的结束行");

const replacement = "const DATA = " + JSON.stringify(data, null, 2) + ";";
const out = [...lines.slice(0, start), replacement, ...lines.slice(end + 1)].join("\n");
writeFileSync(join(process.cwd(), "parallax/storyboard.html"), out, "utf8");

console.log(`storyboard.html ← 替换第 ${start + 1}~${end + 1} 行，${p.sections.length} 屏`);
