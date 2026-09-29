-- 转寄地址（ADR-0004）：Gmail 过滤器把银行邮件转到 mb+<别名>@网域，Email Routing 交给 Worker。
--
-- 别名等于一把只能投递的写钥匙，所以跟写钥匙一样只存哈希。没要过地址的收件箱是 NULL，
-- UNIQUE 索引允许多个 NULL。
ALTER TABLE inboxes ADD COLUMN mail_hash TEXT;

CREATE UNIQUE INDEX inboxes_by_mail ON inboxes (mail_hash);
