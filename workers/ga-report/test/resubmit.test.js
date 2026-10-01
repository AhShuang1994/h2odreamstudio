/**
 * 同一期报告重交：报告留原 id，建议按 key 对上就原地更新，
 * 「做了 / 不做」、开始日、实验结果、判定理由一律不丢。见 docs/adr/0011-report-resubmit-keeps-records.md
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";
import { freshDb, migrateFrom, rows } from "./helpers/d1.js";

const call = (db, method, path, body) =>
  worker.fetch(
    new Request(`https://x/app/report/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { DB: db, DEV_NO_ACCESS: "1" },
    {},
  );

const exp = (key, title, more = {}) => ({
  key,
  title,
  detail: `${title}的理由`,
  hypothesis: `${title}会有用`,
  metric: "GSC 点击率：/x",
  baseline: "1%（前 4 周）",
  check_weeks: 4,
  ...more,
});

const report = (suggestions, more = {}) => ({
  kind: "weekly",
  period_start: "2026-09-21",
  period_end: "2026-09-27",
  body: "第一版正文",
  suggestions,
  ...more,
});

const post = async (db, body) => {
  const res = await call(db, "POST", "/reports", body);
  return { status: res.status, json: await res.json() };
};

const NOTE = "点击率 1% → 2%，同期没有别的改动";

/** 交第一版，按 a「做了」并判有效、按 b「不做」。回两条的 id */
async function seed(db, suggestions = [exp("a", "改 A 页 title"), exp("b", "改 B 页描述")]) {
  const first = await post(db, report(suggestions));
  assert.equal(first.status, 201);
  const [a, b] = first.json.suggestions.map((s) => s.id);
  await call(db, "POST", `/suggestions/${a}`, { status: "done" });
  await call(db, "POST", `/suggestions/${b}`, { status: "skipped" });
  db.sqlite.exec(`UPDATE suggestions SET started_on = '2026-08-01' WHERE id = ${a}`); // 让它可以判
  assert.equal((await call(db, "POST", `/suggestions/${a}`, { result: "effective", note: NOTE })).status, 200);
  return { reportId: first.json.id, a, b };
}

/** 按过的东西：重交前后要一模一样 */
const records = (db) =>
  rows(
    db,
    `SELECT id, status, status_at, started_on, check_weeks, hypothesis, metric, baseline,
            result, result_note, result_at FROM suggestions ORDER BY id`,
  );

const count = (db, table) => rows(db, `SELECT COUNT(*) AS n FROM ${table}`)[0].n;

test("完全相同的报告重交：不多一份报告、不多一条建议、记录一样不少", async () => {
  const db = freshDb();
  const { reportId, a, b } = await seed(db);
  const before = records(db);

  for (let i = 0; i < 2; i++) {
    const again = await post(db, report([exp("a", "改 A 页 title"), exp("b", "改 B 页描述")]));
    assert.equal(again.status, 200);
    assert.equal(again.json.id, reportId);
    assert.deepEqual(again.json.suggestions.map((s) => [s.id, s.matched]), [[a, "key"], [b, "key"]]);
    assert.deepEqual(again.json.retired, []);
  }
  assert.equal(count(db, "reports"), 1);
  assert.equal(count(db, "suggestions"), 2);
  assert.deepEqual(records(db), before);

  const [row] = (await (await call(db, "GET", "/experiments")).json()).items;
  assert.deepEqual([row.id, row.result, row.result_note, row.started_on], [a, "effective", NOTE, "2026-08-01"]);
});

test("只改正文：报告 id 和第一次交的时间不变，记下重交时间", async () => {
  const db = freshDb();
  const { reportId } = await seed(db);
  const before = records(db);
  const created = rows(db, "SELECT created_at FROM reports")[0].created_at;

  await post(db, report([exp("a", "改 A 页 title"), exp("b", "改 B 页描述")], { body: "补齐数据的第二版", period_end: "2026-09-28" }));
  const [r] = await (await call(db, "GET", "/reports")).json();
  assert.deepEqual([r.id, r.body, r.period_end, r.created_at], [reportId, "补齐数据的第二版", "2026-09-28", created]);
  assert.ok(r.updated_at);
  assert.deepEqual(records(db), before);
});

test("同一个 key 改标题：还是同一条，状态与实验结果跟着走", async () => {
  const db = freshDb();
  const { a, b } = await seed(db);
  const before = records(db);

  const again = await post(db, report([exp("a", "A 页 title 加上地点"), exp("b", "B 页描述写出价格", { hypothesis: "改 B 页描述会有用" })]));
  assert.deepEqual(again.json.suggestions.map((s) => s.id), [a, b]);
  const list = (await (await call(db, "GET", "/reports")).json())[0].suggestions;
  assert.deepEqual(list.map((s) => [s.id, s.title, s.status]), [[a, "A 页 title 加上地点", "done"], [b, "B 页描述写出价格", "skipped"]]);
  assert.deepEqual(records(db), before);
});

