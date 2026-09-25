/**
 * 小帐本 · 银行交易邮件（ADR-0003）
 *
 * 快捷指令只投邮件原文，读邮件的是 ledger。这里断言：认得的消费照卡片对应进帐，
 * 外币消费留在待入帐，认不得的进「认不得」清单并猜得出金额，入帐与 OTP 被略过。
 *
 * 规则表一家银行都还没有，所以流程用一家假银行测。真银行的规则靠
 * `fixtures/bank-mail/` 里打码后的样本测，见最后一段。
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as L from "../../public/app/moneybook/ledger.js";

const TODAY = "2026-09-25";

/** 假银行：寄件人 @testbank.example，正文写 `Spent SGD 12.50 at KOPITIAM` 或 `Received ...` */
const fakeBank = {
  bank: "TestBank",
  from: /@testbank\.example\b/i,
  parse({ body }: { body: string }) {
    if (/^Received\b/.test(body)) return { direction: "in" };
    if (/^Notice\b/.test(body)) return { direction: "none" };
    const m = /^Spent ([A-Z]{3}) ([\d.,]+) at (.+)$/.exec(body);
    return m ? { direction: "out", currency: m[1], amount: m[2], merchant: m[3] } : null;
  },
};

const mail = (id: string, body: string, extra: Record<string, string> = {}) => ({
  id,
  receivedAt: "2026-09-25T02:00:00.000Z",
  mail: { from: "Alerts <alerts@testbank.example>", subject: "Transaction alert", body, ...extra },
});

function crossBorder() {
  const s = L.defaultState();
  L.setSecondaryCurrency(s, "MYR");
  return s;
}

