/**
 * 轮询、比对、通知分配、扣点。
 *
 * 判定规则的由来：座位数栏位里剩下的 4 个基本都是 OKU 残障保留位，一般人买不到。
 * 所以「有票」不是 seats > 0，是 seats > OKU_BASELINE（默认 4）。
 * 不登录看不到座位分类，所以用这个启发式，不为小概率加复杂逻辑。
 */

import { searchTrips } from "./ktmb.js";
import * as db from "./db.js";

export const ROUTES = {
  KJ: { from: "KLUANG", to: "JB SENTRAL", label: "Kluang → JB Sentral" },
  JK: { from: "JB SENTRAL", to: "KLUANG", label: "JB Sentral → Kluang" },
};

/** 马来西亚 UTC+8，没有夏令时 */
export function nowInMY() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

export function todayInMY() {
  return nowInMY().toISOString().slice(0, 10);
}

export const hhmm = (hourMinute) =>
  `${String(Math.floor(hourMinute / 100)).padStart(2, "0")}:${String(hourMinute % 100).padStart(2, "0")}`;

/* ---------- 纯逻辑（可单测） ---------- */

/**
 * 这一班开走了没。按班次的出发时间比，不是按日期 ——
 * 同一天盯 10:26 和 21:00，到了 10:27 只有 10:26 该死掉。
 * 正好到点的那一分钟还算没开走。
 */
export function hasDeparted(date, hourMinute, nowMY) {
  const stamp = nowMY.toISOString();
  return `${date} ${hhmm(hourMinute)}` < `${stamp.slice(0, 10)} ${stamp.slice(11, 16)}`;
}

/** 一条 watch 里还没开走的那几班 */
export function liveTrains(date, trains, nowMY) {
  return trains.filter((hm) => !hasDeparted(date, hm, nowMY));
}

/**
 * Cloudflare 免费版一次执行最多 50 个对外请求。一条线路要打 KTMB 3 个，
 * 加上发 Telegram 也算，所以留余裕只跑最近的 N 条。
 *
 * 超了宁可少跑几条远期的，也不能整轮炸掉 —— 那样所有人都收不到通知。
 */
export function capRoutes(routes, max) {
  const sorted = [...routes].sort((a, b) =>
    a.date === b.date ? a.direction.localeCompare(b.direction) : a.date < b.date ? -1 : 1,
  );
  return { routes: sorted.slice(0, max), skipped: sorted.slice(max) };
}

/**
 * 有票事件：上一次 <= 基线、这一次 > 基线，才算真的放出位子。
 * 第一次观察（prev 为 null）不算 —— 没有基准，无法判断是不是刚放的。
 */
export function detectReleases(trips, prevByTrain, baseline) {
  return trips.filter((t) => {
    const prev = prevByTrain.get(t.hourMinute);
    return prev !== null && prev !== undefined && prev <= baseline && t.seats > baseline;
  });
}

/**
 * 进行中的 offer 该怎么结算。
 * 先看座位再看过期：位子没了就当他订走了，哪怕窗口还没到。
 */
export function settleDecision(offer, currentSeats, baseline, nowIso) {
  if (currentSeats === undefined || currentSeats === null) return null;
  if (currentSeats <= baseline) return "taken";
  if (nowIso >= offer.expires_at) return "passed";
  return null;
}

/* ---------- 编排 ---------- */

/**
 * 跑一轮。
 * @param {{DB: D1Database, OKU_BASELINE?: string, OFFER_WINDOW_MINUTES?: string}} env
 * @param {{
 *   send: (chatId: number, text: string) => Promise<void>,
 *   search?: typeof searchTrips,
 * }} deps 测试时把 send 与 search 换成假的，不打真站、不发真讯息
 */
