'use strict';
/* ============================================================
   CI Poster Builder — communications posters on the corporate CI
   1) template + size  2) content  3) AI tidies the copy (facts locked)
   4) preview & adjust  5) export PNG / JPG (review checkbox every time)
   The layout is computed from the canvas size, so switching format
   re-flows the same content (text auto-fits, visual moves aside/above).
   ============================================================ */

/* ---------- vocabulary ---------- */
const PB_TEMPLATES = {   // key: [English name, Thai, default scene, default style, default accent]
  info: ['Infographic', 'การ์ดอธิบาย + ตัวละคร', 'checklist', 'white', 'primary'],
  notes: ['Checklist Notes', 'โน้ตกระดาษแปะ + เช็กลิสต์', 'checklist', 'pink', 'primary'],
  announce: ['Announcement', 'ข่าวประกาศ', 'announce', 'deep', 'sky'],
  event: ['Event & Invitation', 'เชิญร่วมกิจกรรม', 'event', 'sky', 'red'],
  campaign: ['Campaign', 'แคมเปญ / กระตุ้นยอด', 'campaign', 'lavender', 'red'],
  howto: ['How-to & Tips', 'ขั้นตอน / ความรู้สั้น ๆ', 'checklist', 'sky', 'sky'],
  recognition: ['Recognition', 'ผลงานและการแสดงความยินดี', 'award', 'deep', 'sky'],
};
const PB_FORMATS = {   // key: [label, ratio, W, H, use]
  square: ['Square', '1:1', 1080, 1080, 'LINE · Facebook'],
  portrait: ['Portrait', '4:5', 1080, 1350, 'Facebook Feed'],
  story: ['Story', '9:16', 1080, 1920, 'Story · Reels'],
  landscape: ['Landscape', '16:9', 1920, 1080, 'จอ · พรีเซนต์'],
};
const PB_FIELD_HINT = {
  notes: { headline: 'เช่น 3 เรื่องต้องเช็ก (Enter) ก่อนซื้อประกันสุขภาพ (Enter) เพื่อความมั่นใจมากขึ้น', content: '' },
  info: { headline: 'เช่น อยากซื้อประกันต้องรู้! (Enter) OPD, IPD และ Day Surgery (Enter) ต่างกันยังไง?', content: '' },
  announce: { headline: 'บรรทัดแรก = แถบเน้น · ขึ้นบรรทัดใหม่ = ข้อความตัวใหญ่ต่อ', content: 'รายละเอียด — ขึ้นบรรทัดใหม่ = 1 ข้อ' },
  event: { headline: 'เช่น ขอเชิญร่วมงาน (Enter) Agency Kick-off 2027', content: 'ไฮไลต์ของงาน / Agenda — ขึ้นบรรทัดใหม่ = 1 ข้อ' },
  campaign: { headline: 'เช่น ปิดยอดปลายปี (Enter) รับรางวัลพิเศษ', content: 'กติกาหลัก / สิ่งที่ได้รับ — ขึ้นบรรทัดใหม่ = 1 ข้อ', highlight: ['ตัวเลขเด่น', 'เช่น รับเพิ่ม 2 เท่า หรือ 5,000 บาท'] },
  howto: { headline: 'เช่น 3 เรื่องต้องเช็ก (Enter) ก่อนซื้อประกันสุขภาพ', content: 'แต่ละขั้นตอน — ขึ้นบรรทัดใหม่ = 1 ขั้น (เรียงตามลำดับ)' },
  recognition: { headline: 'เช่น ขอแสดงความยินดี', content: 'ผลงาน / คำชื่นชม — ขึ้นบรรทัดใหม่ = 1 ข้อ', highlight: ['ชื่อผู้ได้รับรางวัล / ทีม', 'เช่น คุณสมหญิง ใจดี · ทีม Agency North'] },
};
const PB_STYLES = {   // CI-approved backgrounds — [name, Thai, dark?]
  deep: ['AXA Blue', 'น้ำเงิน AXA', 1], lavender: ['Blue Tint 2', 'น้ำเงินกลาง', 1], sky: ['Blue Tint 1', 'ฟ้าอ่อน', 0], pink: ['Red Tint 1', 'ชมพูอ่อน', 0], white: ['White', 'ขาว', 0], photo: ['Photo', 'รูปเต็มพื้นหลัง', 1],
};
const PB_ACCENTS = { sky: 'Blue Tint 2', red: 'AXA Red', primary: 'AXA Blue' };
/* poster icons — single SVG path strings on a 24 grid (drawn with Path2D, stroked) */
const PB_ICONS = {
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12',
  stethoscope: 'M5 3H4v6a5 5 0 0 0 10 0V3h-1 M9 14v1a6 6 0 0 0 12 0v-2 M21 9a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  syringe: 'M18 2l4 4 M20 4l-3 3 M15 5l4 4 M17 7L8 16H5v-3l9-9 M5 19l-3 3 M10 10l2 2 M12 8l2 2',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7z M8.5 8.5l7 7',
  hospital: 'M3 21h18 M5 21V7l7-4 7 4v14 M10 21v-4h4v4 M12 8v4 M10 10h4',
  cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  doctor: 'M12 2a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 22v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2 M15 16v4 M13 18h4',
  thermometer: 'M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z',
  umbrella: 'M22 12a10 10 0 0 0-20 0z M12 12v8a2 2 0 0 0 4 0 M12 2v1',
  shieldPlus: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v6 M9 11h6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  family: 'M7 3a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z M17 3a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z M12 11a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M3 21v-6a4 4 0 0 1 7-2.6 M21 21v-6a4 4 0 0 0-7-2.6 M9 21v-2a3 3 0 0 1 6 0v2',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5',
  clipboard: 'M9 2h6v4H9z M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3 M8 13l2 2 4-4 M8 18h8',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4 M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z M16 14h.01',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  virus: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9L7 7 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
  drop: 'M12 2.7l5.7 5.6a8 8 0 1 1-11.3 0z',
  mask: 'M3 8c3 0 6-2 9-2s6 2 9 2v5c0 3-4 6-9 6s-9-3-9-6z M7 11h10 M8 14h8',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  rain: 'M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3 M8 19v2 M8 13v2 M16 19v2 M16 13v2 M12 15v2 M12 21v1',
  plane: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
  clock: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M12 6v6l4 2',
  pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z M12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  trophy: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M17 5h3v2a3 3 0 0 1-3 3 M7 5H4v2a3 3 0 0 0 3 3',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  gift: 'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8z M12 8h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8z',
  target: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12z M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  bulb: 'M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z',
  rocket: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0 M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  chart: 'M3 3v18h18 M7 15l4-4 3 3 6-7 M16 7h4v4',
  book: 'M2 4h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 4h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  check: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M8 12l3 3 5-6',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  coin: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5 M12 6.5V8 M12 16v1.5',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  info: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M12 16v-4 M12 8h.01',
};
const pbIconSvg = (k, s = 20) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PB_ICONS[k] || ''}"/></svg>`;
/* scenes: illustration that matches the content — [Thai label, hero icon, 3 floating badges, keyword pattern] */
const PB_SCENES = {
  health: ['สุขภาพทั่วไป', 'stethoscope', ['heart', 'pulse', 'cross'], /สุขภาพ|ตรวจสุขภาพ|health|check.?up|ป่วย|โรค/i],
  vaccine: ['วัคซีน / ป้องกันโรค', 'syringe', ['shieldPlus', 'virus', 'check'], /วัคซีน|ฉีด|vaccine|ภูมิคุ้มกัน|ไข้หวัด|งูสวัด|rsv/i],
  hospital: ['โรงพยาบาล / เคลม', 'hospital', ['cross', 'clipboard', 'doctor'], /โรงพยาบาล|รพ\.|เคลม|claim|ผ่าตัด|opd|ipd|นอนโรงพยาบาล|surgery/i],
  doctor: ['ปรึกษาแพทย์', 'doctor', ['chat', 'stethoscope', 'phone'], /แพทย์|หมอ|doctor|ปรึกษา|consult/i],
  telehealth: ['แอป / ออนไลน์', 'phone', ['chat', 'doctor', 'pill'], /แอป|app|ออนไลน์|online|telehealth|emma|line|ดาวน์โหลด/i],
  medicine: ['ยา / อาการป่วย', 'pill', ['thermometer', 'drop', 'clipboard'], /ยา|อาการ|ไข้|ปวด|ท้องเสีย|เจ็บ/i],
  protect: ['ความคุ้มครอง / ประกัน', 'umbrella', ['shieldPlus', 'heart', 'family'], /คุ้มครอง|ประกัน|กรมธรรม์|insurance|ความเสี่ยง|ปลอดภัย/i],
  family: ['ครอบครัว', 'family', ['heart', 'umbrella', 'shieldPlus'], /ครอบครัว|ลูก|พ่อแม่|ผู้สูงวัย|เด็ก|family/i],
  money: ['ค่าใช้จ่าย / ผลตอบแทน', 'wallet', ['coin', 'chart', 'shield'], /ค่าใช้จ่าย|ค่ารักษา|บาท|เงิน|เบี้ย|ราคา|โบนัส|คอมมิชชั่น|commission|incentive|ลดหย่อน/i],
  time: ['ระยะเวลา / กำหนดการ', 'clock', ['calendar', 'check', 'clipboard'], /ระยะเวลา|รอคอย|ภายใน|deadline|กำหนด|เวลา/i],
  checklist: ['ขั้นตอน / เช็กลิสต์', 'clipboard', ['check', 'bulb', 'pin'], /ขั้นตอน|วิธี|เช็ก|เช็ค|how.?to|tips|เคล็ดลับ|ต้องรู้/i],
  event: ['งาน / กิจกรรม', 'calendar', ['mic', 'users', 'pin'], /งาน|กิจกรรม|event|สัมมนา|ประชุม|kick.?off|เชิญ|อบรม/i],
  award: ['รางวัล / ยินดี', 'trophy', ['star', 'sparkles', 'flag'], /รางวัล|ยินดี|award|congrat|ชื่นชม|แชมป์|ผลงาน/i],
  campaign: ['แคมเปญ / เป้าหมาย', 'target', ['coin', 'gift', 'chart'], /แคมเปญ|campaign|เป้า|ยอดขาย|ปิดยอด|โปรโมชั่น|promotion/i],
  travel: ['เดินทาง', 'plane', ['pin', 'shieldPlus', 'phone'], /เดินทาง|ต่างประเทศ|travel|ท่องเที่ยว|เที่ยว/i],
  weather: ['ฤดูกาล / หน้าฝน', 'rain', ['drop', 'virus', 'thermometer'], /ฝน|หน้าฝน|น้ำท่วม|น้ำลด|ไข้เลือดออก|ยุง|อากาศเปลี่ยน/i],
  air: ['อากาศ / PM 2.5', 'mask', ['virus', 'eye', 'heart'], /pm ?2\.?5|ฝุ่น|หน้ากาก|มลพิษ|ทางเดินหายใจ/i],
  announce: ['ประกาศทั่วไป', 'megaphone', ['bell', 'info', 'check'], /ประกาศ|แจ้ง|announce|เปลี่ยนแปลง|ปรับ/i],
};
/* zero-token scene pick: the first scene whose words appear most in the copy */
function pbAutoScene(st) {
  const f = st.f, t = [f.keyword, f.headline, f.headline, f.sub, f.content, f.highlight].join(' ');
  let best = null, n = 0;
  for (const [key, s] of Object.entries(PB_SCENES)) { const m = (t.match(new RegExp(s[3].source, 'gi')) || []).length; if (m > n) { n = m; best = key; } }
  return best || PB_TEMPLATES[st.template][2];
}
const pbSceneOf = st => (st.scene && st.scene !== 'auto' && PB_SCENES[st.scene]) ? st.scene : pbAutoScene(st);

