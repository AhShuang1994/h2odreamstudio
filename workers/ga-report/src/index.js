/**
 * 入口：cron 每天拉一次数字；/app/report/api/* 给报告页和 Claude 的云端任务用。
 *
 * 所有接口都要先过 Cloudflare Access（见 access.js）。页面自己
 * （public/app/report/）由 Cloudflare Pages 出，不经过这里。
 */

import { verifyAccess } from "./access.js";
import { runSync } from "./sync.js";
import { rangeData, status, listReports, saveReport, setSuggestionStatus } from "./db.js";

const API = "/app/report/api";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const bad = (message) => json({ error: message }, 400);

/** Claude 交上来的报告，先检查形状再进库 */
function checkReport(r) {
  if (!r || typeof r !== "object") return "要一个 JSON 对象";
  if (!["weekly", "monthly"].includes(r.kind)) return "kind 只能是 weekly 或 monthly";
  if (!DATE.test(r.period_start ?? "") || !DATE.test(r.period_end ?? "")) return "日期格式是 YYYY-MM-DD";
  if (typeof r.body !== "string" || !r.body.trim() || r.body.length > 20000) return "body 要 1～20000 字";
  if (!Array.isArray(r.suggestions) || r.suggestions.length > 10) return "suggestions 最多 10 条";
  for (const s of r.suggestions) {
    if (typeof s?.title !== "string" || !s.title.trim() || s.title.length > 200) return "每条建议的 title 要 1～200 字";
    if (typeof s.detail !== "string" || s.detail.length > 2000) return "每条建议的 detail 最多 2000 字";
  }
  return null;
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.slice(API.length);
  const { method } = request;

  if (method === "GET" && path === "/data") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!DATE.test(from ?? "") || !DATE.test(to ?? "") || from > to) return bad("要 from 与 to，格式 YYYY-MM-DD");
    return json(await rangeData(env.DB, from, to));
  }

  if (method === "GET" && path === "/status") {
    return json(await status(env.DB));
  }

  if (method === "GET" && path === "/reports") {
    const limit = Math.min(Number(url.searchParams.get("limit")) || 12, 50);
    return json(await listReports(env.DB, limit));
  }

  // 下面都是写入。只收 JSON：跨站的表单送不出这种请求，顺带挡掉 CSRF
  if (method === "POST" && !request.headers.get("Content-Type")?.startsWith("application/json")) {
    return json({ error: "只收 application/json" }, 415);
  }

  if (method === "POST" && path === "/reports") {
    const body = await request.json().catch(() => null);
    const problem = checkReport(body);
    if (problem) return bad(problem);
    return json({ id: await saveReport(env.DB, body) }, 201);
  }

  const m = /^\/suggestions\/(\d+)$/.exec(path);
  if (method === "POST" && m) {
    const body = await request.json().catch(() => null);
    if (!["open", "done", "skipped"].includes(body?.status)) return bad("status 只能是 open / done / skipped");
    const found = await setSuggestionStatus(env.DB, Number(m[1]), body.status);
    return found ? json({ ok: true }) : json({ error: "没有这条建议" }, 404);
  }

  // 手动触发一次同步。第一次设好之后用它测试，不用等明天的 cron
  if (method === "POST" && path === "/sync") {
    return json(await runSync(env));
  }

  return json({ error: "not found" }, 404);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      runSync(env).then((results) => {
        for (const r of results) if (!r.ok) console.error(`${r.source} 同步失败：${r.error}`);
      }),
    );
  },

  async fetch(request, env, ctx) {
    if (!new URL(request.url).pathname.startsWith(`${API}/`)) {
      return json({ error: "not found" }, 404);
    }
    if (!(await verifyAccess(request, env))) {
      return json({ error: "要先通过 Cloudflare Access 登录" }, 403);
    }
    return route(request, env, ctx);
  },
};
