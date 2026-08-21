/**
 * Telegram Bot API + 菜单状态机。
 *
 * 菜单选到一半的状态存 D1 的 drafts 表，不塞进 callback_data ——
 * 那个只有 64 字节，班次一多就爆。
 */

import { searchTrips } from "./ktmb.js";
import * as db from "./db.js";
import { ROUTES, hhmm, nowInMY, todayInMY } from "./watch.js";

const API = "https://api.telegram.org/bot";

/* ---------- Telegram API ---------- */

async function call(token, method, payload) {
  const res = await fetch(`${API}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`Telegram ${method} ${res.status}: ${await res.text()}`);
  }
  return res;
}

export const sender = (token) => (chatId, text, keyboard) =>
  call(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });

/* ---------- 日期工具 ---------- */

/** 未来 n 个礼拜日（含今天，如果今天就是） */
export function upcomingSundays(from, n) {
  const out = [];
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + ((0 - d.getUTCDay() + 7) % 7));
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/* ---------- 菜单渲染 ---------- */

const directionKeyboard = () => [
  [{ text: "去程 " + ROUTES.KJ.label, callback_data: "dir:KJ" }],
  [{ text: "回程 " + ROUTES.JK.label, callback_data: "dir:JK" }],
];

const dateKeyboard = () => [
  ...upcomingSundays(nowInMY(), 4).map((d) => [
    { text: `礼拜日 ${d}`, callback_data: `date:${d}` },
  ]),
  [{ text: "其他日期…", callback_data: "date:other" }],
];

function trainKeyboard(trips, selected) {
  return [
    ...trips.map((t) => [
      {
        text: `${selected.includes(t.hourMinute) ? "✅" : "▫️"} ${hhmm(t.hourMinute)} ${t.train}`,
        callback_data: `tr:${t.hourMinute}`,
      },
    ]),
    [{ text: "确定，开始盯", callback_data: "done" }],
  ];
}

/* ---------- 入口 ---------- */

export async function handleUpdate(update, env) {
  const send = sender(env.TELEGRAM_BOT_TOKEN);

  if (update.callback_query) {
    await call(env.TELEGRAM_BOT_TOKEN, "answerCallbackQuery", {
      callback_query_id: update.callback_query.id,
    });
    return handleCallback(update.callback_query, env, send);
  }
  if (update.message?.text) {
    return handleMessage(update.message, env, send);
  }
}

/* ---------- 文字讯息 ---------- */

async function handleMessage(msg, env, send) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const user = await db.getUser(env.DB, chatId);

  // 管理员指令要先于白名单检查（管理员自己也在 users 表里）
  if (user?.is_admin && text.startsWith("/")) {
    const handled = await handleAdmin(text, env, send, chatId);
    if (handled) return;
  }

  if (!user) {
    return send(
      chatId,
      `这是邀请制服务，你还不在名单上。\n\n你的 ID 是 ${chatId}\n把这串号码发给管理员，他加你进来。`,
    );
  }

  const [cmd] = text.split(/\s+/);
  switch (cmd) {
    case "/start":
      await db.clearDraft(env.DB, chatId);
      return send(chatId, "要盯哪个方向？", directionKeyboard());
    case "/my":
      return showMine(chatId, env, send);
    case "/cancel":
      return startCancel(chatId, env, send);
    case "/appeal":
      return appeal(chatId, env, send);
    case "/stats":
      return showStats(chatId, env, send);
    default:
      return maybeCustomDate(chatId, text, env, send);
  }
}

/** 用户按了「其他日期」之后打进来的那一句 */
async function maybeCustomDate(chatId, text, env, send) {
  const draft = await db.getDraft(env.DB, chatId);
  if (draft?.date !== "AWAIT") {
    return send(chatId, "不认得这句。打 /start 重新开始。");
  }
  if (!isIsoDate(text)) {
    return send(chatId, "日期格式要像这样：2026-08-16");
  }
  if (text < todayInMY()) {
    return send(chatId, "这天已经过了。");
  }
  await db.saveDraft(env.DB, chatId, {
    direction: draft.direction,
    date: text,
    trains: [],
  });
  return showTrains(chatId, draft.direction, text, [], env, send);
}

/* ---------- 按钮 ---------- */

async function handleCallback(cq, env, send) {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  const user = await db.getUser(env.DB, chatId);
  if (!user) return send(chatId, "你还不在名单上。");

  if (data.startsWith("dir:")) {
    await db.saveDraft(env.DB, chatId, {
      direction: data.slice(4),
      date: null,
      trains: [],
    });
    return send(chatId, "哪一天？", dateKeyboard());
  }

  if (data === "date:other") {
    const draft = await db.getDraft(env.DB, chatId);
    await db.saveDraft(env.DB, chatId, {
      direction: draft?.direction,
      date: "AWAIT",
      trains: [],
    });
    return send(chatId, "打一个日期给我，格式 2026-08-16");
  }

  if (data.startsWith("date:")) {
    const draft = await db.getDraft(env.DB, chatId);
    const date = data.slice(5);
    await db.saveDraft(env.DB, chatId, {
      direction: draft?.direction,
      date,
      trains: [],
    });
    return showTrains(chatId, draft?.direction, date, [], env, send);
  }

  if (data.startsWith("tr:")) {
    const draft = await db.getDraft(env.DB, chatId);
    if (!draft?.direction || !draft?.date) return send(chatId, "打 /start 重新开始。");
    const hm = Number(data.slice(3));
    const selected = JSON.parse(draft.trains);
    const next = selected.includes(hm)
      ? selected.filter((x) => x !== hm)
      : [...selected, hm].sort((a, b) => a - b);
    await db.saveDraft(env.DB, chatId, {
      direction: draft.direction,
      date: draft.date,
      trains: next,
    });
    return showTrains(chatId, draft.direction, draft.date, next, env, send);
  }

  if (data === "done") {
    const draft = await db.getDraft(env.DB, chatId);
    const selected = draft ? JSON.parse(draft.trains) : [];
    if (!draft?.direction || !draft?.date || selected.length === 0) {
      return send(chatId, "还没选班次。");
    }
    await db.createWatch(env.DB, chatId, draft.direction, draft.date, selected);
    await db.clearDraft(env.DB, chatId);
    const label = ROUTES[draft.direction].label;
    const list = selected.map(hhmm).join("、");
    return send(
      chatId,
      `盯上了：${label}\n${draft.date} ${list}\n\n` +
        `有位我会通知你。余额 ${(await db.getUser(env.DB, chatId)).points} 点。\n` +
        `打 /my 看排队位置。`,
    );
  }

  if (data.startsWith("cx:")) {
    const ok = await db.cancelWatch(env.DB, chatId, Number(data.slice(3)));
    return send(chatId, ok ? "取消了。" : "找不到这条。");
  }
}

/** 拉当天班次给用户勾 */
async function showTrains(chatId, direction, date, selected, env, send) {
  const route = ROUTES[direction];
  if (!route) return send(chatId, "打 /start 重新开始。");

  let trips;
  try {
    trips = await searchTrips({ from: route.from, to: route.to, date });
  } catch (err) {
    return send(chatId, `查不到 ${date} 的班次：${err.message}`);
  }
  if (trips.length === 0) {
    return send(chatId, `${date} 这天没有班次。换一天试试，打 /start。`);
  }

  const baseline = Number(env.OKU_BASELINE ?? 4);
  const lines = trips.map(
    (t) =>
      `${hhmm(t.hourMinute)} ${t.train} — ${t.seats > baseline ? `有位（${t.seats}）` : "没位"}`,
  );
  return send(
    chatId,
    `${route.label} ${date}\n\n${lines.join("\n")}\n\n` +
      `勾要盯的班次（可多选）：\n` +
      `注：剩 ${baseline} 个以内是 OKU 保留位，一般人买不到，算没位。`,
    trainKeyboard(trips, selected),
  );
}

/* ---------- 查询类指令 ---------- */

async function showMine(chatId, env, send) {
  const user = await db.getUser(env.DB, chatId);
  const watches = await db.listWatches(env.DB, chatId);
  const mode = await db.getMode(env.DB);

  if (watches.length === 0) {
    return send(chatId, `余额 ${user.points} 点。\n还没盯任何班次，打 /start。`);
  }

  const parts = [`余额 ${user.points} 点 · 目前是 ${mode === "queue" ? "轮流制" : "同时通知"}`];
  for (const w of watches) {
    const trains = JSON.parse(w.trains);
    const rows = [];
    for (const hm of trains) {
      if (mode === "queue") {
        const p = await db.queuePosition(env.DB, chatId, w.direction, w.date, hm);
        rows.push(`  ${hhmm(hm)} — 排第 ${p?.position ?? "?"} / ${p?.total ?? "?"}`);
      } else {
        rows.push(`  ${hhmm(hm)}`);
      }
    }
    parts.push(`#${w.id} ${ROUTES[w.direction].label} ${w.date}\n${rows.join("\n")}`);
  }

  const last = await db.lastTakenOffer(env.DB, chatId);
  if (last) parts.push(`上次拿到：${last.date} ${hhmm(last.hour_minute)}`);

  return send(chatId, parts.join("\n\n"));
}

