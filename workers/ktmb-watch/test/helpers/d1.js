/**
 * 拿 Node 自带的 SQLite 冒充 D1，跑的是 migrations/ 里那份真 SQL。
 *
 * 这样测试碰得到真正的查询 —— releaseStats 的 window function、
 * watchersOf 的子查询 —— 又不用联网、不用 Cloudflare、不用装东西。
 * 只实作了 db.js 真的用到的那几个方法。
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

class Statement {
  constructor(sqlite, sql) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    const s = new Statement(this.sqlite, this.sql);
    // D1 的 null 要转成 undefined 才喂得进 node:sqlite
    s.params = params.map((p) => (p === undefined ? null : p));
    return s;
  }

  async first() {
    const rows = this.sqlite.prepare(this.sql).all(...this.params);
    return rows.length ? { ...rows[0] } : null;
  }

  async all() {
    return { results: this.sqlite.prepare(this.sql).all(...this.params).map((r) => ({ ...r })) };
  }

  async run() {
    const r = this.sqlite.prepare(this.sql).run(...this.params);
    return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } };
  }
}

class FakeD1 {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) {
    return new Statement(this.sqlite, sql);
  }

  async batch(statements) {
    const out = [];
    for (const s of statements) out.push(await s.run());
    return out;
  }
}

/** 建一个跑好 migration 的空库 */
export function freshDb() {
  const sqlite = new DatabaseSync(":memory:");
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  return new FakeD1(sqlite);
}

/** 直接塞资料，省得每个测试写一堆 INSERT */
export function seed(
  db,
  { users = [], watches = [], seatLog = [], offers = [], listings = [] },
) {
  const sq = db.sqlite;
  for (const u of users) {
    sq.prepare(
      `INSERT INTO users (chat_id,name,points,is_admin,trial_until,first_topup_at,created_at)
       VALUES (?,?,?,?,?,?,datetime('now'))`,
    ).run(
      u.chat_id,
      u.name ?? null,
      u.points ?? 0,
      u.is_admin ?? 0,
      u.trial_until ?? null,
      u.first_topup_at ?? null,
    );
  }
  for (const l of listings) {
    sq.prepare(
      `INSERT INTO listings (chat_id,direction,date,hour_minute,qty,fare,gender,active,created_at)
       VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
    ).run(
      l.chat_id,
      l.direction,
      l.date,
      l.hour_minute,
      l.qty ?? 1,
      l.fare ?? "MYR 27.00",
      l.gender ?? "M",
      l.active ?? 1,
    );
  }
  for (const w of watches) {
    sq.prepare(
      `INSERT INTO watches (chat_id,direction,date,trains,active,created_at)
       VALUES (?,?,?,?,?,datetime('now'))`,
    ).run(w.chat_id, w.direction, w.date, JSON.stringify(w.trains), w.active ?? 1);
  }
  for (const s of seatLog) {
    sq.prepare(
      `INSERT INTO seat_log (direction,date,hour_minute,seats,seen_at)
       VALUES (?,?,?,?,?)`,
    ).run(s.direction, s.date, s.hour_minute, s.seats, s.seen_at);
  }
  for (const o of offers) {
    sq.prepare(
      `INSERT INTO offers (watch_id,chat_id,direction,date,hour_minute,offered_at,expires_at,outcome)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run(
      o.watch_id,
      o.chat_id,
      o.direction,
      o.date,
      o.hour_minute,
      o.offered_at,
      o.expires_at,
      o.outcome ?? null,
    );
  }
  return db;
}

export const rows = (db, sql) => db.sqlite.prepare(sql).all().map((r) => ({ ...r }));

/** 收下所有通知，让测试断言「谁收到了什么」 */
export function recorder() {
  const sent = [];
  return {
    sent,
    send: async (chatId, text, keyboard) => {
      sent.push({ chatId, text, keyboard });
    },
    to: (chatId) => sent.filter((s) => s.chatId === chatId),
  };
}

/** 假的 KTMB 查询：给几班车，就回几班车 */
export const fakeSearch = (byRoute) => async ({ from, to, date }) => {
  const key = `${from}>${to}|${date}`;
  if (!(key in byRoute)) throw new Error(`测试没给 ${key} 的班次`);
  return byRoute[key];
};

export const trip = (hourMinute, seats, train = "Platinum - 9531") => ({
  train,
  depart: `${String(Math.floor(hourMinute / 100)).padStart(2, "0")}:${String(hourMinute % 100).padStart(2, "0")}`,
  arrive: "--:--",
  duration: "55m",
  seats,
  fare: "MYR 27.00",
  hourMinute,
});
