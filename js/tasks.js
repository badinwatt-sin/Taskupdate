'use strict';
/* ============================================================
   Task editor (shared by Project / RAM / To-Do / Meeting tasks)
   ============================================================ */
function commit() { Store.save(); render(); }

function setStatus(t, st) {
  if (!canStatus(t)) return toast('คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้', 'error');
  const prev = t.status, prevDone = t.doneAt;
  t.status = st; t.doneAt = st === 'done' ? today() : null;
  commit();
  if (st === 'done' && prev !== 'done') celebrate();
  toast(st === 'done' ? 'เยี่ยมมาก! เสร็จอีกหนึ่งงาน' : `อัปเดตเป็น “${STATUS[st].th}”`, 'ok', () => { t.status = prev; t.doneAt = prevDone; commit(); });
}
function deleteTask(t) {
  const i = S().tasks.indexOf(t); if (i < 0) return;
  S().tasks.splice(i, 1);
  S().tasks.forEach(x => { x.deps = (x.deps || []).filter(d => d !== t.id); });
  commit();
  toast('ลบงานแล้ว', 'ok', () => { S().tasks.splice(Math.min(i, S().tasks.length), 0, t); commit(); });
}

function newTask(kind, over = {}) {
  const t = {
    id: uid('t_'), title: '', desc: '', projectId: null, assigneeId: me().id, start: today(), duration: 1, priority: 'med',
    status: 'todo', deps: [], links: [], files: [], source: kind, type: '', private: false, createdBy: me().id, doneAt: null, ...over,
  };
    return t;
}

