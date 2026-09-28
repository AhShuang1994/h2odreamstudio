# SEO 行动计划

当前要做的 SEO 事项和进度。做完一项就把 `[ ]` 改成 `[x]`，写上日期。
踩过的坑和规则见 [`seo-lessons.md`](./seo-lessons.md)，这里只放待办。

**起点（2026-09-27）**：PR #168 修好了 36 个内容页的规范地址（`.html` → 无扩展名）。上线后实测，sitemap 里 56 个地址全部 200，canonical 都指向自己。下面这些是修复之后要跟进的事。

---

## 1. Google Search Console：重新提交（修复当天）

- [x] **Sitemaps** → 提交 `sitemap.xml`（2026-09-27）
- [ ] 按下面的顺序对内容页点 **"请求编入索引"**（网址检查 → 贴完整网址 → 请求编入索引）

每天有配额（大约十条，以后台为准），分三天做。越靠前的页面，搜索的人离下单越近。

### 第 1 天：英文版最重要的 10 页（2026-09-27 晚上 8 点多做完）

| | 网址 | 为什么优先 |
|---|---|---|
| [x] | `https://www.h2o-dreamer-studio.com/blog/website-cost-malaysia` | "网站多少钱"是最接近下单的搜索 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/which-website-for-your-business` | 老板在挑选方案，意图明确 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/wix-vs-hire-designer` | 正在"自己做还是请人做"之间做决定 |
| [x] | `https://www.h2o-dreamer-studio.com/case-studies/serai-beauty-salon` | 唯一明确写了新山（JB）的页面，吃本地搜索 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/seo-vs-geo-ai-search` | GEO 招牌文章，AI 最容易引用 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/whatsapp-vs-website` | 打中"只用 WhatsApp 够不够"的疑问 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/social-media-vs-website` | 针对只用 FB/IG 的老板 |
| [x] | `https://www.h2o-dreamer-studio.com/case-studies/cooltech-aircon` | 上门服务类行业，客户群大 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/website-no-traffic-loop` | 有网站但没流量的老板 |
| [x] | `https://www.h2o-dreamer-studio.com/blog/website-process-what-to-expect` | 快决定前会看"流程怎么走" |

### 第 2 天：新山专页 + 中文版最重要的 8 页

新山页 2026-09-27 晚上 10 点才上线，第 1 天提交时它还不存在，所以排在最前面。马来西亚华人老板是核心客户，中文版一样重要。

**2026-09-28 检查：10 条全部已经显示「已编入索引」，不用再请求。**

- [x] `https://www.h2o-dreamer-studio.com/web-design-johor-bahru`
- [x] `https://www.h2o-dreamer-studio.com/zh/web-design-johor-bahru`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/website-cost-malaysia`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/which-website-for-your-business`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/wix-vs-hire-designer`
- [x] `https://www.h2o-dreamer-studio.com/zh/case-studies/serai-beauty-salon`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/seo-vs-geo-ai-search`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/whatsapp-vs-website`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/social-media-vs-website`
- [x] `https://www.h2o-dreamer-studio.com/zh/case-studies/cooltech-aircon`

### 第 3 天：两个目录页 + 其余案例拆解（英文优先，中文有余额再做）

**2026-09-28 检查：4 条已编入索引。另外 6 条是「已发现 - 尚未编入索引」（Google 知道有这页，还没来读），当天都按了请求编入索引。上线检查全部 200、canonical 正确、没有 noindex，不是技术问题。一周后再看，如果变成「已抓取 - 尚未编入索引」才要改内容。**

- [x] `https://www.h2o-dreamer-studio.com/blog/`
- [x] `https://www.h2o-dreamer-studio.com/zh/blog/`
- [x] `/case-studies/wok-and-flame-fnb`
- [x] `/case-studies/glow-seoul-skincare`
- [x] `/case-studies/muse-apparel-shopify`
- [x] `/case-studies/wedding-premium-elegant`
- [x] `/case-studies/wedding-premium-cinematic`
- [x] `/case-studies/wedding-basic-minimal`
- [x] `/case-studies/wedding-basic-outdoor`
- [x] `/case-studies/`

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