/* ---------- CI (set by Admin / Brand team, shared with everyone) ---------- */
const PB_BRAND_DEFAULT = {   // values from the Krungthai-AXA Logo/Font/CI guidelines (core + tints palette)
  org: 'Krungthai-AXA', footer: '', logo: 'assets/brand/ktaxa-logo.png', logoWhite: 'assets/brand/ktaxa-logo-bordered.png',   // official files from the Logo/Font/CI guidelines
 
  colors: { primary: '#00008F', sky: '#6574F8', red: '#FF1721', lavender: '#6574F8', pink: '#FFEAEA', paper: '#E2EFFF', navy: '#0C0E45', ink: '#0E0E0E' },
};
const PB_COLOR_LABEL = { primary: 'AXA Blue (หลัก)', sky: 'Blue Tint 2 (สีเน้น)', red: 'AXA Red', lavender: 'Blue Tint 2 (พื้น)', pink: 'Red Tint 1 (พื้น)', paper: 'Blue Tint 1 (พื้น)', navy: 'Blue Tint 3', ink: 'Black (ตัวอักษร)' };
const pbBrand = () => { const b = S().settings.brand || {}; return { ...PB_BRAND_DEFAULT, ...b, logo: b.logo || PB_BRAND_DEFAULT.logo, logoWhite: b.logoWhite || PB_BRAND_DEFAULT.logoWhite, colors: { ...PB_BRAND_DEFAULT.colors, ...(b.colors || {}) } }; };
const PB_HEAD = '"Brand Serif", "DB HelvethaicaX", "DB Helvethaica X", "IBM Plex Sans Thai", "Source Sans Pro", -apple-system, sans-serif';   // Publico (Latin) + DB Helvethaica (Thai) when installed
const PB_BODY = '"Source Sans Pro", "IBM Plex Sans Thai", -apple-system, "Segoe UI", sans-serif';
const PB_THAI = '"DB HelvethaicaX", "DB Helvethaica X", "IBM Plex Sans Thai", "Source Sans Pro", -apple-system, sans-serif';

/* ---------- working state ---------- */
const pbBlank = () => ({
  id: uid('pst'), template: 'info', format: 'portrait', style: 'white', accent: 'primary', visual: 'none', scene: 'auto', icon: null, badges: null,
  secs: [{ title: '', body: '', tag: '', char: 'auto', color: '' }, { title: '', body: '', tag: '', char: 'auto', color: '' }, { title: '', body: '', tag: '', char: 'auto', color: '' }],
  photo: null, photoY: .5, qrUrl: '', qrImg: null, qrLabel: '',
  f: { keyword: '', headline: '', sub: '', content: '', highlight: '', date: '', dateEnd: '', time: '', venue: '', cta: '', note: '' },
  ai: null, reviewed: false, updated: 0,
});
let PST = pbBlank(), PB_MORE_OPEN = false;
const PB_IMG = new Map();   // dataURL → decoded Image

