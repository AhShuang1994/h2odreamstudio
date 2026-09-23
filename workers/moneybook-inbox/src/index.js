/**
 * 小帐本 Apple Pay 收件箱。
 *
 * 快捷指令在刷卡当下把这一笔 POST 进来，Worker 当场用使用者的公钥封起来再落库。
 * 小帐本打开时拉走、解封、记进本机，确认之后这里就删掉。整本帐从不经过这里。
 *
 * **绝不 console.log 请求体**：封起来之前那一瞬间是明文，日志是唯一会把它留下来的地方。
 */

import * as db from "./db.js";
import { b64url, importPublicKey, seal } from "./seal.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const limits = (env) => ({
  opensPerHour: num(env.MAX_OPENS_PER_HOUR, 5),
  perDay: num(env.MAX_ITEMS_PER_DAY, 300),
  pending: num(env.MAX_PENDING, 500),
  body: num(env.MAX_BODY_BYTES, 1024),
  page: 200,
});

/* ---------- 小工具 ---------- */

const randomToken = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 恒定时间比较：逐字比完才下结论，不因为第一个字就不同而提早返回。 */
function sameHash(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 快捷指令给的值可能是数字、字串或别的东西。一律转成截短的字串。 */
const clip = (v, n) => (v == null ? "" : String(v)).trim().slice(0, n);

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function json(body, status, cors) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (cors) Object.assign(headers, corsHeaders(cors));
  return new Response(body == null ? null : JSON.stringify(body), { status, headers });
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** 读请求体，超过上限就不读完。Content-Length 可以说谎，所以读完再量一次。 */
async function readBody(request, max) {
  const declared = Number(request.headers.get("Content-Length"));
  if (declared > max) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).length > max ? null : text;
}

function parseJson(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** 读钥匙对不对。收件箱不存在与钥匙不对回同一个 404：不让人拿来探测哪些 id 存在。 */
async function authRead(env, id, request) {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const inbox = await db.getInbox(env.DB, id);
  const ok = inbox && token && sameHash(await sha256(token), inbox.read_hash);
  return ok ? inbox : null;
}

/* ---------- 路由 ---------- */

export async function handle(request, env, now = new Date()) {
  const url = new URL(request.url);
  const cors = allowedOrigin(request, env);
  const L = limits(env);
  const iso = now.toISOString();
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "OPTIONS") {
    return cors ? new Response(null, { status: 204, headers: corsHeaders(cors) }) : new Response(null, { status: 403 });
  }

  if (url.pathname === "/health") return new Response("ok\n");

  // 开箱：小帐本「开启」时调用
  if (request.method === "POST" && url.pathname === "/inbox") {
    const text = await readBody(request, 2048);
    const body = text && parseJson(text);
    if (!body) return json({ error: "bad_request" }, 400, cors);
    try {
      await importPublicKey(body.pubkey);
    } catch {
      return json({ error: "bad_pubkey" }, 400, cors);
    }

    const hour = iso.slice(0, 13);
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const ipHash = await sha256(`${ip}|${hour}|${env.QUOTA_SALT ?? ""}`);
    if (!(await db.takeOpenQuota(env.DB, ipHash, hour, L.opensPerHour))) {
      return json({ error: "too_many" }, 429, cors);
    }

    const id = randomToken(16);
    const write = randomToken(32);
    const read = randomToken(32);
    const { x, y } = body.pubkey;
    await db.createInbox(env.DB, {
      id,
      writeHash: await sha256(write),
      readHash: await sha256(read),
      pubkey: JSON.stringify({ kty: "EC", crv: "P-256", x, y }),
      now: iso,
    });
    return json({ id, write, read }, 201, cors);
  }

  if (parts[0] !== "i" || !parts[1]) return json({ error: "not_found" }, 404, cors);
  const id = parts[1];

  // 投递：快捷指令用。写钥匙在路径里，所以连接码就是一整条网址，贴一次就好
  if (request.method === "POST" && parts.length === 3 && parts[2] !== "ack") {
    const inbox = await db.getInbox(env.DB, id);
    if (!inbox || !sameHash(await sha256(parts[2]), inbox.write_hash)) {
      return json({ error: "not_found" }, 404);
    }
    const text = await readBody(request, L.body);
    if (text == null) return json({ error: "too_large" }, 413);
    const body = parseJson(text);
    const amount = clip(body?.amount, 40);
    if (!amount) return json({ error: "bad_request" }, 400);

    if ((await db.countPending(env.DB, id)) >= L.pending) return json({ error: "inbox_full" }, 429);
    if (!(await db.takeDayQuota(env.DB, id, iso.slice(0, 10), L.perDay))) {
      return json({ error: "too_many" }, 429);
    }

    const sealed = await seal(JSON.parse(inbox.pubkey), {
      t: clip(body.t, 40) || iso,
      amount,
      merchant: clip(body.merchant, 80),
      card: clip(body.card, 80),
    });
    await db.insertItem(env.DB, { id: randomToken(12), inboxId: id, now: iso, ...sealed });
    return json({ ok: true }, 200);
  }

  // 以下都要读钥匙：只有那台手机上的小帐本拿得到
  const inbox = await authRead(env, id, request);
  if (!inbox) return json({ error: "not_found" }, 404, cors);

  if (request.method === "GET" && parts.length === 2) {
    const items = await db.listItems(env.DB, id, iso, L.page);
    return json(
      { items: items.map((r) => ({ id: r.id, receivedAt: r.received_at, epk: r.epk, iv: r.iv, ct: r.ct })) },
      200,
      cors,
    );
  }

  if (request.method === "POST" && parts[2] === "ack" && parts.length === 3) {
    const text = await readBody(request, 16 * 1024);
    const body = text && parseJson(text);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === "string").slice(0, L.page) : null;
    if (!ids) return json({ error: "bad_request" }, 400, cors);
    const deleted = await db.ackItems(env.DB, id, ids);
    return json({ deleted }, 200, cors);
  }

  if (request.method === "DELETE" && parts.length === 2) {
    await db.deleteInbox(env.DB, id);
    return json(null, 204, cors);
  }

  return json({ error: "not_found" }, 404, cors);
}

export async function runSweep(env, now = new Date()) {
  const t = now.getTime();
  await db.sweep(env.DB, {
    itemsBefore: new Date(t - 30 * DAY_MS).toISOString(),
    inboxesBefore: new Date(t - 180 * DAY_MS).toISOString(),
    quotaBefore: new Date(t - 2 * 60 * 60 * 1000).toISOString().slice(0, 13),
  });
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      // 只记错误本身，绝不记请求内容
      console.error(`moneybook-inbox 挂了：${err.message}`);
      return json({ error: "internal" }, 500, allowedOrigin(request, env));
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runSweep(env));
  },
};
