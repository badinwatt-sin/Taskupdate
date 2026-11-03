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
  if (f.who) ts = ts.filter(t => t.assigneeId === f.who);
  return ts;
}
function filterBar(key, fixedProject, extra = '') {
  const f = ST[key];
  const projOpts = opt('', 'ทุก Project', f.project) + visibleProjects().map(p => opt(p.id, p.name, f.project)).join('') + opt('__postit', 'Post-it ของทีม (งานส่วนตัวที่ Submit)', f.project);
  return `<div class="filters">
    ${fixedProject ? '' : `<select data-f="${key}.project" aria-label="Project">${projOpts}</select>`}
    <select data-f="${key}.group" aria-label="Squad">${groupOptions(f.group, 'ทุก Squad / หน้าที่')}</select>
    <select data-f="${key}.who" aria-label="รายบุคคล">${memberOptions(f.who, 'ทุกคน')}</select>${extra}
    ${(f.group || f.who || (!fixedProject && f.project)) ? `<button class="btn btn-ghost btn-sm" data-act="clearBoard" data-id="${key}">ล้างตัวกรอง</button>` : ''}</div>`;
}
ACT.clearBoard = el => { const f = ST[el.dataset.id]; f.group = ''; f.who = ''; if ('project' in f) f.project = ''; render(); };