/* ---------- small helpers ---------- */
const pbThaiDigits = s => String(s || '').replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
const pbFacts = s => (pbThaiDigits(s).match(/\d[\d,.:/]*\d|\d/g) || []).map(x => x.replace(/,/g, '').replace(/[.:/]+$/, ''));
const pbPoints = s => String(s || '').split(/\n+/).map(x => x.replace(/^\s*(?:[-–•·*]|\d+[.)]|[๐-๙]+[.)])\s*/, '').trim()).filter(Boolean);
function pbDateText(f) {
  if (!f.date) return '';
  const a = parse(f.date), dow = TH_DOW_FULL[a.getDay()];
  if (!f.dateEnd || f.dateEnd === f.date) return `วัน${dow}ที่ ${a.getDate()} ${TH_MON_FULL[a.getMonth()]} ${a.getFullYear() + 543}`;
  const b = parse(f.dateEnd);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${b.getDate()} ${TH_MON_FULL[a.getMonth()]} ${a.getFullYear() + 543}`;
  return `${a.getDate()} ${TH_MON[a.getMonth()]} ${a.getFullYear() + 543} – ${b.getDate()} ${TH_MON[b.getMonth()]} ${b.getFullYear() + 543}`;
}
function pbImg(src) {   // decoded image (cached); triggers a repaint once it is ready
  if (!src) return null;
  if (PB_IMG.has(src)) { const im = PB_IMG.get(src); return im.complete && im.naturalWidth ? im : null; }
  const im = new Image(); PB_IMG.set(src, im); im.onload = () => { pbPaint(); if (typeof sdPaint === 'function' && $('#sdRoot')) { sdPaint(); sdGallery(); } }; im.src = src; return null;
}
function pbQr(text) {   // → { n, dark(r,c) } or null
  if (!text || typeof qrcode !== 'function') return null;
  try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make(); return { n: q.getModuleCount(), dark: (r, c) => q.isDark(r, c) }; } catch (e) { return null; }
}
function pbLoadImage(file, maxSide, png) {   // photo → JPEG; logo / QR → PNG (keeps transparency)
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('เลือกไฟล์รูปภาพ (JPG / PNG)'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = file.type === 'image/svg+xml' ? maxSide / Math.max(img.width, img.height) : Math.min(1, maxSide / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const g = cv.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
      g.drawImage(img, 0, 0, cv.width, cv.height);
      resolve(png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', .86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านรูปนี้ไม่ได้ — ลองไฟล์ JPG หรือ PNG')); };
    img.src = url;
  });
}
const pickFile = (accept = 'image/*') => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });

/* ============================================================
   Drawing — design language from the health-content posters:
   logo pair top-right · headline with a highlight bar on line 1 ·
   rounded white content cards · illustration that matches the content ·
   QR + caption box at the bottom · fine print last
   ============================================================ */
const pbLum = hex => { const n = parseInt(hex.replace('#', ''), 16), ch = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * ch((n >> 16) & 255) + .7152 * ch((n >> 8) & 255) + .0722 * ch(n & 255); };
const pbContrast = (a, b) => { const x = pbLum(a), y = pbLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const pbTextOn = fill => pbContrast(fill, '#FFFFFF') >= 2.6 ? '#FFFFFF' : '#0B0B45';
const pbMix = (a, b, t) => { const p = h => [0, 2, 4].map(i => parseInt(h.replace('#', '').slice(i, i + 2), 16)), x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
function pbPalette(st, B, hasPhoto) {
  const c = B.colors, style = st.style === 'photo' && !hasPhoto ? 'deep' : st.style, dark = !!PB_STYLES[style]?.[2];
  const bg = { deep: [c.primary, c.navy], lavender: [c.lavender, pbMix(c.lavender, c.primary, .4)], sky: [c.paper, '#FFFFFF'], pink: [c.pink, '#FFFFFF'], white: ['#FFFFFF', '#FFFFFF'], photo: [c.primary, c.primary] }[style] || [c.primary, c.primary];
  const acc = c[st.accent] || c.sky;
  return {
    c, style, dark, bg,
    head: dark ? '#FFFFFF' : c.primary,                         // plain headline lines
    boxBg: style === 'deep' ? '#FFFFFF' : c.primary,            // highlight bar behind headline line 1
    boxInk: style === 'deep' ? c.primary : '#FFFFFF',
    sub: dark ? 'rgba(255,255,255,.9)' : hexA(c.ink, .78), mute: dark ? 'rgba(255,255,255,.72)' : hexA(c.ink, .55),
    card: style === 'white' ? c.paper : 'rgba(255,255,255,.96)', cardShadow: style !== 'white',
    title: c.primary, text: c.ink, acc, accInk: pbTextOn(acc),
  };
}
function pbKit(g) {
  const k = {
    g,
    font: (w, px, fam) => { g.font = `${w} ${Math.round(px * 10) / 10}px ${fam || PB_BODY}`; },
    rr: (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); },
    shadow: (on, blur = 30, dy = 10, a = .18) => { g.shadowColor = on ? `rgba(0,0,60,${a})` : 'transparent'; g.shadowBlur = on ? blur : 0; g.shadowOffsetY = on ? dy : 0; },
    segs: t => {
      const raw = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(String(t))].map(x => x.segment) : String(t).split(/(\s+)/);
      const out = [];
      raw.forEach(x => {
        if (!out.length) return out.push(x);
        if (/^\s+$/.test(x) || /^[)\]}.,!?:;%”’'"…\-–]+$/.test(x)) out[out.length - 1] += x;
        else if (/[(\[{“‘'"]$/.test(out[out.length - 1]) && !/\s$/.test(out[out.length - 1])) out[out.length - 1] += x;
        else if (/^\d/.test(x) && /\S$/.test(out[out.length - 1]) && /\d$/.test(out[out.length - 1])) out[out.length - 1] += x;
        else out.push(x);
      });
      return out;
    },
    wrap: (t, max) => {   // word-aware; never drops text; balances 2-line results
      const lines = [];
      String(t || '').split('\n').forEach(par => {
        const segs = k.segs(par), out = []; let cur = '';
        const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
        segs.forEach(seg => {
          if (g.measureText(cur + seg).width <= max) { cur += seg; return; }
          if (cur.trim()) push();
          if (g.measureText(seg.trimEnd()).width <= max) { cur = seg.trimStart(); return; }
          for (const ch of [...seg]) { if (g.measureText(cur + ch).width > max && cur) push(); cur += ch; }
        });
        push();
        if (out.length === 2 && segs.length > 1) {
          let best = null;
          for (let b = 1; b < segs.length; b++) {
            const a1 = segs.slice(0, b).join('').trim(), a2 = segs.slice(b).join('').trim(), w1 = g.measureText(a1).width, w2 = g.measureText(a2).width;
            if (w1 <= max && w2 <= max && (!best || Math.max(w1, w2) < best[0])) best = [Math.max(w1, w2), a1, a2];
          }
          if (best) { out[0] = best[1]; out[1] = best[2]; }
        }
        lines.push(...out);
      });
      return lines;
    },
    icon: (name, x, y, size, color, lw = 2) => {
      const d = PB_ICONS[name]; if (!d) return;
      g.save(); g.translate(x, y); g.scale(size / 24, size / 24); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
      g.stroke(new Path2D(d)); g.restore();
    },
    plus: (x, y, s, color) => { g.fillStyle = color; g.fillRect(x - s / 2, y - s / 6, s, s / 3); g.fillRect(x - s / 6, y - s / 2, s / 3, s); },
  };
  return k;
}
/* text block: measure (draw=false) or draw; returns height */
function pbText(k, t, { x = 0, y = 0, w, size, weight = 600, fam, color, lh = 1.3, draw, align = 'left' }) {
  if (!t) return 0;
  k.font(weight, size, fam || PB_THAI); const lines = k.wrap(t, w);
  if (draw) {
    k.g.fillStyle = color; k.g.textAlign = align; const ax = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
    lines.forEach((l, i) => k.g.fillText(l, ax, y + size * (0.92 + (lh - 1) / 2) + i * size * lh));
    k.g.textAlign = 'left';
  }
  return lines.length * size * lh;
}
/* background per CI style (no photo) */
function pbBackground(k, P, W, H, u) {
  const { g } = k, gr = g.createLinearGradient(0, 0, W * .4, H);
  gr.addColorStop(0, P.bg[0]); gr.addColorStop(1, P.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save();
  if (P.style === 'deep') {   // faint molecular network, like the health posters
    let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280, pts = [];
    for (let i = 0; i < 16; i++) pts.push([W * (.45 + rnd() * .6), H * rnd()]);
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 2 * u; g.beginPath();
    pts.forEach((p, i) => { const q = pts[(i * 7 + 3) % pts.length]; g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); }); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.16)'; pts.forEach(p => { g.beginPath(); g.arc(p[0], p[1], 6 * u, 0, Math.PI * 2); g.fill(); });
  } else if (P.style === 'lavender') {
    g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(W * .95, H * .1, Math.min(W, H) * .42, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(-W * .05, H * .95, Math.min(W, H) * .3, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = hexA(P.c.sky, P.style === 'white' ? .08 : .12); g.beginPath(); g.arc(W * .98, H * .04, Math.min(W, H) * .36, 0, Math.PI * 2); g.fill();
    k.plus(W * .06, H * .9, 26 * u, hexA(P.c.sky, .35)); k.plus(W * .92, H * .55, 18 * u, hexA(P.c.red, .3));
  }
  g.restore();
}
function pbPhotoBg(k, P, img, st, W, H, side) {
  const { g } = k, s = Math.max(W / img.width, H / img.height), pw = img.width * s, ph = img.height * s;
  g.drawImage(img, side ? W - pw : (W - pw) / 2, (H - ph) * st.photoY, pw, ph);   // side layouts: subject stays on the right, text side gets the shade
  const n = P.c.primary, gr = side ? g.createLinearGradient(0, 0, W, 0) : g.createLinearGradient(0, 0, 0, H);
  if (side) { gr.addColorStop(0, hexA(n, .9)); gr.addColorStop(.48, hexA(n, .62)); gr.addColorStop(.8, hexA(n, .05)); gr.addColorStop(1, hexA(n, 0)); }
  else { gr.addColorStop(0, hexA(n, .88)); gr.addColorStop(.42, hexA(n, .45)); gr.addColorStop(.62, hexA(n, .15)); gr.addColorStop(1, hexA(n, .55)); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
/* contextual illustration: hero object + 3 floating badges + medical marks */
function pbScene(k, st, P, x, y, w, h) {
  const { g } = k, key = pbSceneOf(st), sc = PB_SCENES[key], hero = st.icon || sc[1], badges = (st.badges && st.badges.length === 3 ? st.badges : sc[2]);
  const m = Math.min(w, h), cx = x + w / 2, cy = y + h / 2, r = m * .22, photo = pbImg(st.photo);
  g.save();
  g.fillStyle = P.dark ? 'rgba(255,255,255,.12)' : hexA(P.c.sky, .14); g.beginPath(); g.arc(cx, cy, m * .45, 0, Math.PI * 2); g.fill();
  g.fillStyle = hexA(P.acc, P.dark ? .3 : .16); g.beginPath(); g.arc(cx + m * .26, cy + m * .24, m * .14, 0, Math.PI * 2); g.fill();
  const markC = P.dark ? 'rgba(255,255,255,.55)' : hexA(P.c.sky, .6);
  k.plus(cx - m * .42, cy - m * .3, m * .06, markC); k.plus(cx + m * .44, cy - m * .08, m * .04, hexA(P.c.red, .7)); k.plus(cx - m * .3, cy + m * .42, m * .045, markC);
  if (/health|medicine|doctor|hospital/.test(key)) { g.strokeStyle = P.dark ? 'rgba(255,255,255,.35)' : hexA(P.c.sky, .45); g.lineWidth = m * .012; g.lineJoin = 'round'; g.beginPath(); const py = cy + r * 1.05, pts = [[-.48, 0], [-.2, 0], [-.12, -.12], [-.02, .12], [.06, -.2], [.14, 0], [.48, 0]]; pts.forEach(([a, b], i) => i ? g.lineTo(cx + a * m, py + b * m) : g.moveTo(cx + a * m, py + b * m)); g.stroke(); }
  if (photo && st.template === 'recognition' && P.style !== 'photo') {   // round portrait with a ring
    k.shadow(true, m * .06, m * .02); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cx, cy, r * 1.5, 0, Math.PI * 2); g.fill(); k.shadow(false);
    g.save(); g.beginPath(); g.arc(cx, cy, r * 1.38, 0, Math.PI * 2); g.clip();
    const s = Math.max(2.76 * r / photo.width, 2.76 * r / photo.height), pw = photo.width * s, ph = photo.height * s;
    g.drawImage(photo, cx - pw / 2, cy - r * 1.38 + (2.76 * r - ph) * st.photoY, pw, ph); g.restore();
  } else {
    k.shadow(true, m * .07, m * .025); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); k.shadow(false);
    g.strokeStyle = hexA(P.c.sky, .35); g.lineWidth = m * .008; g.beginPath(); g.arc(cx, cy, r * .86, 0, Math.PI * 2); g.stroke();
    k.icon(hero, cx - r * .52, cy - r * .52, r * 1.04, P.c.primary, 1.9);
  }
  const ring = photo && st.template === 'recognition' ? r * 1.5 : r, cols = [P.acc, P.c.red, P.c.primary];
  [-2.45, -.45, 2.2].forEach((a, i) => {
    const bx = cx + Math.cos(a) * ring * 1.5, by = cy + Math.sin(a) * ring * 1.5, br = r * .42;
    k.shadow(true, m * .04, m * .012, .16); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); k.shadow(false);
    k.icon(badges[i], bx - br * .55, by - br * .55, br * 1.1, cols[i] === '#FFFFFF' ? P.c.primary : cols[i], 2.2);
  });
  g.restore();
}
function pbLogos(k, P, B, x, y, h, right) {   // official Krungthai-AXA logo pair; right = true → x is the RIGHT edge. Returns width used
  const { g } = k, src = P.dark ? (B.logoWhite || B.logo) : (B.logo || B.logoWhite), im = pbImg(src);
  if (right) { k.font(700, h * .3, PB_BODY); const w0 = im ? im.width * h / im.height : g.measureText(B.org || 'LOGO').width + h * .6; x -= w0; }
  if (im) {
    const w = im.width * h / im.height;
    if (P.dark && !B.logoWhite) { g.fillStyle = '#FFFFFF'; k.rr(x - h * .08, y - h * .08, w + h * .16, h + h * .16, h * .1); g.fill(); }   // colour logo on a dark ground needs a white plate
    g.drawImage(im, x, y, w, h); return w;
  }
  k.font(700, h * .3, PB_BODY); const t = B.org || 'LOGO', tw = g.measureText(t).width, w = tw + h * .6;   // placeholder until the official file is uploaded
  g.fillStyle = '#FFFFFF'; k.rr(x, y + h * .2, w, h * .6, h * .12); g.fill();
  g.fillStyle = P.c.primary; g.fillText(t, x + h * .3, y + h * .6);
  return w;
}

/* the poster — everything is relative to the canvas size */
function pbDraw(cv, st, fmtKey) {
  if (st.template === 'info') return pbDrawInfo(cv, st, fmtKey);
  if (st.template === 'notes') return pbDrawNotes(cv, st, fmtKey);
  const fk = fmtKey || st.format, fm = PB_FORMATS[fk], W = fm[2], H = fm[3], B = pbBrand(), f = st.f, photo = pbImg(st.photo);
  const P = pbPalette(st, B, !!photo), photoBg = P.style === 'photo' && photo;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), k = pbKit(g), u = Math.min(W, H) / 1080, land = W / H > 1.2, story = H / W > 1.6;
  g.textBaseline = 'alphabetic';
  const M = 70 * u, safeT = story ? 120 * u : 0, safeB = story ? 150 * u : 0, bw = W - 2 * M;
  if (photoBg) pbPhotoBg(k, P, photo, st, W, H, !story); else pbBackground(k, P, W, H, u);

  /* header: logo lockup (fixed size) */
  const lh = 92 * u, top0 = M + safeT; if (B.logoPos === 'left') pbLogos(k, P, B, M, top0, lh); else pbLogos(k, P, B, W - M, top0, lh, true);
  const bottom = H - M - safeB;

  /* content pieces (measured at scale s) */
  const pts = pbPoints(f.content), date = pbDateText(f), qr = st.qrImg ? null : pbQr(safeUrl(st.qrUrl) || st.qrUrl.trim()), qrIm = pbImg(st.qrImg), hasQr = !!(qr || qrIm);
  const rows = [date && ['calendar', date], f.time && ['clock', f.time], f.venue && ['pin', f.venue]].filter(Boolean);
  const head = (s, draw, x, y) => {   // keyword pill + headline (line 1 on a highlight bar)
    let h = 0, w = bw;
    if (f.keyword) {
      const ks = Math.min(s, 1.05); k.font(700, 26 * u * ks, PB_THAI); const t = f.keyword.trim(), tw = g.measureText(t).width, ph = 50 * u * ks;
      if (draw) { g.fillStyle = P.c.red; k.rr(x, y, tw + 40 * u * ks, ph, ph / 2); g.fill(); g.fillStyle = '#FFFFFF'; g.fillText(t, x + 20 * u * ks, y + ph * .68); }
      h += ph + 20 * u * ks;
    }
    const size = (land ? 74 : story ? 86 : 68) * u * Math.min(s, 1.05), text = (f.headline || 'Headline').trim();
    k.font(700, size, PB_HEAD);
    const parts = text.split('\n');
    let boxed, rest;
    if (parts.length > 1) { boxed = k.wrap(parts[0], w - size * .5); rest = parts.slice(1).join(' '); }
    else { boxed = k.wrap(text, w - size * .5).slice(0, 1); rest = text.slice(text.indexOf(boxed[0]) + boxed[0].length).trim(); }
    const plain = rest ? k.wrap(rest, w) : [];
    boxed.forEach(l => {
      if (draw) { k.font(700, size, PB_HEAD); const lw = g.measureText(l).width; g.fillStyle = f.headline ? P.boxBg : hexA(P.boxBg, .4); g.fillRect(x, y + h, lw + size * .44, size * 1.34); g.fillStyle = P.boxInk; g.fillText(l, x + size * .22, y + h + size * 1.0); }
      h += size * 1.34 + size * .12;
    });
    plain.forEach(l => { if (draw) { k.font(700, size, PB_HEAD); g.fillStyle = P.head; g.fillText(l, x, y + h + size * 1.02); } h += size * 1.3; });
    if (f.sub && st.template !== 'recognition' && !hasCardTitle()) { h += 8 * u * s; h += pbText(k, f.sub, { x, y: y + h, w, size: 34 * u * s, weight: 500, lh: 1.4, color: P.sub, draw }); }
    return h;
  };
  /* card: sub as title (when there is a body), highlight, points, details */
  const hasCardTitle = () => !!(f.sub && (pts.length || rows.length || f.highlight)) || st.template === 'recognition';
  const cardItems = (s, w) => {
    const L = [], p = 34 * u * s;
    if (st.template === 'recognition') {
      if (f.sub) L.push(['t', (dr, x, y) => pbText(k, f.sub, { x, y, w, size: 32 * u * s, weight: 600, lh: 1.38, color: P.title, draw: dr })]);
      if (f.highlight) L.push(['h', (dr, x, y) => { if (dr) { g.fillStyle = P.c.red; g.fillRect(x, y, 80 * u * s, 8 * u * s); } return 22 * u * s + pbText(k, f.highlight, { x, y: y + 22 * u * s, w, size: 58 * u * s, weight: 700, lh: 1.25, color: P.c.primary, draw: dr }); }]);
    } else if (f.sub && hasCardTitle()) L.push(['t', (dr, x, y) => pbText(k, f.sub, { x, y, w, size: 36 * u * s, weight: 700, lh: 1.35, color: P.title, draw: dr })]);
    if (st.template === 'campaign' && f.highlight) L.push(['h', (dr, x, y) => pbText(k, f.highlight, { x, y, w, size: 104 * u * s, weight: 700, fam: PB_HEAD, lh: 1.15, color: P.c.red, draw: dr })]);
    if (pts.length) {
      const ps = 31 * u * s, num = st.template === 'howto', ind = 58 * u * s, d = 40 * u * s;
      L.push(['p', (dr, x, y) => {
        let yy = y;
        pts.forEach((t, i) => {
          const th = pbText(k, t, { w: w - ind, size: ps, weight: 500, lh: 1.4 }), hh = Math.max(th, d);
          if (dr) {
            const cy = yy + Math.min(hh, ps * 1.4) / 2;
            if (num) { g.fillStyle = P.c.primary; g.beginPath(); g.arc(x + d / 2, cy, d / 2, 0, Math.PI * 2); g.fill(); k.font(700, 24 * u * s, PB_BODY); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText(String(i + 1), x + d / 2, cy + 8.5 * u * s); g.textAlign = 'left'; }
            else { g.fillStyle = P.acc; g.beginPath(); g.arc(x + d / 2, cy, d / 2, 0, Math.PI * 2); g.fill(); g.strokeStyle = P.accInk; g.lineWidth = 4 * u * s; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x + d * .28, cy); g.lineTo(x + d * .45, cy + d * .17); g.lineTo(x + d * .74, cy - d * .16); g.stroke(); }
            pbText(k, t, { x: x + ind, y: yy, w: w - ind, size: ps, weight: 500, lh: 1.4, color: P.text, draw: 1 });
          }
          yy += hh + 14 * u * s;
        });
        return yy - y - 14 * u * s;
      }]);
    }
    if (rows.length) {
      const rs = 29 * u * s, tile = st.template === 'event' && f.date ? 118 * u * s : 0, iw = 44 * u * s;
      L.push(['d', (dr, x, y) => {
        const rw = w - (tile ? tile + 24 * u * s : 0) - iw - 32 * u * s;
        const rh = r => Math.max(pbText(k, r[1], { w: rw, size: rs, weight: 600, lh: 1.32 }), 36 * u * s);
        const inner = rows.reduce((a, r) => a + rh(r) + 10 * u * s, -10 * u * s), hb = Math.max(inner, tile) + 36 * u * s;
        if (dr) {
          g.fillStyle = hexA(P.c.sky, .12); k.rr(x, y, w, hb, 18 * u * s); g.fill();
          let cx = x + 16 * u * s;
          if (tile) {
            const d0 = parse(f.date), ty = y + (hb - tile) / 2;
            g.fillStyle = P.c.primary; k.rr(cx, ty, tile, tile, 16 * u * s); g.fill(); g.fillStyle = '#FFFFFF'; g.textAlign = 'center';
            k.font(700, 58 * u * s, PB_HEAD); g.fillText(String(d0.getDate()), cx + tile / 2, ty + tile * .56);
            k.font(600, 22 * u * s, PB_THAI); g.fillText(`${TH_MON[d0.getMonth()]} ${String(d0.getFullYear() + 543).slice(2)}`, cx + tile / 2, ty + tile * .84); g.textAlign = 'left';
            cx += tile + 24 * u * s;
          }
          let ry = y + (hb - inner) / 2;
          rows.forEach(r => { const h2 = rh(r); k.icon(r[0], cx, ry + 2 * u * s, 32 * u * s, P.c.sky, 2.3); pbText(k, r[1], { x: cx + iw, y: ry, w: rw, size: rs, weight: 600, lh: 1.32, color: P.text, draw: 1 }); ry += h2 + 10 * u * s; });
        }
        return hb;
      }]);
    }
    return { L, p };
  };
  const cardH = (s, w) => { const { L, p } = cardItems(s, w - 2 * 34 * u * s); if (!L.length) return 0; return L.reduce((a, it) => a + it[1](false, 0, 0) + 24 * u * s, -24 * u * s) + 2 * p; };
  const cardDraw = (s, x, y, w) => {
    const { L, p } = cardItems(s, w - 2 * 34 * u * s); if (!L.length) return;
    const h = cardH(s, w); g.fillStyle = P.card; k.shadow(P.cardShadow, 40 * u, 14 * u, .2); k.rr(x, y, w, h, 28 * u); g.fill(); k.shadow(false);
    let yy = y + p; L.forEach(it => { yy += it[1](true, x + p, yy) + 24 * u * s; });
  };
  /* bottom: QR + caption box, or a CTA pill; fine print */
  const tail = (s, draw, x, yTop) => {
    let h = 0; const q = hasQr ? Math.max(150, 190 * s) * u : 0;
    if (hasQr) {
      if (draw) {
        const y = yTop; g.fillStyle = '#FFFFFF'; k.shadow(!P.dark, 20 * u, 6 * u, .12); k.rr(x, y, q, q, 14 * u); g.fill(); k.shadow(false);
        const pd = 12 * u;
        if (qrIm) { const s2 = Math.min((q - 2 * pd) / qrIm.width, (q - 2 * pd) / qrIm.height); g.drawImage(qrIm, x + (q - qrIm.width * s2) / 2, y + (q - qrIm.height * s2) / 2, qrIm.width * s2, qrIm.height * s2); }
        else { const cell = (q - 2 * pd) / qr.n; g.fillStyle = '#000'; for (let r = 0; r < qr.n; r++) for (let c = 0; c < qr.n; c++) if (qr.dark(r, c)) g.fillRect(x + pd + c * cell, y + pd + r * cell, cell + .5, cell + .5); }
        const tx = x + q + 22 * u, tw = Math.min(bw - q - 22 * u, 640 * u), cap = [f.cta, st.qrLabel || (f.cta ? '' : 'สแกน QR Code')].filter(Boolean);
        const th = cap.reduce((a, t, i) => a + pbText(k, t, { w: tw - 56 * u, size: (i ? 26 : 32) * u * Math.max(s, .8), weight: i ? 500 : 700, lh: 1.32 }), 0) + 40 * u;
        const bh = Math.min(q, Math.max(th, q * .62)), by = y + (q - bh) / 2;
        g.fillStyle = P.dark ? 'rgba(255,255,255,.14)' : P.c.primary; k.rr(tx, by, tw, bh, 18 * u); g.fill();
        let cy = by + (bh - th) / 2 + 20 * u;
        cap.forEach((t, i) => { cy += pbText(k, t, { x: tx + 28 * u, y: cy, w: tw - 56 * u, size: (i ? 26 : 32) * u * Math.max(s, .8), weight: i ? 500 : 700, lh: 1.32, color: '#FFFFFF', draw: 1 }); });
      }
      h += q + 22 * u;
    } else if (f.cta) {
      const ph = 80 * u * s;
      if (draw) {
        k.font(700, 32 * u * s, PB_THAI); const t = k.wrap(f.cta.trim(), bw - 120 * u * s)[0] || '', tw = g.measureText(t).width;
        g.fillStyle = P.c.red; k.rr(x, yTop, tw + 116 * u * s, ph, ph / 2); g.fill(); g.fillStyle = '#FFFFFF'; g.fillText(t, x + 40 * u * s, yTop + ph * .64);
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 4 * u * s; g.lineCap = 'round'; g.beginPath(); const ax = x + tw + 70 * u * s, ay = yTop + ph / 2; g.moveTo(ax, ay); g.lineTo(ax + 22 * u * s, ay); g.moveTo(ax + 12 * u * s, ay - 10 * u * s); g.lineTo(ax + 22 * u * s, ay); g.lineTo(ax + 12 * u * s, ay + 10 * u * s); g.stroke();
      }
      h += ph + 22 * u;
    }
    const fine = [f.note, B.footer].filter(Boolean).join('\n');
    if (fine) h += pbText(k, fine, { x, y: yTop + h, w: bw, size: 20 * u, weight: 500, lh: 1.4, color: P.mute, draw });
    else if (h) h -= 22 * u;
    return h;
  };

  /* fit: largest type scale; the illustration gives up space before the text gets small */
  const hasVisual = st.visual !== 'none' && !(photoBg && story);
  const base = !hasVisual ? 0 : story ? .3 : land ? .36 : .34;
  const plan = (frac, s) => {
    const hh = head(s, false, 0, 0), th = tail(s, false, 0, 0), bodyTop = top0 + lh + 36 * u + hh + 40 * u, bodyBot = bottom - (th ? th + 36 * u : 0), bodyH = bodyBot - bodyTop;
    if (story) { const ch = cardH(s, bw), vh = frac ? Math.max(bodyH * frac, Math.min(bodyH - ch - 30 * u, bodyH * .5)) : 0; return { ok: ch <= bodyH - (vh ? vh + 30 * u : 0), bodyTop, bodyH, th, V: vh ? { x: M, y: bodyTop, w: bw, h: vh } : null, C: { x: M, y: bodyTop + (vh ? vh + 30 * u : 0), w: bw } }; }
    const vw = frac ? bw * frac : 0, cw = bw - (vw ? vw + 36 * u : 0), ch = cardH(s, cw);
    return { ok: ch <= bodyH, bodyTop, bodyH, th, ch, V: vw ? { x: W - M - vw, y: bodyTop, w: vw, h: bodyH } : null, C: { x: M, y: bodyTop, w: cw } };
  };
  const fit = frac => { for (let s = story ? 1.7 : 1.3; s >= .4; s -= .025) { const L = plan(frac, s); if (L.ok) return { s, L }; } return { s: .4, L: plan(frac, .4), over: true }; };
  let F = fit(base);
  for (const m of [.75, .5, 0]) { if (!base || F.s >= .78) break; const F2 = fit(base * m); if (F2.s > F.s + (m ? 0 : .1)) F = F2; }
  const { s: S, L } = F;
  if (L.V && !photoBg) pbScene(k, st, P, L.V.x, L.V.y, L.V.w, L.V.h);
  head(S, true, M, top0 + lh + 36 * u);
  const ch = cardH(S, L.C.w), free = story ? 0 : Math.max(0, L.bodyH - ch);
  cardDraw(S, L.C.x, L.C.y + free * .3, L.C.w);
  if (L.th) tail(S, true, M, bottom - L.th);
  return { scale: S, overflow: !!F.over, dense: S < .6, scene: pbSceneOf(st) };
}

/* ============================================================
   Page
   ============================================================ */
let pbTimer = 0;
function pbPaint() {
  const cv = $('#pbCv'); if (!cv) return;
  const r = pbDraw(cv, PST);
  const w = $('#pbFit'); if (w) { w.hidden = !r.dense; w.innerHTML = `${ico('alert', 14)} ${r.overflow ? 'ข้อความยาวเกินพื้นที่ของขนาดนี้' : 'ข้อความค่อนข้างแน่น ตัวอักษรจึงเล็ก'} — ลองตัดเนื้อหา ใช้ AI เรียบเรียงให้สั้นลง หรือเลือกขนาด Portrait / Story`; }
  const wrap = $('#pbPv'); if (wrap) wrap.dataset.fmt = PST.format;
}
const pbSchedule = () => { clearTimeout(pbTimer); pbTimer = setTimeout(pbPaint, 60); };
const pbTouch = () => { PST.reviewed = false; PST.updated = Date.now(); const c = $('#pbReviewed'); if (c) c.checked = false; pbExportState(); };
function pbExportState() { $$('[data-pb-exp]').forEach(b => { b.disabled = !PST.reviewed; }); }
let pbFontsReady = false;
async function pbFonts() {
  if (pbFontsReady) return; pbFontsReady = true;
  try { await Promise.all([...['900 80px', '400 40px'].map(f => document.fonts.load(`${f} ${PB_HEAD}`)), ...['600 30px', '900 30px'].map(f => document.fonts.load(`${f} ${PB_BODY}`)), ...['400 30px', '500 30px', '600 30px', '700 30px'].map(f => document.fonts.load(`${f} ${PB_THAI}`)), document.fonts.load('600 30px "IBM Plex Sans Thai"', 'ไทย')]); } catch (e) { }
  pbPaint();
}

const pbChips = (map, cur, act, fn) => `<div class="seg-chips pb-chips">${Object.entries(map).map(([key, v]) => `<button type="button" class="${key === cur ? 'on' : ''}" data-act="${act}" data-id="${key}" aria-pressed="${key === cur}">${fn ? fn(key, v) : esc(v)}</button>`).join('')}</div>`;
const pbField = (key, label, ph, kind = 'input', extra = '') => `<label class="field ${kind === 'textarea' ? 'full' : ''}"><span>${label}</span>${kind === 'textarea'
  ? `<textarea data-pf="${key}" rows="4" placeholder="${esc(ph)}">${esc(PST.f[key])}</textarea>`
  : `<input data-pf="${key}" ${extra} value="${esc(PST.f[key])}" placeholder="${esc(ph)}">`}</label>`;

V.poster = (root, force) => {
  if (!force && $('#pbRoot', root)) { pbPaint(); return; }
  const st = PST, T = PB_TEMPLATES[st.template], hint = PB_FIELD_HINT[st.template], B = pbBrand(), C = B.colors;
  const dot = c => `<i class="pb-dot" style="background:${c}"></i>`;
  const ai = st.ai;
  root.innerHTML = `<div id="pbRoot">
  ${pageHead('Poster', 'สร้าง Communications Poster ตาม CI องค์กร — สำหรับ LINE, Facebook และช่องทางภายใน',
    `<button class="btn btn-ghost" data-act="pbDrafts">${ico('folder', 15)} งานของฉัน</button><button class="btn btn-ghost" data-act="pbBrand">${ico('lock', 15)} CI Control</button><button class="btn btn-ghost" data-act="pbNew">${ico('plus', 15)} เริ่มใหม่</button>`)}
  <div class="pb">
    <div class="pb-form">
      <section class="card pb-step"><h3><span class="pb-n">1</span>Template และขนาด</h3>
        <div class="pb-tpls">${Object.entries(PB_TEMPLATES).map(([key, t]) => `<button type="button" class="pb-tpl ${key === st.template ? 'on' : ''}" data-act="pbTpl" data-id="${key}" aria-pressed="${key === st.template}"><span class="pb-tpl-ico">${pbIconSvg(PB_SCENES[t[2]][1], 22)}</span><b>${t[0]}</b><small>${t[1]}</small></button>`).join('')}</div>
        <div class="pb-sub">ขนาดภาพ <small class="muted">— เปลี่ยนได้ทุกเมื่อ ระบบจัดข้อความและภาพใหม่ให้</small></div>
        <div class="pb-fmts">${Object.entries(PB_FORMATS).map(([key, fm]) => `<button type="button" class="pb-fmt ${key === st.format ? 'on' : ''}" data-act="pbFmt" data-id="${key}" aria-pressed="${key === st.format}"><i style="aspect-ratio:${fm[2]}/${fm[3]}"></i><b>${fm[0]} ${fm[1]}</b><small>${fm[2]} × ${fm[3]} px · ${fm[4]}</small></button>`).join('')}</div>
      </section>
      <section class="card pb-step"><h3><span class="pb-n">2</span>เนื้อหา <small class="muted">· ${T[0]}</small></h3>
        ${st.template === 'info' || st.template === 'notes' ? pbInfoForm() : `        <div class="form-grid">
          ${pbField('keyword', 'Keyword <small>(คำนำ / หมวด)</small>', st.template === 'event' ? 'เช่น เชิญร่วมงาน' : st.template === 'recognition' ? 'เช่น Congratulations' : 'เช่น ประกาศ')}
          ${hint.highlight ? pbField('highlight', hint.highlight[0], hint.highlight[1]) : '<span class="pb-gap"></span>'}
          <label class="field full"><span>Headline <em>*</em> <small>(Enter = ขึ้นบรรทัดใหม่ · บรรทัดแรกอยู่บนแถบเน้น)</small></span><textarea data-pf="headline" class="pb-big" rows="2" maxlength="140" placeholder="${esc(hint.headline)}">${esc(st.f.headline)}</textarea></label>
          ${pbField('sub', st.template === 'recognition' ? 'คำโปรย <small>(เช่น ผลงาน / รางวัล)</small>' : 'Sub-headline', st.template === 'recognition' ? 'เช่น ยอดขายสูงสุดประจำไตรมาส 3' : 'ประโยคสนับสนุน 1 บรรทัด').replace('class="field ', 'class="field full ')}
          ${pbField('content', 'Content', hint.content, 'textarea')}
          ${pbField('cta', 'Call to action <small>(ปุ่ม / คำชวน)</small>', 'เช่น ลงทะเบียนเลย')}
        </div>`}
        <details class="pb-more" id="pbMore" ${PB_MORE_OPEN || st.template === 'event' || st.f.date || st.f.time || st.f.venue || st.qrUrl || st.qrImg || st.f.note ? 'open' : ''}><summary>รายละเอียดเพิ่มเติม · วัน เวลา สถานที่ QR Code เงื่อนไข</summary>
          <div class="form-grid">
            ${st.template === 'info' || st.template === 'notes' ? '' : `${pbField('date', 'วันที่', '', 'input', 'type="date"')}
            ${pbField('dateEnd', 'ถึงวันที่ <small>(ถ้ามีหลายวัน)</small>', '', 'input', 'type="date"')}
            ${pbField('time', 'เวลา', 'เช่น 09:00 – 12:00 น.')}
            ${pbField('venue', 'สถานที่', 'เช่น ห้องประชุมใหญ่ ชั้น 12 / Zoom')}`}
            <label class="field"><span>QR Code จากลิงก์</span><input id="pbQrUrl" value="${esc(st.qrUrl)}" placeholder="https://…" inputmode="url" ${st.qrImg ? 'disabled' : ''}></label>
            <div class="field"><span>หรือใช้รูป QR ที่มีอยู่</span><div class="btn-row">${st.qrImg ? `<span class="badge">ใช้รูป QR แล้ว</span><button type="button" class="btn btn-sm btn-ghost" data-act="pbQrClear">${ico('x', 13)} เอาออก</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-act="pbQrImg">${ico('upload', 13)} อัปโหลดรูป QR</button>`}</div></div>
            <label class="field"><span>ข้อความใต้ QR</span><input id="pbQrLabel" value="${esc(st.qrLabel)}" placeholder="สแกน QR Code"></label>
            <label class="field full"><span>เงื่อนไข / หมายเหตุ <small>(ตัวเล็กท้ายโปสเตอร์ — AI ไม่แก้ไข)</small></span><textarea data-pf="note" rows="2" placeholder="เช่น *เฉพาะตัวแทนที่มีผลงานตั้งแต่ 1 ต.ค. – 31 ธ.ค. 2569">${esc(st.f.note)}</textarea></label>
          </div>
        </details>
      </section>
      <section class="card pb-step"><h3><span class="pb-n">3</span>ให้ AI ช่วยเรียบเรียงและออกแบบ</h3>
        <p class="muted small">ภาพประกอบเลือกให้อัตโนมัติจากคำในเนื้อหา (ไม่ใช้ AI) — ตอนนี้: <b id="pbSceneNow">${esc(PB_SCENES[pbSceneOf(st)][0])}</b>${st.scene === 'auto' ? '' : ' (เลือกเอง)'}</p>
        <div class="btn-row mt"><button type="button" class="btn btn-primary" data-act="pbAI" id="pbAIBtn">${ico('sparkles', 15)} เรียบเรียงข้อความ + ออกแบบ</button><button type="button" class="btn btn-ghost" data-act="pbDesign" id="pbDesignBtn">${ico('image', 15)} ให้ AI ออกแบบภาพอย่างเดียว</button><button type="button" class="btn btn-ghost" data-act="pbAuto">จัดอัตโนมัติ (ไม่ใช้ AI)</button></div>
        <p class="muted small mt">AI ปรับถ้อยคำและเลือกภาพ ไอคอน พื้นหลัง สีจาก CI — <b>ไม่เปลี่ยนข้อเท็จจริง</b> (ตัวเลข วันเวลา สถานที่ เงื่อนไข) ระบบตรวจตัวเลขซ้ำอีกชั้น · “ออกแบบภาพอย่างเดียว” ส่งแค่หัวข้อสั้น ๆ ใช้ token น้อย และจำผลไว้ ไม่เรียกซ้ำถ้าข้อความเดิม</p>
        ${ai ? `<div class="pb-ai ${ai.warn && ai.warn.length ? 'warn' : ''}">
          <div><b>${ai.by === 'ai' ? 'AI เรียบเรียงแล้ว' : ai.by === 'design' ? 'AI ออกแบบภาพแล้ว' : 'จัดเรียงอัตโนมัติแล้ว'}</b>${ai.note ? ` — ${esc(ai.note)}` : ''}</div>
          ${ai.by === 'design' ? '' : ai.warn && ai.warn.length ? `<p class="pb-warn">${ico('alert', 15)} ตรวจข้อเท็จจริง: ${ai.warn.map(esc).join(' · ')} — กรุณาแก้ในช่องเนื้อหาหรือย้อนกลับ</p>` : `<p class="small muted">${ico('check', 14)} ตัวเลขและวันเวลาครบตามต้นฉบับ</p>`}
          ${ai.by === 'design' ? '' : `<button type="button" class="btn btn-sm btn-ghost" data-act="pbRevert">${ico('left', 13)} ย้อนกลับเป็นข้อความเดิม</button>`}</div>` : ''}
      </section>
    </div>
    <div class="pb-side">
      <section class="card pb-pvcard"><h3><span class="pb-n">4</span>Preview และปรับแต่ง</h3>
        <div class="pb-fmt-mini">${pbChips(Object.fromEntries(Object.entries(PB_FORMATS).map(([key, fm]) => [key, fm[1]])), st.format, 'pbFmt')}</div>
        <div class="pb-pv" id="pbPv" data-fmt="${st.format}"><canvas id="pbCv" role="img" aria-label="ตัวอย่างโปสเตอร์ ${esc(st.f.headline)}"></canvas></div>
        <p class="pb-fit" id="pbFit" hidden>${ico('alert', 14)} ข้อความยาวเกินพื้นที่ของขนาดนี้ — ลดเนื้อหา หรือซ่อนภาพประกอบ</p>
        <div class="pb-tune">
          <div class="pb-row"><span>พื้นหลัง <small class="muted">(สีตาม CI)</small></span>${pbChips(Object.fromEntries(Object.entries(PB_STYLES).filter(([key]) => key !== 'photo' || st.photo)), st.style === 'photo' && !st.photo ? 'deep' : st.style, 'pbStyle', (key, v) => `${dot({ deep: C.primary, lavender: C.lavender, sky: C.paper, pink: C.pink, white: '#fff', photo: '#888' }[key])}${v[0]}`)}</div>
          <div class="pb-row"><span>สีเน้น</span>${pbChips(PB_ACCENTS, st.accent, 'pbAccent', (key, v) => `${dot(C[key])}${v}`)}</div>
          <div class="pb-row"><span>รูปถ่าย <small class="muted">(คน / สถานที่ที่เกี่ยวกับเนื้อหา — แสดงเต็มพื้นหลังแบบโปสเตอร์ Health)</small></span>
            <div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-act="pbPhoto">${ico('image', 13)} ${st.photo ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</button>${st.photo ? `<button type="button" class="btn btn-sm btn-danger-ghost" data-act="pbPhotoClear">${ico('trash', 13)} ลบรูป</button><label class="pb-range">ตำแหน่งภาพ<input type="range" id="pbPhotoY" min="0" max="1" step=".05" value="${st.photoY}"></label>` : ''}</div></div>
          <div class="pb-row"><span>ภาพประกอบตามเนื้อหา</span>${pbChips({ auto: `อัตโนมัติ · ${PB_SCENES[pbAutoScene(st)][0]}`, ...Object.fromEntries(Object.entries(PB_SCENES).map(([key, v]) => [key, v[0]])), none: 'ไม่มีภาพ' }, st.visual === 'none' ? 'none' : st.scene, 'pbScene', (key, v) => `${PB_SCENES[key] ? pbIconSvg(PB_SCENES[key][1], 15) : ''}${esc(v)}`)}</div>
          <div class="pb-row"><span>ไอคอนหลัก</span><div class="pb-icons"><button type="button" class="pb-icon-auto ${!st.icon ? 'on' : ''}" data-act="pbIcon" data-id="" aria-pressed="${!st.icon}">ตามภาพ</button>${Object.keys(PB_ICONS).map(key => `<button type="button" class="${key === st.icon ? 'on' : ''}" data-act="pbIcon" data-id="${key}" title="${key}" aria-label="ไอคอน ${key}" aria-pressed="${key === st.icon}">${pbIconSvg(key, 20)}</button>`).join('')}</div></div>
        </div>
      </section>
      <section class="card pb-step"><h3><span class="pb-n">5</span>Export</h3>
        <label class="pb-check"><input type="checkbox" id="pbReviewed" ${st.reviewed ? 'checked' : ''}><span>ฉันตรวจสอบข้อความ ตัวเลข วันเวลา สถานที่ และเงื่อนไขในโปสเตอร์แล้ว</span></label>
        <div class="btn-row mt"><button type="button" class="btn btn-primary" data-act="pbExport" data-id="png" data-pb-exp>${ico('download', 15)} PNG</button><button type="button" class="btn btn-ghost" data-act="pbExport" data-id="jpg" data-pb-exp>${ico('download', 15)} JPG</button><button type="button" class="btn btn-ghost" data-act="pbExportAll" data-pb-exp>${ico('layers', 15)} ครบ 4 ขนาด (PNG)</button><button type="button" class="btn btn-ghost" data-act="pbSave">${ico('check', 15)} บันทึกฉบับร่าง</button></div>
        <p class="muted small mt">ต้องติ๊กยืนยันใหม่ทุกครั้งที่แก้ไข · สี ฟอนต์ และโลโก้ล็อกตาม CI ที่ทีม Brand อนุมัติ</p>
      </section>
    </div>
  </div></div>`;
  const R = $('#pbRoot', root);
  R.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.ps) { const [i, key] = el.dataset.ps.split('.'); if (PST.secs && PST.secs[+i]) { PST.secs[+i][key] = el.value; pbTouch(); pbSchedule(); } return; }
    if (el.dataset.pf) { PST.f[el.dataset.pf] = el.value; pbTouch(); pbSchedule(); const sn = $('#pbSceneNow'); if (sn) sn.textContent = PB_SCENES[pbSceneOf(PST)][0]; return; }
    if (el.id === 'pbQrUrl') { PST.qrUrl = el.value; pbTouch(); pbSchedule(); return; }
    if (el.id === 'pbQrLabel') { PST.qrLabel = el.value; pbTouch(); pbSchedule(); return; }
    if (el.id === 'pbPhotoY') { PST.photoY = +el.value; pbTouch(); pbSchedule(); }
  });
  if (st.template === 'info' || st.template === 'notes') {   // the icon/scene/photo controls belong to the older templates
    $$('.pb-row', R).forEach(row => { if (/ภาพประกอบตามเนื้อหา|ไอคอนหลัก|รูปถ่าย|สีเน้น/.test(row.textContent.slice(0, 60))) row.hidden = true; });
    const ai3 = [...$$('.pb-step', R)].find(x => /ให้ AI ช่วย/.test($('h3', x)?.textContent || ''));
    if (ai3) ai3.innerHTML = (st.template === 'notes' ? '<h3><span class="pb-n">3</span>สีโน้ต</h3><p class="muted small">เปลี่ยนสีกระดาษของแต่ละโน้ตได้ด้านบน · โลโก้กรุงไทย-แอกซ่าอยู่มุมขวาบน ตั้งไฟล์โลโก้ทางการที่ปุ่ม <b>CI Control</b></p>' : '<h3><span class="pb-n">3</span>ตัวละครและสี</h3><p class="muted small">ตัวละครเลือกให้อัตโนมัติจากคำในแต่ละหัวข้อ (ไม่ใช้ AI) — เปลี่ยนตัวละครและสีการ์ดได้ในแต่ละหัวข้อด้านบน · โลโก้กรุงไทย-แอกซ่าอยู่มุมขวาบน ตั้งไฟล์โลโก้ทางการที่ปุ่ม <b>CI Control</b></p>');
  }
  $('#pbMore', R).ontoggle = e => { PB_MORE_OPEN = e.target.open; };
  $('#pbReviewed', R).onchange = e => { PST.reviewed = e.target.checked; pbExportState(); };
  pbExportState(); pbPaint(); pbFonts();
};
const pbRender = () => { const v = $('#view'); if (v && route().name === 'poster') V.poster(v, true); };

/* ---------- choices ---------- */
ACT.pbTpl = el => {
  const t = PB_TEMPLATES[el.dataset.id]; if (!t) return;
  PST.template = el.dataset.id; [, , , PST.style, PST.accent] = t; if (PST.style === 'photo' || PST.photo && PST.template !== 'recognition') PST.style = PST.photo ? 'photo' : PST.style; pbTouch(); pbRender();
};
ACT.pbFmt = el => { if (!PB_FORMATS[el.dataset.id]) return; PST.format = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbStyle = el => { PST.style = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbAccent = el => { PST.accent = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbScene = el => { const v = el.dataset.id; if (v === 'none') PST.visual = 'none'; else { PST.visual = 'auto'; PST.scene = v; PST.icon = null; PST.badges = null; } pbTouch(); pbRender(); };
ACT.pbIcon = el => { PST.icon = el.dataset.id || null; if (PST.visual === 'none') PST.visual = 'auto'; pbTouch(); pbRender(); };
ACT.pbVisual = el => { PST.visual = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbPhoto = async () => { const f = await pickFile(); if (!f) return; try { PST.photo = await pbLoadImage(f, 1600); if (PST.template !== 'recognition') PST.style = 'photo'; pbTouch(); pbRender(); } catch (e) { toast(e.message, 'error'); } };
ACT.pbPhotoClear = () => { PST.photo = null; if (PST.style === 'photo') PST.style = PB_TEMPLATES[PST.template][3]; pbTouch(); pbRender(); };
ACT.pbQrImg = async () => { const f = await pickFile(); if (!f) return; try { PST.qrImg = await pbLoadImage(f, 800, true); pbTouch(); pbRender(); } catch (e) { toast(e.message, 'error'); } };
ACT.pbQrClear = () => { PST.qrImg = null; pbTouch(); pbRender(); };
ACT.pbNew = async () => {
  if ((PST.f.headline || PST.f.content) && !(await confirmBox('เริ่มโปสเตอร์ใหม่? งานที่ยังไม่บันทึกจะหายไป', 'เริ่มใหม่'))) return;
  const keep = { template: PST.template, format: PST.format }; PST = pbBlank(); Object.assign(PST, keep);
  [, , , PST.style, PST.accent] = PB_TEMPLATES[PST.template]; pbRender();
};

/* ---------- AI + fact guard ---------- */
const PB_AI_FIELDS = ['keyword', 'headline', 'sub', 'content', 'cta'];
function pbFactCheck(before, after) {   // numbers in the user's draft must survive; AI must not add new ones
  const src = PB_AI_FIELDS.map(k2 => before[k2]).join(' '), out = PB_AI_FIELDS.map(k2 => after[k2]).join(' ');
  const ctx = [before.highlight, before.date, before.dateEnd, before.time, before.venue, before.note].join(' ');
  const a = pbFacts(src), b = pbFacts(out), warn = [];
  const outN = pbThaiDigits(out).replace(/,/g, ''), srcN = pbThaiDigits(src + ' ' + ctx).replace(/,/g, '');
  [...new Set(a)].forEach(x => { if (!outN.includes(x)) warn.push(`ตัวเลข “${x}” หายไป`); });
  [...new Set(b)].forEach(x => { if (!srcN.includes(x)) warn.push(`มีตัวเลข “${x}” ที่ไม่อยู่ในต้นฉบับ`); });
  return warn;
}
function pbAutoArrange() {
  const f = PST.f, before = { ...f };
  const tidy = s => String(s || '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  PB_AI_FIELDS.forEach(k2 => { f[k2] = tidy(f[k2]); });
  let pts = pbPoints(f.content);
  if (pts.length === 1 && pts[0].length > 70) pts = pts[0].split(/(?<=[.!?])\s+|\s{2,}/).map(x => x.trim()).filter(Boolean);
  f.content = pts.join('\n');
  if (!f.headline && pts.length) { f.headline = pts.shift(); f.content = pts.join('\n'); }
  PST.scene = 'auto'; PST.icon = null; PST.badges = null; if (PST.visual === 'none') PST.visual = 'auto';
  if (!f.keyword) f.keyword = { announce: 'ประกาศ', event: 'ขอเชิญร่วมงาน', campaign: 'Campaign', howto: 'How-to', recognition: 'Congratulations' }[PST.template];
  PST.ai = { by: 'auto', orig: before, note: `จัดช่องว่าง แยกเนื้อหาเป็นข้อ เลือกภาพประกอบจากคำในเนื้อหา (${PB_SCENES[pbAutoScene(PST)][0]})`, warn: pbFactCheck(before, f) };
}
ACT.pbAuto = () => { pbAutoArrange(); pbTouch(); pbRender(); toast('จัดเรียงแล้ว — ตรวจ Preview ก่อน Export'); };
ACT.pbAI = async () => {
  const f = PST.f; if (!f.headline.trim() && !f.content.trim()) return toast('กรอก Headline หรือ Content ก่อน', 'error');
  const btn = $('#pbAIBtn'); if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spin"></span> AI กำลังเรียบเรียง…`; }
  const before = { ...f };
  try {
    if (Store.mode !== 'server') throw Object.assign(new Error('local'), { local: true });
    const r = await fetch('api/ai-poster', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ template: PB_TEMPLATES[PST.template][0], format: PST.format, fields: { ...f, date: pbDateText(f) } }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 501) throw Object.assign(new Error(j.error), { local: true });
    if (!r.ok) throw new Error(j.error || 'AI ขัดข้อง');
    const x = j.result || {};
    Object.assign(f, { keyword: x.keyword || '', headline: x.headline || f.headline, sub: x.sub || '', content: (x.points || []).join('\n'), cta: x.cta || '' });
    pbApplyDesign(x);
    PST.ai = { by: 'ai', orig: before, note: x.note || '', warn: pbFactCheck(before, f) };
    toast(PST.ai.warn.length ? 'AI เรียบเรียงแล้ว — มีจุดที่ต้องตรวจตัวเลข' : 'AI เรียบเรียงแล้ว — ตรวจ Preview ก่อน Export', PST.ai.warn.length ? 'error' : 'ok');
  } catch (e) {
    if (!e.local) { if (btn) { btn.disabled = false; btn.innerHTML = `${ico('sparkles', 15)} เรียบเรียงด้วย AI`; } return toast(e.message, 'error'); }
    pbAutoArrange(); toast(Store.mode === 'server' ? 'ยังไม่ได้เปิดใช้ AI — ใช้การจัดอัตโนมัติแทน' : 'โหมดสาธิต (ไม่มีเซิร์ฟเวอร์) — ใช้การจัดอัตโนมัติแทน AI');
  }
  pbTouch(); pbRender();
};
function pbApplyDesign(x) {   // scene / badges / background / accent chosen by AI — always from the CI lists
  if (PB_SCENES[x.scene]) { PST.scene = x.scene; PST.icon = null; }
  PST.badges = Array.isArray(x.badges) && x.badges.length === 3 && x.badges.every(b => PB_ICONS[b]) ? x.badges : null;
  if (PB_STYLES[x.style] && x.style !== 'photo' && PST.style !== 'photo') PST.style = x.style;
  if (PB_ACCENTS[x.accent]) PST.accent = x.accent;
  if (PST.visual === 'none') PST.visual = 'auto';
}
const PB_DESIGN_CACHE = new Map();   // same text → same design, no second AI call
ACT.pbDesign = async () => {
  const f = PST.f, text = [f.keyword, f.headline, f.sub, f.highlight, f.content].filter(Boolean).join('\n').slice(0, 600).trim();
  if (!text) return toast('กรอก Headline หรือ Content ก่อน', 'error');
  const key = PST.template + '|' + text, done = (x, cached) => { pbApplyDesign(x); PST.ai = { by: 'design', note: `ภาพ: ${PB_SCENES[PST.scene]?.[0] || '-'} · พื้นหลัง: ${PB_STYLES[PST.style][0]}${cached ? ' (ใช้ผลเดิม ไม่เรียก AI ซ้ำ)' : ''}` }; pbTouch(); pbRender(); };
  if (PB_DESIGN_CACHE.has(key)) return done(PB_DESIGN_CACHE.get(key), true);
  if (Store.mode !== 'server') { PST.scene = 'auto'; pbRender(); return toast('โหมดสาธิต — ใช้การเลือกภาพจากคำในเนื้อหาแทน AI'); }
  const btn = $('#pbDesignBtn'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังออกแบบ…'; }
  try {
    const r = await fetch('api/ai-design', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ template: PB_TEMPLATES[PST.template][0], text }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 501) { PST.scene = 'auto'; pbRender(); return toast('ยังไม่ได้เปิดใช้ AI — ใช้การเลือกภาพจากคำในเนื้อหาแทน'); }
    if (!r.ok) throw new Error(j.error || 'AI ขัดข้อง');
    PB_DESIGN_CACHE.set(key, j.result || {}); done(j.result || {});
  } catch (e) { toast(e.message, 'error'); if (btn) { btn.disabled = false; btn.innerHTML = `${ico('image', 15)} ให้ AI ออกแบบภาพอย่างเดียว`; } }
};
ACT.pbRevert = () => { if (!PST.ai) return; Object.assign(PST.f, PST.ai.orig); PST.ai = null; pbTouch(); pbRender(); toast('ย้อนกลับเป็นข้อความเดิมแล้ว'); };

