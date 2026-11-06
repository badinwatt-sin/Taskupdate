'use strict';
/* ============================================================
   Poster Studio · "pro" templates (art-directed from the team's Health Content posters)
   Rules: one big illustration bleeding off the bottom edge · no floating decoration ·
   CI-approved background only (White / Blue Tint 1 / approved blue gradients) · a strict left
   text column (headline → statement box → info card → checklist bubble → QR + CTA → fine print).
   Every format has its own grid — nothing is just scaled from 4:5.
   ============================================================ */
const SD_ACTIVE = ['feature', 'band', 'circles', 'date'];
Object.assign(SD_DESIGNS, {
  feature: ['คนเด่น + กล่องข้อมูล', 'แบบหลักของทีม — หัวข้อซ้าย ภาพคนใหญ่ขวา'],
  band: ['หัวน้ำเงิน', 'ประกาศทางการ — แถบหัวสีน้ำเงิน AXA'],
  circles: ['3 เรื่องควรรู้', 'ประเด็นในวงกลมสีรอบภาพคน'],
  date: ['กำหนดการ', 'งาน / อบรม / เส้นตาย — ปฏิทินเด่น'],
});
SD_ORDER.splice(0, SD_ORDER.length, ...SD_ACTIVE);   // the gallery and the template picker show only these

