'use strict';
/* ============================================================
   Views: Projects · Squad · Kanban · Gantt
   ============================================================ */

/* ---------------- shared board filters ---------------- */
function boardTasks(f, fixedProject) {
  let ts = visibleTasks().filter(t => t.projectId || t.source === 'ram' || isPostit(t));
  const pj = fixedProject || f.project;
  if (pj === '__ram') ts = ts.filter(t => t.source === 'ram');
  else if (pj === '__postit') ts = ts.filter(isPostit);
  else if (pj) ts = ts.filter(t => t.projectId === pj);
  if (f.group) ts = ts.filter(t => member(t.assigneeId)?.group === f.group);
  if (f.who) ts = ts.filter(t => isOwner(t, f.who));
  if (f.tg) ts = ts.filter(t => t.groupId === f.tg);
  return ts;
}
function filterBar(key, fixedProject, extra = '') {
  const f = ST[key];
  const projOpts = opt('', 'ทุก Project', f.project) + visibleProjects().map(p => opt(p.id, p.name, f.project)).join('') + opt('__postit', 'Post-it ของทีม (ไม่ผูก Project)', f.project);
  return `<div class="filters">
    ${fixedProject ? '' : `<select data-f="${key}.project" aria-label="Project">${projOpts}</select>`}
    <select data-f="${key}.group" aria-label="Squad">${groupOptions(f.group, 'ทุก Squad / หน้าที่')}</select>
    <select data-f="${key}.who" aria-label="รายบุคคล">${memberOptions(f.who, 'ทุกคน')}</select>${extra}
    ${(f.group || f.who || f.tg || (!fixedProject && f.project)) ? `<button class="btn btn-ghost btn-sm" data-act="clearBoard" data-id="${key}">ล้างตัวกรอง</button>` : ''}</div>`;
}
ACT.clearBoard = el => { const f = ST[el.dataset.id]; f.group = ''; f.who = ''; f.tg = ''; if ('project' in f) f.project = ''; render(); };

/* ---------------- Kanban ---------------- */
function kanbanHTML(tasks) {
  const cols = ['todo', 'doing', 'done', 'cancelled'];
  return `<div class="kanban">${cols.map(c => {
    const ts = sortBy(tasks.filter(t => t.status === c), t => taskEnd(t));
    return `<div class="kcol k-${c}" data-col="${c}"><div class="kcol-h"><b>${STATUS[c].label}</b><span>${STATUS[c].th}</span><em>${ts.length}</em></div>
      <div class="kcol-body" data-drop="${c}">${ts.map(kcard).join('') || '<p class="kempty">ลากงานมาวางที่นี่</p>'}</div></div>`;
  }).join('')}</div><p class="muted small kb-hint">ลากการ์ด / Post-it เพื่อเปลี่ยนสถานะ · หรือกดการ์ดแล้วเลือกสถานะ · งานที่เลยวัน Target แต่ยังไม่เสร็จจะติดป้าย “เลยกำหนด” แต่ยังอยู่ในสถานะจริงของมัน</p>`;
}
function postitCard(t) {
  const m = member(t.assigneeId), st = postitOf(m), late = isDelayed(t);
  return `<article class="kcard postit pat-${st.pattern} ${late ? 'is-late' : ''}" style="--pc:${st.color}" draggable="${canStatus(t)}" data-id="${t.id}" data-act="openTask" tabindex="0">
    <div class="pi-who">${avatar(m, 26)}<span>${esc(m?.name || '–')}</span></div>
    <div class="pi-title">${esc(t.title)}</div>
    <div class="pi-foot"><span class="badge st-${t.status}">${STATUS[t.status].th}</span>${late ? `<span class="badge st-delayed" title="${OVERDUE_TIP}">เลยกำหนด</span>` : ''}<span class="grow"></span><span>${ico('clock', 12)} ${fmtD(taskEnd(t))}</span>${advBtn(t)}</div></article>`;
}
function kcard(t) {
  if (isPostit(t)) return postitCard(t);
  const p = t.projectId && project(t.projectId), risks = depRisks(t);
  return `<article class="kcard ${isDelayed(t) ? 'is-late' : ''}" draggable="${canStatus(t)}" data-id="${t.id}" data-act="openTask" tabindex="0">
    <div class="kc-top"><div class="kc-chips">${p ? `<span class="pchip" style="--c:${p.color}">${esc(p.name)}</span>` : `<span class="pchip ram">${esc(t.ram?.area || 'RAM')}</span>`}${projGroupOf(t) ? `<span class="pchip" style="--c:${projGroupOf(t).color}">${esc(projGroupOf(t).name)}</span>` : ''}</div>${prioDot(t.priority)}</div>
    <b class="kc-title">${esc(t.title)}</b>
    <div class="kc-meta"><span class="${isDelayed(t) ? 'late' : 'muted'}">${ico('clock', 13)} ${fmtD(taskEnd(t))}</span>
      ${risks.length ? `<span class="risk" title="ติดงานก่อนหน้าที่ยังไม่เสร็จ/เลยกำหนด">${ico('alert', 13)}</span>` : ''}${t.private ? `<span class="aud aud-me" title="${taskAudience(t).tip}">${ico('lock', 13)}<span class="sr">เฉพาะฉัน</span></span>` : ''}
      <span class="grow"></span>${isDelayed(t) ? `<span class="badge st-delayed" title="${OVERDUE_TIP}">เลยกำหนด</span>` : ''}${advBtn(t)}<span class="squad">${owners(t).map(id => avatar(member(id), 24)).join('')}</span></div></article>`;
}
function bindKanban(root) {
  let dragId = null;
  $$('.kcard', root).forEach(c => {
    c.addEventListener('dragstart', e => { dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
    c.addEventListener('dragend', () => { c.classList.remove('drag'); $$('.kcol-body.over', root).forEach(x => x.classList.remove('over')); });
    c.addEventListener('keydown', e => { if (e.key === 'Enter') openTask(c.dataset.id); });
  });
  $$('.kcol-body', root).forEach(b => {
    b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('over'); });
    b.addEventListener('dragleave', () => b.classList.remove('over'));
    b.addEventListener('drop', e => {
      e.preventDefault(); b.classList.remove('over');
      const t = S().tasks.find(x => x.id === (dragId || e.dataTransfer.getData('text/plain')));
      if (t && t.status !== b.dataset.drop) setStatus(t, b.dataset.drop);
    });
  });
}

