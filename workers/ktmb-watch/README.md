# ktmb-watch

盯 KTMB 的剩余座位，有票就发 Telegram。邀请制、按结果收费的小服务。
线路只做 **Kluang ↔ JB Sentral 双向**。

## 一句话说清它在解决什么

Kluang 上车的位子少得可怜。实测礼拜日 Kluang→JB 晚上那几班（18:40、21:00、21:34、23:25），
座位数长期卡在 4 或以下；而反方向 JB→Kluang 同一天班班有几十上百个位。

**这 4 个位基本都是 OKU 残障保留位，一般人买不到。**
所以判定规则不是 `seats > 0`，是 **`seats > OKU_BASELINE`（默认 4）**。
不登录看不到座位分类（分类在 `/Trip/LayoutV2`，要登录），所以用这个启发式，不为小概率加复杂逻辑。

坐 23:25 永远回得了家 —— 这服务卖的不是「回得了家」，是**「不用等到半夜」**。

## 它怎么拿到数据

KTMB 没有公开 API，但查座位这一段不需要登录，纯 `fetch` 三步走完：

| 步骤 | 请求 | 拿到什么 |
| --- | --- | --- |
| 1 | `GET /` | cookie、`__RequestVerificationToken`、`jsStations`（站 ID → 加密串） |
| 2 | `POST /Trip` | 行程页，内含 `SearchData` 与 `FormValidationCode` |
| 3 | `POST /Trip/Trip` | `{ status, data }`，`data` 是车次表 HTML，含各车次剩余座位 |

两个坑（改代码前先看这里）：

- 第 3 步 body 是 **JSON**，token 走 `RequestVerificationToken` **请求头**，不是表单字段。
- 第 2 步页面里的 `SearchData` 带 HTML 实体（`&#x2B;` 就是 `+`）。不解码直接回传，KTMB 回 `Error when retrieving trip.`

只读查询，不碰登录、不碰下单。cron 5 分钟一次。

## 两种通知模式，线上随时可切

管理员打 `/mode queue` 或 `/mode broadcast`，立刻生效，不用重新部署。

| 模式 | 怎么发 | 扣不扣点 |
| --- | --- | --- |
| `queue`（默认） | 一次只通知一个人，3 分钟没订就传给下一位 | 订到扣 1 点 |
| `broadcast` | 所有登记的人同时收到，先到先得 | **不扣点** |

`broadcast` 不扣点是因为同时通知多人时，bot 分不清位子是谁订走的。

### queue 模式的排队规则

1. **只有「登记那天要坐」的人才进队。** 那天不坐的不占位。
2. **上次拿到通知的人自动排队尾。** 「凭什么我排后面」的答案是：因为你上次拿到了。
3. **队列公开可查。** `/my` 会告诉你排第几、上次拿到是哪天。

扣点靠推断：通知发出后座位数掉回基线以内，就算他订走了。
位子有可能是群外的人订走的，所以留了 `/appeal` 人工退点。**刻意没做反作弊系统** —— 为 RM4 建那套，成本远超收益。

## 指令

| 指令 | 谁 | 作用 |
| --- | --- | --- |
| `/start` | 用户 | 开始盯：选方向 → 选日期 → 勾班次 |
| `/my` | 用户 | 我的 watch、点数余额、排第几、上次拿到是哪天 |
| `/cancel` | 用户 | 取消某条 watch |
| `/appeal` | 用户 | 申诉刚才那次扣点，通知管理员 |
| `/stats` | 用户 | 最近 30 天这条线真的放了几次位 |
| `/adduser <chat_id> [名字]` | 管理员 | 加进白名单 |
| `/topup <chat_id> <点数>` | 管理员 | 收到 DuitNow 后加点 |
| `/refund <chat_id> <点数>` | 管理员 | 退点 |
| `/mode [queue\|broadcast]` | 管理员 | 看 / 切通知模式 |

非白名单的人打 `/start`，bot 回他自己的 chat_id，让他拿去找管理员。

## 本地跑

查一次，不碰数据库、不发通知：

```bash
cd workers/ktmb-watch && npm run check
```

反方向、指定日期：

```bash
node src/cli.js JK 2026-08-23
```

跑测试（离线，不打 KTMB）：

```bash
cd workers/ktmb-watch && npm test
```

## 部署

### 1. 建 Telegram bot

Telegram 里找 `@BotFather` → `/newbot` → 拿到 bot token。

### 2. 建数据库

D1 是 Cloudflare 自带的 SQLite，不用另外开服务器。

```bash
cd workers/ktmb-watch && npx wrangler d1 create ktmb-watch
```

把输出的 `database_id` 填进 `wrangler.toml` 里的 `REPLACE_WITH_D1_DATABASE_ID`，然后建表：

```bash
cd workers/ktmb-watch && npx wrangler d1 migrations apply ktmb-watch --remote
```

本机测试也要跑一次（加 `--local`）。

### 3. 存密钥

```bash
cd workers/ktmb-watch && npx wrangler secret put TELEGRAM_BOT_TOKEN
```

`TELEGRAM_WEBHOOK_SECRET` 自己编一串（下一步要用同一串）：

```bash
cd workers/ktmb-watch && npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

### 4. 上线

```bash
cd workers/ktmb-watch && npm run deploy
```

### 5. 把 webhook 指过来

用上面那两串换掉 `<TOKEN>`、`<SECRET>`，和你的 Worker 网址：

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://ktmb-watch.<你的子域>.workers.dev/webhook" -d "secret_token=<SECRET>"
```

### 6. 把自己设成管理员

第一个管理员只能用 SQL 塞进去（bot 里没有自助升级管理员的路）：

```bash
cd workers/ktmb-watch && npx wrangler d1 execute ktmb-watch --remote --command "INSERT INTO users (chat_id,name,points,is_admin,created_at) VALUES (你的chat_id,'admin',0,1,datetime('now'));"
```

不知道自己的 chat_id？对 bot 打一句 `/start`，它会回给你。

之后加人就用 `/adduser`。

## 配置

`wrangler.toml` 的 `[vars]`：

| 变量 | 意思 |
| --- | --- |
| `OKU_BASELINE` | 剩这个数以内视为 OKU 保留位，算没票。默认 `4` |
| `OFFER_WINDOW_MINUTES` | queue 模式下等多久传给下一位。默认 `3` |

## 免费额度够不够

- **Worker**：每天 10 万次请求，我们 288 次（5 分钟一次）。
- **D1**：每天 10 万行写入，我们约 1.2 万行。空间 5 GB，两个月试跑约 35 MB。
- **对 KTMB**：一次查询打 3 个请求，一天约 864 次。比一个人不停按 F5 还少。别把 cron 调更密。

## 试跑期要盯的那个数字

`/stats` 会从 `seat_log` 算出「最近 30 天每班车真的放出过几次位」。

**这个数字决定这门服务成不成立。** 一周只放一两次，10 个订户里 8 个整月拿不到东西，第二个月就没人续费。
数据不好看就停在这里，别推广。
