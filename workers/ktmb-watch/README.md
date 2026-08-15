# ktmb-watch

盯 KTMB ETS/Intercity 的剩余座位，有票就发 Telegram。默认盯的是**每个礼拜日 16:00 之后，KLUANG → JB SENTRAL**。

## 它怎么拿到数据

KTMB 没有公开 API，但订票页查座位这一段不需要登录，所以整条链纯 `fetch` 就能走完：

| 步骤 | 请求 | 拿到什么 |
| --- | --- | --- |
| 1 | `GET /` | cookie、`__RequestVerificationToken`、`jsStations`（站 ID → 加密串） |
| 2 | `POST /Trip` | 行程页，内含 `SearchData` 与 `FormValidationCode` |
| 3 | `POST /Trip/Trip` | `{ status, data }`，`data` 是车次表 HTML，含各车次剩余座位 |

两个坑：

- 第 3 步的 body 是 **JSON**，且 token 走 `RequestVerificationToken` **请求头**，不是表单字段。
- 第 2 步页面里的 `SearchData` 带 HTML 实体（`&#x2B;` 就是 `+`）。不解码直接回传，KTMB 会回 `Error when retrieving trip.`

只读查询，不碰登录、不碰下单。cron 定在 20 分钟一次，别调更密。

## 本地跑一次（不发通知）

```bash
cd workers/ktmb-watch && npm run check
```

指定线路和日期：

```bash
node src/cli.js KLUANG "JB SENTRAL" 2026-08-16
```

跑测试（离线，不打 KTMB）：

```bash
cd workers/ktmb-watch && npm test
```

## 部署

### 1. 建 Telegram bot

在 Telegram 里找 `@BotFather` → `/newbot` → 拿到 bot token。
然后给你的新 bot 发一句话，再打开下面这个网址拿 `chat_id`（把 `<TOKEN>` 换掉）：

```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

返回的 JSON 里 `message.chat.id` 就是。

### 2. 建 KV，填 id

```bash
cd workers/ktmb-watch && npx wrangler kv namespace create STATE
```

把输出的 `id` 填进 `wrangler.toml` 里的 `REPLACE_WITH_KV_NAMESPACE_ID`。

### 3. 存密钥

```bash
cd workers/ktmb-watch && npx wrangler secret put TELEGRAM_BOT_TOKEN
```

```bash
cd workers/ktmb-watch && npx wrangler secret put TELEGRAM_CHAT_ID
```

### 4. 上线

```bash
cd workers/ktmb-watch && npm run deploy
```

部署后打开 Worker 的网址就能手动查一次，返回纯文字的车次表——用来确认线上跑得通。

## 改线路 / 时段

改 `wrangler.toml` 的 `[vars]` 再 `npm run deploy`：

| 变量 | 意思 |
| --- | --- |
| `ROUTE_FROM` / `ROUTE_TO` | 站名，要跟 KTMB 官网下拉框里的写法一致（全大写，例 `JB SENTRAL`） |
| `WATCH_WEEKDAY` | `0` = 礼拜日，`1` = 礼拜一，依此类推 |
| `WATCH_AFTER` | 只看这个时间之后开的车，`1600` = 16:00 |
| `PAX` | 查几个人的位 |

## 什么时候会响

每次跑完，把「哪几班还有票」存进 KV。**只有这个集合变了才发通知**——座位数从 4 变 3 不会吵你，但某班从满变成有票、或从有票变成满，会。

第一次跑如果全满，不发通知（免得上来就被告知一个你已经知道的坏消息）。