function openTask(taskOrId, preset, opts = {}) {
  const isNew = !taskOrId || typeof taskOrId === 'object' && !S().tasks.includes(taskOrId);
  const orig = typeof taskOrId === 'string' ? S().tasks.find(t => t.id === taskOrId) : taskOrId;
  if (!orig) return;
  const t = JSON.parse(JSON.stringify(orig));
  if (preset) Object.assign(t, preset);
  const full = isNew ? true : canFullEdit(orig);
  const limited = !full && canStatus(orig);
  const ro = !full && !limited;
  const files = (t.files || []).slice();
  const st = S().settings;
  const dis = (lim) => (full || (limited && lim)) ? '' : 'disabled';
  const hasExtra = !!(t.desc || (t.deps || []).length || (t.links || []).length || (t.files || []).length || t.type || t.groupId);
  const DUE = [['today', 'วันนี้'], ['tomorrow', 'พรุ่งนี้'], ['fri', 'ศุกร์นี้'], ['nextweek', 'ศุกร์หน้า']];
  const body = `<form id="taskForm" class="tform" autocomplete="off">
    ${ro ? '<div class="note warn">คุณดูงานนี้ได้อย่างเดียว — อัปเดตได้เฉพาะผู้รับผิดชอบ, Project Manager หรือ Admin</div>' : ''}
    ${limited ? '<div class="note">คุณเป็นผู้รับผิดชอบ — อัปเดตสถานะและแนบไฟล์/Link ได้</div>' : ''}
    <input class="t-title" name="title" required maxlength="140" value="${esc(t.title)}" placeholder="ชื่องาน เช่น ออกแบบโปสเตอร์ Open House" aria-label="ชื่องาน" ${dis()}>
    <input type="hidden" name="source" value="${t.source}">
    <div class="seg-pills" role="radiogroup" aria-label="สถานะ">${Object.keys(STATUS).map(k => `<label class="sp sp-${k}"><input type="radio" name="status" value="${k}" ${t.status === k ? 'checked' : ''} ${dis(1)}><span>${STATUS[k].th}</span></label>`).join('')}</div>
    <div class="form-grid">
      <div class="field full"><span>${ico('users', 14)} ผู้รับผิดชอบ <small class="muted">เลือกได้สูงสุด 2 คน · คนแรกคือผู้รับผิดชอบหลัก</small></span><div class="ppl-chips" id="pplChips"></div>
        <input type="hidden" name="assigneeId" value="${esc(t.assigneeId || '')}"><input type="hidden" name="coId" value="${esc(t.coId || '')}"></div>
      <label class="field"><span>${ico('folder', 14)} Project <em data-req></em></span><select name="projectId" ${dis()}>${projectOptions(t.projectId, '— งานส่วนตัว (ไม่ผูก Project) —')}</select></label>
      <label class="check full" id="privRow"><input type="checkbox" name="private" ${t.private ? 'checked' : ''} ${dis()}> ${ico('lock', 14)} เก็บเป็นงานส่วนตัว (เห็นเฉพาะฉัน)</label>
      <div class="field full"><span>${ico('calendar', 14)} ช่วงเวลา</span><div class="triad">
        <label class="field"><small>เริ่ม</small><input type="date" name="start" value="${t.start}" ${dis()}></label>
        <label class="field"><small>เสร็จ</small><input type="date" name="end" value="" ${dis()}></label>
        <label class="field"><small>วัน</small><input type="number" name="duration" min="1" max="999" value="${t.duration}" ${dis()}></label></div>
        <div class="quick-due">${full ? DUE.map(([k, l]) => `<button type="button" class="chip-s" data-due="${k}">${l}</button>`).join('') : ''}<small class="muted" id="modeOut"></small></div></div>
      <div class="field full"><span>ความสำคัญ</span><div class="seg-pills prio-pills">${['high', 'med', 'low'].map(k => `<label class="sp"><input type="radio" name="priority" value="${k}" ${t.priority === k ? 'checked' : ''} ${dis()}><span><i class="prio p-${k}"></i>${PRIO[k].th}</span></label>`).join('')}</div></div>
    </div>
    <details class="more-box" ${hasExtra ? 'open' : ''}><summary>${ico('down', 15)}<span>รายละเอียดเพิ่มเติม</span><small class="muted">กลุ่มงาน · ทำหลังจาก · หมายเหตุ · ไฟล์</small></summary>
      <div class="form-grid">
        <label class="field" id="grpBox"><span>กลุ่มงานใน Project</span><select name="groupId" ${dis()}></select></label>
        <div class="field full" id="depsBox"><span>ต้องทำหลังจากงาน (Dependency)</span><div class="deps" id="depsList"></div></div>
        <label class="field full"><span>รายละเอียด / หมายเหตุ</span><textarea name="desc" rows="2" ${dis()}>${esc(t.desc)}</textarea></label>
        <div class="full attach-box" id="attachBox">
        <label class="field full"><span>Link ที่เกี่ยวข้อง <small>(บรรทัดละ 1 ลิงก์ — “ชื่อ | URL” หรือ URL)</small></span>
          <textarea name="links" rows="2" ${dis(1)} placeholder="Brief | https://drive.google.com/...">${esc((t.links || []).map(l => l.label && l.label !== l.url ? `${l.label} | ${l.url}` : l.url).join('\n'))}</textarea></label>
        <div class="field full"><span>แนบไฟล์ <small>(ไม่เกิน ${Store.mode === 'server' ? '300 KB' : '1 MB'} ต่อไฟล์ — ไฟล์ใหญ่ให้ใส่เป็น Link)</small></span>
          <div id="fileList" class="file-list"></div>
          ${(full || limited) ? `<label class="btn btn-ghost btn-sm file-btn">${ico('paperclip', 15)} เลือกไฟล์<input type="file" id="fileIn" multiple hidden></label>` : ''}</div></div>
      </div></details>
  </form>`;

  const actions = [];
  if (!isNew && full) actions.push({ label: ico('trash', 15) + ' ลบงาน', cls: 'btn-danger-ghost', left: true, onClick: async () => { if (await confirmBox(`ลบงาน “${esc(orig.title)}” ?`, 'ลบงาน', true)) { deleteTask(orig); return true; } return false; } });
  actions.push({ label: ro ? 'ปิด' : 'ยกเลิก' });
  if (!ro) actions.push({
    label: isNew ? 'สร้างงาน' : 'บันทึก', cls: 'btn-primary', onClick: () => {
      const f = $('#taskForm'); if (!f.reportValidity()) return false;
      const v = n => f.elements[n]?.value ?? '';
      if (full && (!f.elements.start.value || !(parseInt(f.elements.duration.value, 10) >= 1))) { toast('กรอกวันเริ่ม วันเสร็จ หรือระยะเวลา อย่างน้อย 2 ค่า (และวันเสร็จต้องไม่ก่อนวันเริ่ม)', 'error'); return false; }
      if (full) {
        const src = v('source');
        if (src === 'project' && !v('projectId')) { toast('งาน Project ต้องเลือก Project', 'error'); return false; }
        Object.assign(t, {
          title: v('title').trim(), source: src, projectId: v('projectId') || null, assigneeId: v('assigneeId'), coId: v('coId') || null, type: t.type || '',
          groupId: v('groupId') || '', start: v('start'), duration: Math.max(1, parseInt(v('duration'), 10) || 1), priority: v('priority'), desc: v('desc'),
          private: !v('projectId') && src === 'personal' && f.elements.private.checked,
          deps: $$('#depsList input:checked').map(i => i.value),
        });
        if (src === 'ram') t.ram = { area: v('ram_area'), requester: v('ram_requester'), eventDate: v('ram_eventDate'), receivedAt: v('ram_receivedAt'), detail: v('ram_detail') };
        else delete t.ram;
      }
      t.status = v('status'); t.doneAt = t.status === 'done' ? (orig.doneAt || today()) : null;
      t.links = v('links').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [a, b] = l.includes('|') ? l.split('|').map(x => x.trim()) : ['', l];
        const url = safeUrl(b); return url ? { label: a || b, url } : null;
      }).filter(Boolean);
      t.files = files;
      if (isNew) { S().tasks.push(t); } else Object.assign(orig, t);
      commit(); toast(isNew ? 'สร้างงานแล้ว' : 'บันทึกแล้ว');
    },
  });

  modal({
    title: opts.title || (isNew ? 'สร้างงานใหม่' : (full ? 'แก้ไขงาน' : 'รายละเอียดงาน')), body, actions, wide: true,
    onOpen(m) {
      const f = $('#taskForm', m.el);
      let pick = [t.assigneeId, t.coId].filter(Boolean);
      $('#pplChips', m.el).addEventListener('click', e => {
        const b = e.target.closest('[data-pp]'); if (!b || b.disabled) return; const id = b.dataset.pp;
        if (pick.includes(id)) pick = pick.filter(x => x !== id);
        else if (pick.length >= 2) return toast('เลือกผู้รับผิดชอบได้สูงสุด 2 คน — เอาคนเดิมออกก่อน', 'error');
        else pick.push(id);
        refresh();
      });
      let order = ['start', 'duration'];
      const recalc = ch => {
        const e = f.elements, pid = e.projectId.value, p = pid && project(pid), mode = (p && p.dayMode) || st.dayMode;
        if (ch) order = [ch, ...order.filter(x => x !== ch)].slice(0, 2);
        const third = ['start', 'end', 'duration'].find(k => !order.includes(k));
        if (third === 'end' && e.start.value) e.end.value = calcEnd(e.start.value, e.duration.value, mode);
        if (third === 'start' && e.end.value) e.start.value = calcStart(e.end.value, e.duration.value, mode);
        if (third === 'duration' && e.start.value && e.end.value) e.duration.value = countDays(e.start.value, e.end.value, mode) || '';
        ['start', 'end', 'duration'].forEach(k => e[k].closest('.field').classList.toggle('auto', k === third));
      };
      const refresh = () => {
        const pid = f.elements.projectId.value, srcEl = f.elements.source;
        if (['personal', 'project'].includes(srcEl.value)) srcEl.value = pid ? 'project' : 'personal';   // kind follows the Project choice
        const src = srcEl.value;
        $('#privRow', m.el).hidden = !(src === 'personal' && !pid);
        $('#attachBox', m.el).hidden = src !== 'project';
        const gs = f.elements.groupId, gcur = gs.value || t.groupId || '', gl = (pid && project(pid)?.taskGroups) || [];
        $('#grpBox', m.el).hidden = !gl.length; gs.innerHTML = opt('', '— ไม่ระบุกลุ่ม —', gcur) + gl.map(g => opt(g.id, g.name, gcur)).join('');   // To-Do items: no links / files
        let pool = isAdmin() ? S().members : [me(), ...assignablePeople().filter(x => x.id !== me().id)];
        const pj = pid && project(pid);
        if (pj && canManageProject(pj)) pool = [...new Map([...pool, ...[pj.pmId, ...pj.squad].map(member).filter(Boolean)].map(x => [x.id, x])).values()];
        pick.forEach(id => { if (!pool.find(x => x.id === id) && member(id)) pool = [...pool, member(id)]; });
        f.elements.assigneeId.value = pick[0] || ''; f.elements.coId.value = pick[1] || '';
        $('#pplChips', m.el).innerHTML = pool.map(x => { const on = pick.includes(x.id); return `<button type="button" class="pp-chip ${on ? 'on' : ''} ${!on && pick.length >= 2 ? 'dim' : ''}" data-pp="${x.id}" aria-pressed="${on}" ${dis()}>${avatar(x, 22)}<span>${esc(x.name)}</span>${on ? `<em>${pick[0] === x.id ? 'หลัก' : 'ร่วม'}</em>` : ''}</button>`; }).join('');
        $('em[data-req]', m.el).textContent = '';
        const p = pid && project(pid); const mode = (p && p.dayMode) || st.dayMode;
        recalc();
        $('#modeOut', m.el).textContent = (mode === 'working' ? 'นับเฉพาะวันทำงาน (ข้ามเสาร์–อาทิตย์/วันหยุด)' : 'นับตามวันปฏิทิน') + ' · กรอกอย่างน้อย 2 ใน 3 ช่อง ระบบคำนวณช่องที่เหลือให้';
        // dependency list (tasks in the same project)
        const cand = pid ? S().tasks.filter(x => x.projectId === pid && x.id !== t.id) : [];
        const cur = new Set($$('#depsList input:checked', m.el).map(i => i.value));
        if (!cur.size && f.dataset.init !== pid) (t.deps || []).forEach(d => cur.add(d));
        f.dataset.init = pid;
        $('#depsList', m.el).innerHTML = cand.length
          ? cand.map(x => `<label class="check"><input type="checkbox" value="${x.id}" ${cur.has(x.id) ? 'checked' : ''} ${full ? '' : 'disabled'}> ${esc(x.title)} <small class="muted">· ${fmtD(taskEnd(x))}</small></label>`).join('')
          : '<span class="muted small">เลือก Project ก่อน เพื่อกำหนดงานที่ต้องทำก่อน–หลัง</span>';
      };
      const drawFiles = () => {
        $('#fileList', m.el).innerHTML = files.length ? files.map((x, i) => `<span class="attach">${ico('paperclip', 14)}${esc(x.name)} <small>${Math.round(x.size / 1024)} KB</small>${(full || limited) ? `<button type="button" class="x" data-i="${i}" aria-label="ลบไฟล์">×</button>` : ''}</span>`).join('') : '<span class="muted small">ยังไม่มีไฟล์แนบ</span>';
        $$('#fileList .x', m.el).forEach(b => b.onclick = () => { files.splice(+b.dataset.i, 1); drawFiles(); });
      };
      f.addEventListener('input', ev => { if (['start', 'end', 'duration'].includes(ev.target.name)) recalc(ev.target.name); else refresh(); });
      f.addEventListener('change', ev => { if (!['start', 'end', 'duration'].includes(ev.target.name)) refresh(); });
      f.addEventListener('submit', e => e.preventDefault());
      $$('[data-due]', m.el).forEach(b => b.onclick = () => {
        const t0 = today(), d = parse(t0), fri = addDays(t0, (5 - d.getDay() + 7) % 7);
        const end = { today: t0, tomorrow: addDays(t0, 1), fri, nextweek: addDays(weekStartOf(1), 4) }[b.dataset.due];
        const e = f.elements;
        if (!e.start.value || e.start.value > end) e.start.value = t0 <= end ? t0 : end;
        recalc('start');            // start becomes a fixed input …
        e.end.value = end; recalc('end');   // … together with the chosen end → duration is calculated
        $$('[data-due]', m.el).forEach(x => x.classList.toggle('on', x === b));
      });
      if (isNew) setTimeout(() => f.elements.title.focus(), 60);
      const fin = $('#fileIn', m.el);
      if (fin) fin.onchange = () => {
        [...fin.files].forEach(file => {
          const cap = Store.mode === 'server' ? 300 * 1024 : 1048576; if (file.size > cap) return toast(`${file.name} ใหญ่เกิน ${Math.round(cap / 1024)} KB — ใส่เป็น Link แทน`, 'error');
          const r = new FileReader(); r.onload = () => { files.push({ name: file.name, size: file.size, type: file.type, data: r.result }); drawFiles(); };
          r.readAsDataURL(file);
        }); fin.value = '';
      };
      refresh(); drawFiles();
      if (!isNew) {
        const risks = depRisks(orig);
        if (risks.length) $('#depsBox', m.el).insertAdjacentHTML('beforeend', `<div class="note warn">${ico('alert', 14)} อาจกระทบกำหนดการ: ${risks.map(r => esc(r.title) + (isDelayed(r) ? ' (ล่าช้า)' : ' (เสร็จหลังวันเริ่ม)')).join(', ')}</div>`);
      }
    },
  });
}
ACT.openTask = el => openTask(el.dataset.id);
ACT.newTask = el => openTask(newTask(el.dataset.kind || 'personal', el.dataset.pid ? { projectId: el.dataset.pid, source: 'project' } : {}), el.dataset.kind ? { source: el.dataset.kind } : undefined);
