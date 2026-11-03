'use strict';
/* ============================================================
   Views: My To-Do · AI Meeting Hub · Team & Settings
   ============================================================ */

/* ============================ MY TO-DO ============================ */
function todoBuckets(uid_) {
  const t0 = today();
  const mine = visibleTasks().filter(t => t.assigneeId === uid_ && t.status !== 'cancelled');
  return {
    today: sortBy(mine.filter(t => isActive(t) && taskStart(t) <= t0 && taskEnd(t) >= t0), t => taskEnd(t)),
    upcoming: sortBy(mine.filter(t => isActive(t) && taskStart(t) > t0), t => taskStart(t)),
    overdue: sortBy(mine.filter(isDelayed), t => taskEnd(t)),
    done: sortBy(mine.filter(t => t.status === 'done'), t => t.doneAt || '').reverse(),
  };
}
const canSubmit = t => !t.projectId && t.source !== 'ram' && t.assigneeId === me().id && t.status !== 'cancelled';
ACT.submitTask = async el => {
  const t = S().tasks.find(x => x.id === el.dataset.id); if (!t) return;
  if (t.private && !await confirmBox('งานนี้ตั้งเป็นส่วนตัวอยู่ — เมื่อ Submit จะเปลี่ยนเป็นเปิดเผยและทุกคนในทีมเห็นบน Kanban ต้องการดำเนินการต่อหรือไม่?', 'Submit ขึ้นบอร์ด')) return;
  t.private = false; t.submitted = true; t.submittedAt = today(); commit();
  toast('ส่งขึ้น Kanban เป็น Post-it แล้ว', 'ok', () => { t.submitted = false; commit(); });
};
ACT.unsubmit = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t) { t.submitted = false; commit(); toast('เอา Post-it ออกจากบอร์ดแล้ว'); } };
ACT.submitAll = () => {
  const ts = S().tasks.filter(t => canSubmit(t) && !t.submitted && !t.private && isActive(t));
  ts.forEach(t => { t.submitted = true; t.submittedAt = today(); }); commit(); toast(`ส่ง ${ts.length} งานขึ้นบอร์ดแล้ว`);
};
ACT.myStyle = el => openMyStyle(el.dataset.id || me().id);
function openMyStyle(id) {
  const m = member(id); if (!m || (id !== me().id && !isAdmin())) return toast('ปรับแต่งได้เฉพาะโปรไฟล์ของตัวเอง', 'error');
  let emoji = m.emoji || '', { color, pattern } = postitOf(m);
  const prev = () => {
    const fake = { ...m, emoji };
    return `<div class="kcard postit pat-${pattern}" style="--pc:${color};cursor:default;transform:rotate(-1.5deg)"><div class="pi-who">${avatar(fake, 28)}<span>${esc(m.name)}</span></div><div class="pi-title">ตัวอย่างงานของฉัน</div><div class="pi-foot"><span class="badge st-doing">กำลังทำ</span><span class="grow"></span><span>${ico('clock', 12)} ${fmtD(today())}</span></div></div>`;
  };
  modal({
    title: `ปรับแต่ง Post-it & Icon — ${m.name}`, wide: true,
    body: `<div class="style-grid"><div>
      <div class="field"><span>Icon / Emoji ประจำตัว <small>(ห้ามซ้ำกับเพื่อนร่วมทีม)</small></span>
        <div class="emoji-grid" id="emGrid">${EMOJIS.map(e => { const o = emojiOwner(e, m.id); return `<button type="button" data-e="${e}" ${o ? `disabled title="${esc(o.name)} ใช้อยู่"` : ''} class="${e === emoji ? 'on' : ''}">${e}</button>`; }).join('')}</div></div>
      <div class="field"><span>หรือสร้าง icon ของคุณเอง <small>(พิมพ์ emoji หรืออักษร 1–3 ตัว)</small></span>
        <div class="inline-add" style="grid-template-columns:140px auto 1fr"><input id="emCustom" maxlength="6" placeholder="เช่น 🦦 / KG" value="${esc(emoji && !EMOJIS.includes(emoji) ? emoji : '')}"><button type="button" class="btn btn-ghost btn-sm" id="emClear">ใช้ตัวอักษรย่อ</button><span class="dup-msg" id="dupMsg"></span></div></div>
      <div class="field"><span>สี Post-it</span><div class="swatches" id="swatches">${POSTIT_COLORS.map(c => `<button type="button" class="swatch ${c === color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="สี ${c}"></button>`).join('')}</div></div>
      <div class="field"><span>ลาย</span><div class="pat-pick" id="pats">${Object.entries(POSTIT_PATTERNS).map(([k, l]) => `<button type="button" class="pat-${k} ${k === pattern ? 'on' : ''}" data-p="${k}" style="--pc:${color}">${l}</button>`).join('')}</div></div>
    </div><div><span class="muted small">ตัวอย่างบน Kanban</span><div class="preview-board" id="pv">${prev()}</div></div></div>`,
    actions: [{ label: 'ยกเลิก' }, {
      label: 'บันทึก', cls: 'btn-primary', onClick: () => {
        const dup = emoji && emojiOwner(emoji, m.id);
        if (dup) { toast(`icon นี้ ${dup.name} ใช้อยู่แล้ว`, 'error'); return false; }
        m.emoji = emoji; m.postit = { color, pattern }; commit(); toast('บันทึกสไตล์ของคุณแล้ว');
      },
    }],
    onOpen(md) {
      const refresh = () => {
        $('#pv', md.el).innerHTML = prev();
        $$('#emGrid button', md.el).forEach(b => b.classList.toggle('on', b.dataset.e === emoji));
        $$('#swatches .swatch', md.el).forEach(b => b.classList.toggle('on', b.dataset.c === color));
        $$('#pats button', md.el).forEach(b => { b.classList.toggle('on', b.dataset.p === pattern); b.style.setProperty('--pc', color); });
        const dup = emoji && emojiOwner(emoji, m.id); $('#dupMsg', md.el).textContent = dup ? `${dup.name} ใช้ icon นี้แล้ว — เลือกอันอื่น` : '';
      };
      $('#emGrid', md.el).onclick = e => { const b = e.target.closest('button[data-e]'); if (b && !b.disabled) { emoji = b.dataset.e; $('#emCustom', md.el).value = ''; refresh(); } };
      $('#emCustom', md.el).oninput = e => { emoji = e.target.value.trim(); refresh(); };
      $('#emClear', md.el).onclick = () => { emoji = ''; $('#emCustom', md.el).value = ''; refresh(); };
      $('#swatches', md.el).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { color = b.dataset.c; refresh(); } };
      $('#pats', md.el).onclick = e => { const b = e.target.closest('[data-p]'); if (b) { pattern = b.dataset.p; refresh(); } };
    },
  });
}
/* ---------------- Weekly planner ---------------- */
const weekStartOf = off => { const d = parse(today()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return iso(d); };
function weekHealth(list, off) {
  const total = list.length, done = list.filter(t => t.status === 'done').length, late = list.filter(isDelayed).length;
  const dow = (new Date().getDay() + 6) % 7, expected = off < 0 ? 1 : off > 0 ? 0 : dow > 4 ? 1 : Math.min(1, (dow + .5) / 5);
  const pct = total ? done / total : 1;
  const soon = list.filter(t => t.status === 'todo' && off === 0 && taskEnd(t) <= addDays(today(), 1) && taskEnd(t) >= today()).length;
  let level = 'green', msg = 'เป็นไปตามแผน';
  if (!total) return { level: 'none', msg: 'ยังไม่มีงานในแผนสัปดาห์นี้', total, done, late, pct: 0 };
  if (late > 0 || (off <= 0 && pct < expected - .35)) { level = 'red'; msg = late ? `มีงานเลยกำหนด ${late} รายการ` : 'ความคืบหน้าช้ากว่าแผนมาก'; }
  else if (soon > 0 || (off <= 0 && pct < expected - .15)) { level = 'yellow'; msg = soon ? `มี ${soon} งานครบกำหนดภายใน 1 วันแต่ยังไม่เริ่ม` : 'ความคืบหน้าช้ากว่าแผนเล็กน้อย'; }
  return { level, msg, total, done, late, pct: Math.round(pct * 100) };
}
V.todo = root => {
  const f = ST.todo, off = f.week || 0, ppl = scopeMembers();
  if (!f.user || !ppl.find(m => m.id === f.user)) f.user = me().id;
  const who = member(f.user), own = f.user === me().id;
  const ws = weekStartOf(off), we = addDays(ws, 6);
  const mine = visibleTasks().filter(t => t.assigneeId === f.user && t.status !== 'cancelled');
  const inWeek = mine.filter(t => taskStart(t) <= we && taskEnd(t) >= ws);
  const carry = off === 0 ? mine.filter(t => isActive(t) && taskEnd(t) < ws) : [];
  const list = [...new Set(inWeek.concat(carry))];
  const H = weekHealth(list, off), label = { green: 'ตามแผน', yellow: 'ต้องระวัง', red: 'ล่าช้า', none: 'ยังไม่มีแผน' }[H.level];
  const myProjects = visibleProjects().filter(p => inProject(p));
  const col = (st, th) => { const ts = sortBy(list.filter(t => t.status === st), t => taskEnd(t));
    return `<div class="kcol k-${st}"><div class="kcol-h"><b>${th}</b><em>${ts.length}</em></div><div class="kcol-body" data-drop="${st}">${ts.map(wcard).join('') || '<p class="kempty">ลากงานมาวางที่นี่</p>'}</div></div>`; };
  const wcard = t => {
    const p = t.projectId && project(t.projectId), late = isDelayed(t), full = canFullEdit(t);
    return `<article class="kcard wcard ${late ? 'is-late' : ''}" draggable="${canStatus(t)}" data-id="${t.id}" data-act="openTask" tabindex="0">
      <b class="kc-title">${esc(t.title)}</b>
      <div class="wc-dates"><span>${fmtD(taskStart(t))}</span><i></i><span class="${late ? 'late' : ''}">${fmtD(taskEnd(t))}</span><small class="muted">${late ? 'เลยกำหนด' : 'Start → Target'}</small></div>
      <div class="wc-foot">${p ? `<span class="pchip" style="--c:${p.color}">${esc(p.name)}</span>` : '<span class="muted small">ส่วนตัว</span>'}${t.private ? ico('lock', 12) : ''}<span class="grow"></span>
        ${full && own ? `<button class="mini-btn" data-act="shiftTask" data-id="${t.id}" data-d="-7" title="เลื่อนไปสัปดาห์ก่อน" aria-label="เลื่อนไปสัปดาห์ก่อน">${ico('left', 13)}</button><button class="mini-btn" data-act="shiftTask" data-id="${t.id}" data-d="7" title="เลื่อนไปสัปดาห์ถัดไป" aria-label="เลื่อนไปสัปดาห์ถัดไป">${ico('right', 13)}</button>` : ''}
        ${canSubmit(t) && own ? (t.submitted ? `<button class="mini-btn on" data-act="unsubmit" data-id="${t.id}" title="อยู่บน Kanban ทีม (กดเพื่อเอาออก)">${ico('check', 13)} บนบอร์ด</button>` : `<button class="mini-btn" data-act="submitTask" data-id="${t.id}" title="ส่งเป็น Post-it ขึ้น Kanban ของทีม">Submit</button>`) : ''}</div></article>`;
  };
  root.innerHTML = pageHead(own ? 'My To-Do' : `To-Do ของ ${who.name}`, 'แผนงานรายสัปดาห์ — วางงาน กำหนดวันเริ่มและวันเป้าหมาย แล้วลากเพื่ออัปเดตความคืบหน้า',
    `<button class="btn btn-ghost" data-act="myStyle">${ico('edit', 15)} Post-it & Icon</button>${ppl.length > 1 ? `<select data-f="todo.user" aria-label="ดูของ">${ppl.map(m => opt(m.id, m.name, f.user)).join('')}</select>` : ''}`) + `
  <div class="week-bar"><div class="week-nav"><button class="icon-btn" data-act="weekGo" data-d="-1" aria-label="สัปดาห์ก่อน">${ico('left')}</button><h2>${fmtD(ws)} – ${fmtD(we)} ${parse(we).getFullYear() + 543}</h2><button class="icon-btn" data-act="weekGo" data-d="1" aria-label="สัปดาห์ถัดไป">${ico('right')}</button>${off !== 0 ? '<button class="btn btn-ghost btn-sm" data-act="weekGo" data-d="0">สัปดาห์นี้</button>' : '<span class="badge">สัปดาห์นี้</span>'}</div>
    <div class="health h-${H.level}"><span class="dot"></span><div><b>${label}</b><small>${H.msg}</small></div><div class="hprog"><div class="progress"><i style="width:${H.pct}%"></i></div><small>${H.done}/${H.total} งานเสร็จ</small></div></div></div>
  ${own ? `<form class="quick" id="quickAdd" autocomplete="off"><input name="title" placeholder="เพิ่มงานในแผนสัปดาห์นี้… พิมพ์ชื่องานแล้วกด Enter" maxlength="140" aria-label="ชื่องาน">
    <label class="qd"><small>เริ่ม</small><input type="date" name="start" value="${off === 0 ? today() : ws}"></label><label class="qd"><small>เป้าหมายเสร็จ</small><input type="date" name="end" value="${off === 0 ? today() : ws}"></label>
    <select name="pid" aria-label="เชื่อมกับ Project">${opt('', 'ส่วนตัว', '')}${myProjects.map(p => opt(p.id, p.name, '')).join('')}</select>
    <label class="check" title="เห็นเฉพาะฉัน"><input type="checkbox" name="priv">${ico('lock', 14)}</label><button class="btn btn-primary">${ico('plus', 16)} เพิ่ม</button></form>` : ''}
  <div class="kanban three">${col('todo', 'To do')}${col('doing', 'Doing')}${col('done', 'Done')}</div>
  <p class="muted small kb-hint">ลากการ์ดไปคอลัมน์ถัดไปเมื่อคืบหน้า · ลูกศรบนการ์ดเลื่อนงานไปสัปดาห์อื่น (เฉพาะงานที่คุณแก้ไขได้) · งานค้างจากสัปดาห์ก่อนแสดงอยู่ในสัปดาห์นี้และติดป้ายเลยกำหนด · งานที่มอบหมายจาก Project เข้ามาในแผนอัตโนมัติ</p>`;
  const qa = $('#quickAdd');
  if (qa) qa.onsubmit = e => {
    e.preventDefault(); const v = qa.elements, title = v.title.value.trim(); if (!title) { v.title.focus(); return; }
    if (v.end.value < v.start.value) return toast('วันเป้าหมายต้องไม่ก่อนวันเริ่ม', 'error');
    const pid = v.pid.value, t = newTask(pid ? 'project' : 'personal', { title, start: v.start.value, projectId: pid || null, private: v.priv.checked && !pid, type: 'Admin / อื่นๆ' });
    t.duration = countDays(t.start, v.end.value, taskMode(t)) || 1;
    S().tasks.push(t); commit(); toast('เพิ่มงานเข้าแผนแล้ว');
    setTimeout(() => $('#quickAdd input[name=title]')?.focus(), 30);
  };
  bindKanban(root);
};
ACT.weekGo = el => { const d = +el.dataset.d; ST.todo.week = d === 0 ? 0 : (ST.todo.week || 0) + d; render(); };
ACT.shiftTask = el => {
  const t = S().tasks.find(x => x.id === el.dataset.id); if (!t || !canFullEdit(t)) return;
  const before = t.start; t.start = addDays(taskStart(t), +el.dataset.d); commit();
  toast(`เลื่อนงานเป็น ${fmtRange(taskStart(t), taskEnd(t))}`, 'ok', () => { t.start = before; commit(); });
};
ACT.todoTab = el => { ST.todo.tab = el.dataset.id; render(); };
ACT.toggleDone = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t) setStatus(t, t.status === 'done' ? 'todo' : 'done'); };
ACT.startTask = el => { const t = S().tasks.find(x => x.id === el.dataset.id); if (t) setStatus(t, 'doing'); };

/* ========================== AI MEETING HUB ========================== */
const MON_RX = TH_MON.map(m => m.replace(/\./g, '\\.?'));
function parseDateText(l) {
  let m;
  if ((m = l.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return m[0];
  if ((m = l.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    let y = m[3] ? +m[3] : new Date().getFullYear(); if (y > 2400) y -= 543; else if (y < 100) y += 2000;
    const d = new Date(y, +m[2] - 1, +m[1]); if (!isNaN(d)) return iso(d);
  }
  for (let i = 0; i < 12; i++) {
    const rx = new RegExp(`(\\d{1,2})\\s*(?:${MON_RX[i]}|${TH_MON_FULL[i]})(?:\\s*(\\d{2,4}))?`);
    if ((m = l.match(rx))) { let y = m[2] ? +m[2] : new Date().getFullYear(); if (y > 2400) y -= 543; else if (y < 100) y += 2000; return iso(new Date(y, i, +m[1])); }
  }
  if (/พรุ่งนี้|tomorrow/i.test(l)) return addDays(today(), 1);
  if (/วันนี้|today/i.test(l)) return today();
  if (/สัปดาห์หน้า|next week/i.test(l)) return addDays(today(), 7);
  return '';
}
/* Rule-based extractor. Swap this function for a real AI/transcription call when available. */
function analyzeMeeting(text) {
  const lines = text.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*•▪●]|\d+[.)])\s*/, '').trim()).filter(l => l.length > 2);
  const verbs = /(ทำ|จัด|ส่ง|เตรียม|ประสาน|ติดตาม|ออกแบบ|สรุป|ตรวจ|นัด|ขอ|อัปเดต|อัพเดต|ยืนยัน|ร่าง|ผลิต|ถ่าย|เขียน|prepare|send|follow|update|design|review|confirm|draft|book|check)/i;
  const actRx = /(action\s*(items?)?\s*[:：-]|todo\s*[:：-]|to-do\s*[:：-]|\[ ?\]|☐|รับผิดชอบ|follow[- ]?up|@\w+|ให้.{1,40}(ทำ|จัด|ส่ง|เตรียม|ประสาน|ติดตาม))/i;
  const decRx = /^(สรุป|ตกลง|มติ|ที่ประชุม|ตัดสินใจ|อนุมัติ|decision|decided|agreed|approved)/i;
  const found = l => S().members.find(m => l.toLowerCase().includes(m.name.toLowerCase()) || (m.alias && l.includes(m.alias)));
  const out = { summary: '', keyPoints: [], decisions: [], actions: [] };
  lines.forEach(l => {
    const who = found(l);
    if (decRx.test(l)) out.decisions.push(l.replace(decRx, '').replace(/^[\s:：-]+/, '') || l);
    else if (actRx.test(l) || (who && verbs.test(l))) {
      const due = parseDateText(l);
      const title = l.replace(/^(action\s*(items?)?|todo|to-do)\s*[:：-]?\s*/i, '').replace(/\[ ?\]|☐|@\w+/g, '').replace(/\s{2,}/g, ' ').trim();
      out.actions.push({ id: uid('a_'), title, assigneeId: who?.id || '', due, priority: /ด่วน|urgent|asap/i.test(l) ? 'high' : 'med', include: true, taskId: null });
    } else if (!/[:：]$/.test(l) && l.length > 5) out.keyPoints.push(l);
  });
  out.keyPoints = out.keyPoints.slice(0, 8);
  out.summary = out.keyPoints.length ? 'ประเด็นหลัก: ' + out.keyPoints.slice(0, 3).join(' · ') + ` — พบข้อสรุป ${out.decisions.length} ข้อ และ Action Items ${out.actions.length} รายการ` : (lines.length ? 'ไม่พบประเด็นชัดเจน กรุณาตรวจสอบและแก้ไขสรุปด้วยตนเอง' : '');
  return out;
}
const SAMPLE_NOTES = `ประชุมวางแผนงาน Roadshow
- ที่ประชุมตกลง เริ่ม Roadshow ภาคเหนือในไตรมาสแรก
- สรุป งบ Production ต้องไม่เกินที่อนุมัติไว้
- งบประมาณยังรอ Finance ยืนยัน
- Action: Nitikun ออกแบบ Roadshow Kit ภายใน 15/12/2026
- Pitcha ประสานทีม RAM ภาคใต้ ก่อน 20 ธ.ค.
- @Chayada ร่างข่าวประชาสัมพันธ์ พรุ่งนี้`;

V.meetings = root => {
  const ms = sortBy(S().meetings, m => m.date).reverse(), f = ST.meet;
  if (f.sel && !ms.find(m => m.id === f.sel)) f.sel = null;
  if (!f.sel && ms.length && !f.draft) f.sel = ms[0].id;
  const cur = f.draft || ms.find(m => m.id === f.sel);
  root.innerHTML = pageHead('AI Meeting Hub', 'เปลี่ยนบันทึกประชุมให้เป็นข้อสรุป การตัดสินใจ และ Action Items — ตรวจสอบก่อนสร้างเป็น Task ของทีม',
    `<button class="btn btn-primary" data-act="newMeeting">${ico('plus', 16)} ประชุมใหม่</button>`) + `
  <div class="meet-grid"><aside class="card meet-list"><div class="card-h"><h3>การประชุม (${ms.length})</h3></div>
    ${ms.length ? ms.map(m => `<button class="mi ${cur && cur.id === m.id ? 'on' : ''}" data-act="selMeeting" data-id="${m.id}"><b>${esc(m.title)}</b><small>${fmtDY(m.date)} · ${m.status === 'confirmed' ? 'ยืนยันแล้ว' : 'ฉบับร่าง'} · ${m.actions.length} action</small></button>`).join('') : '<p class="muted small pad">ยังไม่มีบันทึกการประชุม</p>'}</aside>
    <section>${cur ? meetingDetail(cur) : empty('mic', 'เริ่มจากการเพิ่มประชุม', 'วางข้อความบันทึก อัปโหลดไฟล์สรุป หรือแนบเสียง/รูป Post-it แล้วให้ระบบช่วยแยก Action Items', `<button class="btn btn-primary" data-act="newMeeting">${ico('plus', 16)} ประชุมใหม่</button>`)}</section></div>`;
  bindMeeting(root, cur);
};
function meetingDetail(m) {
  const lines = a => (a || []).join('\n');
  return `<div class="card meet-detail" id="meetBox">
    <div class="note ${m.status === 'draft' ? 'warn' : ''}">${ico('sparkles', 15)} ${m.status === 'draft' ? '<b>ฉบับร่างจากระบบ</b> — ระบบอ่านข้อความด้วยกฎอัตโนมัติ อาจจับชื่อ วันที่ หรือความหมายผิด โปรดตรวจและแก้ไขก่อนสร้าง Task' : 'ยืนยันแล้ว — แก้ไขได้ และสร้าง Task เพิ่มจาก Action ที่ยังไม่ได้แปลงได้'}</div>
    <div class="form-grid">
      <label class="field"><span>หัวข้อ</span><input id="mTitle" value="${esc(m.title)}"></label>
      <label class="field"><span>วันที่ประชุม</span><input type="date" id="mDate" value="${m.date}"></label>
      <label class="field full"><span>เชื่อมกับ Project (Action ที่สร้างจะเข้า Project นี้)</span><select id="mProj">${projectOptions(m.projectId, '— ไม่ผูก Project (เป็นงานจากการประชุม) —')}</select></label>
      ${m.fileName ? `<div class="field full"><span>ไฟล์ต้นทาง</span><div class="static">${ico('paperclip', 14)} ${esc(m.fileName)}</div>${m.media || ''}</div>` : ''}
      <label class="field full"><span>สรุปภาพรวม</span><textarea id="mSum" rows="3">${esc(m.summary)}</textarea></label>
      <label class="field"><span>ประเด็นสำคัญ <small>(บรรทัดละ 1 ข้อ)</small></span><textarea id="mKey" rows="5">${esc(lines(m.keyPoints))}</textarea></label>
      <label class="field"><span>ข้อสรุป / การตัดสินใจ</span><textarea id="mDec" rows="5">${esc(lines(m.decisions))}</textarea></label></div>
    <div class="card-h mt"><h3>Action Items <small class="muted">เลือก ตรวจชื่อ/วันที่ แล้วกดสร้าง Task</small></h3><button class="btn btn-ghost btn-sm" id="addAct">${ico('plus', 14)} เพิ่มรายการ</button></div>
    <div class="table-wrap"><table class="tbl actions"><thead><tr><th></th><th>งาน</th><th>ผู้รับผิดชอบ</th><th>กำหนดส่ง</th><th>สำคัญ</th><th></th></tr></thead><tbody id="actBody">${m.actions.map(actRow).join('')}</tbody></table></div>
    ${m.actions.length ? '' : '<p class="muted small pad">ไม่พบ Action Items — กด “เพิ่มรายการ” เพื่อเพิ่มเอง</p>'}
    <div class="meet-foot">${m.draftNew ? '' : `<button class="btn btn-danger-ghost" id="delMeet">${ico('trash', 15)} ลบการประชุม</button>`}<span class="grow"></span>
      <button class="btn btn-ghost" id="saveMeet">บันทึกฉบับ${m.status === 'draft' ? 'ร่าง' : ''}</button><button class="btn btn-primary" id="convMeet">${ico('check', 16)} สร้างเป็น Task ของทีม</button></div></div>`;
}
const actRow = a => `<tr data-aid="${a.id}" class="${a.taskId ? 'conv' : ''}"><td><input type="checkbox" class="a-inc" ${a.include && !a.taskId ? 'checked' : ''} ${a.taskId ? 'disabled' : ''} aria-label="เลือก"></td>
  <td><input class="a-title" value="${esc(a.title)}" ${a.taskId ? 'disabled' : ''}></td>
  <td><select class="a-who ${a.assigneeId ? '' : 'need'}" ${a.taskId ? 'disabled' : ''}>${memberOptions(a.assigneeId, '— ระบุคน —')}</select></td>
  <td><input type="date" class="a-due" value="${a.due || ''}" ${a.taskId ? 'disabled' : ''}></td>
  <td><select class="a-pr" ${a.taskId ? 'disabled' : ''}>${Object.keys(PRIO).map(k => opt(k, PRIO[k].th, a.priority)).join('')}</select></td>
  <td>${a.taskId ? `<span class="badge st-done" title="สร้าง Task แล้ว">เป็น Task แล้ว</span>` : '<button class="icon-btn a-rm" aria-label="ลบ">' + ico('x', 15) + '</button>'}</td></tr>`;
function readMeetingForm(m) {
  m.title = $('#mTitle').value.trim() || 'ประชุมไม่มีชื่อ'; m.date = $('#mDate').value || today(); m.projectId = $('#mProj').value || null;
  m.summary = $('#mSum').value; m.keyPoints = $('#mKey').value.split('\n').map(x => x.trim()).filter(Boolean); m.decisions = $('#mDec').value.split('\n').map(x => x.trim()).filter(Boolean);
  m.actions = $$('#actBody tr').map(r => {
    const old = m.actions.find(a => a.id === r.dataset.aid) || {};
    return { id: r.dataset.aid, title: $('.a-title', r).value.trim(), assigneeId: $('.a-who', r).value, due: $('.a-due', r).value, priority: $('.a-pr', r).value, include: $('.a-inc', r).checked, taskId: old.taskId || null };
  }).filter(a => a.title);
}
function bindMeeting(root, m) {
  if (!m) return;
  const body = $('#actBody'); if (!body) return;
  const bindRm = () => $$('.a-rm', body).forEach(b => b.onclick = () => { b.closest('tr').remove(); });
  bindRm();
  $('#addAct').onclick = () => { body.insertAdjacentHTML('beforeend', actRow({ id: uid('a_'), title: '', assigneeId: '', due: '', priority: 'med', include: true })); bindRm(); $$('.a-title', body).pop().focus(); };
  const persist = () => { readMeetingForm(m); if (m.draftNew) { delete m.draftNew; S().meetings.push(m); ST.meet.draft = null; } ST.meet.sel = m.id; };
  $('#saveMeet').onclick = () => { persist(); commit(); toast('บันทึกแล้ว'); };
  const del = $('#delMeet'); if (del) del.onclick = async () => { if (await confirmBox('ลบการประชุมนี้? (Task ที่สร้างแล้วจะไม่ถูกลบ)', 'ลบ', true)) { S().meetings = S().meetings.filter(x => x.id !== m.id); ST.meet.sel = null; commit(); toast('ลบแล้ว'); } };
  $('#convMeet').onclick = () => {
    readMeetingForm(m);
    const sel = m.actions.filter(a => a.include && !a.taskId);
    if (!sel.length) return toast('ยังไม่ได้เลือก Action ที่จะสร้างเป็น Task', 'error');
    const missing = sel.filter(a => !a.assigneeId);
    if (missing.length) { toast(`กรุณาระบุผู้รับผิดชอบ ${missing.length} รายการ`, 'error'); $$('#actBody tr').forEach(r => { if (!$('.a-who', r).value && $('.a-inc', r).checked) r.classList.add('flash'); }); return; }
    if (!isAdmin() && !(m.projectId && canManageProject(project(m.projectId))) && sel.some(a => a.assigneeId !== me().id) ) {
      /* members may still create tasks for the team from a meeting they ran; allow but note */
    }
    sel.forEach(a => {
      const t = newTask(m.projectId ? 'project' : 'meeting', { title: a.title, assigneeId: a.assigneeId, start: a.due && a.due >= today() ? a.due : today(), duration: 1, priority: a.priority, projectId: m.projectId, desc: `จากการประชุม “${m.title}” (${fmtDY(m.date)})`, meetingId: m.id, type: 'Admin / อื่นๆ' });
      if (a.due) { t.duration = Math.max(1, diffDays(t.start, a.due) + 1); if (taskMode(t) === 'working') t.duration = Math.max(1, workdaysBetween(t.start, a.due)); }
      S().tasks.push(t); a.taskId = t.id;
    });
    m.status = 'confirmed'; persist(); commit(); toast(`สร้าง ${sel.length} Task แล้ว — ผู้รับผิดชอบจะเห็นใน My To-Do`);
  };
}
function workdaysBetween(a, b) { let n = 0, d = a; while (d <= b && n < 999) { if (!isOff(d)) n++; d = addDays(d, 1); } return n || 1; }
ACT.selMeeting = el => { ST.meet.sel = el.dataset.id; ST.meet.draft = null; render(); };
ACT.newMeeting = () => {
  let media = '', fileName = '', textFromFile = '';
  const m = modal({
    title: 'ประชุมใหม่ — รวบรวมและสรุป', wide: true,
    body: `<form class="form-grid" id="mtForm" autocomplete="off">
      <label class="field"><span>หัวข้อการประชุม *</span><input name="title" required placeholder="เช่น Weekly Sync / Workshop Brainstorm"></label>
      <label class="field"><span>วันที่</span><input type="date" name="date" value="${today()}"></label>
      <div class="field full"><span>แหล่งข้อมูล</span><div class="src-pick">
        <label class="srcbtn"><input type="file" id="mtFile" accept="audio/*,image/*,.txt,.md,.csv,.vtt,.srt,.doc,.docx,.pdf" hidden>${ico('upload', 18)}<b>อัปโหลดไฟล์</b><small>เสียง · เอกสาร · รูป Post-it</small></label>
        <button type="button" class="srcbtn" id="mtSample">${ico('sparkles', 18)}<b>ลองตัวอย่าง</b><small>ดูว่าระบบแยกอย่างไร</small></button></div>
        <div id="fileInfo" class="muted small"></div><div id="mediaBox"></div></div>
      <label class="field full"><span>ข้อความบันทึกประชุม / ข้อความถอดเสียง / ข้อความบน Post-it</span>
        <textarea name="text" rows="9" placeholder="วางหรือพิมพ์ที่นี่ — เคล็ดลับ: เขียน “Action: ชื่อคน ทำอะไร ภายใน 15/12” ระบบจะจับชื่อและวันที่ให้"></textarea></label>
      <div class="note full">${ico('sparkles', 14)} <b>เวอร์ชันนี้แยกเนื้อหาด้วยกฎอ่านข้อความในเครื่อง</b> — ไฟล์เสียงและรูปภาพจะถูกแนบไว้ แต่ยังไม่ถูกถอดความอัตโนมัติ (ต้องพิมพ์/วางข้อความ หรือเชื่อมบริการ AI ภายหลัง) ผลลัพธ์เป็นฉบับร่างที่คุณต้องตรวจก่อนเสมอ</div></form>`,
    actions: [{ label: 'ยกเลิก' }, {
      label: ico('sparkles', 15) + ' วิเคราะห์และสร้างฉบับร่าง', cls: 'btn-primary', onClick: () => {
        const f = $('#mtForm'); if (!f.reportValidity()) return false;
        const text = f.elements.text.value.trim();
        if (!text) { toast('กรุณาวางหรือพิมพ์ข้อความบันทึกประชุมก่อน', 'error'); return false; }
        const r = analyzeMeeting(text);
        ST.meet.draft = { id: uid('mt_'), draftNew: true, title: f.elements.title.value.trim(), date: f.elements.date.value, source: 'text', fileName, media, projectId: null, status: 'draft', raw: text, ...r };
        render(); toast('สร้างฉบับร่างแล้ว — โปรดตรวจสอบก่อนสร้าง Task');
      },
    }],
    onOpen(md) {
      const f = $('#mtForm', md.el), fin = $('#mtFile', md.el);
      f.addEventListener('submit', e => e.preventDefault());
      $('#mtSample', md.el).onclick = () => { f.elements.title.value ||= 'ประชุมวางแผน Roadshow'; f.elements.text.value = SAMPLE_NOTES; };
      fin.onchange = () => {
        const file = fin.files[0]; if (!file) return; fileName = file.name;
        const info = $('#fileInfo', md.el), box = $('#mediaBox', md.el);
        info.textContent = `แนบแล้ว: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        if (!f.elements.title.value) f.elements.title.value = file.name.replace(/\.[^.]+$/, '');
        if (/^audio\//.test(file.type)) { const u = URL.createObjectURL(file); box.innerHTML = `<audio controls src="${u}"></audio>`; info.textContent += ' — ฟังแล้วพิมพ์สรุป/ถอดความในช่องด้านล่าง'; media = ''; }
        else if (/^image\//.test(file.type)) { const r = new FileReader(); r.onload = () => { box.innerHTML = `<img class="preview" src="${r.result}" alt="รูป Post-it">`; if (file.size < 600000) media = `<img class="preview" src="${r.result}" alt="รูปต้นทาง">`; }; r.readAsDataURL(file); info.textContent += ' — พิมพ์ข้อความบน Post-it แต่ละใบเป็น 1 บรรทัดในช่องด้านล่าง'; }
        else if (/\.(txt|md|csv|vtt|srt)$/i.test(file.name) || file.type.startsWith('text/')) { const r = new FileReader(); r.onload = () => { f.elements.text.value = r.result; }; r.readAsText(file); info.textContent += ' — อ่านข้อความเข้าช่องด้านล่างแล้ว'; }
        else info.textContent += ' — เบราว์เซอร์อ่านไฟล์ Word/PDF โดยตรงไม่ได้ กรุณาคัดลอกข้อความมาวางด้านล่าง';
      };
    },
  });
};