test("实验开始了，重交不能改猜想、指标、基准、检查周数；还没开始的可以改", async () => {
  const db = freshDb();
  const { a } = await seed(db, [exp("a", "改 A"), exp("c", "改 C")]);
  const changed = { hypothesis: "新猜想", metric: "新指标", baseline: "新基准", check_weeks: 8 };

  await post(db, report([exp("a", "改 A", changed), exp("c", "改 C", changed)]));
  const [ra, rc] = rows(db, "SELECT id, hypothesis, metric, baseline, check_weeks, started_on FROM suggestions ORDER BY id");
  assert.equal(ra.id, a);
  assert.deepEqual([ra.hypothesis, ra.check_weeks, ra.started_on], ["改 A会有用", 4, "2026-08-01"]);
  // c 被按了「不做」，没有开始日，可以照新版改
  assert.deepEqual([rc.hypothesis, rc.metric, rc.baseline, rc.check_weeks], ["新猜想", "新指标", "新基准", 8]);
});

test("新增建议：加在后面，旧的不动", async () => {
  const db = freshDb();
  const { a, b } = await seed(db);
  const before = records(db);

  const again = await post(db, report([exp("a", "改 A 页 title"), exp("b", "改 B 页描述"), exp("new-page", "开新山专页")]));
  assert.deepEqual(again.json.suggestions.map((s) => s.matched), ["key", "key", "new"]);
  const list = (await (await call(db, "GET", "/reports")).json())[0].suggestions;
  assert.deepEqual(list.map((s) => [s.id === a || s.id === b, s.key, s.status]), [
    [true, "a", "done"],
    [true, "b", "skipped"],
    [false, "new-page", "open"],
  ]);
  assert.deepEqual(records(db).slice(0, 2), before);
});

test("新版省略旧建议：只标成「新版没提」，记录照留，实验照算；再提回来就拿掉标记", async () => {
  const db = freshDb();
  const { a, b } = await seed(db);
  const before = records(db);

  const again = await post(db, report([exp("b", "改 B 页描述")]));
  assert.deepEqual(again.json.retired, ["a"]);
  assert.equal(count(db, "suggestions"), 2);
  assert.deepEqual(records(db), before);

  const list = (await (await call(db, "GET", "/reports")).json())[0].suggestions;
  assert.deepEqual(list.map((s) => [s.id, !!s.retired_at]), [[b, false], [a, true]], "没提的排后面");
  const { items, summary } = await (await call(db, "GET", "/experiments")).json();
  assert.deepEqual([items[0].id, items[0].result, summary.effective], [a, "effective", 1]);

  // 整份报告不带建议也一样不删
  await post(db, report([]));
  assert.equal(count(db, "suggestions"), 2);
  assert.deepEqual(records(db), before);

  await post(db, report([exp("a", "改 A 页 title"), exp("b", "改 B 页描述")]));
  assert.deepEqual(rows(db, "SELECT retired_at FROM suggestions ORDER BY id"), [{ retired_at: null }, { retired_at: null }]);
  assert.deepEqual(records(db), before);
});

test("阿爽自己做的事重交：开始日不会被新的盖掉，她撤销过的也不会被改回「做了」", async () => {
  const db = freshDb();
  const owner = exp("gbp", "登记 Google 商家", { source: "owner", started_on: "2026-09-20" });
  const first = await post(db, report([owner, exp("x", "另一个")]));
  const [id] = first.json.suggestions.map((s) => s.id);

  await post(db, report([{ ...owner, started_on: "2026-09-25" }, exp("x", "另一个")]));
  assert.deepEqual(rows(db, `SELECT status, started_on FROM suggestions WHERE id = ${id}`), [{ status: "done", started_on: "2026-09-20" }]);

  await call(db, "POST", `/suggestions/${id}`, { status: "open" });
  await post(db, report([owner, exp("x", "另一个")]));
  assert.deepEqual(rows(db, `SELECT status, started_on FROM suggestions WHERE id = ${id}`), [{ status: "open", started_on: null }]);
});

// ── 旧格式：建议没带 key ────────────────────────────────────────────

const legacy = (s) => {
  const { key: _, ...rest } = s;
  return rest;
};

test("旧格式：系统给 key；同样的内容重交认得出来，不会多一条", async () => {
  const db = freshDb();
  const suggestions = [legacy(exp("", "改 A 页 title")), legacy(exp("", "改 B 页描述"))];
  const { a, b } = await seed(db, suggestions);
  const before = records(db);
  assert.deepEqual(rows(db, "SELECT key FROM suggestions ORDER BY id"), [{ key: `s${a}` }, { key: `s${b}` }]);

  const again = await post(db, report(suggestions, { body: "第二版" }));
  assert.deepEqual(again.json.suggestions.map((s) => [s.id, s.key, s.matched]), [[a, `s${a}`, "content"], [b, `s${b}`, "content"]]);
  assert.equal(count(db, "suggestions"), 2);
  assert.deepEqual(records(db), before);

  // 之后改用新格式，沿用 /reports 读到的系统 key，标题改了也对得上
  const keyed = await post(db, report([exp(`s${a}`, "A 页 title 加上地点"), exp(`s${b}`, "改 B 页描述")]));
  assert.deepEqual(keyed.json.suggestions.map((s) => [s.id, s.matched]), [[a, "key"], [b, "key"]]);
  assert.deepEqual(records(db), before);
});

