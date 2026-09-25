/**
 * 谁算付费会员，以及试用期怎么给。
 *
 * 「付费会员」= 有点数 或 试用中。
 * `first_topup_at` 刻意不参与判断 —— 那是给管理员看「谁真的付过钱」的标记，
 * 不是权限开关。以前付过钱不代表现在还能用。
 */

/** 试用送几天 */
export const TRIAL_DAYS = 30;

export function isPaid(user, nowIso) {
  if (!user) return false;
  if (user.points > 0) return true;
  return Boolean(user.trial_until) && user.trial_until > nowIso;
}

/** 试用中（而不是靠点数）才为真。到期通知与「抢到不扣点」都看这个。 */
export function inTrial(user, nowIso) {
  return Boolean(user?.trial_until) && user.trial_until > nowIso;
}

export function trialEnd(nowIso, days = TRIAL_DAYS) {
  const t = new Date(nowIso);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString();
}

/**
 * 给试用期。**一辈子只有一次。**
 *
 * `trial_until` 不是 NULL 就代表给过了，哪怕日子早就过去 ——
 * 所以不需要另一个「给过没」的栏位。
 *
 * 不然他每次到期再挂一张票就又拿一轮，等于永远免费。
 *
 * @returns 新的到期时间；已经给过的话回 null
 */
export async function grantTrial(db, chatId, nowIso, days = TRIAL_DAYS) {
  const until = trialEnd(nowIso, days);
  const r = await db
    .prepare(
      "UPDATE users SET trial_until = ? WHERE chat_id = ? AND trial_until IS NULL",
    )
    .bind(until, chatId)
    .run();
  return r.meta.changes > 0 ? until : null;
}
