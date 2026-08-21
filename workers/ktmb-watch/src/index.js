/**
 * 入口：cron 触发轮询，webhook 接 Telegram。
 */

import { handleUpdate, sender } from "./bot.js";
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
