'use strict';
/* ============================================================
   Admin · storage overview: what uses space, how close we are to the limits, and tidy-up tools.
   Two limits matter:
   1) the database plan (Upstash free tier by default — Admin can change the number);
   2) the shared team data that every device downloads on each change and uploads on each save
      (one request body; the Vercel function accepts up to 4 MB).
   ============================================================ */
const SYNC_LIMIT = 4 * 1024 * 1024;
const LOCAL_LIMIT = 5 * 1024 * 1024;   // typical browser storage for one site (demo mode)
const fmtBytes = n => n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
const byteLen = v => new TextEncoder().encode(typeof v === 'string' ? v : JSON.stringify(v ?? null)).length;
const pctOf = (a, b) => b ? Math.min(100, a / b * 100) : 0;

/* what is inside the shared team data */
function stateParts(st) {
  const files = []; let fileBytes = 0;
  const tasksLite = st.tasks.map(t => { (t.files || []).forEach(f => { const b = byteLen(f.data || ''); fileBytes += b; files.push({ task: t, name: f.name, bytes: b }); }); return t.files && t.files.length ? { ...t, files: [] } : t; });
  const brand = (st.settings || {}).brand || {}, settingsLite = { ...st.settings, brand: undefined };
  const parts = [
    ['งาน (ไม่รวมไฟล์แนบ)', byteLen(tasksLite)], ['ไฟล์แนบในงาน', fileBytes], ['Project', byteLen(st.projects)], ['Event', byteLen(st.events)],
    ['Offsite', byteLen(st.offsite)], ['การแจ้งเตือน', byteLen(st.notices) + byteLen(st.noticeSeen)], ['สมาชิกและทีม', byteLen(st.members) + byteLen(st.groups)],
    ['ตั้งค่า CI / โลโก้', byteLen(brand)], ['ตั้งค่าอื่น ๆ', byteLen(settingsLite)], ['ประชุม', byteLen(st.meetings)], ['Hub Post (โหมดสาธิต)', byteLen(st.posts || [])],
  ].filter(x => x[1] > 2);
  return { parts: parts.sort((a, b) => b[1] - a[1]), files: files.sort((a, b) => b.bytes - a.bytes) };
}
const meterHTML = (segs, total, limit, label, sub) => {
  const used = segs.reduce((n, s) => n + s[1], 0), p = pctOf(used, limit), lvl = p >= 90 ? 'bad' : p >= 70 ? 'warn' : 'ok';
  return `<div class="st-meter ${lvl}"><div class="st-mh"><b>${label}</b><span><b>${p < 1 && used ? '<1' : Math.round(p)}%</b> · ${fmtBytes(used)} จาก ${fmtBytes(limit)}</span></div>
    <div class="st-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}" aria-label="${label} ${Math.round(p)}%">${segs.filter(s => s[1]).map(s => `<i style="width:${Math.max(.6, pctOf(s[1], limit))}%;background:${s[2]}" title="${esc(s[0])} · ${fmtBytes(s[1])}"></i>`).join('')}</div>
    ${segs.length > 1 ? `<div class="st-leg">${segs.map(s => `<span><i style="background:${s[2]}"></i>${esc(s[0])} <b>${fmtBytes(s[1])}</b></span>`).join('')}</div>` : ''}${sub ? `<p class="muted small">${sub}</p>` : ''}</div>`;
};
let STORAGE_INFO = null;
async function loadStorage(force) {
  const box = $('#storageBox'); if (!box) return;
  const st = S(), sp = stateParts(st), syncBytes = byteLen(st), server = Store.mode === 'server';
  if (server && (force || !STORAGE_INFO)) {
    box.querySelector('.st-body').innerHTML = '<p class="muted small" role="status">กำลังคำนวณพื้นที่…</p>';
    try { const r = await fetch('api/storage', { headers: Store.headers(), cache: 'no-store' }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'HTTP ' + r.status); STORAGE_INFO = await r.json(); }
    catch (e) { box.querySelector('.st-body').innerHTML = `<div class="note warn" role="alert">อ่านขนาดพื้นที่ไม่สำเร็จ (${esc(e.message)}) <button type="button" class="link-btn" data-act="storageRefresh">ลองใหม่</button></div>`; return; }
  }
  const I = STORAGE_INFO, limitMB = +(st.settings.storageLimitMB || 256), limit = limitMB * 1048576;
  const used = new Set([...st.projects.map(p => p.poster && p.poster.id), ...((st.settings.brand || {}).fontFiles || []).map(f => f.id)].filter(Boolean));
  let html = '';
  if (server && I) {
    const posters = I.blobs.filter(b => b.id.startsWith('pp_')), fonts = I.blobs.filter(b => b.id.startsWith('font_')), other = I.blobs.filter(b => !b.id.startsWith('pp_') && !b.id.startsWith('font_'));
    const orphan = I.blobs.filter(b => !used.has(b.id)), sum = a => a.reduce((n, b) => n + b.bytes, 0);
    const segs = [['ข้อมูลทีม (ซิงก์)', I.state, '#00008F'], ['Hub Post', I.posts.bytes, '#6574F8'], ['โปสเตอร์ Project', sum(posters), '#74BDE8'], ['ฟอนต์ CI', sum(fonts), '#614FE8'], ['บัญชี · แจ้งเตือนบนเครื่อง', I.auth, '#999999'], ['อื่น ๆ', sum(other), '#E6E6E6']].filter(s => s[1]);
    const total = segs.reduce((n, s) => n + s[1], 0), p = pctOf(total, limit);
    html += meterHTML(segs, total, limit, 'พื้นที่ฐานข้อมูลทั้งหมด', `แพ็กเกจที่ตั้งไว้ <label class="st-lim"><input type="number" id="stLimit" min="16" max="102400" step="1" value="${limitMB}" aria-label="ขนาดพื้นที่ของแพ็กเกจ (MB)"> MB</label> — ตั้งให้ตรงกับแพ็กเกจ Upstash ที่ใช้จริง (ดูใน Upstash Console) · ตัวเลขเป็นขนาดข้อมูลจริง ฐานข้อมูลใช้พื้นที่เพิ่มเล็กน้อยต่อรายการ`);
    html += meterHTML([['ข้อมูลทีม', syncBytes, syncBytes > SYNC_LIMIT * .6 ? '#FF4E56' : '#00008F']], syncBytes, SYNC_LIMIT, 'ข้อมูลที่ซิงก์ทุกครั้ง', 'ทุกเครื่องดาวน์โหลดก้อนนี้เมื่อมีการเปลี่ยนแปลง และส่งขึ้นทุกครั้งที่บันทึก — ถ้าเกิน 4 MB จะบันทึกไม่ได้ จึงควรเก็บให้เล็ก (ไฟล์ใหญ่ให้ใส่เป็นลิงก์)');
    const tips = [];
    if (p >= 70) tips.push(`พื้นที่ฐานข้อมูลใช้ไปแล้ว ${Math.round(p)}% — ลบรูปที่ไม่ได้ใช้, ลดจำนวน Hub Post ที่เก็บ หรือย้ายไฟล์แนบไปเป็นลิงก์`);
    if (syncBytes > SYNC_LIMIT * .5) tips.push('ข้อมูลที่ซิงก์ใหญ่เกินครึ่งของขีดจำกัด — ไฟล์แนบในงานเป็นส่วนที่ควรย้ายไปเก็บเป็นลิงก์ก่อน');
    html += tips.length ? `<div class="note warn">${tips.map(esc).join('<br>')}</div>` : '<p class="st-ok">อยู่ในเกณฑ์ปกติ — ยังไม่ต้องทำอะไร</p>';
    html += `<h4 class="st-h">เครื่องมือจัดการ</h4><div class="st-tools">
      <div class="st-tool"><div><b>รูปและฟอนต์ที่ไม่ได้ใช้แล้ว</b><small>${orphan.length ? `${orphan.length} ไฟล์ · ${fmtBytes(sum(orphan))} (เช่น โปสเตอร์ของ Project ที่ลบไปแล้ว)` : 'ไม่มี'}</small></div><button type="button" class="btn btn-ghost btn-sm" data-act="storageOrphans" ${orphan.length ? '' : 'disabled'}>ลบ</button></div>
      <div class="st-tool"><div><b>Hub Post</b><small>${I.posts.count} รายการ · ${fmtBytes(I.posts.bytes)} — ระบบเก็บล่าสุดไม่เกิน 1,500 รายการอยู่แล้ว</small></div><span class="st-act"><select id="stKeep" aria-label="จำนวนรายการ Hub Post ที่จะเก็บ">${[1000, 500, 200].map(n => `<option value="${n}">เก็บล่าสุด ${n} รายการ</option>`).join('')}</select><button type="button" class="btn btn-ghost btn-sm" data-act="storagePosts" ${I.posts.count > 200 ? '' : 'disabled'}>ลดลง</button></span></div>
      ${noticeTool(st)}</div>`;
  } else {
    html += meterHTML([['ข้อมูลในเบราว์เซอร์', syncBytes, '#00008F']], syncBytes, LOCAL_LIMIT, 'พื้นที่ในเบราว์เซอร์นี้ (โหมดสาธิต)', 'โหมดสาธิตเก็บทุกอย่างในเบราว์เซอร์เครื่องนี้ ซึ่งจำกัดราว 5 MB');
    html += `<h4 class="st-h">เครื่องมือจัดการ</h4><div class="st-tools">${noticeTool(st)}</div>`;
  }
  html += `<h4 class="st-h">ข้างในข้อมูลทีม</h4><ul class="st-parts">${sp.parts.map(([l, b]) => `<li><span>${esc(l)}</span><i style="--w:${pctOf(b, sp.parts[0][1])}%"></i><b>${fmtBytes(b)}</b></li>`).join('')}</ul>`;
  if (sp.files.length) html += `<h4 class="st-h">ไฟล์แนบที่ใหญ่ที่สุด</h4><ul class="st-files">${sp.files.slice(0, 6).map(f => `<li><span class="grow"><b>${esc(f.name)}</b><small class="muted">${esc(f.task.title)}</small></span><b>${fmtBytes(f.bytes)}</b><button type="button" class="btn btn-ghost btn-sm" data-act="openTask" data-id="${f.task.id}">เปิดงาน</button></li>`).join('')}</ul><p class="muted small">เปิดงานแล้วลบไฟล์ออก แล้วใส่เป็นลิงก์ (เช่น Google Drive) แทน ข้อมูลทีมจะเล็กลงทันที</p>`;
  box.querySelector('.st-body').innerHTML = html;
  const li = $('#stLimit', box); if (li) li.onchange = () => { const v = Math.max(16, Math.min(102400, parseInt(li.value, 10) || 256)); st.settings.storageLimitMB = v; Store.save(); loadStorage(); };
}
function noticeTool(st) {
  const old = (st.notices || []).filter(n => n.at < Date.now() - 30 * 864e5);
  return `<div class="st-tool"><div><b>การแจ้งเตือนเก่ากว่า 30 วัน</b><small>${old.length ? `${old.length} รายการ · ${fmtBytes(byteLen(old))} (ระบบลบเองเมื่อเกิน 60 วัน)` : 'ไม่มี'}</small></div><button type="button" class="btn btn-ghost btn-sm" data-act="storageNotices" ${old.length ? '' : 'disabled'}>ลบ</button></div>`;
}
const storageCardHTML = () => `<section class="card mt" id="storageBox"><div class="card-h"><h3>พื้นที่จัดเก็บข้อมูล</h3><button type="button" class="btn btn-ghost btn-sm" data-act="storageRefresh">${ico('refresh', 14)} คำนวณใหม่</button></div><div class="st-body"><p class="muted small" role="status">กำลังคำนวณพื้นที่…</p></div></section>`;

