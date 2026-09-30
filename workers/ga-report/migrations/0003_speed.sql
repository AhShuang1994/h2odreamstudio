-- 真实访客打开网站有多快：Cloudflare Web Analytics 的 Core Web Vitals。
--
-- 一行 = 某天、某种装置、某一页。三个指标各记：
--   _n     有几次量到（Cloudflare 抽样后推算的次数）
--   _good  算「快」的次数、_poor 算「慢」的次数（中间那段 = n - good - poor）
--   _p75   这一格里 75% 的访客在这个数字以内。LCP / INP 单位是毫秒，CLS 没有单位
-- 「快」「慢」的线是 Google 定的，Cloudflare 已经算好：
--   LCP ≤ 2.5 秒快、> 4 秒慢；INP ≤ 200ms 快、> 500ms 慢；CLS ≤ 0.1 快、> 0.25 慢
-- 次数可以跨天相加；p75 不能，所以页面上的秒数是按次数加权的估计。

CREATE TABLE speed (
  date TEXT NOT NULL,
  device TEXT NOT NULL,      -- mobile / desktop / tablet
  path TEXT NOT NULL,
  visits INTEGER NOT NULL,
  lcp_n INTEGER NOT NULL,
  lcp_good INTEGER NOT NULL,
  lcp_poor INTEGER NOT NULL,
  lcp_p75 REAL,
  inp_n INTEGER NOT NULL,
  inp_good INTEGER NOT NULL,
  inp_poor INTEGER NOT NULL,
  inp_p75 REAL,
  cls_n INTEGER NOT NULL,
  cls_good INTEGER NOT NULL,
  cls_poor INTEGER NOT NULL,
  cls_p75 REAL,
  PRIMARY KEY (date, device, path)
);
