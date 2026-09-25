/**
 * 收件箱的外部行为：谁能开箱、谁能投递、谁能拉取，以及库里到底留下了什么。
 *
 * 断言打在 HTTP 进出与 D1 内容上，不断言内部函数怎么组织。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { handle, runSweep } from "../src/index.js";
import { freshDb, rows, dump } from "./helpers/d1.js";
import { generateKeyPair, open } from "../../../public/app/moneybook/inbox-crypto.js";

const ORIGIN = "https://www.h2o-dreamer-studio.com";
const BASE = "https://inbox.test";
const NOW = new Date("2026-09-23T04:00:00Z");

const env = (DB, extra = {}) => ({
  DB,
  ALLOWED_ORIGINS: ORIGIN,
  MAX_OPENS_PER_HOUR: "5",
  MAX_ITEMS_PER_DAY: "300",
  MAX_PENDING: "500",
  MAX_BODY_BYTES: "1024",
  ...extra,
});

function req(method, path, { body, token, ip = "203.0.113.7", origin = ORIGIN, raw } = {}) {
  const headers = { "CF-Connecting-IP": ip };
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
  return new Request(BASE + path, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

/** 开一个收件箱，返回钥匙与私钥 */
async function openInbox(e, now = NOW, ip) {
  const kp = await generateKeyPair();
  const res = await handle(req("POST", "/inbox", { body: { pubkey: kp.pub }, ip }), e, now);
  assert.equal(res.status, 201);
  return { ...(await res.json()), priv: kp.priv };
}

const swipe = { t: "2026-09-23T12:30:00+08:00", amount: "S$12.50", merchant: "7-Eleven", card: "DBS Visa" };

async function post(e, box, body = swipe, now = NOW) {
  return handle(req("POST", `/i/${box.id}/${box.write}`, { body, origin: null }), e, now);
}

async function pull(e, box, now = NOW) {
  const res = await handle(req("GET", `/i/${box.id}`, { token: box.read }), e, now);
  assert.equal(res.status, 200);
  return (await res.json()).items;
}

test("开箱：两把不同的钥匙，库里只存哈希", async () => {
  const DB = freshDb();
  const box = await openInbox(env(DB));
  assert.notEqual(box.write, box.read);
  assert.ok(box.write.length >= 40 && box.read.length >= 40);

  const [row] = rows(DB, "SELECT * FROM inboxes");
  const all = dump(DB);
  assert.ok(!all.includes(box.write), "写钥匙原文不该落库");
  assert.ok(!all.includes(box.read), "读钥匙原文不该落库");
  assert.equal(row.id, box.id);
  assert.ok(!JSON.parse(row.pubkey).d, "只存公钥");
});

test("开箱：公钥不合法就拒绝，私钥也不收", async () => {
  const DB = freshDb();
  const kp = await generateKeyPair();
  for (const pubkey of [null, { kty: "RSA" }, kp.priv]) {
    const res = await handle(req("POST", "/inbox", { body: { pubkey } }), env(DB), NOW);
    assert.equal(res.status, 400);
  }
  assert.equal(rows(DB, "SELECT * FROM inboxes").length, 0);
});

test("开箱：同一个 IP 每小时有上限，库里不存 IP 原文", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_OPENS_PER_HOUR: "2" });
  await openInbox(e);
  await openInbox(e);
  const kp = await generateKeyPair();
  const res = await handle(req("POST", "/inbox", { body: { pubkey: kp.pub } }), e, NOW);
  assert.equal(res.status, 429);

  // 换一个小时就重新算
  await openInbox(e, new Date("2026-09-23T05:00:00Z"));
  // 别的 IP 不受影响
  await openInbox(e, NOW, "198.51.100.9");
  assert.ok(!dump(DB).includes("203.0.113.7"));
});

test("投递 → 拉取 → 解封：只有私钥解得开，库里没有明文", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  assert.equal((await post(e, box)).status, 200);

  const all = dump(DB);
  for (const plain of ["7-Eleven", "12.50", "DBS Visa", "2026-09-23T12:30"]) {
    assert.ok(!all.includes(plain), `库里不该出现明文：${plain}`);
  }

  const items = await pull(e, box);
  assert.equal(items.length, 1);
  assert.deepEqual(await open(box.priv, items[0]), swipe);

  // 别人的私钥解不开
  const other = await generateKeyPair();
  await assert.rejects(open(other.priv, items[0]));
});

