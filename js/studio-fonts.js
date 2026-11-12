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
/* ---------- several files at once: family and weight are read from the font file itself ---------- */
function sdFontInfo(buf, fileName) {   // → { family, weight, italic, label } from the sfnt name + OS/2 tables (TTF / OTF); file name for WOFF
  let fam = '', sub = '', full = '', wc = 0, italic = false;
  try {
    const dv = new DataView(buf), tag = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
    if (tag === 'OTTO' || tag === 'true' || dv.getUint32(0) === 0x00010000) {
      const n = dv.getUint16(4), T = {};
      for (let i = 0; i < n; i++) { const o = 12 + i * 16; T[String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3))] = [dv.getUint32(o + 8), dv.getUint32(o + 12)]; }
      if (T['OS/2']) wc = dv.getUint16(T['OS/2'][0] + 4);   // the italic flag in OS/2 is wrong in some files, so italics are told from the style name
      if (T.name) {
        const b = T.name[0], cnt = dv.getUint16(b + 2), so = b + dv.getUint16(b + 4), got = {};
        for (let i = 0; i < cnt; i++) {
          const r = b + 6 + i * 12, pid = dv.getUint16(r), lang = dv.getUint16(r + 4), id = dv.getUint16(r + 6), len = dv.getUint16(r + 8), off = so + dv.getUint16(r + 10);
          if (![1, 2, 4, 16, 17].includes(id) || off + len > buf.byteLength) continue;
          let str = ''; if (pid === 1) for (let j = 0; j < len; j++) str += String.fromCharCode(dv.getUint8(off + j)); else for (let j = 0; j + 1 < len; j += 2) str += String.fromCharCode(dv.getUint16(off + j));
          const rank = pid === 3 && lang === 0x409 ? 3 : pid === 3 ? 2 : 1;   // prefer Windows / English
          if (!got[id] || rank > got[id][0]) got[id] = [rank, str.trim()];
        }
        const g = id => (got[id] || [0, ''])[1]; fam = g(16) || g(1); sub = g(17) || g(2); full = g(4);
      }
    }
  } catch (e) { }
  const text = `${full} ${fam} ${sub} ${fam || full ? '' : fileName}`.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_.]/g, ' ');
  const has = re => re.test(text);
  let family = /publico/i.test(text) ? 'Publico' : /helvethaica/i.test(text) ? 'DB Helvethaica X' : /source\s*sans/i.test(text) ? 'Source Sans Pro' : (fam || fileName.replace(/\.\w+$/, '')).replace(/\s+(Thin|Light|Regular|Roman|Medium|Semibold|Bold|Black|Italic)\b.*$/i, '').trim();
  const weight = has(/\b(ultra\s?li(ght)?|ul\s?li|extra\s?light|thin|hairline)\b/i) ? 200 : has(/\b(semi\s?bold|demi(\s?bold)?|sb)\b/i) ? 600 : has(/\b(extra\s?bold|ultra\s?bold|xbd)\b/i) ? 800 : has(/\b(black|blk|heavy|ultra)\b/i) ? 900
    : has(/\b(bold|bd)\b/i) ? 700 : has(/\b(medium|med)\b/i) ? 500 : has(/\b(light|li)\b/i) ? 300 : has(/\b(regular|roman|book|normal)\b/i) ? 400 : (wc >= 100 && wc <= 900 ? Math.round(wc / 100) * 100 : 400);
  if (/\b(italic|it|oblique)\b/i.test(text)) italic = true;
  const width = /\b(cond(ensed)?|ext(ended)?|narrow|compressed|expanded)\b/i.test(text);
  return { family, weight, italic, width, label: full || `${fam} ${sub}`.trim() || fileName };
}
const sdPickFiles = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = true; i.onchange = () => res([...i.files]); i.click(); });
async function sdFontUploadMany(files, draft, onStep) {   // → { added: [...], skipped: [[name, reason]] } — replaces an existing file of the same family + weight
  const added = [], skipped = [], seen = new Set();
  for (const [n, file] of files.entries()) {
    onStep && onStep(n + 1, files.length);
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) { skipped.push([file.name, 'ไม่ใช่ไฟล์ฟอนต์']); continue; }
    let info; try { info = sdFontInfo(await file.arrayBuffer(), file.name); } catch (e) { skipped.push([file.name, 'อ่านไฟล์ไม่ได้']); continue; }
    if (info.italic) { skipped.push([file.name, 'ตัวเอียง — CI ไม่ให้ใช้']); continue; }
    if (info.width) { skipped.push([file.name, 'แบบ Condensed / Extended — CI ไม่ได้ระบุ']); continue; }
    const key = info.family + '|' + info.weight; if (seen.has(key)) { skipped.push([file.name, `ซ้ำกับไฟล์ก่อนหน้า (${info.family} ${info.weight})`]); continue; } seen.add(key);
    try { const x = await sdFontUpload(file, info.family, info.weight); draft.fontFiles = [...(draft.fontFiles || []).filter(v => !(v.family === x.family && +v.weight === +x.weight)), x]; added.push(x); }
    catch (e) { skipped.push([file.name, e.message]); }
  }
  return { added, skipped };
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
      <div class="sd-fontmany"><button type="button" class="btn btn-sm btn-primary" id="sdFMany">${ico('upload', 13)} เลือกหลายไฟล์พร้อมกัน</button><span class="small muted">ระบบอ่านชื่อฟอนต์และน้ำหนักจากไฟล์ให้เอง (.ttf / .otf) · สูงสุด 12 ไฟล์ต่อครั้ง · ข้ามตัวเอียงและแบบ Condensed / Extended</span></div>
      <div id="sdFManyOut" class="sd-fontmany-out" role="status" aria-live="polite">${SD_FONT_MSG}</div>
      <p class="small muted">อัปโหลดทีละไฟล์ต่อหนึ่งน้ำหนัก เช่น Publico Headline Bold = 700, DB Helvethaica X 75 Bd = 700, DB Helvethaica X 55 Regular = 400 — ชื่อฟอนต์ต้องตรงกับที่เลือกด้านบน</p>` : ''}`;
}
let SD_FONT_MSG = '';   // result of the last multi-file upload (shown in the dialog only, never saved)
function sdFontSectionBind(md, draft, can) {
  SD_FONT_MSG = '';
  const box = $('#sdFontBox', md.el); if (!box) return;
  const rerender = () => { box.innerHTML = sdFontSection(draft, can); $$('[data-fontcfg]', box).forEach(s => { s.onchange = () => { draft.fonts = { ...(draft.fonts || {}), [s.dataset.fontcfg]: s.value }; }; }); };
  rerender(); sdFontFiles().then(rerender); if (!can) return;
  md.el.addEventListener('click', async e => {
    const del = e.target.closest('[data-fontdel]');
    if (del) { draft.fontFiles = (draft.fontFiles || []).filter(x => x.id !== del.dataset.fontdel); rerender(); return; }
    if (e.target.closest('#sdFMany')) {
      const files = await sdPickFiles('.ttf,.otf,.woff,.woff2,font/*'); if (!files.length) return;
      if (files.length > 12) { toast('เลือกได้สูงสุด 12 ไฟล์ต่อครั้ง — คัดเฉพาะน้ำหนักที่ใช้จริง', 'error'); return; }
      const b = $('#sdFMany', md.el); b.disabled = true;
      const r = await sdFontUploadMany(files, draft, (i, n) => { b.innerHTML = `<span class="spin"></span> กำลังอัปโหลด ${i}/${n}…`; });
      SD_FONT_MSG = `${r.added.length ? `<p class="sd-ok small">เพิ่มแล้ว ${r.added.length} ไฟล์: ${r.added.map(x => `${esc(x.family)} ${x.weight}`).join(' · ')} — ตรวจชื่อและน้ำหนักด้านบน แล้วกด “บันทึก CI”</p>` : ''}${r.skipped.length ? `<p class="pb-warn small">ข้าม ${r.skipped.length} ไฟล์: ${r.skipped.map(([n, why]) => `${esc(n)} (${esc(why)})`).join(' · ')}</p>` : ''}`;
      toast(r.added.length ? `เพิ่มฟอนต์ ${r.added.length} ไฟล์แล้ว — กดบันทึก CI เพื่อใช้กับทุกคน` : 'ไม่มีไฟล์ที่เพิ่มได้', r.added.length ? 'ok' : 'error'); rerender(); return;
    }
    if (!e.target.closest('#sdFUp')) return;
    const fam = ($('#sdFFam', md.el).value || '').trim(); if (!fam) { toast('ใส่ชื่อฟอนต์ก่อน เช่น Publico', 'error'); $('#sdFFam', md.el).focus(); return; }
    const file = await pickFile('.ttf,.otf,.woff,.woff2,font/*'); if (!file) return;
    const btn = $('#sdFUp', md.el); btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังอัปโหลด…';
    try { const x = await sdFontUpload(file, fam, $('#sdFW', md.el).value); draft.fontFiles = [...(draft.fontFiles || []), x]; toast(`เพิ่มฟอนต์ ${fam} แล้ว — กดบันทึก CI เพื่อใช้กับทุกคน`); rerender(); }
    catch (er) { toast(er.message, 'error'); btn.disabled = false; btn.innerHTML = `${ico('upload', 13)} อัปโหลดไฟล์ฟอนต์`; }
  });
}
