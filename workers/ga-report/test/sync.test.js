/**
 * runSync 整条链：假的 Google → 真 SQL。
 * 最要紧的是：该拉哪几天、数字有没有进对表、一个来源挂了不拖累别的。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { plan, todayMyt, runSync } from "../src/sync.js";
import { rangeData, status } from "../src/db.js";
import { freshDb, rows } from "./helpers/d1.js";

const opts = { today: "2026-09-28", recentDays: 7, historyDays: 400 };

test("马来西亚早上 7 点，UTC 还是前一天：今天要按马来西亚算", () => {
  assert.equal(todayMyt(Date.parse("2026-09-27T23:00:00Z")), "2026-09-28");
});

test("第一次跑：只拉到昨天为止的 31 天", () => {
  assert.deepEqual(plan(null, opts), {
    ranges: [["2026-08-28", "2026-09-27"]],
    oldest: "2026-08-28",
  });
});

test("之后每次：重拉最近 7 天，再往回补 31 天", () => {
  assert.deepEqual(plan({ oldest: "2026-08-28" }, opts), {
    ranges: [
      ["2026-09-21", "2026-09-27"],
      ["2026-07-28", "2026-08-27"],
    ],
    oldest: "2026-07-28",
  });
});

test("补到底线就停，不会超过 HISTORY_DAYS", () => {
  const floor = "2025-08-24"; // 昨天往回 400 天（含昨天）
  assert.deepEqual(plan({ oldest: "2025-09-10" }, opts).ranges[1], [floor, "2025-09-09"]);
  assert.deepEqual(plan({ oldest: floor }, opts), {
    ranges: [["2026-09-21", "2026-09-27"]],
    oldest: floor,
  });
});

// ── 假的 Google ─────────────────────────────────────────────────────

const SA_KEY = await (async () => {
  const { privateKey } = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", privateKey)).toString("base64");
  return JSON.stringify({
    client_email: "report@test.iam.gserviceaccount.com",
    private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----\n`,
  });
})();

const gaRow = (dims, mets) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: mets.map((m) => ({ value: String(m) })),
});

function fakeGoogle({ gaFails = false } = {}) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    const u = String(url);
    const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    const ok = (data) => new Response(JSON.stringify(data), { status: 200 });

    if (u.startsWith("https://oauth2.googleapis.com/token")) return ok({ access_token: "tok" });

    if (u.includes("analyticsdata")) {
      if (gaFails) return new Response("PERMISSION_DENIED", { status: 403 });
      const end = body.requests[0].dateRanges[0].endDate;
      if (end !== "2026-09-27") return ok({ reports: body.requests.map(() => ({})) });
      return ok({
        reports: [
          { rows: [gaRow(["20260927"], [10, 12, 30])] },
          { rows: [gaRow(["20260927", "Organic Search"], [5]), gaRow(["20260927", "Direct"], [7])] },
          { rows: [gaRow(["20260927", "/"], [20]), gaRow(["20260927", "/pricing"], [10])] },
          { rows: [gaRow(["20260927", "/pricing"], [2]), gaRow(["20260927", "/contact"], [1])] },
        ],
      });
    }

    if (u.includes("searchAnalytics")) {
      const dims = body.dimensions;
      if (body.endDate !== "2026-09-27") return ok({});
      if (dims.length === 1) return ok({ rows: [{ keys: ["2026-09-25"], clicks: 3, impressions: 100, position: 12 }] });
      if (dims[1] === "query")
        return ok({
          rows: [
            { keys: ["2026-09-24", "web design johor bahru"], clicks: 1, impressions: 10, position: 30 },
            { keys: ["2026-09-25", "web design johor bahru"], clicks: 2, impressions: 90, position: 10 },
          ],
        });
      return ok({ rows: [{ keys: ["2026-09-25", "https://www.h2o-dreamer-studio.com/"], clicks: 3, impressions: 100, position: 12 }] });
    }

    if (u.endsWith("sitemap.xml")) {
      return new Response(
        "<urlset><url><loc>https://www.h2o-dreamer-studio.com/</loc></url>" +
          "<url><loc>https://www.h2o-dreamer-studio.com/web-design-johor-bahru</loc></url></urlset>",
      );
    }

    if (u.includes("urlInspection")) {
      const indexed = body.inspectionUrl.endsWith(".com/");
      return ok({
        inspectionResult: {
          indexStatusResult: indexed
            ? { verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-09-20T00:00:00Z" }
            : { verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" },
        },
      });
    }

    throw new Error(`测试没准备这个请求：${u}`);
  };
  return { fetchFn, calls };
}

const env = (DB) => ({
  DB,
  GOOGLE_SA_KEY: SA_KEY,
  GA_PROPERTY_ID: "123",
  GSC_SITE: "sc-domain:h2o-dreamer-studio.com",
  SITEMAP_URL: "https://www.h2o-dreamer-studio.com/sitemap.xml",
  HISTORY_DAYS: "400",
  INSPECT_PER_RUN: "15",
});

const NOW = Date.parse("2026-09-28T01:00:00Z");

test("跑一次：GA、GSC、收录状态都进库", async () => {
  const db = freshDb();
  const { fetchFn } = fakeGoogle();
  const results = await runSync(env(db), { fetchFn, now: NOW });
  assert.deepEqual(results.map((r) => r.ok), [true, true, true]);

  const data = await rangeData(db, "2026-09-01", "2026-09-27");
  assert.deepEqual(data.ga_daily, [
    { date: "2026-09-27", users: 10, sessions: 12, views: 30, wa_clicks: 3, organic_sessions: 5 },
  ]);
  // /contact 没有浏览数但有点击，也要算进页面表
  assert.deepEqual(data.pages, [
    { path: "/pricing", views: 10, wa_clicks: 2 },
    { path: "/contact", views: 0, wa_clicks: 1 },
    { path: "/", views: 20, wa_clicks: 0 },
  ]);
  // 排名按曝光加权：(30×10 + 10×90) / 100 = 12，不是 (30+10)/2 = 20
  assert.deepEqual(data.queries, [
    { query: "web design johor bahru", clicks: 3, impressions: 100, position: 12 },
  ]);

  const s = await status(db);
  assert.equal(s.gsc_latest, "2026-09-25");
  assert.deepEqual(
    { total: s.index.total, checked: s.index.checked, indexed: s.index.indexed },
    { total: 2, checked: 2, indexed: 1 },
  );
  assert.equal(s.index.not_indexed[0].coverage, "Discovered - currently not indexed");
  assert.deepEqual(
    rows(db, "SELECT source, oldest, last_error FROM sync_state ORDER BY source"),
    [
      { source: "ga", oldest: "2026-08-28", last_error: null },
      { source: "gsc", oldest: "2026-08-28", last_error: null },
      { source: "index", oldest: null, last_error: null },
    ],
  );
});

test("再跑一次：同一天的数字被换掉，不是叠加", async () => {
  const db = freshDb();
  const { fetchFn } = fakeGoogle();
  await runSync(env(db), { fetchFn, now: NOW });
  await runSync(env(db), { fetchFn, now: NOW });
  assert.equal(rows(db, "SELECT SUM(wa_clicks) AS n FROM ga_daily")[0].n, 3);
  assert.equal(rows(db, "SELECT COUNT(*) AS n FROM gsc_queries")[0].n, 2);
});

test("GA 挂了：错误记下来，GSC 照样进库，GA 的旧数据不被清掉", async () => {
  const db = freshDb();
  await runSync(env(db), { fetchFn: fakeGoogle().fetchFn, now: NOW });
  const results = await runSync(env(db), { fetchFn: fakeGoogle({ gaFails: true }).fetchFn, now: NOW });

  assert.deepEqual(results.map((r) => [r.source, r.ok]), [["ga", false], ["gsc", true], ["index", true]]);
  assert.match(rows(db, "SELECT last_error FROM sync_state WHERE source = 'ga'")[0].last_error, /403/);
  assert.equal(rows(db, "SELECT COUNT(*) AS n FROM ga_daily")[0].n, 1);
  // 失败那次不能把 oldest 往回推，不然那段历史就永远不补了
  assert.equal(rows(db, "SELECT oldest FROM sync_state WHERE source = 'ga'")[0].oldest, "2026-08-28");
});

test("收录状态每次只查一小批，先查没查过的", async () => {
  const db = freshDb();
  const { fetchFn, calls } = fakeGoogle();
  await runSync({ ...env(db), INSPECT_PER_RUN: "1" }, { fetchFn, now: NOW });
  assert.equal(calls.filter((c) => c.url.includes("urlInspection")).length, 1);

  const second = fakeGoogle();
  await runSync({ ...env(db), INSPECT_PER_RUN: "1" }, { fetchFn: second.fetchFn, now: NOW });
  const inspected = second.calls.filter((c) => c.url.includes("urlInspection"));
  assert.equal(inspected.length, 1);
  assert.equal(rows(db, "SELECT COUNT(*) AS n FROM index_status WHERE checked_at IS NOT NULL")[0].n, 2);
});
