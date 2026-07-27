# `trailingSlash: false`，让导出 URL 对齐已收录地址

`next.config.mjs` 原本是 `trailingSlash: true`，会把核心页导出为 `/about/`。但 `sitemap.xml` 里已收录的是**无扩展名无斜杠**的 `/about`、`/pricing`、`/landing-page` 等 7 条。改为 `trailingSlash: false` 后 Next 直接导出 `out/about.html`，Cloudflare Pages 对无扩展名请求自动解析到 `.html`，URL 形态与旧站完全一致。

## Consequences

- **这是刻意偏离**。Next 官方文档倾向对静态托管使用 `trailingSlash: true`，未来读到这行配置的人会想「改回去」——不要改，改了会让 26 条已收录 URL 全部 404。
- 零 301 跳转、零权重损失。另写一张极小的 `_redirects` 作双保险。
- 英文版走 `/en/about`（见 [ADR-0002](./0002-bilingual-separate-routes.md)）。

## 更正（2026-07-27，预览站实测）

本 ADR 原先写着「内容页那 17 条带 `.html` 的地址不受影响：它们作为原始文件留在 `public/`，被原样服务」。**这句话在 Cloudflare Pages 上是错的。**

预览站 `h2odreamstudio-next.pages.dev` 实测：

| 托管 | `/blog/xxx.html` |
|---|---|
| GitHub Pages（现行正式域名） | **200**，直接服务 |
| Cloudflare Pages（新旧两个项目行为一致） | **308** → `/blog/xxx`（目标 200） |

**Cloudflare Pages 会自动剥掉 `.html` 后缀并做 308 永久重定向，这是平台内建行为，不可关闭。** `/index.html` 同理 → 308 → `/`（目标正确，不会变成 `/index`）。

这不是本决策引入的缺陷 —— 旧 CF Pages 项目一直如此，只是域名从未切过去所以没人发现。

### 因此

- **接受 308，不与平台对抗。** 308 是永久重定向，传递权重，目标返回 200。搜索引擎会把规范地址收敛到无扩展名形式。
- **但生成物必须跟着改**：构建期生成的 `sitemap.xml` 与 `llms.txt` 要用**无扩展名**形式，否则 sitemap 里全是重定向地址、AI 拿到的引文链接每次都要多跳一次（见 ADR-0002 与相关票）。
- **canonical 与 og:url 要改成无扩展名形式。** 实测现有内容页的 canonical 指向 `…/blog/seo-vs-geo-ai-search.html` —— 切换托管后它会指向一个 308 地址，而 canonical 指向重定向不是好实践。
- 站内约 124 处 `href="…index.html"` 每次点击都会多一跳，功能正常但可顺手清理。
