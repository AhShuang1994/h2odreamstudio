/**
 * 网站报告页。数字全从 /app/report/api/* 拿（workers/ga-report），这里只负责画。
 *
 * 日 / 周 / 月 = 最近 1 / 7 / 30 天，跟再前面同样长的一段比。
 * GSC 的数字晚 2～3 天，所以 Google 那几格用「GSC 最新有数的那天」往回算，
 * 不跟 GA 用同一个结束日，不然「昨天」的 Google 数字永远是 0。
 *
 * 所有来自接口的文字（搜索词、报告内容）都用 textContent 放进去：
 * 搜索词是陌生人打的字，不能当 HTML。
 */

const API = "/app/report/api";
const $ = (id) => document.getElementById(id);

// ── 小工具 ───────────────────────────────────────────────────────────

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const short = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const span = (from, to) => (from === to ? short(from) : `${short(from)}–${short(to)}`);
const fmt = (n) => (n == null || Number.isNaN(n) ? "—" : Math.round(n).toLocaleString("en-US"));
const fmtPos = (n) => (n == null || Number.isNaN(n) ? "—" : n.toFixed(1));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

/** node.append(null) 会印出 "null"，没有内容的那格要先滤掉 */
const appendAll = (node, ...children) => node.append(...children.filter((c) => c != null));

async function api(path, init) {
  const res = await fetch(`${API}${path}`, { credentials: "same-origin", ...init });
  if (res.status === 403) throw new Error("登录过期了，重新整理页面再登录一次。");
  if (!res.ok) throw new Error(`${path} 出错（${res.status}）`);
  return res.json();
}

function showAlert(msg) {
  const box = $("alert");
  box.hidden = false;
  box.append(el("p", {}, msg));
}

// ── 数字 ─────────────────────────────────────────────────────────────

const state = { status: null, gaEnd: null, gscEnd: null, speedEnd: null, ga: new Map(), gsc: new Map(), days: 7, lists: new Map() };

function sumGa(from, to) {
  const t = { users: 0, sessions: 0, wa_clicks: 0, organic_sessions: 0, days: 0 };
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = state.ga.get(d);
    if (!r) continue;
    t.days++;
    for (const k of ["users", "sessions", "wa_clicks", "organic_sessions"]) t[k] += r[k];
  }
  return t;
}

function sumGsc(from, to) {
  const t = { clicks: 0, impressions: 0, weighted: 0, days: 0 };
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = state.gsc.get(d);
    if (!r) continue;
    t.days++;
    t.clicks += r.clicks;
    t.impressions += r.impressions;
    t.weighted += r.position * r.impressions;
  }
  // 平均排名按曝光加权，跟 Worker 算法一致
  t.position = t.impressions ? t.weighted / t.impressions : null;
  return t;
}

const windows = (end, n) => ({ cur: [addDays(end, -(n - 1)), end], prev: [addDays(end, -(2 * n - 1)), addDays(end, -n)] });

/** 变化：▲/▼ + 百分比 + 文字，不单靠颜色。lowerIsBetter 给排名用：数字越小越好，看的是名次差不是百分比 */
function delta(cur, prev, { lowerIsBetter = false } = {}) {
  if (cur == null || prev == null) return el("span", { class: "delta" }, "没有可比的数据");
  if (!lowerIsBetter && prev === 0) return el("span", { class: "delta" }, cur === 0 ? "持平" : "之前是 0");
  const diff = cur - prev;
  if (Math.abs(diff) < (lowerIsBetter ? 0.05 : 1e-9)) return el("span", { class: "delta" }, "持平");
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  // 排名：箭头跟着「好坏」走，不跟数字走。排名 17 → 16.6 是往前，要显示 ▲
  const text = lowerIsBetter
    ? `${better ? "▲ 前进" : "▼ 后退"} ${Math.abs(diff).toFixed(1)} 名`
    : `${diff > 0 ? "▲ +" : "▼ "}${Math.round((diff / prev) * 100)}% ${better ? "变好" : "变差"}`;
  return el("span", { class: `delta ${better ? "up" : "down"}` }, text);
}

function kpi(label, value, deltaNode, hero = false) {
  return el("div", { class: `kpi${hero ? " hero" : ""}` }, el("div", { class: "label" }, label), el("div", { class: "value" }, value), deltaNode);
}

