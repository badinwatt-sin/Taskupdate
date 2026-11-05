'use strict';
/* ============================================================
   Views: Home · Offsite · Calendar
   ============================================================ */
const V = {};

/* ---------- shared: stacked segment list ---------- */
function aggregate(tasks, keyFn, labelFn) {
  const map = new Map();
  tasks.forEach(t => {
    const k = keyFn(t); if (k == null || k === '') return;
    const r = map.get(k) || { key: k, label: labelFn ? labelFn(k) : k, done: 0, active: 0, delayed: 0, cancelled: 0 };
    if (t.status === 'done') r.done++; else if (t.status === 'cancelled') r.cancelled++; else if (isDelayed(t)) r.delayed++; else r.active++;
    map.set(k, r);
  });
  return [...map.values()].sort((a, b) => (b.done + b.active + b.delayed) - (a.done + a.active + a.delayed));
}
function segList(rows, emptyMsg = 'ยังไม่มีข้อมูล') {
  if (!rows.length) return `<p class="muted small pad">${emptyMsg}</p>`;
  const max = Math.max(...rows.map(r => r.done + r.active + r.delayed), 1);
  return `<ul class="seglist">${rows.map(r => {
    const tot = r.done + r.active + r.delayed, w = v => (v / max * 100).toFixed(1);
    return `<li><span class="lbl" title="${esc(r.label)}">${esc(r.label)}</span>
      <span class="seg"><i class="d" style="width:${w(r.done)}%"></i><i class="a" style="width:${w(r.active)}%"></i><i class="x" style="width:${w(r.delayed)}%"></i></span>
      <b>${tot}</b></li>`;
  }).join('')}</ul>`;
}

