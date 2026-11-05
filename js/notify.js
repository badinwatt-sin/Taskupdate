'use strict';
/* ============================================================
   Notifications — bell in the top bar
   • Stored notices live in the shared data (S().notices) so every
     device sees them. They are created automatically by comparing
     the data before and after each save (who got a task, who was
     added to a project, new events, offsite logs, tasks finished).
   • Reminders (overdue / due today / event soon) are worked out live.
   • Web Push: the server sends a phone/desktop notification for each
     new notice to every device its recipient switched on.
   ============================================================ */
const NOTICE_MAX = 500, NOTICE_DAYS = 60;

/* ---------- snapshot & diff ---------- */
function snapOf(st) {
  const s = { t: new Map(), e: new Set(), o: new Map(), p: new Map() };
  (st.tasks || []).forEach(t => s.t.set(t.id, { o: [t.assigneeId, t.coId].filter(Boolean), st: t.status }));
  (st.events || []).forEach(e => s.e.add(e.id));
  (st.offsite || []).forEach(o => s.o.set(o.id, [...(o.personIds || [])]));
  (st.projects || []).forEach(p => s.p.set(p.id, [p.pmId, ...(p.squad || [])].filter(Boolean)));
  return s;
}
function takeSnap() { if (Store.state) Store.snap = snapOf(Store.state); }
function noticeDiff() {
  const st = Store.state, me_ = AEX.meId; if (!st || !me_) return;
  const prev = Store.snap; Store.snap = snapOf(st); if (!prev) return;
  st.notices ||= [];
  const name = member(me_)?.name || 'ทีม', out = [], now = Date.now();
  const add = (to, kind, text, sub, ref) => { if (!to || to === me_ || !member(to)) return; out.push({ id: uid('n_'), to, by: me_, kind, text, sub, ref, at: now }); };
  // tasks: newly assigned to someone else / finished
  st.tasks.forEach(t => {
    const pe = prev.t.get(t.id), owners = [t.assigneeId, t.coId].filter(Boolean);
    owners.filter(o => !pe || !pe.o.includes(o)).forEach(o => add(o, 'assign', `${name} มอบหมายงานให้คุณ`, t.title + (t.end || t.start ? ` · ครบ ${fmtD(taskEnd(t))}` : ''), { type: 'task', id: t.id }));
    if (pe && pe.st !== 'done' && t.status === 'done') {
      const p = t.projectId && project(t.projectId);
      [...new Set([t.assignedBy, t.createdBy, p?.pmId, ...owners])].forEach(o => add(o, 'done', `${name} ทำงานเสร็จแล้ว`, t.title, { type: 'task', id: t.id }));
    }
  });
  // events: new ones go to the whole team (bulk imports become one notice)
  const newEv = st.events.filter(e => !prev.e.has(e.id));
  if (newEv.length) st.members.forEach(m => {
    if (newEv.length <= 3) newEv.forEach(e => add(m.id, 'event', `${name} เพิ่ม Event ใหม่`, `${e.name} · ${fmtRange(e.start, e.end)}${e.cat ? ' · ' + catLabel(e.cat) : ''}`, { type: 'event', id: e.id }));
    else add(m.id, 'event', `${name} เพิ่ม ${newEv.length} Event ใหม่ในปฏิทิน`, newEv.slice(0, 3).map(e => e.name).join(', ') + ' …', { type: 'calendar' });
  });
  // offsite: people newly listed on a record
  (st.offsite || []).forEach(o => { const pp = prev.o.get(o.id) || []; (o.personIds || []).filter(x => !pp.includes(x)).forEach(x => add(x, 'offsite', `${name} บันทึก Offsite ที่มีชื่อคุณ`, `${o.title} · ${fmtRange(o.start, o.end)}`, { type: 'offsite', id: o.id })); });
  // projects: people newly added to the squad
  st.projects.forEach(p => { const pp = prev.p.get(p.id) || []; [p.pmId, ...(p.squad || [])].filter(x => x && !pp.includes(x)).forEach(x => add(x, 'project', `${name} เพิ่มคุณเข้า Project`, p.name + (x === p.pmId ? ' · ในฐานะ PM' : ''), { type: 'project', id: p.id })); });
  if (!out.length) return;
  const keep = now - NOTICE_DAYS * 864e5;
  st.notices = st.notices.concat(out.slice(0, 120)).filter(n => n.at > keep).slice(-NOTICE_MAX);
  (Store.notify ||= []).push(...out.slice(0, 120).map(n => n.id));
}

