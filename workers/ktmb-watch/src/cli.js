#!/usr/bin/env node
/**
 * 本地查一次，不碰数据库、不发通知。
 *   node src/cli.js                       # Kluang→JB，下个礼拜日
 *   node src/cli.js JK 2026-08-16         # 反向，指定日期
 */

import { searchTrips } from "./ktmb.js";
import { ROUTES, hhmm, nowInMY } from "./watch.js";

const [dirArg = "KJ", dateArg] = process.argv.slice(2);
const route = ROUTES[dirArg];
if (!route) {
  console.error(`方向只能是 KJ 或 JK，收到 ${dirArg}`);
  process.exit(1);
}

/** 下一个礼拜日（今天就是的话返回今天） */
function nextSunday(from) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + ((0 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

const date = dateArg ?? nextSunday(nowInMY());
const baseline = Number(process.env.OKU_BASELINE ?? 4);
const trips = await searchTrips({ from: route.from, to: route.to, date });

console.log(`${route.label}  ${date}\n`);
for (const t of trips) {
  const real = t.seats > baseline ? `有位 (${t.seats})` : `没位 (${t.seats})`;
  console.log(`${hhmm(t.hourMinute)}  ${t.train.padEnd(18)} ${real.padEnd(12)} ${t.fare}`);
}
console.log(`\n剩 ${baseline} 个以内视为 OKU 保留位，算没位。`);
