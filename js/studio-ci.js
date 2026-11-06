'use strict';
/* ============================================================
   Poster Studio · Krungthai-AXA CI rules (from Logo_Font_CI_Guidelines)
   Core: AXA Blue · White · AXA Red   Tints: Red/Blue Tint 1-3 · Light/Dark grey · Black
   Data palette: infographic elements only — never backgrounds, headlines, body copy or hero moments.
   Gradients: only the 8 approved blue pairs — never your own.
   Type: Publico (headlines) · Source Sans Pro (body) · DB Helvethaica X (Thai) — no new typefaces,
   no all caps titles, no italics, no justified text, one size per headline.
   ============================================================ */
const CI = {
  core: [['#00008F', 'AXA Blue'], ['#FFFFFF', 'White'], ['#FF1721', 'AXA Red']],
  tints: [['#FFEAEA', 'Red Tint 1'], ['#FF4E56', 'Red Tint 2'], ['#750707', 'Red Tint 3'], ['#E2EFFF', 'Blue Tint 1'], ['#6574F8', 'Blue Tint 2'], ['#0C0E45', 'Blue Tint 3'], ['#E6E6E6', 'Light grey'], ['#999999', 'Dark grey'], ['#0E0E0E', 'Black']],
  data: [['#FFB4CE', 'Cotton Candy'], ['#FF9C62', 'Coral'], ['#FFF06C', 'Sunshine'], ['#58C645', 'Leaf'], ['#81EEBB', 'Mint'], ['#74BDE8', 'Sky'], ['#A30245', 'Cherry'], ['#0F717F', 'Teal'], ['#614FE8', 'Grape']],
  gradients: [   // [top, bottom, label] — the approved pairs (direction may flip)
    ['#6574F8', '#00008F', 'Blue Tint 2 → AXA Blue'], ['#00008F', '#0C0E45', 'AXA Blue → Blue Tint 3'], ['#0C0E45', '#6574F8', 'Blue Tint 3 → Blue Tint 2'], ['#6574F8', '#E2EFFF', 'Blue Tint 2 → Blue Tint 1'],
    ['#00008F', '#6574F8', 'AXA Blue → Blue Tint 2'], ['#0C0E45', '#00008F', 'Blue Tint 3 → AXA Blue'], ['#6574F8', '#0C0E45', 'Blue Tint 2 → Blue Tint 3'], ['#E2EFFF', '#6574F8', 'Blue Tint 1 → Blue Tint 2'],
  ],
};
const CI_HEX = h => String(h || '').toUpperCase();
const CI_IN = (list, h) => list.some(([v]) => CI_HEX(v) === CI_HEX(h));
const CI_TEXT = [...CI.core, ...CI.tints];            // allowed for type
const CI_ALL = [...CI.core, ...CI.tints, ...CI.data];  // allowed anywhere else (data = infographic only)
/* background themes the user can pick — all on-brand */
const SD_THEMES = {
  grad:  { name: 'ไล่ฟ้า', sub: 'Blue Tint 1 → 2', bg: { c1: '#E2EFFF', c2: '#6574F8' }, dark: false },
  tint:  { name: 'ฟ้าอ่อน', sub: 'Blue Tint 1', bg: { c1: '#E2EFFF', c2: '#E2EFFF' }, dark: false },
  white: { name: 'ขาว', sub: 'White', bg: { c1: '#FFFFFF', c2: '#FFFFFF' }, dark: false },
  deep:  { name: 'น้ำเงินเข้ม', sub: 'AXA Blue → Blue Tint 3', bg: { c1: '#00008F', c2: '#0C0E45' }, dark: true },
};
const sdTheme = b => SD_THEMES[b && b.theme] || SD_THEMES.grad;

