'use strict';
/* ============================================================
   Agency Experience Team Hub — core: utils, store, domain logic
   ============================================================ */

/* ---------- DOM / string helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const plural = (n, w) => `${n} ${w}`;

/* ---------- Dates (all stored as 'YYYY-MM-DD') ---------- */
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const today = () => iso(new Date());
const fmtD = s => { if (!s) return '–'; const d = parse(s); return `${d.getDate()} ${TH_MON[d.getMonth()]}`; };
const fmtDY = s => { if (!s) return '–'; const d = parse(s); return `${d.getDate()} ${TH_MON[d.getMonth()]} ${d.getFullYear() + 543}`; };
const fmtRange = (a, b) => (!b || a === b) ? fmtD(a) : `${fmtD(a)} – ${fmtD(b)}`;
const fmtRel = s => {
  const n = diffDays(today(), s);
  if (n === 0) return 'วันนี้'; if (n === 1) return 'พรุ่งนี้'; if (n === -1) return 'เมื่อวาน';
  return n > 0 ? `อีก ${n} วัน` : `เกิน ${-n} วัน`;
};
const monthKey = s => s.slice(0, 7);

/* ---------- Working-day calendar ---------- */
/* Thai public holidays (government announcement). 2026 complete; 2027 = fixed-date holidays only,
   lunar-calendar holidays for 2027 must be added by Admin once announced. */
const PUBLIC_MAP = new Map(PUBLIC_HOLIDAYS);
function holidayOf(s) {
  const st = Store.state.settings;
  if (st.usePublicHolidays !== false && PUBLIC_MAP.has(s)) return { name: PUBLIC_MAP.get(s), kind: 'public' };
  const h = st.holidays.find(x => x.date === s); return h ? { name: h.name, kind: 'company' } : null;
}
const isOff = s => Store.state.settings.weekend.includes(parse(s).getDay()) || !!holidayOf(s);
const nextWork = s => { let n = 0; while (isOff(s) && n++ < 400) s = addDays(s, 1); return s; };
function calcEnd(start, dur, mode) {
  dur = Math.max(1, parseInt(dur, 10) || 1);
  if (mode === 'calendar') return addDays(start, dur - 1);
  let s = nextWork(start), n = 1;
  while (n < dur) { s = addDays(s, 1); if (!isOff(s)) n++; }
  return s;
}

const prevWork = s => { let n = 0; while (isOff(s) && n++ < 400) s = addDays(s, -1); return s; };
function calcStart(end, dur, mode) {
  dur = Math.max(1, parseInt(dur, 10) || 1);
  if (mode === 'calendar') return addDays(end, -(dur - 1));
  let s = prevWork(end), n = 1;
  while (n < dur) { s = addDays(s, -1); if (!isOff(s)) n++; }
  return s;
}
function countDays(start, end, mode) {
  if (end < start) return 0;
  if (mode === 'calendar') return diffDays(start, end) + 1;
  let n = 0, d = start; while (d <= end && n < 5000) { if (!isOff(d)) n++; d = addDays(d, 1); } return Math.max(n, 1);
}

/* ---------- Constants ---------- */
const OFFSITE_AREAS = [
  { type: 'DCAO', label: 'DCAO', items: [1, 2, 3, 4].map(n => 'DCAO' + n) },
  { type: 'RAM', label: 'RAM', items: Array.from({ length: 10 }, (_, i) => 'RAM' + pad(i + 1)) },
  { type: 'OTHER', label: 'อื่น ๆ (ระบุ)', items: [] },
];
const STATUS = {
  todo: { label: 'Not Started', th: 'ยังไม่เริ่ม' },
  doing: { label: 'In Progress', th: 'กำลังทำ' },
  done: { label: 'Done', th: 'เสร็จแล้ว' },
  cancelled: { label: 'Cancelled', th: 'ยกเลิก' },
};
const PRIO = { high: { th: 'สูง' }, med: { th: 'กลาง' }, low: { th: 'ต่ำ' } };
const KINDS = { project: 'งาน Project', ram: 'งานสนับสนุน RAM', personal: 'ไม่ผูก Project', meeting: 'จากการประชุม', assigned: 'งานที่มอบหมาย' };
/* Event categories (business line) */
const EV_CATS = [['agency', 'Agency', '#007aff'], ['banca', 'Banca', '#ff9500'], ['cs', 'CS', '#34c759'], ['academy', 'Academy', '#af52de'], ['company', 'Company', '#5a6375']];
const catOf = k => EV_CATS.find(c => c[0] === k);
const catLabel = k => catOf(k)?.[1] || '';
const catTag = k => { const c = catOf(k); return c ? `<span class="cat-tag" style="--cc:${c[2]}">${c[1]}</span>` : ''; };
/* keyword → category, used by the Excel import */
function catFromText(t) {
  t = String(t || '').toLowerCase(); if (!t) return '';
  if (/agency|เอเจนซี่|เอเจนซี|ตัวแทน/.test(t)) return 'agency';
  if (/banca|แบงก์|แบงค์|ธนาคาร|bank/.test(t)) return 'banca';
  if (/\bcs\b|customer service|บริการลูกค้า|ลูกค้าสัมพันธ์/.test(t)) return 'cs';
  if (/academy|อะคาเดมี|อบรม|training/.test(t)) return 'academy';
  if (/company|บริษัท|องค์กร|corporate/.test(t)) return 'company';
  return '';
}
const EV_STATUS = {
  planning: { th: 'วางแผน', cls: 'ev-planning' },
  confirmed: { th: 'ยืนยันแล้ว', cls: 'ev-confirmed' },
  done: { th: 'จัดแล้ว', cls: 'ev-done' },
  cancelled: { th: 'ยกเลิก', cls: 'ev-cancelled' },
};

