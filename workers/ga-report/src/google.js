/**
 * 跟 Google 说话：服务账号换 token、GA4 Data API、Search Console API。
 *
 * 只取数字，不存东西。存储在 db.js，排程在 sync.js。
 * `fetchFn` 可以换掉，测试就不用联网。
 */

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64urlJson = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

function pemToPkcs8(pem) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/** 服务账号的 JSON 密钥 → 一小时有效的 access token（GA 与 GSC 共用一张） */
export async function accessToken(saKeyJson, fetchFn = fetch) {
  // Windows PowerShell 用管道 secret put 时会在开头塞一个 BOM，JSON.parse 不认
  const sa = JSON.parse(saKeyJson.replace(/^﻿/, ""));
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64urlJson({ alg: "RS256", typ: "JWT" }) +
    "." +
    b64urlJson({
      iss: sa.client_email,
      scope: SCOPES,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function postJson(fetchFn, url, token, body) {
  const res = await fetchFn(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── GA4 ──────────────────────────────────────────────────────────────

/** GA 回的日期是 20260927，统一成 2026-09-27 */
const gaDate = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

/**
 * WhatsApp 点击 = GA 自动记录的外链点击（加强型评估），目标是 wa.me。
 *
 * 不用页面上手写的 gtag('event','click',{event_category:'WhatsApp'})：
 * event_category 要先在 GA 后台注册成自定义维度才查得到，而且注册之前的
 * 历史数据永远查不回来。linkDomain 是 GA 内建的维度，历史数据现成就有。
 */
const WA_FILTER = {
  andGroup: {
    expressions: [
      { filter: { fieldName: "eventName", stringFilter: { value: "click" } } },
      { filter: { fieldName: "linkDomain", stringFilter: { value: "wa.me" } } },
    ],
  },
};

function gaRequests(start, end) {
  const base = { dateRanges: [{ startDate: start, endDate: end }], limit: 100000 };
  return [
    {
      ...base,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    },
    {
      ...base,
      dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
    },
    {
      ...base,
      dimensions: [{ name: "date" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
    },
    {
      ...base,
      dimensions: [{ name: "date" }, { name: "pagePath" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: WA_FILTER,
    },
  ];
}

const gaRows = (report) =>
  (report.rows ?? []).map((r) => [
    ...r.dimensionValues.map((d) => d.value),
    ...r.metricValues.map((m) => Number(m.value)),
  ]);

/** GA 的 batchRunReports 回应 → 三张表要的行。一次请求拿齐四份报表 */
export function parseGa(json) {
  const [totals, channels, pages, wa] = json.reports.map(gaRows);

  const waByDate = new Map();
  const pageMap = new Map();
  for (const [d, path, views] of pages) {
    pageMap.set(`${d}|${path}`, { date: gaDate(d), path, views, wa_clicks: 0 });
  }
  for (const [d, path, clicks] of wa) {
    const date = gaDate(d);
    waByDate.set(date, (waByDate.get(date) ?? 0) + clicks);
    const key = `${d}|${path}`;
    if (pageMap.has(key)) pageMap.get(key).wa_clicks = clicks;
    else pageMap.set(key, { date, path, views: 0, wa_clicks: clicks });
  }

  return {
    daily: totals.map(([d, users, sessions, views]) => ({
      date: gaDate(d),
      users,
      sessions,
      views,
      wa_clicks: waByDate.get(gaDate(d)) ?? 0,
    })),
    channels: channels.map(([d, channel, sessions]) => ({ date: gaDate(d), channel, sessions })),
    pages: [...pageMap.values()],
  };
}

export async function fetchGa({ token, propertyId, start, end }, fetchFn = fetch) {
  const json = await postJson(
    fetchFn,
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`,
    token,
    { requests: gaRequests(start, end) },
  );
  return parseGa(json);
}

// ── Search Console ───────────────────────────────────────────────────

const GSC_PAGE_SIZE = 25000; // API 一次最多给这么多行
const GSC_MAX_PAGES = 4; // 小站用不到；封顶是为了不把 Worker 的对外请求额度吃光

async function gscQuery(fetchFn, token, site, body) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const rows = [];
  for (let page = 0; page < GSC_MAX_PAGES; page++) {
    const json = await postJson(fetchFn, url, token, {
      ...body,
      rowLimit: GSC_PAGE_SIZE,
      startRow: page * GSC_PAGE_SIZE,
    });
    rows.push(...(json.rows ?? []));
    if ((json.rows ?? []).length < GSC_PAGE_SIZE) break;
  }
  return rows;
}

const gscRow = (r, name) => ({
  date: r.keys[0],
  ...(name ? { [name]: r.keys[1] } : {}),
  clicks: r.clicks,
  impressions: r.impressions,
  position: r.position,
});

export async function fetchGsc({ token, site, start, end }, fetchFn = fetch) {
  const q = (dimensions) => gscQuery(fetchFn, token, site, { startDate: start, endDate: end, dimensions });
  const [daily, queries, pages] = await Promise.all([
    q(["date"]),
    q(["date", "query"]),
    q(["date", "page"]),
  ]);
  return {
    daily: daily.map((r) => gscRow(r)),
    queries: queries.map((r) => gscRow(r, "query")),
    pages: pages.map((r) => gscRow(r, "page")),
  };
}

/** 一条地址的收录状态（URL Inspection API） */
export async function inspectUrl({ token, site, url }, fetchFn = fetch) {
  const json = await postJson(
    fetchFn,
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    token,
    { inspectionUrl: url, siteUrl: site },
  );
  const s = json.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: s.verdict ?? null,
    coverage: s.coverageState ?? null,
    last_crawl: s.lastCrawlTime ?? null,
  };
}
