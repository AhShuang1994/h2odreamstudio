# SEO 踩坑记录

这个站真实犯过的 SEO 错误，每条都附上以后怎么防。**改 URL、canonical、sitemap、托管配置之前先读一遍。**

新踩到的坑往这里追加，格式照旧：发生了什么 → 为什么伤 SEO → 规则 → 谁在守。

当前要做的 SEO 待办在 [`seo-action-plan.md`](./seo-action-plan.md)。

---

## 1. 规范地址指向重定向地址（2026-09 发现）

**发生了什么**：Cloudflare Pages 会把 `/blog/x.html` 308 到 `/blog/x`。这是平台内建行为，关不掉。可是线上 36 个内容页（blog + 案例拆解，中英各 18 页）的 sitemap、`<link rel="canonical">`、hreflang、og:url 和站内链接全写着 `.html`。

**为什么伤 SEO**：Google 看到的是：sitemap 提交 A，A 跳到 B，B 的 canonical 又说"我的正式地址是 A"。信号互相打架，Google 要么随便挑一个，要么两个都不好好收录。偏偏这批页面是 GEO 的主力流量页。

**规则**：
- canonical、hreflang、og:url、sitemap、llms.txt、站内链接里写的地址，必须是**线上直接返回 200、不经过任何跳转**的那一个。
- 这个站的规范形态：核心页 `/about`，文章页 `/blog/x`（无扩展名），索引页 `/blog/`（带尾斜杠）。
- 内容页的地址只在一处生成：`src/lib/content/html.mjs` 的 `pageUrl()` / `urlsFor()`。不要在别处手拼地址。

**谁在守**：`test/export/urls.test.ts` 里的两条测试，"canonical / hreflang / og:url / sitemap / llms.txt 都不带 .html"和"内容页的站内链接不指向会被 308 的 .html 地址"。

## 2. ADR 写了"必须改"，但没人去改

**发生了什么**：第 1 条的问题，ADR-0003 在 2026-07-27 的更正里已经写明"sitemap、canonical、og:url 要改成无扩展名形式"。可是之后没有开票，也没有加测试。域名切到 Cloudflare Pages 以后，它在正式站上躺了两个月。

**规则**：文档里写"必须 / 要改"的 SEO 事项，**当天**就要落成一条测试，或者一张 GitHub Issue。只写在文档里的规则，迟早被忘掉。

## 3. 换托管平台 = 所有 URL 行为重新验证

**发生了什么**：
- GitHub Pages 对 `/blog/x.html` 直接返回 200，Cloudflare Pages 却返回 308。同一份文件，换了平台，URL 行为就变了。
- `_headers` 里的 `X-Robots-Tag` 只有 Cloudflare Pages / Netlify 会读，GitHub Pages 根本不读（见 ADR-0006）。
- 子目录里的 `robots.txt` 不生效，搜索引擎只读域名根目录那一份。

**规则**：换托管、换域名、改 `trailingSlash` 这类配置之后，必须用下面的"上线后自检"把线上**每一条** sitemap 地址实测一遍，不能只测首页。noindex 这类防护是否生效也要在线上实测，不能假设。

## 4. 迁移不要叠在一起做

**发生了什么**：2026-07~09 同时做了三件事：托管从 GitHub Pages 换到 Cloudflare Pages；`/` 从中文改成英文、中文搬到 `/zh/`（ADR-0002）；内容页迁进 Next 路由。每一件都会让 Google 重新评估排名，叠在一起就分不清哪一步出了问题。

**规则**：会动 URL 或语言的改动一次只做一件。每一件上线后：
1. 在 Google Search Console 重新提交 sitemap；
2. 对主要页面点"请求编入索引"；
3. 观察 2~4 周的"网页 → 索引编制"报告，确认没有新增"网页会自动重定向"或"Google 选择的规范网页与用户指定的不同"，再做下一件。

## 5. noindex 的页面进了 sitemap（2026-09-30 发现）

**发生了什么**：`/privacy` 与 `/terms` 页面上写着 `<meta name="robots" content="noindex">`，可是 sitemap 是扫 `out/` 自动生成的，只看有没有 canonical，把它们也收了进去。

**为什么伤 SEO**：sitemap 在说"请收录"，页面在说"别收录"。GSC 会把它们列进"已提交的网址标记为 noindex"，Google 也会觉得这份 sitemap 不太可信。

**规则**：页面写了 noindex，就不能出现在 sitemap。llms.txt 可以照列（它是给 AI 看的介绍，不是收录请求）。

**谁在守**：`scripts/gen-sitemap.mjs` 自动跳过 noindex 的页面；`test/export/discovery.test.ts` 的"没有 noindex 的页面"。

## 6. robots.txt 挡住了 CSS 与 JS（2026-09-30 发现）

**发生了什么**：`robots.txt` 里写着 `Disallow: /css/` 和 `Disallow: /js/`，本意是"不让爬虫读代码"。可内容页的样式表、字体表和脚本就放在这两个目录。

**为什么伤 SEO**：Google 收录前会先把页面"画"出来。挡掉样式和脚本，它看到的是一页没排版的文字，判断手机适配和版面时会误判。Google 官方文件明确说不要挡。

**规则**：页面渲染要用的目录（`/css/`、`/js/`、`/_next/`、`/fonts/`）一律不能 Disallow。想藏的只能是页面用不到的东西。

**谁在守**：`test/export/seo.test.ts` 的"没有挡住页面渲染要用的样式、脚本、字体"。

---

## 上线后自检

每次改 URL、canonical 或托管配置，部署后都跑一遍：

```bash
S=https://www.h2o-dreamer-studio.com
# sitemap 里每条地址都必须是 200，不能是 301/308/404
curl -s $S/sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//' | while read u; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"
done | grep -v '^200 '
# 没有输出 = 全部通过

# 抽查一页的 canonical 是否指向它自己
curl -s $S/blog/seo-vs-geo-ai-search | grep -o '<link rel="canonical"[^>]*>'

# 各种写法都要一步跳到规范地址（只跳一次，目标就是 canonical）
for u in http://www.h2o-dreamer-studio.com/about https://h2o-dreamer-studio.com/about $S/about/ $S/about.html; do
  printf '%s  ' "$u"; curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}
' "$u"
done

# 不存在的地址必须回 404，不能回 200（"软 404"会被当成重复页）
curl -s -o /dev/null -w '%{http_code}
' $S/this-page-does-not-exist
```

2026-09-30 实测：以上全部通过（http→https、无 www→www、尾斜杠、`.html` 都是一步到位，不存在的地址回 404）。