/* ---------- export ---------- */
const pbFileName = (fmt, ext) => `Poster_${PB_TEMPLATES[PST.template][0].replace(/\W+/g, '-')}_${PB_FORMATS[fmt][1].replace(':', 'x')}_${today()}.${ext}`;
function pbDownload(cv, name, type) {
  return new Promise(res => cv.toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); res();
  }, type, .92));
}
const pbNeedReview = () => { if (PST.reviewed) return false; toast('ติ๊กยืนยันว่าตรวจสอบข้อความแล้วก่อน Export', 'error'); $('#pbReviewed')?.focus(); return true; };
ACT.pbExport = async el => {
  if (pbNeedReview()) return;
  if (!PST.f.headline.trim()) return toast('ยังไม่มี Headline', 'error');
  const jpg = el.dataset.id === 'jpg', cv = document.createElement('canvas'); pbDraw(cv, PST);
  if (jpg) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c2.width, c2.height); g.drawImage(cv, 0, 0); await pbDownload(c2, pbFileName(PST.format, 'jpg'), 'image/jpeg'); }
  else await pbDownload(cv, pbFileName(PST.format, 'png'), 'image/png');
  toast('ดาวน์โหลดแล้ว'); pbSaveDraft(true);
};
ACT.pbExportAll = async () => {
  if (pbNeedReview()) return;
  if (!PST.f.headline.trim()) return toast('ยังไม่มี Headline', 'error');
  const bad = [];
  for (const fmt of Object.keys(PB_FORMATS)) { const cv = document.createElement('canvas'); if (pbDraw(cv, PST, fmt).overflow) bad.push(PB_FORMATS[fmt][1]); await pbDownload(cv, pbFileName(fmt, 'png'), 'image/png'); await new Promise(r => setTimeout(r, 350)); }
  toast(bad.length ? `ดาวน์โหลดครบ 4 ขนาดแล้ว — ขนาด ${bad.join(', ')} ข้อความแน่น ควรตรวจอีกครั้ง` : 'ดาวน์โหลดครบ 4 ขนาดแล้ว', bad.length ? 'error' : 'ok'); pbSaveDraft(true);
};

