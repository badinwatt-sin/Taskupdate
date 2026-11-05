'use strict';
/* ============================================================
   Event Calendar export — designed one-page summaries
   Layouts: year 16:9 · year A4 portrait · month 16:9 · month A4 portrait
   Themes:  Aurora (light) · Midnight (dark) · Minimal (paper)
   Text is never cut: names wrap in full and the layout picks the
   largest type size that fits (auto-fit).
   ============================================================ */
const EXP_FONT = '"IBM Plex Sans Thai", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const EXP_MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EXP_HUES = ['#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0', '#22b8cf', '#20c997', '#40c057', '#94d82d', '#fab005', '#ff922b'];
const EXP_ST = { confirmed: ['#0a84ff', 'ยืนยันแล้ว'], planning: ['#ff9f0a', 'วางแผน'], done: ['#30d158', 'จัดแล้ว'] };
const BRAND_HEAD = '"Brand Serif", "Source Serif 4", "IBM Plex Sans Thai", Georgia, serif';   // Publico when installed on this computer
const BRAND_BODY = '"Source Sans Pro", "IBM Plex Sans Thai", -apple-system, "Segoe UI", sans-serif';
const BRAND_W = { 400: 600, 500: 600, 600: 600, 700: 600, 800: 900, 900: 900 };   // Source Sans Semibold / Black · Publico Roman / Black
const EXP_THEMES = {
  bauhaus: { label: 'Bauhaus', bg: '#F3EFE6', ink: '#111318', sub: '#4E5260', mute: '#9A9585', card: '#FFFFFF', edge: '#111318', line: '#E6DFD0', chip: '#EFE9DD', accent: '#0026E1', shadow: 'rgba(0,0,0,0)',
    blobs: [], wm: 0, clean: true, art: 'bauhaus', solidBars: true, fh: BRAND_HEAD, fb: BRAND_BODY, wmap: BRAND_W,
    hues: ['#0026E1', '#FF5A36', '#111318', '#3979FF', '#F2B705', '#0929A6'], st: { confirmed: '#0026E1', planning: '#FF5A36', done: '#111318' } },
  neon: { label: 'Neon Night', bg: '#07080D', ink: '#F5F6FA', sub: '#AEB4C6', mute: '#646B82', card: 'rgba(255,255,255,.055)', edge: 'rgba(255,255,255,.14)', line: 'rgba(255,255,255,.09)', chip: 'rgba(255,255,255,.08)', accent: '#5B8CFF', shadow: 'rgba(0,0,0,0)',
    blobs: [], wm: 0, clean: true, art: 'neon', solidBars: true, fh: BRAND_HEAD, fb: BRAND_BODY, wmap: BRAND_W,
    hues: ['#5B8CFF', '#A77BFF', '#FF6B9A', '#3ED6C5'], st: { confirmed: '#5B8CFF', planning: '#FF6B9A', done: '#6F7690' } },
  clean: { label: 'Clean', bg: '#FFFFFF', ink: '#0B1220', sub: '#5A6375', mute: '#9AA2B1', card: '#FFFFFF', edge: '#E3E8EF', line: '#ECEFF4', chip: '#F4F6F9', accent: '#0026E1', shadow: 'rgba(0,0,0,0)',
    blobs: [], wm: 0, clean: true, fh: BRAND_HEAD, fb: BRAND_BODY, wmap: BRAND_W, hues: ['#0026E1'], st: { confirmed: '#0026E1', planning: '#8C97AD', done: '#C9CFD9' } },
  cleanDark: { label: 'Clean Dark', bg: '#0E121A', ink: '#F4F6FA', sub: '#A8B0C0', mute: '#69728A', card: '#141925', edge: '#252C3B', line: '#20273A', chip: '#1A2030', accent: '#3979FF', shadow: 'rgba(0,0,0,0)',
    blobs: [], wm: 0, clean: true, fh: BRAND_HEAD, fb: BRAND_BODY, wmap: BRAND_W, hues: ['#3979FF'], st: { confirmed: '#3979FF', planning: '#8C97AD', done: '#4B5468' } },
  aurora: { label: 'Aurora', bg: '#f3f4fa', ink: '#15151a', sub: '#5b5b66', mute: '#a3a3ae', card: 'rgba(255,255,255,.93)', edge: 'rgba(20,20,60,.06)', line: '#e8e8f0', chip: '#f0f0f6', accent: '#0a84ff', shadow: 'rgba(30,30,80,.09)', blobs: [['#0a84ff', .22], ['#bf5af2', .17], ['#30d158', .13]], wm: .045 },
  midnight: { label: 'Midnight', bg: '#090d1c', ink: '#f5f5f7', sub: '#b6bacb', mute: '#666d85', card: 'rgba(255,255,255,.065)', edge: 'rgba(255,255,255,.09)', line: 'rgba(255,255,255,.1)', chip: 'rgba(255,255,255,.08)', accent: '#64d2ff', shadow: 'rgba(0,0,0,.35)', blobs: [['#0a84ff', .42], ['#bf5af2', .34], ['#ff375f', .2]], wm: .06 },
  paper: { label: 'Minimal', bg: '#fbf9f5', ink: '#141414', sub: '#57534c', mute: '#aaa59b', card: '#ffffff', edge: 'rgba(60,40,20,.08)', line: '#ece7de', chip: '#f4f0e9', accent: '#d4572a', shadow: 'rgba(60,40,20,.06)', blobs: [['#f4a261', .14], ['#e76f51', .08]], wm: .05 },
};
const EXP_LAYOUTS = {
  'year-l': { label: 'รายปี · แนวนอน 16:9', W: 1920, H: 1080, page: 'A4 landscape' },
  'year-p': { label: 'รายปี · แนวตั้ง A4', W: 1240, H: 1754, page: 'A4 portrait' },
  'month-l': { label: 'รายเดือน · แนวนอน 16:9', W: 1920, H: 1080, page: 'A4 landscape' },
  'month-p': { label: 'รายเดือน · แนวตั้ง A4', W: 1240, H: 1754, page: 'A4 portrait' },
};
const stc = (th, st) => (th.st && th.st[st]) || (EXP_ST[st] || ['#8e8e93'])[0];
const hueOf = (th, m) => th.hues ? th.hues[m % th.hues.length] : EXP_HUES[m];
const expCatText = () => EXP_CATS.length ? EXP_CATS.map(catLabel).join(' · ') : '';
const expVersion = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`; };
const pad2 = n => String(n).padStart(2, '0');

/* ---------- data ---------- */
let EXP_CATS = [];   // categories chosen in the export dialog ([] = all)
function expEvents(from, to) {   // ISO range, inclusive; not cancelled; chosen categories only
  return S().events.filter(e => e.status !== 'cancelled' && e.start <= to && e.end >= from && (!EXP_CATS.length || EXP_CATS.includes(e.cat)))
    .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
}
const dayLabel = e => {
  const s = parse(e.start), en = parse(e.end);
  if (e.start === e.end) return `${s.getDate()} ${TH_MON[s.getMonth()]}`;
  if (s.getMonth() === en.getMonth()) return `${s.getDate()}–${en.getDate()} ${TH_MON[s.getMonth()]}`;
  return `${s.getDate()} ${TH_MON[s.getMonth()]} – ${en.getDate()} ${TH_MON[en.getMonth()]}`;
};
const dayShort = e => { const s = parse(e.start), en = parse(e.end); return e.start === e.end ? `${s.getDate()}` : s.getMonth() === en.getMonth() ? `${s.getDate()}–${en.getDate()}` : `${s.getDate()}–${en.getDate()} ${TH_MON[en.getMonth()]}`; };

/* ---------- drawing kit ---------- */
function expKit(cv, W, H, th) {
  const S2 = 2; cv.width = W * S2; cv.height = H * S2;
  const g = cv.getContext('2d'); g.setTransform(S2, 0, 0, S2, 0, 0); g.textBaseline = 'alphabetic';
  const k = {
    g, W, H, th,
    font: (w, px) => { const fam = w >= 800 ? (th.fh || EXP_FONT) : (th.fb || EXP_FONT); g.font = `${th.wmap ? th.wmap[w] || w : w} ${Math.round(px * 10) / 10}px ${fam}`; },
    rr: (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); },
    fit: (t, max) => { if (g.measureText(t).width <= max) return t; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; },
    wrap: (t, max) => {   // full word-aware wrap — never drops text
      const segs = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(String(t))].map(x => x.segment) : String(t).split(/(\s+)/);
      const out = []; let cur = '';
      const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
      segs.forEach(seg => {
        if (g.measureText(cur + seg).width <= max) { cur += seg; return; }
        if (cur.trim()) push();
        if (g.measureText(seg).width <= max) { cur = seg.trimStart(); return; }
        for (const ch of [...seg]) { if (g.measureText(cur + ch).width > max && cur) push(); cur += ch; }   // a single very long word
      });
      push(); return out.length ? out : [''];
    },
    card: (x, y, w, h, r = 22) => {
      if (th.art === 'bauhaus') { g.fillStyle = th.card; k.rr(x, y, w, h, 4); g.fill(); g.strokeStyle = th.ink; g.lineWidth = 1.5; k.rr(x + .75, y + .75, w - 1.5, h - 1.5, 4); g.stroke(); return; }
      if (th.art === 'neon') {
        g.fillStyle = th.card; k.rr(x, y, w, h, 18); g.fill();
        const sg = g.createLinearGradient(x, y, x + w, y + h); sg.addColorStop(0, 'rgba(91,140,255,.55)'); sg.addColorStop(.5, 'rgba(255,255,255,.08)'); sg.addColorStop(1, 'rgba(255,107,154,.45)');
        g.strokeStyle = sg; g.lineWidth = 1.2; k.rr(x + .6, y + .6, w - 1.2, h - 1.2, 18); g.stroke(); return;
      }
      if (th.clean) { g.fillStyle = th.card; k.rr(x, y, w, h, 14); g.fill(); g.strokeStyle = th.edge; g.lineWidth = 1; k.rr(x + .5, y + .5, w - 1, h - 1, 14); g.stroke(); return; }
      g.save(); g.shadowColor = th.shadow; g.shadowBlur = 26; g.shadowOffsetY = 8; g.fillStyle = th.card; k.rr(x, y, w, h, r); g.fill(); g.restore();
      g.strokeStyle = th.edge; g.lineWidth = 1; k.rr(x + .5, y + .5, w - 1, h - 1, r); g.stroke();
    },
  };
  return k;
}
/* background art: colour fields, rings, waves, dot grid and a big faint watermark */
function expBackdrop(k, mark, hue) {
  const { g, W, H, th } = k;
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  if (th.art) return artBackdrop(k, mark, hue);
  if (th.clean) {   // editorial minimal: hairline arcs, one accent dot, a small dot grid — lots of white space
    g.save(); g.strokeStyle = th.line; g.lineWidth = 1.2;
    [150, 230, 310, 390].forEach(r => { g.beginPath(); g.arc(W, H, r, Math.PI, Math.PI * 1.5); g.stroke(); });
    g.fillStyle = th.accent; g.beginPath(); g.arc(W - 230 * Math.cos(Math.PI / 5), H - 230 * Math.sin(Math.PI / 5), 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = th.edge; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { g.beginPath(); g.arc(W - 64 - c * 14, 18 + r * 12, 1.4, 0, Math.PI * 2); g.fill(); }   // kept above the version line
    g.restore();
    return;
  }
  const spots = [[W * .05, -H * .08, W * .45], [W * .98, H * .02, W * .38], [W * .78, H * 1.08, W * .5]];
  [...th.blobs, ...(hue ? [[hue, th.blobs[0][1] * .9]] : [])].forEach(([c, a], i) => {
    const [x, y, r] = i < 3 ? spots[i] : [W * .35, H * .55, W * .35];
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hexA(c, a)); rg.addColorStop(1, hexA(c, 0)); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  });
  if (th.metal) {   // brand "metallic blue" finish
    const mg = g.createLinearGradient(0, 0, W, 0);
    [[0, '#0026E1'], [.3, '#B5D2FF'], [.5, '#F7FAFF'], [.7, '#B5D2FF'], [1, '#0026E1']].forEach(([o, c]) => mg.addColorStop(o, c));
    g.fillStyle = mg; g.fillRect(0, 0, W, 10);
  }
  // watermark
  g.save(); g.globalAlpha = th.wm; g.fillStyle = th.ink; k.font(800, Math.min(W, H) * .42); g.textAlign = 'right';
  g.fillText(mark, W - 30, H * .98); g.restore();
  // concentric rings, top right
  g.save(); g.strokeStyle = hexA(hue || th.accent, .16); g.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W - 120, 40, 60 + i * 34, 0, Math.PI * 2); g.stroke(); }
  g.restore();
  // waves along the bottom
  g.save(); g.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = hexA(hue || th.accent, .10 - i * .02); g.beginPath();
    const base = H - 30 - i * 14; g.moveTo(-20, base);
    for (let x = -20; x <= W + 40; x += 240) g.bezierCurveTo(x + 60, base - 26, x + 180, base + 26, x + 240, base);
    g.stroke();
  }
  g.restore();
  // dot grid patch, bottom left
  g.save(); g.fillStyle = hexA(th.ink, .09);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) { g.beginPath(); g.arc(28 + c * 16, H - 150 + r * 16, 1.6, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
/* film grain — a tiny noise tile, repeated */
let EXP_GRAIN = null;
function grain(k, a) {
  const { g, W, H } = k;
  if (!EXP_GRAIN) { const c = document.createElement('canvas'); c.width = c.height = 140; const x = c.getContext('2d'), d = x.createImageData(140, 140); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); EXP_GRAIN = c; }
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(EXP_GRAIN, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
}
function artBackdrop(k, mark, hue) {
  const { g, W, H, th } = k, portrait = H > W, R = W, sc = portrait ? .78 : 1;
  if (th.art === 'bauhaus') {
    g.save();
    // composition
    const cx = R - 200 * sc;
    g.fillStyle = '#0026E1'; g.beginPath(); g.arc(cx, 40 * sc, 132 * sc, 0, Math.PI * 2); g.fill();                       // royal sun
    g.fillStyle = '#FF5A36'; g.beginPath(); g.arc(R - 470 * sc, 236 * sc, 92 * sc, Math.PI, 0); g.fill();                 // coral half moon on the rule
    g.fillStyle = '#F2B705'; g.beginPath(); g.arc(R - 330 * sc, 96 * sc, 26 * sc, 0, Math.PI * 2); g.fill();              // small mustard dot
    g.save(); g.beginPath(); g.rect(R - 640 * sc, 40 * sc, 96 * sc, 150 * sc); g.clip(); g.strokeStyle = th.ink; g.lineWidth = 3 * sc;  // diagonal stripes
    for (let i = -10; i < 20; i++) { g.beginPath(); g.moveTo(R - 640 * sc + i * 16 * sc, 40 * sc); g.lineTo(R - 640 * sc + i * 16 * sc + 150 * sc, 190 * sc); g.stroke(); } g.restore();
    g.fillStyle = th.ink; for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { g.beginPath(); g.arc(R - 760 * sc + c * 16 * sc, 60 * sc + r * 16 * sc, 2.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#B5D2FF'; g.save(); g.translate(R - 690 * sc, 214 * sc); g.rotate(Math.PI / 4); g.fillRect(-14 * sc, -14 * sc, 28 * sc, 28 * sc); g.restore();   // ice diamond
    // big outlined numerals, drawn over the shapes so they always read
    k.font(800, 250 * sc); g.textAlign = 'right'; g.lineWidth = 2; g.strokeStyle = th.ink; g.strokeText(mark, R - 36, 236 * sc + (portrait ? 18 : 0)); g.textAlign = 'left';
    // corner details at the bottom
    g.fillStyle = '#0026E1'; g.beginPath(); g.moveTo(0, H); g.arc(0, H, 70, -Math.PI / 2, 0); g.closePath(); g.fill();
    g.restore();
    grain(k, .07);
    return;
  }
  // neon: colour mesh, rings, outlined numerals with a gradient stroke, grain
  [[W * .12, -H * .05, W * .55, '#3B5BFF', .55], [W * .92, H * .02, W * .45, '#9B3BFF', .5], [W * .85, H * 1.05, W * .55, '#FF4F8B', .35], [W * .02, H * 1.02, W * .4, '#00C2B8', .22]]
    .forEach(([x, y, r, c, a]) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, hexA(c, a)); rg.addColorStop(1, hexA(c, 0)); g.fillStyle = rg; g.fillRect(0, 0, W, H); });
  // fine perspective grid at the bottom
  g.save(); g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const y = H - 8 - i * i * 4; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 40, H - 330); g.lineTo(W / 2 + i * 160, H); g.stroke(); }
  g.restore();
  const og = g.createLinearGradient(R - 700 * sc, 0, R, 260); og.addColorStop(0, 'rgba(91,140,255,.9)'); og.addColorStop(.5, 'rgba(167,123,255,.9)'); og.addColorStop(1, 'rgba(255,107,154,.9)');
  g.save(); k.font(800, 250 * sc); g.textAlign = 'right'; g.lineWidth = 1.6; g.strokeStyle = og; g.shadowColor = 'rgba(167,123,255,.6)'; g.shadowBlur = 18; g.strokeText(mark, R - 36, 236 * sc + (portrait ? 18 : 0)); g.restore();
  g.save(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; [70, 110, 150].forEach(r => { g.beginPath(); g.arc(R - 520 * sc, 70 * sc, r * sc, 0, Math.PI * 2); g.stroke(); });
  g.fillStyle = '#FF6B9A'; g.shadowColor = '#FF6B9A'; g.shadowBlur = 14; g.beginPath(); g.arc(R - 520 * sc + 110 * sc, 70 * sc, 5, 0, Math.PI * 2); g.fill(); g.restore();
  grain(k, .09);
}
function hexA(hex, a) {
  const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
/* header: kicker, title, subtitle, version, status counters — returns the y where content may start */
function expHeader(k, { kicker, title, small, sub, evs, hue, compact }) {
  const { g, W, th } = k, X = compact ? 60 : 72, R = W - X;
  g.textAlign = 'left';
  if (th.clean) return cleanHeader(k, { kicker, title, small, sub, evs, compact, X, R });
  if (th.metal) { const mg = g.createLinearGradient(X, 0, X + 34, 0); mg.addColorStop(0, th.accent); mg.addColorStop(1, '#B5D2FF'); g.fillStyle = mg; } else g.fillStyle = hue || th.accent;
  k.rr(X, compact ? 66 : 70, 34, 6, 3); g.fill();
  k.font(700, 19); g.fillStyle = hue || th.accent; g.fillText(kicker, X + 46, compact ? 75 : 79);
  k.font(800, compact ? 64 : 70); g.fillStyle = th.ink; g.fillText(title, X - 3, compact ? 148 : 160);
  const tw = g.measureText(title).width;
  if (small) { k.font(500, 25); g.fillStyle = th.mute; g.fillText(small, X + tw + 18, compact ? 146 : 158); }
  k.font(500, 21); g.fillStyle = th.sub; g.fillText(sub, X, compact ? 190 : 204);
  // version pill
  k.font(600, 17); const vt = `Version ${expVersion()}`, vw = g.measureText(vt).width + 30;
  g.fillStyle = th.chip; k.rr(R - vw, compact ? 52 : 56, vw, 34, 17); g.fill();
  g.fillStyle = th.sub; g.textAlign = 'center'; g.fillText(vt, R - vw / 2, compact ? 75 : 79);
  // counters
  let sx = R, sy = compact ? 102 : 110;
  [['done'], ['planning'], ['confirmed']].forEach(([st]) => {
    const c = stc(k.th, st), l = EXP_ST[st][1], n = evs.filter(e => e.status === st).length;
    k.font(800, 38); const nw = g.measureText(String(n)).width; k.font(500, 16); const lw = g.measureText(l).width;
    const bw = Math.max(nw, lw) + 40, bx = sx - bw;
    k.card(bx, sy, bw, 84, 18);
    g.fillStyle = c; k.font(800, 38); g.fillText(String(n), bx + bw / 2, sy + 46);
    g.fillStyle = th.sub; k.font(500, 16); g.fillText(l, bx + bw / 2, sy + 71);
    sx = bx - 12;
  });
  g.textAlign = 'left';
  return compact ? 230 : 240;
}
function cleanHeader(k, { kicker, title, small, sub, evs, compact, X, R }) {
  const { g, th } = k, y0 = compact ? 74 : 78;
  g.fillStyle = th.accent; g.fillRect(X, y0 - 7, 28, 3);
  k.font(600, 15); g.fillStyle = th.sub; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.fillText(kicker, X + 40, y0); if ('letterSpacing' in g) g.letterSpacing = '0px';
  const m = title.match(/^(.*?)(\d{4})$/), ty = compact ? 150 : 162;
  k.font(800, compact ? 62 : 68);
  if (m) {
    g.fillStyle = th.ink; g.fillText(m[1], X - 2, ty); const w1 = g.measureText(m[1]).width, w2 = g.measureText(m[2]).width;
    if (th.art === 'neon') { const yg = g.createLinearGradient(X + w1, 0, X + w1 + w2, 0); yg.addColorStop(0, '#5B8CFF'); yg.addColorStop(.5, '#A77BFF'); yg.addColorStop(1, '#FF6B9A'); g.fillStyle = yg; } else g.fillStyle = th.accent;
    g.fillText(m[2], X - 2 + w1, ty);
  }
  else { g.fillStyle = th.ink; g.fillText(title, X - 2, ty); }
  const tw = g.measureText(title).width;
  if (small) { k.font(500, 22); g.fillStyle = th.mute; g.fillText(small, X + tw + 18, ty - 4); }
  k.font(500, 20); g.fillStyle = th.sub; g.fillText(sub, X, ty + 44);
  if (th.art) {   // the right side belongs to the artwork: counters + version go inline under the title
    let ix = X, iy = ty + 84; k.font(600, 15);
    ['confirmed', 'planning', 'done'].forEach(st => {
      const n = evs.filter(e => e.status === st).length, t = `${n} ${EXP_ST[st][1]}`;
      g.fillStyle = stc(th, st); g.beginPath(); g.arc(ix + 5, iy - 5, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = th.ink; g.fillText(t, ix + 16, iy); ix += g.measureText(t).width + 40;
    });
    g.fillStyle = th.mute; g.fillText(`VERSION ${expVersion()}`, ix + 10, iy);
    return compact ? 268 : 276;
  }
  // version, top right
  k.font(600, 15); g.fillStyle = th.mute; g.textAlign = 'right'; g.fillText(`VERSION ${expVersion()}`, R, y0);
  // flat counters separated by hairlines
  let sx = R; const cy = compact ? 150 : 162;
  ['done', 'planning', 'confirmed'].forEach((st, i) => {
    const n = evs.filter(e => e.status === st).length, l = EXP_ST[st][1];
    k.font(800, 44); const nw = g.measureText(String(n)).width; k.font(500, 15); const lw = g.measureText(l).width + 16, bw = Math.max(nw, lw);
    g.textAlign = 'right'; k.font(800, 44); g.fillStyle = st === 'confirmed' ? th.accent : th.ink; g.fillText(String(n), sx, cy);
    k.font(500, 15); g.fillStyle = th.sub; g.fillText(l, sx, cy + 26);
    g.fillStyle = stc(th, st); g.beginPath(); g.arc(sx - g.measureText(l).width - 10, cy + 21, 4, 0, Math.PI * 2); g.fill();
    if (i < 2) { g.strokeStyle = th.line; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - bw - 22, cy - 40); g.lineTo(sx - bw - 22, cy + 30); g.stroke(); }
    sx -= bw + 44;
  });
  g.textAlign = 'left';
  // hairline under the header
  g.strokeStyle = th.line; g.lineWidth = 1; g.beginPath(); g.moveTo(X, (compact ? 222 : 232)); g.lineTo(R, (compact ? 222 : 232)); g.stroke();
  return compact ? 246 : 256;
}
function expFooter(k, X) {
  const { g, W, H, th } = k, fy = H - 34;
  let lx = X; k.font(500, 16);
  Object.entries(EXP_ST).forEach(([st, [, l]]) => { g.fillStyle = stc(th, st); if (th.clean) { g.beginPath(); g.arc(lx + 6, fy - 5, 5, 0, Math.PI * 2); } else k.rr(lx, fy - 13, 16, 16, 5); g.fill(); g.fillStyle = th.sub; g.fillText(l, lx + 24, fy); lx += g.measureText(l).width + 54; });
  g.textAlign = 'right'; g.fillStyle = th.mute; g.fillText(`TEAM Hub · Agency Experience · อัปเดตล่าสุด ${expVersion()}`, W - X, fy); g.textAlign = 'left';
}

/* ---------- year: 12 month cards, names wrap in full, type auto-fits ---------- */
function drawYear(cv, { year, theme, portrait }) {
  const L = EXP_LAYOUTS[portrait ? 'year-p' : 'year-l'], th = EXP_THEMES[theme], k = expKit(cv, L.W, L.H, th), { g, W, H } = k;
  expBackdrop(k, String(year));
  const evs = expEvents(`${year}-01-01`, `${year}-12-31`), by = Array.from({ length: 12 }, () => []);
  evs.forEach(e => { const s = e.start < `${year}-01-01` ? `${year}-01-01` : e.start; by[+s.slice(5, 7) - 1].push(e); });
  const X = portrait ? 60 : 72;
  const top = expHeader(k, { kicker: EXP_CATS.length ? `${expCatText().toUpperCase()}  —  AGENCY EXPERIENCE TEAM` : 'AGENCY EXPERIENCE TEAM', title: `Event Calendar ${year}`, small: `พ.ศ. ${year + 543}`, sub: `ปฏิทินงานสำคัญประจำปี${EXP_CATS.length ? ' · ' + expCatText() : ''} · ${evs.length} งาน`, evs, compact: portrait });
  const cols = portrait ? 3 : 6, rows = portrait ? 4 : 2, gap = 16, cw = (W - 2 * X - gap * (cols - 1)) / cols, ch = (H - top - 80 - gap * (rows - 1)) / rows;
  const headH = 84, padX = 18, inner = ch - headH - 16;
  // measure one month's list at scale s
  const measure = (list, s, venue) => {
    let h = 0;
    for (const e of list) {
      k.font(700, 14 * s); const dw = Math.max(40 * s, g.measureText(dayShort(e)).width + 14 * s);
      k.font(600, 17 * s); const lines = k.wrap(e.name, cw - padX * 2 - dw - 10);
      h += Math.max(26 * s, lines.length * 21 * s + (venue && e.venue ? 17 * s : 0)) + 10 * s;
    }
    return h;
  };
  // each month picks the biggest type that fits its own list (a busy month doesn't shrink the quiet ones)
  const fitOf = list => { for (let s = 1.15; s >= .55; s -= .05) for (const v of [true, false]) if (measure(list, s, v) <= inner) return [Math.min(s, 1.15), v]; return [.55, false]; };
  const now = new Date();
  by.forEach((list, m) => {
    const cx = X + (m % cols) * (cw + gap), cy = top + Math.floor(m / cols) * (ch + gap), hue = hueOf(th, m), isNow = year === now.getFullYear() && m === now.getMonth();
    k.card(cx, cy, cw, ch);
    // month badge + names
    if (!th.clean) { g.fillStyle = hexA(hue, list.length ? .16 : .08); k.rr(cx + padX, cy + 20, 46, 46, 14); g.fill(); }
    if (th.art === 'bauhaus') {   // a geometric badge per month
      const bx = cx + padX, by2 = cy + 20, col = list.length ? hue : '#D8D1C2', light = ['#F2B705', '#B5D2FF', '#D8D1C2'].includes(col);
      g.fillStyle = col; g.beginPath();
      [() => g.arc(bx + 23, by2 + 23, 23, 0, Math.PI * 2), () => g.rect(bx, by2, 46, 46), () => { g.moveTo(bx, by2 + 46); g.lineTo(bx, by2 + 23); g.arc(bx + 23, by2 + 23, 23, Math.PI, 0); g.lineTo(bx + 46, by2 + 46); g.closePath(); },
        () => { g.moveTo(bx + 23, by2); g.lineTo(bx + 48, by2 + 46); g.lineTo(bx - 2, by2 + 46); g.closePath(); }][m % 4]();
      g.fill(); g.fillStyle = light ? th.ink : '#fff'; k.font(800, 19); g.textAlign = 'center'; g.fillText(pad2(m + 1), bx + 23, by2 + (m % 4 === 3 ? 40 : 31)); g.textAlign = 'left';
    } else {
      g.save(); if (th.art === 'neon' && list.length) { g.shadowColor = hue; g.shadowBlur = 14; }
      g.fillStyle = list.length ? hue : th.mute; k.font(800, th.clean ? 24 : 20); g.textAlign = 'center'; g.fillText(pad2(m + 1), cx + padX + 23, cy + 50); g.textAlign = 'left'; g.restore();
    }
    g.fillStyle = list.length ? th.ink : th.mute; k.font(700, 25); g.fillText(TH_MON_FULL[m], cx + padX + 60, cy + 44);
    g.fillStyle = th.mute; k.font(600, 13); g.fillText(EXP_MON_EN[m].toUpperCase(), cx + padX + 61, cy + 63);
    if (list.length) {
      k.font(700, 15); const t = `${list.length} งาน`, bw = g.measureText(t).width + 20;
      g.fillStyle = isNow ? hue : th.chip; if (!th.clean || isNow) { k.rr(cx + cw - padX - bw, cy + 28, bw, 28, 14); g.fill(); }
      g.fillStyle = isNow ? '#fff' : th.sub; g.textAlign = 'center'; g.fillText(t, cx + cw - padX - bw / 2, cy + 47); g.textAlign = 'left';
    }
    if (isNow && !th.clean) { g.strokeStyle = hue; g.lineWidth = 2.5; k.rr(cx + 1, cy + 1, cw - 2, ch - 2, 21); g.stroke(); }
    g.strokeStyle = th.line; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + padX, cy + headH); g.lineTo(cx + cw - padX, cy + headH); g.stroke();
    if (!list.length) { g.fillStyle = th.mute; k.font(500, 16); g.fillText('— ไม่มีงาน —', cx + padX, cy + headH + 34); return; }
    const [S, V] = fitOf(list);
    let ly = cy + headH + 12;
    for (const e of list) {
      const c = stc(th, e.status);
      k.font(700, 14 * S); const dl = dayShort(e), dw = Math.max(40 * S, g.measureText(dl).width + 14 * S) + (th.clean ? 4 * S : 0);
      k.font(600, 17 * S); const lines = k.wrap(e.name, cw - padX * 2 - dw - 10), hasV = V && (e.venue || (EXP_CATS.length !== 1 && e.cat));
      const showCat = EXP_CATS.length !== 1 && e.cat, vtext = [showCat ? catLabel(e.cat) : '', V ? e.venue : ''].filter(Boolean).join(' · ');
      const h = Math.max(26 * S, lines.length * 21 * S + (hasV ? 17 * S : 0));
      if (ly + h > cy + ch - 10) { g.fillStyle = th.accent; k.font(600, 14); g.fillText('+ งานเพิ่มเติม (ดูไฟล์ Excel)', cx + padX, cy + ch - 14); break; }
      if (th.clean) {   // dot + date in plain text
        g.fillStyle = c; g.beginPath(); g.arc(cx + padX + 4 * S, ly + 13 * S, 4 * S, 0, Math.PI * 2); g.fill();
        g.fillStyle = th.sub; k.font(700, 14 * S); g.fillText(dl, cx + padX + 14 * S, ly + 18 * S);
      } else {
        g.fillStyle = hexA(c, .16); k.rr(cx + padX, ly, dw, 26 * S, 8 * S); g.fill();
        g.fillStyle = c; k.font(700, 14 * S); g.textAlign = 'center'; g.fillText(dl, cx + padX + dw / 2, ly + 18 * S); g.textAlign = 'left';
      }
      g.fillStyle = th.ink; k.font(600, 17 * S); lines.forEach((t, i) => g.fillText(t, cx + padX + dw + 10, ly + 18 * S + i * 21 * S));
      if (hasV && vtext) { g.fillStyle = th.sub; k.font(500, 13 * S); g.fillText(k.fit(vtext, cw - padX * 2 - dw - 10), cx + padX + dw + 10, ly + 16 * S + lines.length * 21 * S); }
      ly += h + 10 * S;
    }
  });
  expFooter(k, X);
  return evs.length;
}

/* ---------- month: calendar grid (bars) + full details list ---------- */
function drawMonth(cv, { year, month, theme, portrait, posters }) {
  const L = EXP_LAYOUTS[portrait ? 'month-p' : 'month-l'], th = EXP_THEMES[theme], k = expKit(cv, L.W, L.H, th), { g, W, H } = k, hue = hueOf(th, month);
  expBackdrop(k, pad2(month + 1), hue);
  const days = new Date(year, month + 1, 0).getDate(), mFrom = `${year}-${pad2(month + 1)}-01`, mTo = `${year}-${pad2(month + 1)}-${pad2(days)}`;
  const evs = expEvents(mFrom, mTo), X = portrait ? 60 : 72;
  const top = expHeader(k, { kicker: `EVENT CALENDAR · ${EXP_MON_EN[month].toUpperCase()} ${year}${EXP_CATS.length ? ' · ' + expCatText().toUpperCase() : ''}`, title: `${TH_MON_FULL[month]} ${year + 543}`, small: '', sub: `${EXP_MON_EN[month]} ${year} · ${evs.length ? evs.length + ' งาน' : 'ไม่มีงานในเดือนนี้'}`, evs, hue, compact: portrait });
  // geometry
  const gx = X, gy = top, gw = portrait ? W - 2 * X : 1080, gh = portrait ? 700 : H - top - 80;
  const lx = portrait ? X : gx + gw + 28, ly0 = portrait ? gy + gh + 24 : top, lw = portrait ? W - 2 * X : W - X - lx, lh = portrait ? H - ly0 - 80 : gh;
  // ---- calendar grid
  k.card(gx, gy, gw, gh, 24);
  const off = new Date(year, month, 1).getDay(), weeks = Math.ceil((off + days) / 7), dowH = 46, cw = gw / 7, chh = (gh - dowH - 8) / weeks;
  k.font(700, 15);
  TH_DOW.forEach((d, i) => { g.fillStyle = i === 0 || i === 6 ? (th.clean ? th.mute : hexA(hue, .9)) : th.sub; g.textAlign = 'center'; g.fillText(d, gx + cw * i + cw / 2, gy + 30); });
  g.textAlign = 'left';
  const t0 = today();
  for (let w = 0; w < weeks; w++) for (let c = 0; c < 7; c++) {
    const dn = w * 7 + c - off + 1, x = gx + c * cw, y = gy + dowH + w * chh;
    g.strokeStyle = th.line; g.lineWidth = 1; g.strokeRect(Math.round(x) + .5, Math.round(y) + .5, cw, chh);
    if (dn < 1 || dn > days) { g.fillStyle = hexA(th.ink, .025); g.fillRect(x + 1, y + 1, cw - 1, chh - 1); continue; }
    const iso_ = `${year}-${pad2(month + 1)}-${pad2(dn)}`, hol = holidayOf(iso_), wk = c === 0 || c === 6;
    if (hol || wk) { g.fillStyle = th.clean && !hol ? hexA(th.ink, .025) : hexA(hol ? '#ff3b30' : hue, .05); g.fillRect(x + 1, y + 1, cw - 1, chh - 1); }
    if (iso_ === t0) { g.fillStyle = hue; g.beginPath(); g.arc(x + 22, y + 21, 15, 0, Math.PI * 2); g.fill(); }
    k.font(700, 16); g.fillStyle = iso_ === t0 ? '#fff' : hol ? '#ff3b30' : wk ? hexA(th.ink, .55) : th.ink; g.textAlign = 'center'; g.fillText(String(dn), x + 22, y + 27); g.textAlign = 'left';
    if (hol) { k.font(500, 11); g.fillStyle = '#ff3b30'; g.fillText(k.fit(hol.name, cw - 46), x + 40, y + 25); }
  }
  // event bars, lane by lane per week
  const barH = 22, lanesMax = Math.max(1, Math.floor((chh - 40) / (barH + 4)));
  for (let w = 0; w < weeks; w++) {
    const wFirst = w * 7 - off + 1, wLast = wFirst + 6, lanes = [], hidden = {};
    evs.forEach(e => {
      const ds = e.start < mFrom ? 1 : +e.start.slice(8), de = e.end > mTo ? days : +e.end.slice(8);
      const a = Math.max(ds, wFirst, 1), b = Math.min(de, wLast, days); if (a > b) return;
      let lane = lanes.findIndex(l => l.every(([x1, x2]) => b < x1 || a > x2)); if (lane < 0) { lanes.push([]); lane = lanes.length - 1; }
      lanes[lane].push([a, b]);
      if (lane >= lanesMax) { for (let d = a; d <= b; d++) hidden[d] = (hidden[d] || 0) + 1; return; }
      const c1 = a - wFirst, c2 = b - wFirst, col = stc(th, e.status);
      const x = gx + c1 * cw + 4, y = gy + dowH + w * chh + 38 + lane * (barH + 4), bw = (c2 - c1 + 1) * cw - 8;
      const solid = !th.clean || th.solidBars || e.status === 'confirmed';
      g.fillStyle = solid ? hexA(col, .92) : hexA(col, .22); k.rr(x, y, bw, barH, th.clean ? 5 : 7); g.fill();
      k.font(600, 12.5); g.fillStyle = solid ? '#fff' : th.ink; g.fillText(k.fit(e.name, bw - 12), x + 7, y + 15.5);
    });
    Object.entries(hidden).forEach(([d, n]) => { const c = +d - wFirst; k.font(700, 12); g.fillStyle = th.sub; g.fillText(`+${n}`, gx + c * cw + cw - 30, gy + dowH + w * chh + 24); });
  }
  // ---- details list (full names, auto-fit)
  k.card(lx, ly0, lw, lh, 24);
  k.font(700, 20); g.fillStyle = th.ink; g.fillText('รายละเอียดงาน', lx + 24, ly0 + 40);
  k.font(500, 14); g.fillStyle = th.mute; g.fillText(`${evs.length} งาน · เรียงตามวันที่`, lx + 24, ly0 + 62);
  const listTop = ly0 + 82, avail = lh - 82 - 20, twoCol = portrait && evs.length > 4, colW = twoCol ? (lw - 48 - 20) / 2 : lw - 48;
  const item = (e, s, w, draw, x, y) => {   // returns height
    const thumb = posters && e.projectId && posters.get(e.projectId), tW = thumb ? 62 * s : 0;
    const dateW = 70 * s, textX = dateW + 14 * s + (thumb ? tW + 12 * s : 0), tw = w - textX;
    k.font(700, 18 * s); const lines = k.wrap(e.name, tw);
    const meta = [EXP_CATS.length !== 1 ? catLabel(e.cat) : '', e.venue, member(e.ownerId)?.name].filter(Boolean).join(' · ');
    k.font(500, 14 * s); const mlines = meta ? k.wrap(meta, tw) : [];
    const h = Math.max(66 * s, 8 * s + lines.length * 23 * s + mlines.length * 19 * s + 30 * s);
    if (draw) {
      const c = stc(th, e.status), stl = (EXP_ST[e.status] || ['', ''])[1], sd = parse(e.start);
      if (th.clean) { g.fillStyle = c; g.fillRect(x, y + 4 * s, 3 * s, 58 * s); }
      else { g.fillStyle = hexA(c, .14); k.rr(x, y, dateW, 66 * s, 14 * s); g.fill(); }
      g.fillStyle = th.clean ? (e.status === 'confirmed' ? th.accent : th.ink) : c; g.textAlign = 'center'; k.font(800, (th.clean ? 30 : 26) * s); g.fillText(String(sd.getDate()), x + dateW / 2, y + 33 * s);
      if (th.clean) g.fillStyle = th.mute;
      k.font(600, 12 * s); g.fillText(e.start === e.end ? TH_MON[sd.getMonth()] : `ถึง ${parse(e.end).getDate()} ${TH_MON[parse(e.end).getMonth()]}`, x + dateW / 2, y + 53 * s); g.textAlign = 'left';
      if (thumb) { g.save(); k.rr(x + dateW + 14 * s, y, tW, 66 * s, 12 * s); g.clip(); const r = Math.max(tW / thumb.width, 66 * s / thumb.height), iw = thumb.width * r, ih = thumb.height * r; g.drawImage(thumb, x + dateW + 14 * s + (tW - iw) / 2, y + (66 * s - ih) / 2, iw, ih); g.restore(); }
      g.fillStyle = th.ink; k.font(700, 18 * s); lines.forEach((t, i) => g.fillText(t, x + textX, y + 20 * s + i * 23 * s));
      let my = y + 20 * s + lines.length * 23 * s;
      g.fillStyle = th.sub; k.font(500, 14 * s); mlines.forEach((t, i) => g.fillText(t, x + textX, my + i * 19 * s)); my += mlines.length * 19 * s;
      k.font(600, 12 * s); const sw = g.measureText(`${dayLabel(e)} · ${stl}`).width + 16 * s;
      if (th.clean) { g.fillStyle = c; g.beginPath(); g.arc(x + textX + 4 * s, my + 5 * s, 4 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = th.sub; g.fillText(`${dayLabel(e)} · ${stl}`, x + textX + 14 * s, my + 9 * s); }
      else { g.fillStyle = hexA(c, .12); k.rr(x + textX, my - 6 * s, sw, 22 * s, 11 * s); g.fill(); g.fillStyle = c; g.fillText(`${dayLabel(e)} · ${stl}`, x + textX + 8 * s, my + 9 * s); }
    }
    return h;
  };
  if (!evs.length) {
    g.fillStyle = hexA(hue, .14); g.beginPath(); g.arc(lx + lw / 2, listTop + avail / 2 - 30, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = hue; k.font(800, 40); g.textAlign = 'center'; g.fillText('✓', lx + lw / 2, listTop + avail / 2 - 16);
    g.fillStyle = th.sub; k.font(500, 18); g.fillText('เดือนนี้ไม่มี Event', lx + lw / 2, listTop + avail / 2 + 50); g.textAlign = 'left';
  } else {
    const colsN = twoCol ? 2 : 1, gapY = 14;
    const totalAt = s => { const hs = evs.map(e => item(e, s, colW, false)); if (colsN === 1) return hs.reduce((a, b) => a + b + gapY * s, 0); let c1 = 0, c2 = 0; hs.forEach((h, i) => { if (i % 2 === 0) c1 += h + gapY * s; else c2 += h + gapY * s; }); return Math.max(c1, c2); };
    let S = .5; for (let s = 1; s >= .5; s -= .05) if (totalAt(s) <= avail) { S = s; break; }
    const ys = [listTop, listTop];
    evs.forEach((e, i) => {
      const col = colsN === 2 ? i % 2 : 0, x = lx + 24 + col * (colW + 20), h = item(e, S, colW, false);
      if (ys[col] + h > listTop + avail) { if (!ys.done) { ys.done = true; g.fillStyle = th.accent; k.font(600, 14); g.fillText('+ งานเพิ่มเติม (ดูไฟล์ Excel)', lx + 24, ly0 + lh - 16); } return; }
      item(e, S, colW, true, x, ys[col]); ys[col] += h + gapY * S;
    });
  }
  expFooter(k, X);
  return evs.length;
}

/* ---------- export dialog ---------- */
async function openCalExport() {
  const now = new Date();
  EXP_CATS = [...(ST.cal.cats || [])];
  const st = { layout: 'year-l', theme: 'bauhaus', year: ST.cal.y || now.getFullYear(), month: ST.cal.mode === 'month' && ST.cal.m != null ? ST.cal.m : now.getMonth() };
  try { await Promise.all([...['800 70px', '700 20px', '600 17px', '500 14px'].map(f => document.fonts.load(`${f} ${EXP_FONT}`)), ...['900 70px', '400 20px'].map(f => document.fonts.load(`${f} ${BRAND_HEAD}`)), ...['600 17px', '900 17px'].map(f => document.fonts.load(`${f} ${BRAND_BODY}`))]); } catch (e) { }
  const years = [...new Set([st.year - 1, st.year, st.year + 1, ...S().events.map(e => +e.start.slice(0, 4))])].sort();
  const posters = new Map();
  const loadPosters = async () => {
    const ids = [...new Set(S().events.map(e => e.projectId).filter(id => id && project(id)?.poster && !posters.has(id)))];
    await Promise.all(ids.map(async id => { const d = await posterData(project(id)); if (!d) return; const im = new Image(); im.src = d; try { await im.decode(); posters.set(id, im); } catch (e) { } }));
  };
  modal({
    title: 'Export ปฏิทิน', wide: true, cls: 'exp-modal',
    body: `<div class="exp-opts">
        <div class="exp-row"><span class="exp-l">รูปแบบ</span><div class="seg-chips" id="expLayout">${Object.entries(EXP_LAYOUTS).map(([k2, l]) => `<button type="button" data-l="${k2}" class="${k2 === st.layout ? 'on' : ''}">${l.label}</button>`).join('')}</div></div>
        <div class="exp-row"><span class="exp-l">ธีม</span><div class="seg-chips" id="expTheme">${Object.entries(EXP_THEMES).map(([k2, t]) => `<button type="button" data-t="${k2}" class="${k2 === st.theme ? 'on' : ''}"><i style="background:${t.bg};box-shadow:inset 0 0 0 1px ${t.edge},0 0 0 3px ${hexA(t.accent, .35)}"></i>${t.label}</button>`).join('')}</div></div>
        <div class="exp-row"><span class="exp-l">หมวด</span><div class="seg-chips" id="expCats"><button type="button" data-c="" class="${!EXP_CATS.length ? 'on' : ''}">ทั้งหมด</button>${EV_CATS.map(([k2, l]) => `<button type="button" data-c="${k2}" class="${EXP_CATS.includes(k2) ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="exp-row"><span class="exp-l">ช่วงเวลา</span><select id="expYear">${years.map(y => opt(y, `${y} (พ.ศ. ${y + 543})`, st.year)).join('')}</select><select id="expMonth">${TH_MON_FULL.map((m, i) => opt(i, m, st.month)).join('')}</select></div>
      </div>
      <div class="exp-pv" id="expPv"><canvas id="expCv" aria-label="ตัวอย่างไฟล์ Export"></canvas></div>
      <p class="muted small mt">ไม่รวมงานที่ยกเลิก · ชื่องานแสดงเต็ม ระบบปรับขนาดตัวอักษรให้พอดีเอง · Version = วันที่ Export · รายเดือนแสดงโปสเตอร์ Project ถ้ามี</p>`,
    actions: [
      { label: `${ico('download', 15)} Excel`, cls: 'btn-ghost', left: true, onClick: () => { ACT.exportCal(); return false; } },
      { label: `${ico('print', 15)} พิมพ์ / PDF`, cls: 'btn-ghost', onClick: () => { printCanvas($('#expCv'), st); return false; } },
      { label: `${ico('image', 15)} ดาวน์โหลด PNG`, cls: 'btn-primary', onClick: () => { downloadCanvas($('#expCv'), st); return false; } },
    ],
    async onOpen(md) {
      const cv = $('#expCv', md.el), monthSel = $('#expMonth', md.el);
      const paint = () => {
        const L = EXP_LAYOUTS[st.layout], isMonth = st.layout.startsWith('month');
        monthSel.hidden = !isMonth; $('#expPv', md.el).classList.toggle('portrait', L.H > L.W);
        isMonth ? drawMonth(cv, { ...st, portrait: st.layout === 'month-p', posters }) : drawYear(cv, { ...st, portrait: st.layout === 'year-p' });
      };
      paint(); loadPosters().then(() => { if (posters.size) paint(); });
      $('#expLayout', md.el).onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; st.layout = b.dataset.l; $$('#expLayout button', md.el).forEach(x => x.classList.toggle('on', x === b)); paint(); };
      $('#expTheme', md.el).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; st.theme = b.dataset.t; $$('#expTheme button', md.el).forEach(x => x.classList.toggle('on', x === b)); paint(); };
      $('#expYear', md.el).onchange = e => { st.year = +e.target.value; paint(); };
      $('#expCats', md.el).onclick = e => {
        const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
        EXP_CATS = !c ? [] : EXP_CATS.includes(c) ? EXP_CATS.filter(x => x !== c) : [...EXP_CATS, c];
        $$('#expCats button', md.el).forEach(x => x.classList.toggle('on', x.dataset.c ? EXP_CATS.includes(x.dataset.c) : !EXP_CATS.length)); paint();
      };
      monthSel.onchange = e => { st.month = +e.target.value; paint(); };
    },
  });
}
const expFileName = st => `Event-Calendar${EXP_CATS.length ? '-' + EXP_CATS.map(catLabel).join('-') : ''}-${st.year}${st.layout.startsWith('month') ? '-' + pad2(st.month + 1) : ''}_${st.layout.endsWith('p') ? 'A4' : '16x9'}_v${expVersion().replace(/\//g, '-')}`;
function downloadCanvas(cv, st) {
  cv.toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = expFileName(st) + '.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('ดาวน์โหลดรูปแล้ว');
  }, 'image/png');
}
function printCanvas(cv, st) {
  const w = window.open('', '_blank'); if (!w) return toast('เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาต Pop-up แล้วลองอีกครั้ง', 'error');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${expFileName(st)}</title><style>@page{size:${EXP_LAYOUTS[st.layout].page};margin:0}html,body{margin:0;height:100%;background:#fff}img{width:100%;height:100%;object-fit:contain;display:block}</style></head><body><img src="${cv.toDataURL('image/png')}" alt="Event Calendar" onload="setTimeout(function(){window.focus();window.print()},150)"></body></html>`);
  w.document.close();
}
ACT.calExport = () => openCalExport();
