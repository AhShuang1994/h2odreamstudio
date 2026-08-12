/**
 * 小帐本 · ledger 核心
 *
 * 状态与推导，**不碰 DOM、不碰 localStorage** —— 载入用的原始字符串由外层传进来，
 * 写入也由外层负责。这是本 app 唯一的测试接缝（见 #98）：给定一份状态与一串操作，
 * 断言得到什么新状态、什么派生数字。
 *
 * 领域词汇见 CONTEXT.md，决策见 adr/0001-currency-as-side.md。通篇使用那份词汇表：
 * **侧 / 主币种 / 第二币种 / 转帐 / 到帐金额 / 家用**。
 *
 * 这一层存在的理由：加了「转帐」之后记录类型从二元变三元，而二元判断散在 8 处渲染
 * 函数里。收敛到这里之后，**只有这个文件需要认识第三种类型**。
 */

export const SCHEMA_VERSION = 2;

/** 预设主币种。新装才会用到 —— 老使用者的币种在迁移时原样保留（#98 story 28）。 */
export const DEFAULT_CURRENCY = 'SGD';

export const EXPENSE = 'expense';
export const INCOME = 'income';
export const TRANSFER = 'transfer';

const DEFAULT_CATS = {
  expense: [
    { id: 'food',    icon: '🍜', name: '餐饮' },
    { id: 'daily',   icon: '🛒', name: '日用' },
    { id: 'traffic', icon: '🚌', name: '交通' },
    { id: 'fun',     icon: '🎬', name: '娱乐' },
    { id: 'home',    icon: '🏠', name: '居家' },
    { id: 'family',  icon: '👪', name: '家用' },
    { id: 'health',  icon: '💊', name: '医疗' },
    { id: 'learn',   icon: '📚', name: '学习' },
    { id: 'other_e', icon: '📦', name: '其他' }
  ],
  income: [
    { id: 'salary',  icon: '💼', name: '薪水' },
    { id: 'bonus',   icon: '🎁', name: '奖金' },
    { id: 'invest',  icon: '📈', name: '投资' },
    { id: 'other_i', icon: '✨', name: '其他' }
  ]
};

/** 全新的一本帐。 */
export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    currency: DEFAULT_CURRENCY,   // 主币种：必填，唯一
    currency2: null,              // 第二币种：可选，至多一个。有没有它就是唯一的「模式」
    lastSide: null,               // 上次记帐落在哪一侧（story 8）
    budgets: {},                  // 按币种各持一份月预算
    cats: structuredCloneish(DEFAULT_CATS),
    recurring: [],
    records: []
  };
}

// —— 小工具 ————————————————————————————————————————————————

/** structuredClone 在旧 Safari 上没有，而这个 app 就是给手机用的。 */
function structuredCloneish(v) {
  return JSON.parse(JSON.stringify(v));
}

export function pad(n) { return String(n).padStart(2, '0'); }
export function dateOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function monthOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }

export function shiftMonth(m, delta) {
  const [y, mo] = m.split('-').map(Number);
  return monthOf(new Date(y, mo - 1 + delta, 1));
}

