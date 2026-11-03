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
const PUBLIC_HOLIDAYS = [
  ['2026-01-01', 'วันขึ้นปีใหม่'], ['2026-03-03', 'วันมาฆบูชา'], ['2026-04-06', 'วันจักรี'], ['2026-04-13', 'วันสงกรานต์'], ['2026-04-14', 'วันสงกรานต์'], ['2026-04-15', 'วันสงกรานต์'],
  ['2026-05-01', 'วันแรงงานแห่งชาติ'], ['2026-05-04', 'วันฉัตรมงคล'], ['2026-06-01', 'ชดเชยวันวิสาขบูชา'], ['2026-06-03', 'วันเฉลิมฯ สมเด็จพระราชินี'],
  ['2026-07-28', 'วันเฉลิมฯ พระบาทสมเด็จพระเจ้าอยู่หัว'], ['2026-07-29', 'วันอาสาฬหบูชา'], ['2026-07-30', 'วันเข้าพรรษา'], ['2026-08-12', 'วันแม่แห่งชาติ'],
  ['2026-10-13', 'วันนวมินทรมหาราช'], ['2026-10-23', 'วันปิยมหาราช'], ['2026-12-07', 'ชดเชยวันพ่อแห่งชาติ'], ['2026-12-10', 'วันรัฐธรรมนูญ'], ['2026-12-31', 'วันสิ้นปี'],
  ['2027-01-01', 'วันขึ้นปีใหม่'], ['2027-04-06', 'วันจักรี'], ['2027-04-13', 'วันสงกรานต์'], ['2027-04-14', 'วันสงกรานต์'], ['2027-04-15', 'วันสงกรานต์'],
  ['2027-05-03', 'ชดเชยวันแรงงานแห่งชาติ'], ['2027-05-04', 'วันฉัตรมงคล'], ['2027-06-03', 'วันเฉลิมฯ สมเด็จพระราชินี'], ['2027-07-28', 'วันเฉลิมฯ พระบาทสมเด็จพระเจ้าอยู่หัว'],
  ['2027-08-12', 'วันแม่แห่งชาติ'], ['2027-10-13', 'วันนวมินทรมหาราช'], ['2027-10-25', 'ชดเชยวันปิยมหาราช'], ['2027-12-06', 'ชดเชยวันพ่อแห่งชาติ'], ['2027-12-10', 'วันรัฐธรรมนูญ'], ['2027-12-31', 'วันสิ้นปี'],
];
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
const KINDS = { project: 'งาน Project', ram: 'งานสนับสนุน RAM', personal: 'งานส่วนตัว', meeting: 'จากการประชุม', assigned: 'งานที่มอบหมาย' };
const EV_STATUS = {
  planning: { th: 'วางแผน', cls: 'ev-planning' },
  confirmed: { th: 'ยืนยันแล้ว', cls: 'ev-confirmed' },
  done: { th: 'จัดแล้ว', cls: 'ev-done' },
  cancelled: { th: 'ยกเลิก', cls: 'ev-cancelled' },
};

/* ---------- Store (localStorage, with optional shared server) ---------- */
const LS_KEY = 'aex-hub-v2', LS_ME = 'aex-hub-me';
const Store = {
  state: null, mode: 'local', rev: 0, pending: false, timer: null,
  async init() {
    let loaded = false;
    try {
      const r = await fetch('api/state', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
        const j = await r.json();
        this.mode = 'server'; this.rev = j.rev || 0;
        if (j.state) { this.state = j.state; loaded = true; }
      }
    } catch (e) { /* static hosting / file:// → local mode */ }
    if (!loaded && this.mode !== 'server') {
      try { const raw = localStorage.getItem(LS_KEY); if (raw) { this.state = JSON.parse(raw); loaded = true; } } catch (e) { }
    }
    if (!loaded) { this.state = seed(); this.save(); }
    const st = this.state; st.offsite ||= []; st.settings.eventEditors ||= []; st.meetings ||= []; st.events ||= [];
    if (this.mode === 'server') setInterval(() => this.poll(), 10000);
    this.setSync();
    addEventListener('pagehide', () => { if (this.pending && this.mode === 'server') { try { fetch('api/state', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: this.state }) }); } catch (e) { } } });
  },
  save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); }
    catch (e) { toast('พื้นที่จัดเก็บในเบราว์เซอร์เต็ม — ลองลบไฟล์แนบขนาดใหญ่', 'error'); }
    if (this.mode === 'server') { this.pending = true; this.setSync(); clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 500); }
  },
  async push() {
    try {
      const r = await fetch('api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: this.state }) });
      const j = await r.json(); this.rev = j.rev; this.pending = false; this.setSync();
    } catch (e) { this.setSync('err'); }
  },
  async poll() {
    if (this.pending) return;
    try {
      const r = await fetch('api/state?rev=' + this.rev, { cache: 'no-store' });
      if (r.status === 304) return;
      const j = await r.json();
      if (j.state && j.rev !== this.rev) { this.rev = j.rev; this.state = j.state; AEX.onRemote && AEX.onRemote(); }
    } catch (e) { this.setSync('err'); }
  },
  setSync(err) {
    const el = document.getElementById('sync'); if (!el) return;
    if (err) { el.className = 'sync err'; el.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'; return; }
    el.className = 'sync ' + (this.mode === 'server' ? 'ok' : 'local');
    el.textContent = this.mode === 'server' ? (this.pending ? 'กำลังบันทึก…' : 'ซิงค์กับทีมแล้ว') : 'เก็บในเบราว์เซอร์นี้';
    el.title = this.mode === 'server' ? 'ข้อมูลใช้ร่วมกันทั้งทีมผ่านเซิร์ฟเวอร์' : 'รัน "node server.js" เพื่อแชร์ข้อมูลร่วมกันทั้งทีม';
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
const isDelayed = t => isActive(t) && taskEnd(t) < today();
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
const isLeader = () => !isAdmin() && subordinates(me().id).size > 0;
const inProject = p => isAdmin() || p.pmId === me().id || p.squad.includes(me().id);
const visibleProjects = () => S().projects.filter(p => inProject(p) || (myScope() && [p.pmId, ...p.squad].some(inScope)));
const isPostit = t => t.submitted && !t.projectId && t.source !== 'ram' && !t.private;
function taskVisible(t) {
  if (t.private && t.assigneeId !== me().id) return false;
  if (isAdmin() || inScope(t.assigneeId) || isPostit(t)) return true;
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
const canStatus = t => canFullEdit(t) || t.assigneeId === me().id;
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
  return { total: ts.length, done, delayed, pct: ts.length ? Math.round(done / ts.length * 100) : 0, start: start || p.start, end };
}

function workload(mid) {
  const ts = visibleTasks().filter(t => t.assigneeId === mid && isActive(t));
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
