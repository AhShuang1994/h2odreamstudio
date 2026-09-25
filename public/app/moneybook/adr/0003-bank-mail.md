# 银行交易邮件自动进帐：快捷指令只转寄原文，由小帐本解析

> 状态：已实作，已有 DBS 刷卡、PayNow、PayLah! 的规则。接在 ADR-0002（Apple Pay 收件箱）之后。
>
> **后来的修正（实机设置时发现）**：
> - 不做共用的快捷指令「小帐本邮件」。独立的快捷指令在 iPhone 上选不到「电子邮件」这个输入类型，拿不到发件人、主题、内容。改成**每个发件人一个「电子邮件」自动化，「获取 URL 内容」直接放在自动化里**。代价是每个发件人要各设一次那三个字段，但格式照样由小帐本解析，银行改格式时自动化仍然不用动。
> - 小帐本不再教人设置 Apple Pay「钱包」自动化，只留银行邮件：DBS 刷卡邮件已经涵盖实体店刷卡，两个都开会重复记帐。Worker 与 ledger 仍然收旧的刷卡格式，已经设好的人不会坏。

## 背景

Apple Pay 的「钱包（Wallet）」自动化只接得到**实体店感应刷卡**。网购、app 内付款、PayNow / DuitNow 转账、银行 app 付款都触发不了，只能手记。

很多银行每笔交易都会寄通知邮件，而 iOS 17 起，快捷指令有「电子邮件（Email）」自动化：收到某个寄件人的邮件时自动运行。把这封邮件投进现有的收件箱，就能补上这一块。

要支援的银行不止一家：DBS（SG）、Maybank（MY）、CIMB（MY / SG）、UOB 等等，别的使用者也会有自己的银行。**所以抓取规则不能写在快捷指令里**。写在快捷指令里的话，每家银行、每个使用者都要手配正则，银行一改格式，大家得一个个重配。

## 做法：快捷指令只转寄原文，由小帐本来解析

```
银行寄出交易邮件
  → iPhone「邮件（Mail）」app 收到
  → 自动化「电子邮件」：寄件人 = 某家银行 → 运行快捷指令「小帐本邮件」
  → POST {mail:{from, subject, body}} 到连接码
  → Worker 当场用公钥封起来 → D1（只有密文）
  → 小帐本打开 → 拉取、解封 → parseBankMail() → 进帐 / 认不得清单
```

- **一个共用的快捷指令「小帐本邮件」**：只放一个「获取 URL 内容（Get Contents of URL）」，把邮件的寄件人、标题、正文原样投进来。每家银行各建一个「电子邮件」自动化，寄件人填那家银行，全部运行这个快捷指令。**以后新增银行或银行改格式，快捷指令都不用动。**
- **Worker**：新增投递格式 `{mail:{from, subject, body}}`，body 截到 8000 字，这种请求的上限是 16 KB（`MAX_MAIL_BYTES`）。原本的 `{amount, merchant, card}` 不变。Worker 本来就会在加密前的那一刻看到明文，隐私边界跟 Apple Pay 那一路一样。
- **小帐本**：在 `ledger.js` 加纯函数 `parseBankMail({from, subject, body})`，回传 `{amount, currency, merchant, bank, direction}` 或 `null`：
  - 规则按银行分开写，靠寄件人网域和正文格式认出是哪一家。
  - 只收支出。入帐、TAC / OTP 这类邮件跳过。
  - 卡名填银行名（`DBS`、`Maybank`……），照现有的**卡片对应**问一次，决定这家银行记在哪一侧（SGD / MYR）。
  - 邮件币种跟那一侧的币种对不上时（外币消费），这一笔留在**待入帐**，让使用者确认。
  - 解析完只留下金额、商家、日期，邮件原文不存进帐本。

## 认不得的邮件：先接住，再补规则

不需要事先收齐每家银行的样本。

