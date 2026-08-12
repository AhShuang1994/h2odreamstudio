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

    it("不能改成与第二币种相同", () => {
      const s = crossBorder();
      expect(() => L.setPrimaryCurrency(s, "MYR")).toThrow();
      expect(s.currency).toBe("SGD");
    });
  });
});
