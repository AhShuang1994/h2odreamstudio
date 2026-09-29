/**
 * D1 的读写。所有 SQL 都在这里。
 *
 * 免费版的 D1 一次执行最多 50 条查询，所以写入不是一行一条 INSERT：
 * 整批行打包成一个 JSON 参数，用 json_each 在库里展开，一张表一条语句。
 */

const TABLES = {
  ga_daily: ["date", "users", "sessions", "views", "wa_clicks"],
  ga_channels: ["date", "channel", "sessions"],
  ga_pages: ["date", "path", "views", "wa_clicks"],
  gsc_daily: ["date", "clicks", "impressions", "position"],
  gsc_queries: ["date", "query", "clicks", "impressions", "position"],
  gsc_pages: ["date", "page", "clicks", "impressions", "position"],
};

const CHUNK = 5000; // 一个 JSON 参数装多少行。D1 单个参数上限 2MB，5000 行远低于它

/** 一段日期整段换新：先删再插。GA 会回头修正最近几天的数字，所以不能只插新的 */
export function replaceRange(db, table, start, end, rows) {
  const cols = TABLES[table];
  const picks = cols.map((_, i) => `json_extract(value, '$[${i}]')`).join(", ");
  const statements = [
    db.prepare(`DELETE FROM ${table} WHERE date BETWEEN ? AND ?`).bind(start, end),
  ];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const packed = rows.slice(i, i + CHUNK).map((r) => cols.map((c) => r[c]));
    statements.push(
      db
        .prepare(`INSERT INTO ${table} (${cols.join(", ")}) SELECT ${picks} FROM json_each(?)`)
        .bind(JSON.stringify(packed)),
    );
  }
  return statements;
}

// ── 同步状态 ─────────────────────────────────────────────────────────

export async function getState(db, source) {
  return db.prepare("SELECT * FROM sync_state WHERE source = ?").bind(source).first();
}

export function saveState(db, source, { oldest, error }) {
  return db
    .prepare(
      `INSERT INTO sync_state (source, oldest, last_run, last_error)
       VALUES (?, ?, datetime('now'), ?)
       ON CONFLICT (source) DO UPDATE SET
         oldest = COALESCE(excluded.oldest, oldest),
         last_run = excluded.last_run,
         last_error = excluded.last_error`,
    )
    .bind(source, oldest ?? null, error ?? null);
}

// ── 收录状态 ─────────────────────────────────────────────────────────

/** 对齐 sitemap：新地址补进来，已经不在 sitemap 的删掉。返回下一批该查的地址 */
export async function nextUrlsToInspect(db, sitemapUrls, limit) {
  await db.batch([
    db
      .prepare("DELETE FROM index_status WHERE url NOT IN (SELECT value FROM json_each(?))")
      .bind(JSON.stringify(sitemapUrls)),
    db
      .prepare("INSERT OR IGNORE INTO index_status (url) SELECT value FROM json_each(?)")
      .bind(JSON.stringify(sitemapUrls)),
  ]);
  const { results } = await db
    .prepare("SELECT url FROM index_status ORDER BY checked_at IS NOT NULL, checked_at LIMIT ?")
    .bind(limit)
    .all();
  return results.map((r) => r.url);
}

export function saveInspections(db, list) {
  return db
    .prepare(
      `UPDATE index_status SET
         verdict = json_extract(j.value, '$.verdict'),
         coverage = json_extract(j.value, '$.coverage'),
         last_crawl = json_extract(j.value, '$.last_crawl'),
         checked_at = datetime('now')
       FROM json_each(?) AS j
       WHERE index_status.url = json_extract(j.value, '$.url')`,
    )
    .bind(JSON.stringify(list));
}

// ── 页面与 Claude 读的数据 ───────────────────────────────────────────

/**
 * from..to 之间的一切数字：逐日序列 + 这段期间的排行。
 *
 * dailyOnly：只要逐日序列。页面画一整年的图时用这个：排行要扫过一年份的
 * 每个搜索词（十几万行），D1 免费版一天只给读 500 万行，每次开页面都扫太浪费。
 */
