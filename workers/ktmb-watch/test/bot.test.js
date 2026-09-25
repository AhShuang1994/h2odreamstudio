import { test } from "node:test";
import assert from "node:assert/strict";

import { draftMatches, parseTrainCallback } from "../src/bot.js";

test("parseTrainCallback 拆出方向、日期、班次", () => {
  assert.deepEqual(parseTrainCallback("tr:KJ:2026-08-23:1840"), {
    dir: "KJ",
    date: "2026-08-23",
    hm: 1840,
  });
  assert.deepEqual(parseTrainCallback("tr:JK:2026-09-06:905"), {
    dir: "JK",
    date: "2026-09-06",
    hm: 905,
  });
});

test("callback_data 塞得进 Telegram 的 64 字节上限", () => {
  const longest = "tr:KJ:2026-08-23:2359";
  assert.ok(
    new TextEncoder().encode(longest).length <= 64,
    "超过 64 字节 Telegram 会拒绝这个按钮",
  );
});

test("draftMatches：草稿停在同一个方向与日期才算数", () => {
  const draft = { direction: "KJ", date: "2026-08-23", trains: "[]" };
  assert.equal(draftMatches(draft, "KJ", "2026-08-23"), true);
});

test("draftMatches：翻旧讯息点按钮要挡下来", () => {
  // 用户已经开了新的一轮，草稿停在别的日期
  const draft = { direction: "KJ", date: "2026-08-30", trains: "[]" };
  assert.equal(
    draftMatches(draft, "KJ", "2026-08-23"),
    false,
    "旧日期的按钮不该影响当前草稿",
  );

  // 换了方向
  const other = { direction: "JK", date: "2026-08-23", trains: "[]" };
  assert.equal(draftMatches(other, "KJ", "2026-08-23"), false);

  // 已经按过「确定」，草稿被清掉了
  assert.equal(draftMatches(null, "KJ", "2026-08-23"), false);
  assert.equal(draftMatches(undefined, "KJ", "2026-08-23"), false);
});
