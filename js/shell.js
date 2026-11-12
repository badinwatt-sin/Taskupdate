'use strict';
/* ============================================================
   App shell extras: mobile tab bar, quick-create sheet, "more" sheet,
   touch-friendly status buttons and small celebrations.
   ============================================================ */
const TH_DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const TABS = TAB_ROUTES.map(k => [k, PAGE[k][0], PAGE[k][2]]);

function renderTabbar(r) {
  const tb = $('#tabbar'); if (!tb) return;
  const inMore = !TABS.some(t => t[0] === r.name), B = todoBuckets(me().id), badge = B.overdue.length;
  tb.innerHTML = TABS.map(([k, l, i]) => `<a href="#/${k}" class="${r.name === k ? 'on' : ''}" ${r.name === k ? 'aria-current="page"' : ''}>${ico(i, 22)}<span>${l}</span>${k === 'todo' && badge ? `<em>${badge}</em>` : ''}</a>`).join('')
    + `<button type="button" class="${inMore ? 'on' : ''}" data-act="moreSheet" aria-label="${ACTION.more[1]}">${ico('menu', 22)}<span>${ACTION.more[0]}</span></button>`;
}

/* ---------- quick create ---------- */
function quickActions() {   // [key, icon, title, subtitle, color, action]
  const mine = visibleProjects().filter(p => inProject(p) || canManageProject(p)), A = ACTION;
  const a = [['task', 'check', A.newTask[0], A.newTask[1], '#007aff', () => openPlanTask()]];
  if (mine.length) a.push(['ptask', 'folder', A.projectTask[0], A.projectTask[1], '#5856d6', () => openTask(newTask('project', { projectId: (mine.find(p => canManageProject(p)) || mine[0]).id }))]);
  if (canAssign()) a.push(['assign', 'users', A.assign[0], A.assign[1], '#ff9500', () => openAssign()]);
  a.push(['off', 'inbox', A.logOffsite[0], A.logOffsite[1], '#34c759', () => openOffsite(null)]);
  if (canManageEvents()) a.push(['event', 'calendar', A.newEvent[0], A.newEvent[1], '#ff2d55', () => openEvent(null)]);
  a.push(['proj', 'layers', A.newProject[0], A.newProject[1], '#af52de', () => openProject(null)]);
  return a;
}
function openQuickCreate() {
  const qa = quickActions();
  modal({
    title: 'New · สร้างอะไรดี?', cls: 'qc-modal',
    body: `<div class="qc-grid">${qa.map(([k, i, t, s, c]) => `<button type="button" class="qc" data-qc="${k}" style="--c:${c}"><span class="qc-ico">${ico(i, 22)}</span><b>${t}</b><small>${s}</small></button>`).join('')}</div>`,
    onOpen(m) { m.el.addEventListener('click', e => { const b = e.target.closest('[data-qc]'); if (!b) return; const fn = qa.find(x => x[0] === b.dataset.qc)[5]; m.close(); setTimeout(fn, 10); }); },
  });
}
/* ---------- one "+" per page: same place on every screen, action depends on the page ---------- */
function pageAdd(r) {
  switch (r.name) {
    case 'dashboard': return { label: 'สร้าง', fn: openQuickCreate };
    case 'todo': {
      const who = ST.todo.user || me().id;
      if (who === me().id) return { label: 'เพิ่มงาน', fn: () => openPlanTask() };
      return canAssign() ? { label: 'มอบหมายงาน', fn: () => openAssign(who) } : null;
    }
    case 'projects': {
      if (r.id) { const p = project(r.id); return p ? { label: 'เพิ่มงาน', fn: () => ACT.newTask({ dataset: { pid: p.id } }) } : null; }
      return { label: 'New Project', fn: () => openProject(null) };
    }
    case 'calendar': return canManageEvents() ? { label: 'เพิ่ม Event', fn: () => openEvent(null) } : null;
    case 'board': { const q = quickActions().find(x => x[0] === 'ptask'); return q ? { label: 'เพิ่มงาน', fn: q[5] } : null; }
    case 'support': return { label: 'บันทึก Offsite', fn: () => openOffsite(null) };
    case 'hub': return { label: 'เขียนโพสต์', fn: () => { const t = $('#hpCompose textarea'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } } };
    case 'pr-master':
    case 'poster': return null;   // the page has its own “เริ่มใหม่”; a floating button would cover the export bar
    case 'team': return isAdmin() ? { label: 'เพิ่มสมาชิก', fn: () => openMember(null) } : null;
  }
  return null;
}
let PAGE_ADD = null;
function renderAdd(r) {
  PAGE_ADD = pageAdd(r);
  const b = $('#addBtn'), f = $('#fab'); if (!b || !f) return;
  b.hidden = f.hidden = !PAGE_ADD;
  if (!PAGE_ADD) return;
  b.innerHTML = `${ico('plus', 16)}<span>${PAGE_ADD.label}</span>`;
  f.innerHTML = `${ico('plus', 22)}<span>${PAGE_ADD.label}</span>`;
  b.title = f.title = PAGE_ADD.label; f.setAttribute('aria-label', PAGE_ADD.label);
}
const runPageAdd = () => { if (PAGE_ADD && !modalStack.length) PAGE_ADD.fn(); };
/* add a task to My Plan (the single way to create your own task) */
function openPlanTask() {
  const off = location.hash.startsWith('#/todo') ? (ST.todo.week || 0) : 0;
  const start = off === 0 ? today() : weekStartOf(off);
  openTask(newTask('personal', { start }), undefined, { title: 'เพิ่มงานใน My Plan' });
}

