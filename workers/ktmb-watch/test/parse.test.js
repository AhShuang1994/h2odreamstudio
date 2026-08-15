import { test } from "node:test";
import assert from "node:assert/strict";

import { parseTrips, toKtmbDate } from "../src/ktmb.js";
import { nextWeekday } from "../src/index.js";

// 从 /Trip/Trip 真实响应里截的两行：一行有票，一行卖完（class="disabled"）。
const FIXTURE = `
<tbody class="bg-white depart-trips">
  <tr class=" text-nowrap" data-HourMinute="2134">
    <td class="f20 blue-left-border">Gold - 9449</td>
    <td class="text-center f22">21:34</td>
    <td class="text-center f22 text-nowrap">
        22:30
    </td>
    <td class="th-hr"> <span class='f14'>56m</span></td>
    <td><i class="fa fa-th-large"></i> 2 </td>
    <td class="text-center f16">MYR 20.00</td>
    <td class="text-left" width="130px"><a href="javascript:void(0);">Login to view</a></td>
  </tr>
  <tr class="disabled text-nowrap" data-HourMinute="1431">
    <td class="f20 blue-left-border">Platinum - 9323</td>
    <td class="text-center f22">14:31</td>
    <td class="text-center f22 text-nowrap">15:20</td>
    <td class="th-hr"> <span class='f14'>49m</span></td>
    <td><i class="fa fa-th-large"></i> 0 </td>
    <td class="text-center f16">MYR 26.00</td>
    <td class="text-left" width="130px"><a href="javascript:void(0);">Login to view</a></td>
  </tr>
</tbody>`;

test("parseTrips 读出车次、时间与剩余座位", () => {
  const trips = parseTrips(FIXTURE);
  assert.equal(trips.length, 2);

  assert.deepEqual(trips[0], {
    train: "Gold - 9449",
    depart: "21:34",
    arrive: "22:30",
    duration: "56m",
    seats: 2,
    fare: "MYR 20.00",
    hourMinute: 2134,
  });

  assert.equal(trips[1].seats, 0, "卖完的车次应该是 0 位");
});

test("toKtmbDate 转成表单要的格式", () => {
  assert.equal(toKtmbDate("2026-08-16"), "16 Aug 2026");
  assert.equal(toKtmbDate("2026-01-05"), "5 Jan 2026");
});

test("nextWeekday 找下一个礼拜日", () => {
  // 2026-08-15 是礼拜六
  assert.equal(nextWeekday(new Date("2026-08-15T12:00:00Z"), 0), "2026-08-16");
  // 当天就是礼拜日的话，返回当天
  assert.equal(nextWeekday(new Date("2026-08-16T12:00:00Z"), 0), "2026-08-16");
  // 礼拜一要等六天
  assert.equal(nextWeekday(new Date("2026-08-17T12:00:00Z"), 0), "2026-08-23");
});
