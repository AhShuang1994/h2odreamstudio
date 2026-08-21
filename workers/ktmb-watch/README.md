# ktmb-watch

盯 KTMB 的剩余座位，有票就发 Telegram。邀请制、按结果收费的小服务。
线路只做 **Kluang ↔ JB Sentral 双向**。

## 一句话说清它在解决什么

Kluang 上车的位子少得可怜。实测礼拜日 Kluang→JB 晚上那几班（18:40、21:00、21:34、23:25），
座位数长期卡在 4 或以下；而反方向 JB→Kluang 同一天班班有几十上百个位。

**这 4 个位基本都是 OKU 残障保留位，一般人买不到。**
所以判定规则不是 `seats > 0`，是 **`seats > OKU_BASELINE`（预设 4）**。
不登录看不到座位分类（分类在 `/Trip/LayoutV2`，要登录），所以用这个启发式，不为小概率加复杂逻辑。

坐 23:25 永远回得了家 —— 这服务卖的不是「回得了家」，是**「不用等到半夜」**。

## 通知的时机：是「变有位」，不是「有位」

**通知只在「没位 → 有位」那一刻发。**

一班本来就有位的车，那一刻永远不会到，所以永远不会响。为了不让人盯着一班早就能订的车空等，
建立盯梢时会先查一次当下状态：

- **现在就有位** → 当场叫他去订，附一颗「我订到了，别盯了」按钮，不扣点
- **现在没位** → 讲明「有位的那一刻通知你」

盯梢不会自动删。**「现在能订」不等于「他已经订了」** —— 他可能在开车、在上班。
系统替他删掉，等他晚上发现满了，会以为一直有人帮他盯。删不删由他一按决定。

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

两个都不会报「你少了什么」，只回同一句错误，很容易误以为要登录。`test/ktmb-request.test.js` 锁住了这两点。

只读查询，不碰登录、不碰下单。cron 5 分钟一次。

## 两种通知模式，线上随时可切

管理员打 `/mode queue` 或 `/mode broadcast`，立刻生效，不用重新部署。

| 模式 | 怎么发 | 扣不扣点 |
| --- | --- | --- |
| `queue`（预设） | 一次只通知一个人，3 分钟没订就传给下一位 | 订到扣 1 点 |
| `broadcast` | 所有登记的人同时收到，先到先得 | **不扣点** |

`broadcast` 不扣点是因为同时通知多人时，bot 分不清位子是谁订走的。

### queue 模式的排队规则

1. **只有「登记那天要坐」的人才进队。** 那天不坐的不占位。
2. **上次拿到通知的人自动排队尾。** 「凭什么我排后面」的答案是：因为你上次拿到了。
3. **队列公开可查。** `/my` 会告诉你排第几、上次拿到是哪天。

队列不是常驻名单，是「有位那一刻」才现算的。所以一条盯着「一直有位」那班车的盯梢是睡着的 ——
不占位、不挡人、不扣点。

扣点靠推断：通知发出后座位数掉回基线以内，就算他订走了。
位子有可能是群外的人订走的，所以留了 `/appeal` 人工退点。**刻意没做反作弊系统** —— 为 RM4 建那套，成本远超收益。

## 盯梢什么时候自己消失

**按班次的出发时间清，不是按日期。** 同一天盯 10:26 和 21:00，到了 10:27 只有 10:26 死掉，
21:00 还留着。整条 watch 的班次都开走了才整条关掉。

轮询时整条线路都没活班次的话，连 KTMB 都不打。

## 配额保护

一条「线路」= 一组（方向 + 日期）。**不管几个人盯同一天同方向，都只算一条、只查一次。**
所以加人不加成本，加日期才加成本。

| 变量 | 预设 | 管什么 |
| --- | --- | --- |
| `MAX_WATCHES_PER_USER` | `3` | 一个人最多几条盯梢 |
| `MAX_ROUTES` | `12` | 全站一轮最多跑几条线路 |
| `MAX_DAYS_AHEAD` | `28` | 最远能盯几天后 |
| `MAX_SUBREQUESTS` | `50` | Cloudflare 免费版一次执行的对外请求上限 |

**为什么每一条都必要**（都是实际会出事的）：

- **没有 per-user 上限的话**，28 天 × 2 方向 = 56 条，一个人就能把 `MAX_ROUTES` 撑爆，
  其他人全部漏跑、一个通知都收不到。不需要恶意，手贱多点几天就会发生。
- **`MAX_DAYS_AHEAD` 三处一起挡**：手打日期、按钮列的礼拜日、`date:` 回呼。
  少挡一处就等于没挡 —— 旧讯息的按钮永远点得下去。
- **发 Telegram 也算在那 50 个请求里**。broadcast 模式每个订户发一条，
  36（查询）+ 30 个订户 = 66 > 50，整轮炸掉。现在 `send` 包了一层在数，
  发爆就跳过并记 log，下一轮 5 分钟后补上 —— 总比整轮死掉好。
- 超过 `MAX_ROUTES` 时只跑最近的几条（快出发的才是人真的在等的），**并私讯管理员**，不默默吞掉。

**12 ÷ 3 = 4** —— 四个人就能把全站额度占满。人再多的话，先降 `MAX_WATCHES_PER_USER`，
比调高 `MAX_ROUTES` 安全（后者会挤压发通知的额度）。

`/stats` 会显示目前用了几条、还剩多少。

## 指令

