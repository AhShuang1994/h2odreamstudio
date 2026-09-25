/**
 * 人肉过页用的清单页：把全站每个页面列成一行，点一个开一个，勾过的记住。
 *
 *   npm run preview     # 另一个终端开着
 *   npm run checklist   # 生成并打印路径，浏览器打开它
 *
 * 地址口径以 `out/sitemap.xml` 为准（它是给搜索引擎的那份，形态就是线上形态）。
 * sitemap 里没有的页面（404、privacy、terms、xhs 这些 noindex 的）按文件路径补，
 * 补的时候保留 `.html`：那个形态一定能访问，不依赖服务器补扩展名。
 *
 * 生成到项目根的 checklist.html（已在 .gitignore 里），不进产物、不会被部署。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const OUT = process.argv[2] || "out";
const BASE = process.argv[3] || "http://localhost:8099";
const DEST = resolve("checklist.html");

/** out/ 下的全部页面文件。构建产物与资源目录不算页面。 */
function htmlFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "_next" || name === "assets" || name === "fonts" || name === "og") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

/** 文件路径 → 可访问地址（保守形态，带 .html）。 */
function fileToUrl(file) {
  const rel = relative(OUT, file).replaceAll("\\", "/");
  return "/" + rel;
}

// ── 收地址：sitemap 优先，其余按文件补 ──────────────────────────────
const urls = new Map(); // url -> 是否在 sitemap 里

try {
  const xml = readFileSync(join(OUT, "sitemap.xml"), "utf8");
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    urls.set(new URL(m[1]).pathname, true);
  }
} catch {
  console.log("(没有 sitemap.xml，全部按文件路径列)");
}

