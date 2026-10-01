# 网站报告：Worker 存数字、Claude 云端任务写建议、Access 上锁

阿爽要一个能看 GA 日 / 周 / 月数字的页面，并且能照报告调整方向。2026-09-28 讨论后定下：

- **主数字是 WhatsApp 点击**，SEO（GSC 的曝光、排名、收录）是第二重点。所以数据源是 GA4 + Search Console 两个，同一个 Google 服务账号。
- **一个 Worker（`workers/ga-report`）每天拉数字存进 D1**，跟 `ktmb-watch`、`moneybook-inbox` 同一个做法。Google 的钥匙只放在这里。
- **页面放在 `public/app/report/`**，由 Pages 照常发出。`app/` 早就被 `robots.txt`、sitemap、`version-static-html` 排除，不用碰任何 SEO 设定（见 `docs/seo-lessons.md`）。页面本身不带数据，放在公开仓库没关系。
- **Cloudflare Access 锁住 `/app/report`**（email 验证码），Worker 自己再验一次 Access 的 JWT，防的是门的设定哪天被改坏。
- **建议由 Claude Code 的云端任务写**，每周一周报、每月 1 号月报，走阿爽现有的订阅。工作说明在 `workers/ga-report/ROUTINE.md`。
- **只给建议，不自动开 Issue。** 每条建议有「做了 / 不做」，下次 Claude 读到后追踪结果。

## Considered Options

- **Looker Studio**：免费、零代码，但只有数字，没有人帮忙解读。阿爽要的是「照报告调整方向」，光看图不够。
- **Claude 报告做成 claude.ai 的 Artifact 页面**：做法最省，但阿爽要它在网站项目里、要登录才能看。
- **自己写密码登录**：静态站没有后台，得另写一个检查密码的地方，自己写的锁比 Access 容易有漏洞。
- **Worker 里直接调用 Claude API 写建议**：最稳，但要另开 API key、按用量付费。先用订阅内的云端任务测试，觉得有用再换，改的只有「谁 POST 报告」这一处。
- **每天都写建议**：小站一天的访客很少，每天的起伏大多是运气，每天的建议会变成「没什么变化」，看久了就不看了。
- **建议自动开成 GitHub Issue**：仓库是公开的，Issue 里不能写真实数字；测试期也会开出一堆不想要的卡。

## Consequences

- WhatsApp 点击用 GA 内建的外链点击（`linkDomain = wa.me`），不用页面手写的 `event_category`：后者要先在 GA 注册自定义维度，而且注册前的历史永远查不回来。代价是要 GA 的「加强型评估 → 出站点击」开着。
- 免费版 Worker 一次最多 50 个对外请求、50 条 D1 查询，CPU 时间也很短。所以写入用 `json_each` 一张表一条语句；历史每天往回补 31 天，约两周补满 400 天；收录状态每天只查 15 条。
- Worker 的 route 挂在 `www.h2o-dreamer-studio.com/app/report/api/*`，前面是 Pages 的自定义网域。上线后要实测这条 route 真的由 Worker 接（README 的「测一次」）。接不到的话，改成给 Worker 一个自己的子网域。
- 仓库公开：云端任务不 commit、不开 PR，报告只进 D1。Worker 的请求日志也关掉。
- 同一期报告重交会整份覆盖，已按的「做了 / 不做」会一起清掉。（已由 ADR-0011 改掉：重交是更新，记录不丢。）
