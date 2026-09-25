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

- 入帐邮件：`"expect": { "bank": "DBS", "direction": "in" }`
- OTP、对帐单通知这类：`"expect": { "bank": "DBS", "direction": "none" }`
- 规则还读不懂的：`"expect": null`

## 打码

姓名、卡号、户口号改成 `XXXX`。**金额、商家、日期保留原样**，规则就是靠它们写的。

每家银行最少要一封**消费**样本，测试会检查这一点。
