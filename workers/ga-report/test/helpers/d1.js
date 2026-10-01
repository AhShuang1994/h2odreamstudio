/**
 * 拿 Node 自带的 SQLite 冒充 D1，跑的是 migrations/ 里那份真 SQL。
 * 照抄 ktmb-watch 的做法：json_each 的写入、加权平均排名，都要碰真 SQL 才测得到。
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
    s.params = params.map((p) => (p === undefined ? null : p));
    // 真 D1 认 ?1 ?2 这种编号参数；Node 22 的 sqlite 按位置绑会报 "column index out of range"。
    // 换成具名参数 :p1 :p2 再绑，行为跟 D1 一样
    if (/\?\d/.test(this.sql)) {
      s.sql = this.sql.replace(/\?(\d+)/g, ":p$1");
      s.params = [Object.fromEntries(s.params.map((p, i) => [`p${i + 1}`, p]))];
    }
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
    return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
  }
}

class FakeD1 {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) {
    return new Statement(this.sqlite, sql);
  }

  // 真 D1 的 batch 是一个交易：中间一条失败，整批不生效
  async batch(statements) {
    this.sqlite.exec("BEGIN");
    try {
      const out = [];
      for (const s of statements) out.push(await s.run());
      this.sqlite.exec("COMMIT");
      return out;
    } catch (err) {
      this.sqlite.exec("ROLLBACK");
      throw err;
    }
  }
}

const migrations = () => readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

/** before：只跑到这个编号之前，用来测迁移碰到旧数据会怎样 */
export function freshDb({ before } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  for (const f of migrations().filter((f) => !before || f < before)) {
    sqlite.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  return new FakeD1(sqlite);
}

/** 补跑剩下的迁移（编号 ≥ from） */
export function migrateFrom(db, from) {
  for (const f of migrations().filter((f) => f >= from)) {
    db.sqlite.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
}

export const rows = (db, sql) => db.sqlite.prepare(sql).all().map((r) => ({ ...r }));