function renderKpis() {
  const n = state.days;
  const ga = windows(state.gaEnd, n);
  const g = state.gscEnd ? windows(state.gscEnd, n) : null;
  const [a, b] = [sumGa(...ga.cur), sumGa(...ga.prev)];
  const [c, d] = g ? [sumGsc(...g.cur), sumGsc(...g.prev)] : [null, null];
  const prevOk = (t) => (t && t.days ? t : null);

  $("range").textContent =
    `GA：${span(...ga.cur)}，比 ${span(...ga.prev)}` +
    (g ? `　·　Google 搜索：${span(...g.cur)}，比 ${span(...g.prev)}（Google 的数据晚 2～3 天）` : "");

  $("kpis").replaceChildren(
    kpi("WhatsApp 点击", fmt(a.wa_clicks), delta(a.wa_clicks, prevOk(b)?.wa_clicks), true),
    kpi("访客", fmt(a.users), delta(a.users, prevOk(b)?.users)),
    kpi("从 Google 搜索来的访问", fmt(a.organic_sessions), delta(a.organic_sessions, prevOk(b)?.organic_sessions)),
    kpi("Google 搜索点击", fmt(c?.clicks), delta(c?.clicks, prevOk(d)?.clicks)),
    kpi("Google 搜索曝光", fmt(c?.impressions), delta(c?.impressions, prevOk(d)?.impressions)),
    kpi("平均排名", fmtPos(c?.position), delta(c?.position, prevOk(d)?.position, { lowerIsBetter: true })),
  );
}

// ── 图 ───────────────────────────────────────────────────────────────

const SVG = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** 把结束日往回切成 count 段，每段 size 天。回传由旧到新 */
function buckets(end, size, count, sum, pick) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const to = addDays(end, -i * size);
    const from = addDays(to, -(size - 1));
    const t = sum(from, to);
    out.push({ from, to, value: t.days ? pick(t) : null });
  }
  return out;
}

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
}

const tip = $("tip");
function showTip(evt, label, value) {
  tip.replaceChildren(el("span", {}, `${label}　`), el("b", {}, value));
  tip.hidden = false;
  const x = Math.min(evt.clientX + 12, window.innerWidth - tip.offsetWidth - 8);
  tip.style.left = `${x}px`;
  tip.style.top = `${evt.clientY - tip.offsetHeight - 12}px`;
}
const hideTip = () => (tip.hidden = true);

/**
 * 单一序列的图：柱状（次数少的，例如 WhatsApp）或折线（访客、曝光）。
 * 一张图一个量，不做双轴。只标最新一格的值，其余靠 hover 与 y 轴刻度。
 */