test("旧格式改了标题（对不上）：当新建议加进去，旧的标「新版没提」，记录一样不丢", async () => {
  const db = freshDb();
  const { a, b } = await seed(db, [legacy(exp("", "改 A 页 title")), legacy(exp("", "改 B 页描述"))]);
  const before = records(db);

  const again = await post(db, report([legacy(exp("", "A 页 title 加上地点")), legacy(exp("", "改 B 页描述"))]));
  assert.deepEqual(again.json.suggestions.map((s) => s.matched), ["new", "content"]);
  assert.deepEqual(again.json.retired, [`s${a}`]);
  assert.equal(count(db, "suggestions"), 3);
  assert.deepEqual(records(db).slice(0, 2), before);
  assert.equal(again.json.suggestions[1].id, b);
});

test("换成新格式但起了新 key：内容一字不差的旧建议会被认走，key 改成新的", async () => {
  const db = freshDb();
  const { a } = await seed(db, [legacy(exp("", "改 A 页 title")), legacy(exp("", "改 B 页描述"))]);
  const before = records(db);

  const again = await post(db, report([exp("jb-title", "改 A 页 title"), exp("b-desc", "改 B 页描述")]));
  assert.deepEqual(again.json.suggestions.map((s) => s.matched), ["content", "content"]);
  assert.equal(again.json.suggestions[0].id, a);
  assert.deepEqual(rows(db, "SELECT key FROM suggestions ORDER BY id"), [{ key: "jb-title" }, { key: "b-desc" }]);
  assert.deepEqual(records(db), before);
});

test("对不上、又可能接错的 key → 400，什么都不写", async () => {
  const db = freshDb();
  await seed(db);
  const before = records(db);
  const body = rows(db, "SELECT body FROM reports")[0].body;

  const cases = [
    report([exp("s999", "冒用系统 key")]), // 系统格式的 key，这期没有
    report([exp("a", "一"), exp("a", "二")]), // 同一份里重复
    report([exp("新山", "中文 key")]),
    report([exp("A-Title", "大写")]),
    report([exp("", "空 key")]),
    report([exp(12, "数字 key")]),
  ];
  for (const c of cases) assert.equal((await post(db, c)).status, 400, JSON.stringify(c.suggestions[0].key));
  assert.deepEqual(records(db), before);
  assert.equal(rows(db, "SELECT body FROM reports")[0].body, body);
});

test("别期的报告不受影响：key 只在同一期里对", async () => {
  const db = freshDb();
  const { a } = await seed(db);
  const before = records(db);
  const other = await post(db, report([exp("a", "下一周的 A")], { period_start: "2026-09-28", period_end: "2026-10-04" }));
  assert.equal(other.status, 201);
  assert.notEqual(other.json.suggestions[0].id, a);
  assert.deepEqual(records(db).slice(0, 2), before);
});

// ── 迁移 ─────────────────────────────────────────────────────────────

test("迁移 0004：旧数据一行不少，旧建议补上系统 key，之后重交对得上", async () => {
  const db = freshDb({ before: "0004" });
  db.sqlite.exec(`
    INSERT INTO reports (kind, period_start, period_end, body, created_at)
      VALUES ('weekly', '2026-09-21', '2026-09-27', '旧报告', '2026-09-28 00:00:00');
    INSERT INTO suggestions (report_id, position, title, detail, hypothesis, metric, baseline, check_weeks,
                             status, status_at, started_on, result, result_note, result_at)
      VALUES (1, 0, '旧 A', '', 'h', 'm', 'b', 4, 'done', '2026-08-01 00:00:00', '2026-08-01', 'unclear', '样本小', '2026-09-01 00:00:00'),
             (1, 1, '旧 B', '', 'h', 'm', 'b', 4, 'skipped', '2026-08-01 00:00:00', NULL, NULL, NULL, NULL);
  `);
  const before = records(db);

  migrateFrom(db, "0004");
  assert.deepEqual(records(db), before);
  assert.deepEqual(rows(db, "SELECT key, retired_at FROM suggestions ORDER BY id"), [
    { key: "s1", retired_at: null },
    { key: "s2", retired_at: null },
  ]);

  const again = await post(db, report([exp("s1", "旧 A 改个说法"), exp("s2", "旧 B", { detail: "", hypothesis: "h", metric: "m", baseline: "b" })], { body: "重交" }));
  assert.equal(again.status, 200);
  assert.deepEqual(again.json.suggestions.map((s) => s.id), [1, 2]);
  assert.deepEqual(records(db), before, "实验已开始的 s1 不被新版的猜想、检查周数盖掉");
});
