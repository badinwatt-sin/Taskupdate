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
  toast(`อัปเดตเป็น “${STATUS[st].th}”`, 'ok', () => { t.status = prev; t.doneAt = prevDone; commit(); });
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

function openTask(taskOrId, preset) {
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
  const kindSel = isNew && !preset?.source
    ? `<label class="field"><span>ประเภทรายการ</span><select name="source">${['project', 'personal'].map(k => opt(k, KINDS[k], t.source)).join('')}</select></label>`
    : `<div class="field"><span>ประเภทรายการ</span><div class="static">${esc(KINDS[t.source])}${t.private ? ' · ' + ico('lock', 13) + ' ส่วนตัว' : ''}</div><input type="hidden" name="source" value="${t.source}"></div>`;

  const body = `<form id="taskForm" class="form-grid" autocomplete="off">
    ${ro ? '<div class="note warn full">คุณดูงานนี้ได้อย่างเดียว — อัปเดตได้เฉพาะผู้รับผิดชอบ, Project Manager หรือ Admin</div>' : ''}
    ${limited ? '<div class="note full">คุณเป็นผู้รับผิดชอบ — อัปเดตสถานะและแนบไฟล์/Link ได้</div>' : ''}
    <label class="field full"><span>ชื่องาน *</span><input name="title" required maxlength="140" value="${esc(t.title)}" placeholder="เช่น ออกแบบโปสเตอร์ Open House" ${dis()}></label>
    ${kindSel}
    <label class="field"><span>Project <em data-req></em></span><select name="projectId" ${dis()}>${projectOptions(t.projectId, '— ไม่ผูกกับ Project —')}</select></label>
    <label class="field"><span>ผู้รับผิดชอบ *</span><select name="assigneeId" ${dis()}>${memberOptions(t.assigneeId)}</select></label>
    <label class="field"><span>ประเภทงาน</span><select name="type" ${dis()}>${opt('', '— ไม่ระบุ —', t.type)}${st.types.map(x => opt(x, x, t.type)).join('')}</select></label>
    <div class="field full"><div class="triad">
      <label class="field"><span>วันเริ่ม</span><input type="date" name="start" value="${t.start}" ${dis()}></label>
      <label class="field"><span>วันเสร็จ</span><input type="date" name="end" value="" ${dis()}></label>
      <label class="field"><span>ระยะเวลา (วัน)</span><input type="number" name="duration" min="1" max="999" value="${t.duration}" ${dis()}></label></div>
      <small class="muted" id="modeOut"></small></div>
    <label class="field"><span>ความสำคัญ</span><select name="priority" ${dis()}>${Object.keys(PRIO).map(k => opt(k, PRIO[k].th, t.priority)).join('')}</select></label>
    <label class="field"><span>สถานะ</span><select name="status" ${dis(1)}>${Object.keys(STATUS).map(k => opt(k, `${STATUS[k].label} · ${STATUS[k].th}`, t.status)).join('')}</select></label>
    <div class="field full" id="depsBox"><span>ต้องทำหลังจากงาน (Dependency)</span><div class="deps" id="depsList"></div></div>
    <label class="field full"><span>รายละเอียด / หมายเหตุ</span><textarea name="desc" rows="2" ${dis()}>${esc(t.desc)}</textarea></label>
    <label class="field full"><span>Link ที่เกี่ยวข้อง <small>(บรรทัดละ 1 ลิงก์ — รูปแบบ “ชื่อ | URL” หรือ URL เฉย ๆ)</small></span>
      <textarea name="links" rows="2" ${dis(1)} placeholder="Brief | https://drive.google.com/...">${esc((t.links || []).map(l => l.label && l.label !== l.url ? `${l.label} | ${l.url}` : l.url).join('\n'))}</textarea></label>
    <div class="field full"><span>แนบไฟล์ <small>(ไม่เกิน 1 MB ต่อไฟล์)</small></span>
      <div id="fileList" class="file-list"></div>
      ${(full || limited) ? `<label class="btn btn-ghost btn-sm file-btn">${ico('paperclip', 15)} เลือกไฟล์<input type="file" id="fileIn" multiple hidden></label>` : ''}</div>
    <label class="check full" id="privRow"><input type="checkbox" name="private" ${t.private ? 'checked' : ''} ${dis()}> ${ico('lock', 14)} เก็บเป็นงานส่วนตัว (เห็นเฉพาะฉัน — ไม่ปรากฏบน Dashboard ของทีม)</label>
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
          title: v('title').trim(), source: src, projectId: v('projectId') || null, assigneeId: v('assigneeId'), type: v('type'),
          start: v('start'), duration: Math.max(1, parseInt(v('duration'), 10) || 1), priority: v('priority'), desc: v('desc'),
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
    title: isNew ? 'สร้างงานใหม่' : (full ? 'แก้ไขงาน' : 'รายละเอียดงาน'), body, actions, wide: true,
    onOpen(m) {
      const f = $('#taskForm', m.el);
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
        const src = f.elements.source.value, pid = f.elements.projectId.value;
        $('#privRow', m.el).hidden = !(src === 'personal' && !pid);
        $('em[data-req]', m.el).textContent = src === 'project' ? '*' : '(ไม่บังคับ)';
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
      const fin = $('#fileIn', m.el);
      if (fin) fin.onchange = () => {
        [...fin.files].forEach(file => {
          if (file.size > 1048576) return toast(`${file.name} ใหญ่เกิน 1 MB — ใส่เป็น Link แทน`, 'error');
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
