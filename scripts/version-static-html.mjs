/**
 * 给 `public/` 原样拷进 `out/` 的静态页（demos、privacy、terms、xhs）的资源引用
 * 接上内容指纹。
 *
 * Next 渲染的页面在渲染时就接好了（`src/lib/asset-url.mjs`），HTML 与 RSC
 * payload 天然一致。这些静态页 Next 不经手，只能在导出之后改写。**只改
 * `public/` 里原本就有的 .html**：Next 渲染出来的页面带着 RSC payload，里面
 * 有按字节计的长度前缀，事后改字会把它弄坏。
 *
 * `app/` 跳过：那是带 service worker 的 PWA，自己管缓存。
 *
 * 由 postbuild 钩子在 `next build` 之后跑，排在 gen-content-fonts 后面：
 * 它生成的 `out/css/fonts.css` 不在 `public/` 的号码表里，这里现算一份补上。
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { versionAssetRefs } from "../src/lib/asset-url.mjs";

const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");
const OUT = join(ROOT, "out");

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

const fontsCss = readFileSync(join(OUT, "css/fonts.css"));
const extra = {
  "/css/fonts.css": createHash("md5").update(fontsCss).digest("hex").slice(0, 8),
};

let changed = 0;
for (const src of walk(PUBLIC)) {
  const rel = relative(PUBLIC, src);
  if (rel.split(sep)[0] === "app") continue;
  const target = join(OUT, rel);
  const html = readFileSync(target, "utf8");
  const next = versionAssetRefs(html, extra);
  if (next !== html) {
    writeFileSync(target, next);
    changed++;
  }
}
console.log(`version-static-html: ${changed} 个静态页接上了资源指纹`);

// JB 外联台（app/outreach）没有 service worker，而 Cloudflare 让浏览器把 .js / .css
// 缓存一年：它的 JS 与 CSS 是同目录的相对引用，上面那套只认 /assets、/css、/js，
// 所以在这里单独接上指纹。页面本身是 max-age=0，换了指纹浏览器就会去拿新的。
const OUTREACH = join(OUT, "app/outreach");
const outreachPage = join(OUTREACH, "index.html");
const outreachHtml = readFileSync(outreachPage, "utf8");
const outreachNext = outreachHtml.replace(
  /(src|href)="(outreach\.(?:js|css))(?:\?v=\w+)?"/g,
  (_, attr, file) =>
    `${attr}="${file}?v=${createHash("md5").update(readFileSync(join(OUTREACH, file))).digest("hex").slice(0, 8)}"`,
);
writeFileSync(outreachPage, outreachNext);