/* ========================= TEAM & SETTINGS ========================= */
V.team = root => {
  const admin = isAdmin(), st = S().settings;
  const memberCard = m => {
    const w = workload(m.id), pms = S().projects.filter(p => p.pmId === m.id);
    return `<article class="mcard"><div class="mc-top">${avatar(m, 46)}<div class="grow"><b>${esc(m.name)}${m.alias ? ` <small class="muted">(${esc(m.alias)})</small>` : ''}</b><small>${esc(m.position)}</small></div>
      ${(admin || m.id === me().id) ? `<button class="icon-btn" data-act="myStyle" data-id="${m.id}" title="ปรับแต่ง Post-it & Icon" aria-label="ปรับแต่งสไตล์">${ico('sparkles', 16)}</button>` : ''}${admin ? `<button class="icon-btn" data-act="editMember" data-id="${m.id}" aria-label="แก้ไข ${esc(m.name)}">${ico('edit', 16)}</button>` : ''}</div>
      <div class="mc-tags">${m.role === 'admin' ? '<span class="badge ev-confirmed">Admin</span>' : ''}${pms.map(p => `<span class="pm" title="${esc(p.name)}">PM · ${esc(p.name)}</span>`).join('')}</div>
      <p class="resp">${esc(m.resp || 'ยังไม่ได้ระบุหน้าที่')}</p>${m.managerId && member(m.managerId) ? `<small class="muted">รายงานต่อ ${esc(member(m.managerId).name)}</small>` : ''}<div class="mc-foot"><span>${w.active} งานเปิดอยู่</span>${w.delayed ? `<span class="late">${w.delayed} ล่าช้า</span>` : '<span class="muted">ไม่มีงานล่าช้า</span>'}</div></article>`;
  };
  root.innerHTML = pageHead('ทีมและการตั้งค่า', `สมาชิก ${S().members.length} คน · สิทธิ์ของคุณ: <b>${admin ? 'Admin (ดูภาพรวมทีม)' : isPM() ? 'Project Manager' : 'สมาชิก'}</b>`,
    admin ? `<button class="btn btn-primary" data-act="newMember">${ico('plus', 16)} เพิ่มสมาชิก</button>` : '') + `
  <div class="tabs" role="tablist"><button class="${ST.team.tab === 'members' ? 'on' : ''}" data-act="teamTab" data-id="members">สมาชิก</button><button class="${ST.team.tab === 'org' ? 'on' : ''}" data-act="teamTab" data-id="org">สายบังคับบัญชา</button></div>
  <div class="note">${ico('lock', 14)} <b>สิทธิ์การมองเห็น:</b> Admin เห็นทุกอย่าง · หัวหน้าทีมเห็นงานของตนเองและลูกน้อง (Direct report) · สมาชิกเห็นงานของตนเองและ Project ที่ร่วมอยู่ · ทุกคนเห็น Major Event และ Offsite · งานที่ตั้งเป็น “ส่วนตัว” เห็นเฉพาะเจ้าของ</div>
  ${ST.team.tab === 'org' ? orgTree(admin) : S().groups.map(g => { const ms = S().members.filter(m => m.group === g.id); return ms.length ? `<h3 class="grp-h"><i style="background:${g.color}"></i>${esc(g.name)} <em>${ms.length}</em></h3><div class="mcards">${ms.map(memberCard).join('')}</div>` : ''; }).join('')}
  ${admin ? `<h2 class="sec-h">การตั้งค่า (Admin)</h2><div class="two-col">
    <section class="card"><div class="card-h"><h3>การนับวัน & วันหยุดบริษัท</h3></div>
      <label class="field"><span>วิธีนับระยะเวลางาน (ค่าเริ่มต้นของทีม)</span><select id="setMode">${opt('working', 'วันทำงาน — ข้ามวันหยุดสุดสัปดาห์และวันหยุดบริษัท', st.dayMode)}${opt('calendar', 'วันปฏิทิน — นับทุกวัน', st.dayMode)}</select></label>
      <div class="field"><span>วันหยุดประจำสัปดาห์</span><div class="wk-pick">${TH_DOW.map((d, i) => `<label class="pill"><input type="checkbox" class="wk" value="${i}" ${st.weekend.includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>
      <label class="check mb"><input type="checkbox" id="setPublic" ${st.usePublicHolidays !== false ? 'checked' : ''}> ใช้วันหยุดราชการไทย (ตามประกาศ) ในปฏิทินและการนับวันทำงาน</label>
      <p class="muted small mb">ข้อมูลวันหยุดราชการ: ปี 2569 ครบถ้วน · ปี 2570 มีเฉพาะวันที่คงที่ — วันหยุดตามจันทรคติของปี 2570 ให้เพิ่มเองในรายการด้านล่างเมื่อมีประกาศ</p>
      <div class="field"><span>วันหยุดเพิ่มเติมของบริษัท</span><ul class="holidays">${sortBy(st.holidays, h => h.date).map((h, i) => `<li><span>${fmtDY(h.date)} — ${esc(h.name)}</span><button class="icon-btn" data-act="rmHoliday" data-id="${h.date}" aria-label="ลบ">${ico('x', 14)}</button></li>`).join('') || '<li class="muted">ยังไม่มีวันหยุด</li>'}</ul>
      <div class="inline-add"><input type="date" id="hDate"><input id="hName" placeholder="ชื่อวันหยุด"><button class="btn btn-ghost btn-sm" data-act="addHoliday">เพิ่ม</button></div></div></section>
    <section class="card"><div class="card-h"><h3>สิทธิ์เพิ่ม Major Event</h3></div>
      <p class="muted small mb">Admin เพิ่มได้เสมอ — เลือกสมาชิกที่สามารถเพิ่มและแก้ไข Major Event ได้</p>
      <div class="sp-m mb" id="editorPick">${S().members.filter(m => m.role !== 'admin').map(m => `<label class="pill"><input type="checkbox" value="${m.id}" ${st.eventEditors.includes(m.id) ? 'checked' : ''}><span>${avatar(m, 20)}${esc(m.name)}</span></label>`).join('')}</div>
      <div class="card-h"><h3>ประเภทงาน</h3></div>
      <label class="field"><span class="sr">ประเภทงาน</span><textarea id="setTypes" rows="4">${esc(st.types.join('\n'))}</textarea></label>
      <button class="btn btn-primary btn-sm" data-act="saveLists">บันทึกรายการ</button></section></div>
    <section class="card mt"><div class="card-h"><h3>ข้อมูลและการสำรอง</h3></div>
      <p class="muted small">โหมดจัดเก็บ: <b>${Store.mode === 'server' ? 'ซิงค์กับเซิร์ฟเวอร์ (ทีมใช้ข้อมูลชุดเดียวกัน)' : 'บันทึกในเบราว์เซอร์เครื่องนี้เท่านั้น — รัน “node server.js” เพื่อแชร์ทั้งทีม'}</b></p>
      <div class="btn-row"><button class="btn btn-ghost" data-act="exportBackup">${ico('download', 16)} สำรองข้อมูล (JSON)</button><label class="btn btn-ghost">${ico('upload', 16)} นำเข้าข้อมูล<input type="file" id="importIn" accept=".json" hidden></label><button class="btn btn-danger-ghost" data-act="resetDemo">รีเซ็ตเป็นข้อมูลตัวอย่าง</button></div></section>` : ''}`;
  const imp = $('#importIn'); if (imp) imp.onchange = () => {
    const file = imp.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = async () => {
      try { const d = JSON.parse(r.result); if (!d.members || !d.tasks) throw 0; if (!await confirmBox('แทนที่ข้อมูลปัจจุบันทั้งหมดด้วยไฟล์นี้?', 'นำเข้า', true)) return; Store.state = d; commit(); toast('นำเข้าข้อมูลแล้ว'); }
      catch (e) { toast('ไฟล์ไม่ถูกต้อง', 'error'); }
    }; r.readAsText(file);
  };
  const sm = $('#setMode'); if (sm) sm.onchange = () => { st.dayMode = sm.value; commit(); toast('บันทึกแล้ว'); };
  const sp = $('#setPublic'); if (sp) sp.onchange = () => { st.usePublicHolidays = sp.checked; commit(); };
  const ep = $('#editorPick'); if (ep) ep.onchange = () => { st.eventEditors = $$('input:checked', ep).map(i => i.value); Store.save(); toast('บันทึกสิทธิ์แล้ว'); };
  $$('.wk').forEach(c => c.onchange = () => { st.weekend = $$('.wk:checked').map(x => +x.value); commit(); });
};
ACT.teamTab = el => { ST.team.tab = el.dataset.id; render(); };
function orgTree(admin) {
  const ms = S().members, ids = new Set(ms.map(m => m.id));
  const kids = id => ms.filter(m => m.managerId === id);
  const node = (m, depth = 0) => { const k = kids(m.id), w = workload(m.id);
    return `<li><div class="org-n">${avatar(m, 34)}<div class="grow"><b>${esc(m.name)}</b>${m.role === 'admin' ? ' <span class="badge ev-confirmed">Admin</span>' : ''}<small>${esc(m.position)}</small></div>
      ${k.length ? `<span class="badge">${k.length} Direct report</span>` : ''}<span class="muted small">${w.active} งาน</span>${admin ? `<button class="icon-btn" data-act="editMember" data-id="${m.id}" aria-label="กำหนดหัวหน้า">${ico('edit', 15)}</button>` : ''}</div>${k.length && depth < 8 ? `<ul>${k.map(x => node(x, depth + 1)).join('')}</ul>` : ''}</li>`; };
  const roots = ms.filter(m => !m.managerId || !ids.has(m.managerId));
  return `<section class="card"><div class="card-h"><h3>สายบังคับบัญชา</h3><small class="muted">${admin ? 'Admin กำหนดหัวหน้างานของแต่ละคนได้ที่ปุ่มแก้ไข' : 'หัวหน้าทีมเห็นงานของลูกน้องในสายของตน'}</small></div><ul class="org">${roots.map(m => node(m)).join('')}</ul></section>`;
}
ACT.addHoliday = () => { const d = $('#hDate').value, n = $('#hName').value.trim(); if (!d || !n) return toast('ระบุวันที่และชื่อวันหยุด', 'error'); S().settings.holidays.push({ date: d, name: n }); commit(); };
ACT.rmHoliday = el => { S().settings.holidays = S().settings.holidays.filter(h => h.date !== el.dataset.id); commit(); };
ACT.saveLists = () => { const sp = id => $(id).value.split('\n').map(x => x.trim()).filter(Boolean); S().settings.types = sp('#setTypes'); commit(); toast('บันทึกรายการแล้ว'); };
ACT.exportBackup = () => { downloadBlob(`aex-hub-backup-${today()}.json`, new Blob([JSON.stringify(S(), null, 1)], { type: 'application/json' })); };
ACT.resetDemo = async () => { if (await confirmBox('ลบข้อมูลทั้งหมดและกลับเป็นข้อมูลตัวอย่าง?', 'รีเซ็ต', true)) { Store.state = seed(); commit(); toast('รีเซ็ตแล้ว'); } };
ACT.newMember = () => openMember(null);
ACT.editMember = el => openMember(el.dataset.id);
function openMember(id) {
  const orig = id ? member(id) : null;
  const m = orig ? { ...orig } : { id: uid('m_'), name: '', alias: '', position: '', group: 'prime', role: 'member', resp: '' };
  modal({
    title: orig ? `แก้ไขโปรไฟล์ — ${orig.name}` : 'เพิ่มสมาชิก',
    body: `<form id="mbForm" class="form-grid" autocomplete="off">
      <label class="field"><span>ชื่อ *</span><input name="name" required value="${esc(m.name)}"></label><label class="field"><span>ชื่อเล่น (ไทย)</span><input name="alias" value="${esc(m.alias || '')}"></label>
      <label class="field"><span>หน้าที่ / ทีม</span><select name="group">${groupOptions(m.group)}</select></label><label class="field"><span>ตำแหน่ง</span><input name="position" value="${esc(m.position)}"></label>
      <label class="field full"><span>หัวหน้างาน (Reports to) <small>หัวหน้าจะเห็นงานของลูกน้องในสาย</small></span><select name="managerId">${opt('', '— ไม่มี / ระดับสูงสุด —', m.managerId || '')}${S().members.filter(x => x.id !== m.id && !subordinates(m.id).has(x.id)).map(x => opt(x.id, `${x.name} · ${x.position}`, m.managerId || '')).join('')}</select></label>
      <label class="field full"><span>งานที่รับผิดชอบ</span><textarea name="resp" rows="2">${esc(m.resp)}</textarea></label>
      <label class="field full"><span>สิทธิ์</span><select name="role">${opt('member', 'สมาชิก (ดูและอัปเดตงานที่ได้รับมอบหมาย)', m.role)}${opt('admin', 'Admin (ดูภาพรวมและจัดการทั้งหมด)', m.role)}</select></label></form>`,
    actions: (orig ? [{ label: ico('trash', 15) + ' ลบสมาชิก', cls: 'btn-danger-ghost', left: true, onClick: async () => {
      if (orig.id === me().id) { toast('ไม่สามารถลบตัวเองได้', 'error'); return false; }
      if (S().members.filter(x => x.role === 'admin' && x.id !== orig.id).length === 0 && orig.role === 'admin') { toast('ต้องมี Admin อย่างน้อย 1 คน', 'error'); return false; }
      const n = S().tasks.filter(t => t.assigneeId === orig.id && isActive(t)).length;
      if (await confirmBox(`ลบ ${esc(orig.name)}? ${n ? `งานที่ยังเปิดอยู่ ${n} รายการจะกลายเป็น “ยังไม่ระบุผู้รับผิดชอบ”` : ''}`, 'ลบสมาชิก', true)) {
        S().tasks = S().tasks.filter(t => !(t.private && t.assigneeId === orig.id)); S().tasks.forEach(t => { if (t.assigneeId === orig.id) t.assigneeId = ''; });
        S().projects.forEach(p => { p.squad = p.squad.filter(x => x !== orig.id); if (p.pmId === orig.id) p.pmId = me().id; });
        S().members.forEach(x => { if (x.managerId === orig.id) x.managerId = orig.managerId || ''; });
        S().offsite.forEach(o => { o.personIds = o.personIds.filter(x => x !== orig.id); }); S().offsite = S().offsite.filter(o => o.personIds.length);
        S().members = S().members.filter(x => x.id !== orig.id); commit(); toast('ลบสมาชิกแล้ว'); return true;
      } return false;
    } }] : []).concat([{ label: 'ยกเลิก' }, { label: 'บันทึก', cls: 'btn-primary', onClick: () => {
      const f = $('#mbForm'); if (!f.reportValidity()) return false;
      Object.assign(m, { name: f.elements.name.value.trim(), alias: f.elements.alias.value.trim(), group: f.elements.group.value, position: f.elements.position.value.trim(), resp: f.elements.resp.value, role: f.elements.role.value, managerId: f.elements.managerId.value || '' });
      if (orig) Object.assign(orig, m); else S().members.push(m);
      commit(); toast('บันทึกแล้ว');
    } }]),
    onOpen(md) { $('#mbForm', md.el).addEventListener('submit', e => e.preventDefault()); },
  });
}
