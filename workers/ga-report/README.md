# ga-report

阿爽自己看的网站报告。每天把 GA4、Search Console 与 Cloudflare Web Analytics（真实访客打开有多快）的数字拉进 D1；报告页 `/app/report/` 画图；Claude 的云端任务每周、每月读数字写建议，页面上按「做了 / 不做」，下次 Claude 追踪结果。

为什么这样搭，见 `docs/adr/0009-ga-report.md`。

```
Google（GA4 + GSC）             ──每天 06:30──▶  Worker ga-report ──▶ D1
Cloudflare Web Analytics（速度） ──┘
                                          ▲
   报告页 /app/report/（Pages） ──────────┤  /app/report/api/*
   Claude 云端任务（每周一、每月 1 号） ────┘  全部在 Cloudflare Access 后面
```

## 主数字怎么算

**WhatsApp 点击 = GA 自动记录的外链点击里，目标是 `wa.me` 的那些**（`eventName = click` 且 `linkDomain = wa.me`）。这要 GA 的「加强型评估 → 出站点击」开着（预设是开的）。

页面上手写的 `gtag('event','click',{event_category:'WhatsApp'})` 没用上：`event_category` 要先在 GA 注册成自定义维度才查得到，而且注册之前的历史查不回来。

## 打开速度怎么算

Cloudflare 后台开了 Web Analytics，网站每一页会被自动插一段 beacon，量真实访客的 Core Web Vitals：

- **LCP 主画面出现**：2.5 秒内算快，4 秒以上算慢
- **INP 按了有反应**：0.2 秒内算快，0.5 秒以上算慢
- **CLS 画面不乱跳**：0.1 以下算快，0.25 以上算慢

75% 的访客算快，Google 就算这项合格。表 `speed` 一行 = 一天 × 一种装置 × 一页，存次数（快 / 慢 / 全部）与 p75。

几个实测出来的坑（`src/cloudflare.js`）：

- 一次问超过约 10 天，Cloudflare 会换更粗的抽样，同一天的次数少掉一大半。所以一次只问 7 天。
- Cloudflare 只留约 6 个月，历史只补 180 天。
- 查询用的 site tag 跟网页 beacon 里的 token **不一样**。
- `/app/`（报告页、记账页）与 `/cdn-cgi/`（Access 登录跳转）是自己在用，不算。

## API

全部要过 Cloudflare Access。Worker 自己也会再验一次 Access 的 JWT（`src/access.js`）。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/app/report/api/status` | 同步状态、GA / GSC 最新日期、收录状态 |
| GET | `/app/report/api/data?from=&to=` | 逐日数字 + 这段期间的排行与打开速度（`speed` 按装置、`speed_pages` 按页面）。加 `&daily=only` 只给逐日数字 |
| GET | `/app/report/api/reports?limit=` | 报告与建议 |
| POST | `/app/report/api/reports` | Claude 交报告（格式见 `ROUTINE.md`）。同一期再交是更新：建议按 `key` 对上，按过的记录不丢（ADR-0011） |
| GET | `/app/report/api/experiments` | 已开始的实验、到期没有、成绩（ADR-0010） |
| POST | `/app/report/api/suggestions/:id` | `{status: "done" \| "skipped" \| "open"}`，或判实验 `{result: "effective" \| "ineffective" \| "unclear", note}` |
| POST | `/app/report/api/sync` | 立刻同步一次，测试用 |

## D1 免费额度够不够

| 额度 | 用量 |
|---|---|
| 每个库 500 MB | 一天最多约 400 行，一年约 30 MB |
| 每天写 10 万行 | 平常约 1.6 万；头两周补历史时约 6 万 |
| 每天读 500 万行 | 开一次页面几千行（画图那次请求用 `daily=only`，不扫一年份的排行） |

超了也不会坏：那天的同步失败、页面显示红色提示，第二天自动再试。

## 第一次设定

照顺序做。**全部免费**；只有 Cloudflare Zero Trust 开通时会要你填付款方式，选 Free 方案不会扣钱。

### A. Google：开服务账号

1. [Google Cloud Console](https://console.cloud.google.com/) → 建一个项目（例如 `h2o-report`）。跳出「免费试用、填信用卡」的广告就跳过，用不到。
2. 「API 和服务 → 库」，启用两个：**Google Analytics Data API**、**Google Search Console API**。
3. 「IAM 和管理 → 服务账号 → 创建」，名字随便（例如 `report`），角色不用选。
4. 点进这个服务账号 →「密钥 → 添加密钥 → JSON」，会下载一个 `.json` 文件。**不要放进仓库、不要贴进聊天。**
5. 记下服务账号的 email（`report@h2o-report.iam.gserviceaccount.com` 这种）。

### B. 把服务账号加进 GA 与 GSC

1. **GA4**：管理 → 资源访问权限管理 → 右上角「+」→ 贴服务账号 email，角色「查看者」。
2. 同一页左边「资源设置 → 资源详情」，右上角的**资源 ID**（纯数字）记下来。
3. **GSC**：设置 → 用户和权限 → 添加用户 → 贴 email，权限先选「受限」。之后页面上「收录检查」如果报 403，再改成「完整」。
4. GSC 左上角的资源名记下来：网域资源写成 `sc-domain:h2o-dreamer-studio.com`，网址前缀资源写成 `https://www.h2o-dreamer-studio.com/`。

