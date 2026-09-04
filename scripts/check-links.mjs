/**
 * 一次把全站的地址过一遍，报出所有打不开的。
 *
 * 用法：先起本地服务，再跑这个脚本。
 *   npx wrangler pages dev out --port 8099
 *   node check-links.mjs http://localhost:8099
 *
 * 查两组地址：
 *   ① sitemap 里的每一条（那是给搜索引擎的承诺，必须全通）
 *   ② 所有导出页面里的站内 href（导航、正文、页脚，锚点只留 # 之前那截）
 *
 * 只报非 200 的。全通就打印一行「全部可达」。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const BASE = (process.argv[2] || "http://localhost:8099").replace(/\/+$/, "");
const OUT = process.argv[3] || "out";

/** 递归收集 out/ 下的 html。 */
function htmlFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      // _next 里全是构建产物，没有要点的链接
      if (name === "_next" || name === "assets" || name === "fonts") continue;
      htmlFiles(p, acc);
    } else if (name.endsWith(".html")) {
      acc.push(p);
    }
  }
  return acc;
}

const files = htmlFiles(OUT);
console.log(`扫描 ${files.length} 个页面…\n`);

/** 地址 → 它出现在哪些页面（报错时好定位）。 */
const targets = new Map();
function add(url, from) {
  if (!targets.has(url)) targets.set(url, new Set());
  targets.get(url).add(from);
}

// ① sitemap
try {
  const xml = readFileSync(join(OUT, "sitemap.xml"), "utf8");
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    add(new URL(m[1]).pathname, "sitemap.xml");
  }
} catch {
  console.log("(没找到 sitemap.xml，跳过)\n");
}

// ② 页面里的站内 href
for (const f of files) {
  const html = readFileSync(f, "utf8");
  const from = relative(OUT, f).replaceAll("\\", "/");
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const raw = m[1];
    if (!raw.startsWith("/")) continue;      // 外链、mailto、相对锚点都不管
    if (raw.startsWith("//")) continue;      // 协议相对的外链
    const path = raw.split("#")[0];
    if (!path || path === "/") { add("/", from); continue; }
    add(path, from);
  }
}

console.log(`共 ${targets.size} 个不重复地址，开始请求…\n`);

const bad = [];
let done = 0;
for (const [path, froms] of targets) {
  let status = 0;
  try {
    const r = await fetch(BASE + path, { redirect: "manual" });
    status = r.status;
    // 3xx 跟一次，看最终落点
    if (status >= 300 && status < 400) {
      const loc = r.headers.get("location");
      const r2 = await fetch(new URL(loc, BASE + path));
      status = r2.ok ? 200 : r2.status;
    }
  } catch (e) {
    status = "ERR " + e.message;
  }
  if (status !== 200) bad.push({ path, status, froms: [...froms].slice(0, 3) });
  if (++done % 25 === 0) process.stdout.write(`  ${done}/${targets.size}\r`);
}

console.log(`  ${done}/${targets.size}\n`);

if (bad.length === 0) {
  console.log(`✅ 全部 ${targets.size} 个地址可达。`);
} else {
  console.log(`❌ ${bad.length} 个打不开：\n`);
  for (const b of bad) {
    console.log(`  ${String(b.status).padEnd(6)} ${b.path}`);
    console.log(`         ← ${b.froms.join(", ")}${b.froms.length === 3 ? " …" : ""}`);
  }
  process.exitCode = 1;
}