/* ---------------- Gantt ---------------- */
const GZ = { day: 30, week: 14, month: 6 };
function ganttHTML(tasks, zoom, hideDone, opts) {
  if (hideDone) tasks = tasks.filter(t => isActive(t));
  if (!tasks.length) return empty('gantt', 'ไม่มีงานให้แสดง', 'ลองปรับตัวกรอง หรือเพิ่มงานใน Project');
  const px = GZ[zoom] || 30, LW = innerWidth < 720 ? 150 : 270, RH = 40, HH = 52;
  let min = null, max = null;
  tasks.forEach(t => { const a = taskStart(t), b = taskEnd(t); if (!min || a < min) min = a; if (!max || b > max) max = b; });
  const t0 = today(); if (t0 < min) min = t0; if (t0 > max) max = t0;
  min = addDays(min, -3); max = addDays(max, 6);
  const days = diffDays(min, max) + 1, W = days * px;
  let sections;
  if (opts && opts.p) {
    sections = groupTasks(sortBy(tasks, t => taskStart(t)), opts.p, opts.by).map(g => ({ name: g.name, color: g.color || opts.p.color, p: opts.p, list: g.tasks }));
  } else {
    const byKey = new Map(); sections = [];
    sortBy(tasks, t => taskStart(t)).forEach(t => {
      const k = t.projectId || (t.source === 'ram' ? '__ram' : '__postit');
      if (!byKey.has(k)) { const p = k === '__ram' || k === '__postit' ? null : project(k); const sec = { name: p ? p.name : k === '__postit' ? 'Post-it ของทีม' : 'งานสนับสนุน RAM', color: p ? p.color : k === '__postit' ? '#f59e0b' : '#d97706', p, list: [] }; byKey.set(k, sec); sections.push(sec); }
      byKey.get(k).list.push(t);
    });
  }
  // header
  let months = '', dayRow = '', off = '', curKey = null, curLabel = '', curStart = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(min, i), dt = parse(d), mk = `${dt.getFullYear()}-${dt.getMonth()}`;
    if (mk !== curKey) {
      if (curKey !== null) months += `<span style="left:${curStart * px}px;width:${(i - curStart) * px}px">${curLabel}</span>`;
      curKey = mk; curLabel = `${TH_MON_FULL[dt.getMonth()]} ${dt.getFullYear() + 543}`; curStart = i;
    }
    if (px >= 14) dayRow += `<span style="left:${i * px}px;width:${px}px" class="${isOff(d) ? 'off' : ''} ${d === t0 ? 'tod' : ''}">${px >= 28 ? `<small>${TH_DOW[dt.getDay()]}</small>` : ''}${dt.getDate()}</span>`;
    else if (dt.getDay() === 1) dayRow += `<span style="left:${i * px}px;width:${px * 7}px" class="wk">${dt.getDate()}</span>`;
    if (isOff(d)) off += `<i style="left:${i * px}px;width:${px}px"></i>`;
  }
  months += `<span style="left:${curStart * px}px;width:${(days - curStart) * px}px">${curLabel}</span>`;

  const rowIdx = new Map(); let r = 0, rows = '';
  sections.forEach(sec => {
    const p = sec.p;
    if (sec.name != null) { rows += `<div class="g-row g-group"><div class="g-label" style="width:${LW}px"><i style="background:${sec.color}"></i><b>${esc(sec.name)}</b><small class="muted">${sec.list.length}</small></div><div class="g-track" style="width:${W}px"></div></div>`; r++; }
    sec.list.forEach(t => {
      const a = taskStart(t), b = taskEnd(t), left = diffDays(min, a) * px, w = (diffDays(a, b) + 1) * px, col = (opts && opts.by === 'group' && sec.color) || (p ? p.color : '#d97706');
      rowIdx.set(t.id, { r, left, right: left + w });
      rows += `<div class="g-row"><div class="g-label clickable" style="width:${LW}px" data-act="openTask" data-id="${t.id}">${avatar(member(t.assigneeId), 22)}<div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '–')} · ${t.duration} วัน</small></div></div>
        <div class="g-track" style="width:${W}px"><div class="g-bar st-${t.status} ${isDelayed(t) ? 'late' : ''} ${depRisks(t).length ? 'risk' : ''}" style="left:${left}px;width:${w}px;--c:${col}" data-act="openTask" data-id="${t.id}" title="${esc(t.title)} · ${fmtRange(a, b)} · ${STATUS[t.status].th}${isDelayed(t) ? ' (เลยกำหนด)' : ''}">
        <i class="hl"></i><span>${w > 80 ? esc(t.title) : ''}</span><i class="hr"></i></div></div></div>`; r++;
    });
  });
  // dependency arrows
  let paths = '';
  tasks.forEach(t => (t.deps || []).forEach(did => {
    const a = rowIdx.get(did), b = rowIdx.get(t.id); if (!a || !b) return;
    const y1 = HH + a.r * RH + RH / 2, y2 = HH + b.r * RH + RH / 2, x1 = LW + a.right, x2 = LW + b.left;
    const bad = x2 < x1 + 4;
    const mx = Math.max(x1 + 10, bad ? x1 + 10 : (x1 + x2) / 2);
    const d = bad ? `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 8} V${y2} H${x2}` : `M${x1},${y1} H${mx} V${y2} H${x2 - 2}`;
    paths += `<path d="${d}" class="${bad ? 'bad' : ''}" marker-end="url(#arr${bad ? 'b' : ''})"/>`;
  }));
  const todayX = LW + (diffDays(min, t0) + .5) * px;
  const H = HH + r * RH;
  return `<div class="gantt-wrap"><div class="gantt" data-px="${px}" style="width:${LW + W}px;height:${H}px">
    <div class="g-head" style="height:${HH}px"><div class="g-label corner" style="width:${LW}px">งาน / ผู้รับผิดชอบ</div><div class="g-scale" style="width:${W}px"><div class="g-months">${months}</div><div class="g-days">${dayRow}</div></div></div>
    <div class="g-off" style="left:${LW}px;top:${HH}px;height:${H - HH}px;width:${W}px">${off}</div>
    ${rows}
    <div class="g-today" style="left:${todayX}px;top:${HH - 14}px;height:${H - HH + 14}px"><span>วันนี้</span></div>
    <svg class="g-deps" width="${LW + W}" height="${H}"><defs><marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7z" fill="#94a3b8"/></marker><marker id="arrb" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7z" fill="#ef4444"/></marker></defs>${paths}</svg>
  </div></div>
  <div class="legend gantt-legend"><span><i class="bar st-todo"></i>Not Started</span><span><i class="bar st-doing"></i>In Progress</span><span><i class="bar st-done"></i>Done</span><span><i class="bar late"></i>เลยกำหนด</span><span><i class="bar risk"></i>อาจกระทบจากงานก่อนหน้า</span><span class="muted">▦ แถบเทา = เสาร์–อาทิตย์/วันหยุด</span></div>`;
}
const zoomCtl = key => `<div class="seg-ctl sm">${[['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน']].map(([k, l]) => `<button class="${ST[key].zoom === k ? 'on' : ''}" data-act="setZoom" data-id="${key}:${k}">${l}</button>`).join('')}</div>`;
ACT.setZoom = el => { const [k, z] = el.dataset.id.split(':'); ST[k].zoom = z; render(); };