| 指令 | 谁 | 作用 |
| --- | --- | --- |
| `/start` | 用户 | 开始盯：选方向 → 选日期 → 勾班次 |
| `/my` | 用户 | 我的盯梢、点数余额、排第几、上次拿到是哪天 |
| `/cancel` | 用户 | 取消某条盯梢 |
| `/appeal` | 用户 | 申诉刚才那次扣点，通知管理员 |
| `/stats` | 用户 | 最近 30 天这条线真的放了几次位、线路额度用了多少 |
| `/adduser <chat_id> [名字]` | 管理员 | 加进白名单 |
| `/topup <chat_id> <点数>` | 管理员 | 收到 DuitNow 后加点 |
| `/refund <chat_id> <点数>` | 管理员 | 退点 |
| `/mode [queue\|broadcast]` | 管理员 | 看 / 切通知模式 |

指令菜单是用 `setMyCommands` 推的，输入框旁边会出现 Menu 键，用户不用打字。
管理员那几个用 chat scope 挂着，会员看不到 —— 但**真正的防线是代码里的 `is_admin` 判断**，
藏起来不等于挡住。

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

跑测试：

```bash
cd workers/ktmb-watch && npm test
```

**98 个测试，全部离线**，不打 KTMB、不发 Telegram，1 秒内跑完。
每次改动之前先跑一次；红了就是弄坏了以前的东西。

测试用 Node 自带的 `node:sqlite` 跑真的 migration（`test/helpers/d1.js`），
所以 `releaseStats` 的 window function、`watchersOf` 的子查询都测得到，
又不需要联网或 Cloudflare。

## 部署

### 1. 建 Telegram bot

Telegram 里找 `@BotFather` → `/newbot` → 拿到 bot token。

### 2. 建数据库

D1 是 Cloudflare 自带的 SQLite，不用另外开服务器。

```bash
cd workers/ktmb-watch && npx wrangler d1 create ktmb-watch
```

把输出的 `database_id` 填进 `wrangler.toml`，然后建表：

```bash
cd workers/ktmb-watch && npx wrangler d1 migrations apply ktmb-watch --remote
```

本机测试也要跑一次（把 `--remote` 换成 `--local`）。
以后每加一个 migration 都要再跑一次。

### 3. 存密钥

```bash
cd workers/ktmb-watch && npx wrangler secret put TELEGRAM_BOT_TOKEN
```

```bash
cd workers/ktmb-watch && npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

⚠️ `TELEGRAM_WEBHOOK_SECRET` **只能用英文字母、数字、`_`、`-`**。
其他符号 Telegram 会回 `secret token contains unallowed characters`。

### 4. 上线

```bash
cd workers/ktmb-watch && npm run deploy
```

### 5. 登记 webhook 与指令菜单

打开 Worker 的 `/setup`，它会拿自己 env 里那两串密钥去 Telegram 登记，
你不用手贴 token：

```bash
curl -s https://ktmb-watch.<你的子域>.workers.dev/setup
```

看到 `{"ok":true,...}` 就成了。

回 `Failed to resolve host` 是 `workers.dev` 子域名刚建、DNS 还没传开 —— 等几分钟再打一次。

### 6. 把自己设成管理员

第一个管理员只能用 SQL 塞进去（bot 里没有自助升级的路）：

```bash
cd workers/ktmb-watch && npx wrangler d1 execute ktmb-watch --remote --command "INSERT INTO users (chat_id,name,points,is_admin,created_at) VALUES (你的chat_id,'admin',0,1,datetime('now'));"
```

不知道自己的 chat_id？对 bot 打一句 `/start`，它会回给你。

之后加人就用 `/adduser`。**再加新管理员的话要重打一次 `/setup`**，
否则他的 Menu 键还是只有会员那 5 个（指令本身会立刻生效，只是菜单要重推）。

## 怎么查线上数据

网页：[dash.cloudflare.com](https://dash.cloudflare.com) → Storage & Databases → D1 → ktmb-watch → Console。

终端（**`--remote` 别漏，漏了是查本机的测试库**）：

```bash
npx wrangler d1 execute ktmb-watch --remote --command "SELECT chat_id, name, points, is_admin FROM users"
```

```bash
npx wrangler d1 execute ktmb-watch --remote --command "SELECT chat_id, delta, reason, created_at FROM ledger ORDER BY id DESC LIMIT 20"
```

`SELECT` 只是看，安全。`DELETE` / `UPDATE` 打下去就真的改了，没有反悔键。

## 免费额度够不够

- **Worker**：每天 10 万次请求，我们 288 次（5 分钟一次）。
- **D1**：每天 10 万行写入。满载（12 条线路 × 约 8 班车 × 288 轮）约 2.8 万行。空间 5 GB。
- **对 KTMB**：一条线路一次查询打 3 个请求。一天约 864 次（单条线路）。
  比一个人不停按 F5 还少。**别把 cron 调更密。**

## 法律与风险

查到的事实：座位数**不用登录**就看得到；`online.ktmb.com.my` **没有 robots.txt**（404）；
订票站页脚那份官方 T&C **没有禁止自动访问的条款**。没绕过登录、验证码或付费墙。

但「没找到禁止条款」不等于「他们允许」，而且这不是法律意见。真正会发生的是两件事，
**都是生意风险不是法律风险**：他们改版 → 程式当天挂（`npm run check` 会第一时间暴露）；
封 IP → 服务停摆。

三条别踩：**别调快频率**、**别公开宣传**（邀请制本身就是保护）、
**KTMB 来信要你停就停**（先退钱再关掉，别争）。

## 试跑期要盯的那个数字

`/stats` 会从 `seat_log` 算出「最近 30 天每班车真的放出过几次位」。

**这个数字决定这门服务成不成立。** 一周只放一两次，10 个订户里 8 个整月拿不到东西，
第二个月就没人续费。数据不好看就停在这里，别推广。
