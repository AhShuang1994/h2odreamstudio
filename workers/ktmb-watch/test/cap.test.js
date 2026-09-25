/**
 * 对外请求的上限保护。
 *
 * Cloudflare 免费版一次执行最多 50 个对外请求，一条线路要打 KTMB 3 个。
 * 超了整轮会失败 —— 那是最糟的结果：所有人都收不到通知，而且没人知道。
 * 宁可少跑几条远期的，并且吵管理员。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { capRoutes, runPoll } from "../src/watch.js";
import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, recorder } from "./helpers/d1.js";

const env = (DB, max) => ({
  DB,
  OKU_BASELINE: "4",
  OFFER_WINDOW_MINUTES: "3",
  ...(max ? { MAX_ROUTES: String(max) } : {}),
});

const MY = (iso) => new Date(`${iso}Z`);

/* ---------- 纯逻辑 ---------- */

test("capRoutes：没超上限就全跑", () => {
  const routes = [
    { direction: "KJ", date: "2026-09-01" },
    { direction: "KJ", date: "2026-08-25" },
  ];
  const { routes: run, skipped } = capRoutes(routes, 5);
  assert.equal(run.length, 2);
  assert.equal(skipped.length, 0);
});

test("capRoutes：超了就留最近的，砍远期的", () => {
  const routes = [
    { direction: "KJ", date: "2026-12-01" },
    { direction: "KJ", date: "2026-08-25" },
    { direction: "KJ", date: "2026-09-15" },
  ];
  const { routes: run, skipped } = capRoutes(routes, 2);
  assert.deepEqual(
    run.map((r) => r.date),
    ["2026-08-25", "2026-09-15"],
    "近的先跑 —— 快出发的那几天才是人真的在等的",
  );
  assert.deepEqual(skipped.map((r) => r.date), ["2026-12-01"]);
});

test("capRoutes 不改动传进来的阵列", () => {
  const routes = [
    { direction: "KJ", date: "2026-12-01" },
    { direction: "KJ", date: "2026-08-25" },
  ];
  capRoutes(routes, 1);
  assert.equal(routes[0].date, "2026-12-01");
});

/* ---------- 轮询 ---------- */

function dbWithRoutes(dates, admins = []) {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }, ...admins],
    watches: dates.map((d) => ({
      chat_id: 111,
      direction: "KJ",
      date: d,
      trains: [2100],
    })),
  });
  return db;
}

test("超过上限时只跑最近的几条，不是整轮炸掉", async () => {
  const db = dbWithRoutes(["2026-09-01", "2026-09-08", "2026-09-15"]);
  const tg = recorder();
  const searched = [];

  await runPoll(env(db, 2), {
    send: tg.send,
    now: () => MY("2026-08-23T08:00"),
    search: async ({ date }) => {
      searched.push(date);
      return [];
    },
  });

  assert.deepEqual(searched, ["2026-09-01", "2026-09-08"]);
});

test("漏跑了要私讯管理员，别默默吞掉", async () => {
  const db = dbWithRoutes(
    ["2026-09-01", "2026-09-08", "2026-09-15"],
    [{ chat_id: 999, points: 0, is_admin: 1 }],
  );
  const tg = recorder();

  await runPoll(env(db, 2), {
    send: tg.send,
    now: () => MY("2026-08-23T08:00"),
    search: async () => [],
  });

  const warn = tg.to(999);
  assert.equal(warn.length, 1, "管理员要被吵醒");
  assert.match(warn[0].text, /漏跑了 1 条/);
  assert.match(warn[0].text, /2026-09-15/, "要讲清楚漏了哪几条");
});

test("没超上限就别吵管理员", async () => {
  const db = dbWithRoutes(["2026-09-01"], [{ chat_id: 999, points: 0, is_admin: 1 }]);
  const tg = recorder();

  await runPoll(env(db, 12), {
    send: tg.send,
    now: () => MY("2026-08-23T08:00"),
    search: async () => [],
  });

  assert.equal(tg.to(999).length, 0);
});

/* ---------- /stats ---------- */

test("/stats 要讲现在几条线路在跑、离上限还有多远", async () => {
  const db = dbWithRoutes(["2026-09-01", "2026-09-08"]);
  const tg = recorder();

  await handleUpdate({ message: { chat: { id: 111 }, text: "/stats" } }, env(db, 12), {
    send: tg.send,
    now: () => MY("2026-08-23T08:00"),
  });

  const out = tg.sent.at(-1).text;
  assert.match(out, /2 \/ 12/, "看得到用了多少、上限多少");
});