const PRO = {   // per-format grid (fractions of W / H; px values are for the 1080 short side)
  portrait:  { M: 64, gap: 26, head: 84, headW: .74, col: .52, hx: .76, hy: .27, maxW: .6,  foot: .5,  cta: 32, body: 31 },
  square:    { M: 60, gap: 22, head: 72, headW: .7,  col: .5,  hx: .78, hy: .3,  maxW: .5,  foot: .48, cta: 30, body: 29 },
  story:     { M: 70, gap: 34, head: 96, headW: .78, col: .54, hx: .78, hy: .3,  maxW: .56, foot: .54, cta: 36, body: 34 },
  landscape: { M: 90, gap: 26, head: 92, headW: .58, col: .54, hx: .8,  hy: .09, maxW: .36, foot: .5,  cta: 34, body: 34 },
};
const proPeople = (c, key) => { key = key || c.b.hero; return SD_KIT[key] && SD_KIT[key][1] === 'people' ? key : (SD_KIND_HERO[c.b.kind] || 'H02'); };
function proSetup(c) {   // margins + safe areas for the format
  const g = PRO[c.fk] || PRO.portrait, u = c.u;
  c.M = g.M * u; c.top = c.M + (c.story ? 150 * u : 0); c.bot = c.H - c.M - (c.story ? 190 * u : 0);
  return g;
}
function proHero(c, g, o = {}) {   // the person: knees at the bottom edge, head around g.hy, never covering the text column
  const key = proPeople(c, o.key), K = SD_KIT[key], ar = K[2] / K[3], W = c.W, H = c.H;
  const hy = o.hy != null ? o.hy : g.hy, maxW = (o.maxW || g.maxW) * W;
  let h = (H - hy * H) / .74, w = h * ar; if (w > maxW) { w = maxW; h = w / ar; }
  const cx = (o.hx != null ? o.hx : g.hx) * W, minX = (o.minX != null ? o.minX : g.col * W + 10 * c.u) - w * .12;
  const x = Math.max(minX, Math.min(cx - w / 2, W - w * .9)), y = H - h * .74;
  c.add({ t: 'art', role: 'hero', key, x, y, w, h });
  return { x, y, w, h, };
}
function proHeroAfter(c, g, hd, o = {}) {   // place the person, then move the head below the headline if they would touch
  const n = c.L.length; let hero = proHero(c, g, o);
  const m = sdTextLayout(SD_MK, hd), right = hd.x + m.w, bottom = hd.y + hd.h;
  if (right > hero.x + hero.w * .25 && bottom + 16 * c.u > hero.y) { c.L.splice(n); hero = proHero(c, g, { ...o, hy: (bottom + 24 * c.u) / c.H }); }
  return hero;
}
function proStatement(c, x, y, w, g) {   // dark box with the context sentence
  if (!c.b.sub) return y;
  const k = proInk(c), L = c.add(sdM({ t: 'card', role: 'sub', title: '', body: c.b.sub, size: g.body * c.u * c.s, fill: k.stmt, ink: k.stmtInk, x, y, w, r: .14, bullets: false, shadow: true }));
  return y + L.h + g.gap * c.u;
}
function proInfo(c, x, y, w, g) {   // white card: date / time / place with small icons
  const items = [['date', 'cal'], ['time', 'clock'], ['venue', 'pin']].filter(([k]) => c.b[k]).map(([k, icon]) => ({ title: sdFactBody(c.b[k]), icon }));
  if (!items.length) return y;
  const L = c.add(sdM({ t: 'list', role: 'facts', items, size: g.body * .92 * c.u * c.s, fill: '#FFFFFF', titleInk: '#00008F', iconBg: '#E2EFFF', x, y, w, r: .12, shadow: true }));
  return y + L.h + g.gap * c.u;
}
function proChecklist(c, x, y, w, g, o = {}) {   // periwinkle speech bubble with ✓ points
  if (!c.b.points.length) return y;
  const k = proInk(c), L = c.add(sdM({ t: 'list', role: 'pts', items: c.b.points.map(p => ({ title: p.title, body: p.body })), size: g.body * c.u * c.s, fill: o.fill || k.list, titleInk: k.listTitle, ink: k.listInk, check: k.check, checkInk: k.checkInk, x, y, w, r: .1, tail: o.tail === false ? null : 'br', shadow: true }));
  return y + L.h + (g.gap + 14) * c.u;
}
function proBody(c, x, y, w, g, o = {}) {   // statement → info → checklist; on wide canvases info and checklist sit side by side
  y = proStatement(c, x, y, w, g);
  const hasInfo = ['date', 'time', 'venue'].some(k => c.b[k]) && !o.noInfo, hasPts = c.b.points.length > 0;
  if (c.land && hasInfo && hasPts) {
    const w1 = w * .4, w2 = w - w1 - 20 * c.u, y1 = proInfo(c, x, y, w1, g), y2 = proChecklist(c, x + w1 + 20 * c.u, y, w2, g, o);
    return Math.max(y1, y2);
  }
  if (!o.noInfo) y = proInfo(c, x, y, w, g);
  return proChecklist(c, x, y, w, g, o);
}
function proBg(c) { return { ...sdTheme(c.b).bg }; }   // CI-approved background only (no extra glow — CI: never create your own gradients)
function proInk(c) {   // colours for the current theme — core + tints only for type
  const d = sdTheme(c.b).dark, C = c.C;
  return d ? { dark: true, head: '#FFFFFF', bar: '#FFFFFF', barInk: '#00008F', stmt: '#6574F8', stmtInk: '#FFFFFF', list: '#FFFFFF', listTitle: '#00008F', listInk: '#0C0E45', check: '#00008F', checkInk: '#FFFFFF', cta: '#FFFFFF', note: '#E2EFFF' }
           : { dark: false, head: '#00008F', bar: '#00008F', barInk: '#FFFFFF', stmt: '#00008F', stmtInk: '#FFFFFF', list: '#6574F8', listTitle: '#FFFFFF', listInk: '#FFFFFF', check: '#FFFFFF', checkInk: '#00008F', cta: '#0C0E45', note: '#0C0E45' };
}

