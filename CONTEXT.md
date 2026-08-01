# H2ODreamer Studio

阿爽（Hui Huang Ong）在马来西亚柔佛独自经营的网站设计工作室，其对外官网。站点的唯一 KPI 是**让访客点进 WhatsApp**；GEO（被 AI 检索并引用）是主要的流量策略。

本文件是词汇表，不是规格书。技术决策见 [`docs/adr/`](./docs/adr/)。

## Language

### 声音

**主语言**：
英文。英文版占据 `/`，是所有 URL 的默认内容；中文是**附加语言**，占据 `/zh/`。两者内容对等，不是摘要与全文的关系。
_Avoid_: 默认语言、第一语言

**我**：
站上所有第一人称一律用「我」，指阿爽本人。「设计到上线一人包办、不外包」是这个工作室唯一的差异化，用「我们」会把它稀释掉。
_Avoid_: 我们、本工作室、团队

**起价**：
服务价格的下限，永远以 `/pricing` 页的档位为唯一真相；首页、`llms.txt`、JSON-LD 全部向它看齐。数字只存在 [`src/content/prices.json`](./src/content/prices.json) 一份，改它一处全站跟着变。
_Avoid_: 报价、价格（单独使用时含糊）

### 页面类型

**核心页**：
走 Next.js 路由、由 `src/` 渲染的页面：首页、about、contact、pricing。全新设计与动效只覆盖这一层。
_Avoid_: 主页面、静态页

**内容页**：
blog 文章与案例拆解。正文一字不改，英文版沿用已收录的原 URL，中文版另开 `/zh/` 下的对应地址。双语原稿在 [`src/content/pages/`](./src/content/pages/)，两份单语页面由 `scripts/split-content-lang.mjs` 在构建期生成 —— `public/` 下那些是产物，别手改。
_Avoid_: 文章页、子页

**样板站**：
`/demos/` 下 11 个虚构品牌的成品演示，用于向客户展示成品长什么样。不属于品牌视觉范围，冻结不动。
_Avoid_: 案例、作品集、portfolio（那是「案例拆解」）

**案例拆解**：
`/case-studies/` 下解释某个设计为何这样做的长文。是内容页，不是样板站。
_Avoid_: 案例研究、作品说明

### 内容与 GEO

**快速答案**：
每页开头一段自足的直述性回答，专门供 AI 检索时整段引用。删掉它等于放弃这个站的流量策略。
_Avoid_: 摘要、简介、TL;DR

**可见问答**：
内容页末尾那段展开式的常见问答（`<details class="faq-item">`）。它是 FAQPage 结构化数据的**唯一来源** —— 标记由 [`scripts/split-content-lang.mjs`](./scripts/split-content-lang.mjs) 在构建期从它生成，中英各一份。Google 禁止用页面上看不到的内容做 FAQ 标记，所以问答只写在页面上，不写进 JSON-LD。
_Avoid_: FAQ 标记、FAQPage（那是产物）

### 视觉语言

**液态球体**：
肥皂膜虹彩质感的多瓣融合流体形，黑底上以 `mix-blend-mode: screen` 合成发光。现行站已用它作背景装饰（`assets/bg-1/2/3.webp`，共 5 处），重做后提拔为 hero 主角。这是本站唯一的品牌图形资产。
_Avoid_: orb、blob、气泡、水滴（「水滴」专指水母题的起点意象，不是这个形体）

**水母题**：
贯穿全站的视觉主轴：滴 → 涟漪 → 流 → 海。来自品牌自述「再大的海，也是从一滴水开始」。由**动态**承载，不由颜色承载（配色见 [ADR-0007](./docs/adr/0007-single-violet-accent.md)）。
_Avoid_: 水元素、海洋主题

**幕布转场**：
点击站内任意链接时，一块色板盖满视口 → 换页 → 揭开。覆盖全部页面，包括静态内容页 —— 所以它不能活在 Next 的包里，实现是 [`public/js/curtain.js`](./public/js/curtain.js)，核心页由 `Shell` 引、内容页由 [`scripts/split-content-lang.mjs`](./scripts/split-content-lang.mjs) 构建期注入，**同一份**。盖满之后不走路由，直接触发真实跳转。
_Avoid_: 页面过渡、转场动画

**逐行揭示**：
标题与段落按**行**淡入上移的进场动效。中文永不逐字——中文没有词边界，逐字会散架。挂载点是 `data-reveal="lines"`（整块淡入是 `data-reveal="block"`），动画在 [`src/components/motion/SiteMotion.tsx`](./src/components/motion/SiteMotion.tsx)。
_Avoid_: 文字动画、打字机效果

**遮罩视差**：
图片比其裁切框大 15~20%，滚动时在框内反向慢速位移。本站「parallax」指的就是这一种，不指多图层不同速度的背景。挂载点是裁切框上的 `data-parallax`。
_Avoid_: 视差滚动、parallax（单独使用时含糊）
