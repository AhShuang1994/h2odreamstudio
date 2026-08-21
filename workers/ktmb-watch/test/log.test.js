/**
 * seat_log 只在数字变了才写。
 *
 * 量过线上资料：504 行里只有 33 行是真的有变动，93% 是白写的。
 * 座位数一整天不动，但轮询每 5 分钟照写一次 —— D1 免费版一天 10 万行写入，
 * 这一条就是线路数量的天花板。
 *
 * 危险在于「少写」很容易顺手弄坏「放位判定」，因为判定读的就是上一行。
 * 所以这里同时锁住两件事：不该写的别写，该通知的还是要通知。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { runPoll } from "../src/watch.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2999-01-01";

const env = (DB) => ({ DB, OKU_BASELINE: "4", OFFER_WINDOW_MINUTES: "3" });
const logRows = (db) => rows(db, "SELECT * FROM seat_log ORDER BY id");

/** 一个人盯着 18:40，可以指定上一轮看到几个位（null = 从来没看过） */
function ctx(prevSeats) {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
    seatLog:
      prevSeats === null
        ? []
        : [
            {
              direction: "KJ",
              date: DATE,
              hour_minute: 1840,
              seats: prevSeats,
              seen_at: "2020-01-01T00:00:00.000Z",
            },
          ],
  });
  const tg = recorder();
  return { db, tg };
}

const poll = (db, tg, seats) =>
  runPoll(env(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, seats)] }),
  });

test("数字没变就不写新行", async () => {
  const { db, tg } = ctx(4);
  await poll(db, tg, 4);

  assert.equal(logRows(db).length, 1, "还是那一行，不该多长出来");
});

test("数字变了就要写", async () => {
  const { db, tg } = ctx(4);
  await poll(db, tg, 6);

  const log = logRows(db);
  assert.equal(log.length, 2);
  assert.equal(log[1].seats, 6);
});

test("第一次看到这班车，一定要写", async () => {
  const { db, tg } = ctx(null);
  await poll(db, tg, 4);

  assert.equal(logRows(db).length, 1, "没有基准就无从判断，第一次必须记下来");
});

test("连跑三轮 4→4→6：中间不写，但该通知的还是通知", async () => {
  const { db, tg } = ctx(4);
  await poll(db, tg, 4);
  await poll(db, tg, 4);
  assert.equal(logRows(db).length, 1, "两轮都没变，一行都不该多");
  assert.equal(tg.sent.length, 0);

  await poll(db, tg, 6);

  assert.equal(logRows(db).length, 2);
  assert.equal(tg.sent.length, 1, "少写了行，放位判定不能跟着坏掉");
  assert.match(tg.sent[0].text, /轮到你了/);
});

/* ---------- 价钱搭便车 ---------- */

test("写下来的那一行带着当时的价钱", async () => {
  const { db, tg } = ctx(4);
  await poll(db, tg, 6);

  assert.equal(logRows(db).at(-1).fare, "MYR 27.00");
});

test("只有价钱变、座位没变：还是不写", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
    seatLog: [
      {
        direction: "KJ",
        date: DATE,
        hour_minute: 1840,
        seats: 4,
        seen_at: "2020-01-01T00:00:00.000Z",
      },
    ],
  });
  const tg = recorder();
  await runPoll(env(db), {
    send: tg.send,
    search: fakeSearch({
      [`${KJ}|${DATE}`]: [{ ...trip(1840, 4), fare: "MYR 99.00" }],
    }),
  });

  assert.equal(
    logRows(db).length,
    1,
    "价钱天天在动，跟着写的话就白省了 —— 判定看的是座位数",
  );
});

test("掉回去也算变动，要写", async () => {
  const { db, tg } = ctx(6);
  await poll(db, tg, 4);

  const log = logRows(db);
  assert.equal(log.length, 2);
  assert.equal(log[1].seats, 4);
});