/* drag a bar to move it, drag its edges to change start/end (users who can edit the task) */
document.addEventListener('click', e => { if (window.__ganttDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
function bindGantt(root) {
  const g = $('.gantt', root); if (!g) return; const px = +g.dataset.px;
  $$('.g-bar', g).forEach(bar => {
    const t = S().tasks.find(x => x.id === bar.dataset.id); if (!t || !canFullEdit(t)) return;
    bar.classList.add('drag-ok');
    bar.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const mode = e.target.classList.contains('hl') ? 'l' : e.target.classList.contains('hr') ? 'r' : 'm';
      const x0 = e.clientX, left0 = bar.offsetLeft, w0 = bar.offsetWidth; let dd = 0, moved = false;
      bar.setPointerCapture(e.pointerId);
      const mv = ev => {
        const dx = ev.clientX - x0; if (Math.abs(dx) > 3) moved = true; dd = Math.round(dx / px);
        if (mode === 'm') bar.style.left = left0 + dd * px + 'px';
        else if (mode === 'r') bar.style.width = Math.max(px, w0 + dd * px) + 'px';
        else { bar.style.left = left0 + dd * px + 'px'; bar.style.width = Math.max(px, w0 - dd * px) + 'px'; }
      };
      const up = () => {
        bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up);
        if (!moved) return; window.__ganttDragged = true; setTimeout(() => { window.__ganttDragged = false; }, 60);
        if (!dd) return render();
        const s = taskStart(t), en = taskEnd(t), m = taskMode(t), before = { start: t.start, duration: t.duration };
        if (mode === 'm') t.start = addDays(s, dd);
        else if (mode === 'r') { let ne = addDays(en, dd); if (ne < s) ne = s; t.duration = countDays(s, ne, m); }
        else { let ns = addDays(s, dd); if (ns > en) ns = en; t.start = ns; t.duration = countDays(ns, en, m); }
        commit(); toast(`${esc(t.title)} · ${fmtRange(taskStart(t), taskEnd(t))}`, 'ok', () => { Object.assign(t, before); commit(); });
      };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up);
    });
  });
}

/* ---------------- Task List (Excel-style grid) ---------------- */
const TL_ORDER = {};
function taskListHTML(p, f) {
  const all = S().tasks.filter(t => t.projectId === p.id), idx = new Map(all.map((t, i) => [t.id, i + 1]));
  let rows = all;
  const by = ['group', 'who', 'none'].includes(f.groupBy) ? f.groupBy : 'group', secs = groupTasks(rows, p, by, !f.who && !f.group && !f.tg);
  const squad = [...new Set([p.pmId, ...p.squad])].map(member).filter(Boolean);
  const grpOpts = sel => opt('', '—', sel) + (p.taskGroups || []).map(g => opt(g.id, g.name, sel)).join('');
  const row = t => {
    const full = canFullEdit(t), d = full ? '' : 'disabled', risk = depRisks(t).length, g = projGroupOf(t);
    return `<tr data-id="${t.id}" class="${isDelayed(t) ? 'is-late' : ''} ${t.status === 'done' ? 'is-done' : ''}">
      <td class="rn">${idx.get(t.id)}</td>
      <td data-l="งาน"><input class="c-title" value="${esc(t.title)}" placeholder="ชื่องาน" ${d}></td>
      <td data-l="กลุ่มงาน"><select class="c-grp" ${d} ${g ? `style="--gc:${g.color}"` : ''}>${grpOpts(t.groupId)}</select></td>
      <td data-l="ผู้รับผิดชอบ"><button type="button" class="who-pick" data-act="pickWho" data-id="${t.id}" ${d}>${whoLabel(t)}</button></td>
      <td data-l="เริ่ม"><input type="date" class="c-start" value="${taskStart(t)}" ${d}></td>
      <td data-l="สิ้นสุด"><input type="date" class="c-end" value="${taskEnd(t)}" ${d}></td>
      <td data-l="วัน"><input type="number" min="1" class="c-dur" value="${t.duration}" ${d}></td>
      <td data-l="สถานะ"><select class="c-status st-${t.status}" ${canStatus(t) ? '' : 'disabled'}>${Object.keys(STATUS).map(k => opt(k, STATUS[k].th, t.status)).join('')}</select></td>
      <td data-l="ทำหลังแถว"><input class="c-dep" value="${(t.deps || []).map(x => idx.get(x)).filter(Boolean).join(', ')}" placeholder="เช่น 1, 2" ${d}></td>
      <td class="acts">${risk ? `<span class="risk" title="อาจกระทบกำหนดการจากงานก่อนหน้า">${ico('alert', 14)}</span>` : ''}<button class="icon-btn" data-act="openTask" data-id="${t.id}" title="รายละเอียด" aria-label="รายละเอียด">${ico('edit', 15)}</button>${full ? `<button class="icon-btn" data-act="delRow" data-id="${t.id}" title="ลบ" aria-label="ลบ">${ico('trash', 15)}</button>` : ''}</td></tr>`;
  };
  const canAdd = canManageProject(p);
  const body = secs.map(sec => {
    if (sec.name == null) return sec.tasks.map(row).join('');
    const ck = `${p.id}|${by}|${sec.key}`, closed = (ST.proj.collapsed || {})[ck], done = sec.tasks.filter(t => t.status === 'done').length, tot = sec.tasks.filter(t => t.status !== 'cancelled').length;
    let range = ''; if (sec.tasks.length) { const ss = sec.tasks.map(taskStart).sort(), ee = sec.tasks.map(taskEnd).sort(); range = fmtRange(ss[0], ee[ee.length - 1]); }
    return `<tr class="gh"><td colspan="10"><div class="gh-in"><button class="gh-t" data-act="tlToggle" data-id="${esc(ck)}" aria-expanded="${!closed}">${ico(closed ? 'right' : 'down', 15)}<i style="background:${sec.color}"></i><b>${esc(sec.name)}</b></button>
      <span class="muted small">${sec.tasks.length} งาน${range ? ' · ' + range : ''}</span><span class="gh-prog"><span class="progress"><i style="width:${tot ? Math.round(done / tot * 100) : 0}%;background:${sec.color}"></i></span><small>${done}/${tot}</small></span>
      ${canAdd || by === 'who' ? `<button class="btn btn-ghost btn-sm" data-act="addRow" data-id="${p.id}" data-gk="${esc(sec.key)}" data-by="${by}">${ico('plus', 13)} เพิ่มงาน</button>` : ''}</div></td></tr>` + (closed ? '' : sec.tasks.map(row).join(''));
  }).join('');
  return `<section class="card flush tl"><div class="table-wrap"><table class="tbl grid"><thead><tr><th>#</th><th>งาน</th><th>กลุ่มงาน</th><th>ผู้รับผิดชอบ <small>(สูงสุด 2)</small></th><th>เริ่ม</th><th>สิ้นสุด</th><th>วัน</th><th>สถานะ</th><th>ทำหลังแถว</th><th></th></tr></thead>
    <tbody id="tlBody">${body}</tbody></table></div>
    <div class="tl-foot"><button class="btn btn-ghost btn-sm" data-act="addRow" data-id="${p.id}">${ico('plus', 14)} เพิ่มบรรทัด</button>
    <span class="muted small">กรอกชื่องาน เลือกกลุ่มงานและผู้รับผิดชอบ (ได้ 2 คน) แล้วกรอกวันที่ 2 ใน 3 ช่อง (เริ่ม / สิ้นสุด / วัน) ระบบคำนวณที่เหลือให้ · กด Enter ที่ช่องชื่อเพื่อขึ้นบรรทัดใหม่ · ปรับวันแบบลากได้ที่แท็บ Gantt Chart</span></div></section>`;
}
function bindTaskList(root, p) {
  const body = $('#tlBody', root); if (!body) return;
  const get = el => S().tasks.find(x => x.id === el.closest('tr').dataset.id);
  body.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('c-title')) return; e.preventDefault();
    const tr = e.target.closest('tr'), next = tr.nextElementSibling, cur = S().tasks.find(x => x.id === tr.dataset.id);
    if (next && !next.classList.contains('gh')) $('.c-title', next).focus(); else ACT.addRow({ dataset: { id: p.id }, inherit: cur });
  });
  body.addEventListener('change', e => {
    const el = e.target, t = get(el); if (!t) return;
    if (el.classList.contains('c-title')) { t.title = el.value.trim(); Store.save(); }
    else if (el.classList.contains('c-grp')) { t.groupId = el.value; commit(); }
    else if (el.classList.contains('c-status')) setStatus(t, el.value);
    else if (el.classList.contains('c-dep')) {
      const all = S().tasks.filter(x => x.projectId === p.id);
      t.deps = [...new Set(el.value.split(/[,\s]+/).map(n => all[parseInt(n, 10) - 1]?.id).filter(x => x && x !== t.id))]; commit();
    } else if (/c-(start|end|dur)/.test(el.className)) {
      const tr = el.closest('tr'), ch = el.classList.contains('c-start') ? 'start' : el.classList.contains('c-end') ? 'end' : 'duration';
      const order = [ch, ...(TL_ORDER[t.id] || ['start', 'duration']).filter(x => x !== ch)].slice(0, 2); TL_ORDER[t.id] = order;
      const third = ['start', 'end', 'duration'].find(k => !order.includes(k)), m = taskMode(t);
      const s = $('.c-start', tr), en = $('.c-end', tr), du = $('.c-dur', tr);
      if (third === 'end' && s.value) en.value = calcEnd(s.value, du.value, m);
      if (third === 'start' && en.value) s.value = calcStart(en.value, du.value, m);
      if (third === 'duration') { const n = s.value && en.value ? countDays(s.value, en.value, m) : 0; if (!n) { toast('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม', 'error'); return render(); } du.value = n; }
      t.start = s.value; t.duration = Math.max(1, parseInt(du.value, 10) || 1); Store.save();
      [[s, 'start'], [en, 'end'], [du, 'duration']].forEach(([i, k]) => i.classList.toggle('auto', k === third));
    }
  });
}
ACT.addRow = el => {
  const p = project(el.dataset.id), all = S().tasks.filter(t => t.projectId === p.id), last = all[all.length - 1];
  const by = el.dataset.by || ST.proj.groupBy || 'group', gk = el.dataset.gk || '', inh = el.inherit || null;
  const t = newTask('project', { projectId: p.id, assigneeId: by === 'who' && gk ? gk : '', start: last ? addDays(taskEnd(last), 1) : today(), duration: 1,
    groupId: by === 'group' ? (gk || inh?.groupId || '') : '' });
  if (taskMode(t) === 'working') t.start = nextWork(t.start);
  S().tasks.push(t); commit(); setTimeout(() => { const i = $$('#tlBody .c-title'); i.length && i[i.length - 1].focus(); }, 30);
};
ACT.delRow = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t) deleteTask(t); };