/* ---------- reading ---------- */
const myNotices = () => (S().notices || []).filter(n => n.to === me().id).sort((a, b) => b.at - a.at);
const seenAt = () => (S().noticeSeen || {})[me().id] || 0;
const REMIND_KEY = () => 'aex-remind-' + me().id;
function reminders() {
  const t0 = today(), soon = addDays(t0, 3), mine = visibleTasks().filter(t => isOwner(t, me().id) && isActive(t)), out = [];
  const over = mine.filter(isDelayed), due = mine.filter(t => !isDelayed(t) && taskEnd(t) === t0);
  if (over.length) out.push({ icon: 'alert', tone: 'red', text: `งานเลยกำหนด ${over.length} งาน`, sub: over.slice(0, 3).map(t => t.title).join(', '), go: '#/todo' });
  if (due.length) out.push({ icon: 'clock', tone: 'orange', text: `ครบกำหนดวันนี้ ${due.length} งาน`, sub: due.slice(0, 3).map(t => t.title).join(', '), go: '#/todo' });
  S().events.filter(e => e.status !== 'cancelled' && e.start >= t0 && e.start <= soon && (e.ownerId === me().id || isAdmin())).forEach(e =>
    out.push({ icon: 'calendar', tone: 'blue', text: e.start === t0 ? 'Event วันนี้' : `Event ใน ${diffDays(t0, e.start)} วัน`, sub: e.name, act: () => openEvent(e.id) }));
  return out;
}
function unreadCount() {
  let n = myNotices().filter(x => x.at > seenAt()).length;
  let rd = ''; try { rd = localStorage.getItem(REMIND_KEY()) || ''; } catch (e) { }
  if (rd !== today()) n += reminders().length;
  return n;
}
const timeAgo = ms => {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'เมื่อสักครู่'; if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`; if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} วันที่แล้ว`; const d = new Date(ms); return `${d.getDate()} ${TH_MON[d.getMonth()]}`;
};
const NOTICE_ICO = { assign: 'users', done: 'check', event: 'calendar', offsite: 'inbox', project: 'folder' };

