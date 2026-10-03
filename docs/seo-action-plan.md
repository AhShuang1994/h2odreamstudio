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

## 2b. 技术 SEO 修复之后（2026-09-30 修：sitemap 去掉 noindex 页、robots.txt 放行 CSS/JS、文章页加面包屑）

- [x] 部署后跑一遍 `seo-lessons.md` 的"上线后自检"（2026-09-30：56 条全 200，sitemap 没有 privacy / terms，跳转都一步到位，404 正常）
- [x] 用 [Rich Results Test](https://search.google.com/test/rich-results) 抽查一篇文章：要看到 `BreadcrumbList`、`BlogPosting`、`FAQPage`，没有错误（2026-09-30，`/blog/seo-vs-geo-ai-search`：文章、面包屑都有效，0 错误。FAQ 不列出是正常的，见 2c。有 4 条可选警告：`datePublished` / `dateModified` 只写了日期、没写时区，不影响资格）
- [ ] 1～2 周后：GSC → 增强功能 → **面包屑**出现，没有错误；"已提交的网址标记为 noindex"归零

## 2c. 缩短标题与描述（计划 2026-09-30 晚上做）

**为什么**：2026-09-30 体检发现，56 个该收录的页面里有 34 个标题、39 个描述太长。Google 会把它们截断或自己改写，搜索结果里那一行就不是我们写的了。标题是搜索结果里最大的那行字，直接决定别人点不点。

**这次不动网址**，只改 `<title>` 和 meta description，所以不算 `seo-lessons.md` §4 说的「迁移」，风险小。

**长度上限**（含结尾的 ` | H2ODreamer Studio`，大约 20 个字元）：

**站名分隔符用 `|`**（2026-09-30 起）：Google 文档列的品牌分隔符是 `|`、`-`、`:`，没有 `·`。Google 已经把 About 页显示成 "About - H2ODreamer Studio"，等于在替我们改写。全站 `<title>` 已换成 `|`；中文首页与中文博客目录页的站名夹在中间，第 3 批重写时一起处理。

| | 标题 | 描述 |
|---|---|---|
| 英文 | ≤ 60 字元 | ≤ 155 字元 |
| 中文 | ≤ 50 字元（约 30 个汉字 + 站名） | ≤ 80 字元 |

### 第 0 步：先让 Claude 做好「另写标题」的功能（约 15 分钟）

- [x] **问题**：博客、案例、服务页的英文 `<title>` 直接取页面上的 `<h1>`（`src/lib/content/html.mjs` 的 `titleFromH1`），英文描述取正文第一段再截到 160 字（`descriptionFromBody`）。直接改 H1 会动到页面上看得到的文案（#65 冻结）。
- [x] **做法**：原稿 `<head>` 里可以另写一组短标题和描述，有写就用它，没写就照旧取 H1 和第一段。页面上看到的 H1 一个字都不动。
- [x] **加测试**：`test/export/seo.test.ts` 加长度检查，先用「棘轮」写法（超长页数不能比现在多，见 `test/README.md`）。全部改完后改成硬性上限。

2026-09-30 做完。**写法**：在原稿 `<head>` 加

```html
<meta name="en:title" content="Website Cost in Malaysia 2026">
<meta name="en:description" content="…">
```

`en:title` **不写站名**，会自动补上 ` | H2ODreamer Studio`（算长度时要算进去）。JSON-LD 的 headline 也会跟着换。测试基线：一开始标题 34、描述 39，第 1 批后标题 25、描述 31，第 2 批后标题 11、描述 22，第 3 批后归 0，测试已改成硬性上限。

### 第 1～3 步：写新标题与描述

跟 Claude 说：「用 `/copywriter` 做 2c 第 N 批」。每批写完先给你看，你点头了才改进去。

- [x] **copywriter 技能加了 SEO Mode**（2026-09-30，[my-claude-skills#4](https://github.com/AhShuang1994/my-claude-skills/pull/4)，`SKILL.md` Part 2B）：写之前先查 Google 前几名，标题与描述给 A / B / C 三组，每条规则标明出处（Google 官方文档或 Ahrefs）。**长度以本节上表为准**（含站名），比技能里的通用估算优先。另外记住：FAQ 折叠问答从 2023 年 9 月起只给政府和卫生网站，我们的 `FAQPage` 标签照留，但搜索结果里不会出现折叠问答。

**写法规则**：
- 关键词放最前面（例如 "Website Cost in Malaysia 2026"），站名放最后。
- 意思跟原本的 H1 一样，只是更短。不写页面上没有的承诺。
- 能写具体的就写具体：价格（RM）、年份、Johor Bahru / 新山。
- 描述要把话说完，别在句子中间被截断。描述里要有一个让人想点的理由。
- 每页的标题和描述全站不能重复（测试会查）。

加粗 = 超过上限。

**第 1 批：英文、最接近下单的 12 页**（2026-09-30 写好并改进去：`/copywriter` SEO Mode，先查 google.com.my 前几名，每页 A / B / C 三组，用了推荐那组。只改超长的项；`/pricing`、`/contact`、`/about` 的标题虽没超长，但原本是 "Pricing" 这种空词，也一起换了）

| | 地址 | 类型 | 标题长度 | 描述长度 |
|---|---|---|---|---|
| [x] | `/` | 核心页 | **80** | **264** |
| [x] | `/pricing` | 核心页 | 27 | **215** |
| [x] | `/contact` | 核心页 | 27 | **223** |
| [x] | `/about` | 核心页 | 25 | **191** |
| [x] | `/web-design-johor-bahru` | 服务页 | **73** | 145 |
| [x] | `/landing-page` | 服务页 | **68** | **158** |
| [x] | `/blog/website-cost-malaysia` | 博客 | **118** | 153 |
| [x] | `/blog/which-website-for-your-business` | 博客 | **114** | 152 |
| [x] | `/blog/wix-vs-hire-designer` | 博客 | **71** | **156** |
| [x] | `/blog/whatsapp-vs-website` | 博客 | **138** | 102 |
| [x] | `/blog/seo-vs-geo-ai-search` | 博客 | **88** | **158** |
| [x] | `/case-studies/serai-beauty-salon` | 案例 | **105** | **156** |

**第 2 批：英文其余 15 页**（2026-10-01 写好并改进去：同样先查 google.com.my，每页 A / B / C，用推荐那组。**做完后英文页全部在上限内。** 另外 14 页的描述原本没超长、但被截在句子中间（结尾是「…」），照「描述要把话说完」一起重写；8 个案例都写明是概念作品，不写成真实客户）

| | 地址 | 类型 | 标题长度 | 描述长度 |
|---|---|---|---|---|
| [x] | `/shopify-migration` | 服务页 | **68** | 155 |
| [x] | `/wedding-basic` | 服务页 | **82** | 144 |
| [x] | `/wedding-premium` | 服务页 | **70** | **156** |
| [x] | `/blog/social-media-vs-website` | 博客 | **112** | **156** |
| [x] | `/blog/website-no-traffic-loop` | 博客 | **103** | 155 |
| [x] | `/blog/website-process-what-to-expect` | 博客 | **111** | **160** |
| [x] | `/case-studies/` | 案例 | 47 | **160** |
| [x] | `/case-studies/cooltech-aircon` | 案例 | **121** | 152 |
| [x] | `/case-studies/glow-seoul-skincare` | 案例 | **84** | **159** |
| [x] | `/case-studies/muse-apparel-shopify` | 案例 | **80** | 152 |
| [x] | `/case-studies/wedding-basic-minimal` | 案例 | **86** | **160** |
| [x] | `/case-studies/wedding-basic-outdoor` | 案例 | **84** | **160** |
| [x] | `/case-studies/wedding-premium-cinematic` | 案例 | **63** | **160** |
| [x] | `/case-studies/wedding-premium-elegant` | 案例 | **106** | **160** |
| [x] | `/case-studies/wok-and-flame-fnb` | 案例 | **97** | 154 |

**第 3 批：中文 22 页**（2026-10-03 写好并改进去：先查 google.com.my 中文前几名，每页 A / B / C，`/zh/blog/website-no-traffic-loop` 用 B（「网站没流量怎么办」是大家搜的原话），其余用 A。只改超长的项；`/zh/pricing`、`/zh/contact` 原本是「价格方案」「联系我」这种空词，也一起换了。首页与博客目录页的站名移到最后。**做完后全站中英文都在上限内。** 查到的事：马来西亚华人多搜「网页设计」，不是「网站设计」，首页标题用前者）

| | 地址 | 类型 | 标题长度 | 描述长度 |
|---|---|---|---|---|
| [x] | `/zh` | 核心页 | 40 | **111** |
| [x] | `/zh/pricing` | 核心页 | 24 | **114** |
| [x] | `/zh/contact` | 核心页 | 23 | **125** |
| [x] | `/zh/blog/` | 博客 | 37 | **144** |
| [x] | `/zh/blog/website-cost-malaysia` | 博客 | 50 | **91** |
| [x] | `/zh/blog/which-website-for-your-business` | 博客 | 47 | **98** |
| [x] | `/zh/blog/wix-vs-hire-designer` | 博客 | 45 | **110** |
| [x] | `/zh/blog/whatsapp-vs-website` | 博客 | **59** | **81** |
| [x] | `/zh/blog/seo-vs-geo-ai-search` | 博客 | **53** | **157** |
| [x] | `/zh/blog/social-media-vs-website` | 博客 | 46 | **88** |
| [x] | `/zh/blog/website-no-traffic-loop` | 博客 | **54** | **97** |
| [x] | `/zh/blog/website-process-what-to-expect` | 博客 | **51** | **125** |
| [x] | `/zh/case-studies/` | 案例 | 49 | **102** |
| [x] | `/zh/case-studies/serai-beauty-salon` | 案例 | **71** | **153** |
| [x] | `/zh/case-studies/cooltech-aircon` | 案例 | **75** | **103** |
| [x] | `/zh/case-studies/glow-seoul-skincare` | 案例 | **70** | **134** |
| [x] | `/zh/case-studies/muse-apparel-shopify` | 案例 | **56** | **105** |
| [x] | `/zh/case-studies/wedding-basic-minimal` | 案例 | 50 | **96** |
| [x] | `/zh/case-studies/wedding-basic-outdoor` | 案例 | 46 | **99** |
| [x] | `/zh/case-studies/wedding-premium-cinematic` | 案例 | **51** | **102** |
| [x] | `/zh/case-studies/wedding-premium-elegant` | 案例 | **53** | **82** |
| [x] | `/zh/case-studies/wok-and-flame-fnb` | 案例 | **78** | **96** |

核心页（`/`、`/about`、`/contact`、`/pricing` 中英版）的标题和描述在 `src/content/home.ts`、`about.ts`、`contact.ts`、`pricing.ts`，直接改那里。

### 第 4 步：上线

- [ ] `npm test` 全过（包括新的长度检查），开 PR、合并（第 1 批 #204 于 2026-09-30 上线，第 2 批 #209 于 2026-10-01 上线；第 3 批未做）
- [x] 测试的「棘轮」改成硬性上限：以后新页面超长就构建失败（2026-10-03）
- [ ] 上线后，GSC 对改过的页「请求编入索引」，让 Google 早点看到新标题。每天约 10 条，分 3 天：

**2026-10-01 提交前检查**：Google 搜 `site:h2o-dreamer-studio.com` 显示的还是旧标题（"Pricing - H2ODreamer Studio" 这类），还没重新抓取。

| | 哪天 | 网址（前面加 `https://www.h2o-dreamer-studio.com`） |
|---|---|---|
| [x] | 第 1 天（2026-10-01 做完） | `/`、`/pricing`、`/web-design-johor-bahru`、`/landing-page`、`/blog/website-cost-malaysia`、`/blog/which-website-for-your-business`、`/blog/wix-vs-hire-designer`、`/blog/whatsapp-vs-website`、`/blog/seo-vs-geo-ai-search`、`/case-studies/serai-beauty-salon` |
| [ ] | 第 2 天 | `/contact`、`/about`、`/shopify-migration`、`/wedding-basic`、`/wedding-premium`、`/blog/social-media-vs-website`、`/blog/website-no-traffic-loop`、`/blog/website-process-what-to-expect` |
| [ ] | 第 3 天 | `/case-studies/`、`/case-studies/cooltech-aircon`、`/case-studies/glow-seoul-skincare`、`/case-studies/muse-apparel-shopify`、`/case-studies/wedding-basic-minimal`、`/case-studies/wedding-basic-outdoor`、`/case-studies/wedding-premium-cinematic`、`/case-studies/wedding-premium-elegant`、`/case-studies/wok-and-flame-fnb` |

第 3 批（中文）上线后，再把改过的中文页加进来。

### 第 5 步：2～4 周后看效果

- [ ] GSC → 效果 → 网页：比较改之前与改之后 4 周的**点击率 (CTR)**。点击率 = 看到你的人里有多少人点进来。
- [ ] 用 `site:h2o-dreamer-studio.com` 看搜索结果里显示的是不是我们写的标题。如果 Google 还在改写，记下是哪几页。

## 3. 接下来 1 个月：按优先顺序

1. [ ] **Google Business Profile（最重要）**：搜"web design Johor Bahru"或"新山 网站设计"时，排最前的通常是地图结果。先确认有没有登记商家资料，没有就立刻做，免费。
2. [ ] **让老客户留 Google 评论**：本地排名看评论数和质量，先找 3～5 位做过网站的客户。
3. [x] **做一个新山专页**（2026-09-27，PR #167：`/web-design-johor-bahru` + `/zh/web-design-johor-bahru`，上线后两条都去 GSC 请求编入索引）：首页标题是"Web Design Malaysia"，范围太大、竞争激烈。一个人做的工作室，更容易在"Johor Bahru / 新山"这类本地词上排上去。
4. [ ] **Bing Webmaster Tools**：ChatGPT 的搜索有一部分依赖 Bing 的索引，对 GEO 策略很重要。开好后台后，用仓库里的 `scripts/indexnow-submit.js` 提交全站地址（先跑 `npm run build`）。
5. [ ] **补真实客户案例**：现在的案例拆解大多是样板站的设计解说。有真实客户的成果（数据、评价）后，Google 的信任度（E-E-A-T）会高很多。
6. [ ] **2026-10-30 左右看手机的「按了有反应（INP）」**：Lighthouse 报首页「主线程忙 2 秒多」（GSAP 动画 + React 接管，模拟慢手机时被放大），但 9 月的真实访客数据都算快，手机样本还太少下不了结论，所以先不动。到时看报告页「打开速度」里手机那一栏：✓ 合格就继续不管；△ 或 ✕ 再修（方向：延后逐行揭示的切行、减少字体换上来后的重切）。

## 4. 数据接入（让 Claude 能直接看数据）

- [x] 建 Google 服务账号，启用 Search Console API 和 Analytics Data API（2026-09-28，项目 `h2o-report`）
- [x] 服务账号邮箱加进 GSC（权限"受限"）和 GA4（角色"查看者"）（2026-09-28）
- [x] JSON 密钥放进 Worker `ga-report` 的 secret `GOOGLE_SA_KEY`（不要贴进聊天），步骤见 `workers/ga-report/README.md`（2026-09-28，Worker 已部署，第一次同步 GA / GSC / 收录都成功）
- [x] 设好 Cloudflare Access（Policy `me` + Service Auth `claude`）与 Claude 云端环境 `ga-report`（2026-09-28，README 的 D～F.1）
- [x] 建 Claude routines「网站周报」「网站月报」（README 的 F.2），建好先按 Run now 测一次，报告页最上面要出现建议（2026-09-29，Opus 5.5，周一 / 每月 1 号 09:07；测试成功）
- [x] 新版网站（Next.js）装回 GA4（2026-09-29）：9 月 25 日上线时漏掉了，第一份周报发现的。**9/25 到装回之间的 GA 数字不完整**，别拿来比
- [ ] Cloudflare API token 加上 Zone → Analytics → Read 与 Zone → DNS → Read（只选 `h2o-dreamer-studio.com` 这个域名）
- [x] 报告页接上真实访客的打开速度（Cloudflare Web Analytics）：建 Account Analytics → Read 的 token，放进 Worker secret `CF_API_TOKEN`，见 `workers/ga-report/README.md` 的 G（2026-09-30，第一次同步成功）

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
| [ ] | Bing Places | https://www.bingplaces.com | 可以直接从 Google 商家资料导入，5 分钟。Bing 地图，ChatGPT 搜索也用 Bing。**2026-09-28 已从 GBP 导入送出，Bing 说 7–12 天上线**，上线后拿网址加进 `sameAs` 再打勾 |
| [ ] | Apple Business Connect | https://businessconnect.apple.com | iPhone 地图和 Siri 用它。**2026-09-28 公司账号已送审**（SSM 证书 + `h2odreamer.uk` 的 DNS TXT，主域名加不进去）。**2026-10-01 公司账号审核通过。** 下一步 Add Location：名称、电话、网站、营业时间照上表；地址那一步若有「没有店面 / 服务范围」的选项就选它（Johor Bahru），没有就先停，**不公开 SSM 上的 Kluang 住址**。地点上线后拿 Apple 地图链接加进 `sameAs` 再打勾 |
| [x] | Facebook 专页 | https://www.facebook.com/h2odreamer.studio/ | 很多马来西亚老板在 FB 上找人。2026-09-29 开好，已加进 `sameAs` |
| [x] | Instagram | 已有 `@h2odreamer.studio` | 确认 bio 链接是网站首页。2026-09-29 检查完，联系方式和 FB 专页都连好了 |
| [x] | Threads | 跟 IG 同一个账号 | 个人资料放网站网址。2026-09-29 放好了，`sameAs` 等 LinkedIn 一起加 |
| [ ] | LinkedIn 公司页 | https://www.linkedin.com/company/setup/new/ | 个人档案的"工作经历"也挂到这个公司页 |
| [ ] | Clutch | https://clutch.co | 客户找设计公司的名录，找 "Get Listed"，免费 |
| [ ] | GoodFirms | https://www.goodfirms.co | 同上，找 "Get Listed" |
| [ ] | DesignRush | https://www.designrush.com | 同上，找 "List your agency" |

### 每登记完一个

1. 在上表打勾，写日期。
2. 把该平台的**个人资料网址**记下来，交给 Claude 加进网站结构化数据的 `sameAs`（网址放 `src/content/site.ts`，`src/lib/jsonld.ts` 引用，目前有 Instagram、Facebook）。`sameAs` 告诉 Google 和 AI "这些账号都是同一家工作室"，见 `GEO-CHECKLIST.md` §3。

## 6. 定期更新内容（长期，每月一次）

**查证结果（2026-10-03）**：「不更新，Google 就以为你不经营了」这个说法**不对**。Google 的 John Mueller 说过，发文频率不是排名因素，新内容也不会因为「新」就排得比较前面。只改日期、不改内容，Google 明确说不要这样做。

**但定期更新还是要做**，理由不一样：

- **新文章 = 多一个被搜到的机会**。每一篇对应一个老板会搜的问题。
- **有些内容会过时**：标题写了「2026」、页面上有价格的，过了年或改了价就变成旧资料，别人不想点，AI 也不敢引用。
- **更新多的站，Google 来得比较勤**。新页面被收录得快（这不等于排名高）。
- **FAQ 补真实客户问过的问题**，最贴近别人真的会搜的话。

**每月做一次**（每月 1 号的「网站月报」出来后一起看）：

- [ ] 发 1 篇新 blog（中英两版）。题目从客户真的问过的问题来。
- [ ] 挑 1 篇旧文章，补新资料、新例子或新 FAQ。**内容真的改了**，才把页面上的更新日期和 JSON-LD 的 `dateModified` 改成今天。
- [ ] `src/content/prices.json` 改价时，所有写到价格的页面一起改。

**固定日期**：

- [ ] **2027 年 1 月**：所有标题、描述、正文里写「2026」的页面，改成 2027 并真的更新内容（最要紧的是 `/blog/website-cost-malaysia`，标题就是 "Website Cost in Malaysia 2026"）。先跑 `grep -rl "2026" src/content` 找出来。

**不要做**：只改日期不改内容；为了「看起来有更新」改几个字；把旧文章删掉重发一篇差不多的。

来源：[Search Engine Journal：Mueller 谈发文频率](https://www.searchenginejournal.com/how-freshness-works/457485/)、[Google Search Central：日期怎么写](https://developers.google.com/search/blog/2019/03/help-google-search-know-best-date-for)。