Object.assign(SD_GEN, {
  feature(c) {
    const g = proSetup(c), { W, H, u, b } = c, M = c.M, ik = proInk(c), lg = sdLogo(c, ik.dark);
    const colW = g.col * W - M;
    let y = c.land ? c.top + 6 * u : c.top + lg.h + 40 * u;
    const hd = sdHead(c, { x: M, y, w: g.headW * W - M, size: g.head * u * c.s, color: ik.head, barFill: ik.bar, barInk: ik.barInk, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + (g.gap + 8) * u;
    const hero = proHeroAfter(c, g, hd);
    const ft = sdFoot(c, M, g.foot * W - M, { qrInk: ik.cta, noteInk: ik.note });
    y = proBody(c, M, y, colW, g);
    if (y - g.gap * u > ft) c.over = true;
    return { bg: proBg(c), layers: c.L, over: c.over };
  },
  band(c) {   // AXA Blue header band; the person stands across the band edge
    const g = proSetup(c), { W, H, u, C, b } = c, M = c.M, white = '#FFFFFF', ik = { ...proInk({ ...c, b: { ...b, theme: 'white' } }) };
    const lg = sdLogo(c, true);
    let y = c.land ? c.top + 6 * u : c.top + lg.h + 40 * u;
    const hd = sdHead(c, { x: M, y, w: (c.land ? g.headW : Math.min(g.headW, .6)) * W - M, size: g.head * u * c.s, color: white, barFill: white, barInk: C.primary, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h;
    const bandH = y + (c.land ? 50 : 56) * u;
    const hero = proHeroAfter(c, g, hd, { hy: Math.min(g.hy, (bandH * .5) / H) });
    let ty = bandH + (g.gap + 16) * u; const colW = g.col * W - M;
    const ft = sdFoot(c, M, g.foot * W - M, { qrInk: ik.cta, noteInk: ik.note });
    ty = proBody(c, M, ty, colW, g, { tail: false });
    if (ty - g.gap * u > ft) c.over = true;
    const tb = sdTheme(b); return { bg: { ...(tb.dark ? SD_THEMES.white.bg : tb.bg), band: { h: bandH, c1: '#00008F', c2: '#00008F' } }, layers: c.L, over: c.over };
  },
  circles(c) {   // “3 things to know”: the person in the middle, points in bold colour circles around
    const g = proSetup(c), { W, H, u, b } = c, M = c.M, ik = proInk(c), lg = sdLogo(c, ik.dark), bw = W - 2 * M;
    const pts = (b.points.length ? b.points : [['date', 'วันที่'], ['time', 'เวลา'], ['venue', 'สถานที่']].filter(([k]) => b[k]).map(([k, t]) => ({ title: t, body: sdFactBody(b[k]) }))).slice(0, 4);
    let y = c.land ? c.top + 6 * u : c.top + lg.h + 40 * u;
    const hd = sdHead(c, { x: M, y, w: (c.land ? .46 : .8) * W - M, size: g.head * u * c.s, color: ik.head, barFill: ik.bar, barInk: ik.barInk, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + g.gap * u;
    if (b.sub && c.land) { const sb = sdSub(c, { x: M, y, w: .44 * W - M, size: g.body * u * c.s, color: ik.dark ? '#E2EFFF' : '#0C0E45' }); y += sb.h + g.gap * u; }
    const ft = sdFoot(c, M, (c.land ? .44 : .4) * W - M, { qrInk: ik.cta, noteInk: ik.note });
    const cols = [['#FFB4CE', '#00008F', '#0C0E45'], ['#81EEBB', '#00008F', '#0C0E45'], ['#FFF06C', '#00008F', '#0C0E45'], ['#74BDE8', '#00008F', '#0C0E45']], n = pts.length;   // CI Data palette — allowed for infographic elements
    if (c.land) {
      const ax = .5 * W, aw = W - M - ax, ay = c.top + 40 * u, ah = H - c.M - ay, d = Math.min(aw * .36, ah * (n > 2 ? .48 : .6));
      const hero = proHero(c, g, { hx: .74, minX: ax + aw * .26, maxW: .26 });
      const sp = [[0, 0], [1, .1], [0, 1], [1, 1]];
      pts.forEach((p, i) => { const [fx, fy] = sp[i], [fill, ti, ink] = cols[i % 4]; c.add(sdM({ t: 'circ', role: 'p' + i, title: p.title, body: p.body, size: d * .1, fill, titleInk: ti, ink, x: fx ? ax + aw - d : ax, y: ay + fy * (ah - d), w: d, h: d })); });
      if (y > ft) c.over = true;
      return { bg: proBg(c), layers: c.L, over: c.over };
    }
    const yb = c.bot, d = Math.min(bw * (c.story ? .44 : c.square ? .34 : .42), (yb - y) * (n > 3 ? .27 : n > 2 ? .36 : .5));
    if (yb - y < 420 * u) c.over = true;
    const hero = proHero(c, g, { hx: .6, minX: M + bw * .3, maxW: c.square ? .36 : .46, hy: (y + 10 * u) / H });
    const spots = n > 3 ? [[1, 0], [0, .24], [1, .5], [0, .74]] : n > 2 ? [[1, 0], [0, .3], [1, .66]] : [[1, .04], [0, .42]];
    const y0 = Math.max(y, hero.y + hero.h * .14);   // circles start below the face
    pts.forEach((p, i) => {
      const [fx, fy] = spots[i], [fill, ti, ink] = cols[i % 4], lim = fx ? yb : ft;   // left circles stop above the QR, right ones may go lower
      c.add(sdM({ t: 'circ', role: 'p' + i, title: p.title, body: p.body, size: d * .1, fill, titleInk: ti, ink, x: fx ? W - M - d : M, y: Math.min(y0 + fy * (yb - y0 - d), lim - d - 12 * u), w: d, h: d }));
    });
    return { bg: proBg(c), layers: c.L, over: c.over };
  },
  date(c) {   // events / training / deadlines: a calendar page next to the date details
    const g = proSetup(c), { W, H, u, C, b } = c, M = c.M, ik = proInk(c), lg = sdLogo(c, ik.dark), dp = sdDateParts(b.date);
    const colW = g.col * W - M;
    let y = c.land ? c.top + 6 * u : c.top + lg.h + 40 * u;
    const hd = sdHead(c, { x: M, y, w: g.headW * W - M, size: g.head * u * c.s, color: ik.head, barFill: ik.bar, barInk: ik.barInk, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + (g.gap + 8) * u;
    const hero = proHeroAfter(c, g, hd);
    const ft = sdFoot(c, M, g.foot * W - M, { qrInk: ik.cta, noteInk: ik.note });
    if (dp) {
      const bs = Math.min(colW * .36, (c.land ? 210 : c.square ? 180 : 210) * u * Math.min(1.5, c.s));
      c.add({ t: 'date', role: 'dateblock', ...dp, fill: C.red, ink: C.primary, x: M, y: y + 10 * u, w: bs, h: bs * 1.08 });
      const items = [['time', 'clock'], ['venue', 'pin']].filter(([k]) => b[k]).map(([k, icon]) => ({ title: sdFactBody(b[k]), icon }));
      const side = colW - bs - 22 * u >= 320 * u;   // details beside the calendar when there is room, otherwise under it
      let ry = side ? y + 10 * u : y + 10 * u + bs * 1.08 + g.gap * u;
      if (items.length) { const L = c.add(sdM({ t: 'list', role: 'facts', items, size: g.body * .86 * u * c.s, fill: '#FFFFFF', titleInk: '#00008F', iconBg: '#E2EFFF', x: side ? M + bs + 22 * u : M, y: ry, w: side ? colW - bs - 22 * u : colW, r: .12, shadow: true })); ry += L.h; }
      y = Math.max(y + 10 * u + bs * 1.08, ry) + (g.gap + 8) * u;
    } else y = proInfo(c, M, y, colW, g);
    if (c.land && b.sub && b.points.length) { const w1 = colW * .44, y1 = proStatement(c, M, y, w1, g), y2 = proChecklist(c, M + w1 + 20 * u, y, colW - w1 - 20 * u, g); y = Math.max(y1, y2); }   // wide canvas: statement beside the checklist
    else { y = proStatement(c, M, y, colW, g); y = proChecklist(c, M, y, colW, g); }
    if (y - g.gap * u > ft) c.over = true;
    return { bg: proBg(c), layers: c.L, over: c.over };
  },
});

/* only the art-directed templates are offered; the choice follows the message */
const _sdNormBrief = sdNormBrief;
sdNormBrief = function (x) { const b = _sdNormBrief(x); b.designs = sdRank(b, b.designs); return b; };
sdRank = function (b, aiOrder) {
  const n = b.points.length, out = [];
  const push = k => { if (SD_ACTIVE.includes(k) && !out.includes(k)) out.push(k); };
  if (b.date && ['event', 'reminder', 'recruit'].includes(b.kind)) push('date');
  if (n >= 2 && n <= 3 && (b.sub || '').length < 70 && ['knowledge', 'campaign', 'reminder', 'change'].includes(b.kind)) push('circles');
  if (['change', 'announce'].includes(b.kind)) push('band');
  (aiOrder || []).forEach(push);
  push('feature'); SD_ACTIVE.forEach(push);
  if (!b.date) { const i = out.indexOf('date'); if (i > 0) { out.splice(i, 1); out.push('date'); } }
  return out;
};
