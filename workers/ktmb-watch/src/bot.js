/**
 * Telegram Bot API + 菜单状态机。
 *
 * 菜单选到一半的状态存 D1 的 drafts 表，不塞进 callback_data ——
 * 那个只有 64 字节，班次一多就爆。
 */

import { searchTrips } from "./ktmb.js";
import * as db from "./db.js";
import { ROUTES, hhmm, nowInMY, liveTrains, hasDeparted } from "./watch.js";

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

/* ---------- 指令菜单 ---------- */

/** 输入框旁边那个 Menu 键里列的东西，用户不用自己打字 */
export const USER_COMMANDS = [
  { command: "start", description: "开始盯一班车" },
  { command: "my", description: "我盯了什么、剩几点、排第几" },
  { command: "stats", description: "这条线最近真的放过几次位" },
  { command: "cancel", description: "取消一条盯梢" },
  { command: "appeal", description: "申诉刚才那次扣点" },
];

/** 管理员多这几个。用 scope 挂在个人身上，别人看不到 */
export const ADMIN_COMMANDS = [
  ...USER_COMMANDS,
  { command: "adduser", description: "加人进白名单" },
  { command: "topup", description: "收到钱后加点数" },
  { command: "refund", description: "退点数" },
  { command: "mode", description: "切轮流制 / 同时通知" },
];

/** 把指令菜单推给 Telegram。部署后打一次 /setup 就好 */
export async function registerCommands(env, adminChatIds) {
  const token = env.TELEGRAM_BOT_TOKEN;
  await call(token, "setMyCommands", {
    commands: USER_COMMANDS,
    scope: { type: "default" },
  });
  for (const chatId of adminChatIds) {
    await call(token, "setMyCommands", {
      commands: ADMIN_COMMANDS,
      scope: { type: "chat", chat_id: chatId },
    });
  }
}

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

const isoOf = (d) => d.toISOString().slice(0, 10);

/**
 * 手动输入日期的可选范围。
 * 一条线路吃掉 MAX_ROUTES 里的一格，所以不能让人打个明年的日期占一整年。
 */
export function dateWindow(now, daysAhead) {
  const last = new Date(now);
  last.setUTCDate(last.getUTCDate() + daysAhead);
  return { first: isoOf(now), last: isoOf(last) };
}

/* ---------- 菜单渲染 ---------- */

const directionKeyboard = () => [
  [{ text: "去程 " + ROUTES.KJ.label, callback_data: "dir:KJ" }],
  [{ text: "回程 " + ROUTES.JK.label, callback_data: "dir:JK" }],
];

// 按钮都带上自己的方向与日期。Telegram 里旧讯息的按钮永远点得下去，
// 不带的话，翻上去点旧勾勾会把班次塞进当前这条草稿 —— 盯上一班那天根本不开的车。
// 按钮列的礼拜日也要卡在同一个窗口内 —— 手打限四星期、按钮却能选更远，
// 是最容易被人绕过去的那种不一致。
const dateKeyboard = (dir, now, daysAhead) => {
  const { last } = dateWindow(now, daysAhead);
  return [
    ...upcomingSundays(now, 4)
      .filter((d) => d <= last)
      .map((d) => [{ text: `礼拜日 ${d}`, callback_data: `date:${dir}:${d}` }]),
    [{ text: "其他日期…", callback_data: `date:${dir}:other` }],
  ];
};

function trainKeyboard(dir, date, trips, selected) {
  return [
    ...trips.map((t) => [
      {
        text: `${selected.includes(t.hourMinute) ? "✅" : "▫️"} ${hhmm(t.hourMinute)} ${t.train}`,
        callback_data: `tr:${dir}:${date}:${t.hourMinute}`,
      },
    ]),
    [{ text: "确定，开始盯", callback_data: `done:${dir}:${date}` }],
  ];
}

const STALE = "这是旧的选单了。打 /start 重新开始。";

