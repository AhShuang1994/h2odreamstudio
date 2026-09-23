/**
 * 拿 Node 自带的 SQLite 冒充 D1，跑的是 migrations/ 里那份真 SQL。
 *
 * 这样测试碰得到真正的查询，
 * 又不用联网、不用 Cloudflare、不用装东西。
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

export const rows = (db, sql) => db.sqlite.prepare(sql).all().map((r) => ({ ...r }));

/** 整个库倒成一串字：用来断言「明文从没落库」 */
export function dump(db) {
  const tables = rows(db, "SELECT name FROM sqlite_master WHERE type = 'table'");
  return tables.map((t) => JSON.stringify(rows(db, `SELECT * FROM ${t.name}`))).join("\n");
}
