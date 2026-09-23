/**
 * D1 封装。所有 SQL 只出现在这个文件里。
 *
 * 时间一律是 ISO 字串（toISOString），字典序就是时间序，比较不用转型。
 */

/* ---------- 开箱限速 ---------- */

/** 这个 IP 这个小时还能不能再开一个收件箱。能的话顺手记一笔。 */
export async function takeOpenQuota(db, ipHash, hour, limit) {
  const r = await db
    .prepare(
      `INSERT INTO open_quota (ip_hash, hour, n) VALUES (?, ?, 1)
       ON CONFLICT (ip_hash, hour) DO UPDATE SET n = n + 1 WHERE n < ?`,
    )
    .bind(ipHash, hour, limit)
    .run();
  return r.meta.changes === 1;
}

/* ---------- 收件箱 ---------- */

export async function createInbox(db, { id, writeHash, readHash, pubkey, now }) {
  await db
    .prepare(
      `INSERT INTO inboxes (id, write_hash, read_hash, pubkey, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, writeHash, readHash, pubkey, now, now)
    .run();
}

export async function getInbox(db, id) {
  return db.prepare("SELECT * FROM inboxes WHERE id = ?").bind(id).first();
}

/**
 * 今天还能不能再投一笔。能的话计数 +1。
 * 换日就从 1 重新算：一条 UPDATE 做完判断与计数，两个请求同时到也不会多放一笔。
 */
export async function takeDayQuota(db, id, day, limit) {
  const r = await db
    .prepare(
      `UPDATE inboxes
          SET day_count = CASE WHEN day = ? THEN day_count + 1 ELSE 1 END,
              day = ?
        WHERE id = ? AND NOT (day = ? AND day_count >= ?)`,
    )
    .bind(day, day, id, day, limit)
    .run();
  return r.meta.changes === 1;
}

export async function deleteInbox(db, id) {
  await db.batch([
    db.prepare("DELETE FROM items WHERE inbox_id = ?").bind(id),
    db.prepare("DELETE FROM inboxes WHERE id = ?").bind(id),
  ]);
}

/* ---------- 记录 ---------- */

export async function countPending(db, inboxId) {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM items WHERE inbox_id = ?")
    .bind(inboxId)
    .first();
  return row.n;
}

export async function insertItem(db, { id, inboxId, now, epk, iv, ct }) {
  await db
    .prepare(
      `INSERT INTO items (id, inbox_id, received_at, epk, iv, ct)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, inboxId, now, epk, iv, ct)
    .run();
}

/** 拉取待同步的记录，顺手记下「这个收件箱还有人在用」。 */
export async function listItems(db, inboxId, now, limit) {
  await db.prepare("UPDATE inboxes SET last_seen_at = ? WHERE id = ?").bind(now, inboxId).run();
  const { results } = await db
    .prepare(
      `SELECT id, received_at, epk, iv, ct FROM items
        WHERE inbox_id = ? ORDER BY received_at, id LIMIT ?`,
    )
    .bind(inboxId, limit)
    .all();
  return results;
}

/** 删掉已经同步进帐本的记录。带上 inbox_id：别的收件箱的 id 就算猜中也删不到。 */
export async function ackItems(db, inboxId, ids) {
  if (!ids.length) return 0;
  const stmts = ids.map((id) =>
    db.prepare("DELETE FROM items WHERE id = ? AND inbox_id = ?").bind(id, inboxId),
  );
  const out = await db.batch(stmts);
  return out.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
}

/* ---------- 每日清理 ---------- */

/**
 * 30 天没被拉走的记录、180 天没被读过的收件箱、两小时前的限速计数，全部删掉。
 * 这里只转运，不该有任何东西长住。
 */
export async function sweep(db, { itemsBefore, inboxesBefore, quotaBefore }) {
  await db.batch([
    db.prepare("DELETE FROM items WHERE received_at < ?").bind(itemsBefore),
    db
      .prepare(
        "DELETE FROM items WHERE inbox_id IN (SELECT id FROM inboxes WHERE last_seen_at < ?)",
      )
      .bind(inboxesBefore),
    db.prepare("DELETE FROM inboxes WHERE last_seen_at < ?").bind(inboxesBefore),
    db.prepare("DELETE FROM open_quota WHERE hour < ?").bind(quotaBefore),
  ]);
}
