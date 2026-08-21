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
 * 跑一轮。deps 注入 send，方便测试时替换掉真的 Telegram。
 * @param {{DB: D1Database, OKU_BASELINE?: string, OFFER_WINDOW_MINUTES?: string}} env
 * @param {{send: (chatId: number, text: string) => Promise<void>}} deps
 */
export async function runPoll(env, deps) {
  const baseline = Number(env.OKU_BASELINE ?? 4);
  const windowMinutes = Number(env.OFFER_WINDOW_MINUTES ?? 3);
  const mode = await db.getMode(env.DB);
  const routes = await db.activeRoutes(env.DB, todayInMY());

  for (const { direction, date } of routes) {
    const route = ROUTES[direction];
    if (!route) continue;

    let trips;
    try {
      trips = await searchTrips({ from: route.from, to: route.to, date });
    } catch (err) {
      console.error(`查询失败 ${direction} ${date}: ${err.message}`);
      continue;
    }

    const seatsNow = new Map(trips.map((t) => [t.hourMinute, t.seats]));

    // 上一次的值必须在写入新记录之前读，否则读到的就是自己刚写的
    const prev = new Map();
    for (const t of trips) {
      prev.set(t.hourMinute, await db.lastSeats(env.DB, direction, date, t.hourMinute));
    }

    await settlePending(env, deps, { direction, date, seatsNow, baseline });
    await db.logSeats(env.DB, direction, date, trips);

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
