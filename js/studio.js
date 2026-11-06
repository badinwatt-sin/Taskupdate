'use strict';
/* ============================================================
   Poster Studio — for content creators who are not designers
   1) paste the message → AI reads it (what kind of communication, key
      message, who, what to do) → brief, facts kept as written
   2) pick one of several designs built from that brief
   3) edit freely: click any element to move, resize, restyle or delete;
      add characters, objects, shapes, text, QR, photo
   4) export PNG / JPG (review checkbox every time)
   ============================================================ */
const sdBlankDoc = () => ({ id: uid('sd'), format: 'portrait', text: '', brief: null, design: '', bg: { c1: '#FFFFFF' }, layers: [], edited: false, over: false, fit: 1, warn: [], reviewed: false, updated: 0 });
let SDOC = sdBlankDoc(), SD_SEL = null, SD_UNDO = [], SD_REDO = [], SD_ADD = 'kit', SD_KITG = 'people';
ACT.sdToKit = el => { const L = sdSel(); if (!L) return; sdPush(); const k = el.dataset.id, K = SD_KIT[k]; L.t = 'art'; L.key = k; delete L.panel; delete L.tint; if (K[1] === 'people') { const h = L.h; L.w = h * K[2] / K[3]; } SDOC.edited = true; sdChanged(); sdProps(); };
ACT.sdKitG = el => { SD_KITG = el.dataset.id; sdAddPanel(); };
const SD_SAMPLE = `ขอเชิญตัวแทนทุกท่านร่วมงาน Agency Kick-off 2027
"ก้าวไปด้วยกัน สู่ปีแห่งความสำเร็จ"
วันศุกร์ที่ 15 มกราคม 2570 เวลา 09.00–16.00 น.
ณ ห้องแกรนด์บอลรูม โรงแรมเซ็นทารา แกรนด์ ลาดพร้าว
- อัปเดตแผนธุรกิจและแคมเปญปี 2027
- เปิดตัวผลิตภัณฑ์ประกันสุขภาพใหม่
- มอบรางวัลตัวแทนดีเด่นประจำปี
ลงทะเบียนภายใน 8 ม.ค. 2570 ผ่าน QR Code
*ที่นั่งมีจำนวนจำกัด สอบถามเพิ่มเติม ทีม Agency Experience`;
const sdKey = k => `aex-studio-${k}-` + AEX.meId;
const sdLS = { get(k, d) { try { return JSON.parse(localStorage.getItem(sdKey(k)) || 'null') ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(sdKey(k), JSON.stringify(v)); return true; } catch (e) { return false; } } };
const sdFmt = () => PB_FORMATS[SDOC.format];
const sdLayer = id => SDOC.layers.find(L => L.id === id);
const sdSel = () => SD_SEL && sdLayer(SD_SEL);

/* ---------- history ---------- */
const sdSnap = () => JSON.stringify({ layers: SDOC.layers, bg: SDOC.bg, design: SDOC.design, brief: SDOC.brief, format: SDOC.format, edited: SDOC.edited });
function sdPush() { SD_UNDO.push(sdSnap()); if (SD_UNDO.length > 80) SD_UNDO.shift(); SD_REDO = []; }
function sdRestore(s) { Object.assign(SDOC, JSON.parse(s)); if (SD_SEL && !sdLayer(SD_SEL)) SD_SEL = null; sdChanged(true); sdFull(); }
ACT.sdUndo = () => { if (!SD_UNDO.length) return; SD_REDO.push(sdSnap()); sdRestore(SD_UNDO.pop()); };
ACT.sdRedo = () => { if (!SD_REDO.length) return; SD_UNDO.push(sdSnap()); sdRestore(SD_REDO.pop()); };
let sdSaveT = 0;
function sdChanged(quiet) {
  SDOC.updated = Date.now(); SDOC.reviewed = false; const c = $('#sdReviewed'); if (c) c.checked = false; sdExportState();
  clearTimeout(sdSaveT); sdSaveT = setTimeout(() => sdLS.set('cur', SDOC), 600);
  if (!quiet) sdPaint();
}
function sdExportState() { $$('[data-sd-exp]').forEach(b => { b.disabled = !SDOC.reviewed || !SDOC.layers.length; }); }

/* ---------- design ↔ brief ---------- */
function sdApply(design, keepUser = true) {
  const b = SDOC.brief; if (!b) return;
  const r = sdBuild(b, design, SDOC.format), user = keepUser ? SDOC.layers.filter(L => !L.role || L.role === 'user') : [];
  SDOC.layers = [...r.layers, ...user]; SDOC.bg = r.bg; SDOC.design = design; SDOC.over = r.over; SDOC.fit = r.scale; SDOC.edited = false;
  if (SD_SEL && !sdLayer(SD_SEL)) SD_SEL = null;
}
const SD_ROLE_FIELD = { kicker: 'kicker', sub: 'sub', note: 'note', cta: 'cta', date: 'date', time: 'time', venue: 'venue' };
function sdSyncRoles() {   // after brief edits on a hand-tuned layout: update texts in place, keep positions
  const b = SDOC.brief;
  SDOC.layers.forEach(L => {
    if (L.role === 'headline') { L.text = sdHeadText(b); L.emph = L.emph === -1 ? -1 : b.emph; }
    else if (SD_ROLE_FIELD[L.role]) { L.text = b[SD_ROLE_FIELD[L.role]]; }
    else if (/^p\d$/.test(L.role || '')) { const p = b.points[+L.role.slice(1)]; if (p) { L.title = p.title; L.body = p.body; } }
    else if (/^v\d$/.test(L.role || '')) { const p = b.points[+L.role.slice(1)]; if (p) { L.key = p.visual; L.t = sdIsKit(L.key) ? 'art' : 'char'; } }
    else if (L.role === 'hero') { L.key = b.hero; L.t = sdIsKit(L.key) ? 'art' : 'char'; }
    else if (L.role === 'dateblock') Object.assign(L, sdDateParts(b.date) || {});
  });
}
function sdLayerToBrief(L) {   // text edited on a layer → keep the brief in step (so other designs show the same words)
  const b = SDOC.brief; if (!b || !L.role) return;
  if (L.role === 'headline') { b.headline = String(L.text || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3); }
  else if (SD_ROLE_FIELD[L.role]) b[SD_ROLE_FIELD[L.role]] = L.text || '';
  else if (/^p\d$/.test(L.role)) { const p = b.points[+L.role.slice(1)]; if (p) { p.title = L.title || ''; p.body = L.body || ''; } }
}
let sdBriefT = 0;
function sdBriefChanged(structural) {
  clearTimeout(sdBriefT);
  sdBriefT = setTimeout(() => {
    if (!SDOC.edited || structural) sdApply(SDOC.design || SDOC.brief.designs[0]); else sdSyncRoles();
    SDOC.warn = sdFactWarn(SDOC.text, SDOC.brief); sdChanged(); sdGallery(); sdWarnBox(); sdProps();
  }, 280);
}