/* ---------- Store (localStorage, with optional shared server) ---------- */
const LS_KEY = 'aex-hub-v2', LS_ME = 'aex-hub-me';
const Store = {
  state: null, mode: 'local', rev: 0, pending: false, timer: null, token: null, hasState: true,
  headers(json) { const h = this.token ? { Authorization: 'Bearer ' + this.token } : {}; if (json) h['Content-Type'] = 'application/json'; return h; },
  /* 1) is there a TEAM Hub server behind this page? */
  async detect() {
    try {
      const r = await fetch('api/ping', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) { const j = await r.json(); this.mode = 'server'; this.hasState = j.hasState; this.configured = j.configured !== false; this.recovery = !!j.recovery; this.version = j.version || ''; return; }
    } catch (e) {   // the network failed — this is not static hosting: say so instead of silently opening demo data
      if (location.protocol.startsWith('http') && !/^(localhost|127\.)/.test(location.hostname) && navigator.onLine === false) { this.offline = true; }
      else if (location.protocol.startsWith('http') && e && e.name === 'TypeError' && !/github\.io$/.test(location.hostname)) { this.offline = true; }
    }
    this.mode = 'local';
  },
  /* 2) load data (server: needs a valid login token) */
  async loadState() {
    let loaded = false;
    if (this.mode === 'server') {
      const r = await fetch('api/state', { cache: 'no-store', headers: this.headers() });
      if (r.status === 401) throw new Error('unauthorized');
      const j = await r.json(); this.rev = j.rev || 0;
      if (j.state) { this.state = j.state; loaded = true; }
    } else {
      try { const raw = localStorage.getItem(LS_KEY); if (raw) { this.state = JSON.parse(raw); loaded = true; } } catch (e) { }
    }
    if (!loaded) { this.state = seed(); if (this.mode === 'server') await this.push(true); else this.save(); }
    this.snap = null;   // the first save after load only records the baseline
    this.migrate();
    if (this.mode === 'server') { clearInterval(this.pollT); this.pollT = setInterval(() => { if (!document.hidden) this.poll(); }, 90000); }   // free-tier friendly: one small request every 90 s while the app is on screen
    this.setSync();
    if (!this.hooked) {
      this.hooked = true;
      document.addEventListener('visibilitychange', () => { if (!document.hidden && this.mode === 'server') this.poll(); });
      addEventListener('online', () => { if (this.mode === 'server' && this.pending) this.push(); });
      addEventListener('pagehide', () => { if (this.pending && this.mode === 'server' && this.token) { try { fetch('api/state', { method: 'PUT', keepalive: true, headers: this.headers(true), body: JSON.stringify({ state: this.state }) }); } catch (e) { } } });
    }
  },
  /* server mode, first ever start: create the shared dataset (allowed once, before any login exists) */
  async bootstrap() { this.state = seed(); this.migrate(); await this.push(true); this.hasState = true; },
  migrate() {
    const st = this.state; st.projects.forEach(p => { p.taskGroups ||= []; }); st.offsite ||= []; st.settings.eventEditors ||= []; st.meetings ||= []; st.events ||= []; st.notices ||= []; st.noticeSeen ||= {};
    if (this.mode === 'local') { st.auth ||= { defaultPassword: 'welcome1', pw: {} }; st.posts ||= []; }   // demo mode keeps Hub Post in the local state   // demo-only: server mode keeps passwords out of the shared data
    else delete st.auth;
  },
  save() {
    if (window.noticeDiff) noticeDiff();   // create notifications from what changed since the last save
    if (this.mode === 'local') { try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch (e) { toast('พื้นที่จัดเก็บในเบราว์เซอร์เต็ม — ลองลบไฟล์แนบขนาดใหญ่', 'error'); } }
    if (this.mode === 'server') { this.pending = true; this.setSync(); clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 500); }
  },
  async push(first) {
    try {
      const notify = (this.notify || []).splice(0);
      const r = await fetch('api/state', { method: 'PUT', headers: this.headers(true), body: JSON.stringify({ state: this.state, notify }) });
      if (r.status === 401) return Auth.expired();
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'save failed'); this.rev = j.rev; if (j.initialPassword) this.initialPassword = j.initialPassword; this.pending = false; this.setSync();
      if (this.fails) { this.fails = 0; toast('บันทึกข้อมูลที่ค้างไว้เรียบร้อยแล้ว'); }
    } catch (e) {   // keep the change on this device and retry with back-off; tell the user once (the sync label is hidden on phones)
      this.fails = (this.fails || 0) + 1; this.setSync('err');
      if (this.fails === 1 && window.toast) toast('บันทึกไม่สำเร็จ — ข้อมูลยังอยู่ในเครื่องนี้ ระบบจะลองบันทึกใหม่อัตโนมัติ', 'error');
      clearTimeout(this.retryT); this.retryT = setTimeout(() => { if (this.pending) this.push(); }, Math.min(30000, 2000 * 2 ** (this.fails - 1)));
    }
  },
  async poll() {
    if (this.pending || !this.token) return;
    try {
      const r = await fetch('api/state?rev=' + this.rev, { cache: 'no-store', headers: this.headers() });
      const pv = r.headers.get('X-Posts-Ver'); if (pv != null && window.hpNotice) hpNotice(pv);   // new Hub Posts? (no extra request)
      if (r.status === 304) return; if (r.status === 401) return Auth.expired();
      const j = await r.json();
      if (j.state && j.rev !== this.rev) { this.rev = j.rev; this.state = j.state; this.migrate(); if (window.takeSnap) takeSnap(); AEX.onRemote && AEX.onRemote(); }
    } catch (e) { this.setSync('err'); }
  },
  setSync(err) {
    const el = document.getElementById('sync'); if (!el) return;
    if (err) { el.className = 'sync err'; el.textContent = this.pending ? 'ยังบันทึกไม่สำเร็จ — กำลังลองใหม่' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'; return; }
    el.className = 'sync ' + (this.mode === 'server' ? 'ok' : 'local');
    el.textContent = this.mode === 'server' ? (this.pending ? 'กำลังบันทึก…' : 'ซิงค์กับทีมแล้ว') : 'โหมดสาธิต (ในเบราว์เซอร์)';
    el.title = this.mode === 'server' ? 'ข้อมูลใช้ร่วมกันทั้งทีมผ่านเซิร์ฟเวอร์' : 'รัน "node server.js" เพื่อแชร์ข้อมูลและใช้การล็อกอินจริง';
  },
};
const AEX = { meId: null, onRemote: null };
const S = () => Store.state;

