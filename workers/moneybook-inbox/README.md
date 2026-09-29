# moneybook-inbox

小帐本的收件箱。使用者的 Gmail 把银行交易邮件转到这个收件箱的**转寄地址**，Cloudflare Email Routing 交给 Worker，Worker 当场用使用者的公钥加密再存进 D1。小帐本打开时拉走、解密、记进本机，确认之后这里就删掉。**只转运，不存帐。**

决策与隐私边界见 `public/app/moneybook/adr/` 里的 `0002-apple-pay-inbox.md`、`0003-bank-mail.md` 与 `0004-mail-forwarding.md`。

## API

| 方法 | 路径 | 权限 | 作用 |
|---|---|---|---|
| POST | `/inbox` | 无（同一个 IP 每小时限 5 个） | 请求体 `{pubkey}`（P-256 公钥 JWK），返回 `{id, write, read}` |
| POST | `/i/:id/mail` | 读钥匙 | 发一个转寄地址 `{address}`：`mb+<20 字别名>@MAIL_DOMAIN`。再要一次就换新的，旧的随即失效（ADR-0004） |
| 收信 | `mb+<别名>@MAIL_DOMAIN` | 别名 | Email Routing 交来的信：读出寄件人（信头 From）、标题、正文，封成跟下一行一样的 `{mail}` |
| POST | `/i/:id/:write` | 写钥匙 | 快捷指令投递。银行邮件：`{mail: {from, subject, body}, t?}`（ADR-0003）。旧的刷卡格式 `{amount, merchant, card, t?}` 仍然收，但小帐本已不再教人设置。`t` 选填，缺了用收到的时间 |
| GET | `/i/:id` | `Authorization: Bearer <read>` | 拉取待同步的密文（最多 200 笔） |
| POST | `/i/:id/ack` | 读钥匙 | `{ids}`：删掉已同步的记录 |
| DELETE | `/i/:id` | 读钥匙 | 关闭：收件箱连同记录一起删，转寄地址随之失效 |

上限可在 `wrangler.toml` 的 `[vars]` 里调整：每箱每天 300 笔，最多囤 500 笔，刷卡的请求体 1 KB，银行邮件的请求体 16 KB。两条路都一样截字：正文 8000 字，寄件人 200 字、标题 300 字。转寄进来的信原文超过 256 KB 退信；认不得的地址、收件箱满了也退信，Gmail 会收到退信通知。

Worker 不认银行、不抓金额，只把信读成文字再封起来（只有 HTML 的信转成一行一行的文字）：怎么认银行、怎么抓金额全在小帐本的 `ledger.js`。每天的 cron 会删掉 30 天前的记录，以及 180 天没被读取过的收件箱。

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
3. **Email Routing**（只做一次，在 Cloudflare 后台，网域要已经开了 Email Routing）：
   1. Email Routing →「Settings」→ 打开 **Subaddressing**。
   2. Email Routing →「Routing rules」→「Create address」：Custom address 填 `mb`，Action 选 **Send to a Worker**，Destination 选 `moneybook-inbox`，存档。
   3. 网域不是 `h2o-dreamer-studio.com` 的话，改 `wrangler.toml` 的 `MAIL_DOMAIN`。留空就不发转寄地址。

## 使用者怎么设 Gmail

步骤写在小帐本「设定」页（`public/app/moneybook/app.js` 的 `renderApSettings`），这里只记重点：

1. 小帐本「设定」→ 开启收件箱 → 自动拿到转寄地址（旧收件箱按「取得转寄地址」）。
2. 电脑版 gmail.com →「转发和 POP/IMAP」→ 添加转发地址。Gmail 寄来的确认信会走同一条路，出现在小帐本的「认不得的银行邮件」，**不在 Gmail 里**。新版 Gmail 没有填确认码的地方，只能点信里的链接：点 `mail-settings.google.com/mail/vf-…`（同意），别点 `mail.google.com/mail/uf-…`（取消）。实机设置时真的点错过一次，所以设定页把两条都列出来了。
3. 转发保持「停用」，改用过滤器：发件人 `ibanking.alert@dbs.com OR paylah.alert@dbs.com` → 转发至转寄地址。

过滤器要转的寄件人就是 `app.js` 的 `MAIL_SENDERS`：

| 发件人 | 管哪些 |
|---|---|
| `ibanking.alert@dbs.com` | DBS 信用卡、PayNow |
| `paylah.alert@dbs.com` | DBS PayLah! |

加了新银行的规则，也要把寄件地址补进这张表与 `MAIL_SENDERS`，使用者的过滤器要跟着加。

**为什么不用 iPhone 的「电子邮件」自动化了**：它会触发，但拿到的「内容（Content）」是空的，加「等待」也没用，每一封都落进「认不得」（ADR-0004）。`/i/:id/:write` 还留着，已经设好的人不会坏。

**限制**：
- 邮件寄到了才会进帐。
- 只推送通知、不寄邮件的付款（TNG eWallet 之类）接不到。
- 银行改了格式，那一家会暂时落到小帐本的「认不得的银行邮件」清单，直到 `ledger.js` 补上新规则。

补一家银行：把使用者复制过来、打码后的邮件放进 `test/moneybook/fixtures/bank-mail/`（格式见那里的 README），在 `public/app/moneybook/ledger.js` 的 `BANK_RULES` 加规则，跑 `npx vitest run test/moneybook`，然后把 `sw.js` 的 `CACHE` 升一版发出去。

## 测试

```bash
npm test
```

测试不需要 Cloudflare，也不用联网：`test/helpers/d1.js` 用 Node 自带的 SQLite 冒充 D1，执行的是 `migrations/` 里真正的 SQL。收信的测试自己组 MIME 原文，交给 `receiveMail` 跟 Cloudflare 交来的信走同一条路。
