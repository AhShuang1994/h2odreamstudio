/**
 * 挂票告示板。
 *
 * bot 只当告示板：票、证件号、钱都不经过它，只存
 * 方向 / 日期 / 班次 / 几张 / 原价 / 票上男女。出事时手上什么都没有。
 *
 * 原价从 KTMB 抓，不让他自己填 —— 一来全程不用打字，二来
 * 「不能加价」这条规矩才有个能对照的锚。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2026-09-06";
const NOW = () => new Date("2026-08-21T08:00Z");

const env = (DB) => ({ DB, OKU_BASELINE: "4", TELEGRAM_BOT_TOKEN: "fake" });
const msg = (chatId, text) => ({ message: { chat: { id: chatId }, text } });
const tap = (chatId, data) => ({
  callback_query: { id: "1", message: { chat: { id: chatId } }, data },
});

const trains = { [`${KJ}|${DATE}`]: [trip(1840, 4), trip(2100, 6)] };
const listings = (db) => rows(db, "SELECT * FROM listings ORDER BY id");
const userOf = (db, id) => rows(db, `SELECT * FROM users WHERE chat_id = ${id}`)[0];

function ctx(users = [{ chat_id: 111 }]) {
  const db = freshDb();
  seed(db, { users });
  const tg = recorder();
  return { db, tg, deps: { send: tg.send, search: fakeSearch(trains), now: NOW } };
}

/** 走完整条挂票菜单 */
async function share(db, deps, chatId = 111, hm = 1840, qty = 1, gender = "M") {
  await handleUpdate(msg(chatId, "/share"), env(db), deps);
  await handleUpdate(tap(chatId, "s:dir:KJ"), env(db), deps);
  await handleUpdate(tap(chatId, `s:date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(chatId, `s:tr:KJ:${DATE}:${hm}`), env(db), deps);
  await handleUpdate(tap(chatId, `s:qty:${qty}`), env(db), deps);
  await handleUpdate(tap(chatId, `s:g:${gender}`), env(db), deps);
}

/* ---------- 挂上去 ---------- */

test("走完菜单就挂上去了，全程不用打字", async () => {
  const { db, tg, deps } = ctx();
  await share(db, deps);

  const l = listings(db);
  assert.equal(l.length, 1);
  assert.equal(l[0].chat_id, 111);
  assert.equal(l[0].direction, "KJ");
  assert.equal(l[0].date, DATE);
  assert.equal(l[0].hour_minute, 1840);
  assert.equal(l[0].qty, 1);
  assert.equal(l[0].gender, "M");
  assert.equal(l[0].active, 1);
});

test("原价从 KTMB 抓，不是他自己填的", async () => {
  const { db, deps } = ctx();
  await share(db, deps);

  assert.equal(listings(db)[0].fare, "MYR 27.00");
});

test("免费会员也能挂票 —— 他们就是供货的那一边", async () => {
  const { db, deps } = ctx([{ chat_id: 111, points: 0 }]);
  await share(db, deps);

  assert.equal(listings(db).length, 1);
});

test("不在名单上的人挂不了", async () => {
  const { db, tg, deps } = ctx([]);
  await handleUpdate(msg(999, "/share"), env(db), deps);

  assert.equal(listings(db).length, 0);
  assert.match(tg.sent[0].text, /邀请制/);
});

/* ---------- 第一次挂票送试用 ---------- */

test("第一次挂票 → 30 天试用", async () => {
  const { db, tg, deps } = ctx();
  await share(db, deps);

  const u = userOf(db, 111);
  assert.equal(u.trial_until, "2026-09-20T08:00:00.000Z");
  assert.match(tg.sent.at(-1).text, /试用/);
});

test("第二次挂票不再送 —— 一辈子一次", async () => {
  const { db, tg, deps } = ctx();
  await share(db, deps, 111, 1840);
  await share(db, deps, 111, 2100);

  assert.equal(listings(db).length, 2, "票照挂");
  assert.equal(
    userOf(db, 111).trial_until,
    "2026-09-20T08:00:00.000Z",
    "试用不顺延，不然每次到期再挂一张就永远免费",
  );
});

/* ---------- 挂上去要推给在盯那班车的付费会员 ---------- */

test("推给正在盯那班车的付费会员", async () => {
  const { db, tg, deps } = ctx([
    { chat_id: 111 },
    { chat_id: 222, points: 5 },
  ]);
  seed(db, {
    watches: [{ chat_id: 222, direction: "KJ", date: DATE, trains: [1840] }],
  });
  await share(db, deps);

  const pushed = tg.to(222);
  assert.equal(pushed.length, 1);
  assert.match(pushed[0].text, /18:40/);
  assert.match(JSON.stringify(pushed[0].keyboard ?? []), /want:\d+/);
});

test("免费会员盯着也收不到推送 —— 推送是付费的东西", async () => {
  const { db, tg, deps } = ctx([
    { chat_id: 111 },
    { chat_id: 333, points: 0 },
  ]);
  seed(db, {
    watches: [{ chat_id: 333, direction: "KJ", date: DATE, trains: [1840] }],
  });
  await share(db, deps);

  assert.equal(tg.to(333).length, 0);
});

test("试用中的人收得到", async () => {
  const { db, tg, deps } = ctx([
    { chat_id: 111 },
    { chat_id: 444, points: 0, trial_until: "2026-12-01T00:00:00.000Z" },
  ]);
  seed(db, {
    watches: [{ chat_id: 444, direction: "KJ", date: DATE, trains: [1840] }],
  });
  await share(db, deps);

  assert.equal(tg.to(444).length, 1);
});

test("盯别班车的人不会被吵到", async () => {
  const { db, tg, deps } = ctx([
    { chat_id: 111 },
    { chat_id: 222, points: 5 },
  ]);
  seed(db, {
    watches: [{ chat_id: 222, direction: "KJ", date: DATE, trains: [2100] }],
  });
  await share(db, deps, 111, 1840);

  assert.equal(tg.to(222).length, 0);
});

test("挂票的人不会收到自己的推送", async () => {
  const { db, tg, deps } = ctx([{ chat_id: 111, points: 5 }]);
  seed(db, {
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
  });
  await share(db, deps);

  assert.equal(tg.to(111).filter((m) => /有人挂了/.test(m.text)).length, 0);
});

/* ---------- /list ---------- */

test("/list 看得到挂着的票，含班次、张数、男女", async () => {
  const { db, tg, deps } = ctx();
  await share(db, deps, 111, 1840, 2, "F");
  tg.sent.length = 0;

  await handleUpdate(msg(111, "/list"), env(db), deps);

  const out = tg.sent.map((s) => s.text).join("\n");
  assert.match(out, /18:40/);
  assert.match(out, /2 张/);
  assert.match(out, /女/);
});

test("/list 空的时候讲清楚，别给一片空白", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(111, "/list"), env(db), deps);

  assert.match(tg.sent[0].text, /目前没有/);
});

test("免费会员打得开 /list", async () => {
  const { db, tg, deps } = ctx([{ chat_id: 111, points: 0 }]);
  await share(db, deps);
  tg.sent.length = 0;

  await handleUpdate(msg(111, "/list"), env(db), deps);
  assert.match(tg.sent.map((s) => s.text).join(""), /18:40/);
});

/* ---------- 我要这张 / 卖掉了 ---------- */

test("按「我要这张」→ bot 私讯卖家，不是直接给联络方式", async () => {
  const { db, tg, deps } = ctx([{ chat_id: 111 }, { chat_id: 222, points: 5 }]);
  await share(db, deps);
  tg.sent.length = 0;

  await handleUpdate(tap(222, "want:1"), env(db), deps);

  const toSeller = tg.to(111);
  assert.equal(toSeller.length, 1, "卖家要收到「有人要你那张票」");
  assert.match(toSeller[0].text, /18:40/);
  assert.equal(tg.to(222).length, 1, "买家也要收到一句「已经帮你转告」");
});

test("卖家按「卖掉了」就下架", async () => {
  const { db, tg, deps } = ctx();
  await share(db, deps);

  await handleUpdate(tap(111, "sold:1"), env(db), deps);
  assert.equal(listings(db)[0].active, 0);
});

test("别人按不掉你的票", async () => {
  const { db, tg, deps } = ctx([{ chat_id: 111 }, { chat_id: 222, points: 5 }]);
  await share(db, deps);

  await handleUpdate(tap(222, "sold:1"), env(db), deps);
  assert.equal(listings(db)[0].active, 1);
});

test("下架的票不再出现在 /list", async () => {
  const { db, tg, deps } = ctx();
  await share(db, deps);
  await handleUpdate(tap(111, "sold:1"), env(db), deps);
  tg.sent.length = 0;

  await handleUpdate(msg(111, "/list"), env(db), deps);
  assert.match(tg.sent[0].text, /目前没有/);
});

test("车开走的票不再出现在 /list", async () => {
  const { db, tg } = ctx();
  seed(db, {
    listings: [{ chat_id: 111, direction: "KJ", date: "2026-08-01", hour_minute: 1840 }],
  });
  const deps = { send: (c, t, k) => tg.send(c, t, k), now: NOW };

  await handleUpdate(msg(111, "/list"), env(db), deps);
  assert.match(tg.sent[0].text, /目前没有/);
});
