/**
 * 管理员指令。
 *
 * 重点是「加人」这一步会不会通知到本人 —— 没通知的话，
 * 他多半在被加之前就打过一次 /start 吃了闭门羹，不会再打第二次。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, rows, recorder } from "./helpers/d1.js";

const env = (DB) => ({ DB, OKU_BASELINE: "4", TELEGRAM_BOT_TOKEN: "fake" });
const msg = (chatId, text) => ({ message: { chat: { id: chatId }, text } });

function ctx() {
  const db = freshDb();
  seed(db, { users: [{ chat_id: 111, name: "boss", is_admin: 1 }] });
  const tg = recorder();
  return { db, tg, deps: { send: tg.send } };
}

test("/adduser 会通知本人，让他知道可以开始了", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(111, "/adduser 222 阿明"), env(db), deps);

  const toNew = tg.to(222);
  assert.equal(toNew.length, 1, "新会员要收到一句欢迎，否则他不知道自己被加了");
  assert.match(toNew[0].text, /\/start/, "要告诉他下一步打什么");
});

test("/adduser 也要回报管理员", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(111, "/adduser 222 阿明"), env(db), deps);

  assert.match(tg.to(111)[0].text, /222/);
  assert.equal(rows(db, "SELECT * FROM users WHERE chat_id = 222").length, 1);
});

test("重复 /adduser 不会重置点数", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(111, "/adduser 222 阿明"), env(db), deps);
  await handleUpdate(msg(111, "/topup 222 5"), env(db), deps);
  await handleUpdate(msg(111, "/adduser 222 阿明"), env(db), deps);

  assert.equal(rows(db, "SELECT points FROM users WHERE chat_id = 222")[0].points, 5);
});

test("非管理员打 /adduser 加不了人", async () => {
  const { db, tg, deps } = ctx();
  seed(db, { users: [{ chat_id: 333, points: 5 }] });
  await handleUpdate(msg(333, "/adduser 444 混进来的"), env(db), deps);

  assert.equal(rows(db, "SELECT * FROM users WHERE chat_id = 444").length, 0);
  assert.equal(tg.to(444).length, 0);
});