export async function runPoll(env, deps) {
  const search = deps.search ?? searchTrips;
  const baseline = Number(env.OKU_BASELINE ?? 4);
  const windowMinutes = Number(env.OFFER_WINDOW_MINUTES ?? 3);
  const mode = await db.getMode(env.DB);
  const now = deps.now ? deps.now() : nowInMY();
  const today = now.toISOString().slice(0, 10);

  const all = await db.activeRoutes(env.DB, today);
  const { routes, skipped } = capRoutes(all, Number(env.MAX_ROUTES ?? 12));
  if (skipped.length > 0) await warnAdmins(env, deps, all.length, skipped);

  for (const { direction, date } of routes) {
    const route = ROUTES[direction];
    if (!route) continue;

    // 车开走了就别再查。整条线路都开走的话，连 KTMB 都不用打。
    const watches = await db.watchesOnRoute(env.DB, direction, date);
    const dead = [];
    const liveHere = new Set();
    for (const w of watches) {
      const live = liveTrains(date, JSON.parse(w.trains), now);
      if (live.length === 0) dead.push(w.id);
      for (const hm of live) liveHere.add(hm);
    }
    await db.deactivateWatches(env.DB, dead);
    if (liveHere.size === 0) continue;

    let fetched;
    try {
      fetched = await search({ from: route.from, to: route.to, date });
    } catch (err) {
      console.error(`查询失败 ${direction} ${date}: ${err.message}`);
      continue;
    }

    // seat_log 照记全部班次（试跑期的数据），但只有还没开走的才参与判定
    const trips = fetched.filter((t) => !hasDeparted(date, t.hourMinute, now));
    const seatsNow = new Map(trips.map((t) => [t.hourMinute, t.seats]));

    // 上一次的值必须在写入新记录之前读，否则读到的就是自己刚写的
    const prev = new Map();
    for (const t of trips) {
      prev.set(t.hourMinute, await db.lastSeats(env.DB, direction, date, t.hourMinute));
    }

    await settlePending(env, deps, { direction, date, seatsNow, baseline });
    await db.logSeats(env.DB, direction, date, fetched);

    const releases = detectReleases(trips, prev, baseline);
    for (const r of releases) {
      if (mode === "broadcast") {
        await broadcast(env, deps, { direction, date, trip: r, route });
      } else {
        await offerToNext(env, deps, {
          direction,
          date,
          trip: r,
          route,
          windowMinutes,
        });
      }
    }
  }
}

/** 超过上限时私讯管理员，别让它默默漏跑 */
async function warnAdmins(env, deps, total, skipped) {
  const { results } = await env.DB.prepare(
    "SELECT chat_id FROM users WHERE is_admin = 1",
  ).all();
  const text =
    `⚠️ 线路太多，这一轮漏跑了 ${skipped.length} 条\n\n` +
    `目前 ${total} 条，上限 ${Number(env.MAX_ROUTES ?? 12)} 条。\n` +
    `跳过的（都是比较远期的）：\n` +
    skipped.map((r) => `  ${r.direction} ${r.date}`).join("\n") +
    `\n\nCloudflare 免费版一次执行最多 50 个对外请求，一条线路要 3 个。\n` +
    `要嘛叫人取消一些远期盯梢，要嘛把 MAX_ROUTES 调高再部署（风险自负）。`;
  for (const a of results) await deps.send(a.chat_id, text);
}

/** 结算这条线路上所有进行中的 offer */
async function settlePending(env, deps, { direction, date, seatsNow, baseline }) {
  const nowIso = new Date().toISOString();
  const pending = (await db.pendingOffers(env.DB)).filter(
    (o) => o.direction === direction && o.date === date,
  );

  for (const offer of pending) {
    const decision = settleDecision(
      offer,
      seatsNow.get(offer.hour_minute),
      baseline,
      nowIso,
    );
    if (!decision) continue;

    await db.settleOffer(env.DB, offer.id, decision);

    if (decision === "taken") {
      await db.adjustPoints(env.DB, offer.chat_id, -1, "booked", offer.id);
      await deps.send(
        offer.chat_id,
        `已扣 1 点：${ROUTES[direction].label} ${date} ${hhmm(offer.hour_minute)}\n\n` +
          `如果这个位不是你订的，回 /appeal 我人工退给你。`,
      );
    }
  }
}

/** broadcast 模式：全部同时发，不建 offer、不扣点 */
async function broadcast(env, deps, { direction, date, trip, route }) {
  const watchers = await db.watchersOf(env.DB, direction, date, trip.hourMinute);
  const text =
    `🚆 有位了！${route.label}\n` +
    `${date} ${hhmm(trip.hourMinute)} ${trip.train}\n` +
    `座位数 ${trip.seats}（扣掉 OKU 保留位，实际约 ${trip.seats - Number(env.OKU_BASELINE ?? 4)} 个）\n` +
    `${trip.fare}\n\n` +
    `先到先得：https://online.ktmb.com.my/`;

  for (const w of watchers) {
    await deps.send(w.chat_id, text);
  }
}

/** queue 模式：一次只通知一个人 */
async function offerToNext(env, deps, { direction, date, trip, route, windowMinutes }) {
  if (await db.hasPendingOffer(env.DB, direction, date, trip.hourMinute)) return;

  const watchers = await db.watchersOf(env.DB, direction, date, trip.hourMinute);
  const queue = db.orderQueue(watchers.filter((w) => w.points > 0));
  const next = queue[0];
  if (!next) return;

  const offerId = await db.createOffer(
    env.DB,
    { ...next, direction, date, hourMinute: trip.hourMinute },
    windowMinutes,
  );

  await deps.send(
    next.chat_id,
    `🚆 轮到你了！${route.label}\n` +
      `${date} ${hhmm(trip.hourMinute)} ${trip.train}\n` +
      `座位数 ${trip.seats} · ${trip.fare}\n\n` +
      `https://online.ktmb.com.my/\n\n` +
      `${windowMinutes} 分钟内没订，就传给排在你后面的人。\n` +
      `订到会自动扣 1 点（#${offerId}）。`,
  );
}