function chart(fig, title, data, { kind, unit }) {
  const W = 480, H = 200, L = 36, R = 8, T = 16, B = 24;
  const iw = W - L - R, ih = H - T - B;
  const vals = data.map((d) => d.value).filter((v) => v != null);
  const max = niceMax(Math.max(0, ...vals));
  const y = (v) => T + ih - (v / max) * ih;
  const step = iw / data.length;
  const cx = (i) => L + step * i + step / 2;

  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": title });
  for (const t of [0, max / 2, max]) {
    root.append(svg("line", { class: t ? "grid" : "base", x1: L, x2: W - R, y1: y(t), y2: y(t) }));
    const lab = svg("text", { class: "tick", x: L - 6, y: y(t) + 4, "text-anchor": "end" });
    lab.textContent = fmt(t);
    root.append(lab);
  }
  for (const [i, anchor] of [[0, "start"], [data.length - 1, "end"]]) {
    const lab = svg("text", { class: "tick", x: anchor === "start" ? L : W - R, y: H - 6, "text-anchor": anchor });
    lab.textContent = span(data[i].from, data[i].to);
    root.append(lab);
  }

  if (!vals.length) {
    const t = svg("text", { class: "empty", x: L + iw / 2, y: T + ih / 2, "text-anchor": "middle" });
    t.textContent = "还没有数据";
    root.append(t);
  } else if (kind === "bar") {
    const bw = Math.min(24, Math.max(2, step - 2)); // 细柱，最多 24px，柱间留 2px 空隙
    data.forEach((d, i) => {
      if (!d.value) return;
      const h = ih - (y(d.value) - T);
      const r = Math.min(4, bw / 2, h);
      const x = cx(i) - bw / 2, top = y(d.value), base = T + ih;
      // 顶端 4px 圆角，底部直角贴着基线
      root.append(svg("path", {
        class: "bar",
        d: `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${base}Z`,
      }));
    });
  } else {
    const pts = data.map((d, i) => (d.value == null ? null : [cx(i), y(d.value)]));
    const runs = [];
    let run = [];
    for (const p of pts) {
      if (p) run.push(p);
      else if (run.length) (runs.push(run), (run = []));
    }
    if (run.length) runs.push(run);
    for (const r of runs) {
      const line = r.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("");
      root.append(svg("path", { class: "area", d: `${line}L${r.at(-1)[0]},${T + ih}L${r[0][0]},${T + ih}Z` }));
      root.append(svg("path", { class: "line", d: line }));
    }
    const last = pts.findLast((p) => p);
    if (last) root.append(svg("circle", { class: "dot", cx: last[0], cy: last[1], r: 4 }));
  }

  // 最新一格的值直接标出来（只标这一个）
  const lastIdx = data.findLastIndex((d) => d.value != null);
  if (lastIdx >= 0) {
    const lab = svg("text", { class: "tick", x: cx(lastIdx), y: y(data[lastIdx].value) - 8, "text-anchor": "middle" });
    lab.textContent = fmt(data[lastIdx].value);
    root.append(lab);
  }

  // hover：整格都是感应区，比柱子或点大得多
  const cross = svg("line", { class: "cross", y1: T, y2: T + ih, visibility: "hidden" });
  root.append(cross);
  data.forEach((d, i) => {
    const hit = svg("rect", { class: "hit", x: L + step * i, y: T, width: step, height: ih });
    hit.addEventListener("pointermove", (e) => {
      cross.setAttribute("x1", cx(i));
      cross.setAttribute("x2", cx(i));
      cross.setAttribute("visibility", "visible");
      showTip(e, span(d.from, d.to), d.value == null ? "没有数据" : `${fmt(d.value)} ${unit}`);
    });
    hit.addEventListener("pointerleave", () => {
      cross.setAttribute("visibility", "hidden");
      hideTip();
    });
    root.append(hit);
  });

  fig.replaceChildren(el("figcaption", {}, title), root);
}

function renderCharts() {
  const n = state.days;
  const count = n === 1 ? 30 : 12;
  const every = n === 1 ? "每天" : n === 7 ? "每 7 天" : "每 30 天";
  chart($("chart-wa"), `WhatsApp 点击（${every}）`, buckets(state.gaEnd, n, count, sumGa, (t) => t.wa_clicks), { kind: "bar", unit: "次" });
  chart($("chart-users"), `访客（${every}）`, buckets(state.gaEnd, n, count, sumGa, (t) => t.users), { kind: "line", unit: "人" });
  if (state.gscEnd) {
    chart($("chart-impr"), `Google 搜索曝光（${every}）`, buckets(state.gscEnd, n, count, sumGsc, (t) => t.impressions), { kind: "line", unit: "次" });
  }
}

// ── 表 ───────────────────────────────────────────────────────────────

function table(node, head, rows) {
  const tr = (cells, tag) =>
    el("tr", {}, cells.map(([v, cls]) => el(tag, cls ? { class: cls } : {}, v)));
  node.replaceChildren(
    el("thead", {}, tr(head, "th")),
    el("tbody", {}, rows.length ? rows.map((r) => tr(r, "td")) : tr([["还没有数据", "text"]], "td")),
  );
}

async function listsFor(from, to) {
  const key = `${from}|${to}`;
  if (!state.lists.has(key)) state.lists.set(key, api(`/data?from=${from}&to=${to}`));
  return state.lists.get(key);
}