/**
 * 这个按钮是不是属于用户当前那条草稿。
 * 对不上就是翻旧讯息点的 —— 照做会把班次塞错日期。
 */
export const draftMatches = (draft, dir, date) =>
  Boolean(draft) && draft.direction === dir && draft.date === date;

/** `tr:KJ:2026-08-23:1840` → { dir, date, hm } */
export function parseTrainCallback(data) {
  const [dir, date, hm] = data.slice(3).split(":");
  return { dir, date, hm: Number(hm) };
}

/* ---------- 入口 ---------- */

/**
 * @param {{send?: Function, search?: Function}} [deps]
 *        测试时换成假的，不发真讯息、不打真 KTMB
 */
export async function handleUpdate(update, env, deps = {}) {
  const send = deps.send ?? sender(env.TELEGRAM_BOT_TOKEN);
  const search = deps.search ?? searchTrips;
  const now = deps.now ? deps.now() : nowInMY();

  if (update.callback_query) {
    if (!deps.send) {
      await call(env.TELEGRAM_BOT_TOKEN, "answerCallbackQuery", {
        callback_query_id: update.callback_query.id,
      });
    }
    return handleCallback(update.callback_query, env, send, search, now);
  }
  if (update.message?.text) {
    return handleMessage(update.message, env, send, search, now);
  }
}

/* ---------- 文字讯息 ---------- */

async function handleMessage(msg, env, send, search, now) {
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
      return showMine(chatId, env, send, now);
    case "/cancel":
      return startCancel(chatId, env, send, now);
    case "/appeal":
      return appeal(chatId, env, send);
    case "/stats":
      return showStats(chatId, env, send, now);
    default:
      return maybeCustomDate(chatId, text, env, send, search, now);
  }
}

/** 用户按了「其他日期」之后打进来的那一句 */
async function maybeCustomDate(chatId, text, env, send, search, now) {
  const draft = await db.getDraft(env.DB, chatId);
  if (draft?.date !== "AWAIT") {
    return send(chatId, "不认得这句。打 /start 重新开始。");
  }
  if (!isIsoDate(text)) {
    return send(chatId, "日期格式要像这样：2026-08-16");
  }

  const { first, last } = dateWindow(now, Number(env.MAX_DAYS_AHEAD ?? 28));
  if (text < first) {
    return send(chatId, "这天已经过了。");
  }
  if (text > last) {
    return send(
      chatId,
      `太远了。最远只能到 ${last}（四个星期内）。\n\n` +
        `再远的日期 KTMB 通常也还没开卖，而且会一直占着盯梢的额度。`,
    );
  }

  await db.saveDraft(env.DB, chatId, {
    direction: draft.direction,
    date: text,
    trains: [],
  });
  return showTrains(chatId, draft.direction, text, [], env, send, search, now);
}

/* ---------- 按钮 ---------- */

