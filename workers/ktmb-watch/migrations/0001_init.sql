-- 邀请制，没有自助注册。管理员用 /adduser 加人。
CREATE TABLE users (
  chat_id    INTEGER PRIMARY KEY,
  name       TEXT,
  points     INTEGER NOT NULL DEFAULT 0,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 一条 watch = 某人登记「某天这几班车我要坐」。
-- 只有登记了的人才进抢位队列 —— 那天不坐的人不该占位。
CREATE TABLE watches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    INTEGER NOT NULL REFERENCES users(chat_id),
  direction  TEXT NOT NULL,          -- 'KJ' = KLUANG→JB SENTRAL，'JK' = 反向
  date       TEXT NOT NULL,          -- ISO，2026-08-16
  trains     TEXT NOT NULL,          -- JSON 数组，元素是 hourMinute：[1840,2100]
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_watches_active ON watches(active, direction, date);

-- 菜单选到一半的状态。放这里而不是塞进 Telegram 的 callback_data，
-- 因为那个只有 64 字节，班次一多就爆。
CREATE TABLE drafts (
  chat_id    INTEGER PRIMARY KEY,
  direction  TEXT,
  date       TEXT,
  trains     TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

-- 每次轮询的原始观察值，所有班次都记（不只登记的那几班）。
-- 试跑一两个月后靠这张表回答那个还没答案的问题：这条线一周真的放几次位？
CREATE TABLE seat_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  direction   TEXT NOT NULL,
  date        TEXT NOT NULL,
  hour_minute INTEGER NOT NULL,
  seats       INTEGER NOT NULL,
  seen_at     TEXT NOT NULL
);
CREATE INDEX idx_seat_log_lookup ON seat_log(direction, date, hour_minute, seen_at DESC);

-- queue 模式下，一次「通知给某人」的机会，3 分钟窗口。
-- broadcast 模式不建 offer。
CREATE TABLE offers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  watch_id    INTEGER NOT NULL REFERENCES watches(id),
  chat_id     INTEGER NOT NULL REFERENCES users(chat_id),
  direction   TEXT NOT NULL,
  date        TEXT NOT NULL,
  hour_minute INTEGER NOT NULL,
  offered_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  outcome     TEXT                    -- NULL=进行中 | 'taken' | 'passed' | 'gone'
);
CREATE INDEX idx_offers_pending ON offers(outcome, expires_at);
CREATE INDEX idx_offers_by_user ON offers(chat_id, offered_at DESC);

-- 点数流水。充值、扣点、退点都记这里，每月对账就看这张表。
CREATE TABLE ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    INTEGER NOT NULL REFERENCES users(chat_id),
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,           -- 'topup' | 'booked' | 'refund'
  offer_id   INTEGER REFERENCES offers(id),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ledger_by_user ON ledger(chat_id, created_at DESC);

-- 线上可改的开关，不用重新部署。目前只有 allocation_mode。
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO settings (key, value, updated_at)
  VALUES ('allocation_mode', 'queue', datetime('now'));
