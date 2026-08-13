/**
 * 小帐本 · ledger 核心（#98）
 *
 * 这个 app 的测试接缝只有一个：ledger 核心。它是纯的 —— 不碰 DOM、不碰
 * `localStorage`，所以直接用现成的 vitest 跑，零新基建。
 *
 * 断言只打在**外部行为**上：给定一份状态与一串操作，得到什么新状态、什么派生数字。
 * 不断言内部函数怎么组织、不断言 DOM 结构 —— 与本仓库既有的「拿产物去对产物」
 * 同一个口径。
 *
 * 渲染与切换器的 DOM 行为不在这里：它们的错误一眼可见，写起来脆且贵，用浏览器手测。
 */
import { describe, it, expect } from "vitest";
import * as L from "../../public/app/moneybook/ledger.js";

// —— 夹具 ————————————————————————————————————————————————

/** 一份典型的 v1 资料：台湾口味的预设值、没有币种字段、单一预算。 */
function v1Fixture() {
  return {
    version: 1,
    currency: "NT$",
    budget: 20000,
    cats: {
      expense: [{ id: "food", icon: "🍜", name: "餐飲" }],
      income: [{ id: "salary", icon: "💼", name: "薪水" }],
    },
    recurring: [
      { id: "r1", type: "expense", amount: 1200, cat: "food", day: 5, note: "房租", from: "2026-01", applied: ["2026-01"] },
    ],
    records: [
      { id: "a", type: "expense", amount: 30, cat: "food", date: "2026-03-01", note: "早餐" },
      { id: "b", type: "income", amount: 3000, cat: "salary", date: "2026-03-05", note: "薪水" },
    ],
  };
}

/** 跨境的一本帐：主币种 SGD、第二币种 MYR。 */
function crossBorder() {
  const s = L.defaultState();
  L.setSecondaryCurrency(s, "MYR");
  return s;
}

