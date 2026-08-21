-- 勾选班次时把班次表缓存在草稿里。
-- 原本每勾一下就重查一次 KTMB：勾 8 个班次 = 24 个请求，
-- 一个人玩菜单比定时轮询还耗。班次表几秒内不会变，查一次就够。
ALTER TABLE drafts ADD COLUMN trips TEXT;
