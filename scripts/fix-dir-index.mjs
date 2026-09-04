/**
 * 索引页改名成目录索引形态（postbuild，**排在所有产物脚本之前**）。
 *
 * ## 为什么需要这一步
 *
 * `trailingSlash: false`（ADR-0003，不能改）让 `app/(en)/blog/page.tsx` 导出成
 * `out/blog.html`。但博客索引的**已收录规范地址是 `/blog/`**，带尾斜杠 ——
 * Cloudflare 对它解析的是 `out/blog/index.html`。两件事逼着那个文件必须存在：
 *
 * · `test/export/urls.test.ts` 解析 `/blog/` 时**只**认 `blog/index.html`，
 *   否则全站每一条 `<a href="/blog/">` 都会被判成死链
 * · 若 `blog.html` 与 `blog/index.html` 并存，两者 canonical 都是 `/blog/`，
 *   sitemap 会出现重复条目，`discovery.test.ts` 红
 *
 * 所以是**改名**，不是复制 —— 改完不留 `out/blog.html`。
 *
 * ## 前置条件会抛错，这是故意的
 *
 * 如果哪天有人把 `trailingSlash` 改成 true，Next 直接导出 `out/blog/index.html`，
 * 这里找不到 `out/blog.html` 就会炸。那正是我们要的绊线 —— 改那个配置会让 26 条
 * 已收录地址全部 404，必须在构建期就拦下来，不是上线之后才发现。
 *
 * 移动文件本身是安全的：Next 发的资源路径都是绝对的 `/_next/...`，层级不影响。
 */
import { existsSync, statSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { listDocs } from "../src/lib/content/doc.mjs";

const OUT = join(process.cwd(), "out");

// 只有带索引页的家族需要这一步。服务页（/landing-page 之类）没有索引页，
// 地址本来就是扁平的，跳过。
const targets = [...new Set(listDocs().filter((d) => d.isIndex).map((d) => d.section))].flatMap(
  (id) => [id, `zh/${id}`],
);

for (const rel of targets) {
  const flat = join(OUT, `${rel}.html`);
  const dir = join(OUT, rel);

  if (!existsSync(flat)) {
    throw new Error(
      `fix-dir-index: 找不到 out/${rel}.html —— ` +
        `索引路由没导出成扁平 .html，多半是 trailingSlash 被改了（见 ADR-0003）`,
    );
  }
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`fix-dir-index: out/${rel}/ 不是目录 —— 文章路由没产出？`);
  }

  const canonical = /<link rel="canonical" href="([^"]+)"/i.exec(readFileSync(flat, "utf8"))?.[1];
  if (!canonical?.endsWith("/")) {
    throw new Error(
      `fix-dir-index: out/${rel}.html 的 canonical 是 ${canonical ?? "（没有）"} —— ` +
        `索引页的规范地址必须带尾斜杠，否则改名之后地址与 canonical 对不上`,
    );
  }

  renameSync(flat, join(dir, "index.html"));
}

console.log(
  targets.length
    ? `fix-dir-index: ${targets.map((r) => `out/${r}.html → out/${r}/index.html`).join("，")}`
    : "fix-dir-index: 没有已迁移的索引页，无事可做",
);