/* ---------- Domain accessors ---------- */
const member = id => S().members.find(m => m.id === id);
const project = id => S().projects.find(p => p.id === id);
const group = id => S().groups.find(g => g.id === id) || { id, name: id, short: id, color: '#64748b' };
const me = () => member(AEX.meId) || S().members[0];
const isAdmin = () => me().role === 'admin';
const isPM = () => S().projects.some(p => p.pmId === me().id);

const taskMode = t => { const p = t.projectId && project(t.projectId); return (p && p.dayMode) || S().settings.dayMode; };
const taskStart = t => taskMode(t) === 'working' ? nextWork(t.start) : t.start;
const taskEnd = t => calcEnd(t.start, t.duration, taskMode(t));
const isActive = t => t.status === 'todo' || t.status === 'doing';
const isDelayed = t => isActive(t) && taskEnd(t) < today();   // เลยกำหนด: past its Target date and not done (a date fact, not a progress judgement)
const OVERDUE_TIP = 'เลยกำหนด = เลยวัน Target แล้วแต่งานยังไม่เสร็จ';
const BEHIND_TIP = 'ช้ากว่าแผน = สัดส่วนงานที่เสร็จน้อยกว่าที่ควรเป็น ณ วันนี้ของสัปดาห์ (ยังไม่จำเป็นต้องเลยกำหนด)';
/* who can see a task — mirrors taskVisible(): private → owner only; post-it → everyone; project → project members (+ their leaders, Admin); other → owner, their leaders and Admin */
function taskAudience(t) {
  if (t.private) return { key: 'me', label: 'เฉพาะฉัน', icon: 'lock', tip: 'ไม่แสดงในหน้าจอของคนอื่น (รวมถึง Admin) — แสดงเฉพาะเจ้าของงาน' };
  if (t.projectId) return { key: 'project', label: 'ทีม Project เห็นได้', icon: 'users', tip: 'สมาชิก Project, หัวหน้าของผู้รับผิดชอบ และ Admin เห็นได้' };
  if (isPostit(t)) return { key: 'team', label: 'ทีมเห็นได้', icon: 'users', tip: 'ขึ้นเป็น Post-it ของทีม — ทุกคนในทีมเห็นได้' };
  return { key: 'lead', label: 'หัวหน้าเห็นได้', icon: 'users', tip: 'ผู้รับผิดชอบ, หัวหน้าของผู้รับผิดชอบ และ Admin เห็นได้' };
}
const audienceChip = t => { const a = taskAudience(t); return `<span class="aud aud-${a.key}" title="${a.tip}">${ico(a.icon, 12)}<span>${a.label}</span></span>`; };
/* ----- Visibility scope: Admin = everyone · Leader = self + direct/indirect reports · Staff = self.
   Everyone also sees tasks of projects they belong to, and team post-its. ----- */