async function startCancel(chatId, env, send) {
  const watches = await db.listWatches(env.DB, chatId);
  if (watches.length === 0) return send(chatId, "没有在盯的班次。");
  return send(
    chatId,
    "取消哪一条？",
    watches.map((w) => [
      {
        text: `#${w.id} ${ROUTES[w.direction].label} ${w.date}`,
        callback_data: `cx:${w.id}`,
      },
    ]),
  );
}

async function appeal(chatId, env, send) {
  const offer = await db.lastTakenOffer(env.DB, chatId);
  if (!offer) return send(chatId, "没有可申诉的扣点记录。");
  await send(
    chatId,
    `收到。这一笔会人工核：${offer.date} ${hhmm(offer.hour_minute)}（#${offer.id}）\n` +
      `位子有可能是群外的人订走的，那样会退给你。`,
  );
  const { results } = await env.DB.prepare(
    "SELECT chat_id FROM users WHERE is_admin = 1",
  ).all();
  const user = await db.getUser(env.DB, chatId);
  for (const a of results) {
    await send(
      a.chat_id,
      `申诉：${user.name ?? chatId} 说 offer #${offer.id} ` +
        `（${offer.date} ${hhmm(offer.hour_minute)}）不是他订的。\n` +
        `要退就打 /refund ${chatId} 1`,
    );
  }
}

