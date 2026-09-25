import { test } from "node:test";
import assert from "node:assert/strict";

import { detectReleases, settleDecision, hhmm } from "../src/watch.js";
import { orderQueue, dedupeByUser } from "../src/db.js";

const trip = (hourMinute, seats) => ({ hourMinute, seats, train: "T", fare: "MYR 1" });

test("hhmm 把 1840 变成 18:40", () => {
  assert.equal(hhmm(1840), "18:40");
  assert.equal(hhmm(905), "09:05");
  assert.equal(hhmm(2325), "23:25");
});

test("detectReleases：只有越过 OKU 基线才算放位", () => {
  const trips = [trip(1840, 5), trip(2100, 4), trip(2325, 200)];
  const prev = new Map([
    [1840, 4], // 4 -> 5，越线了
    [2100, 4], // 4 -> 4，没动
    [2325, 199], // 一直都有位，不是新放的
  ]);

  const got = detectReleases(trips, prev, 4).map((t) => t.hourMinute);
  assert.deepEqual(got, [1840]);
});

test("detectReleases：第一次观察不算放位", () => {
  // prev 是 null 表示没有基准，判断不了是不是刚放的，宁可漏报也别误报
  const prev = new Map([[1840, null]]);
  assert.equal(detectReleases([trip(1840, 9)], prev, 4).length, 0);

  const missing = new Map();
  assert.equal(detectReleases([trip(1840, 9)], missing, 4).length, 0);
});

test("detectReleases：基线可调", () => {
  const trips = [trip(1840, 3)];
  const prev = new Map([[1840, 0]]);
  assert.equal(detectReleases(trips, prev, 4).length, 0, "基线 4 时 3 个位不算");
  assert.equal(detectReleases(trips, prev, 2).length, 1, "基线 2 时 3 个位算");
});

test("settleDecision：位子没了就关掉 offer，但不认定是谁订的", () => {
  const offer = { expires_at: "2026-08-15T10:03:00.000Z" };
  assert.equal(
    settleDecision(offer, 4, 4, "2026-08-15T10:01:00.000Z"),
    "gone",
    "那几分钟里谁都可能抢走，所以是 gone 不是 booked —— 扣点只认他自己按的钮",
  );
});

test("settleDecision：窗口内位子还在，继续等", () => {
  const offer = { expires_at: "2026-08-15T10:03:00.000Z" };
  assert.equal(settleDecision(offer, 6, 4, "2026-08-15T10:01:00.000Z"), null);
});

test("settleDecision：超时且位子还在，传给下一个", () => {
  const offer = { expires_at: "2026-08-15T10:03:00.000Z" };
  assert.equal(settleDecision(offer, 6, 4, "2026-08-15T10:04:00.000Z"), "passed");
});

test("settleDecision：这一轮查不到这班车就先不动", () => {
  const offer = { expires_at: "2026-08-15T10:03:00.000Z" };
  assert.equal(settleDecision(offer, undefined, 4, "2026-08-15T10:09:00.000Z"), null);
});

test("orderQueue：没拿过通知的排最前", () => {
  const watchers = [
    { chat_id: 1, last_offered_at: "2026-08-01T00:00:00.000Z" },
    { chat_id: 2, last_offered_at: null },
    { chat_id: 3, last_offered_at: "2026-07-01T00:00:00.000Z" },
  ];
  assert.deepEqual(
    orderQueue(watchers).map((w) => w.chat_id),
    [2, 3, 1],
    "没拿过的第一，其余按上次拿到的时间由早到晚",
  );
});

test("orderQueue：上次拿到的人排到队尾", () => {
  // 「凭什么我排后面」的答案：因为你上次拿到了
  const before = [
    { chat_id: 1, last_offered_at: null },
    { chat_id: 2, last_offered_at: null },
  ];
  assert.deepEqual(orderQueue(before).map((w) => w.chat_id), [1, 2]);

  const after = [
    { chat_id: 1, last_offered_at: "2026-08-15T10:00:00.000Z" },
    { chat_id: 2, last_offered_at: null },
  ];
  assert.deepEqual(orderQueue(after).map((w) => w.chat_id), [2, 1]);
});

test("dedupeByUser：同一个人建了两条 watch 也只占一个排队位", () => {
  const watchers = [
    { watch_id: 1, chat_id: 111, last_offered_at: null },
    { watch_id: 2, chat_id: 111, last_offered_at: null }, // 同一个人再建一条
    { watch_id: 3, chat_id: 222, last_offered_at: null },
  ];
  const got = dedupeByUser(watchers);
  assert.deepEqual(got.map((w) => w.chat_id), [111, 222]);
  assert.equal(got[0].watch_id, 1, "留最早那条 watch");

  // 没去重的话 111 会占掉队列前两位，222 被挤到第三
  assert.deepEqual(orderQueue(got).map((w) => w.chat_id), [111, 222]);
});

test("orderQueue 不改动传进来的数组", () => {
  const watchers = [
    { chat_id: 9, last_offered_at: "2026-08-01T00:00:00.000Z" },
    { chat_id: 1, last_offered_at: null },
  ];
  orderQueue(watchers);
  assert.equal(watchers[0].chat_id, 9);
});
