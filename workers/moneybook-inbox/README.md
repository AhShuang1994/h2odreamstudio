# moneybook-inbox

小帐本的 Apple Pay 收件箱。刷卡时，iPhone 快捷指令把这一笔 POST 进来，Worker 当场用使用者的公钥加密再存进 D1。小帐本打开时拉走、解密、记进本机，确认之后这里就删掉。**只转运，不存帐。**

决策与隐私边界见 `public/app/moneybook/adr/0002-apple-pay-inbox.md`。

## API

| 方法 | 路径 | 权限 | 作用 |
|---|---|---|---|
| POST | `/inbox` | 无（同一个 IP 每小时限 5 个） | 请求体 `{pubkey}`（P-256 公钥 JWK），返回 `{id, write, read}` |
| POST | `/i/:id/:write` | 写钥匙 | 快捷指令投递，JSON `{t, amount, merchant, card}` |
| GET | `/i/:id` | `Authorization: Bearer <read>` | 拉取待同步的密文（最多 200 笔） |
| POST | `/i/:id/ack` | 读钥匙 | `{ids}`：删掉已同步的记录 |
| DELETE | `/i/:id` | 读钥匙 | 关闭：收件箱连同记录一起删 |

上限可在 `wrangler.toml` 的 `[vars]` 里调整：每箱每天 300 笔，最多囤 500 笔，请求体 1 KB。每天的 cron 会删掉 30 天前的记录，以及 180 天没被读取过的收件箱。

## 部署

```bash
cd workers/moneybook-inbox
npm install
npx wrangler d1 create moneybook-inbox          # 把 database_id 贴进 wrangler.toml
npx wrangler d1 migrations apply moneybook-inbox --remote
npx wrangler secret put QUOTA_SALT              # 选填：随便一串随机字
npx wrangler deploy
```

部署完成后：

1. 把 Worker 的网址（例如 `https://moneybook-inbox.<子域>.workers.dev`）填进 `public/app/moneybook/app.js` 的 `INBOX_API`。
2. 如果小帐本不在 `https://www.h2o-dreamer-studio.com`，把它的网址加进 `wrangler.toml` 的 `ALLOWED_ORIGINS`。

## 做「小帐本记帐」快捷指令（在 iPhone 上做一次）

1. 「快捷指令」app → 新建快捷指令，取名「小帐本记帐」。
2. 依次加入这些动作：
   - **获取变量**：「快捷指令输入」→ 分别取出金额、商家、卡片名称（属性的中文名以 iOS 实际显示为准）。
   - **当前日期** → **格式化日期**，格式选 **ISO 8601**，勾选包括时间。
   - **获取 URL 内容**：
     - URL：先随便贴一个连接码
     - 方法：POST
     - 请求体：JSON，四个字段
       - `t`：格式化后的日期
       - `amount`：金额
       - `merchant`：商家
       - `card`：名称
3. 分享之前，在快捷指令的设置里加一个**导入问题**，对象选「获取 URL 内容」的 URL，问题写「贴上小帐本的连接码」。
4. 分享 → 拷贝 iCloud 链接，把链接填进 `public/app/moneybook/app.js` 的 `SHORTCUT_URL`。

`SHORTCUT_URL` 留空时，小帐本会改为显示手动建立快捷指令的步骤。

每个使用者还要自己建一个自动化（Apple 不允许分享自动化）：「自动化」→「+」→「钱包」→ 勾选卡片 →「立即运行」，并关掉「运行时通知」→ 动作选「运行快捷指令：小帐本记帐」，输入用「快捷指令输入」。

**限制**：只有实体店感应刷卡会触发这个自动化，网购与 app 内付款触发不了。

## 测试

```bash
npm test
```

测试不需要 Cloudflare，也不用联网：`test/helpers/d1.js` 用 Node 自带的 SQLite 冒充 D1，执行的是 `migrations/` 里真正的 SQL。
