/**
 * 入口：cron 触发轮询，webhook 接 Telegram。
 */

import { handleUpdate, registerCommands, sender } from "./bot.js";
import { runPoll } from "./watch.js";

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runPoll(env, { send: sender(env.TELEGRAM_BOT_TOKEN) }));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok\n");
    }

    // 让 Worker 拿自己手上的密钥去 Telegram 登记 webhook，
    // 省得人去终端贴 token —— 贴错或贴漏才是真风险。
    // 公开也无所谓：它只会把 webhook 指回自己，重复调用结果一样。
    if (url.pathname === "/setup") {
      const { results } = await env.DB.prepare(
        "SELECT chat_id FROM users WHERE is_admin = 1",
      ).all();
      await registerCommands(env, results.map((r) => r.chat_id));

      const res = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `${url.origin}/webhook`,
            secret_token: env.TELEGRAM_WEBHOOK_SECRET,
            allowed_updates: ["message", "callback_query"],
          }),
        },
      );
      return new Response(await res.text(), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("not found\n", { status: 404 });
    }

    // Telegram 会把这个头带回来，用来确认请求真的来自 Telegram
    if (
      request.headers.get("X-Telegram-Bot-Api-Secret-Token") !==
      env.TELEGRAM_WEBHOOK_SECRET
    ) {
      return new Response("forbidden\n", { status: 403 });
    }

    const update = await request.json();

    // 先回 200，慢的活丢到背景。Telegram 等太久会重送同一条 update。
    ctx.waitUntil(
      handleUpdate(update, env).catch((err) =>
        console.error(`handleUpdate 挂了：${err.stack ?? err.message}`),
      ),
    );
    return new Response("ok\n");
  },
};
