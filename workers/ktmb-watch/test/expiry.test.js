/**
 * 按班次的出发时间清，不是按日期。
 *
 * 同一天盯 10:26 和 21:00，到了 10:27，10:26 那条该死掉，21:00 要留着。
 * 按日期清的话，整天都还「活着」—— 车都开走了还在查、还在排队。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { hasDeparted, liveTrains, runPoll } from "../src/watch.js";
import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2026-08-23";

/** 马来西亚时间 2026-08-23 10:27 */
const at = (iso) => new Date(`${iso}Z`);
const MY = (iso) => at(iso); // nowInMY() 回的就是这种「UTC 栏位装马来西亚墙上时间」的 Date

const env = (DB) => ({ DB, OKU_BASELINE: "4", OFFER_WINDOW_MINUTES: "3" });

/* ---------- 纯逻辑 ---------- */

test("hasDeparted：开车时间之前还活着", () => {
  assert.equal(hasDeparted(DATE, 1026, MY("2026-08-23T09:00")), false);
});

test("hasDeparted：正好到点的那一分钟还算没开走", () => {
  assert.equal(hasDeparted(DATE, 1026, MY("2026-08-23T10:26")), false);
});

test("hasDeparted：过了一分钟就算开走了", () => {
  assert.equal(hasDeparted(DATE, 1026, MY("2026-08-23T10:27")), true);
});

test("hasDeparted：隔天的班次不受今天时间影响", () => {
  assert.equal(hasDeparted("2026-08-24", 1026, MY("2026-08-23T23:59")), false);
  assert.equal(hasDeparted("2026-08-22", 1026, MY("2026-08-23T00:01")), true);
});

test("liveTrains：只留还没开走的", () => {
  assert.deepEqual(
    liveTrains(DATE, [1026, 2100], MY("2026-08-23T10:27")),
    [2100],
    "10:26 开走了，21:00 还在",
  );
  assert.deepEqual(liveTrains(DATE, [1026, 2100], MY("2026-08-23T09:00")), [1026, 2100]);
  assert.deepEqual(liveTrains(DATE, [1026, 2100], MY("2026-08-23T22:00")), []);
});

/* ---------- 轮询 ---------- */

function dbWith(trains, seats = 4) {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [{ chat_id: 111, direction: "KJ", date: DATE, trains }],
    seatLog: trains.map((hm) => ({
      direction: "KJ",
      date: DATE,
      hour_minute: hm,
      seats,
      seen_at: "2020-01-01T00:00:00.000Z",
    })),
  });
  return db;
}

test("整条线路的班次都开走了，连 KTMB 都不用查", async () => {
  const db = dbWith([1026]);
  const tg = recorder();
  let searched = false;

  await runPoll(env(db), {
    send: tg.send,
    now: () => MY("2026-08-23T10:27"),
    search: async () => {
      searched = true;
      return [];
    },
  });

  assert.equal(searched, false, "车都开走了还去查，纯粹浪费 KTMB 的请求额度");
});

test("班次都开走了就把 watch 关掉，别一直躺在名单里", async () => {
  const db = dbWith([1026]);
  const tg = recorder();

  await runPoll(env(db), {
    send: tg.send,
    now: () => MY("2026-08-23T10:27"),
    search: async () => [],
  });

  assert.equal(rows(db, "SELECT active FROM watches")[0].active, 0);
});

test("同一天一班开走一班还在：照查，但只认还在的那班", async () => {
  const db = dbWith([1026, 2100]);
  const tg = recorder();

  await runPoll(env(db), {
    send: tg.send,
    now: () => MY("2026-08-23T10:27"),
    // 两班都放位了，但 10:26 已经开走
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1026, 9), trip(2100, 9)] }),
  });

  assert.equal(rows(db, "SELECT active FROM watches")[0].active, 1, "21:00 还在，别关");
  const offers = rows(db, "SELECT hour_minute FROM offers");
  assert.deepEqual(
    offers.map((o) => o.hour_minute),
    [2100],
    "开走的班次不该再发通知",
  );
});

test("开走的班次不进排队，也不扣点", async () => {
  const db = dbWith([1026]);
  const tg = recorder();

  await runPoll(env(db), {
    send: tg.send,
    now: () => MY("2026-08-23T10:27"),
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(1026, 9)] }),
  });

  assert.equal(tg.sent.length, 0);
  assert.equal(rows(db, "SELECT * FROM ledger").length, 0);
});

/* ---------- /my ---------- */

test("/my 不列已经开走的班次", async () => {
  const db = dbWith([1026, 2100]);
  const tg = recorder();

  await handleUpdate({ message: { chat: { id: 111 }, text: "/my" } }, env(db), {
    send: tg.send,
    now: () => MY("2026-08-23T10:27"),
  });

  const out = tg.sent.at(-1).text;
  assert.doesNotMatch(out, /10:26/, "车开走了还列出来只会让人困惑");
  assert.match(out, /21:00/);
});

test("/my 整条都开走了就不显示这条盯梢", async () => {
  const db = dbWith([1026]);
  const tg = recorder();

  await handleUpdate({ message: { chat: { id: 111 }, text: "/my" } }, env(db), {
    send: tg.send,
    now: () => MY("2026-08-23T22:00"),
  });

  assert.match(tg.sent.at(-1).text, /还没盯任何班次/);
});
