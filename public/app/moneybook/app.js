/* 小帐本 — 纯前端离线记帐 PWA
   资料全部存在浏览器 localStorage，不上传任何服务器，也不去任何地方取汇率。

   这个文件只负责**渲染与事件接线**。状态、迁移与全部派生数字都在 ledger.js
   —— 那一层是纯的，也是唯一被自动化测试盯着的地方（见 #98）。 */
import * as L from './ledger.js';

(() => {
  'use strict';

  const VERSION = '2.0.0';
  // 储存键保持不变：改键名会让旧资料找不到，风险远大于「键名写着 v1 而资料是 v2」
  // 这点观感问题。版本号在资料里（state.version），迁移看的是它。
  const KEY = 'moneybook.v1';

  // 分类色定义在 CSS 的 --cat-1…--cat-10，主题要换整组就只改 CSS。
  // 这里只吐出 var() 字串，写进 inline style 由浏览器解析。
  const catColor = i => `var(--cat-${(i % 10) + 1})`;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ── 状态 ────────────────────────────────────────────
  const loaded = L.loadState(localStorage.getItem(KEY));
  let state = loaded.state;
  // 读不懂的资料绝不回存 —— 拿预设值覆盖掉，才是真的把使用者的帐弄丢
  let readOnly = loaded.corrupt;

  let view = 'entry';
  let side = L.activeSide(state);   // 当前在看哪一侧
  let entryType = 'expense';        // 记帐页：支出 / 收入 / 转帐
  let statsType = 'expense';        // 统计页
  let catEditType = 'expense';      // 设定页分类编辑
  let recType = 'expense';          // 固定收支
  let picked = null;                // 已选分类 id
  let buffer = '0';                 // 金额输入缓冲
  let editingId = null;
  let curMonth = L.monthOf(new Date());
  let deferredPrompt = null;

  function save() {
    if (readOnly) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      toast('保存失败：装置空间不足？');
    }
  }

  // ── 小工具 ──────────────────────────────────────────
  const money = (n, cur = side) => L.formatMoney(n, cur);

  function catOf(type, id) {
    return state.cats[type]?.find(c => c.id === id) || { icon: '❔', name: '未分类' };
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1800);
  }
  /** 走出的那一侧记帐时，对面是谁。只有一侧时为 null。 */
  const otherSide = () => L.otherSide(state, side);

  // ── 侧切换器 ────────────────────────────────────────
  // 只有第二币种存在时才被创建。没有它，下面这些 innerHTML 一次都不会跑，
  // 界面与只有一个币种时完全一致（ADR-0001：不是「模式关着」，是根本没被创建）。
  function renderSideSwitch() {
    const el = $('#side-switch');
    if (!L.hasSecondary(state)) {
      el.hidden = true;
      el.innerHTML = '';
      document.body.classList.remove('two-sided');
      return;
    }
    document.body.classList.add('two-sided');
    el.hidden = false;
    el.innerHTML = L.sides(state).map(c => `
      <button role="tab" aria-selected="${c === side}" class="${c === side ? 'on' : ''}" data-side="${esc(c)}">
        <b>${esc(c)}</b>
        <small>累计 ${esc(money(L.cumulative(state, c), c))}</small>
      </button>`).join('');
  }

  $('#side-switch').addEventListener('click', e => {
    const b = e.target.closest('button[data-side]');
    if (!b || b.dataset.side === side) return;
    switchSide(b.dataset.side);
  });

  function switchSide(next) {
    side = next;
    L.setActiveSide(state, side);
    save();
    // 切了侧，明细、统计、预算全部跟着换 —— 看到的是一套自洽的数字
    if (editingId) resetEntry(); else { picked = pickedOrFirst(); renderEntry(); }
    renderSideSwitch();
    if (view === 'list') renderList();
    if (view === 'stats') renderStats();
    if (view === 'more') renderMore();
    toast(`已切到 ${side}`);
  }

  // ── 切换页面 ────────────────────────────────────────
  function show(name) {
    view = name;
    closeKeypad();
    ['entry', 'list', 'stats', 'more'].forEach(v => {
      $('#view-' + v).hidden = v !== name;
    });
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === name));
    if (name === 'list') renderList();
    if (name === 'stats') renderStats();
    if (name === 'more') renderMore();
  }

  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.view === 'entry' && view !== 'entry') resetEntry();
    show(b.dataset.view);
  }));

  // ── 记帐页 ──────────────────────────────────────────
  const isXfer = () => entryType === L.TRANSFER;

  function pickedOrFirst() {
    if (isXfer()) return null;
    const list = state.cats[entryType] || [];
    return list.some(c => c.id === picked) ? picked : (list[0]?.id || null);
  }

  /** 分段控件：只有存在第二币种时才长出第三段「转帐」。 */
  function renderTypeSeg() {
    const seg = $('#seg-type');
    const types = [['expense', '支出'], ['income', '收入']];
    if (L.hasSecondary(state)) types.push([L.TRANSFER, '转帐']);
    if (!types.some(([t]) => t === entryType)) entryType = 'expense';
    seg.innerHTML = types.map(([t, label]) =>
      `<button data-type="${t}" class="${t === entryType ? 'on' : ''}">${label}</button>`).join('');
  }

  function renderCats() {
    if (isXfer()) { $('#cats').innerHTML = ''; $('#cats').hidden = true; return; }
    $('#cats').hidden = false;
    $('#cats').innerHTML = (state.cats[entryType] || [])
      .map(c => `<button data-cat="${esc(c.id)}" class="${c.id === picked ? 'on' : ''}">
                   <i>${esc(c.icon)}</i><span>${esc(c.name)}</span>
                 </button>`).join('');
  }

  /** 转帐才出现的到帐金额栏，顺带把这次的汇率算给使用者看。 */
  function renderXfer() {
    const box = $('#xfer-box');
    box.hidden = !isXfer();
    if (!isXfer()) return;
    const to = otherSide();
    $('#xfer-label').textContent = `到帐 ${to}`;
    $('#xfer-amount').placeholder = `对面实际收到多少 ${to}`;

    const out = parseFloat(buffer) || 0;
    const got = parseFloat($('#xfer-amount').value) || 0;
    $('#xfer-rate').textContent = (out > 0 && got > 0)
      ? `这次的汇率：1 ${side} ≈ ${(got / out).toFixed(4)} ${to}（含手续费的真实成交价）`
      : '从转帐 app 上抄下实际到帐的数目，含手续费。app 不联网取汇率。';
  }

  function renderAmount() {
    $('#amount').textContent = buffer;
    $('#entry-cur').textContent = side;
    $('#amount-hint').textContent = isXfer() ? `从 ${side} 走出` : '点一下输入金额';
    document.body.classList.toggle('income-mode', entryType === 'income');
    document.body.classList.toggle('xfer-mode', isXfer());
  }

  function renderEntry() {
    renderTypeSeg();
    renderCats();
    renderXfer();
    renderAmount();
  }

  function resetEntry() {
    editingId = null;
    buffer = '0';
    side = L.activeSide(state);
    if (isXfer() && !L.hasSecondary(state)) entryType = 'expense';
    picked = pickedOrFirst();
    $('#date').value = L.dateOf(new Date());
    $('#note').value = '';
    $('#xfer-amount').value = '';
    $('#entry-title').textContent = '记一笔';
    $('#btn-delete').hidden = true;
    closeKeypad();
    renderEntry();
    renderSideSwitch();
  }

  $('#seg-type').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    entryType = b.dataset.type;
    picked = pickedOrFirst();
    renderEntry();
  });

  $('#cats').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    picked = b.dataset.cat;
    closeKeypad();
    renderCats();
  });

  $('#xfer-amount').addEventListener('input', renderXfer);
  $('#xfer-amount').addEventListener('focus', closeKeypad);

  $('#keypad').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'del') {
      buffer = buffer.length <= 1 ? '0' : buffer.slice(0, -1);
      if (buffer === '') buffer = '0';
    } else if (k === '.') {
      if (!buffer.includes('.')) buffer += '.';
    } else {
      if (buffer === '0') buffer = k;
      else if (buffer.replace(/\D/g, '').length < 9 && !/\.\d\d$/.test(buffer)) buffer += k;
    }
    renderAmount();
    if (isXfer()) renderXfer();
  });

  // 键盘是底部抽屉：点金额才滑出。不加遮罩，让分类键与分页列保持可点，
  // 改由「选好分类 / 保存 / 换页 / 编辑备注」这些动作自动收起。
  function openKeypad() {
    $('#keypad').classList.add('open');
    $('#amount-tap').classList.add('on');
  }
  function closeKeypad() {
    $('#keypad').classList.remove('open');
    $('#amount-tap').classList.remove('on');
  }
  $('#amount-tap').addEventListener('click', () => {
    $('#keypad').classList.contains('open') ? closeKeypad() : openKeypad();
  });
  // 备注／日期就在键盘底下，要输入时先收起
  $('#note').addEventListener('focus', closeKeypad);
  $('#date').addEventListener('focus', closeKeypad);

  function saveRecord() {
    if (readOnly) return toast('资料读不懂，已停用写入以免覆盖。请先还原备份。');
    const amount = parseFloat(buffer);
    if (!amount || amount <= 0) return toast('请输入金额');

    const date = $('#date').value || L.dateOf(new Date());
    const note = $('#note').value.trim();
    const wasEditing = !!editingId;

    try {
      if (isXfer()) {
        const toAmount = parseFloat($('#xfer-amount').value);
        if (!toAmount || toAmount <= 0) return toast('请填到帐金额');
        const payload = {
          type: L.TRANSFER, amount, currency: side,
          toAmount, toCurrency: otherSide(), date, note
        };
        if (wasEditing) L.updateRecord(state, editingId, payload);
        else L.addTransfer(state, payload);
      } else {
        if (!picked) return toast('请先选一个分类');
        const prev = wasEditing ? L.findRecord(state, editingId) : null;
        const payload = { type: entryType, amount, currency: side, cat: picked, date, note };
        if (wasEditing) L.updateRecord(state, editingId, payload);
        else L.addRecord(state, { ...payload, ruleId: prev?.ruleId });
      }
    } catch (err) {
      return toast(err.message);
    }

    toast(wasEditing ? '已更新' : (isXfer() ? '已记下转帐' : '已记帐 ' + money(amount)));
    save();
    curMonth = date.slice(0, 7);
    resetEntry();
    if (wasEditing) show('list');
  }

  $('#btn-save').addEventListener('click', saveRecord);
  $('#btn-save-form').addEventListener('click', saveRecord);

  $('#btn-delete').addEventListener('click', () => {
    if (!editingId) return;
    const r = L.findRecord(state, editingId);
    const msg = r && L.isTransfer(r)
      ? '这是一笔转帐，删除后两侧会同时回退。确定删除？'
      : '确定删除这笔记录？';
    if (!confirm(msg)) return;
    L.removeRecord(state, editingId);
    save();
    resetEntry();
    toast('已删除');
    show('list');
  });

  function editRecord(id) {
    const r = L.findRecord(state, id);
    if (!r) return;
    editingId = r.id;
    entryType = r.type;
    side = r.currency;                     // 编辑时跟着这笔记录走出的那一侧
    L.setActiveSide(state, side);
    picked = L.isTransfer(r) ? null : r.cat;
    buffer = String(r.amount);
    $('#date').value = r.date;
    $('#note').value = r.note || '';
    $('#xfer-amount').value = L.isTransfer(r) ? String(r.toAmount) : '';
    $('#entry-title').textContent = L.isTransfer(r) ? '编辑转帐' : '编辑记录';
    $('#btn-delete').hidden = false;
    renderEntry();
    renderSideSwitch();
    show('entry');
  }

  // ── 月份切换 ────────────────────────────────────────
  $$('[data-month]').forEach(b => b.addEventListener('click', () => {
    curMonth = L.shiftMonth(curMonth, Number(b.dataset.month));
    if (view === 'list') renderList(); else renderStats();
  }));

  const monthLabel = m => m.replace('-', ' 年 ') + ' 月';

  // ── 明细页 ──────────────────────────────────────────
  /**
   * 一条记录在明细里要显示成几行。
   *
   * 转帐同时挂在两侧上，所以在当前这一侧只显示它跟这一侧有关的那一行
   * ——「走出」或「到帐」——读起来跟脑子里的「两笔帐」一致（story 14）。
   */
  function linesOf(r) {
    if (!L.isTransfer(r)) {
      return [{
        id: r.id, icon: catOf(r.type, r.cat).icon, title: catOf(r.type, r.cat).name,
        note: r.note || '', sign: r.type === 'income' ? '+' : '-',
        cls: r.type, amount: r.amount, ruleId: r.ruleId
      }];
    }
    const out = [];
    if (r.currency === side) {
      out.push({
        id: r.id, icon: '📤', title: `转出到 ${r.toCurrency}`,
        note: r.note || `到帐 ${L.formatMoney(r.toAmount, r.toCurrency)}`,
        sign: '−', cls: 'xfer', amount: r.amount
      });
    }
    if (r.toCurrency === side) {
      out.push({
        id: r.id, icon: '📥', title: `从 ${r.currency} 转入`,
        note: r.note || `走出 ${L.formatMoney(r.amount, r.currency)}`,
        sign: '+', cls: 'xfer', amount: r.toAmount
      });
    }
    return out;
  }

  function renderList() {
    $('#list-month').textContent = monthLabel(curMonth);
    const sum = L.monthlySummary(state, side, curMonth);
    const rs = L.recordsOfMonth(state, side, curMonth);

    // 「累计」而不是「余额」：这个数字是用本 app 以来这一侧的净流入，
    // 不是银行户口余额 —— 措辞必须让这一点自明（ADR-0001）。
    $('#list-summary').innerHTML = `
      <div><small>收入</small><b class="v income">${money(sum.income)}</b></div>
      <div><small>支出</small><b class="v expense">${money(sum.expense)}</b></div>
      <div><small>结余</small><b>${money(sum.net)}</b></div>
      <div><small>累计</small><b>${money(L.cumulative(state, side))}</b></div>`;

    if (!rs.length) {
      $('#list-body').innerHTML = '<div class="empty">这个月还没有记录<br>切到「记帐」开始吧 ✏️</div>';
      return;
    }

    const byDay = {};
    rs.forEach(r => (byDay[r.date] ||= []).push(r));

    $('#list-body').innerHTML = Object.keys(byDay).sort().reverse().map(day => {
      const items = byDay[day].slice().reverse().flatMap(linesOf);
      const dayExp = byDay[day].filter(r => !L.isTransfer(r) && r.type === 'expense')
        .reduce((s, r) => s + r.amount, 0);
      const dayInc = byDay[day].filter(r => !L.isTransfer(r) && r.type === 'income')
        .reduce((s, r) => s + r.amount, 0);
      const wd = ['日','一','二','三','四','五','六'][new Date(day + 'T00:00:00').getDay()];
      const head = [dayExp ? '支出 ' + money(dayExp) : '', dayInc ? '收入 ' + money(dayInc) : '']
        .filter(Boolean).join('　');
      return `<div class="day">
        <div class="day-head"><span>${day.slice(5)}　周${wd}</span><span>${head}</span></div>
        <div class="items">${items.map(it => {
          const auto = it.ruleId ? '<span class="auto-tag">🔁 固定</span>' : '';
          return `<button class="item" data-id="${esc(it.id)}">
            <i>${esc(it.icon)}</i>
            <span class="t"><b>${esc(it.title)}${auto}</b><small>${esc(it.note)}</small></span>
            <span class="v ${it.cls}">${it.sign}${money(it.amount)}</span>
          </button>`;
        }).join('')}</div>
      </div>`;
    }).join('');
  }

  $('#list-body').addEventListener('click', e => {
    const b = e.target.closest('.item');
    if (b) editRecord(b.dataset.id);
  });

  // ── 统计页 ──────────────────────────────────────────
  $('#seg-stats').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    statsType = b.dataset.type;
    $$('#seg-stats button').forEach(x => x.classList.toggle('on', x === b));
    renderStats();
  });

  function renderStats() {
    $('#stats-month').textContent = monthLabel(curMonth);

    // 预算进度（只在看支出时显示），只吃本侧的支出
    const bs = statsType === 'expense' ? L.budgetStatus(state, side, curMonth) : null;
    $('#budget-box').innerHTML = bs ? `<div class="card">
        <div class="cat-row" style="border:none;padding:0 0 8px">
          <span>本月预算 ${money(bs.budget)}</span>
          <b style="color:${bs.over ? 'var(--expense)' : 'var(--income)'}">${
            bs.over ? '超支 ' + money(-bs.left) : '剩 ' + money(bs.left)}</b>
        </div>
        <div class="bar-bg" style="height:6px;background:var(--hairline);border-radius:9999px;overflow:hidden">
          <i style="display:block;height:100%;width:${bs.pct}%;background:${bs.over ? 'var(--expense)' : 'var(--accent)'}"></i>
        </div>
      </div>` : '';

    // 分类占比 —— 转帐不在其中，汇款不再盖住真实的消费结构
    const { total, rows } = L.categoryBreakdown(state, side, curMonth, statsType);

    $('#donut-label').textContent = statsType === 'expense' ? '本月支出' : '本月收入';
    $('#donut-total').textContent = money(total);

    const svg = $('#donut');
    if (!total) {
      // 颜色要写在 style，presentation attribute 不吃 var()
      svg.innerHTML = '<circle cx="21" cy="21" r="15.915" fill="none" style="stroke:var(--hairline)" stroke-width="5"/>';
      $('#rank').innerHTML = '<div class="empty">这个月没有' + (statsType === 'expense' ? '支出' : '收入') + '记录</div>';
    } else {
      let off = 0;
      svg.innerHTML = rows.map((row, i) => {
        const len = row.amount / total * 100;
        const seg = `<circle cx="21" cy="21" r="15.915" fill="none" style="stroke:${catColor(i)}"
          stroke-width="5" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}"
          stroke-dashoffset="${(-off).toFixed(2)}"/>`;
        off += len;
        return seg;
      }).join('');

      $('#rank').innerHTML = rows.map((row, i) => {
        const c = catOf(statsType, row.cat);
        return `<div class="rank-item">
          <i>${esc(c.icon)}</i>
          <span class="t"><b>${esc(c.name)}</b>
            <span class="bar-bg"><i style="width:${row.pct.toFixed(1)}%;background:${catColor(i)}"></i></span>
          </span>
          <span class="v">${money(row.amount)}<small>${row.pct.toFixed(1)}%</small></span>
        </div>`;
      }).join('');
    }

    // 近 6 个月趋势，仍然只属于这一侧
    const data = L.trend(state, side, curMonth, 6);
    const max = Math.max(1, ...data.map(d => Math.max(d.expense, d.income)));
    $('#trend').innerHTML = data.map(d => `<div class="col">
      <span class="stack">
        <i class="b e" style="height:${(d.expense / max * 100).toFixed(1)}%" title="支出 ${money(d.expense)}"></i>
        <i class="b i" style="height:${(d.income / max * 100).toFixed(1)}%" title="收入 ${money(d.income)}"></i>
      </span>
      <small>${d.month.slice(5)}月</small>
    </div>`).join('');
  }

  // ── 每月固定收支 ────────────────────────────────────
  function renderRecurring() {
    $('#rec-list').innerHTML = state.recurring.length
      ? state.recurring.map(r => {
          const c = catOf(r.type, r.cat);
          return `<div class="rec-row">
            <i>${esc(c.icon)}</i>
            <span class="t"><b>${esc(r.note || c.name)}</b><small>每月 ${r.day} 号 · ${esc(c.name)}</small></span>
            <span class="v ${r.type}">${r.type === 'expense' ? '-' : '+'}${money(r.amount, r.currency)}</span>
            <button class="x" data-del-rec="${esc(r.id)}" aria-label="删除">✕</button>
          </div>`;
        }).join('')
      : '<p class="muted small">还没有设定固定收支。</p>';

    $('#rec-cat').innerHTML = (state.cats[recType] || [])
      .map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');

    // 币种选择只在有两侧时才出现
    const sel = $('#rec-currency');
    sel.hidden = !L.hasSecondary(state);
    sel.innerHTML = L.sides(state).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    sel.value = side;

    if (!$('#rec-day').options.length) {
      $('#rec-day').innerHTML = Array.from({ length: 31 }, (_, i) =>
        `<option value="${i + 1}">每月 ${i + 1} 号</option>`).join('');
    }
  }

  $('#seg-rec-type').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    recType = b.dataset.type;
    $$('#seg-rec-type button').forEach(x => x.classList.toggle('on', x === b));
    renderRecurring();
  });

  $('#btn-add-rec').addEventListener('click', () => {
    try {
      L.addRule(state, {
        type: recType,
        amount: Number($('#rec-amount').value),
        currency: L.hasSecondary(state) ? $('#rec-currency').value : state.currency,
        cat: $('#rec-cat').value,
        day: Number($('#rec-day').value),
        note: $('#rec-note').value.trim(),
        from: L.monthOf(new Date())
      });
    } catch (err) {
      return toast(err.message);
    }
    $('#rec-amount').value = ''; $('#rec-note').value = '';
    const n = L.applyRecurring(state, L.dateOf(new Date()));
    save();
    renderRecurring();
    renderSideSwitch();
    toast(n ? `已新增，并补记本月 ${n} 笔` : '已新增固定收支');
  });

  $('#rec-list').addEventListener('click', e => {
    const b = e.target.closest('button[data-del-rec]');
    if (!b) return;
    if (!confirm('停止这笔固定收支？已经记下的记录会保留，之后不再自动产生。')) return;
    L.removeRule(state, b.dataset.delRec);
    save(); renderRecurring(); toast('已停止');
  });

  // ── 设定页 ──────────────────────────────────────────
  function renderMore() {
    $('#set-currency').value = state.currency;
    $('#set-currency2').value = state.currency2 || '';
    $('#ver').textContent = `小帐本 v${VERSION} · 共 ${state.records.length} 笔记录`;
    renderBudgetSettings();
    renderRecurring();
    renderCatEditor();
    renderInstallCard();
  }

  /** 预算跟着分侧：每一侧各一行，各自设各自的。 */
  function renderBudgetSettings() {
    $('#budget-settings').innerHTML = L.sides(state).map(c => `
      <div class="card row">
        <span>${L.hasSecondary(state) ? esc(c) + ' 那侧' : '每月预算'}</span>
        <input type="number" min="0" step="100" placeholder="0 = 不设定" class="mini wide"
               data-budget="${esc(c)}" value="${L.budgetOf(state, c) || ''}" aria-label="${esc(c)} 每月预算" />
      </div>`).join('');
  }

  $('#budget-settings').addEventListener('change', e => {
    const input = e.target.closest('input[data-budget]');
    if (!input) return;
    const c = input.dataset.budget;
    L.setBudget(state, c, Number(input.value) || 0);
    save();
    toast(L.budgetOf(state, c) ? `${c} 预算已设定` : `已取消 ${c} 预算`);
  });

  $('#set-currency').addEventListener('change', e => {
    try {
      L.setPrimaryCurrency(state, e.target.value);
    } catch (err) {
      toast(err.message);
      e.target.value = state.currency;
      return;
    }
    side = L.activeSide(state);
    save(); renderMore(); resetEntry(); toast('已更新主币种');
  });

  $('#set-currency2').addEventListener('change', e => {
    const raw = e.target.value.trim();
    if (!raw) {
      // 想删掉第二币种，先把那一侧还有多少笔说清楚 —— 不静默弄丢资料
      if (L.hasSecondary(state)) {
        const n = L.countOnSide(state, state.currency2);
        const msg = n
          ? `${state.currency2} 那侧还有 ${n} 笔记录。移除第二币种后它们会留在资料里但不再显示，` +
            `重新加回同一个币种就会再出现。确定移除？`
          : '确定移除第二币种？';
        if (!confirm(msg)) { e.target.value = state.currency2; return; }
      }
      L.removeSecondaryCurrency(state);
    } else {
      try {
        L.setSecondaryCurrency(state, raw);
      } catch (err) {
        toast(err.message);
        e.target.value = state.currency2 || '';
        return;
      }
    }
    side = L.activeSide(state);
    save(); renderMore(); resetEntry();
    toast(L.hasSecondary(state) ? `已加上 ${state.currency2} 那一侧` : '已移除第二币种');
  });

  $('#seg-cat-edit').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    catEditType = b.dataset.type;
    $$('#seg-cat-edit button').forEach(x => x.classList.toggle('on', x === b));
    renderCatEditor();
  });

  function renderCatEditor() {
    $('#cat-editor').innerHTML = (state.cats[catEditType] || []).map(c =>
      `<div class="cat-row"><i>${esc(c.icon)}</i><span>${esc(c.name)}</span>
        <button data-del="${esc(c.id)}" aria-label="删除">✕</button></div>`).join('');
  }

  $('#cat-editor').addEventListener('click', e => {
    const b = e.target.closest('button[data-del]');
    if (!b) return;
    const id = b.dataset.del;
    if (state.cats[catEditType].length <= 1) return toast('至少要留一个分类');
    // 分类两侧共用，所以这里数的是全部侧上用到它的记录
    const used = state.records.filter(r => !L.isTransfer(r) && r.type === catEditType && r.cat === id).length;
    if (used && !confirm(`已有 ${used} 笔记录使用这个分类，删除后它们会显示为「未分类」。确定删除？`)) return;
    state.cats[catEditType] = state.cats[catEditType].filter(c => c.id !== id);
    picked = pickedOrFirst();
    save(); renderCatEditor(); renderCats(); toast('已删除分类');
  });

  $('#btn-add-cat').addEventListener('click', () => {
    const name = $('#new-cat-name').value.trim();
    const icon = $('#new-cat-icon').value.trim() || '🏷️';
    if (!name) return toast('请输入分类名称');
    state.cats[catEditType].push({ id: 'c' + Date.now().toString(36), icon, name });
    $('#new-cat-name').value = ''; $('#new-cat-icon').value = '';
    save(); renderCatEditor(); renderCats(); toast('已新增分类');
  });

  // ── 导出 / 导入 ─────────────────────────────────────
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $('#btn-export-json').addEventListener('click', () => {
    download(`小帐本备份-${L.dateOf(new Date())}.json`, JSON.stringify(state, null, 2), 'application/json');
    toast('已产生备份档');
  });

  $('#btn-export-csv').addEventListener('click', () => {
    if (!state.records.length) return toast('没有资料可导出');
    // BOM 让 Excel 正确辨识 UTF-8
    download(`小帐本-${L.dateOf(new Date())}.csv`,
      '﻿' + L.toCSV(state, (type, id) => catOf(type, id).name), 'text/csv');
    toast('已导出 CSV');
  });

  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.records)) throw new Error('格式不正确');
      if (!confirm(`备份含 ${parsed.records.length} 笔记录。还原会覆盖目前装置上的所有资料，确定吗？`)) return;
      state = L.migrate(parsed);
      readOnly = false;              // 还原成功，写入解禁
      side = L.activeSide(state);
      save(); resetEntry(); renderMore(); toast('还原完成');
    } catch (err) {
      toast('还原失败：' + err.message);
    } finally {
      e.target.value = '';
    }
  });

  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('会删除这台装置上的所有记帐资料，且无法复原。确定吗？')) return;
    if (!confirm('真的要清除全部资料吗？建议先做一次备份。')) return;
    state = L.defaultState();
    readOnly = false;
    side = L.activeSide(state);
    save(); resetEntry(); renderMore(); toast('已清除');
  });

  // ── 安装提示 ────────────────────────────────────────
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (view === 'more') renderInstallCard();
  });

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  function renderInstallCard() {
    const card = $('#install-card'), btn = $('#btn-install'), txt = $('#install-text');
    if (isStandalone()) {
      card.hidden = false; btn.hidden = true;
      txt.textContent = '已安装完成 ✅ 你现在正从主屏幕打开，没有网络也能记帐。';
      return;
    }
    card.hidden = false;
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (deferredPrompt) {
      btn.hidden = false;
      txt.textContent = '按下按钮即可安装，不需要经过 App Store。';
    } else {
      btn.hidden = true;
      txt.textContent = iOS
        ? 'iPhone / iPad：用 Safari 打开本页 → 点下方「分享」⬆️ → 选「添加到主屏幕」。'
        : 'Android Chrome：右上角 ⋮ →「安装应用」或「添加到主屏幕」。电脑请点地址栏右侧的安装图标。';
    }
  }

  $('#btn-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    renderInstallCard();
    if (outcome === 'accepted') toast('安装中…');
  });

  // ── Service Worker ─────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW 注册失败', err));
    });
  }

  // ── 启动 ────────────────────────────────────────────
  resetEntry();
  show('entry');

  if (readOnly) {
    toast('装置上的资料读不懂，已停用写入以免覆盖。请用「还原备份」救回。');
  } else {
    const autoAdded = L.applyRecurring(state, L.dateOf(new Date()));
    if (autoAdded) { save(); renderSideSwitch(); toast(`已自动记入 ${autoAdded} 笔固定收支`); }
  }

  // App 长时间放在背景、跨月后再打开时，回前景也要补记
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || readOnly) return;
    const n = L.applyRecurring(state, L.dateOf(new Date()));
    if (!n) return;
    save();
    toast(`已自动记入 ${n} 笔固定收支`);
    renderSideSwitch();
    if (view === 'list') renderList();
    if (view === 'stats') renderStats();
    if (view === 'more') renderRecurring();
  });
})();
