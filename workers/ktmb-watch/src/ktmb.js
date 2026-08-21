/**
 * KTMB ETS/Intercity 座位查询。
 *
 * 站点没有公开 API，但订票流程的三步都不需要登录：
 *   1. GET  /          —— 拿 cookie、防伪 token、jsStations（站名 → 加密串）
 *   2. POST /Trip      —— 提交行程，返回的页面里带 SearchData 与 FormValidationCode
 *   3. POST /Trip/Trip —— 返回 { status, data: "<html 表格>" }，表格里是各车次剩余座位
 *
 * 只用 fetch，无依赖，Node 与 Cloudflare Workers 都能跑。
 */

const BASE = "https://online.ktmb.com.my";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* ---------- cookie ---------- */

function collectCookies(res, jar) {
  const raw = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

function cookieHeader(jar) {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

/* ---------- html 小工具 ---------- */

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/** 解 HTML 实体。加密串里带 &#x2B;（+），不解码会直接被 KTMB 判为无效。 */
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body) => {
    if (ENTITIES[m.toLowerCase()]) return ENTITIES[m.toLowerCase()];
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? m : String.fromCodePoint(code);
    }
    return m;
  });
}

function text(html) {
  return decode(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function hiddenValue(html, name) {
  const re = new RegExp(
    `<input[^>]*name="${name}"[^>]*value="([^"]*)"|<input[^>]*value="([^"]*)"[^>]*name="${name}"`,
    "i",
  );
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2]) : null;
}

/* ---------- 首页解析 ---------- */

function parseStations(html) {
  // jsStations = [{ "Id": "33200", "StationData": "libK0..." }, ...]
  const m = html.match(/jsStations\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!m) throw new Error("首页里找不到 jsStations");
  const byId = new Map();
  for (const s of JSON.parse(m[1])) byId.set(String(s.Id), s.StationData);

  // <option value="33200" data-trainservices="...">KLUANG</option>
  const select = html.match(
    /<select[^>]*id="FromStationId"[\s\S]*?<\/select>/i,
  );
  if (!select) throw new Error("首页里找不到出发站下拉框");
  const idByName = new Map();
  for (const o of select[0].matchAll(
    /<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/gi,
  )) {
    idByName.set(text(o[2]).toUpperCase(), o[1]);
  }
  return { byId, idByName };
}

function resolveStation(stations, name) {
  const id = stations.idByName.get(name.trim().toUpperCase());
  if (!id) throw new Error(`没有这个站：${name}`);
  const data = stations.byId.get(id);
  if (!data) throw new Error(`站 ${name} 缺 StationData`);
  return { id, data };
}

/* ---------- 车次表解析 ---------- */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-08-16" → "16 Aug 2026"（KTMB 表单要这个格式） */
export function toKtmbDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function parseTrips(html) {
  const trips = [];
  for (const row of html.matchAll(
    /<tr[^>]*data-HourMinute="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi,
  )) {
    const cells = [...row[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      text(c[1]),
    );
    if (cells.length < 6) continue;
    const seats = parseInt(cells[4].replace(/\D/g, ""), 10);
    trips.push({
      train: cells[0],
      depart: cells[1],
      arrive: cells[2],
      duration: cells[3],
      seats: Number.isNaN(seats) ? 0 : seats,
      fare: cells[5],
      hourMinute: parseInt(row[1], 10),
    });
  }
  return trips;
}

/* ---------- 主流程 ---------- */

/**
 * @param {{ from: string, to: string, date: string, pax?: number }} q
 *        date 用 ISO：2026-08-16
 * @param {{ fetchImpl?: typeof fetch }} [deps] 测试时替掉 fetch，不打真站
 * @returns {Promise<Array<{train,depart,arrive,duration,seats,fare,hourMinute}>>}
 */
export async function searchTrips({ from, to, date, pax = 1 }, deps = {}) {
  const fetch = deps.fetchImpl ?? globalThis.fetch;
  const jar = new Map();
  const headers = () => ({
    "User-Agent": UA,
    Cookie: cookieHeader(jar),
  });

  // 1. 首页
  const homeRes = await fetch(`${BASE}/`, { headers: headers() });
  if (!homeRes.ok) throw new Error(`首页 ${homeRes.status}`);
  collectCookies(homeRes, jar);
  const home = await homeRes.text();

  const stations = parseStations(home);
  const origin = resolveStation(stations, from);
  const dest = resolveStation(stations, to);
  const homeToken = hiddenValue(home, "__RequestVerificationToken");
  if (!homeToken) throw new Error("首页里找不到 __RequestVerificationToken");

  // 2. 提交行程
  const form = new URLSearchParams({
    FromStationData: origin.data,
    ToStationData: dest.data,
    FromStationId: origin.id,
    ToStationId: dest.id,
    OnwardDate: toKtmbDate(date),
    ReturnDate: "",
    PassengerCount: String(pax),
    __RequestVerificationToken: homeToken,
  });
  const tripRes = await fetch(`${BASE}/Trip`, {
    method: "POST",
    headers: {
      ...headers(),
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE}/`,
    },
    body: form,
  });
  if (!tripRes.ok) throw new Error(`/Trip ${tripRes.status}`);
  collectCookies(tripRes, jar);
  const trip = await tripRes.text();

  const searchData = hiddenValue(trip, "SearchData");
  const formValidationCode = hiddenValue(trip, "FormValidationCode");
  const tripToken = hiddenValue(trip, "__RequestVerificationToken");
  if (!searchData || !formValidationCode || !tripToken) {
    throw new Error("行程页里找不到 SearchData / FormValidationCode / token");
  }

  // 3. 拿车次表
  const listRes = await fetch(`${BASE}/Trip/Trip`, {
    method: "POST",
    headers: {
      ...headers(),
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      RequestVerificationToken: tripToken,
      Referer: `${BASE}/Trip`,
    },
    body: JSON.stringify({
      SearchData: searchData,
      FormValidationCode: formValidationCode,
      DepartDate: date,
      IsReturn: false,
      BookingTripSequenceNo: 1,
    }),
  });
  if (!listRes.ok) throw new Error(`/Trip/Trip ${listRes.status}`);
  const payload = await listRes.json();
  if (!payload.status) {
    throw new Error(`KTMB 拒绝了查询：${(payload.messages || []).join("; ")}`);
  }
  return parseTrips(payload.data);
}
