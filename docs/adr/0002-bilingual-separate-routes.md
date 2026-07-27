# 英文为主语言，双语拆成 `/`（EN）与 `/zh/`（中文）两条路由

原方案把中英文**同时**渲染进 DOM（`src/lib/i18n.tsx` 的 `Bi` 组件），靠 CSS `display: contents / none` 显示其一，`GEO-CHECKLIST.md` 第 21、61 条把这条写成了硬规范，全站 `<html lang="zh">`。改为：**英文是主语言，占据 `/`；中文是附加语言，移到 `/zh/`**。每页只渲染一种语言，核心页与内容页一律照此拆分。

## Considered Options

- **保留同页双写、放弃 SplitText**——最省事，但放弃了动效方案里回报最高的一样。
- **保留同页双写、在语言切换与 resize 时 `revert()` 重切 SplitText**——能跑，但是整套方案里最脆的一块，往后每改一次文案都可能碎。
- **`/` 保持中文、英文放 `/en/`**——SEO 零风险，但主语言坐在子路径上，与「英文为主」的定位不符。

## Consequences

- 触发改动的是动效：`.lang-en` 处于 `display: none`，SplitText 测不到宽度，`type: "lines"` 会失败；切换语言后英文那半从未被切分过；且切分产生的 wrapper 会破坏 `display: contents` 的父子关系。
- 但收益不止于动效——同一页同时出现中英两套正文本来就是 Google 不推荐的做法，拆成两个 URL 加 `hreflang` 才是标准解。
- **英文文案已经全部存在**，无需翻译：每个静态页的文本节点都成对挂着 `data-lang-en` / `data-lang-cn`（如 `blog/seo-vs-geo-ai-search.html` 有 75 对，`case-studies/cooltech-aircon.html` 有 80 对）。拆分是纯机械操作，可脚本化。
- **已收录的 26 条 URL 全部归英文**：`/about`、`/blog/xxx.html` 等地址内容换成英文版，URL 本身不变，英文直接继承全部权重。中文迁到 `/zh/about`、`/zh/blog/xxx.html` 等新地址。
- **中文排名有几周过渡期**。缓解手段是正确的 `hreflang` 双向声明 + sitemap 同时列出两个语言版本，让 Google 把权重传递到新的中文 URL。
- 这推翻了原先「内容页只套壳、正文不动」的范围设定：内容页现在也要被脚本处理成两份。好在原本就要往这些静态页注入幕布揭幕脚本（见 [ADR-0001](./0001-linear-surface-era-motion.md)），拆分顺路完成，不额外增加一道工序。
- `GEO-CHECKLIST.md` 第 21、61 条必须重写。
- `sitemap.xml` 条目翻倍并需补 `hreflang`；`sitemap.xml` 与 `llms.txt` 目前是手写死在 `public/` 的静态文件，须改为构建期生成。`llms.txt` 本来就是全英文，与新的主语言一致。
