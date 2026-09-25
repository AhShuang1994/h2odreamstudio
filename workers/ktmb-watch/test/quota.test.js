/**
 * 配额保护的三个漏洞。
 *
 * 1. 没人限制一个人能建几条 —— 28 天 × 2 方向 = 56 条，一个人就能把
 *    MAX_ROUTES 撑爆，别人全部漏跑。
 * 2. 发通知也算在 Cloudflare 那 50 个对外请求里。broadcast 模式每个订户
 *    发一条，人一多整轮炸掉。
 * 3. 勾选单每重画一次就重查一遍 KTMB，一个人玩菜单比轮询还耗。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { runPoll, budgetFor } from "../src/watch.js";
import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const MY = (iso) => new Date(`${iso}Z`);
const NOW = () => MY("2026-08-21T08:00");
const DATE = "2026-09-06";

const env = (DB, extra = {}) => ({
  DB,
  OKU_BASELINE: "4",
  OFFER_WINDOW_MINUTES: "3",
  MAX_DAYS_AHEAD: "28",
  MAX_ROUTES: "12",
  MAX_WATCHES_PER_USER: "5",
  MAX_SUBREQUESTS: "50",
  ...extra,
});

const tap = (chatId, data) => ({
  callback_query: { id: "1", message: { chat: { id: chatId } }, data },
});

/* ---------- 洞 1：一个人能建几条 ---------- */

test("一个人建到上限就不给再建，别把别人挤掉", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: Array.from({ length: 5 }, (_, i) => ({
      chat_id: 111,
      direction: "KJ",
      date: `2026-09-0${i + 1}`,
      trains: [2100],
    })),
  });
  const tg = recorder();
  const deps = {
    send: tg.send,
    now: NOW,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(2100, 4)] }),
  };

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  assert.equal(rows(db, "SELECT * FROM watches WHERE active=1").length, 5, "不该变成 6 条");
  assert.match(tg.sent.at(-1).text, /最多|上限/);
});

test("没到上限当然照建", async () => {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, points: 5 }] });
  const tg = recorder();
  const deps = {
    send: tg.send,
    now: NOW,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(2100, 4)] }),
  };

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  assert.equal(rows(db, "SELECT * FROM watches WHERE active=1").length, 1);
});

test("取消掉的、过期的不算进上限", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [
      { chat_id: 111, direction: "KJ", date: "2026-09-01", trains: [2100], active: 0 },
      { chat_id: 111, direction: "KJ", date: "2020-01-01", trains: [2100] },
    ],
  });
  const tg = recorder();
  const deps = {
    send: tg.send,
    now: NOW,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(2100, 4)] }),
  };

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  assert.match(tg.sent.at(-1).text, /盯上了/);
});

/* ---------- 洞 2：请求预算要把发通知算进去 ---------- */

test("budgetFor：留给发通知的余额要扣掉查询用掉的", () => {
  const b = budgetFor(50, 12, 3);
  assert.equal(b.routes, 12);
  assert.equal(b.spentOnSearch, 36);
  assert.equal(b.sendsLeft, 14);
});

test("budgetFor：上限低的时候，线路数要跟着降", () => {
  const b = budgetFor(20, 12, 3);
  assert.ok(b.routes < 12, "20 个请求跑不了 12 条线路");
  assert.ok(b.spentOnSearch + b.sendsLeft <= 20);
});

test("broadcast 模式发爆预算时，停在上限内而不是整轮炸掉", async () => {
  const db = freshDb();
  const users = Array.from({ length: 30 }, (_, i) => ({ chat_id: 200 + i, points: 5 }));
  seed(db, {
    users,
    watches: users.map((u) => ({
      chat_id: u.chat_id,
      direction: "KJ",
      date: DATE,
      trains: [2100],
    })),
    seatLog: [
      {
        direction: "KJ",
        date: DATE,
        hour_minute: 2100,
        seats: 4,
        seen_at: "2020-01-01T00:00:00.000Z",
      },
    ],
  });
  db.sqlite
    .prepare("UPDATE settings SET value='broadcast' WHERE key='allocation_mode'")
    .run();

  const tg = recorder();
  await runPoll(env(db, { MAX_SUBREQUESTS: "20" }), {
    send: tg.send,
    now: NOW,
    search: fakeSearch({ [`${KJ}|${DATE}`]: [trip(2100, 9)] }),
  });

  // 一条线路查询用掉 3 个，剩 17 个能发
  assert.ok(tg.sent.length <= 17, `发了 ${tg.sent.length} 条，超过预算`);
  assert.ok(tg.sent.length > 0, "不能一条都不发");
});

/* ---------- 洞 3：勾选单别每点一下都重查 ---------- */

test("勾选班次时不该每点一下就重查 KTMB", async () => {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, points: 5 }] });
  const tg = recorder();
  let searches = 0;
  const deps = {
    send: tg.send,
    now: NOW,
    search: async () => {
      searches += 1;
      return [trip(1026, 9), trip(1840, 4), trip(2100, 4)];
    },
  };

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps); // 这次要查
  const afterFirst = searches;

  await handleUpdate(tap(111, `tr:KJ:${DATE}:1026`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:1840`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);

  assert.equal(searches, afterFirst, "勾三下不该再打三次 KTMB —— 班次表几秒内不会变");
});

test("缓存过的班次表还是要能正确勾选", async () => {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, points: 5 }] });
  const tg = recorder();
  const deps = {
    send: tg.send,
    now: NOW,
    search: async () => [trip(1026, 9), trip(2100, 4)],
  };

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:1026`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  const w = rows(db, "SELECT * FROM watches")[0];
  assert.deepEqual(JSON.parse(w.trains), [1026, 2100]);
});
