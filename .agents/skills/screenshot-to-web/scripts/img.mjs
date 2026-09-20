#!/usr/bin/env node
/**
 * img.mjs — screenshot-to-web 的图像工具。只依赖 Playwright。
 *
 *   shot    <file-or-url> <out.png>   [--w 1440] [--h 900] [--full] [--no-scroll]
 *   crop    <in.png>      <out.png>   --y 0 --h 900 [--x 0] [--w <宽>]
 *   compare <a.png> <b.png> <out.png> [--labels "原图,我的"] [--w 2400]
 *   webp    <in.png>      <out.webp>  [--width 1440] [--quality 82]
 *   rows    <in.png>                  [--x 20] [--min 6]
 *
 * 为什么四个子命令都走 Playwright:目标机器上 sharp 和 PIL 都可能没有,
 * 而 Chromium 本身就能裁图、排版和编码 WebP。少一个依赖少一个装不上的理由。
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

// ---------- Playwright 解析 ----------
// 本地 node_modules → NODE_PATH / 全局目录。两条都不通就给一句人话。
async function loadChromium() {
  const require = createRequire(import.meta.url);
  const candidates = ['playwright', 'playwright-core'];
  for (const name of candidates) {
    try {
      return require(name).chromium;
    } catch { /* 下一个 */ }
  }
  // 全局安装的包不在 require 的搜索路径里,手动加
  const globals = [
    process.env.NODE_PATH,
    '/opt/node22/lib/node_modules',
    '/usr/lib/node_modules',
    '/usr/local/lib/node_modules',
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules'),
  ].filter(Boolean).flatMap(p => p.split(path.delimiter));

  for (const dir of globals) {
    for (const name of candidates) {
      try {
        const mod = await import(pathToFileURL(path.join(dir, name, 'index.js')).href);
        if (mod.chromium) return mod.chromium;
        if (mod.default?.chromium) return mod.default.chromium;
      } catch { /* 下一个 */ }
    }
  }
  die(
    '找不到 Playwright。\n' +
    '  装到项目里:  npm i -D playwright && npx playwright install chromium\n' +
    '  或全局:      npm i -g playwright && npx playwright install chromium\n' +
    '  已装但仍报错: 设 NODE_PATH 指向全局 node_modules 再跑。'
  );
}

// ---------- 参数 ----------
function die(msg) { console.error('✗ ' + msg); process.exit(1); }

const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = [];
const flags = {};
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else { flags[key] = next; i++; }
  } else positional.push(a);
}
const num = (v, d) => (v === undefined ? d : Number(v));

// 本地文件转 file:// URL;已经是 URL 的原样返回
function toUrl(p) {
  if (/^https?:\/\//.test(p)) return p;
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) die(`文件不存在: ${abs}`);
  return pathToFileURL(abs).href;
}

function ensureDir(p) {
  const dir = path.dirname(path.resolve(p));
  fs.mkdirSync(dir, { recursive: true });
}

// setContent 建出来的页面是 about:blank 源,Chromium 不让它加载 file:// 图片
// (naturalWidth 会是 0)。所以本地文件一律读成 data URI 内嵌,绕开跨源限制。
const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
               '.webp':'image/webp', '.gif':'image/gif', '.avif':'image/avif' };

function toImgSrc(p) {
  if (/^https?:\/\//.test(p)) return p;
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) die(`文件不存在: ${abs}`);
  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext];
  if (!mime) die(`不认识的图片格式: ${ext}(支持 ${Object.keys(MIME).join(' ')})`);
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
}

