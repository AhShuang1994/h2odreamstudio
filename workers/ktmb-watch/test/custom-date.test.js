/**
 * 「其他日期」那个手动输入要有边界。
 *
 * 不限制的话，一个人打个明年的日期，就占掉一条线路额度整整一年 ——
 * 那是 MAX_ROUTES 里的一格，别人就少一格。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const MY = (iso) => new Date(`${iso}Z`);
const NOW = () => MY("2026-08-21T08:00"); // 马来西亚时间礼拜五早上八点

const env = (DB) => ({ DB, OKU_BASELINE: "4", MAX_DAYS_AHEAD: "28" });

const msg = (text) => ({ message: { chat: { id: 111 }, text } });
const tap = (data) => ({
  callback_query: { id: "1", message: { chat: { id: 111 } }, data },
});

function ctx(extraTrains = {}) {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, points: 5 }] });
  const tg = recorder();
  const search = fakeSearch({
    [`${KJ}|2026-08-23`]: [trip(1026, 9), trip(2100, 4)],
    [`${KJ}|2026-09-18`]: [trip(2100, 4)],
    [`${KJ}|2026-08-21`]: [trip(1026, 9), trip(2100, 4)],
    ...extraTrains,
  });
  return { db, tg, deps: { send: tg.send, search, now: NOW } };
}

/** 走到「其他日期」那一步 */
async function toCustomDate(db, deps) {
  await handleUpdate(tap("dir:KJ"), env(db), deps);
  await handleUpdate(tap("date:KJ:other"), env(db), deps);
}

test("过去的日期要挡", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("2026-08-01"), env(db), deps);

  assert.match(tg.sent.at(-1).text, /已经过了/);
  assert.equal(rows(db, "SELECT * FROM watches").length, 0);
});

test("超过四个星期的要挡，并讲清楚最远能到哪天", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("2026-12-25"), env(db), deps);

  const out = tg.sent.at(-1).text;
  assert.match(out, /2026-09-18/, "要告诉他最远那天是哪天，别只说不行");
  assert.equal(rows(db, "SELECT * FROM watches").length, 0);
});

test("正好第 28 天可以", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("2026-09-18"), env(db), deps);

  assert.match(tg.sent.at(-1).text, /21:00/, "该列出班次了");
});

test("第 29 天不行", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("2026-09-19"), env(db), deps);

  assert.match(tg.sent.at(-1).text, /最远/);
});

test("今天可以", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("2026-08-21"), env(db), deps);

  assert.match(tg.sent.at(-1).text, /21:00/);
});

test("格式乱打要挡", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("下个礼拜天"), env(db), deps);

  assert.match(tg.sent.at(-1).text, /2026-08-16|格式/);
});

test("选今天的话，已经开走的班次不该出现在勾选清单里", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);
  await handleUpdate(msg("2026-08-21"), env(db), deps); // 现在是早上八点

  const buttons = (tg.sent.at(-1).keyboard ?? []).flat().map((b) => b.text).join(" ");
  assert.match(buttons, /10:26/, "10:26 还没开，要能勾");
  assert.match(buttons, /21:00/);
});

test("选今天且车都开走了，就说清楚而不是给一张空单", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(tap("dir:KJ"), env(db), {
    ...deps,
    now: () => MY("2026-08-21T23:30"),
  });
  await handleUpdate(tap("date:KJ:other"), env(db), {
    ...deps,
    now: () => MY("2026-08-21T23:30"),
  });
  await handleUpdate(msg("2026-08-21"), env(db), {
    ...deps,
    now: () => MY("2026-08-21T23:30"),
  });

  const out = tg.sent.at(-1).text;
  assert.match(out, /都开走了|没有还没开的/);
  assert.equal((tg.sent.at(-1).keyboard ?? []).flat().length, 0);
});

test("按钮列的礼拜日也不能超过四个星期", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(tap("dir:KJ"), env(db), deps);

  const { last } = { last: "2026-09-18" };
  const dates = (tg.sent.at(-1).keyboard ?? [])
    .flat()
    .map((b) => b.callback_data)
    .filter((d) => d.startsWith("date:KJ:2"))
    .map((d) => d.slice(8));

  assert.ok(dates.length > 0, "至少要有一个礼拜日可选");
  for (const d of dates) {
    assert.ok(d <= last, `${d} 超过四个星期了，按钮不该列出来`);
  }
});

test("旧按钮带一个远期日期打进来，也要挡", async () => {
  // 手打限四个星期、按钮却绕得过去，是最容易被钻的那种不一致
  const { db, tg, deps } = ctx({ [`${KJ}|2026-12-25`]: [trip(2100, 9)] });
  await handleUpdate(tap("dir:KJ"), env(db), deps);
  await handleUpdate(tap("date:KJ:2026-12-25"), env(db), deps);

  assert.match(tg.sent.at(-1).text, /太远|最远/);
  assert.equal(rows(db, "SELECT * FROM drafts")[0].date, null, "不该把草稿推进去");
});

test("提示语要先讲清楚可选范围，省得来回试", async () => {
  const { db, tg, deps } = ctx();
  await toCustomDate(db, deps);

  const prompt = tg.sent.at(-1).text;
  assert.match(prompt, /2026-08-21/, "最早那天");
  assert.match(prompt, /2026-09-18/, "最远那天");
});
