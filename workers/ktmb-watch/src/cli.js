#!/usr/bin/env node
/**
 * 本地查一次，不发通知。
 *   node src/cli.js                       # 用 wrangler.toml 里的默认线路 + 下个礼拜日
 *   node src/cli.js KLUANG "JB SENTRAL" 2026-08-16
 */

import { searchTrips } from "./ktmb.js";
import { nextWeekday } from "./index.js";

const [from = "KLUANG", to = "JB SENTRAL", date] = process.argv.slice(2);
const target =
  date ?? nextWeekday(new Date(Date.now() + 8 * 60 * 60 * 1000), 0);

const trips = await searchTrips({ from, to, date: target });

console.log(`${from} → ${to}  ${target}\n`);
for (const t of trips) {
  console.log(
    `${t.depart}  ${t.train.padEnd(18)} ${String(t.seats).padStart(2)} 位  ${t.fare}`,
  );
}
