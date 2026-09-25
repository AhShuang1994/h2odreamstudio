/**
 * 邀请链接与三层菜单。
 *
 * 邀请链接不等于自助注册：没有链接照样进不来。它只是把「管理员一个一个加」
 * 这个瓶颈拿掉 —— 挂票板要有货，供货的那一边人太少就是一块空板。
 *
 * 菜单分层是体面问题，不是安全问题。真正的防线是代码里的 isPaid /
 * is_admin 判断，藏起来不等于挡住。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate, commandsFor, USER_COMMANDS, FREE_COMMANDS, ADMIN_COMMANDS } from "../src/bot.js";
import { freshDb, seed, rows, recorder } from "./helpers/d1.js";

const NOW_ISO = "2026-08-21T08:00:00.000Z";
const NOW = () => new Date(NOW_ISO);
const env = (DB) => ({ DB, TELEGRAM_BOT_TOKEN: "fake", BOT_USERNAME: "ktmbwatch_bot" });
const msg = (chatId, text) => ({ message: { chat: { id: chatId }, text } });
const userOf = (db, id) => rows(db, `SELECT * FROM users WHERE chat_id = ${id}`)[0];

function ctx(users = [{ chat_id: 111, points: 5 }]) {
  const db = freshDb();
  seed(db, { users });
  const tg = recorder();
  const menus = [];
  return {
    db,
    tg,
    menus,
    deps: {
      send: tg.send,
      now: NOW,
      setMenu: async (chatId, commands) => menus.push({ chatId, commands }),
    },
  };
}

const names = (cmds) => cmds.map((c) => c.command);

/* ---------- 三层菜单 ---------- */

test("免费会员的菜单里没有 /start —— 点了也是被拒", () => {
  const cmds = names(commandsFor({ points: 0 }, NOW_ISO));
  assert.ok(!cmds.includes("start"));
  assert.ok(cmds.includes("list"));
  assert.ok(cmds.includes("share"));
  assert.ok(cmds.includes("invite"));
});

test("付费会员看得到 /start", () => {
  const cmds = names(commandsFor({ points: 3 }, NOW_ISO));
  assert.ok(cmds.includes("start"));
  assert.ok(cmds.includes("cancel"));
});

test("试用中的人拿到付费会员那份", () => {
  const cmds = names(commandsFor({ points: 0, trial_until: "2026-12-01T00:00:00.000Z" }, NOW_ISO));
  assert.ok(cmds.includes("start"));
});

test("管理员多那四个", () => {
  const cmds = names(commandsFor({ points: 0, is_admin: 1 }, NOW_ISO));
  for (const c of ["adduser", "topup", "refund", "mode"]) {
    assert.ok(cmds.includes(c), `管理员该有 /${c}`);
  }
});

test("会员看不到管理员那四个", () => {
  const cmds = names(commandsFor({ points: 5 }, NOW_ISO));
  for (const c of ["adduser", "topup", "refund", "mode"]) {
    assert.ok(!cmds.includes(c));
  }
});

test("每一层都包含 /list 和 /share —— 挂票是所有人的", () => {
  for (const u of [{ points: 0 }, { points: 5 }, { points: 0, is_admin: 1 }]) {
    const cmds = names(commandsFor(u, NOW_ISO));
    assert.ok(cmds.includes("list"), JSON.stringify(u));
    assert.ok(cmds.includes("share"), JSON.stringify(u));
  }
});

/* ---------- 充值那一刻菜单要跟着换 ---------- */

test("/topup 之后，对方的菜单换成付费版", async () => {
  const { db, deps, menus } = ctx([
    { chat_id: 111, is_admin: 1 },
    { chat_id: 222, points: 0 },
  ]);
  await handleUpdate(msg(111, "/topup 222 5"), env(db), deps);

  const pushed = menus.find((m) => m.chatId === 222);
  assert.ok(pushed, "不推的话他的 Menu 键还是免费版");
  assert.ok(names(pushed.commands).includes("start"));
});

test("/topup 第一次会记下 first_topup_at，第二次不覆盖", async () => {
  const { db, deps } = ctx([
    { chat_id: 111, is_admin: 1 },
    { chat_id: 222, points: 0 },
  ]);
  await handleUpdate(msg(111, "/topup 222 5"), env(db), deps);
  const first = userOf(db, 222).first_topup_at;
  assert.ok(first, "这是「谁真的付过钱」的标记");

  await handleUpdate(msg(111, "/topup 222 5"), env(db), deps);
  assert.equal(userOf(db, 222).first_topup_at, first, "记的是第一次，不是最近一次");
});

test("/refund 不会把人标记成付过钱", async () => {
  const { db, deps } = ctx([
    { chat_id: 111, is_admin: 1 },
    { chat_id: 222, points: 3 },
  ]);
  await handleUpdate(msg(111, "/refund 222 1"), env(db), deps);

  assert.equal(userOf(db, 222).first_topup_at, null);
});

/* ---------- 邀请链接 ---------- */

test("/invite 给一条带自己 ID 的链接", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(111, "/invite"), env(db), deps);

  assert.match(tg.sent[0].text, /t\.me\/ktmbwatch_bot\?start=inv111/);
});

test("点了链接进来的人自动成为免费会员，并记下是谁拉的", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(777, "/start inv111"), env(db), deps);

  const u = userOf(db, 777);
  assert.ok(u, "要真的建帐号");
  assert.equal(u.points, 0, "进来是免费会员，不是付费");
  assert.equal(u.invited_by, 111);
  assert.match(tg.to(777)[0].text, /\/share/, "告诉他怎么拿试用");
});

test("邀请进来的人拿到免费会员的菜单", async () => {
  const { db, deps, menus } = ctx();
  await handleUpdate(msg(777, "/start inv111"), env(db), deps);

  const pushed = menus.find((m) => m.chatId === 777);
  assert.ok(pushed);
  assert.ok(!names(pushed.commands).includes("start"));
});

test("拉他的人会被告知", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(777, "/start inv111"), env(db), deps);

  assert.equal(tg.to(111).length, 1);
});

test("伪造一个不存在的邀请人，进不来", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(777, "/start inv999"), env(db), deps);

  assert.equal(userOf(db, 777), undefined, "邀请人得是真的会员");
  assert.match(tg.sent[0].text, /邀请制/);
});

test("已经是会员的人再点链接，不会被降级", async () => {
  const { db, deps } = ctx([{ chat_id: 111, points: 5 }, { chat_id: 222, points: 3 }]);
  await handleUpdate(msg(222, "/start inv111"), env(db), deps);

  assert.equal(userOf(db, 222).points, 3);
  assert.equal(userOf(db, 222).invited_by, null);
});

test("没有链接照样进不来 —— 这不是自助注册", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(msg(777, "/start"), env(db), deps);

  assert.equal(userOf(db, 777), undefined);
  assert.match(tg.sent[0].text, /邀请制/);
});

test("USER_COMMANDS 与 FREE_COMMANDS 都是 ADMIN_COMMANDS 的子集", () => {
  const admin = names(ADMIN_COMMANDS);
  for (const c of [...names(USER_COMMANDS), ...names(FREE_COMMANDS)]) {
    assert.ok(admin.includes(c), `/${c} 掉出管理员菜单了`);
  }
});