// 把图片摆进一个零边距的页面,并返回它的自然尺寸。crop/compare/webp 都靠这个。
const IMG_PAGE = (srcs) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff;font:13px system-ui,sans-serif}
img{display:block}</style>${srcs}`;

async function withPage(fn, viewport = { width: 1200, height: 800 }) {
  const chromium = await loadChromium();
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    die(`Chromium 启动失败:${e.message}\n  多半是浏览器没装:npx playwright install chromium`);
  }
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  try { return await fn(page); }
  finally { await browser.close(); }
}

// ---------- shot ----------
async function shot() {
  const [src, out] = positional;
  if (!src || !out) die('用法: img.mjs shot <file-or-url> <out.png> [--w 1440] [--h 900] [--full] [--no-scroll]');
  ensureDir(out);
  const width = num(flags.w, 1440);
  const height = num(flags.h, 900);

  await withPage(async page => {
    await page.goto(toUrl(src), { waitUntil: 'networkidle', timeout: 60000 });
    // 字体是网络请求,networkidle 之后再给它一点时间落位,否则截到回落字体
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(400);

    // fullPage 截图不会滚动,所以 scroll-reveal 的内容(默认 opacity:0,
    // 进视口才显形)会整片留在未显形状态 —— 截出来首屏以下全是空白。
    // 先滚一遍把 IntersectionObserver 全部触发,再滚回顶部截。
    if (flags.full && !flags['no-scroll']) {
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.8);
        const wait = ms => new Promise(r => setTimeout(r, ms));
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          // 无头浏览器里 rAF 常被节流,scroll 事件里靠 rAF 驱动的渲染不跑。
          // dispatch resize 会同步走一遍布局回调,把这类实现也逼出来。
          // (来源:parallax-teardown/LESSONS.md 第 8 条)
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('resize'));
          await wait(250);
        }
        window.scrollTo(0, document.body.scrollHeight);
        window.dispatchEvent(new Event('resize'));
        await wait(800);
        window.scrollTo(0, 0);
        await wait(400);
      });
      await page.waitForTimeout(800);   // 让 stagger 延迟和回顶过渡都走完
    }

    await page.screenshot({ path: path.resolve(out), fullPage: !!flags.full });
  }, { width, height });

  console.log(`✓ ${out}  (${width}x${flags.full ? 'full' : height})${flags.full && !flags['no-scroll'] ? '  [已滚动触发 reveal]' : ''}`);
}

// ---------- crop ----------
async function crop() {
  const [src, out] = positional;
  if (!src || !out) die('用法: img.mjs crop <in.png> <out.png> --y 0 --h 900 [--x 0] [--w <宽>]');
  if (flags.h === undefined) die('crop 必须给 --h(裁多高)');
  ensureDir(out);

  const url = toImgSrc(src);
  await withPage(async page => {
    await page.setContent(IMG_PAGE(`<img id="i" src="${url}">`));
    const img = page.locator('#i');
    await img.waitFor({ state: 'visible', timeout: 30000 });
    const nat = await page.evaluate(() => {
      const i = document.getElementById('i');
      return { w: i.naturalWidth, h: i.naturalHeight };
    });
    if (!nat.w) die(`读不到图片: ${src}`);

    const x = num(flags.x, 0);
    const y = num(flags.y, 0);
    const w = Math.min(num(flags.w, nat.w), nat.w - x);
    const h = Math.min(num(flags.h, 0), nat.h - y);
    if (h <= 0) die(`--y ${y} 已经超出图片高度 ${nat.h}`);

    await page.setViewportSize({ width: nat.w, height: Math.min(nat.h, 30000) });
    await page.screenshot({ path: path.resolve(out), clip: { x, y, width: w, height: h } });
    console.log(`✓ ${out}  (${w}x${h}  从 y=${y} 裁出,原图 ${nat.w}x${nat.h})`);
  });
}

// ---------- compare ----------
async function compare() {
  const [a, b, out] = positional;
  if (!a || !b || !out) die('用法: img.mjs compare <原图.png> <我的.png> <out.png> [--labels "原图,我的"]');
  ensureDir(out);

  const [la, lb] = String(flags.labels || '原图,我的').split(',');
  const total = num(flags.w, 2400);
  const colW = Math.floor((total - 24) / 2);
  const ua = toImgSrc(a), ub = toImgSrc(b);

  await withPage(async page => {
    await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:#fff;font:13px/1.4 system-ui,sans-serif;color:#333}
  .row{display:flex;gap:24px;padding:12px;align-items:flex-start}
  .col{width:${colW}px}
  .lab{padding:6px 0;font-weight:600}
  img{display:block;width:100%;height:auto;border:1px solid #ddd}
</style>
<div class="row">
  <div class="col"><div class="lab">${la}</div><img id="a" src="${ua}"></div>
  <div class="col"><div class="lab">${lb}</div><img id="b" src="${ub}"></div>
</div>`);
    await page.locator('#a').waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('#b').waitFor({ state: 'visible', timeout: 30000 });
    await page.evaluate(() => Promise.all(
      [...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))
    ));
    await page.setViewportSize({ width: total, height: 800 });
    await page.screenshot({ path: path.resolve(out), fullPage: true });
    console.log(`✓ ${out}  (并排 ${la} / ${lb})`);
  }, { width: total, height: 800 });
}

