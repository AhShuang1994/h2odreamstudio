/**
 * 收件箱的外部行为：谁能开箱、谁能投递、谁能拉取，以及库里到底留下了什么。
 *
 * 断言打在 HTTP 进出与 D1 内容上，不断言内部函数怎么组织。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { handle, receiveMail, runSweep } from "../src/index.js";
import { freshDb, rows, dump } from "./helpers/d1.js";
import { generateKeyPair, open } from "../../../public/app/moneybook/inbox-crypto.js";
import { parseBankMail } from "../../../public/app/moneybook/ledger.js";

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
  MAIL_DOMAIN: "h2o-dreamer-studio.com",
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

/* ---------- 转寄地址：Gmail 过滤器把银行邮件转进来（ADR-0004） ---------- */

const DBS_BODY = JSON.parse(readFileSync(new URL("../../../test/moneybook/fixtures/bank-mail/dbs-card-spend.json", import.meta.url), "utf8")).mail.body;

/** 一封 MIME 原文。html 为真时只有 HTML 部分：很多银行只寄 HTML */
function mime({ subject = "Card Transaction Alert", body = DBS_BODY, html = false, from = "DBS Alerts <ibanking.alert@dbs.com>" } = {}) {
  return [
    `From: ${from}`,
    "To: someone@gmail.com",
    `Subject: ${subject}`,
    "Date: Tue, 29 Sep 2026 09:05:00 +0800",
    "MIME-Version: 1.0",
    `Content-Type: text/${html ? "html" : "plain"}; charset=utf-8`,
    "",
    body,
  ].join("\r\n");
}

/** 冒充 Cloudflare 交给 email() 的那封信。rejected 记下被退信的原因 */
function inbound(to, raw) {
  const rejected = [];
  return {
    to,
    from: "bounces+srs@gmail.com",
    rawSize: new TextEncoder().encode(raw).length,
    raw: new Blob([raw]).stream(),
    headers: new Headers(),
    setReject: (why) => rejected.push(why),
    rejected,
  };
}

async function mailAddress(e, box, token = box.read) {
  return handle(req("POST", `/i/${box.id}/mail`, { token }), e, NOW);
}

test("转寄地址：只有读钥匙拿得到，库里只存哈希，再要一次就换新的", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);

  assert.equal((await mailAddress(e, box, box.write)).status, 404, "写钥匙拿不到");
  const res = await mailAddress(e, box);
  assert.equal(res.status, 200);
  const { address } = await res.json();
  assert.match(address, /^mb\+[a-z2-7]{20}@h2o-dreamer-studio\.com$/);
  const alias = address.slice(3, 23);
  assert.ok(!dump(DB).includes(alias), "地址原文不该落库");

  const again = (await (await mailAddress(e, box)).json()).address;
  assert.notEqual(again, address);
  const old = inbound(address, mime());
  await receiveMail(old, e, NOW);
  assert.equal(old.rejected.length, 1, "换过之后旧地址退信");
  assert.equal(rows(DB, "SELECT * FROM items").length, 0);
});

test("转寄地址：没设 MAIL_DOMAIN 就不发地址", async () => {
  const DB = freshDb();
  const e = env(DB, { MAIL_DOMAIN: "" });
  const box = await openInbox(e);
  assert.equal((await mailAddress(e, box)).status, 404);
});

test("转寄进来的邮件：封起来落库，解封后跟快捷指令投的一样，而且小帐本读得懂", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  const { address } = await (await mailAddress(e, box)).json();

  const msg = inbound(address, mime());
  await receiveMail(msg, e, NOW);
  assert.deepEqual(msg.rejected, []);

  const all = dump(DB);
  for (const plain of ["BUS/MRT", "SGD3.64", "dbs.com", "Card Transaction"]) {
    assert.ok(!all.includes(plain), `库里不该出现明文：${plain}`);
  }
  const [item] = await pull(e, box);
  const got = await open(box.priv, item);
  assert.equal(got.t, "2026-09-29T01:05:00.000Z", "用邮件自己的时间");
  assert.equal(got.mail.from, "DBS Alerts <ibanking.alert@dbs.com>", "用信头的寄件人，不是 Gmail 转寄时的信封地址");
  assert.equal(got.mail.subject, "Card Transaction Alert");
  assert.deepEqual(parseBankMail(got.mail), { bank: "DBS", direction: "out", amount: 3.64, currency: "SGD", merchant: "BUS/MRT" });
});

test("转寄进来的邮件：只有 HTML 也读得出一行一行的文字", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  const { address } = await (await mailAddress(e, box)).json();

  const html = `<html><head><style>td{color:red}</style></head><body>
    <p>Card Transaction Alert</p>
    <table><tr><td>Amount:</td><td>SGD3.64</td></tr>
    <tr><td>To:</td><td>BUS&#47;MRT &amp; more</td></tr></table>
    <p>Dear&nbsp;Sir<br>Thank you</p></body></html>`;
  await receiveMail(inbound(address, mime({ html: true, body: html })), e, NOW);
  const [item] = await pull(e, box);
  const { body } = (await open(box.priv, item)).mail;
  assert.match(body, /^Amount: SGD3\.64$/m);
  assert.match(body, /^To: BUS\/MRT & more$/m);
  assert.ok(!body.includes("<") && !body.includes("color:red"), "标签与样式都去掉");
});

test("转寄进来的邮件：不认得的地址、太大的信一律退信，库里什么都没有", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  const { address } = await (await mailAddress(e, box)).json();

  for (const to of ["mb@h2o-dreamer-studio.com", "mb+aaaaaaaaaaaaaaaaaaaa@h2o-dreamer-studio.com", "huihuang@h2o-dreamer-studio.com"]) {
    const m = inbound(to, mime());
    await receiveMail(m, e, NOW);
    assert.equal(m.rejected.length, 1, to);
  }
  const big = inbound(address, mime({ body: "x".repeat(300 * 1024) }));
  await receiveMail(big, e, NOW);
  assert.equal(big.rejected.length, 1, "超过上限");
  assert.equal(rows(DB, "SELECT * FROM items").length, 0);
});

test("转寄进来的邮件：地址大小写不同也认得（有的寄件端会把它转成大写）", async () => {
  const DB = freshDb();
  const e = env(DB);
  const box = await openInbox(e);
  const { address } = await (await mailAddress(e, box)).json();
  const m = inbound(address.toUpperCase(), mime());
  await receiveMail(m, e, NOW);
  assert.deepEqual(m.rejected, []);
  assert.equal(rows(DB, "SELECT * FROM items").length, 1);
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
