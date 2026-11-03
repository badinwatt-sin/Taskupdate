'use strict';
/* ============================================================
   Views: Dashboard · Support Tracker · Major Event Calendar
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
V.dashboard = root => {
  const f = ST.dash;
  let tasks = visibleTasks();
  if (f.group) tasks = tasks.filter(t => member(t.assigneeId)?.group === f.group);
  const live = tasks.filter(t => t.status !== 'cancelled');
  const c = { todo: 0, doing: 0, done: 0, delayed: 0 };
  live.forEach(t => { if (t.status === 'done') c.done++; else { if (isDelayed(t)) c.delayed++; if (t.status === 'doing') c.doing++; else c.todo++; } });
  const total = live.length || 1;
  const kpi = (n, label, sub, cls, icon) => `<div class="kpi ${cls}"><div class="kpi-ico">${ico(icon, 20)}</div><div><b>${n}</b><span>${label}</span><small>${sub}</small></div></div>`;

  const members = S().members.filter(m => !f.group || m.group === f.group);
  const rows = members.map(m => ({ m, w: workload(m.id) })).sort((a, b) => b.w.active - a.w.active);
  const lvl = { high: ['หนัก', 'lv-high'], ok: ['ปกติ', 'lv-ok'], low: ['ว่าง', 'lv-low'] };
  const pmOf = id => S().projects.some(p => p.pmId === id);

  const team = rows.map(({ m, w }) => `<tr data-act="goTodo" data-id="${m.id}" class="clickable">
    <td><div class="person">${avatar(m, 34)}<div><b>${esc(m.name)}</b>${pmOf(m.id) ? ' <span class="pm">PM</span>' : ''}<small>${esc(group(m.group).short)}</small></div></div></td>
    <td>${w.doing.length ? w.doing.slice(0, 2).map(t => `<div class="cell-task">${esc(t.title)}</div>`).join('') + (w.doing.length > 2 ? `<small class="muted">+${w.doing.length - 2} งาน</small>` : '') : '<span class="muted">–</span>'}</td>
    <td>${w.next ? `<div>${fmtD(taskEnd(w.next))} <small class="${isDelayed(w.next) ? 'late' : 'muted'}">${fmtRel(taskEnd(w.next))}</small></div><small class="muted clip">${esc(w.next.title)}</small>` : '<span class="muted">–</span>'}</td>
    <td><div class="load"><div class="load-bar ${lvl[w.level][1]}"><i style="width:${Math.min(100, w.active / 8 * 100)}%"></i></div><span>${w.active} งาน · <em class="${lvl[w.level][1]}">${lvl[w.level][0]}</em></span></div></td>
    <td class="num">${w.delayed ? `<span class="badge st-delayed">${w.delayed}</span>` : '<span class="muted">0</span>'}</td></tr>`).join('');

  const t0 = today(), t7 = addDays(t0, 7);
  const attention = sortBy(live.filter(t => isActive(t) && taskEnd(t) <= t7), t => taskEnd(t)).slice(0, 7);
  const upcomingEv = sortBy(S().events.filter(e => e.status !== 'cancelled' && e.end >= t0), e => e.start).slice(0, 3);

  const byGroup = aggregate(live.filter(t => t.assigneeId), t => member(t.assigneeId)?.group, k => group(k).short);
  const byRam = aggregate(live.filter(t => t.source === 'ram'), t => t.ram?.area);
  const byProj = aggregate(live.filter(t => t.projectId), t => t.projectId, k => project(k)?.name || k);
  const byType = aggregate(live, t => t.type);
  const gChips = [`<button class="chip ${!f.group ? 'on' : ''}" data-act="setDashGroup" data-id="">ทั้งทีม</button>`]
    .concat(S().groups.filter(g => S().members.some(m => m.group === g.id)).map(g => `<button class="chip ${f.group === g.id ? 'on' : ''}" data-act="setDashGroup" data-id="${g.id}"><i style="background:${g.color}"></i>${esc(g.short)}</button>`)).join('');

  root.innerHTML = pageHead('Team Dashboard', `ภาพรวมการทำงานของทีม Agency Experience · อัปเดต ${fmtDY(t0)}`,
    `<button class="btn btn-primary" data-act="newTask">${ico('plus', 16)} สร้างงานใหม่</button>`) + `
  <div class="chips" role="group" aria-label="กรองตามหน้าที่">${gChips}</div>
  <div class="kpis">
    ${kpi(c.doing, 'กำลังดำเนินการ', 'In Progress', 'k-doing', 'clock')}
    ${kpi(c.todo, 'ยังไม่เริ่ม', 'Not Started', 'k-todo', 'flag')}
    ${kpi(c.done, 'เสร็จแล้ว', `${Math.round(c.done / total * 100)}% ของงานทั้งหมด`, 'k-done', 'check')}
    ${kpi(c.delayed, 'ล่าช้า', 'เลยกำหนดและยังไม่เสร็จ', 'k-late', 'alert')}
  </div>
  <div class="dash-main">
    <section class="card"><div class="card-h"><h3>ทีมกำลังทำอะไร</h3><small class="muted">คลิกที่ชื่อเพื่อดูรายการงานของคนนั้น</small></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>สมาชิก</th><th>กำลังทำ</th><th>กำหนดส่งถัดไป</th><th>ภาระงาน</th><th class="num">ล่าช้า</th></tr></thead><tbody>${team || ''}</tbody></table></div>
    </section>
    <div class="stack">
      <section class="card"><div class="card-h"><h3>ต้องจับตา (7 วันข้างหน้า)</h3></div>
        ${attention.length ? `<ul class="list">${attention.map(t => `<li data-act="openTask" data-id="${t.id}" class="clickable">${avatar(member(t.assigneeId), 26)}<div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '–')} · ${t.projectId ? esc(project(t.projectId)?.name) : KINDS[t.source]}</small></div><span class="due ${isDelayed(t) ? 'late' : ''}">${fmtD(taskEnd(t))}<small>${fmtRel(taskEnd(t))}</small></span></li>`).join('')}</ul>` : empty('check', 'ไม่มีงานเร่งด่วน', 'ทุกอย่างอยู่ในกำหนดการ')}
      </section>
      <section class="card"><div class="card-h"><h3>Major Events ที่กำลังมาถึง</h3><a href="#/calendar" class="link">ดูปฏิทิน</a></div>
        ${upcomingEv.length ? `<ul class="list">${upcomingEv.map(e => `<li data-act="openEvent" data-id="${e.id}" class="clickable"><div class="datebox"><b>${parse(e.start).getDate()}</b><span>${TH_MON[parse(e.start).getMonth()]}</span></div><div class="grow"><b class="clip">${esc(e.name)}</b><small class="muted">${esc(e.venue)} · ${fmtRel(e.start)}</small></div><span class="badge ${EV_STATUS[e.status].cls}">${EV_STATUS[e.status].th}</span></li>`).join('')}</ul>` : '<p class="muted small pad">ยังไม่มีงานที่กำลังจะถึง</p>'}
      </section>
    </div>
  </div>
  <div class="legend"><span><i class="d"></i>เสร็จแล้ว</span><span><i class="a"></i>กำลังดำเนินการ / ยังไม่เริ่ม</span><span><i class="x"></i>ล่าช้า</span></div>
  <div class="grid-4">
    <section class="card"><div class="card-h"><h3>แยกตามหน้าที่</h3></div>${segList(byGroup)}</section>
    <section class="card"><div class="card-h"><h3>แยกตามพื้นที่ RAM</h3></div>${segList(byRam, 'ยังไม่มีคำขอจาก RAM')}</section>
    <section class="card"><div class="card-h"><h3>แยกตาม Project</h3></div>${segList(byProj, 'ยังไม่มี Project')}</section>
    <section class="card"><div class="card-h"><h3>แยกตามประเภทงาน</h3></div>${segList(byType)}</section>
  </div>`;
};
ACT.setDashGroup = el => { ST.dash.group = el.dataset.id; render(); };
ACT.goTodo = el => { ST.todo.user = el.dataset.id; ST.todo.tab = 'today'; location.hash = '#/todo'; };

/* ===================== EVENT & RAM SUPPORT TRACKER ===================== */
function trackerRows() {
  const f = ST.tracker, q = f.q.trim().toLowerCase();
  return sortBy(visibleTasks().filter(t => t.source === 'ram' && t.ram), t => t.ram.eventDate || '9999')
    .filter(t => (!f.area || t.ram.area === f.area) && (!f.who || t.assigneeId === f.who) && (!f.status || (f.status === 'delayed' ? isDelayed(t) : t.status === f.status))
      && (!f.month || (t.ram.eventDate || '').startsWith(f.month))
      && (!q || (t.title + t.ram.requester + t.ram.detail + t.ram.area).toLowerCase().includes(q)));
}
V.support = root => {
  const f = ST.tracker, all = visibleTasks().filter(t => t.source === 'ram' && t.ram), rows = trackerRows();
  const areaCount = S().settings.areas.map(a => {
    const ts = all.filter(t => t.ram.area === a), open = ts.filter(isActive).length;
    return { a, n: ts.length, open, late: ts.filter(isDelayed).length };
  });
  // requests received per month (last 6 months)
  const now = new Date(), months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ k: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: TH_MON[d.getMonth()], n: 0 }); }
  all.forEach(t => { const mo = months.find(x => x.k === (t.ram.receivedAt || '').slice(0, 7)); if (mo) mo.n++; });
  const mx = Math.max(...months.map(x => x.n), 1);
  const soon = all.filter(t => isActive(t) && t.ram.eventDate && t.ram.eventDate >= today() && t.ram.eventDate <= addDays(today(), 30)).length;

  root.innerHTML = pageHead('Event & RAM Support Tracker', 'ติดตามคำขอสนับสนุนจาก RAM และ Project — ใครขอ จัดที่ไหน เมื่อไร ใครดูแล',
    `<button class="btn btn-ghost" data-act="exportSupport">${ico('download', 16)} Export Excel</button><button class="btn btn-ghost hide-sm" onclick="window.print()">${ico('print', 16)} พิมพ์ / PDF</button><button class="btn btn-primary" data-act="newTask" data-kind="ram">${ico('plus', 16)} คำขอใหม่</button>`) + `
  <div class="support-top">
    <section class="card"><div class="card-h"><h3>คำขอแยกตามพื้นที่</h3><small class="muted">กดเพื่อกรอง</small></div>
      <div class="area-grid">${areaCount.map(x => `<button class="area ${f.area === x.a ? 'on' : ''}" data-act="setArea" data-id="${esc(x.a)}"><b>${x.n}</b><span>${esc(x.a)}</span><small>${x.open} เปิดอยู่${x.late ? ` · <em class="late">${x.late} ล่าช้า</em>` : ''}</small></button>`).join('')}</div></section>
    <section class="card"><div class="card-h"><h3>คำขอที่ได้รับ 6 เดือนล่าสุด</h3><small class="muted">จัดภายใน 30 วัน: <b>${soon}</b></small></div>
      <div class="bars">${months.map(x => `<div class="bar-col"><b>${x.n || ''}</b><i style="height:${Math.max(x.n / mx * 100, x.n ? 8 : 2)}%"></i><span>${x.label}</span></div>`).join('')}</div></section>
  </div>
  <div class="filters">
    <label class="search">${ico('search', 16)}<input type="search" placeholder="ค้นหากิจกรรม / ผู้ขอ / รายละเอียด" value="${esc(f.q)}" data-f-live="tracker.q"></label>
    <select data-f="tracker.area" aria-label="พื้นที่">${opt('', 'ทุกพื้นที่', f.area)}${S().settings.areas.map(a => opt(a, a, f.area)).join('')}</select>
    <select data-f="tracker.who" aria-label="ผู้รับผิดชอบ">${memberOptions(f.who, 'ทุกคน')}</select>
    <select data-f="tracker.status" aria-label="สถานะ">${opt('', 'ทุกสถานะ', f.status)}${Object.keys(STATUS).map(k => opt(k, STATUS[k].th, f.status)).join('')}${opt('delayed', 'ล่าช้า', f.status)}</select>
    <input type="month" data-f="tracker.month" value="${f.month}" aria-label="เดือนที่จัดกิจกรรม" title="เดือนที่จัดกิจกรรม">
    ${(f.q || f.area || f.who || f.status || f.month) ? '<button class="btn btn-ghost btn-sm" data-act="clearTracker">ล้างตัวกรอง</button>' : ''}
  </div>
  <section class="card flush">${rows.length ? `<div class="table-wrap"><table class="tbl tracker"><thead><tr><th>กิจกรรม / รายละเอียด</th><th>พื้นที่ · ผู้ขอ</th><th>วันที่จัด</th><th>ผู้รับผิดชอบ</th><th>กำหนดส่ง</th><th>สถานะ</th><th>แนบ</th></tr></thead><tbody>
    ${rows.map(t => `<tr class="clickable" data-act="openTask" data-id="${t.id}">
      <td class="main"><b>${esc(t.title)}</b><small class="muted clip2">${esc(t.ram.detail || '—')}</small></td>
      <td><b>${esc(t.ram.area)}</b><small class="muted">${esc(t.ram.requester || '–')}</small></td>
      <td>${fmtDY(t.ram.eventDate)}</td>
      <td>${personChip(member(t.assigneeId))}</td>
      <td>${fmtD(taskEnd(t))}${isActive(t) ? `<small class="${isDelayed(t) ? 'late' : 'muted'}">${fmtRel(taskEnd(t))}</small>` : ''}</td>
      <td>${statusBadge(t)}</td>
      <td>${(t.links?.length || 0) + (t.files?.length || 0) ? `<span class="muted">${ico('paperclip', 14)} ${(t.links?.length || 0) + (t.files?.length || 0)}</span>` : '–'}</td></tr>`).join('')}
    </tbody></table></div>` : empty('inbox', 'ไม่พบคำขอที่ตรงกับตัวกรอง', 'ลองล้างตัวกรอง หรือเพิ่มคำขอใหม่', `<button class="btn btn-primary" data-act="newTask" data-kind="ram">${ico('plus', 16)} คำขอใหม่</button>`)}
  </section><p class="muted small">แสดง ${rows.length} จาก ${all.length} รายการ</p>`;
};
ACT.setArea = el => { ST.tracker.area = ST.tracker.area === el.dataset.id ? '' : el.dataset.id; render(); };
ACT.clearTracker = () => { ST.tracker = { q: '', area: '', who: '', status: '', month: '' }; render(); };
ACT.exportSupport = () => {
  const rows = [['กิจกรรม', 'พื้นที่', 'ผู้ขอ/หน่วยงาน', 'วันที่จัด', 'รายละเอียด', 'ผู้รับผิดชอบ', 'วันที่รับคำขอ', 'กำหนดส่ง', 'สถานะ', 'ล่าช้า', 'Link']];
  trackerRows().forEach(t => rows.push([t.title, t.ram.area, t.ram.requester, t.ram.eventDate, t.ram.detail, member(t.assigneeId)?.name, t.ram.receivedAt, taskEnd(t), STATUS[t.status].label, isDelayed(t) ? 'ใช่' : '', (t.links || []).map(l => l.url).join(' ')]));
  downloadCSV(`RAM-support-${today()}.csv`, rows); toast('ดาวน์โหลดไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)');
};

