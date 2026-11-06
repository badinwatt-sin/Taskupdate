'use strict';
/* ============================================================
   CI Poster Builder — communications posters on the corporate CI
   1) template + size  2) content  3) AI tidies the copy (facts locked)
   4) preview & adjust  5) export PNG / JPG (review checkbox every time)
   The layout is computed from the canvas size, so switching format
   re-flows the same content (text auto-fits, visual moves aside/above).
   ============================================================ */

/* ---------- vocabulary ---------- */
const PB_TEMPLATES = {   // key: [English name, Thai, icon, default motif, default style, default accent]
  announce: ['Announcement', 'ข่าวประกาศ', 'megaphone', 'geometric', 'royal', 'sky'],
  event: ['Event & Invitation', 'เชิญร่วมกิจกรรม', 'calendar', 'rays', 'paper', 'primary'],
  campaign: ['Campaign', 'แคมเปญ / กระตุ้นยอด', 'target', 'stripes', 'royal', 'coral'],
  howto: ['How-to & Tips', 'ขั้นตอน / ความรู้สั้น ๆ', 'bulb', 'dots', 'white', 'sky'],
  recognition: ['Recognition', 'ผลงานและการแสดงความยินดี', 'trophy', 'confetti', 'navy', 'amber'],
};
const PB_FORMATS = {   // key: [label, ratio, W, H, use]
  square: ['Square', '1:1', 1080, 1080, 'LINE · Facebook'],
  portrait: ['Portrait', '4:5', 1080, 1350, 'Facebook Feed'],
  story: ['Story', '9:16', 1080, 1920, 'Story · Reels'],
  landscape: ['Landscape', '16:9', 1920, 1080, 'จอ · พรีเซนต์'],
};
/* fields shown per template — [key, label, placeholder, kind] */
const PB_FIELD_HINT = {
  announce: { headline: 'เช่น ปรับเวลาทำการศูนย์บริการ', content: 'รายละเอียด — ขึ้นบรรทัดใหม่ = 1 ข้อ' },
  event: { headline: 'เช่น ขอเชิญร่วมงาน Agency Kick-off 2027', content: 'ไฮไลต์ของงาน / Agenda — ขึ้นบรรทัดใหม่ = 1 ข้อ' },
  campaign: { headline: 'เช่น ปิดยอดไตรมาส 4 รับรางวัลพิเศษ', content: 'กติกาหลัก / สิ่งที่ได้รับ — ขึ้นบรรทัดใหม่ = 1 ข้อ', highlight: ['ตัวเลขเด่น', 'เช่น รับเพิ่ม 2 เท่า หรือ 5,000 บาท'] },
  howto: { headline: 'เช่น 4 ขั้นตอนส่งเคลมออนไลน์', content: 'แต่ละขั้นตอน — ขึ้นบรรทัดใหม่ = 1 ขั้น (เรียงตามลำดับ)' },
  recognition: { headline: 'เช่น ขอแสดงความยินดี', content: 'ผลงาน / คำชื่นชม — ขึ้นบรรทัดใหม่ = 1 ข้อ', highlight: ['ชื่อผู้ได้รับรางวัล / ทีม', 'เช่น คุณสมหญิง ใจดี · ทีม Agency North'] },
};
const PB_STYLES = {   // CI-approved backgrounds (colours come from the brand palette)
  royal: ['Royal', 'พื้นน้ำเงินหลัก'], navy: ['Navy', 'พื้นน้ำเงินเข้ม'], paper: ['Paper', 'พื้นครีม'], white: ['White', 'พื้นขาว'],
};
const PB_ACCENTS = { sky: 'ฟ้า', coral: 'ส้มคอรัล', amber: 'เหลืองอำพัน', primary: 'น้ำเงินหลัก' };
const PB_MOTIFS = { geometric: 'Geometric', rays: 'Rays', dots: 'Dots', waves: 'Waves', confetti: 'Confetti', stripes: 'Stripes' };
/* poster icons — single SVG path strings on a 24 grid (drawn with Path2D, stroked) */
const PB_ICONS = {
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12',
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
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
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

/* ---------- CI (set by Admin / Brand team, shared with everyone) ---------- */
const PB_BRAND_DEFAULT = {
  org: 'Agency Experience Team', footer: 'Internal Communications', logo: '', logoDark: '',
  colors: { primary: '#0026E1', navy: '#0B1A4A', sky: '#3979FF', coral: '#FF5A36', amber: '#F2B705', ink: '#111318', paper: '#F3EFE6' },
};
const PB_COLOR_LABEL = { primary: 'Primary (Royal Blue)', navy: 'Navy', sky: 'Sky', coral: 'Coral', amber: 'Amber', ink: 'Ink (ตัวอักษร)', paper: 'Paper (พื้นครีม)' };
const pbBrand = () => { const b = S().settings.brand || {}; return { ...PB_BRAND_DEFAULT, ...b, colors: { ...PB_BRAND_DEFAULT.colors, ...(b.colors || {}) } }; };
const PB_HEAD = '"Brand Serif", "Source Serif 4", "IBM Plex Sans Thai", Georgia, serif';   // Publico when installed
const PB_BODY = '"Source Sans Pro", "IBM Plex Sans Thai", -apple-system, "Segoe UI", sans-serif';
const PB_THAI = '"IBM Plex Sans Thai", "Source Sans Pro", -apple-system, sans-serif';

/* ---------- working state ---------- */
const pbBlank = () => ({
  id: uid('pst'), template: 'announce', format: 'square', style: 'royal', accent: 'sky', visual: 'auto', icon: 'megaphone', motif: 'geometric',
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
  const im = new Image(); PB_IMG.set(src, im); im.onload = () => pbPaint(); im.src = src; return null;
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
      const k = Math.min(1, maxSide / Math.max(img.width, img.height)), cv = document.createElement('canvas');
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
   Drawing
   ============================================================ */
const pbLum = hex => { const n = parseInt(hex.replace('#', ''), 16), ch = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * ch((n >> 16) & 255) + .7152 * ch((n >> 8) & 255) + .0722 * ch(n & 255); };
const pbContrast = (a, b) => { const x = pbLum(a), y = pbLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const pbOn = (c, bg, alt, min = 2.2) => pbContrast(c, bg) >= min ? c : alt;   // keep a colour only when it reads on its background
function pbPalette(st, B) {
  const c = B.colors, acc = c[st.accent] || c.sky;
  const dark = st.style === 'royal' || st.style === 'navy';
  const bg = { royal: c.primary, navy: c.navy, paper: c.paper, white: '#FFFFFF' }[st.style] || c.primary;
  const panel = st.style === 'royal' ? c.navy : c.primary;
  const light = dark ? '#FFFFFF' : c.ink;
  return {
    c, dark, bg, panel, light,
    acc: pbOn(acc, panel, '#FFFFFF', 1.6),                       // graphics on the visual panel
    accOnBg: pbOn(acc, bg, dark ? '#FFFFFF' : c.primary, 2.4),   // bullets, icons, big numbers on the page
    chip: dark ? pbOn(acc, bg, '#FFFFFF', 2.4) : c.primary,       // filled pills / tiles
    ink: light, sub: dark ? 'rgba(255,255,255,.84)' : hexA(c.ink, .74), mute: dark ? 'rgba(255,255,255,.62)' : hexA(c.ink, .52),
    line: dark ? 'rgba(255,255,255,.2)' : hexA(c.ink, .12), card: dark ? 'rgba(255,255,255,.1)' : hexA(c.primary, .06),
  };
}
const pbTextOn = fill => pbContrast(fill, '#FFFFFF') >= 2.6 ? '#FFFFFF' : '#111318';
function pbKit(g) {
  const k = {
    g,
    font: (w, px, fam) => { g.font = `${w} ${Math.round(px * 10) / 10}px ${fam || PB_BODY}`; },
    rr: (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); },
    segs: t => {
      const raw = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(String(t))].map(x => x.segment) : String(t).split(/(\s+)/);
      const out = [];
      raw.forEach(x => {
        if (!out.length) return out.push(x);
        if (/^\s+$/.test(x) || /^[)\]}.,!?:;%”’'"…\-–]+$/.test(x)) out[out.length - 1] += x;
        else if (/[(\[{“‘]$/.test(out[out.length - 1]) && !/\s$/.test(out[out.length - 1])) out[out.length - 1] += x;
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
  };
  return k;
}
/* text block: measure (draw=false) or draw; returns height */
function pbText(k, t, { x = 0, y = 0, w, size, weight = 600, fam, color, lh = 1.3, draw, align = 'left', maxLines }) {
  if (!t) return 0;
  k.font(weight, size, fam); let lines = k.wrap(t, w);
  if (maxLines && lines.length > maxLines) lines = lines.slice(0, maxLines);
  if (draw) {
    k.g.fillStyle = color; k.g.textAlign = align; const ax = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
    lines.forEach((l, i) => k.g.fillText(l, ax, y + size * (0.92 + (lh - 1) / 2) + i * size * lh));
    k.g.textAlign = 'left';
  }
  return lines.length * size * lh;
}

function pbMotif(k, st, P, x, y, w, h) {
  const { g } = k, m = st.motif, a = P.acc, wh = 'rgba(255,255,255,';
  g.save(); k.rr(x, y, w, h, 28 * (Math.min(w, h) / 600)); g.clip();
  g.fillStyle = P.panel; g.fillRect(x, y, w, h);
  const R = Math.max(w, h), cx = x + w, cy = y;
  if (m === 'geometric') {
    g.fillStyle = a; g.beginPath(); g.arc(x + w * .86, y + h * .18, R * .26, 0, Math.PI * 2); g.fill();
    g.fillStyle = wh + '.12)'; g.beginPath(); g.arc(x + w * .1, y + h * 1.02, R * .34, Math.PI, 0); g.fill();
    g.strokeStyle = wh + '.35)'; g.lineWidth = Math.max(3, R * .008); g.beginPath(); g.arc(x + w * .14, y + h * .2, R * .09, 0, Math.PI * 2); g.stroke();
    g.fillStyle = wh + '.9)'; g.fillRect(x + w * .72, y + h * .74, R * .1, R * .1);
  } else if (m === 'rays') {
    const ox = x + w * .5, oy = y + h * 1.08;
    for (let i = 0; i < 18; i++) { const a0 = Math.PI + i * Math.PI / 18; g.fillStyle = i % 2 ? wh + '.07)' : hexA(a, .28); g.beginPath(); g.moveTo(ox, oy); g.arc(ox, oy, R * 1.4, a0, a0 + Math.PI / 18); g.closePath(); g.fill(); }
    g.fillStyle = a; g.beginPath(); g.arc(ox, oy, R * .2, Math.PI, 0); g.fill();
  } else if (m === 'dots') {
    const step = R / 16;
    for (let i = 0; i * step < w + step; i++) for (let j = 0; j * step < h + step; j++) { const d = Math.hypot(i * step - w, j * step) / R; g.fillStyle = d < .55 ? hexA(a, .9 - d) : wh + '.14)'; g.beginPath(); g.arc(x + i * step + step / 2, y + j * step + step / 2, step * .14, 0, Math.PI * 2); g.fill(); }
  } else if (m === 'waves') {
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = i === 2 ? a : wh + (.08 + i * .025) + ')'; g.lineWidth = i === 2 ? R * .02 : R * .01; g.beginPath();
      for (let t = 0; t <= 40; t++) { const px = x + w * t / 40, py = y + h * (.25 + i * .1) + Math.sin(t / 40 * Math.PI * 3 + i * .7) * h * .06; t ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
  } else if (m === 'confetti') {
    const cols = [a, P.c.sky, P.c.coral, P.c.amber, '#FFFFFF'];
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 46; i++) {
      const px = x + rnd() * w, py = y + rnd() * h, s = R * (.012 + rnd() * .02);
      g.save(); g.translate(px, py); g.rotate(rnd() * Math.PI); g.fillStyle = cols[i % cols.length]; g.globalAlpha = .55 + rnd() * .45;
      i % 3 ? g.fillRect(-s, -s / 3, s * 2, s / 1.5) : (g.beginPath(), g.arc(0, 0, s * .6, 0, Math.PI * 2), g.fill()); g.restore();
    }
  } else if (m === 'stripes') {
    g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
    for (let i = -20; i < 20; i++) { g.fillStyle = i % 4 === 0 ? hexA(a, .85) : wh + (i % 2 ? '.05)' : '.1)'); g.fillRect(i * R * .06, -R * 2, R * .03, R * 4); }
    g.restore();
  }
  g.restore();
}
function pbVisual(k, st, P, x, y, w, h) {
  const { g } = k, rad = 28 * (Math.min(w, h) / 600) + 8, photo = st.visual !== 'graphic' && pbImg(st.photo);
  if (photo && st.template !== 'recognition') {
    g.save(); k.rr(x, y, w, h, rad); g.clip();
    const s = Math.max(w / photo.width, h / photo.height), pw = photo.width * s, ph = photo.height * s;
    g.drawImage(photo, x + (w - pw) / 2, y + (h - ph) * st.photoY, pw, ph); g.restore();
    return;
  }
  pbMotif(k, st, P, x, y, w, h);
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * .3;
  if (photo) {   // recognition: round portrait with a ring
    g.save(); g.beginPath(); g.arc(cx, cy, r * 1.12, 0, Math.PI * 2); g.fillStyle = P.c.amber; g.fill();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    const s = Math.max(2 * r / photo.width, 2 * r / photo.height), pw = photo.width * s, ph = photo.height * s;
    g.drawImage(photo, cx - pw / 2, cy - r + (2 * r - ph) * st.photoY, pw, ph); g.restore();
    k.icon('star', cx + r * .62, cy + r * .5, r * .5, '#FFFFFF', 2.4);
    return;
  }
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  k.icon(st.icon, cx - r * .55, cy - r * .55, r * 1.1, P.panel, 1.9);
}
function pbLogo(k, P, B, x, y, hMax, wMax) {   // returns width used
  const { g } = k, src = P.dark ? (B.logoDark || B.logo) : (B.logo || B.logoDark), im = pbImg(src);
  if (im) {
    const s = Math.min(hMax / im.height, wMax / im.width), w = im.width * s, h = im.height * s;
    if (P.dark && !B.logoDark) { g.fillStyle = '#FFFFFF'; k.rr(x - hMax * .18, y - hMax * .18 + (hMax - h) / 2, w + hMax * .36, h + hMax * .36, hMax * .2); g.fill(); }
    g.drawImage(im, x, y + (hMax - h) / 2, w, h); return w;
  }
  // wordmark fallback: brand square + organisation name
  g.fillStyle = P.dark ? '#FFFFFF' : P.c.primary; k.rr(x, y, hMax, hMax, hMax * .22); g.fill();
  k.icon('check', x + hMax * .16, y + hMax * .16, hMax * .68, P.dark ? P.c.primary : '#FFFFFF', 2.6);
  k.font(900, hMax * .42, PB_BODY); g.fillStyle = P.ink; g.fillText(k.wrap(B.org, wMax - hMax * 1.3)[0] || '', x + hMax * 1.25, y + hMax * .66);
  return wMax;
}

/* the poster — everything is relative to the canvas size */
function pbDraw(cv, st, fmtKey) {
  const fm = PB_FORMATS[fmtKey || st.format], W = fm[2], H = fm[3], B = pbBrand(), P = pbPalette(st, B), f = st.f;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), k = pbKit(g), u = Math.min(W, H) / 1080, land = W / H > 1.2, story = H / W > 1.6;
  g.textBaseline = 'alphabetic';
  g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
  if (!P.dark) { g.fillStyle = hexA(P.c.primary, .05); g.beginPath(); g.arc(W * 1.02, H * .02, Math.min(W, H) * .28, 0, Math.PI * 2); g.fill(); }

  const M = 72 * u, safeT = story ? 150 * u : 0, safeB = story ? 170 * u : 0;   // Story: keep clear of app UI
  /* header: logo + poster type */
  const hh = 64 * u, hy = M + safeT;
  pbLogo(k, P, B, M, hy, hh, W * .5);
  const tagTxt = PB_TEMPLATES[st.template][0].toUpperCase();
  k.font(600, 22 * u, PB_BODY); const tw = g.measureText(tagTxt).width;
  g.strokeStyle = P.line; g.lineWidth = 2 * u; k.rr(W - M - tw - 36 * u, hy + hh / 2 - 22 * u, tw + 36 * u, 44 * u, 22 * u); g.stroke();
  g.fillStyle = P.sub; g.fillText(tagTxt, W - M - tw - 18 * u, hy + hh / 2 + 8 * u);

  /* footer: org line + brand stripe */
  const stripe = 14 * u, fy = H - stripe - safeB - M * .55;
  k.font(600, 22 * u, PB_THAI); g.fillStyle = P.mute;
  g.fillText([B.org, B.footer].filter(Boolean).join('  ·  '), M, fy);
  const sc = [P.c.primary, P.c.sky, P.c.coral, P.c.amber], sw = W / sc.length;
  sc.forEach((c, i) => { g.fillStyle = (P.dark && c === P.bg) ? P.c.navy : c; g.fillRect(i * sw, H - stripe, sw + 1, stripe); });

  /* body region */
  const top = hy + hh + 44 * u, bottom = fy - 46 * u, bw = W - 2 * M;
  const hasVisual = st.visual !== 'none';
  const region = frac => {   // text area + visual area for a given share of the visual
    if (land) {
      const vw = frac ? bw * frac : 0;
      return { T: { x: M, y: top, w: bw - (vw ? vw + 64 * u : 0), h: bottom - top }, Vr: vw ? { x: W - M - vw, y: top, w: vw, h: bottom - top } : null };
    }
    const vh = frac ? (bottom - top) * frac : 0;
    return { T: { x: M, y: top + (vh ? vh + 48 * u : 0), w: bw, h: bottom - top - (vh ? vh + 48 * u : 0) }, Vr: vh ? { x: M, y: top, w: bw, h: vh } : null };
  };
  const base = !hasVisual ? 0 : land ? .4 : story ? .36 : (fmtKey || st.format) === 'portrait' ? .34 : .3;

  /* text blocks */
  const pts = pbPoints(f.content), date = pbDateText(f), qr = st.qrImg ? null : pbQr(safeUrl(st.qrUrl) || st.qrUrl.trim()), qrIm = pbImg(st.qrImg), hasQr = !!(qr || qrIm);
  const blocks = (s, w) => {
    const L = [];
    if (f.keyword) L.push({ gap: 24, h: () => 50 * u * s, d: (x, y) => { k.font(700, 24 * u * s, PB_THAI); const t = f.keyword.trim(), tw2 = g.measureText(t).width; g.fillStyle = P.chip; k.rr(x, y, tw2 + 40 * u * s, 50 * u * s, 25 * u * s); g.fill(); g.fillStyle = pbTextOn(P.chip); g.fillText(t, x + 20 * u * s, y + 34 * u * s); } });
    if (st.template === 'recognition' && f.highlight) L.push({ gap: 14, h: () => pbText(k, f.sub || '', { w, size: 34 * u * s, weight: 600, fam: PB_THAI }), d: (x, y) => pbText(k, f.sub || '', { x, y, w, size: 34 * u * s, weight: 600, fam: PB_THAI, color: P.sub, draw: 1 }) });
    const hSize = (land ? 92 : story ? 104 : 88) * u * s;
    L.push({ gap: 22, h: () => pbText(k, f.headline || 'Headline', { w, size: hSize, weight: 900, fam: PB_HEAD, lh: 1.22 }), d: (x, y) => pbText(k, f.headline || 'Headline', { x, y, w, size: hSize, weight: 900, fam: PB_HEAD, lh: 1.22, color: f.headline ? P.ink : P.mute, draw: 1 }) });
    if (st.template === 'recognition' && f.highlight) {
      const hs = 64 * u * s;
      L.push({ gap: 24, h: () => pbText(k, f.highlight, { w, size: hs, weight: 700, fam: PB_THAI, lh: 1.25 }) + 20 * u * s, d: (x, y) => { g.fillStyle = P.accOnBg; g.fillRect(x, y, 90 * u * s, 8 * u * s); pbText(k, f.highlight, { x, y: y + 20 * u * s, w, size: hs, weight: 700, fam: PB_THAI, lh: 1.25, color: P.dark ? P.accOnBg : P.c.primary, draw: 1 }); } });
    } else if (f.sub) L.push({ gap: 26, h: () => pbText(k, f.sub, { w, size: 38 * u * s, weight: 500, fam: PB_THAI, lh: 1.4 }), d: (x, y) => pbText(k, f.sub, { x, y, w, size: 38 * u * s, weight: 500, fam: PB_THAI, lh: 1.4, color: P.sub, draw: 1 }) });
    if (st.template === 'campaign' && f.highlight) {
      const hs = 132 * u * s;
      L.push({ gap: 26, h: () => pbText(k, f.highlight, { w, size: hs, weight: 900, fam: PB_HEAD, lh: 1.12 }), d: (x, y) => pbText(k, f.highlight, { x, y, w, size: hs, weight: 900, fam: PB_HEAD, lh: 1.12, color: P.accOnBg, draw: 1 }) });
    }
    if (pts.length) {
      const ps = 33 * u * s, numbered = st.template === 'howto', ind = numbered ? 66 * u * s : 34 * u * s;
      const one = p => pbText(k, p, { w: w - ind, size: ps, weight: 500, fam: PB_THAI, lh: 1.42 });
      L.push({
        gap: 28, h: () => pts.reduce((a, p) => a + Math.max(one(p), numbered ? 48 * u * s : 0) + 16 * u * s, 0) - 16 * u * s, d: (x, y) => {
          pts.forEach((p, i) => {
            const hh2 = Math.max(one(p), numbered ? 48 * u * s : 0);
            if (numbered) { g.fillStyle = P.chip; g.beginPath(); g.arc(x + 24 * u * s, y + 24 * u * s, 24 * u * s, 0, Math.PI * 2); g.fill(); k.font(700, 26 * u * s, PB_BODY); g.fillStyle = pbTextOn(P.chip); g.textAlign = 'center'; g.fillText(String(i + 1), x + 24 * u * s, y + 33 * u * s); g.textAlign = 'left'; }
            else { g.fillStyle = P.accOnBg; g.fillRect(x, y + ps * .55, 14 * u * s, 14 * u * s); }
            pbText(k, p, { x: x + ind, y: numbered ? y + Math.max(0, (48 * u * s - ps * 1.42) / 2) : y, w: w - ind, size: ps, weight: 500, fam: PB_THAI, lh: 1.42, color: P.ink, draw: 1 });
            y += hh2 + 16 * u * s;
          });
        },
      });
    }
    const rows = [date && ['calendar', date], f.time && ['clock', f.time], f.venue && ['pin', f.venue]].filter(Boolean);
    if (rows.length) {
      const rs = 31 * u * s, big = st.template === 'event' && f.date, tile = big ? 132 * u * s : 0, rw = w - (tile ? tile + 28 * u * s : 0) - 56 * u * s;
      const rowH = r => Math.max(pbText(k, r[1], { w: rw, size: rs, weight: 600, fam: PB_THAI, lh: 1.32 }), 40 * u * s);
      const totalH = () => Math.max(rows.reduce((a, r) => a + rowH(r) + 12 * u * s, -12 * u * s), tile) + 48 * u * s;
      L.push({
        gap: 28, h: totalH, d: (x, y) => {
          const hb = totalH(); g.fillStyle = P.card; k.rr(x, y, w, hb, 22 * u * s); g.fill();
          let cx = x + 24 * u * s;
          if (tile) {
            const d0 = parse(f.date), ty = y + (hb - tile) / 2;
            g.fillStyle = P.chip; k.rr(cx, ty, tile, tile, 18 * u * s); g.fill();
            const tc = pbTextOn(P.chip); g.fillStyle = tc; g.textAlign = 'center';
            k.font(900, 64 * u * s, PB_HEAD); g.fillText(String(d0.getDate()), cx + tile / 2, ty + tile * .56);
            k.font(700, 24 * u * s, PB_THAI); g.fillText(`${TH_MON[d0.getMonth()]} ${String(d0.getFullYear() + 543).slice(2)}`, cx + tile / 2, ty + tile * .84); g.textAlign = 'left';
            cx += tile + 28 * u * s;
          }
          let ry = y + (hb - rows.reduce((a, r) => a + rowH(r) + 12 * u * s, -12 * u * s)) / 2;
          rows.forEach(r => { const rh = rowH(r); k.icon(r[0], cx, ry + 4 * u * s, 32 * u * s, P.accOnBg, 2.2); pbText(k, r[1], { x: cx + 48 * u * s, y: ry, w: rw, size: rs, weight: 600, fam: PB_THAI, lh: 1.32, color: P.ink, draw: 1 }); ry += rh + 12 * u * s; });
        },
      });
    }
    return L;
  };
  const tail = (s, w) => {   // anchored to the bottom of the text area: CTA + QR, fine print
    const L = [], q = hasQr ? Math.max(150, 210 * s) * u : 0, cw = w - (q ? q + 32 * u : 0);
    const label = st.qrLabel || (hasQr ? 'สแกน QR Code' : '');
    if (f.cta || hasQr) {
      L.push({
        gap: 20, h: () => Math.max(q + (label ? 40 * u : 0), f.cta ? 84 * u * s : 0), d: (x, y) => {
          const hb = Math.max(q + (label ? 40 * u : 0), f.cta ? 84 * u * s : 0);
          if (f.cta) {
            k.font(700, 32 * u * s, PB_THAI); const t = k.wrap(f.cta.trim(), cw - 120 * u * s)[0] || '', tw2 = g.measureText(t).width, ph = 84 * u * s, py = y + hb - ph - (q ? (label ? 40 * u : 0) : 0);
            g.fillStyle = P.chip; k.rr(x, py, tw2 + 120 * u * s, ph, ph / 2); g.fill();
            const tc = pbTextOn(P.chip); g.fillStyle = tc; g.fillText(t, x + 42 * u * s, py + ph * .64);
            g.strokeStyle = tc; g.lineWidth = 4 * u * s; g.lineCap = 'round'; g.beginPath(); const ax = x + tw2 + 72 * u * s, ay = py + ph / 2; g.moveTo(ax, ay); g.lineTo(ax + 22 * u * s, ay); g.moveTo(ax + 12 * u * s, ay - 10 * u * s); g.lineTo(ax + 22 * u * s, ay); g.lineTo(ax + 12 * u * s, ay + 10 * u * s); g.stroke();
          }
          if (q) {
            const qx = x + w - q, pd = 14 * u;
            g.fillStyle = '#FFFFFF'; k.rr(qx, y, q, q, 16 * u); g.fill();
            if (!P.dark) { g.strokeStyle = P.line; g.lineWidth = 2 * u; k.rr(qx, y, q, q, 16 * u); g.stroke(); }
            if (qrIm) { const s2 = Math.min((q - 2 * pd) / qrIm.width, (q - 2 * pd) / qrIm.height); g.drawImage(qrIm, qx + (q - qrIm.width * s2) / 2, y + (q - qrIm.height * s2) / 2, qrIm.width * s2, qrIm.height * s2); }
            else { const cell = (q - 2 * pd) / qr.n; g.fillStyle = '#000'; for (let r = 0; r < qr.n; r++) for (let c = 0; c < qr.n; c++) if (qr.dark(r, c)) g.fillRect(qx + pd + c * cell, y + pd + r * cell, cell + .5, cell + .5); }
            if (label) { k.font(600, 22 * u, PB_THAI); g.fillStyle = P.sub; g.textAlign = 'center'; g.fillText(k.wrap(label, q + 40 * u)[0] || '', qx + q / 2, y + q + 32 * u); g.textAlign = 'left'; }
          }
        },
      });
    }
    if (f.note) L.push({ gap: 0, h: () => pbText(k, f.note, { w, size: 22 * u * Math.max(s, .85), weight: 500, fam: PB_THAI, lh: 1.4 }), d: (x, y) => pbText(k, f.note, { x, y, w, size: 22 * u * Math.max(s, .85), weight: 500, fam: PB_THAI, lh: 1.4, color: P.mute, draw: 1 }) });
    return L;
  };
  const sum = L => L.reduce((a, b, i) => a + b.h() + (i < L.length - 1 ? b.gap * u : 0), 0);
  const fit = R0 => {   // largest type scale that fits the text area
    for (let s = story ? 1.45 : 1.15; s >= .4; s -= .025) { const A = blocks(s, R0.T.w), Z = tail(s, R0.T.w); if (sum(A) + sum(Z) + (Z.length ? 40 * u : 0) <= R0.T.h) return { S: s, A, Z }; }
    return { S: .4, A: blocks(.4, R0.T.w), Z: tail(.4, R0.T.w) };
  };
  /* dense copy: the visual gives up space (down to a slim band) before the text gets small */
  let R = region(base), F = fit(R);
  for (const m of [.75, .55, .4, 0]) { if (!base || F.S >= .78) break; const R2 = region(base * m), F2 = fit(R2); if (F2.S > F.S + (m ? 0 : .1)) { R = R2; F = F2; } }
  const { T, Vr } = R, { S, A, Z } = F;
  if (Vr) pbVisual(k, st, P, Vr.x, Vr.y, Vr.w, Vr.h);
  /* text sits next to the visual: vertically centred in landscape, top-aligned otherwise */
  const free = T.h - sum(A) - sum(Z) - (Z.length ? 40 * u : 0);
  let y = T.y + (land ? Math.max(0, free) * (Z.length ? .3 : .5) : (Vr ? 0 : Math.max(0, free) * .25));
  A.forEach(b => { b.d(T.x, y); y += b.h() + b.gap * u; });
  let yb = T.y + T.h - sum(Z);
  Z.forEach(b => { b.d(T.x, yb); yb += b.h() + b.gap * u; });
  return { scale: S, overflow: S === .4 && free < 0, dense: S < .6 };
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
        <div class="pb-tpls">${Object.entries(PB_TEMPLATES).map(([key, t]) => `<button type="button" class="pb-tpl ${key === st.template ? 'on' : ''}" data-act="pbTpl" data-id="${key}" aria-pressed="${key === st.template}"><span class="pb-tpl-ico">${pbIconSvg(t[2], 22)}</span><b>${t[0]}</b><small>${t[1]}</small></button>`).join('')}</div>
        <div class="pb-sub">ขนาดภาพ <small class="muted">— เปลี่ยนได้ทุกเมื่อ ระบบจัดข้อความและภาพใหม่ให้</small></div>
        <div class="pb-fmts">${Object.entries(PB_FORMATS).map(([key, fm]) => `<button type="button" class="pb-fmt ${key === st.format ? 'on' : ''}" data-act="pbFmt" data-id="${key}" aria-pressed="${key === st.format}"><i style="aspect-ratio:${fm[2]}/${fm[3]}"></i><b>${fm[0]} ${fm[1]}</b><small>${fm[2]} × ${fm[3]} px · ${fm[4]}</small></button>`).join('')}</div>
      </section>
      <section class="card pb-step"><h3><span class="pb-n">2</span>เนื้อหา <small class="muted">· ${T[0]}</small></h3>
        <div class="form-grid">
          ${pbField('keyword', 'Keyword <small>(คำนำ / หมวด)</small>', st.template === 'event' ? 'เช่น เชิญร่วมงาน' : st.template === 'recognition' ? 'เช่น Congratulations' : 'เช่น ประกาศ')}
          ${hint.highlight ? pbField('highlight', hint.highlight[0], hint.highlight[1]) : '<span class="pb-gap"></span>'}
          ${pbField('headline', 'Headline <em>*</em>', hint.headline, 'input', 'class="pb-big" maxlength="120"').replace('class="field ', 'class="field full ')}
          ${pbField('sub', st.template === 'recognition' ? 'คำโปรย <small>(เช่น ผลงาน / รางวัล)</small>' : 'Sub-headline', st.template === 'recognition' ? 'เช่น ยอดขายสูงสุดประจำไตรมาส 3' : 'ประโยคสนับสนุน 1 บรรทัด').replace('class="field ', 'class="field full ')}
          ${pbField('content', 'Content', hint.content, 'textarea')}
          ${pbField('cta', 'Call to action <small>(ปุ่ม / คำชวน)</small>', 'เช่น ลงทะเบียนเลย')}
        </div>
        <details class="pb-more" id="pbMore" ${PB_MORE_OPEN || st.template === 'event' || st.f.date || st.f.time || st.f.venue || st.qrUrl || st.qrImg || st.f.note ? 'open' : ''}><summary>รายละเอียดเพิ่มเติม · วัน เวลา สถานที่ QR Code เงื่อนไข</summary>
          <div class="form-grid">
            ${pbField('date', 'วันที่', '', 'input', 'type="date"')}
            ${pbField('dateEnd', 'ถึงวันที่ <small>(ถ้ามีหลายวัน)</small>', '', 'input', 'type="date"')}
            ${pbField('time', 'เวลา', 'เช่น 09:00 – 12:00 น.')}
            ${pbField('venue', 'สถานที่', 'เช่น ห้องประชุมใหญ่ ชั้น 12 / Zoom')}
            <label class="field"><span>QR Code จากลิงก์</span><input id="pbQrUrl" value="${esc(st.qrUrl)}" placeholder="https://…" inputmode="url" ${st.qrImg ? 'disabled' : ''}></label>
            <div class="field"><span>หรือใช้รูป QR ที่มีอยู่</span><div class="btn-row">${st.qrImg ? `<span class="badge">ใช้รูป QR แล้ว</span><button type="button" class="btn btn-sm btn-ghost" data-act="pbQrClear">${ico('x', 13)} เอาออก</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-act="pbQrImg">${ico('upload', 13)} อัปโหลดรูป QR</button>`}</div></div>
            <label class="field"><span>ข้อความใต้ QR</span><input id="pbQrLabel" value="${esc(st.qrLabel)}" placeholder="สแกน QR Code"></label>
            <label class="field full"><span>เงื่อนไข / หมายเหตุ <small>(ตัวเล็กท้ายโปสเตอร์ — AI ไม่แก้ไข)</small></span><textarea data-pf="note" rows="2" placeholder="เช่น *เฉพาะตัวแทนที่มีผลงานตั้งแต่ 1 ต.ค. – 31 ธ.ค. 2569">${esc(st.f.note)}</textarea></label>
          </div>
        </details>
      </section>
      <section class="card pb-step"><h3><span class="pb-n">3</span>ให้ AI ช่วยเรียบเรียง</h3>
        <p class="muted small">AI ปรับถ้อยคำให้อ่านง่าย จัดลำดับเนื้อหา และเลือกไอคอน กราฟิก และสีเน้นจาก CI — <b>ไม่เปลี่ยนข้อเท็จจริง</b> (ตัวเลข วันเวลา สถานที่ เงื่อนไข) ระบบตรวจตัวเลขซ้ำให้อีกชั้น</p>
        <div class="btn-row mt"><button type="button" class="btn btn-primary" data-act="pbAI" id="pbAIBtn">${ico('sparkles', 15)} เรียบเรียงด้วย AI</button><button type="button" class="btn btn-ghost" data-act="pbAuto">จัดอัตโนมัติ (ไม่ใช้ AI)</button></div>
        ${ai ? `<div class="pb-ai ${ai.warn && ai.warn.length ? 'warn' : ''}">
          <div><b>${ai.by === 'ai' ? 'AI เรียบเรียงแล้ว' : 'จัดเรียงอัตโนมัติแล้ว'}</b>${ai.note ? ` — ${esc(ai.note)}` : ''}</div>
          ${ai.warn && ai.warn.length ? `<p class="pb-warn">${ico('alert', 15)} ตรวจข้อเท็จจริง: ${ai.warn.map(esc).join(' · ')} — กรุณาแก้ในช่องเนื้อหาหรือย้อนกลับ</p>` : `<p class="small muted">${ico('check', 14)} ตัวเลขและวันเวลาครบตามต้นฉบับ</p>`}
          <button type="button" class="btn btn-sm btn-ghost" data-act="pbRevert">${ico('left', 13)} ย้อนกลับเป็นข้อความเดิม</button></div>` : ''}
      </section>
    </div>
    <div class="pb-side">
      <section class="card pb-pvcard"><h3><span class="pb-n">4</span>Preview และปรับแต่ง</h3>
        <div class="pb-fmt-mini">${pbChips(Object.fromEntries(Object.entries(PB_FORMATS).map(([key, fm]) => [key, fm[1]])), st.format, 'pbFmt')}</div>
        <div class="pb-pv" id="pbPv" data-fmt="${st.format}"><canvas id="pbCv" role="img" aria-label="ตัวอย่างโปสเตอร์ ${esc(st.f.headline)}"></canvas></div>
        <p class="pb-fit" id="pbFit" hidden>${ico('alert', 14)} ข้อความยาวเกินพื้นที่ของขนาดนี้ — ลดเนื้อหา หรือซ่อนภาพประกอบ</p>
        <div class="pb-tune">
          <div class="pb-row"><span>พื้นหลัง</span>${pbChips(PB_STYLES, st.style, 'pbStyle', (key, v) => `${dot({ royal: C.primary, navy: C.navy, paper: C.paper, white: '#fff' }[key])}${v[0]}`)}</div>
          <div class="pb-row"><span>สีเน้น</span>${pbChips(PB_ACCENTS, st.accent, 'pbAccent', (key, v) => `${dot(C[key])}${v}`)}</div>
          <div class="pb-row"><span>ภาพประกอบ</span>${pbChips({ auto: st.photo ? 'รูปที่อัปโหลด' : 'กราฟิก + ไอคอน', graphic: 'กราฟิกเท่านั้น', none: 'ไม่มี' }, st.photo ? st.visual : (st.visual === 'graphic' ? 'auto' : st.visual), 'pbVisual')}
            <div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-act="pbPhoto">${ico('image', 13)} ${st.photo ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</button>${st.photo ? `<button type="button" class="btn btn-sm btn-danger-ghost" data-act="pbPhotoClear">${ico('trash', 13)} ลบรูป</button><label class="pb-range">ตำแหน่งภาพ<input type="range" id="pbPhotoY" min="0" max="1" step=".05" value="${st.photoY}"></label>` : ''}</div></div>
          <div class="pb-row"><span>ลายกราฟิก</span>${pbChips(PB_MOTIFS, st.motif, 'pbMotif')}</div>
          <div class="pb-row"><span>ไอคอน</span><div class="pb-icons">${Object.keys(PB_ICONS).map(key => `<button type="button" class="${key === st.icon ? 'on' : ''}" data-act="pbIcon" data-id="${key}" title="${key}" aria-label="ไอคอน ${key}" aria-pressed="${key === st.icon}">${pbIconSvg(key, 20)}</button>`).join('')}</div></div>
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
    if (el.dataset.pf) { PST.f[el.dataset.pf] = el.value; pbTouch(); pbSchedule(); return; }
    if (el.id === 'pbQrUrl') { PST.qrUrl = el.value; pbTouch(); pbSchedule(); return; }
    if (el.id === 'pbQrLabel') { PST.qrLabel = el.value; pbTouch(); pbSchedule(); return; }
    if (el.id === 'pbPhotoY') { PST.photoY = +el.value; pbTouch(); pbSchedule(); }
  });
  $('#pbMore', R).ontoggle = e => { PB_MORE_OPEN = e.target.open; };
  $('#pbReviewed', R).onchange = e => { PST.reviewed = e.target.checked; pbExportState(); };
  pbExportState(); pbPaint(); pbFonts();
};
const pbRender = () => { const v = $('#view'); if (v && route().name === 'poster') V.poster(v, true); };

/* ---------- choices ---------- */
ACT.pbTpl = el => {
  const t = PB_TEMPLATES[el.dataset.id]; if (!t) return;
  PST.template = el.dataset.id; [, , PST.icon, PST.motif, PST.style, PST.accent] = t; pbTouch(); pbRender();
};
ACT.pbFmt = el => { if (!PB_FORMATS[el.dataset.id]) return; PST.format = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbStyle = el => { PST.style = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbAccent = el => { PST.accent = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbMotif = el => { PST.motif = el.dataset.id; if (PST.visual === 'none') PST.visual = 'auto'; pbTouch(); pbRender(); };
ACT.pbIcon = el => { PST.icon = el.dataset.id; if (PST.visual === 'none') PST.visual = 'auto'; pbTouch(); pbRender(); };
ACT.pbVisual = el => { PST.visual = el.dataset.id; pbTouch(); pbRender(); };
ACT.pbPhoto = async () => { const f = await pickFile(); if (!f) return; try { PST.photo = await pbLoadImage(f, 1600); PST.visual = 'auto'; pbTouch(); pbRender(); } catch (e) { toast(e.message, 'error'); } };
ACT.pbPhotoClear = () => { PST.photo = null; pbTouch(); pbRender(); };
ACT.pbQrImg = async () => { const f = await pickFile(); if (!f) return; try { PST.qrImg = await pbLoadImage(f, 800, true); pbTouch(); pbRender(); } catch (e) { toast(e.message, 'error'); } };
ACT.pbQrClear = () => { PST.qrImg = null; pbTouch(); pbRender(); };
ACT.pbNew = async () => {
  if ((PST.f.headline || PST.f.content) && !(await confirmBox('เริ่มโปสเตอร์ใหม่? งานที่ยังไม่บันทึกจะหายไป', 'เริ่มใหม่'))) return;
  const keep = { template: PST.template, format: PST.format }; PST = pbBlank(); Object.assign(PST, keep);
  [, , PST.icon, PST.motif, PST.style, PST.accent] = PB_TEMPLATES[PST.template]; pbRender();
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
const PB_ICON_WORDS = [[/ประชุม|สัมมนา|บรรยาย|webinar|talk/i, 'mic'], [/อบรม|เรียน|course|academy|ความรู้|คู่มือ/i, 'book'], [/รางวัล|award|ชนะ|แชมป์|trophy/i, 'trophy'], [/ยินดี|congrat|ชื่นชม/i, 'star'],
  [/ยอด|เป้า|target|kpi/i, 'target'], [/โบนัส|เงิน|บาท|ค่าคอม|commission|incentive/i, 'coin'], [/ของขวัญ|ของรางวัล|gift|แจก/i, 'gift'], [/เติบโต|เพิ่มขึ้น|growth|สถิติ/i, 'chart'],
  [/ปลอดภัย|ความเสี่ยง|security|ป้องกัน|compliance/i, 'shield'], [/เปิดตัว|launch|ใหม่|new/i, 'rocket'], [/สุขภาพ|ดูแล|ขอบคุณ|thank/i, 'heart'], [/ทีม|team|สมาชิก/i, 'users'],
  [/เคล็ดลับ|tip|ไอเดีย|idea/i, 'bulb'], [/เวลา|ปรับเวลา|deadline|ภายใน/i, 'clock'], [/ประกาศ|แจ้ง/i, 'megaphone']];
function pbAutoArrange() {
  const f = PST.f, before = { ...f };
  const tidy = s => String(s || '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  PB_AI_FIELDS.forEach(k2 => { f[k2] = tidy(f[k2]); });
  let pts = pbPoints(f.content);
  if (pts.length === 1 && pts[0].length > 70) pts = pts[0].split(/(?<=[.!?])\s+|\s{2,}/).map(x => x.trim()).filter(Boolean);
  f.content = pts.join('\n');
  if (!f.headline && pts.length) { f.headline = pts.shift(); f.content = pts.join('\n'); }
  const all = [f.keyword, f.headline, f.sub, f.content].join(' '), hit = PB_ICON_WORDS.find(([re]) => re.test(all));
  if (hit) PST.icon = hit[1];
  if (!f.keyword) f.keyword = { announce: 'ประกาศ', event: 'ขอเชิญร่วมงาน', campaign: 'Campaign', howto: 'How-to', recognition: 'Congratulations' }[PST.template];
  PST.ai = { by: 'auto', orig: before, note: 'จัดช่องว่าง แยกเนื้อหาเป็นข้อ เลือกไอคอนตามคำสำคัญ', warn: pbFactCheck(before, f) };
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
    if (PB_ICONS[x.icon]) PST.icon = x.icon; if (PB_MOTIFS[x.motif]) PST.motif = x.motif; if (PB_ACCENTS[x.accent]) PST.accent = x.accent;
    if (PST.visual === 'none') PST.visual = 'auto';
    PST.ai = { by: 'ai', orig: before, note: x.note || '', warn: pbFactCheck(before, f) };
    toast(PST.ai.warn.length ? 'AI เรียบเรียงแล้ว — มีจุดที่ต้องตรวจตัวเลข' : 'AI เรียบเรียงแล้ว — ตรวจ Preview ก่อน Export', PST.ai.warn.length ? 'error' : 'ok');
  } catch (e) {
    if (!e.local) { if (btn) { btn.disabled = false; btn.innerHTML = `${ico('sparkles', 15)} เรียบเรียงด้วย AI`; } return toast(e.message, 'error'); }
    pbAutoArrange(); toast(Store.mode === 'server' ? 'ยังไม่ได้เปิดใช้ AI — ใช้การจัดอัตโนมัติแทน' : 'โหมดสาธิต (ไม่มีเซิร์ฟเวอร์) — ใช้การจัดอัตโนมัติแทน AI');
  }
  pbTouch(); pbRender();
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
  const logoBox = key => `<div class="pb-logo ${key === 'logoDark' ? 'dark' : ''}" id="pbL_${key}">${draft[key] ? `<img src="${draft[key]}" alt="">` : '<span class="muted small">ใช้ชื่อองค์กรแทนโลโก้</span>'}</div>`;
  modal({
    title: 'CI Control · มาตรฐานภาพลักษณ์', wide: true, cls: 'pb-brand',
    body: `<p class="muted small">${can ? 'กำหนดสี โลโก้ และข้อความท้ายโปสเตอร์ตามที่ทีม Brand อนุมัติ — ทุกคนในทีมใช้ชุดเดียวกัน ผู้ใช้เลือกได้เฉพาะจากชุดนี้' : 'ล็อกโดย Admin / ทีม Brand — ผู้ใช้เลือกได้เฉพาะสีและองค์ประกอบในชุดนี้'}</p>
      <div class="form-grid mt">
        <label class="field"><span>ชื่อองค์กร / ทีม</span><input id="pbBOrg" value="${esc(draft.org)}" ${can ? '' : 'disabled'}></label>
        <label class="field"><span>ข้อความท้ายโปสเตอร์</span><input id="pbBFoot" value="${esc(draft.footer)}" ${can ? '' : 'disabled'}></label>
        <div class="field"><span>โลโก้ (สำหรับพื้นสว่าง)</span>${logoBox('logo')}${can ? `<div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-logo="logo">${ico('upload', 13)} อัปโหลด PNG</button><button type="button" class="btn btn-sm btn-danger-ghost" data-logo-x="logo">ลบ</button></div>` : ''}</div>
        <div class="field"><span>โลโก้สีขาว (สำหรับพื้นเข้ม) <small>— ถ้าไม่มี ระบบวางโลโก้หลักบนป้ายสีขาว</small></span>${logoBox('logoDark')}${can ? `<div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-logo="logoDark">${ico('upload', 13)} อัปโหลด PNG</button><button type="button" class="btn btn-sm btn-danger-ghost" data-logo-x="logoDark">ลบ</button></div>` : ''}</div>
      </div>
      <h4 class="mt">สีที่อนุมัติ</h4>
      <div class="pb-colors">${Object.keys(PB_BRAND_DEFAULT.colors).map(key => `<label class="pb-color"><input type="color" data-col="${key}" value="${draft.colors[key]}" ${can ? '' : 'disabled'}><span><b>${PB_COLOR_LABEL[key]}</b><small>${draft.colors[key].toUpperCase()}</small></span></label>`).join('')}</div>
      <h4 class="mt">ฟอนต์</h4>
      <p class="small muted">Headline: <b>Publico</b> (เมื่อติดตั้งในเครื่อง) / Source Serif 4 · ตัวอักษรอังกฤษ: <b>Source Sans Pro</b> · ภาษาไทย: <b>IBM Plex Sans Thai</b> — ล็อกในระบบ</p>`,
    actions: can ? [
      { label: 'คืนค่าเริ่มต้น', cls: 'btn-ghost', left: true, onClick: async () => { if (!(await confirmBox('คืนค่า CI เป็นค่าเริ่มต้น?', 'คืนค่า'))) return false; delete S().settings.brand; commit(); pbRender(); toast('คืนค่า CI แล้ว'); } },
      { label: 'ยกเลิก' },
      { label: 'บันทึก CI', cls: 'btn-primary', onClick: () => { S().settings.brand = draft; commit(); pbRender(); toast('บันทึก CI แล้ว — ใช้กับโปสเตอร์ของทุกคน'); } },
    ] : [{ label: 'ปิด', cls: 'btn-primary' }],
    onOpen(md) {
      if (!can) return;
      $('#pbBOrg', md.el).oninput = e => { draft.org = e.target.value.trim() || PB_BRAND_DEFAULT.org; };
      $('#pbBFoot', md.el).oninput = e => { draft.footer = e.target.value.trim(); };
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