export async function rangeData(db, from, to, { dailyOnly = false } = {}) {
  const q = (sql) => db.prepare(sql).bind(from, to).all().then((r) => r.results);
  const list = async (sql) => (dailyOnly ? [] : q(sql));

  const [ga, organic, gsc, channels, pages, queries, gscPages] = await Promise.all([
    q("SELECT * FROM ga_daily WHERE date BETWEEN ? AND ? ORDER BY date"),
    q(
      `SELECT date, sessions FROM ga_channels
       WHERE date BETWEEN ? AND ? AND channel = 'Organic Search'`,
    ),
    q("SELECT * FROM gsc_daily WHERE date BETWEEN ? AND ? ORDER BY date"),
    list(
      `SELECT channel, SUM(sessions) AS sessions FROM ga_channels
       WHERE date BETWEEN ? AND ? GROUP BY channel ORDER BY sessions DESC`,
    ),
    list(
      `SELECT path, SUM(views) AS views, SUM(wa_clicks) AS wa_clicks FROM ga_pages
       WHERE date BETWEEN ? AND ? GROUP BY path
       ORDER BY wa_clicks DESC, views DESC LIMIT 30`,
    ),
    // 平均排名按曝光加权：曝光 1 次排第 3 与曝光 100 次排第 30，不能直接平均
    list(
      `SELECT query, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
              SUM(position * impressions) / SUM(impressions) AS position
       FROM gsc_queries WHERE date BETWEEN ? AND ? GROUP BY query
       ORDER BY impressions DESC LIMIT 50`,
    ),
    list(
      `SELECT page, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
              SUM(position * impressions) / SUM(impressions) AS position
       FROM gsc_pages WHERE date BETWEEN ? AND ? GROUP BY page
       ORDER BY impressions DESC LIMIT 30`,
    ),
  ]);

  const organicBy = new Map(organic.map((r) => [r.date, r.sessions]));
  return {
    from,
    to,
    ga_daily: ga.map((r) => ({ ...r, organic_sessions: organicBy.get(r.date) ?? 0 })),
    gsc_daily: gsc,
    channels,
    pages,
    queries,
    gsc_pages: gscPages,
  };
}

/** 页面顶部要的：各来源同步得怎样、GSC 最新到哪天、收录几条 */
export async function status(db) {
  const [sync, gscLatest, gaLatest, index] = await Promise.all([
    db.prepare("SELECT * FROM sync_state").all().then((r) => r.results),
    db.prepare("SELECT MAX(date) AS d FROM gsc_daily").first(),
    db.prepare("SELECT MAX(date) AS d FROM ga_daily").first(),
    db
      .prepare("SELECT url, verdict, coverage, last_crawl, checked_at FROM index_status ORDER BY url")
      .all()
      .then((r) => r.results),
  ]);
  const checked = index.filter((r) => r.checked_at);
  return {
    sync,
    ga_latest: gaLatest?.d ?? null,
    gsc_latest: gscLatest?.d ?? null,
    index: {
      total: index.length,
      checked: checked.length,
      indexed: checked.filter((r) => r.verdict === "PASS").length,
      not_indexed: checked.filter((r) => r.verdict !== "PASS"),
    },
  };
}

// ── 报告与建议 ───────────────────────────────────────────────────────

export async function listReports(db, limit) {
  const { results: reports } = await db
    .prepare("SELECT * FROM reports ORDER BY period_start DESC, kind LIMIT ?")
    .bind(limit)
    .all();
  if (!reports.length) return [];
  const { results: sugg } = await db
    .prepare(
      `SELECT * FROM suggestions WHERE report_id IN (SELECT value FROM json_each(?))
       ORDER BY report_id, position`,
    )
    .bind(JSON.stringify(reports.map((r) => r.id)))
    .all();
  return reports.map((r) => ({ ...r, suggestions: sugg.filter((s) => s.report_id === r.id) }));
}