/* ============================ DASHBOARD ============================ */
/* Admin → whole team · Leader → self + reports · Staff → own work + own projects. Events are visible to everyone. */
V.dashboard = root => {
  const f = ST.dash, t0 = today(), m = me(), now = new Date();
  const team = scopeMembers().length > 1;
  const scope = scopeMembers().filter(x => !f.group || x.group === f.group), ids = new Set(scope.map(x => x.id));
  const live = visibleTasks().filter(t => ids.has(t.assigneeId) && t.status !== 'cancelled');
  /* ---- me ---- */
  const mine = visibleTasks().filter(t => isOwner(t, m.id) && t.status !== 'cancelled');
  const ws = weekStartOf(0), we = addDays(ws, 6);
  const myWeek = [...new Set(mine.filter(t => taskStart(t) <= we && taskEnd(t) >= ws).concat(mine.filter(t => isActive(t) && taskEnd(t) < ws)))];
  const H = weekHealth(myWeek, 0), hLabel = { green: 'ตามแผน', yellow: 'ต้องระวัง', red: 'ล่าช้า', none: 'ยังไม่มีแผน' }[H.level];
  const focus = sortBy(mine.filter(t => isActive(t) && taskStart(t) <= t0), t => taskEnd(t));
  const doneToday = mine.filter(t => t.status === 'done' && t.doneAt === t0);
  const overdue = mine.filter(isDelayed).length;
  const hr = now.getHours(), greet = hr < 12 ? 'สวัสดีตอนเช้า' : hr < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const evs = sortBy(S().events.filter(e => e.status !== 'cancelled' && e.end >= t0), e => e.start), nextEv = evs[0];
  const upcoming = sortBy([
    ...evs.slice(nextEv ? 1 : 0).map(e => ({ act: 'openEvent', id: e.id, d: e.start, title: e.name, sub: 'Event' + (e.venue ? ' · ' + e.venue : ''), alt: false })),
    ...S().offsite.filter(o => o.end >= t0).map(o => ({ act: 'openOffsite', id: o.id, d: o.start, title: o.title, sub: `${offArea(o)} · ${offNames(o)}`, alt: true })),
  ], x => x.d).slice(0, 4);

  const focusRow = t => { const p = t.projectId && project(t.projectId), done = t.status === 'done';
    return `<li class="${done ? 'is-done' : ''}"><button class="tick ${done ? 'on' : ''}" data-act="toggleDone" data-id="${t.id}" aria-label="${done ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ'}" ${canStatus(t) ? '' : 'disabled'}>${done ? ico('check', 14) : ''}</button>
      <div class="grow clickable" data-act="openTask" data-id="${t.id}"><b class="clip">${esc(t.title)}</b><small class="muted">${p ? esc(p.name) : KINDS[t.source] || 'งาน'}${done ? '' : ` · <span class="${isDelayed(t) ? 'late' : ''}">${fmtRel(taskEnd(t))}</span>`}</small></div>${done ? '' : advBtn(t)}</li>`; };

  const hero = `<section class="hero">
    <div class="hero-main"><span class="hero-date">วัน${TH_DOW_FULL[now.getDay()]}ที่ ${now.getDate()} ${TH_MON_FULL[now.getMonth()]} ${now.getFullYear() + 543}</span>
      <h1>${greet}, ${esc(m.name)}</h1>
      <p>${focus.length ? `วันนี้มี <b>${focus.length}</b> งานให้โฟกัส${overdue ? ` · <b class="hl-late">${overdue}</b> งานเลยกำหนด` : ''}` : (doneToday.length ? `เคลียร์งานวันนี้ครบแล้ว ${doneToday.length} งาน` : 'วันนี้ยังไม่มีงานค้าง')}</p></div>
    <a class="hero-ring h-${H.level}" href="#/todo" style="--p:${H.pct}" aria-label="ความคืบหน้าสัปดาห์นี้ ${H.pct} เปอร์เซ็นต์"><span class="ring-in"><b>${H.pct}%</b><span>สัปดาห์นี้</span></span><small>${hLabel} · ${H.done}/${H.total}</small></a>
    <div class="hero-actions">${quickActions().slice(0, 4).map(([k, i, t, s2, c]) => `<button type="button" class="hq" data-act="quick" data-id="${k}">${ico(i, 16)}<span>${t}</span></button>`).join('')}</div>
  </section>`;

  const focusCard = `<section class="card"><div class="card-h"><h3>วันนี้ของฉัน</h3><a class="link" href="#/todo">${pageName('todo')}</a></div>
    ${focus.length || doneToday.length ? `<ul class="focus-list">${focus.slice(0, 6).map(focusRow).join('')}${doneToday.slice(0, 3).map(focusRow).join('')}</ul>${focus.length > 6 ? `<a class="link small" href="#/todo">ดูอีก ${focus.length - 6} งาน</a>` : ''}`
      : `<div class="empty small-empty">${ico('check', 30)}<h4>วันนี้ว่าง</h4><p>เพิ่มงานแรกของวันได้จากปุ่มด้านล่าง</p><button class="btn btn-primary btn-sm" data-act="quick" data-id="task">${ico('plus', 14)} งานใหม่</button></div>`}</section>`;

  const nextCard = `<section class="card"><div class="card-h"><h3>กำลังจะมาถึง</h3><a href="#/calendar" class="link">${pageName('calendar')}</a></div>
    ${nextEv ? `<button type="button" class="countdown" data-act="openEvent" data-id="${nextEv.id}"><span class="cd-n">${Math.max(0, diffDays(t0, nextEv.start))}</span><span class="cd-l">${diffDays(t0, nextEv.start) <= 0 ? 'วันนี้!' : 'วัน'}</span><span class="cd-t"><small>Event ถัดไป</small><b>${esc(nextEv.name)}</b><small>${fmtRange(nextEv.start, nextEv.end)}${nextEv.venue ? ' · ' + esc(nextEv.venue) : ''}</small></span></button>` : ''}
    ${upcoming.length ? `<ul class="list">${upcoming.map(x => `<li data-act="${x.act}" data-id="${x.id}" class="clickable"><div class="datebox ${x.alt ? 'alt' : ''}"><b>${parse(x.d).getDate()}</b><span>${TH_MON[parse(x.d).getMonth()]}</span></div><div class="grow"><b class="clip">${esc(x.title)}</b><small class="muted clip">${esc(x.sub)}</small></div></li>`).join('')}</ul>` : (nextEv ? '' : '<p class="muted small">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</p>')}</section>`;

  /* ---- team (admin / leader) ---- */
  let teamHTML = '';
  if (team) {
    const c = { doing: 0, todo: 0, done: 0, delayed: 0 };
    live.forEach(t => { if (t.status === 'done') c.done++; else { if (isDelayed(t)) c.delayed++; c[t.status === 'doing' ? 'doing' : 'todo']++; } });
    const kpi = (n, l, cls = '') => `<div class="kpi2 ${cls}"><b>${n}</b><span>${l}</span></div>`;
    const lvl = { high: ['หนัก', 'lv-high'], ok: ['ปกติ', 'lv-ok'], low: ['เบา', 'lv-low'] };
    const rows = scope.map(x => ({ x, w: workload(x.id) })).sort((p, q) => q.w.active - p.w.active);
    const attention = sortBy(live.filter(t => isActive(t) && taskEnd(t) <= addDays(t0, 7)), t => taskEnd(t)).slice(0, 5);
    teamHTML = `<div class="sec-row"><h2 class="sec-h2">ทีม${isAdmin() ? '' : 'ที่ดูแล'}</h2>${isAdmin() ? `<select data-f="dash.group" aria-label="หน้าที่">${groupOptions(f.group, 'ทุกหน้าที่')}</select>` : ''}</div>
    <div class="kpi-row">${kpi(c.doing, 'กำลังทำ', 'doing')}${kpi(c.todo, 'ยังไม่เริ่ม')}${kpi(c.done, 'เสร็จแล้ว', 'done')}${kpi(c.delayed, 'ล่าช้า', c.delayed ? 'late' : '')}</div>
    <div class="dash-main">
      <section class="card flushy"><div class="card-h"><h3>ทีมกำลังทำอะไร</h3><small class="muted">แตะชื่อเพื่อดูแผนของคนนั้น</small></div><div class="trows">${rows.map(({ x, w }) => `<button type="button" class="trow" data-act="goTodo" data-id="${x.id}">
        <span class="av">${avatar(x, 34)}</span><span class="who"><b>${esc(x.name)}</b><small>${esc(group(x.group).short)}</small></span>
        <span class="now">${w.doing[0] ? esc(w.doing[0].title) + (w.doing.length > 1 ? ` <small>+${w.doing.length - 1}</small>` : '') : '<span class="muted">–</span>'}</span>
        <span class="nxt">${w.next ? `<span class="${isDelayed(w.next) ? 'late' : ''}">${fmtD(taskEnd(w.next))}</span> <small>${fmtRel(taskEnd(w.next))}</small>` : '<span class="muted">–</span>'}</span>
        <span class="ld"><span class="load-dot ${lvl[w.level][1]}"></span>${w.active} งาน${w.delayed ? ` <span class="late small">· ${w.delayed} ล่าช้า</span>` : ''}</span></button>`).join('')}</div></section>
      <div class="stack">${attention.length ? `<section class="card"><div class="card-h"><h3>ต้องจับตา</h3><small class="muted">ภายใน 7 วัน</small></div><ul class="list">${attention.map(t => `<li data-act="openTask" data-id="${t.id}" class="clickable">${avatar(member(t.assigneeId), 26)}<div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '–')}</small></div><span class="due ${isDelayed(t) ? 'late' : ''}">${fmtD(taskEnd(t))}</span></li>`).join('')}</ul></section>` : `<section class="card"><div class="empty small-empty">${ico('check', 28)}<h4>ไม่มีงานต้องจับตา</h4><p>ทุกงานในทีมยังอยู่ในกำหนด</p></div></section>`}</div>
    </div>`;
  }

  /* ---- projects strip ---- */
  const projs = visibleProjects().map(p => ({ p, s: projectStats(p) }));
  const projHTML = projs.length ? `<div class="sec-row"><h2 class="sec-h2">Projects</h2><a class="link" href="#/projects">ทั้งหมด</a></div>
    <div class="pstrip">${projs.map(({ p, s }) => `<a class="pc2" href="#/projects/${p.id}" style="--c:${p.color}"><span class="pc2-top"><b class="clip2">${esc(p.name)}</b>${s.delayed ? `<span class="badge st-delayed">${s.delayed} ล่าช้า</span>` : ''}</span>
      <span class="pc2-ring" style="--p:${s.pct}"><span>${s.pct}%</span></span><small class="muted">${s.done}/${s.total} งาน · ${s.end ? 'ถึง ' + fmtD(s.end) : '–'}</small><span class="squad">${p.squad.slice(0, 5).map(id => avatar(member(id), 22)).join('')}</span></a>`).join('')}</div>` : '';

  /* ---- breakdown ---- */
  const by = (!team && ['group', 'offsite'].includes(f.by || 'group')) ? 'project' : (f.by || 'group');
  const dataBy = { group: aggregate(live.filter(t => t.assigneeId), t => member(t.assigneeId)?.group, k => group(k).short), project: aggregate(live.filter(t => t.projectId), t => t.projectId, k => project(k)?.name || k), type: aggregate(live, t => t.type) }[by];
  let breakdown;
  if (by === 'offsite') {
    const days = {}; S().offsite.forEach(o => { days[o.area] = (days[o.area] || 0) + diffDays(o.start, o.end) + 1; });
    breakdown = segList(Object.entries(days).sort((p, q) => q[1] - p[1]).map(([k, v]) => ({ label: k, done: 0, active: v, delayed: 0 })), 'ยังไม่มีบันทึก Offsite') + '<p class="muted small">จำนวนวัน Offsite แยกตามพื้นที่</p>';
  } else breakdown = segList(dataBy);
  const byTabs = (team ? [['group', 'หน้าที่'], ['project', 'Project'], ['type', 'ประเภทงาน'], ['offsite', 'Offsite']] : [['project', 'Project'], ['type', 'ประเภทงาน']]).map(([k, l]) => `<button class="${by === k ? 'on' : ''}" data-act="dashBy" data-id="${k}">${l}</button>`).join('');

  root.innerHTML = hero + `<div class="home-grid">${focusCard}${nextCard}</div>` + teamHTML + projHTML + `
  <section class="card mt"><div class="card-h"><h3>สัดส่วนงาน${team ? 'ของทีม' : 'ของฉัน'}</h3><div class="seg-ctl sm">${byTabs}</div></div>
    <div class="legend inline"><span><i class="d"></i>เสร็จแล้ว</span><span><i class="a"></i>กำลังดำเนินการ</span><span><i class="x"></i>ล่าช้า</span></div>${breakdown}</section>`;
};
ACT.dashBy = el => { ST.dash.by = el.dataset.id; render(); };
ACT.goTodo = el => { ST.todo.user = el.dataset.id; ST.todo.week = 0; location.hash = '#/todo'; };

