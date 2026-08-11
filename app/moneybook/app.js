/* 小帳本 — 純前端離線記帳 PWA
   資料全部存在瀏覽器 localStorage，不上傳任何伺服器。 */
(() => {
  'use strict';

  const VERSION = '1.0.0';
  const KEY = 'moneybook.v1';

  const DEFAULTS = {
    version: 1,
    currency: 'NT$',
    budget: 0,
    cats: {
      expense: [
        { id: 'food',    icon: '🍜', name: '餐飲' },
        { id: 'daily',   icon: '🛒', name: '日用' },
        { id: 'traffic', icon: '🚌', name: '交通' },
        { id: 'fun',     icon: '🎬', name: '娛樂' },
        { id: 'home',    icon: '🏠', name: '居家' },
        { id: 'health',  icon: '💊', name: '醫療' },
        { id: 'learn',   icon: '📚', name: '學習' },
        { id: 'other_e', icon: '📦', name: '其他' }
      ],
      income: [
        { id: 'salary',  icon: '💼', name: '薪水' },
        { id: 'bonus',   icon: '🎁', name: '獎金' },
        { id: 'invest',  icon: '📈', name: '投資' },
        { id: 'other_i', icon: '✨', name: '其他' }
      ]
    },
    recurring: [],
    records: []
  };

  const PALETTE = ['#0d9488','#f59e0b','#6366f1','#e11d48','#0ea5e9','#84cc16','#a855f7','#f97316','#14b8a6','#ec4899'];

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ── 狀態 ────────────────────────────────────────────
  let state = load();
  let view = 'entry';
  let entryType = 'expense';      // 記帳頁：支出 / 收入
  let statsType = 'expense';      // 統計頁
  let catEditType = 'expense';    // 設定頁分類編輯
  let picked = null;              // 已選分類 id
  let buffer = '0';               // 金額輸入緩衝
  let editingId = null;
  let curMonth = monthOf(new Date());
  let deferredPrompt = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const d = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULTS),
        ...d,
        cats: {
          expense: d.cats?.expense?.length ? d.cats.expense : DEFAULTS.cats.expense,
          income:  d.cats?.income?.length  ? d.cats.income  : DEFAULTS.cats.income
        },
        recurring: Array.isArray(d.recurring) ? d.recurring : [],
        records: Array.isArray(d.records) ? d.records : []
      };
    } catch (e) {
      console.warn('讀取資料失敗，使用預設值', e);
      return structuredClone(DEFAULTS);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      toast('儲存失敗：裝置空間不足？');
    }
  }

  // ── 小工具 ──────────────────────────────────────────
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function monthOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
  function shiftMonth(m, delta) {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 1 + delta, 1);
    return monthOf(d);
  }
  function money(n) {
    const v = Math.round(n * 100) / 100;
    return state.currency + v.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  }
  function catOf(type, id) {
    return state.cats[type].find(c => c.id === id) || { icon: '❔', name: '未分類' };
  }
  function recordsOf(month) {
    return state.records.filter(r => r.date.startsWith(month));
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

  // ── 切換頁面 ────────────────────────────────────────
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

  // ── 記帳頁 ──────────────────────────────────────────
  function renderCats() {
    $('#cats').innerHTML = state.cats[entryType]
      .map(c => `<button data-cat="${esc(c.id)}" class="${c.id === picked ? 'on' : ''}">
                   <i>${esc(c.icon)}</i><span>${esc(c.name)}</span>
                 </button>`).join('');
  }

  function renderAmount() {
    $('#amount').textContent = buffer;
    $$('[data-currency]').forEach(el => el.textContent = state.currency);
    document.body.classList.toggle('income-mode', entryType === 'income');
  }

  function resetEntry() {
    editingId = null;
    buffer = '0';
    picked = state.cats[entryType][0]?.id || null;
    $('#date').value = dateOf(new Date());
    $('#note').value = '';
    $('#entry-title').textContent = '記一筆';
    $('#btn-delete').hidden = true;
    closeKeypad();
    renderCats();
    renderAmount();
  }

  $('#seg-type').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    entryType = b.dataset.type;
    $$('#seg-type button').forEach(x => x.classList.toggle('on', x === b));
    if (!state.cats[entryType].some(c => c.id === picked)) picked = state.cats[entryType][0]?.id || null;
    renderCats();
    renderAmount();
  });

  $('#cats').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    picked = b.dataset.cat;
    closeKeypad();
    renderCats();
  });

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
  });

  // 鍵盤是底部抽屜：點金額才滑出。不加遮罩，讓分類鍵與分頁列保持可點，
  // 改由「選好分類 / 儲存 / 換頁 / 編輯備註」這些動作自動收起。
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
  // 備註／日期就在鍵盤底下，要輸入時先收起
  $('#note').addEventListener('focus', closeKeypad);
  $('#date').addEventListener('focus', closeKeypad);

  function saveRecord() {
    const amount = parseFloat(buffer);
    if (!amount || amount <= 0) return toast('請輸入金額');
    if (!picked) return toast('請先選一個分類');
    const wasEditing = !!editingId;
    const prev = wasEditing ? state.records.find(r => r.id === editingId) : null;
    const rec = {
      id: editingId || newId(),
      type: entryType,
      amount: Math.round(amount * 100) / 100,
      cat: picked,
      date: $('#date').value || dateOf(new Date()),
      note: $('#note').value.trim()
    };
    // 由固定支出自動產生的紀錄，編輯後仍保留來源標記
    if (prev?.ruleId) rec.ruleId = prev.ruleId;
    if (wasEditing) {
      const i = state.records.findIndex(r => r.id === editingId);
      if (i > -1) state.records[i] = rec; else state.records.push(rec);
      toast('已更新');
    } else {
      state.records.push(rec);
      toast('已記帳 ' + money(rec.amount));
    }
    save();
    curMonth = rec.date.slice(0, 7);
    resetEntry();
    if (wasEditing) show('list');
  }

  $('#btn-save').addEventListener('click', saveRecord);
  $('#btn-save-form').addEventListener('click', saveRecord);

  $('#btn-delete').addEventListener('click', () => {
    if (!editingId) return;
    if (!confirm('確定刪除這筆紀錄？')) return;
    state.records = state.records.filter(r => r.id !== editingId);
    save();
    resetEntry();
    toast('已刪除');
    show('list');
  });

  function editRecord(id) {
    const r = state.records.find(x => x.id === id);
    if (!r) return;
    editingId = r.id;
    entryType = r.type;
    picked = r.cat;
    buffer = String(r.amount);
    $('#date').value = r.date;
    $('#note').value = r.note || '';
    $('#entry-title').textContent = '編輯紀錄';
    $('#btn-delete').hidden = false;
    $$('#seg-type button').forEach(x => x.classList.toggle('on', x.dataset.type === entryType));
    renderCats();
    renderAmount();
    show('entry');
  }

  // ── 月份切換 ────────────────────────────────────────
  $$('[data-month]').forEach(b => b.addEventListener('click', () => {
    curMonth = shiftMonth(curMonth, Number(b.dataset.month));
    if (view === 'list') renderList(); else renderStats();
  }));

  // ── 明細頁 ──────────────────────────────────────────
  function renderList() {
    $('#list-month').textContent = curMonth.replace('-', ' 年 ') + ' 月';
    const rs = recordsOf(curMonth);
    const inc = rs.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const exp = rs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

    $('#list-summary').innerHTML = `
      <div><small>收入</small><b class="v income">${money(inc)}</b></div>
      <div><small>支出</small><b class="v expense">${money(exp)}</b></div>
      <div><small>結餘</small><b>${money(inc - exp)}</b></div>`;

    if (!rs.length) {
      $('#list-body').innerHTML = '<div class="empty">這個月還沒有紀錄<br>切到「記帳」開始吧 ✏️</div>';
      return;
    }

    const byDay = {};
    rs.forEach(r => (byDay[r.date] ||= []).push(r));

    $('#list-body').innerHTML = Object.keys(byDay).sort().reverse().map(day => {
      const items = byDay[day].slice().reverse();
      const dayExp = items.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      const dayInc = items.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
      const wd = ['日','一','二','三','四','五','六'][new Date(day + 'T00:00:00').getDay()];
      const sum = [dayExp ? '支出 ' + money(dayExp) : '', dayInc ? '收入 ' + money(dayInc) : '']
        .filter(Boolean).join('　');
      return `<div class="day">
        <div class="day-head"><span>${day.slice(5)}　週${wd}</span><span>${sum}</span></div>
        <div class="items">${items.map(r => {
          const c = catOf(r.type, r.cat);
          const auto = r.ruleId ? '<span class="auto-tag">🔁 固定</span>' : '';
          return `<button class="item" data-id="${esc(r.id)}">
            <i>${esc(c.icon)}</i>
            <span class="t"><b>${esc(c.name)}${auto}</b><small>${esc(r.note || '')}</small></span>
            <span class="v ${r.type}">${r.type === 'expense' ? '-' : '+'}${money(r.amount)}</span>
          </button>`;
        }).join('')}</div>
      </div>`;
    }).join('');
  }

  $('#list-body').addEventListener('click', e => {
    const b = e.target.closest('.item');
    if (b) editRecord(b.dataset.id);
  });

  // ── 統計頁 ──────────────────────────────────────────
  $('#seg-stats').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    statsType = b.dataset.type;
    $$('#seg-stats button').forEach(x => x.classList.toggle('on', x === b));
    renderStats();
  });

  function renderStats() {
    $('#stats-month').textContent = curMonth.replace('-', ' 年 ') + ' 月';
    const rs = recordsOf(curMonth).filter(r => r.type === statsType);
    const total = rs.reduce((s, r) => s + r.amount, 0);

    // 預算進度（只在看支出時顯示）
    const exp = recordsOf(curMonth).filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    if (state.budget > 0 && statsType === 'expense') {
      const pct = Math.min(100, exp / state.budget * 100);
      const left = state.budget - exp;
      $('#budget-box').innerHTML = `<div class="card">
        <div class="cat-row" style="border:none;padding:0 0 8px">
          <span>本月預算 ${money(state.budget)}</span>
          <b style="color:${left < 0 ? 'var(--expense)' : 'var(--income)'}">${left < 0 ? '超支 ' + money(-left) : '剩 ' + money(left)}</b>
        </div>
        <div class="bar-bg" style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <i style="display:block;height:100%;width:${pct}%;background:${left < 0 ? 'var(--expense)' : 'var(--accent)'}"></i>
        </div>
      </div>`;
    } else {
      $('#budget-box').innerHTML = '';
    }

    // 分類彙總
    const byCat = {};
    rs.forEach(r => byCat[r.cat] = (byCat[r.cat] || 0) + r.amount);
    const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

    $('#donut-label').textContent = statsType === 'expense' ? '本月支出' : '本月收入';
    $('#donut-total').textContent = money(total);

    // 甜甜圈
    const svg = $('#donut');
    if (!total) {
      svg.innerHTML = '<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--border)" stroke-width="5"/>';
      $('#rank').innerHTML = '<div class="empty">這個月沒有' + (statsType === 'expense' ? '支出' : '收入') + '紀錄</div>';
    } else {
      let off = 0;
      svg.innerHTML = rows.map(([id, v], i) => {
        const len = v / total * 100;
        const seg = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="${PALETTE[i % PALETTE.length]}"
          stroke-width="5" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}"
          stroke-dashoffset="${(-off).toFixed(2)}"/>`;
        off += len;
        return seg;
      }).join('');

      $('#rank').innerHTML = rows.map(([id, v], i) => {
        const c = catOf(statsType, id);
        const pct = v / total * 100;
        return `<div class="rank-item">
          <i>${esc(c.icon)}</i>
          <span class="t"><b>${esc(c.name)}</b>
            <span class="bar-bg"><i style="width:${pct.toFixed(1)}%;background:${PALETTE[i % PALETTE.length]}"></i></span>
          </span>
          <span class="v">${money(v)}<small>${pct.toFixed(1)}%</small></span>
        </div>`;
      }).join('');
    }

    // 近 6 個月趨勢
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(shiftMonth(curMonth, -i));
    const data = months.map(m => {
      const mr = recordsOf(m);
      return {
        m,
        e: mr.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
        i: mr.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
      };
    });
    const max = Math.max(1, ...data.map(d => Math.max(d.e, d.i)));
    $('#trend').innerHTML = data.map(d => `<div class="col">
      <span class="stack">
        <i class="b e" style="height:${(d.e / max * 100).toFixed(1)}%" title="支出 ${money(d.e)}"></i>
        <i class="b i" style="height:${(d.i / max * 100).toFixed(1)}%" title="收入 ${money(d.i)}"></i>
      </span>
      <small>${d.m.slice(5)}月</small>
    </div>`).join('');
  }

  // ── 每月固定收支 ────────────────────────────────────
  let recType = 'expense';

  // 把所有到期但還沒記的固定收支補上。
  // 每條規則自己記住已經套用過哪些月份，所以使用者手動刪掉某個月的那一筆，也不會被重新補回來。
  function applyRecurring() {
    const today = dateOf(new Date());
    const thisMonth = today.slice(0, 7);
    let added = 0;

    state.recurring.forEach(rule => {
      rule.applied ||= [];
      let m = rule.from;
      while (m <= thisMonth) {
        if (!rule.applied.includes(m)) {
          const [y, mo] = m.split('-').map(Number);
          const lastDay = new Date(y, mo, 0).getDate();       // 2 月沒有 31 號，往前縮到當月最後一天
          const date = `${m}-${pad(Math.min(rule.day, lastDay))}`;
          if (date <= today) {
            state.records.push({
              id: newId(), type: rule.type, amount: rule.amount,
              cat: rule.cat, date, note: rule.note, ruleId: rule.id
            });
            rule.applied.push(m);
            added++;
          }
        }
        m = shiftMonth(m, 1);
      }
    });

    if (added) save();
    return added;
  }

  function renderRecurring() {
    $('#rec-list').innerHTML = state.recurring.length
      ? state.recurring.map(r => {
          const c = catOf(r.type, r.cat);
          return `<div class="rec-row">
            <i>${esc(c.icon)}</i>
            <span class="t"><b>${esc(r.note || c.name)}</b><small>每月 ${r.day} 號 · ${esc(c.name)}</small></span>
            <span class="v ${r.type}">${r.type === 'expense' ? '-' : '+'}${money(r.amount)}</span>
            <button class="x" data-del-rec="${esc(r.id)}" aria-label="刪除">✕</button>
          </div>`;
        }).join('')
      : '<p class="muted small">還沒有設定固定收支。</p>';

    $('#rec-cat').innerHTML = state.cats[recType]
      .map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
    if (!$('#rec-day').options.length) {
      $('#rec-day').innerHTML = Array.from({ length: 31 }, (_, i) =>
        `<option value="${i + 1}">每月 ${i + 1} 號</option>`).join('');
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
    const amount = Math.round(Number($('#rec-amount').value) * 100) / 100;
    if (!amount || amount <= 0) return toast('請輸入金額');
    state.recurring.push({
      id: newId(),
      type: recType,
      amount,
      cat: $('#rec-cat').value,
      day: Number($('#rec-day').value),
      note: $('#rec-note').value.trim(),
      from: monthOf(new Date()),
      applied: []
    });
    $('#rec-amount').value = ''; $('#rec-note').value = '';
    save();
    const n = applyRecurring();
    renderRecurring();
    toast(n ? `已新增，並補記本月 ${n} 筆` : '已新增固定收支');
  });

  $('#rec-list').addEventListener('click', e => {
    const b = e.target.closest('button[data-del-rec]');
    if (!b) return;
    if (!confirm('停止這筆固定收支？已經記下的紀錄會保留，之後不再自動產生。')) return;
    state.recurring = state.recurring.filter(r => r.id !== b.dataset.delRec);
    save(); renderRecurring(); toast('已停止');
  });

  // ── 設定頁 ──────────────────────────────────────────
  function renderMore() {
    $('#set-currency').value = state.currency;
    $('#set-budget').value = state.budget || '';
    $('#ver').textContent = `小帳本 v${VERSION} · 共 ${state.records.length} 筆紀錄`;
    renderRecurring();
    renderCatEditor();
    renderInstallCard();
  }

  $('#set-currency').addEventListener('change', e => {
    state.currency = e.target.value.trim() || 'NT$';
    save(); renderAmount(); toast('已更新幣別');
  });
  $('#set-budget').addEventListener('change', e => {
    state.budget = Math.max(0, Number(e.target.value) || 0);
    save(); toast(state.budget ? '預算已設定' : '已取消預算');
  });

  $('#seg-cat-edit').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    catEditType = b.dataset.type;
    $$('#seg-cat-edit button').forEach(x => x.classList.toggle('on', x === b));
    renderCatEditor();
  });

  function renderCatEditor() {
    $('#cat-editor').innerHTML = state.cats[catEditType].map(c =>
      `<div class="cat-row"><i>${esc(c.icon)}</i><span>${esc(c.name)}</span>
        <button data-del="${esc(c.id)}" aria-label="刪除">✕</button></div>`).join('');
  }

  $('#cat-editor').addEventListener('click', e => {
    const b = e.target.closest('button[data-del]');
    if (!b) return;
    const id = b.dataset.del;
    if (state.cats[catEditType].length <= 1) return toast('至少要留一個分類');
    const used = state.records.filter(r => r.type === catEditType && r.cat === id).length;
    if (used && !confirm(`已有 ${used} 筆紀錄使用這個分類，刪除後它們會顯示為「未分類」。確定刪除？`)) return;
    state.cats[catEditType] = state.cats[catEditType].filter(c => c.id !== id);
    if (picked === id) picked = state.cats[entryType][0]?.id || null;
    save(); renderCatEditor(); renderCats(); toast('已刪除分類');
  });

  $('#btn-add-cat').addEventListener('click', () => {
    const name = $('#new-cat-name').value.trim();
    const icon = $('#new-cat-icon').value.trim() || '🏷️';
    if (!name) return toast('請輸入分類名稱');
    state.cats[catEditType].push({ id: 'c' + Date.now().toString(36), icon, name });
    $('#new-cat-name').value = ''; $('#new-cat-icon').value = '';
    save(); renderCatEditor(); renderCats(); toast('已新增分類');
  });

  // ── 匯出 / 匯入 ─────────────────────────────────────
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $('#btn-export-json').addEventListener('click', () => {
    download(`小帳本備份-${dateOf(new Date())}.json`, JSON.stringify(state, null, 2), 'application/json');
    toast('已產生備份檔');
  });

  $('#btn-export-csv').addEventListener('click', () => {
    if (!state.records.length) return toast('沒有資料可匯出');
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['日期', '類型', '分類', '金額', '備註']].concat(
      state.records.slice().sort((a, b) => a.date.localeCompare(b.date)).map(r =>
        [r.date, r.type === 'expense' ? '支出' : '收入', catOf(r.type, r.cat).name, r.amount, r.note || ''])
    );
    // BOM 讓 Excel 正確辨識 UTF-8
    download(`小帳本-${dateOf(new Date())}.csv`, '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n'), 'text/csv');
    toast('已匯出 CSV');
  });

  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.records)) throw new Error('格式不正確');
      if (!confirm(`備份含 ${d.records.length} 筆紀錄。還原會覆蓋目前裝置上的所有資料，確定嗎？`)) return;
      state = {
        ...structuredClone(DEFAULTS), ...d,
        cats: {
          expense: d.cats?.expense?.length ? d.cats.expense : DEFAULTS.cats.expense,
          income:  d.cats?.income?.length  ? d.cats.income  : DEFAULTS.cats.income
        }
      };
      save(); resetEntry(); renderMore(); toast('還原完成');
    } catch (err) {
      toast('還原失敗：' + err.message);
    } finally {
      e.target.value = '';
    }
  });

  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('會刪除這台裝置上的所有記帳資料，且無法復原。確定嗎？')) return;
    if (!confirm('真的要清除全部資料嗎？建議先做一次備份。')) return;
    state = structuredClone(DEFAULTS);
    save(); resetEntry(); renderMore(); toast('已清除');
  });

  // ── 安裝提示 ────────────────────────────────────────
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
      txt.textContent = '已安裝完成 ✅ 你現在正從主畫面開啟，沒有網路也能記帳。';
      return;
    }
    card.hidden = false;
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (deferredPrompt) {
      btn.hidden = false;
      txt.textContent = '按下按鈕即可安裝，不需要經過 App Store。';
    } else {
      btn.hidden = true;
      txt.textContent = iOS
        ? 'iPhone / iPad：用 Safari 開啟本頁 → 點下方「分享」⬆️ → 選「加入主畫面」。'
        : 'Android Chrome：右上角 ⋮ →「安裝應用程式」或「加到主畫面」。桌機請點網址列右側的安裝圖示。';
    }
  }

  $('#btn-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    renderInstallCard();
    if (outcome === 'accepted') toast('安裝中…');
  });

  // ── Service Worker ─────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW 註冊失敗', err));
    });
  }

  // ── 啟動 ────────────────────────────────────────────
  resetEntry();
  show('entry');

  const autoAdded = applyRecurring();
  if (autoAdded) toast(`已自動記入 ${autoAdded} 筆固定收支`);

  // App 長時間放在背景、跨月後再打開時，回前景也要補記
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const n = applyRecurring();
    if (!n) return;
    toast(`已自動記入 ${n} 筆固定收支`);
    if (view === 'list') renderList();
    if (view === 'stats') renderStats();
    if (view === 'more') renderRecurring();
  });
})();