- [x] 建 Google 服务账号，启用 Search Console API 和 Analytics Data API（2026-09-28，项目 `h2o-report`）
- [x] 服务账号邮箱加进 GSC（权限"受限"）和 GA4（角色"查看者"）（2026-09-28）
- [x] JSON 密钥放进 Worker `ga-report` 的 secret `GOOGLE_SA_KEY`（不要贴进聊天），步骤见 `workers/ga-report/README.md`（2026-09-28，Worker 已部署，第一次同步 GA / GSC / 收录都成功）
- [x] 设好 Cloudflare Access（Policy `me` + Service Auth `claude`）与 Claude 云端环境 `ga-report`（2026-09-28，README 的 D～F.1）
- [ ] 建 Claude routines「网站周报」「网站月报」（README 的 F.2），建好先按 Run now 测一次，报告页最上面要出现建议
- [ ] Cloudflare API token 加上 Zone → Analytics → Read 与 Zone → DNS → Read（只选 `h2o-dreamer-studio.com` 这个域名）

接好之后，数字与 Claude 的周报、月报都在 `/app/report/`（要登录，见 ADR-0009）。仓库是公开的，**真实数字不要写回这份文件**。

## 5. 外部平台登记（第一批 backlink）

每个平台都放上网站网址，就是一条别人指向我们的链接（backlink）。Google 也会比对各平台上的资料，**名称、电话、地区必须跟 Google 商家资料一字不差**。

⚠️ 不买链接（"RM 50 送 1000 个 backlink"那种会被降权）。小红书照旧不放任何站外链接。

### 统一填写的资料

| 项目 | 填什么 |
|---|---|
| 名称 | `H2ODreamer Studio`（不加任何关键词，加了违反 Google 规定） |
| 类别 | Website designer / Web design |
| 电话 / WhatsApp | `+60 17-513 8694` |
| 电邮 | `huihuang@h2o-dreamer-studio.com` |
| 网站 | `https://www.h2o-dreamer-studio.com` |
| 地区 | Johor Bahru, Johor, Malaysia（服务区，不公开地址，跟 Google 商家资料一致） |
| 营业时间 | 周一至周六 9:00–19:00 |
| 语言 | English / 中文 |
| Logo | `Documents/HuiHuang-Agent/gbp-photos/logo-720.png` |
| 封面 / 作品图 | `Documents/HuiHuang-Agent/gbp-photos/` 里的 00–06 |
| 短描述 | Affordable websites for Malaysian small businesses, designed and built by one designer in Johor. Landing pages from RM 590, no monthly fee. |
| 长描述 | 跟 Google 商家资料那段一样 |

价格以 `src/content/prices.json` 为准，改价时这里和各平台要一起改。

### 要登记的平台（照顺序）

| | 平台 | 网址 | 为什么 |
|---|---|---|---|
| [ ] | Bing Places | https://www.bingplaces.com | 可以直接从 Google 商家资料导入，5 分钟。Bing 地图，ChatGPT 搜索也用 Bing |
| [ ] | Apple Business Connect | https://businessconnect.apple.com | iPhone 地图和 Siri 用它 |
| [ ] | Facebook 专页 | https://www.facebook.com/pages/create | 很多马来西亚老板在 FB 上找人 |
| [ ] | Instagram | 已有 `@h2odreamer.studio` | 确认 bio 链接是网站首页 |
| [ ] | Threads | 跟 IG 同一个账号 | 个人资料放网站网址 |
| [ ] | LinkedIn 公司页 | https://www.linkedin.com/company/setup/new/ | 个人档案的"工作经历"也挂到这个公司页 |
| [ ] | Clutch | https://clutch.co | 客户找设计公司的名录，找 "Get Listed"，免费 |
| [ ] | GoodFirms | https://www.goodfirms.co | 同上，找 "Get Listed" |
| [ ] | DesignRush | https://www.designrush.com | 同上，找 "List your agency" |

### 每登记完一个

1. 在上表打勾，写日期。
2. 把该平台的**个人资料网址**记下来，交给 Claude 加进网站结构化数据的 `sameAs`（`src/lib/jsonld.ts`，目前只有 Instagram）。`sameAs` 告诉 Google 和 AI "这些账号都是同一家工作室"，见 `GEO-CHECKLIST.md` §3。