async function renderTables() {
  const n = state.days;
  const ga = windows(state.gaEnd, n);
  const g = state.gscEnd ? windows(state.gscEnd, n) : null;
  const [gaCur, gscCur, gscPrev] = await Promise.all([
    listsFor(...ga.cur),
    g ? listsFor(...g.cur) : null,
    g ? listsFor(...g.prev) : null,
  ]);
  if (n !== state.days) return; // 等资料的时候又换了分页

  const before = new Map((gscPrev?.queries ?? []).map((q) => [q.query, q.position]));
  $("q-note").textContent = g ? `${span(...g.cur)}，按曝光排序。排名变化是跟 ${span(...g.prev)} 比，数字越小越前面。` : "";
  table(
    $("t-queries"),
    [["搜索词"], ["曝光", "num"], ["点击", "num"], ["排名", "num"], ["变化", "num"]],
    (gscCur?.queries ?? []).map((q) => {
      const old = before.get(q.query);
      const change = old == null ? "新出现" : Math.abs(old - q.position) < 0.05 ? "持平" : `${old > q.position ? "▲" : "▼"} ${Math.abs(old - q.position).toFixed(1)}`;
      return [[q.query, "text"], [fmt(q.impressions), "num"], [fmt(q.clicks), "num"], [fmtPos(q.position), "num"], [change, "num"]];
    }),
  );
  table(
    $("t-pages"),
    [["页面"], ["浏览", "num"], ["WhatsApp", "num"]],
    gaCur.pages.map((p) => [[p.path, "text"], [fmt(p.views), "num"], [fmt(p.wa_clicks), "num"]]),
  );
  table(
    $("t-channels"),
    [["来源"], ["访问", "num"]],
    gaCur.channels.map((c) => [[c.channel, "text"], [fmt(c.sessions), "num"]]),
  );
}

// ── 打开速度 ─────────────────────────────────────────────────────────

/**
 * Cloudflare Web Analytics 量的真实访客。三个数字都是 Google 的 Core Web Vitals：
 * 「快」「慢」的线 Google 定、Cloudflare 算好。75% 的访客算快，Google 就算这项合格。
 */
const VITALS = [
  { key: "lcp", label: "主画面出现（LCP）", value: (v) => `约 ${(v / 1000).toFixed(1)} 秒`, rule: "2.5 秒内算快" },
  { key: "inp", label: "按了有反应（INP）", value: (v) => `约 ${fmt(v)} 毫秒`, rule: "0.2 秒内算快" },
  { key: "cls", label: "画面不乱跳（CLS）", value: (v) => `约 ${v.toFixed(2)}`, rule: "0.1 以下算快" },
];
const DEVICE = { mobile: "手机", desktop: "电脑", tablet: "平板" };
const FEW = 20; // 少于这么多次，比例跳来跳去，不要太当真

const share = (r, m) => (r?.[`${m}_n`] ? r[`${m}_good`] / r[`${m}_n`] : null);

/** 合格 / 要改善 / 慢：跟 Google 一样看 75% 那个访客落在哪一段。颜色之外都带符号与文字 */
function grade(r, m) {
  const n = r[`${m}_n`];
  if (!n) return el("span", { class: "grade" }, "还没量到");
  const good = r[`${m}_good`] / n;
  const notPoor = (n - r[`${m}_poor`]) / n;
  const [cls, word] = good >= 0.75 ? ["good", "✓ 合格"] : notPoor >= 0.75 ? ["", "△ 要改善"] : ["poor", "✕ 慢"];
  return el("span", { class: `grade ${cls}` }, `${word} · ${Math.round(good * 100)}% 算快（${fmt(n)} 次${n < FEW ? "，次数少" : ""}）`);
}

/** 快的比例变了几个百分点。▲/▼ + 文字 */
function shareDelta(cur, prev) {
  if (cur == null || prev == null) return el("span", { class: "delta" }, "没有可比的数据");
  const diff = Math.round((cur - prev) * 100);
  if (!diff) return el("span", { class: "delta" }, "快的比例持平");
  return el("span", { class: `delta ${diff > 0 ? "up" : "down"}` }, `${diff > 0 ? "▲ +" : "▼ "}${diff} 个百分点 ${diff > 0 ? "变好" : "变差"}`);
}

