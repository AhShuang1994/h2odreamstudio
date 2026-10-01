/**
 * 接口：没过 Access 一律 403；报告与建议的读写。
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";
import { verifyAccess, resetCertCache } from "../src/access.js";
import { freshDb, rows } from "./helpers/d1.js";

const TEAM = "h2o.cloudflareaccess.com";
const AUD = "aud-123";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const jwk = { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "k1" };
const certsFetch = async () => new Response(JSON.stringify({ keys: [jwk] }));

async function accessJwt(claims, key = privateKey) {
  const head = b64url(JSON.stringify({ alg: "RS256", kid: "k1" }));
  const body = b64url(
    JSON.stringify({ aud: [AUD], iss: `https://${TEAM}`, exp: Math.floor(Date.now() / 1000) + 600, email: "me@x.com", ...claims }),
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

const withJwt = (jwt) => new Request("https://x/app/report/api/status", { headers: { "Cf-Access-Jwt-Assertion": jwt } });
const accessEnv = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };

beforeEach(() => resetCertCache());

test("Access：签名对、发给这个应用、没过期 → 通过", async () => {
  const who = await verifyAccess(withJwt(await accessJwt({})), accessEnv, certsFetch);
  assert.equal(who.email, "me@x.com");
});

test("Access：没带 JWT、别的应用的、过期的、签名不对的 → 全部挡掉", async () => {
  const other = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign"],
  );
  const cases = [
    new Request("https://x/app/report/api/status"),
    withJwt(await accessJwt({ aud: ["someone-else"] })),
    withJwt(await accessJwt({ exp: Math.floor(Date.now() / 1000) - 1 })),
    withJwt(await accessJwt({ iss: "https://evil.cloudflareaccess.com" })),
    withJwt(await accessJwt({}, other.privateKey)),
    withJwt("not.a.jwt"),
  ];
  for (const req of cases) assert.equal(await verifyAccess(req, accessEnv, certsFetch), null);
});

test("Access：Worker 没设好 AUD，就算有 JWT 也不放行", async () => {
  const req = withJwt(await accessJwt({}));
  assert.equal(await verifyAccess(req, { ACCESS_TEAM_DOMAIN: TEAM }, certsFetch), null);
});

test("接口：没过 Access → 403，碰不到数据", async () => {
  const res = await worker.fetch(new Request("https://x/app/report/api/status"), { DB: freshDb() }, {});
  assert.equal(res.status, 403);
});

// ── 下面用 DEV_NO_ACCESS 跳过验证，专心测接口本身 ─────────────────────

const call = (db, method, path, body, headers = { "Content-Type": "application/json" }) =>
  worker.fetch(
    new Request(`https://x/app/report/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { DB: db, DEV_NO_ACCESS: "1" },
    {},
  );

// 每条建议都是实验，栏位细节见 experiments.test.js
const exp = { hypothesis: "h", metric: "m", baseline: "b", check_weeks: 4 };

const report = {
  kind: "weekly",
  period_start: "2026-09-21",
  period_end: "2026-09-27",
  body: "上周 WhatsApp 点击 3 次。",
  suggestions: [
    { title: "登记 Google 商家资料", detail: "本地搜索排最前的是地图结果。", ...exp },
    { title: "请 3 位老客户留评论", detail: "", ...exp },
  ],
};

test("Claude 交报告 → 页面读得到，建议按顺序、默认未处理", async () => {
  const db = freshDb();
  assert.equal((await call(db, "POST", "/reports", report)).status, 201);

  const list = await (await call(db, "GET", "/reports")).json();
  assert.equal(list.length, 1);
  assert.deepEqual(
    list[0].suggestions.map((s) => [s.title, s.status]),
    [["登记 Google 商家资料", "open"], ["请 3 位老客户留评论", "open"]],
  );
});

test("按「做了」「不做」→ 记下来，下次 Claude 读得到", async () => {
  const db = freshDb();
  await call(db, "POST", "/reports", report);
  const [first, second] = (await (await call(db, "GET", "/reports")).json())[0].suggestions;

  assert.equal((await call(db, "POST", `/suggestions/${first.id}`, { status: "done" })).status, 200);
  assert.equal((await call(db, "POST", `/suggestions/${second.id}`, { status: "skipped" })).status, 200);
  assert.equal((await call(db, "POST", `/suggestions/${second.id}`, { status: "maybe" })).status, 400);
  assert.equal((await call(db, "POST", "/suggestions/999", { status: "done" })).status, 404);

  const [s1, s2] = (await (await call(db, "GET", "/reports")).json())[0].suggestions;
  assert.deepEqual([s1.status, s2.status], ["done", "skipped"]);
  assert.ok(s1.status_at);
});

// 同一期重交：报告留原 id、建议记录不丢，细节见 resubmit.test.js
test("同一期重交：不会出现两份，正文换新", async () => {
  const db = freshDb();
  assert.equal((await call(db, "POST", "/reports", report)).status, 201);
  assert.equal((await call(db, "POST", "/reports", { ...report, body: "重写版" })).status, 200);
  const list = await (await call(db, "GET", "/reports")).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].body, "重写版");
});

test("形状不对的报告进不了库", async () => {
  const db = freshDb();
  const badOnes = [
    { ...report, kind: "daily" },
    { ...report, period_start: "21/09/2026" },
    { ...report, body: "" },
    { ...report, suggestions: [{ title: "" }] },
    { ...report, suggestions: Array(11).fill({ title: "x", detail: "" }) },
  ];
  for (const b of badOnes) assert.equal((await call(db, "POST", "/reports", b)).status, 400);
  assert.equal(rows(db, "SELECT COUNT(*) AS n FROM reports")[0].n, 0);
});

test("写入只收 JSON：跨站表单送不进来", async () => {
  const db = freshDb();
  const res = await call(db, "POST", "/reports", report, { "Content-Type": "text/plain" });
  assert.equal(res.status, 415);
});

test("/data 要合法的日期范围", async () => {
  const db = freshDb();
  assert.equal((await call(db, "GET", "/data?from=2026-09-01&to=2026-09-27")).status, 200);
  assert.equal((await call(db, "GET", "/data?from=2026-09-27&to=2026-09-01")).status, 400);
  assert.equal((await call(db, "GET", "/data?from=x&to=y")).status, 400);
});

test("/data?daily=only 只给逐日数字，不扫排行（省 D1 的每日读取额度）", async () => {
  const db = freshDb();
  db.sqlite.exec(`
    INSERT INTO ga_daily VALUES ('2026-09-27', 10, 12, 30, 1);
    INSERT INTO gsc_queries VALUES ('2026-09-27', 'web design', 1, 10, 5);
  `);
  const full = await (await call(db, "GET", "/data?from=2026-09-01&to=2026-09-27")).json();
  const daily = await (await call(db, "GET", "/data?from=2026-09-01&to=2026-09-27&daily=only")).json();
  assert.equal(full.queries.length, 1);
  assert.equal(daily.ga_daily.length, 1);
  assert.deepEqual([daily.queries, daily.pages, daily.channels, daily.gsc_pages], [[], [], [], []]);
});
