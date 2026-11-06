'use strict';
/* ============================================================
   Poster Studio · extra flat illustrations for announcements and PR
   (adds to PA_CHARS from poster-art.js) + stand-alone objects + decor.
   Objects are drawn in their own small box and scaled to the layer.
   ============================================================ */
function paBoard(g, x, y) {   // small chart board the presenter points at
  paRR(g, x, y, 46, 36, 4, '#FFFFFF'); g.strokeStyle = '#C9D3EA'; g.lineWidth = 1.4; g.strokeRect(x, y, 46, 36);
  [[8, 12, '#6574F8'], [17, 20, '#00008F'], [26, 15, '#F2A0AB'], [35, 26, '#6574F8']].forEach(([dx, h, c]) => paRR(g, x + dx - 3, y + 31 - h, 6, h, 1.5, c));
  g.strokeStyle = '#B9C4D8'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + 10, y + 36); g.lineTo(x + 6, y + 58); g.moveTo(x + 36, y + 36); g.lineTo(x + 40, y + 58); g.stroke();
}
function paConfetti(g) {
  [[-46, -112, '#F2A0AB', .4], [44, -118, '#F6C873', -.5], [-30, -128, '#6574F8', .9], [30, -132, '#A9DDC5', .2], [-60, -90, '#F6C873', -.2], [62, -96, '#F2A0AB', .7], [0, -138, '#FF1721', .3]].forEach(([x, y, c, a]) => { g.save(); g.translate(x, y); g.rotate(a); paRR(g, -4, -1.6, 8, 3.2, 1.2, c); g.restore(); });
  [[-52, -124, '#6574F8'], [54, -128, '#F2A0AB'], [16, -144, '#F6C873']].forEach(([x, y, c]) => paCircle(g, x, y, 2.6, c));
}
function paLaptopFront(g) {   // back of an open laptop in front of the person
  paRR(g, -30, -52, 60, 38, 4, '#C9D3EA'); paRR(g, -28, -50, 56, 34, 3, '#DCE3F2'); paCircle(g, 0, -33, 5, '#FFFFFF');
  paRR(g, -36, -15, 72, 6, 3, '#B4BFD8');
}
Object.assign(PA_CHARS, {
  presenter: ['วิทยากร / อบรม', /อบรม|สัมมนา|วิทยากร|นำเสนอ|ประชุม|training|workshop|present|บรรยาย|ชี้แจง/i, (g, r, t) => { paBg(g, r, t, 'office'); paFig(g, r, { skin: PA_SKIN[1], hair: PA_HAIR[0], style: 'bob', top: '#00008F', extra: 'blazer', pose: 'point', ext: [-41, 110], prop: g2 => paBoard(g2, 64, -104) }); }],
  cheer: ['ฉลอง / ข่าวดี', /ฉลอง|ข่าวดี|เปิดตัว|ยินดี|สำเร็จ|ขอบคุณ|celebrat|launch|new|ใหม่/i, (g, r, t) => { paBg(g, r, t, 'bright'); paFig(g, r, { skin: PA_SKIN[2], hair: PA_HAIR[1], style: 'pony', top: '#6574F8', pose: 'cheer', ext: [-64, 66], hs: .8, prop: g2 => paConfetti(g2) }); }],
  calendar: ['วันที่ / กำหนดการ', /กำหนด|วันที่|ภายใน|เส้นตาย|deadline|ปฏิทิน|นัด|ตาราง|ส่งงาน|ครบกำหนด/i, (g, r, t) => { paBg(g, r, t, 'office'); paFig(g, r, { skin: PA_SKIN[0], hair: PA_HAIR[2], style: 'long', top: '#2F8F83', extra: 'collar', pose: 'holdR', ext: [-41, 74], prop: g2 => { g2.save(); g2.translate(52, -70); g2.scale(1.15, 1.15); paCal(g2, 0, 0); g2.restore(); } }); }],
  laptop: ['ทำงาน / ระบบออนไลน์', /ระบบ|อีเมล|email|คอมพิวเตอร์|ออนไลน์|e-?learning|เรียน|อัปเดต|update|system|ลงทะเบียน|กรอก/i, (g, r, t) => { paBg(g, r, t, 'office'); paFig(g, r, { skin: PA_SKIN[1], hair: PA_HAIR[0], style: 'short', top: '#F2A0AB', extra: 'collar', pose: 'chest', glasses: true, prop: g2 => paLaptopFront(g2) }); }],
});
PA_ORDER.push('presenter', 'cheer', 'calendar', 'laptop');

