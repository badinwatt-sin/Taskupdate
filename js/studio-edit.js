'use strict';
/* ============================================================
   Poster Studio · direct editing (works like a design canvas)
   · quick bar above the poster: font, size, colour, weight, align, order, delete — changes with the selection
   · tap a selected text again (or double-click) → type right on the poster
   · font choice per text: CI fonts first, fonts the team uploaded, extra Thai fonts (flagged by the CI check)
   · pictures from this device stay in this tab's memory only: never uploaded, never written to drafts
   Loaded after studio.js; wraps a few of its functions instead of changing them.
   ============================================================ */
const SE_EXTRA = ['Sarabun', 'Prompt', 'Kanit', 'Noto Sans Thai', 'Anuphan', 'Mitr', 'Chakra Petch', 'Bai Jamjuree', 'Noto Serif Thai'];
const SE_GF = 'https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600&family=Chakra+Petch:wght@400;600;700&family=Bai+Jamjuree:wght@400;600;700&family=Noto+Serif+Thai:wght@400;600;700&display=swap';
function seFontLinks() { sdFontLinks(); if (document.getElementById('seGF')) return; const l = document.createElement('link'); l.id = 'seGF'; l.rel = 'stylesheet'; l.href = SE_GF; document.head.appendChild(l); }
async function seUseFont(f) {   // make sure the face is ready, then re-measure and repaint
  if (!f || f === 'head' || f === 'body') return;
  seFontLinks();
  try { await Promise.all(['400', '600', '700'].map(w => document.fonts.load(`${w} 30px "${f}"`, 'ไทย Aa 12'))); } catch (e) { }
  SDOC.layers.forEach(sdM); sdPaint();
}
function seEnsureFonts() { [...new Set(SDOC.layers.map(L => L.t === 'text' && L.ff).filter(f => f && f !== 'head' && f !== 'body'))].forEach(seUseFont); }
sdFontOpts = function (cur) {   // CI pair first · then fonts uploaded in CI Control · then extra Thai fonts (outside CI)
  const c = sdFontCfg(), up = [...new Set((pbBrand().fontFiles || []).map(x => x.family))].filter(n => ![c.head, c.body, c.thai].includes(n));
  const o = (v, l) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`;
  return `<optgroup label="ตาม CI">${o('head', `หัวข้อ — ${c.head} + ${c.thai}`)}${o('body', `เนื้อหา — ${c.body} + ${c.thai}`)}</optgroup>`
    + (up.length ? `<optgroup label="ฟอนต์ที่ทีมอัปโหลด">${up.map(n => o(n, n)).join('')}</optgroup>` : '')
    + `<optgroup label="ฟอนต์เพิ่มเติม (นอก CI)">${SE_EXTRA.map(n => o(n, n)).join('')}</optgroup>`;
};
document.addEventListener('change', e => {
  if (!(e.target.matches && e.target.matches('select[data-lp="ff"]'))) return;
  seUseFont(e.target.value); if (e.target.closest('#sdQuick')) _sdPropsBase(); else seQuick();   // keep the panel and the quick bar in step
});

/* ---------- pictures from this device: memory only ---------- */
const SE_MEM = new Map();   // 'mem:id' → object URL (gone when the tab closes)
const _pbImgBase = pbImg;
pbImg = function (src) { return _pbImgBase(typeof src === 'string' && src.startsWith('mem:') ? (SE_MEM.get(src) || '') : src); };
const seIsMem = L => L && L.t === 'img' && typeof L.src === 'string' && L.src.startsWith('mem:');
function seStripDoc(d) {
  if (!d || !Array.isArray(d.layers)) return d;
  const pr = d.brief?.pr;
  if (pr?.photo?.src.startsWith('mem:')) {
    const { photo, ...rest } = pr;
    return { ...d, brief: { ...d.brief, pr: rest }, layers: d.layers.filter(L => !seIsMem(L)) };
  }
  return d.layers.some(seIsMem) ? { ...d, layers: d.layers.filter(L => !seIsMem(L)) } : d;
}
const _sdLsSet = sdLS.set;
sdLS.set = (k, v) => _sdLsSet(k, k === 'cur' ? seStripDoc(v) : k === 'drafts' && Array.isArray(v) ? v.map(d => d && d.doc ? { ...d, doc: seStripDoc(d.doc) } : d) : v);   // device pictures are never written to storage
async function sePickPhoto() {   // → { src: 'mem:…', w, h } once the picture is decoded
  const f = await pickFile('image/*'); if (!f) return null;
  if (!/^image\//.test(f.type)) { toast('เลือกไฟล์รูปภาพ (JPG / PNG)', 'error'); return null; }
  const url = URL.createObjectURL(f), im = new Image(); im.src = url;
  try { await im.decode(); } catch (e) { URL.revokeObjectURL(url); toast('อ่านรูปนี้ไม่ได้ — ลองไฟล์ JPG หรือ PNG', 'error'); return null; }
  const id = 'mem:' + Math.random().toString(36).slice(2, 10); SE_MEM.set(id, url); PB_IMG.set(url, im);
  return { src: id, w: im.naturalWidth, h: im.naturalHeight };
}
ACT.seAddPhoto = async () => {
  const p = await sePickPhoto(); if (!p) return;
  const fm = sdFmt(), u = Math.min(fm[2], fm[3]) / 1080, w = Math.min(520 * u, fm[2] * .6);
  sdAddLayer({ t: 'img', src: p.src, w, h: w * p.h / p.w, r: .04 }); sdPaint();
  toast('เพิ่มรูปแล้ว — ลากเพื่อย้าย ลากมุมเพื่อย่อขยาย · รูปไม่ถูกเก็บในระบบ');
};
const _sdAddBase = ACT.sdAdd;
ACT.sdAdd = el => (el.dataset.id || '').startsWith('img:') ? ACT.seAddPhoto() : _sdAddBase(el);
ACT.sdImgSwap = async () => { const L = sdSel(); if (!L) return; const p = await sePickPhoto(); if (!p) return; sdPush(); L.src = p.src; if (L.role === 'hero' && SDOC.brief?.pr) { L.contain = false; SDOC.brief.pr.photo = p; } else L.h = L.w * p.h / p.w; SDOC.edited = true; sdChanged(); };
ACT.seAddText = () => { ACT.sdAdd({ dataset: { id: 'text:body' } }); seEditOpen(true); };

/* ---------- quick bar above the poster ---------- */
const SE_TEXTY = { text: 'text', chip: 'text', card: 'title' };
const SE_INK = { text: 'color', chip: 'ink', card: 'titleInk' };
function seQuick() {
  const wrap = $('#sdWrap'); if (wrap) wrap.classList.toggle('has-sel', !!SD_SEL);
  const bar = $('#sdQuick'); if (!bar) return; const L = sdSel();
  const seg = (items) => `<span class="se-seg">${items.join('')}</span>`;
  const size = seg([`<button type="button" data-act="seSize" data-id="-1" aria-label="เล็กลง" title="เล็กลง">${L && SE_TEXTY[L.t] ? 'A−' : '−'}</button>`, `<button type="button" data-act="seSize" data-id="1" aria-label="ใหญ่ขึ้น" title="ใหญ่ขึ้น">${L && SE_TEXTY[L.t] ? 'A+' : '+'}</button>`]);
  const tail = `<span class="se-grow"></span>${seg([`<button type="button" data-act="sdOrder" data-id="up" title="ขึ้นข้างหน้า" aria-label="ขึ้นข้างหน้า">${ico('up', 14)}</button>`, `<button type="button" data-act="sdOrder" data-id="down" title="ไปข้างหลัง" aria-label="ไปข้างหลัง">${ico('down', 14)}</button>`])}
    <button type="button" class="se-btn" data-act="sdDup" title="ทำซ้ำ" aria-label="ทำซ้ำ">${ico('copy', 15)}</button><button type="button" class="se-btn se-del" data-act="sdDel" title="ลบ" aria-label="ลบ">${ico('trash', 15)}</button><button type="button" class="se-btn se-done" data-act="seDone">เสร็จ</button>`;
  let h;
  if (!L) {
    h = `<span class="se-hint">${ico('edit', 15)} ${SDOC.layers.length ? 'แตะชิ้นบนโปสเตอร์เพื่อเลือก · แตะข้อความซ้ำเพื่อพิมพ์แก้' : 'สร้างโปสเตอร์ก่อน หรือเริ่มจากหน้าว่างด้วยปุ่มด้านขวา'}</span><span class="se-grow"></span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="seAddText">${ico('plus', 13)} ข้อความ</button><button type="button" class="btn btn-sm btn-ghost" data-act="seAddPhoto">${ico('image', 13)} รูปจากเครื่อง</button>`;
  } else if (SE_TEXTY[L.t]) {
    const ink = SE_INK[L.t], cur = String(L[ink] || '').toLowerCase(), sw = [['#00008F', 'AXA Blue'], ['#0C0E45', 'Blue Tint 3'], ['#0E0E0E', 'Black'], ['#FF1721', 'AXA Red'], ['#6574F8', 'Blue Tint 2'], ['#FFFFFF', 'White']];
    h = `<button type="button" class="btn btn-sm btn-primary" data-act="seEdit">${ico('edit', 13)} พิมพ์แก้</button>${L.t === 'text' ? `<select class="se-font" data-lp="ff" aria-label="ฟอนต์">${sdFontOpts(L.ff || (L.font === 'body' ? 'body' : 'head'))}</select>` : `<b class="se-name">${SD_TNAME[L.t] || ''}</b>`}${size}
      <span class="se-sw" role="group" aria-label="สีตัวอักษร (ชุดสี CI)">${sw.map(([c, n]) => `<button type="button" class="${cur === c.toLowerCase() ? 'on' : ''}" style="--c:${c}" data-act="sdSet" data-id="${ink}=${c}" title="${n}" aria-label="${n}"></button>`).join('')}</span>
      ${L.t === 'text' ? seg([`<button type="button" class="${+L.weight >= 600 ? 'on' : ''}" data-act="sdSet" data-id="weight=${+L.weight >= 600 ? 400 : 700}" title="ตัวหนา" aria-pressed="${+L.weight >= 600}"><b>B</b></button>`]) + (L.auto ? '' : seg([['left', 'ซ้าย'], ['center', 'กลาง'], ['right', 'ขวา']].map(([v, l]) => `<button type="button" class="${(L.align || 'left') === v ? 'on' : ''}" data-act="sdSet" data-id="align=${v}">${l}</button>`))) : ''}${tail}`;
  } else {
    h = `<b class="se-name">${SD_TNAME[L.t] || 'ชิ้นส่วน'}</b>${size}${L.t === 'img' ? `<button type="button" class="btn btn-sm btn-ghost" data-act="sdImgSwap">${ico('image', 13)} เปลี่ยนรูป</button>` : ''}${L.t === 'art' ? `<button type="button" class="btn btn-sm btn-ghost ${L.flip ? 'on' : ''}" data-act="sdSet" data-id="flip=${!L.flip}">กลับด้าน</button>` : ''}
      <button type="button" class="btn btn-sm btn-ghost" data-act="sdAlign" data-id="center">กึ่งกลาง</button>${tail}`;
  }
  bar.innerHTML = h; bar.dataset.mode = L ? 'sel' : 'idle';
}
const _sdPropsBase = sdProps;
sdProps = function () { _sdPropsBase(); seQuick(); };
ACT.seDone = () => { seEditClose(); SD_SEL = null; sdOverlay(); sdProps(); };
ACT.seEdit = () => seEditOpen(true);
ACT.seSize = el => {
  const L = sdSel(); if (!L) return; const k = +el.dataset.id > 0 ? 1.08 : 1 / 1.08; sdPush();
  if (L.t === 'text' || L.t === 'card' || L.t === 'chip') { L.size = Math.max(8, L.size * k); if (L.t !== 'chip' && !L.auto && L.t !== 'card') L.w = Math.max(24, L.w * k); sdM(L); }
  else if (L.t === 'logo') { const cx = L.x + L.w / 2; L.h = Math.max(24, L.h * k); sdM(L); L.x = cx - L.w / 2; }
  else { const cx = L.x + L.w / 2, cy = L.y + (L.h || 0) / 2; L.w = Math.max(24, L.w * k); L.h = Math.max(24, (L.h || 0) * k); sdM(L); L.x = cx - L.w / 2; L.y = cy - L.h / 2; }
  SDOC.edited = true; sdChanged(); sdOverlay(); sePlaceEditor();
};

/* ---------- type right on the poster ---------- */
let SE_ED = null;   // { id, key }
function sePlaceEditor() {
  const ta = $('.se-inline'), L = SE_ED && sdLayer(SE_ED.id), wrap = $('#sdWrap'); if (!ta || !L || !wrap) return;
  const s = sdScale(), W = wrap.clientWidth, w = Math.min(W, Math.max(L.w * s + 12, Math.min(260, W))), left = Math.max(0, Math.min(L.x * s - 6, W - w));
  Object.assign(ta.style, { left: left + 'px', top: Math.max(0, L.y * s - 6) + 'px', width: w + 'px', minHeight: Math.max((L.h || 0) * s + 12, 46) + 'px', fontSize: Math.max(16, Math.min(34, L.size * s)) + 'px', textAlign: L.t === 'text' ? (L.align || 'left') : 'left', fontWeight: L.weight || 600 });
}
function seEditOpen(selectAll, py) {
  const L = sdSel(), wrap = $('#sdWrap'); if (!L || !wrap || !SE_TEXTY[L.t]) return false;
  seEditClose();
  const key = L.t === 'card' ? (py != null && L.body && py > L.y + (L.h || 0) * .42 ? 'body' : 'title') : 'text';
  SE_ED = { id: L.id, key }; sdPush();
  const ta = document.createElement('textarea'); ta.className = 'se-inline'; ta.setAttribute('aria-label', 'พิมพ์แก้ข้อความบนโปสเตอร์'); ta.value = L[key] || ''; ta.rows = 1;
  ta.addEventListener('input', () => { const X = sdLayer(SE_ED.id); if (!X) return; X[SE_ED.key] = ta.value; sdM(X); sdLayerToBrief(X); sdChanged(); sdOverlay(); sePlaceEditor(); const f = $(`#sdProps [data-lp="${SE_ED.key}"]`); if (f && f.value !== ta.value) f.value = ta.value; });
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key === 'Enter' && L.t === 'chip')) { e.preventDefault(); seEditClose(); } });
  ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta) seEditClose(); }, 150));
  ['pointerdown', 'dblclick'].forEach(ev => ta.addEventListener(ev, e => e.stopPropagation()));
  wrap.appendChild(ta); sePlaceEditor(); ta.focus({ preventScroll: true });
  try { if (selectAll) ta.select(); else ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { }
  return true;
}
function seEditClose() { const ta = $('.se-inline'); if (ta) ta.remove(); if (!SE_ED) return; SE_ED = null; sdPaint(); sdProps(); }
addEventListener('resize', sePlaceEditor);

/* ---------- view: add the quick bar, restore fonts ---------- */
const _sdViewBase = V.poster;
V.poster = (root, force) => {
  const had = !!$('#sdRoot', root); _sdViewBase(root, force);
  if (had && !force) return;
  SE_ED = null;
  const tb = $('.sd-toolbar', root);
  if (tb && !$('#sdQuick', root)) { const q = document.createElement('div'); q.id = 'sdQuick'; q.className = 'se-quick'; q.setAttribute('role', 'toolbar'); q.setAttribute('aria-label', 'เครื่องมือแก้ไขชิ้นที่เลือก'); tb.insertAdjacentElement('afterend', q); }
  seQuick(); seEnsureFonts();
};