/** 同一期（kind + period_start）重写就整份换掉，建议也跟着换 */
export async function saveReport(db, { kind, period_start, period_end, body, suggestions }) {
  const old = await db
    .prepare("SELECT id FROM reports WHERE kind = ? AND period_start = ?")
    .bind(kind, period_start)
    .first();
  if (old) {
    await db.batch([
      db.prepare("DELETE FROM suggestions WHERE report_id = ?").bind(old.id),
      db.prepare("DELETE FROM reports WHERE id = ?").bind(old.id),
    ]);
  }
  const { meta } = await db
    .prepare(
      `INSERT INTO reports (kind, period_start, period_end, body, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
    )
    .bind(kind, period_start, period_end, body)
    .run();
  const id = meta.last_row_id;
  if (suggestions.length) {
    // 阿爽自己做的事（owner）进来就是「做了」，开始日由 Claude 从清单或 git log 找出来
    await db
      .prepare(
        `INSERT INTO suggestions (report_id, position, title, detail, source, hypothesis, metric,
                                  baseline, check_weeks, started_on, status, status_at)
         SELECT ?, key, json_extract(value, '$.title'), json_extract(value, '$.detail'),
                COALESCE(json_extract(value, '$.source'), 'claude'),
                json_extract(value, '$.hypothesis'), json_extract(value, '$.metric'),
                json_extract(value, '$.baseline'), json_extract(value, '$.check_weeks'),
                json_extract(value, '$.started_on'),
                CASE json_extract(value, '$.source') WHEN 'owner' THEN 'done' ELSE 'open' END,
                CASE json_extract(value, '$.source') WHEN 'owner' THEN datetime('now') END
         FROM json_each(?)`,
      )
      .bind(id, JSON.stringify(suggestions))
      .run();
  }
  return id;
}

/** 按「做了」那天就是实验开始日；撤销或不做，开始日和结果一起清掉 */
export async function setSuggestionStatus(db, id, status, today) {
  const { meta } = await db
    .prepare(
      `UPDATE suggestions SET status = ?1, status_at = datetime('now'),
         started_on = CASE WHEN ?1 = 'done' THEN COALESCE(started_on, ?2) END,
         result = CASE WHEN ?1 = 'done' THEN result END,
         result_note = CASE WHEN ?1 = 'done' THEN result_note END,
         result_at = CASE WHEN ?1 = 'done' THEN result_at END
       WHERE id = ?3`,
    )
    .bind(status, today, id)
    .run();
  return meta.changes > 0;
}

// ── 实验 ─────────────────────────────────────────────────────────────

/** 有检查期、而且已经开始的建议才是实验。旧建议没有 check_weeks，不算 */
const EXPERIMENT = "status = 'done' AND started_on IS NOT NULL AND check_weeks IS NOT NULL";

/** 判结果（Claude 到期判，阿爽不同意也用这个改判）。还没开始的不能判 */
export async function setSuggestionResult(db, id, result, note) {
  const { meta } = await db
    .prepare(
      `UPDATE suggestions SET result = ?, result_note = ?, result_at = datetime('now')
       WHERE id = ? AND ${EXPERIMENT}`,
    )
    .bind(result, note ?? null, id)
    .run();
  if (meta.changes > 0) return "ok";
  const exists = await db.prepare("SELECT 1 FROM suggestions WHERE id = ?").bind(id).first();
  return exists ? "not-started" : "missing";
}

/** 全部实验，新开始的在前；到期 = 开始日 + 检查周数 ≤ 今天，而且还没判 */
export async function listExperiments(db, today) {
  const { results } = await db
    .prepare(
      `SELECT s.*, r.kind AS report_kind, r.period_start AS report_period_start,
              date(s.started_on, '+' || (s.check_weeks * 7) || ' days') AS check_on
       FROM suggestions s JOIN reports r ON r.id = s.report_id
       WHERE s.status = 'done' AND s.started_on IS NOT NULL AND s.check_weeks IS NOT NULL
       ORDER BY s.started_on DESC, s.id DESC`,
    )
    .all();
  const items = results.map((e) => ({ ...e, due: !e.result && e.check_on <= today }));
  const count = (result) => items.filter((e) => e.result === result).length;
  return {
    summary: { effective: count("effective"), ineffective: count("ineffective"), unclear: count("unclear"), running: count(null) },
    items,
  };
}