/* ---------- stand-alone objects: [Thai name, bbox [x0,y0,x1,y1], draw(g)] ---------- */
const SA_PROPS = {
  shield: ['โล่คุ้มครอง', [-19, -24, 19, 22], g => paShield(g, 0, 0, 1)],
  coins: ['เหรียญ', [-12, -20, 12, 5], g => paCoins(g, 0, 0)],
  trophy: ['ถ้วยรางวัล', [-21, -38, 21, 0], g => paTrophy(g, 0, 0)],
  mega: ['โทรโข่ง', [-21, -24, 31, 22], g => paMega(g, 0, 0)],
  cal: ['ปฏิทิน', [-15, -16, 15, 16], g => paCal(g, 0, 0)],
  heart: ['หัวใจ', [-15, -14, 15, 12], g => paHeart(g, 0, 0, 1)],
  phone: ['มือถือ', [-9, -17, 9, 17], g => paPhone(g, 0, 0)],
  clip: ['เช็กลิสต์', [-17, -24, 17, 22], g => paClip(g, 0, 0, 34, 44)],
  gift: ['ของขวัญ', [-16, -22, 16, 16], g => {
    paRR(g, -15, -6, 30, 22, 2, '#FF6B7A'); paRR(g, -16, -12, 32, 8, 2, '#FF8A96'); g.fillStyle = '#F6C873'; g.fillRect(-3, -12, 6, 28);
    g.strokeStyle = '#F6C873'; g.lineWidth = 3; g.beginPath(); g.ellipse(-6, -15, 6, 4, -.5, 0, 6.3); g.ellipse(6, -15, 6, 4, .5, 0, 6.3); g.stroke();
  }],
  clock: ['นาฬิกา', [-16, -16, 16, 16], g => {
    paCircle(g, 0, 0, 16, '#6574F8'); paCircle(g, 0, 0, 12.5, '#FFFFFF'); g.strokeStyle = '#00008F'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -8); g.moveTo(0, 0); g.lineTo(6, 3); g.stroke(); paCircle(g, 0, 0, 1.8, '#FF1721');
  }],
  pin: ['สถานที่', [-12, -18, 12, 17], g => {
    g.fillStyle = '#FF1721'; g.fill(paP('M0,17 C-6,8 -12,2 -12,-6 C-12,-13 -6,-18 0,-18 C6,-18 12,-13 12,-6 C12,2 6,8 0,17 Z')); paCircle(g, 0, -6, 4.6, '#FFFFFF');
  }],
  star: ['ดาว', [-16, -16, 16, 15], g => {
    g.fillStyle = '#F6C873'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 16; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1); } g.closePath(); g.fill();
  }],
  chat: ['ข้อความ', [-18, -14, 18, 16], g => {
    paRR(g, -18, -14, 36, 24, 8, '#FFFFFF'); g.fillStyle = '#FFFFFF'; g.fill(paP('M-8,9 L-12,16 L0,9 Z')); g.strokeStyle = '#C9D3EA'; g.lineWidth = 1.2; g.beginPath(); if (g.roundRect) g.roundRect(-18, -14, 36, 24, 8); g.stroke();
    [-8, 0, 8].forEach(x => paCircle(g, x, -2, 2.4, '#6574F8'));
  }],
  bulb: ['ไอเดีย', [-12, -18, 12, 18], g => {
    paCircle(g, 0, -5, 12, '#F6C873'); g.fillStyle = '#F6C873'; g.fillRect(-6, 2, 12, 6); paRR(g, -6, 8, 12, 4, 1.5, '#8C97AD'); paRR(g, -5, 12.5, 10, 4, 1.5, '#8C97AD');
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-4, -9, 3, 5, -.4, 0, 6.3); g.fill();
  }],
  doc: ['เอกสาร', [-13, -17, 13, 17], g => {
    paRR(g, -13, -17, 26, 34, 3, '#FFFFFF'); g.strokeStyle = '#C9D3EA'; g.lineWidth = 1.2; g.strokeRect(-13, -17, 26, 34);
    paRR(g, -8, -11, 12, 4, 2, '#6574F8'); [-2, 4, 10].forEach(y => paRR(g, -8, y, 16, 2.6, 1.3, '#C9D3EA'));
  }],
  laptop: ['แล็ปท็อป', [-22, -15, 22, 12], g => {
    paRR(g, -17, -15, 34, 22, 2.5, '#1B2559'); paRR(g, -15, -13, 30, 18, 1.5, '#EAF2FF'); paRR(g, -12, -10, 14, 4, 2, '#6574F8'); paRR(g, -12, -3, 22, 2.4, 1.2, '#C9D3EA');
    paRR(g, -22, 7, 44, 5, 2.5, '#8C97AD');
  }],
  check: ['เครื่องหมายถูก', [-15, -15, 15, 15], g => {
    paCircle(g, 0, 0, 15, '#2FB36D'); g.strokeStyle = '#FFFFFF'; g.lineWidth = 3.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-7, 0); g.lineTo(-2, 5); g.lineTo(7, -5); g.stroke();
  }],
};
const SA_PROP_ORDER = Object.keys(SA_PROPS);
function saProp(g, key, x, y, w, h) {
  const P = SA_PROPS[key]; if (!P) return; const [x0, y0, x1, y1] = P[1], s = Math.min(w / (x1 - x0), h / (y1 - y0));
  g.save(); g.translate(x + w / 2 - (x0 + x1) / 2 * s, y + h / 2 - (y0 + y1) / 2 * s); g.scale(s, s); P[2](g); g.restore();
}
/* decor shapes (drawn into the layer box) */
const SA_SHAPES = { rect: 'สี่เหลี่ยม', circle: 'วงกลม', blob: 'รูปทรงอิสระ', sparkle: 'ประกาย', dots: 'จุด', ring: 'วงแหวน', line: 'เส้น' };
function saShape(g, L) {
  const { x, y, w, h } = L, c = L.fill || '#E2EFFF';
  g.save(); g.globalAlpha = L.alpha == null ? 1 : L.alpha; g.fillStyle = c; g.strokeStyle = c;
  if (L.kind === 'circle') { g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 6.3); g.fill(); }
  else if (L.kind === 'ring') { g.lineWidth = Math.max(2, Math.min(w, h) * .08); g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2 - g.lineWidth / 2, h / 2 - g.lineWidth / 2, 0, 0, 6.3); g.stroke(); }
  else if (L.kind === 'blob') {
    g.beginPath(); g.moveTo(x + w * .52, y);
    g.bezierCurveTo(x + w * .84, y + h * .02, x + w * 1.02, y + h * .28, x + w * .98, y + h * .55);
    g.bezierCurveTo(x + w * .94, y + h * .84, x + w * .7, y + h * 1.0, x + w * .44, y + h * .98);
    g.bezierCurveTo(x + w * .16, y + h * .96, x - w * .02, y + h * .74, x + w * .02, y + h * .46);
    g.bezierCurveTo(x + w * .06, y + h * .16, x + w * .26, y - h * .02, x + w * .52, y); g.fill();
  } else if (L.kind === 'sparkle') {
    const cx = x + w / 2, cy = y + h / 2; g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx, cy, x + w, cy); g.quadraticCurveTo(cx, cy, cx, y + h); g.quadraticCurveTo(cx, cy, x, cy); g.quadraticCurveTo(cx, cy, cx, y); g.fill();
  } else if (L.kind === 'dots') {
    const n = 5, s = Math.min(w, h) / n, r = s * .16; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.beginPath(); g.arc(x + s * (i + .5), y + s * (j + .5), r, 0, 6.3); g.fill(); }
  } else if (L.kind === 'line') { g.fillRect(x, y + h / 2 - Math.max(2, h * .5) / 2, w, Math.max(2, h * .5)); }
  else { g.beginPath(); const r = Math.min(w, h) * (L.r == null ? .12 : L.r); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  g.restore();
}
