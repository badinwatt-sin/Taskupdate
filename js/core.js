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
const isOff = s => {
  const st = Store.state.settings;
  return st.weekend.includes(parse(s).getDay()) || st.holidays.some(h => h.date === s);
};
const nextWork = s => { let n = 0; while (isOff(s) && n++ < 400) s = addDays(s, 1); return s; };
function calcEnd(start, dur, mode) {
  dur = Math.max(1, parseInt(dur, 10) || 1);
  if (mode === 'calendar') return addDays(start, dur - 1);
  let s = nextWork(start), n = 1;
  while (n < dur) { s = addDays(s, 1); if (!isOff(s)) n++; }
  return s;
}

/* ---------- Constants ---------- */
const STATUS = {
  todo: { label: 'Not Started', th: 'ยังไม่เริ่ม' },
  doing: { label: 'In Progress', th: 'กำลังทำ' },
  done: { label: 'Done', th: 'เสร็จแล้ว' },
  cancelled: { label: 'Cancelled', th: 'ยกเลิก' },
};
const PRIO = { high: { th: 'สูง' }, med: { th: 'กลาง' }, low: { th: 'ต่ำ' } };
const KINDS = { project: 'งาน Project', ram: 'งานสนับสนุน RAM', personal: 'งานส่วนตัว', meeting: 'จากการประชุม' };
const EV_STATUS = {
  planning: { th: 'วางแผน', cls: 'ev-planning' },
  confirmed: { th: 'ยืนยันแล้ว', cls: 'ev-confirmed' },
  done: { th: 'จัดแล้ว', cls: 'ev-done' },
  cancelled: { th: 'ยกเลิก', cls: 'ev-cancelled' },
};

/* ---------- Store (localStorage, with optional shared server) ---------- */
const LS_KEY = 'aex-hub-v1', LS_ME = 'aex-hub-me';
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
    if (this.mode === 'server') setInterval(() => this.poll(), 10000);
    this.setSync();
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
const visibleTasks = () => S().tasks.filter(t => !t.private || t.assigneeId === me().id);

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
