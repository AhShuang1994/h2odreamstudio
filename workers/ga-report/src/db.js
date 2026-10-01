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
  speed: [
    "date", "device", "path", "visits",
    "lcp_n", "lcp_good", "lcp_poor", "lcp_p75",
    "inp_n", "inp_good", "inp_poor", "inp_p75",
    "cls_n", "cls_good", "cls_poor", "cls_p75",
  ],
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

  const [ga, organic, gsc, channels, pages, queries, gscPages, speed, speedPages] = await Promise.all([
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
    list(speedSql("device")),
    list(`${speedSql("path")} ORDER BY lcp_poor DESC, lcp_n DESC LIMIT 30`),
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
    speed,
    speed_pages: speedPages,
  };
}

/**
 * 打开速度按 by（装置或页面）合计：次数直接加；p75 不能加，
 * 就把每一格的 p75 按次数加权，取累计到 75% 的那一格。每格只有一两次时就是真的 p75，
 * 次数多了是估计，页面上写「约」。
 */
function speedSql(by) {
  const p75 = (m) => `(SELECT v FROM (
      SELECT ${m}_p75 AS v, SUM(${m}_n) OVER (ORDER BY ${m}_p75 ROWS UNBOUNDED PRECEDING) AS cum,
             SUM(${m}_n) OVER () AS total
      FROM r WHERE ${by} = g.${by} AND ${m}_n > 0 AND ${m}_p75 IS NOT NULL
    ) WHERE cum >= 0.75 * total ORDER BY v LIMIT 1) AS ${m}_p75`;
  return `WITH r AS (SELECT * FROM speed WHERE date BETWEEN ? AND ?)
    SELECT ${by}, SUM(visits) AS visits,
      SUM(lcp_n) AS lcp_n, SUM(lcp_good) AS lcp_good, SUM(lcp_poor) AS lcp_poor, ${p75("lcp")},
      SUM(inp_n) AS inp_n, SUM(inp_good) AS inp_good, SUM(inp_poor) AS inp_poor, ${p75("inp")},
      SUM(cls_n) AS cls_n, SUM(cls_good) AS cls_good, SUM(cls_poor) AS cls_poor, ${p75("cls")}
    FROM r AS g GROUP BY ${by}`;
}