/* ---------- drafts (this browser, per person) ---------- */
const pbDraftKey = () => 'aex-posters-' + AEX.meId;
const pbDraftsGet = () => { try { return JSON.parse(localStorage.getItem(pbDraftKey()) || '[]'); } catch (e) { return []; } };
function pbSaveDraft(quiet) {
  const list = pbDraftsGet().filter(d => d.id !== PST.id), d = JSON.parse(JSON.stringify({ ...PST, ai: null, reviewed: false, updated: Date.now() }));
  list.unshift(d); list.splice(20);
  try { localStorage.setItem(pbDraftKey(), JSON.stringify(list)); if (!quiet) toast('บันทึกฉบับร่างในเครื่องนี้แล้ว'); }
  catch (e) {
    try { list[0] = { ...d, photo: null, qrImg: null }; localStorage.setItem(pbDraftKey(), JSON.stringify(list)); if (!quiet) toast('บันทึกแล้ว (ไม่รวมรูป — พื้นที่เก็บในเบราว์เซอร์เต็ม)', 'error'); }
    catch (e2) { if (!quiet) toast('บันทึกไม่ได้ — พื้นที่เก็บในเบราว์เซอร์เต็ม ลบงานเก่าก่อน', 'error'); }
  }
}
ACT.pbSave = () => { if (!PST.f.headline.trim()) return toast('ใส่ Headline ก่อนบันทึก', 'error'); pbSaveDraft(); };
ACT.pbDrafts = () => {
  const list = pbDraftsGet();
  const m = modal({
    title: 'งานของฉัน · Poster', body: list.length ? `<p class="muted small">เก็บในเบราว์เซอร์เครื่องนี้ (ล่าสุด 20 งาน) · เปิดงานเดิมแล้วเปลี่ยนขนาดหรือ Template ได้</p><div class="pb-drafts">${list.map(d => `<div class="pb-draft"><button type="button" class="grow" data-open="${d.id}"><b>${esc(d.f.headline || '(ไม่มี Headline)')}</b><small>${PB_TEMPLATES[d.template]?.[0] || ''} · ${PB_FORMATS[d.format]?.[1] || ''} · ${new Date(d.updated).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</small></button><button type="button" class="icon-btn" data-del="${d.id}" aria-label="ลบ">${ico('trash', 16)}</button></div>`).join('')}</div>` : empty('folder', 'ยังไม่มีงานที่บันทึก', 'กด “บันทึกฉบับร่าง” หรือ Export แล้วงานจะอยู่ที่นี่'),
    onOpen(md) {
      md.el.addEventListener('click', e => {
        const o = e.target.closest('[data-open]'), dl = e.target.closest('[data-del]');
        if (o) { const d = pbDraftsGet().find(x => x.id === o.dataset.open); if (d) { PST = { ...pbBlank(), ...d, f: { ...pbBlank().f, ...d.f } }; md.close(); pbRender(); } }
        if (dl) { try { localStorage.setItem(pbDraftKey(), JSON.stringify(pbDraftsGet().filter(x => x.id !== dl.dataset.del))); } catch (e2) { } dl.closest('.pb-draft').remove(); }
      });
    },
  });
  return m;
};

/* ---------- CI Control (Admin edits · everyone else sees what is locked) ---------- */
ACT.pbBrand = () => {
  const B = pbBrand(), can = isAdmin(), draft = JSON.parse(JSON.stringify(B));
  const logoBox = (key, dark) => `<div class="pb-logo ${dark ? 'dark' : ''}" id="pbL_${key}">${draft[key] ? `<img src="${draft[key]}" alt="">` : '<span class="muted small">ใช้ชื่อองค์กรแทนโลโก้</span>'}</div>`;
  modal({
    title: 'CI Control · มาตรฐานภาพลักษณ์', wide: true, cls: 'pb-brand',
    body: `<p class="muted small">${can ? 'กำหนดสี โลโก้ และข้อความท้ายโปสเตอร์ตามที่ทีม Brand อนุมัติ — ทุกคนในทีมใช้ชุดเดียวกัน ผู้ใช้เลือกได้เฉพาะจากชุดนี้' : 'ล็อกโดย Admin / ทีม Brand — ผู้ใช้เลือกได้เฉพาะสีและองค์ประกอบในชุดนี้'}</p>
      <div class="form-grid mt">
        <label class="field"><span>ชื่อองค์กร / ทีม</span><input id="pbBOrg" value="${esc(draft.org)}" ${can ? '' : 'disabled'}></label>
        <label class="field"><span>ข้อความกำกับท้ายโปสเตอร์ <small>(ไม่บังคับ)</small></span><input id="pbBFoot" value="${esc(draft.footer)}" ${can ? '' : 'disabled'}></label>
        <div class="field"><span>ตำแหน่งโลโก้</span><div class="seg-chips pb-logopos" id="pbBPos">${[['right', 'มุมขวาบน (ค่าเริ่มต้น)'], ['left', 'มุมซ้ายบน']].map(([k, l]) => `<button type="button" class="${(draft.logoPos || 'right') === k ? 'on' : ''}" data-pos="${k}" ${can ? '' : 'disabled'}>${l}</button>`).join('')}</div></div>
        <p class="full small muted">โลโก้วางมุมซ้ายบนของทุกโปสเตอร์ตามแนวทาง CI — ใช้ไฟล์ทางการของทีม Brand (ชุดโลโก้คู่ Krungthai-AXA) ห้ามแก้สี สัดส่วน หรือเว้นพื้นที่ปลอดภัยให้น้อยกว่าที่กำหนด</p>
        ${typeof SD_LOGOS === 'object' ? `<div class="full"><span class="small muted">ชุดโลโก้ทางการจากไฟล์ CI (มีในระบบแล้ว · เลือกแบบได้ในแต่ละโปสเตอร์โดยคลิกที่โลโก้)</span><div class="sd-logos sd-logos-ci">${Object.values(SD_LOGOS).map(v => `<span class="${/สีเต็ม|เทาเข้ม|น้ำเงิน/.test(v[0]) ? '' : 'dk'}"><img src="${v[1]}" alt=""><b>${v[0]}</b><small>${v[2]}</small></span>`).join('')}</div><span class="small muted">ช่องอัปโหลดด้านล่างใช้เมื่อต้องการแทนที่แบบสีเต็ม / แบบขอบขาวด้วยไฟล์อื่น</span></div>` : ''}
        <div class="field"><span>โลโก้คู่ Krungthai-AXA (สี) — พื้นสว่าง</span>${logoBox('logo')}${can ? `<div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-logo="logo">${ico('upload', 13)} อัปโหลด SVG / PNG</button><button type="button" class="btn btn-sm btn-danger-ghost" data-logo-x="logo">ลบ</button></div>` : ''}</div>
        <div class="field"><span>โลโก้คู่แบบขาว / ขอบขาว — พื้นเข้มและรูปถ่าย <small>(ถ้าไม่มี ระบบวางโลโก้สีบนป้ายขาว)</small></span>${logoBox('logoWhite', 1)}${can ? `<div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-logo="logoWhite">${ico('upload', 13)} อัปโหลด SVG / PNG</button><button type="button" class="btn btn-sm btn-danger-ghost" data-logo-x="logoWhite">ลบ</button></div>` : ''}</div>
      </div>
      <h4 class="mt">สีที่อนุมัติ</h4>
      <div class="pb-colors">${Object.keys(PB_BRAND_DEFAULT.colors).map(key => `<label class="pb-color"><input type="color" data-col="${key}" value="${draft.colors[key]}" ${can ? '' : 'disabled'}><span><b>${PB_COLOR_LABEL[key]}</b><small>${draft.colors[key].toUpperCase()}</small></span></label>`).join('')}</div>
      <div id="sdFontBox"></div>`,
    actions: can ? [
      { label: 'คืนค่าเริ่มต้น', cls: 'btn-ghost', left: true, onClick: async () => { if (!(await confirmBox('คืนค่า CI เป็นค่าเริ่มต้น?', 'คืนค่า'))) return false; delete S().settings.brand; commit(); pbRender(); toast('คืนค่า CI แล้ว'); } },
      { label: 'ยกเลิก' },
      { label: 'บันทึก CI', cls: 'btn-primary', onClick: () => { S().settings.brand = draft; commit(); pbRender(); toast('บันทึก CI แล้ว — ใช้กับโปสเตอร์ของทุกคน'); } },
    ] : [{ label: 'ปิด', cls: 'btn-primary' }],
    onOpen(md) {
      if (typeof sdFontSectionBind === 'function') sdFontSectionBind(md, draft, can);
      if (!can) return;
      $('#pbBOrg', md.el).oninput = e => { draft.org = e.target.value.trim() || PB_BRAND_DEFAULT.org; };
      $('#pbBFoot', md.el).oninput = e => { draft.footer = e.target.value.trim(); };
      $('#pbBPos', md.el).onclick = e => { const b = e.target.closest('[data-pos]'); if (!b) return; draft.logoPos = b.dataset.pos; $$('#pbBPos button', md.el).forEach(x => x.classList.toggle('on', x === b)); };
      $$('[data-col]', md.el).forEach(i => { i.oninput = () => { draft.colors[i.dataset.col] = i.value; i.nextElementSibling.querySelector('small').textContent = i.value.toUpperCase(); }; });
      md.el.addEventListener('click', async e => {
        const up = e.target.closest('[data-logo]'), rm = e.target.closest('[data-logo-x]');
        const key = (up || rm)?.dataset.logo || rm?.dataset.logoX; if (!key) return;
        if (rm) draft[key] = '';
        else { const f = await pickFile('image/png,image/svg+xml,image/webp,image/jpeg'); if (!f) return; try { const d = await pbLoadImage(f, 600, true); if (d.length > 300000) return toast('โลโก้ใหญ่เกินไป — ใช้ไฟล์ที่เล็กกว่า 200 KB', 'error'); draft[key] = d; } catch (e2) { return toast(e2.message, 'error'); } }
        $('#pbL_' + key, md.el).innerHTML = draft[key] ? `<img src="${draft[key]}" alt="">` : '<span class="muted small">ใช้ชื่อองค์กรแทนโลโก้</span>';
      });
    },
  });
};