describe("小帐本 · ledger 核心", () => {
  // ── 1. 迁移 ───────────────────────────────────────────
  describe("迁移：v1 → v2", () => {
    it("每一笔都还在，且都带上了主币种", () => {
      const s = L.migrate(v1Fixture());
      expect(s.version).toBe(2);
      expect(s.records).toHaveLength(2);
      expect(s.records.map((r: any) => r.currency)).toEqual(["NT$", "NT$"]);
    });

    it("老使用者的币种原样保留 —— 升级后的数字跟升级前对得上", () => {
      const s = L.migrate(v1Fixture());
      expect(s.currency, "不能把老使用者的 NT$ 换成新的预设 SGD").toBe("NT$");
      expect(L.monthlySummary(s, "NT$", "2026-03")).toMatchObject({
        income: 3000,
        expense: 30,
        net: 2970,
      });
    });

    it("原本的单一预算归给主币种", () => {
      const s = L.migrate(v1Fixture());
      expect(L.budgetOf(s, "NT$")).toBe(20000);
    });

    it("原本的固定收支归给主币种", () => {
      const s = L.migrate(v1Fixture());
      expect(s.recurring).toHaveLength(1);
      expect(s.recurring[0].currency).toBe("NT$");
      expect(s.recurring[0].applied, "已套用的月份不能在迁移里丢掉，否则会重复补记").toEqual([
        "2026-01",
      ]);
    });

    it("新装的预设主币种是 SGD，且没有第二币种", () => {
      const s = L.defaultState();
      expect(s.currency).toBe("SGD");
      expect(s.currency2).toBeNull();
      expect(L.hasSecondary(s)).toBe(false);
    });

    it("升级是幂等的 —— v2 再迁一次不会变形", () => {
      const once = L.migrate(v1Fixture());
      const twice = L.migrate(JSON.parse(JSON.stringify(once)));
      expect(twice).toEqual(once);
    });

    // 「失败时保住原始资料，而不是回退成空白帐本」
    describe("畸形资料不会把帐本清空", () => {
      it("缺字段的记录只丢它自己，好的那些留下", () => {
        const s = L.migrate({
          currency: "SGD",
          records: [
            { id: "ok", type: "expense", amount: 10, cat: "food", date: "2026-03-01" },
            { id: "no-date", type: "expense", amount: 10, cat: "food" },
            { id: "no-amount", type: "expense", cat: "food", date: "2026-03-01" },
            null,
            "字符串不是记录",
          ],
        });
        expect(s.records.map((r: any) => r.id)).toEqual(["ok"]);
      });

      it("类型不对的字段回退成预设，不影响其他字段", () => {
        const s = L.migrate({
          currency: "SGD",
          budget: "не число",
          cats: "这不是分类表",
          recurring: 42,
          records: [{ type: "expense", amount: 10, cat: "food", date: "2026-03-01" }],
        });
        expect(s.cats.expense.length).toBeGreaterThan(0);
        expect(s.recurring).toEqual([]);
        expect(L.budgetOf(s, "SGD")).toBe(0);
        expect(s.records, "其他字段坏掉不该连累记录").toHaveLength(1);
      });

      it("空阵列与空物件不会炸", () => {
        expect(() => L.migrate({ records: [], recurring: [], cats: {} })).not.toThrow();
        expect(() => L.migrate({})).not.toThrow();
        expect(() => L.migrate(null)).not.toThrow();
        expect(() => L.migrate([])).not.toThrow();
      });

      it("读不懂的原始字符串会被标成 corrupt —— 外层据此拒绝回存", () => {
        const bad = L.loadState("{ 这不是 JSON");
        expect(bad.corrupt, "不标记的话，下一次 save() 就把使用者的帐真的覆盖掉了").toBe(true);

        const good = L.loadState(JSON.stringify(v1Fixture()));
        expect(good.corrupt).toBe(false);
        expect(good.state.records).toHaveLength(2);

        const empty = L.loadState(null);
        expect(empty.corrupt).toBe(false);
        expect(empty.fresh).toBe(true);
      });

      it("期数被改坏时只丢掉那个字段退回无限期，规则本身与整本帐都还在", () => {
        const s = L.migrate({
          currency: "SGD",
          recurring: [
            { id: "zero",  type: "expense", amount: 400, day: 1, from: "2026-01", terms: 0 },
            { id: "neg",   type: "expense", amount: 400, day: 1, from: "2026-01", terms: -3 },
            { id: "str",   type: "expense", amount: 400, day: 1, from: "2026-01", terms: "十二" },
            { id: "null",  type: "expense", amount: 400, day: 1, from: "2026-01", terms: null },
            { id: "float", type: "expense", amount: 400, day: 1, from: "2026-01", terms: 2.5 },
            { id: "ok",    type: "expense", amount: 400, day: 1, from: "2026-01", terms: 12 },
          ],
          records: [{ type: "expense", amount: 10, cat: "food", date: "2026-03-01" }],
        });
        expect(s.recurring.map((r: any) => r.id), "坏一个字段不该丢掉整条规则").toEqual([
          "zero", "neg", "str", "null", "float", "ok",
        ]);
        expect(s.recurring.slice(0, 5).map((r: any) => r.terms)).toEqual([
          undefined, undefined, undefined, undefined, undefined,
        ]);
        expect(s.recurring[5].terms).toBe(12);
        expect(s.records, "更不该连累整本帐").toHaveLength(1);
      });

      it("没有期数字段的旧规则读进来完全不变，schema 也不升版本", () => {
        const s = L.migrate(v1Fixture());
        expect(s.version, "分期是规则上的可选字段，不是新 schema").toBe(2);
        expect(s.recurring[0]).not.toHaveProperty("terms");
        expect(L.isInstallment(s.recurring[0])).toBe(false);
      });

      it("半条转帐（缺了到帐金额）会被丢掉，不会留下只影响一侧的残骸", () => {
        const s = L.migrate({
          currency: "SGD",
          currency2: "MYR",
          records: [
            { id: "half", type: "transfer", amount: 1000, date: "2026-03-01" },
            { id: "whole", type: "transfer", amount: 1000, toAmount: 3400, toCurrency: "MYR", date: "2026-03-02" },
          ],
        });
        expect(s.records.map((r: any) => r.id)).toEqual(["whole"]);
      });
    });
  });

  // ── 2. 两侧独立 ────────────────────────────────────────
  describe("两侧独立结算，永不相加", () => {
    function twoSided() {
      const s = crossBorder();
      L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-03-01" });
      L.addRecord(s, { type: "expense", amount: 400, currency: "SGD", cat: "food", date: "2026-03-02" });
      L.addRecord(s, { type: "expense", amount: 250, currency: "MYR", cat: "food", date: "2026-03-03" });
      L.addRecord(s, { type: "expense", amount: 80, currency: "MYR", cat: "traffic", date: "2026-03-04" });
      return s;
    }

    it("月度汇总只包含该侧的记录", () => {
      const s = twoSided();
      expect(L.monthlySummary(s, "SGD", "2026-03")).toMatchObject({ income: 3000, expense: 400, net: 2600 });
      expect(L.monthlySummary(s, "MYR", "2026-03")).toMatchObject({ income: 0, expense: 330, net: -330 });
    });

    it("累计也各算各的", () => {
      const s = twoSided();
      expect(L.cumulative(s, "SGD")).toBe(2600);
      expect(L.cumulative(s, "MYR")).toBe(-330);
    });

    it("分类占比只看本侧 —— 马币那侧看不到新币的分类", () => {
      const s = twoSided();
      const myr = L.categoryBreakdown(s, "MYR", "2026-03", "expense");
      expect(myr.total).toBe(330);
      expect(myr.rows.map((r: any) => r.cat)).toEqual(["food", "traffic"]);
      expect(myr.rows[0].amount).toBe(250);

      const sgd = L.categoryBreakdown(s, "SGD", "2026-03", "expense");
      expect(sgd.total).toBe(400);
      expect(sgd.rows.map((r: any) => r.cat)).toEqual(["food"]);
    });

    it("任何一个汇总数字都带着它自己的币种，没有跨币种的合计", () => {
      const s = twoSided();
      const a = L.monthlySummary(s, "SGD", "2026-03");
      const b = L.monthlySummary(s, "MYR", "2026-03");
      expect(a.currency).toBe("SGD");
      expect(b.currency).toBe("MYR");
      // 两侧之和 330 + 400 = 730 这个数不该由任何 API 产出
      expect(L.sides(s)).toEqual(["SGD", "MYR"]);
      expect(L.sides(s).map((c: string) => L.monthlySummary(s, c, "2026-03").expense)).toEqual([400, 330]);
    });

    it("分类两侧共用，不用建两次", () => {
      const s = twoSided();
      expect(s.cats.expense.some((c: any) => c.id === "food")).toBe(true);
      // 两侧都用了 food，而分类表里只有一份
      expect(s.cats.expense.filter((c: any) => c.id === "food")).toHaveLength(1);
    });
  });

  // ── 3. 转帐 ────────────────────────────────────────────
  describe("转帐：一条记录，两个金额", () => {
    function withTransfer() {
      const s = crossBorder();
      L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-03-01" });
      const t = L.addTransfer(s, {
        amount: 2000, currency: "SGD",
        toAmount: 6800, toCurrency: "MYR",
        date: "2026-03-10", note: "汇回家",
      });
      return { s, t };
    }

    it("建立之后两侧余额同时变动", () => {
      const { s } = withTransfer();
      expect(L.cumulative(s, "SGD")).toBe(1000);   // 3000 收入 − 2000 走出
      expect(L.cumulative(s, "MYR")).toBe(6800);   // 到帐
    });

    it("不进任何一侧的收入或支出", () => {
      const { s } = withTransfer();
      const sgd = L.monthlySummary(s, "SGD", "2026-03");
      expect(sgd.income, "搬钱不是赚钱").toBe(3000);
      expect(sgd.expense, "搬钱不是花钱 —— 这正是这张票要修的失真").toBe(0);

      const myr = L.monthlySummary(s, "MYR", "2026-03");
      expect(myr.income).toBe(0);
      expect(myr.expense).toBe(0);
    });

    it("统计页的支出排行里没有汇款这根柱子", () => {
      const { s } = withTransfer();
      const sgd = L.categoryBreakdown(s, "SGD", "2026-03", "expense");
      expect(sgd.total).toBe(0);
      expect(sgd.rows).toEqual([]);
    });

    it("存成一条记录，明细页才有得摊成两行", () => {
      const { s, t } = withTransfer();
      expect(s.records.filter((r: any) => L.isTransfer(r))).toHaveLength(1);
      expect(L.signedDelta(t, "SGD")).toBe(-2000);
      expect(L.signedDelta(t, "MYR")).toBe(6800);
    });

    it("改错金额时两侧一起改", () => {
      const { s, t } = withTransfer();
      L.updateRecord(s, t.id, { amount: 1500, toAmount: 5100 });
      expect(L.cumulative(s, "SGD")).toBe(1500);
      expect(L.cumulative(s, "MYR")).toBe(5100);
    });

    it("删除时两侧同时回退", () => {
      const { s, t } = withTransfer();
      expect(L.removeRecord(s, t.id)).toBe(true);
      expect(L.cumulative(s, "SGD")).toBe(3000);
      expect(L.cumulative(s, "MYR")).toBe(0);
    });

    it("转帐必须跨两个不同的币种", () => {
      const s = crossBorder();
      expect(() =>
        L.addTransfer(s, { amount: 100, currency: "SGD", toAmount: 100, toCurrency: "SGD", date: "2026-03-01" }),
      ).toThrow();
      expect(s.records, "被拒绝的转帐不该留下半条").toHaveLength(0);
    });
  });

  // ── 4. 汇率 ────────────────────────────────────────────
  describe("汇率：派生值，不存", () => {
    it("由走出与到帐金额相除得出", () => {
      const s = crossBorder();
      const t = L.addTransfer(s, {
        amount: 2000, currency: "SGD", toAmount: 6800, toCurrency: "MYR", date: "2026-03-10",
      });
      expect(L.rateOf(t)).toBeCloseTo(3.4, 10);
    });

    it("任一个金额被改，汇率跟着变 —— 不会留下第二个真相", () => {
      const s = crossBorder();
      const t = L.addTransfer(s, {
        amount: 2000, currency: "SGD", toAmount: 6800, toCurrency: "MYR", date: "2026-03-10",
      });
      const changed = L.updateRecord(s, t.id, { toAmount: 7000 });
      expect(L.rateOf(changed)).toBeCloseTo(3.5, 10);

      const again = L.updateRecord(s, t.id, { amount: 1000 });
      expect(L.rateOf(again)).toBeCloseTo(7, 10);
    });

    it("汇率没有被写进记录里", () => {
      const s = crossBorder();
      const t = L.addTransfer(s, {
        amount: 2000, currency: "SGD", toAmount: 6800, toCurrency: "MYR", date: "2026-03-10",
      });
      expect(Object.keys(t)).not.toContain("rate");
      expect(JSON.stringify(s)).not.toContain('"rate"');
    });

    it("支出与收入没有汇率", () => {
      const s = crossBorder();
      const r = L.addRecord(s, { type: "expense", amount: 10, currency: "SGD", cat: "food", date: "2026-03-01" });
      expect(L.rateOf(r)).toBeNull();
    });
  });

  // ── 5. 家用 ────────────────────────────────────────────
  describe("家用：交出去那一刻才记", () => {
    it("记成马币那侧的支出，扣减该侧累计", () => {
      const s = crossBorder();
      L.addTransfer(s, { amount: 2000, currency: "SGD", toAmount: 6800, toCurrency: "MYR", date: "2026-03-10" });
      // 汇款那一刻钱还是你的：马币那侧有 6800，还没有任何支出
      expect(L.cumulative(s, "MYR")).toBe(6800);
      expect(L.monthlySummary(s, "MYR", "2026-03").expense).toBe(0);

      // 交给妈妈的那一刻，才离开你的资产
      L.addRecord(s, { type: "expense", amount: 2000, currency: "MYR", cat: "family", date: "2026-03-12", note: "家用" });
      expect(L.cumulative(s, "MYR")).toBe(4800);
      expect(L.monthlySummary(s, "MYR", "2026-03").expense).toBe(2000);
    });

    it("家用进得了马币那侧的分类占比", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 2000, currency: "MYR", cat: "family", date: "2026-03-12" });
      L.addRecord(s, { type: "expense", amount: 150, currency: "MYR", cat: "food", date: "2026-03-13" });
      const b = L.categoryBreakdown(s, "MYR", "2026-03", "expense");
      expect(b.rows[0]).toMatchObject({ cat: "family", amount: 2000 });
      expect(b.total).toBe(2150);
    });

    it("回 JB 吃饭加油记成马币支出，从马币那侧扣", () => {
      const s = crossBorder();
      L.addTransfer(s, { amount: 1000, currency: "SGD", toAmount: 3400, toCurrency: "MYR", date: "2026-03-01" });
      L.addRecord(s, { type: "expense", amount: 120, currency: "MYR", cat: "food", date: "2026-03-15" });
      L.addRecord(s, { type: "expense", amount: 80, currency: "MYR", cat: "traffic", date: "2026-03-15" });
      expect(L.cumulative(s, "MYR")).toBe(3200);
      expect(L.cumulative(s, "SGD")).toBe(-1000);
    });
  });

  // ── 6. 固定收支 ────────────────────────────────────────
  describe("每月固定收支：各归各侧", () => {
    it("补记时落在它所属的那一侧", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 1, note: "房租", from: "2026-01" });
      L.addRule(s, { type: "expense", amount: 300, currency: "MYR", cat: "health", day: 10, note: "保费", from: "2026-01" });

      const added = L.applyRecurring(s, "2026-03-15");
      expect(added).toBe(6); // 两条规则 × 三个月

      expect(L.monthlySummary(s, "SGD", "2026-02").expense).toBe(1800);
      expect(L.monthlySummary(s, "MYR", "2026-02").expense).toBe(300);
      expect(L.cumulative(s, "SGD")).toBe(-5400);
      expect(L.cumulative(s, "MYR")).toBe(-900);
    });

    it("跨月补记不重复、不漏", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 100, currency: "SGD", cat: "home", day: 1, from: "2026-01" });

      expect(L.applyRecurring(s, "2026-03-15")).toBe(3);
      expect(L.applyRecurring(s, "2026-03-15"), "同一天再跑一次不该重复补").toBe(0);
      expect(L.applyRecurring(s, "2026-04-01"), "跨到四月只补四月那一笔").toBe(1);
      expect(s.records).toHaveLength(4);
      expect(s.records.map((r: any) => r.date)).toEqual([
        "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01",
      ]);
    });

    it("还没到当月那一天就不补", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 100, currency: "SGD", cat: "home", day: 25, from: "2026-03" });
      expect(L.applyRecurring(s, "2026-03-10")).toBe(0);
      expect(L.applyRecurring(s, "2026-03-25")).toBe(1);
    });

    it("2 月没有 31 号时缩到当月最后一天", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 100, currency: "SGD", cat: "home", day: 31, from: "2026-02" });
      L.applyRecurring(s, "2026-03-31");
      expect(s.records.map((r: any) => r.date)).toEqual(["2026-02-28", "2026-03-31"]);
    });

    it("手动删掉某个月那一笔，不会被重新补回来", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 100, currency: "SGD", cat: "home", day: 1, from: "2026-01" });
      L.applyRecurring(s, "2026-03-15");
      const victim = s.records.find((r: any) => r.date === "2026-02-01");
      L.removeRecord(s, victim.id);
      expect(L.applyRecurring(s, "2026-03-15")).toBe(0);
      expect(s.records).toHaveLength(2);
    });

    // 移除第二币种只是把那一侧收起来，规则原封不动留着。补记若不看侧，
    // 它会一直往一个使用者看不见的地方塞记录（#116）。
    describe("币种不再属于任何一侧时，规则停止生长", () => {
      /** 两侧各一条规则，都已补到一月。 */
      function bothSides() {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 1, from: "2026-01" });
        L.addRule(s, { type: "expense", amount: 300, currency: "MYR", cat: "health", day: 1, from: "2026-01" });
        L.applyRecurring(s, "2026-01-15");
        return s;
      }

      const datesOf = (s: any, c: string) =>
        s.records.filter((r: any) => r.currency === c).map((r: any) => r.date);

      it("移除第二币种后，那一侧的固定收支不再产生任何新记录", () => {
        const s = bothSides();
        L.removeSecondaryCurrency(s);
        L.applyRecurring(s, "2026-03-15");
        expect(datesOf(s, "MYR"), "移除之前那一笔要留着，之后一笔都不该多").toEqual(["2026-01-01"]);
      });

      it("分期也一样停 —— 消失期间不烧掉期数", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 500, currency: "MYR", cat: "other_e", day: 1, from: "2026-01", terms: 3 });
        L.applyRecurring(s, "2026-01-15");
        L.removeSecondaryCurrency(s);
        L.applyRecurring(s, "2026-03-15");
        L.setSecondaryCurrency(s, "MYR");
        L.applyRecurring(s, "2026-06-15");
        expect(datesOf(s, "MYR"), "三期就是三期，晚补不等于少还").toEqual([
          "2026-01-01", "2026-02-01", "2026-03-01",
        ]);
      });

      it("主币种那一侧不受影响，照常补记", () => {
        const s = bothSides();
        L.removeSecondaryCurrency(s);
        expect(L.applyRecurring(s, "2026-03-15")).toBe(2);
        expect(datesOf(s, "SGD")).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
      });

      it("把同一个币种加回来，消失期间漏掉的月份被一次补齐", () => {
        const s = bothSides();
        L.removeSecondaryCurrency(s);
        L.applyRecurring(s, "2026-03-15");

        L.setSecondaryCurrency(s, "MYR");
        expect(L.applyRecurring(s, "2026-03-15"), "二月三月的保费确实付了，不该凭空消失").toBe(2);
        expect(datesOf(s, "MYR")).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
        expect(L.applyRecurring(s, "2026-03-15"), "补齐之后不该再重复补").toBe(0);
      });
    });

    // 分期：一笔会自己停的固定收支（#117）。期数含本月在内 —— 填 1 表示这个月还完。
    describe("分期：补到最后一期自动停", () => {
      const datesOf = (s: any) => s.records.map((r: any) => r.date);

      it("期数留空就是无限期，行为与今天完全一致", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 100, currency: "SGD", cat: "home", day: 1, from: "2026-01" });
        expect(rule.terms, "没填期数就不该凭空长出一个").toBeUndefined();
        expect(L.isInstallment(rule)).toBe(false);
        L.applyRecurring(s, "2026-06-15");
        expect(s.records).toHaveLength(6);
      });

      it("填 3 期、首期本月：连续补三个月后停，第四个月不再产生", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 3 });
        expect(L.applyRecurring(s, "2026-03-15")).toBe(3);
        expect(L.applyRecurring(s, "2026-04-15"), "第四个月不该再有").toBe(0);
        expect(datesOf(s)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
      });

      it("填 1 期：只补本月这一期就结束", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-03", terms: 1 });
        expect(L.applyRecurring(s, "2026-03-15")).toBe(1);
        expect(L.applyRecurring(s, "2026-09-15")).toBe(0);
        expect(datesOf(s)).toEqual(["2026-03-01"]);
      });

      it("首期选下月时，本月绝不产生记录 —— 即使扣款日已过", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-04", terms: 3 });
        expect(L.applyRecurring(s, "2026-03-28"), "本月那期假定已经还过，不该重复记").toBe(0);
        expect(L.applyRecurring(s, "2026-04-15")).toBe(1);
      });

      it("期数填 0、负数或非整数会被挡下，不会建出一笔生下来就结束的分期", () => {
        const s = crossBorder();
        for (const bad of [0, -3, 1.5, "两期"]) {
          expect(() =>
            L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: bad }),
          ).toThrow(/期数/);
        }
        expect(s.recurring, "被拒绝的分期不该留下半条").toHaveLength(0);
      });

      it("手动删掉中间某个月那一笔，分期仍在原本那个月结束，不往后顺延一期", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 3 });
        L.applyRecurring(s, "2026-02-15");
        const victim = s.records.find((r: any) => r.date === "2026-02-01");
        L.removeRecord(s, victim.id);

        L.applyRecurring(s, "2026-06-15");
        expect(datesOf(s), "按月份算而不是数笔数，才跟银行那边的日历对得上").toEqual([
          "2026-01-01", "2026-03-01",
        ]);
      });

      it("跨月没开 app 时中间漏掉的期数一次补齐，同一天重复打开不重复补", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 6 });
        expect(L.applyRecurring(s, "2026-04-20")).toBe(4);
        expect(L.applyRecurring(s, "2026-04-20")).toBe(0);
      });

      it("扣款日 31 号遇上没有 31 号的月份时缩到当月最后一天，那一期不被跳过", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 31, from: "2026-01", terms: 3 });
        L.applyRecurring(s, "2026-03-31");
        expect(datesOf(s)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
      });

      it("分期产生的记录与固定收支同口径 —— 进月度支出、吃预算、进分类占比", () => {
        const s = crossBorder();
        L.setBudget(s, "SGD", 1000);
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "fun", day: 1, from: "2026-03", terms: 3 });
        L.applyRecurring(s, "2026-03-15");
        expect(L.monthlySummary(s, "SGD", "2026-03").expense).toBe(400);
        expect(L.budgetStatus(s, "SGD", "2026-03")).toMatchObject({ spent: 400, left: 600 });
        expect(L.categoryBreakdown(s, "SGD", "2026-03", "expense").rows[0]).toMatchObject({ cat: "fun", amount: 400 });
      });

      it("收入也能设期数", () => {
        const s = crossBorder();
        L.addRule(s, { type: "income", amount: 900, currency: "SGD", cat: "bonus", day: 5, from: "2026-01", terms: 2 });
        L.applyRecurring(s, "2026-06-15");
        expect(L.monthlySummary(s, "SGD", "2026-02").income).toBe(900);
        expect(L.monthlySummary(s, "SGD", "2026-03").income, "两期还完就停").toBe(0);
      });

      it("删掉规则不影响已经记下的记录", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 3 });
        L.applyRecurring(s, "2026-03-15");
        L.removeRule(s, rule.id);
        expect(s.records).toHaveLength(3);
        expect(L.cumulative(s, "SGD")).toBe(-1200);
      });
    });

    // 界面要显示的每一个数字都在核心里算完 —— 算术留在渲染层就等于挪到接缝外面。
    describe("分期的派生值：剩余期数、待还总额、每侧小计", () => {
      function installments() {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 12, note: "手机" });
        L.addRule(s, { type: "expense", amount: 250, currency: "MYR", cat: "other_e", day: 1, from: "2026-01", terms: 6, note: "冷气" });
        L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 1, from: "2026-01", note: "房租" });
        return s;
      }
      const byNote = (s: any, note: string) => s.recurring.find((r: any) => r.note === note);

      it("剩余期数含当月在内 —— 首期那个月就是全部期数", () => {
        const s = installments();
        const phone = byNote(s, "手机");
        expect(L.remainingTerms(phone, "2026-01")).toBe(12);
        expect(L.remainingTerms(phone, "2026-02")).toBe(11);
        expect(L.remainingTerms(phone, "2026-12"), "最后一期那个月还剩 1 期").toBe(1);
        expect(L.remainingTerms(phone, "2027-01")).toBe(0);
      });

      it("无限期没有剩余期数，也没有「还完」这回事", () => {
        const s = installments();
        const rent = byNote(s, "房租");
        expect(L.remainingTerms(rent, "2026-05")).toBeNull();
        expect(L.outstandingOf(rent, "2026-05")).toBeNull();
        expect(L.isSettled(rent, "2099-12")).toBe(false);
      });

      it("待还总额是每期金额 × 剩余期数", () => {
        const s = installments();
        expect(L.outstandingOf(byNote(s, "手机"), "2026-03")).toBe(4000);  // 400 × 10
        expect(L.outstandingOf(byNote(s, "冷气"), "2026-03")).toBe(1000);  // 250 × 4
      });

      it("补完最后一期后算「已还完」，待还归零 —— 不必等到下个月", () => {
        const s = installments();
        L.applyRecurring(s, "2026-12-15");
        const phone = byNote(s, "手机");
        expect(L.isSettled(phone, "2026-12"), "最后一期的钱已经记下了，那就是还完了").toBe(true);
        expect(L.outstandingOf(phone, "2026-12")).toBe(0);
        expect(L.isSettled(phone, "2027-01")).toBe(true);
      });

      it("本月那笔一记下，还剩就少一期，待还也跟着少一期的钱", () => {
        const s = installments();
        const phone = byNote(s, "手机");
        expect(L.remainingTerms(phone, "2026-01"), "还没记，12 期都还欠着").toBe(12);
        L.applyRecurring(s, "2026-01-15");
        expect(L.remainingTerms(phone, "2026-01"), "一月那期记下了就不该再算进还剩").toBe(11);
        expect(L.outstandingOf(phone, "2026-01")).toBe(4400);   // 400 × 11
      });

      it("每侧的待还小计各算各的，任何情况下不相加", () => {
        const s = installments();
        expect(L.outstandingOnSide(s, "SGD", "2026-03")).toBe(4000);
        expect(L.outstandingOnSide(s, "MYR", "2026-03")).toBe(1000);
        // 两侧之和 5000 这个数不该由任何 API 产出
        expect(L.sides(s).map((c: string) => L.outstandingOnSide(s, c, "2026-03"))).toEqual([4000, 1000]);
      });

      it("无限期的固定收支不进待还小计 —— 房租没有「还完」的那一天", () => {
        const s = installments();
        expect(L.outstandingOnSide(s, "SGD", "2026-03"), "1800 的房租不该被算进去").toBe(4000);
      });

      it("收入的分期不进待还小计 —— 待收跟待还是两回事", () => {
        const s = installments();
        L.addRule(s, { type: "income", amount: 900, currency: "SGD", cat: "bonus", day: 5, from: "2026-01", terms: 4 });
        expect(L.outstandingOnSide(s, "SGD", "2026-03")).toBe(4000);
      });
    });

    // 期次：明细里认得出这是第几期（#118）。跟剩余期数一样是派生值 —— 由记录所属
    // 月份减去规则的首期月份算出，不存进记录里。
    describe("期次：这笔记录是第几期", () => {
      function withInstallment(from: string, terms = 12) {
        const s = crossBorder();
        const rule = L.addRule(s, {
          type: "expense", amount: 400, currency: "SGD", cat: "other_e",
          day: 1, from, terms, note: "UOB iPhone",
        });
        return { s, rule };
      }
      const termsOf = (s: any) => s.records.map((r: any) => L.termOf(s, r));

      it("首期落在当月：第一笔就是 1/12，之后逐月递增", () => {
        const { s } = withInstallment("2026-01");
        L.applyRecurring(s, "2026-03-15");
        expect(termsOf(s)).toEqual([
          { index: 1, total: 12 },
          { index: 2, total: 12 },
          { index: 3, total: 12 },
        ]);
      });

      it("首期设成下月：它产生的第一笔仍是 1/N，不是 2/N", () => {
        const { s } = withInstallment("2026-04", 3);
        L.applyRecurring(s, "2026-04-15");
        expect(termsOf(s)).toEqual([{ index: 1, total: 3 }]);
      });

      it("跨年时期次继续往下数，不在一月归零", () => {
        const { s } = withInstallment("2026-11");
        L.applyRecurring(s, "2027-02-15");
        expect(termsOf(s)).toEqual([
          { index: 1, total: 12 },
          { index: 2, total: 12 },
          { index: 3, total: 12 },
          { index: 4, total: 12 },
        ]);
      });

      it("规则被删掉之后算不出期次 —— 返回 null，界面据此退回一般的自动记录标签", () => {
        const { s, rule } = withInstallment("2026-01");
        L.applyRecurring(s, "2026-02-15");
        L.removeRule(s, rule.id);
        expect(termsOf(s), "宁可不显示，也不显示一个错的数字").toEqual([null, null]);
        expect(s.records[0].note, "备注还在，这笔记录不至于失籍").toBe("UOB iPhone");
      });

      it("无限期的固定收支没有期次 —— 房租不该显示第几期", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 1, from: "2026-01", note: "房租" });
        L.applyRecurring(s, "2026-02-15");
        expect(termsOf(s)).toEqual([null, null]);
      });

      it("手动记的记录没有期次", () => {
        const s = crossBorder();
        L.addRecord(s, { type: "expense", amount: 30, currency: "SGD", cat: "food", date: "2026-03-01" });
        expect(L.termOf(s, s.records[0])).toBeNull();
      });
    });

    // 编辑（#119）：银行调月供、一次多还几期、期数当初填错，都是大概率会发生的事，
    // 而删了重建会把本月那期重复补记一次。编辑**只管以后** —— 已经记下的一笔不碰。
    describe("编辑固定收支与分期：只管以后", () => {
      /** 一笔跑到第 3 期的分期：2026-06 起 12 期，补记到 2026-08。 */
      function midway() {
        const s = crossBorder();
        const rule = L.addRule(s, {
          type: "expense", amount: 180, currency: "SGD", cat: "other_e",
          day: 8, from: "2026-06", terms: 12, note: "UOB iPhone",
        });
        L.applyRecurring(s, "2026-08-15");
        return { s, rule };
      }

      it("改金额只影响以后产生的记录，已经记下的一笔不变", () => {
        const { s, rule } = midway();
        L.updateRule(s, rule.id, { amount: 200 });
        expect(s.records.map((r: any) => r.amount), "旧记录是既成事实，不该被追溯改写").toEqual([180, 180, 180]);
        L.applyRecurring(s, "2026-09-15");
        expect(s.records.at(-1)).toMatchObject({ date: "2026-09-08", amount: 200 });
      });

      it("改剩余期数后已还进度不变 —— 3/12 改成还剩 5 期变 3/8，不是 0/5", () => {
        const { s, rule } = midway();
        const updated = L.updateRule(s, rule.id, { remaining: 5 });
        expect(updated.terms, "总期数 = 已补记的 3 期 + 还剩的 5 期").toBe(8);
        expect(L.termOf(s, s.records.at(-1))).toEqual({ index: 3, total: 8 });
        expect(updated.from, "首期不动，否则已还的进度会被抹掉").toBe("2026-06");
      });

      it("剩余期数改成 0 就立刻算已还完，也不再产生新记录 —— 提前还清不必再学一个新操作", () => {
        const { s, rule } = midway();
        L.updateRule(s, rule.id, { remaining: 0 });
        expect(L.isSettled(s.recurring[0], "2026-08"), "当月就该显示已还完，不是等下个月").toBe(true);
        expect(L.outstandingOnSide(s, "SGD", "2026-08"), "待还也要当场归零").toBe(0);
        expect(L.applyRecurring(s, "2027-06-15")).toBe(0);
        expect(s.records).toHaveLength(3);
      });

      it("一期都还没补记时不能填 0 —— 那样等于这条规则从没存在过，该直接删", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 180, currency: "SGD", cat: "other_e", day: 8, from: "2026-09", terms: 6 });
        expect(() => L.updateRule(s, rule.id, { remaining: 0 })).toThrow(/删除/);
        expect(s.recurring[0].terms, "被挡下就什么都不该改").toBe(6);
      });

      it("给无限期的固定收支填上期数，它就变成分期", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 1200, currency: "SGD", cat: "home", day: 1, from: "2026-06", note: "房租" });
        L.applyRecurring(s, "2026-08-15");
        expect(L.isInstallment(s.recurring[0])).toBe(false);
        L.updateRule(s, rule.id, { remaining: 4 });
        expect(s.recurring[0].terms, "已补记 3 期 + 还剩 4 期").toBe(7);
        L.applyRecurring(s, "2027-06-15");
        expect(s.records).toHaveLength(7);
      });

      it("清空期数，分期变回无限期 —— 两种形态之间可逆", () => {
        const { s, rule } = midway();
        L.updateRule(s, rule.id, { remaining: "" });
        expect(L.isInstallment(s.recurring[0])).toBe(false);
        expect(L.remainingTerms(s.recurring[0], "2026-09")).toBeNull();
        expect(L.applyRecurring(s, "2027-08-15"), "无限期就一直补下去").toBe(12);
      });

      it("改扣款日只影响以后生成的日期，不动已补记月份清单", () => {
        const { s, rule } = midway();
        L.updateRule(s, rule.id, { day: 25 });
        expect(s.records.map((r: any) => r.date)).toEqual(["2026-06-08", "2026-07-08", "2026-08-08"]);
        expect(s.recurring[0].applied, "已补记清单不该被动过，否则旧月份会被重补一次")
          .toEqual(["2026-06", "2026-07", "2026-08"]);
        L.applyRecurring(s, "2026-09-30");
        expect(s.records.at(-1).date).toBe("2026-09-25");
      });

      it("改分类与备注", () => {
        const { s, rule } = midway();
        L.updateRule(s, rule.id, { cat: "fun", note: "UOB 手机分期" });
        expect(s.recurring[0]).toMatchObject({ cat: "fun", note: "UOB 手机分期" });
      });

      it("币种改不了 —— 一条规则不能横跨两侧", () => {
        const { s, rule } = midway();
        expect(() => L.updateRule(s, rule.id, { currency: "MYR" })).toThrow(/币种/);
        expect(s.recurring[0].currency, "被挡下就什么都不该改").toBe("SGD");
        expect(L.outstandingOnSide(s, "MYR", "2026-09"), "更不该有钱漏到另一侧去").toBe(0);
      });

      it("金额改成 0 或负数会被挡下", () => {
        const { s, rule } = midway();
        for (const bad of [0, -5]) expect(() => L.updateRule(s, rule.id, { amount: bad })).toThrow(/金额/);
        expect(s.recurring[0].amount).toBe(180);
      });

      it("剩余期数填负数或非整数会被挡下", () => {
        const { s, rule } = midway();
        for (const bad of [-1, 2.5, "五期"]) expect(() => L.updateRule(s, rule.id, { remaining: bad })).toThrow(/期/);
        expect(s.recurring[0].terms).toBe(12);
      });

      it("编辑不写入任何记录 —— 规则对记录仍然是单向的", () => {
        const { s, rule } = midway();
        const before = JSON.stringify(s.records);
        L.updateRule(s, rule.id, { amount: 999, day: 20, cat: "fun", note: "改过", remaining: 2 });
        expect(JSON.stringify(s.records), "编辑不该让规则获得反向写入记录的能力").toBe(before);
      });

      it("表单里的「还剩几期」是总期数减去已补记的期数，无限期则留空", () => {
        const { s } = midway();
        expect(L.unappliedTerms(s.recurring[0])).toBe(9);
        const rent = L.addRule(s, { type: "expense", amount: 1200, currency: "SGD", cat: "home", day: 1, from: "2026-06" });
        expect(L.unappliedTerms(rent)).toBeNull();
      });

      it("找得到本月已经记下的那一笔，好让编辑后能跳过去看", () => {
        const { s, rule } = midway();
        expect(L.appliedRecordOf(s, rule.id, "2026-08")).toMatchObject({ date: "2026-08-08", amount: 180 });
      });

      it("首期设在下月、本月还没有记录时，找不到那一笔 —— 界面据此不弹提示", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 180, currency: "SGD", cat: "other_e", day: 8, from: "2026-09", terms: 6 });
        L.applyRecurring(s, "2026-08-15");
        expect(L.appliedRecordOf(s, rule.id, "2026-08")).toBeNull();
      });
    });

    // 首期默认值：扣款日已过就假定本月那期还过了，默认下月。使用者可以改。
    describe("首期默认落在本月还是下月", () => {
      it("扣款日还没到，默认本月", () => {
        expect(L.defaultFirstMonth("2026-03-10", 25)).toBe("2026-03");
      });

      it("扣款日已经过了，默认下月 —— 免得把还过的那期又记一笔", () => {
        expect(L.defaultFirstMonth("2026-03-26", 25)).toBe("2026-04");
      });

      it("今天正是扣款日，算还没过，默认本月", () => {
        expect(L.defaultFirstMonth("2026-03-25", 25)).toBe("2026-03");
      });

      it("扣款日 31 号遇上二月，按当月最后一天判断", () => {
        expect(L.defaultFirstMonth("2026-02-27", 31)).toBe("2026-02");
        expect(L.defaultFirstMonth("2026-02-28", 31), "2 月 28 号就是这个月的扣款日").toBe("2026-02");
      });
    });

    // 「该记哪一天、记了没、日期到了没」是补记与预测**共用**的一份判定（#124）。
    // 两处各写一遍的话，预测会说房租还没记、补记逻辑却已经记下了，同一笔钱被减两次
    // —— 而且帐面上完全看不出异常。所以这里直接钉住这份判定本身。
    describe("该记哪一天、记了没 —— 补记与预测共用的同一份判定", () => {
      /** 25 号扣的房租，从三月起，无限期。 */
      function rent() {
        const s = crossBorder();
        return L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 25, from: "2026-03", note: "房租" });
      }

      it("应记日期还没到 → 不该补记（预测要的「本月还没到日子」就是这一格）", () => {
        const slot = L.dueOf(rent(), "2026-03", "2026-03-10");
        expect(slot).toMatchObject({ date: "2026-03-25", applied: false, arrived: false, due: false });
      });

      it("日期到了又还没记 → 该补记。当天就算到了", () => {
        expect(L.dueOf(rent(), "2026-03", "2026-03-25")).toMatchObject({ arrived: true, due: true });
        expect(L.dueOf(rent(), "2026-03", "2026-03-26")).toMatchObject({ arrived: true, due: true });
      });

      it("已经补记过的月份不算 —— 补记一次之后同一格就不该再说「该记」", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 25, from: "2026-03" });
        L.applyRecurring(s, "2026-03-26");
        expect(L.dueOf(rule, "2026-03", "2026-03-26"), "记过了就不能再被判成该记，否则同一笔钱记两次")
          .toMatchObject({ applied: true, due: false });
      });

      it("超过最后一期的月份根本不成立 —— 那个月这条分期已经不存在了", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 3 });
        expect(L.dueOf(rule, "2026-03", "2026-12-31"), "第三期就是最后一期").toMatchObject({ due: true });
        expect(L.dueOf(rule, "2026-04", "2026-12-31"), "过了最后一期不该还剩一格给人补记").toBeNull();
      });

      it("首期之前的月份同样不成立", () => {
        expect(L.dueOf(rent(), "2026-02", "2026-12-31")).toBeNull();
      });

      it("无限期的规则在任何一个未来月份都成立 —— 它没有「完」这回事", () => {
        expect(L.dueOf(rent(), "2099-12", "2099-12-31")).toMatchObject({ date: "2099-12-25", due: true });
      });

      it("应记日期遇上当月没有的日子时缩到当月最后一天", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 100, currency: "SGD", cat: "home", day: 31, from: "2026-01" });
        expect(L.dueOf(rule, "2026-02", "2026-12-31").date, "2 月没有 31 号，那一期不该被跳过").toBe("2026-02-28");
      });

      it("到期按月份算，不按已补记的笔数 —— 手动删掉中间那一笔也不往后顺延", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 3 });
        L.applyRecurring(s, "2026-02-15");
        const victim = s.records.find((r: any) => r.date === "2026-02-01");
        L.removeRecord(s, victim.id);
        expect(L.dueOf(rule, "2026-04", "2026-12-31"), "删掉一笔不该让分期多长出第四个月").toBeNull();
      });

      it("「今天」是传进去的，不是问系统时间来的 —— 同一份状态换个今天就换个答案", () => {
        const rule = rent();
        expect(L.dueOf(rule, "2026-03", "2026-03-24").due).toBe(false);
        expect(L.dueOf(rule, "2026-03", "2026-03-25").due).toBe(true);
      });

      it("被判成「该记」的那些，正是再跑一次补记时会被记下的那些", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 25, from: "2026-01", note: "房租" });
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 5, from: "2026-02", terms: 2, note: "手机" });
        const today = "2026-03-10";
        const months = ["2026-01", "2026-02", "2026-03"];

        const predicted = s.recurring.flatMap((rule: any) =>
          months.map(m => L.dueOf(rule, m, today)).filter((slot: any) => slot?.due).map((slot: any) => slot.date),
        );
        const before = s.records.length;
        L.applyRecurring(s, today);
        const actual = s.records.slice(before).map((r: any) => r.date);

        expect(actual.slice().sort(), "预测与补记必须是同一份判定，否则同一笔钱会既算已记又算待发生")
          .toEqual(predicted.slice().sort());
        expect(actual).not.toContain("2026-03-25");   // 三月的房租还没到日子
      });
    });
  });

  // ── 7. 单币种回归 ──────────────────────────────────────
  // 「不打扰没有跨境需求的人」的守门测试
  describe("单币种回归：只有主币种时，一切与升级前一致", () => {
    function single() {
      const s = L.defaultState();
      L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-03-01" });
      L.addRecord(s, { type: "expense", amount: 400, currency: "SGD", cat: "food", date: "2026-03-02" });
      L.addRecord(s, { type: "expense", amount: 120, currency: "SGD", cat: "traffic", date: "2026-03-03" });
      return s;
    }

    it("只有一侧 —— 切换器与汇款入口没有东西可渲染", () => {
      const s = single();
      expect(L.sides(s)).toEqual(["SGD"]);
      expect(L.hasSecondary(s)).toBe(false);
      expect(L.otherSide(s, "SGD"), "没有对侧，转帐无从谈起").toBeNull();
    });

    it("汇总、累计、分类占比与二元时代同一个答案", () => {
      const s = single();
      expect(L.monthlySummary(s, "SGD", "2026-03")).toMatchObject({ income: 3000, expense: 520, net: 2480 });
      expect(L.cumulative(s, "SGD")).toBe(2480);
      const b = L.categoryBreakdown(s, "SGD", "2026-03", "expense");
      expect(b.total).toBe(520);
      expect(b.rows.map((r: any) => r.cat)).toEqual(["food", "traffic"]);
    });

    it("记帐永远落在主币种那一侧，不用碰币种", () => {
      const s = single();
      expect(L.activeSide(s)).toBe("SGD");
      const r = L.addRecord(s, { type: "expense", amount: 10, currency: undefined, cat: "food", date: "2026-03-04" });
      expect(r.currency).toBe("SGD");
    });

    it("v1 迁上来的单币种帐本也一样只有一侧", () => {
      const s = L.migrate(v1Fixture());
      expect(L.sides(s)).toEqual(["NT$"]);
      expect(L.hasSecondary(s)).toBe(false);
    });

    it("加了第二币种，切换器才有东西可渲染", () => {
      const s = single();
      L.setSecondaryCurrency(s, "myr");
      expect(L.sides(s), "币种代号一律转大写").toEqual(["SGD", "MYR"]);
      expect(L.hasSecondary(s)).toBe(true);
      expect(L.otherSide(s, "SGD")).toBe("MYR");
    });

    it("第二币种不能与主币种相同", () => {
      const s = single();
      expect(() => L.setSecondaryCurrency(s, "SGD")).toThrow();
      expect(L.hasSecondary(s)).toBe(false);
    });

    it("删第二币种前，能问出那一侧还有多少笔", () => {
      const s = single();
      L.setSecondaryCurrency(s, "MYR");
      L.addRecord(s, { type: "expense", amount: 50, currency: "MYR", cat: "food", date: "2026-03-05" });
      L.addTransfer(s, { amount: 100, currency: "SGD", toAmount: 340, toCurrency: "MYR", date: "2026-03-06" });
      expect(L.countOnSide(s, "MYR"), "转帐也挂在马币那侧上，要一起算进去").toBe(2);
    });

    it("也能问出那一侧还挂着几条固定收支 —— 会继续生长的是规则，不是记录", () => {
      const s = single();
      L.setSecondaryCurrency(s, "MYR");
      L.addRule(s, { type: "expense", amount: 300, currency: "MYR", cat: "health", day: 10, from: "2026-01" });
      L.addRule(s, { type: "income", amount: 500, currency: "MYR", cat: "salary", day: 1, from: "2026-01" });
      L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 1, from: "2026-01" });
      expect(L.countRulesOnSide(s, "MYR")).toBe(2);
      expect(L.countRulesOnSide(s, "SGD")).toBe(1);
    });

    it("记帐默认落在上次用的那一侧", () => {
      const s = single();
      L.setSecondaryCurrency(s, "MYR");
      L.addRecord(s, { type: "expense", amount: 50, currency: "MYR", cat: "food", date: "2026-03-05" });
      expect(L.activeSide(s), "过了关记一笔马币，接下来每一笔都不该再问一次").toBe("MYR");
    });
  });

  // ── 8. 预算 ────────────────────────────────────────────
  describe("预算：只对所属侧生效", () => {
    function budgeted() {
      const s = crossBorder();
      L.setBudget(s, "SGD", 1500);
      L.addRecord(s, { type: "expense", amount: 400, currency: "SGD", cat: "food", date: "2026-03-02" });
      L.addRecord(s, { type: "expense", amount: 900, currency: "MYR", cat: "food", date: "2026-03-03" });
      return s;
    }

    it("只吃本侧的支出", () => {
      const s = budgeted();
      const sgd = L.budgetStatus(s, "SGD", "2026-03");
      expect(sgd).toMatchObject({ budget: 1500, spent: 400, left: 1100, over: false });
    });

    it("没设预算的那一侧就是没有预算，不会去借另一侧的", () => {
      const s = budgeted();
      expect(L.budgetOf(s, "MYR")).toBe(0);
      expect(L.budgetStatus(s, "MYR", "2026-03")).toBeNull();
    });

    it("两侧各设各的，互不干扰", () => {
      const s = budgeted();
      L.setBudget(s, "MYR", 800);
      expect(L.budgetStatus(s, "SGD", "2026-03")).toMatchObject({ spent: 400, over: false });
      expect(L.budgetStatus(s, "MYR", "2026-03")).toMatchObject({ budget: 800, spent: 900, left: -100, over: true });
    });

    it("转帐不吃预算 —— 汇款不是花钱", () => {
      const s = budgeted();
      L.addTransfer(s, { amount: 1200, currency: "SGD", toAmount: 4080, toCurrency: "MYR", date: "2026-03-10" });
      expect(L.budgetStatus(s, "SGD", "2026-03")).toMatchObject({ spent: 400, over: false });
    });

    it("设成 0 等于取消", () => {
      const s = budgeted();
      L.setBudget(s, "SGD", 0);
      expect(L.budgetStatus(s, "SGD", "2026-03")).toBeNull();
    });
  });

  // ── 9. 刷卡 ────────────────────────────────────────────
  // 刷卡是**支出上的一个标记**，不是第四种记录类型、不是一侧、不是一个分类。
  // 它在消费当天就记成支出，其他方面跟现金一模一样（#125）。
  describe("刷卡：支出上的一个标记", () => {
    /** 一笔刷卡的餐饮、一笔现金的交通。 */
    function withCard() {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-03", note: "晚餐", card: true });
      L.addRecord(s, { type: "expense", amount: 12, currency: "SGD", cat: "traffic", date: "2026-08-03", note: "巴士" });
      return s;
    }
    const byNote = (s: any, note: string) => s.records.find((r: any) => r.note === note);

    it("勾了就带着标记，没勾的记录连这个字段都不长", () => {
      const s = withCard();
      expect(L.isCard(byNote(s, "晚餐"))).toBe(true);
      expect(L.isCard(byNote(s, "巴士"))).toBe(false);
      expect("card" in byNote(s, "巴士"), "没勾就不该留一个 false 在那里").toBe(false);
    });

    it("存下去、读回来，标记还在 —— 逐字段救援必须显式认得它", () => {
      const s = withCard();
      const back = L.loadState(JSON.stringify(s)).state;
      expect(L.isCard(byNote(back, "晚餐")), "救援不认得这个字段的话，勾了卡的记录重开 app 就变回没勾").toBe(true);
      expect(L.isCard(byNote(back, "巴士"))).toBe(false);
    });

    it("旧资料迁移后一律不是刷卡，且没有任何一笔帐被改动", () => {
      const v1 = L.migrate(v1Fixture());
      expect(v1.records.some((r: any) => L.isCard(r)), "升级不该替使用者猜哪几笔是刷的").toBe(false);
      expect(L.hasCard(v1)).toBe(false);
      expect(L.monthlySummary(v1, "NT$", "2026-03"), "多一个可选字段不该动到任何一个既有数字")
        .toMatchObject({ income: 3000, expense: 30, net: 2970 });
    });

    it("收入上标不起来 —— 收入不必回答一个没有意义的问题", () => {
      const s = crossBorder();
      const r = L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-08-01", card: true });
      expect(L.isCard(r)).toBe(false);
    });

    it("改成收入时标记被清掉，再改回支出也不会复活", () => {
      const s = withCard();
      const r = byNote(s, "晚餐");
      L.updateRecord(s, r.id, { type: "income", cat: "bonus" });
      expect("card" in L.findRecord(s, r.id), "留一个隐形的旗标，改回支出时它会突然复活").toBe(false);
      L.updateRecord(s, r.id, { type: "expense", cat: "food" });
      expect(L.isCard(L.findRecord(s, r.id))).toBe(false);
    });

    it("改成转帐时标记同样被清掉", () => {
      const s = withCard();
      const r = byNote(s, "晚餐");
      L.updateRecord(s, r.id, { type: "transfer", toAmount: 200, toCurrency: "MYR" });
      expect("card" in L.findRecord(s, r.id)).toBe(false);
    });

    it("编辑时取消勾选，标记就真的没了", () => {
      const s = withCard();
      const r = byNote(s, "晚餐");
      L.updateRecord(s, r.id, { type: "expense", cat: "food", card: false });
      expect(L.isCard(L.findRecord(s, r.id))).toBe(false);
    });

    it("勾选状态记住上次，下一笔默认沿用（比照 lastSide）", () => {
      const s = crossBorder();
      expect(L.activeCard(s), "全新的一本帐默认不勾").toBe(false);
      L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-03", card: true });
      expect(L.activeCard(s)).toBe(true);
      L.addRecord(s, { type: "expense", amount: 12, currency: "SGD", cat: "traffic", date: "2026-08-04" });
      expect(L.activeCard(s), "这一笔没勾，下一笔就不该替他勾上").toBe(false);
    });

    it("上次勾了没跟着帐本一起存下来 —— 不然重开 app 又要重勾", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-03", card: true });
      expect(L.activeCard(L.loadState(JSON.stringify(s)).state)).toBe(true);
    });

    it("收入不会改动上次勾了没 —— 记收入时那个勾选框根本不出现", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-03", card: true });
      L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-08-05" });
      expect(L.activeCard(s)).toBe(true);
    });

    it("整本帐从没出现过刷卡记录时，界面据此可以整块不创建", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 12, currency: "SGD", cat: "traffic", date: "2026-08-03" });
      expect(L.hasCard(s)).toBe(false);
      L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-03", card: true });
      expect(L.hasCard(s), "第一次勾着存下去时，界面就是靠这个判断该不该弹说明").toBe(true);
    });

    // 回归：刷卡的钱在消费当天就离开了，所以它在其余每一个数字里都跟现金一模一样。
    it("照常进分类占比、预算条、月结余 —— 这些数字的口径一个都没变", () => {
      const s = withCard();
      L.setBudget(s, "SGD", 500);
      L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-08-01" });

      expect(L.monthlySummary(s, "SGD", "2026-08")).toMatchObject({ income: 3000, expense: 80, net: 2920 });
      expect(L.budgetStatus(s, "SGD", "2026-08")).toMatchObject({ spent: 80, left: 420 });
      expect(L.categoryBreakdown(s, "SGD", "2026-08", "expense").rows[0]).toMatchObject({ cat: "food", amount: 68 });
      expect(L.cumulative(s, "SGD")).toBe(2920);
      expect(L.trend(s, "SGD", "2026-08", 1)).toEqual([{ month: "2026-08", income: 3000, expense: 80 }]);
    });

    it("标了刷卡不影响分期的期次、还剩几期与待还小计", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-08", terms: 12 });
      L.applyRecurring(s, "2026-08-15");
      const auto = s.records.find((r: any) => r.ruleId);
      L.updateRecord(s, auto.id, { card: true });

      expect(L.termOf(s, L.findRecord(s, auto.id)), "一笔刷卡的分期仍然是第 1 期")
        .toMatchObject({ index: 1, total: 12 });
      expect(L.remainingTerms(s.recurring[0], "2026-08")).toBe(11);
      expect(L.outstandingOnSide(s, "SGD", "2026-08")).toBe(4400);
    });

    it("CSV 与备份照旧 —— #125 不加任何新的统计数字", () => {
      const s = withCard();
      expect(L.toCSV(s).split("\r\n")).toHaveLength(3);   // 表头 + 两笔
      expect(L.loadState(JSON.stringify(s)).state.records).toHaveLength(2);
    });

    // 「本月刷卡」≈ 下个月要还的钱（#126）。它**绝不叫「待还」** —— 那个词已经属于
    // 分期（outstandingOnSide），同一页两个「待还」是最容易让人算错帐的一次撞车。
    describe("本月刷卡：这一侧、这个自然月，带刷卡标记的支出合计", () => {
      /** 两侧都刷过卡的一本帐。 */
      function spent() {
        const s = crossBorder();
        L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-03", card: true });
        L.addRecord(s, { type: "expense", amount: 32.5, currency: "SGD", cat: "daily", date: "2026-08-20", card: true });
        L.addRecord(s, { type: "expense", amount: 12, currency: "SGD", cat: "traffic", date: "2026-08-21" });
        L.addRecord(s, { type: "expense", amount: 300, currency: "MYR", cat: "family", date: "2026-08-09", card: true });
        return s;
      }

      it("只算带标记的支出，现金那几笔不算", () => {
        expect(L.cardSpentOnSide(spent(), "SGD", "2026-08")).toBe(100.5);
      });

      it("两侧各算各的，永不相加", () => {
        const s = spent();
        expect(L.cardSpentOnSide(s, "MYR", "2026-08"), "马币那侧只该看见马币那笔").toBe(300);
        expect(L.cardSpentOnSide(s, "SGD", "2026-08")).toBe(100.5);
      });

      it("按自然月切，上个月刷的不算进这个月 —— 这功能第一天就不能说谎", () => {
        const s = spent();
        L.addRecord(s, { type: "expense", amount: 999, currency: "SGD", cat: "food", date: "2026-07-31", card: true });
        expect(L.cardSpentOnSide(s, "SGD", "2026-08"), "七月刷的钱算进八月，就正是这个功能要修的那个错").toBe(100.5);
        expect(L.cardSpentOnSide(s, "SGD", "2026-07")).toBe(999);
      });

      it("转帐不在其中 —— 汇款不是刷卡，也不进任何一侧的收支汇总", () => {
        const s = spent();
        L.addTransfer(s, { amount: 1200, currency: "SGD", toAmount: 4080, toCurrency: "MYR", date: "2026-08-10" });
        expect(L.cardSpentOnSide(s, "SGD", "2026-08")).toBe(100.5);
        expect(L.cardSpentOnSide(s, "MYR", "2026-08")).toBe(300);
      });

      it("有过刷卡记录、但这个月一笔都没刷时是 0 ——「这个月我没刷卡」是一条看得见的信息", () => {
        const s = spent();
        expect(L.hasCard(s), "整本帐有过刷卡记录，所以这一行该出现").toBe(true);
        expect(L.cardSpentOnSide(s, "SGD", "2026-09")).toBe(0);
      });

      it("从来不刷卡的人根本没有这一行 —— 不是显示 0，是它没被创建", () => {
        const s = crossBorder();
        L.addRecord(s, { type: "expense", amount: 12, currency: "SGD", cat: "traffic", date: "2026-08-21" });
        expect(L.hasCard(s)).toBe(false);
      });

      it("派生值，不存 —— 取消一笔的标记，合计当场跟着变", () => {
        const s = spent();
        const r = s.records.find((x: any) => x.amount === 68);
        L.updateRecord(s, r.id, { type: "expense", cat: "food", card: false });
        expect(L.cardSpentOnSide(s, "SGD", "2026-08"), "合计存下来就会有第二个真相").toBe(32.5);
      });

      it("规则补记出来的记录也算进去 —— 否则最稳定的那一块被系统性漏掉", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 15.9, currency: "SGD", cat: "fun", day: 2, from: "2026-08", note: "订阅", card: true });
        L.applyRecurring(s, "2026-08-15");
        expect(L.cardSpentOnSide(s, "SGD", "2026-08")).toBe(15.9);
      });

      it("跟分期的「待还」是两个数，互不干扰 —— 同一页上不能是同一个词", () => {
        const s = spent();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-08", terms: 12 });
        L.applyRecurring(s, "2026-08-15");
        expect(L.outstandingOnSide(s, "SGD", "2026-08"), "待还是分期还要付出去的钱").toBe(4400);
        expect(L.cardSpentOnSide(s, "SGD", "2026-08"), "本月刷卡只数带标记的那几笔，自动补记的那笔还没标").toBe(100.5);
      });
    });

    // 订阅、保费、卡上的分期是刷卡消费里最稳定的一块，而它们在这个 app 里是**规则**
    // 不是记录。规则标不了刷卡的话，「本月刷卡」会系统性偏小（#127）。
    describe("固定收支与分期也能标成刷卡", () => {
      /** 一条刷卡的订阅、一条现金的房租。 */
      function rules() {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 15.9, currency: "SGD", cat: "fun", day: 2, from: "2026-08", note: "订阅", card: true });
        L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 25, from: "2026-08", note: "房租" });
        return s;
      }
      const byNote = (s: any, note: string) => s.recurring.find((r: any) => r.note === note);

      it("规则带得起这个标记，没勾的规则连这个字段都不长", () => {
        const s = rules();
        expect(L.isCard(byNote(s, "订阅"))).toBe(true);
        expect("card" in byNote(s, "房租")).toBe(false);
      });

      it("存下去、读回来，规则的标记还在 —— 救援同样必须认得它", () => {
        const back = L.loadState(JSON.stringify(rules())).state;
        expect(L.isCard(byNote(back, "订阅")), "丢掉的话订阅会静静变回现金，本月刷卡跟着偏小").toBe(true);
      });

      it("补记出来的每一笔继承规则的标记 —— 不必每个月手动去勾", () => {
        const s = rules();
        L.applyRecurring(s, "2026-10-15");
        const auto = s.records.filter((r: any) => r.cat === "fun");
        expect(auto).toHaveLength(3);
        expect(auto.every((r: any) => L.isCard(r))).toBe(true);
        expect(s.records.filter((r: any) => r.cat === "home").every((r: any) => L.isCard(r)), "现金的房租不该被标上").toBe(false);
      });

      it("收入的规则标不起来 —— 收入不会刷卡", () => {
        const s = crossBorder();
        const rule = L.addRule(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", day: 1, from: "2026-08", card: true });
        expect(L.isCard(rule)).toBe(false);
      });

      it("改成收入时规则的标记被清掉，再改回支出也不会复活", () => {
        const s = rules();
        const rule = byNote(s, "订阅");
        L.updateRule(s, rule.id, { type: "income", cat: "bonus" });
        expect("card" in L.updateRule(s, rule.id, { type: "expense", cat: "fun" })).toBe(false);
      });

      it("改标记只管以后 —— 当月已经记下的那一笔不碰", () => {
        const s = rules();
        L.applyRecurring(s, "2026-08-15");
        const done = s.records.find((r: any) => r.cat === "fun");
        L.updateRule(s, byNote(s, "订阅").id, { card: false });
        expect(L.isCard(L.findRecord(s, done.id)), "已经记下的那一笔是使用者眼睛看得见的，编辑规则不该回头改它").toBe(true);
        L.applyRecurring(s, "2026-09-15");
        expect(L.isCard(s.records.find((r: any) => r.date.startsWith("2026-09"))), "九月那笔才跟着新的标记走").toBe(false);
      });

      it("现有规则的日期一律不动 —— 那是跟银行账单对得上的唯一线索", () => {
        const s = rules();
        L.updateRule(s, byNote(s, "房租").id, { card: true });
        expect(byNote(s, "房租").day, "标上刷卡不该动到扣款日").toBe(25);
        L.applyRecurring(s, "2026-08-31");
        expect(s.records.find((r: any) => r.cat === "home").date).toBe("2026-08-25");
      });

      // 回归：多一个标记不该动到分期原本的每一个数字
      it("期次、还剩几期、待还小计都不因为多了刷卡标记而改变", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-08", terms: 12, note: "手机", card: true });
        L.applyRecurring(s, "2026-09-15");
        const rule = byNote(s, "手机");
        expect(L.termOf(s, s.records[1])).toMatchObject({ index: 2, total: 12 });
        expect(L.remainingTerms(rule, "2026-09")).toBe(10);
        expect(L.outstandingOnSide(s, "SGD", "2026-09")).toBe(4000);
        expect(L.cardSpentOnSide(s, "SGD", "2026-09")).toBe(400);
      });

      it("分期到期仍按月份算，不按已补记笔数 —— 标了刷卡也一样", () => {
        const s = crossBorder();
        L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-08", terms: 3, card: true });
        L.applyRecurring(s, "2026-09-15");
        const victim = s.records.find((r: any) => r.date === "2026-09-01");
        L.removeRecord(s, victim.id);
        L.applyRecurring(s, "2027-01-15");
        expect(s.records.map((r: any) => r.date)).toEqual(["2026-08-01", "2026-10-01"]);
      });
    });
  });

  // ── 10. 月底预计结余 ───────────────────────────────────
  // 固定收支要到那一天才补记，所以 25 号才扣的房租在 13 号看不到 —— 月中的「本月结余」
  // 永远偏乐观。这一段把「还没发生但确定会发生」的那部分算进来（#128）。
  describe("月底预计结余：把本月还没到日子的固定收支也算进来", () => {
    /** 薪水 1 号进、房租 25 号扣，两笔手动记的支出。 */
    function payday() {
      const s = crossBorder();
      L.addRule(s, { type: "income", amount: 4000, currency: "SGD", cat: "salary", day: 1, from: "2026-08", note: "薪水" });
      L.addRule(s, { type: "expense", amount: 1800, currency: "SGD", cat: "home", day: 25, from: "2026-08", note: "房租" });
      L.applyRecurring(s, "2026-08-13");     // 薪水已经进来了，房租还没
      L.addRecord(s, { type: "expense", amount: 200, currency: "SGD", cat: "food", date: "2026-08-05" });
      L.addRecord(s, { type: "expense", amount: 100, currency: "SGD", cat: "daily", date: "2026-08-12" });
      return s;
    }

    it("确定值 = 已记净额 + 本月待发生的固定收支净额", () => {
      const s = payday();
      expect(L.monthlySummary(s, "SGD", "2026-08"), "已记的：薪水进了，房租还没").toMatchObject({ income: 4000, expense: 300, net: 3700 });
      expect(L.pendingRecurring(s, "SGD", "2026-08", "2026-08-13")).toMatchObject({ income: 0, expense: 1800, net: -1800 });
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-08-13").certain, "月中就要看得见 25 号的房租，否则这个数一直骗人").toBe(1900);
    });

    it("已补记过的月份不重复计入 —— 房租一记下，待发生就空了", () => {
      const s = payday();
      L.applyRecurring(s, "2026-08-25");
      expect(L.pendingRecurring(s, "SGD", "2026-08", "2026-08-25").net).toBe(0);
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-08-25").certain, "确定值不该因为那笔钱真的记下了就变").toBe(1900);
    });

    it("超过最后一期的分期不计入", () => {
      const s = crossBorder();
      L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 25, from: "2026-06", terms: 2 });
      L.applyRecurring(s, "2026-08-13");
      expect(L.pendingRecurring(s, "SGD", "2026-08", "2026-08-13").net, "六七月两期就还完了，八月不该再冒出一期").toBe(0);
    });

    it("按侧各算各的，两侧永不相加", () => {
      const s = payday();
      L.addRule(s, { type: "expense", amount: 300, currency: "MYR", cat: "family", day: 20, from: "2026-08", note: "家用" });
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-08-13").certain).toBe(1900);
      expect(L.projectedNet(s, "MYR", "2026-08", "2026-08-13").certain, "马币那侧只该看见马币那条规则").toBe(-300);
    });

    it("「今天」是传进去的 —— 同一份状态，换个今天就换个答案", () => {
      const s = payday();
      expect(L.pendingRecurring(s, "SGD", "2026-08", "2026-08-24").net, "24 号房租还没扣").toBe(-1800);
      expect(L.pendingRecurring(s, "SGD", "2026-08", "2026-08-25").net, "25 号当天就算到了，它不再是「待发生」").toBe(0);
    });

    it("被判为待发生的那些，正是再跑一次补记时**不会**被记下的那些", () => {
      const s = payday();
      const today = "2026-08-13";
      const pending = L.pendingRecurring(s, "SGD", "2026-08", today);
      const before = s.records.length;
      L.applyRecurring(s, today);
      expect(s.records.length, "还没到日子的那几条，补记也不该记下来").toBe(before);
      expect(pending.expense, "两份判定漂开的话，房租会既算已记又算待发生，同一笔钱减两次").toBe(1800);
    });

    it("过去的月份没有待发生 —— 那个月的日子全过完了", () => {
      const s = payday();
      L.applyRecurring(s, "2026-09-30");
      expect(L.pendingRecurring(s, "SGD", "2026-08", "2026-09-30").net).toBe(0);
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-09-30").certain, "历史数字不该自己漂移")
        .toBe(L.monthlySummary(s, "SGD", "2026-08").net);
    });

    it("派生值，不存 —— 多记一笔支出，预计结余当场跟着变", () => {
      const s = payday();
      L.addRecord(s, { type: "expense", amount: 50, currency: "SGD", cat: "food", date: "2026-08-13" });
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-08-13").certain).toBe(1850);
    });

    it("刷卡的支出照常算进去 —— 刷卡本来就是支出，这一层不必认识那个标记", () => {
      const s = payday();
      L.addRecord(s, { type: "expense", amount: 68, currency: "SGD", cat: "food", date: "2026-08-13", card: true });
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-08-13").certain).toBe(1832);
    });

    it("转帐不进预计结余 —— 汇款不是花钱，与 monthlySummary 同口径", () => {
      const s = payday();
      L.addTransfer(s, { amount: 1200, currency: "SGD", toAmount: 4080, toCurrency: "MYR", date: "2026-08-10" });
      expect(L.projectedNet(s, "SGD", "2026-08", "2026-08-13").certain).toBe(1900);
    });
  });

  // ── 导出与备份 ─────────────────────────────────────────
  describe("导出与备份", () => {
    it("CSV 每一行都带币种", () => {
      const s = crossBorder();
      L.addRecord(s, { type: "expense", amount: 30, currency: "SGD", cat: "food", date: "2026-03-01", note: "早餐" });
      L.addRecord(s, { type: "expense", amount: 250, currency: "MYR", cat: "food", date: "2026-03-03" });
      const csv = L.toCSV(s);
      const lines = csv.split("\r\n");
      expect(lines[0]).toContain("币种");
      expect(lines[1]).toContain('"SGD"');
      expect(lines[2]).toContain('"MYR"');
    });

    it("转帐在 CSV 里摊成两行，各带自己的币种", () => {
      const s = crossBorder();
      L.addTransfer(s, { amount: 2000, currency: "SGD", toAmount: 6800, toCurrency: "MYR", date: "2026-03-10" });
      const lines = L.toCSV(s).split("\r\n");
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('"转出"');
      expect(lines[1]).toContain('"SGD"');
      expect(lines[2]).toContain('"转入"');
      expect(lines[2]).toContain('"MYR"');
    });

    it("备份 JSON 里有币种设定与转帐记录，还原之后整本帐是完整的", () => {
      const s = crossBorder();
      L.setBudget(s, "MYR", 800);
      L.addRecord(s, { type: "income", amount: 3000, currency: "SGD", cat: "salary", date: "2026-03-01" });
      L.addTransfer(s, { amount: 2000, currency: "SGD", toAmount: 6800, toCurrency: "MYR", date: "2026-03-10" });

      const restored = L.loadState(JSON.stringify(s)).state;
      expect(restored.currency).toBe("SGD");
      expect(restored.currency2).toBe("MYR");
      expect(L.budgetOf(restored, "MYR")).toBe(800);
      expect(L.cumulative(restored, "SGD")).toBe(1000);
      expect(L.cumulative(restored, "MYR")).toBe(6800);
      expect(restored.records.filter((r: any) => L.isTransfer(r))).toHaveLength(1);
    });
  });

  // ── 金额显示 ───────────────────────────────────────────
  describe("金额格式", () => {
    it("字母代号后面留一个空格，符号型的贴着", () => {
      expect(L.formatMoney(1234.5, "SGD")).toBe("SGD 1,234.5");
      expect(L.formatMoney(1234.5, "NT$")).toBe("NT$1,234.5");
    });

    it("用简体中文的数字格式，不是台湾的", () => {
      expect(L.formatMoney(1234567, "MYR")).toBe("MYR 1,234,567");
    });
  });

  // ── 改主币种 ───────────────────────────────────────────
  describe("改主币种", () => {
    it("挂在旧主币种上的一切跟着改名，那一侧不会失联", () => {
      const s = L.migrate(v1Fixture());
      L.setBudget(s, "NT$", 20000);
      L.setPrimaryCurrency(s, "SGD");

      expect(L.sides(s)).toEqual(["SGD"]);
      expect(L.budgetOf(s, "SGD")).toBe(20000);
      expect(L.monthlySummary(s, "SGD", "2026-03")).toMatchObject({ income: 3000, expense: 30 });
      expect(s.recurring[0].currency).toBe("SGD");
      expect(L.cumulative(s, "NT$"), "旧币种那一侧应该已经空了").toBe(0);
    });

    it("分期跟着改名，待还小计不会留在旧币种那一侧", () => {
      const s = L.defaultState();
      L.addRule(s, { type: "expense", amount: 400, currency: "SGD", cat: "other_e", day: 1, from: "2026-01", terms: 12 });
      L.setPrimaryCurrency(s, "MYR");
      expect(s.recurring[0].currency).toBe("MYR");
      expect(s.recurring[0].terms, "改币种不该动到期数").toBe(12);
      expect(L.outstandingOnSide(s, "MYR", "2026-03")).toBe(4000);
      expect(L.outstandingOnSide(s, "SGD", "2026-03"), "旧币种那一侧应该已经空了").toBe(0);
    });

    it("不能改成与第二币种相同", () => {
      const s = crossBorder();
      expect(() => L.setPrimaryCurrency(s, "MYR")).toThrow();
      expect(s.currency).toBe("SGD");
    });
  });
});