/* contrast (WCAG) for legibility checks */
function ciLum(h) { const n = parseInt(CI_HEX(h).replace('#', '').slice(0, 6), 16); if (isNaN(n)) return 1; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(n >> 16 & 255) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255); }
const ciContrast = (a, b) => { const x = ciLum(a), y = ciLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const ciMix = (a, b, t) => pbMix(CI_HEX(a), CI_HEX(b), t);

/* Art-director check before export: returns [{level, text}] */
function sdCiCheck(doc) {
  const out = [], W = PB_FORMATS[doc.format][2], H = PB_FORMATS[doc.format][3], bg = doc.bg || {};
  const add = (level, text) => { if (!out.some(o => o.text === text)) out.push({ level, text }); };
  const pair = [CI_HEX(bg.c1), CI_HEX(bg.c2 || bg.c1)];
  const okBg = pair[0] === pair[1] ? CI_IN([...CI.core.filter(c => c[1] !== 'AXA Red'), ...CI.tints], pair[0]) : CI.gradients.some(([a, b]) => (CI_HEX(a) === pair[0] && CI_HEX(b) === pair[1]) || (CI_HEX(a) === pair[1] && CI_HEX(b) === pair[0]));
  if (!okBg) add('error', 'พื้นหลังไม่ใช่สี/ไล่เฉดที่ CI อนุมัติ — ใช้ White, Blue Tint 1 หรือไล่เฉดสายน้ำเงิน 8 คู่เท่านั้น');
  if (CI_IN(CI.data, pair[0]) || CI_IN(CI.data, pair[1])) add('error', 'ห้ามใช้สี Data palette เป็นพื้นหลัง');
  const bgAt = y => ciMix(pair[0], pair[1], Math.max(0, Math.min(1, y / H)));
  (doc.layers || []).forEach(L => {
    if (L.hide) return;
    const area = (L.w || 0) * (L.h || 0) / (W * H);
    if (L.t === 'text') {
      if (L.color && !CI_IN(CI_TEXT, L.color)) add('error', CI_IN(CI.data, L.color) ? 'ห้ามใช้สี Data palette กับตัวอักษร (หัวข้อ / เนื้อหา)' : 'มีสีตัวอักษรนอกชุด CI');
      if (L.ff && !['head', 'body'].includes(L.ff)) add('error', 'มีฟอนต์นอก CI — ใช้ได้เฉพาะ Publico / Source Sans Pro / DB Helvethaica X');
      if (L.role === 'headline' && /[A-Z]{4,}/.test(L.text || '') && L.text === String(L.text).toUpperCase()) add('warn', 'หัวข้อเป็นตัวพิมพ์ใหญ่ทั้งหมด — CI ไม่ให้ใช้ All caps');
      const cy = L.y + (L.h || 0) / 2, onBand = bg.band && cy < bg.band.h, under = L.pill || null, ink = L.color || '#00008F', base = under || (onBand ? bg.band.c1 : bgAt(cy));
      if (!L.pill && ciContrast(ink, base) < 3) add('warn', `ตัวอักษร “${String(L.text || '').slice(0, 18)}…” สีกลืนกับพื้นหลัง — อ่านยาก`);
    }
    if (['shape', 'card', 'chip', 'list', 'circ'].includes(L.t) && L.fill) {
      if (!CI_IN(CI_ALL, L.fill) && !/^rgba/.test(L.fill)) add('error', 'มีสีของรูปทรง/กล่องนอกชุด CI');
      if (CI_HEX(L.fill) === '#FF1721' && area > .12) add('error', 'ห้ามใช้ AXA Red เป็นพื้นหลัง (ใช้เป็นจุดเน้นเล็ก ๆ ได้)');
      if (CI_IN(CI.data, L.fill) && area > .2) add('warn', 'สี Data palette ใช้กับองค์ประกอบ infographic ขนาดเล็ก ไม่ใช่พื้นที่ใหญ่');
      const ink = L.t === 'chip' ? L.ink : L.titleInk || L.ink;
      if (ink && CI_IN(CI.data, ink)) add('error', 'ห้ามใช้สี Data palette กับตัวอักษร');
      if (ink && /^#/.test(ink) && ciContrast(ink, L.fill) < 3) add('warn', 'ตัวอักษรบนกล่องสีอ่านยาก — เลือกคู่สีที่ตัดกันมากขึ้น');
    }
  });
  return out;
}
/* CI guide shown in CI Control */
function sdCiGuideHtml() {
  const sw = list => `<div class="ci-sw">${list.map(([v, n]) => `<span><i style="background:${v}"></i><b>${n}</b><small>${v}</small></span>`).join('')}</div>`;
  return `<details class="ci-guide"><summary>แนวทางสีและตัวอักษร (CI Krungthai-AXA)</summary>
    <h5>Core colours</h5>${sw(CI.core)}
    <h5>Tints palette — สีรอง ใช้เป็นพื้นหลังและรายละเอียด</h5>${sw(CI.tints)}
    <h5>Data palette — ใช้กับ infographic / กราฟเท่านั้น</h5>${sw(CI.data)}
    <h5>Gradients — ใช้เฉพาะ 8 คู่นี้ (กลับทิศบน-ล่างได้)</h5><div class="ci-gr">${CI.gradients.map(([a, b, n]) => `<span style="background:linear-gradient(${a},${b})"><small>${n}</small></span>`).join('')}</div>
    <h5>สิ่งที่ห้ามทำ</h5><ul class="ci-dont">
      <li>ห้ามเพิ่มสีใหม่นอกชุด CI</li><li>ห้ามใช้สี Data กับหัวข้อ เนื้อหา หรือภาพหลัก (hero)</li><li>ห้ามใช้ Data palette และ AXA Red เป็นพื้นหลัง</li><li>ห้ามสร้าง gradient เอง</li><li>คู่สีต้องอ่านง่ายเสมอ</li>
      <li>ห้ามเพิ่มฟอนต์ใหม่ — หัวข้อ Publico / เนื้อหา Source Sans Pro / ไทย DB Helvethaica X</li><li>ห้ามใช้ Publico กับเนื้อหา และห้ามใช้ Source Sans กับหัวข้อ</li><li>ห้ามตัวพิมพ์ใหญ่ทั้งหมด ห้ามตัวเอียง ห้ามจัดชิดขอบสองด้าน</li><li>หัวข้อหนึ่งชุดใช้ขนาดเดียว</li></ul>
    <p class="small muted">Poster Studio บังคับกฎเหล่านี้ให้อัตโนมัติ และตรวจซ้ำอีกครั้งก่อน Export</p></details>`;
}