/** 两个月份相差几个月。用于按月份算期数，而不是数已补记的笔数。 */
export function monthsBetween(from, to) {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** 这个月的最后一天是几号 —— 2 月没有 31 号。 */
function lastDayOfMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** 金额一律收敛到分，避免浮点误差在累计里越滚越大。 */
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** 币种代号：去空白、转大写。符号型的旧值（NT$、$）原样保留。 */
export function normalizeCurrency(code) {
  const s = String(code ?? '').trim();
  return /^[a-z]+$/i.test(s) ? s.toUpperCase() : s;
}

// —— 迁移 ————————————————————————————————————————————————

function sanitizeCats(raw) {
  const pick = (list, fallback) => {
    const ok = Array.isArray(list)
      ? list.filter(c => c && typeof c === 'object' && typeof c.id === 'string')
          .map(c => ({ id: c.id, icon: String(c.icon ?? '🏷️'), name: String(c.name ?? c.id) }))
      : [];
    return ok.length ? ok : structuredCloneish(fallback);
  };
  return {
    expense: pick(raw?.expense, DEFAULT_CATS.expense),
    income: pick(raw?.income, DEFAULT_CATS.income)
  };
}

/** 一条记录能不能救得回来 —— 缺了这些字段就没有意义，只能丢掉这一条。 */
function sanitizeRecord(r, primary) {
  if (!r || typeof r !== 'object') return null;
  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null;
  if (!date) return null;

  const amount = round2(r.amount);
  if (!(amount > 0)) return null;

  const base = {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    date,
    amount,
    // v1 的记录没有币种 —— 全部归给主币种（story 28）
    currency: normalizeCurrency(r.currency || primary) || primary,
    note: typeof r.note === 'string' ? r.note : ''
  };
  if (typeof r.ruleId === 'string') base.ruleId = r.ruleId;

  if (r.type === TRANSFER) {
    const toAmount = round2(r.toAmount);
    const toCurrency = normalizeCurrency(r.toCurrency);
    // 转帐少了对侧就不成其为转帐，也没法算汇率 —— 丢掉，别留一半
    if (!(toAmount > 0) || !toCurrency) return null;
    return { ...base, type: TRANSFER, toAmount, toCurrency };
  }

  const type = r.type === INCOME ? INCOME : EXPENSE;
  return { ...base, type, cat: typeof r.cat === 'string' ? r.cat : '' };
}

function sanitizeRule(r, primary) {
  if (!r || typeof r !== 'object') return null;
  const amount = round2(r.amount);
  if (!(amount > 0)) return null;
  const day = Math.min(31, Math.max(1, Math.round(Number(r.day)) || 1));
  const from = typeof r.from === 'string' && /^\d{4}-\d{2}$/.test(r.from) ? r.from : null;
  if (!from) return null;
  const rule = {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    type: r.type === INCOME ? INCOME : EXPENSE,
    amount,
    currency: normalizeCurrency(r.currency || primary) || primary,
    cat: typeof r.cat === 'string' ? r.cat : '',
    day,
    note: typeof r.note === 'string' ? r.note : '',
    from,
    applied: Array.isArray(r.applied) ? r.applied.filter(m => typeof m === 'string') : []
  };
  // 期数坏掉只丢这个字段、退回无限期 —— 丢掉整条规则的话，使用者会莫名少一笔帐（#117）
  if (Number.isInteger(r.terms) && r.terms >= 1) rule.terms = r.terms;
  return rule;
}

/**
 * 任意输入 → 一份合法的 v2 状态。
 *
 * **逐字段救援**：某一条记录烂掉只丢那一条，不会连累整本帐；某个字段类型不对就回退
 * 到该字段的预设值，而不是整份回退成空白帐本。
 */
export function migrate(data) {
  const base = defaultState();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return base;

  // v1 的 state.currency 是纯显示前缀，v2 里它就是主币种 —— 原样接手，
  // 这样老使用者升级后看到的数字跟升级前对得上。
  const primary = normalizeCurrency(data.currency) || DEFAULT_CURRENCY;
  const secondary = normalizeCurrency(data.currency2);

  const state = {
    version: SCHEMA_VERSION,
    currency: primary,
    currency2: secondary && secondary !== primary ? secondary : null,
    lastSide: null,
    budgets: {},
    cats: sanitizeCats(data.cats),
    recurring: [],
    records: []
  };

  // v1 的单一预算归给主币种；v2 的 budgets 按币种各取各的
  if (data.budgets && typeof data.budgets === 'object' && !Array.isArray(data.budgets)) {
    for (const [code, v] of Object.entries(data.budgets)) {
      const c = normalizeCurrency(code);
      const n = round2(v);
      if (c && n > 0) state.budgets[c] = n;
    }
  } else {
    const legacy = round2(data.budget);
    if (legacy > 0) state.budgets[primary] = legacy;
  }

  if (Array.isArray(data.records)) {
    state.records = data.records.map(r => sanitizeRecord(r, primary)).filter(Boolean);
  }
  if (Array.isArray(data.recurring)) {
    state.recurring = data.recurring.map(r => sanitizeRule(r, primary)).filter(Boolean);
  }

  const last = normalizeCurrency(data.lastSide);
  if (last && sides(state).includes(last)) state.lastSide = last;

  return state;
}

/**
 * 从 localStorage 的原始字符串还原。
 *
 * `corrupt` 为真时**外层绝不能回存** —— 拿预设值覆盖掉一份读不懂的资料，
 * 就是把使用者几个月的帐真正弄丢的那一步。
 */
export function loadState(raw) {
  if (raw == null || raw === '') return { state: defaultState(), corrupt: false, fresh: true };
  try {
    return { state: migrate(JSON.parse(raw)), corrupt: false, fresh: false };
  } catch {
    return { state: defaultState(), corrupt: true, fresh: false };
  }
}

// —— 侧 ————————————————————————————————————————————————————

/** 这本帐有哪几侧。只有主币种时长度为 1 —— 切换器与汇款入口就不会被创建。 */
export function sides(state) {
  return state.currency2 ? [state.currency, state.currency2] : [state.currency];
}

export function hasSecondary(state) {
  return Boolean(state.currency2);
}

/** 另一侧是谁。只有一侧时为 null。 */
export function otherSide(state, currency) {
  const s = sides(state);
  return s.length < 2 ? null : (s[0] === currency ? s[1] : s[0]);
}

export function isTransfer(r) {
  return r.type === TRANSFER;
}

/** 记帐时该默认落在哪一侧。 */
export function activeSide(state) {
  const s = sides(state);
  return state.lastSide && s.includes(state.lastSide) ? state.lastSide : state.currency;
}

export function setActiveSide(state, currency) {
  if (sides(state).includes(currency)) state.lastSide = currency;
  return state;
}

/** 加第二币种。只问币种代号这一件事（story 3）。 */
export function setSecondaryCurrency(state, code) {
  const c = normalizeCurrency(code);
  if (!c) throw new Error('请输入币种代号');
  if (c === state.currency) throw new Error('第二币种不能与主币种相同');
  state.currency2 = c;
  return state;
}

/** 这一侧上挂着多少笔记录 —— 删第二币种前要拿它去问使用者（story 36）。 */
export function countOnSide(state, currency) {
  return state.records.filter(r => touchesSide(r, currency)).length;
}

/**
 * 这一侧上挂着多少条固定收支 —— 删第二币种前也要拿它去问使用者（#116）。
 * 记录是死的，规则才是会继续生长的那个东西，所以两个数都要说。
 */
export function countRulesOnSide(state, currency) {
  return state.recurring.filter(r => r.currency === currency).length;
}

export function removeSecondaryCurrency(state) {
  state.currency2 = null;
  if (state.lastSide && !sides(state).includes(state.lastSide)) state.lastSide = null;
  return state;
}

/** 改主币种。原本挂在旧主币种上的一切跟着改名，否则那一侧会整个失联。 */
export function setPrimaryCurrency(state, code) {
  const c = normalizeCurrency(code);
  if (!c) throw new Error('主币种不能留空');
  const old = state.currency;
  if (c === old) return state;
  if (c === state.currency2) throw new Error('主币种不能与第二币种相同');

  for (const r of state.records) {
    if (r.currency === old) r.currency = c;
    if (r.toCurrency === old) r.toCurrency = c;
  }
  for (const rule of state.recurring) {
    if (rule.currency === old) rule.currency = c;
  }
  if (state.budgets[old] != null) {
    state.budgets[c] = state.budgets[old];
    delete state.budgets[old];
  }
  if (state.lastSide === old) state.lastSide = c;
  state.currency = c;
  return state;
}

/** 这条记录跟这一侧有没有关系 —— 转帐同时挂在两侧上。 */
export function touchesSide(r, currency) {
  return r.currency === currency || (isTransfer(r) && r.toCurrency === currency);
}

/**
 * 这条记录让这一侧的钱多了还是少了。
 *
 * 这是全 app 唯一认识三种类型的地方。转帐在两侧上各有一次相反的影响，
 * 加起来净值不变 —— 钱只是搬了地方，没有离开你。
 */
export function signedDelta(r, currency) {
  if (isTransfer(r)) {
    let d = 0;
    if (r.currency === currency) d -= r.amount;
    if (r.toCurrency === currency) d += r.toAmount;
    return round2(d);
  }
  if (r.currency !== currency) return 0;
  return r.type === INCOME ? r.amount : -r.amount;
}

// —— 查询 ————————————————————————————————————————————————

export function recordsOfSide(state, currency) {
  return state.records.filter(r => touchesSide(r, currency));
}

export function recordsOfMonth(state, currency, month) {
  return state.records.filter(r => r.date.startsWith(month) && touchesSide(r, currency));
}

/**
 * 一侧一个月的收入 / 支出 / 结余。
 *
 * **转帐不进收入也不进支出**（story 15）—— 把钱搬到马币那侧不是花掉，
 * 记成支出的话月结余会长期失真，这正是这张票要修的问题。
 */
export function monthlySummary(state, currency, month) {
  let income = 0, expense = 0;
  for (const r of state.records) {
    if (!r.date.startsWith(month) || r.currency !== currency || isTransfer(r)) continue;
    if (r.type === INCOME) income += r.amount; else expense += r.amount;
  }
  return { currency, income: round2(income), expense: round2(expense), net: round2(income - expense) };
}

/**
 * 这一侧还剩多少 —— 定义是**使用本 app 以来这一侧的净流入**，不是银行户口余额。
 * 不引入期初余额（ADR-0001）。界面上的措辞必须让这一点自明。
 */
export function cumulative(state, currency) {
  return round2(state.records.reduce((s, r) => s + signedDelta(r, currency), 0));
}

/** 分类占比。转帐不在其中 —— 汇款不再盖住真实的消费结构。 */
export function categoryBreakdown(state, currency, month, type) {
  const byCat = new Map();
  let total = 0;
  for (const r of state.records) {
    if (isTransfer(r) || r.type !== type) continue;
    if (r.currency !== currency || !r.date.startsWith(month)) continue;
    byCat.set(r.cat, round2((byCat.get(r.cat) || 0) + r.amount));
    total = round2(total + r.amount);
  }
  const rows = [...byCat.entries()]
    .map(([cat, amount]) => ({ cat, amount, pct: total ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
  return { total, rows };
}

/** 近 n 个月的收支趋势，仍然只属于这一侧。 */
export function trend(state, currency, month, n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = shiftMonth(month, -i);
    const { income, expense } = monthlySummary(state, currency, m);
    out.push({ month: m, income, expense });
  }
  return out;
}

// —— 汇率 ————————————————————————————————————————————————

/**
 * 这次换了多少。**派生值，不存** —— 存下来会与两个金额产生第二个真相，
 * 改了金额而忘了改它，帐本就开始自相矛盾。
 */
export function rateOf(record) {
  if (!isTransfer(record) || !(record.amount > 0) || !(record.toAmount > 0)) return null;
  return record.toAmount / record.amount;
}

// —— 预算 ————————————————————————————————————————————————

export function budgetOf(state, currency) {
  return round2(state.budgets?.[currency] || 0);
}

export function setBudget(state, currency, amount) {
  const n = Math.max(0, round2(amount));
  state.budgets ||= {};
  if (n > 0) state.budgets[currency] = n; else delete state.budgets[currency];
  return state;
}

/** 预算只对所属侧生效。没设就返回 null，界面据此决定要不要画那根进度条。 */
export function budgetStatus(state, currency, month) {
  const budget = budgetOf(state, currency);
  if (!(budget > 0)) return null;
  const { expense } = monthlySummary(state, currency, month);
  return {
    budget,
    spent: expense,
    left: round2(budget - expense),
    pct: Math.min(100, (expense / budget) * 100),
    over: expense > budget
  };
}

// —— 增删改 ————————————————————————————————————————————————

/** 记一笔支出或收入。币种决定它属于哪一侧。 */
export function addRecord(state, { type, amount, currency, cat, date, note, ruleId }) {
  const rec = {
    id: newId(),
    type: type === INCOME ? INCOME : EXPENSE,
    amount: round2(amount),
    currency: normalizeCurrency(currency) || state.currency,
    cat: cat || '',
    date,
    note: note || ''
  };
  if (!(rec.amount > 0)) throw new Error('金额要大于 0');
  if (ruleId) rec.ruleId = ruleId;
  state.records.push(rec);
  setActiveSide(state, rec.currency);
  return rec;
}

/**
 * 建一笔转帐。
 *
 * **一条记录，两个金额** —— 走出的与到帐的。拆成两条就再也算不出汇率，
 * 而且改错时会拆散、删除时可能只删一半（ADR-0001 已否）。
 */
export function addTransfer(state, { amount, currency, toAmount, toCurrency, date, note }) {
  const rec = {
    id: newId(),
    type: TRANSFER,
    amount: round2(amount),
    currency: normalizeCurrency(currency) || state.currency,
    toAmount: round2(toAmount),
    toCurrency: normalizeCurrency(toCurrency),
    date,
    note: note || ''
  };
  if (!(rec.amount > 0)) throw new Error('请填走出的金额');
  if (!(rec.toAmount > 0)) throw new Error('请填到帐金额');
  if (!rec.toCurrency || rec.toCurrency === rec.currency) throw new Error('转帐要跨两个不同的币种');
  state.records.push(rec);
  return rec;
}

export function findRecord(state, id) {
  return state.records.find(r => r.id === id) || null;
}

/** 改一笔。转帐的两个金额同属一条记录，所以改一次两侧一起改（story 12）。 */
export function updateRecord(state, id, patch) {
  const i = state.records.findIndex(r => r.id === id);
  if (i < 0) return null;
  const prev = state.records[i];
  const next = { ...prev, ...patch };

  next.amount = round2(next.amount);
  if (!(next.amount > 0)) throw new Error('金额要大于 0');
  next.currency = normalizeCurrency(next.currency) || state.currency;

  if (next.type === TRANSFER) {
    next.toAmount = round2(next.toAmount);
    next.toCurrency = normalizeCurrency(next.toCurrency);
    if (!(next.toAmount > 0)) throw new Error('请填到帐金额');
    if (!next.toCurrency || next.toCurrency === next.currency) throw new Error('转帐要跨两个不同的币种');
    delete next.cat;
  } else {
    delete next.toAmount;
    delete next.toCurrency;
  }

  state.records[i] = next;
  if (!isTransfer(next)) setActiveSide(state, next.currency);
  return next;
}

/** 删一笔。转帐是一条记录，所以两侧同时回退（story 12）。 */
export function removeRecord(state, id) {
  const before = state.records.length;
  state.records = state.records.filter(r => r.id !== id);
  return state.records.length < before;
}

// —— 每月固定收支 ————————————————————————————————————————

export function addRule(state, { type, amount, currency, cat, day, note, from, terms }) {
  const rule = {
    id: newId(),
    type: type === INCOME ? INCOME : EXPENSE,
    amount: round2(amount),
    currency: normalizeCurrency(currency) || state.currency,
    cat: cat || '',
    day: Math.min(31, Math.max(1, Math.round(Number(day)) || 1)),
    note: note || '',
    from: from || monthOf(new Date()),
    applied: []
  };
  if (!(rule.amount > 0)) throw new Error('金额要大于 0');

  // 期数留空 = 一直重复，所以「没填」与「填错」必须分开：没填就不长这个字段，
  // 填错要当场说清楚，绝不悄悄退回无限期，也不建出一笔生下来就结束的分期（#117）
  if (terms != null && terms !== '') {
    const n = Number(terms);
    if (!Number.isInteger(n) || n < 1) throw new Error('期数要填 1 以上的整数，留空表示一直重复');
    rule.terms = n;
  }

  state.recurring.push(rule);
  return rule;
}

// —— 分期 ————————————————————————————————————————————————
//
// 分期就是有期数的固定收支。**期数含首期在内** —— 填 1 表示那个月就还完。
// 到期判定按月份算（首期往后数「总期数 − 1」个月），不按已补记的笔数：使用者
// 手动删掉中间某个月那一笔时，分期仍然在原本那个月结束，与银行那边的日历对齐。
//
// 下面全是派生值，一个都不存 —— 存下来就会与期数产生第二个真相（同 rateOf）。

export function isInstallment(rule) {
  return Boolean(rule?.terms);
}

/** 最后一期落在哪个月。无限期返回 null。 */
export function lastTermMonth(rule) {
  return isInstallment(rule) ? shiftMonth(rule.from, rule.terms - 1) : null;
}

/**
 * 站在某个月往前看，这笔分期还剩几期 —— **含该月在内**。
 * 无限期返回 null（不是 Infinity：界面要据此决定这一行画不画期数）。
 */
export function remainingTerms(rule, month) {
  if (!isInstallment(rule)) return null;
  const last = lastTermMonth(rule);
  if (month > last) return 0;
  const start = month < rule.from ? rule.from : month;
  return monthsBetween(start, last) + 1;
}

/** 还完了没有。无限期永远是 false —— 它没有「完」这回事。 */
export function isSettled(rule, month) {
  return remainingTerms(rule, month) === 0;
}

/** 这笔分期还要付出去多少：每期金额 × 剩余期数。 */
export function outstandingOf(rule, month) {
  const left = remainingTerms(rule, month);
  return left == null ? null : round2(rule.amount * left);
}

/**
 * 这一侧的待还小计。
 *
 * **只算支出**：收入的分期是待收，性质不同，跟待还加在一起就跟把两侧相加一样
 * 没有意义。两侧之间当然更不相加（ADR-0001）。
 */
export function outstandingOnSide(state, currency, month) {
  return round2(state.recurring.reduce(
    (s, r) => s + (r.currency === currency && r.type === EXPENSE ? (outstandingOf(r, month) || 0) : 0),
    0
  ));
}

/**
 * 新增分期时，首期默认落在本月还是下月。
 *
 * 扣款日已经过了就默认下月 —— 假定本月那期已经还过，避免重复记一笔。当天不算过。
 * 使用者可以改，这只是默认值。
 */
export function defaultFirstMonth(today, day) {
  const month = today.slice(0, 7);
  const effective = Math.min(Math.max(1, Math.round(Number(day)) || 1), lastDayOfMonth(month));
  return Number(today.slice(8, 10)) > effective ? shiftMonth(month, 1) : month;
}

export function removeRule(state, id) {
  const before = state.recurring.length;
  state.recurring = state.recurring.filter(r => r.id !== id);
  return state.recurring.length < before;
}

/**
 * 把所有到期但还没记的固定收支补上，**各自落在它所属的那一侧**（story 25）。
 *
 * 每条规则自己记住已经套用过哪些月份，所以使用者手动删掉某个月的那一笔也不会被
 * 重新补回来；跨月放着不开也能一次补齐中间的每个月，不重复、不漏。
 *
 * 币种不再属于任何一侧的规则整条跳过（#116）—— 移除第二币种只是把那一侧收起来，
 * 规则还留着，不跳过的话它会一直往一个使用者看不见的地方塞记录。**跳过时不写
 * `applied`**，所以币种加回来的那一刻，中间漏掉的月份会被上面的跨月补齐一次补上：
 * 那几个月的钱确实付了，不该凭空消失。
 */
export function applyRecurring(state, today) {
  const thisMonth = today.slice(0, 7);
  const live = sides(state);
  let added = 0;

  for (const rule of state.recurring) {
    if (!live.includes(rule.currency)) continue;
    rule.applied ||= [];
    const stop = lastTermMonth(rule);              // 分期补到最后一期就停；无限期为 null
    let m = rule.from;
    while (m <= thisMonth && (stop === null || m <= stop)) {
      if (!rule.applied.includes(m)) {
        const date = `${m}-${pad(Math.min(rule.day, lastDayOfMonth(m)))}`;  // 2 月没有 31 号，缩到当月最后一天
        if (date <= today) {
          state.records.push({
            id: newId(),
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            cat: rule.cat,
            date,
            note: rule.note,
            ruleId: rule.id
          });
          rule.applied.push(m);
          added++;
        }
      }
      m = shiftMonth(m, 1);
    }
  }
  return added;
}

// —— 导出 ————————————————————————————————————————————————

/**
 * CSV。**每一行都带币种**（story 29）—— 拿去 Excel 时两种钱不会被混在一起算。
 *
 * 转帐在这里摊成两行（走出一行、到帐一行），因为一行只能有一个币种；
 * 帐本里它仍然是一条记录。
 */
export function toCSV(state, catName = (type, id) => id) {
  const rows = [['日期', '类型', '币种', '分类', '金额', '备注']];
  const sorted = state.records.slice().sort((a, b) => a.date.localeCompare(b.date));

  for (const r of sorted) {
    if (isTransfer(r)) {
      rows.push([r.date, '转出', r.currency, '转帐', r.amount, r.note || '']);
      rows.push([r.date, '转入', r.toCurrency, '转帐', r.toAmount, r.note || '']);
    } else {
      rows.push([
        r.date,
        r.type === INCOME ? '收入' : '支出',
        r.currency,
        catName(r.type, r.cat),
        r.amount,
        r.note || ''
      ]);
    }
  }

  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map(r => r.map(q).join(',')).join('\r\n');
}

/** 显示用的金额。字母代号后面加一个空格，符号型的（旧的 NT$、$）直接贴着。 */
export function formatMoney(amount, currency) {
  const n = round2(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const sep = /^[A-Z]+$/.test(currency) ? ' ' : '';
  return `${currency}${sep}${n}`;
}
