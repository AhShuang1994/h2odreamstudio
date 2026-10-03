/* JB 外联台
 *
 * 仓库是公开的，所以名单（店名、电话）**永远不以明文进 git**：它加密存在
 * leads.enc.json，由 scripts/outreach-encrypt.mjs 产生，这里用密码在浏览器里解开。
 * 演算法：PBKDF2-SHA256 → AES-256-GCM，两边都是 Web Crypto，Node 与浏览器同一套。
 *
 * 进度（发了谁、用哪个版本、有没有回覆）只存这台装置的 localStorage。
 */
(function () {
  "use strict";

  var LS_KEY = "jb-outreach-v1";
  var KEY_SLOT = LS_KEY + ":key";       // 「记住这台装置」时存的 AES 金钥（不是密码）
  var VARIANTS = ["A", "B", "C"];
  var DAILY = 3;
  var LEADS = [];

  // ------------------------------------------------------------------ i18n
  var T = {
    zh: {
      lockSub: "客户名单已加密，输入密码解锁。", pw: "密码", remember: "记住这台装置",
      unlock: "解锁", unlocking: "解锁中…", wrong: "密码不对，再试一次。",
      loadFail: "名单载入失败，检查网络后重新整理。", lock: "锁上",
      mask: "打码", maskOn: "打码已开：店名和电话都遮住了", maskOff: "打码已关",
      sub: function (n) { return "医疗 · 美容 · " + n + " 家没网站"; },
      of: function (n) { return "/ " + n + " 已发出"; },
      kRep: "有回覆", kRate: "回覆率", kDay: "天",
      todayH: "今天要发的", statsH: "哪个版本有效", logH: "已发出的", allH: "全部名单",
      copy: "复制", copied: "已复制", openWa: "开 WhatsApp",
      openDm: "开 FB / IG 主页", map: "地图", tick: "标记已发",
      untick: "取消", noPhone: "这家 Google 上没留电话 —— 复制讯息，上门或翻他们的社群",
      doneTitle: "今天做完了 🎉", doneBody: "明天再来 3 家。想现在多发也可以，但别超过 6 家。",
      more: "再拉 3 家",
      allDone: function (n) { return n + " 家全部发完了 🎉"; },
      allDoneBody: "接下来就是等回覆，然后追第二条讯息。",
      sent: "已发", replied: "有回覆", replyQ: "有回覆？", yes: "有", no: "—",
      variant: "版本", statSent: "已发", statRep: "回覆", best: "目前最好",
      thDate: "日期", thShop: "店家", thVar: "版本", thRev: "评论", thReply: "有回覆",
      thPri: "优先", thCat: "业务", thScore: "评分", thArea: "地区", thStatus: "状态", thMap: "地图",
      thPhone: "电话", thKind: "号码类型",
      pending: "未发", noneYet: "还没有纪录",
      pkM: "手机", pkL: "固话", pkN: "没留电话", pkX: "外国号码",
      whyL: "07 开头是市话，WhatsApp 多半不通 —— 建议直接打，下面的字当讲稿念。",
      whyX: "不是马来西亚号码，八成是 Google 抓错了，跳过。",
      whyN: "Google 上没留电话。只能上门，或翻他们的社群。",
      call: "打电话", tryWa: "试 WhatsApp",
      vAuto: "版本",
      fAll: "全部", fM: "手机", fL: "固话",
      fNote: function (n, l) { return "还有 " + n + " 家是固话，切到「" + l + "」用打的。"; },
      reviews: "条评论",
      hookBig: function (r, s) { return r + " 条评论、" + s + "★，但 Google 上点不到网站"; },
      hookSmall: function (r, s) { return r + " 条评论 " + s + "★，口碑已经有了，缺一个能收客的页面"; },
      note: "<b>一天最多 3 家。</b> WhatsApp 会因为「陌生号码短时间大量发相同内容」封号 —— 这个页面每天只放 3 家就是为了挡住这件事。想多发也请先把对方存进通讯录，并且改几个字。",
      device: "进度只存在这台装置。换手机的话，标记要重新按一次。"
    },
    en: {
      lockSub: "The lead list is encrypted. Enter the password to unlock.", pw: "Password",
      remember: "Remember this device", unlock: "Unlock", unlocking: "Unlocking…",
      wrong: "Wrong password. Try again.", loadFail: "Couldn't load the list. Check your connection and reload.",
      lock: "Lock", mask: "Blur", maskOn: "Blur on: names and numbers hidden", maskOff: "Blur off",
      sub: function (n) { return "Clinics · Salons · " + n + " with no website"; },
      of: function (n) { return "/ " + n + " sent"; },
      kRep: "Replied", kRate: "Reply rate", kDay: "Days",
      todayH: "Today's three", statsH: "Which version works", logH: "Sent", allH: "Full list",
      copy: "Copy", copied: "Copied", openWa: "Open WhatsApp",
      openDm: "Open FB / IG page", map: "Map", tick: "Mark sent",
      untick: "Undo", noPhone: "No phone on their listing — copy the text and walk in, or find them on social",
      doneTitle: "Done for today 🎉", doneBody: "Three more tomorrow. You can pull more now, but don't go past six.",
      more: "Pull 3 more",
      allDone: function (n) { return "All " + n + " sent 🎉"; },
      allDoneBody: "Now wait for replies, then send follow-up one.",
      sent: "Sent", replied: "Replied", replyQ: "Replied?", yes: "Yes", no: "—",
      variant: "Version", statSent: "sent", statRep: "replied", best: "Best so far",
      thDate: "Date", thShop: "Shop", thVar: "Ver", thRev: "Reviews", thReply: "Replied",
      thPri: "Pri", thCat: "Category", thScore: "Score", thArea: "Area", thStatus: "Status", thMap: "Map",
      thPhone: "Phone", thKind: "Number type",
      pending: "Pending", noneYet: "Nothing yet",
      pkM: "Mobile", pkL: "Landline", pkN: "No phone", pkX: "Foreign",
      whyL: "07 numbers are landlines — WhatsApp usually won't reach them. Call instead and use the text below as your script.",
      whyX: "Not a Malaysian number — Google almost certainly got this wrong. Skip it.",
      whyN: "No phone on their Google listing. Walk in, or find them on social.",
      call: "Call", tryWa: "Try WhatsApp",
      vAuto: "Version",
      fAll: "All", fM: "Mobile", fL: "Landline",
      fNote: function (n, l) { return n + " more are landlines — switch to " + l + " and call those."; },
      reviews: "reviews",
      hookBig: function (r, s) { return r + " reviews at " + s + "★ — and no website to click through to"; },
      hookSmall: function (r, s) { return r + " reviews at " + s + "★. Reputation is there; the page to catch it isn't"; },
      note: "<b>Three a day, max.</b> WhatsApp bans numbers that blast identical text at unsaved contacts. This page hands you three a day on purpose. If you push further, save the contact first and change a few words.",
      device: "Progress lives on this device only. On a new phone you'd re-mark what you sent."
    }
  };

  // ------------------------------------------------------- message templates
  function stars(l) { return l.s == null ? "" : String(l.s); }

  var MSG = {
    A: {
      wa: {
        zh: function (l) {
          return "Hi，请问是 " + l.n + " 的老板吗？\n\n我是 Hui Huang，做网站设计的，在 JB。\n\n刚在 Google Maps 看到你们 " + l.r + " 条评论、" + stars(l) + "★ —— 这个口碑在 JB 很难得。\n\n但我点进去想看服务和价钱，发现没有网站可以点。\n\n想问一句：你们员工每天在 WhatsApp 上，是不是很多时间花在回「多少钱」「有没有做 XX」「几点开」这些同样的问题？\n\n如果是，一个页面就能挡掉大部分。\n\nhttps://www.h2o-dreamer-studio.com/";
        },
        en: function (l) {
          return "Hi, is this the owner of " + l.n + "?\n\nI'm Hui Huang, I do web design here in JB.\n\nJust saw your Google listing — " + l.r + " reviews at " + stars(l) + "★. That's solid.\n\nBut I clicked around and there's no website to check your services or pricing.\n\nQuick question: do your staff spend a lot of time on WhatsApp answering the same things over and over — \"how much?\", \"do you do XX?\", \"what time you open?\"\n\nBecause one simple page handles most of that.\n\nhttps://www.h2o-dreamer-studio.com/";
        }
      },
      dm: {
        zh: function (l) {
          return "Hi " + l.n + " 👋\n\n" + l.r + " 条评论 " + stars(l) + "★，但 Google 上点不到网站，\n是不是很多客人 DM 进来就问「多少钱」？\n\n我做网站的，JB 本地。\n一页式的，7 天做好，RM 590 起。\n\n我看过你们的页面，可以给你看看我会怎么做 ——\n要不要我先做个免费的构思给你看？不收钱也不烦你。\n\n作品在这 👇\nhttps://www.h2o-dreamer-studio.com/";
        },
        en: function (l) {
          return "Hi " + l.n + " 👋\n\n" + l.r + " reviews at " + stars(l) + "★, but there's no website on your Google listing.\nDo a lot of people DM you just to ask \"how much?\"\n\nI do web design, based in JB.\nOne-page site, ready in 7 days, from RM 590.\n\nI've looked at your page and can show you how I'd do it ——\nwant a free concept first? No charge, no chasing.\n\nWork here 👇\nhttps://www.h2o-dreamer-studio.com/";
        }
      }
    },
    B: {
      wa: {
        zh: function (l) {
          return "Hi，请问是 " + l.n + " 的负责人吗？\n\n我是 Hui Huang，JB 做网站设计的。\n\n我在看 JB 这一区的 " + l.c + "，你们的评论数排在很前面 ——\n" + l.r + " 条，" + stars(l) + "★。\n\n但我看到一个有点可惜的地方，跟你们的 Google 页面有关。\n\n不是坏事，也不用花钱修。\n方便的话我讲给你听，两句话就说完，你要不要听？\n\nhttps://www.h2o-dreamer-studio.com/";
        },
        en: function (l) {
          return "Hi, is this the person in charge at " + l.n + "?\n\nI'm Hui Huang, web designer based in JB.\n\nI was going through " + l.c + " listings in this area — you're near the top on reviews.\n" + l.r + " reviews, " + stars(l) + "★.\n\nBut I noticed something on your Google listing that's a bit of a waste.\n\nNothing bad, and it doesn't cost anything to fix.\nCan I tell you? It's two sentences.\n\nhttps://www.h2o-dreamer-studio.com/";
        }
      },
      dm: {
        zh: function (l) {
          return "Hi " + l.n + " 👋\n\n" + l.r + " 条评论、" + stars(l) + "★ —— 你们在 JB 这行算很前面了。\n\n但我看你们的 Google 页面时，发现一个满可惜的空缺。\n两句话就能讲完，我可以说吗？\n\n（我是做网站的，Hui Huang，JB 本地 ——\n 不过这件事跟卖你东西没关系，讲完你不理我也 ok）\n\nhttps://www.h2o-dreamer-studio.com/";
        },
        en: function (l) {
          return "Hi " + l.n + " 👋\n\n" + l.r + " reviews, " + stars(l) + "★ — you're near the top in JB for this.\n\nBut looking at your Google listing, I spotted a gap that's a real waste.\nTwo sentences. Can I tell you?\n\n(I'm Hui Huang, web designer, local to JB ——\n but this isn't a sales pitch. Ignore me after and that's fine.)\n\nhttps://www.h2o-dreamer-studio.com/";
        }
      }
    },
    C: {
      wa: {
        zh: function (l) {
          return "Hi，请问是 " + l.n + " 的负责人吗？\n\n我是 Hui Huang，JB 做网站设计的。\n\n刚才我在 Google 搜「" + l.c + " Johor Bahru」，看了前面十几家。\n\n你们的评论数和评分，是里面最高的其中一家 —— " + l.r + " 条、" + stars(l) + "★。\n\n但排在你们前面的几家，评论比你们少，共同点是：他们都有自己的网站。\n\nGoogle 排名不只看评论，也看你有没有一个它能读懂的网站。\n这件事可以补，不贵。\n\n要我把我看到的那几家发给你看吗？\n\nhttps://www.h2o-dreamer-studio.com/";
        },
        en: function (l) {
          return "Hi, is this the person in charge at " + l.n + "?\n\nI'm Hui Huang, web designer in JB.\n\nI searched \"" + l.c + " Johor Bahru\" just now and went through the top listings.\n\nYour reviews are among the highest — " + l.r + " reviews, " + stars(l) + "★.\n\nBut a few places ranking above you have fewer reviews than you.\nWhat they have in common: they all own a website.\n\nGoogle doesn't only count reviews. It also reads your site — if you have one.\n\nWant me to send you the ones I'm looking at?\n\nhttps://www.h2o-dreamer-studio.com/";
        }
      },
      dm: {
        zh: function (l) {
          return "Hi " + l.n + " 👋\n\n我刚 Google 搜「" + l.c + " JB」。\n\n你们 " + l.r + " 条评论、" + stars(l) + "★，是最高的几家之一。\n但排你前面的，有几家评论只有你们一半。\n\n差别在他们有网站，你们没有。\n\n我是 Hui Huang，JB 做网站的。\n要不要我把那几家截图发给你？你自己看比我讲有用。\n\nhttps://www.h2o-dreamer-studio.com/";
        },
        en: function (l) {
          return "Hi " + l.n + " 👋\n\nI just searched \"" + l.c + " JB\" on Google.\n\nYou've got " + l.r + " reviews at " + stars(l) + "★ — among the highest.\nBut a few ranking above you have half your reviews.\n\nThe difference: they own a website. You don't.\n\nI'm Hui Huang, web designer in JB.\nWant me to screenshot those listings for you? Easier to see than to explain.\n\nhttps://www.h2o-dreamer-studio.com/";
        }
      }
    }
  };

  /** The phone wording covers both WhatsApp and a spoken call, so any shop with
   *  a number gets it. The DM wording is only for shops with no phone at all —
   *  that way the copy always matches the button sitting next to it. */
  function channelFor(lead) {
    return (lead.pk === "n" && lead.dm) ? "dm" : "wa";
  }

  function messageFor(lead, variant, lang) {
    return MSG[variant][channelFor(lead)][lang](lead);
  }

  // ------------------------------------------------------------ 打码（录屏用）
  // 拍视频时店名、电话、讯息里的店名全部遮住。按钮的连结与复制的内容仍是真的，
  // 所以打码中照样能发。
  var GENERIC = /^(klinik|clinic|poliklinik|pergigian|dental|dentist|specialist|medical|pusat|salon|beauty|hair|nail|nails|spa|aesthetic|aesthetics|lounge|studio|centre|center|and|the|of|johor|bahru|jb|sdn|bhd|&)$/i;

  function maskWord(w) {
    if (GENERIC.test(w)) return w;
    var ch = Array.from(w);
    return ch[0] + "•••";
  }

  function maskName(n) {
    return n.replace(/[\p{L}\p{N}][\p{L}\p{N}.'’&-]*/gu, maskWord);
  }

  /** "+60 17-741 0100" → "+60 17-••• ••00"：前 4 个数字（国码 + 区码）与最后 2 个留着。 */
  function maskPhone(p) {
    var total = (p.match(/\d/g) || []).length, i = 0;
    return p.replace(/\d/g, function (d) {
      i++;
      return (i <= 4 || i > total - 2) ? d : "•";
    });
  }

  function view(lead) {
    if (!masked) return lead;
    var v = {};
    for (var k in lead) v[k] = lead[k];
    v.n = maskName(lead.n);
    v.ph = lead.ph ? maskPhone(lead.ph) : "";
    return v;
  }

  // -------------------------------------------------------------- state
  var lang = "zh";
  var masked = false;
  // sent: id -> {at, v, replied} · days: "YYYY-MM-DD|channel" -> [id] · vpick: id -> "A"|"B"|"C"
  var state = { sent: {}, days: {}, vpick: {} };
  var filter = "m";                     // view preference, per device

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function readLocal() {
    try {
      var p = JSON.parse(lsGet(LS_KEY) || "null");
      if (p && typeof p === "object") {
        state.sent = p.sent || {};
        state.days = p.days || {};
        state.vpick = p.vpick || {};
      }
    } catch (e) { /* corrupt — carry on empty */ }
    var sl = lsGet(LS_KEY + ":lang");
    if (sl === "en" || sl === "zh") lang = sl;
    var sf = lsGet(LS_KEY + ":filter");
    if (sf === "m" || sf === "l" || sf === "all") filter = sf;
    masked = lsGet(LS_KEY + ":mask") === "1";
  }

  function save() { lsSet(LS_KEY, JSON.stringify(state)); }

  // ------------------------------------------------------------ batching
  function matchesFilter(l) {
    if (filter === "all") return true;
    return l.pk === filter;
  }

  function unsent() {
    return LEADS.filter(function (l) { return !state.sent[l.id]; });
  }

  /** The leads a new batch may draw from: unsent AND on the current channel. */
  function pool() {
    return unsent().filter(matchesFilter);
  }

  function countLeft(f) {
    return LEADS.filter(function (l) {
      return !state.sent[l.id] && (f === "all" || l.pk === f);
    }).length;
  }

  /** Each channel keeps its own daily batch — three WhatsApp messages and three
   *  phone calls are different jobs, so switching channels must not hand you
   *  back the batch you already worked. */
  function dayKey() { return today() + "|" + filter; }

  function todaysIds(createIfMissing) {
    var k = dayKey();
    if (state.days[k] && state.days[k].length) return state.days[k];
    if (!createIfMissing) return [];
    var pick = pool().slice(0, DAILY).map(function (l) { return l.id; });
    if (!pick.length) return [];
    state.days[k] = pick;
    save();
    return pick;
  }

  function pullMore() {
    var k = dayKey();
    var have = state.days[k] || [];
    var extra = pool()
      .filter(function (l) { return have.indexOf(l.id) === -1; })
      .slice(0, DAILY).map(function (l) { return l.id; });
    if (!extra.length) return;
    state.days[k] = have.concat(extra);
    save();
    render();
  }

  /** Which template this shop gets, in order of authority:
   *  1. what was actually sent  2. a manual override  3. round-robin.
   *  Round-robin is deliberate — rotating A/B/C evenly is what makes the
   *  reply rates comparable. Picking "the fitting one" per shop would mix
   *  template quality with shop type and tell you nothing. */
  function variantFor(id) {
    if (state.sent[id] && state.sent[id].v) return state.sent[id].v;
    if (state.vpick[id]) return state.vpick[id];
    var order = [];
    Object.keys(state.days).sort().forEach(function (d) {
      state.days[d].forEach(function (x) { if (order.indexOf(x) === -1) order.push(x); });
    });
    var i = order.indexOf(id);
    if (i === -1) i = order.length;
    return VARIANTS[i % 3];
  }

  function byId(id) {
    for (var i = 0; i < LEADS.length; i++) if (LEADS[i].id === id) return LEADS[i];
    return null;
  }

  // ------------------------------------------------------------- actions
  function markSent(id, on) {
    if (on) {
      state.sent[id] = { at: today(), v: variantFor(id), replied: false };
    } else {
      delete state.sent[id];
    }
    save();
    render();
  }

  function markReplied(id, on) {
    if (state.sent[id]) { state.sent[id].replied = !!on; save(); render(); }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1900);
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast(T[lang].copied); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast(T[lang].copied); } catch (e) {}
    document.body.removeChild(ta);
  }

  // -------------------------------------------------------------- render
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  var WA_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
  var PHONE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>';

  function link(cls, label, href, external) {
    var a = el("a", cls, label);
    a.href = href;
    if (external) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    return a;
  }

  function cardFor(lead, idx) {
    var t = T[lang];
    var shown = view(lead);
    var v = variantFor(lead.id);
    var rec = state.sent[lead.id];
    var isSent = !!rec;
    var msg = messageFor(lead, v, lang);              // 真的：给按钮与复制用
    var shownMsg = masked ? messageFor(shown, v, lang) : msg;

    var card = el("div", "card" + (isSent ? " is-done" : "") + (isSent && rec.replied ? " is-replied" : ""));
    card.style.setProperty("--i", idx);

    var top = el("div", "card-top");
    var badges = el("div", "badges");
    badges.appendChild(el("span", "chip pri-" + lead.p, lead.p));
    badges.appendChild(el("span", "chip", lead.g));
    if (isSent) badges.appendChild(el("span", "chip done", "✓ " + t.sent));
    if (isSent && rec.replied) badges.appendChild(el("span", "chip rep", t.replied));

    // Version picker: rotated automatically, tap to override. Locked once sent,
    // so the recorded version always matches what actually went out.
    var vp = el("div", "vpick");
    vp.appendChild(el("span", "lbl", t.vAuto));
    var vseg = el("div", "seg");
    VARIANTS.forEach(function (name) {
      var vb = el("button", null, name);
      vb.type = "button";
      vb.setAttribute("aria-pressed", name === v ? "true" : "false");
      if (isSent) {
        vb.disabled = true;
      } else {
        vb.addEventListener("click", function () {
          state.vpick[lead.id] = name;
          save();
          render();
        });
      }
      vseg.appendChild(vb);
    });
    vp.appendChild(vseg);
    badges.appendChild(vp);
    top.appendChild(badges);

    top.appendChild(el("h3", "shop", shown.n));

    var meta = el("div", "meta");
    meta.appendChild(el("span", "stars", stars(lead) + "★"));
    meta.appendChild(el("span", null, lead.r.toLocaleString("en") + " " + t.reviews));
    if (lead.a) meta.appendChild(el("span", null, "· " + lead.a));
    if (lead.c) meta.appendChild(el("span", null, "· " + lead.c));
    top.appendChild(meta);

    // The number, spelled out — 07 landlines can't take WhatsApp, so you need
    // to see what you're about to tap before you tap it.
    var ph = el("div", "phone");
    ph.appendChild(el("span", "num" + (shown.ph ? "" : " none"), shown.ph || "—"));
    ph.appendChild(el("span", "pk " + lead.pk,
      { m: t.pkM, l: t.pkL, n: t.pkN, x: t.pkX }[lead.pk] || ""));
    var why = { l: t.whyL, x: t.whyX, n: t.whyN }[lead.pk];
    if (why) ph.appendChild(el("span", "why", why));
    top.appendChild(ph);

    top.appendChild(el("div", "hook",
      (lead.r >= 1000 ? t.hookBig : t.hookSmall)(lead.r.toLocaleString("en"), stars(lead))));
    card.appendChild(top);

    card.appendChild(el("div", "msgbox", shownMsg));

    var actions = el("div", "actions");

    if (lead.wa) {
      // Mobile: WhatsApp, with the text already typed.
      var wa = link("btn primary send", null, lead.wa + "?text=" + encodeURIComponent(msg), true);
      wa.innerHTML = WA_ICON;
      wa.appendChild(document.createTextNode(t.openWa));
      actions.appendChild(wa);
    } else if (lead.pk === "l") {
      // Landline: dial it. The message below is the script.
      var call = link("btn primary send", null, "tel:" + lead.tel, false);
      call.innerHTML = PHONE_ICON;
      call.appendChild(document.createTextNode(t.call + " " + shown.ph));
      actions.appendChild(call);
    } else if (lead.du) {
      actions.appendChild(link("btn primary send", t.openDm, lead.du, true));
    } else {
      // No number and no page: copy the text and walk in. Say so plainly
      // rather than dressing a dead end as the primary action.
      actions.appendChild(el("div", "nocontact", t.noPhone));
    }

    var cp = el("button", "btn ghost", t.copy);
    cp.type = "button";
    cp.addEventListener("click", function () { copy(msg); });
    actions.appendChild(cp);

    // Some landlines do run WhatsApp Business — worth one try, but not the
    // button you reach for first.
    if (lead.wax) {
      actions.appendChild(link("btn ghost", t.tryWa, lead.wax + "?text=" + encodeURIComponent(msg), true));
    }

    // A shop with both a number and a page: the page is a backup channel.
    if ((lead.wa || lead.wax) && lead.du) {
      actions.appendChild(link("btn ghost",
        lead.dm === "ig" ? "IG" : lead.dm === "xhs" ? "XHS" : "FB", lead.du, true));
    }

    if (lead.gm) actions.appendChild(link("btn ghost", t.map, lead.gm, true));

    var tick = el("button", "btn tick", isSent ? t.untick : "✓ " + t.tick);
    tick.type = "button";
    tick.setAttribute("aria-pressed", isSent ? "true" : "false");
    // Read live state at click time, not the flag captured at render.
    tick.addEventListener("click", function () {
      markSent(lead.id, !state.sent[lead.id]);
      if (state.sent[lead.id]) toast("✓ " + t.sent);
    });
    actions.appendChild(tick);

    // 发出之后，回覆就在卡片上按，不用打开下面的表格去找
    if (isSent) {
      var rep = el("button", "btn reply", rec.replied ? "✓ " + t.replied : t.replyQ);
      rep.type = "button";
      rep.setAttribute("aria-pressed", rec.replied ? "true" : "false");
      rep.addEventListener("click", function () {
        var cur = state.sent[lead.id];
        markReplied(lead.id, !(cur && cur.replied));
      });
      actions.appendChild(rep);
    }

    card.appendChild(actions);
    return card;
  }

  function renderFilters() {
    var t = T[lang];
    var host = document.getElementById("filters");
    host.textContent = "";
    [["m", t.fM], ["l", t.fL], ["all", t.fAll]].forEach(function (pair) {
      var b = el("button", null);
      b.type = "button";
      b.appendChild(document.createTextNode(pair[1]));
      b.appendChild(el("span", "c", String(countLeft(pair[0]))));
      b.setAttribute("aria-pressed", filter === pair[0] ? "true" : "false");
      b.addEventListener("click", function () { setFilter(pair[0]); });
      host.appendChild(b);
    });
    var landlinesLeft = countLeft("l");
    if (filter === "m" && landlinesLeft) {
      host.appendChild(el("div", "hint", t.fNote(landlinesLeft, t.fL)));
    }
  }

  function setFilter(f) {
    filter = f;
    lsSet(LS_KEY + ":filter", f);
    render();
  }

  function renderToday() {
    var t = T[lang];
    var host = document.getElementById("today");
    host.textContent = "";

    var ids = todaysIds(true);
    var left = pool().length;

    if (!ids.length && !left) {
      var allDone = el("div", "empty");
      allDone.appendChild(el("div", "big", t.allDone(LEADS.length)));
      allDone.appendChild(el("p", null, t.allDoneBody));
      host.appendChild(allDone);
      document.getElementById("today-count").textContent = "";
      return;
    }

    var pending = ids.filter(function (id) { return !state.sent[id]; });
    document.getElementById("today-count").textContent =
      (ids.length - pending.length) + " / " + ids.length;

    ids.forEach(function (id, i) {
      var lead = byId(id);
      if (lead) host.appendChild(cardFor(lead, i));
    });

    if (!pending.length) {
      var done = el("div", "empty");
      done.appendChild(el("div", "big", t.doneTitle));
      done.appendChild(el("p", null, t.doneBody));
      if (left) {
        var more = el("button", "btn primary", t.more);
        more.type = "button";
        more.addEventListener("click", pullMore);
        done.appendChild(more);
      }
      host.appendChild(done);
    }
  }

  function tallyReplies() {
    var s = 0, r = 0;
    Object.keys(state.sent).forEach(function (id) {
      s++;
      if (state.sent[id].replied) r++;
    });
    return { s: s, r: r };
  }

  function renderProgress() {
    var t = T[lang];
    var tot = tallyReplies();
    setNum("p-done", tot.s);
    document.getElementById("p-of").textContent = t.of(LEADS.length);
    document.getElementById("p-bar").style.width =
      (LEADS.length ? (tot.s / LEADS.length * 100) : 0) + "%";
    // Keys are "date|channel", so count distinct dates, not batches.
    var dates = {};
    Object.keys(state.days).forEach(function (k) { dates[k.split("|")[0]] = 1; });
    setNum("k-rep", tot.r);
    document.getElementById("k-rate").textContent = tot.s ? Math.round(tot.r / tot.s * 100) + "%" : "—";
    setNum("k-day", Object.keys(dates).length);
  }

  // 第一次解锁时数字从 0 跳上来；之后的重画直接写值
  var countUp = false;
  function setNum(id, n) {
    var node = document.getElementById(id);
    if (!countUp || !n) { node.textContent = n; return; }
    var t0 = performance.now(), dur = 900;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      node.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  function renderStats() {
    var t = T[lang];
    var host = document.getElementById("stats");
    host.textContent = "";
    var tally = { A: { s: 0, r: 0 }, B: { s: 0, r: 0 }, C: { s: 0, r: 0 } };
    Object.keys(state.sent).forEach(function (id) {
      var rec = state.sent[id];
      if (!tally[rec.v]) return;
      tally[rec.v].s++;
      if (rec.replied) tally[rec.v].r++;
    });
    var best = -1;
    VARIANTS.forEach(function (v) {
      if (tally[v].s >= 5) {
        var rate = tally[v].r / tally[v].s;
        if (rate > best) best = rate;
      }
    });
    VARIANTS.forEach(function (v) {
      var d = tally[v];
      var rate = d.s ? (d.r / d.s) : 0;
      var isWin = best > 0 && d.s >= 5 && rate === best;
      var box = el("div", "stat" + (isWin ? " win" : ""));
      box.appendChild(el("div", "v", t.variant + " " + v));
      box.appendChild(el("div", "n", d.s ? Math.round(rate * 100) + "%" : "—"));
      box.appendChild(el("div", "d", d.s + " " + t.statSent + " · " + d.r + " " + t.statRep));
      if (isWin) box.appendChild(el("span", "crown", t.best));
      host.appendChild(box);
    });
  }

  function renderLog() {
    var t = T[lang];
    var body = document.getElementById("log-body");
    body.textContent = "";
    var ids = Object.keys(state.sent).sort(function (a, b) {
      return (state.sent[b].at || "").localeCompare(state.sent[a].at || "");
    });
    document.getElementById("log-n").textContent = ids.length;
    if (!ids.length) {
      var tr0 = el("tr");
      var td0 = el("td", "muted", t.noneYet);
      td0.colSpan = 5;
      tr0.appendChild(td0);
      body.appendChild(tr0);
      return;
    }
    ids.forEach(function (id) {
      var lead = byId(id), rec = state.sent[id];
      if (!lead) return;
      var tr = el("tr");
      tr.appendChild(el("td", "num", rec.at || ""));
      tr.appendChild(el("td", "name", view(lead).n));
      tr.appendChild(el("td", "num", rec.v || ""));
      tr.appendChild(el("td", "num", String(lead.r)));
      var td = el("td");
      var b = el("button", "mini", rec.replied ? t.yes : t.no);
      b.type = "button";
      b.setAttribute("aria-pressed", rec.replied ? "true" : "false");
      b.addEventListener("click", function () {
        var cur = state.sent[id];
        markReplied(id, !(cur && cur.replied));
      });
      td.appendChild(b);
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }

  function renderAll() {
    var t = T[lang];
    var body = document.getElementById("all-body");
    body.textContent = "";
    document.getElementById("all-n").textContent = LEADS.length;
    LEADS.forEach(function (l) {
      var s = view(l);
      var tr = el("tr");
      tr.appendChild(el("td", "num", l.p));
      tr.appendChild(el("td", "name", s.n));
      tr.appendChild(el("td", null, l.g));
      tr.appendChild(el("td", "num", stars(l)));
      tr.appendChild(el("td", "num", String(l.r)));
      tr.appendChild(el("td", "num", s.ph || "—"));
      tr.appendChild(el("td", null, { m: t.pkM, l: t.pkL, n: t.pkN, x: t.pkX }[l.pk] || ""));
      tr.appendChild(el("td", null, l.a || ""));
      tr.appendChild(el("td", state.sent[l.id] ? null : "muted", state.sent[l.id] ? "✓ " + t.sent : t.pending));
      var td = el("td");
      if (l.gm) td.appendChild(link("rowlink", t.thMap, l.gm, true));
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }

  function setText(id, s) { document.getElementById(id).textContent = s; }

  function renderLockText() {
    var t = T[lang];
    setText("lock-sub", t.lockSub);
    setText("pw-label", t.pw);
    document.getElementById("pw").placeholder = t.pw;
    setText("remember-label", t.remember);
    setText("unlock", t.unlock);
  }

  function renderChrome() {
    var t = T[lang];
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
    setText("subline", t.sub(LEADS.length));
    setText("k-rep-l", t.kRep);
    setText("k-rate-l", t.kRate);
    setText("k-day-l", t.kDay);
    setText("today-h", t.todayH);
    setText("stats-h", t.statsH);
    setText("log-h", t.logH);
    setText("all-h", t.allH);
    document.getElementById("note").innerHTML = t.note;
    setText("device-note", t.device);
    setText("mask-label", t.mask);
    document.getElementById("mask-btn").setAttribute("aria-pressed", masked ? "true" : "false");
    document.getElementById("lock-btn").setAttribute("aria-label", t.lock);
    setText("th-date", t.thDate);
    setText("th-shop", t.thShop);
    setText("th-var", t.thVar);
    setText("th-rev", t.thRev);
    setText("th-reply", t.thReply);
    setText("th-pri", t.thPri);
    setText("th-shop2", t.thShop);
    setText("th-cat", t.thCat);
    setText("th-score", t.thScore);
    setText("th-rev2", t.thRev);
    setText("th-phone", t.thPhone);
    setText("th-kind", t.thKind);
    setText("th-area", t.thArea);
    setText("th-status", t.thStatus);
    setText("th-map", t.thMap);
    document.getElementById("lang-zh").setAttribute("aria-pressed", lang === "zh" ? "true" : "false");
    document.getElementById("lang-en").setAttribute("aria-pressed", lang === "en" ? "true" : "false");
  }

  function render() {
    renderChrome();
    renderProgress();
    renderFilters();
    renderToday();
    renderStats();
    renderLog();
    renderAll();
  }

  function setLang(l) {
    lang = l;
    lsSet(LS_KEY + ":lang", l);
    renderLockText();
    if (LEADS.length) render();
  }

  function setMask(on) {
    masked = on;
    lsSet(LS_KEY + ":mask", on ? "1" : "0");
    render();
    toast(on ? T[lang].maskOn : T[lang].maskOff);
  }

  // -------------------------------------------------------------- unlock
  function b64(buf) {
    var s = "", bytes = new Uint8Array(buf);
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  var payload = null;
  function fetchPayload() {
    if (payload) return Promise.resolve(payload);
    return fetch("leads.enc.json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (p) { payload = p; return p; });
  }

  function deriveKey(password, p) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", hash: "SHA-256", salt: unb64(p.salt), iterations: p.iter },
          base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
      });
  }

  function decryptWith(key, p) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(p.iv) }, key, unb64(p.ct))
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }

  function rememberKey(key) {
    return crypto.subtle.exportKey("raw", key).then(function (raw) {
      // 金钥绑着 salt：名单换了密码重新加密，旧金钥自然失效
      lsSet(KEY_SLOT, JSON.stringify({ salt: payload.salt, k: b64(raw) }));
    });
  }

  function storedKey(p) {
    try {
      var s = JSON.parse(lsGet(KEY_SLOT) || "null");
      if (!s || s.salt !== p.salt) return Promise.resolve(null);
      return crypto.subtle.importKey("raw", unb64(s.k), "AES-GCM", false, ["decrypt"]);
    } catch (e) { return Promise.resolve(null); }
  }

  function openApp(leads, animate) {
    LEADS = leads;
    var lock = document.getElementById("lock");
    var app = document.getElementById("app");
    document.getElementById("pw").value = "";
    app.hidden = false;
    if (animate) {
      app.classList.add("intro");
      countUp = true;
      lock.classList.add("opening");
      setTimeout(function () { lock.hidden = true; lock.classList.remove("opening"); }, 750);
      setTimeout(function () { app.classList.remove("intro"); countUp = false; }, 1400);
    } else {
      lock.hidden = true;
    }
    render();
    countUp = false;
    window.scrollTo(0, 0);
  }

  function showError(msg) {
    var card = document.getElementById("lock-form");
    setText("lock-err", msg);
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
  }

  function onSubmit(e) {
    e.preventDefault();
    var t = T[lang];
    var pw = document.getElementById("pw").value;
    var btn = document.getElementById("unlock");
    if (!pw) return;
    btn.disabled = true;
    btn.textContent = t.unlocking;
    setText("lock-err", "");
    var gotKey;
    fetchPayload().then(function (p) {
      return deriveKey(pw, p).then(function (key) {
        gotKey = key;
        return decryptWith(key, p);
      });
    }).then(function (leads) {
      if (document.getElementById("remember").checked) rememberKey(gotKey);
      else lsDel(KEY_SLOT);
      openApp(leads, true);
    }).catch(function (err) {
      // AES-GCM 解不开就是密码错（OperationError）；其他都当载入失败
      showError(err && err.name === "OperationError" ? t.wrong : t.loadFail);
      document.getElementById("pw").select();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = t.unlock;
    });
  }

  function lockNow() {
    lsDel(KEY_SLOT);
    LEADS = [];
    document.getElementById("today").textContent = "";
    document.getElementById("all-body").textContent = "";
    document.getElementById("log-body").textContent = "";
    document.getElementById("app").hidden = true;
    document.getElementById("lock").hidden = false;
    setText("lock-err", "");
    window.scrollTo(0, 0);
  }

  // -------------------------------------------------------------- boot
  readLocal();
  renderLockText();

  document.getElementById("lock-form").addEventListener("submit", onSubmit);
  document.getElementById("lang-zh").addEventListener("click", function () { setLang("zh"); });
  document.getElementById("lang-en").addEventListener("click", function () { setLang("en"); });
  document.getElementById("mask-btn").addEventListener("click", function () { setMask(!masked); });
  document.getElementById("lock-btn").addEventListener("click", lockNow);

  // 记住过这台装置：直接用存下的金钥解，不必再跑一次 PBKDF2
  // 解的那一瞬间先藏起锁屏，免得闪一下
  if (lsGet(KEY_SLOT)) {
    var lockEl = document.getElementById("lock");
    lockEl.style.visibility = "hidden";
    fetchPayload().then(function (p) {
      return storedKey(p).then(function (key) { return key ? decryptWith(key, p) : null; });
    }).then(function (leads) {
      if (leads) openApp(leads, false);
      else lsDel(KEY_SLOT);
    }).catch(function () { lsDel(KEY_SLOT); }).then(function () {
      lockEl.style.visibility = "";
    });
  }
})();