ACT.quick = el => { const q = quickActions().find(x => x[0] === el.dataset.id); if (q) q[5](); };
ACT.quickCreate = () => openQuickCreate();

/* ---------- "more" sheet (mobile) ---------- */
function openMore() {
  const items = visibleNav().filter(n => !TABS.some(t => t[0] === n[0])), m = me();
  const themeLabel = () => (THEMES.find(x => x[0] === getTheme()) || THEMES[0])[1];
  modal({
    title: ACTION.more[0], cls: 'more-modal',
    body: `<div class="more-user">${avatar(m, 48)}<div><b>${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : isPM() ? 'Project Manager' : isLeader() ? 'หัวหน้าทีม' : 'สมาชิก'} · ${esc(m.position)}</small></div></div>
      <div class="more-list">${items.map(([k, l, th, i]) => `<a href="#/${k}" class="more-it" data-mi="go">${ico(i, 20)}<div><b>${l}</b><small>${th}</small></div>${ico('right', 16)}</a>`).join('')}
      <button type="button" class="more-it" data-mi="theme">${ico('auto', 20)}<div><b>${ACTION.theme[0]}</b><small id="miTheme">${themeLabel()}</small></div><span class="muted small">แตะเพื่อสลับ</span></button>
      <button type="button" class="more-it" data-mi="style">${ico('edit', 20)}<div><b>${ACTION.style[0]}</b><small>${ACTION.style[1]}</small></div>${ico('right', 16)}</button>
      <button type="button" class="more-it" data-mi="account">${ico('lock', 20)}<div><b>${ACTION.account[0]}</b><small>${ACTION.account[1]}</small></div>${ico('right', 16)}</button></div>
      <p class="muted small center mt">TEAM Hub · เวอร์ชัน <b>${esc(Store.version || (Store.mode === 'local' ? 'สาธิต' : '–'))}</b></p>`,
    onOpen(md) {
      md.el.addEventListener('click', e => {
        const b = e.target.closest('[data-mi]'); if (!b) return; const k = b.dataset.mi;
        if (k === 'theme') { cycleTheme(); $('#miTheme', md.el).textContent = themeLabel(); return; }
        md.close();
        if (k === 'account') setTimeout(openAccount, 10);
        if (k === 'style') setTimeout(() => openMyStyle(me().id), 10);
      });
    },
  });
}
ACT.moreSheet = () => openMore();

/* ---------- touch-friendly "next step" button for cards ---------- */
const NEXT_STATUS = { todo: 'doing', doing: 'done' }, PREV_STATUS = { doing: 'todo', done: 'doing' };
const STEP_LBL = { todo: 'To do', doing: 'Doing', done: 'Done' };
const advBtn = t => {
  if (!canStatus(t)) return '';
  const p = PREV_STATUS[t.status], n = NEXT_STATUS[t.status];
  if (!p && !n) return '';
  return `<span class="stepper">${p ? `<button type="button" class="adv adv-back" data-act="stepBack" data-id="${t.id}" title="ย้อนกลับไป ${STEP_LBL[p]}" aria-label="ย้อนกลับไป ${STEP_LBL[p]}">${ico('left', 13)}${STEP_LBL[p]}</button>` : ''}${n ? `<button type="button" class="adv adv-${n}" data-act="advance" data-id="${t.id}" title="เลื่อนไป ${STEP_LBL[n]}" aria-label="เลื่อนไป ${STEP_LBL[n]}">${STEP_LBL[n]}${ico(n === 'done' ? 'check' : 'right', 13)}</button>` : ''}</span>`;
};
ACT.advance = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t && NEXT_STATUS[t.status]) setStatus(t, NEXT_STATUS[t.status]); };
ACT.stepBack = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t && PREV_STATUS[t.status]) setStatus(t, PREV_STATUS[t.status]); };

/* ---------- celebration burst (respects reduced motion) ---------- */
let lastPt = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('pointerdown', e => { lastPt = { x: e.clientX, y: e.clientY }; }, true);
function celebrate(big) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const n = big ? 40 : 16, wrap = document.createElement('div'), cols = ['#007aff', '#34c759', '#ff9500', '#ff2d55', '#af52de', '#5ac8fa', '#ffd60a'];
  wrap.className = 'burst'; wrap.style.left = lastPt.x + 'px'; wrap.style.top = lastPt.y + 'px';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = (big ? 90 : 46) + Math.random() * (big ? 140 : 56);
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    s.style.background = cols[i % cols.length]; s.style.animationDelay = Math.random() * 70 + 'ms';
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap); setTimeout(() => wrap.remove(), 1000);
}

/* ---------- floating “+”: icon-only while scrolling down (covers less), label back when scrolling up ---------- */
(() => {
  let lastY = 0, ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, atEnd = innerHeight + y >= document.documentElement.scrollHeight - 40;
      document.body.classList.toggle('fab-mini', y > 120 && y > lastY && !atEnd);
      lastY = y; ticking = false;
    });
  }, { passive: true });
  addEventListener('hashchange', () => document.body.classList.remove('fab-mini'));
})();
