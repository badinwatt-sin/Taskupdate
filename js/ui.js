'use strict';
/* ============================================================
   UI kit: icons, modal, toast, small components, event delegation
   ============================================================ */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v10"/>',
  check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>', refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>', save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>', info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>', layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  gantt: '<path d="M3 5h10M7 12h14M5 19h9"/>',
  paperclip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  swap: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
};
const ico = (n, s = 18) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Toast ---------- */
function toast(msg, type = 'ok', undo) {
  const root = $('#toasts'); if (!root) return;
  const el = document.createElement('div'); el.className = 'toast ' + type;
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="toast-undo">ย้อนกลับ</button>' : ''}`;
  root.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  if (undo) $('.toast-undo', el).onclick = () => { undo(); kill(); };
  setTimeout(kill, undo ? 6000 : 3200);
}

/* ---------- Modal ----------
   Keyboard: Tab stays inside the top window (focus trap), Esc closes it, and focus returns to the
   control that opened it. The page behind is inert while a window is open.
   Actions: a button is locked while its handler runs (no double submit); if the handler throws,
   the window stays open with everything typed still there, and the error is shown. */
let modalStack = [];
const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),summary';
const focusables = el => $$(FOCUSABLE, el).filter(x => !x.hidden && x.offsetParent !== null && !x.closest('[hidden],[inert]'));
function trapTab(e, el) {
  if (e.key !== 'Tab') return; const f = focusables(el); if (!f.length) { e.preventDefault(); return; }
  const first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (!el.contains(a)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
}
const PAGE_PARTS = () => [$('.sidebar'), $('.main'), $('#tabbar'), $('#fab'), $('.skip')].filter(Boolean);
function setPageInert(on) { PAGE_PARTS().forEach(x => { if (on) x.setAttribute('inert', ''); else x.removeAttribute('inert'); }); }
function focusBack(el) {   // return focus to where it was — or to the same item after a re-render (same data-act + data-id)
  if (!el) return;
  if (el.isConnected && !el.closest('[inert]')) { try { el.focus({ preventScroll: true }); } catch (e) { } return; }
  const act = el.dataset && el.dataset.act, id = el.dataset && el.dataset.id;
  const twin = act && $$(`[data-act="${act}"]`).find(x => (x.dataset.id || '') === (id || '') && !x.closest('[inert]'));
  if (twin) try { twin.focus({ preventScroll: true }); } catch (e) { }
}
function modal({ title, body, actions = [], wide = false, onOpen, cls = '' }) {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="ปิด">${ico('x')}</button></header>
    <div class="modal-body">${body}</div><footer></footer></div>`;
  const opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  if (modalStack.length) modalStack[modalStack.length - 1].el.setAttribute('inert', '');
  document.body.appendChild(back);
  document.body.classList.add('no-scroll'); setPageInert(true);
  const api = {
    el: back, body: $('.modal-body', back), closed: false,
    close() {
      if (api.closed) return; api.closed = true;
      back.remove(); modalStack = modalStack.filter(m => m !== api);
      if (modalStack.length) modalStack[modalStack.length - 1].el.removeAttribute('inert');
      else { document.body.classList.remove('no-scroll'); setPageInert(false); }
      setTimeout(() => focusBack(opener), 0);
    },
  };
  back.addEventListener('keydown', e => trapTab(e, back));
  const foot = $('footer', back);
  actions.forEach(a => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'btn ' + (a.cls || 'btn-ghost'); b.innerHTML = a.label;
    if (a.left) b.style.marginRight = 'auto';
    b.onclick = async () => {
      if (b.dataset.busy) return;   // ignore double taps while saving
      b.dataset.busy = '1'; b.setAttribute('aria-busy', 'true'); const all = $$('footer button', back); all.forEach(x => { x.disabled = true; });
      let r;
      try { r = a.onClick ? await a.onClick(api) : undefined; }
      catch (err) { r = false; console.error(err); toast((err && err.message) || 'ทำรายการไม่สำเร็จ — ข้อมูลที่กรอกยังอยู่ ลองใหม่อีกครั้ง', 'error'); }
      finally { delete b.dataset.busy; b.removeAttribute('aria-busy'); all.forEach(x => { x.disabled = false; }); }
      if (r !== false) api.close();
    };
    foot.appendChild(b);
  });
  if (!actions.length) foot.remove();
  back.addEventListener('mousedown', e => { if (e.target === back && !wide) api.close(); });
  $('[data-close]', back).onclick = api.close;
  modalStack.push(api);
  onOpen && onOpen(api);
  const first = $('input:not([type=hidden]):not([disabled]), textarea, select', back);
  if (first && !matchMedia('(pointer:coarse)').matches) first.focus();
  else { const box = $('.modal', back); box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }   // keyboard focus starts inside the window
  return api;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close();
});
const confirmBox = (msg, ok = 'ยืนยัน', danger = false, title = 'ยืนยันการทำรายการ') => new Promise(res => {
  let done = false;
  const m = modal({
    title, body: `<p class="confirm-msg">${msg}</p>`,
    actions: [
      { label: 'ยกเลิก', onClick: () => { done = true; res(false); } },
      { label: ok, cls: danger ? 'btn-danger' : 'btn-primary', onClick: () => { done = true; res(true); } },
    ],
  });
  const orig = m.close; m.close = () => { orig(); if (!done) res(false); };
});

/* ---------- Components ---------- */
function avatar(m, size = 28) {
  if (!m) return `<span class="avatar" style="--s:${size}px;background:#cbd5e1" title="ยังไม่ระบุ">?</span>`;
  const c = m.iconColor || group(m.group).color;   // personal icon colour (falls back to the team colour)
  if (m.emoji) return `<span class="avatar emo" title="${esc(m.name)}" style="--s:${size}px;background:color-mix(in srgb,${c} 22%,#fff);box-shadow:0 0 0 2px ${c}">${esc(m.emoji)}</span>`;
  return `<span class="avatar" title="${esc(m.name)}" style="--s:${size}px;background:${c}">${esc(initials(m))}</span>`;
}
/* ---------- Post-it style & emoji ---------- */
const POSTIT_COLORS = ['#fde68a', '#fef08a', '#fed7aa', '#fecaca', '#fbcfe8', '#f5d0fe', '#ddd6fe', '#c7d2fe', '#bfdbfe', '#a5f3fc', '#99f6e4', '#bbf7d0', '#d9f99d', '#e7e5e4', '#e5e7eb', '#f1e4c9'];
const ICON_COLORS = ['#007aff', '#5856d6', '#af52de', '#ff2d55', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#8e8e93', '#1c1c1e'];
const POSTIT_PATTERNS = { plain: 'เรียบ', lines: 'เส้นบรรทัด', notebook: 'สมุดจด', dots: 'จุด', grid: 'ตาราง', gingham: 'ลายสก็อต', stripes: 'ริ้วเฉียง', waves: 'คลื่น', stars: 'ดาว', hearts: 'หัวใจ', confetti: 'คอนเฟตตี', cross: 'บวก', tape: 'เทปแปะ', kraft: 'กระดาษคราฟท์' };
const EMOJI_SETS = {
  'สัตว์': '🦁 🐯 🐶 🐱 🦊 🐼 🐨 🐻 🐰 🐹 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦉 🦄 🐴 🦓 🦒 🐘 🦛 🦏 🐊 🐢 🦎 🐍 🦖 🐙 🦑 🐬 🐳 🦈 🐠 🦀 🐝 🦋 🐞 🦔 🦦 🦥 🦩 🦚 🐿️ 🐲',
  'หน้า & คน': '😀 😃 😄 😁 😊 🙂 😉 😍 🥰 😎 🤓 🧐 🥳 🤩 😇 🤠 🥸 🤖 👻 👽 😺 😸 🙌 👍 ✌️ 🤘 👋 💪 🧠 👀 🧑‍💻 🧑‍🎨 🧑‍🚀 🧑‍🍳 🦸 🧙 🧚 🥷',
  'ธรรมชาติ': '🌸 🌺 🌻 🌼 🌷 🌹 🍀 🌿 🌵 🌴 🌲 🍁 🍄 🌾 🌈 ☀️ 🌤️ ⛅ 🌙 ⭐ 🌟 ✨ ⚡ 🔥 ❄️ ☃️ 🌊 💧 🌍 🪐 ☄️ 🌋 🏔️ 🌅',
  'อาหาร': '🍎 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥑 🌽 🌶️ 🍕 🍔 🍟 🌭 🌮 🍣 🍜 🍙 🍩 🍪 🎂 🧁 🍫 🍿 🍦 ☕ 🧋 🍵 🥤 🧃',
  'กิจกรรม': '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🏸 ⛳ 🎳 🏹 🎣 🥊 🛹 🏄 🚴 🏊 🧗 🎮 🎲 🧩 ♟️ 🎯 🎨 🎬 🎤 🎧 🎸 🎹 🥁 🎷 🎺 📸 🎭 🎪',
  'ของ & สัญลักษณ์': '🚀 ✈️ 🚗 🏎️ 🚲 ⛵ 🛸 🏠 🏰 🗼 💡 📚 📌 📎 ✏️ 🖍️ 📷 💻 ⌚ 📱 🔑 🎁 🎈 🎉 🏆 🥇 👑 💎 🔮 🪄 🧸 🪁 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 ✅ ⭕ 🔶 🔷',
};
const EMOJIS = Object.values(EMOJI_SETS).join(' ').split(' ');
function postitOf(m) {
  const n = m ? [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
  return { color: m?.postit?.color || POSTIT_COLORS[n % POSTIT_COLORS.length], pattern: m?.postit?.pattern || 'plain' };
}
const emojiOwner = (e, exceptId) => S().members.find(x => x.id !== exceptId && x.emoji && x.emoji === e);
const personChip = (m, size = 22) => m ? `<span class="person">${avatar(m, size)}<span>${esc(m.name)}</span></span>` : '<span class="muted">ยังไม่ระบุ</span>';
function statusBadge(t) {
  const s = STATUS[t.status];
  return `<span class="badge st-${t.status}">${s.th}</span>${isDelayed(t) ? `<span class="badge st-delayed" title="${OVERDUE_TIP}">เลยกำหนด</span>` : ''}`;
}
const prioDot = p => `<span class="prio p-${p}" title="ความสำคัญ: ${PRIO[p].th}"></span>`;
const groupChip = g => { g = typeof g === 'string' ? group(g) : g; return `<span class="gchip" style="--c:${g.color}">${esc(g.short)}</span>`; };
const progressBar = (pct, color) => `<div class="progress"><i style="width:${pct}%;${color ? 'background:' + color : ''}"></i></div>`;
const empty = (icon, title, sub, btn = '') => `<div class="empty">${ico(icon, 34)}<h4>${esc(title)}</h4><p>${esc(sub)}</p>${btn}</div>`;
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="head-actions">${actions}</div></div>`;
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${esc(label)}</option>`;
const memberOptions = (sel, blank) => (blank ? opt('', blank, sel) : '') + S().groups.map(g => {
  const ms = S().members.filter(m => m.group === g.id); if (!ms.length) return '';
  return `<optgroup label="${esc(g.name)}">${ms.map(m => opt(m.id, m.name, sel)).join('')}</optgroup>`;
}).join('');
const groupOptions = (sel, blank) => (blank ? opt('', blank, sel) : '') + S().groups.map(g => opt(g.id, g.name, sel)).join('');
const projectOptions = (sel, blank) => (blank ? opt('', blank, sel) : '') + visibleProjects().map(p => opt(p.id, p.name, sel)).join('');
function linkList(t) {
  const L = (t.links || []).map(l => `<a class="attach" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${ico('link', 14)}${esc(l.label || l.url)}</a>`);
  const F = (t.files || []).map(f => `<a class="attach" href="${f.data}" download="${esc(f.name)}">${ico('paperclip', 14)}${esc(f.name)}</a>`);
  return L.concat(F).join('');
}
const safeUrl = u => { u = (u || '').trim(); if (!u) return ''; if (/^(https?:|mailto:)/i.test(u)) return u; if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) return 'https://' + u; return ''; };

/* ---------- State for views + generic bindings ---------- */
const ST = {
  dash: { group: '' },
  tracker: { q: '', area: '', who: '', status: '', month: '', view: 'list', cur: today() },
  cal: { mode: 'month', y: new Date().getFullYear(), m: new Date().getMonth(), ram: true, ms: true, cats: [] },
  proj: { tab: 'tasks', group: '', who: '', zoom: 'day' },
  board: { tab: 'kanban', project: '', group: '', who: '', zoom: 'day', hideDone: false },
  todo: { week: 0, user: null, view: 'board' },
  meet: { sel: null, draft: null },
  team: { tab: 'members' },
};
const setPath = (path, val) => { const ks = path.split('.'); let o = ST; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = val; };

const ACT = {}; // click actions: data-act="name" data-id="..."
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-f]'); if (!el) return;
  setPath(el.dataset.f, el.type === 'checkbox' ? el.checked : el.value);
  render();
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-f-live]'); if (!el) return;
  setPath(el.dataset.fLive, el.value);
  const pos = el.selectionStart; render();
  const n = document.querySelector(`[data-f-live="${el.dataset.fLive}"]`);
  if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } }
});

/* ---------- on-screen keyboard: keep windows and the focused field above it ---------- */
(() => {
  const vv = window.visualViewport; if (!vv) return;
  const root = document.documentElement;
  const sync = () => {
    const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty('--vvh', vv.height + 'px'); root.style.setProperty('--vvt', vv.offsetTop + 'px');
    document.body.classList.toggle('kb-open', kb > 120);
  };
  vv.addEventListener('resize', sync); vv.addEventListener('scroll', sync); sync();
  document.addEventListener('focusin', e => {
    const f = e.target; if (!f.matches || !f.matches('input,textarea,select,[contenteditable]')) return;
    setTimeout(() => { try { f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) { } }, 300);   // after the keyboard has opened
  });
})();