async function showStats(chatId, env, send) {
  const baseline = Number(env.OKU_BASELINE ?? 4);
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const parts = ["最近 30 天，每班车真的放出过几次位："];

  for (const [code, route] of Object.entries(ROUTES)) {
    const rows = await db.releaseStats(env.DB, code, since, baseline);
    parts.push(
      `\n${route.label}\n` +
        (rows.length
          ? rows.map((r) => `  ${hhmm(r.hour_minute)} — ${r.releases} 次`).join("\n")
          : "  还没有记录"),
    );
  }
  parts.push("\n这个数字决定这门服务值不值得付钱。数据太少就再等等。");
  return send(chatId, parts.join("\n"));
}

/* ---------- 管理员 ---------- */

async function handleAdmin(text, env, send, adminChatId) {
  const [cmd, a, b] = text.split(/\s+/);

  if (cmd === "/adduser") {
    if (!a) {
      await send(adminChatId, "用法：/adduser <chat_id> [名字]");
      return true;
    }
    await db.addUser(env.DB, Number(a), b ?? null);
    await send(adminChatId, `加了 ${a}。用 /topup ${a} 5 给点数。`);
    return true;
  }

  if (cmd === "/topup" || cmd === "/refund") {
    if (!a || !b) {
      await send(adminChatId, `用法：${cmd} <chat_id> <点数>`);
      return true;
    }
    const n = Number(b);
    const reason = cmd === "/topup" ? "topup" : "refund";
    await db.adjustPoints(env.DB, Number(a), n, reason);
    const u = await db.getUser(env.DB, Number(a));
    await send(adminChatId, `${a} 现在有 ${u.points} 点。`);
    await send(
      Number(a),
      reason === "topup"
        ? `充值到账 ${n} 点，余额 ${u.points}。`
        : `退回 ${n} 点，余额 ${u.points}。`,
    );
    return true;
  }

  if (cmd === "/mode") {
    if (!a) {
      const m = await db.getMode(env.DB);
      await send(adminChatId, `目前是 ${m}。切换：/mode queue 或 /mode broadcast`);
      return true;
    }
    if (a !== "queue" && a !== "broadcast") {
      await send(adminChatId, "只能是 queue 或 broadcast。");
      return true;
    }
    await db.setMode(env.DB, a);
    await send(
      adminChatId,
      a === "broadcast"
        ? "切成同时通知了。注意：broadcast 期间不扣点 —— 同时通知多人，分不清是谁订的。"
        : "切回轮流制了。一次只通知一个人，订到扣 1 点。",
    );
    return true;
  }

  return false;
}
