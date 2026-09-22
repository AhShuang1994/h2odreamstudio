/**
 * 内容家族的分区表：哪些目录里放着双语原稿。
 *
 * 三个家族都由 Next 路由渲染（`src/app/(en)/**` 与 `(zh)/zh/**`），
 * 构建期不再有脚本产出它们。这份表的用家：
 *
 * · `doc.mjs` 的 `listDocs()`，路由的 `generateStaticParams()` 靠它
 * · `scripts/fix-dir-index.mjs`：有索引页的家族要改名成目录索引形态
 * · `scripts/clean-legacy-output.mjs`：清掉旧管线在 `public/` 下的残留
 *
 * 加新家族就在这里加一行，同时建好对应的路由。
 */
export const SECTIONS = [
  { id: "blog", dir: "src/content/pages/blog" },
  { id: "case-studies", dir: "src/content/pages/case-studies" },

  /**
   * 四个服务页。与上面两个家族有两点不同：
   *
   * · **地址不带分区名**，是 `/landing-page`，不是 `/services/landing-page`。
   *   已收录的形态，一个字不能动，所以 `url` 得显式给，不能靠目录推。
   *   它们也没有索引页，`fix-dir-index` 因此自然跳过。
   *
   * · **价格接进数据源**，原稿里写的是 `{{starter}}` 这类占位符，构建期由
   *   `src/content/prices.json` 填。这四页曾是全站最后一处硬编码价格的地方。
   *
   * 原稿不放在 `src/content/pages/` 下是刻意的：`test/export/content-lang.test.ts`
   * 扫的就是那个目录，并按 `<dir>/<file>` 推导输出路径，放进去它会期待
   * `out/services/landing-page.html`。
   */
  {
    id: "services",
    dir: "src/content/services",
    url: (slug) => `/${slug}`,
    prices: true,
  },
];