/* ===================== OFFSITE & EVENT SUPPORT LOG ===================== */
const offDays = o => diffDays(o.start, o.end) + 1;
const areaOptions = (sel, blank) => (blank ? opt('', blank, sel) : '') + OFFSITE_AREAS.filter(g => g.items.length).map(g => `<optgroup label="${g.label}">${g.items.map(a => opt(a, a, sel)).join('')}</optgroup>`).join('') + opt('__OTHER', 'อื่น ๆ', sel);
function offRange() {
  const f = ST.tracker; if (f.view === 'list') return null;
  const d = parse(f.cur);
  if (f.view === 'week') { const ws = addDays(f.cur, -((d.getDay() + 6) % 7)); return [ws, addDays(ws, 6)]; }
  return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
}
function offsiteRows() {
  const f = ST.tracker, q = f.q.trim().toLowerCase(), rg = offRange();
  return sortBy(S().offsite, o => o.start).reverse().filter(o =>
    (!f.area || (f.area === '__OTHER' ? o.areaType === 'OTHER' : o.area === f.area)) && (!f.who || o.personIds.includes(f.who))
    && (rg ? (o.start <= rg[1] && o.end >= rg[0]) : (!f.month || o.start.startsWith(f.month) || o.end.startsWith(f.month)))
    && (!q || (o.title + o.area + o.note).toLowerCase().includes(q)));
}
function offsiteSummary(rows, from, to) {
  const map = new Map();
  rows.forEach(o => o.personIds.forEach(id => {
    const r = map.get(id) || { id, days: new Set(), acts: 0, areas: new Set() }; r.acts++; r.areas.add(o.area);
    for (let d = o.start, n = 0; d <= o.end && n < 400; d = addDays(d, 1), n++) if ((!from || d >= from) && (!to || d <= to)) r.days.add(d);
    map.set(id, r);
  }));
  return [...map.values()].filter(r => member(r.id) && r.days.size).sort((a, b) => b.days.size - a.days.size);
}
const offArea = o => o.areaType === 'OTHER' ? 'อื่นๆ' : o.area;
const offNames = o => o.personIds.map(i => member(i)?.name).filter(Boolean).join(', ');
const offOn = (rows, d) => rows.filter(o => o.start <= d && d <= o.end);
function offCalendar(rows, rg) {
  const f = ST.tracker, t0 = today();
  if (f.view === 'month') {
    const first = new Date(parse(f.cur).getFullYear(), parse(f.cur).getMonth(), 1), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), lead = first.getDay();
    const cells = [];
    for (let i = 0; i < Math.ceil((lead + dim) / 7) * 7; i++) {
      const dt = new Date(first.getFullYear(), first.getMonth(), 1 - lead + i), d = iso(dt), inM = dt.getMonth() === first.getMonth(), items = offOn(rows, d), hol = holidayOf(d);
      cells.push(`<div class="day ${inM ? '' : 'out'} ${d === t0 ? 'today' : ''} ${isOff(d) ? 'off' : ''}" data-act="offDay" data-id="${d}" tabindex="0"><span class="dn">${dt.getDate()}</span>${hol ? `<small class="hol ${hol.kind}" title="${esc(hol.name)}">${esc(hol.name)}</small>` : ''}
        ${items.slice(0, 3).map(o => `<div class="cev ram off" data-act="openOffsite" data-id="${o.id}" title="${esc(o.area)} · ${esc(o.title)} · ${esc(offNames(o))}"><b>${esc(offArea(o))}</b> ${esc(o.title)}</div>`).join('')}${items.length > 3 ? `<small class="more">+${items.length - 3} เพิ่มเติม</small>` : ''}</div>`);
    }
    return `<div class="cal"><div class="cal-dow">${TH_DOW.map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid">${cells.join('')}</div></div>`;
  }
  const cols = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(rg[0], i), dt = parse(d), items = offOn(rows, d), hol = holidayOf(d);
    cols.push(`<div class="wk-col ${d === t0 ? 'today' : ''} ${isOff(d) ? 'off' : ''}"><div class="wk-head" data-act="offDay" data-id="${d}"><small>${TH_DOW[dt.getDay()]}</small><b>${dt.getDate()}</b><span>${TH_MON[dt.getMonth()]}</span>${hol ? `<em class="hol ${hol.kind}" title="${esc(hol.name)}">${esc(hol.name)}</em>` : ''}</div>
      <div class="wk-body">${items.map(o => `<div class="wk-card" data-act="openOffsite" data-id="${o.id}"><span class="area-tag" title="${esc(o.area)}">${esc(offArea(o))}</span><b>${esc(o.title)}</b>${o.areaType === 'OTHER' ? `<small class="muted">${esc(o.area)}</small>` : ''}<div class="squad">${o.personIds.map(i => avatar(member(i), 22)).join('')}</div><small class="muted">${esc(offNames(o))}</small></div>`).join('') || '<p class="wk-empty">–</p>'}</div></div>`);
  }
  return `<div class="wk-grid">${cols.join('')}</div>`;
}
V.support = root => {
  const f = ST.tracker, rg = offRange(), rows = offsiteRows();
  const from = rg ? rg[0] : (f.month ? f.month + '-01' : null), to = rg ? rg[1] : (f.month ? f.month + '-31' : null);
  const sum = offsiteSummary(rows, from, to), totalDays = sum.reduce((a, r) => a + r.days.size, 0);
  const cd = parse(f.cur), title = f.view === 'month' ? `${TH_MON_FULL[cd.getMonth()]} ${cd.getFullYear() + 543}` : f.view === 'week' ? `${fmtD(rg[0])} – ${fmtD(rg[1])} ${parse(rg[1]).getFullYear() + 543}` : '';
  const periodLabel = rg ? (f.view === 'week' ? 'สัปดาห์นี้ที่เลือก' : 'เดือน' + TH_MON_FULL[cd.getMonth()]) : (f.month ? 'เดือน ' + TH_MON_FULL[+f.month.slice(5) - 1] : 'ทุกช่วงเวลา');
  root.innerHTML = pageHead(pageName('support'), 'บันทึกการปฏิบัติงานนอกสำนักงาน — Event และการสนับสนุนกิจกรรมที่ DCAO / RAM / อื่น ๆ',
    `<button class="btn btn-ghost" data-act="exportOffsite">${ico('download', 16)} Export Excel</button>`) + `
  <div class="cal-bar"><div class="seg-ctl">${[['list', 'รายการ'], ['week', 'ปฏิทินสัปดาห์'], ['month', 'ปฏิทินเดือน']].map(([k, l]) => `<button class="${f.view === k ? 'on' : ''}" data-act="offView" data-id="${k}">${l}</button>`).join('')}</div>
    ${f.view !== 'list' ? `<div class="cal-nav"><button class="icon-btn" data-act="offNav" data-d="-1" aria-label="ก่อนหน้า">${ico('left')}</button><h2>${title}</h2><button class="icon-btn" data-act="offNav" data-d="1" aria-label="ถัดไป">${ico('right')}</button><button class="btn btn-ghost btn-sm" data-act="offNav" data-d="0">วันนี้</button></div>` : ''}</div>
  <div class="filters">
    <label class="search">${ico('search', 16)}<input type="search" placeholder="ค้นหากิจกรรม / พื้นที่" value="${esc(f.q)}" data-f-live="tracker.q"></label>
    <select data-f="tracker.area" aria-label="พื้นที่">${areaOptions(f.area, 'ทุกพื้นที่')}</select>
    <select data-f="tracker.who" aria-label="บุคคล">${memberOptions(f.who, 'ทุกคน')}</select>
    ${f.view === 'list' ? `<input type="month" data-f="tracker.month" value="${f.month}" aria-label="เดือน" title="เดือน (เว้นว่าง = ทั้งหมด)">` : ''}
    ${(f.q || f.area || f.who || f.month) ? '<button class="btn btn-ghost btn-sm" data-act="clearTracker">ล้างตัวกรอง</button>' : ''}</div>
  ${f.view !== 'list' ? offCalendar(rows, rg) + '<div class="mt"></div>' : ''}
  <section class="card ${f.view !== 'list' ? '' : ''}"><div class="card-h"><h3>สรุปรายบุคคล</h3><small class="muted">${periodLabel} · แสดงเฉพาะคนที่มีการปฏิบัติงาน</small></div>
    ${sum.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>ชื่อ</th><th class="num">วัน Offsite</th><th class="num">กิจกรรม</th><th>พื้นที่</th></tr></thead><tbody>
    ${sum.map(r => `<tr><td><div class="person">${avatar(member(r.id), 26)}<b>${esc(member(r.id).name)}</b></div></td><td class="num"><b>${r.days.size}</b></td><td class="num">${r.acts}</td><td>${[...r.areas].map(a => `<span class="area-tag">${esc(a)}</span>`).join('')}</td></tr>`).join('')}
    <tr class="total"><td>รวม</td><td class="num"><b>${totalDays}</b> <small>คน-วัน</small></td><td class="num">${rows.length}</td><td></td></tr></tbody></table></div>` : '<p class="muted small">ยังไม่มีการบันทึกในช่วงนี้</p>'}</section>
  ${f.view === 'list' ? `<section class="card flush mt"><div class="card-h pad"><h3>รายการบันทึก</h3><small class="muted">${rows.length} รายการ</small></div>
  ${rows.length ? `<div class="table-wrap"><table class="tbl tracker"><thead><tr><th>วันที่</th><th>กิจกรรม</th><th>พื้นที่</th><th>ผู้ปฏิบัติงาน</th><th>หมายเหตุ</th></tr></thead><tbody>
  ${rows.map(o => `<tr class="clickable" data-act="openOffsite" data-id="${o.id}"><td class="nw">${fmtRange(o.start, o.end)}<small class="muted">${offDays(o)} วัน</small></td><td class="main"><b>${esc(o.title)}</b></td><td><span class="area-tag">${esc(o.area)}</span></td>
  <td><span class="squad">${o.personIds.map(i => avatar(member(i), 26)).join('')}</span><small class="muted names">${esc(offNames(o))}</small></td><td class="small muted">${esc(o.note || '–')}</td></tr>`).join('')}</tbody></table></div>`
    : empty('inbox', 'ยังไม่มีบันทึก', 'บันทึกเมื่อทีมไปปฏิบัติงานนอกสำนักงาน', `<button class="btn btn-primary" data-act="newOffsite">${ico('plus', 16)} ${ACTION.logOffsite[0]}</button>`)}</section>` : ''}`;
};
ACT.offView = el => { ST.tracker.view = el.dataset.id; render(); };
ACT.offNav = el => {
  const f = ST.tracker, d = +el.dataset.d;
  if (d === 0) f.cur = today();
  else if (f.view === 'week') f.cur = addDays(f.cur, d * 7);
  else { const x = parse(f.cur); f.cur = iso(new Date(x.getFullYear(), x.getMonth() + d, 1)); }
  render();
};
ACT.offDay = el => {
  const d = el.dataset.id, items = offOn(offsiteRows(), d), hol = holidayOf(d);
  modal({
    title: fmtDY(d), body: `${hol ? `<div class="note">${esc(hol.name)} (${hol.kind === 'public' ? 'วันหยุดราชการ' : 'วันหยุดบริษัท'})</div>` : ''}${items.length ? `<ul class="list">${items.map(o => `<li class="clickable" data-act="openOffsite" data-id="${o.id}"><span class="area-tag">${esc(o.area)}</span><div class="grow"><b>${esc(o.title)}</b><small class="muted">${esc(offNames(o))}</small></div></li>`).join('')}</ul>` : '<p class="muted">ไม่มีการปฏิบัติงานนอกสำนักงานในวันนี้</p>'}`,
    actions: [{ label: 'ปิด' }, { label: ico('plus', 15) + ' ' + ACTION.logOffsite[0] + ' วันนี้', cls: 'btn-primary', onClick: () => { setTimeout(() => openOffsite(null, d)); } }],
  });
};
ACT.clearTracker = () => { Object.assign(ST.tracker, { q: '', area: '', who: '', status: '', month: '' }); render(); };
ACT.exportOffsite = () => {
  const rows = [['วันเริ่ม', 'วันสิ้นสุด', 'จำนวนวัน', 'กิจกรรม', 'ประเภทพื้นที่', 'พื้นที่', 'ผู้ปฏิบัติงาน', 'หมายเหตุ']];
  offsiteRows().reverse().forEach(o => rows.push([o.start, o.end, offDays(o), o.title, o.areaType, o.area, o.personIds.map(i => member(i)?.name).join(', '), o.note]));
  rows.push([], ['สรุปรายบุคคล'], ['ชื่อ', 'วัน Offsite', 'จำนวนกิจกรรม', 'พื้นที่']);
  offsiteSummary(offsiteRows(), (offRange() || [ST.tracker.month ? ST.tracker.month + '-01' : null])[0], (offRange() || [0, ST.tracker.month ? ST.tracker.month + '-31' : null])[1]).forEach(r => rows.push([member(r.id).name, r.days.size, r.acts, [...r.areas].join(' / ')]));
  downloadCSV(`offsite-${today()}.csv`, rows); toast('ดาวน์โหลดไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)');
};
const canEditOffsite = o => isAdmin() || o.createdBy === me().id || o.personIds.includes(me().id);
function openOffsite(id, date) {
  const orig = id ? S().offsite.find(o => o.id === id) : null;
  const o = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('o_'), title: '', areaType: 'RAM', area: 'RAM01', start: date || today(), end: date || today(), personIds: [me().id], note: '', createdBy: me().id };
  const can = !orig || canEditOffsite(orig), d = can ? '' : 'disabled';
  const sel = o.areaType === 'OTHER' ? '__OTHER' : o.area;
  modal({
    title: orig ? (can ? 'แก้ไข Offsite' : 'รายละเอียด Offsite') : ACTION.logOffsite[0], wide: true,
    body: `<form id="ofForm" class="form-grid" autocomplete="off">
      <label class="field full"><span>กิจกรรม / งานที่ไปปฏิบัติ *</span><input name="title" required value="${esc(o.title)}" placeholder="เช่น Roadshow เปิดตัวแคมเปญ" ${d}></label>
      <label class="field"><span>พื้นที่ *</span><select name="area" ${d}>${areaOptions(sel)}</select></label>
      <label class="field" id="otherBox"><span>ระบุสถานที่ (อื่น ๆ) *</span><input name="areaOther" value="${o.areaType === 'OTHER' ? esc(o.area) : ''}" placeholder="เช่น โรงงานพาร์ตเนอร์ ชลบุรี" ${d}></label>
      <label class="field"><span>วันเริ่ม *</span><input type="date" name="start" required value="${o.start}" ${d}></label>
      <label class="field"><span>วันสิ้นสุด *</span><input type="date" name="end" required value="${o.end}" ${d}></label>
      <div class="field full"><span>ผู้ปฏิบัติงาน * <small>(เลือกได้หลายคน)</small></span><div class="squad-pick">${S().groups.map(g => { const ms = S().members.filter(m => m.group === g.id); return ms.length ? `<div class="sp-g"><div>${groupChip(g)}</div><div class="sp-m">${ms.map(m => `<label class="pill"><input type="checkbox" value="${m.id}" ${o.personIds.includes(m.id) ? 'checked' : ''} ${d}><span>${avatar(m, 20)}${esc(m.name)}</span></label>`).join('')}</div></div>` : ''; }).join('')}</div></div>
      <label class="field full"><span>หมายเหตุ</span><textarea name="note" rows="2" ${d}>${esc(o.note)}</textarea></label></form>`,
    actions: (orig && can ? [{ label: ico('trash', 15) + ' ลบ', cls: 'btn-danger-ghost', left: true, onClick: async () => { if (await confirmBox(`ลบบันทึก “${esc(o.title)}” ?`, 'ลบ', true)) { S().offsite = S().offsite.filter(x => x.id !== o.id); commit(); toast('ลบแล้ว'); return true; } return false; } }] : [])
      .concat([{ label: can ? 'ยกเลิก' : 'ปิด' }]).concat(can ? [{
        label: 'บันทึก', cls: 'btn-primary', onClick: () => {
          const f = $('#ofForm'); if (!f.reportValidity()) return false;
          const e = f.elements, ppl = $$('.squad-pick input:checked', f).map(i => i.value);
          if (!ppl.length) { toast('เลือกผู้ปฏิบัติงานอย่างน้อย 1 คน', 'error'); return false; }
          if (e.end.value < e.start.value) { toast('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม', 'error'); return false; }
          const other = e.area.value === '__OTHER', place = e.areaOther.value.trim();
          if (other && !place) { toast('กรุณาระบุสถานที่', 'error'); return false; }
          Object.assign(o, { title: e.title.value.trim(), areaType: other ? 'OTHER' : e.area.value.startsWith('DCAO') ? 'DCAO' : 'RAM', area: other ? place : e.area.value, start: e.start.value, end: e.end.value, personIds: ppl, note: e.note.value });
          if (orig) Object.assign(orig, o); else S().offsite.push(o);
          commit(); toast('บันทึกแล้ว');
        },
      }] : []),
    onOpen(m) {
      const f = $('#ofForm', m.el), inp = f.elements.areaOther;
      const sync = focus => { const other = f.elements.area.value === '__OTHER'; $('#otherBox', m.el).hidden = !other; inp.required = other; if (other && focus) inp.focus(); };
      f.elements.area.onchange = () => sync(true); sync(false); f.addEventListener('submit', e => e.preventDefault());
    },
  });
}
ACT.openOffsite = el => openOffsite(el.dataset.id);
ACT.newOffsite = () => openOffsite(null);

/* ======================= MAJOR EVENT CALENDAR ======================= */
const canManageEvents = () => isAdmin() || S().settings.eventEditors.includes(me().id);
function itemsOnDay(d) {
  const c = ST.cal, items = [];
  S().events.forEach(e => {
    if (e.start <= d && d <= e.end) items.push({ k: 'event', id: e.id, label: e.name, cls: EV_STATUS[e.status].cls, first: e.start === d });
    e.milestones.forEach(ms => { if (ms.date === d) items.push({ k: 'ms', id: e.id, label: 'เตรียมงาน: ' + ms.title, cls: ms.done ? 'ms-done' : 'ms', ms }); });
  });
  if (c.ram) S().offsite.forEach(o => { if (o.start <= d && d <= o.end) items.push({ k: 'ram', id: o.id, label: `${o.area} · ${o.title}`, cls: 'ram' }); });
  return items;
}
function calHeader(title) {
  const c = ST.cal;
  return `<div class="cal-bar"><div class="seg-ctl"><button class="${c.mode === 'agenda' ? 'on' : ''}" data-act="calMode" data-id="agenda">รายการ</button><button class="${c.mode === 'month' ? 'on' : ''}" data-act="calMode" data-id="month">รายเดือน</button><button class="${c.mode === 'year' ? 'on' : ''}" data-act="calMode" data-id="year">ภาพรวมทั้งปี</button></div>
    <div class="cal-nav"><button class="icon-btn" data-act="calPrev" aria-label="ก่อนหน้า">${ico('left')}</button><h2>${title}</h2><button class="icon-btn" data-act="calNext" aria-label="ถัดไป">${ico('right')}</button><button class="btn btn-ghost btn-sm" data-act="calToday">วันนี้</button></div>
    <div class="cal-opts"><label class="check"><input type="checkbox" data-f="cal.ram" ${c.ram ? 'checked' : ''}> Event Support (RAM/Other)</label></div></div>`;
}
V.calendar = root => {
  const c = ST.cal;
  const actions = `${canManageEvents() ? `<button class="btn btn-ghost" data-act="importEvents">${ico('upload', 16)} Import Excel</button>` : ''}<button class="btn btn-ghost" data-act="exportCal">${ico('download', 16)} Export Excel</button><button class="btn btn-ghost hide-sm" onclick="window.print()">${ico('print', 16)} พิมพ์ / PDF</button>`;
  const year = c.mode === 'year' ? c.y : c.y;
  const evYear = sortBy(S().events.filter(e => e.start.startsWith(year) || e.end.startsWith(year) || (e.start.slice(0, 4) <= String(year) && e.end.slice(0, 4) >= String(year))), e => e.start);
  const legend = `<div class="legend cal-legend">${Object.values(EV_STATUS).map(s => `<span><i class="${s.cls}"></i>${s.th}</span>`).join('')}<span><i class="ram"></i>Event Support (RAM/Other)</span><span><i class="hol"></i>วันหยุด</span></div>`;
  const list = (evs) => evs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>งาน</th><th>วันจัด</th><th>สถานที่</th><th>เจ้าของงาน</th><th>กลุ่มเป้าหมาย</th><th>สถานะ</th><th>วันเตรียมงาน</th></tr></thead><tbody>
    ${evs.map(e => `<tr class="clickable" data-act="openEvent" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${fmtRange(e.start, e.end)}</td><td>${esc(e.venue)}</td><td>${personChip(member(e.ownerId))}</td><td>${esc(e.audience)}</td><td><span class="badge ${EV_STATUS[e.status].cls}">${EV_STATUS[e.status].th}</span></td>
    <td class="small">${e.milestones.length ? `${e.milestones.filter(m => m.done).length}/${e.milestones.length} เสร็จ` : '–'}</td></tr>`).join('')}</tbody></table></div>` : empty('calendar', 'ยังไม่มี Event', 'เพิ่มงานสำคัญเพื่อดูภาพรวมทั้งปี');

  if (c.mode === 'agenda') {
    const t0 = today(), first = iso(new Date(c.y, c.m, 1)), from = first.slice(0, 7) === t0.slice(0, 7) ? t0 : first, days = [];
    const COL = { 'ev-planning': '#ff9500', 'ev-confirmed': '#007aff', 'ev-done': '#34c759', 'ev-cancelled': '#8e8e93', ms: '#af52de', 'ms-done': '#c7c7cc', ram: '#30b0c7' };
    for (let i = 0; i < 92; i++) { const d = addDays(from, i), items = itemsOnDay(d), hol = holidayOf(d); if (items.length || hol) days.push({ d, items, hol }); }
    root.innerHTML = pageHead(pageName('calendar'), 'กิจกรรม วันเตรียมงาน Offsite และวันหยุด เรียงตามวัน (3 เดือน)', actions) + calHeader(`ตั้งแต่ ${fmtDY(from)}`) +
      (days.length ? `<div class="agenda">${days.map(({ d, items, hol }) => { const dt = parse(d); return `<div class="ag-day ${d === t0 ? 'today' : ''}"><button type="button" class="ag-date" data-act="openDay" data-id="${d}"><b>${dt.getDate()}</b><span>${TH_DOW[dt.getDay()]}</span><small>${TH_MON[dt.getMonth()]}</small></button>
        <div class="ag-items">${hol ? `<div class="ag-hol">${esc(hol.name)}</div>` : ''}${items.map(it => `<button type="button" class="ag-it" style="--c:${COL[it.cls] || '#007aff'}" data-act="${it.k === 'ram' ? 'openOffsite' : 'openEvent'}" data-id="${it.id}"><i></i><span>${esc(it.label)}</span><small>${it.k === 'ms' ? 'เตรียมงาน' : it.k === 'ram' ? 'Event Support' : 'Event'}</small></button>`).join('')}</div></div>`; }).join('')}</div>`
        : empty('calendar', 'ไม่มีกิจกรรมใน 3 เดือนนี้', 'ลองเลื่อนไปเดือนถัดไป หรือเพิ่ม Event'));
  } else if (c.mode === 'month') {
    const first = new Date(c.y, c.m, 1), startOff = first.getDay(), dim = new Date(c.y, c.m + 1, 0).getDate();
    const cells = []; const t0 = today();
    for (let i = 0; i < Math.ceil((startOff + dim) / 7) * 7; i++) {
      const dt = new Date(c.y, c.m, 1 - startOff + i), d = iso(dt), inM = dt.getMonth() === c.m;
      const items = itemsOnDay(d), hol = holidayOf(d);
      const show = items.slice(0, 3);
      cells.push(`<div class="day ${inM ? '' : 'out'} ${d === t0 ? 'today' : ''} ${isOff(d) ? 'off' : ''}" data-act="openDay" data-id="${d}" tabindex="0">
        <span class="dn">${dt.getDate()}</span>${hol ? `<small class="hol ${hol.kind}" title="${esc(hol.name)}">${esc(hol.name)}</small>` : ''}
        ${show.map(it => `<div class="cev ${it.cls}" title="${esc(it.label)}">${esc(it.label)}</div>`).join('')}
        ${items.length > 3 ? `<small class="more">+${items.length - 3} เพิ่มเติม</small>` : ''}</div>`);
    }
    const monthEv = sortBy(S().events.filter(e => e.start <= iso(new Date(c.y, c.m + 1, 0)) && e.end >= iso(first)), e => e.start);
    root.innerHTML = pageHead(pageName('calendar'), 'ปฏิทินงานสำคัญประจำปี พร้อมวันเตรียมงานและวันหยุดราชการ', actions) + calHeader(`${TH_MON_FULL[c.m]} ${c.y + 543}`) + legend +
      `<div class="cal"><div class="cal-dow">${TH_DOW.map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid">${cells.join('')}</div></div>
      <section class="card flush mt"><div class="card-h pad"><h3>งานในเดือน${TH_MON_FULL[c.m]}</h3></div>${list(monthEv)}</section>`;
  } else {
    const mini = [];
    for (let mo = 0; mo < 12; mo++) {
      const first = new Date(c.y, mo, 1), dim = new Date(c.y, mo + 1, 0).getDate();
      let cells = TH_DOW.map(d => `<b>${d}</b>`).join('') + '<span></span>'.repeat(first.getDay());
      for (let d = 1; d <= dim; d++) {
        const ds = `${c.y}-${pad(mo + 1)}-${pad(d)}`;
        const evs = S().events.filter(e => e.start <= ds && ds <= e.end);
        cells += ` <span class="${evs.length ? 'has ' + EV_STATUS[evs[0].status].cls : ''} ${ds === today() ? 'is-today' : ''} ${holidayOf(ds) || isOff(ds) ? 'hday' : ''}" ${evs.length ? `title="${esc(evs.map(e => e.name).join(', '))}"` : ''}>${d}</span>`;
      }
      const n = S().events.filter(e => e.start.startsWith(`${c.y}-${pad(mo + 1)}`)).length;
      mini.push(`<div class="mini" data-act="calGoMonth" data-id="${mo}" tabindex="0"><h4>${TH_MON_FULL[mo]}${n ? `<em>${n}</em>` : ''}</h4><div class="mini-grid">${cells}</div></div>`);
    }
    root.innerHTML = pageHead(pageName('calendar'), 'ภาพรวมงานสำคัญทั้งปี — คลิกเดือนเพื่อดูรายละเอียด', actions) + calHeader(`พ.ศ. ${c.y + 543}`) + legend +
      `<div class="year-grid">${mini.join('')}</div><section class="card flush mt"><div class="card-h pad"><h3>รายการทั้งหมดในปี ${c.y + 543} (${evYear.length} งาน)</h3></div>${list(evYear)}</section>`;
  }
};
ACT.calMode = el => { ST.cal.mode = el.dataset.id; render(); };
ACT.calPrev = () => { const c = ST.cal; if (c.mode === 'year') c.y--; else { c.m--; if (c.m < 0) { c.m = 11; c.y--; } } render(); };
ACT.calNext = () => { const c = ST.cal; if (c.mode === 'year') c.y++; else { c.m++; if (c.m > 11) { c.m = 0; c.y++; } } render(); };
ACT.calToday = () => { const n = new Date(); ST.cal.y = n.getFullYear(); ST.cal.m = n.getMonth(); render(); };
ACT.calGoMonth = el => { ST.cal.m = +el.dataset.id; ST.cal.mode = 'month'; render(); };
ACT.exportCal = () => {
  const rows = [['ชื่องาน', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานที่', 'เจ้าของงาน', 'กลุ่มเป้าหมาย', 'สถานะ', 'วันเตรียมงาน']];
  S().events.filter(e => e.start.startsWith(ST.cal.y) || e.end.startsWith(ST.cal.y)).sort((a, b) => a.start.localeCompare(b.start))
    .forEach(e => rows.push([e.name, e.start, e.end, e.venue, member(e.ownerId)?.name, e.audience, EV_STATUS[e.status].th, e.milestones.map(m => `${m.date} ${m.title}${m.done ? ' ✓' : ''}`).join(' | ')]));
  downloadCSV(`major-events-${ST.cal.y}.csv`, rows); toast('ดาวน์โหลดไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)');
};
ACT.openDay = el => {
  const d = el.dataset.id, items = itemsOnDay(d), hol = holidayOf(d);
  modal({
    title: fmtDY(d), body: `${hol ? `<div class="note">${esc(hol.name)} (${hol.kind === 'public' ? 'วันหยุดราชการ' : 'วันหยุดบริษัท'})</div>` : ''}${items.length ? `<ul class="list">${items.map(it => `<li class="clickable" data-act="${it.k === 'ram' ? 'openOffsite' : 'openEvent'}" data-id="${it.id}"><span class="cev ${it.cls} solo">${it.k === 'ms' ? 'เตรียมงาน' : it.k === 'ram' ? 'Event Support' : 'Event'}</span><div class="grow"><b>${esc(it.label)}</b></div></li>`).join('')}</ul>` : '<p class="muted">ไม่มีกิจกรรมในวันนี้</p>'}`,
    actions: [{ label: 'ปิด' }].concat(canManageEvents() ? [{ label: ico('plus', 15) + ' ' + ACTION.newEvent[0] + ' วันนี้', cls: 'btn-primary', onClick: () => { setTimeout(() => openEvent(null, d)); } }] : []),
  });
};

/* ---------- Event editor ---------- */
function openEvent(id, date) {
  const orig = id ? S().events.find(e => e.id === id) : null;
  const e = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('e_'), name: '', start: date || today(), end: date || today(), venue: '', ownerId: me().id, audience: '', status: 'planning', projectId: '', milestones: [] };
  const canEdit = !orig ? canManageEvents() : (isAdmin() || e.ownerId === me().id || S().settings.eventEditors.includes(me().id));
  const d = canEdit ? '' : 'disabled';
  const msRow = ms => `<div class="ms-row"><input type="date" value="${ms.date}" ${d}><input type="text" value="${esc(ms.title)}" placeholder="เช่น ส่งแบบสื่อ / เริ่มเตรียมงาน" ${d}><label class="check"><input type="checkbox" ${ms.done ? 'checked' : ''} ${d}> เสร็จ</label>${canEdit ? '<button type="button" class="icon-btn" data-rm aria-label="ลบ">' + ico('x', 15) + '</button>' : ''}</div>`;
  modal({
    title: orig ? (canEdit ? 'แก้ไข Event' : 'รายละเอียด Event') : ACTION.newEvent[0], wide: true,
    body: `<form id="evForm" class="form-grid" autocomplete="off">
      <label class="field full"><span>ชื่องาน *</span><input name="name" required value="${esc(e.name)}" ${d}></label>
      <label class="field"><span>วันเริ่ม *</span><input type="date" name="start" required value="${e.start}" ${d}></label>
      <label class="field"><span>วันสิ้นสุด *</span><input type="date" name="end" required value="${e.end}" ${d}></label>
      <label class="field"><span>สถานที่</span><input name="venue" value="${esc(e.venue)}" ${d}></label>
      <label class="field"><span>เจ้าของงาน</span><select name="ownerId" ${d}>${memberOptions(e.ownerId)}</select></label>
      <label class="field"><span>กลุ่มเป้าหมาย</span><input name="audience" value="${esc(e.audience)}" ${d}></label>
      <label class="field"><span>สถานะ</span><select name="status" ${d}>${Object.keys(EV_STATUS).map(k => opt(k, EV_STATUS[k].th, e.status)).join('')}</select></label>
      <label class="field full"><span>เชื่อมกับ Project (ถ้ามี)</span><select name="projectId" ${d}>${projectOptions(e.projectId, '— ไม่เชื่อม —')}</select></label>
      <div class="field full"><span>วันเตรียมงาน</span><div id="msList" class="ms-list">${e.milestones.map(msRow).join('')}</div>
        ${canEdit ? `<button type="button" class="btn btn-ghost btn-sm" id="msAdd">${ico('plus', 14)} เพิ่มวันเตรียมงาน</button>` : ''}</div></form>`,
    actions: (orig && canEdit ? [{ label: ico('trash', 15) + ' ลบ', cls: 'btn-danger-ghost', left: true, onClick: async () => { if (await confirmBox(`ลบ “${esc(e.name)}” ?`, 'ลบ', true)) { S().events = S().events.filter(x => x.id !== e.id); commit(); toast('ลบ Event แล้ว'); return true; } return false; } }] : [])
      .concat([{ label: canEdit ? 'ยกเลิก' : 'ปิด' }]).concat(canEdit ? [{
        label: 'บันทึก', cls: 'btn-primary', onClick: () => {
          const f = $('#evForm'); if (!f.reportValidity()) return false;
          if (f.elements.end.value < f.elements.start.value) { toast('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม', 'error'); return false; }
          Object.assign(e, { name: f.elements.name.value.trim(), start: f.elements.start.value, end: f.elements.end.value, venue: f.elements.venue.value, ownerId: f.elements.ownerId.value, audience: f.elements.audience.value, status: f.elements.status.value, projectId: f.elements.projectId.value || null });
          e.milestones = $$('#msList .ms-row').map(r => { const [dt, ti, ck] = $$('input', r); return { id: uid('ms_'), date: dt.value, title: ti.value.trim(), done: ck.checked }; }).filter(m => m.date && m.title);
          if (orig) Object.assign(orig, e); else S().events.push(e);
          commit(); toast('บันทึกแล้ว');
        },
      }] : []),
    onOpen(m) {
      const list = $('#msList', m.el);
      const bind = () => $$('[data-rm]', list).forEach(b => b.onclick = () => b.closest('.ms-row').remove());
      bind();
      const add = $('#msAdd', m.el); if (add) add.onclick = () => { list.insertAdjacentHTML('beforeend', msRow({ date: $('[name=start]', m.el).value, title: '', done: false })); bind(); $$('input[type=text]', list).pop().focus(); };
      $('#evForm', m.el).addEventListener('submit', ev => ev.preventDefault());
    },
  });
}
ACT.openEvent = el => openEvent(el.dataset.id);
ACT.newEvent = () => openEvent(null);
