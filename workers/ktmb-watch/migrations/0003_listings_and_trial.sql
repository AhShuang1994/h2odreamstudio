-- 挂票告示板 + 试用期。

-- 一条挂票 = 群里某人手上有一张自己用不到的票，问谁要。
-- 刻意不存票本身、不存名字、不存证件号、不碰钱 —— 出事时 bot 手上什么都没有。
-- gender 存的是「票上那个人是男是女」，因为买家是顶着这个身份上车，
-- 他在答应之前得知道对不对得上。名字不存。
CREATE TABLE listings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     INTEGER NOT NULL REFERENCES users(chat_id),
  direction   TEXT NOT NULL,
  date        TEXT NOT NULL,
  hour_minute INTEGER NOT NULL,
  qty         INTEGER NOT NULL,
  fare        TEXT,                    -- KTMB 当下的票价，抓来当参考，不是他自己填的
  gender      TEXT NOT NULL,           -- 'M' | 'F'
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_listings_open ON listings(active, date, hour_minute);

-- 挂票菜单选到一半的状态。跟盯梢的 drafts 分开，因为字段完全不一样。
CREATE TABLE listing_drafts (
  chat_id     INTEGER PRIMARY KEY REFERENCES users(chat_id),
  direction   TEXT,
  date        TEXT,
  hour_minute INTEGER,
  qty         INTEGER,
  gender      TEXT,
  fare        TEXT,
  trips       TEXT,                    -- 班次表缓存，免得每按一下就重打 KTMB 三个请求
  updated_at  TEXT NOT NULL
);

-- 试用期：第一次挂票送 30 天，一辈子只有一次。
--
-- 用一个到期日而不是「送几点」，是因为买的点不过期、送的点会过期，
-- 一个 points 整数装不下两种 —— 他有 1 送的 + 5 买的 = 6 点，
-- 到期要扣掉那 1 点时根本算不出该扣哪一点。
--
-- trial_until 不是 NULL 就代表「已经给过」，哪怕日子早就过了。
-- 所以「一辈子一次」不需要另一个栏位。
ALTER TABLE users ADD COLUMN trial_until TEXT;

-- 试用到期前一天预告一次。没有这个标记的话，轮询每 5 分钟就提醒他一次。
ALTER TABLE users ADD COLUMN trial_warned_at TEXT;

-- 只有 /topup 会写。这是「谁真的付过钱」的标记，不是权限开关 ——
-- 能不能盯梢看的是「有点数或试用中」。
ALTER TABLE users ADD COLUMN first_topup_at TEXT;
