# moneybook-inbox

小帐本的收件箱。银行的交易邮件寄到 iPhone 时，「电子邮件」自动化把它 POST 进来，Worker 当场用使用者的公钥加密再存进 D1。小帐本打开时拉走、解密、记进本机，确认之后这里就删掉。**只转运，不存帐。**

决策与隐私边界见 `public/app/moneybook/adr/0002-apple-pay-inbox.md` 与 `0003-bank-mail.md`。

## API

| 方法 | 路径 | 权限 | 作用 |
|---|---|---|---|
| POST | `/inbox` | 无（同一个 IP 每小时限 5 个） | 请求体 `{pubkey}`（P-256 公钥 JWK），返回 `{id, write, read}` |
| POST | `/i/:id/:write` | 写钥匙 | 自动化投递。银行邮件：`{mail: {from, subject, body}, t?}`（ADR-0003）。旧的刷卡格式 `{amount, merchant, card, t?}` 仍然收，但小帐本已不再教人设置。`t` 选填，缺了用收到的时间 |
| GET | `/i/:id` | `Authorization: Bearer <read>` | 拉取待同步的密文（最多 200 笔） |
| POST | `/i/:id/ack` | 读钥匙 | `{ids}`：删掉已同步的记录 |
| DELETE | `/i/:id` | 读钥匙 | 关闭：收件箱连同记录一起删 |

上限可在 `wrangler.toml` 的 `[vars]` 里调整：每箱每天 300 笔，最多囤 500 笔，刷卡的请求体 1 KB，银行邮件的请求体 16 KB（正文截到 8000 字，寄件人 200 字、标题 300 字）。Worker 不读邮件内容，只封起来：怎么认银行、怎么抓金额全在小帐本的 `ledger.js`。每天的 cron 会删掉 30 天前的记录，以及 180 天没被读取过的收件箱。

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

**直接在「电子邮件」自动化里做，不用另外建快捷指令。** 需要 iOS 17 以上。按钮名称写成「中文（English）」，中英文 iOS 都能照着点。

先确定两件事：银行每笔交易都会寄邮件给你；这个邮箱在 iPhone 自带的「邮件（Mail）」app 里收得到（只用 Gmail app 的话，到「设置（Settings）」→「邮件（Mail）」→「账户（Accounts）」把它加进去）。

1. 「快捷指令（Shortcuts）」app →「自动化（Automation）」→ 右上角「+」。
2. 「电子邮件（Email）」：「发件人（Sender）」填下表的地址，选「立即运行（Run Immediately）」，「下一步（Next）」。
3. 「新建空白自动化（New Blank Automation）」→「添加操作（Add Action）」→「获取 URL 内容（Get Contents of URL）」。
4. 「URL」贴上小帐本给的连接码。
5. ›「显示更多（Show More）」：「方法（Method）」POST，「请求体（Request Body）」JSON。
6. 「添加新字段（Add new field）」→「词典（Dictionary）」，键 `mail`。
7. 词典里加三个「文本（Text）」，值都是「快捷指令输入（Shortcut Input）」，插入后再点它一下选属性：

   | Key | 属性 |
   |---|---|
   | `from` | 发件人（Sender） |
   | `subject` | 主题（Subject） |
   | `body` | 内容（Content） |

8. 「完成（Done）」。

**每个发件人建一个自动化**，只有第 2 步不同：

| 发件人 | 管哪些 |
|---|---|
| `ibanking.alert@dbs.com` | DBS 信用卡、PayNow |
| `paylah.alert@dbs.com` | DBS PayLah! |

加了新银行的规则，也要把寄件地址补进这张表与 `public/app/moneybook/app.js` 的 `MAIL_SENDERS`。

Worker 不读邮件内容，只封起来：怎么认银行、怎么抓金额全在小帐本，所以新增银行、银行改格式，iPhone 上的自动化都不用动。

**限制**：
- 邮件寄到了才会进帐。
- 只推送通知、不寄邮件的付款（TNG eWallet 之类）接不到，iOS 不让快捷指令读别的 app 的通知。
- 银行改了格式，那一家会暂时落到小帐本的「认不得的银行邮件」清单，直到 `ledger.js` 补上新规则。

补一家银行：把使用者复制过来、打码后的邮件放进 `test/moneybook/fixtures/bank-mail/`（格式见那里的 README），在 `public/app/moneybook/ledger.js` 的 `BANK_RULES` 加规则，跑 `npx vitest run test/moneybook`，然后把 `sw.js` 的 `CACHE` 升一版发出去。

## 测试

```bash
npm test
```

测试不需要 Cloudflare，也不用联网：`test/helpers/d1.js` 用 Node 自带的 SQLite 冒充 D1，执行的是 `migrations/` 里真正的 SQL。
