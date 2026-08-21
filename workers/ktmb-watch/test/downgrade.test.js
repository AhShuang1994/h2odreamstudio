/**
 * 盯梢的闸门，以及点数归零 / 试用到期时的降级。
 *
 * 最要命的失败模式是「装死」—— 他以为有人在帮他盯，其实没有。
 * 之前踩过一次（盯了礼拜天 10:26 却从没响过），所以降级一定要出声。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate } from "../src/bot.js";
import { runPoll } from "../src/watch.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2999-01-01";
const NOW_ISO = "2026-08-21T08:00:00.000Z";
const NOW = () => new Date(NOW_ISO);

const env = (DB) => ({ DB, OKU_BASELINE: "4", OFFER_WINDOW_MINUTES: "3" });
const msg = (chatId, text) => ({ message: { chat: { id: chatId }, text } });
const activeWatches = (db, id) =>
  rows(db, `SELECT * FROM watches WHERE chat_id = ${id} AND active = 1`);

/* ---------- 闸门：免费会员盯不了 ---------- */

const startWith = async (user) => {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, ...user }] });
  const tg = recorder();
  await handleUpdate(msg(111, "/start"), env(db), { send: tg.send, now: NOW });
  return tg;
};

test("免费会员打 /start 被挡下，而且讲清楚两条升级的路", async () => {
  const tg = await startWith({ points: 0 });

  assert.match(tg.sent[0].text, /\/share/, "告诉他挂票能拿试用");
  assert.doesNotMatch(tg.sent[0].text, /哪个方向/, "不该进方向菜单");
});

test("有点数的人照常进菜单", async () => {
  const tg = await startWith({ points: 3 });
  assert.match(tg.sent[0].text, /哪个方向/);
});

test("试用中的人照常进菜单", async () => {
  const tg = await startWith({ points: 0, trial_until: "2026-12-01T00:00:00.000Z" });
  assert.match(tg.sent[0].text, /哪个方向/);
});

/* ---------- 降级：轮询时清掉 ---------- */

function withWatch(user) {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, ...user }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
  });
  const tg = recorder();
  return { db, tg };
}

const poll = (db, tg) =>
  runPoll(env(db), {
    send: tg.send,
    now: NOW,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 4)] }),
  });

test("试用过期：盯梢全停，而且要出声", async () => {
  const { db, tg } = withWatch({ points: 0, trial_until: "2026-08-01T00:00:00.000Z" });
  await poll(db, tg);

  assert.equal(activeWatches(db, 111).length, 0);
  assert.equal(tg.to(111).length, 1, "不能默默停掉 —— 装死比停掉更糟");
  assert.match(tg.to(111)[0].text, /充值/);
});

test("停过一次就不再唠叨", async () => {
  const { db, tg } = withWatch({ points: 0, trial_until: "2026-08-01T00:00:00.000Z" });
  await poll(db, tg);
  await poll(db, tg);

  assert.equal(tg.to(111).length, 1, "没有 active 盯梢了，自然不会再通知");
});

test("点数归零：一样停掉", async () => {
  const { db, tg } = withWatch({ points: 0 });
  await poll(db, tg);

  assert.equal(activeWatches(db, 111).length, 0);
  assert.equal(tg.to(111).length, 1);
});

test("还有点数的人不受影响", async () => {
  const { db, tg } = withWatch({ points: 3 });
  await poll(db, tg);

  assert.equal(activeWatches(db, 111).length, 1);
  assert.equal(tg.to(111).length, 0);
});

test("试用还没到期的人不受影响", async () => {
  const { db, tg } = withWatch({ points: 0, trial_until: "2026-12-01T00:00:00.000Z" });
  await poll(db, tg);

  assert.equal(activeWatches(db, 111).length, 1);
});

/* ---------- 到期前一天先预告 ---------- */

test("剩不到一天：先预告，别等砍完才讲", async () => {
  const { db, tg } = withWatch({ points: 0, trial_until: "2026-08-21T20:00:00.000Z" });
  await poll(db, tg);

  assert.equal(activeWatches(db, 111).length, 1, "还没到期，盯梢照留");
  assert.equal(tg.to(111).length, 1);
  assert.match(tg.to(111)[0].text, /快到期/);
});

test("预告只发一次，不是每 5 分钟一次", async () => {
  const { db, tg } = withWatch({ points: 0, trial_until: "2026-08-21T20:00:00.000Z" });
  await poll(db, tg);
  await poll(db, tg);
  await poll(db, tg);

  assert.equal(tg.to(111).length, 1);
});

test("还有好几天的人不会被预告吵", async () => {
  const { db, tg } = withWatch({ points: 0, trial_until: "2026-09-01T00:00:00.000Z" });
  await poll(db, tg);

  assert.equal(tg.to(111).length, 0);
});