async function renderSpeed() {
  if (!state.speedEnd) {
    $("s-note").textContent = "还没有数据。Worker 要先设好 CF_API_TOKEN（见 workers/ga-report/README.md）。";
    return;
  }
  const n = state.days;
  const w = windows(state.speedEnd, n);
  const [cur, prev] = await Promise.all([listsFor(...w.cur), listsFor(...w.prev)]);
  if (n !== state.days) return;

  $("s-note").textContent =
    `${span(...w.cur)}，比 ${span(...w.prev)}。秒数是「75% 的访客在这之内」，Google 用这个判快慢。Cloudflare 有抽样，次数是估的。`;
  const before = new Map(prev.speed.map((r) => [r.device, r]));
  const devices = Object.keys(DEVICE).filter((d) => cur.speed.some((r) => r.device === d));
  $("speed").replaceChildren(
    ...(devices.length
      ? devices.map((d) => {
          const r = cur.speed.find((x) => x.device === d);
          return el(
            "div",
            { class: "speed-device" },
            el("h3", {}, `${DEVICE[d]} · ${fmt(r.visits)} 次访问`),
            el(
              "div",
              { class: "kpis" },
              VITALS.map((v) =>
                kpi(
                  `${v.label}　${v.rule}`,
                  r[`${v.key}_p75`] == null ? "—" : v.value(r[`${v.key}_p75`]),
                  el("div", {}, grade(r, v.key), shareDelta(share(r, v.key), share(before.get(d), v.key))),
                ),
              ),
            ),
          );
        })
      : [el("p", { class: "muted" }, "这段期间没有量到。")]),
  );

  table(
    $("t-speed"),
    [["页面"], ["次数", "num"], ["主画面出现", "num"], ["算快", "num"], ["慢", "num"]],
    cur.speed_pages
      .filter((p) => p.lcp_n)
      .map((p) => [
        [p.path, "text"],
        [fmt(p.lcp_n), "num"],
        [p.lcp_p75 == null ? "—" : `${(p.lcp_p75 / 1000).toFixed(1)} 秒`, "num"],
        [`${Math.round(share(p, "lcp") * 100)}%`, "num"],
        [fmt(p.lcp_poor), "num"],
      ]),
  );
}

// ── 收录 ─────────────────────────────────────────────────────────────

function renderIndex() {
  const { index } = state.status;
  const box = $("index");
  if (!index.total) return box.replaceChildren(el("p", { class: "muted" }, "还没查过。"));
  const lines = [
    el("p", {}, `已查 ${index.checked} / ${index.total} 条 sitemap 地址，其中 ${index.indexed} 条已被 Google 收录。每天轮查一小批。`),
  ];
  if (index.not_indexed.length) {
    lines.push(
      el("div", { class: "table-wrap" }, (() => {
        const t = el("table");
        table(t, [["没被收录的地址"], ["Google 怎么说"]], index.not_indexed.map((r) => [[r.url.replace(/^https:\/\/www\.h2o-dreamer-studio\.com/, "") || "/", "text"], [r.coverage ?? "查询失败", "text"]]));
        return t;
      })()),
    );
  }
  box.replaceChildren(...lines);
}

// ── 报告与建议 ───────────────────────────────────────────────────────

/** 报告内容只认三种格式：## 小标题、- 列表、空行分段。其余一律当纯文字 */
function reportBody(text) {
  const out = el("div", { class: "report-body" });
  let list = null;
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) {
      if (!list) out.append((list = el("ul")));
      list.append(el("li", {}, line.slice(2)));
      continue;
    }
    list = null;
    if (!line.trim()) continue;
    out.append(line.startsWith("## ") ? el("h4", {}, line.slice(3)) : el("p", {}, line));
  }
  return out;
}

const STATUS_TEXT = { done: "✓ 做了", skipped: "✕ 不做", open: "" };

/** 实验的四样：猜想、看哪个数字、做之前、几周后检查。旧建议没有，就不显示 */
function experimentMeta(s) {
  if (!s.hypothesis) return null;
  return el(
    "div",
    { class: "exp" },
    el("p", {}, `猜想：${s.hypothesis}`),
    el("p", {}, `看：${s.metric} · 做之前：${s.baseline} · 做了 ${s.check_weeks} 周后检查`),
  );
}

const ownerTag = (s) => (s.source === "owner" ? el("span", { class: "tag" }, "你自己做的") : null);
// 同一期重交时新版没再提这条：记录照留，标出来让人知道
const retiredTag = (s) => (s.retired_at ? el("span", { class: "tag" }, "重交后没再提") : null);