/* ---------------- Kanban ---------------- */
function kanbanHTML(tasks) {
  const cols = ['todo', 'doing', 'done', 'cancelled'];
  return `<div class="kanban">${cols.map(c => {
    const ts = sortBy(tasks.filter(t => t.status === c), t => taskEnd(t));
    return `<div class="kcol k-${c}" data-col="${c}"><div class="kcol-h"><b>${STATUS[c].label}</b><span>${STATUS[c].th}</span><em>${ts.length}</em></div>
      <div class="kcol-body" data-drop="${c}">${ts.map(kcard).join('') || '<p class="kempty">ลากงานมาวางที่นี่</p>'}</div></div>`;
  }).join('')}</div><p class="muted small kb-hint">ลากการ์ด / Post-it เพื่อเปลี่ยนสถานะ · หรือกดการ์ดแล้วเลือกสถานะ · งานที่เลยกำหนดจะติดป้าย “ล่าช้า” แต่ยังอยู่ในสถานะจริงของมัน</p>`;
}
function postitCard(t) {
  const m = member(t.assigneeId), st = postitOf(m), late = isDelayed(t);
  return `<article class="kcard postit pat-${st.pattern} ${late ? 'is-late' : ''}" style="--pc:${st.color}" draggable="${canStatus(t)}" data-id="${t.id}" data-act="openTask" tabindex="0">
    <div class="pi-who">${avatar(m, 26)}<span>${esc(m?.name || '–')}</span></div>
    <div class="pi-title">${esc(t.title)}</div>
    <div class="pi-foot"><span class="badge st-${t.status}">${STATUS[t.status].th}</span>${late ? '<span class="badge st-delayed">ล่าช้า</span>' : ''}<span class="grow"></span><span>${ico('clock', 12)} ${fmtD(taskEnd(t))}</span></div></article>`;
}
function kcard(t) {
  if (isPostit(t)) return postitCard(t);
  const p = t.projectId && project(t.projectId), risks = depRisks(t);
  return `<article class="kcard ${isDelayed(t) ? 'is-late' : ''}" draggable="${canStatus(t)}" data-id="${t.id}" data-act="openTask" tabindex="0">
    <div class="kc-top">${p ? `<span class="pchip" style="--c:${p.color}">${esc(p.name)}</span>` : `<span class="pchip ram">${esc(t.ram?.area || 'RAM')}</span>`}${prioDot(t.priority)}</div>
    <b class="kc-title">${esc(t.title)}</b>
    <div class="kc-meta"><span class="${isDelayed(t) ? 'late' : 'muted'}">${ico('clock', 13)} ${fmtD(taskEnd(t))}</span>
      ${risks.length ? `<span class="risk" title="ติดงานก่อนหน้าที่ยังไม่เสร็จ/ล่าช้า">${ico('alert', 13)}</span>` : ''}${t.private ? ico('lock', 13) : ''}
      <span class="grow"></span>${isDelayed(t) ? '<span class="badge st-delayed">ล่าช้า</span>' : ''}${avatar(member(t.assigneeId), 24)}</div></article>`;
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
function ganttHTML(tasks, zoom, hideDone) {
  if (hideDone) tasks = tasks.filter(t => isActive(t));
  if (!tasks.length) return empty('gantt', 'ไม่มีงานให้แสดง', 'ลองปรับตัวกรอง หรือเพิ่มงานใน Project');
  const px = GZ[zoom] || 30, LW = 270, RH = 40, HH = 52;
  let min = null, max = null;
  tasks.forEach(t => { const a = taskStart(t), b = taskEnd(t); if (!min || a < min) min = a; if (!max || b > max) max = b; });
  const t0 = today(); if (t0 < min) min = t0; if (t0 > max) max = t0;
  min = addDays(min, -3); max = addDays(max, 6);
  const days = diffDays(min, max) + 1, W = days * px;
  const groups = []; // [{p, tasks}]
  const byKey = new Map();
  sortBy(tasks, t => taskStart(t)).forEach(t => {
    const k = t.projectId || (t.source === 'ram' ? '__ram' : '__postit'); if (!byKey.has(k)) { byKey.set(k, []); groups.push(k); }
    byKey.get(k).push(t);
  });
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
  groups.forEach(k => {
    const p = k === '__ram' || k === '__postit' ? null : project(k);
    if (groups.length > 1 || true) {
      rows += `<div class="g-row g-group"><div class="g-label" style="width:${LW}px"><i style="background:${p ? p.color : k === '__postit' ? '#f59e0b' : '#d97706'}"></i><b>${esc(p ? p.name : k === '__postit' ? 'Post-it ของทีม' : 'งานสนับสนุน RAM')}</b></div><div class="g-track" style="width:${W}px"></div></div>`; r++;
    }
    byKey.get(k).forEach(t => {
      const a = taskStart(t), b = taskEnd(t), left = diffDays(min, a) * px, w = (diffDays(a, b) + 1) * px;
      rowIdx.set(t.id, { r, left, right: left + w });
      rows += `<div class="g-row"><div class="g-label clickable" style="width:${LW}px" data-act="openTask" data-id="${t.id}">${avatar(member(t.assigneeId), 22)}<div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '–')} · ${t.duration} วัน</small></div></div>
        <div class="g-track" style="width:${W}px"><div class="g-bar st-${t.status} ${isDelayed(t) ? 'late' : ''} ${depRisks(t).length ? 'risk' : ''}" style="left:${left}px;width:${w}px;--c:${p ? p.color : '#d97706'}" data-act="openTask" data-id="${t.id}" title="${esc(t.title)} · ${fmtRange(a, b)} · ${STATUS[t.status].th}${isDelayed(t) ? ' (ล่าช้า)' : ''}">
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
  <div class="legend gantt-legend"><span><i class="bar st-todo"></i>Not Started</span><span><i class="bar st-doing"></i>In Progress</span><span><i class="bar st-done"></i>Done</span><span><i class="bar late"></i>ล่าช้า</span><span><i class="bar risk"></i>อาจกระทบจากงานก่อนหน้า</span><span class="muted">▦ แถบเทา = เสาร์–อาทิตย์/วันหยุด</span></div>`;
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
  if (f.group) rows = rows.filter(t => member(t.assigneeId)?.group === f.group);
  if (f.who) rows = rows.filter(t => t.assigneeId === f.who);
  const squad = [...new Set([p.pmId, ...p.squad])].map(member).filter(Boolean);
  const whoOpts = sel => opt('', '— เลือกผู้รับผิดชอบ —', sel) + squad.map(m => opt(m.id, m.name, sel)).join('');
  const row = t => {
    const full = canFullEdit(t), d = full ? '' : 'disabled', risk = depRisks(t).length;
    return `<tr data-id="${t.id}" class="${isDelayed(t) ? 'is-late' : ''} ${t.status === 'done' ? 'is-done' : ''}">
      <td class="rn">${idx.get(t.id)}</td>
      <td><input class="c-title" value="${esc(t.title)}" placeholder="ชื่องาน" ${d}></td>
      <td><select class="c-who" ${d}>${whoOpts(t.assigneeId)}</select></td>
      <td><input type="date" class="c-start" value="${taskStart(t)}" ${d}></td>
      <td><input type="date" class="c-end" value="${taskEnd(t)}" ${d}></td>
      <td><input type="number" min="1" class="c-dur" value="${t.duration}" ${d}></td>
      <td><select class="c-status st-${t.status}" ${canStatus(t) ? '' : 'disabled'}>${Object.keys(STATUS).map(k => opt(k, STATUS[k].th, t.status)).join('')}</select></td>
      <td><input class="c-dep" value="${(t.deps || []).map(x => idx.get(x)).filter(Boolean).join(', ')}" placeholder="เช่น 1, 2" ${d}></td>
      <td class="acts">${risk ? `<span class="risk" title="อาจกระทบกำหนดการจากงานก่อนหน้า">${ico('alert', 14)}</span>` : ''}<button class="icon-btn" data-act="openTask" data-id="${t.id}" title="รายละเอียด" aria-label="รายละเอียด">${ico('edit', 15)}</button>${full ? `<button class="icon-btn" data-act="delRow" data-id="${t.id}" title="ลบ" aria-label="ลบ">${ico('trash', 15)}</button>` : ''}</td></tr>`;
  };
  return `<section class="card flush tl"><div class="table-wrap"><table class="tbl grid"><thead><tr><th>#</th><th>งาน</th><th>ผู้รับผิดชอบ (Squad)</th><th>เริ่ม</th><th>สิ้นสุด</th><th>วัน</th><th>สถานะ</th><th>ทำหลังแถว</th><th></th></tr></thead>
    <tbody id="tlBody">${rows.map(row).join('')}</tbody></table></div>
    <div class="tl-foot"><button class="btn btn-ghost btn-sm" data-act="addRow" data-id="${p.id}">${ico('plus', 14)} เพิ่มบรรทัด</button>
    <span class="muted small">กรอกชื่องาน เลือกคนใน Squad แล้วกรอกวันที่ 2 ใน 3 ช่อง (เริ่ม / สิ้นสุด / วัน) ระบบคำนวณที่เหลือให้ · กด Enter ที่ช่องชื่อเพื่อขึ้นบรรทัดใหม่ · ปรับวันแบบลากได้ที่แท็บ Gantt Chart</span></div></section>`;
}
function bindTaskList(root, p) {
  const body = $('#tlBody', root); if (!body) return;
  const get = el => S().tasks.find(x => x.id === el.closest('tr').dataset.id);
  body.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('c-title')) return; e.preventDefault();
    const tr = e.target.closest('tr'), next = tr.nextElementSibling;
    if (next) $('.c-title', next).focus(); else ACT.addRow({ dataset: { id: p.id } });
  });
  body.addEventListener('change', e => {
    const el = e.target, t = get(el); if (!t) return;
    if (el.classList.contains('c-title')) { t.title = el.value.trim(); Store.save(); }
    else if (el.classList.contains('c-who')) { t.assigneeId = el.value; Store.save(); }
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
  const t = newTask('project', { projectId: p.id, assigneeId: '', start: last ? addDays(taskEnd(last), 1) : today(), duration: 1 });
  if (taskMode(t) === 'working') t.start = nextWork(t.start);
  S().tasks.push(t); commit(); setTimeout(() => { const i = $$('#tlBody .c-title'); i.length && i[i.length - 1].focus(); }, 30);
};
ACT.delRow = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t) deleteTask(t); };

/* ---------------- Board page (all projects) ---------------- */
V.board = root => {
  const f = ST.board, tasks = boardTasks(f);
  const tabs = `<div class="seg-ctl"><button class="${f.tab === 'kanban' ? 'on' : ''}" data-act="boardTab" data-id="board:kanban">${ico('board', 15)} Kanban</button><button class="${f.tab === 'gantt' ? 'on' : ''}" data-act="boardTab" data-id="board:gantt">${ico('gantt', 15)} Gantt Chart</button></div>`;
  const extra = f.tab === 'gantt' ? zoomCtl('board') + `<label class="check"><input type="checkbox" data-f="board.hideDone" ${f.hideDone ? 'checked' : ''}> ซ่อนงานที่เสร็จแล้ว</label>` : '';
  root.innerHTML = pageHead('Gantt & Kanban', 'งานเดียวกัน ดูได้หลายมุม — เปลี่ยนสถานะที่ไหนก็อัปเดตตรงกันทุกหน้า', tabs + `<button class="btn btn-primary" data-act="newTask">${ico('plus', 16)} สร้างงาน</button>`)
    + filterBar('board', null, extra) + (f.tab === 'kanban' ? kanbanHTML(tasks) : ganttHTML(tasks, f.zoom, f.hideDone));
  if (f.tab === 'kanban') bindKanban(root); else bindGantt(root);
};
ACT.boardTab = el => { const [k, t] = el.dataset.id.split(':'); ST[k].tab = t; render(); };

/* ======================= PROJECTS ======================= */
V.projects = (root, id) => {
  if (id) return projectDetail(root, id);
  const ps = visibleProjects();
  root.innerHTML = pageHead('Project & Squad Planning', 'สร้าง Project จัด Squad ข้ามหน้าที่ และติดตามความคืบหน้า',
    (isAdmin() || isPM() ? `<button class="btn btn-primary" data-act="newProject">${ico('plus', 16)} สร้าง Project</button>` : '')) +
    (ps.length ? `<div class="pcards">${ps.map(p => {
      const s = projectStats(p), pm = member(p.pmId);
      return `<a class="pcard" href="#/projects/${p.id}" style="--c:${p.color}">
        <div class="pc-top"><h3>${esc(p.name)}</h3>${s.delayed ? `<span class="badge st-delayed">${s.delayed} ล่าช้า</span>` : ''}</div>
        <p class="goal clip2">${esc(p.goal || 'ยังไม่ได้ระบุเป้าหมาย')}</p>
        <div class="pc-meta"><span>PM: ${personChip(pm, 20)}</span><span>${s.end ? fmtRange(s.start, s.end) : '–'}</span></div>
        ${progressBar(s.pct, p.color)}<div class="pc-foot"><span>${s.done}/${s.total} งานเสร็จ · ${s.pct}%</span><span class="squad">${p.squad.slice(0, 6).map(id => avatar(member(id), 24)).join('')}${p.squad.length > 6 ? `<em>+${p.squad.length - 6}</em>` : ''}</span></div></a>`;
    }).join('')}</div>` : empty('folder', 'ยังไม่มี Project', 'สร้าง Project แรกเพื่อเริ่มจัด Squad และวางแผนงาน', isAdmin() ? `<button class="btn btn-primary" data-act="newProject">${ico('plus', 16)} สร้าง Project</button>` : ''));
};
ACT.newProject = () => openProject(null);

function projectDetail(root, id) {
  const p = project(id); if (!p || !visibleProjects().includes(p)) { location.hash = '#/projects'; return; }
  const f = ST.proj, s = projectStats(p), pm = member(p.pmId), can = canManageProject(p);
  const tabs = [['tasks', 'Task List'], ['gantt', 'Gantt Chart'], ['kanban', 'Kanban'], ['overview', 'ภาพรวม & Squad']];
  const mode = p.dayMode || S().settings.dayMode;
  const tasks = boardTasks(f, p.id);
  let content = '';
  if (f.tab === 'overview') {
    const sq = S().groups.map(g => ({ g, ms: p.squad.map(member).filter(m => m && m.group === g.id) })).filter(x => x.ms.length);
    const upcoming = sortBy(S().tasks.filter(t => t.projectId === p.id && isActive(t)), t => taskEnd(t)).slice(0, 5);
    content = `<div class="two-col"><section class="card"><div class="card-h"><h3>เป้าหมาย Project</h3></div><p class="goal-full">${esc(p.goal || '—')}</p>
      <dl class="facts"><div><dt>Project Manager</dt><dd>${personChip(pm)}</dd></div><div><dt>ช่วงเวลา</dt><dd>${s.end ? fmtRange(s.start, s.end) : '–'}</dd></div><div><dt>การนับวัน</dt><dd>${mode === 'working' ? 'วันทำงาน (ไม่รวมเสาร์–อาทิตย์/วันหยุดบริษัท)' : 'วันปฏิทิน'}${p.dayMode ? '' : ' <small class="muted">(ค่าเริ่มต้นของทีม)</small>'}</dd></div><div><dt>ความคืบหน้า</dt><dd>${progressBar(s.pct, p.color)}<small>${s.done}/${s.total} งาน · ${s.pct}%</small></dd></div></dl></section>
      <section class="card"><div class="card-h"><h3>Squad (${p.squad.length} คน)</h3>${can ? `<button class="btn btn-ghost btn-sm" data-act="editProject" data-id="${p.id}">จัด Squad</button>` : ''}</div>
      ${sq.map(x => `<div class="squad-g"><div>${groupChip(x.g)}</div><div class="squad-m">${x.ms.map(m => `<span class="person">${avatar(m, 26)}<span>${esc(m.name)}${m.id === p.pmId ? ' <span class="pm">PM</span>' : ''}</span></span>`).join('')}</div></div>`).join('') || '<p class="muted pad">ยังไม่มีสมาชิก</p>'}</section></div>
      <section class="card mt"><div class="card-h"><h3>งานที่ใกล้ถึงกำหนด</h3></div>${upcoming.length ? `<ul class="list">${upcoming.map(t => `<li class="clickable" data-act="openTask" data-id="${t.id}">${avatar(member(t.assigneeId), 26)}<div class="grow"><b class="clip">${esc(t.title)}</b><small class="muted">${esc(member(t.assigneeId)?.name || '')}</small></div>${statusBadge(t)}<span class="due ${isDelayed(t) ? 'late' : ''}">${fmtD(taskEnd(t))}<small>${fmtRel(taskEnd(t))}</small></span></li>`).join('')}</ul>` : '<p class="muted pad">ไม่มีงานค้าง</p>'}</section>`;
  } else if (f.tab === 'tasks') {
    content = filterBar('proj', p.id) + taskListHTML(p, f);
  } else if (f.tab === 'kanban') {
    content = filterBar('proj', p.id) + kanbanHTML(tasks);
  } else {
    content = filterBar('proj', p.id, zoomCtl('proj')) + ganttHTML(tasks, f.zoom, false);
  }
  root.innerHTML = `<a class="back" href="#/projects">${ico('left', 16)} Project ทั้งหมด</a>
    <div class="proj-head" style="--c:${p.color}"><div><h1>${esc(p.name)}</h1><p>PM: ${esc(pm?.name || '–')} · ${s.total} งาน · ${s.pct}% เสร็จ${s.delayed ? ` · <span class="late">${s.delayed} งานล่าช้า</span>` : ''}</p></div>
      <div class="head-actions">${can ? `<button class="btn btn-ghost" data-act="reschedule" data-id="${p.id}" title="เลื่อนงานที่ต้องทำหลังให้เริ่มต่อจากงานก่อนหน้า">${ico('swap', 16)} จัดตารางตามลำดับงาน</button><button class="btn btn-ghost" data-act="editProject" data-id="${p.id}">${ico('edit', 16)} แก้ไข</button>` : ''}
      <button class="btn btn-primary" data-act="newTask" data-pid="${p.id}">${ico('plus', 16)} เพิ่มงาน</button></div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${f.tab === k ? 'on' : ''}" data-act="boardTab" data-id="proj:${k}">${l}</button>`).join('')}</div>${content}`;
  if (f.tab === 'kanban') bindKanban(root); else if (f.tab === 'gantt') bindGantt(root); else if (f.tab === 'tasks') bindTaskList(root, p);
}
ACT.editProject = el => openProject(el.dataset.id);
ACT.reschedule = async el => {
  const p = project(el.dataset.id);
  if (!await confirmBox('ระบบจะเลื่อนวันเริ่มของงานที่ต้องทำหลังงานอื่น ให้เริ่มต่อจากงานก่อนหน้า (ไม่ดึงงานให้เร็วขึ้น และสมมติว่างานที่ล่าช้าจะเสร็จวันนี้) ดำเนินการต่อหรือไม่?', 'จัดตาราง')) return;
  const before = JSON.stringify(S().tasks);
  const n = reschedule(p.id); commit();
  n ? toast(`เลื่อนกำหนดการ ${n} รายการ`, 'ok', () => { S().tasks = JSON.parse(before); commit(); }) : toast('กำหนดการสอดคล้องกันอยู่แล้ว');
};

function openProject(id) {
  const orig = id ? project(id) : null;
  const p = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('p_'), name: '', pmId: me().id, goal: '', squad: [me().id], start: today(), dayMode: null, color: ['#4f46e5', '#0891b2', '#db2777', '#d97706', '#059669', '#7c3aed'][S().projects.length % 6] };
  const full = !orig || isAdmin() || orig.pmId === me().id;
  modal({
    title: orig ? 'แก้ไข Project' : 'สร้าง Project ใหม่', wide: true,
    body: `<form id="pjForm" class="form-grid" autocomplete="off">
      <label class="field full"><span>ชื่อ Project *</span><input name="name" required value="${esc(p.name)}" placeholder="เช่น Customer Appreciation Night 2026"></label>
      <label class="field"><span>Project Manager *</span><select name="pmId">${memberOptions(p.pmId)}</select></label>
      <label class="field"><span>วันเริ่มต้น Project</span><input type="date" name="start" value="${p.start}"></label>
      <label class="field full"><span>เป้าหมาย Project</span><textarea name="goal" rows="2">${esc(p.goal)}</textarea></label>
      <label class="field"><span>วิธีนับระยะเวลางาน</span><select name="dayMode">${opt('', `ตามค่าเริ่มต้นของทีม (${S().settings.dayMode === 'working' ? 'วันทำงาน' : 'วันปฏิทิน'})`, p.dayMode || '')}${opt('working', 'วันทำงาน (ข้ามเสาร์–อาทิตย์ + วันหยุดบริษัท)', p.dayMode)}${opt('calendar', 'วันปฏิทิน (นับทุกวัน)', p.dayMode)}</select></label>
      <label class="field"><span>สีประจำ Project</span><input type="color" name="color" value="${p.color}"></label>
      <div class="field full"><span>Squad — เลือกสมาชิกข้ามหน้าที่</span><div class="squad-pick">
        ${S().groups.map(g => { const ms = S().members.filter(m => m.group === g.id); return ms.length ? `<div class="sp-g"><div>${groupChip(g)}</div><div class="sp-m">${ms.map(m => `<label class="pill"><input type="checkbox" value="${m.id}" ${p.squad.includes(m.id) ? 'checked' : ''}><span>${avatar(m, 20)}${esc(m.name)}</span></label>`).join('')}</div></div>` : ''; }).join('')}</div></div></form>`,
    actions: (orig && full ? [{ label: ico('trash', 15) + ' ลบ Project', cls: 'btn-danger-ghost', left: true, onClick: async () => {
      const n = S().tasks.filter(t => t.projectId === p.id).length;
      if (await confirmBox(`ลบ Project “${esc(p.name)}” และงานทั้งหมด ${n} รายการ? การกระทำนี้ย้อนกลับไม่ได้`, 'ลบ Project', true)) {
        S().projects = S().projects.filter(x => x.id !== p.id); S().tasks = S().tasks.filter(t => t.projectId !== p.id);
        S().events.forEach(e => { if (e.projectId === p.id) e.projectId = null; });
        location.hash = '#/projects'; commit(); toast('ลบ Project แล้ว'); return true;
      } return false;
    } }] : []).concat([{ label: 'ยกเลิก' }, {
      label: 'บันทึก', cls: 'btn-primary', onClick: () => {
        const f = $('#pjForm'); if (!f.reportValidity()) return false;
        const squad = $$('.squad-pick input:checked', f).map(i => i.value);
        if (!squad.includes(f.elements.pmId.value)) squad.push(f.elements.pmId.value);
        Object.assign(p, { name: f.elements.name.value.trim(), pmId: f.elements.pmId.value, start: f.elements.start.value, goal: f.elements.goal.value, dayMode: f.elements.dayMode.value || null, color: f.elements.color.value, squad });
        if (orig) Object.assign(orig, p); else S().projects.push(p);
        commit(); toast('บันทึก Project แล้ว'); if (!orig) location.hash = '#/projects/' + p.id;
      },
    }]),
    onOpen(m) { $('#pjForm', m.el).addEventListener('submit', e => e.preventDefault()); },
  });
}