test("投递：不带刷卡时间也收，用收到的时间补上", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  const { t, ...noTime } = swipe;
  assert.equal((await post(e, box, noTime)).status, 200);
  const [item] = await pull(e, box);
  const got = await open(box.priv, item);
  assert.equal(got.t, NOW.toISOString());
  assert.equal(got.merchant, "7-Eleven");
});

test("权限：写钥匙读不到，读钥匙写不进，猜错的 id 一律 404", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  await post(e, box);

  const asWrite = await handle(req("GET", `/i/${box.id}`, { token: box.write }), e, NOW);
  assert.equal(asWrite.status, 404);
  const noToken = await handle(req("GET", `/i/${box.id}`), e, NOW);
  assert.equal(noToken.status, 404);

  const writeWithRead = await handle(req("POST", `/i/${box.id}/${box.read}`, { body: swipe }), e, NOW);
  assert.equal(writeWithRead.status, 404);
  const wrongId = await handle(req("POST", `/i/nope/${box.write}`, { body: swipe }), e, NOW);
  assert.equal(wrongId.status, 404);

  // 另一个收件箱的读钥匙读不到这一箱
  const mine = await openInbox(e, NOW, "198.51.100.9");
  const cross = await handle(req("GET", `/i/${box.id}`, { token: mine.read }), e, NOW);
  assert.equal(cross.status, 404);

  assert.equal(rows(DB, "SELECT * FROM items").length, 1);
});

test("投递：请求体过大、缺金额都拒绝", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  const huge = { ...swipe, merchant: "x".repeat(2000) };
  assert.equal((await post(e, box, huge)).status, 413);
  assert.equal((await post(e, box, { merchant: "7-Eleven" })).status, 400);
  const bad = await handle(req("POST", `/i/${box.id}/${box.write}`, { raw: "not json" }), e, NOW);
  assert.equal(bad.status, 400);
  assert.equal(rows(DB, "SELECT * FROM items").length, 0);
});

test("投递：商家与卡名截到 80 字", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_BODY_BYTES: "4096" });
  const box = await openInbox(e);
  await post(e, box, { ...swipe, merchant: "m".repeat(200), card: "c".repeat(200) });
  const [item] = await pull(e, box);
  const got = await open(box.priv, item);
  assert.equal(got.merchant.length, 80);
  assert.equal(got.card.length, 80);
});

const bankMail = {
  from: "DBS Alerts <ibanking.alert@dbs.com>",
  subject: "Card Transaction Alert",
  body: "Amount: SGD12.50 To: KOPITIAM PTE LTD Card ending 1234",
};

test("银行邮件：投递 → 拉取 → 解封，库里没有明文", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_MAIL_BYTES: "16384" });
  const box = await openInbox(e);
  assert.equal((await post(e, box, { mail: bankMail })).status, 200);

  const all = dump(DB);
  for (const plain of ["KOPITIAM", "SGD12.50", "dbs.com", "Card Transaction"]) {
    assert.ok(!all.includes(plain), `库里不该出现明文：${plain}`);
  }
  const [item] = await pull(e, box);
  assert.deepEqual(await open(box.priv, item), { t: NOW.toISOString(), mail: bankMail });
});

test("银行邮件：正文截到 8000 字，寄件人与标题也截短", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_MAIL_BYTES: "16384" });
  const box = await openInbox(e);
  const long = { from: "f".repeat(500), subject: "s".repeat(500), body: "b".repeat(9000) };
  assert.equal((await post(e, box, { mail: long })).status, 200);
  const [item] = await pull(e, box);
  const got = (await open(box.priv, item)).mail;
  assert.equal(got.body.length, 8000);
  assert.equal(got.from.length, 200);
  assert.equal(got.subject.length, 300);
});