/* ---------------- Board page (all projects) ---------------- */
V.board = root => {
  const f = ST.board, tasks = boardTasks(f);
  const tabs = `<div class="seg-ctl"><button class="${f.tab === 'kanban' ? 'on' : ''}" data-act="boardTab" data-id="board:kanban">${ico('board', 15)} Kanban</button><button class="${f.tab === 'gantt' ? 'on' : ''}" data-act="boardTab" data-id="board:gantt">${ico('gantt', 15)} Gantt Chart</button></div>`;
  const extra = f.tab === 'gantt' ? zoomCtl('board') + `<label class="check"><input type="checkbox" data-f="board.hideDone" ${f.hideDone ? 'checked' : ''}> ซ่อนงานที่เสร็จแล้ว</label>` : '';
  root.innerHTML = pageHead(pageName('board'), 'งานเดียวกัน ดูได้หลายมุม — เปลี่ยนสถานะที่ไหนก็อัปเดตตรงกันทุกหน้า', tabs)
    + filterBar('board', null, extra) + (f.tab === 'kanban' ? kanbanHTML(tasks) : ganttHTML(tasks, f.zoom, f.hideDone));
  if (f.tab === 'kanban') bindKanban(root); else bindGantt(root);
};
ACT.boardTab = el => { const [k, t] = el.dataset.id.split(':'); ST[k].tab = t; render(); };