async function handleCallback(cq, env, send, search, now) {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  const user = await db.getUser(env.DB, chatId);
  if (!user) return send(chatId, "你还不在名单上。");

  if (data.startsWith("dir:")) {
    const dir = data.slice(4);
    if (!ROUTES[dir]) return send(chatId, STALE);
    await db.saveDraft(env.DB, chatId, { direction: dir, date: null, trains: [] });
    return send(chatId, "哪一天？", dateKeyboard(dir, now, Number(env.MAX_DAYS_AHEAD ?? 28)));
  }

  if (data.startsWith("date:")) {
    const [dir, date] = data.slice(5).split(":");
    if (!ROUTES[dir]) return send(chatId, STALE);

    if (date === "other") {
      await db.saveDraft(env.DB, chatId, {
        direction: dir,
        date: "AWAIT",
        trains: [],
      });
      const { first, last } = dateWindow(now, Number(env.MAX_DAYS_AHEAD ?? 28));
      return send(
        chatId,
        `打一个日期给我，格式像 2026-08-16。\n\n可选范围：${first} 到 ${last}`,
      );
    }
    // 按钮已经卡过范围了，但旧讯息的按钮永远点得下去，所以这里再挡一次
    const win = dateWindow(now, Number(env.MAX_DAYS_AHEAD ?? 28));
    if (date < win.first) return send(chatId, "这天已经过了。");
    if (date > win.last) {
      return send(chatId, `太远了。最远只能到 ${win.last}（四个星期内）。`);
    }

    await db.saveDraft(env.DB, chatId, { direction: dir, date, trains: [] });
    return showTrains(chatId, dir, date, [], env, send, search, now);
  }

  if (data.startsWith("tr:")) {
    const { dir, date, hm } = parseTrainCallback(data);
    const draft = await db.getDraft(env.DB, chatId);
    if (!draftMatches(draft, dir, date)) return send(chatId, STALE);
    const selected = JSON.parse(draft.trains);
    const next = selected.includes(hm)
      ? selected.filter((x) => x !== hm)
      : [...selected, hm].sort((a, b) => a - b);

    // 用草稿里缓存的班次表重画，别每勾一下就再打 KTMB 三个请求
    const cached = draft.trips ? JSON.parse(draft.trips) : null;
    await db.saveDraft(env.DB, chatId, {
      direction: dir,
      date,
      trains: next,
      trips: cached,
    });
    return showTrains(chatId, dir, date, next, env, send, search, now, cached);
  }

  if (data.startsWith("done:")) {
    const [dir, date] = data.slice(5).split(":");
    const draft = await db.getDraft(env.DB, chatId);
    if (!draftMatches(draft, dir, date)) return send(chatId, STALE);
    const selected = JSON.parse(draft.trains);
    if (selected.length === 0) return send(chatId, "还没勾班次。");

    // 一条线路吃掉全站 MAX_ROUTES 里的一格。不限人头的话，一个人建满
    // 28 天 × 2 方向 = 56 条，别人一个通知都收不到。
    const maxPerUser = Number(env.MAX_WATCHES_PER_USER ?? 5);
    const mine = await db.countWatches(env.DB, chatId, now.toISOString().slice(0, 10));
    if (mine >= maxPerUser) {
      return send(
        chatId,
        `你已经盯了 ${mine} 条，一个人最多 ${maxPerUser} 条。\n\n` +
          `先用 /cancel 取消一条再来。\n` +
          `（这个上限是为了别让一个人把额度占光，其他人就收不到通知了。）`,
      );
    }

    const watchId = await db.createWatch(env.DB, chatId, dir, date, selected);
    await db.clearDraft(env.DB, chatId);

    // 通知只在「没位 → 有位」那一刻发。所以如果勾的班次现在就有位，
    // 那一刻可能永远不会来 —— 得当场讲，否则人会盯着一班早就能订的车空等。
    const baseline = Number(env.OKU_BASELINE ?? 4);
    const route = ROUTES[dir];
    let openNow = [];
    try {
      const trips = await search({ from: route.from, to: route.to, date });
      openNow = trips.filter(
        (t) => selected.includes(t.hourMinute) && t.seats > baseline,
      );
    } catch {
      // 查不到就算了，盯梢已经建好，下一轮自然会跑
    }

    const points = (await db.getUser(env.DB, chatId)).points;
    const head = `盯上了：${route.label}\n${date} ${selected.map(hhmm).join("、")}`;

    if (openNow.length > 0) {
      // 盯梢照留 —— 「现在能订」不等于「他已经订了」。他可能在开车、在上班。
      // 删不删由他一按决定，系统不替他做主。
      return send(
        chatId,
        `${head}\n\n` +
          `⚠️ 现在就有位，别等通知，直接去订：\n` +
          openNow.map((t) => `  ${hhmm(t.hourMinute)} — ${t.seats} 个`).join("\n") +
          `\n\nhttps://online.ktmb.com.my/\n\n` +
          `订好了按下面那颗；还没订就先摆着，满了我会通知你。不扣点。`,
        [
          [{ text: "✅ 我订到了，别盯了", callback_data: `cx:${watchId}` }],
          [{ text: "⏳ 先帮我盯着", callback_data: "keep" }],
        ],
      );
    }

    return send(
      chatId,
      `${head}\n\n` +
        `这几班现在都没位。我每 5 分钟查一次，有位的那一刻通知你。\n` +
        `余额 ${points} 点，抢到才扣。\n` +
        `打 /my 看排队位置。`,
    );
  }

  if (data === "keep") {
    return send(chatId, "好，继续盯着。满了再放出来我第一个通知你。");
  }

  if (data.startsWith("cx:")) {
    const ok = await db.cancelWatch(env.DB, chatId, Number(data.slice(3)));
    return send(chatId, ok ? "取消了。" : "找不到这条，可能已经取消过。");
  }
}