test("银行邮件：超过邮件上限、没标题也没正文都拒绝", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_MAIL_BYTES: "16384" });
  const box = await openInbox(e);
  const huge = { ...bankMail, body: "b".repeat(17000) };
  assert.equal((await post(e, box, { mail: huge })).status, 413);
  assert.equal((await post(e, box, { mail: { from: "x@dbs.com" } })).status, 400);
  assert.equal(rows(DB, "SELECT * FROM items").length, 0);
});

test("银行邮件的上限不放宽刷卡投递：刷卡仍然只收 1 KB", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_MAIL_BYTES: "16384" });
  const box = await openInbox(e);
  assert.equal((await post(e, box, { ...swipe, merchant: "x".repeat(2000) })).status, 413);
});

test("投递：每天上限与待同步上限", async () => {
  const DB = freshDb();
  const e = env(DB, { MAX_ITEMS_PER_DAY: "2", MAX_PENDING: "3" });
  const box = await openInbox(e);
  assert.equal((await post(e, box)).status, 200);
  assert.equal((await post(e, box)).status, 200);
  assert.equal((await post(e, box)).status, 429, "当天第三笔超过每日上限");

  const tomorrow = new Date("2026-09-24T04:00:00Z");
  assert.equal((await post(e, box, swipe, tomorrow)).status, 200, "换日重新计数");
  assert.equal((await post(e, box, swipe, tomorrow)).status, 429, "囤满 3 笔没拉走");
});

test("确认：只删自己收件箱的记录", async () => {
  const DB = freshDb();
  const e = env(DB);
  const a = await openInbox(e);
  const b = await openInbox(e, NOW, "198.51.100.9");
  await post(e, a);
  await post(e, b);
  const [itemA] = await pull(e, a);
  const [itemB] = await pull(e, b);

  // 拿 a 的钥匙去删 b 的记录：删不到
  let res = await handle(req("POST", `/i/${a.id}/ack`, { token: a.read, body: { ids: [itemB.id] } }), e, NOW);
  assert.deepEqual(await res.json(), { deleted: 0 });

  res = await handle(req("POST", `/i/${a.id}/ack`, { token: a.read, body: { ids: [itemA.id] } }), e, NOW);
  assert.deepEqual(await res.json(), { deleted: 1 });
  assert.equal((await pull(e, a)).length, 0);
  assert.equal((await pull(e, b)).length, 1);
});

test("关闭：收件箱和里面的记录一起删，写钥匙随之失效", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  await post(e, box);
  const res = await handle(req("DELETE", `/i/${box.id}`, { token: box.read }), e, NOW);
  assert.equal(res.status, 204);
  assert.equal(rows(DB, "SELECT * FROM inboxes").length, 0);
  assert.equal(rows(DB, "SELECT * FROM items").length, 0);
  assert.equal((await post(e, box)).status, 404);
});

test("CORS：只放行小帐本的网域", async () => {
  const DB = freshDb();
  const e = env(DB);
  const ok = await handle(req("OPTIONS", "/inbox"), e, NOW);
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("Access-Control-Allow-Origin"), ORIGIN);

  const evil = await handle(req("OPTIONS", "/inbox", { origin: "https://evil.example" }), e, NOW);
  assert.equal(evil.status, 403);
  assert.equal(evil.headers.get("Access-Control-Allow-Origin"), null);
});

test("每日清理：30 天的记录、180 天没读的收件箱", async () => {
  const DB = freshDb();
  const e = env(DB);
  const stale = await openInbox(e, new Date("2026-01-01T00:00:00Z"));
  const live = await openInbox(e, NOW, "198.51.100.9");
  await post(e, live, swipe, new Date("2026-08-01T00:00:00Z")); // 已经放了 50 多天
  await post(e, live);                                          // 今天的

  await runSweep(e, NOW);
  const ids = rows(DB, "SELECT id FROM inboxes").map((r) => r.id);
  assert.deepEqual(ids, [live.id], "半年多没读的收件箱被清掉");
  assert.ok(!ids.includes(stale.id));
  assert.equal(rows(DB, "SELECT * FROM items").length, 1, "只剩今天那笔");
  const hours = rows(DB, "SELECT hour FROM open_quota").map((r) => r.hour);
  assert.deepEqual(hours, ["2026-09-23T04"], "一月那笔限速计数清掉，这个小时的留着");
});