1. **第一版只装架子**，一家银行的规则都没有也能上线。
2. 认不得的邮件放进入帐页的「认不得的银行邮件」清单，显示寄件人、标题、日期，可以：
   - **记一笔**：打开手记表单。小帐本会先从邮件里找常见写法（`RM 12.50`、`SGD12.50`、`MYR`、`Amount:` 等），**把猜到的金额预先填好**，使用者只要确认；
   - **复制内容**：把原文复制下来，交给开发者补规则；
   - **删掉**。
3. 使用者把复制的原文发过来。姓名、卡号、户口号请改成 XXXX，金额、商家、日期保留原样。
4. 在 `ledger.js` 补这家银行的规则，把打码后的样本放进 `test/moneybook/fixtures/bank-mail/` 加测试，然后发版。之后同样格式的邮件就会自动记，所有用这家银行的人都受惠。

每家银行最少要一封**消费**邮件。PayNow / DuitNow 转账的格式通常不一样，收到时再补一封。

## 避免重复记帐

同一张卡只能二选一：走 Apple Pay 自动化，或者走邮件。走邮件的卡，别在钱包自动化里勾选。设置步骤里要写明这一点。

## 限制（写进设置步骤）

- 「电子邮件」自动化只看 iPhone 内建「邮件（Mail）」app 里的帐号。平常只用 Gmail app 的话，要把帐号加进「邮件」app。
- 要等邮件寄到才会入帐。
- 只有 app 推送通知、不寄邮件的付款（TNG eWallet 之类）接不到，仍然手记。iOS 不让快捷指令读别的 app 的通知。
- 银行改了邮件格式，那一家会暂时落到「认不得」清单，直到补上新规则。

## 改动清单

1. `workers/moneybook-inbox/src/index.js`：接受 `mail` 格式，大小上限和截字另外算。`wrangler.toml` 加 `MAX_MAIL_BYTES=16384`。
2. `workers/moneybook-inbox/test/inbox.test.js`：加测试：mail 投递、截字、库里没有明文、超过上限拒收。
3. `public/app/moneybook/ledger.js`：
   - `parseBankMail` 与各银行的规则表；
   - `guessMailAmount`：认不得时用来预填金额；
   - `receiveInbox` 遇到 `mail` 项目时先解析，解析得了照现有流程走，解析不了进新的 `state.apUnparsed`；
   - `migrate` 里加上对应的 sanitize；
   - 币种不符时留在待入帐。
4. `public/app/moneybook/app.js` / `index.html` / `styles.css`：
   - 入帐页加「认不得的银行邮件」卡片：记一笔（预填金额）、复制内容、删掉；
   - 「更多」页设置步骤加 `<details>`「用银行邮件记帐」：按钮名称中英对照、目前支援的银行、上面列的限制。
5. `public/app/moneybook/sw.js`：`CACHE` 升一版。
6. 文档：
   - `workers/moneybook-inbox/README.md`：补 API 与邮件版的设置步骤；
   - `public/app/moneybook/adr/0002-apple-pay-inbox.md`：补一条 Consequence；
   - `public/app/moneybook/CONTEXT.md`：加「银行邮件」「认不得清单」两个词；
   - `public/privacy.html`：说明邮件原文只以密文形式经过，小帐本只留金额与商家。

## 验证

- `npx vitest run test/moneybook`，要测到：
  - 有样本的银行都解析正确；
  - 入帐、OTP 邮件被略过；
  - 认不得的邮件进清单，而且猜得出金额；
  - 外币消费留在待入帐；
  - 重载后 `apUnparsed` 还在。
- `cd workers/moneybook-inbox && npm test`。
- Playwright 加本地伪 Worker：
  - 投一封样本 → 出现卡片对应提示 → 对应后正确入帐；
  - 投一封乱写的邮件 → 出现在认不得清单，金额预填正确，复制和删掉都正常；
  - 截图检查设置步骤的排版。
- 实机：在 iPhone 上建自动化，让银行寄一封真的交易邮件，确认会自动运行、不会弹出确认。