/* ---------- bell ---------- */
let LAST_UNREAD = -1;
function renderBell() {
  const b = $('#bellBtn'); if (!b || !Store.state || !AEX.meId) return;
  const n = unreadCount();
  b.innerHTML = `${ico('bell', 20)}${n ? `<em>${n > 99 ? '99+' : n}</em>` : ''}`;
  b.setAttribute('aria-label', n ? `การแจ้งเตือน ${n} รายการใหม่` : 'การแจ้งเตือน');
  try { if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (e) { }
  if (LAST_UNREAD >= 0 && n > LAST_UNREAD) { const top = myNotices()[0]; if (top && top.at > seenAt()) toast(`🔔 ${top.text}${top.sub ? ' — ' + top.sub : ''}`); }
  LAST_UNREAD = n;
}
function goNotice(ref) {
  if (!ref) return;
  if (ref.type === 'task') { const t = S().tasks.find(x => x.id === ref.id); if (!t) return toast('งานนี้ถูกลบไปแล้ว', 'error'); if (t.projectId) location.hash = '#/projects/' + t.projectId; else location.hash = '#/todo'; setTimeout(() => openTask(t.id), 60); }
  else if (ref.type === 'event') { location.hash = '#/calendar'; setTimeout(() => S().events.find(e => e.id === ref.id) ? openEvent(ref.id) : toast('Event นี้ถูกลบไปแล้ว', 'error'), 60); }
  else if (ref.type === 'calendar') location.hash = '#/calendar';
  else if (ref.type === 'offsite') { location.hash = '#/support'; setTimeout(() => S().offsite.find(o => o.id === ref.id) && openOffsite(ref.id), 60); }
  else if (ref.type === 'project') location.hash = '#/projects/' + ref.id;
}
function openBell() {
  const seen = seenAt(), list = myNotices().slice(0, 60), rem = reminders();
  // mark everything as read
  S().noticeSeen ||= {}; S().noticeSeen[me().id] = Date.now(); try { localStorage.setItem(REMIND_KEY(), today()); } catch (e) { } Store.save();
  modal({
    title: 'การแจ้งเตือน', cls: 'bell-modal',
    body: `<div id="pushCard"></div>
      ${rem.length ? `<h4 class="bell-h">ต้องจัดการ</h4><div class="bell-list">${rem.map((r, i) => `<button type="button" class="bell-it rem tone-${r.tone}" data-rem="${i}"><span class="bi">${ico(r.icon, 17)}</span><div class="grow"><b>${esc(r.text)}</b><small>${esc(r.sub)}</small></div></button>`).join('')}</div>` : ''}
      <h4 class="bell-h">ล่าสุด</h4>
      ${list.length ? `<div class="bell-list">${list.map(n => `<button type="button" class="bell-it ${n.at > seen ? 'new' : ''}" data-n="${n.id}">${avatar(member(n.by), 34)}<div class="grow"><b>${esc(n.text)}</b><small>${esc(n.sub || '')}</small><time>${ico(NOTICE_ICO[n.kind] || 'bell', 12)} ${timeAgo(n.at)}</time></div>${n.at > seen ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>`
        : `<p class="muted small pad center">ยังไม่มีการแจ้งเตือน — เมื่อมีคนมอบหมายงาน เพิ่มคุณเข้า Project หรือเพิ่ม Event ใหม่ จะแจ้งที่นี่</p>`}`,
    actions: [{ label: 'ปิด', cls: 'btn-primary' }],
    onOpen(md) {
      paintPushCard($('#pushCard', md.el));
      md.el.addEventListener('click', e => {
        const r = e.target.closest('[data-rem]'), n = e.target.closest('[data-n]');
        if (r) { const x = rem[+r.dataset.rem]; md.close(); if (x.act) setTimeout(x.act, 60); else location.hash = x.go; }
        if (n) { const x = list.find(y => y.id === n.dataset.n); md.close(); goNotice(x?.ref); }
      });
    },
  });
  renderBell();
}

/* ---------- Web Push (this device) ---------- */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let SW_REG = null;
async function swReady() {
  if (!('serviceWorker' in navigator)) return null;
  if (!SW_REG) { try { SW_REG = await navigator.serviceWorker.register('sw.js'); } catch (e) { return null; } }
  return SW_REG;
}
async function pushState() {
  if (Store.mode !== 'server') return 'local';
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) return isIOS && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await swReady(); const sub = reg && await reg.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}
async function paintPushCard(box) {
  if (!box) return;
  const s = await pushState();
  const msg = {
    local: ['muted', 'การแจ้งเตือนบนเครื่องใช้ได้เมื่อแอปเชื่อมกับเซิร์ฟเวอร์ (bd-teamhub.app)', ''],
    'ios-install': ['warn', 'บน iPhone/iPad: กดปุ่มแชร์ ⎙ → “เพิ่มไปยังหน้าจอโฮม” แล้วเปิด TEAM Hub จากไอคอนบนหน้าจอโฮม จากนั้นกลับมาเปิดการแจ้งเตือนที่นี่ (ต้องใช้ iOS 16.4 ขึ้นไป)', ''],
    unsupported: ['muted', 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push — ลองใช้ Chrome, Edge หรือ Safari รุ่นล่าสุด', ''],
    denied: ['warn', 'การแจ้งเตือนถูกบล็อกไว้ — เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์ (รูปแม่กุญแจข้างช่อง URL) แล้วอนุญาต “การแจ้งเตือน”', ''],
    off: ['', 'รับการแจ้งเตือนบนเครื่องนี้ แม้ไม่ได้เปิดแอปอยู่', `<button type="button" class="btn btn-primary btn-sm" data-push="on">${ico('bell', 14)} เปิดการแจ้งเตือน</button>`],
    on: ['ok', 'เปิดการแจ้งเตือนบนเครื่องนี้แล้ว', `<button type="button" class="btn btn-ghost btn-sm" data-push="test">ทดสอบ</button><button type="button" class="btn btn-ghost btn-sm" data-push="off">ปิด</button>`],
  }[s];
  box.className = 'push-card ' + msg[0];
  box.innerHTML = `<span class="pc-ico">${ico('bell', 18)}</span><div class="grow"><b>แจ้งเตือนบนอุปกรณ์</b><small>${msg[1]}</small></div><div class="pc-acts">${msg[2]}</div>`;
  box.onclick = async e => {
    const b = e.target.closest('[data-push]'); if (!b) return; b.disabled = true;
    try {
      if (b.dataset.push === 'on') await pushOn();
      if (b.dataset.push === 'off') await pushOff();
      if (b.dataset.push === 'test') { const r = await fetch('api/push-test', { method: 'POST', headers: Store.headers(true), body: '{}' }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'ส่งไม่สำเร็จ'); toast('ส่งการแจ้งเตือนทดสอบแล้ว — ดูที่มุมจอ / ศูนย์แจ้งเตือน'); }
    } catch (err) { toast(err.message, 'error'); }
    paintPushCard(box);
  };
}
const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...b].map(c => c.charCodeAt(0))); };
async function pushOn() {
  const perm = await Notification.requestPermission(); if (perm !== 'granted') throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน');
  const reg = await swReady(); if (!reg) throw new Error('เปิด service worker ไม่ได้');
  const k = await fetch('api/push-key', { headers: Store.headers() }).then(r => r.ok ? r.json() : Promise.reject(new Error('เซิร์ฟเวอร์ยังไม่พร้อมส่งการแจ้งเตือน'))).then(j => j.key);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(k) });
  const r = await fetch('api/push-subscribe', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ sub: sub.toJSON(), ua: navigator.userAgent.slice(0, 120) }) });
  if (!r.ok) throw new Error('บันทึกอุปกรณ์ไม่สำเร็จ');
  toast('เปิดการแจ้งเตือนบนเครื่องนี้แล้ว');
}
async function pushOff() {
  const reg = await swReady(), sub = reg && await reg.pushManager.getSubscription(); if (!sub) return;
  await fetch('api/push-unsubscribe', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => { });
  await sub.unsubscribe(); toast('ปิดการแจ้งเตือนบนเครื่องนี้แล้ว');
}
ACT.openBell = () => openBell();
