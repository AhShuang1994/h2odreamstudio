/**
 * runPoll 整条链：查到位 → 通知谁 → 扣几点。
 *
 * 这是唯一会真的弄错钱的地方，所以跑的是真 SQL（Node 自带 SQLite + 真 migration），
 * 只把 KTMB 查询和 Telegram 发送换成假的。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { runPoll } from "../src/watch.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2999-01-01"; // 用远期日期，免得 activeRoutes 的「日期没过」把它滤掉

const baseEnv = (DB) => ({ DB, OKU_BASELINE: "4", OFFER_WINDOW_MINUTES: "3" });

/** 上一轮看到 4 个位（= 没位），这一轮看到 seats */
function dbWithBaseline(users, watches, seats = 4) {
  const db = freshDb();
  seed(db, {
    users,
    watches,
    seatLog: watches
      .flatMap((w) => w.trains)
      .filter((hm, i, a) => a.indexOf(hm) === i)
      .map((hm) => ({
        direction: "KJ",
        date: DATE,
        hour_minute: hm,
        seats,
        seen_at: "2020-01-01T00:00:00.000Z",
      })),
  });
  return db;
}

test("位子从 4 变 6：queue 模式只通知一个人", async () => {
  const db = dbWithBaseline(
    [
      { chat_id: 111, points: 5 },
      { chat_id: 222, points: 5 },
    ],
    [
      { chat_id: 111, direction: "KJ", date: DATE, trains: [1840] },
      { chat_id: 222, direction: "KJ", date: DATE, trains: [1840] },
    ],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 6)] }),
  });

  assert.equal(tg.sent.length, 1, "queue 模式一次只该通知一个人");
  assert.equal(rows(db, "SELECT * FROM offers").length, 1);
});

test("位子还是 4：谁都不通知", async () => {
  const db = dbWithBaseline(
    [{ chat_id: 111, points: 5 }],
    [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 4)] }),
  });

  assert.equal(tg.sent.length, 0, "4 个都是 OKU 保留位，不算有票");
  assert.equal(rows(db, "SELECT * FROM offers").length, 0);
});

test("没拿过通知的人排在前面", async () => {
  const db = dbWithBaseline(
    [
      { chat_id: 111, points: 5 },
      { chat_id: 222, points: 5 },
    ],
    [
      { chat_id: 111, direction: "KJ", date: DATE, trains: [1840] },
      { chat_id: 222, direction: "KJ", date: DATE, trains: [1840] },
    ],
  );
  // 111 上次拿过了，所以这次该轮到 222
  seed(db, {
    offers: [
      {
        watch_id: 1,
        chat_id: 111,
        direction: "KJ",
        date: DATE,
        hour_minute: 2100,
        offered_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-01-01T00:03:00.000Z",
        outcome: "taken",
      },
    ],
  });
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 6)] }),
  });

  assert.equal(tg.sent[0].chatId, 222, "上次拿到的人要排到队尾");
});

test("点数用完的人不进队", async () => {
  const db = dbWithBaseline(
    [
      { chat_id: 111, points: 0 },
      { chat_id: 222, points: 2 },
    ],
    [
      { chat_id: 111, direction: "KJ", date: DATE, trains: [1840] },
      { chat_id: 222, direction: "KJ", date: DATE, trains: [1840] },
    ],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 6)] }),
  });

  assert.equal(tg.sent[0].chatId, 222, "111 没点数了，跳过他");
});

test("同一班车已经有人在等，不会再发第二张", async () => {
  const db = dbWithBaseline(
    [
      { chat_id: 111, points: 5 },
      { chat_id: 222, points: 5 },
    ],
    [
      { chat_id: 111, direction: "KJ", date: DATE, trains: [1840] },
      { chat_id: 222, direction: "KJ", date: DATE, trains: [1840] },
    ],
  );
  const tg = recorder();
  const deps = {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 6)] }),
  };

  await runPoll(baseEnv(db), deps); // 发给第一个人
  await runPoll(baseEnv(db), deps); // 三分钟还没到

  assert.equal(rows(db, "SELECT * FROM offers WHERE outcome IS NULL").length, 1);
});

test("通知后位子没了：算他订走，扣 1 点", async () => {
  const db = dbWithBaseline(
    [{ chat_id: 111, points: 5 }],
    [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 6)] }),
  });
  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 4)] }), // 位子被订走了
  });

  assert.equal(rows(db, "SELECT points FROM users WHERE chat_id=111")[0].points, 4);
  assert.equal(rows(db, "SELECT * FROM offers")[0].outcome, "taken");

  const led = rows(db, "SELECT * FROM ledger");
  assert.equal(led.length, 1);
  assert.equal(led[0].delta, -1);
  assert.equal(led[0].reason, "booked");
});

test("broadcast 模式：全部通知，不建 offer、不扣点", async () => {
  const db = dbWithBaseline(
    [
      { chat_id: 111, points: 5 },
      { chat_id: 222, points: 5 },
    ],
    [
      { chat_id: 111, direction: "KJ", date: DATE, trains: [1840] },
      { chat_id: 222, direction: "KJ", date: DATE, trains: [1840] },
    ],
  );
  db.sqlite
    .prepare("UPDATE settings SET value='broadcast' WHERE key='allocation_mode'")
    .run();
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 6)] }),
  });

  assert.equal(tg.sent.length, 2, "两个人都该收到");
  assert.equal(rows(db, "SELECT * FROM offers").length, 0, "broadcast 不建 offer");
  assert.equal(rows(db, "SELECT * FROM ledger").length, 0, "broadcast 不扣点");
  assert.equal(rows(db, "SELECT points FROM users WHERE chat_id=111")[0].points, 5);
});

test("每一轮都把所有班次记进 seat_log，不只登记的那几班", async () => {
  const db = dbWithBaseline(
    [{ chat_id: 111, points: 5 }],
    [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({
      [`${KJ}|${DATE}`]: [trip(1026, 11), trip(1840, 4), trip(2325, 200)],
    }),
  });

  const logged = rows(db, "SELECT DISTINCT hour_minute FROM seat_log ORDER BY hour_minute");
  assert.deepEqual(
    logged.map((r) => r.hour_minute),
    [1026, 1840, 2325],
    "试跑期要靠这张表回答「一周真的放几次位」，所以每班都要记",
  );
});

test("第一次看到某班车不发通知（没有基准，判断不了是不是刚放的）", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
    // 故意不给 seat_log
  });
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 50)] }),
  });

  assert.equal(tg.sent.length, 0, "宁可漏一次，也别一上线就误报");
});

test("KTMB 查不到就跳过这条线路，不能整轮挂掉", async () => {
  const db = dbWithBaseline(
    [{ chat_id: 111, points: 5 }],
    [{ chat_id: 111, direction: "KJ", date: DATE, trains: [1840] }],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: async () => {
      throw new Error("KTMB 拒绝了查询：Date has passed.");
    },
  });

  assert.equal(tg.sent.length, 0);
});

test("只盯 18:40 的人，21:00 放位不会吵到他", async () => {
  const db = dbWithBaseline(
    [
      { chat_id: 111, points: 5 },
      { chat_id: 222, points: 5 },
    ],
    [
      { chat_id: 111, direction: "KJ", date: DATE, trains: [2100] },
      { chat_id: 222, direction: "KJ", date: DATE, trains: [1840] },
    ],
  );
  const tg = recorder();

  await runPoll(baseEnv(db), {
    send: tg.send,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1840, 4), trip(2100, 6)] }),
  });

  assert.equal(tg.sent.length, 1);
  assert.equal(tg.sent[0].chatId, 111, "只有登记 21:00 的人该收到");
});
