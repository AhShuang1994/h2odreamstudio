# moneybook-inbox

小帐本的 Apple Pay 收件箱。刷卡时，iPhone 快捷指令把这一笔 POST 进来，Worker 当场用使用者的公钥加密再存进 D1。小帐本打开时拉走、解密、记进本机，确认之后这里就删掉。**只转运，不存帐。**

决策与隐私边界见 `public/app/moneybook/adr/0002-apple-pay-inbox.md`。

## API

| 方法 | 路径 | 权限 | 作用 |
|---|---|---|---|
| POST | `/inbox` | 无（同一个 IP 每小时限 5 个） | 请求体 `{pubkey}`（P-256 公钥 JWK），返回 `{id, write, read}` |
| POST | `/i/:id/:write` | 写钥匙 | 快捷指令投递，JSON `{amount, merchant, card, t?}`（`t` 选填，缺了用收到的时间） |
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

## 在 iPhone 上设置

### 自己用：自动化里直接发请求

1. 「快捷指令」app →「自动化」→「+」→「钱包」。
2. 勾选要记的卡，选「立即运行」，关掉「运行时通知」，再选「新建空白自动化」。
3. 添加「获取 URL 内容」：
   - URL：贴上小帐本给的连接码
   - 点「显示更多」，方法选 POST，请求体选 JSON
   - 加三个文本字段：`amount` = 快捷指令输入的金额、`merchant` = 商家、`card` = 卡片名称
     （插入「快捷指令输入」后再点它一下选属性，属性的中文名以 iOS 实际显示为准）

`t`（刷卡时间）是选填的，不给的话 Worker 用收到的时间，只差几秒。

### 要分享给别人：做成快捷指令

Apple 不允许分享自动化，只能分享快捷指令。

1. 新建快捷指令「小帐本记帐」，只放一个「获取 URL 内容」，设置同上，三个字段的值都取「快捷指令输入」的属性。
2. 在快捷指令的设置里加一个**导入问题**，对象选「获取 URL 内容」的 URL，问题写「贴上小帐本的连接码」。
3. 分享 → 拷贝 iCloud 链接，填进 `public/app/moneybook/app.js` 的 `SHORTCUT_URL`。填了之后，小帐本的设置步骤会改为「安装快捷指令」这一套。

每个使用者还要自己建自动化：「自动化」→「+」→「钱包」→ 勾选卡片 →「立即运行」并关掉「运行时通知」→ 动作选「运行快捷指令：小帐本记帐」，输入用「快捷指令输入」。

**限制**：只有实体店感应刷卡会触发这个自动化，网购与 app 内付款触发不了。

## 测试

```bash
npm test
```

测试不需要 Cloudflare，也不用联网：`test/helpers/d1.js` 用 Node 自带的 SQLite 冒充 D1，执行的是 `migrations/` 里真正的 SQL。
