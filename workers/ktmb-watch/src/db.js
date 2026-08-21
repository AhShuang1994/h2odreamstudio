/**
 * D1 封装。所有 SQL 只出现在这个文件里。
 */

const now = () => new Date().toISOString();

/* ---------- settings ---------- */

export async function getMode(db) {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = 'allocation_mode'")
    .first();
  return row?.value === "broadcast" ? "broadcast" : "queue";
}

export async function setMode(db, mode) {
  await db
    .prepare(
      "UPDATE settings SET value = ?, updated_at = ? WHERE key = 'allocation_mode'",
    )
    .bind(mode, now())
    .run();
}

/* ---------- users ---------- */

export function getUser(db, chatId) {
  return db.prepare("SELECT * FROM users WHERE chat_id = ?").bind(chatId).first();
}

export async function addUser(db, chatId, name, isAdmin = 0) {
  await db
    .prepare(
      `INSERT INTO users (chat_id, name, points, is_admin, created_at)
       VALUES (?, ?, 0, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET name = excluded.name`,
    )
    .bind(chatId, name, isAdmin, now())
    .run();
}

/** 加点或扣点，同时写流水。delta 为负就是扣。 */
export async function adjustPoints(db, chatId, delta, reason, offerId = null) {
  await db.batch([
    db
      .prepare("UPDATE users SET points = points + ? WHERE chat_id = ?")
      .bind(delta, chatId),
    db
      .prepare(
        `INSERT INTO ledger (chat_id, delta, reason, offer_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(chatId, delta, reason, offerId, now()),
  ]);
}

/* ---------- drafts（菜单选到一半的状态） ---------- */

export function getDraft(db, chatId) {
  return db.prepare("SELECT * FROM drafts WHERE chat_id = ?").bind(chatId).first();
}

export async function saveDraft(db, chatId, { direction, date, trains, trips }) {
  await db
    .prepare(
      `INSERT INTO drafts (chat_id, direction, date, trains, trips, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         direction = excluded.direction,
         date = excluded.date,
         trains = excluded.trains,
         trips = excluded.trips,
         updated_at = excluded.updated_at`,
    )
    .bind(
      chatId,
      direction ?? null,
      date ?? null,
      JSON.stringify(trains ?? []),
      trips ? JSON.stringify(trips) : null,
      now(),
    )
    .run();
}

export async function clearDraft(db, chatId) {
  await db.prepare("DELETE FROM drafts WHERE chat_id = ?").bind(chatId).run();
}

/* ---------- watches ---------- */

/**
 * 这个人手上还在跑的盯梢有几条。
 * 没有上限的话，一个人就能把 MAX_ROUTES 撑爆，别人全部漏跑。
 */
export async function countWatches(db, chatId, today) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM watches
       WHERE chat_id = ? AND active = 1 AND date >= ?`,
    )
    .bind(chatId, today)
    .first();
  return row.n;
}

export async function createWatch(db, chatId, direction, date, trains) {
  const r = await db
    .prepare(
      `INSERT INTO watches (chat_id, direction, date, trains, active, created_at)
       VALUES (?, ?, ?, ?, 1, ?) RETURNING id`,
    )
    .bind(chatId, direction, date, JSON.stringify(trains), now())
    .first();
  return r.id;
}

/** 只列还有意义的：日期过了的自动不显示，免得堆成一长串死盯梢 */
export async function listWatches(db, chatId, today) {
  const { results } = await db
    .prepare(
      `SELECT * FROM watches
       WHERE chat_id = ? AND active = 1 AND date >= ?
       ORDER BY date, id`,
    )
    .bind(chatId, today)
    .all();
  return results;
}

export async function cancelWatch(db, chatId, watchId) {
  const r = await db
    .prepare("UPDATE watches SET active = 0 WHERE id = ? AND chat_id = ?")
    .bind(watchId, chatId)
    .run();
  return r.meta.changes > 0;
}

/** 轮询要跑哪几趟查询：所有还有人登记、且日期没过的 (direction, date)。 */
export async function activeRoutes(db, today) {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT direction, date FROM watches
       WHERE active = 1 AND date >= ?
       ORDER BY date`,
    )
    .bind(today)
    .all();
  return results;
}

/** 这条线路上，所有还 active 的 watch（要看班次有没有开走，所以整条拿回来）。 */
export async function watchesOnRoute(db, direction, date) {
  const { results } = await db
    .prepare(
      `SELECT id, chat_id, trains FROM watches
       WHERE active = 1 AND direction = ? AND date = ?`,
    )
    .bind(direction, date)
    .all();
  return results;
}

export async function deactivateWatches(db, ids) {
  if (ids.length === 0) return;
  await db.batch(
    ids.map((id) => db.prepare("UPDATE watches SET active = 0 WHERE id = ?").bind(id)),
  );
}

/** 某班次上，所有登记了的人（含点数与上次拿到通知的时间）。 */
export async function watchersOf(db, direction, date, hourMinute) {
  const { results } = await db
    .prepare(
      `SELECT w.id AS watch_id, w.chat_id, w.trains, u.points,
              (SELECT MAX(offered_at) FROM offers o WHERE o.chat_id = w.chat_id)
                AS last_offered_at
       FROM watches w
       JOIN users u ON u.chat_id = w.chat_id
       WHERE w.active = 1 AND w.direction = ? AND w.date = ?`,
    )
    .bind(direction, date)
    .all();
  return dedupeByUser(results.filter((r) => JSON.parse(r.trains).includes(hourMinute)));
}

/**
 * 同一个人对同一班车建了两条 watch 时，只算一次。
 * 否则他会占掉两个排队位置，等于插队。
 */
export function dedupeByUser(watchers) {
  const seen = new Map();
  for (const w of watchers) {
    if (!seen.has(w.chat_id)) seen.set(w.chat_id, w);
  }
  return [...seen.values()];
}

/* ---------- seat_log ---------- */

/** 某班次上一次看到的座位数，没有记录返回 null。 */
export async function lastSeats(db, direction, date, hourMinute) {
  const row = await db
    .prepare(
      `SELECT seats FROM seat_log
       WHERE direction = ? AND date = ? AND hour_minute = ?
       ORDER BY seen_at DESC LIMIT 1`,
    )
    .bind(direction, date, hourMinute)
    .first();
  return row ? row.seats : null;
}

export async function logSeats(db, direction, date, trips) {
  if (trips.length === 0) return;
  const t = now();
  await db.batch(
    trips.map((x) =>
      db
        .prepare(
          `INSERT INTO seat_log (direction, date, hour_minute, seats, seen_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(direction, date, x.hourMinute, x.seats, t),
    ),
  );
}

/** /stats 用：最近 N 天里，每班车真的放出过几次位。 */
export async function releaseStats(db, direction, sinceIso, baseline) {
  const { results } = await db
    .prepare(
      `SELECT hour_minute, COUNT(*) AS releases FROM (
         SELECT hour_minute, seats,
                LAG(seats) OVER (PARTITION BY date, hour_minute ORDER BY seen_at)
                  AS prev
         FROM seat_log
         WHERE direction = ? AND seen_at >= ?
       )
       WHERE prev IS NOT NULL AND prev <= ? AND seats > ?
       GROUP BY hour_minute
       ORDER BY hour_minute`,
    )
    .bind(direction, sinceIso, baseline, baseline)
    .all();
  return results;
}

/* ---------- offers ---------- */

export async function pendingOffers(db) {
  const { results } = await db
    .prepare("SELECT * FROM offers WHERE outcome IS NULL")
    .all();
  return results;
}

export async function hasPendingOffer(db, direction, date, hourMinute) {
  const row = await db
    .prepare(
      `SELECT 1 FROM offers
       WHERE outcome IS NULL AND direction = ? AND date = ? AND hour_minute = ?`,
    )
    .bind(direction, date, hourMinute)
    .first();
  return Boolean(row);
}

export async function createOffer(db, o, windowMinutes) {
  const t = new Date();
  const r = await db
    .prepare(
      `INSERT INTO offers
         (watch_id, chat_id, direction, date, hour_minute, offered_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      o.watch_id,
      o.chat_id,
      o.direction,
      o.date,
      o.hourMinute,
      t.toISOString(),
      new Date(t.getTime() + windowMinutes * 60_000).toISOString(),
    )
    .first();
  return r.id;
}

/**
 * 认领一个还没结案的 offer。**扣点唯一的入口。**
 *
 * 条件里的 `chat_id = ?` 挡住「按别人的 offer」，`outcome IS NULL` 挡住重复按 ——
 * 两个都靠 SQL 的原子性，不靠先读再写（那会有竞态）。
 *
 * @returns 认领成功的那笔 offer；已经结案或不是他的就回 null
 */
export async function claimOffer(db, offerId, chatId) {
  const r = await db
    .prepare(
      `UPDATE offers SET outcome = 'booked'
       WHERE id = ? AND chat_id = ? AND outcome IS NULL
       RETURNING *`,
    )
    .bind(offerId, chatId)
    .first();
  return r ?? null;
}

export async function settleOffer(db, offerId, outcome) {
  await db
    .prepare("UPDATE offers SET outcome = ? WHERE id = ?")
    .bind(outcome, offerId)
    .run();
}

/** /appeal 用：这个人最近一次被判定为「订到了」的 offer。 */
export function lastTakenOffer(db, chatId) {
  return db
    .prepare(
      `SELECT * FROM offers
       WHERE chat_id = ? AND outcome = 'booked'
       ORDER BY offered_at DESC LIMIT 1`,
    )
    .bind(chatId)
    .first();
}

/**
 * 排队顺序：没拿过通知的排最前，其余按上次拿到的时间由早到晚。
 * 「凭什么我排后面」的答案是：因为你上次拿到了。
 */
export function orderQueue(watchers) {
  return [...watchers].sort((a, b) => {
    if (a.last_offered_at === b.last_offered_at) return a.chat_id - b.chat_id;
    if (!a.last_offered_at) return -1;
    if (!b.last_offered_at) return 1;
    return a.last_offered_at < b.last_offered_at ? -1 : 1;
  });
}

/** queue 模式下某人排第几。 */
export async function queuePosition(db, chatId, direction, date, hourMinute) {
  const ordered = orderQueue(await watchersOf(db, direction, date, hourMinute));
  const i = ordered.findIndex((w) => w.chat_id === chatId);
  return i < 0 ? null : { position: i + 1, total: ordered.length };
}
