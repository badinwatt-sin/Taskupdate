'use strict';
/* ============================================================
   Poster Studio · brief from PowerPoint
   A person's own draft slide (.pptx): background picture, object pictures and rough text.
   The file is read in this browser only: text goes into the message box (and through the usual
   AI / built-in layout engine), pictures stay in this tab's memory (never uploaded, never saved).
   Result: the same content, re-designed with the Studio's CI layouts.
   Loaded after studio-edit.js (uses its memory-only picture store).
   ============================================================ */
let SB = null;   // { name, slides, cur, text, boxes, objs: [{ src, w, h, area }], bg: { src, w, h } | null, useBg, hero, wash }
let SB_ZIP = null;

/* ---------- zip (central directory + deflate-raw) ---------- */
async function sbUnzip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), files = new Map();
  let e = buf.byteLength - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('ไฟล์นี้ไม่ใช่ PowerPoint (.pptx)');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    files.set(name, async () => {
      const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u8.subarray(ds, ds + csize);
      if (method === 0) return raw;
      if (method !== 8 || typeof DecompressionStream !== 'function') throw new Error('เบราว์เซอร์นี้เปิดไฟล์ .pptx ไม่ได้ — อัปเดตเบราว์เซอร์แล้วลองใหม่');
      return new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    });
    p += 46 + nl + el + cl;
  }
  return files;
}
const sbXml = async (zip, path) => { const f = zip.get(path); if (!f) return null; const d = new DOMParser().parseFromString(new TextDecoder().decode(await f()), 'application/xml'); return d.querySelector('parsererror') ? null : d; };
const sbRelPath = (base, target) => { if (target.startsWith('/')) return target.slice(1); const out = base.split('/').slice(0, -1); target.split('/').forEach(s => { if (s === '..') out.pop(); else if (s !== '.') out.push(s); }); return out.join('/'); };
async function sbRels(zip, part) {   // rId → target path
  const dir = part.split('/').slice(0, -1).join('/'), d = await sbXml(zip, `${dir}/_rels/${part.split('/').pop()}.rels`), m = {};
  if (d) [...d.getElementsByTagName('Relationship')].forEach(r => { if (r.getAttribute('TargetMode') !== 'External') m[r.getAttribute('Id')] = { path: sbRelPath(part, r.getAttribute('Target')), type: r.getAttribute('Type') || '' }; });
  return m;
}
const SB_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' };
const SB_PICS = new Map();   // media path → { src, w, h } (decoded once)
async function sbPicture(zip, path) {
  if (SB_PICS.has(path)) return SB_PICS.get(path);
  const ext = path.split('.').pop().toLowerCase(), f = zip.get(path); let out = null;
  if (f && SB_MIME[ext]) {
    const url = URL.createObjectURL(new Blob([await f()], { type: SB_MIME[ext] })), im = new Image(); im.src = url;
    try { await im.decode(); if (im.naturalWidth > 8 && im.naturalHeight > 8) { const id = 'mem:' + Math.random().toString(36).slice(2, 10); SE_MEM.set(id, url); PB_IMG.set(url, im); out = { src: id, url, w: im.naturalWidth, h: im.naturalHeight }; } } catch (e) { }
    if (!out) URL.revokeObjectURL(url);
  }
  SB_PICS.set(path, out); return out;
}
const sbEmbed = el => { const b = el && el.getElementsByTagName('a:blip')[0]; return b ? (b.getAttribute('r:embed') || b.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')) : null; };
function sbBox(el) { const x = el.getElementsByTagName('a:xfrm')[0], o = x && x.getElementsByTagName('a:off')[0], s = x && x.getElementsByTagName('a:ext')[0]; return o && s ? { x: +o.getAttribute('x') || 0, y: +o.getAttribute('y') || 0, w: +s.getAttribute('cx') || 0, h: +s.getAttribute('cy') || 0 } : null; }

/* ---------- one slide → text boxes, object pictures, background ---------- */
async function sbReadSlide(zip, n) {
  const pres = await sbXml(zip, 'ppt/presentation.xml'), sz = pres && pres.getElementsByTagName('p:sldSz')[0], SW = sz ? +sz.getAttribute('cx') : 12192000, SH = sz ? +sz.getAttribute('cy') : 6858000;
  const part = `ppt/slides/slide${n}.xml`, doc = await sbXml(zip, part); if (!doc) throw new Error('อ่านสไลด์นี้ไม่ได้');
  const rels = await sbRels(zip, part), boxes = [], objs = []; let bg = null;
  const PH = { title: 4400, ctrTitle: 4400, subTitle: 2400 };
  [...doc.getElementsByTagName('p:sp')].forEach(sp => {
    const ph = sp.getElementsByTagName('p:ph')[0], type = ph ? ph.getAttribute('type') || 'body' : '';
    if (['sldNum', 'dt', 'ftr', 'hdr'].includes(type)) return;
    const paras = [...sp.getElementsByTagName('a:p')].map(p => [...p.childNodes].map(c => c.nodeName === 'a:br' ? '\n' : (c.nodeName === 'a:r' || c.nodeName === 'a:fld') ? [...c.getElementsByTagName('a:t')].map(t => t.textContent).join('') : '').join('').replace(/[ \t ]+/g, ' ').trim()).filter(Boolean);
    if (!paras.length) return;
    const sizes = [...sp.getElementsByTagName('a:rPr'), ...sp.getElementsByTagName('a:endParaRPr')].map(r => +r.getAttribute('sz') || 0).filter(Boolean), b = sbBox(sp) || { x: 0, y: 0, w: 0, h: 0 };
    boxes.push({ text: paras.join('\n'), size: sizes.length ? Math.max(...sizes) : (PH[type] || 1800), title: type === 'title' || type === 'ctrTitle', bold: !![...sp.getElementsByTagName('a:rPr')].find(r => r.getAttribute('b') === '1'), x: b.x, y: b.y });
  });
  [...doc.getElementsByTagName('a:tbl')].forEach(t => { const rows = [...t.getElementsByTagName('a:tr')].map(r => [...r.getElementsByTagName('a:tc')].map(c => [...c.getElementsByTagName('a:t')].map(x => x.textContent).join('').trim()).filter(Boolean).join(' · ')).filter(Boolean); if (rows.length) boxes.push({ text: rows.join('\n'), size: 1600, x: 0, y: SH }); });
  const scan = async (d, r, partBg) => {   // pictures of a part (slide / layout / master)
    const bgEl = d.getElementsByTagName('p:bg')[0], id = sbEmbed(bgEl);
    if (id && r[id] && !bg) bg = await sbPicture(zip, r[id].path);
    for (const pic of [...d.getElementsByTagName('p:pic')]) {
      const rid = sbEmbed(pic), b = sbBox(pic); if (!rid || !r[rid]) continue;
      const im = await sbPicture(zip, r[rid].path); if (!im) continue;
      const area = b ? Math.min(1, (b.w * b.h) / (SW * SH)) : .1;
      if (area >= .78 && !bg) bg = im; else if (!partBg && !objs.some(o => o.src === im.src) && im !== bg) objs.push({ ...im, area, x: b ? b.x : 0, y: b ? b.y : 0 });
    }
    for (const sp of [...d.getElementsByTagName('p:sp')]) {   // a full-slide shape filled with a picture
      const sp2 = sp.getElementsByTagName('p:spPr')[0], fill = sp2 && sp2.getElementsByTagName('a:blipFill')[0], rid = sbEmbed(fill), b = sbBox(sp);
      if (rid && r[rid] && b && (b.w * b.h) / (SW * SH) >= .78 && !bg) bg = await sbPicture(zip, r[rid].path);
    }
  };
  await scan(doc, rels, false);
  const lay = Object.values(rels).find(v => /slideLayout$/.test(v.type));
  if (lay && !bg) { const ld = await sbXml(zip, lay.path); if (ld) { const lr = await sbRels(zip, lay.path); await scan(ld, lr, true); const ms = Object.values(lr).find(v => /slideMaster$/.test(v.type)); if (ms && !bg) { const md = await sbXml(zip, ms.path); if (md) await scan(md, await sbRels(zip, ms.path), true); } } }
  objs.sort((a, b) => b.area - a.area);
  /* message: the headline is the title box (or the largest type), then the rest top to bottom */
  const head = boxes.find(b => b.title) || boxes.slice().sort((a, b) => b.size - a.size || a.y - b.y)[0];
  const rest = boxes.filter(b => b !== head).sort((a, b) => a.y - b.y || a.x - b.x);
  const text = [head, ...rest].filter(Boolean).map(b => b.text).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, boxes: boxes.length, objs: objs.slice(0, 8), bg };
}

/* ---------- open a file ---------- */
async function sbOpen(file) {
  if (!file) return;
  if (/\.ppt$/i.test(file.name)) return toast('ไฟล์ .ppt รุ่นเก่าเปิดไม่ได้ — บันทึกเป็น .pptx ใน PowerPoint ก่อน', 'error');
  if (!/\.pptx$/i.test(file.name)) return toast('แนบไฟล์ PowerPoint (.pptx)', 'error');
  if (file.size > 60e6) return toast('ไฟล์ใหญ่เกิน 60 MB — ลบสไลด์ที่ไม่เกี่ยวข้องก่อน', 'error');
  sbBusy(true);
  try {
    const zip = await sbUnzip(await file.arrayBuffer());
    const slides = [...zip.keys()].map(k => /^ppt\/slides\/slide(\d+)\.xml$/.exec(k)).filter(Boolean).map(m => +m[1]).sort((a, b) => a - b);
    if (!slides.length) throw new Error('ไม่พบสไลด์ในไฟล์นี้');
    sbClear(true); SB_ZIP = zip;
    SB = { name: file.name, slides, cur: slides[0], useBg: true, hero: 0, wash: .72, ...(await sbReadSlide(zip, slides[0])) };
    if (!SB.bg) SB.useBg = false; if (!SB.objs.length) SB.hero = -1;
    sbBoxRender();
    toast(SB.text || SB.objs.length || SB.bg ? 'อ่าน Brief แล้ว — กด “ออกแบบใหม่จาก Brief”' : 'สไลด์นี้ไม่มีข้อความหรือรูปที่อ่านได้', SB.text || SB.objs.length || SB.bg ? 'ok' : 'error');
  } catch (e) { console.warn('brief', e); SB = null; sbBoxRender(); toast(e.message || 'อ่านไฟล์นี้ไม่ได้', 'error'); }
}
function sbBusy(on) { const b = $('#sbBox'); if (b && on) b.innerHTML = '<p class="small muted" role="status"><span class="spin"></span> กำลังอ่านไฟล์ PowerPoint…</p>'; }
function sbClear(keepDoc) {
  [...SB_PICS.values()].forEach(p => { if (p) { try { URL.revokeObjectURL(p.url); } catch (e) { } SE_MEM.delete(p.src); PB_IMG.delete(p.url); } });
  SB_PICS.clear(); SB = null; SB_ZIP = null;
  if (!keepDoc) { SDOC.layers = SDOC.layers.filter(L => !(L.t === 'img' && String(L.src).startsWith('mem:') && (L.sbBg || L.sbHero))); if (SDOC.brief && SDOC.layers.length) { sdApply(SDOC.design, true); sdChanged(true); } }
}
ACT.sbPick = async () => sbOpen(await pickFile('.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation'));
ACT.sbRemove = () => { sbClear(false); sbBoxRender(); sdPaint(); sdProps(); };
ACT.sbSlide = async el => { if (!SB || !SB_ZIP) return; const n = +el.dataset.id; sbBusy(true); try { Object.assign(SB, await sbReadSlide(SB_ZIP, n), { cur: n }); SB.useBg = !!SB.bg; SB.hero = SB.objs.length ? 0 : -1; } catch (e) { toast(e.message, 'error'); } sbBoxRender(); };
ACT.sbUseBg = () => { if (!SB || !SB.bg) return; SB.useBg = !SB.useBg; sbRefresh(); };
ACT.sbHero = el => { if (!SB) return; const i = +el.dataset.id; SB.hero = SB.hero === i ? -1 : i; sbRefresh(); };
ACT.sbPlace = el => {   // put a brief picture on the poster as a free layer
  const o = SB && SB.objs[+el.dataset.id]; if (!o) return; if (!SDOC.layers.length) return toast('สร้างโปสเตอร์ก่อน แล้วค่อยวางรูปเพิ่ม', 'error');
  const fm = sdFmt(), u = Math.min(fm[2], fm[3]) / 1080, w = Math.min(420 * u, fm[2] * .5); sdAddLayer({ t: 'img', src: o.src, fit: 'contain', w, h: w * o.h / o.w, r: 0 }); sdPaint();
};
function sbRefresh() { sbBoxRender(); if (SDOC.brief && SDOC.layers.length) { sdPush(); sdApply(SDOC.design, true); sdChanged(true); sdPaint(); sdProps(); } }
ACT.sbGo = async () => {
  if (!SB) return;
  const cur = SDOC.text.trim();
  if (!SB.text && !cur) return toast('สไลด์นี้ไม่มีข้อความ — พิมพ์ข้อความที่ต้องการสื่อสารในช่องด้านบนก่อน', 'error');
  if (SB.text && cur && cur !== SB.text && !(await confirmBox('ใช้ข้อความจาก Brief แทนข้อความที่พิมพ์ไว้?', 'ใช้ข้อความจาก Brief'))) return;
  if (SB.text) { SDOC.text = SB.text; const t = $('#sdText'); if (t) t.value = SB.text; }
  if (SB.useBg && SB.bg && SDOC.prefTheme === 'deep') SDOC.prefTheme = 'tint';   // a brief background gets a light film, so type stays dark
  await ACT.sdRead();
};

/* ---------- poster: brief background + main picture are re-applied whenever the layout is rebuilt ---------- */
function sbDecorate() {
  SDOC.layers = SDOC.layers.filter(L => !L.sbBg);
  if (!SB) return;
  const fm = sdFmt(), W = fm[2], H = fm[3];
  if (SB.useBg && SB.bg) SDOC.layers.unshift({ id: sdId(), t: 'img', role: 'sbbg', sbBg: true, lock: true, src: SB.bg.src, x: 0, y: 0, w: W, h: H, r: 0, wash: SB.wash });
  const o = SB.objs[SB.hero], i = SDOC.layers.findIndex(L => L.role === 'hero');
  if (o && i >= 0) { const h = SDOC.layers[i]; SDOC.layers[i] = { id: h.id, t: 'img', role: 'hero', sbHero: true, src: o.src, fit: 'contain', x: h.x, y: h.y, w: h.w, h: h.h, r: 0 }; }
}
const _sdApplyBase = sdApply;
sdApply = function (design, keepUser) { _sdApplyBase(design, keepUser); sbDecorate(); };
const _sdImgBase = SD_DRAW.img;
SD_DRAW.img = function (k, L, draw) {   // adds: fit 'contain' (object pictures keep their whole shape) and a light film over background pictures
  if (!draw) return;
  if (L.fit === 'contain') { const im = pbImg(L.src); if (im) { const s = Math.min(L.w / im.width, L.h / im.height), w = im.width * s, h = im.height * s; k.g.drawImage(im, L.x + (L.w - w) / 2, L.role === 'hero' ? L.y + L.h - h : L.y + (L.h - h) / 2, w, h); } }
  else _sdImgBase(k, L, draw);
  if (L.wash) { const g = k.g, wg = g.createLinearGradient(L.x, 0, L.x + L.w, 0); wg.addColorStop(0, `rgba(226,239,255,${Math.min(.94, L.wash + .14)})`); wg.addColorStop(1, `rgba(226,239,255,${Math.max(0, L.wash - .18)})`); g.fillStyle = wg; g.fillRect(L.x, L.y, L.w, L.h); }
};

/* ---------- the box under the message field ---------- */
function sbBoxRender() {
  const el = $('#sbBox'); if (!el) return;
  if (!SB) {
    el.innerHTML = `<div class="sb-idle"><button type="button" class="btn btn-ghost" data-act="sbPick">${ico('upload', 15)} แนบ Brief (PowerPoint .pptx)</button><span class="small muted">มีสไลด์ที่ลองทำไว้แล้ว? แนบได้เลย ระบบดึงข้อความ รูป และพื้นหลังมาออกแบบใหม่ตาม CI · รูปและไฟล์อยู่ในเครื่องนี้ ไม่ถูกเก็บในระบบ</span></div>`;
    return;
  }
  const th = (o, i) => `<div class="sb-th ${SB.hero === i ? 'on' : ''}"><img src="${o.url}" alt="รูปที่ ${i + 1} จาก Brief"><div><button type="button" data-act="sbHero" data-id="${i}" aria-pressed="${SB.hero === i}">${SB.hero === i ? '✓ ภาพหลัก' : 'ใช้เป็นภาพหลัก'}</button><button type="button" data-act="sbPlace" data-id="${i}" title="วางรูปนี้บนโปสเตอร์เพิ่ม">+ วาง</button></div></div>`;
  el.innerHTML = `<div class="sb-on">
    <div class="sb-h"><b>${ico('file', 15)} ${esc(SB.name)}</b><button type="button" class="icon-btn" data-act="sbRemove" aria-label="เอา Brief ออก" title="เอา Brief ออก">${ico('x', 15)}</button></div>
    ${SB.slides.length > 1 ? `<div class="seg-chips sb-slides" role="group" aria-label="เลือกสไลด์">${SB.slides.slice(0, 12).map(n => `<button type="button" class="${n === SB.cur ? 'on' : ''}" data-act="sbSlide" data-id="${n}">สไลด์ ${n}</button>`).join('')}</div>` : ''}
    <p class="small muted">พบในสไลด์: ข้อความ ${SB.boxes} กล่อง · รูป ${SB.objs.length} รูป · ${SB.bg ? 'มีภาพพื้นหลัง' : 'ไม่มีภาพพื้นหลัง'}</p>
    ${SB.bg || SB.objs.length ? `<div class="sb-pics">${SB.bg ? `<div class="sb-th sb-bg ${SB.useBg ? 'on' : ''}"><img src="${SB.bg.url}" alt="ภาพพื้นหลังจาก Brief"><div><button type="button" data-act="sbUseBg" aria-pressed="${SB.useBg}">${SB.useBg ? '✓ ใช้เป็นพื้นหลัง' : 'ใช้เป็นพื้นหลัง'}</button></div></div>` : ''}${SB.objs.map(th).join('')}</div>` : ''}
    ${SB.text ? `<details class="sb-text"><summary>ข้อความที่อ่านได้ (${SB.text.length} ตัวอักษร)</summary><pre>${esc(SB.text)}</pre></details>` : '<p class="pb-warn small">สไลด์นี้ไม่มีข้อความที่อ่านได้ (อาจเป็นข้อความในรูป) — พิมพ์ข้อความในช่องด้านบนแทน</p>'}
    <button type="button" class="btn btn-primary sb-go" data-act="sbGo">${ico('sparkles', 15)} ออกแบบใหม่จาก Brief นี้</button>
  </div>`;
}
const _sbViewBase = V.poster;
V.poster = (root, force) => {
  const had = !!$('#sdRoot', root); _sbViewBase(root, force);
  if (had && !force) return;
  const t = $('#sdText', root);
  if (t && !$('#sbBox', root)) {
    const box = document.createElement('div'); box.id = 'sbBox'; box.className = 'sb-box'; t.insertAdjacentElement('afterend', box);
    const step = $('#sdStep1', root);   // drop a .pptx anywhere on the first card
    step.addEventListener('dragover', e => { if ([...(e.dataTransfer?.items || [])].some(i => i.kind === 'file')) { e.preventDefault(); step.classList.add('sb-drop'); } });
    step.addEventListener('dragleave', () => step.classList.remove('sb-drop'));
    step.addEventListener('drop', e => { step.classList.remove('sb-drop'); const f = [...(e.dataTransfer?.files || [])].find(x => /\.pptx?$/i.test(x.name)); if (f) { e.preventDefault(); sbOpen(f); } });
  }
  sbBoxRender();
};