function suggestion(s) {
  const li = el("li", { "data-status": s.status });
  const badge = el("span", { class: "badge" }, STATUS_TEXT[s.status]);
  const set = (status) => async (e) => {
    const buttons = li.querySelectorAll("button");
    buttons.forEach((b) => (b.disabled = true));
    try {
      await api(`/suggestions/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      s.status = status;
      li.replaceWith(suggestion(s));
      loadExperiments(); // 按了「做了」就开始计时，实验记录要跟着变
    } catch (err) {
      showAlert(err.message);
      buttons.forEach((b) => (b.disabled = false));
    }
  };
  const actions =
    s.status === "open"
      ? [el("button", { onclick: set("done") }, "做了"), el("button", { onclick: set("skipped") }, "不做")]
      : [badge, el("button", { onclick: set("open") }, "撤销")];
  appendAll(
    li,
    el("div", { class: "title" }, s.title, ownerTag(s), retiredTag(s)),
    s.detail ? el("div", { class: "detail" }, s.detail) : null,
    experimentMeta(s),
    el("div", { class: "actions" }, actions),
  );
  return li;
}

// ── 实验记录 ─────────────────────────────────────────────────────────

const RESULT_TEXT = {
  effective: "▲ 有效",
  ineffective: "▼ 无效",
  unclear: "— 看不出",
  due: "到期了，等 Claude 下次报告判",
  running: "进行中",
};

function experimentItem(e) {
  const state = e.result ?? (e.due ? "due" : "running");
  const li = el("li");
  // Claude 判的，阿爽不同意可以改判
  const judge = (result) => async () => {
    li.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      await api(`/suggestions/${e.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, note: e.result_note ?? undefined }),
      });
      loadExperiments();
    } catch (err) {
      showAlert(err.message);
      li.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  };
  appendAll(
    li,
    el("div", { class: "title" }, e.title, ownerTag(e)),
    el("div", { class: "exp" }, el("p", {}, `开始 ${e.started_on} · 检查 ${e.check_on}`)),
    experimentMeta(e),
    el("div", { class: "actions" }, el("span", { class: "result", "data-result": state }, RESULT_TEXT[state])),
    e.result_note ? el("div", { class: "detail" }, e.result_note) : null,
    e.result
      ? el(
          "div",
          { class: "actions" },
          el("span", { class: "badge" }, "改判："),
          ["effective", "ineffective", "unclear"].map((r) =>
            el("button", { "aria-pressed": String(r === e.result), onclick: judge(r) }, RESULT_TEXT[r]),
          ),
        )
      : null,
  );
  return li;
}

function renderExperiments({ summary, items }) {
  const judged = summary.effective + summary.ineffective + summary.unclear;
  $("exp-summary").textContent = items.length
    ? `有效 ${summary.effective} · 无效 ${summary.ineffective} · 看不出 ${summary.unclear} · 进行中 ${summary.running}` +
      (judged ? ` · 有效率 ${Math.round((summary.effective / judged) * 100)}%（${judged} 个里）` : "")
    : "还没有实验。在上面的建议按「做了」，就开始计时。";
  $("exp-list").replaceChildren(...items.map(experimentItem));
}

function loadExperiments() {
  api("/experiments").then(renderExperiments).catch((err) => showAlert(err.message));
}

const KIND = { weekly: "周报", monthly: "月报" };

function reportCard(r) {
  return [
    el(
      "p",
      { class: "report-meta" },
      `${KIND[r.kind]} · ${r.period_start} 至 ${r.period_end} · 写于 ${r.created_at.slice(0, 10)}` +
        (r.updated_at ? ` · 重交于 ${r.updated_at.slice(0, 10)}` : ""),
    ),
    reportBody(r.body),
    r.suggestions.length ? el("ul", { class: "sugg" }, r.suggestions.map(suggestion)) : null,
  ];
}

function renderReports(reports) {
  if (!reports.length) {
    $("latest-body").replaceChildren(el("p", { class: "muted" }, "还没有报告。Claude 的云端任务每周一早上写周报、每月 1 号写月报。"));
    $("history").replaceChildren(el("p", { class: "muted" }, "还没有。"));
    return;
  }
  const [latest, ...older] = reports;
  $("latest-body").replaceChildren(...reportCard(latest));
  $("history").replaceChildren(
    ...(older.length
      ? older.map((r) => el("details", {}, el("summary", {}, `${KIND[r.kind]} · ${r.period_start} 至 ${r.period_end}`), ...reportCard(r)))
      : [el("p", { class: "muted" }, "还没有。")]),
  );
}

