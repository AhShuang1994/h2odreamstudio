/**
 * 内容家族的分区表 —— 哪些目录里放着双语原稿，以及谁在渲染它们。
 *
 * 原先这份名单是 `scripts/split-content-lang.mjs` 对 `src/content/pages/` 的一次
 * `readdirSync`。写成显式表格是因为迁进 Next 路由是**分家族逐步**做的：
 * 「这个家族归谁渲染」必须是可读的一行，不能靠扫目录的副作用。
 *
 * 地址形态不在这里 —— 它由 `html.mjs` 的 `urlsFor()` 从相对路径推出来：
 * 文章页带 `.html`，索引页是目录形态，两种都是已收录的原样。
 */
export const SECTIONS = [
  /**
   * `nextOwned: true` = 由 `src/app/**` 的路由渲染，构建期脚本不再产出它。
   * 翻成 true 的同时必须建好四条路由（`(en)`/`(zh)` × 索引/文章），
   * 否则那一批地址会整个消失 —— `urls.test.ts` 的站内链接断言会红。
   */
  { id: "blog", dir: "src/content/pages/blog", nextOwned: true },
  { id: "case-studies", dir: "src/content/pages/case-studies", nextOwned: false },
];
