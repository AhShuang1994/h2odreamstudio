/**
 * 把 Lenis 的浏览器版拷进 `public/js/` —— 构建期运行（#89）。
 *
 * 静态内容页没有打包器，只能吃现成的 `<script src>`。这个 dist 文件本身就是
 * 挂 `globalThis.Lenis` 的 IIFE，拷过去就能用，不需要引入打包工具。
 *
 * 产物**不进版本库**（见 .gitignore）：它是 node_modules 里那份的副本，
 * 提交进来只会在升级依赖时悄悄对不上。
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

// 直接指 node_modules 里的路径：lenis 的 package.json 用 exports 字段封了
// 子路径，require.resolve("lenis/package.json") 会被拒。
const src = join(process.cwd(), "node_modules/lenis/dist/lenis.min.js");
const dest = join(process.cwd(), "public/js/lenis.min.js");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);

console.log(`vendor-lenis: public/js/lenis.min.js ← ${(statSync(dest).size / 1024).toFixed(1)}KB`);