function subordinates(id, acc = new Set()) {
  S().members.filter(m => m.managerId === id).forEach(m => { if (!acc.has(m.id) && m.id !== id) { acc.add(m.id); subordinates(m.id, acc); } });
  return acc;
}
const myScope = () => { if (isAdmin()) return null; const s = subordinates(me().id); s.add(me().id); return s; };
const inScope = id => { const s = myScope(); return !s || s.has(id); };
const scopeMembers = () => S().members.filter(m => inScope(m.id));
/* who can I assign work to? Admin -> everyone, Leader -> own reports, Staff -> nobody else */
const canAssign = () => isAdmin() || subordinates(me().id).size > 0;
const assignablePeople = () => isAdmin() ? S().members : S().members.filter(m => subordinates(me().id).has(m.id));
/* ----- project task groups (phases / work streams) ----- */
const TYPE_COLORS = ['#5856d6', '#ff2d92', '#ff9500', '#34c759', '#007aff', '#8e8e93'];
function groupTasks(tasks, p, by, keepEmpty) {
  if (!p || by === 'none') return [{ key: '', name: null, color: '', tasks }];
  let defs;
  if (by === 'group') defs = (p.taskGroups || []).map(g => ({ key: g.id, name: g.name, color: g.color })).concat([{ key: '', name: 'ไม่ระบุกลุ่มงาน', color: '#a1a1aa', soft: true }]);
  else if (by === 'type') defs = S().settings.types.map((t, i) => ({ key: t, name: t, color: TYPE_COLORS[i % TYPE_COLORS.length] })).concat([{ key: '', name: 'ไม่ระบุประเภท', color: '#a1a1aa', soft: true }]);
  else defs = [...new Set([p.pmId, ...p.squad])].map(id => ({ key: id, name: member(id)?.name || '–', color: group(member(id)?.group).color })).concat([{ key: '', name: 'ยังไม่ระบุผู้รับผิดชอบ', color: '#a1a1aa', soft: true }]);
  const keyOf = t => by === 'group' ? (t.groupId || '') : by === 'type' ? (t.type || '') : (t.assigneeId || '');
  const known = new Set(defs.map(d => d.key)); defs.forEach(d => { d.tasks = []; });
  tasks.forEach(t => { let k = keyOf(t); if (!known.has(k)) k = ''; defs.find(d => d.key === k).tasks.push(t); });
  return defs.filter(d => d.tasks.length || (keepEmpty && !d.soft));
}
const projGroupOf = t => (project(t.projectId)?.taskGroups || []).find(g => g.id === t.groupId);
const isLeader = () => !isAdmin() && subordinates(me().id).size > 0;
const inProject = p => isAdmin() || p.pmId === me().id || p.squad.includes(me().id);
const visibleProjects = () => S().projects.filter(p => inProject(p) || (myScope() && [p.pmId, ...p.squad].some(inScope)));
const isPostit = t => !t.projectId && t.source !== 'ram' && !t.private && t.status !== 'cancelled';   // auto: no Submit step — mark a task private to keep it off the board
function taskVisible(t) {
  if (t.private && t.assigneeId !== me().id) return false;
  if (isAdmin() || inScope(t.assigneeId) || (t.coId && inScope(t.coId)) || isPostit(t)) return true;
  const p = t.projectId && project(t.projectId); return !!(p && inProject(p));
}
const visibleTasks = () => S().tasks.filter(taskVisible);