/* ======================= PROJECT POSTERS ======================= */
const POSTERS = new Map();   // "id@v" -> data URL
async function posterData(p) {
  if (!p || !p.poster) return null;
  if (p.poster.data) return p.poster.data;   // demo / local mode keeps it inline
  const key = `${p.poster.id}@${p.poster.v}`; if (POSTERS.has(key)) return POSTERS.get(key);
  const pr = fetch('api/img?id=' + encodeURIComponent(p.poster.id), { headers: Store.headers() }).then(r => r.ok ? r.json() : null).then(j => j?.data || null).catch(() => null);
  POSTERS.set(key, pr); const d = await pr; if (d) POSTERS.set(key, d); else POSTERS.delete(key);   // a failed load is retried next time
  return d;
}
/* cover = poster (blurred backdrop + whole image) or, when there is none, a generated cover in the project colour */
const coverHTML = (p, cls = '') => {
  const words = (p.name || '').replace(/\d{4}/g, '').trim().split(/\s+/).filter(Boolean);
  const mono = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || 'P').slice(0, 2)).toUpperCase();
  return `<div class="pcover ${cls} ${p.poster ? 'has-img' : ''}" style="--c:${p.color}" data-cover="${p.id}"><span class="pc-mono">${esc(mono)}</span></div>`;
};
const COVER_IO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { COVER_IO.unobserve(e.target); loadCover(e.target); } }), { rootMargin: '300px' }) : null;
function hydrateCovers(root) { $$('[data-cover]', root).forEach(el => { if (!project(el.dataset.cover)?.poster) return; if (COVER_IO) COVER_IO.observe(el); else loadCover(el); }); }   // fetch posters only as they come into view
function loadCover(el) {
  [el].forEach(async el => {
    const p = project(el.dataset.cover), d = await posterData(p); if (!d || !el.isConnected) return;
    el.style.setProperty('--img', `url("${d}")`); el.innerHTML = `<img src="${d}" alt="โปสเตอร์ ${esc(p.name)}" loading="lazy">`; el.classList.add('ready');
  });
}
function compressImage(file, maxSide = 1100, maxBytes = 420000) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('เลือกไฟล์รูปภาพ (JPG / PNG)'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, maxSide / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
      let q = .86, d = cv.toDataURL('image/jpeg', q);
      while (d.length > maxBytes && q > .45) { q -= .08; d = cv.toDataURL('image/jpeg', q); }
      if (d.length > maxBytes) { const c2 = document.createElement('canvas'); c2.width = cv.width * .7; c2.height = cv.height * .7; c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height); d = c2.toDataURL('image/jpeg', .7); }
      resolve(d);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านรูปนี้ไม่ได้ — ลองไฟล์ JPG หรือ PNG')); };
    img.src = url;
  });
}
async function savePoster(p, data) {   // data URL or null (remove)
  if (Store.mode !== 'server') { p.poster = data ? { data, v: Date.now() } : null; return; }
  const id = 'pp_' + p.id.replace(/[^a-z0-9_]/gi, '');
  const r = await fetch('api/img?id=' + id, { method: 'PUT', headers: Store.headers(true), body: JSON.stringify({ data }) });
  if (!r.ok) { let m = 'อัปโหลดรูปไม่สำเร็จ'; try { m = (await r.json()).error || m; } catch (e) { } throw new Error(m); }
  p.poster = data ? { id, v: Date.now() } : null;
  if (data) POSTERS.set(`${id}@${p.poster.v}`, data);
}
function pickPoster(p, done) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try { const d = await compressImage(f); await savePoster(p, d); commit(); toast('อัปเดตโปสเตอร์แล้ว'); done && done(d); } catch (e) { toast(e.message, 'error'); }
  };
  inp.click();
}
ACT.posterPick = el => { const p = project(el.dataset.id); if (p && canManageProject(p)) pickPoster(p); };
ACT.posterView = async el => {
  const p = project(el.dataset.id), d = await posterData(p);
  if (!d) return canManageProject(p) ? pickPoster(p) : null;
  modal({ title: p.name, wide: true, cls: 'poster-modal', body: `<img class="poster-full" src="${d}" alt="โปสเตอร์ ${esc(p.name)}">`,
    actions: canManageProject(p) ? [{ label: ico('trash', 15) + ' ลบโปสเตอร์', cls: 'btn-danger-ghost', left: true, onClick: async () => { try { await savePoster(p, null); commit(); toast('ลบโปสเตอร์แล้ว'); } catch (e) { toast(e.message, 'error'); return false; } } },
      { label: 'เปลี่ยนรูป', onClick: () => { pickPoster(p); } }, { label: 'ปิด', cls: 'btn-primary' }] : [{ label: 'ปิด', cls: 'btn-primary' }] });
};

/* ======================= PROJECTS ======================= */
V.projects = (root, id) => {
  if (id) return projectDetail(root, id);
  const ps = visibleProjects();
  root.innerHTML = pageHead(pageName('projects'), 'โครงการและ Squad — สร้าง Project จัด Squad ข้ามหน้าที่ และติดตามความคืบหน้า',
    '') +
    (ps.length ? `<div class="pcards">${ps.map(p => {
      const s = projectStats(p), pm = member(p.pmId);
      return `<a class="pcard has-cover" href="#/projects/${p.id}" style="--c:${p.color}">${coverHTML(p)}
        <div class="pc-top"><h3>${esc(p.name)}</h3>${s.delayed ? `<span class="badge st-delayed" title="${OVERDUE_TIP}">${s.delayed} เลยกำหนด</span>` : ''}</div>
        <p class="goal clip2">${esc(p.goal || 'ยังไม่ได้ระบุเป้าหมาย')}</p>
        <div class="pc-meta"><span>PM: ${personChip(pm, 20)}</span><span>${s.end ? fmtRange(s.start, s.end) : '–'}</span></div>
        ${progressBar(s.pct, p.color)}<div class="pc-foot"><span>${s.unplanned ? 'ยังไม่ได้วางแผน · ยังไม่มีงาน' : `${s.done}/${s.total} งานเสร็จ · ${s.pct}%`}</span><span class="squad">${p.squad.slice(0, 6).map(id => avatar(member(id), 24)).join('')}${p.squad.length > 6 ? `<em>+${p.squad.length - 6}</em>` : ''}</span></div></a>`;
    }).join('')}</div>` : empty('folder', 'ยังไม่มี Project', 'สร้าง Project แรกเพื่อเริ่มจัด Squad และวางแผนงาน', `<button class="btn btn-primary" data-act="newProject">${ico('plus', 16)} ${ACTION.newProject[0]}</button>`));
};
ACT.newProject = () => openProject(null);
const _vProjects = V.projects; V.projects = (root, id) => { _vProjects(root, id); hydrateCovers(root); };

