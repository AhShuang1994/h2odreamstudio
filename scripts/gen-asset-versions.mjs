/**
 * 静态资源的版本号表：构建期生成，给 `src/lib/asset-url.mjs` 用。
 *
 * Cloudflare 让浏览器把 /assets、/css、/js 下的文件缓存一年（PageSpeed 建议的
 * 「高效缓存策略」）。老站靠 `build.js` 给引用加 `?v=<hash>`，文件一改网址就变；
 * 迁进 Next 之后它不在构建链里了，`public/` 下换了内容的图于是在老访客那里
 * 卡一整年（Glow Seoul、MUSE 的缩图就是这样被发现的）。
 *
 * 这里对 `public/{assets,css,js}` 下每个文件算内容指纹（md5 前 8 位，与老
 * `build.js` 同口径），写成 { "/assets/x.webp": "1a2b3c4d" }。文件不变号码
 * 就不变，缓存照样有效。
 *
 * 由 prebuild / predev 钩子跑，产物不进版本库。
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");
const DIRS = ["assets", "css", "js"];
const OUT = join(ROOT, "src/generated/asset-versions.json");

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const versions = {};
for (const d of DIRS) {
  for (const file of walk(join(PUBLIC, d))) {
    const url = "/" + relative(PUBLIC, file).split(sep).join("/");
    versions[url] = createHash("md5").update(readFileSync(file)).digest("hex").slice(0, 8);
  }
}

mkdirSync(join(ROOT, "src/generated"), { recursive: true });
writeFileSync(OUT, JSON.stringify(versions, Object.keys(versions).sort()) + "\n");
console.log(`gen-asset-versions: ${Object.keys(versions).length} 个文件`);