/* ---------- AI reading ---------- */
ACT.sdRead = async el => {
  const text = SDOC.text.trim(); if (!text) { toast('วางข้อความที่ต้องการสื่อสารก่อน', 'error'); $('#sdText')?.focus(); return; }
  const local = el && el.dataset.id === 'local', btn = $('#sdReadBtn');
  if (btn && !local) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> AI กำลังอ่านและตีความ…'; }
  let brief = null, msg = '';
  try {
    if (local) throw Object.assign(new Error(''), { local: true });
    if (Store.mode !== 'server') throw Object.assign(new Error('โหมดสาธิต (ไม่มีเซิร์ฟเวอร์) — ใช้การจัดอัตโนมัติแทน'), { local: true });
    const r = await fetch('api/ai-brief', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ text, format: SDOC.format }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 501) throw Object.assign(new Error('ยังไม่ได้เปิดใช้ AI จึงจัดให้อัตโนมัติแทน — Admin เพิ่ม ANTHROPIC_API_KEY ใน Vercel เพื่อให้ AI ตีความเนื้อหา'), { local: true });
    if (!r.ok) throw new Error(j.error || 'AI ขัดข้อง');
    brief = sdNormBrief(j.result); brief.by = 'ai';
  } catch (e) {
    if (!e.local) { if (btn) { btn.disabled = false; btn.innerHTML = `${ico('sparkles', 15)} ให้ AI อ่านและออกแบบ`; } toast(e.message, 'error'); return; }
    brief = sdNormBrief(sdLocalBrief(text)); brief.by = 'auto'; msg = e.message;
  }
  sdPush(); SDOC.brief = brief; SDOC.warn = sdFactWarn(text, brief); SD_SEL = null;
  sdApply(brief.designs[0], false); sdChanged(true); sdFull();
  toast(msg || (brief.by === 'ai' ? 'AI ตีความแล้ว — เลือกดีไซน์และปรับได้ตามต้องการ' : 'จัดให้อัตโนมัติแล้ว'), msg ? 'error' : 'ok');
  if (matchMedia('(max-width: 1100px)').matches) $('#sdStage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
ACT.sdSample = () => { SDOC.text = SD_SAMPLE; const t = $('#sdText'); if (t) t.value = SD_SAMPLE; };
ACT.sdDesign = el => { if (!SDOC.brief) return; const d = el.dataset.id; if (SDOC.edited && !confirm('เปลี่ยนดีไซน์จะจัดตำแหน่งใหม่ทั้งหมด (ข้อความที่แก้ไว้ยังอยู่ · ชิ้นที่เพิ่มเองยังอยู่) ต่อไหม?')) return; sdPush(); sdApply(d); sdChanged(true); sdFull(); };
ACT.sdRelayout = () => { if (!SDOC.brief) return; sdPush(); sdApply(SDOC.design); sdChanged(true); sdFull(); toast('จัดวางใหม่ให้พอดีแล้ว'); };
ACT.sdFmt = el => {
  const f = el.dataset.id; if (!PB_FORMATS[f] || f === SDOC.format) return; sdPush();
  const [ow, oh] = [sdFmt()[2], sdFmt()[3]]; SDOC.format = f; const [nw, nh] = [sdFmt()[2], sdFmt()[3]];
  const user = SDOC.layers.filter(L => !L.role || L.role === 'user').map(L => ({ ...L, x: L.x * nw / ow, y: L.y * nh / oh }));
  if (SDOC.brief) { sdApply(SDOC.design || SDOC.brief.designs[0], false); SDOC.layers.push(...user); } else SDOC.layers = user;
  sdChanged(true); sdFull();
};
ACT.sdKind = el => { if (!SDOC.brief) return; sdPush(); const b = SDOC.brief; b.kind = el.dataset.id; if (!b.kicker || Object.values(SD_KINDS).some(k => k[1] === b.kicker)) b.kicker = SD_KINDS[b.kind][1]; b.designs = sdRank(b); sdBriefChanged(true); sdLeft(); };
ACT.sdAccent = el => { if (!SDOC.brief) return; sdPush(); SDOC.brief.accent = el.dataset.id; sdBriefChanged(true); sdLeft(); };
ACT.sdPtAdd = () => { const b = SDOC.brief; if (!b || b.points.length >= 4) return; sdPush(); b.points.push({ title: 'หัวข้อใหม่', body: '', visual: 'check' }); sdBriefChanged(true); sdLeft(); };
ACT.sdPtDel = el => { const b = SDOC.brief; if (!b) return; sdPush(); b.points.splice(+el.dataset.id, 1); sdBriefChanged(true); sdLeft(); };
ACT.sdPtMove = el => { const b = SDOC.brief, [i, d] = el.dataset.id.split(':').map(Number), j = i + d; if (!b || j < 0 || j >= b.points.length) return; sdPush(); [b.points[i], b.points[j]] = [b.points[j], b.points[i]]; sdBriefChanged(true); sdLeft(); };

/* ---------- elements ---------- */
function sdAddLayer(L) {
  const fm = sdFmt(), W = fm[2], H = fm[3], u = Math.min(W, H) / 1080; sdPush();
  L = sdM({ id: sdId(), role: 'user', x: W / 2 - (L.w || 300 * u) / 2, y: H / 2 - (L.h || 300 * u) / 2, ...L });
  SDOC.layers.push(L); SD_SEL = L.id; SDOC.edited = true; sdChanged(); sdProps(); return L;
}
ACT.sdAddTab = el => { SD_ADD = el.dataset.id; sdAddPanel(); };
ACT.sdAdd = async el => {
  const [t, key] = el.dataset.id.split(':'), u = Math.min(sdFmt()[2], sdFmt()[3]) / 1080, C = pbBrand().colors, acc = sdPastel(SDOC.brief?.accent || 'blue');
  if (t === 'art') { const K = SD_KIT[key], h = (K[1] === 'people' ? 620 : 300) * u; sdAddLayer({ t: 'art', key, h, w: h * K[2] / K[3] }); }
  else if (t === 'char') sdAddLayer({ t: 'char', key, tint: acc, w: 380 * u, h: 400 * u });
  else if (t === 'scene') sdAddLayer({ t: 'char', key, tint: acc, panel: true, r: .08, w: 420 * u, h: 380 * u });
  else if (t === 'prop') sdAddLayer({ t: 'prop', key, w: 150 * u, h: 150 * u });
  else if (t === 'shape') sdAddLayer({ t: 'shape', kind: key, fill: key === 'sparkle' ? '#F6C873' : key === 'line' ? C.red : sdSoft(SDOC.brief?.accent || 'blue'), w: key === 'line' ? 200 * u : 260 * u, h: key === 'line' ? 12 * u : 260 * u, r: .12 });
  else if (t === 'text') sdAddLayer(key === 'head' ? { t: 'text', text: 'หัวข้อใหม่', size: 72 * u, weight: 700, font: 'head', color: C.primary, w: 700 * u, lh: 1.2, align: 'left', barFill: C.primary, barInk: '#FFFFFF', emph: -1 } : key === 'pill' ? { t: 'text', text: 'ป้ายข้อความ', size: 30 * u, weight: 600, font: 'body', color: '#FFFFFF', pill: C.primary, auto: true, lh: 1.22 } : { t: 'text', text: 'พิมพ์ข้อความที่นี่', size: 34 * u, weight: 400, font: 'body', color: '#2A2A4A', w: 600 * u, lh: 1.38, align: 'left' });
  else if (t === 'card') sdAddLayer({ t: 'card', title: 'หัวข้อ', body: 'รายละเอียดสั้น ๆ', size: 30 * u, fill: sdSoft(SDOC.brief?.accent || 'blue'), w: 560 * u, r: .1, icon: key === 'icon' ? 'check' : '', num: key === 'num' ? '1' : '' });
  else if (t === 'chip') sdAddLayer({ t: 'chip', text: key === 'cta' ? 'ลงทะเบียนเลย' : 'ข้อความ', icon: key === 'cta' ? '' : 'cal', size: 30 * u, weight: key === 'cta' ? 700 : 600, fill: key === 'cta' ? C.primary : '#FFFFFF', ink: key === 'cta' ? '#FFFFFF' : C.primary });
  else if (t === 'logo') sdAddLayer({ t: 'logo', h: 84 * u, w: 180 * u, variant: 'color' });
  else if (t === 'qr') sdAddLayer({ t: 'qr', url: '', w: 220 * u, h: 220 * u });
  else if (t === 'date') sdAddLayer({ t: 'date', ...(sdDateParts(SDOC.brief?.date) || { day: '15', mon: 'ม.ค. 2570', top: 'SAVE THE DATE' }), fill: C.red, ink: C.primary, w: 280 * u, h: 300 * u });
  else if (t === 'img') { const f = await pickFile(); if (!f) return; try { const src = await pbLoadImage(f, 1600); sdAddLayer({ t: 'img', src, w: 520 * u, h: 400 * u, r: .06 }); } catch (e) { toast(e.message, 'error'); } }
};
ACT.sdDel = () => { const L = sdSel(); if (!L) return; sdPush(); SDOC.layers = SDOC.layers.filter(x => x !== L); SD_SEL = null; SDOC.edited = true; sdChanged(); sdProps(); };
ACT.sdDup = () => { const L = sdSel(); if (!L) return; sdPush(); const u = Math.min(sdFmt()[2], sdFmt()[3]) / 1080, n = { ...JSON.parse(JSON.stringify(L)), id: sdId(), role: 'user', x: L.x + 30 * u, y: L.y + 30 * u }; SDOC.layers.splice(SDOC.layers.indexOf(L) + 1, 0, n); SD_SEL = n.id; SDOC.edited = true; sdChanged(); sdProps(); };
ACT.sdOrder = el => { const L = sdSel(); if (!L) return; sdPush(); const a = SDOC.layers, i = a.indexOf(L), d = el.dataset.id; a.splice(i, 1); if (d === 'top') a.push(L); else if (d === 'bottom') a.unshift(L); else a.splice(Math.max(0, Math.min(a.length, i + (d === 'up' ? 1 : -1))), 0, L); SDOC.edited = true; sdChanged(); };
ACT.sdAlign = el => { const L = sdSel(); if (!L) return; sdPush(); const W = sdFmt()[2], M = 64 * Math.min(W, sdFmt()[3]) / 1080, d = el.dataset.id; L.x = d === 'left' ? M : d === 'right' ? W - M - L.w : (W - L.w) / 2; SDOC.edited = true; sdChanged(); };
ACT.sdSet = el => { const L = sdSel(); if (!L) return; sdPush(); const [k, v] = el.dataset.id.split('='); L[k] = v === 'true' ? true : v === 'false' ? false : v === '' ? '' : isNaN(+v) || /^#/.test(v) ? v : +v; sdM(L); SDOC.edited = true; sdChanged(); sdProps(); };
ACT.sdBg = el => { sdPush(); const [c1, c2] = el.dataset.id.split(','); SDOC.bg = { c1, c2: c2 || c1 }; sdChanged(); sdProps(); };
ACT.sdImgSwap = async () => { const L = sdSel(); if (!L) return; const f = await pickFile(); if (!f) return; try { sdPush(); L.src = await pbLoadImage(f, 1600); sdChanged(); } catch (e) { toast(e.message, 'error'); } };

/* ---------- canvas, selection & direct manipulation ---------- */
let sdRaf = 0;
function sdPaint() { cancelAnimationFrame(sdRaf); sdRaf = requestAnimationFrame(sdPaintNow); }
function sdPaintNow() {
  const cv = $('#sdCv'); if (!cv) return;
  sdRender(cv, SDOC); sdOverlay();
  const w = $('#sdFit'); if (w) { w.hidden = !SDOC.over || SDOC.edited; }
  const e = $('#sdEmpty'); if (e) e.hidden = !!SDOC.layers.length;
}
const sdScale = () => { const w = $('#sdWrap'); return w ? w.clientWidth / sdFmt()[2] : 1; };
const SD_UNIFORM = { text: 1, card: 1, chip: 1, logo: 1, qr: 1, prop: 1, date: 1, art: 1 };
function sdOverlay() {
  const ov = $('#sdOv'); if (!ov) return; const L = sdSel(), s = sdScale();
  if (!L) { ov.innerHTML = ''; return; }
  const hs = ['nw', 'ne', 'sw', 'se', ...(L.t === 'text' && !L.auto || L.t === 'card' || L.t === 'shape' || L.t === 'char' || L.t === 'img' ? ['e', 'w'] : []), ...(L.t === 'shape' || L.t === 'char' || L.t === 'img' ? ['n', 's'] : [])];
  ov.innerHTML = `<div class="sd-box" style="left:${L.x * s}px;top:${L.y * s}px;width:${L.w * s}px;height:${(L.h || 0) * s}px">${hs.map(h => `<i class="sd-h sd-h-${h}" data-h="${h}"></i>`).join('')}<button type="button" class="sd-x" data-act="sdDel" aria-label="ลบชิ้นนี้" title="ลบ (Delete)">${ico('trash', 13)}</button></div>`;
}
function sdHit(px, py) {
  for (let i = SDOC.layers.length - 1; i >= 0; i--) { const L = SDOC.layers[i]; if (L.hide || L.lock) continue; if (px >= L.x && px <= L.x + L.w && py >= L.y && py <= L.y + (L.h || 0)) return L; }
  return null;
}
function sdStageEvents() {
  const ov = $('#sdOv'); if (!ov) return;
  let drag = null;
  ov.addEventListener('pointerdown', e => {
    if (e.target.closest('.sd-x')) return;
    const r = ov.getBoundingClientRect(), s = sdScale(), px = (e.clientX - r.left) / s, py = (e.clientY - r.top) / s, h = e.target.dataset.h;
    let L = h ? sdSel() : sdHit(px, py);
    if (!L) { if (SD_SEL) { SD_SEL = null; sdOverlay(); sdProps(); } return; }
    if (L.id !== SD_SEL) { SD_SEL = L.id; sdOverlay(); sdProps(); }
    drag = { L, h, px, py, o: { x: L.x, y: L.y, w: L.w, h: L.h, size: L.size }, snap: sdSnap(), moved: false };
    ov.setPointerCapture(e.pointerId); e.preventDefault();
  });
  ov.addEventListener('pointermove', e => {
    if (!drag) { const r = ov.getBoundingClientRect(), s = sdScale(); ov.style.cursor = sdHit((e.clientX - r.left) / s, (e.clientY - r.top) / s) ? 'move' : 'default'; return; }
    const r = ov.getBoundingClientRect(), s = sdScale(), dx = (e.clientX - r.left) / s - drag.px, dy = (e.clientY - r.top) / s - drag.py, { L, o, h } = drag;
    if (!drag.moved && Math.hypot(dx, dy) < 3 / s) return; drag.moved = true;
    const W = sdFmt()[2], H = sdFmt()[3], snapT = 10 / s;
    if (!h) {
      let nx = o.x + dx, ny = o.y + dy; const M = 64 * Math.min(W, H) / 1080;
      const cx = nx + L.w / 2; if (Math.abs(cx - W / 2) < snapT) nx = W / 2 - L.w / 2; else if (Math.abs(nx - M) < snapT) nx = M; else if (Math.abs(nx + L.w - (W - M)) < snapT) nx = W - M - L.w;
      L.x = nx; L.y = ny;
    } else {
      const min = 24, uni = SD_UNIFORM[L.t] && h.length === 2;
      if (uni) {
        const sx = h.includes('e') ? 1 : -1, nw = Math.max(min, o.w + dx * sx), k = nw / o.w;
        if (L.t === 'text' || L.t === 'card' || L.t === 'chip') { L.size = Math.max(8, o.size * k); if (!L.auto && L.t !== 'chip') L.w = nw; }
        else if (L.t === 'logo') L.h = Math.max(min, o.h * k);
        else { L.w = nw; L.h = o.h * k; }
        sdM(L); if (h.includes('w')) L.x = o.x + o.w - L.w; if (h.includes('n')) L.y = o.y + o.h - L.h;
      } else {
        if (h.includes('e')) L.w = Math.max(min, o.w + dx);
        if (h.includes('w')) { L.w = Math.max(min, o.w - dx); L.x = o.x + o.w - L.w; }
        if (h.includes('s')) L.h = Math.max(min, o.h + dy);
        if (h.includes('n')) { L.h = Math.max(min, o.h - dy); L.y = o.y + o.h - L.h; }
        if (L.t === 'card' || L.t === 'text') sdM(L);
      }
    }
    sdPaint();
  });
  const end = () => { if (drag && drag.moved) { SD_UNDO.push(drag.snap); SD_REDO = []; SDOC.edited = true; sdChanged(true); sdPaint(); sdProps(); } drag = null; };
  ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
  ov.addEventListener('dblclick', () => { const f = $('#sdProps [data-lp="text"], #sdProps [data-lp="title"]'); if (f) { f.focus(); f.select?.(); } });
}
function sdKeys(e) {
  if (route().name !== 'poster' || !$('#sdRoot')) return;
  const tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? ACT.sdRedo() : ACT.sdUndo(); return; }
  if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); ACT.sdRedo(); return; }
  if (typing || $('.modal-back')) return;
  const L = sdSel(); if (!L) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); ACT.sdDel(); }
  else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); ACT.sdDup(); }
  else if (e.key === 'Escape') { SD_SEL = null; sdOverlay(); sdProps(); }
  else if (e.key.startsWith('Arrow')) { e.preventDefault(); if (!e.repeat) sdPush(); const d = e.shiftKey ? 10 : 2; if (e.key === 'ArrowLeft') L.x -= d; if (e.key === 'ArrowRight') L.x += d; if (e.key === 'ArrowUp') L.y -= d; if (e.key === 'ArrowDown') L.y += d; SDOC.edited = true; sdChanged(); }
}
document.addEventListener('keydown', sdKeys);
window.addEventListener('resize', () => { if ($('#sdRoot')) sdOverlay(); });

