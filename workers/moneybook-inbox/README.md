# moneybook-inbox

小帐本的 Apple Pay 收件箱。刷卡时，iPhone 快捷指令把这一笔 POST 进来，Worker 当场用使用者的公钥加密再存进 D1。小帐本打开时拉走、解密、记进本机，确认之后这里就删掉。**只转运，不存帐。**

决策与隐私边界见 `public/app/moneybook/adr/0002-apple-pay-inbox.md`。

## API

| 方法 | 路径 | 权限 | 作用 |
|---|---|---|---|
| POST | `/inbox` | 无（同一个 IP 每小时限 5 个） | 请求体 `{pubkey}`（P-256 公钥 JWK），返回 `{id, write, read}` |
| POST | `/i/:id/:write` | 写钥匙 | 快捷指令投递。刷卡：`{amount, merchant, card, t?}`。银行邮件：`{mail: {from, subject, body}, t?}`（ADR-0003）。`t` 选填，缺了用收到的时间 |
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

**需要 iOS 18 以上**：更旧的 iOS 没有钱包刷卡自动化，快捷指令拿不到刷卡资料。

按钮名称写成「中文（English）」，中英文 iOS 都能照着点。

### 自己用：自动化里直接发请求

1. 「快捷指令（Shortcuts）」app →「自动化（Automation）」→「+」→「钱包（Wallet）」。
2. 勾选要记的卡，选「立即运行（Run Immediately）」，关掉「运行时通知（Notify When Run）」，再选「新建空白自动化（New Blank Automation）」。
3. 「添加操作（Add Action）」→「获取 URL 内容（Get Contents of URL）」：
   - URL：贴上小帐本给的连接码
   - 点动作右边的 ›「显示更多（Show More）」，「方法（Method）」选 POST，「请求体（Request Body）」选 JSON
   - 「添加新字段（Add new field）」→「文本（Text）」，加三个：

     | Key | Value：「快捷指令输入（Shortcut Input）」的属性 |
     |---|---|
     | `amount` | 金额（Amount） |
     | `merchant` | 商家（Merchant） |
     | `card` | 卡片或票证（Card or Pass） |

     插入「快捷指令输入」后再点它一下选属性。键盘上方找不到它的话，长按输入栏，选「选取变量（Select Variable）」。属性名称以 iOS 实际显示为准。

`t`（刷卡时间）是选填的，不给的话 Worker 用收到的时间，只差几秒。

### 要分享给别人：做成快捷指令

Apple 不允许分享自动化，只能分享快捷指令。

1. 新建快捷指令「小帐本记帐」，只放一个「获取 URL 内容（Get Contents of URL）」，设置同上，三个字段的值都取「快捷指令输入（Shortcut Input）」的属性。
2. 在快捷指令的设置里加一个**导入问题（Import Question）**，对象选「获取 URL 内容」的 URL，问题写「贴上小帐本的连接码」。
3. 分享（Share）→ 拷贝 iCloud 链接（Copy iCloud Link），填进 `public/app/moneybook/app.js` 的 `SHORTCUT_URL`。填了之后，小帐本的设置步骤会改为「安装快捷指令」这一套。

每个使用者还要自己建自动化：「自动化（Automation）」→「+」→「钱包（Wallet）」→ 勾选卡片 →「立即运行（Run Immediately）」并关掉「运行时通知（Notify When Run）」→ 动作选「运行快捷指令（Run Shortcut）：小帐本记帐」，输入用「快捷指令输入（Shortcut Input）」。

**限制**：只有实体店感应刷卡会触发这个自动化，网购与 app 内付款触发不了。

## 用银行邮件记帐（ADR-0003）

网购、app 内付款、PayNow / DuitNow 转帐靠银行每笔寄来的交易通知邮件补上。**需要 iOS 17 以上**（「电子邮件」自动化）。

快捷指令只转寄原文，读邮件的是小帐本：以后新增银行、银行改格式，快捷指令都不用动。

1. 银行 app 里打开「每笔交易寄电邮通知」。
2. 这个邮箱要在 iPhone 自带的「邮件（Mail）」app 里。只用 Gmail app 的话：「设置（Settings）」→「邮件（Mail）」→「账户（Accounts）」→「添加账户（Add Account）」。
3. 新建快捷指令「小帐本邮件」，只放一个「获取 URL 内容（Get Contents of URL）」：URL 贴连接码，「方法（Method）」POST，「请求体（Request Body）」JSON。
4. 「添加新字段（Add new field）」→「词典（Dictionary）」，键 `mail`，里面加三个「文本（Text）」：

   | Key | Value |
   |---|---|
   | `from` | 「快捷指令输入（Shortcut Input）」的「发件人（Sender）」 |
   | `subject` | 「快捷指令输入」的「主题（Subject）」 |
   | `body` | 「快捷指令输入」的「内容（Content）」 |

   变量列表里找不到「快捷指令输入」：先在快捷指令的 ⓘ「详细信息（Details）」里打开「在共享表单中显示（Show in Share Sheet）」，独立的快捷指令默认不接收输入。只看到「类型（Type）」没有「发件人」：先把类型改成「电子邮件（Email）」。
5. 「自动化（Automation）」→「+」→「电子邮件（Email）」→「发件人（Sender）」填银行寄通知的地址 →「立即运行（Run Immediately）」→「运行快捷指令（Run Shortcut）：小帐本邮件」，输入用「快捷指令输入」。**每家银行各建一个。**

**同一张卡只能二选一**：走邮件的卡，别在钱包自动化里勾选，否则一笔记两次。

**限制**：
- 「电子邮件」自动化只看「邮件（Mail）」app 里的帐号。
- 邮件寄到了才会进帐。
- 只推送通知、不寄邮件的付款（TNG eWallet 之类）接不到，iOS 不让快捷指令读别的 app 的通知。
- 银行改了格式，那一家会暂时落到小帐本的「认不得的银行邮件」清单，直到 `ledger.js` 补上新规则。

补一家银行：把使用者复制过来、打码后的邮件放进 `test/moneybook/fixtures/bank-mail/`（格式见那里的 README），在 `public/app/moneybook/ledger.js` 的 `BANK_RULES` 加规则，跑 `npx vitest run test/moneybook`，然后把 `sw.js` 的 `CACHE` 升一版发出去。

## 测试

```bash
npm test
```

测试不需要 Cloudflare，也不用联网：`test/helpers/d1.js` 用 Node 自带的 SQLite 冒充 D1，执行的是 `migrations/` 里真正的 SQL。
