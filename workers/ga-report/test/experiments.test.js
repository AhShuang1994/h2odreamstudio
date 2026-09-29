/**
 * 实验：建议带猜想与检查期；按「做了」那天开始计时，到期由 Claude 判结果。
 * 见 docs/adr/0010-report-experiments.md
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";
import { freshDb, rows } from "./helpers/d1.js";

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

// 开始日与到期日都按马来西亚时间算，跟报告期间同一套
const MYT = 8 * 3600000;
const daysAgo = (n) => new Date(Date.now() + MYT - n * 86400000).toISOString().slice(0, 10);
const today = () => daysAgo(0);

const experiment = {
  title: "改新山专页的 title",
  detail: "曝光有了、点击率很低。",
  hypothesis: "title 写出「新山」和价格，点击率会上来",
  metric: "GSC 点击率：/web-design-johor-bahru",
  baseline: "0.8%（前 4 周）",
  check_weeks: 4,
};

const report = (suggestions) => ({
  kind: "weekly",
  period_start: "2026-09-21",
  period_end: "2026-09-27",
  body: "这周照原计划。",
  suggestions,
});

async function postAndGetIds(db, suggestions) {
  assert.equal((await call(db, "POST", "/reports", report(suggestions))).status, 201);
  return (await (await call(db, "GET", "/reports")).json())[0].suggestions.map((s) => s.id);
}

const experiments = async (db) => (await call(db, "GET", "/experiments")).json();

test("Claude 的建议少了实验栏位 → 400，逼它把猜想和检查期写清楚", async () => {
  const db = freshDb();
  const drops = ["hypothesis", "metric", "baseline", "check_weeks"];
  for (const k of drops) {
    const { [k]: _, ...rest } = experiment;
    assert.equal((await call(db, "POST", "/reports", report([rest]))).status, 400, `少了 ${k}`);
  }
  for (const weeks of [0, 27, 2.5, "4"]) {
    assert.equal((await call(db, "POST", "/reports", report([{ ...experiment, check_weeks: weeks }]))).status, 400);
  }
  assert.equal(rows(db, "SELECT COUNT(*) AS n FROM reports")[0].n, 0);
});

test("按「做了」开始计时；撤销、不做都会清掉开始日", async () => {
  const db = freshDb();
  const [id] = await postAndGetIds(db, [experiment]);
  assert.deepEqual((await experiments(db)).items, [], "还没做的不算进实验记录");

  await call(db, "POST", `/suggestions/${id}`, { status: "done" });
  const [row] = (await experiments(db)).items;
  assert.equal(row.started_on, today());
  assert.equal(row.hypothesis, experiment.hypothesis);

  await call(db, "POST", `/suggestions/${id}`, { status: "open" });
  assert.equal(rows(db, `SELECT started_on FROM suggestions WHERE id = ${id}`)[0].started_on, null);

  await call(db, "POST", `/suggestions/${id}`, { status: "skipped" });
  assert.deepEqual((await experiments(db)).items, []);
});

test("到期：开始日 + 检查周数，到了那天才算到期", async () => {
  const db = freshDb();
  const [due, notYet] = await postAndGetIds(db, [experiment, { ...experiment, title: "另一个" }]);
  db.sqlite.exec(`
    UPDATE suggestions SET status = 'done', started_on = '${daysAgo(28)}' WHERE id = ${due};
    UPDATE suggestions SET status = 'done', started_on = '${daysAgo(27)}' WHERE id = ${notYet};
  `);
  const byId = new Map((await experiments(db)).items.map((e) => [e.id, e]));
  assert.equal(byId.get(due).check_on, today());
  assert.equal(byId.get(due).due, true);
  assert.equal(byId.get(notYet).due, false);
});

test("判结果：有效 / 无效 / 看不出，带理由；到期了没判的才算到期", async () => {
  const db = freshDb();
  const [id] = await postAndGetIds(db, [experiment]);
  db.sqlite.exec(`UPDATE suggestions SET status = 'done', started_on = '${daysAgo(30)}' WHERE id = ${id}`);

  const note = "点击率 0.8% → 2.1%，同期曝光持平";
  assert.equal((await call(db, "POST", `/suggestions/${id}`, { result: "effective", note })).status, 200);
  const [row] = (await experiments(db)).items;
  assert.deepEqual([row.result, row.result_note, row.due], ["effective", note, false]);
  assert.ok(row.result_at);

  // 阿爽不同意可以改判
  await call(db, "POST", `/suggestions/${id}`, { result: "unclear" });
  assert.equal((await experiments(db)).items[0].result, "unclear");

  assert.equal((await call(db, "POST", `/suggestions/${id}`, { result: "great" })).status, 400);
});

test("还没开始的实验不能判", async () => {
  const db = freshDb();
  const [id] = await postAndGetIds(db, [experiment]);
  assert.equal((await call(db, "POST", `/suggestions/${id}`, { result: "effective" })).status, 400);
});

test("阿爽自己做的事：Claude 带开始日记进来，直接算进行中", async () => {
  const db = freshDb();
  const owner = { ...experiment, title: "登记 Google 商家资料", source: "owner", started_on: "2026-09-20" };
  assert.equal((await call(db, "POST", "/reports", report([{ ...owner, started_on: undefined }]))).status, 400);
  assert.equal((await call(db, "POST", "/reports", report([{ ...owner, source: "someone" }]))).status, 400);

  await postAndGetIds(db, [owner]);
  const [row] = (await experiments(db)).items;
  assert.deepEqual([row.source, row.status, row.started_on], ["owner", "done", "2026-09-20"]);
});

test("成绩：有效 / 无效 / 看不出 / 进行中各几个；旧建议（没有检查期）不算实验", async () => {
  const db = freshDb();
  const ids = await postAndGetIds(db, [
    experiment,
    { ...experiment, title: "b" },
    { ...experiment, title: "c" },
    { ...experiment, title: "d" },
  ]);
  db.sqlite.exec(`
    UPDATE suggestions SET status = 'done', started_on = '${daysAgo(40)}';
    UPDATE suggestions SET result = 'effective' WHERE id = ${ids[0]};
    UPDATE suggestions SET result = 'ineffective' WHERE id = ${ids[1]};
    UPDATE suggestions SET result = 'unclear' WHERE id = ${ids[2]};
    INSERT INTO suggestions (report_id, position, title, detail, status, started_on)
      VALUES (${rows(db, "SELECT id FROM reports")[0].id}, 9, '旧建议', '', 'done', '${daysAgo(40)}');
  `);
  const { summary, items } = await experiments(db);
  assert.deepEqual(summary, { effective: 1, ineffective: 1, unclear: 1, running: 1 });
  assert.equal(items.length, 4);
});