### C. Cloudflare：部署 Worker

> 电脑里若设了 `CLOUDFLARE_API_TOKEN`（发布网站用的那把，权限不够建 D1 / 部署 Worker），`wrangler login` 会报错。先在同一个 PowerShell 视窗跑 `$env:CLOUDFLARE_API_TOKEN = $null`，下面的指令都在这个视窗里跑。

```bash
cd workers/ga-report
npm install
npx wrangler login
npx wrangler d1 create ga-report          # 把 database_id 贴进 wrangler.toml
npx wrangler d1 migrations apply ga-report --remote
npx wrangler secret put GOOGLE_SA_KEY     # 贴整份 JSON 密钥的内容
```

把 B 记下的资源 ID 与 GSC 资源名填进 `wrangler.toml` 的 `GA_PROPERTY_ID`、`GSC_SITE`。**先别 deploy**，等 D 拿到 Access 的两个值。

### D. Cloudflare Access：上锁

1. [Zero Trust 控制台](https://one.dash.cloudflare.com/) 第一次进去：取一个团队名（例如 `h2odreamer`），方案选 **Free**。
2. **Access → Applications → Add an application → Self-hosted**：
   - Application domain：`www.h2o-dreamer-studio.com`，Path：`app/report`
   - Policy 1：名字 `me`，Action **Allow**，Include → Emails → 你的 email
   - 登录方式用预设的「One-time PIN」（email 收验证码）
3. **Access → Service Auth → Service Tokens → Create**：名字 `claude-report`。**Client ID 与 Client Secret 只显示一次**，先存进密码管理器。
4. 回到刚才的应用，加 Policy 2：名字 `claude`，Action **Service Auth**，Include → Service Token → `claude-report`。
5. 应用的 Overview 里有 **Application Audience (AUD) Tag**；团队网域是 `<团队名>.cloudflareaccess.com`。两个都填进 `wrangler.toml` 的 `ACCESS_AUD`、`ACCESS_TEAM_DOMAIN`。
6. 部署：

   ```bash
   npx wrangler deploy
   ```

### E. 测一次

1. 用浏览器开 `https://www.h2o-dreamer-studio.com/app/report/`，应该先跳到 Access 登录页，收 email 验证码后进得去。
2. 用无痕视窗直接开 `https://www.h2o-dreamer-studio.com/app/report/api/status`：**要被挡住**（跳登录页或 403）。看到数字就是锁没上好，先别往下做。
3. 登录后在网址列开 `https://www.h2o-dreamer-studio.com/app/report/api/status`，能看到 JSON 就表示 Worker 接上了。要是看到的是网站的 404 页，代表 Worker 的 route 没生效，检查 Cloudflare 后台 → Workers → ga-report → Settings → Domains & Routes。
4. 手动同步一次：登录状态下，在报告页按 F12 → Console，贴：

   ```js
   fetch("/app/report/api/sync", { method: "POST", headers: { "Content-Type": "application/json" } }).then(r => r.json()).then(console.log)
   ```

   三个来源都 `ok: true` 就成功。第一次只拉最近 31 天，之后每天自动往回补 31 天，大约两周补满 400 天。

### F. Claude 云端任务

1. [claude.ai/code](https://claude.ai/code) → 环境选单 → **Add cloud environment**，名字 `ga-report`，网络用预设的 Trusted。
   - Environment variables：`CF_ACCESS_CLIENT_ID=<D.3 的 Client ID>`
   - 存好之后重新打开这个环境编辑，**API credentials → Add credential**：
     - Name：`Cloudflare Access`
     - Allowed websites：`www.h2o-dreamer-studio.com`
     - Custom headers：Name 改成 `CF-Access-Client-Secret`，**清掉 Prefix**，Value 贴 D.3 的 Client Secret
2. [claude.ai/code/routines](https://claude.ai/code/routines) → **New routine**，建两个：

   | 名字 | 提示词 | 仓库 | 环境 | 触发 |
   |---|---|---|---|---|
   | 网站周报 | `照 workers/ga-report/ROUTINE.md 写周报。` | `AhShuang1994/h2odreamstudio` | `ga-report` | Weekly，周一 09:07 |
   | 网站月报 | `照 workers/ga-report/ROUTINE.md 写月报。` | 同上 | 同上 | 表单没有「每月」，先随便选一个，再在终端的 Claude Code 跑 `/schedule update`，说「网站月报改成每月 1 号早上 9:07」 |

   Connectors 全部移掉，用不到。
3. 在「网站周报」按 **Run now** 测一次。跑完打开报告页，最上面应该出现 Claude 的建议。

### G. 打开速度（Cloudflare Web Analytics）

1. Cloudflare 后台右上角头像 → **My Profile → API Tokens → Create Token → Create Custom Token**：
   - Token name：`ga-report-speed`
   - Permissions：**Account → Account Analytics → Read**（只要这一项）
   - Account Resources：Include → 你的账号
   - 按 Continue → Create Token，复制那串 token（只显示一次）
2. 在 `workers/ga-report` 里（跟 C 同一个 PowerShell 视窗，先清 `CLOUDFLARE_API_TOKEN`）：

   ```bash
   npx wrangler d1 migrations apply ga-report --remote
   npx wrangler secret put CF_API_TOKEN      # 贴上一步的 token
   npx wrangler deploy
   ```

3. 照 E.4 手动同步一次，`speed` 要 `ok: true`。报告页「打开速度」那块会出现数字。第一次拉最近 31 天，之后每天往回补，补满 180 天。

### H. 升级：同一期重交不丢记录（迁移 0004，ADR-0011）

`0004_report_resubmit.sql` 只加栏位、给旧建议补 key（`s` + id），不删任何一行。**先迁移、再部署**：旧版 Worker 碰到多出来的栏位照常能用，反过来新版 Worker 碰到没迁移的库会出错。

```bash
cd workers/ga-report
npx wrangler d1 export ga-report --remote --output .wrangler/ga-report-backup.sql   # 先备份。.wrangler/ 不进 git，文件有真实数字
npx wrangler d1 migrations apply ga-report --remote
npx wrangler deploy
```

迁移完可以对一下：`npx wrangler d1 execute ga-report --remote --command "SELECT COUNT(*), COUNT(key) FROM suggestions"`，两个数字要一样。报告页（`public/app/report/`）跟着网站照常 push 上线就好。

## 本机开发

```bash
cd workers/ga-report
printf 'DEV_NO_ACCESS=1\n' > .dev.vars      # 本机没有 Access，跳过验证。这个文件不进 git、不会部署
npx wrangler d1 migrations apply ga-report --local
cd ../.. && npx --prefix workers/ga-report wrangler dev --config workers/ga-report/wrangler.toml --assets public --port 8788
```

开 `http://localhost:8788/app/report/`。本机库是空的，要假数据就自己塞进 `.wrangler/state` 那个库。

## 测试

```bash
npm test
```

用 Node 自带的 SQLite 跑真 migration（照 ktmb-watch 的做法），Google 与 Access 都换成假的。