describe("小帐本 · 银行交易邮件", () => {
  describe("parseBankMail", () => {
    const rules = [fakeBank];
    const m = (body: string, subject = "Transaction alert", from = "alerts@testbank.example") => ({ from, subject, body });

    it("消费：金额、币种、商家、银行", () => {
      expect(L.parseBankMail(m("Spent SGD 1,234.50 at KOPITIAM"), rules)).toEqual({
        bank: "TestBank", direction: "out", amount: 1234.5, currency: "SGD", merchant: "KOPITIAM",
      });
    });

    it("入帐与通知：认得是这家，但不是花出去的钱", () => {
      expect(L.parseBankMail(m("Received SGD 100"), rules)).toEqual({ bank: "TestBank", direction: "in" });
      expect(L.parseBankMail(m("Notice: new statement"), rules)).toEqual({ bank: "TestBank", direction: "none" });
    });

    it("是这家银行但格式读不懂、或金额读不懂：认不得", () => {
      expect(L.parseBankMail(m("Something new"), rules)).toBeNull();
      expect(L.parseBankMail(m("Spent SGD ?? at X"), rules)).toBeNull();
    });

    it("规则表是空的：一律认不得", () => {
      expect(L.parseBankMail(m("Spent SGD 12.50 at KOPITIAM"), [])).toBeNull();
    });

    it("标题是 OTP / TAC：略过，不进认不得清单", () => {
      for (const subject of ["Your OTP", "TAC for your transfer", "One-Time Password", "您的验证码"]) {
        expect(L.parseBankMail(m("123456", subject, "x@bank.example"), rules)).toEqual({ bank: "", direction: "none" });
      }
    });

    it("正文里写着「别把 OTP 告诉别人」的交易邮件不算 OTP", () => {
      expect(L.parseBankMail(m("RM 50.00 at Shopee. Never share your OTP.", "Card alert", "x@bank.example"), rules)).toBeNull();
    });
  });

  describe("guessMailAmount：认不得的邮件里猜金额", () => {
    it.each([
      ["Transaction of RM 12.50 at Shopee", 12.5, "MYR"],
      ["You spent SGD12.50", 12.5, "SGD"],
      ["Paid S$8.00 to Grab", 8, "SGD"],
      ["AMOUNT: MYR 1,234.00", 1234, "MYR"],
      ["Amount: 45.60", 45.6, ""],
      ["A charge of 20.00 USD", 20, "USD"],
      ["Charged US$20", 20, "USD"],
    ])("%s → %s %s", (text, amount, currency) => {
      expect(L.guessMailAmount(text)).toEqual({ amount, currency });
    });

    it.each(["Please CONFIRM 1234 now", "没有金额", ""])("%s → 猜不到", text => {
      expect(L.guessMailAmount(text)).toBeNull();
    });
  });

  describe("收下银行邮件", () => {
    beforeEach(() => { L.BANK_RULES.push(fakeBank); });
    afterEach(() => { L.BANK_RULES.splice(L.BANK_RULES.indexOf(fakeBank), 1); });

    it("没对应过的银行：先问一次，卡名就是银行名", () => {
      const s = crossBorder();
      const r = L.receiveInbox(s, [mail("a", "Spent SGD 12.50 at KOPITIAM")], TODAY);
      expect(r).toMatchObject({ added: 0, pending: 1, unparsed: 0 });
      expect(L.unmappedCards(s)).toEqual(["TestBank"]);
      expect(s.apPending[0]).toMatchObject({ via: "mail", cardName: "TestBank", date: "2026-09-25" });
    });

    it("对应之后：记成那一侧的支出，带刷卡标记，邮件原文不进帐本", () => {
      const s = crossBorder();
      L.receiveInbox(s, [mail("a", "Spent SGD 12.50 at KOPITIAM")], TODAY);
      const r = L.mapCard(s, "TestBank", { currency: "SGD", card: true });
      expect(r.added).toBe(1);
      expect(s.records[0]).toMatchObject({ type: "expense", amount: 12.5, currency: "SGD", note: "KOPITIAM", card: true });
      expect(JSON.stringify(s)).not.toContain("Transaction alert");
      expect(JSON.stringify(s)).not.toContain("testbank.example");
    });

    it("外币消费：卡对应好了也留在待入帐，等使用者填折合金额", () => {
      const s = crossBorder();
      L.mapCard(s, "TestBank", { currency: "SGD", card: true });
      const r = L.receiveInbox(s, [mail("a", "Spent USD 20.00 at AMAZON"), mail("b", "Spent SGD 3.00 at 7-ELEVEN")], TODAY);
      expect(r).toMatchObject({ added: 1, pending: 1 });
      expect(L.unmappedCards(s)).toEqual([]);
      expect(L.foreignPending(s)).toEqual([
        expect.objectContaining({ id: "a", amount: 20, currency: "USD", merchant: "AMAZON", side: "SGD", card: true }),
      ]);
    });

    it("银行对应到马币侧：邮件上的 MYR 直接进帐，SGD 反而是外币", () => {
      const s = crossBorder();
      L.mapCard(s, "TestBank", { currency: "MYR", card: false });
      L.receiveInbox(s, [mail("a", "Spent MYR 45.00 at MYDIN"), mail("b", "Spent SGD 10.00 at CHANGI")], TODAY);
      expect(s.records.map((x: any) => [x.currency, x.amount])).toEqual([["MYR", 45]]);
      expect(L.foreignPending(s).map((p: any) => p.id)).toEqual(["b"]);
    });

    it("入帐与通知邮件：直接略过，不进任何清单", () => {
      const s = L.defaultState();
      const r = L.receiveInbox(s, [mail("a", "Received SGD 100"), mail("b", "Notice: statement ready")], TODAY);
      expect(r).toMatchObject({ added: 0, pending: 0, unparsed: 0, bad: 0 });
    });

    it("认不得的邮件：进清单，留着寄件人、标题、正文与日期", () => {
      const s = L.defaultState();
      const r = L.receiveInbox(s, [mail("a", "We changed our format: RM 12.50 at Shopee")], TODAY);
      expect(r.unparsed).toBe(1);
      expect(s.apUnparsed).toEqual([{
        id: "a", date: "2026-09-25", from: "Alerts <alerts@testbank.example>",
        subject: "Transaction alert", body: "We changed our format: RM 12.50 at Shopee",
      }]);
      expect(L.guessMailAmount(s.apUnparsed[0].body)).toEqual({ amount: 12.5, currency: "MYR" });
    });

    it("同一封邮件拉到两次：只进清单一次", () => {
      const s = L.defaultState();
      L.receiveInbox(s, [mail("a", "???")], TODAY);
      L.receiveInbox(s, [mail("a", "???")], TODAY);
      expect(s.apUnparsed).toHaveLength(1);
    });

    it("清单最多留 50 封，丢最旧的", () => {
      const s = L.defaultState();
      L.receiveInbox(s, Array.from({ length: 55 }, (_, i) => mail(`m${i}`, "???")), TODAY);
      expect(s.apUnparsed).toHaveLength(50);
      expect(s.apUnparsed[0].id).toBe("m5");
    });

    it("手记或删掉之后从清单里拿掉：认不得的邮件与外币消费都一样", () => {
      const s = L.defaultState();
      L.mapCard(s, "TestBank", { currency: "SGD", card: false });
      L.receiveInbox(s, [mail("a", "???"), mail("b", "Spent USD 5.00 at X")], TODAY);
      expect(L.dropInboxItem(s, "a")).toBe(true);
      expect(L.dropInboxItem(s, "b")).toBe(true);
      expect(L.dropInboxItem(s, "nope")).toBe(false);
      expect(s.apUnparsed).toEqual([]);
      expect(s.apPending).toEqual([]);
    });

    it("刷卡与邮件混着来：各走各的", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      const swipe = { id: "s", t: "2026-09-25T09:00:00+08:00", amount: "S$4.00", merchant: "Kopitiam", card: "DBS Visa" };
      const r = L.receiveInbox(s, [swipe, mail("m", "???")], TODAY);
      expect(r).toMatchObject({ added: 1, unparsed: 1 });
    });
  });

  describe("迁移与重新载入", () => {
    beforeEach(() => { L.BANK_RULES.push(fakeBank); });
    afterEach(() => { L.BANK_RULES.splice(L.BANK_RULES.indexOf(fakeBank), 1); });

    it("认不得清单、待入帐的币种与来源都救得回来", () => {
      const s = L.defaultState();
      L.mapCard(s, "TestBank", { currency: "SGD", card: false });
      L.receiveInbox(s, [mail("a", "???"), mail("b", "Spent USD 5.00 at X")], TODAY);
      const back = L.loadState(JSON.stringify(s)).state;
      expect(back.apUnparsed).toEqual(s.apUnparsed);
      expect(back.apPending).toEqual(s.apPending);
      expect(L.foreignPending(back).map((p: any) => p.id)).toEqual(["b"]);
    });

    it("旧资料没有认不得清单：空的", () => {
      expect(L.migrate({ currency: "SGD", records: [] }).apUnparsed).toEqual([]);
    });

    it("坏掉的项目只丢那一封", () => {
      const s = L.migrate({
        currency: "SGD",
        apUnparsed: [{ id: "a", date: "2026-09-25", from: "x", subject: 3, body: "b" }, { id: "b" }, "junk"],
      });
      expect(s.apUnparsed).toEqual([{ id: "a", date: "2026-09-25", from: "x", subject: "", body: "b" }]);
    });
  });

  // 补一家银行 = 在 ledger.js 的 BANK_RULES 加规则 + 把打码后的样本放进这个目录。
  // 格式见目录里的 README.md
  describe("真银行的样本", () => {
    const dir = join(__dirname, "fixtures", "bank-mail");
    const samples = readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .map(f => ({ file: f, ...JSON.parse(readFileSync(join(dir, f), "utf8")) }));

    it("每个样本都解析成预期的结果", () => {
      for (const s of samples) {
        expect(L.parseBankMail(s.mail), s.file).toEqual(s.expect);
      }
    });

    it("每家银行的规则都至少有一封消费样本", () => {
      for (const rule of L.BANK_RULES) {
        const has = samples.some(s => s.expect?.bank === rule.bank && s.expect.direction === "out");
        expect(has, `${rule.bank} 没有消费样本`).toBe(true);
      }
    });
  });
});
