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
  const a = [['task', 'check', A.newTask[0], A.newTask[1], '#007aff', () => openTask(newTask('personal'))]];
  if (mine.length) a.push(['ptask', 'folder', A.projectTask[0], A.projectTask[1], '#5856d6', () => openTask(newTask('project', { projectId: (mine.find(p => canManageProject(p)) || mine[0]).id }))]);
  if (canAssign()) a.push(['assign', 'users', A.assign[0], A.assign[1], '#ff9500', () => openAssign()]);
  a.push(['off', 'inbox', A.logOffsite[0], A.logOffsite[1], '#34c759', () => openOffsite(null)]);
  if (canManageEvents()) a.push(['event', 'calendar', A.newEvent[0], A.newEvent[1], '#ff2d55', () => openEvent(null)]);
  if (isAdmin() || isPM()) a.push(['proj', 'layers', A.newProject[0], A.newProject[1], '#af52de', () => openProject(null)]);
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
ACT.quick = el => { const q = quickActions().find(x => x[0] === el.dataset.id); if (q) q[5](); };
ACT.quickCreate = () => openQuickCreate();

/* ---------- "more" sheet (mobile) ---------- */
function openMore() {
  const items = NAV.filter(n => !TABS.some(t => t[0] === n[0])), m = me();
  const themeLabel = () => (THEMES.find(x => x[0] === getTheme()) || THEMES[0])[1];
  modal({
    title: ACTION.more[0], cls: 'more-modal',
    body: `<div class="more-user">${avatar(m, 48)}<div><b>${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : isPM() ? 'Project Manager' : isLeader() ? 'หัวหน้าทีม' : 'สมาชิก'} · ${esc(m.position)}</small></div></div>
      <div class="more-list">${items.map(([k, l, th, i]) => `<a href="#/${k}" class="more-it" data-mi="go">${ico(i, 20)}<div><b>${l}</b><small>${th}</small></div>${ico('right', 16)}</a>`).join('')}
      <button type="button" class="more-it" data-mi="search">${ico('search', 20)}<div><b>${ACTION.search[0]}</b><small>${ACTION.search[1]}</small></div>${ico('right', 16)}</button>
      <button type="button" class="more-it" data-mi="theme">${ico('auto', 20)}<div><b>${ACTION.theme[0]}</b><small id="miTheme">${themeLabel()}</small></div><span class="muted small">แตะเพื่อสลับ</span></button>
      <button type="button" class="more-it" data-mi="style">${ico('edit', 20)}<div><b>${ACTION.style[0]}</b><small>${ACTION.style[1]}</small></div>${ico('right', 16)}</button>
      <button type="button" class="more-it" data-mi="account">${ico('lock', 20)}<div><b>${ACTION.account[0]}</b><small>${ACTION.account[1]}</small></div>${ico('right', 16)}</button></div>`,
    onOpen(md) {
      md.el.addEventListener('click', e => {
        const b = e.target.closest('[data-mi]'); if (!b) return; const k = b.dataset.mi;
        if (k === 'theme') { cycleTheme(); $('#miTheme', md.el).textContent = themeLabel(); return; }
        md.close();
        if (k === 'search') setTimeout(openSearch, 10);
        if (k === 'account') setTimeout(openAccount, 10);
        if (k === 'style') setTimeout(() => openMyStyle(me().id), 10);
      });
    },
  });
}
ACT.moreSheet = () => openMore();

/* ---------- touch-friendly "next step" button for cards ---------- */
const NEXT_STATUS = { todo: 'doing', doing: 'done' };
const advBtn = t => (canStatus(t) && NEXT_STATUS[t.status])
  ? `<button type="button" class="adv adv-${t.status}" data-act="advance" data-id="${t.id}" title="${t.status === 'todo' ? 'เริ่มทำงานนี้' : 'ทำเครื่องหมายว่าเสร็จ'}">${t.status === 'todo' ? ico('right', 13) + 'เริ่มทำ' : ico('check', 13) + 'เสร็จ'}</button>` : '';
ACT.advance = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t && NEXT_STATUS[t.status]) setStatus(t, NEXT_STATUS[t.status]); };

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