// ── 顶部状态 ─────────────────────────────────────────────────────────

const SOURCE = { ga: "GA", gsc: "Search Console", index: "收录检查", speed: "打开速度（Cloudflare）" };

/** D1 的 datetime('now') 是 UTC（"2026-09-29 22:32:10"），换成马来西亚时间 "9/30 06:32" */
const toMyt = (utc) => {
  const d = new Date(Date.parse(`${utc.replace(" ", "T")}Z`) + 8 * 3600000).toISOString();
  return `${short(d.slice(0, 10))} ${d.slice(11, 16)}`;
};

// cron 每天 06:30 跑一次，多给 2 小时余裕。超过就是 Worker 整个没跑，不会有错误可记
const STALE_MS = 26 * 3600000;

function renderStatus() {
  const { sync, ga_latest, gsc_latest, speed_latest } = state.status;
  const lastRun = sync.map((s) => s.last_run).filter(Boolean).sort().at(-1);
  $("sync").textContent = lastRun
    ? `上次更新 ${toMyt(lastRun)}（马来西亚时间）· GA 到 ${ga_latest ?? "—"} · Google 搜索到 ${gsc_latest ?? "—"} · 速度到 ${speed_latest ?? "—"}`
    : "还没同步过数据。";

  // 每个来源各看各的：Worker 跑到一半被停掉，后面的来源就不会更新
  const stale = sync.filter((s) => !s.last_run || Date.now() - Date.parse(`${s.last_run.replace(" ", "T")}Z`) > STALE_MS);
  if (stale.length) {
    showAlert(
      `${stale.map((s) => SOURCE[s.source] ?? s.source).join("、")} 超过一天没同步了` +
        `（上次 ${stale.map((s) => (s.last_run ? toMyt(s.last_run) : "从没跑过")).join("、")}）。` +
        "去 Cloudflare 后台 Workers → ga-report → Settings → Triggers 看每天 06:30 有没有跑。",
    );
  }
  // 同一个原因（例如 Google 钥匙没设）三个来源都会挂，合成一条
  const byError = new Map();
  for (const s of sync.filter((s) => s.last_error)) {
    byError.set(s.last_error, [...(byError.get(s.last_error) ?? []), SOURCE[s.source] ?? s.source]);
  }
  for (const [error, names] of byError) showAlert(`${names.join("、")} 上次同步失败：${error}`);
}

// ── 启动 ─────────────────────────────────────────────────────────────

function renderPeriod() {
  if (!state.gaEnd) return;
  renderKpis();
  renderCharts();
  renderTables().catch((err) => showAlert(err.message));
  renderSpeed().catch((err) => showAlert(err.message));
}

function selectTab(days) {
  state.days = days;
  for (const b of document.querySelectorAll(".tabs button")) {
    b.setAttribute("aria-selected", String(Number(b.dataset.days) === days));
  }
  renderPeriod();
}

async function main() {
  for (const b of document.querySelectorAll(".tabs button")) {
    b.addEventListener("click", () => selectTab(Number(b.dataset.days)));
  }

  api("/reports").then(renderReports).catch((err) => showAlert(err.message));
  loadExperiments();

  state.status = await api("/status");
  renderStatus();
  renderIndex();
  state.gaEnd = state.status.ga_latest;
  state.gscEnd = state.status.gsc_latest;
  state.speedEnd = state.status.speed_latest;
  if (!state.gaEnd) return renderSpeed().catch((err) => showAlert(err.message));

  // 图最长要 12 段 × 30 天，一次拿齐。只要逐日数字，不要排行（排行要扫一整年的搜索词）
  const ends = [state.gaEnd, state.gscEnd].filter(Boolean).sort();
  const data = await api(`/data?from=${addDays(ends[0], -359)}&to=${ends.at(-1)}&daily=only`);
  for (const r of data.ga_daily) state.ga.set(r.date, r);
  for (const r of data.gsc_daily) state.gsc.set(r.date, r);
  renderPeriod();
}

main().catch((err) => showAlert(err.message));
