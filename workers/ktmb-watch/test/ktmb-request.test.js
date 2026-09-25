/**
 * searchTrips 送给 KTMB 的三个请求长什么样。
 *
 * 这里锁住的是两个真的踩过的坑：
 *   1. SearchData 带 HTML 实体，不解码 KTMB 回 "Error when retrieving trip."
 *   2. 第三步的 token 走请求头，不是表单字段
 * 两个都不是能靠读代码看出来的，改坏了也不会报错，只会静静地查不到票。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { searchTrips } from "../src/ktmb.js";

const HOME = `
<html><body>
<form method="post" action="/Trip">
  <select id="FromStationId" name="FromStationId">
    <option value="">Select Origin</option>
    <option value="33200" data-trainservices="ETS,Intercity">KLUANG</option>
    <option value="37500" data-trainservices="ETS,Intercity">JB SENTRAL</option>
  </select>
  <input name="__RequestVerificationToken" type="hidden" value="HOME_TOKEN" />
</form>
<script>
  var jsStations = [{"Id":"33200","StationData":"KLU/DATA"},{"Id":"37500","StationData":"JB/DATA"}];
</script>
</body></html>`;

// value 里的 &#x2B; 就是 +，&amp; 就是 & —— KTMB 真的会这样吐出来
const TRIP = `
<html><body>
<input type="hidden" id="SearchData" name="SearchData" value="nb0pmIkq3Y&#x2B;npbpA&amp;5ta731" />
<input type="hidden" data-val="true" id="FormValidationCode" name="FormValidationCode" value="0BatChlWu" />
<input name="__RequestVerificationToken" type="hidden" value="TRIP_TOKEN" />
</body></html>`;

const TRIP_ROWS = `
<tbody class="bg-white depart-trips">
  <tr class=" text-nowrap" data-HourMinute="1840">
    <td class="f20">Platinum - 9531</td>
    <td class="text-center f22">18:40</td>
    <td class="text-center f22">19:35</td>
    <td class="th-hr"><span class='f14'>55m</span></td>
    <td><i class="fa fa-th-large"></i> 6 </td>
    <td class="text-center f16">MYR 27.00</td>
    <td><a href="javascript:void(0);">Login to view</a></td>
  </tr>
</tbody>`;

/** 假 fetch：记下每次调用，按顺序回预设的三个回应 */
function fakeKtmb() {
  const calls = [];
  const reply = (body, json = false) => ({
    ok: true,
    status: 200,
    headers: { getSetCookie: () => ["SESSION=abc; path=/"] },
    text: async () => body,
    json: async () => (json ? JSON.parse(body) : {}),
  });

  const impl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/Trip/Trip")) {
      return reply(JSON.stringify({ status: true, data: TRIP_ROWS }), true);
    }
    if (String(url).endsWith("/Trip")) return reply(TRIP);
    return reply(HOME);
  };
  return { impl, calls };
}

test("第三步的 SearchData 必须是解码后的，不能带 HTML 实体", async () => {
  const { impl, calls } = fakeKtmb();
  await searchTrips(
    { from: "KLUANG", to: "JB SENTRAL", date: "2026-08-23" },
    { fetchImpl: impl },
  );

  const listCall = calls.find((c) => c.url.endsWith("/Trip/Trip"));
  const body = JSON.parse(listCall.init.body);

  assert.equal(
    body.SearchData,
    "nb0pmIkq3Y+npbpA&5ta731",
    "&#x2B; 要变成 +，&amp; 要变成 & —— 不解码 KTMB 会回 Error when retrieving trip.",
  );
});

test("第三步的 token 走请求头，不是表单字段", async () => {
  const { impl, calls } = fakeKtmb();
  await searchTrips(
    { from: "KLUANG", to: "JB SENTRAL", date: "2026-08-23" },
    { fetchImpl: impl },
  );

  const listCall = calls.find((c) => c.url.endsWith("/Trip/Trip"));
  assert.equal(listCall.init.headers.RequestVerificationToken, "TRIP_TOKEN");
  assert.equal(listCall.init.headers["Content-Type"], "application/json");
  assert.equal(
    JSON.parse(listCall.init.body).__RequestVerificationToken,
    undefined,
    "token 不该出现在 body 里",
  );
});

test("第二步用表单送出，日期是 KTMB 那种格式", async () => {
  const { impl, calls } = fakeKtmb();
  await searchTrips(
    { from: "KLUANG", to: "JB SENTRAL", date: "2026-08-23" },
    { fetchImpl: impl },
  );

  const tripCall = calls.find(
    (c) => c.url.endsWith("/Trip") && !c.url.endsWith("/Trip/Trip"),
  );
  const form = new URLSearchParams(String(tripCall.init.body));

  assert.equal(form.get("OnwardDate"), "23 Aug 2026", "表单要 DD MMM YYYY");
  assert.equal(form.get("FromStationData"), "KLU/DATA", "站名要用加密串，不是 ID");
  assert.equal(form.get("ToStationData"), "JB/DATA");
  assert.equal(form.get("__RequestVerificationToken"), "HOME_TOKEN");
});

test("第三步的 DepartDate 是 ISO，跟第二步的格式不一样", async () => {
  const { impl, calls } = fakeKtmb();
  await searchTrips(
    { from: "KLUANG", to: "JB SENTRAL", date: "2026-08-23" },
    { fetchImpl: impl },
  );

  const body = JSON.parse(calls.find((c) => c.url.endsWith("/Trip/Trip")).init.body);
  assert.equal(body.DepartDate, "2026-08-23");
  assert.equal(body.IsReturn, false);
  assert.equal(body.BookingTripSequenceNo, 1);
});

test("首页拿到的 cookie 要带到后面每一步", async () => {
  const { impl, calls } = fakeKtmb();
  await searchTrips(
    { from: "KLUANG", to: "JB SENTRAL", date: "2026-08-23" },
    { fetchImpl: impl },
  );

  for (const c of calls.slice(1)) {
    assert.match(c.init.headers.Cookie, /SESSION=abc/, `${c.url} 少带了 cookie`);
  }
});

test("KTMB 说不行的时候要抛错，不能默默回空阵列", async () => {
  const { impl } = fakeKtmb();
  const rejecting = async (url, init) => {
    if (String(url).endsWith("/Trip/Trip")) {
      return {
        ok: true,
        status: 200,
        headers: { getSetCookie: () => [] },
        text: async () => "",
        json: async () => ({ status: false, messages: ["Date has passed."] }),
      };
    }
    return impl(url, init);
  };

  await assert.rejects(
    () =>
      searchTrips(
        { from: "KLUANG", to: "JB SENTRAL", date: "2020-01-01" },
        { fetchImpl: rejecting },
      ),
    /Date has passed/,
  );
});

test("不认得的站名要抛错", async () => {
  const { impl } = fakeKtmb();
  await assert.rejects(
    () =>
      searchTrips(
        { from: "KLUANG", to: "NOWHERE", date: "2026-08-23" },
        { fetchImpl: impl },
      ),
    /NOWHERE/,
  );
});