/* ======================= MAJOR EVENT CALENDAR ======================= */
const canManageEvents = () => isAdmin() || isPM();
function itemsOnDay(d) {
  const c = ST.cal, items = [];
  S().events.forEach(e => {
    if (e.start <= d && d <= e.end) items.push({ k: 'event', id: e.id, label: e.name, cls: EV_STATUS[e.status].cls, first: e.start === d });
    if (c.ms) e.milestones.forEach(ms => { if (ms.date === d) items.push({ k: 'ms', id: e.id, label: ms.title + ' · ' + e.name, cls: ms.done ? 'ms-done' : 'ms', ms }); });
  });
  if (c.ram) visibleTasks().forEach(t => { if (t.source === 'ram' && t.ram?.eventDate === d && t.status !== 'cancelled') items.push({ k: 'ram', id: t.id, label: t.title, cls: 'ram' }); });
  return items;
}
function calHeader(title) {
  const c = ST.cal;
  return `<div class="cal-bar"><div class="seg-ctl"><button class="${c.mode === 'month' ? 'on' : ''}" data-act="calMode" data-id="month">รายเดือน</button><button class="${c.mode === 'year' ? 'on' : ''}" data-act="calMode" data-id="year">ภาพรวมทั้งปี</button></div>
    <div class="cal-nav"><button class="icon-btn" data-act="calPrev" aria-label="ก่อนหน้า">${ico('left')}</button><h2>${title}</h2><button class="icon-btn" data-act="calNext" aria-label="ถัดไป">${ico('right')}</button><button class="btn btn-ghost btn-sm" data-act="calToday">วันนี้</button></div>
    <div class="cal-opts"><label class="check"><input type="checkbox" data-f="cal.ms" ${c.ms ? 'checked' : ''}> Milestone</label><label class="check"><input type="checkbox" data-f="cal.ram" ${c.ram ? 'checked' : ''}> วันจัดงาน RAM</label></div></div>`;
}
V.calendar = root => {
  const c = ST.cal;
  const actions = `<button class="btn btn-ghost" data-act="exportCal">${ico('download', 16)} Export Excel</button><button class="btn btn-ghost hide-sm" onclick="window.print()">${ico('print', 16)} พิมพ์ / PDF</button>${canManageEvents() ? `<button class="btn btn-primary" data-act="newEvent">${ico('plus', 16)} เพิ่ม Major Event</button>` : ''}`;
  const year = c.mode === 'year' ? c.y : c.y;
  const evYear = sortBy(S().events.filter(e => e.start.startsWith(year) || e.end.startsWith(year) || (e.start.slice(0, 4) <= String(year) && e.end.slice(0, 4) >= String(year))), e => e.start);
  const legend = `<div class="legend cal-legend">${Object.values(EV_STATUS).map(s => `<span><i class="${s.cls}"></i>${s.th}</span>`).join('')}<span><i class="ms"></i>Milestone</span><span><i class="ram"></i>วันจัดงาน RAM</span></div>`;
  const list = (evs) => evs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>งาน</th><th>วันจัด</th><th>สถานที่</th><th>เจ้าของงาน</th><th>กลุ่มเป้าหมาย</th><th>สถานะ</th><th>Milestone</th></tr></thead><tbody>
    ${evs.map(e => `<tr class="clickable" data-act="openEvent" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${fmtRange(e.start, e.end)}</td><td>${esc(e.venue)}</td><td>${personChip(member(e.ownerId))}</td><td>${esc(e.audience)}</td><td><span class="badge ${EV_STATUS[e.status].cls}">${EV_STATUS[e.status].th}</span></td>
    <td class="small">${e.milestones.length ? `${e.milestones.filter(m => m.done).length}/${e.milestones.length} เสร็จ` : '–'}</td></tr>`).join('')}</tbody></table></div>` : empty('calendar', 'ยังไม่มี Major Event', 'เพิ่มงานสำคัญเพื่อดูภาพรวมทั้งปี');

  if (c.mode === 'month') {
    const first = new Date(c.y, c.m, 1), startOff = first.getDay(), dim = new Date(c.y, c.m + 1, 0).getDate();
    const cells = []; const t0 = today();
    for (let i = 0; i < Math.ceil((startOff + dim) / 7) * 7; i++) {
      const dt = new Date(c.y, c.m, 1 - startOff + i), d = iso(dt), inM = dt.getMonth() === c.m;
      const items = itemsOnDay(d), hol = S().settings.holidays.find(h => h.date === d);
      const show = items.slice(0, 3);
      cells.push(`<div class="day ${inM ? '' : 'out'} ${d === t0 ? 'today' : ''} ${isOff(d) ? 'off' : ''}" data-act="openDay" data-id="${d}" tabindex="0">
        <span class="dn">${dt.getDate()}</span>${hol ? `<small class="hol" title="${esc(hol.name)}">${esc(hol.name)}</small>` : ''}
        ${show.map(it => `<div class="cev ${it.cls}" title="${esc(it.label)}">${it.k === 'ms' ? ico('flag', 11) : ''}${esc(it.label)}</div>`).join('')}
        ${items.length > 3 ? `<small class="more">+${items.length - 3} เพิ่มเติม</small>` : ''}</div>`);
    }
    const monthEv = sortBy(S().events.filter(e => e.start <= iso(new Date(c.y, c.m + 1, 0)) && e.end >= iso(first)), e => e.start);
    root.innerHTML = pageHead('Major Event Calendar', 'ปฏิทินงานสำคัญประจำปี พร้อมวันเตรียมงานและ Milestone', actions) + calHeader(`${TH_MON_FULL[c.m]} ${c.y + 543}`) + legend +
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
        cells += `<span class="${evs.length ? 'has ' + EV_STATUS[evs[0].status].cls : ''} ${ds === today() ? 'is-today' : ''}" ${evs.length ? `title="${esc(evs.map(e => e.name).join(', '))}"` : ''}>${d}</span>`;
      }
      const n = S().events.filter(e => e.start.startsWith(`${c.y}-${pad(mo + 1)}`)).length;
      mini.push(`<div class="mini" data-act="calGoMonth" data-id="${mo}" tabindex="0"><h4>${TH_MON_FULL[mo]}${n ? `<em>${n}</em>` : ''}</h4><div class="mini-grid">${cells}</div></div>`);
    }
    root.innerHTML = pageHead('Major Event Calendar', 'ภาพรวมงานสำคัญทั้งปี — คลิกเดือนเพื่อดูรายละเอียด', actions) + calHeader(`พ.ศ. ${c.y + 543}`) + legend +
      `<div class="year-grid">${mini.join('')}</div><section class="card flush mt"><div class="card-h pad"><h3>รายการทั้งหมดในปี ${c.y + 543} (${evYear.length} งาน)</h3></div>${list(evYear)}</section>`;
  }
};
ACT.calMode = el => { ST.cal.mode = el.dataset.id; render(); };
ACT.calPrev = () => { const c = ST.cal; if (c.mode === 'year') c.y--; else { c.m--; if (c.m < 0) { c.m = 11; c.y--; } } render(); };
ACT.calNext = () => { const c = ST.cal; if (c.mode === 'year') c.y++; else { c.m++; if (c.m > 11) { c.m = 0; c.y++; } } render(); };
ACT.calToday = () => { const n = new Date(); ST.cal.y = n.getFullYear(); ST.cal.m = n.getMonth(); render(); };
ACT.calGoMonth = el => { ST.cal.m = +el.dataset.id; ST.cal.mode = 'month'; render(); };
ACT.exportCal = () => {
  const rows = [['ชื่องาน', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานที่', 'เจ้าของงาน', 'กลุ่มเป้าหมาย', 'สถานะ', 'Milestone / วันเตรียมงาน']];
  S().events.filter(e => e.start.startsWith(ST.cal.y) || e.end.startsWith(ST.cal.y)).sort((a, b) => a.start.localeCompare(b.start))
    .forEach(e => rows.push([e.name, e.start, e.end, e.venue, member(e.ownerId)?.name, e.audience, EV_STATUS[e.status].th, e.milestones.map(m => `${m.date} ${m.title}${m.done ? ' ✓' : ''}`).join(' | ')]));
  downloadCSV(`major-events-${ST.cal.y}.csv`, rows); toast('ดาวน์โหลดไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)');
};
ACT.openDay = el => {
  const d = el.dataset.id, items = itemsOnDay(d), hol = S().settings.holidays.find(h => h.date === d);
  modal({
    title: fmtDY(d), body: `${hol ? `<div class="note">${esc(hol.name)} (วันหยุดบริษัท)</div>` : ''}${items.length ? `<ul class="list">${items.map(it => `<li class="clickable" data-act="${it.k === 'ram' ? 'openTask' : 'openEvent'}" data-id="${it.id}"><span class="cev ${it.cls} solo">${it.k === 'ms' ? 'Milestone' : it.k === 'ram' ? 'RAM' : 'Major Event'}</span><div class="grow"><b>${esc(it.label)}</b></div></li>`).join('')}</ul>` : '<p class="muted">ไม่มีกิจกรรมในวันนี้</p>'}`,
    actions: [{ label: 'ปิด' }].concat(canManageEvents() ? [{ label: ico('plus', 15) + ' เพิ่ม Major Event วันนี้', cls: 'btn-primary', onClick: () => { setTimeout(() => openEvent(null, d)); } }] : []),
  });
};

/* ---------- Event editor ---------- */
function openEvent(id, date) {
  const orig = id ? S().events.find(e => e.id === id) : null;
  const e = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('e_'), name: '', start: date || today(), end: date || today(), venue: '', ownerId: me().id, audience: '', status: 'planning', projectId: '', milestones: [] };
  const canEdit = !orig ? canManageEvents() : (isAdmin() || e.ownerId === me().id);
  const d = canEdit ? '' : 'disabled';
  const msRow = ms => `<div class="ms-row"><input type="date" value="${ms.date}" ${d}><input type="text" value="${esc(ms.title)}" placeholder="เช่น ส่งแบบสื่อ / เริ่มเตรียมงาน" ${d}><label class="check"><input type="checkbox" ${ms.done ? 'checked' : ''} ${d}> เสร็จ</label>${canEdit ? '<button type="button" class="icon-btn" data-rm aria-label="ลบ">' + ico('x', 15) + '</button>' : ''}</div>`;
  modal({
    title: orig ? (canEdit ? 'แก้ไข Major Event' : 'รายละเอียด Major Event') : 'เพิ่ม Major Event', wide: true,
    body: `<form id="evForm" class="form-grid" autocomplete="off">
      <label class="field full"><span>ชื่องาน *</span><input name="name" required value="${esc(e.name)}" ${d}></label>
      <label class="field"><span>วันเริ่ม *</span><input type="date" name="start" required value="${e.start}" ${d}></label>
      <label class="field"><span>วันสิ้นสุด *</span><input type="date" name="end" required value="${e.end}" ${d}></label>
      <label class="field"><span>สถานที่</span><input name="venue" value="${esc(e.venue)}" ${d}></label>
      <label class="field"><span>เจ้าของงาน</span><select name="ownerId" ${d}>${memberOptions(e.ownerId)}</select></label>
      <label class="field"><span>กลุ่มเป้าหมาย</span><input name="audience" value="${esc(e.audience)}" ${d}></label>
      <label class="field"><span>สถานะ</span><select name="status" ${d}>${Object.keys(EV_STATUS).map(k => opt(k, EV_STATUS[k].th, e.status)).join('')}</select></label>
      <label class="field full"><span>เชื่อมกับ Project (ถ้ามี)</span><select name="projectId" ${d}>${projectOptions(e.projectId, '— ไม่เชื่อม —')}</select></label>
      <div class="field full"><span>วันเตรียมงาน / Milestone</span><div id="msList" class="ms-list">${e.milestones.map(msRow).join('')}</div>
        ${canEdit ? `<button type="button" class="btn btn-ghost btn-sm" id="msAdd">${ico('plus', 14)} เพิ่ม Milestone</button>` : ''}</div></form>`,
    actions: (orig && canEdit ? [{ label: ico('trash', 15) + ' ลบ', cls: 'btn-danger-ghost', left: true, onClick: async () => { if (await confirmBox(`ลบ “${esc(e.name)}” ?`, 'ลบ', true)) { S().events = S().events.filter(x => x.id !== e.id); commit(); toast('ลบ Major Event แล้ว'); return true; } return false; } }] : [])
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