/* ---------- panels ---------- */
const sdSw = (cur, act, list) => `<span class="sd-sw">${list.map(([v, label]) => `<button type="button" class="${String(cur).toLowerCase() === String(v).toLowerCase() ? 'on' : ''}" style="background:${v}" data-act="${act}" data-id="${act === 'sdSet' ? '' : ''}${v}" title="${esc(label)}" aria-label="${esc(label)}"></button>`).join('')}</span>`;
function sdColors() { const C = pbBrand().colors; return [[C.primary, 'AXA Blue'], [C.navy, 'Blue Tint 3'], [C.sky, 'Blue Tint 2'], [C.paper, 'Blue Tint 1'], ['#FFFFFF', 'White'], [C.red, 'AXA Red'], [C.pink, 'Red Tint 1'], [C.ink || '#0E0E0E', 'Black'], ['#2A2A4A', 'เทาเข้ม'], ...SD_ACCENTS.map(k => [sdPastel(k), PA_COLS[k][0]]), ...SD_ACCENTS.map(k => [sdSoft(k), PA_COLS[k][0] + ' อ่อน'])]; }
const sdColorRow = (key, cur) => `<div class="sd-colors">${sdColors().map(([v, l]) => `<button type="button" class="${String(cur || '').toLowerCase() === v.toLowerCase() ? 'on' : ''}" style="background:${v}" data-act="sdSet" data-id="${key}=${v}" title="${esc(l)}" aria-label="${esc(l)}"></button>`).join('')}</div>`;
const sdRange = (key, label, v, min, max, step = 1) => `<label class="sd-range"><span>${label}</span><input type="range" data-lp="${key}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${Math.round(v * 100) / 100}</output></label>`;
const SD_TNAME = { art: 'ภาพชุด Kit', text: 'ข้อความ', card: 'การ์ด', chip: 'ป้าย / ปุ่ม', char: 'ตัวละคร', prop: 'ไอคอน / สิ่งของ', shape: 'รูปทรง', logo: 'โลโก้', qr: 'QR Code', img: 'รูปภาพ', date: 'บล็อกวันที่' };
function sdProps() {
  const el = $('#sdProps'); if (!el) return; const L = sdSel(), u = Math.min(sdFmt()[2], sdFmt()[3]) / 1080;
  if (!L) {
    const C = pbBrand().colors;
    el.innerHTML = `<h3>${ico('edit', 16)} ปรับแต่ง</h3><p class="muted small">คลิกชิ้นใดก็ได้บนภาพเพื่อ <b>ย้าย</b> (ลาก) <b>ย่อ/ขยาย</b> (ลากจุดมุม) หรือ <b>ลบ</b> · ดับเบิลคลิกเพื่อแก้ข้อความ · ปุ่มลูกศรขยับละเอียด · Ctrl+Z ย้อนกลับ</p>
      <div class="sd-sub">พื้นหลัง</div><div class="sd-colors">${[[ '#FFFFFF', '#FFFFFF', 'ขาว'], ['#FFFFFF', C.paper, 'ขาว → ฟ้าอ่อน'], [C.paper, '#FFFFFF', 'ฟ้าอ่อน'], [C.pink, '#FFFFFF', 'ชมพูอ่อน'], ['#FFF6DD', '#FFFFFF', 'ครีม'], [C.primary, C.primary, 'AXA Blue'], [C.primary, C.navy, 'AXA Blue → Tint 3']].map(([a, b, l]) => `<button type="button" class="${SDOC.bg.c1 === a && (SDOC.bg.c2 || a) === b ? 'on' : ''}" style="background:linear-gradient(${a},${b})" data-act="sdBg" data-id="${a},${b}" title="${l}" aria-label="${l}"></button>`).join('')}</div>`;
    return;
  }
  const common = `<div class="sd-acts">
      <button type="button" class="btn btn-sm btn-ghost" data-act="sdOrder" data-id="up" title="ขึ้นข้างหน้า">${ico('up', 14)} หน้า</button><button type="button" class="btn btn-sm btn-ghost" data-act="sdOrder" data-id="down" title="ไปข้างหลัง">${ico('down', 14)} หลัง</button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="sdAlign" data-id="center" title="จัดกึ่งกลางแนวนอน">กึ่งกลาง</button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="sdDup">${ico('copy', 14)} ทำซ้ำ</button><button type="button" class="btn btn-sm btn-danger-ghost" data-act="sdDel">${ico('trash', 14)} ลบ</button></div>`;
  let body = '';
  if (L.t === 'text') body = `<label class="field"><span>ข้อความ <small>(Enter = ขึ้นบรรทัดใหม่)</small></span><textarea data-lp="text" rows="${Math.min(6, String(L.text).split('\n').length + 1)}">${esc(L.text)}</textarea></label>
      ${sdRange('size', 'ขนาดตัวอักษร', Math.round(L.size), 10, Math.round(200 * u))}
      <label class="field mt"><span>ฟอนต์</span><select data-lp="ff">${sdFontOpts(L.ff || (L.font === 'body' ? 'body' : 'head'))}</select></label>
      <div class="sd-sub">สีตัวอักษร</div>${sdColorRow('color', L.color)}
      <div class="sd-row"><span class="seg-chips">${[['left', 'ชิดซ้าย'], ['center', 'กลาง'], ['right', 'ชิดขวา']].map(([v, l]) => `<button type="button" class="${L.align === v ? 'on' : ''}" data-act="sdSet" data-id="align=${v}">${l}</button>`).join('')}</span>
      <span class="seg-chips">${[[700, 'หนา'], [500, 'กลาง'], [400, 'ปกติ']].map(([v, l]) => `<button type="button" class="${+L.weight === v ? 'on' : ''}" data-act="sdSet" data-id="weight=${v}">${l}</button>`).join('')}</span></div>
      ${L.pill ? `<div class="sd-sub">สีป้าย</div>${sdColorRow('pill', L.pill)}` : `<div class="sd-sub">แถบเน้นบรรทัด</div><div class="seg-chips">${[[-1, 'ไม่มี'], ...String(L.text).split('\n').slice(0, 4).map((_, i) => [i, 'บรรทัด ' + (i + 1)])].map(([v, l]) => `<button type="button" class="${(L.emph == null ? -1 : L.emph) === v ? 'on' : ''}" data-act="sdSet" data-id="emph=${v}">${l}</button>`).join('')}</div>${L.emph >= 0 ? `<div class="sd-sub">สีแถบ</div>${sdColorRow('barFill', L.barFill || pbBrand().colors.primary)}` : ''}`}`;
  else if (L.t === 'card') body = `<label class="field"><span>หัวข้อ</span><input data-lp="title" value="${esc(L.title)}"></label><label class="field"><span>รายละเอียด <small>(หลายบรรทัด = รายการ)</small></span><textarea data-lp="body" rows="3">${esc(L.body)}</textarea></label>
      ${sdRange('size', 'ขนาดตัวอักษร', Math.round(L.size), 10, Math.round(80 * u))}<div class="sd-sub">สีการ์ด</div>${sdColorRow('fill', L.fill)}<div class="sd-sub">สีหัวข้อ</div>${sdColorRow('titleInk', L.titleInk || '#00008F')}
      <div class="sd-row"><span class="seg-chips"><button type="button" class="${L.shadow ? 'on' : ''}" data-act="sdSet" data-id="shadow=${!L.shadow}">เงา</button><button type="button" class="${L.num ? 'on' : ''}" data-act="sdSet" data-id="num=${L.num ? '' : '1'}">ตัวเลข</button><button type="button" class="${L.icon ? 'on' : ''}" data-act="sdSet" data-id="icon=${L.icon ? '' : 'check'}">ไอคอน</button></span></div>
      ${L.num ? `<label class="field"><span>ตัวเลข</span><input data-lp="num" value="${esc(L.num)}" maxlength="3"></label>` : ''}${L.icon ? `<div class="sd-sub">ไอคอน</div><div class="sd-props-grid sm">${SD_ICONS.map(k => `<button type="button" class="${L.icon === k ? 'on' : ''}" data-act="sdSet" data-id="icon=${k}" title="${SA_PROPS[k][0]}"><canvas data-thumb="prop:${k}" width="48" height="48"></canvas></button>`).join('')}</div>` : ''}`;
  else if (L.t === 'chip') body = `<label class="field"><span>ข้อความ</span><input data-lp="text" value="${esc(L.text)}"></label>${sdRange('size', 'ขนาด', Math.round(L.size), 10, Math.round(80 * u))}<div class="sd-sub">สีพื้น</div>${sdColorRow('fill', L.fill)}<div class="sd-sub">สีตัวอักษร</div>${sdColorRow('ink', L.ink)}
      <div class="sd-sub">ไอคอน</div><div class="sd-props-grid sm"><button type="button" class="${!L.icon ? 'on' : ''}" data-act="sdSet" data-id="icon=">ไม่มี</button>${SD_ICONS.map(k => `<button type="button" class="${L.icon === k ? 'on' : ''}" data-act="sdSet" data-id="icon=${k}" title="${SA_PROPS[k][0]}"><canvas data-thumb="prop:${k}" width="48" height="48"></canvas></button>`).join('')}</div>`;
  else if (L.t === 'char') body = `<p class="small muted">ภาพนี้มาจากชุดเดิมที่เลิกใช้แล้ว — เลือกภาพจากชุด Kit แทนได้</p><div class="sd-kit sm">${Object.entries(SD_KIT).filter(([, v]) => v[1] === 'people').map(([k, v]) => `<button type="button" data-act="sdToKit" data-id="${k}" title="${esc(v[0])}"><img src="${sdKitThumb(k)}" alt="" loading="lazy"></button>`).join('')}</div>`;
  else if (L.t === 'prop') body = `<p class="small muted">ไอคอนนี้มาจากชุดเดิมที่เลิกใช้แล้ว — เลือกภาพจากชุด Kit แทนได้</p><div class="sd-kit sm">${Object.entries(SD_KIT).filter(([, v]) => v[1] !== 'people').map(([k, v]) => `<button type="button" data-act="sdToKit" data-id="${k}" title="${esc(v[0])}"><img src="${sdKitThumb(k)}" alt="" loading="lazy"></button>`).join('')}</div>`;
  else if (L.t === 'shape') body = `<div class="sd-sub">รูปทรง</div><div class="seg-chips">${Object.entries(SA_SHAPES).map(([k, n]) => `<button type="button" class="${L.kind === k ? 'on' : ''}" data-act="sdSet" data-id="kind=${k}">${n}</button>`).join('')}</div><div class="sd-sub">สี</div>${sdColorRow('fill', L.fill)}${sdRange('alpha', 'ความทึบ', L.alpha == null ? 1 : L.alpha, .1, 1, .05)}`;
  else if (L.t === 'logo') body = `<p class="small muted">โลโก้คู่ Krungthai-AXA ตาม CI — ย่อ/ขยายได้ ห้ามบิดสัดส่วน · เลือกแบบให้เข้ากับพื้นหลัง</p><div class="sd-logos">${Object.entries(SD_LOGOS).map(([k, v]) => `<button type="button" class="${(L.variant || (L.dark ? 'bordered' : 'color')) === k ? 'on' : ''} ${k === 'color' || k === 'dark' ? '' : 'dk'}" data-act="sdSet" data-id="variant=${k}"><img src="${v[1]}" alt=""><b>${v[0]}</b><small>${v[2]}</small></button>`).join('')}</div>`;
  else if (L.t === 'qr') body = `<label class="field"><span>ลิงก์สำหรับ QR Code</span><input data-lp="url" value="${esc(L.url)}" placeholder="https://…" inputmode="url"></label>${L.url && !pbQr(L.url) ? '<p class="pb-warn small">ลิงก์ยาวเกินไปสำหรับ QR</p>' : ''}`;
  else if (L.t === 'img') body = `<button type="button" class="btn btn-sm btn-ghost" data-act="sdImgSwap">${ico('image', 14)} เปลี่ยนรูป</button>${sdRange('r', 'มุมโค้ง', L.r || 0, 0, .5, .01)}`;
  else if (L.t === 'date') body = `<label class="field"><span>บรรทัดบน (หัวปฏิทิน)</span><input data-lp="top" value="${esc(L.top)}"></label><label class="field"><span>วันที่ (ตัวใหญ่)</span><input data-lp="day" value="${esc(L.day)}"></label><label class="field"><span>เดือน / ปี</span><input data-lp="mon" value="${esc(L.mon)}"></label><div class="sd-sub">สีหัวปฏิทิน</div>${sdColorRow('fill', L.fill)}<div class="sd-sub">สีตัวเลขวันที่</div>${sdColorRow('ink', L.ink || '#00008F')}`;
  else if (L.t === 'art') body = `<div class="sd-sub">เปลี่ยนภาพ (${esc(SD_KIT_GROUPS[SD_KIT[L.key][1]])})</div><div class="sd-kit sm">${Object.entries(SD_KIT).filter(([, v]) => v[1] === SD_KIT[L.key][1]).map(([k, v]) => `<button type="button" class="${L.key === k ? 'on' : ''}" data-act="sdSet" data-id="key=${k}" title="${esc(v[0])}"><img src="${sdKitThumb(k)}" alt="" loading="lazy"></button>`).join('')}</div><div class="sd-row"><span class="seg-chips"><button type="button" class="${L.flip ? 'on' : ''}" data-act="sdSet" data-id="flip=${!L.flip}">กลับด้าน</button></span></div>`;
  el.innerHTML = `<h3>${ico('edit', 16)} ${SD_TNAME[L.t] || 'ชิ้นส่วน'}${L.role && L.role !== 'user' && L.role !== 'deco' ? ' <small class="muted">· จากข้อความ</small>' : ''}</h3>${body}<div class="sd-sub">${''}</div>${sdRange('op', 'ความโปร่งใส', L.op == null ? 1 : L.op, .1, 1, .05)}${common}`;
  sdThumbs(el);
}
function sdFontOpts(cur) {
  const c = sdFontCfg(), up = (pbBrand().fontFiles || []).map(f => f.family), all = [...new Set([...SD_FONTS.head, ...SD_FONTS.body, ...SD_FONTS.thai].map(x => x[0]).concat(up))];
  return `<option value="head" ${cur === 'head' ? 'selected' : ''}>หัวข้อ CI — ${esc(c.head)} + ${esc(c.thai)}</option><option value="body" ${cur === 'body' ? 'selected' : ''}>ตัวรอง CI — ${esc(c.body)} + ${esc(c.thai)}</option><optgroup label="เลือกฟอนต์เอง">${all.map(f => `<option value="${esc(f)}" ${cur === f ? 'selected' : ''}>${esc(f)}${sdFontOk(f) ? '' : ' (ไม่มีในเครื่องนี้)'}</option>`).join('')}</optgroup>`;
}
const sdFontOk = f => { try { return document.fonts.check(`16px "${f}"`, 'Aก'); } catch (e) { return true; } };
const SD_ICONS = ['check', 'cal', 'clock', 'pin', 'phone', 'doc', 'chat', 'star', 'heart'];   // small functional icons for cards and labels
const SD_THUMB = new Map();
function sdThumbs(root) {
  $$('canvas[data-thumb]', root).forEach(cv => {
    const [t, k] = cv.dataset.thumb.split(':'), key = cv.dataset.thumb + cv.width;
    const g = cv.getContext('2d'); if (SD_THUMB.has(key)) { g.drawImage(SD_THUMB.get(key), 0, 0); return; }
    g.clearRect(0, 0, cv.width, cv.height);
    if (t === 'char') { PA_NOBG = true; try { PA_CHARS[k][2](g, { x: 2, y: 2, w: cv.width - 4, h: cv.height - 4 }, '#8DB8EA'); } finally { PA_NOBG = false; } }
    else if (t === 'scene') { g.save(); g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.clip(); PA_CHARS[k][2](g, { x: 0, y: 0, w: cv.width, h: cv.height }, '#8DB8EA'); g.restore(); }
    else if (t === 'prop') saProp(g, k, cv.width * .12, cv.height * .12, cv.width * .76, cv.height * .76);
    else if (t === 'shape') saShape(g, { kind: k, x: cv.width * .15, y: k === 'line' ? cv.height * .45 : cv.height * .15, w: cv.width * .7, h: k === 'line' ? cv.height * .1 : cv.height * .7, fill: k === 'sparkle' ? '#F6C873' : '#8DB8EA', r: .15 });
    const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; c2.getContext('2d').drawImage(cv, 0, 0); SD_THUMB.set(key, c2);
  });
}
function sdAddPanel() {
  const el = $('#sdAdd'); if (!el) return;
  const tabs = [['kit', 'ภาพชุด Kit'], ['shape', 'รูปทรง'], ['text', 'ข้อความ'], ['more', 'อื่น ๆ']];
  let body = '';
  if (SD_ADD === 'kit') body = `<div class="seg-chips sd-tabs sd-kitg">${Object.entries(SD_KIT_GROUPS).map(([k, l]) => `<button type="button" class="${SD_KITG === k ? 'on' : ''}" data-act="sdKitG" data-id="${k}">${l}</button>`).join('')}</div><div class="sd-kit">${Object.entries(SD_KIT).filter(([, v]) => v[1] === SD_KITG).map(([k, v]) => `<button type="button" data-act="sdAdd" data-id="art:${k}" title="${k} ${esc(v[0])}"><img src="${sdKitThumb(k)}" alt="" loading="lazy"><small>${esc(v[0])}</small></button>`).join('')}</div>`;
  else if (SD_ADD === 'shape') body = `<div class="sd-props-grid">${Object.entries(SA_SHAPES).map(([k, n]) => `<button type="button" data-act="sdAdd" data-id="shape:${k}" title="${n}"><canvas data-thumb="shape:${k}" width="56" height="56"></canvas></button>`).join('')}</div>`;
  else if (SD_ADD === 'text') body = `<div class="sd-addlist"><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="text:head"><b class="sd-a-h">หัวข้อ</b></button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="text:body">ข้อความ</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="text:pill">ป้ายข้อความ</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="card:plain">การ์ด</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="card:num">การ์ดมีตัวเลข</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="card:icon">การ์ดมีไอคอน</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="chip:info">ป้ายข้อมูล + ไอคอน</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="chip:cta">ปุ่มชวนทำ</button></div>`;
  else body = `<div class="sd-addlist"><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="logo:">${ico('lock', 14)} โลโก้ CI</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="qr:">QR Code</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="date:">บล็อกวันที่</button><button type="button" class="btn btn-ghost" data-act="sdAdd" data-id="img:">${ico('image', 14)} รูปถ่าย</button></div>`;
  el.innerHTML = `<h3>${ico('plus', 16)} เพิ่มองค์ประกอบ</h3><div class="seg-chips sd-tabs">${tabs.map(([k, l]) => `<button type="button" class="${SD_ADD === k ? 'on' : ''}" data-act="sdAddTab" data-id="${k}">${l}</button>`).join('')}</div>${body}`;
  sdThumbs(el);
}
function sdWarnBox() {
  const el = $('#sdWarn'); if (!el) return; const b = SDOC.brief; if (!b) { el.innerHTML = ''; return; }
  const w = SDOC.warn || [];
  el.innerHTML = `${w.length ? `<p class="pb-warn">${ico('alert', 15)} ตัวเลขที่ไม่มีในข้อความต้นฉบับ: <b>${w.map(esc).join(', ')}</b> — ตรวจและแก้ก่อนใช้งาน</p>` : `<p class="small muted">${ico('check', 14)} ตัวเลข วันที่ และเวลาตรงกับข้อความต้นฉบับ</p>`}${b.warn ? `<p class="small sd-note">${ico('info', 14)} ${esc(b.warn)}</p>` : ''}`;
}
const sdVisOpts = cur => `${SD_KIT[cur] ? '' : `<option value="${esc(cur)}" selected>— เลือกภาพ —</option>`}${Object.entries(SD_KIT_GROUPS).map(([gk, gl]) => `<optgroup label="${gl}">${Object.entries(SD_KIT).filter(([, v]) => v[1] === gk).map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${k} · ${esc(v[0])}</option>`).join('')}</optgroup>`).join('')}`;
function sdLeft() {
  const el = $('#sdBrief'); if (!el) return; const b = SDOC.brief;
  if (!b) { el.innerHTML = ''; return; }
  const inp = (k, label, ph = '') => `<label class="field"><span>${label}</span><input data-bf="${k}" value="${esc(b[k])}" placeholder="${esc(ph)}"></label>`;
  el.innerHTML = `<section class="card sd-step"><h3><span class="pb-n">2</span>AI เข้าใจว่า… <small class="muted">${b.by === 'ai' ? '· ตีความโดย AI' : '· จัดอัตโนมัติ'}</small></h3>
    ${b.summary ? `<p class="sd-summary">${esc(b.summary)}</p>` : ''}
    <label class="field mt"><span>ประเภทการสื่อสาร <small>(พิมพ์เอง เช่น ประกาศรับสมัคร, เชิญอบรม, แจ้งเปลี่ยนระบบ — ใช้เรียงดีไซน์ที่เหมาะ)</small></span><input data-bf="kindText" value="${esc(b.kindText || '')}" placeholder="เช่น ประกาศเชิญร่วมงานประจำปี"></label>
    ${b.audience ? `<p class="small muted mt">กลุ่มเป้าหมาย: <b>${esc(b.audience)}</b></p>` : ''}
    <div id="sdWarn"></div>
    <details class="sd-edit" open><summary>ข้อความบนโปสเตอร์ <small class="muted">— แก้ตรงนี้ ภาพเปลี่ยนตาม</small></summary>
      <div class="form-grid">
        ${inp('kicker', 'ป้ายหัว', 'เช่น ประกาศ')}
        <label class="field"><span>เน้นบรรทัดที่</span><select data-bf="emph">${[[-1, 'ไม่เน้น'], ...b.headline.map((_, i) => [i, 'บรรทัด ' + (i + 1)])].map(([v, l]) => `<option value="${v}" ${b.emph === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field full"><span>หัวข้อหลัก <small>(1–3 บรรทัด)</small></span><textarea data-bf="headline" rows="3">${esc(b.headline.join('\n'))}</textarea></label>
        <label class="field full"><span>ข้อความรอง</span><textarea data-bf="sub" rows="2">${esc(b.sub)}</textarea></label>
        ${inp('date', 'วันที่')}${inp('time', 'เวลา')}
        <label class="field full"><span>สถานที่ / ช่องทาง</span><input data-bf="venue" value="${esc(b.venue)}"></label>
      </div>
      <div class="sd-sub">ประเด็นสำคัญ <small class="muted">(สูงสุด 4)</small></div>
      <div class="sd-pts">${b.points.map((p, i) => `<div class="sd-pt"><div class="sd-pt-h"><b>${i + 1}</b><span><button type="button" class="icon-btn" data-act="sdPtMove" data-id="${i}:-1" ${i ? '' : 'disabled'} aria-label="เลื่อนขึ้น">${ico('up', 13)}</button><button type="button" class="icon-btn" data-act="sdPtMove" data-id="${i}:1" ${i < b.points.length - 1 ? '' : 'disabled'} aria-label="เลื่อนลง">${ico('down', 13)}</button><button type="button" class="icon-btn" data-act="sdPtDel" data-id="${i}" aria-label="ลบประเด็น">${ico('trash', 13)}</button></span></div>
        <input data-bp="${i}.title" value="${esc(p.title)}" placeholder="หัวข้อ"><textarea data-bp="${i}.body" rows="2" placeholder="รายละเอียด">${esc(p.body)}</textarea>
        <label class="sd-pt-v"><span>ภาพ</span><select data-bp="${i}.visual">${sdVisOpts(p.visual)}</select></label></div>`).join('')}
        ${b.points.length < 4 ? `<button type="button" class="btn btn-sm btn-ghost" data-act="sdPtAdd">${ico('plus', 13)} เพิ่มประเด็น</button>` : ''}</div>
      <div class="form-grid mt">
        <label class="field full"><span>คำชวนให้ทำ (CTA)</span><input data-bf="cta" value="${esc(b.cta)}" placeholder="เช่น ลงทะเบียนภายใน 8 ม.ค."></label>
        <label class="field full"><span>หมายเหตุ / เงื่อนไข <small>(ตัวเล็กด้านล่าง)</small></span><textarea data-bf="note" rows="2">${esc(b.note)}</textarea></label>
        <label class="field"><span>ภาพหลัก</span><select data-bf="hero">${sdVisOpts(b.hero)}</select></label>
        <div class="field"><span>สีพาสเทลประกอบ</span><span class="sd-sw">${SD_ACCENTS.map(k => `<button type="button" class="${b.accent === k ? 'on' : ''}" style="background:${sdPastel(k)}" data-act="sdAccent" data-id="${k}" title="${PA_COLS[k][0]}" aria-label="${PA_COLS[k][0]}"></button>`).join('')}</span></div>
      </div>
    </details>
  </section>
  <section class="card sd-step"><h3><span class="pb-n">3</span>เลือกดีไซน์ <small class="muted">— เรียงตามความเหมาะกับเนื้อหา</small></h3><div class="sd-gallery" id="sdGallery"></div></section>`;
  sdWarnBox(); sdGallery();
}
let sdGalT = 0;
function sdGallery() {
  clearTimeout(sdGalT);
  sdGalT = setTimeout(() => {
    const el = $('#sdGallery'), b = SDOC.brief; if (!el || !b) return; const fm = sdFmt();
    el.innerHTML = b.designs.map((d, i) => `<button type="button" class="sd-dz ${SDOC.design === d ? 'on' : ''}" data-act="sdDesign" data-id="${d}" aria-pressed="${SDOC.design === d}"><canvas data-dz="${d}" style="aspect-ratio:${fm[2]}/${fm[3]}"></canvas><b>${SD_DESIGNS[d][0]}${i < 2 ? ' <em>แนะนำ</em>' : ''}</b><small>${SD_DESIGNS[d][1]}</small></button>`).join('');
    $$('canvas[data-dz]', el).forEach(cv => { const r = sdBuild(b, cv.dataset.dz, SDOC.format); sdRender(cv, { format: SDOC.format, bg: r.bg, layers: r.layers }, { scale: 240 / fm[2] }); });
  }, 120);
}

/* ---------- view ---------- */
function sdFull() { const v = $('#view'); if (v && route().name === 'poster') V.poster(v, true); }
V.poster = (root, force) => {
  if (!force && $('#sdRoot', root)) { sdPaint(); return; }
  const fm = sdFmt(), b = SDOC.brief;
  root.innerHTML = `<div id="sdRoot">
  ${pageHead('Poster Studio', 'วางข้อความ → AI ตีความ → เลือกดีไซน์ → ลาก ย่อ ขยาย ลบ ได้อิสระ — ตาม CI Krungthai-AXA',
    `<button class="btn btn-ghost" data-act="sdDrafts">${ico('folder', 15)} งานของฉัน</button><button class="btn btn-ghost" data-act="pbBrand">${ico('lock', 15)} CI Control</button><button class="btn btn-ghost" data-act="sdNew">${ico('plus', 15)} เริ่มใหม่</button>`)}
  <div class="sd">
    <div class="sd-left">
      <section class="card sd-step" id="sdStep1"><h3><span class="pb-n">1</span>ข้อความที่ต้องการสื่อสาร</h3>
        <p class="muted small">วางข้อความได้เลย เช่น อีเมล ข้อความ LINE หรือบันทึก — AI จะอ่านว่าเป็นการสื่อสารแบบไหน ใจความหลักคืออะไร ใครต้องทำอะไร แล้วเลือกภาพประกอบให้ตรงเนื้อหา <b>ตัวเลข วันที่ สถานที่ คงตามต้นฉบับ</b></p>
        <textarea id="sdText" rows="8" maxlength="6000" placeholder="วางข้อความประกาศ / ประชาสัมพันธ์ที่นี่…">${esc(SDOC.text)}</textarea>
        <div class="sd-sub">ขนาดภาพ</div>
        <div class="seg-chips sd-fmts">${Object.entries(PB_FORMATS).map(([k, f]) => `<button type="button" class="${k === SDOC.format ? 'on' : ''}" data-act="sdFmt" data-id="${k}" title="${f[2]}×${f[3]} · ${f[4]}"><i style="aspect-ratio:${f[2]}/${f[3]}"></i>${f[0]} ${f[1]}</button>`).join('')}</div>
        <div class="btn-row mt"><button type="button" class="btn btn-primary" id="sdReadBtn" data-act="sdRead">${ico('sparkles', 15)} ${b ? 'ให้ AI อ่านใหม่' : 'ให้ AI อ่านและออกแบบ'}</button><button type="button" class="btn btn-ghost" data-act="sdRead" data-id="local">จัดให้อัตโนมัติ (ไม่ใช้ AI)</button>${SDOC.text ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-act="sdSample">ลองข้อความตัวอย่าง</button>`}</div>
      </section>
      <div id="sdBrief"></div>
    </div>
    <div class="sd-center">
      <section class="card sd-stagecard" id="sdStage">
        <div class="sd-toolbar">
          <button type="button" class="icon-btn" data-act="sdUndo" title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ">${ico('undo', 17)}</button><button type="button" class="icon-btn" data-act="sdRedo" title="ทำซ้ำ (Ctrl+Shift+Z)" aria-label="ทำซ้ำ">${ico('redo', 17)}</button>
          <span class="sd-tb-sep"></span><span class="small muted">${fm[0]} ${fm[1]} · ${fm[2]}×${fm[3]}${SDOC.design ? ' · ' + SD_DESIGNS[SDOC.design][0] : ''}</span>
          <span class="sd-tb-grow"></span>${b ? `<button type="button" class="btn btn-sm btn-ghost" data-act="sdRelayout" title="จัดทุกชิ้นกลับเข้าที่ตามดีไซน์">${ico('refresh', 14)} จัดวางใหม่</button>` : ''}
        </div>
        <div class="sd-canvasbox"><div class="sd-wrap" id="sdWrap" data-fmt="${SDOC.format}" style="aspect-ratio:${fm[2]}/${fm[3]}"><canvas id="sdCv" role="img" aria-label="ตัวอย่างโปสเตอร์"></canvas><div class="sd-ov" id="sdOv"></div>
          <div class="sd-empty" id="sdEmpty" ${SDOC.layers.length ? 'hidden' : ''}>${ico('sparkles', 28)}<b>วางข้อความด้านซ้าย แล้วกด “ให้ AI อ่านและออกแบบ”</b><span>ระบบจะสร้างหลายดีไซน์ให้เลือก แล้วปรับแต่งได้ทุกชิ้น</span></div></div></div>
        <p class="pb-fit" id="sdFit" hidden>${ico('alert', 14)} ข้อความแน่นสำหรับขนาดนี้ — ตัวอักษรถูกย่อลง ลองตัดข้อความ ลบบางชิ้น หรือเลือกขนาด Portrait / Story</p>
        <div class="sd-export">
          <label class="pb-check"><input type="checkbox" id="sdReviewed" ${SDOC.reviewed ? 'checked' : ''}> ตรวจข้อความ ตัวเลข วันเวลา และสะกดแล้ว</label>
          <div class="btn-row"><button type="button" class="btn btn-ghost" data-act="sdSave">${ico('save', 15)} บันทึก</button><button type="button" class="btn btn-primary" data-act="sdExport" data-id="png" data-sd-exp>${ico('download', 15)} PNG</button><button type="button" class="btn btn-ghost" data-act="sdExport" data-id="jpg" data-sd-exp>JPG</button></div>
        </div>
      </section>
    </div>
    <div class="sd-right"><section class="card sd-panel" id="sdProps"></section><section class="card sd-panel" id="sdAdd"></section></div>
  </div></div>`;
  $('#sdText', root).addEventListener('input', e => { SDOC.text = e.target.value; clearTimeout(sdSaveT); sdSaveT = setTimeout(() => sdLS.set('cur', SDOC), 600); });
  $('#sdReviewed', root).addEventListener('change', e => { SDOC.reviewed = e.target.checked; sdExportState(); });
  $('#sdRoot', root).addEventListener('focusin', e => { if (e.target.matches('[data-bf],[data-bp],[data-lp]')) { e.target._snap = sdSnap(); } });
  $('#sdRoot', root).addEventListener('input', sdInput);
  $('#sdRoot', root).addEventListener('change', e => { if (e.target.matches('select[data-bf],select[data-bp],select[data-lp]')) sdInput(e); });
  sdLeft(); sdProps(); sdAddPanel(); sdStageEvents(); sdExportState(); sdPaint();
  sdFonts();
};
function sdInput(e) {
  const t = e.target, b = SDOC.brief;
  const once = () => { if (t._snap) { SD_UNDO.push(t._snap); SD_REDO = []; t._snap = null; } };
  if (t.dataset.bf && b) {
    once(); const k = t.dataset.bf, v = t.value;
    if (k === 'headline') b.headline = v.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
    else if (k === 'emph') b.emph = +v; else b[k] = v;
    if (k === 'kindText') { b.kind = sdGuessKind(v, v + ' ' + SDOC.text); b.designs = sdRank(b); sdGallery(); sdChanged(true); return; }
    sdBriefChanged(!SDOC.edited || ['date', 'time', 'venue', 'cta', 'note', 'sub', 'kicker'].includes(k) && !SDOC.layers.some(L => L.role === k));
    if (k === 'headline' && e.type === 'change') sdLeft();
    return;
  }
  if (t.dataset.bp && b) { once(); const [i, k] = t.dataset.bp.split('.'); if (b.points[+i]) b.points[+i][k] = t.value; sdBriefChanged(false); return; }
  if (t.dataset.lp) {
    const L = sdSel(); if (!L) return; once(); const k = t.dataset.lp;
    L[k] = t.type === 'range' ? +t.value : t.value; if (t.type === 'range') { const o = t.nextElementSibling; if (o) o.textContent = Math.round(+t.value * 100) / 100; }
    sdM(L); sdLayerToBrief(L); SDOC.edited = SDOC.edited || ['size', 'rot', 'op'].includes(k); sdChanged(); return;
  }
}
let sdFontsOk = false;
const sdLogosReady = () => Promise.all([...new Set([sdLogoSrc({ variant: 'color' }), ...SDOC.layers.map(L => L.t === 'logo' ? sdLogoSrc(L) : L.t === 'art' ? sdKitSrc(L.key) : L.t === 'img' ? L.src : '')].filter(Boolean))].map(src => { pbImg(src); const im = PB_IMG.get(src); return im && !im.complete ? new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); setTimeout(r, 4000); }) : null; }));
async function sdFonts() { sdLogosReady(); sdFontLinks(); await sdFontFiles(); if (sdFontsOk) { SDOC.layers.forEach(sdM); sdPaint(); sdGallery(); return; } try { await Promise.all(['400', '500', '600', '700'].map(w => document.fonts.load(`${w} 30px "IBM Plex Sans Thai"`, 'ไทย'))); await document.fonts.load('700 30px "Source Sans Pro"'); const c = sdFontCfg(); await Promise.all([c.head, c.body, c.thai].flatMap(f => ['400', '700'].map(w => document.fonts.load(`${w} 30px "${f}"`, 'Aก')))); } catch (e) { } sdFontsOk = true; SDOC.layers.forEach(sdM); sdPaint(); sdGallery(); }

/* ---------- export, drafts ---------- */
const sdFileName = ext => `Poster_${(SDOC.design || 'custom')}_${sdFmt()[1].replace(':', 'x')}_${today()}.${ext}`;
ACT.sdExport = async el => {
  if (!SDOC.layers.length) return toast('ยังไม่มีโปสเตอร์', 'error');
  if (!SDOC.reviewed) { toast('ติ๊กยืนยันว่าตรวจสอบข้อความแล้วก่อน Export', 'error'); $('#sdReviewed')?.focus(); return; }
  await sdLogosReady(); const cv = document.createElement('canvas'); sdRender(cv, SDOC);
  const jpg = el.dataset.id === 'jpg'; await pbDownload(cv, sdFileName(jpg ? 'jpg' : 'png'), jpg ? 'image/jpeg' : 'image/png');
  toast('ดาวน์โหลดแล้ว'); sdSaveDraft(true);
};
const sdThumbOf = () => { const cv = document.createElement('canvas'); sdRender(cv, SDOC, { scale: 220 / sdFmt()[2] }); return cv.toDataURL('image/jpeg', .7); };
function sdSaveDraft(quiet) {
  if (!SDOC.layers.length) { if (!quiet) toast('ยังไม่มีโปสเตอร์ให้บันทึก', 'error'); return; }
  const list = sdLS.get('drafts', []).filter(d => d.id !== SDOC.id), name = (SDOC.brief?.headline || []).join(' ') || 'โปสเตอร์';
  list.unshift({ id: SDOC.id, name, at: Date.now(), thumb: sdThumbOf(), doc: SDOC });
  let ok = sdLS.set('drafts', list.slice(0, 15)); if (!ok) ok = sdLS.set('drafts', list.slice(0, 5));
  if (!quiet) toast(ok ? 'บันทึกในเบราว์เซอร์นี้แล้ว' : 'พื้นที่เก็บในเบราว์เซอร์เต็ม — ลบงานเก่าออกก่อน', ok ? 'ok' : 'error');
}
ACT.sdSave = () => sdSaveDraft();
ACT.sdNew = async () => { if (SDOC.layers.length && !(await confirmBox('เริ่มโปสเตอร์ใหม่? (งานนี้บันทึกไว้ใน “งานของฉัน” ให้อัตโนมัติ)', 'เริ่มใหม่'))) return; if (SDOC.layers.length) sdSaveDraft(true); SDOC = sdBlankDoc(); SD_SEL = null; SD_UNDO = []; SD_REDO = []; sdLS.set('cur', SDOC); sdFull(); };
ACT.sdDrafts = () => {
  const list = sdLS.get('drafts', []);
  const md = modal({ title: 'งานของฉัน', wide: true, body: list.length ? `<div class="sd-drafts">${list.map(d => `<div class="sd-draft"><button type="button" data-open="${d.id}"><img src="${d.thumb}" alt=""><b>${esc(d.name)}</b><small>${new Date(d.at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</small></button><button type="button" class="icon-btn" data-del="${d.id}" aria-label="ลบงานนี้">${ico('trash', 14)}</button></div>`).join('')}</div>` : '<p class="muted">ยังไม่มีงานที่บันทึก — งานจะถูกบันทึกเมื่อกดบันทึกหรือ Export (เก็บในเบราว์เซอร์นี้)</p>', actions: [{ label: 'ปิด', cls: 'btn-primary' }],
    onOpen(m) { m.el.addEventListener('click', e => {
      const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
      if (o) { const x = sdLS.get('drafts', []).find(v => v.id === o.dataset.open); if (x) { SDOC = { ...sdBlankDoc(), ...x.doc }; SD_SEL = null; SD_UNDO = []; SD_REDO = []; m.close(); sdFull(); } }
      if (d) { sdLS.set('drafts', sdLS.get('drafts', []).filter(v => v.id !== d.dataset.del)); d.closest('.sd-draft').style.display = 'none'; }
    }); } });
  return md;
};
/* restore the last working poster (this browser) once the app has a user */
function sdBoot() { if (AEX && AEX.meId) { const cur = sdLS.get('cur', null); if (cur && cur.layers) SDOC = { ...sdBlankDoc(), ...cur }; } }
const _sdView = V.poster; V.poster = (root, force) => { if (!sdBoot.done) { sdBoot(); sdBoot.done = true; } _sdView(root, force); };