/** 拉当天班次给用户勾 */
async function showTrains(chatId, direction, date, selected, env, send, search, now, cached) {
  const route = ROUTES[direction];
  if (!route) return send(chatId, "打 /start 重新开始。");

  let fetched = cached;
  if (!fetched) {
    try {
      fetched = await search({ from: route.from, to: route.to, date });
    } catch (err) {
      return send(chatId, `查不到 ${date} 的班次：${err.message}`);
    }
    await db.saveDraft(env.DB, chatId, {
      direction,
      date,
      trains: selected,
      trips: fetched,
    });
  }
  if (fetched.length === 0) {
    return send(chatId, `${date} 这天没有班次。换一天试试，打 /start。`);
  }

  // 选今天的话，已经开走的别给他勾 —— 勾了也是建一条下一轮就被关掉的死盯梢
  const trips = fetched.filter((t) => !hasDeparted(date, t.hourMinute, now));
  if (trips.length === 0) {
    return send(
      chatId,
      `${date} 的车都开走了，没有还没开的班次。\n换一天试试，打 /start。`,
    );
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
    trainKeyboard(direction, date, trips, selected),
  );
}

/* ---------- 查询类指令 ---------- */

async function showMine(chatId, env, send, now) {
  const user = await db.getUser(env.DB, chatId);
  const mode = await db.getMode(env.DB);
  const all = await db.listWatches(env.DB, chatId, now.toISOString().slice(0, 10));

  // 车开走了还列出来只会让人困惑，整条都开走的就整条不显示
  const watches = all
    .map((w) => ({ ...w, live: liveTrains(w.date, JSON.parse(w.trains), now) }))
    .filter((w) => w.live.length > 0);

  if (watches.length === 0) {
    return send(chatId, `余额 ${user.points} 点。\n还没盯任何班次，打 /start。`);
  }

  const parts = [`余额 ${user.points} 点 · 目前是 ${mode === "queue" ? "轮流制" : "同时通知"}`];
  for (const w of watches) {
    const rows = [];
    for (const hm of w.live) {
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

async function startCancel(chatId, env, send, now) {
  const watches = await db.listWatches(env.DB, chatId, now.toISOString().slice(0, 10));
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

async function showStats(chatId, env, send, now) {
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
  // 容量是运营者要盯的第二个数字：满了就有人收不到通知
  const max = Number(env.MAX_ROUTES ?? 12);
  const active = await db.activeRoutes(env.DB, now.toISOString().slice(0, 10));
  parts.push(
    `\n目前在跑的线路：${active.length} / ${max}` +
      (active.length >= max
        ? "\n⚠️ 已经满了，最远的那几条会被漏跑。"
        : `（还能再加 ${max - active.length} 个不同日期）`),
  );

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
    // 也通知本人 —— 他多半在被加之前就打过一次 /start 吃了闭门羹，
    // 没人叫他，他不会再打第二次。
    await send(
      Number(a),
      `✅ 你的号已经开通了。\n\n打 /start 开始盯车：选方向 → 选日期 → 勾班次。\n` +
        `有位的那一刻我发讯息给你。`,
    );
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
