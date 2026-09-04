/**
 * 内容家族的分区表 —— 哪些目录里放着双语原稿。
 *
 * 原先这份名单是 `scripts/split-content-lang.mjs` 对 `src/content/pages/` 的一次
 * `readdirSync`。写成显式表格是因为迁进 Next 路由之后，每个家族对应一组路由文件，
 * 「有哪些家族」这件事必须是**可读的一行**，不是靠扫目录的副作用。
 *
 * 地址形态不在这里 —— 它由 `html.mjs` 的 `urlsFor()` 从相对路径推出来：
 * 文章页带 `.html`，索引页是目录形态，两种都是已收录的原样。
 */
export const SECTIONS = [
  { id: "blog", dir: "src/content/pages/blog" },
  { id: "case-studies", dir: "src/content/pages/case-studies" },
];
