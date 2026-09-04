/**
 * 清掉已迁进 Next 路由那些家族的**陈旧构建产物**（prebuild，排在拆分脚本之前）。
 *
 * ⚠️ 这不是洁癖，是防一个只在本机出现的幽灵 bug：
 *
 * `public/blog/`、`public/case-studies/`、`public/zh/` 是 gitignore 的，所以**每台
 * 构建过这个仓库的机器上都存在**。一个家族迁进 Next 路由之后，拆分脚本不再产出
 * 它，但上一次构建留下的文件还躺在 `public/` 里 —— 而 Next 会把 `public/` 原样
 * 拷进 `out/`。于是路由生成的 `out/blog/x.html` 和陈旧的那一份撞车，谁赢看运气。
 *
 * CI 是全新 clone，永远撞不到，所以这个 bug 只会在你自己机器上发作，还查不出来。
 */
import { rmSync } from "node:fs";
import { join } from "node:path";
import { SECTIONS } from "../src/lib/content/manifest.mjs";

const PUB = join(process.cwd(), "public");

const owned = SECTIONS.filter((s) => s.nextOwned).map((s) => s.id);
for (const id of owned) {
  for (const rel of [id, `zh/${id}`]) {
    rmSync(join(PUB, rel), { recursive: true, force: true });
  }
}

console.log(
  owned.length
    ? `clean-legacy-output: 已清 ${owned.map((id) => `public/${id}/ public/zh/${id}/`).join(" ")}`
    : "clean-legacy-output: 没有已迁移的家族，无事可做",
);