ACT.storageRefresh = () => loadStorage(true);
ACT.storageNotices = async () => {
  const cut = Date.now() - 30 * 864e5, n = (S().notices || []).filter(x => x.at < cut).length;
  if (!n || !await confirmBox(`ลบการแจ้งเตือนเก่ากว่า 30 วัน ${n} รายการ?`, 'ลบ', true)) return;
  S().notices = S().notices.filter(x => x.at >= cut); Store.save(); toast(`ลบแล้ว ${n} รายการ`); loadStorage(true);
};
ACT.storageOrphans = async el => {
  if (!await confirmBox('ลบรูปโปสเตอร์และฟอนต์ที่ไม่มี Project หรือการตั้งค่า CI ใช้แล้ว? ย้อนกลับไม่ได้', 'ลบ', true)) return;
  el.disabled = true;
  try { const r = await fetch('api/storage/clean', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ action: 'orphans' }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'ไม่สำเร็จ'); toast(`ลบแล้ว ${j.removed} ไฟล์ · คืนพื้นที่ ${fmtBytes(j.bytes)}`); }
  catch (e) { toast(e.message, 'error'); }
  loadStorage(true);
};
ACT.storagePosts = async el => {
  const keep = +($('#stKeep') || {}).value || 500;
  if (!await confirmBox(`เก็บ Hub Post ไว้เฉพาะ ${keep} รายการล่าสุด (นับรวมความเห็นและการกดแสดงความรู้สึก) — รายการที่เก่ากว่าจะถูกลบถาวร`, 'ยืนยัน', true)) return;
  el.disabled = true;
  try { const r = await fetch('api/storage/clean', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ action: 'posts', keep }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'ไม่สำเร็จ'); toast(`ลบ Hub Post เก่าแล้ว ${j.removed} รายการ`); HubPost.seq = null; HubPost.load().then(hpDraw); }
  catch (e) { toast(e.message, 'error'); }
  loadStorage(true);
};
