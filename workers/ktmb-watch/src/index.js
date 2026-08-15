/**
 * 定时盯 KTMB 座位，有变化就发 Telegram。
 *
 * cron 触发 → 查最近一个礼拜日、指定时段之后的车次 → 跟 KV 里存的上一次结果比对
 * → 「有票的车次集合」变了才发通知（避免每次都刷屏）。
 *
 * GET / 可以手动查一次，直接返回文字，方便测试。
 */

import { searchTrips } from "./ktmb.js";

/** 马来西亚 UTC+8，没有夏令时，直接加 8 小时 */
function nowInMY() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

/**
 * 下一个目标星期几的日期（ISO）。今天就是的话，返回今天。
 * @param {number} weekday 0=礼拜日
 */
export function nextWeekday(from, weekday) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + ((weekday - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

function formatTrips(trips) {
  return trips
    .map(
      (t) =>
        `${t.depart} ${t.train} — ${t.seats > 0 ? `${t.seats} 位` : "满"} · ${t.fare}`,
    )
    .join("\n");
}

async function sendTelegram(env, text) {
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

/** 查一次，返回 { date, watched, available } */
async function check(env) {
  const date = nextWeekday(nowInMY(), Number(env.WATCH_WEEKDAY ?? 0));
  const after = Number(env.WATCH_AFTER ?? 1600);
  const trips = await searchTrips({
    from: env.ROUTE_FROM,
    to: env.ROUTE_TO,
    date,
    pax: Number(env.PAX ?? 1),
  });
  const watched = trips.filter((t) => t.hourMinute >= after);
  return { date, watched, available: watched.filter((t) => t.seats > 0) };
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const { date, watched, available } = await check(env);

        // 只把「哪几班有票」当指纹；座位数从 4 变 3 不值得再吵一次
        const key = `seen:${env.ROUTE_FROM}-${env.ROUTE_TO}:${date}`;
        const fingerprint = available.map((t) => t.train).sort().join("|");
        const previous = await env.STATE.get(key);
        if (previous === fingerprint) return;
        await env.STATE.put(key, fingerprint, { expirationTtl: 60 * 60 * 24 * 30 });

        // 第一次跑没有基线，只在有票时报，免得上来就发「全满」
        if (previous === null && available.length === 0) return;

        const header =
          available.length > 0
            ? `🚆 ${env.ROUTE_FROM} → ${env.ROUTE_TO}｜${date} 有位了`
            : `😶 ${env.ROUTE_FROM} → ${env.ROUTE_TO}｜${date} 全满了`;
        await sendTelegram(
          env,
          `${header}\n\n${formatTrips(watched)}\n\nhttps://online.ktmb.com.my/`,
        );
      })(),
    );
  },

  async fetch(request, env) {
    try {
      const { date, watched } = await check(env);
      return new Response(
        `${env.ROUTE_FROM} → ${env.ROUTE_TO}  ${date}\n\n${formatTrips(watched)}\n`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    } catch (err) {
      return new Response(`查询失败：${err.message}\n`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};
