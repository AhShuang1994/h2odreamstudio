/**
 * 会员身份与试用期。
 *
 * 「付费会员」= 有点数 或 试用中。刻意不看 first_topup_at ——
 * 那个只是给管理员看「谁真的付过钱」的标记，不是权限开关。
 *
 * 试用一辈子只有一次。不然他每次到期再挂一张票就又拿一轮，
 * 等于永远免费，付费那一层直接塌掉。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { isPaid, grantTrial } from "../src/membership.js";
import { freshDb, seed, rows } from "./helpers/d1.js";

const NOW = "2026-09-01T00:00:00.000Z";

/* ---------- isPaid ---------- */

test("有点数就是付费会员", () => {
  assert.equal(isPaid({ points: 3, trial_until: null }, NOW), true);
});

test("零点、没试用 = 免费会员", () => {
  assert.equal(isPaid({ points: 0, trial_until: null }, NOW), false);
});

test("试用还没到期，零点也算付费会员", () => {
  assert.equal(isPaid({ points: 0, trial_until: "2026-09-30T00:00:00.000Z" }, NOW), true);
});

test("试用过期了就掉回免费会员", () => {
  assert.equal(isPaid({ points: 0, trial_until: "2026-08-01T00:00:00.000Z" }, NOW), false);
});

test("试用过期但还有点数，仍然是付费会员", () => {
  assert.equal(isPaid({ points: 2, trial_until: "2026-08-01T00:00:00.000Z" }, NOW), true);
});

test("first_topup_at 不影响权限，只是个标记", () => {
  assert.equal(
    isPaid({ points: 0, trial_until: null, first_topup_at: "2026-01-01T00:00:00.000Z" }, NOW),
    false,
    "以前付过钱不代表现在还能用",
  );
});

/* ---------- grantTrial ---------- */

const ctx = (user) => {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, ...user }] });
  return db;
};

const trialOf = (db) =>
  rows(db, "SELECT trial_until FROM users WHERE chat_id = 111")[0].trial_until;

test("第一次给试用，30 天后到期", async () => {
  const db = ctx({});
  const until = await grantTrial(db, 111, NOW, 30);

  assert.equal(until, "2026-10-01T00:00:00.000Z");
  assert.equal(trialOf(db), "2026-10-01T00:00:00.000Z");
});

test("给过就不再给 —— 一辈子一次", async () => {
  const db = ctx({ trial_until: "2026-08-01T00:00:00.000Z" });
  const until = await grantTrial(db, 111, NOW, 30);

  assert.equal(until, null, "回 null 表示这次没给");
  assert.equal(
    trialOf(db),
    "2026-08-01T00:00:00.000Z",
    "早就过期了也算给过，不能重来一轮",
  );
});

test("试用中再挂票，不会顺延", async () => {
  const db = ctx({ trial_until: "2026-09-15T00:00:00.000Z" });
  const until = await grantTrial(db, 111, NOW, 30);

  assert.equal(until, null);
  assert.equal(trialOf(db), "2026-09-15T00:00:00.000Z");
});
