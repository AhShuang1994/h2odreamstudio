-- 建议升级成实验：每条建议带猜想、看哪个数字、做之前的数字、几周后检查，
-- 到期由 Claude 判有效 / 无效 / 看不出。见 docs/adr/0010-report-experiments.md
--
-- 旧建议这几栏都是 NULL：check_weeks 是 NULL 的不算实验，永远不会到期。

-- claude = Claude 在报告里提的；owner = 阿爽自己去做、Claude 替她记下来的
ALTER TABLE suggestions ADD COLUMN source TEXT NOT NULL DEFAULT 'claude' CHECK (source IN ('claude', 'owner'));
ALTER TABLE suggestions ADD COLUMN hypothesis TEXT;
ALTER TABLE suggestions ADD COLUMN metric TEXT;
ALTER TABLE suggestions ADD COLUMN baseline TEXT;
ALTER TABLE suggestions ADD COLUMN check_weeks INTEGER;
-- 改动上线那天（YYYY-MM-DD）。按「做了」时填当天，撤销就清掉
ALTER TABLE suggestions ADD COLUMN started_on TEXT;
ALTER TABLE suggestions ADD COLUMN result TEXT CHECK (result IN ('effective', 'ineffective', 'unclear'));
ALTER TABLE suggestions ADD COLUMN result_note TEXT;
ALTER TABLE suggestions ADD COLUMN result_at TEXT;
