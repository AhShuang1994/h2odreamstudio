/**
 * 小帐本 · Apple Pay 收件箱（ADR-0002）
 *
 * 两层：ledger 怎么收下解封后的刷卡记录，以及 Worker 封、小帐本解这一对是否咬合。
 * 口径与 ledger.test.ts 相同：给定状态与一串操作，断言新状态与派生数字。
 */
import { describe, it, expect } from "vitest";
import * as L from "../../public/app/moneybook/ledger.js";
import { generateKeyPair, open } from "../../public/app/moneybook/inbox-crypto.js";
import { seal } from "../../workers/moneybook-inbox/src/seal.js";

const TODAY = "2026-09-23";

function crossBorder() {
  const s = L.defaultState();
  L.setSecondaryCurrency(s, "MYR");
  return s;
}

const swipe = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  receivedAt: "2026-09-23T04:30:00.000Z",
  t: "2026-09-23T12:30:00+08:00",
  amount: "S$12.50",
  merchant: "7-Eleven",
  card: "DBS Visa",
  ...extra,
});

describe("小帐本 · Apple Pay 收件箱", () => {
  describe("parseAmount：快捷指令给的金额原文", () => {
    it.each([
      ["S$12.50", 12.5],
      ["RM 1,234.00", 1234],
      ["SGD 8", 8],
      ["12.5", 12.5],
      ["12,50", 12.5],
      ["1,234", 1234],
      [7.25, 7.25],
    ])("%s → %s", (raw, want) => {
      expect(L.parseAmount(raw)).toBe(want);
    });

    it.each([["", null], ["免费", null], ["-S$3.00", null], [0, null], [null, null]])(
      "%s 认不得或是退款：不记",
      (raw, want) => {
        expect(L.parseAmount(raw)).toBe(want);
      },
    );
  });

  describe("收下刷卡记录", () => {
    it("卡还没对应：先留着等使用者答，不进帐", () => {
      const s = crossBorder();
      const r = L.receiveInbox(s, [swipe("a")], TODAY);
      expect(r).toMatchObject({ added: 0, pending: 1, bad: 0 });
      expect(s.records).toHaveLength(0);
      expect(L.unmappedCards(s)).toEqual(["DBS Visa"]);
    });

    it("答了之后，等着的那几笔随即进帐，带上刷卡标记", () => {
      const s = crossBorder();
      L.receiveInbox(s, [swipe("a"), swipe("b", { amount: "S$3.20", merchant: "Kopitiam" })], TODAY);
      const r = L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      expect(r.added).toBe(2);
      expect(s.apPending).toHaveLength(0);
      expect(L.unmappedCards(s)).toEqual([]);
      expect(s.records.map((x: any) => [x.amount, x.currency, x.note, x.card, x.date])).toEqual([
        [12.5, "SGD", "7-Eleven", true, "2026-09-23"],
        [3.2, "SGD", "Kopitiam", true, "2026-09-23"],
      ]);
      expect(L.cardSpentOnSide(s, "SGD", "2026-09")).toBe(15.7);
    });

    it("对应过的卡：下一笔直接进帐。借记卡不带刷卡标记", () => {
      const s = crossBorder();
      L.mapCard(s, "Maybank Debit", { currency: "MYR", card: false });
      const r = L.receiveInbox(s, [swipe("a", { amount: "RM 45.00", card: "Maybank Debit" })], TODAY);
      expect(r).toMatchObject({ added: 1, pending: 0 });
      expect(s.records[0]).toMatchObject({ type: "expense", amount: 45, currency: "MYR" });
      expect(L.isCard(s.records[0])).toBe(false);
    });

    it("同一个 id 拉到两次（ack 没送到）：只记一次", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.receiveInbox(s, [swipe("a")], TODAY);
      const r = L.receiveInbox(s, [swipe("a")], TODAY);
      expect(r.added).toBe(0);
      expect(s.records).toHaveLength(1);
    });

    it("删掉那笔之后再拉到同一个 id：不会复活", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.receiveInbox(s, [swipe("a")], TODAY);
      L.removeRecord(s, s.records[0].id);
      L.receiveInbox(s, [swipe("a")], TODAY);
      expect(s.records).toHaveLength(0);
    });

    it("金额读不懂：计入 bad，不进帐也不留着", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      const r = L.receiveInbox(s, [swipe("a", { amount: "??" })], TODAY);
      expect(r).toMatchObject({ added: 0, pending: 0, bad: 1 });
      expect(s.records).toHaveLength(0);
    });

    it("日期取刷卡时间，认不得就退回服务器收到的时间", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.receiveInbox(
        s,
        [
          swipe("a", { t: "2026-09-20T09:00:00+08:00" }),
          swipe("b", { t: "昨天下午", receivedAt: "2026-09-21T04:00:00.000Z" }),
        ],
        TODAY,
      );
      expect(s.records.map((r: any) => r.date)).toEqual(["2026-09-20", "2026-09-21"]);
    });
  });

  describe("分类", () => {
    it("沿用同一侧、同一商家上次的分类", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 5, currency: "SGD", cat: "food", date: "2026-09-01", note: "7-Eleven" });
      L.addRecord(s, { type: "expense", amount: 5, currency: "MYR", cat: "daily", date: "2026-09-02", note: "7-Eleven" });
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      const r = L.receiveInbox(s, [swipe("a", { merchant: "7-eleven " })], TODAY);
      expect(r.fallback).toBe(0);
      expect(s.records.at(-1).cat, "新币那侧的 7-Eleven 是餐饮，不是马币那侧的日用").toBe("food");
    });

    it("没见过的商家归「其他」，并计入 fallback", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      const r = L.receiveInbox(s, [swipe("a", { merchant: "新开的店" })], TODAY);
      expect(r.fallback).toBe(1);
      expect(s.records[0].cat).toBe("other_e");
    });
  });

  describe("不打扰手动记帐", () => {
    it("自动进帐不改上次记帐的侧与刷卡勾选", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 5, currency: "MYR", cat: "food", date: TODAY, card: false });
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.receiveInbox(s, [swipe("a")], TODAY);
      expect(L.activeSide(s)).toBe("MYR");
      expect(L.activeCard(s)).toBe(false);
    });
  });

  describe("侧变动", () => {
    it("对应到的那一侧被移除：那张卡要重问，记录留着等", () => {
      const s = crossBorder();
      L.mapCard(s, "Maybank Debit", { currency: "MYR", card: false });
      L.removeSecondaryCurrency(s);
      const r = L.receiveInbox(s, [swipe("a", { card: "Maybank Debit" })], TODAY);
      expect(r).toMatchObject({ added: 0, pending: 1 });
      expect(L.unmappedCards(s)).toEqual(["Maybank Debit"]);
    });

    it("不能对应到帐本里没有的一侧", () => {
      const s = L.defaultState();
      expect(() => L.mapCard(s, "X", { currency: "MYR", card: false })).toThrow();
    });

    it("改主币种：卡片对应跟着改名", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.setPrimaryCurrency(s, "MYR");
      L.receiveInbox(s, [swipe("a")], TODAY);
      expect(s.records[0].currency).toBe("MYR");
    });
  });

  describe("迁移与备份", () => {
    it("收件箱、卡片对应、待入帐、已处理清单都救得回来", async () => {
      const s = L.defaultState();
      const kp = await generateKeyPair();
      L.setInbox(s, { id: "box", read: "r", write: "w", priv: kp.priv });
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.receiveInbox(s, [swipe("a"), swipe("b", { card: "新卡" })], TODAY);

      const back = L.migrate(JSON.parse(JSON.stringify(s)));
      expect(back.inbox).toEqual(s.inbox);
      expect(back.cardMap).toEqual({ "DBS Visa": { currency: "SGD", card: true } });
      expect(back.apPending).toEqual(s.apPending);
      expect(back.apSeen).toEqual(s.apSeen);
    });

    it("旧资料没有这些字段：一律是空的，不开启", () => {
      const s = L.migrate({ currency: "SGD", records: [] });
      expect(s).toMatchObject({ inbox: null, cardMap: {}, apPending: [], apSeen: [] });
    });

    it("坏掉的收件箱整个不要，坏掉的待入帐只丢那一笔", () => {
      const s = L.migrate({
        currency: "SGD",
        inbox: { id: "box", read: "r" },
        cardMap: { A: { currency: "" }, B: { currency: "myr", card: 1 } },
        apPending: [{ id: "x", date: "2026-09-23", amount: 3, merchant: "m", cardName: "c" }, { id: "y" }],
        apSeen: [{ id: "x", at: "2026-09-23" }, "junk"],
      });
      expect(s.inbox).toBeNull();
      expect(s.cardMap).toEqual({ B: { currency: "MYR", card: false } });
      expect(s.apPending.map((p: any) => p.id)).toEqual(["x"]);
      expect(s.apSeen).toHaveLength(1);
    });

    it("已处理清单只留 45 天", () => {
      const s = L.defaultState();
      s.apSeen = [{ id: "old", at: "2026-07-01" }, { id: "new", at: "2026-09-01" }];
      L.receiveInbox(s, [], TODAY);
      expect(s.apSeen.map((x: any) => x.id)).toEqual(["new"]);
    });

    it("没有卡名的那张卡：对应过后重新载入仍然认得", () => {
      const s = L.defaultState();
      L.mapCard(s, "", { currency: "SGD", card: false });
      const back = L.migrate(JSON.parse(JSON.stringify(s)));
      L.receiveInbox(back, [swipe("a", { card: "" })], TODAY);
      expect(back.records).toHaveLength(1);
    });

    it("卡名叫 toString 之类的也只是一张普通的新卡", () => {
      const s = L.defaultState();
      const r = L.receiveInbox(s, [swipe("a", { card: "toString" })], TODAY);
      expect(r.pending).toBe(1);
      expect(L.unmappedCards(s)).toEqual(["toString"]);
    });

    it("关闭收件箱：卡片对应留着，重新开启不必再答", () => {
      const s = L.defaultState();
      L.mapCard(s, "DBS Visa", { currency: "SGD", card: true });
      L.clearInbox(s);
      expect(s.inbox).toBeNull();
      expect(s.cardMap["DBS Visa"]).toBeTruthy();
    });
  });

  describe("封与解：Worker 与小帐本咬合", () => {
    it("Worker 封的，小帐本用私钥解得开", async () => {
      const kp = await generateKeyPair();
      const plain = { t: "2026-09-23T12:30:00+08:00", amount: "S$12.50", merchant: "7-Eleven", card: "DBS Visa" };
      const box = await seal(kp.pub, plain);
      expect(JSON.stringify(box)).not.toContain("7-Eleven");
      expect(await open(kp.priv, box)).toEqual(plain);
    });

    it("别人的私钥解不开，密文被动过也解不开", async () => {
      const kp = await generateKeyPair();
      const other = await generateKeyPair();
      const box = await seal(kp.pub, { amount: "1" });
      await expect(open(other.priv, box)).rejects.toThrow();
      const flipped = { ...box, ct: (box.ct[0] === "A" ? "B" : "A") + box.ct.slice(1) };
      await expect(open(kp.priv, flipped)).rejects.toThrow();
    });

    it("公钥只含公开部分", async () => {
      const kp = await generateKeyPair();
      expect(Object.keys(kp.pub).sort()).toEqual(["crv", "kty", "x", "y"]);
      expect(kp.priv.d).toBeTruthy();
    });
  });
});