/** 页面顶部要的：各来源同步得怎样、GSC 最新到哪天、收录几条 */
export async function status(db) {
  const [sync, gscLatest, gaLatest, speedLatest, index] = await Promise.all([
    db.prepare("SELECT * FROM sync_state").all().then((r) => r.results),
    db.prepare("SELECT MAX(date) AS d FROM gsc_daily").first(),
    db.prepare("SELECT MAX(date) AS d FROM ga_daily").first(),
    db.prepare("SELECT MAX(date) AS d FROM speed").first(),
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
    speed_latest: speedLatest?.d ?? null,
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
  // 重交时新版没再提的（retired_at 有值）排在后面，记录照留
  const { results: sugg } = await db
    .prepare(
      `SELECT * FROM suggestions WHERE report_id IN (SELECT value FROM json_each(?))
       ORDER BY report_id, retired_at IS NOT NULL, position, id`,
    )
    .bind(JSON.stringify(reports.map((r) => r.id)))
    .all();
  return reports.map((r) => ({ ...r, suggestions: sugg.filter((s) => s.report_id === r.id) }));
}

/** 系统自动给的 key（旧建议、没带 key 的建议）。Claude 只能沿用，不能拿来起新的 */
const AUTO_KEY = /^s\d+$/;

/** 没带 key 的建议，只有这几栏跟旧的一字不差才算同一条。按「做了」之后会变的栏位不比 */
const CONTENT = ["title", "detail", "hypothesis", "metric", "baseline", "check_weeks"];
const sameContent = (row, s) =>
  CONTENT.every((f) => row[f] === s[f]) && row.source === (s.source ?? "claude");

/**
 * 交报告。同一期（kind + period_start）重交是更新，不是换掉（ADR-0011）：
 *
 * - 报告留原来的 id，只换期间结束日与正文。
 * - 建议先按 key 对；没带 key、或 key 对不上的，再找内容一字不差、还没被认走的旧建议。
 *   对上了就原地更新文字与顺序。状态、开始日、实验结果一律不碰；实验开始了
 *   （有 started_on），猜想、指标、基准、检查周数也不改，不然到期判的不是当初那个实验。
 * - 对不上的当新建议加进去。新版没提到的旧建议只标 retired_at，不删。
 *
 * key 起成系统格式（s + 数字）却对不上 → 回 { error }，什么都不写。
 */
export async function saveReport(db, { kind, period_start, period_end, body, suggestions }) {
  const report = await db
    .prepare("SELECT id FROM reports WHERE kind = ? AND period_start = ?")
    .bind(kind, period_start)
    .first();
  const existing = report
    ? (
        await db
          .prepare("SELECT * FROM suggestions WHERE report_id = ? ORDER BY retired_at IS NOT NULL, position, id")
          .bind(report.id)
          .all()
      ).results
    : [];

  const byKey = new Map(existing.map((r) => [r.key, r]));
  const plan = suggestions.map((s, position) => ({ s, position, row: byKey.get(s.key) ?? null, matched: "key" }));
  const claimed = new Set(plan.filter((p) => p.row).map((p) => p.row.id));
  for (const p of plan) {
    if (p.row) continue;
    if (p.s.key !== undefined && AUTO_KEY.test(p.s.key)) {
      return { error: `key "${p.s.key}" 是系统给的格式，这一期没有这条。新建议请自己起 key（例如 "jb-title"）` };
    }
    p.row = existing.find((r) => !claimed.has(r.id) && sameContent(r, p.s)) ?? null;
    p.matched = p.row ? "content" : "new";
    if (p.row) claimed.add(p.row.id);
  }

  const reportId = "(SELECT id FROM reports WHERE kind = ?1 AND period_start = ?2)";
  const statements = [
    report
      ? db
          .prepare("UPDATE reports SET period_end = ?, body = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(period_end, body, report.id)
      : db
          .prepare(
            `INSERT INTO reports (kind, period_start, period_end, body, created_at)
             VALUES (?, ?, ?, ?, datetime('now'))`,
          )
          .bind(kind, period_start, period_end, body),
  ];

  // 先把这期全部旧建议标成「新版没提」，下面对上的再拿掉标记。只标，不删
  if (report) {
    statements.push(
      db
        .prepare(
          `UPDATE suggestions SET retired_at = COALESCE(retired_at, datetime('now'))
           WHERE report_id = ? AND id NOT IN (SELECT value FROM json_each(?))`,
        )
        .bind(report.id, JSON.stringify([...claimed])),
    );
  }

  for (const { s, position, row } of plan.filter((p) => p.row)) {
    statements.push(
      db
        .prepare(
          `UPDATE suggestions SET position = ?1, title = ?2, detail = ?3,
             hypothesis = CASE WHEN started_on IS NULL THEN ?4 ELSE hypothesis END,
             metric = CASE WHEN started_on IS NULL THEN ?5 ELSE metric END,
             baseline = CASE WHEN started_on IS NULL THEN ?6 ELSE baseline END,
             check_weeks = CASE WHEN started_on IS NULL THEN ?7 ELSE check_weeks END,
             key = ?8, retired_at = NULL
           WHERE id = ?9`,
        )
        .bind(position, s.title, s.detail, s.hypothesis, s.metric, s.baseline, s.check_weeks, s.key ?? row.key, row.id),
    );
  }

  const fresh = plan.filter((p) => !p.row).map(({ s, position }) => ({ ...s, position, key: s.key ?? null }));
  if (fresh.length) {
    // 阿爽自己做的事（owner）进来就是「做了」，开始日由 Claude 从清单或 git log 找出来
    statements.push(
      db
        .prepare(
          `INSERT INTO suggestions (report_id, position, key, title, detail, source, hypothesis, metric,
                                    baseline, check_weeks, started_on, status, status_at)
           SELECT ${reportId}, json_extract(value, '$.position'), json_extract(value, '$.key'),
                  json_extract(value, '$.title'), json_extract(value, '$.detail'),
                  COALESCE(json_extract(value, '$.source'), 'claude'),
                  json_extract(value, '$.hypothesis'), json_extract(value, '$.metric'),
                  json_extract(value, '$.baseline'), json_extract(value, '$.check_weeks'),
                  json_extract(value, '$.started_on'),
                  CASE json_extract(value, '$.source') WHEN 'owner' THEN 'done' ELSE 'open' END,
                  CASE json_extract(value, '$.source') WHEN 'owner' THEN datetime('now') END
           FROM json_each(?3)`,
        )
        .bind(kind, period_start, JSON.stringify(fresh)),
    );
  }
  // 没带 key 的给系统 key，下次 Claude 从 /reports 读到就能沿用
  statements.push(
    db.prepare(`UPDATE suggestions SET key = 's' || id WHERE report_id = ${reportId} AND key IS NULL`).bind(kind, period_start),
  );

  await db.batch(statements); // 一个交易：中间失败就整批不生效，旧的一样不丢

  const { id } = await db.prepare("SELECT id FROM reports WHERE kind = ? AND period_start = ?").bind(kind, period_start).first();
  const { results: now } = await db
    .prepare("SELECT id, key, position, retired_at FROM suggestions WHERE report_id = ? ORDER BY position, id")
    .bind(id)
    .all();
  const active = now.filter((r) => !r.retired_at);
  return {
    id,
    created: !report,
    suggestions: plan.map((p) => {
      const r = active.find((a) => a.position === p.position);
      return { id: r.id, key: r.key, matched: p.matched };
    }),
    retired: now.filter((r) => r.retired_at).map((r) => r.key),
  };
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
