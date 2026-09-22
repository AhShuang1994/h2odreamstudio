/**
 * 清掉旧管线在 `public/` 下的残留（prebuild）。
 *
 * ⚠️ 这不是洁癖，是防一个只在本机出现的幽灵 bug：
 *
 * `public/blog/`、`public/case-studies/`、`public/zh/` 曾经是
 * `scripts/split-content-lang.mjs` 的产物，而且是 gitignore 的，所以**每台在
 * 内容页迁进 Next 之前构建过这个仓库的机器上都还躺着**。Next 会把 `public/`
 * 原样拷进 `out/`，于是那些陈旧文件和路由生成的同名文件撞车，谁赢看运气。
 *
 * CI 是全新 clone，永远撞不到，所以这个 bug 只会在你自己机器上发作，还查不出来。
 *
 * 这三行等所有人都构建过一轮之后可以删，`.gitignore` 里对应的三条也是。
 */
import { rmSync } from "node:fs";
import { join } from "node:path";

const PUB = join(process.cwd(), "public");
const STALE = ["blog", "case-studies", "zh"];

for (const rel of STALE) {
  rmSync(join(PUB, rel), { recursive: true, force: true });
}

console.log(`clean-legacy-output: 已清 ${STALE.map((r) => `public/${r}/`).join(" ")}`);
