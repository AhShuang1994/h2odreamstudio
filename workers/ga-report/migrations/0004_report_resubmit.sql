-- 同一期报告重交不再「先删再插」：报告留原来的 id，建议按 key 对上就原地更新，
-- 已按的「做了 / 不做」、开始日、实验结果一律不碰。见 docs/adr/0011-report-resubmit-keeps-records.md
--
-- 只加栏位、补值，不删任何一行。0001 说的「同一期重写会覆盖旧的」从这里起不再成立。

-- 报告重交的时间。created_at 保留第一次交的时间
ALTER TABLE reports ADD COLUMN updated_at TEXT;

-- 建议在这一期里的稳定标识。Claude 自己取（例如 "jb-title"），重交时沿用同一个 key，
-- 改了标题也对得上。没给 key 的建议由系统给 's' || id
ALTER TABLE suggestions ADD COLUMN key TEXT;

-- 重交的新版报告没再提这条的时间。NULL = 还在最新版里。只做标记，不删，记录照留
ALTER TABLE suggestions ADD COLUMN retired_at TEXT;

-- 旧建议补上 key，Claude 从 /reports 读到之后就能沿用
UPDATE suggestions SET key = 's' || id WHERE key IS NULL;

CREATE UNIQUE INDEX suggestions_report_key ON suggestions (report_id, key);
