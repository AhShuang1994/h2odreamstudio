/**
 * handleUpdate —— Telegram 打进来的那个真入口。
 *
 * 测真入口而不是拆出来的小函数，因为「翻旧讯息点按钮」那类 bug
 * 只有走完整条路才拦得住。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleUpdate } from "../src/bot.js";
import { freshDb, seed, rows, recorder, fakeSearch, trip } from "./helpers/d1.js";

const KJ = "KLUANG>JB SENTRAL";
const DATE = "2999-01-04";

const env = (DB) => ({ DB, OKU_BASELINE: "4", TELEGRAM_BOT_TOKEN: "fake" });

const msg = (chatId, text) => ({ message: { chat: { id: chatId }, text } });
const tap = (chatId, data) => ({
  callback_query: { id: "1", message: { chat: { id: chatId } }, data },
});

const trains = { [`${KJ}|${DATE}`]: [trip(1840, 4), trip(2100, 6)] };

function ctx(users = [{ chat_id: 111, points: 5 }]) {
  const db = freshDb();
  seed(db, { users });
  const tg = recorder();
  return { db, tg, deps: { send: tg.send, search: fakeSearch(trains) } };
}

test("不在名单上的人只拿到自己的 ID，进不了菜单", async () => {
  const { db, tg, deps } = ctx([]);
  await handleUpdate(msg(999, "/start"), env(db), deps);

  assert.equal(tg.sent.length, 1);
  assert.match(tg.sent[0].text, /999/, "要把 chat_id 回给他，好拿去找管理员");
  assert.match(tg.sent[0].text, /邀请制/);
});

test("完整走一遍：选方向 → 选日期 → 勾班次 → 确定", async () => {
  const { db, tg, deps } = ctx();

  await handleUpdate(msg(111, "/start"), env(db), deps);
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  const watches = rows(db, "SELECT * FROM watches");
  assert.equal(watches.length, 1);
  assert.equal(watches[0].direction, "KJ");
  assert.equal(watches[0].date, DATE);
  assert.deepEqual(JSON.parse(watches[0].trains), [2100]);
  assert.match(tg.sent.at(-1).text, /盯上了/);
});

test("勾的班次现在就有位，确定时要马上讲，别让人干等通知", async () => {
  const { db, tg, deps } = ctx();

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps); // 21:00 有 6 个位
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  const confirm = tg.sent.at(-1).text;
  assert.match(confirm, /现在就有位/, "别让人盯着一班早就能订的车空等");
  assert.match(confirm, /21:00/);
  assert.match(confirm, /6/);
});

test("勾的班次现在没位，确定时说清楚我只在变有位那一刻通知", async () => {
  const { db, tg, deps } = ctx();

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:1840`), env(db), deps); // 18:40 只有 4 个（OKU）
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  const confirm = tg.sent.at(-1).text;
  assert.doesNotMatch(confirm, /现在就有位/);
  assert.match(confirm, /没位变有位|有位的那一刻/, "讲清楚通知的时机，免得又误会");
});

test("现在就有位时，附一个「我订到了，别盯了」的按钮", async () => {
  const { db, tg, deps } = ctx();

  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  const watchId = rows(db, "SELECT id FROM watches")[0].id;
  const buttons = (tg.sent.at(-1).keyboard ?? []).flat();
  assert.ok(
    buttons.some((b) => b.callback_data === `cx:${watchId}`),
    "要能一按就删，别叫人去打 /cancel",
  );
});

test("按了「我订到了」就把那条盯梢关掉", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  const watchId = rows(db, "SELECT id FROM watches")[0].id;
  await handleUpdate(tap(111, `cx:${watchId}`), env(db), deps);

  assert.equal(rows(db, "SELECT * FROM watches WHERE active=1").length, 0);
});

test("没位的时候不给那个按钮 —— 他还没订到，别引他关掉", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:1840`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  assert.equal((tg.sent.at(-1).keyboard ?? []).flat().length, 0);
});

test("/my 不列已经过期的盯梢", async () => {
  const db = freshDb();
  seed(db, {
    users: [{ chat_id: 111, points: 5 }],
    watches: [
      { chat_id: 111, direction: "KJ", date: "2020-01-01", trains: [1840] },
      { chat_id: 111, direction: "KJ", date: DATE, trains: [2100] },
    ],
  });
  const tg = recorder();
  await handleUpdate(msg(111, "/my"), env(db), { send: tg.send, search: fakeSearch(trains) });

  const out = tg.sent.at(-1).text;
  assert.doesNotMatch(out, /2020-01-01/, "过期的不该再占版面");
  assert.match(out, new RegExp(DATE));
});

test("勾了再点一次会取消勾选", async () => {
  const { db, deps } = ctx();
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);

  assert.deepEqual(JSON.parse(rows(db, "SELECT * FROM drafts")[0].trains), []);
});

test("翻旧讯息点按钮：不会污染当前这一轮", async () => {
  const { db, tg, deps } = ctx();
  const OLD = "2999-01-01";

  // 用户已经开了新的一轮，停在 DATE
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);

  // 然后翻上去点旧日期那一批的勾勾
  await handleUpdate(tap(111, `tr:KJ:${OLD}:1840`), env(db), deps);

  assert.deepEqual(
    JSON.parse(rows(db, "SELECT * FROM drafts")[0].trains),
    [],
    "旧按钮不该把班次塞进新草稿",
  );
  assert.match(tg.sent.at(-1).text, /旧的选单/);
});

test("按了确定之后，旧的确定钮再按一次不会建第二条", async () => {
  const { db, deps } = ctx();
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `tr:KJ:${DATE}:2100`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  assert.equal(rows(db, "SELECT * FROM watches").length, 1);
});

test("一班都没勾就按确定，不会建空的 watch", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);
  await handleUpdate(tap(111, `done:KJ:${DATE}`), env(db), deps);

  assert.equal(rows(db, "SELECT * FROM watches").length, 0);
  assert.match(tg.sent.at(-1).text, /还没勾/);
});

test("班次列表要标出哪些是 OKU（剩 4 个算没位）", async () => {
  const { db, tg, deps } = ctx();
  await handleUpdate(tap(111, "dir:KJ"), env(db), deps);
  await handleUpdate(tap(111, `date:KJ:${DATE}`), env(db), deps);

  const listing = tg.sent.at(-1).text;
  assert.match(listing, /18:40 Platinum - 9531 — 没位/, "4 个是 OKU，算没位");
  assert.match(listing, /21:00 .* — 有位（6）/, "6 个越过基线，算有位");
});

test("非管理员打管理员指令没有用", async () => {
  const { db, deps } = ctx([{ chat_id: 111, points: 5, is_admin: 0 }]);
  await handleUpdate(msg(111, "/topup 111 999"), env(db), deps);

  assert.equal(rows(db, "SELECT points FROM users WHERE chat_id=111")[0].points, 5);
});

test("管理员加点会写流水，也会私讯对方", async () => {
  const { db, tg, deps } = ctx([
    { chat_id: 111, points: 0, is_admin: 1 },
    { chat_id: 222, points: 0 },
  ]);
  await handleUpdate(msg(111, "/topup 222 5"), env(db), deps);

  assert.equal(rows(db, "SELECT points FROM users WHERE chat_id=222")[0].points, 5);
  const led = rows(db, "SELECT * FROM ledger");
  assert.equal(led[0].delta, 5);
  assert.equal(led[0].reason, "topup");
  assert.equal(tg.to(222).length, 1, "对方要收到到账通知");
});

test("/mode broadcast 要提醒管理员那段时间不扣点", async () => {
  const { db, tg, deps } = ctx([{ chat_id: 111, points: 0, is_admin: 1 }]);
  await handleUpdate(msg(111, "/mode broadcast"), env(db), deps);

  assert.equal(
    rows(db, "SELECT value FROM settings WHERE key='allocation_mode'")[0].value,
    "broadcast",
  );
  assert.match(tg.sent.at(-1).text, /不扣点/);
});

test("/mode 只认得 queue 和 broadcast", async () => {
  const { db, deps } = ctx([{ chat_id: 111, points: 0, is_admin: 1 }]);
  await handleUpdate(msg(111, "/mode chaos"), env(db), deps);

  assert.equal(
    rows(db, "SELECT value FROM settings WHERE key='allocation_mode'")[0].value,
    "queue",
    "乱打不该改到设定",
  );
});
