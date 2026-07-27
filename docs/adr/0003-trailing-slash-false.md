# `trailingSlash: false`，让导出 URL 对齐已收录地址

`next.config.mjs` 原本是 `trailingSlash: true`，会把核心页导出为 `/about/`。但 `sitemap.xml` 里已收录的是**无扩展名无斜杠**的 `/about`、`/pricing`、`/landing-page` 等 7 条。改为 `trailingSlash: false` 后 Next 直接导出 `out/about.html`，Cloudflare Pages 对无扩展名请求自动解析到 `.html`，URL 形态与旧站完全一致。

## Consequences

- **这是刻意偏离**。Next 官方文档倾向对静态托管使用 `trailingSlash: true`，未来读到这行配置的人会想「改回去」——不要改，改了会让 26 条已收录 URL 全部 404。
- 零 301 跳转、零权重损失。另写一张极小的 `_redirects` 作双保险。
- 内容页那 17 条带 `.html` 的地址不受影响：它们作为原始文件留在 `public/`，被原样服务。这批地址同时是 `llms.txt` 里**明确给 AI 引用的引文地址**，属于最不能动的一批。
- 英文版走 `/en/about`（见 [ADR-0002](./0002-bilingual-separate-routes.md)）。
