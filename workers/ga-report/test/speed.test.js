/**
 * 打开速度（Cloudflare Web Analytics）：拉进来的数字对不对、合计与 p75 怎么算、
 * 跟 Google 互不拖累。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchSpeed, parseSpeed } from "../src/cloudflare.js";
import { runSync } from "../src/sync.js";
import { rangeData, status } from "../src/db.js";
import { freshDb, rows } from "./helpers/d1.js";

const group = (date, device, path, { visits = 1, lcp = [1, 1, 0, 800000], inp = [0, 0, 0, -1], cls = [1, 1, 0, 0.01] } = {}) => ({
  dimensions: { date, deviceType: device, requestPath: path },
  sum: {
    visits,
    lcpTotal: lcp[0], lcpGood: lcp[1], lcpPoor: lcp[2],
    inpTotal: inp[0], inpGood: inp[1], inpPoor: inp[2],
    clsTotal: cls[0], clsGood: cls[1], clsPoor: cls[2],
  },
  quantiles: { largestContentfulPaintP75: lcp[3], interactionToNextPaintP75: inp[3], cumulativeLayoutShiftP75: cls[3] },
});

const reply = (groups) => ({ data: { viewer: { accounts: [{ rumWebVitalsEventsAdaptiveGroups: groups }] } } });

function fakeCloudflare(groups) {
  const calls = [];
  const fetchFn = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), auth: init.headers.Authorization, variables: body.variables });
    const { date_geq, date_leq } = body.variables.filter;
    return new Response(JSON.stringify(reply(groups.filter((g) => g.dimensions.date >= date_geq && g.dimensions.date <= date_leq))));
  };
  return { fetchFn, calls };
}

test("Cloudflare 的微秒换成毫秒；没量到的（-1）变成空，不是 0", () => {
  const [r] = parseSpeed(reply([group("2026-09-27", "mobile", "/", { lcp: [2, 2, 0, 1234567], inp: [0, 0, 0, -1] })]));
  assert.equal(r.lcp_p75, 1235);
  assert.equal(r.inp_p75, null);
  assert.equal(r.cls_p75, 0.01);
});

test("Cloudflare 回错误 → 丢出来，不当成没有访客", () => {
  assert.throws(() => parseSpeed({ data: null, errors: [{ message: "not authorized" }] }), /not authorized/);
});

test("一次只问 7 天（问太长 Cloudflare 会少给），不算机器人，不算 /app/ 与 /cdn-cgi/ 这些自己用的页面", async () => {
  const { fetchFn, calls } = fakeCloudflare([]);
  await fetchSpeed({ token: "t", accountId: "acc", siteTag: "site", start: "2026-08-28", end: "2026-09-27" }, fetchFn);
  assert.deepEqual(
    calls.map((c) => [c.variables.filter.date_geq, c.variables.filter.date_leq]),
    [
      ["2026-08-28", "2026-09-03"],
      ["2026-09-04", "2026-09-10"],
      ["2026-09-11", "2026-09-17"],
      ["2026-09-18", "2026-09-24"],
      ["2026-09-25", "2026-09-27"],
    ],
  );
  const { filter } = calls[0].variables;
  assert.equal(filter.siteTag, "site");
  assert.equal(filter.bot, 0);
  assert.deepEqual(filter.AND, [{ requestPath_notlike: "/app/%" }, { requestPath_notlike: "/cdn-cgi/%" }]);
  assert.equal(calls[0].variables.account, "acc");
  assert.equal(calls[0].auth, "Bearer t");
});

const NOW = Date.parse("2026-09-28T01:00:00Z");

test("Google 的钥匙没设：打开速度照样同步", async () => {
  const db = freshDb();
  const { fetchFn } = fakeCloudflare([group("2026-09-27", "mobile", "/")]);
  const results = await runSync(
    { DB: db, HISTORY_DAYS: "400", CF_API_TOKEN: "t", CF_ACCOUNT_ID: "acc", CF_SITE_TAG: "site" },
    { fetchFn, now: NOW },
  );
  assert.deepEqual(results.map((r) => [r.source, r.ok]), [["auth", false], ["speed", true]]);
  assert.equal(rows(db, "SELECT COUNT(*) AS n FROM speed")[0].n, 1);
  assert.equal((await status(db)).speed_latest, "2026-09-27");
});

test("Cloudflare token 没设：记下错误，页面顶部会显示", async () => {
  const db = freshDb();
  const results = await runSync({ DB: db, HISTORY_DAYS: "400" }, { fetchFn: fakeCloudflare([]).fetchFn, now: NOW });
  assert.match(results.at(-1).error, /CF_API_TOKEN/);
  assert.match(rows(db, "SELECT last_error FROM sync_state WHERE source = 'speed'")[0].last_error, /CF_API_TOKEN/);
});

test("历史只往回补 180 天：Cloudflare 只留约 6 个月", async () => {
  const db = freshDb();
  db.sqlite.exec("INSERT INTO sync_state (source, oldest) VALUES ('speed', '2026-04-05')");
  const { fetchFn, calls } = fakeCloudflare([]);
  await runSync({ DB: db, HISTORY_DAYS: "400", CF_API_TOKEN: "t" }, { fetchFn, now: NOW });
  // 昨天 9/27 往回 180 天是 4/1：补 4/1～4/4，不会再往前
  assert.equal(calls.at(-1).variables.filter.date_geq, "2026-04-01");
  assert.equal(rows(db, "SELECT oldest FROM sync_state WHERE source = 'speed'")[0].oldest, "2026-04-01");
});

test("一段期间的合计：次数直接加；p75 按次数加权取 75% 那一格", async () => {
  const db = freshDb();
  const { fetchFn } = fakeCloudflare([
    // 手机：3 次 0.8 秒、1 次 5 秒 → 75% 那一格是 0.8 秒；4 次里 3 次快、1 次慢
    group("2026-09-26", "mobile", "/", { lcp: [3, 3, 0, 800000] }),
    group("2026-09-27", "mobile", "/pricing", { lcp: [1, 0, 1, 5000000] }),
    group("2026-09-27", "desktop", "/", { lcp: [2, 2, 0, 600000] }),
  ]);
  await runSync({ DB: db, HISTORY_DAYS: "400", CF_API_TOKEN: "t" }, { fetchFn, now: NOW });

  const data = await rangeData(db, "2026-09-21", "2026-09-27");
  const mobile = data.speed.find((r) => r.device === "mobile");
  assert.deepEqual(
    [mobile.lcp_n, mobile.lcp_good, mobile.lcp_poor, mobile.lcp_p75],
    [4, 3, 1, 800],
  );
  assert.equal(data.speed.find((r) => r.device === "desktop").lcp_p75, 600);
  // 页面表：慢的次数多的排前面
  assert.deepEqual(data.speed_pages.map((p) => p.path), ["/pricing", "/"]);

  // 只画图的请求不扫这些
  const daily = await rangeData(db, "2026-09-21", "2026-09-27", { dailyOnly: true });
  assert.deepEqual([daily.speed, daily.speed_pages], [[], []]);
});
