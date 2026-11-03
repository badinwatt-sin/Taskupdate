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
/* Admin → whole team · Leader → self + reports · Staff → own work + own projects. Events are visible to everyone. */
V.dashboard = root => {
  const f = ST.dash, t0 = today(), t7 = addDays(t0, 7);
  const scope = scopeMembers().filter(m => !f.group || m.group === f.group), ids = new Set(scope.map(m => m.id));
  const team = scopeMembers().length > 1;
  const live = visibleTasks().filter(t => ids.has(t.assigneeId) && t.status !== 'cancelled');
  const c = { doing: 0, todo: 0, done: 0, delayed: 0 };
  live.forEach(t => { if (t.status === 'done') c.done++; else { if (isDelayed(t)) c.delayed++; c[t.status === 'doing' ? 'doing' : 'todo']++; } });
  const kpi = (n, l, cls = '') => `<div class="kpi2 ${cls}"><b>${n}</b><span>${l}</span></div>`;
  const attention = sortBy(live.filter(t => isActive(t) && taskEnd(t) <= t7), t => taskEnd(t)).slice(0, 5);
  const evs = sortBy(S().events.filter(e => e.status !== 'cancelled' && e.end >= t0), e => e.start).slice(0, 3);
  const off = sortBy(S().offsite.filter(o => o.end >= t0), o => o.start).slice(0, 3);
  const lvl = { high: ['หนัก', 'lv-high'], ok: ['ปกติ', 'lv-ok'], low: ['เบา', 'lv-low'] };

  const rows = scope.map(m => ({ m, w: workload(m.id) })).sort((a, b) => b.w.active - a.w.active);
  const teamTable = `<div class="table-wrap"><table class="tbl"><thead><tr><th>สมาชิก</th><th>กำลังทำ</th><th>ส่งถัดไป</th><th>ภาระงาน</th></tr></thead><tbody>${rows.map(({ m, w }) => `<tr data-act="goTodo" data-id="${m.id}" class="clickable">
    <td><div class="person">${avatar(m, 28)}<div><b>${esc(m.name)}</b><small>${esc(group(m.group).short)}</small></div></div></td>
    <td>${w.doing[0] ? `<div class="cell-task">${esc(w.doing[0].title)}</div>${w.doing.length > 1 ? `<small class="muted">+${w.doing.length - 1} งาน</small>` : ''}` : '<span class="muted">–</span>'}</td>
    <td>${w.next ? `<span class="${isDelayed(w.next) ? 'late' : ''}">${fmtD(taskEnd(w.next))}</span> <small class="muted">${fmtRel(taskEnd(w.next))}</small>` : '<span class="muted">–</span>'}</td>
    <td><span class="load-dot ${lvl[w.level][1]}"></span>${w.active} งาน${w.delayed ? ` <span class="late small">· ล่าช้า ${w.delayed}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;

  const myList = sortBy(live.filter(isActive), t => taskEnd(t)).slice(0, 6);
  const staffMain = myList.length ? `<ul class="list">${myList.map(t => `<li data-act="openTask" data-id="${t.id}" class="clickable"><div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${t.projectId ? esc(project(t.projectId)?.name) : KINDS[t.source]}</small></div>${statusBadge(t)}<span class="due ${isDelayed(t) ? 'late' : ''}">${fmtD(taskEnd(t))}</span></li>`).join('')}</ul>` : empty('check', 'ไม่มีงานค้าง', 'งานที่ได้รับมอบหมายทั้งหมดเสร็จแล้ว');

  const projs = visibleProjects().map(p => ({ p, s: projectStats(p) }));
  const projCard = projs.length ? `<section class="card"><div class="card-h"><h3>Project ของฉัน</h3><a class="link" href="#/projects">ทั้งหมด</a></div><ul class="plist">${projs.map(({ p, s }) => `<li><a href="#/projects/${p.id}"><span class="grow clip"><i style="background:${p.color}"></i>${esc(p.name)}</span><small class="muted">${s.pct}%</small></a>${progressBar(s.pct, p.color)}</li>`).join('')}</ul></section>` : '';

  const by = (!team && ['group', 'offsite'].includes(f.by || 'group')) ? 'project' : (f.by || 'group');
  const dataBy = { group: aggregate(live.filter(t => t.assigneeId), t => member(t.assigneeId)?.group, k => group(k).short), project: aggregate(live.filter(t => t.projectId), t => t.projectId, k => project(k)?.name || k), type: aggregate(live, t => t.type) }[by];
  let breakdown;
  if (by === 'offsite') {
    const days = {}; S().offsite.forEach(o => { days[o.area] = (days[o.area] || 0) + diffDays(o.start, o.end) + 1; });
    const rowsO = Object.entries(days).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, done: 0, active: v, delayed: 0 }));
    breakdown = segList(rowsO, 'ยังไม่มีบันทึก Offsite') + '<p class="muted small">จำนวนวัน Offsite แยกตามพื้นที่</p>';
  } else breakdown = segList(dataBy);
  const byTabs = (team ? [['group', 'หน้าที่'], ['project', 'Project'], ['type', 'ประเภทงาน'], ['offsite', 'Offsite']] : [['project', 'Project'], ['type', 'ประเภทงาน']]).map(([k, l]) => `<button class="${by === k ? 'on' : ''}" data-act="dashBy" data-id="${k}">${l}</button>`).join('');

  const evCard = `<section class="card"><div class="card-h"><h3>กำลังจะมาถึง</h3><a href="#/calendar" class="link">ปฏิทิน</a></div>
    ${(evs.length || off.length) ? `<ul class="list">${evs.map(e => `<li data-act="openEvent" data-id="${e.id}" class="clickable"><div class="datebox"><b>${parse(e.start).getDate()}</b><span>${TH_MON[parse(e.start).getMonth()]}</span></div><div class="grow"><b class="clip">${esc(e.name)}</b><small class="muted">Major Event · ${fmtRel(e.start)}</small></div></li>`).join('')}
    ${off.map(o => `<li data-act="openOffsite" data-id="${o.id}" class="clickable"><div class="datebox alt"><b>${parse(o.start).getDate()}</b><span>${TH_MON[parse(o.start).getMonth()]}</span></div><div class="grow"><b class="clip">${esc(o.title)}</b><small class="muted">${esc(o.area)} · ${o.personIds.map(i => member(i)?.name).filter(Boolean).join(', ')}</small></div></li>`).join('')}</ul>` : '<p class="muted small">ไม่มีกิจกรรมที่กำลังจะมาถึง</p>'}</section>`;

  root.innerHTML = pageHead(team ? 'Dashboard' : `สวัสดี ${esc(me().name)}`, team ? (isAdmin() ? 'ภาพรวมทั้งทีม' : 'ภาพรวมของคุณและทีมที่ดูแล') : 'งานของคุณและ Project ที่คุณอยู่', `${isAdmin() ? `<select data-f="dash.group" aria-label="หน้าที่">${groupOptions(f.group, 'ทุกหน้าที่')}</select>` : ''}`) + `
  <div class="kpi-row">${kpi(c.doing, 'กำลังทำ', 'doing')}${kpi(c.todo, 'ยังไม่เริ่ม')}${kpi(c.done, 'เสร็จแล้ว', 'done')}${kpi(c.delayed, 'ล่าช้า', c.delayed ? 'late' : '')}</div>
  <div class="dash-main">
    <section class="card flushy"><div class="card-h"><h3>${team ? 'ทีมกำลังทำอะไร' : 'งานของฉันที่ต้องทำ'}</h3>${team ? '' : '<a class="link" href="#/todo">แผนรายสัปดาห์</a>'}</div>${team ? teamTable : staffMain}</section>
    <div class="stack">
      ${attention.length && team ? `<section class="card"><div class="card-h"><h3>ต้องจับตา</h3><small class="muted">ภายใน 7 วัน</small></div><ul class="list">${attention.map(t => `<li data-act="openTask" data-id="${t.id}" class="clickable"><div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '–')}</small></div><span class="due ${isDelayed(t) ? 'late' : ''}">${fmtD(taskEnd(t))}</span></li>`).join('')}</ul></section>` : ''}
      ${evCard}${team ? '' : projCard}
    </div>
  </div>
  <section class="card mt"><div class="card-h"><h3>สัดส่วนงาน</h3><div class="seg-ctl sm">${byTabs}</div></div>
    <div class="legend inline"><span><i class="d"></i>เสร็จแล้ว</span><span><i class="a"></i>กำลังดำเนินการ</span><span><i class="x"></i>ล่าช้า</span></div>${breakdown}</section>
  ${team && projs.length ? `<section class="card mt">${projCard.replace(/^<section class="card">/, '').replace(/<\/section>$/, '')}</section>` : ''}`;
};
ACT.dashBy = el => { ST.dash.by = el.dataset.id; render(); };
ACT.goTodo = el => { ST.todo.user = el.dataset.id; ST.todo.week = 0; location.hash = '#/todo'; };

/* ===================== OFFSITE & EVENT SUPPORT LOG ===================== */
const offDays = o => diffDays(o.start, o.end) + 1;
const areaOptions = (sel, blank) => (blank ? opt('', blank, sel) : '') + OFFSITE_AREAS.filter(g => g.items.length).map(g => `<optgroup label="${g.label}">${g.items.map(a => opt(a, a, sel)).join('')}</optgroup>`).join('') + opt('__OTHER', 'อื่น ๆ', sel);
function offsiteRows() {
  const f = ST.tracker, q = f.q.trim().toLowerCase();
  return sortBy(S().offsite, o => o.start).reverse().filter(o =>
    (!f.area || (f.area === '__OTHER' ? o.areaType === 'OTHER' : o.area === f.area)) && (!f.who || o.personIds.includes(f.who))
    && (!f.month || o.start.startsWith(f.month) || o.end.startsWith(f.month))
    && (!q || (o.title + o.area + o.note).toLowerCase().includes(q)));
}
function offsiteSummary(rows, month) {
  const map = new Map();
  rows.forEach(o => o.personIds.forEach(id => {
    const r = map.get(id) || { id, days: new Set(), acts: 0, areas: new Set() }; r.acts++; r.areas.add(o.area);
    for (let d = o.start, n = 0; d <= o.end && n < 400; d = addDays(d, 1), n++) if (!month || d.startsWith(month)) r.days.add(d);
    map.set(id, r);
  }));
  return [...map.values()].filter(r => member(r.id)).sort((a, b) => b.days.size - a.days.size);
}
V.support = root => {
  const f = ST.tracker, rows = offsiteRows(), sum = offsiteSummary(rows, f.month), totalDays = sum.reduce((a, r) => a + r.days.size, 0);
  root.innerHTML = pageHead('Offsite & Event Support', 'บันทึกการปฏิบัติงานนอกสำนักงาน — Event และการสนับสนุนกิจกรรมที่ DCAO / RAM / อื่น ๆ',
    `<button class="btn btn-ghost" data-act="exportOffsite">${ico('download', 16)} Export Excel</button><button class="btn btn-primary" data-act="newOffsite">${ico('plus', 16)} บันทึก Offsite</button>`) + `
  <div class="filters">
    <label class="search">${ico('search', 16)}<input type="search" placeholder="ค้นหากิจกรรม / พื้นที่" value="${esc(f.q)}" data-f-live="tracker.q"></label>
    <select data-f="tracker.area" aria-label="พื้นที่">${areaOptions(f.area, 'ทุกพื้นที่')}</select>
    <select data-f="tracker.who" aria-label="บุคคล">${memberOptions(f.who, 'ทุกคน')}</select>
    <input type="month" data-f="tracker.month" value="${f.month}" aria-label="เดือน" title="เดือน (เว้นว่าง = ทั้งหมด)">
    ${(f.q || f.area || f.who || f.month) ? '<button class="btn btn-ghost btn-sm" data-act="clearTracker">ล้างตัวกรอง</button>' : ''}</div>
  <section class="card"><div class="card-h"><h3>สรุปรายบุคคล</h3><small class="muted">${f.month ? 'เดือน ' + TH_MON_FULL[+f.month.slice(5) - 1] : 'ทุกช่วงเวลา'} · แสดงเฉพาะคนที่มีการปฏิบัติงาน</small></div>
    ${sum.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>ชื่อ</th><th class="num">วัน Offsite</th><th class="num">กิจกรรม</th><th>พื้นที่</th></tr></thead><tbody>
    ${sum.map(r => `<tr><td><div class="person">${avatar(member(r.id), 26)}<b>${esc(member(r.id).name)}</b></div></td><td class="num"><b>${r.days.size}</b></td><td class="num">${r.acts}</td><td>${[...r.areas].map(a => `<span class="area-tag">${esc(a)}</span>`).join('')}</td></tr>`).join('')}
    <tr class="total"><td>รวม</td><td class="num"><b>${totalDays}</b> <small>คน-วัน</small></td><td class="num">${rows.length}</td><td></td></tr></tbody></table></div>` : '<p class="muted small">ยังไม่มีการบันทึกในช่วงนี้</p>'}</section>
  <section class="card flush mt"><div class="card-h pad"><h3>รายการบันทึก</h3><small class="muted">${rows.length} รายการ</small></div>
  ${rows.length ? `<div class="table-wrap"><table class="tbl tracker"><thead><tr><th>วันที่</th><th>กิจกรรม</th><th>พื้นที่</th><th>ผู้ปฏิบัติงาน</th><th>หมายเหตุ</th></tr></thead><tbody>
  ${rows.map(o => `<tr class="clickable" data-act="openOffsite" data-id="${o.id}"><td class="nw">${fmtRange(o.start, o.end)}<small class="muted">${offDays(o)} วัน</small></td><td class="main"><b>${esc(o.title)}</b></td><td><span class="area-tag">${esc(o.area)}</span></td>
  <td><span class="squad">${o.personIds.map(i => avatar(member(i), 26)).join('')}</span><small class="muted names">${o.personIds.map(i => member(i)?.name).filter(Boolean).join(', ')}</small></td><td class="small muted">${esc(o.note || '–')}</td></tr>`).join('')}</tbody></table></div>`
    : empty('inbox', 'ยังไม่มีบันทึก', 'บันทึกเมื่อทีมไปปฏิบัติงานนอกสำนักงาน', `<button class="btn btn-primary" data-act="newOffsite">${ico('plus', 16)} บันทึก Offsite</button>`)}</section>`;
};
ACT.clearTracker = () => { ST.tracker = { q: '', area: '', who: '', status: '', month: '' }; render(); };
ACT.exportOffsite = () => {
  const rows = [['วันเริ่ม', 'วันสิ้นสุด', 'จำนวนวัน', 'กิจกรรม', 'ประเภทพื้นที่', 'พื้นที่', 'ผู้ปฏิบัติงาน', 'หมายเหตุ']];
  offsiteRows().reverse().forEach(o => rows.push([o.start, o.end, offDays(o), o.title, o.areaType, o.area, o.personIds.map(i => member(i)?.name).join(', '), o.note]));
  rows.push([], ['สรุปรายบุคคล'], ['ชื่อ', 'วัน Offsite', 'จำนวนกิจกรรม', 'พื้นที่']);
  offsiteSummary(offsiteRows(), ST.tracker.month).forEach(r => rows.push([member(r.id).name, r.days.size, r.acts, [...r.areas].join(' / ')]));
  downloadCSV(`offsite-${today()}.csv`, rows); toast('ดาวน์โหลดไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)');
};
const canEditOffsite = o => isAdmin() || o.createdBy === me().id || o.personIds.includes(me().id);
function openOffsite(id, date) {
  const orig = id ? S().offsite.find(o => o.id === id) : null;
  const o = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('o_'), title: '', areaType: 'RAM', area: 'RAM01', start: date || today(), end: date || today(), personIds: [me().id], note: '', createdBy: me().id };
  const can = !orig || canEditOffsite(orig), d = can ? '' : 'disabled';
  const sel = o.areaType === 'OTHER' ? '__OTHER' : o.area;
  modal({
    title: orig ? (can ? 'แก้ไขบันทึก Offsite' : 'รายละเอียด Offsite') : 'บันทึกงาน Offsite / Event Support', wide: true,
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
      const f = $('#ofForm', m.el), sync = () => { $('#otherBox', m.el).hidden = f.elements.area.value !== '__OTHER'; };
      f.elements.area.onchange = sync; sync(); f.addEventListener('submit', e => e.preventDefault());
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
  return `<div class="cal-bar"><div class="seg-ctl"><button class="${c.mode === 'month' ? 'on' : ''}" data-act="calMode" data-id="month">รายเดือน</button><button class="${c.mode === 'year' ? 'on' : ''}" data-act="calMode" data-id="year">ภาพรวมทั้งปี</button></div>
    <div class="cal-nav"><button class="icon-btn" data-act="calPrev" aria-label="ก่อนหน้า">${ico('left')}</button><h2>${title}</h2><button class="icon-btn" data-act="calNext" aria-label="ถัดไป">${ico('right')}</button><button class="btn btn-ghost btn-sm" data-act="calToday">วันนี้</button></div>
    <div class="cal-opts"><label class="check"><input type="checkbox" data-f="cal.ram" ${c.ram ? 'checked' : ''}> Event Support (RAM/Other)</label></div></div>`;
}
V.calendar = root => {
  const c = ST.cal;
  const actions = `<button class="btn btn-ghost" data-act="exportCal">${ico('download', 16)} Export Excel</button><button class="btn btn-ghost hide-sm" onclick="window.print()">${ico('print', 16)} พิมพ์ / PDF</button>${canManageEvents() ? `<button class="btn btn-primary" data-act="newEvent">${ico('plus', 16)} เพิ่ม Major Event</button>` : ''}`;
  const year = c.mode === 'year' ? c.y : c.y;
  const evYear = sortBy(S().events.filter(e => e.start.startsWith(year) || e.end.startsWith(year) || (e.start.slice(0, 4) <= String(year) && e.end.slice(0, 4) >= String(year))), e => e.start);
  const legend = `<div class="legend cal-legend">${Object.values(EV_STATUS).map(s => `<span><i class="${s.cls}"></i>${s.th}</span>`).join('')}<span><i class="ram"></i>Event Support (RAM/Other)</span><span><i class="hol"></i>วันหยุด</span></div>`;
  const list = (evs) => evs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>งาน</th><th>วันจัด</th><th>สถานที่</th><th>เจ้าของงาน</th><th>กลุ่มเป้าหมาย</th><th>สถานะ</th><th>วันเตรียมงาน</th></tr></thead><tbody>
    ${evs.map(e => `<tr class="clickable" data-act="openEvent" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${fmtRange(e.start, e.end)}</td><td>${esc(e.venue)}</td><td>${personChip(member(e.ownerId))}</td><td>${esc(e.audience)}</td><td><span class="badge ${EV_STATUS[e.status].cls}">${EV_STATUS[e.status].th}</span></td>
    <td class="small">${e.milestones.length ? `${e.milestones.filter(m => m.done).length}/${e.milestones.length} เสร็จ` : '–'}</td></tr>`).join('')}</tbody></table></div>` : empty('calendar', 'ยังไม่มี Major Event', 'เพิ่มงานสำคัญเพื่อดูภาพรวมทั้งปี');

  if (c.mode === 'month') {
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
    root.innerHTML = pageHead('Major Event Calendar', 'ปฏิทินงานสำคัญประจำปี พร้อมวันเตรียมงานและวันหยุดราชการ', actions) + calHeader(`${TH_MON_FULL[c.m]} ${c.y + 543}`) + legend +
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
  const rows = [['ชื่องาน', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานที่', 'เจ้าของงาน', 'กลุ่มเป้าหมาย', 'สถานะ', 'วันเตรียมงาน']];
  S().events.filter(e => e.start.startsWith(ST.cal.y) || e.end.startsWith(ST.cal.y)).sort((a, b) => a.start.localeCompare(b.start))
    .forEach(e => rows.push([e.name, e.start, e.end, e.venue, member(e.ownerId)?.name, e.audience, EV_STATUS[e.status].th, e.milestones.map(m => `${m.date} ${m.title}${m.done ? ' ✓' : ''}`).join(' | ')]));
  downloadCSV(`major-events-${ST.cal.y}.csv`, rows); toast('ดาวน์โหลดไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)');
};
ACT.openDay = el => {
  const d = el.dataset.id, items = itemsOnDay(d), hol = holidayOf(d);
  modal({
    title: fmtDY(d), body: `${hol ? `<div class="note">${esc(hol.name)} (${hol.kind === 'public' ? 'วันหยุดราชการ' : 'วันหยุดบริษัท'})</div>` : ''}${items.length ? `<ul class="list">${items.map(it => `<li class="clickable" data-act="${it.k === 'ram' ? 'openOffsite' : 'openEvent'}" data-id="${it.id}"><span class="cev ${it.cls} solo">${it.k === 'ms' ? 'เตรียมงาน' : it.k === 'ram' ? 'Event Support' : 'Major Event'}</span><div class="grow"><b>${esc(it.label)}</b></div></li>`).join('')}</ul>` : '<p class="muted">ไม่มีกิจกรรมในวันนี้</p>'}`,
    actions: [{ label: 'ปิด' }].concat(canManageEvents() ? [{ label: ico('plus', 15) + ' เพิ่ม Major Event วันนี้', cls: 'btn-primary', onClick: () => { setTimeout(() => openEvent(null, d)); } }] : []),
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
      <div class="field full"><span>วันเตรียมงาน</span><div id="msList" class="ms-list">${e.milestones.map(msRow).join('')}</div>
        ${canEdit ? `<button type="button" class="btn btn-ghost btn-sm" id="msAdd">${ico('plus', 14)} เพิ่มวันเตรียมงาน</button>` : ''}</div></form>`,
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
