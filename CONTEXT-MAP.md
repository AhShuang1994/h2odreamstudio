# Context Map

这个仓库装着两样彼此独立的东西。它们共用一个部署，但领域语言、资料模型、演进节奏都不一样，所以各有各的词汇表与决策记录。

| Context | 是什么 | 词汇表 | 决策记录 |
|---|---|---|---|
| **站台** | 对外官网。唯一 KPI 是让访客点进 WhatsApp，GEO 是主要流量策略 | [`CONTEXT.md`](./CONTEXT.md) | [`docs/adr/`](./docs/adr/) |
| **小帐本** | 在新加坡做工、把钱汇回马来西亚的人用的离线记帐 PWA。自带状态与算术，不是站台的页面 | [`public/app/moneybook/CONTEXT.md`](./public/app/moneybook/CONTEXT.md) | [`public/app/moneybook/adr/`](./public/app/moneybook/adr/) |

## ADR 编号各自独立

两边的 ADR 各自从 0001 起算，**不共用编号**。所以 `docs/adr/0001-linear-surface-era-motion.md`（站台的动效基调）与 `public/app/moneybook/adr/0001-currency-as-side.md`（小帐本按币种分侧）是两份不同的文件，各自只在自己的 context 里有效。

代码注释里写 `ADR-0001` 时，指的是**该档案所在 context** 的 0001。小帐本的代码引用的就是它旁边那份。

## 小帐本为什么住在 `public/`

它必须以静态档案的形式被直接送出（`index.html` / `styles.css` / `app.js` / `ledger.js` / `sw.js`），不经过 Next.js 的渲染，所以放在 `public/` 而不是 `src/`。文件跟着代码走，同一个目录里。

它不进 sitemap，`robots.txt` 也 `Disallow: /app/`；`scripts/lib/exported-pages.mjs` 用 `rel.startsWith("app/")` 把它排除在页面收录之外，所以站台的导出／字体／语言测试不会扫到它。