function canFullEdit(t) {
  if (isAdmin()) return !t.private || t.assigneeId === me().id;
  const p = t.projectId && project(t.projectId);
  if (p && p.pmId === me().id) return true;
  if (t.source === 'personal') return t.assigneeId === me().id;
  return t.createdBy === me().id;
}
const owners = t => [t.assigneeId, t.coId].filter(Boolean);   // up to 2 people per task (main + co-owner)
const isOwner = (t, id) => t.assigneeId === id || t.coId === id;
const canStatus = t => canFullEdit(t) || isOwner(t, me().id);
const canManageProject = p => isAdmin() || p.pmId === me().id;

/* Dependencies that could affect this task */
function depRisks(t) {
  if (!isActive(t)) return [];
  const start = taskStart(t);
  return (t.deps || []).map(id => S().tasks.find(x => x.id === id)).filter(d => d && isActive(d) && (isDelayed(d) || taskEnd(d) >= start));
}

/* Push successors after predecessors (never pulls earlier). Returns # changed. */
function reschedule(projectId) {
  const tasks = S().tasks.filter(t => t.projectId === projectId && isActive(t));
  const all = S().tasks;
  let changed = 0;
  for (let pass = 0; pass < tasks.length + 1; pass++) {
    let moved = false;
    for (const t of tasks) {
      if (!(t.deps || []).length) continue;
      let latest = null;
      for (const id of t.deps) {
        const d = all.find(x => x.id === id); if (!d || d.status === 'cancelled') continue;
        let e = taskEnd(d);
        if (isActive(d) && e < today()) e = today(); // assume late work finishes today at the earliest
        if (!latest || e > latest) latest = e;
      }
      if (!latest) continue;
      if (taskStart(t) <= latest) {
        let ns = addDays(latest, 1); if (taskMode(t) === 'working') ns = nextWork(ns);
        t.start = ns; moved = true; changed++;
      }
    }
    if (!moved) break;
  }
  return changed;
}

function projectStats(p) {
  const ts = S().tasks.filter(t => t.projectId === p.id && t.status !== 'cancelled');
  const done = ts.filter(t => t.status === 'done').length;
  const delayed = ts.filter(isDelayed).length;
  let start = null, end = null;
  ts.forEach(t => { const a = taskStart(t), b = taskEnd(t); if (!start || a < start) start = a; if (!end || b > end) end = b; });
  return { total: ts.length, done, delayed, pct: ts.length ? Math.round(done / ts.length * 100) : 0, start: start || p.start, end, unplanned: !ts.length };
}

function workload(mid) {
  const ts = visibleTasks().filter(t => isOwner(t, mid) && isActive(t));
  const t0 = today(), t14 = addDays(t0, 14);
  const next = ts.slice().sort((a, b) => taskEnd(a).localeCompare(taskEnd(b)))[0];
  return {
    active: ts.length, doing: ts.filter(t => t.status === 'doing'), delayed: ts.filter(isDelayed).length,
    soon: ts.filter(t => taskEnd(t) <= t14).length, next,
    level: ts.length >= 6 ? 'high' : ts.length >= 3 ? 'ok' : 'low',
  };
}

/* ---------- Misc helpers ---------- */
function downloadBlob(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function downloadCSV(name, rows) {
  const q = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n');
  downloadBlob(name, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}
const initials = m => m ? m.name.slice(0, 2) : '?';
const tasksOf = f => visibleTasks().filter(f);
const sortBy = (arr, fn) => arr.slice().sort((a, b) => { const x = fn(a), y = fn(b); return x < y ? -1 : x > y ? 1 : 0; });
