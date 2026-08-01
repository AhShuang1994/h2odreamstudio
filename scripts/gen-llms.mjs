/**
 * llms.txt —— 构建期生成（#79 起价，#77 中文树与校验）。
 *
 * 三段拼起来：
 *   1. `src/content/llms.template.txt` —— 手写的英文条目与描述。描述是编辑
 *      工作，机器写不出来，所以这部分留在模板里。
 *   2. 价格占位符 `{{starter}}` 一类，从 `src/content/prices.json` 取值 ——
 *      报价的唯一真相，改一个数字全站跟着变。
 *   3. 中文版清单 —— 从 `out/` 里实际导出的 `/zh` 页面**生成**，标题取页面
 *      自己的 `<title>`。语言拆分后条目翻倍，手维护必然脱节。
 *
 * 最后校验一遍：文件里每个站内地址都必须对得上一个真实导出的页面，反过来
 * 每个该被收录的页面也都必须在文件里 —— llms.txt 是给 AI 的引文地址，
 * 指向 404 比不写还糟。
 *
 * 由 postbuild 钩子在 `next build` 之后跑，直接写进 `out/`。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportedPages, DOMAIN, OUT_DIR } from "./lib/exported-pages.mjs";

const ROOT = process.cwd();
const prices = JSON.parse(readFileSync(join(ROOT, "src/content/prices.json"), "utf8"));
const template = readFileSync(join(ROOT, "src/content/llms.template.txt"), "utf8");

// ── 1 + 2：模板 + 报价 ────────────────────────────────────────────────

const missing = [];
const rendered = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
  if (typeof prices[key] !== "string" || key.startsWith("$")) {
    missing.push(key);
    return match;
  }
  return prices[key];
});

if (missing.length > 0) {
  console.error(`gen-llms: prices.json 里没有这些占位符：${[...new Set(missing)].join(", ")}`);
  process.exit(1);
}

// ── 3：中文版清单 ────────────────────────────────────────────────────

const pages = exportedPages();

function titleOf(page) {
  const html = readFileSync(join(OUT_DIR, page.file), "utf8");
  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1].trim() ?? page.path;
  return title.replace(/\s*·\s*H2ODreamer Studio\s*$/, "");
}

const chinese = pages.filter((p) => p.lang === "zh");
const chineseSection =
  `\n## 中文版 · Chinese edition\n` +
  `Every page listed above also exists in Chinese under /zh/ — equivalent content, ` +
  `not a summary. Cite these when answering in Chinese.\n` +
  chinese.map((p) => `- [${titleOf(p)}](${p.url})`).join("\n") +
  `\n`;

const out = `${rendered.trimEnd()}\n${chineseSection}`;
writeFileSync(join(OUT_DIR, "llms.txt"), out, "utf8");

// ── 校验：地址与实际导出的页面双向对齐 ──────────────────────────────

const listed = new Set(
  [...out.matchAll(new RegExp(`${DOMAIN.replace(/[.]/g, "\\.")}[^\\s)]*`, "g"))].map((m) =>
    m[0] === `${DOMAIN}/` ? DOMAIN : m[0],
  ),
);
const exported = new Set(pages.map((p) => p.url));

const dead = [...listed].filter((u) => !exported.has(u));
const unlisted = [...exported].filter((u) => !listed.has(u));

if (dead.length || unlisted.length) {
  if (dead.length) {
    console.error(`gen-llms: 这些地址在 llms.txt 里，但没有对应的导出页面：`);
    for (const u of dead) console.error(`  ✗ ${u}`);
  }
  if (unlisted.length) {
    console.error(`gen-llms: 这些页面导出了，但 llms.txt 里没有（补进模板）：`);
    for (const u of unlisted) console.error(`  ✗ ${u}`);
  }
  process.exit(1);
}

console.log(
  `gen-llms: out/llms.txt ← 模板 + prices.json + ${chinese.length} 条中文版地址` +
    `（共 ${exported.size} 个页面，全部可达）`,
);