// ---------- webp ----------
async function webp() {
  const [src, out] = positional;
  if (!src || !out) die('用法: img.mjs webp <in.png> <out.webp> [--width 1440] [--quality 82]');
  ensureDir(out);

  const quality = num(flags.quality, 82) / 100;
  const targetW = flags.width === undefined ? null : num(flags.width, null);
  const url = toImgSrc(src);

  const dataUrl = await withPage(async page => {
    await page.setContent(IMG_PAGE(`<img id="i" src="${url}">`));
    await page.locator('#i').waitFor({ state: 'visible', timeout: 30000 });
    return page.evaluate(async ({ quality, targetW }) => {
      const img = document.getElementById('i');
      if (img.decode) await img.decode();
      const nw = img.naturalWidth, nh = img.naturalHeight;
      if (!nw) return null;
      // 只缩不放 —— 放大只会得到一张更大的糊图
      const w = targetW && targetW < nw ? targetW : nw;
      const h = Math.round(nh * (w / nw));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const url = c.toDataURL('image/webp', quality);
      return url.startsWith('data:image/webp') ? { url, w, h } : null;
    }, { quality, targetW });
  });

  if (!dataUrl) die('WebP 编码失败 —— 这个 Chromium 没有 WebP 编码支持,或图片读不到');
  const b64 = dataUrl.url.slice(dataUrl.url.indexOf(',') + 1);
  fs.writeFileSync(path.resolve(out), Buffer.from(b64, 'base64'));
  const kb = Math.round(fs.statSync(path.resolve(out)).size / 1024);
  console.log(`✓ ${out}  (${dataUrl.w}x${dataUrl.h}, ${kb} KB, q${Math.round(quality * 100)})`);
}

// ---------- rows ----------
// 取一列像素,报告纵向的纯色分段。区块边界、内边距、卡片高度都能直接读出数字,
// 不用靠肉眼估。这是校验循环里最有用的一条 —— 「看着差不多」换成「差 30px」。
async function rows() {
  const [src] = positional;
  if (!src) die('用法: img.mjs rows <in.png> [--x 20] [--min 6]');
  const X = num(flags.x, 20);
  const MIN = num(flags.min, 6);
  const url = toImgSrc(src);

  const runs = await withPage(async page => {
    await page.setContent(IMG_PAGE(`<img id="i" src="${url}">`));
    await page.locator('#i').waitFor({ state: 'visible', timeout: 30000 });
    return page.evaluate(async ({ X, MIN }) => {
      const img = document.getElementById('i');
      if (img.decode) await img.decode();
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w) return null;
      if (X >= w) return { err: `--x ${X} 超出图宽 ${w}` };
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(X, 0, 1, h).data;
      const hex = y => '#' + [0,1,2].map(k => d[y*4+k].toString(16).padStart(2,'0')).join('');
      const out = [];
      let start = 0, cur = hex(0);
      for (let y = 1; y < h; y++) {
        const c2 = hex(y);
        if (c2 !== cur) {
          // 短段多半是字形的抗锯齿,不是区块边界 —— 滤掉才看得见结构
          if (y - start >= MIN) out.push({ from: start, to: y - 1, h: y - start, color: cur });
          start = y; cur = c2;
        }
      }
      out.push({ from: start, to: h - 1, h: h - start, color: cur });
      return { runs: out, w, h };
    }, { X, MIN });
  });

  if (!runs) die(`读不到图片: ${src}`);
  if (runs.err) die(runs.err);
  console.log(`${path.basename(src)}  ${runs.w}x${runs.h}  (x=${X}, 最短 ${MIN}px)`);
  for (const r of runs.runs) {
    console.log(`  y ${String(r.from).padStart(5)}–${String(r.to).padStart(5)}  h=${String(r.h).padStart(5)}  ${r.color}`);
  }
}

// ---------- dispatch ----------
const commands = { shot, crop, compare, webp, rows };
if (!commands[cmd]) {
  console.error(`用法: img.mjs <shot|crop|compare|webp> ...

  shot    <file-or-url> <out.png>    [--w 1440] [--h 900] [--full] [--no-scroll]
  crop    <in.png>      <out.png>    --y 0 --h 900 [--x 0] [--w <宽>]
  compare <a.png> <b.png> <out.png>  [--labels "原图,我的"] [--w 2400]
  webp    <in.png>      <out.webp>   [--width 1440] [--quality 82]
  rows    <in.png>                   [--x 20] [--min 6]`);
  process.exit(1);
}
await commands[cmd]();
