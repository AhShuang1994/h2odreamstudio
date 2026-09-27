# SEO 行动计划

当前要做的 SEO 事项和进度。做完一项就把 `[ ]` 改成 `[x]`，写上日期。
踩过的坑和规则见 [`seo-lessons.md`](./seo-lessons.md)，这里只放待办。

**起点（2026-09-27）**：PR #168 修好了 36 个内容页的规范地址（`.html` → 无扩展名）。上线后实测，sitemap 里 56 个地址全部 200，canonical 都指向自己。下面这些是修复之后要跟进的事。

---

## 1. Google Search Console：重新提交（修复当天）

- [ ] **Sitemaps** → 提交 `sitemap.xml`
- [ ] 按下面的顺序对内容页点 **"请求编入索引"**（网址检查 → 贴完整网址 → 请求编入索引）

每天有配额（大约十条，以后台为准），分三天做。越靠前的页面，搜索的人离下单越近。

### 第 1 天：英文版最重要的 10 页

| | 网址 | 为什么优先 |
|---|---|---|
| [ ] | `https://www.h2o-dreamer-studio.com/blog/website-cost-malaysia` | "网站多少钱"是最接近下单的搜索 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/which-website-for-your-business` | 老板在挑选方案，意图明确 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/wix-vs-hire-designer` | 正在"自己做还是请人做"之间做决定 |
| [ ] | `https://www.h2o-dreamer-studio.com/case-studies/serai-beauty-salon` | 唯一明确写了新山（JB）的页面，吃本地搜索 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/seo-vs-geo-ai-search` | GEO 招牌文章，AI 最容易引用 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/whatsapp-vs-website` | 打中"只用 WhatsApp 够不够"的疑问 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/social-media-vs-website` | 针对只用 FB/IG 的老板 |
| [ ] | `https://www.h2o-dreamer-studio.com/case-studies/cooltech-aircon` | 上门服务类行业，客户群大 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/website-no-traffic-loop` | 有网站但没流量的老板 |
| [ ] | `https://www.h2o-dreamer-studio.com/blog/website-process-what-to-expect` | 快决定前会看"流程怎么走" |

### 第 2 天：中文版最重要的 8 页 + 两个目录页

马来西亚华人老板是核心客户，中文版一样重要。

- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/website-cost-malaysia`
- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/which-website-for-your-business`
- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/wix-vs-hire-designer`
- [ ] `https://www.h2o-dreamer-studio.com/zh/case-studies/serai-beauty-salon`
- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/seo-vs-geo-ai-search`
- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/whatsapp-vs-website`
- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/social-media-vs-website`
- [ ] `https://www.h2o-dreamer-studio.com/zh/case-studies/cooltech-aircon`
- [ ] `https://www.h2o-dreamer-studio.com/blog/`
- [ ] `https://www.h2o-dreamer-studio.com/zh/blog/`

### 第 3 天：其余案例拆解（英文优先，中文有余额再做）

- [ ] `/case-studies/wok-and-flame-fnb`
- [ ] `/case-studies/glow-seoul-skincare`
- [ ] `/case-studies/muse-apparel-shopify`
- [ ] `/case-studies/wedding-premium-elegant`
- [ ] `/case-studies/wedding-premium-cinematic`
- [ ] `/case-studies/wedding-basic-minimal`
- [ ] `/case-studies/wedding-basic-outdoor`
- [ ] `/case-studies/`

首页、pricing、about、contact 这次没有改动，本来就正常，不用提交。

## 2. 修复后 1～2 周：看 GSC 的"网页"报告

- [ ] **"已编入索引"的数字有没有涨**：这是要盯的主指标。
- [ ] "网页会自动重定向"的数量可能增加：**这是正常的**，旧的 `.html` 地址被归类为跳转，说明 Google 认得新地址了。
- [ ] 如果出现"Google 选择的规范网页与用户指定的不同"，截图下来查原因。

## 3. 接下来 1 个月：按优先顺序

1. [ ] **Google Business Profile（最重要）**：搜"web design Johor Bahru"或"新山 网站设计"时，排最前的通常是地图结果。先确认有没有登记商家资料，没有就立刻做，免费。
2. [ ] **让老客户留 Google 评论**：本地排名看评论数和质量，先找 3～5 位做过网站的客户。
3. [x] **做一个新山专页**（2026-09-27，PR #167：`/web-design-johor-bahru` + `/zh/web-design-johor-bahru`，上线后两条都去 GSC 请求编入索引）：首页标题是"Web Design Malaysia"，范围太大、竞争激烈。一个人做的工作室，更容易在"Johor Bahru / 新山"这类本地词上排上去。
4. [ ] **Bing Webmaster Tools**：ChatGPT 的搜索有一部分依赖 Bing 的索引，对 GEO 策略很重要。开好后台后，用仓库里的 `scripts/indexnow-submit.js` 提交全站地址（先跑 `npm run build`）。
5. [ ] **补真实客户案例**：现在的案例拆解大多是样板站的设计解说。有真实客户的成果（数据、评价）后，Google 的信任度（E-E-A-T）会高很多。

## 4. 数据接入（让 Claude 能直接看数据）

- [ ] 建 Google 服务账号，启用 Search Console API 和 Analytics Data API
- [ ] 服务账号邮箱加进 GSC（权限"受限"）和 GA4（角色"查看者"）
- [ ] JSON 密钥放进云端环境变量 `GOOGLE_SA_KEY`（不要贴进聊天），并在 Allowed domains 加上 `oauth2.googleapis.com`、`searchconsole.googleapis.com`、`www.googleapis.com`、`analyticsdata.googleapis.com`
- [ ] Cloudflare API token 加上 Zone → Analytics → Read 与 Zone → DNS → Read（只选 `h2o-dreamer-studio.com` 这个域名）

接好之后，每两周检查一次收录、排名和 WhatsApp 点击，结果更新到这份文件。
