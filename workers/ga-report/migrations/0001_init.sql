-- GA4 与 Search Console 的每日数字，外加 Claude 的周报 / 月报。
-- 日期一律是 'YYYY-MM-DD'。GA 的日期按 GA 资源的时区，GSC 的按美国太平洋时间（Google 定的，改不了）。

-- GA：全站每天一行
CREATE TABLE ga_daily (
  date       TEXT PRIMARY KEY,
  users      INTEGER NOT NULL,
  sessions   INTEGER NOT NULL,
  views      INTEGER NOT NULL,
  wa_clicks  INTEGER NOT NULL      -- 点了 wa.me 链接的次数 = 主数字
);

-- GA：每天各来源的访问次数（Organic Search、Direct、Referral ……）
CREATE TABLE ga_channels (
  date      TEXT NOT NULL,
  channel   TEXT NOT NULL,
  sessions  INTEGER NOT NULL,
  PRIMARY KEY (date, channel)
);

-- GA：每天各页面的浏览数与 WhatsApp 点击数
CREATE TABLE ga_pages (
  date       TEXT NOT NULL,
  path       TEXT NOT NULL,
  views      INTEGER NOT NULL,
  wa_clicks  INTEGER NOT NULL,
  PRIMARY KEY (date, path)
);

-- GSC：全站每天一行。position 是 Google 算好的平均排名
CREATE TABLE gsc_daily (
  date         TEXT PRIMARY KEY,
  clicks       INTEGER NOT NULL,
  impressions  INTEGER NOT NULL,
  position     REAL NOT NULL
);

CREATE TABLE gsc_queries (
  date         TEXT NOT NULL,
  query        TEXT NOT NULL,
  clicks       INTEGER NOT NULL,
  impressions  INTEGER NOT NULL,
  position     REAL NOT NULL,
  PRIMARY KEY (date, query)
);

CREATE TABLE gsc_pages (
  date         TEXT NOT NULL,
  page         TEXT NOT NULL,
  clicks       INTEGER NOT NULL,
  impressions  INTEGER NOT NULL,
  position     REAL NOT NULL,
  PRIMARY KEY (date, page)
);

-- sitemap 里每条地址的收录状态。每天轮着查一小批，几天查完一轮
CREATE TABLE index_status (
  url         TEXT PRIMARY KEY,
  verdict     TEXT,                -- PASS / NEUTRAL / FAIL，查失败时为 NULL
  coverage    TEXT,                -- Google 的原话，例如 "Submitted and indexed"
  last_crawl  TEXT,
  checked_at  TEXT                 -- NULL = 还没查过，下次优先
);

-- 每个来源（ga / gsc / index）补到哪天、上次跑的结果
CREATE TABLE sync_state (
  source      TEXT PRIMARY KEY,
  oldest      TEXT,                -- 已经拉到的最早日期，往回补历史用
  last_run    TEXT,
  last_error  TEXT                 -- NULL = 上次成功
);

-- Claude 写的报告。同一期重写会覆盖旧的
CREATE TABLE reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL CHECK (kind IN ('weekly', 'monthly')),
  period_start  TEXT NOT NULL,
  period_end    TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  UNIQUE (kind, period_start)
);

-- 报告里的每条建议，页面上按「做了 / 不做」
CREATE TABLE suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id  INTEGER NOT NULL REFERENCES reports(id),
  position   INTEGER NOT NULL,
  title      TEXT NOT NULL,
  detail     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'skipped')),
  status_at  TEXT
);

CREATE INDEX suggestions_report ON suggestions (report_id);
