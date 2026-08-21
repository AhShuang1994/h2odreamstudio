/**
 * 扣点改成「他自己按才扣」。
 *
 * 原本是靠推断：offer 发出后座位数掉回基线，就当他订走了。
 * 这条线每次只放 0–1 个位，那 5 分钟里全马来西亚都在抢 ——
 * 推断错的机会很高，而每错一次就是跟一个朋友要钱要错了。
 *
 * 座位判定还留着，但只用来「把 offer 关掉让给下一个」，不再管钱。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate } from "../src/bot.js";
import { runPoll } from "../src/watch.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2999-01-01";

const env = (DB) => ({ DB, OKU_BASELINE: "4", OFFER_WINDOW_MINUTES: "3" });
const tap = (chatId, data) => ({
  callback_query: { id: "1", message: { chat: { id: chatId } }, data },
});

const pointsOf = (db, chatId) =>
  rows(db, `SELECT points FROM users WHERE chat_id = ${chatId}`)[0].points;
const offer1 = (db) => rows(db, "SELECT * FROM offers WHERE id = 1")[0];
const watch1 = (db) => rows(db, "SELECT * FROM watches WHERE id = 1")[0];

/** 111 手上有一个进行中的 offer（id 1），盯的是 18:40 */
function ctx(user = { points: 5 }) {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, ...user }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
    seatLog: [
      { direction: "KJ", date: DATE, hour_minute: 1840, seats: 4, seen_at: "2020-01-01T00:00:00.000Z" },
    ],
    offers: [
      {
        watch_id: 1,
        chat_id: 111,
        direction: "KJ",
        date: DATE,
        hour_minute: 1840,
        offered_at: "2020-01-01T00:00:00.000Z",
        expires_at: "2999-01-01T00:00:00.000Z",
      },
    ],
  });
  const tg = recorder();
  return { db, tg };
}

/* ---------- 按钮才是唯一会扣钱的路 ---------- */

test("按「我订到了」：扣 1 点、offer 结案、盯梢关掉", async () => {
  const { db, tg } = ctx();
  await handleUpdate(tap(111, "got:1"), env(db), { send: tg.send });

  assert.equal(pointsOf(db, 111), 4, "扣 1 点");
  assert.equal(offer1(db).outcome, "booked");
  assert.equal(watch1(db).active, 0, "订到了就别再盯了，一颗钮两件事");
});

test("同一颗钮按两次，只扣一次", async () => {
  const { db, tg } = ctx();
  await handleUpdate(tap(111, "got:1"), env(db), { send: tg.send });
  await handleUpdate(tap(111, "got:1"), env(db), { send: tg.send });

  assert.equal(pointsOf(db, 111), 4);
});

test("按别人的 offer，扣不到别人的点", async () => {
  const { db, tg } = ctx();
  seed(db, { users: [{ chat_id: 222, points: 5 }] });
  await handleUpdate(tap(222, "got:1"), env(db), { send: tg.send });

  assert.equal(pointsOf(db, 111), 5, "111 的点一分没少");
  assert.equal(offer1(db).outcome, null, "offer 也不该被别人结掉");
});

test("试用中的人按了，不扣点，但一样结案、一样停盯梢", async () => {
  const { db, tg } = ctx({ points: 0, trial_until: "2999-01-01T00:00:00.000Z" });
  await handleUpdate(tap(111, "got:1"), env(db), { send: tg.send });

  assert.equal(pointsOf(db, 111), 0, "他本来就没点，不能扣成负的");
  assert.equal(offer1(db).outcome, "booked");
  assert.equal(watch1(db).active, 0);
});

/* ---------- 轮询不再碰钱 ---------- */

const poll = (db, tg, seats) =>
  runPoll(env(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, seats)] }),
  });

test("位子没了但他没按：不扣点", async () => {
  const { db, tg } = ctx();
  await poll(db, tg, 4);

  assert.equal(pointsOf(db, 111), 5, "位子可能是群外的人订走的，不能算在他头上");
});

test("位子没了：offer 还是要关掉，别挡住下一个", async () => {
  const { db, tg } = ctx();
  await poll(db, tg, 4);

  assert.equal(offer1(db).outcome, "gone", "不知道谁订的，所以是 gone 不是 booked");
});

test("窗口过了、位子还在：让给下一个，也不扣点", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
    seatLog: [
      { direction: "KJ", date: DATE, hour_minute: 1840, seats: 6, seen_at: "2020-01-01T00:00:00.000Z" },
    ],
    offers: [
      {
        watch_id: 1,
        chat_id: 111,
        direction: "KJ",
        date: DATE,
        hour_minute: 1840,
        offered_at: "2020-01-01T00:00:00.000Z",
        expires_at: "2020-01-01T00:03:00.000Z",
      },
    ],
  });
  const tg = recorder();
  await poll(db, tg, 6);

  assert.equal(offer1(db).outcome, "passed");
  assert.equal(pointsOf(db, 111), 5);
});

/* ---------- 按错了要退得回来 ---------- */

test("/appeal 找得到刚才那笔 booked，并通知管理员", async () => {
  const { db, tg } = ctx();
  seed(db, { users: [{ chat_id: 999, name: "boss", is_admin: 1 }] });
  await handleUpdate(tap(111, "got:1"), env(db), { send: tg.send });

  await handleUpdate(
    { message: { chat: { id: 111 }, text: "/appeal" } },
    env(db),
    { send: tg.send },
  );

  const toAdmin = tg.to(999);
  assert.equal(toAdmin.length, 1, "管理员要收到申诉，否则没人退得了点");
  assert.match(toAdmin[0].text, /111/);
});

test("没扣过点就 /appeal，讲清楚没东西可退", async () => {
  const { db, tg } = ctx();
  await handleUpdate(
    { message: { chat: { id: 111 }, text: "/appeal" } },
    env(db),
    { send: tg.send },
  );

  assert.equal(tg.to(111).length, 1);
  assert.doesNotMatch(tg.to(111)[0].text, /已经通知/);
});

/* ---------- 通知里要真的有那颗钮 ---------- */

test("offer 讯息带着「我订到了」按钮，不然没人扣得了点", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
    seatLog: [
      { direction: "KJ", date: DATE, hour_minute: 1840, seats: 4, seen_at: "2020-01-01T00:00:00.000Z" },
    ],
  });
  const tg = recorder();
  await poll(db, tg, 6);

  const msg = tg.sent.at(-1);
  assert.match(msg.text, /轮到你了/);
  const buttons = JSON.stringify(msg.keyboard ?? []);
  assert.match(buttons, /got:\d+/, "按钮要带 offer id");
});