function projectDetail(root, id) {
  const p = project(id); if (!p || !visibleProjects().includes(p)) { location.hash = '#/projects'; return; }
  const f = ST.proj, s = projectStats(p), pm = member(p.pmId), can = canManageProject(p);
  f.group = ''; f.who = ''; f.tg = '';   // project pages show everything — filters were removed
  const tabs = [['tasks', 'Task List'], ['gantt', 'Gantt Chart'], ['kanban', 'Kanban'], ['overview', 'Overview']];
  const mode = p.dayMode || S().settings.dayMode;
  const tasks = boardTasks(f, p.id);
  let content = '';
  if (f.tab === 'overview') {
    const sq = S().groups.map(g => ({ g, ms: p.squad.map(member).filter(m => m && m.group === g.id) })).filter(x => x.ms.length);
    const upcoming = sortBy(S().tasks.filter(t => t.projectId === p.id && isActive(t)), t => taskEnd(t)).slice(0, 5);
    content = `<div class="two-col"><section class="card"><div class="card-h"><h3>เป้าหมาย Project</h3></div><p class="goal-full">${esc(p.goal || '—')}</p>
      <dl class="facts"><div><dt>Project Manager</dt><dd>${personChip(pm)}</dd></div><div><dt>ช่วงเวลา</dt><dd>${s.end ? fmtRange(s.start, s.end) : '–'}</dd></div><div><dt>การนับวัน</dt><dd>${mode === 'working' ? 'วันทำงาน (ไม่รวมเสาร์–อาทิตย์/วันหยุดบริษัท)' : 'วันปฏิทิน'}${p.dayMode ? '' : ' <small class="muted">(ค่าเริ่มต้นของทีม)</small>'}</dd></div><div><dt>ความคืบหน้า</dt><dd>${s.unplanned ? '<small class="muted">ยังไม่ได้วางแผน — ยังไม่มีงานใน Project นี้</small>' : `${progressBar(s.pct, p.color)}<small>${s.done}/${s.total} งาน · ${s.pct}%</small>`}</dd></div></dl></section>
      <section class="card"><div class="card-h"><h3>Squad (${p.squad.length} คน)</h3>${can ? `<button class="btn btn-ghost btn-sm" data-act="editProject" data-id="${p.id}">จัด Squad</button>` : ''}</div>
      ${sq.map(x => `<div class="squad-g"><div>${groupChip(x.g)}</div><div class="squad-m">${x.ms.map(m => `<span class="person">${avatar(m, 26)}<span>${esc(m.name)}${m.id === p.pmId ? ' <span class="pm">PM</span>' : ''}</span></span>`).join('')}</div></div>`).join('') || '<p class="muted pad">ยังไม่มีสมาชิก</p>'}</section></div>
      ${(p.taskGroups || []).length ? `<section class="card mt"><div class="card-h"><h3>ความคืบหน้าตามกลุ่มงาน</h3>${can ? `<button class="btn btn-ghost btn-sm" data-act="editGroups" data-id="${p.id}">จัดการกลุ่มงาน</button>` : ''}</div><div class="grp-prog">${groupTasks(S().tasks.filter(t => t.projectId === p.id && t.status !== 'cancelled'), p, 'group', true).map(g => { const d = g.tasks.filter(t => t.status === 'done').length, late = g.tasks.filter(isDelayed).length; return `<div class="gp"><div class="gp-h"><i style="background:${g.color}"></i><b>${esc(g.name)}</b>${late ? `<span class="badge st-delayed" title="${OVERDUE_TIP}">${late} เลยกำหนด</span>` : ''}</div>${progressBar(g.tasks.length ? Math.round(d / g.tasks.length * 100) : 0, g.color)}<small class="muted">${d}/${g.tasks.length} งาน</small></div>`; }).join('')}</div></section>` : ''}
      <section class="card mt"><div class="card-h"><h3>งานที่ใกล้ถึงกำหนด</h3></div>${upcoming.length ? `<ul class="list">${upcoming.map(t => `<li class="clickable" data-act="openTask" data-id="${t.id}">${avatar(member(t.assigneeId), 26)}<div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '')}</small></div>${statusBadge(t)}<span class="due ${isDelayed(t) ? 'late' : ''}">${fmtD(taskEnd(t))}<small>${fmtRel(taskEnd(t))}</small></span></li>`).join('')}</ul>` : '<p class="muted pad">ไม่มีงานค้าง</p>'}</section>`;
  } else if (f.tab === 'tasks') {
    content = projTools(p) + taskListHTML(p, f);
  } else if (f.tab === 'kanban') {
    content = kanbanHTML(tasks);
  } else {
    content = projTools(p, zoomCtl('proj')) + ganttHTML(tasks, f.zoom, false, { p, by: ['group', 'who', 'none'].includes(f.groupBy) ? f.groupBy : 'group' });
  }
  root.innerHTML = `<a class="back" href="#/projects">${ico('left', 16)} ${pageName('projects')}</a>
    <div class="proj-head with-cover" style="--c:${p.color}"><button type="button" class="ph-cover" data-act="posterView" data-id="${p.id}" aria-label="${p.poster ? 'ดูโปสเตอร์' : can ? 'เพิ่มโปสเตอร์' : 'โปสเตอร์'}">${coverHTML(p, 'sm')}${can && !p.poster ? `<span class="ph-add">${ico('image', 14)} เพิ่มโปสเตอร์</span>` : ''}</button><div class="ph-text"><h1>${esc(p.name)}</h1><p>PM: ${esc(pm?.name || '–')} · ${s.unplanned ? 'ยังไม่ได้วางแผน (ยังไม่มีงาน)' : `${s.total} งาน · ${s.pct}% เสร็จ`}${s.delayed ? ` · <span class="late">${s.delayed} งานเลยกำหนด</span>` : ''}</p></div>
      <div class="head-actions">${can ? `<button class="btn btn-ghost" data-act="editGroups" data-id="${p.id}">${ico('layers', 16)} กลุ่มงาน</button><button class="btn btn-ghost" data-act="reschedule" data-id="${p.id}" title="เลื่อนงานที่ต้องทำหลังให้เริ่มต่อจากงานก่อนหน้า">${ico('swap', 16)} จัดตารางตามลำดับงาน</button><button class="btn btn-ghost" data-act="editProject" data-id="${p.id}">${ico('edit', 16)} แก้ไข</button>` : ''}</div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${f.tab === k ? 'on' : ''}" data-act="boardTab" data-id="proj:${k}">${l}</button>`).join('')}</div>${content}`;
  if (f.tab === 'kanban') bindKanban(root); else if (f.tab === 'gantt') bindGantt(root); else if (f.tab === 'tasks') bindTaskList(root, p);
}
ACT.editProject = el => openProject(el.dataset.id);
ACT.reschedule = async el => {
  const p = project(el.dataset.id);
  if (!await confirmBox('ระบบจะเลื่อนวันเริ่มของงานที่ต้องทำหลังงานอื่น ให้เริ่มต่อจากงานก่อนหน้า (ไม่ดึงงานให้เร็วขึ้น และสมมติว่างานที่เลยกำหนดจะเสร็จวันนี้) ดำเนินการต่อหรือไม่?', 'จัดตาราง')) return;
  const before = JSON.stringify(S().tasks);
  const n = reschedule(p.id); commit();
  n ? toast(`เลื่อนกำหนดการ ${n} รายการ`, 'ok', () => { S().tasks = JSON.parse(before); commit(); }) : toast('กำหนดการสอดคล้องกันอยู่แล้ว');
};

function openProject(id) {
  const orig = id ? project(id) : null;
  const p = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('p_'), name: '', pmId: me().id, goal: '', squad: [me().id], start: today(), dayMode: null, color: ['#4f46e5', '#0891b2', '#db2777', '#d97706', '#059669', '#7c3aed'][S().projects.length % 6] };
  const full = !orig || isAdmin() || orig.pmId === me().id;
  let posterNew;   // undefined = unchanged · data URL = new image · null = remove
  modal({
    title: orig ? 'แก้ไข Project' : 'สร้าง Project ใหม่', wide: true,
    body: `<form id="pjForm" class="form-grid" autocomplete="off">
      <label class="field full"><span>ชื่อ Project *</span><input name="name" required value="${esc(p.name)}" placeholder="เช่น Customer Appreciation Night 2026"></label>
      <label class="field"><span>Project Manager *</span><select name="pmId">${memberOptions(p.pmId)}</select></label>
      <label class="field"><span>วันเริ่มต้น Project</span><input type="date" name="start" value="${p.start}"></label>
      <label class="field full"><span>เป้าหมาย Project</span><textarea name="goal" rows="2">${esc(p.goal)}</textarea></label>
      <label class="field"><span>วิธีนับระยะเวลางาน</span><select name="dayMode">${opt('', `ตามค่าเริ่มต้นของทีม (${S().settings.dayMode === 'working' ? 'วันทำงาน' : 'วันปฏิทิน'})`, p.dayMode || '')}${opt('working', 'วันทำงาน (ข้ามเสาร์–อาทิตย์ + วันหยุดบริษัท)', p.dayMode)}${opt('calendar', 'วันปฏิทิน (นับทุกวัน)', p.dayMode)}</select></label>
      <label class="field"><span>สีประจำ Project</span><input type="color" name="color" value="${p.color}"></label>
      <div class="field full"><span>โปสเตอร์ / ภาพประกอบงาน <small class="muted">(ไม่ใส่ก็ได้ — ระบบทำปกให้อัตโนมัติจากชื่อและสี)</small></span>
        <div class="poster-edit"><div id="pjCover">${coverHTML(p, 'sm')}</div><div class="pe-btns"><button type="button" class="btn btn-ghost btn-sm" id="pjPosterPick">${ico('image', 14)} ${p.poster ? 'เปลี่ยนรูป' : 'เลือกรูป'}</button>${p.poster ? '<button type="button" class="btn btn-danger-ghost btn-sm" id="pjPosterDel">ลบรูป</button>' : ''}<small class="muted">JPG / PNG · ระบบย่อรูปให้อัตโนมัติ</small></div></div></div>
      <div class="field full"><span>Squad — เลือกสมาชิกข้ามหน้าที่</span><div class="squad-pick">
        ${S().groups.map(g => { const ms = S().members.filter(m => m.group === g.id); return ms.length ? `<div class="sp-g"><div>${groupChip(g)}</div><div class="sp-m">${ms.map(m => `<label class="pill"><input type="checkbox" value="${m.id}" ${p.squad.includes(m.id) ? 'checked' : ''}><span>${avatar(m, 20)}${esc(m.name)}</span></label>`).join('')}</div></div>` : ''; }).join('')}</div></div></form>`,
    actions: (orig && full ? [{ label: ico('trash', 15) + ' ลบ Project', cls: 'btn-danger-ghost', left: true, onClick: async () => {
      const n = S().tasks.filter(t => t.projectId === p.id).length;
      if (await confirmBox(`ลบ Project “${esc(p.name)}” และงานทั้งหมด ${n} รายการ? การกระทำนี้ย้อนกลับไม่ได้`, 'ลบ Project', true)) {
        if (p.poster) savePoster(p, null).catch(() => { });
        S().projects = S().projects.filter(x => x.id !== p.id); S().tasks = S().tasks.filter(t => t.projectId !== p.id);
        S().events.forEach(e => { if (e.projectId === p.id) e.projectId = null; });
        location.hash = '#/projects'; commit(); toast('ลบ Project แล้ว'); return true;
      } return false;
    } }] : []).concat([{ label: 'ยกเลิก' }, {
      label: 'บันทึก', cls: 'btn-primary', onClick: async () => {
        const f = $('#pjForm'); if (!f.reportValidity()) return false;
        const squad = $$('.squad-pick input:checked', f).map(i => i.value);
        if (!squad.includes(f.elements.pmId.value)) squad.push(f.elements.pmId.value);
        Object.assign(p, { name: f.elements.name.value.trim(), pmId: f.elements.pmId.value, start: f.elements.start.value, goal: f.elements.goal.value, dayMode: f.elements.dayMode.value || null, color: f.elements.color.value, squad });
        if (posterNew !== undefined) { try { await savePoster(p, posterNew); } catch (e) { toast(e.message, 'error'); return false; } }
        if (orig) Object.assign(orig, p); else S().projects.push(p);
        commit(); toast('บันทึก Project แล้ว'); if (!orig) location.hash = '#/projects/' + p.id;
      },
    }]),
    onOpen(m) {
      $('#pjForm', m.el).addEventListener('submit', e => e.preventDefault());
      const show = d => { const c = $('#pjCover', m.el); if (d) c.innerHTML = `<div class="pcover sm has-img ready" style="--img:url('${d}')"><img src="${d}" alt=""></div>`; else { c.innerHTML = coverHTML({ ...p, poster: null, color: $('#pjForm', m.el).elements.color.value, name: $('#pjForm', m.el).elements.name.value || p.name }, 'sm'); } };
      hydrateCovers(m.el);
      $('#pjPosterPick', m.el).onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { try { posterNew = await compressImage(inp.files[0]); show(posterNew); } catch (e) { toast(e.message, 'error'); } }; inp.click(); };
      const del = $('#pjPosterDel', m.el); if (del) del.onclick = () => { posterNew = null; show(null); del.remove(); };
      ['name', 'color'].forEach(n => $('#pjForm', m.el).elements[n].addEventListener('input', () => { if (posterNew === undefined ? !p.poster : !posterNew) show(null); }));
    },
  });
}

ACT.tlToggle = el => { const c = (ST.proj.collapsed ||= {}); c[el.dataset.id] = !c[el.dataset.id]; render(); };

/* ---------------- project task groups manager ---------------- */
function projTools(p, extra = '') {
  const g = ['group', 'who', 'none'].includes(ST.proj.groupBy) ? ST.proj.groupBy : 'group';
  return `<div class="proj-tools"><div class="seg-ctl" role="group" aria-label="จัดกลุ่มตาม">${[['group', 'ตามกลุ่มงาน'], ['who', 'ตามผู้รับผิดชอบ'], ['none', 'ไม่จัดกลุ่ม']].map(([k, l]) => `<button type="button" class="${g === k ? 'on' : ''}" data-act="projGroupBy" data-id="${k}">${l}</button>`).join('')}</div>${extra}</div>`;
}
ACT.projGroupBy = el => { ST.proj.groupBy = el.dataset.id; render(); };
/* who's on a task: up to 2 people, picked with check boxes */
const whoLabel = t => { const ps = owners(t).map(member).filter(Boolean); return ps.length ? `<span class="squad">${ps.map(m => avatar(m, 22)).join('')}</span><span class="wl-n">${ps.map(m => esc(m.name)).join(', ')}</span>` : `<span class="wl-add">${ico('plus', 13)} เลือก</span>`; };
let POP = null;
function closePop() {
  if (!POP) return; const P = POP; POP = null;
  P.el.remove(); document.removeEventListener('pointerdown', P.out, true); document.removeEventListener('keydown', P.key, true); removeEventListener('scroll', P.scroll, true);
  P.done && P.done();
}
function pickPeople(anchor, pool, sel, onChange, onDone, max = 2) {
  closePop(); sel = sel.filter(Boolean).slice(0, max);
  const el = document.createElement('div'); el.className = 'pop ppl-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'เลือกผู้รับผิดชอบ');
  const draw = () => {
    el.innerHTML = `<div class="pop-h"><b>ผู้รับผิดชอบ</b><small>เลือกได้สูงสุด ${max} คน · คนแรกคือผู้รับผิดชอบหลัก</small></div><div class="pop-list">${pool.map(m => {
      const on = sel.includes(m.id), dis = !on && sel.length >= max;
      return `<label class="pp-row ${on ? 'on' : ''} ${dis ? 'dis' : ''}"><input type="checkbox" value="${m.id}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>${avatar(m, 28)}<span class="grow">${esc(m.name)}<small>${esc(m.position || '')}</small></span>${on ? `<em>${sel[0] === m.id ? 'หลัก' : 'ร่วม'}</em>` : ''}</label>`;
    }).join('') || '<p class="muted small pad">ยังไม่มีคนใน Squad — เพิ่มได้ที่ “แก้ไข” Project</p>'}</div><div class="pop-f"><button type="button" class="btn btn-primary btn-sm" data-pop="done">เสร็จ</button></div>`;
  };
  draw(); document.body.appendChild(el);
  el.addEventListener('change', e => { const v = e.target.value; if (e.target.checked) { if (sel.length < max) sel.push(v); } else sel = sel.filter(x => x !== v); onChange(sel.slice()); draw(); });
  el.addEventListener('click', e => { if (e.target.closest('[data-pop=done]')) closePop(); });
  const W = Math.min(320, innerWidth - 24); el.style.width = W + 'px';
  const place = () => {
    const r = anchor.getBoundingClientRect(), h = el.offsetHeight;
    let top = r.bottom + 6; if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 6);
    el.style.top = top + 'px'; el.style.left = Math.min(Math.max(12, r.left), innerWidth - W - 12) + 'px';
    return r;
  };
  place();
  POP = { el, done: onDone,
    out: e => { if (!el.contains(e.target) && !anchor.contains(e.target)) closePop(); },
    key: e => { if (e.key === 'Escape') { e.stopPropagation(); closePop(); } },
    scroll: e => { if (el.contains(e.target)) return; const r = place(); if (!anchor.isConnected || r.bottom < 0 || r.top > innerHeight) closePop(); } };   // follow the button; close once it leaves the screen
  setTimeout(() => { if (!POP || POP.el !== el) return; document.addEventListener('pointerdown', POP.out, true); document.addEventListener('keydown', POP.key, true); addEventListener('scroll', POP.scroll, true); if (matchMedia('(pointer:fine)').matches) el.querySelector('input:not([disabled])')?.focus({ preventScroll: true }); }, 0);
}
ACT.pickWho = el => {
  const t = S().tasks.find(x => x.id === el.dataset.id); if (!t) return;
  if (!canFullEdit(t)) return toast('แก้ผู้รับผิดชอบได้เฉพาะ PM, ผู้สร้างงาน หรือ Admin', 'error');
  if (POP && POP.anchor === el) return closePop();
  const p = project(t.projectId), pool = [...new Set([p?.pmId, ...(p?.squad || []), ...owners(t)])].map(member).filter(Boolean);
  let changed = false;
  pickPeople(el, pool, owners(t), ids => { t.assigneeId = ids[0] || ''; t.coId = ids[1] || null; changed = true; Store.save(); el.innerHTML = whoLabel(t); },
    () => { if (changed) render(); });
  POP.anchor = el;
};
function openTaskGroups(pid) {
  const p = project(pid); if (!p || !canManageProject(p)) return;
  const PAL = ['#5856d6', '#007aff', '#34c759', '#ff9500', '#ff2d92', '#af52de', '#00c7be', '#8e8e93'];
  const row = g => `<div class="tg-row" data-id="${g.id}"><input type="color" value="${g.color}" aria-label="สี"><input class="tg-name" value="${esc(g.name)}" placeholder="ชื่อกลุ่มงาน เช่น Production" maxlength="40"><small class="muted tg-n">${S().tasks.filter(t => t.projectId === p.id && t.groupId === g.id).length} งาน</small><button type="button" class="icon-btn" data-rm aria-label="ลบกลุ่ม">${ico('trash', 15)}</button></div>`;
  modal({
    title: `กลุ่มงานใน ${p.name}`,
    body: `<p class="muted small mb">แบ่งงานใน Project เป็นกลุ่ม/เฟส เช่น Pre-event, Production, Communication เพื่อดูใน Task List, Gantt และ Kanban เป็นกลุ่ม ๆ · ลบกลุ่มแล้วงานในกลุ่มจะกลายเป็น “ไม่ระบุกลุ่ม”</p><div id="tgList" class="tg-list">${(p.taskGroups || []).map(row).join('')}</div><button type="button" class="btn btn-ghost btn-sm" id="tgAdd">${ico('plus', 14)} เพิ่มกลุ่มงาน</button>`,
    actions: [{ label: 'ยกเลิก' }, { label: 'บันทึก', cls: 'btn-primary', onClick: () => {
      const rows = $$('#tgList .tg-row'), next = [];
      for (const r of rows) { const name = $('.tg-name', r).value.trim(); if (!name) continue; next.push({ id: r.dataset.id, name, color: $('input[type=color]', r).value }); }
      const keep = new Set(next.map(g => g.id)); S().tasks.forEach(t => { if (t.projectId === p.id && t.groupId && !keep.has(t.groupId)) t.groupId = ''; });
      p.taskGroups = next; if (ST.proj.tg && !keep.has(ST.proj.tg)) ST.proj.tg = ''; commit(); toast('บันทึกกลุ่มงานแล้ว');
    } }],
    onOpen(m) {
      const list = $('#tgList', m.el), bind = () => $$('[data-rm]', list).forEach(b => b.onclick = () => b.closest('.tg-row').remove());
      bind();
      $('#tgAdd', m.el).onclick = () => { const n = list.children.length; list.insertAdjacentHTML('beforeend', row({ id: uid('g_'), name: '', color: PAL[n % PAL.length] })); bind(); $$('.tg-name', list).pop().focus(); };
    },
  });
}
ACT.editGroups = el => openTaskGroups(el.dataset.id);