/** sitemap 收录的页面对应哪个文件：用来找出没被收录的那些。 */
function urlToFile(url) {
  const p = url.replace(/\/$/, "/index").replace(/^\//, "");
  return [join(OUT, p + ".html"), join(OUT, p)].map((f) => relative(OUT, f).replaceAll("\\", "/"));
}
const covered = new Set();
for (const u of urls.keys()) for (const f of urlToFile(u)) covered.add("/" + f);

for (const file of htmlFiles(OUT)) {
  const u = fileToUrl(file);
  if (!covered.has(u)) urls.set(u, false);
}

// ── 分组 ────────────────────────────────────────────────────────────
const GROUPS = [
  ["核心页 · 英文", (u) => /^\/(|about|contact|pricing)$/.test(u)],
  ["核心页 · 中文", (u) => /^\/zh(\/(about|contact|pricing))?$/.test(u)],
  // 服务页迁进 Next 路由之后中英各有一个地址，不再共用一份（ADR-0002）
  ["服务页 · 英文", (u) => /^\/(landing-page|wedding-basic|wedding-premium|shopify-migration)$/.test(u)],
  ["服务页 · 中文", (u) => /^\/zh\/(landing-page|wedding-basic|wedding-premium|shopify-migration)$/.test(u)],
  ["Blog · 英文", (u) => u.startsWith("/blog/")],
  ["Blog · 中文", (u) => u.startsWith("/zh/blog/")],
  ["案例拆解 · 英文", (u) => u.startsWith("/case-studies/")],
  ["案例拆解 · 中文", (u) => u.startsWith("/zh/case-studies/")],
  ["法务与其余（noindex）", (u) => !u.startsWith("/demos/") && !u.startsWith("/app/")],
  ["Demo 页（给客户看的样板，不是站的一部分）", (u) => u.startsWith("/demos/")],
  ["小帐本 app（独立于站）", (u) => u.startsWith("/app/")],
];

const grouped = GROUPS.map(([name]) => ({ name, items: [] }));
for (const [url, inSitemap] of [...urls].sort((a, b) => a[0].localeCompare(b[0]))) {
  const i = GROUPS.findIndex(([, test]) => test(url));
  grouped[i].items.push({ url, inSitemap });
}

const total = urls.size;

// ── 出页面 ──────────────────────────────────────────────────────────
const rows = grouped
  .filter((g) => g.items.length)
  .map(
    (g) => `
    <section>
      <h2>${g.name} <span class="n">${g.items.length}</span></h2>
      <ul>
${g.items
  .map(
    (it) => `        <li>
          <input type="checkbox" id="c${hash(it.url)}" data-url="${it.url}">
          <label for="c${hash(it.url)}"></label>
          <a href="${BASE}${encodeURI(it.url)}" target="_blank" rel="noopener">${it.url}</a>
          ${it.inSitemap ? "" : '<span class="tag">不在 sitemap</span>'}
        </li>`,
  )
  .join("\n")}
      </ul>
    </section>`,
  )
  .join("\n");

function hash(s) {
  return [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
}

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>过页清单 · ${total} 个页面</title>
<style>
  :root {
    --bg: #07080b; --s1: #0e1015; --s2: #14161d;
    --line: #1c1f27; --line2: #2b2f3a;
    --ink: #f3f5f9; --muted: #c2c9d6; --faint: #5f6673;
    --accent: #7c82f0;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 14px/1.6 Inter, ui-sans-serif, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 820px; margin: 0 auto; padding: 40px 24px 80px; }

  header { position: sticky; top: 0; background: var(--bg); padding: 16px 0 14px;
           border-bottom: 1px solid var(--line); z-index: 10; }
  h1 { font-size: 19px; margin: 0 0 10px; letter-spacing: -0.01em; }
  .bar { height: 4px; background: var(--s2); border-radius: 999px; overflow: hidden; }
  .bar i { display: block; height: 100%; width: 0; background: var(--accent);
           transition: width 200ms ease; }
  .meta { display: flex; justify-content: space-between; align-items: baseline;
          margin-top: 8px; font-size: 12.5px; color: var(--faint); }
  .meta b { color: var(--muted); font-weight: 500; font-variant-numeric: tabular-nums; }
  button { background: var(--s2); color: var(--muted); border: 1px solid var(--line2);
           border-radius: 8px; padding: 4px 10px; font: inherit; font-size: 12px;
           cursor: pointer; }
  button:hover { color: var(--ink); background: #191b23; }

  section { margin-top: 34px; }
  h2 { font-size: 13px; font-weight: 600; color: var(--muted); margin: 0 0 10px;
       display: flex; align-items: baseline; gap: 8px; }
  h2 .n { font-size: 11px; color: var(--faint); font-weight: 400;
          font-variant-numeric: tabular-nums; }

  ul { list-style: none; margin: 0; padding: 0;
       border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  li { display: flex; align-items: center; gap: 11px; padding: 9px 14px;
       background: var(--s1); border-bottom: 1px solid var(--line); }
  li:last-child { border-bottom: 0; }
  li:has(input:checked) { background: var(--bg); }
  li:has(input:checked) a { color: var(--faint); text-decoration: line-through; }

  input[type=checkbox] { position: absolute; opacity: 0; width: 0; height: 0; }
  label { width: 16px; height: 16px; flex: none; border: 1px solid var(--line2);
          border-radius: 5px; cursor: pointer; position: relative; }
  input:checked + label { background: var(--accent); border-color: var(--accent); }
  input:checked + label::after { content: ""; position: absolute; left: 5px; top: 1px;
          width: 4px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0;
          transform: rotate(45deg); }
  input:focus-visible + label { outline: 2px solid var(--accent); outline-offset: 2px; }

  a { color: var(--muted); text-decoration: none;
      font-family: ui-monospace, "Cascadia Mono", monospace; font-size: 12.5px; }
  a:hover { color: var(--accent); text-decoration: underline; }

  .tag { margin-left: auto; font-size: 10.5px; color: var(--faint);
         border: 1px solid var(--line2); border-radius: 5px; padding: 1px 6px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>过页清单</h1>
    <div class="bar"><i id="bar"></i></div>
    <div class="meta">
      <span>已看 <b id="done">0</b> / <b>${total}</b>　·　服务在 <b>${BASE}</b></span>
      <button id="reset">清空勾选</button>
    </div>
  </header>
${rows}
</div>
<script>
  var KEY = "h2od-checklist";
  var boxes = [].slice.call(document.querySelectorAll("input[type=checkbox]"));
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}

  function paint() {
    var n = boxes.filter(function (b) { return b.checked; }).length;
    document.getElementById("done").textContent = n;
    document.getElementById("bar").style.width = (n / boxes.length * 100) + "%";
  }
  function save() {
    var o = {};
    boxes.forEach(function (b) { if (b.checked) o[b.dataset.url] = 1; });
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }

  boxes.forEach(function (b) {
    if (saved[b.dataset.url]) b.checked = true;
    b.addEventListener("change", function () { save(); paint(); });
  });
  document.getElementById("reset").addEventListener("click", function () {
    boxes.forEach(function (b) { b.checked = false; });
    save(); paint();
  });
  paint();
</script>
</body>
</html>
`;

writeFileSync(DEST, html, "utf8");
console.log(`清单已生成：${DEST}`);
console.log(`  ${total} 个页面，服务地址 ${BASE}`);
console.log(`\n浏览器打开它，点一个开一个。勾过的会记住，关了页面也还在。`);
