'use strict';
/* ============================================================
   Poster Studio · fonts
   CI: Headline = Publico · secondary = Source Sans Pro · Thai = DB Helvethaica X.
   Publico and DB are commercial and this repository is public, so the files are NOT
   bundled: an Admin uploads them once in CI Control (stored privately on the server
   with the team data) or they are used when installed on the computer (local()).
   Free alternatives (Google Fonts, OFL) load on demand for the Studio only.
   ============================================================ */
const SD_GFONTS = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Prompt:wght@400;600;700&family=Kanit:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&family=Anuphan:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&display=swap';
function sdFontLinks() { if (document.getElementById('sdGF')) return; const l = document.createElement('link'); l.id = 'sdGF'; l.rel = 'stylesheet'; l.href = SD_GFONTS; document.head.appendChild(l); }
const SD_FONT_LOADED = new Set();
const SD_FONT_MAX = 950000;   // data-URL length (~700 KB file) — server storage limit
async function sdFontData(id) {
  if (Store.mode === 'server') { try { const r = await fetch('api/font?id=' + encodeURIComponent(id), { headers: Store.headers() }); return r.ok ? (await r.json()).data : null; } catch (e) { return null; } }
  try { return localStorage.getItem('aex-font-' + id); } catch (e) { return null; }
}
async function sdFontFiles() {
  const list = pbBrand().fontFiles || [];
  await Promise.all(list.map(async f => {
    if (SD_FONT_LOADED.has(f.id)) return; SD_FONT_LOADED.add(f.id);
    try { const d = await sdFontData(f.id); if (!d) return; const ff = new FontFace(f.family, `url(${d})`, { weight: String(f.weight || 400), style: f.style || 'normal' }); await ff.load(); document.fonts.add(ff); }
    catch (e) { console.warn('font', f.family, e); }
  }));
}
function sdFileToDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('อ่านไฟล์ฟอนต์ไม่ได้')); r.readAsDataURL(file); }); }
async function sdFontUpload(file, family, weight) {   // → { id, family, weight, name }
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('ใช้ไฟล์ฟอนต์ .ttf .otf .woff หรือ .woff2');
  const ext = file.name.split('.').pop().toLowerCase(), mime = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' }[ext];
  const data = (await sdFileToDataUrl(file)).replace(/^data:[^;]*;/, `data:${mime};`);
  if (data.length > SD_FONT_MAX) throw new Error('ไฟล์ฟอนต์ใหญ่เกินไป (เกิน ~700 KB) — ใช้ไฟล์ .woff2 หรือแยกเฉพาะน้ำหนักที่ใช้');
  try { const ff = new FontFace(family, `url(${data})`, { weight: String(weight) }); await ff.load(); document.fonts.add(ff); } catch (e) { throw new Error('ไฟล์นี้ไม่ใช่ฟอนต์ที่เบราว์เซอร์อ่านได้'); }
  const id = 'font_' + Math.random().toString(36).slice(2, 10);
  if (Store.mode === 'server') {
    const r = await fetch('api/font?id=' + id, { method: 'PUT', headers: Store.headers(true), body: JSON.stringify({ data }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'อัปโหลดฟอนต์ไม่สำเร็จ'); }
  } else { try { localStorage.setItem('aex-font-' + id, data); } catch (e) { throw new Error('พื้นที่เก็บในเบราว์เซอร์ไม่พอ'); } }
  SD_FONT_LOADED.add(id);
  return { id, family, weight: +weight, name: file.name };
}
/* CI Control section (rendered inside the existing CI modal) */
function sdFontSection(draft, can) {
  const f = draft.fonts || {}, files = draft.fontFiles || [], up = files.map(x => x.family);
  const sel = (key, list, def) => `<select data-fontcfg="${key}" ${can ? '' : 'disabled'}>${[...new Set([...list.map(x => x[0]), ...up])].map(n => `<option value="${esc(n)}" ${(f[key] || def) === n ? 'selected' : ''}>${esc(n)}${sdFontOk(n) ? '' : ' (ยังไม่มีไฟล์)'}</option>`).join('')}</select>`;
  return `<h4 class="mt">ฟอนต์ของโปสเตอร์</h4>
    <p class="small muted">ตาม CI: หัวข้อใหญ่ <b>Publico</b> · ตัวรอง <b>Source Sans Pro</b> · ภาษาไทย <b>DB Helvethaica X</b> — Publico และ DB เป็นฟอนต์มีลิขสิทธิ์ ไม่ได้แนบมากับแอป ให้ Admin อัปโหลดไฟล์ที่บริษัทมีสิทธิ์ใช้ (เก็บเป็นส่วนตัวในระบบของทีม) ถ้ายังไม่มีไฟล์ ระบบใช้ฟอนต์สำรองที่ใกล้เคียงให้อัตโนมัติ</p>
    <div class="form-grid mt">
      <label class="field"><span>หัวข้อใหญ่ (อังกฤษ/ตัวเลข)</span>${sel('head', SD_FONTS.head, 'Publico')}</label>
      <label class="field"><span>ตัวรอง (อังกฤษ/ตัวเลข)</span>${sel('body', SD_FONTS.body, 'Source Sans Pro')}</label>
      <label class="field"><span>ภาษาไทย</span>${sel('thai', SD_FONTS.thai, 'DB Helvethaica X')}</label>
    </div>
    <div class="sd-fontfiles">${files.length ? files.map(x => `<span class="badge">${esc(x.family)} · ${x.weight}${can ? ` <button type="button" class="icon-btn" data-fontdel="${x.id}" aria-label="ลบฟอนต์">${ico('x', 12)}</button>` : ''}</span>`).join('') : '<span class="small muted">ยังไม่มีไฟล์ฟอนต์ที่อัปโหลด</span>'}</div>
    ${can ? `<div class="sd-fontup"><input id="sdFFam" list="sdFFamL" placeholder="ชื่อฟอนต์ เช่น Publico หรือ DB Helvethaica X"><datalist id="sdFFamL"><option value="Publico"><option value="DB Helvethaica X"><option value="Source Sans Pro"></datalist>
      <select id="sdFW"><option value="300">300 Light</option><option value="400" selected>400 Regular</option><option value="500">500 Medium</option><option value="600">600 Semibold</option><option value="700">700 Bold</option><option value="900">900 Black</option></select>
      <button type="button" class="btn btn-sm btn-ghost" id="sdFUp">${ico('upload', 13)} อัปโหลดไฟล์ฟอนต์</button></div>
      <p class="small muted">อัปโหลดทีละไฟล์ต่อหนึ่งน้ำหนัก เช่น Publico Headline Bold = 700, DB Helvethaica X 75 Bd = 700, DB Helvethaica X 55 Regular = 400 — ชื่อฟอนต์ต้องตรงกับที่เลือกด้านบน</p>` : ''}`;
}
function sdFontSectionBind(md, draft, can) {
  const box = $('#sdFontBox', md.el); if (!box) return;
  const rerender = () => { box.innerHTML = sdFontSection(draft, can); $$('[data-fontcfg]', box).forEach(s => { s.onchange = () => { draft.fonts = { ...(draft.fonts || {}), [s.dataset.fontcfg]: s.value }; }; }); };
  rerender(); sdFontFiles().then(rerender); if (!can) return;
  md.el.addEventListener('click', async e => {
    const del = e.target.closest('[data-fontdel]');
    if (del) { draft.fontFiles = (draft.fontFiles || []).filter(x => x.id !== del.dataset.fontdel); rerender(); return; }
    if (!e.target.closest('#sdFUp')) return;
    const fam = ($('#sdFFam', md.el).value || '').trim(); if (!fam) { toast('ใส่ชื่อฟอนต์ก่อน เช่น Publico', 'error'); $('#sdFFam', md.el).focus(); return; }
    const file = await pickFile('.ttf,.otf,.woff,.woff2,font/*'); if (!file) return;
    const btn = $('#sdFUp', md.el); btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังอัปโหลด…';
    try { const x = await sdFontUpload(file, fam, $('#sdFW', md.el).value); draft.fontFiles = [...(draft.fontFiles || []), x]; toast(`เพิ่มฟอนต์ ${fam} แล้ว — กดบันทึก CI เพื่อใช้กับทุกคน`); rerender(); }
    catch (er) { toast(er.message, 'error'); btn.disabled = false; btn.innerHTML = `${ico('upload', 13)} อัปโหลดไฟล์ฟอนต์`; }
  });
}
