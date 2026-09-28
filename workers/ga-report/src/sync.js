/**
 * 每天一次：拉 GA 与 GSC 的数字进 D1，再轮查一小批地址的收录状态。
 *
 * 每个来源每次做两件事：
 * 1. 重拉最近几天（GA 与 GSC 都会回头修正刚过去几天的数字）
 * 2. 往回补一段历史，直到补满 HISTORY_DAYS
 * 第一次跑只拉最近 31 天，之后每天多补 31 天。一次全拉会超过免费版的 CPU 时间。
 *
 * 三个来源各自 try：GA 挂了不影响 GSC。错误写进 sync_state，页面顶部会显示。
 */

import { accessToken, fetchGa, fetchGsc, inspectUrl } from "./google.js";
import { getState, saveState, replaceRange, nextUrlsToInspect, saveInspections } from "./db.js";

const RECENT_DAYS = { ga: 7, gsc: 10 }; // GSC 晚 2～3 天才有数，多拉几天
const BACKFILL_CHUNK = 31;

/** 马来西亚的今天。Worker 跑在 UTC，直接取 UTC 日期会在早上 8 点前差一天 */
export const todayMyt = (now = Date.now()) =>
  new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);

export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 这次该拉哪几段日期，以及拉完后 oldest 变成哪天 */
export function plan(state, { today, recentDays, historyDays }) {
  const yesterday = addDays(today, -1);
  if (!state?.oldest) {
    const start = addDays(yesterday, -(BACKFILL_CHUNK - 1));
    return { ranges: [[start, yesterday]], oldest: start };
  }
  const ranges = [[addDays(yesterday, -(recentDays - 1)), yesterday]];
  const floor = addDays(yesterday, -(historyDays - 1));
  if (state.oldest <= floor) return { ranges, oldest: state.oldest };

  const chunkStart = addDays(state.oldest, -BACKFILL_CHUNK);
  const start = chunkStart < floor ? floor : chunkStart;
  ranges.push([start, addDays(state.oldest, -1)]);
  return { ranges, oldest: start };
}

async function syncSource(env, source, fetchRange, tables, now) {
  const state = await getState(env.DB, source);
  const { ranges, oldest } = plan(state, {
    today: todayMyt(now),
    recentDays: RECENT_DAYS[source],
    historyDays: Number(env.HISTORY_DAYS),
  });
  try {
    const statements = [];
    for (const [start, end] of ranges) {
      const data = await fetchRange(start, end);
      for (const [table, key] of tables) {
        statements.push(...replaceRange(env.DB, table, start, end, data[key]));
      }
    }
    statements.push(saveState(env.DB, source, { oldest }));
    await env.DB.batch(statements);
    return { source, ok: true, ranges };
  } catch (err) {
    await saveState(env.DB, source, { error: String(err.message ?? err).slice(0, 500) }).run();
    return { source, ok: false, error: err.message };
  }
}

async function syncIndex(env, token, fetchFn) {
  try {
    const xml = await fetchFn(env.SITEMAP_URL).then((r) => r.text());
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (!urls.length) throw new Error("sitemap 里一条地址都没有");

    const batch = await nextUrlsToInspect(env.DB, urls, Number(env.INSPECT_PER_RUN));
    const results = [];
    for (const url of batch) {
      results.push({ url, ...(await inspectUrl({ token, site: env.GSC_SITE, url }, fetchFn)) });
    }
    await env.DB.batch([saveInspections(env.DB, results), saveState(env.DB, "index", {})]);
    return { source: "index", ok: true, checked: results.length };
  } catch (err) {
    await saveState(env.DB, "index", { error: String(err.message ?? err).slice(0, 500) }).run();
    return { source: "index", ok: false, error: err.message };
  }
}

export async function runSync(env, { fetchFn = fetch, now = Date.now() } = {}) {
  let token;
  try {
    if (!env.GOOGLE_SA_KEY) throw new Error("还没设 GOOGLE_SA_KEY（wrangler secret put GOOGLE_SA_KEY）");
    token = await accessToken(env.GOOGLE_SA_KEY, fetchFn);
  } catch (err) {
    const error = `拿不到 Google token：${err.message}`.slice(0, 500);
    await env.DB.batch(
      ["ga", "gsc", "index"].map((s) => saveState(env.DB, s, { error })),
    );
    return [{ source: "auth", ok: false, error }];
  }

  const ga = (start, end) =>
    fetchGa({ token, propertyId: env.GA_PROPERTY_ID, start, end }, fetchFn);
  const gsc = (start, end) => fetchGsc({ token, site: env.GSC_SITE, start, end }, fetchFn);

  return [
    await syncSource(env, "ga", ga, [["ga_daily", "daily"], ["ga_channels", "channels"], ["ga_pages", "pages"]], now),
    await syncSource(env, "gsc", gsc, [["gsc_daily", "daily"], ["gsc_queries", "queries"], ["gsc_pages", "pages"]], now),
    await syncIndex(env, token, fetchFn),
  ];
}
