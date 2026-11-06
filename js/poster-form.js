'use strict';
/* Editor form for the Infographic poster template (sections, characters, colours) */
function pbInfoForm() {
  const st = PST, f = st.f, secs = st.secs || [], notes = st.template === 'notes';
  const chars = cur => `${opt('auto', 'อัตโนมัติ (ตามเนื้อหา)', cur)}${PA_ORDER.map(k => opt(k, PA_CHARS[k][0], cur)).join('')}${opt('none', 'ไม่มีภาพ (ข้อความล้วน)', cur)}`;
  const card = (s, i) => {
    const cur = s.color || (notes ? PN_ORDER[i % 4] : PA_COL_ORDER[i % 5]), tone = key => notes ? PN_PAPER[key] : PA_COLS[key][1];
    return `<div class="pb-sec" style="--sc:${tone(cur)}">
      <div class="pb-sec-h"><b>หัวข้อที่ ${i + 1}</b><span class="pb-sec-acts">
        <button type="button" class="icon-btn" data-act="pbSecMove" data-id="${i}:-1" aria-label="เลื่อนขึ้น" ${i === 0 ? 'disabled' : ''}>${ico('up', 14)}</button>
        <button type="button" class="icon-btn" data-act="pbSecMove" data-id="${i}:1" aria-label="เลื่อนลง" ${i === secs.length - 1 ? 'disabled' : ''}>${ico('down', 14)}</button>
        <button type="button" class="icon-btn" data-act="pbSecDel" data-id="${i}" aria-label="ลบหัวข้อ">${ico('trash', 14)}</button></span></div>
      <input data-ps="${i}.title" value="${esc(s.title)}" placeholder="หัวข้อ เช่น OPD = ผู้ป่วยนอก" maxlength="80" aria-label="หัวข้อ">
      <textarea data-ps="${i}.body" rows="3" maxlength="400" placeholder="${notes ? 'ข้อย่อย — 1 บรรทัด = 1 ข้อ' : 'คำอธิบายสั้น ๆ 2–3 บรรทัด'}" aria-label="คำอธิบาย">${esc(s.body)}</textarea>
      ${notes ? '' : `<input data-ps="${i}.tag" value="${esc(s.tag)}" placeholder="ป้ายสรุปคร่อมขอบการ์ด (ไม่บังคับ) เช่น คุ้มครองในวงเงิน OPD*" maxlength="60" aria-label="ป้ายสรุป">`}
      <div class="pb-sec-row">${notes ? '<span class="muted small">แต่ละบรรทัดในช่องคำอธิบาย = 1 ข้อ</span>' : `<label class="pb-sec-sel"><span>ตัวละคร</span><select data-ps="${i}.char">${chars(s.char || 'auto')}</select></label>`}
        <span class="pb-sw" role="group" aria-label="สีการ์ด">${PA_COL_ORDER.map(key => `<button type="button" class="${key === cur ? 'on' : ''}" style="background:${tone(key)}" data-act="pbSecColor" data-id="${i}:${key}" aria-label="สี${PA_COLS[key][0]}" aria-pressed="${key === cur}"></button>`).join('')}</span></div>
    </div>`;
  };
  return `<div class="form-grid">
      <label class="field full"><span>Headline <em>*</em> <small>(Enter = ขึ้นบรรทัดใหม่ · 3 บรรทัด: บรรทัดกลางอยู่บนแถบเข้ม · 2 บรรทัด: บรรทัดแรกอยู่บนแถบเข้ม)</small></span><textarea data-pf="headline" class="pb-big" rows="3" maxlength="160" placeholder="${esc(PB_FIELD_HINT.info.headline)}">${esc(f.headline)}</textarea></label>
    </div>
    <div class="pb-sub mt">${notes ? 'โน้ต' : 'หัวข้อและตัวละคร'} <small class="muted">— 1–4 ${notes ? 'โน้ต เรียงให้เองแบบแปะบนบอร์ด' : 'หัวข้อ ตัวละครสลับซ้าย–ขวาให้เอง'}</small></div>
    <div class="pb-secs">${secs.map(card).join('')}${secs.length < 4 ? `<button type="button" class="btn btn-ghost" data-act="pbSecAdd">${ico('plus', 15)} เพิ่มหัวข้อ</button>` : ''}</div>
    <div class="form-grid mt">
      <label class="field full"><span>ข้อความปิดท้าย <small>(${notes ? 'ข้างรูป QR ด้านล่างซ้าย' : 'ตัวหนา ด้านล่างซ้าย'})</small></span><textarea data-pf="sub" rows="3" maxlength="300" placeholder="เช่น สำหรับลูกค้ากรุงไทย-แอกซ่า ประกันชีวิต รักษาแบบไหนก็อุ่นใจ">${esc(f.sub)}</textarea></label>
      <label class="field full"><span>${notes ? 'โน้ตสีขาว (เคล็ดลับ)' : 'การ์ดเขียวข้าง QR'} <small>(บรรทัดแรก = ${notes ? 'ป้ายแดง เช่น เลือกอย่างไรดี?' : 'หัวข้อ'} · บรรทัดต่อไป = รายละเอียด)</small></span><textarea data-pf="cta" rows="3" maxlength="300" placeholder="เช่น เลือกประกันสุขภาพให้ดี (Enter) ต้องเลือกที่ครอบคลุมทั้ง OPD และ IPD">${esc(f.cta)}</textarea></label>
    </div>`;
}
const paSecs = () => (PST.secs = PST.secs || []);
const paBlankSec = () => ({ title: '', body: '', tag: '', char: 'auto', color: '' });
ACT.pbSecAdd = () => { const a = paSecs(); if (a.length >= 4) return; a.push(paBlankSec()); pbTouch(); pbRender(); };
ACT.pbSecDel = el => { const a = paSecs(), i = +el.dataset.id; if (a.length <= 1) a[0] = paBlankSec(); else a.splice(i, 1); pbTouch(); pbRender(); };
ACT.pbSecMove = el => { const a = paSecs(), [i, d] = el.dataset.id.split(':').map(Number), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; pbTouch(); pbRender(); };
ACT.pbSecColor = el => { const [i, key] = el.dataset.id.split(':'); const a = paSecs(); if (a[+i]) a[+i].color = key; pbTouch(); pbRender(); };
