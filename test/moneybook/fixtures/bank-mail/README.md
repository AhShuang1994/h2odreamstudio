# 银行交易邮件样本

`public/app/moneybook/ledger.js` 里 `BANK_RULES` 的测试样本（ADR-0003）。`test/moneybook/bank-mail.test.ts` 会读这个目录里每一个 `.json`。

## 格式

一封邮件一个文件，文件名写银行与类型，例如 `dbs-card-spend.json`、`maybank-duitnow.json`、`dbs-otp.json`：

```json
{
  "mail": {
    "from": "DBS Alerts <ibanking.alert@dbs.com>",
    "subject": "Card Transaction Alert",
    "body": "邮件正文原文，打码后贴在这里"
  },
  "expect": {
    "bank": "DBS",
    "direction": "out",
    "amount": 12.5,
    "currency": "SGD",
    "merchant": "KOPITIAM"
  }
}
```

- 入帐邮件（没金额、略过）：`"expect": { "bank": "DBS", "direction": "in" }`
- 进帐邮件（有金额、每笔问转帐还是收入，ADR-0005）：`"expect": { "bank": "CIMB", "direction": "in", "amount": 39.79, "currency": "MYR", "account": "XXXX" }`
- OTP、对帐单通知这类：`"expect": { "bank": "DBS", "direction": "none" }`
- 规则还读不懂的：`"expect": null`

## 打码

姓名、卡号、户口号改成 `XXXX`。**金额、商家、日期保留原样**，规则就是靠它们写的。

每家银行最少要一封**带金额**的样本（消费或进帐），测试会检查这一点。
