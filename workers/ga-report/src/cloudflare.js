/**
 * Cloudflare Web Analytics：真实访客打开网站有多快（Core Web Vitals）。
 *
 * 网站在 Cloudflare 后台开了 Web Analytics，每个页面会自动插一段 beacon，
 * 访客的浏览器量好 LCP / INP / CLS 传回去。这里用 GraphQL Analytics API 拿回来。
 *
 * 要一个 API token，权限只要「Account → Account Analytics → Read」。
 * Cloudflare 只留约 6 个月。
 */

const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const LIMIT = 10000; // 这个数据集一次最多给 10000 格

const QUERY = `query ($account: String!, $filter: AccountRumWebVitalsEventsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      rumWebVitalsEventsAdaptiveGroups(limit: ${LIMIT}, filter: $filter) {
        dimensions { date deviceType requestPath }
        sum {
          visits
          lcpTotal lcpGood lcpPoor
          inpTotal inpGood inpPoor
          clsTotal clsGood clsPoor
        }
        quantiles { largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 }
      }
    }
  }
}`;

/** Cloudflare 的 LCP / INP 单位是微秒，没量到给 -1 */
const ms = (us) => (us == null || us < 0 ? null : Math.round(us / 1000));
const cls = (v) => (v == null || v < 0 ? null : v);

export function parseSpeed(json) {
  if (json.errors?.length) throw new Error(`Cloudflare：${json.errors.map((e) => e.message).join("；")}`);
  const groups = json.data?.viewer?.accounts?.[0]?.rumWebVitalsEventsAdaptiveGroups ?? [];
  return groups.map(({ dimensions: d, sum: s, quantiles: q }) => ({
    date: d.date,
    device: d.deviceType || "unknown",
    path: d.requestPath || "/",
    visits: s.visits,
    lcp_n: s.lcpTotal,
    lcp_good: s.lcpGood,
    lcp_poor: s.lcpPoor,
    lcp_p75: s.lcpTotal ? ms(q.largestContentfulPaintP75) : null,
    inp_n: s.inpTotal,
    inp_good: s.inpGood,
    inp_poor: s.inpPoor,
    inp_p75: s.inpTotal ? ms(q.interactionToNextPaintP75) : null,
    cls_n: s.clsTotal,
    cls_good: s.clsGood,
    cls_poor: s.clsPoor,
    cls_p75: s.clsTotal ? cls(q.cumulativeLayoutShiftP75) : null,
  }));
}

/**
 * 一次只问 7 天：实测问 11 天以上，Cloudflare 会改用更粗的抽样，
 * 同一天的次数会少掉一大半，甚至整天变成 0。7 天以内跟一天一天问的结果一样。
 */
const PIECE_DAYS = 7;

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export async function fetchSpeed({ token, accountId, siteTag, start, end }, fetchFn = fetch) {
  const rows = [];
  for (let from = start; from <= end; from = addDays(from, PIECE_DAYS)) {
    const to = addDays(from, PIECE_DAYS - 1);
    rows.push(...(await fetchPiece({ token, accountId, siteTag, start: from, end: to < end ? to : end }, fetchFn)));
  }
  return { rows };
}

async function fetchPiece({ token, accountId, siteTag, start, end }, fetchFn) {
  const filter = {
    siteTag,
    date_geq: start,
    date_leq: end,
    bot: 0,
    // 报告页、记账页、Access 登录跳转都是自己在用，不算访客
    AND: [{ requestPath_notlike: "/app/%" }, { requestPath_notlike: "/cdn-cgi/%" }],
  };
  const res = await fetchFn(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { account: accountId, filter } }),
  });
  if (!res.ok) throw new Error(`Cloudflare ${res.status}：${(await res.text()).slice(0, 200)}`);
  const rows = parseSpeed(await res.json());
  if (rows.length >= LIMIT) throw new Error(`Cloudflare 一次给了 ${LIMIT} 格，可能没拿全，要把 PIECE_DAYS 改小`);
  return rows;
}
