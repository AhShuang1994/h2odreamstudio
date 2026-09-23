-- 小帐本 Apple Pay 收件箱。
--
-- 这里只转运、不存帐：每一笔在小帐本拉走并确认之后就删掉，没拉走的 30 天后由 cron 清掉。
-- 库里没有任何明文：金额、商家、卡名在 Worker 收到的当下就用使用者的公钥封起来，
-- 只有那台手机上的私钥解得开。钥匙也只存哈希。

CREATE TABLE inboxes (
  id           TEXT PRIMARY KEY,
  write_hash   TEXT NOT NULL,           -- 写钥匙的 SHA-256：快捷指令用，只能投递
  read_hash    TEXT NOT NULL,           -- 读钥匙的 SHA-256：小帐本用，能拉取、确认、关闭
  pubkey       TEXT NOT NULL,           -- 使用者的 ECDH P-256 公钥（JWK）
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,           -- 最后一次被小帐本读取。180 天没读就整箱清掉
  day          TEXT NOT NULL DEFAULT '',-- day_count 算的是哪一天（UTC 日期）
  day_count    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE items (
  id          TEXT PRIMARY KEY,
  inbox_id    TEXT NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  received_at TEXT NOT NULL,
  epk         TEXT NOT NULL,            -- 一次性公钥（base64url）
  iv          TEXT NOT NULL,
  ct          TEXT NOT NULL             -- AES-GCM 密文（base64url）
);

CREATE INDEX items_by_inbox ON items (inbox_id, received_at);

-- 开箱限速：按小时计数，存的是 IP 的哈希，不存 IP 本身
CREATE TABLE open_quota (
  ip_hash TEXT NOT NULL,
  hour    TEXT NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, hour)
);
