/**
 * 内容家族的分区表 —— 哪些目录里放着双语原稿。
 *
 * 两个家族都已经迁进 Next 路由（`src/app/(en)/blog/**` 与 `case-studies/**`），
 * 构建期不再有脚本产出它们。这份表现在有三个用家：
 *
 * · `doc.mjs` 的 `listDocs()` —— 路由的 `generateStaticParams()` 靠它
 * · `scripts/fix-dir-index.mjs` —— 每个家族的索引页要改名成目录索引形态
 * · `scripts/clean-legacy-output.mjs` —— 清掉旧管线在 `public/` 下的残留
 *
 * 加新家族就在这里加一行，同时建好四条路由（`(en)`/`(zh)` × 索引/文章）。
 */
export const SECTIONS = [
  { id: "blog", dir: "src/content/pages/blog" },
  { id: "case-studies", dir: "src/content/pages/case-studies" },
];
