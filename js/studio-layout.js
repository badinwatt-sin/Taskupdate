'use strict';
/* ============================================================
   Poster Studio · layout engine
   brief (what the message says) → design generator → layers
   Every element is a layer {id, t, x, y, w, h, …} so people can move,
   resize, restyle or delete it afterwards. Layers are drawn on canvas.
   ============================================================ */
const SD_KINDS = {
  announce: ['ประกาศ / แจ้งข่าว', 'ประกาศ'], change: ['แจ้งเปลี่ยนแปลง', 'แจ้งเปลี่ยนแปลง'], event: ['เชิญร่วมงาน / อบรม', 'ขอเชิญ'],
  campaign: ['แคมเปญ / แข่งขัน', 'แคมเปญ'], reminder: ['แจ้งเตือน / กำหนดส่ง', 'อย่าลืม'], recognition: ['ยินดี / รางวัล', 'ขอแสดงความยินดี'],
  knowledge: ['ให้ความรู้ / How-to', 'รู้ไว้ใช่ว่า'], recruit: ['รับสมัคร', 'เปิดรับสมัคร'],
};
const SD_DESIGNS = {   // key: [name, use]
  feature: ['คนเด่น + กล่องข้อมูล', 'แบบหลักของทีม: หัวข้อซ้าย คนขวา'],
  circles: ['วงกลมประเด็น', '“3 เรื่องควรรู้” รอบตัวคน'],
  hero: ['ประกาศเด่น', 'ข้อความหลัก + ตัวละครใหญ่'],
  banner: ['แถบน้ำเงิน', 'ประกาศทางการ'],
  cards: ['การ์ดอธิบาย', 'หลายประเด็น ตัวละครต่อข้อ'],
  notes: ['โน้ตบอร์ด', 'เช็กลิสต์บนกระดาษโน้ต'],
  split: ['ภาพครึ่งหนึ่ง', 'ฉากใหญ่ + ข้อความ'],
  date: ['กำหนดการ', 'วันที่เด่น งาน / เส้นตาย'],
  minimal: ['เรียบ สะอาด', 'ข้อความสั้น ที่ว่างเยอะ'],
};
const SD_ORDER = Object.keys(SD_DESIGNS);
const SD_ACCENTS = ['blue', 'pink', 'amber', 'mint', 'lavender'];
const sdPastel = k => (PA_COLS[k] || PA_COLS.blue)[1];
const sdSoft = k => pbMix(sdPastel(k), '#FFFFFF', .55);
const sdId = () => 'l' + Math.random().toString(36).slice(2, 9);

/* ---------- brief ---------- */
const SD_TH_MON = 'ม.ค.|ก.พ.|มี.ค.|เม.ย.|พ.ค.|มิ.ย.|ก.ค.|ส.ค.|ก.ย.|ต.ค.|พ.ย.|ธ.ค.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|Jan\\w*|Feb\\w*|Mar\\w*|Apr\\w*|May|Jun\\w*|Jul\\w*|Aug\\w*|Sep\\w*|Oct\\w*|Nov\\w*|Dec\\w*';
const SD_RE_DATE = new RegExp(`(?:(?:วัน\\S*\\s*)?(?:ที่\\s*)?\\d{1,2}(?:\\s*[-–]\\s*\\d{1,2})?\\s*(?:${SD_TH_MON})\\s*(?:\\d{2,4})?)|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}`, 'i');
const SD_RE_TIME = /\d{1,2}[.:]\d{2}\s*(?:[-–]|ถึง)\s*\d{1,2}[.:]\d{2}\s*(?:น\.)?|\d{1,2}[.:]\d{2}\s*น\./;
function sdLocalBrief(text) {   // zero-token fallback: simple reading of the pasted message
  const src0 = pbThaiDigits(String(text || '')).replace(/^\s*(?:ช่วย)?(?:ทำ|สร้าง|ออกแบบ|ขอ)\s*(?:โปสเตอร์|ภาพ|ป้าย|poster|อาร์ตเวิร์ก)\s*(?:ให้|สำหรับ|เพื่อ)?\s*|^\s*อยาก(?:ประกาศ|แจ้ง|ประชาสัมพันธ์|บอก)(?:ให้ทราบ)?(?:ว่า)?\s*/i, '');
  let lines = src0.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (lines.length <= 2) lines = lines.flatMap(l => l.split(/\s+(?=(?:ใน)?วันที่\s|วัน(?:จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์|อาทิตย์)|เวลา\s|ณ\s|ห้อง|สถานที่|ผ่าน\s*(?:zoom|teams)|ลงทะเบียน|สมัคร(?:ได้)?ที่|สอบถาม|\*)/i)).map(s => s.trim()).filter(Boolean);   // one-sentence prompt → one fact per line
  const src = lines.join('\n');
  const b = sdEmptyBrief(); b.by = 'auto';
  const take = re => { for (const l of lines) { if (l.length > 80 || /เบี้ย|ภายใน|อนุมัติ|ก่อน|หลัง|ตั้งแต่.*ถึง|ระหว่าง/.test(l) && l.length > 40) continue; const m = l.match(re); if (m) return m[0].trim(); } return ''; };   // facts only from short fact lines, not from conditions
  b.date = take(SD_RE_DATE); b.time = take(SD_RE_TIME);
  const vl = lines.find(l => /^(?:สถานที่|ณ|venue|ที่\s|ห้อง|ผ่าน\s*(?:zoom|teams)|zoom|online)/i.test(l)); b.venue = vl ? vl.replace(/^(?:สถานที่|venue)\s*[:：]?\s*/i, '') : '';
  const used = new Set([vl]);
  const noteL = lines.filter(l => /^(?:\*|หมายเหตุ|เงื่อนไข|ติดต่อ|สอบถาม)/.test(l)); noteL.forEach(l => used.add(l)); b.note = noteL.join(' ');
  const ctaL = lines.find(l => !used.has(l) && /ลงทะเบียน|สมัคร|สแกน|คลิก|ติดต่อ|ส่ง.*ภายใน|ตอบรับ|register|scan/i.test(l) && l.length < 60); if (ctaL) { used.add(ctaL); b.cta = ctaL; }
  const rest = lines.filter(l => !used.has(l) && !(b.date && l.includes(b.date) && l.length < b.date.length + 30) && !(b.time && l.includes(b.time) && l.length < b.time.length + 30));
  const head = (rest.shift() || '').replace(/[.。,]$/, '').replace(/\s*(?:เข้า|ร่วม)?(?:ใน)?$/, '');
  const hs = sdShapeHead(head); b.headline = hs.lines; b.emph = hs.emph; const kick0 = hs.kicker; if (hs.sub) rest.unshift(hs.sub);
  if (rest.length && rest[0].length < 90 && !/^[-•·*\d]/.test(rest[0])) b.sub = rest.shift();
  b.points = rest.map(l => l.replace(/^\s*(?:[-–•·*]|\d+[.)])\s*/, '')).filter(Boolean).slice(0, 4).map(l => { const m = l.match(/^(.{2,40}?)\s*[:：]\s*(.+)$/); return m ? { title: m[1], body: m[2], visual: '' } : { title: l, body: '', visual: '' }; });
  b.kind = sdGuessKind(head + ' ' + (rest[0] || ''), lines.join(' '));
  const all = lines.join(' ');
  b.kicker = kick0 || (/^(?:ขอ)?เชิญ/.test(b.headline[0] || '') && b.kind === 'event' ? '' : SD_KINDS[b.kind][1]); b.kindText = SD_KINDS[b.kind][0];
  b.hero = sdKitPick(head, 'people') || sdKitPick(all, 'people') || SD_KIND_HERO[b.kind];   // the headline decides first
  b.scene = sdScenePick(all, head);
  const usedK = [];
  b.points.forEach((p, i) => { const k = sdKitPick(p.title + ' ' + p.body, ['objects', 'money', 'info'], usedK) || sdKitPick(p.title + ' ' + p.body + ' ' + head, ['objects', 'money', 'info'], usedK); if (k) usedK.push(k); p.visual = k || sdKitFallback(i, usedK); usedK.push(p.visual); });
  b.props = SD_KIND_DECOR[b.kind];
  b.accent = { recognition: 'pink', campaign: 'amber', reminder: 'amber', knowledge: 'mint', change: 'lavender' }[b.kind] || 'blue';
  b.designs = sdRank(b);
  b.summary = `อ่านเป็น “${SD_KINDS[b.kind][0]}”${b.points.length ? ` มี ${b.points.length} ประเด็น` : ''}${b.date ? ` · วันที่ ${b.date}` : ''} (จัดอัตโนมัติโดยไม่ใช้ AI — ตรวจและแก้ได้ด้านล่าง)`;
  return b;
}
const SD_KIND_DECOR = { event: ['H19', 'H20'], change: ['H20', 'H11'], reminder: ['H19', 'F14'], recognition: ['H39', 'F03'], campaign: ['F05', 'F03'], recruit: ['H20', 'H40'], knowledge: ['F14', 'H18'], announce: ['H40', 'H20'] };
const sdKitFallback = (i, avoid = []) => ['E08', 'E51', 'E53', 'E17', 'E05', 'E46'].filter(k => !avoid.includes(k))[i % 4] || 'H18';
const SD_KIND_HERO = { event: 'H36', change: 'H02', reminder: 'H37', recognition: 'H38', campaign: 'H35', recruit: 'H22', knowledge: 'H01', announce: 'H02' };
function sdGuessKind(head, all) {   // kind from free text (headline first, then the whole message)
  const t = [head, all || head];
  for (const x of t) {
    if (/ขอเชิญ|เชิญ|อบรม|สัมมนา|ประชุม|workshop|training|กิจกรรม|งานเลี้ยง|event/i.test(x)) return 'event';
    if (/ยินดี|congrat|ชื่นชม/i.test(x) && x === t[0] || /^ขอแสดงความยินดี/.test(x)) return 'recognition';
    if (/เบี้ย|ผลิตภัณฑ์|แบบประกัน|บำนาญ|ลดหย่อน|ความคุ้มครอง|คุ้มค่า|ออมทรัพย์|smart|plan\b|ประกันชีวิต|ประกันสุขภาพ/i.test(x)) return 'campaign';
    if (/เปลี่ยนแปลง|ปรับ|ยกเลิก|นโยบาย|ระบบใหม่|แจ้งเปลี่ยน/i.test(x)) return 'change';
    if (/ภายใน|กำหนดส่ง|อย่าลืม|เตือน|deadline|ครบกำหนด/i.test(x)) return 'reminder';
    if (/แคมเปญ|แข่งขัน|โปรโมชัน|ยอดขาย|campaign|contest/i.test(x)) return 'campaign';
    if (/รับสมัคร|เปิดรับ|recruit/i.test(x)) return 'recruit';
    if (/วิธี|ขั้นตอน|เคล็ดลับ|รู้ไหม|ต้องรู้|tips|ความรู้|how/i.test(x)) return 'knowledge';
    if (/ประกาศ|แจ้ง|ข่าว/i.test(x)) return 'announce';
  }
  return 'announce';
}
function sdShapeHead(head) {   // one long first line → kicker + 1–2 headline lines (+ product name on the highlight bar) + sub
  let t = String(head || '').trim(), kicker = '', sub = '', prod = '';
  const dots = t.match(/^(.{4,30}?)\s*(?:\.{2,}|…|:|：)\s*(.{8,})$/); if (dots) { kicker = dots[1].trim(); t = dots[2].trim(); }
  const pm = t.match(/^(.{8,}?)\s*(?:ด้วย|กับ|จาก|โดย|ที่)\s*((?:[A-Za-z][\w+&'.-]*)(?:\s+[A-Za-z0-9][\w+&'.-]*){0,3})\s*[!.]?$/); if (pm) { t = pm[1].trim(); prod = pm[2].trim(); }
  if (t.length > 52) {   // too long for a headline: keep the first phrases, move the rest under it
    const parts = t.split(/\s+/); let h = ''; while (parts.length && (h + ' ' + parts[0]).trim().length <= 44) h = (h + ' ' + parts.shift()).trim();
    if (h && parts.length) { sub = parts.join(' '); t = h; }
  }
  const lines = sdSplitHead(t); if (prod) lines.push(prod);
  return { kicker, sub, lines: lines.slice(0, 3), emph: prod ? Math.min(lines.length, 3) - 1 : lines.length > 1 ? 1 : 0 };
}
function sdSplitHead(t) {   // long single line → 2 balanced lines (prefer the space nearest the middle)
  t = String(t || '').trim(); if (!t) return [];
  if (t.length <= 22) return [t];
  const sp = [...t.matchAll(/\s+/g)].map(m => m.index).filter(i => i >= 6 && t.length - i >= 6);
  if (sp.length) { const mid = t.length / 2, i = sp.reduce((a, x) => Math.abs(x - mid) < Math.abs(a - mid) ? x : a); if (Math.abs(i - mid) < t.length * .22) return [t.slice(0, i).trim(), t.slice(i).trim()]; }
  const segs = pbKit(SD_MK.g).segs(t); let best = null, acc = '';
  for (let i = 0; i < segs.length - 1; i++) { acc += segs[i]; const d = Math.abs(acc.length - (t.length - acc.length)); if (!best || d < best[0]) best = [d, acc.trim(), t.slice(acc.length).trim()]; }
  return best ? [best[1], best[2]] : [t];
}
function sdRank(b) {
  const n = b.points.length, has = !!b.date;
  const pref = { event: ['date', 'hero', 'banner', 'split'], reminder: ['date', 'notes', 'hero'], change: ['banner', 'cards', 'notes'], knowledge: ['cards', 'notes', 'split'], recognition: ['hero', 'minimal', 'split'], campaign: ['hero', 'cards', 'banner'], recruit: ['banner', 'hero', 'notes'], announce: ['hero', 'banner', 'minimal'] }[b.kind] || ['hero'];
  const out = [...(n >= 2 && n <= 3 && (b.sub || '').length < 60 && ['knowledge', 'change', 'campaign', 'reminder'].includes(b.kind) ? ['circles', 'feature'] : ['feature']), ...pref.filter(k => k !== 'feature')]; if (n >= 2 && !out.slice(0, 2).includes('cards')) out.splice(1, 0, 'cards'); if (!has) { const i = out.indexOf('date'); if (i >= 0) out.splice(i, 1); }
  SD_ORDER.forEach(k => { if (!out.includes(k)) out.push(k); });
  return out;
}
const sdEmptyBrief = () => ({ kind: 'announce', tone: 'friendly', audience: '', summary: '', kicker: '', headline: [], emph: 0, sub: '', points: [], date: '', time: '', venue: '', cta: '', note: '', hero: 'H02', kindText: '', look: '', props: ['H40', 'H20'], accent: 'blue', designs: [...SD_ORDER], warn: '', by: '' });
function sdNormBrief(x) {
  const b = { ...sdEmptyBrief(), ...(x || {}) }, str = v => String(v == null ? '' : v).trim();
  if (x && x.kind_text && !x.kindText) b.kindText = x.kind_text; delete b.kind_text;
  ['kicker', 'sub', 'date', 'time', 'venue', 'cta', 'note', 'summary', 'audience', 'warn', 'kindText'].forEach(k => { b[k] = str(b[k]); });
  b.headline = (Array.isArray(b.headline) ? b.headline : str(b.headline).split('\n')).map(str).filter(Boolean).slice(0, 3);
  b.emph = Number.isInteger(+b.emph) ? Math.max(-1, Math.min(b.headline.length - 1, +b.emph)) : 0;
  b.points = (Array.isArray(b.points) ? b.points : []).slice(0, 4).map((p, i) => ({ title: str(p && p.title), body: str(p && p.body), visual: p && SD_KIT[p.visual] ? p.visual : (sdKitPick(str(p && p.title) + ' ' + str(p && p.body), ['objects', 'money', 'info']) || sdKitFallback(i)) })).filter(p => p.title || p.body);
  if (!SD_KIT[b.hero]) b.hero = SD_KIND_HERO[b.kind] || 'H02';
  if (!SD_BGIMG[b.scene] || SD_BGIMG[b.scene][1] !== 'photo') b.scene = sdScenePick([b.kindText, b.sub, ...b.points.map(p => p.title)].join(' '), b.headline.join(' '));
  { const seen = new Set(); b.points.forEach((p, i) => { if (seen.has(p.visual)) p.visual = sdKitPick(p.title + ' ' + p.body, ['objects', 'money', 'info'], [...seen]) || sdKitFallback(i, [...seen]); seen.add(p.visual); }); }   // never the same picture twice
  b.props = (Array.isArray(b.props) ? b.props : []).filter(k => SD_KIT[k] && !sdIsPerson(k)).slice(0, 2); if (!b.props.length) b.props = (SD_KIND_DECOR[b.kind] || SD_KIND_DECOR.announce).slice();
  if (!SD_ACCENTS.includes(b.accent)) b.accent = 'blue';
  if (!SD_LOOKS[b.look]) b.look = '';
  if (!SD_KINDS[b.kind]) b.kind = 'announce';
  if (!b.kindText) b.kindText = SD_KINDS[b.kind][0];
  b.hero_fit = b.hero_fit === 'weak' ? 'weak' : 'good'; b.hero_draw = str(b.hero_draw); b.heroSrc = typeof b.heroSrc === 'string' && /^data:image\/svg\+xml/.test(b.heroSrc) ? b.heroSrc : '';
  b.review = (Array.isArray(b.review) ? b.review : []).filter(r => r && r.note).slice(0, 4).map(r => ({ by: r.by === 'design' ? 'design' : 'content', note: str(r.note) }));
  const ds = (Array.isArray(b.designs) ? b.designs : []).filter(k => SD_DESIGNS[k]); SD_ORDER.forEach(k => { if (!ds.includes(k)) ds.push(k); }); b.designs = ds;
  return b;
}
function sdFactWarn(src, b) {   // numbers the poster shows must exist in the source message
  const have = new Set(pbFacts(src)), txt = [b.kicker, ...b.headline, b.sub, b.date, b.time, b.venue, b.cta, b.note, ...b.points.flatMap(p => [p.title, p.body])].join(' ');
  return [...new Set(pbFacts(txt).filter(n => !have.has(n)))];
}

/* ---------- measuring & drawing ---------- */
const SD_MC = document.createElement('canvas'), SD_MK = pbKit(SD_MC.getContext('2d'));
const SD_FONTS = {   // [family, Thai label, source]
  head: [['Publico', 'Publico (CI)']],   // CI: no new typefaces — fallbacks (IBM Plex Sans Thai / Source Sans 3) are automatic, never a choice
  body: [['Source Sans Pro', 'Source Sans Pro (CI)']],
  thai: [['DB Helvethaica X', 'DB Helvethaica X (CI)']],
};
function sdFontCfg() { const f = pbBrand().fonts || {}; return { head: f.head || 'Publico', body: f.body || 'Source Sans Pro', thai: f.thai || 'DB Helvethaica X' }; }
function sdStack(kind) { const c = sdFontCfg(), lat = kind === 'head' ? c.head : kind === 'body' ? c.body : null; return [...new Set([lat, c.thai, 'IBM Plex Sans Thai', 'Source Sans Pro'].filter(Boolean))].map(n => `"${n}"`).join(', ') + ', sans-serif'; }
const sdFam = L => L.ff && L.ff !== 'head' && L.ff !== 'body' ? `"${L.ff}", ${sdStack('body')}` : sdStack(L.ff || (L.font === 'body' ? 'body' : 'head'));
function sdTextLayout(k, L) {
  k.font(L.weight || 700, L.size, sdFam(L)); k.g.textBaseline = 'alphabetic';
  const anyBar = L.emph != null && L.emph >= 0 && !!L.barFill, padX = anyBar ? L.size * .3 : 0, pill = L.pill ? L.size * .62 : 0;
  const maxW = L.auto ? 1e6 : Math.max(L.size * 1.2, L.w - 2 * padX - 2 * pill), out = [];
  String(L.text || '').split('\n').forEach((par, i) => { const bar = anyBar && i === L.emph; (par.trim() ? k.wrap(par, maxW) : [' ']).forEach(s => out.push({ s, bar, w: k.g.measureText(s).width })); });
  const lh = L.size * (L.lh || 1.22), gap = anyBar ? L.size * .1 : 0, tw = Math.max(0, ...out.map(o => o.w));
  return { lines: out, lh, gap, padX, pill, h: out.length * lh + Math.max(0, out.length - 1) * gap + (L.pill ? L.size * .44 : 0), w: tw + 2 * padX + 2 * pill };
}
function sdDrawText(k, L, draw) {
  const m = sdTextLayout(k, L), g = k.g; if (L.auto) L.w = Math.ceil(m.w); L.h = Math.ceil(m.h);
  if (!draw) return;
  if (L.pill) { g.fillStyle = L.pill; k.rr(L.x, L.y, L.w, L.h, L.h / 2); g.fill(); }
  let y = L.y + (L.pill ? L.size * .22 : 0); g.textBaseline = 'middle';
  m.lines.forEach(o => {
    const lw = o.w + 2 * m.padX, x0 = L.pill ? L.x + m.pill - m.padX : L.align === 'center' ? L.x + (L.w - lw) / 2 : L.align === 'right' ? L.x + L.w - lw : L.x;
    if (o.bar) { g.fillStyle = L.barFill; k.rr(x0, y + m.lh * .02, lw, m.lh * .98, L.size * .16); g.fill(); }
    k.font(L.weight || 700, L.size, sdFam(L)); g.fillStyle = o.bar ? (L.barInk || '#FFFFFF') : (L.color || '#00008F'); g.fillText(o.s, x0 + (o.bar || L.pill || L.align !== 'left' ? m.padX : 0), y + m.lh * .54);
    y += m.lh + m.gap;
  });
  g.textBaseline = 'alphabetic';
}
/* card: rounded panel with optional number / object, title and body (bullets when several lines) */
function sdCardLayout(k, L) {
  const s = L.size, pad = s * .85, lead = (L.num || L.icon) ? s * 2.1 : 0, iL = L.insetL || 0, iR = L.insetR || 0, iT = L.insetT || 0;
  const tw = Math.max(s * 2, L.w - 2 * pad - lead - iL - iR), bodyLines = String(L.body || '').split('\n').map(x => x.trim()).filter(Boolean), bul = L.bullets !== false && bodyLines.length > 1;
  k.font(700, s, sdStack('body')); const tl = L.title ? k.wrap(L.title, tw) : [];
  k.font(400, s * .8, sdStack('body')); const bl = bodyLines.map(t => k.wrap(t, tw - (bul ? s * .9 : 0)));
  const th = tl.length * s * 1.2, bh = bl.reduce((a, x) => a + x.length * s * .8 * 1.38, 0) + Math.max(0, bl.length - 1) * s * .18;
  const h = Math.max(L.minH || 0, iT + pad + th + (th && bh ? s * .3 : 0) + bh + pad, lead ? iT + pad * 2 + s * 1.6 : 0);
  return { s, pad, lead, iL, iT, tw, tl, bl, bul, th, h };
}
function sdDrawCard(k, L, draw) {
  const m = sdCardLayout(k, L), g = k.g; L.h = Math.ceil(m.h); if (!draw) return;
  const r = Math.min(L.w, L.h) * (L.r == null ? .09 : L.r);
  g.save(); if (L.shadow) k.shadow(true, 26 * L.size / 30, 8 * L.size / 30, .12); g.fillStyle = L.fill || '#FFFFFF'; k.rr(L.x, L.y, L.w, L.h, r); g.fill(); g.restore();
  if (L.tail) { const tx = L.tail === 'br' ? L.x + L.w * .78 : L.x + L.w * .16, s2 = L.size * .9; g.fillStyle = L.fill || '#FFFFFF'; g.beginPath(); g.moveTo(tx - s2 * .6, L.y + L.h - 2); g.lineTo(tx + s2 * .6, L.y + L.h - 2); g.lineTo(tx + (L.tail === 'br' ? s2 * .9 : -s2 * .5), L.y + L.h + s2 * 1.1); g.closePath(); g.fill(); }
  if (L.deco === 'tape') { g.save(); g.translate(L.x + L.w / 2, L.y); g.rotate(-.05); g.fillStyle = 'rgba(255,255,255,.62)'; g.fillRect(-L.size * 2.2, -L.size * .45, L.size * 4.4, L.size * .9); g.restore(); }
  if (L.deco === 'pin') { paCircle(g, L.x + L.w / 2, L.y + L.size * .55, L.size * .38, '#FF1721'); paCircle(g, L.x + L.w / 2 - L.size * .1, L.y + L.size * .46, L.size * .12, 'rgba(255,255,255,.7)'); }
  const x0 = L.x + m.pad + m.iL, y0 = L.y + m.pad + m.iT, ink = L.ink || '#0C0E45';
  if (L.num) { const c = L.size * .95; paCircle(g, x0 + c, y0 + c * .86, c, L.numFill || '#00008F'); k.font(700, L.size * .95, sdStack('body')); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(L.num), x0 + c, y0 + c * .9); g.textAlign = 'left'; }
  else if (L.icon) { const c = L.size * .95; paCircle(g, x0 + c, y0 + c * .86, c, '#FFFFFF'); saProp(g, L.icon, x0 + c * .38, y0 + c * .24, c * 1.24, c * 1.24); }
  const tx = x0 + m.lead; let y = y0; g.textBaseline = 'middle';
  k.font(700, m.s, sdStack('body')); g.fillStyle = L.titleInk || '#00008F'; m.tl.forEach(t => { g.fillText(t, tx, y + m.s * .62); y += m.s * 1.2; });
  if (m.th && m.bl.length) y += m.s * .3;
  k.font(400, m.s * .8, sdStack('body')); const lh = m.s * .8 * 1.38;
  m.bl.forEach(lines => { lines.forEach((t, i) => { if (m.bul && i === 0) { g.strokeStyle = L.titleInk || '#00008F'; g.lineWidth = m.s * .09; g.beginPath(); g.arc(tx + m.s * .3, y + lh * .55, m.s * .17, 0, 6.3); g.stroke(); } g.fillStyle = ink; g.fillText(t, tx + (m.bul ? m.s * .9 : 0), y + lh * .56); y += lh; }); y += m.s * .18; });
  g.textBaseline = 'alphabetic';
}
function sdListLayout(k, L) {   // checklist box: ✓ + bold title + one-line body per item
  const s = L.size, pad = s * .9, ic = (L.items || []).some(it => it.kit) ? s * 1.6 : s * 1.05, tw = Math.max(s * 3, L.w - 2 * pad - ic - s * .5); let h = pad;
  const rows = (L.items || []).map(it => { k.font(700, s, sdStack('body')); const t = it.title ? k.wrap(it.title, tw) : []; k.font(400, s * .8, sdStack('body')); const bb = it.body ? String(it.body).split('\n').flatMap(x => k.wrap(x, tw)) : []; const rh = t.length * s * 1.18 + (bb.length ? s * .12 + bb.length * s * .8 * 1.34 : 0); h += Math.max(rh, it.kit ? ic : 0) + s * .55; return { t, bb, th: rh, rh: Math.max(rh, it.kit ? ic : 0), icon: it.icon, num: it.num, kit: it.kit }; });
  return { s, pad, ic, tw, rows, h: Math.max(h - s * .55 + pad, s * 3, L.minH || 0) };
}
function sdDrawList(k, L, draw) {
  const m = sdListLayout(k, L), g = k.g; L.h = Math.ceil(m.h); if (!draw) return;
  const r = Math.min(L.w, L.h) * (L.r == null ? .08 : L.r);
  g.save(); if (L.shadow) k.shadow(true, m.s * .9, m.s * .3, .16); g.fillStyle = L.fill || '#6574F8'; k.rr(L.x, L.y, L.w, L.h, r); g.fill();
  if (L.tail) { const tx = L.tail === 'br' ? L.x + L.w * .8 : L.x + L.w * .16, s2 = m.s * 1.1; g.beginPath(); g.moveTo(tx - s2 * .6, L.y + L.h - 2); g.lineTo(tx + s2 * .6, L.y + L.h - 2); g.lineTo(tx + (L.tail === 'br' ? s2 * .9 : -s2 * .5), L.y + L.h + s2 * 1.1); g.closePath(); g.fill(); }
  g.restore();
  let y = L.y + m.pad; const x0 = L.x + m.pad, tx = x0 + m.ic + m.s * .5; g.textBaseline = 'middle';
  m.rows.forEach(row => {
    const ys = y; if (row.kit && row.th < row.rh) y += (row.rh - row.th) / 2;   // text centred on the icon
    const cy = y + m.s * .6;
    if (row.num) { paCircle(g, x0 + m.ic / 2, cy, m.ic / 2, L.check || '#FFFFFF'); k.font(700, m.s * .78, sdStack('body')); g.fillStyle = L.checkInk || '#00008F'; g.textAlign = 'center'; g.fillText(row.num, x0 + m.ic / 2, cy + m.s * .03); g.textAlign = 'left'; }
    else if (row.kit) { const kc = ys + m.ic / 2; paCircle(g, x0 + m.ic / 2, kc, m.ic / 2, '#FFFFFF'); const K = SD_KIT[row.kit], im = pbImg(sdKitSrc(row.kit)) || pbImg(sdKitThumb(row.kit)); if (im && K) { const bx = m.ic * .64, sc = Math.min(bx / K[2], bx / K[3]); g.drawImage(im, x0 + (m.ic - K[2] * sc) / 2, kc - K[3] * sc / 2, K[2] * sc, K[3] * sc); } }
    else if (row.icon) { paCircle(g, x0 + m.ic / 2, cy, m.ic / 2, L.iconBg || '#E8EBFF'); saProp(g, row.icon, x0 + m.ic * .18, cy - m.ic * .32, m.ic * .64, m.ic * .64); }
    else { paCircle(g, x0 + m.ic / 2, cy, m.ic / 2, L.check || '#2FB36D'); g.strokeStyle = L.checkInk || '#FFFFFF'; g.lineWidth = m.s * .13; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0 + m.ic * .28, cy); g.lineTo(x0 + m.ic * .45, cy + m.ic * .17); g.lineTo(x0 + m.ic * .74, cy - m.ic * .18); g.stroke(); }
    k.font(700, m.s, sdStack('body')); g.fillStyle = L.titleInk || '#FFFFFF'; row.t.forEach(t => { g.fillText(t, tx, y + m.s * .62); y += m.s * 1.18; });
    if (row.bb.length) { y += m.s * .12; k.font(400, m.s * .8, sdStack('body')); g.fillStyle = L.ink || 'rgba(255,255,255,.92)'; row.bb.forEach(t => { g.fillText(t, tx, y + m.s * .8 * .62); y += m.s * .8 * 1.34; }); }
    y = Math.max(y, ys + row.rh) + m.s * .55;
  });
  g.textBaseline = 'alphabetic';
}
function sdDrawCirc(k, L, draw) {   // round info badge: title + short body centred in a circle
  L.h = L.w; if (!draw) return; const g = k.g, r = L.w / 2, cx = L.x + r, cy = L.y + r, s = L.size, tw = L.w * .76;
  g.save(); k.shadow(true, s * .8, s * .25, .14); g.fillStyle = L.fill || '#F25C5C'; g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.fill(); g.restore();
  k.font(700, s, sdStack('body')); const tl = L.title ? k.wrap(L.title, tw) : []; k.font(400, s * .78, sdStack('body')); const bl = String(L.body || '').split('\n').filter(Boolean).flatMap(t => k.wrap(t, tw * .96));
  const th = tl.length * s * 1.15, bh = bl.length * s * .78 * 1.32, tot = th + (bh ? s * .35 + bh : 0); let y = cy - tot / 2;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (L.icon) { saProp(g, L.icon, cx - s * .7, y - s * 1.9, s * 1.4, s * 1.4); }
  k.font(700, s, sdStack('body')); g.fillStyle = L.titleInk || '#0C0E45'; tl.forEach(t => { g.fillText(t, cx, y + s * .6); y += s * 1.15; }); y += s * .35;
  k.font(400, s * .78, sdStack('body')); g.fillStyle = L.ink || '#0C0E45'; bl.forEach(t => { g.fillText(t, cx, y + s * .78 * .7); y += s * .78 * 1.32; });
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
function sdChipLayout(k, L) { const s = L.size, ic = L.icon ? s * 1.5 : 0; k.font(L.weight || 600, s, sdStack('body')); const tw = k.g.measureText(L.text || ' ').width; return { s, ic, tw, w: tw + s * 1.4 + ic + (ic ? s * .35 : 0), h: s * 2.1 }; }
function sdDrawChip(k, L, draw) {
  const m = sdChipLayout(k, L), g = k.g; L.w = Math.ceil(m.w); L.h = Math.ceil(m.h); if (!draw) return;
  g.fillStyle = L.fill || '#FFFFFF'; k.rr(L.x, L.y, L.w, L.h, L.h / 2); g.fill();
  if (L.stroke) { g.strokeStyle = L.stroke; g.lineWidth = Math.max(1.5, m.s * .07); g.stroke(); }
  if (L.icon) saProp(g, L.icon, L.x + m.s * .6, L.y + (L.h - m.ic) / 2, m.ic, m.ic);
  k.font(L.weight || 600, m.s, sdStack('body')); g.fillStyle = L.ink || '#00008F'; g.textBaseline = 'middle'; g.fillText(L.text || '', L.x + m.s * .7 + (m.ic ? m.ic + m.s * .35 : 0), L.y + L.h * .53); g.textBaseline = 'alphabetic';
}
function sdDrawDate(k, L, draw) {   // calendar page: red header, white body, binder rings
  if (!draw) return; const g = k.g, { x, y, w, h } = L, r = w * .1, hd = h * .27, ink = L.ink || '#00008F';
  g.save(); k.shadow(true, w * .1, w * .035, .18); g.fillStyle = L.body || '#FFFFFF'; k.rr(x, y, w, h, r); g.fill(); g.restore();
  g.save(); k.rr(x, y, w, h, r); g.clip(); g.fillStyle = L.fill || '#FF1721'; g.fillRect(x, y, w, hd); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y + hd - h * .012, w, h * .012); g.restore();
  g.strokeStyle = '#E1E6F0'; g.lineWidth = Math.max(1, w * .006); k.rr(x, y, w, h, r); g.stroke();
  [.28, .72].forEach(f => { paCircle(g, x + w * f, y + hd * .2, w * .04, 'rgba(0,0,0,.18)'); paRR(g, x + w * f - w * .02, y - h * .06, w * .04, hd * .34, w * .02, '#8E97AA'); });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  k.font(700, h * .1, sdStack('body')); g.fillStyle = '#FFFFFF'; g.fillText(L.top || '', x + w / 2, y + hd * .6, w * .9);
  k.font(700, h * .4, sdStack('body')); g.fillStyle = ink; g.fillText(L.day || '', x + w / 2, y + hd + (h - hd) * .43, w * .9);
  k.font(600, h * .11, sdStack('body')); g.fillStyle = '#0C0E45'; g.fillText(L.mon || '', x + w / 2, y + hd + (h - hd) * .82, w * .9);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
const SD_LOGOS = {   // official variants from the Logo/Font/CI guidelines
  color: ['สีเต็ม (มาตรฐาน)', 'assets/brand/ktaxa-logo.png', 'พื้นขาว / สีอ่อน'],
  bordered: ['AXA โปร่งใส ขอบขาว', 'assets/brand/ktaxa-logo-bordered.png', 'พื้นน้ำเงิน / สีเข้ม'],
  outline: ['โปร่งใสทั้งคู่ ขอบขาว', 'assets/brand/ktaxa-logo-outline.png', 'พื้นเข้ม / รูปถ่าย'],
  white: ['โมโนขาว', 'assets/brand/ktaxa-logo-mono-white.png', 'พื้นสีเทา / ขาวดำ'],
  dark: ['โมโนเทาเข้ม', 'assets/brand/ktaxa-logo-mono-dark.png', 'งานขาวดำ'],
  prime: ['AXA Prime (ขาว)', 'assets/brand/axa-prime-logo.png', 'ตราสินค้า · พื้นเข้ม'],
  primeBlue: ['AXA Prime (น้ำเงิน)', 'assets/brand/axa-prime-logo-blue.png', 'ตราสินค้า · พื้นสว่าง'],
};
function sdLogoSrc(L) {
  const B = pbBrand(), v = SD_LOGOS[L.variant] ? L.variant : (L.dark ? 'bordered' : 'color');
  if (v === 'color' && /^data:/.test(B.logo || '')) return B.logo;          // Admin-uploaded override (CI Control)
  if (v === 'bordered' && /^data:/.test(B.logoWhite || '')) return B.logoWhite;
  return SD_LOGOS[v][1];
}
function sdDrawLogo(k, L, draw) {
  const B = pbBrand(), im = pbImg(sdLogoSrc(L)), g = k.g;
  if (im) { const w = im.width * L.h / im.height; if (L.right != null) L.x = L.right - w; L.w = w; if (draw) g.drawImage(im, L.x, L.y, w, L.h); return; }
  if (draw) { g.fillStyle = L.dark ? '#FFFFFF' : '#00008F'; k.rr(L.x, L.y, L.w, L.h, L.h * .1); g.fill(); k.font(700, L.h * .26, sdStack('body')); g.fillStyle = L.dark ? '#00008F' : '#FFFFFF'; g.textAlign = 'center'; g.fillText(B.org || 'LOGO', L.x + L.w / 2, L.y + L.h * .6); g.textAlign = 'left'; }
}
function sdDrawQr(k, L, draw) {
  L.h = L.w; if (!draw) return; const g = k.g, q = pbQr(L.url || '');
  g.fillStyle = '#FFFFFF'; k.rr(L.x, L.y, L.w, L.h, L.w * .08); g.fill();
  const pad = L.w * .08, cell = (L.w - 2 * pad) / (q ? q.n : 21);
  g.fillStyle = '#0C0E45';
  if (q) { for (let r = 0; r < q.n; r++) for (let c = 0; c < q.n; c++) if (q.dark(r, c)) g.fillRect(L.x + pad + c * cell, L.y + pad + r * cell, Math.ceil(cell), Math.ceil(cell)); }
  else { g.globalAlpha = .25; [[0, 0], [14, 0], [0, 14]].forEach(([c, r]) => { g.fillRect(L.x + pad + c * cell, L.y + pad + r * cell, cell * 7, cell * 7); }); g.globalAlpha = 1; k.font(600, L.w * .1, sdStack('body')); g.textAlign = 'center'; g.fillText('ใส่ลิงก์ QR', L.x + L.w / 2, L.y + L.h * .62); g.textAlign = 'left'; }
}
function sdDrawImg(k, L, draw) {
  if (!draw) return; const g = k.g, im = pbImg(L.src); g.save(); k.rr(L.x, L.y, L.w, L.h, Math.min(L.w, L.h) * (L.r || 0)); g.clip();
  if (im) {
    const scale = L.contain ? Math.min(L.w / im.width, L.h / im.height) : Math.max(L.w / im.width, L.h / im.height);
    const w = im.width * scale, h = im.height * scale;
    if (L.exposure || L.contrast) g.filter = `brightness(${L.exposure || 1}) contrast(${L.contrast || 1})`;
    if (L.subjectShadow) { g.shadowColor = 'rgba(12, 14, 69, .55)'; g.shadowBlur = 20 * Math.hypot(g.getTransform().a, g.getTransform().b); }
    g.drawImage(im, L.x + (L.w - w) * (L.cropX ?? .5), L.y + (L.h - h) * (L.cropY ?? .5), w, h);
  } else { g.fillStyle = '#E2EFFF'; g.fillRect(L.x, L.y, L.w, L.h); }
  g.restore();
}
function sdDrawChar(k, L, draw) {
  if (!draw) return; const g = k.g, C = PA_CHARS[L.key]; if (!C) return;
  g.save();
  if (L.panel) { k.rr(L.x, L.y, L.w, L.h, Math.min(L.w, L.h) * (L.r == null ? .08 : L.r)); g.clip(); }
  if (L.flip) { g.translate(L.x * 2 + L.w, 0); g.scale(-1, 1); }
  PA_NOBG = !L.panel; try { C[2](g, { x: L.x, y: L.y, w: L.w, h: L.h }, L.tint || '#8DB8EA'); } finally { PA_NOBG = false; }
  g.restore();
}
const SD_DRAW = { list: sdDrawList, circ: sdDrawCirc, art: sdDrawArt, text: sdDrawText, card: sdDrawCard, chip: sdDrawChip, date: sdDrawDate, logo: sdDrawLogo, qr: sdDrawQr, img: sdDrawImg, char: sdDrawChar,
  prop: (k, L, d) => { if (d) saProp(k.g, L.key, L.x, L.y, L.w, L.h); }, shape: (k, L, d) => { if (d) saShape(k.g, L); } };
const sdM = L => { (SD_DRAW[L.t] || (() => {}))(SD_MK, L, false); return L; };   // measure: fills auto w / h
function sdRender(cv, doc, opt = {}) {
  const fm = PB_FORMATS[doc.format], W = fm[2], H = fm[3], sc = opt.scale || 1;
  cv.width = Math.round(W * sc); cv.height = Math.round(H * sc);
  const g = cv.getContext('2d'), k = pbKit(g); g.setTransform(sc, 0, 0, sc, 0, 0);
  const bg = doc.bg || {}, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, bg.c1 || '#FFFFFF'); gr.addColorStop(1, bg.c2 || bg.c1 || '#FFFFFF'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (bg.img && SD_BGIMG[bg.img]) {   // ready-made background: cover the page; photos get a light wash so type stays legible
    const im = pbImg(sdBgSrc(bg.img)) || pbImg(sdBgSrc(bg.img, true));
    if (im) { const s2 = Math.max(W / im.width, H / im.height), iw = im.width * s2, ih = im.height * s2; g.drawImage(im, (W - iw) / 2, (H - ih) / 2, iw, ih); }
    const wash = bg.wash != null ? bg.wash : SD_BGIMG[bg.img][1] === 'photo' ? .72 : 0;
    if (wash) { const wg = g.createLinearGradient(0, 0, W, 0); wg.addColorStop(0, `rgba(226,239,255,${Math.min(.94, wash + .14)})`); wg.addColorStop(1, `rgba(226,239,255,${Math.max(0, wash - .18)})`); g.fillStyle = wg; g.fillRect(0, 0, W, H); }
  }
  if (bg.glow) { const o = bg.glow, rg = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r); rg.addColorStop(0, `rgba(255,255,255,${o.a == null ? .6 : o.a})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  if (bg.band) { const o = bg.band, lg2 = g.createLinearGradient(0, 0, W, o.h); lg2.addColorStop(0, o.c1); lg2.addColorStop(1, o.c2 || o.c1); g.fillStyle = lg2; g.fillRect(0, 0, W, o.h); }
  (doc.layers || []).forEach(L => {
    if (L.hide) return; g.save(); g.globalAlpha = L.op == null ? 1 : L.op;
    if (L.rot) { const cx = L.x + L.w / 2, cy = L.y + (L.h || 0) / 2; g.translate(cx, cy); g.rotate(L.rot * Math.PI / 180); g.translate(-cx, -cy); }
    try { (SD_DRAW[L.t] || (() => {}))(k, L, true); } catch (e) { console.warn('layer', L.t, e); }
    g.restore();
  });
  return { W, H };
}

/* ============================================================
   Design generators — each returns { bg, layers, over } for a brief + format.
   Type scale s shrinks until everything fits.
   ============================================================ */
function sdCtx(b, fk, s) {
  const fm = PB_FORMATS[fk], W = fm[2], H = fm[3], u = Math.min(W, H) / 1080, land = W / H > 1.2, story = H / W > 1.6, square = !land && !story && W / H > .88;
  const M = (land ? 72 : 64) * u, B = pbBrand(), C = B.colors;
  const c = { b, fk, W, H, u, s, land, story, square, M, top: M + (story ? 120 * u : 0), bot: H - M - (story ? 150 * u : 0), B, C, acc: sdPastel(b.accent), soft: sdSoft(b.accent), L: [], over: false };
  c.add = L => { L.id = L.id || sdId(); c.L.push(L); return L; };
  return c;
}
const sdT = o => sdM({ t: 'text', weight: 700, font: 'head', lh: 1.22, align: 'left', color: '#00008F', ...o });
const SD_DOT = '#0C0E45';
const sdFactBody = t => String(t || '').replace(/^(?:วันที่|เวลา|สถานที่|ณ)\s*[:：]?\s*/, '');
function sdLogo(c, dark) {
  const h = (c.land ? 78 : c.story ? 92 : 84) * c.u, est = h * 2.1, left = c.B.logoPos === 'left';
  return c.add(sdM({ t: 'logo', role: 'logo', dark: !!dark, variant: dark ? 'bordered' : 'color', x: left ? c.M : c.W - c.M - est, y: c.top, w: est, h, right: left ? null : c.W - c.M }));
}
const sdHeadText = b => b.headline.length ? b.headline.join('\n') : 'พิมพ์หัวข้อหลักที่นี่';
function sdHead(c, o) {   // headline: a short line never breaks, a long line takes at most 2 lines (shrinks until it does)
  const L = sdT({ role: 'headline', text: sdHeadText(c.b), emph: c.b.emph, barFill: c.C.primary, barInk: '#FFFFFF', lh: 1.2, ...o });
  const k = SD_MK, pad = L.emph != null && L.emph >= 0 ? L.size * .6 : 0;
  for (let n = 0; n < 12; n++) {
    k.font(L.weight || 700, L.size, sdFam(L)); const maxW = L.w - pad;
    const bad = String(L.text).split('\n').some(par => { const lines = k.wrap(par, maxW).length; return lines > (par.trim().length <= 22 ? 1 : 2); });
    if (!bad) break; L.size *= .92;
  }
  return c.add(sdM(L));
}
function sdKicker(c, o) { const t = c.b.kicker; if (!t) return null; return c.add(sdT({ role: 'kicker', text: t, auto: true, size: 30 * c.u * c.s, weight: 600, font: 'body', color: '#FFFFFF', pill: c.C.primary, ...o })); }
function sdSub(c, o) { if (!c.b.sub) return null; return c.add(sdT({ role: 'sub', text: c.b.sub, size: 36 * c.u * c.s, weight: 500, font: 'body', lh: 1.38, color: '#0C0E45', ...o })); }
function sdFacts(c, x, y, w, o = {}) {   // date / time / venue chips, flowing in rows; returns bottom
  const f = [['date', 'cal'], ['time', 'clock'], ['venue', 'pin']].filter(([k]) => c.b[k]); if (!f.length) return y;
  let cx = x, cy = y, rowH = 0; const gap = 14 * c.u;
  f.forEach(([k, icon]) => {
    const L = sdM({ t: 'chip', role: k, icon, text: c.b[k], size: (o.size || 30) * c.u * c.s, fill: o.fill || '#FFFFFF', ink: o.ink || c.C.primary, stroke: o.stroke || null, x: 0, y: 0 });
    if (L.w > w) { L.size = Math.max(14 * c.u, L.size * w / L.w); sdM(L); }
    if (o.stack || (cx > x && cx + L.w > x + w)) { cx = x; cy += rowH + gap; rowH = 0; }
    if (o.stack && k === f[0][0]) cy = y;
    L.x = o.align === 'center' ? 0 : cx; L.y = cy; c.add(L); cx += L.w + gap; rowH = Math.max(rowH, L.h);
  });
  if (o.align === 'center') { const row = c.L.filter(L => L.t === 'chip' && ['date', 'time', 'venue'].includes(L.role)); const rows = {}; row.forEach(L => (rows[L.y] = rows[L.y] || []).push(L)); Object.values(rows).forEach(r => { const tw = r.reduce((a, L) => a + L.w, 0) + gap * (r.length - 1); let xx = x + (w - tw) / 2; r.forEach(L => { L.x = xx; xx += L.w + gap; }); }); }
  return cy + rowH;
}
function sdFoot(c, x, w, o = {}) {   // note (fine print) at the bottom, CTA above it; returns top of the footer
  let y = c.bot;
  if (c.b.note) { const n = sdT({ role: 'note', text: c.b.note, size: 22 * c.u * Math.min(1.05, Math.max(c.s, .8)), weight: 400, font: 'body', lh: 1.35, color: o.noteInk || '#0C0E45', x, y: 0, w, align: o.align || 'left' }); n.y = y - n.h; y = n.y - 22 * c.u; c.add(n); }
  if (c.b.qr && !o.noQr) {   // QR code with the call to action beside it
    const qs = Math.min(170 * c.u * Math.max(c.s, .8), w * .34), qy = y - qs; c.add({ t: 'qr', role: 'qr', url: c.b.qr, x: o.align === 'center' ? x + (w - qs) / 2 : x, y: qy, w: qs, h: qs, shadow: true });
    if (o.align !== 'center') { const tx = x + qs + 22 * c.u, tw = w - qs - 22 * c.u, t = sdT({ role: 'cta', text: c.b.cta || 'สแกนเพื่อดูรายละเอียด', size: Math.min(32 * c.s, 38) * c.u, weight: 700, font: 'head', color: o.qrInk || c.C.primary, lh: 1.25, x: tx, y: 0, w: tw }); for (let n = 0; n < 8 && t.h > qs * 1.02; n++) { t.size *= .9; sdM(t); } t.y = qy + (qs - t.h) / 2; c.add(t); }
    return qy - 28 * c.u;
  }
  if (c.b.cta) { let L = sdM({ t: 'chip', role: 'cta', text: c.b.cta, icon: o.ctaIcon || '', size: 32 * c.u * c.s, weight: 700, fill: o.ctaFill || c.C.primary, ink: o.ctaInk || '#FFFFFF', x, y: 0 });
    if (L.w > w * 1.15) L = sdT({ role: 'cta', text: c.b.cta, size: Math.min(32 * c.s, 36) * c.u, weight: 700, font: 'body', ff: 'body', color: o.qrInk || c.C.primary, lh: 1.3, x, y: 0, w });   // too long for a pill: two bold lines read better than tiny type
    else if (L.w > w) L.size *= w / L.w, sdM(L); L.y = y - L.h; L.x = o.align === 'center' ? x + (w - L.w) / 2 : x; y = L.y - 26 * c.u; c.add(L); }
  return y;
}
function sdList(c, x, y, w, o = {}) {   // points as compact white rows with a number or check
  const pts = c.b.points; if (!pts.length) return y;
  pts.forEach((p, i) => { const L = c.add(sdM({ t: 'card', role: 'p' + i, title: p.title, body: p.body, size: (o.size || 32) * c.u * c.s, num: o.num ? String(i + 1) : '', icon: o.num ? '' : 'check', numFill: c.C.primary, fill: o.fill || '#FFFFFF', shadow: o.shadow !== false, x, y, w, r: .16 })); y += L.h + (o.gap || 16) * c.u; });
  return y - (o.gap || 16) * c.u;
}
/* ---------- backdrops: each look is a different composition, never the same circle ---------- */
const SD_LOOKS = { arch: 'ซุ้มโค้ง', slab: 'แถบเฉียง', mosaic: 'โมเสก', frame: 'กรอบเหลื่อม', wave: 'คลื่น', corner: 'มุมโค้ง', clean: 'โล่ง' };
const SD_LOOK_ORDER = Object.keys(SD_LOOKS);
const SD_LOOK_BY_KIND = { event: ['slab', 'arch', 'frame'], recognition: ['arch', 'mosaic', 'corner'], campaign: ['slab', 'wave', 'mosaic'], knowledge: ['frame', 'mosaic', 'arch'], change: ['slab', 'frame', 'corner'], reminder: ['corner', 'wave', 'frame'], announce: ['arch', 'slab', 'frame'], recruit: ['mosaic', 'slab', 'arch'] };
function sdLookOf(b) {
  if (SD_LOOKS[b.look]) return b.look;
  const h = [...String(b.headline.join('')) || 'x'].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7), l = SD_LOOK_BY_KIND[b.kind] || SD_LOOK_ORDER;
  return l[h % l.length];
}
function sdStage(c, x, y, w, h, o = {}) {   // draws the shapes behind a hero picture standing in the box (x, y, w, h); bottom edge of the box = feet
  const look = o.look || sdLookOf(c.b), u = c.u, C = c.C, acc = c.acc, soft = c.soft, prim = C.primary, sky = C.sky || '#6574F8', white = '#FFFFFF';
  const add = L => c.add({ t: 'shape', role: 'deco', ...L });
  if (look === 'arch') {
    const aw = Math.min(w * .84, h * .82), ax = x + (w - aw) / 2 + w * .05, ay = y + h * .05;
    add({ kind: 'arch', outline: true, lw: 5 * u, fill: sky, alpha: .55, x: ax - 20 * u, y: ay - 20 * u, w: aw, h: h * .95 });
    add({ kind: 'arch', fill: soft, x: ax, y: ay, w: aw, h: h * .95 });
    add({ kind: 'dots', fill: sky, alpha: .4, x: ax + aw - aw * .12, y: y + h * .58, w: aw * .3, h: aw * .3 });
  } else if (look === 'slab') {
    const sx = x + w * .2, sw = Math.min(w * .92, c.W - sx);
    add({ kind: 'slab', fill: prim, x: sx - w * .075, y: y + h * .05, w: w * .06, h: h * .95, skew: .2 });
    add({ kind: 'slab', fill: acc, alpha: .9, x: sx, y: y + h * .05, w: sw, h: h * .95, skew: .2 });
    add({ kind: 'stripes', fill: white, alpha: .35, x: sx + sw * .52, y: y + h * .1, w: sw * .4, h: h * .16, r: .25 });
  } else if (look === 'mosaic') {
    const i0 = Math.max(0, SD_ACCENTS.indexOf(c.b.accent)), col = k => sdPastel(SD_ACCENTS[(i0 + k) % 5]);
    add({ kind: 'tiles', fill: col(0), fill2: pbMix(col(1), white, .35), fill3: pbMix(col(2), white, .35), fill4: pbMix(col(3), white, .2), r: .14, x: x + w * .06, y: y + h * .1, w: w * .9, h: h * .9 });
  } else if (look === 'frame') {
    const fx = x + w * .1, fy = y + h * .2, fw = w * .82, fh = h * .8;
    add({ kind: 'rect', r: .05, fill: soft, x: fx, y: fy, w: fw, h: fh });
    add({ kind: 'frame', lw: 5 * u, fill: prim, alpha: .6, r: .05, x: fx + 18 * u, y: fy + 18 * u, w: fw, h: fh - 18 * u });
    add({ kind: 'plus', fill: sky, alpha: .7, x: fx - 6 * u, y: y + h * .02, w: w * .18, h: w * .18 });
  } else if (look === 'wave') {
    add({ kind: 'wave', fill: soft, x, y: y + h * .38, w: c.W - x, h: h * .62 });
    add({ kind: 'wave', fill: acc, alpha: .55, x, y: y + h * .56, w: c.W - x, h: h * .44 });
    add({ kind: 'stripes', fill: sky, alpha: .22, x: x + w * .5, y: y + h * .04, w: w * .46, h: h * .2, r: .2 });
  } else if (look === 'corner') {
    add({ kind: 'quarter', corner: 'tr', fill: acc, alpha: .75, x: x + w * .02, y, w: Math.min(w * .96, c.W - x), h: w * .96 });
    add({ kind: 'quarter', corner: 'tr', fill: pbMix(sky, white, .35), alpha: .7, x: x + w * .42, y, w: w * .56, h: w * .56 });
    add({ kind: 'plus', fill: sky, alpha: .6, x: x + w * .02, y: y + h * .62, w: w * .2, h: w * .2 });
  } else {   // clean: a soft floor + marks, lots of air
    add({ kind: 'rect', r: .06, fill: soft, alpha: .55, x: x + w * .04, y: y + h * .44, w: w * .92, h: h * .56 });
    add({ kind: 'plus', fill: sky, alpha: .55, x: x + w * .72, y: y + h * .08, w: w * .22, h: w * .22 });
    add({ kind: 'rect', r: .5, fill: prim, x: x + w * .08, y: y + h * .38, w: w * .22, h: 8 * u });
  }
}
function sdDecor(c, x, y, w, h) {   // object props sit on small shadowed tiles at the outer edges of the picture area, never over the text or the person
  const P = c.b.props || [], u = c.u, sz = Math.max(64 * u, Math.min(w * .22, h * .17, 150 * u));
  const art = k => SD_KIT[k] && !sdIsPerson(k) ? k : null;
  const spots = [[.02, .04, -6], [.98 - sz / w, .5, 5]];
  P.slice(0, 2).forEach((k, i) => {
    if (!art(k)) return; const [fx, fy, rot] = spots[i], tx = x + fx * w, ty = y + fy * h;
    c.add({ t: 'shape', role: 'deco', kind: 'tile', fill: '#FFFFFF', shadow: true, rot, x: tx, y: ty, w: sz, h: sz });
    c.add({ t: 'art', role: 'deco', key: k, rot, x: tx + sz * .15, y: ty + sz * .15, w: sz * .7, h: sz * .7 });
  });
  c.add({ t: 'shape', role: 'deco', kind: 'sparkle', fill: '#F6C873', x: x + w * .8, y: y + h * .05, w: 30 * u, h: 30 * u });
}
function sdHero(c, key, x, y, w, h, o = {}) {   // kit piece (assets/kit) or a drawn character
  key = key || c.b.hero;
  if (sdIsKit(key)) {
    if (!o.panel) return c.add({ t: 'art', role: 'hero', key, x, y, w, h, flip: !!o.flip });
    c.add({ t: 'shape', role: 'deco', kind: 'rect', r: o.r == null ? .08 : o.r, fill: pbMix(o.tint || c.acc, '#FFFFFF', .55), x, y, w, h });
    const p = Math.min(w, h) * .08; return c.add({ t: 'art', role: 'hero', key, x: x + p, y: y + p, w: w - 2 * p, h: h - p * (sdIsPerson(key) ? 1 : 2), flip: !!o.flip });
  }
  return c.add({ t: 'char', role: 'hero', key, tint: o.tint || c.acc, panel: !!o.panel, r: o.r, x, y, w, h, flip: !!o.flip });
}
function sdDateParts(t) {
  t = pbThaiDigits(t || ''); const m = t.match(new RegExp(`(\\d{1,2})(?:\\s*[-–]\\s*(\\d{1,2}))?\\s*(${SD_TH_MON})\\s*(\\d{2,4})?`, 'i'));
  if (m) return { day: m[2] ? `${m[1]}–${m[2]}` : m[1], mon: m[3] + (m[4] ? ' ' + m[4] : ''), top: (t.match(/(จันทร์|อังคาร|พุธ|พฤหัส\S*|ศุกร์|เสาร์|อาทิตย์)/) || [])[1] || 'Save the date' };
  const d = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (d) { const mon = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][+d[2] - 1]; if (mon) return { day: d[1], mon: mon + ' ' + d[3], top: 'Save the date' }; }
  return null;
}

const SD_GEN = {
  feature(c) {   // house pattern: headline top-left (one line boxed), big person on the right, info boxes on the left, QR + CTA bottom-left
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false), light = pbMix(C.sky || '#6574F8', '#FFFFFF', .72);
    const bg = { c1: pbMix(C.paper, '#FFFFFF', .2), c2: light };
    if (c.land) {
      const tw = W * .54; let y = c.top + lg.h * .2; const k = sdKicker(c, { x: M, y }); if (k) y += k.h + 22 * u;
      const hd = sdHead(c, { x: M, y, w: tw, size: 70 * u * c.s, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + 22 * u;
      if (b.sub) { const s1 = c.add(sdM({ t: 'card', role: 'sub', title: '', body: b.sub, size: 34 * u * c.s, fill: C.primary, ink: '#FFFFFF', x: M, y, w: tw, r: .14, bullets: false })); y += s1.h + 22 * u; }
      const ft = sdFoot(c, M, tw); y = sdFacts(c, M, y, tw) + 18 * u;
      if (b.points.length) { const bub = c.add(sdM({ t: 'list', role: 'pts', items: b.points.map(p => ({ title: p.title, body: p.body })), size: 32 * u * c.s, fill: C.sky || '#6574F8', x: M, y, w: tw, r: .1, shadow: true })); y += bub.h; }
      if (y > ft) c.over = true;
      const ph = H * 1.02, pw = W - M - tw - 40 * u; sdStage(c, M + tw + 40 * u, H * .1, pw + M, H * .9); sdHero(c, null, M + tw + 40 * u, H * .14, pw, ph); sdDecor(c, M + tw + 40 * u, H * .12, pw, H * .8);
      return { bg, layers: c.L, over: c.over };
    }
    let y = c.top + lg.h + 26 * u * (c.story ? 1 : .6); const k = sdKicker(c, { x: M, y: c.top + (lg.h - 44 * u * c.s) / 2 });
    const tw = bw * (c.square ? .74 : .82), hd = sdHead(c, { x: M, y, w: tw, size: (c.story ? 92 : c.square ? 72 : 82) * u * c.s, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + 26 * u;
    const ft = sdFoot(c, M, bw * .47), colW = bw * .5;
    const heroTop = y + 10 * u, ah = (H - heroTop) * 1.04;   // person runs off the bottom edge like a photo
    sdStage(c, M + bw * .52, heroTop + 40 * u, W - (M + bw * .52), H - heroTop - 40 * u);
    sdHero(c, null, M + bw * .5, heroTop + 20 * u, bw * .56, ah - 20 * u); sdDecor(c, M + bw * .56, heroTop + 50 * u, bw * .46, (H - heroTop) * .8);
    if (b.sub) { const s1 = c.add(sdM({ t: 'card', role: 'sub', title: '', body: b.sub, size: 34 * u * c.s, fill: C.primary, ink: '#FFFFFF', x: M, y, w: colW, r: .1, bullets: false, shadow: true })); y += s1.h + 24 * u; }
    y = sdFacts(c, M, y, colW, { stack: true }); if (y > heroTop) y += 18 * u;
    if (b.points.length) {
      const bub = c.add(sdM({ t: 'list', role: 'pts', items: b.points.map(p => ({ title: p.title, body: p.body })), size: (c.square ? 28 : 31) * u * c.s, fill: C.sky || '#6574F8', x: M, y, w: colW, r: .09, tail: 'br', shadow: true }));
      y += bub.h + 30 * u;
    }
    if (y > ft) c.over = true;
    return { bg, layers: c.L, over: c.over };
  },
  circles(c) {   // “n things to know”: person in the middle, each point in a bold colour circle around them
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false);
    const pts = (b.points.length ? b.points : [['date', 'วันที่'], ['time', 'เวลา'], ['venue', 'สถานที่']].filter(([k2]) => b[k2]).map(([k2, t]) => ({ title: t, body: sdFactBody(b[k2]) }))).slice(0, 4);
    const cols0 = [['#F25C5C', '#FFFFFF', '#FFFFFF'], ['#8EE3B5', '#0C0E45', '#0C0E45'], ['#FFE27A', '#0C0E45', '#0C0E45'], ['#B9B7F0', '#0C0E45', '#0C0E45']];
    if (c.land) {   // text on the left half, person + circles on the right half
      const tw = W * .44; let y = c.top + lg.h * .3; const k = sdKicker(c, { x: M, y }); if (k) y += k.h + 20 * u;
      const hd = sdHead(c, { x: M, y, w: tw, size: 68 * u * c.s, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + 20 * u;
      if (b.sub) { const sb = sdSub(c, { x: M, y, w: tw }); y += sb.h + 16 * u; }
      const ft = sdFoot(c, M, tw); if (y > ft) c.over = true;
      const ax = W * .5, aw = W - M - ax, ay = c.top + lg.h + 20 * u, ah = H - M - ay, n = pts.length, d = Math.min(aw * .4, ah * (n > 2 ? .5 : .62));
      sdHero(c, null, ax + aw * .3, ay, aw * .4, H - ay);
      const sp = [[0, 0], [1, .12], [0, 1], [1, 1]];
      pts.forEach((p, i) => { const [fx, fy] = sp[i], [fill, ti, ink] = cols0[i % 4]; c.add(sdM({ t: 'circ', role: 'p' + i, title: p.title, body: p.body, size: d * .105, fill, titleInk: ti, ink, x: fx ? ax + aw - d : ax, y: ay + fy * (ah - d), w: d, h: d })); });
      return { bg: { c1: pbMix(C.paper, '#FFFFFF', .1), c2: pbMix(C.sky || '#6574F8', '#FFFFFF', .7) }, layers: c.L, over: c.over };
    }
    let y = c.top + lg.h + 20 * u * (c.story ? 1 : .5); const k = sdKicker(c, { x: M, y: c.top + (lg.h - 44 * u * c.s) / 2 });
    const hd = sdHead(c, { x: M, y, w: bw * .8, size: (c.land ? 64 : c.story ? 90 : c.square ? 70 : 80) * u * c.s, emph: b.emph < 0 ? 0 : b.emph }); y += hd.h + 20 * u;
    if (b.sub) { const sb = sdSub(c, { x: M, y, w: bw * .7 }); y += sb.h + 16 * u; }
    const ft = sdFoot(c, M, bw * .7), area = { x: M, y, w: bw, h: ft - y };
    if (area.h < 300 * u) c.over = true;
    const cols = [['#F25C5C', '#FFFFFF', '#FFFFFF'], ['#8EE3B5', '#0C0E45', '#0C0E45'], ['#FFE27A', '#0C0E45', '#0C0E45'], ['#B9B7F0', '#0C0E45', '#0C0E45']];
    const n = pts.length, d = c.land ? Math.min(area.w * .22, area.h * (n > 2 ? .48 : .8)) : Math.min(bw * .5, area.h * (n > 3 ? .34 : n > 2 ? .46 : .56));
    const ph = area.h * (c.land ? 1 : .96); sdHero(c, null, M + bw * (c.land ? .34 : .22), ft - ph, bw * (c.land ? .32 : .56), ph);   // person behind the circles, standing on the footer line
    const spots = c.land ? [[0, 0], [1, 0], [0, 1], [1, 1]] : n > 3 ? [[1, 0], [0, .26], [1, .52], [0, .78]] : n > 2 ? [[1, 0], [0, .42], [1, .84]] : [[1, .05], [0, .6]];
    pts.forEach((p, i) => {
      const [fx, fy] = spots[i], [fill, ti, ink] = cols[i % 4];
      const x = c.land ? (fx ? M + bw - d - (i > 1 ? d * .35 : 0) : M + (i > 1 ? d * .35 : 0)) : fx ? M + bw - d : M;
      c.add(sdM({ t: 'circ', role: 'p' + i, title: p.title, body: p.body, size: d * .105, fill, titleInk: ti, ink, x, y: area.y + fy * Math.max(0, area.h - d), w: d, h: d }));
    });
    return { bg: { c1: pbMix(C.paper, '#FFFFFF', .1), c2: pbMix(C.sky || '#6574F8', '#FFFFFF', .7) }, layers: c.L, over: c.over };
  },
  hero(c) {
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false);
    const bg = { c1: '#FFFFFF', c2: C.paper };
    if (c.land) {
      const tw = W * .52; let y = c.top; const k = sdKicker(c, { x: M, y }); if (k) y += k.h + 26 * u; else y = c.top + lg.h + 20 * u;
      const hd = sdHead(c, { x: M, y, w: tw, size: 76 * u * c.s }); y += hd.h + 22 * u;
      const sb = sdSub(c, { x: M, y, w: tw }); if (sb) y += sb.h + 26 * u;
      y = sdFacts(c, M, y, tw) + 26 * u; const ft = sdFoot(c, M, tw); y = sdList(c, M, y, tw, { size: 28 }); if (y > ft) c.over = true;
      const px = M + tw + 50 * u, pw = W - M - px, ph = Math.min(H - c.top - lg.h - 70 * u, pw * 1.05), py = H - M - ph;
      sdStage(c, px, py, pw + M, ph);
      sdHero(c, null, px + pw * .06, py + ph * .14, pw * .88, ph * .86); sdDecor(c, px, py + ph * .06, pw, ph * .86);
      return { bg, layers: c.L, over: c.over };
    }
    let y = c.top; const k = sdKicker(c, { x: M, y: y + (lg.h - 44 * u * c.s) / 2 }); y += lg.h + 34 * u;
    const hd = sdHead(c, { x: M, y, w: bw, size: (c.story ? 92 : c.square ? 74 : 84) * u * c.s }); y += hd.h + 22 * u;
    const sb = sdSub(c, { x: M, y, w: bw * .94 }); if (sb) y += sb.h + 30 * u;
    const ft = sdFoot(c, M, bw), avail = ft - y - 10 * u, has = c.b.points.length || c.b.date || c.b.time || c.b.venue;
    if (!has) {
      const ph = Math.min(avail, bw * .9), pw = Math.min(bw, ph * 1.15), px = M + (bw - pw) / 2, py = y + (avail - ph) / 2;
      sdStage(c, px, py, pw, ph);
      sdHero(c, null, px + pw * .1, py, pw * .8, ph); sdDecor(c, px, py, pw, ph);
      if (ph < 240 * u) c.over = true;
      return { bg, layers: c.L, over: c.over };
    }
    const lw = bw * (c.square ? .56 : .54); let ly = sdFacts(c, M, y, lw, { stack: true }); if (ly > y) ly += 20 * u;
    ly = sdList(c, M, ly, lw, { size: c.square ? 27 : 29 }); if (ly > ft) c.over = true;
    const px = M + lw + 24 * u, pw = W - M - px, ph = Math.min(avail, pw * 1.35), py = ft - 10 * u - ph;
    sdStage(c, px, py + ph * .1, pw + M, ph * .9);
    sdHero(c, null, px, py + ph * .2, pw, ph * .8); sdDecor(c, px, py + ph * .14, pw, ph * .8);
    if (ph < 220 * u) c.over = true;
    return { bg, layers: c.L, over: c.over };
  },
  banner(c) {
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, white = '#FFFFFF';
    const band = c.add({ t: 'shape', role: 'band', kind: 'rect', r: 0, fill: C.primary, x: 0, y: 0, w: W, h: H * .45 });
    const glow = c.add({ t: 'shape', role: 'deco', kind: 'slab', fill: C.sky || '#6574F8', alpha: .3, skew: .3, x: W * .58, y: 0, w: W * .5, h: H * .34 });
    if (c.land) {
      band.w = W * .5; band.h = H; glow.x = band.w * .5; glow.y = 0; glow.w = band.w * .6; glow.h = H;
      const tw = band.w - 2 * M; let y = c.top + 100 * u; const kk = sdKicker(c, { x: M, y, pill: white, color: C.primary }); if (kk) y += kk.h + 24 * u;
      const hd = sdHead(c, { x: M, y, w: tw, size: 70 * u * c.s, color: white, barFill: white, barInk: C.primary }); y += hd.h + 20 * u;
      const sb = sdSub(c, { x: M, y, w: tw, color: 'rgba(255,255,255,.9)' }); if (sb) y += sb.h + 20 * u;
      const ch = Math.min(H - y - 10 * u, tw * .62); if (ch > 140 * u) sdHero(c, null, M + tw - ch * 1.05, H - ch, ch * 1.05, ch); else if (y > H - M) c.over = true;
      const rx = W * .5 + M, rw = W - rx - M; sdLogo(c, false); let ry = c.top + 120 * u;
      ry = sdFacts(c, rx, ry, rw, { fill: C.paper }) + 26 * u; const ft = sdFoot(c, rx, rw); ry = sdList(c, rx, ry, rw, { num: true, size: 28, fill: C.paper, shadow: false }); if (ry > ft) c.over = true;
      return { bg: { c1: '#FFFFFF' }, layers: c.L, over: c.over };
    }
    sdLogo(c, true); let y = c.top; const lgH = (c.story ? 92 : 84) * u; y += lgH + 40 * u;
    const kk = sdKicker(c, { x: M, y, pill: white, color: C.primary }); if (kk) y += kk.h + 24 * u;
    const wide = !(c.square && sdHeadText(b).length <= 24 && !c.b.points.length);   // text across the band; picture beside the list below   // long headline: text uses the full band, picture moves beside the list
    const tw = bw * (wide ? .94 : c.square ? .62 : .58), hd = sdHead(c, { x: M, y, w: tw, size: (c.story ? 86 : c.square ? 62 : 72) * u * c.s, color: white, barFill: white, barInk: C.primary }); y += hd.h + 20 * u;
    const sb = sdSub(c, { x: M, y, w: tw, color: 'rgba(255,255,255,.9)' }); if (sb) y += sb.h + 20 * u;
    band.h = Math.max(y + 46 * u, H * (wide ? .34 : c.square ? .5 : .42)); glow.h = band.h; glow.x = W * .56; glow.w = W * .5;
    if (!wide) { const chH = Math.min(band.h - c.top - lgH - 30 * u, bw * .4); sdHero(c, null, W - M - chH, band.h - chH, chH, chH, { flip: true }); }
    let ry = band.h + 44 * u; ry = sdFacts(c, M, ry, wide ? bw * .6 : bw, { fill: C.paper, ...(c.b.points.length ? {} : { stack: true, size: 40 }) }); if (ry > band.h + 44 * u) ry += 26 * u;
    const ft = sdFoot(c, M, bw), lw = wide ? bw * .6 : bw, top = band.h + 30 * u;
    ry = sdList(c, M, ry, lw, { num: true, size: c.square ? 27 : 30, fill: C.paper, shadow: false }); if (ry > ft) c.over = true;
    if (wide) { const ah = ft - top - 10 * u, aw = bw - lw - 24 * u; if (ah < 200 * u) c.over = true; else { sdStage(c, M + lw + 24 * u, top, aw + M, ah + 10 * u); sdHero(c, null, M + lw + 24 * u, top, aw, ah); sdDecor(c, M + lw + 24 * u, top + 10 * u, aw, ah * .8); } }
    return { bg: { c1: '#FFFFFF' }, layers: c.L, over: c.over };
  },
  cards(c) {
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false);
    let y = c.top; const kk = sdKicker(c, { x: M, y: y + (lg.h - 44 * u * c.s) / 2 }); y += lg.h + 30 * u;
    const hd = sdHead(c, { x: M, y, w: bw, size: (c.land ? 62 : c.story ? 82 : c.square ? 62 : 70) * u * c.s }); y += hd.h + 18 * u;
    const sb = sdSub(c, { x: M, y, w: bw }); if (sb) y += sb.h + 24 * u;
    let pts = b.points.length ? b.points : [['date', 'H19', 'วันที่'], ['time', 'F11', 'เวลา'], ['venue', 'H36', 'สถานที่']].filter(([k]) => b[k]).map(([k, v, t]) => ({ title: t, body: sdFactBody(b[k]), visual: v, role: k }));
    if (!pts.length) pts = [{ title: b.sub || 'รายละเอียด', body: '', visual: b.hero }];
    const ft = sdFoot(c, M, bw), n = pts.length, cols = c.land ? n : c.square ? (n <= 2 ? n : 2) : 1, gap = 22 * u, cw = (bw - gap * (cols - 1)) / cols, avail = ft - y;
    const size = (cols === 1 ? 33 : c.land ? 28 : 28) * u * c.s, rows = Math.ceil(n / cols);
    let cy = y, rowH = 0;
    pts.forEach((p, i) => {
      const col = i % cols, x = M + col * (cw + gap), tint = sdPastel(SD_ACCENTS[(SD_ACCENTS.indexOf(b.accent) + i) % 5]), fill = pbMix(tint, '#FFFFFF', .62);
      if (col === 0 && i) { cy += rowH + gap; rowH = 0; }
      let L;
      if (cols === 1) {
        const pw = Math.min(cw * .36, 300 * u), side = i % 2;
        L = c.add(sdM({ t: 'card', role: p.role || 'p' + i, title: p.title, body: p.body, size, fill, x, y: cy, w: cw, r: .1, insetL: side ? 0 : pw, insetR: side ? pw : 0, minH: Math.min(pw * 1.0, (avail - gap * (n - 1)) / n) }));
        sdHero(c, p.visual, side ? x + cw - pw - 14 * u : x + 14 * u, cy + 14 * u, pw, L.h - 28 * u, { panel: true, tint, r: .1 }).role = 'v' + i;
      } else {
        const ph = Math.min(cw * .62, (avail / rows) * .5);
        L = c.add(sdM({ t: 'card', role: p.role || 'p' + i, title: p.title, body: p.body, size, fill, x, y: cy, w: cw, r: .08, insetT: ph }));
        sdHero(c, p.visual, x + 14 * u, cy + 14 * u, cw - 28 * u, ph - 14 * u, { panel: true, tint, r: .08 }).role = 'v' + i;
      }
      rowH = Math.max(rowH, L.h);
    });
    if (cols > 1) { const rowsY = {}; c.L.filter(L => L.t === 'card').forEach(L => { rowsY[L.y] = Math.max(rowsY[L.y] || 0, L.h); }); c.L.filter(L => L.t === 'card').forEach(L => { L.minH = rowsY[L.y]; L.h = rowsY[L.y]; }); }
    if (cy + rowH > ft + 2 * u) c.over = true;
    return { bg: { c1: '#FFFFFF', c2: C.paper }, layers: c.L, over: c.over };
  },
  notes(c) {
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false), paper = b.kind === 'recognition' || b.accent === 'pink' ? C.pink : C.paper;
    let y = c.top + lg.h + 26 * u; const kk = sdKicker(c, { x: 0, y }); if (kk) { kk.x = (W - kk.w) / 2; y += kk.h + 22 * u; }
    const hd = sdHead(c, { x: M, y, w: bw, align: 'center', size: (c.land ? 62 : c.story ? 84 : c.square ? 62 : 72) * u * c.s }); y += hd.h + 16 * u;
    const sb = sdSub(c, { x: M + bw * .06, y, w: bw * .88, align: 'center' }); if (sb) y += sb.h + 20 * u;
    const factNotes = [['date', 'วันที่'], ['time', 'เวลา'], ['venue', 'สถานที่']].filter(([k]) => b[k]).map(([k, t]) => ({ title: t, body: sdFactBody(b[k]), role: k }));
    if (b.points.length) { const fy = sdFacts(c, M, y, bw, { align: 'center' }); if (fy > y) y = fy + 30 * u; else y += 14 * u; } else y += 14 * u;
    const pts = b.points.length ? b.points : factNotes.length ? factNotes : [{ title: b.sub || sdHeadText(b), body: '', visual: '' }];
    const ft = sdFoot(c, M, bw * .62), n = pts.length, cols = c.land ? Math.min(4, n) : c.story ? 1 : n === 1 ? 1 : 2, gap = 30 * u, cw = (bw - gap * (cols - 1)) / cols, colY = Array(cols).fill(y);
    const papers = ['#FCE9A4', '#CFE5F8', '#CDEFE0', '#F8D6DA'];
    pts.forEach((p, i) => {
      const col = colY.indexOf(Math.min(...colY)), x = M + col * (cw + gap);
      const L = c.add(sdM({ t: 'card', role: p.role || 'p' + i, title: p.title, body: p.body, size: (cols === 1 ? 34 : 30) * u * c.s, num: p.role ? '' : String(i + 1), icon: p.role ? { date: 'cal', time: 'clock', venue: 'pin' }[p.role] : '', numFill: C.primary, fill: papers[i % 4], x, y: colY[col], w: cw, r: .03, deco: i % 2 ? 'pin' : 'tape', rot: (i % 2 ? 1.2 : -1.1), shadow: true, insetT: 10 * u }));
      colY[col] += L.h + gap;
    });
    const by = Math.max(...colY) - gap; if (by > ft) c.over = true;
    const hs = Math.min(ft - by - 10 * u, bw * .4, 420 * u);
    if (hs > 150 * u) sdHero(c, null, W - M - hs * .9, ft - hs, hs * .9, hs);
    else { const spare = ft - by - 20 * u; if (spare > 30 * u) c.L.filter(L => /^p\d$/.test(L.role || '')).forEach(L => { L.y += spare * .45; }); }   // no room for a picture: centre the notes
    return { bg: { c1: paper, c2: pbMix(paper, '#FFFFFF', .5) }, layers: c.L, over: c.over };
  },
  split(c) {
    const { W, H, u, M, C, b } = c;
    let x0, y0, tw;
    const scene = (x, y, w, h) => { c.add({ t: 'shape', role: 'deco', kind: 'rect', r: 0, fill: c.soft, x, y, w, h });
      if (sdIsKit(b.hero)) { const ah = h * (h > w ? .8 : .92), hw = Math.min(w * .62, ah * .62); sdStage(c, x + w * .02, y + h * .06, w * .8, h * .94); sdHero(c, null, x + w * .06, y + h - ah, hw, ah); sdDecor(c, x + w * .06, y + h * .14, w * .74, h * .74); return; }
      const ch = h * (h > w ? .62 : .8), cw = Math.min(w, ch * 1.3); sdHero(c, null, x + (w - cw) / 2, y + h - ch, cw, ch, { panel: true, r: 0 }); };
    if (c.land || c.square) { const pw = W * (c.land ? .46 : .44); scene(0, 0, pw, H); x0 = pw + M; y0 = c.top; tw = W - x0 - M; sdLogo(c, false); y0 += (c.land ? 78 : 84) * u + 34 * u; }
    else { const ph = H * (c.story ? .38 : b.points.length > 2 ? .34 : .4); scene(0, 0, W, ph); sdLogo(c, false); x0 = M; y0 = ph + 46 * u; tw = W - 2 * M; }
    let y = y0; const kk = sdKicker(c, { x: x0, y }); if (kk) y += kk.h + 22 * u;
    const hd = sdHead(c, { x: x0, y, w: tw, size: (c.land ? 64 : c.square ? 56 : c.story ? 84 : 72) * u * c.s }); y += hd.h + 18 * u;
    const sb = sdSub(c, { x: x0, y, w: tw, size: (c.square ? 30 : 34) * u * c.s }); if (sb) y += sb.h + 22 * u;
    y = sdFacts(c, x0, y, tw, { fill: C.paper, size: c.square ? 26 : 30 }); y += 22 * u;
    const ft = sdFoot(c, x0, tw); y = sdList(c, x0, y, tw, { size: c.square ? 25 : 29, fill: C.paper, shadow: false }); if (y > ft) c.over = true;
    return { bg: { c1: '#FFFFFF' }, layers: c.L, over: c.over };
  },
  date(c) {
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false), dp = sdDateParts(b.date);
    let y = c.top; const kk = sdKicker(c, { x: M, y: y + (lg.h - 44 * u * c.s) / 2 }); y += lg.h + 34 * u;
    const bs = (c.land ? 300 : c.square ? 250 : 290) * u * c.s;
    if (c.land) {
      if (dp) c.add({ t: 'date', role: 'dateblock', ...dp, fill: C.red, ink: C.primary, x: M, y, w: bs, h: bs * 1.08 });
      const tx = dp ? M + bs + 40 * u : M, tw = W * .6 - tx; let ty = y;
      const hd = sdHead(c, { x: tx, y: ty, w: tw, size: 64 * u * c.s }); ty += hd.h + 18 * u; const sb = sdSub(c, { x: tx, y: ty, w: tw }); if (sb) ty += sb.h + 20 * u;
      ty = Math.max(ty, dp ? y + bs * 1.08 + 30 * u : ty); ty = sdFacts(c, M, ty, W * .6 - M, { stack: false, fill: C.paper }) + 24 * u;
      const ft = sdFoot(c, M, W * .6 - M); ty = sdList(c, M, ty, W * .6 - M, { size: 27, fill: C.paper, shadow: false }); if (ty > ft) c.over = true;
      const px = W * .62, pw = W - M - px, ph = H - c.top - lg.h * 1.8 - 70 * u;
      sdStage(c, px, H - M - ph * .94, pw + M, ph * .94); sdHero(c, null, px + pw * .05, H - M - ph, pw * .9, ph); sdDecor(c, px, H - M - ph, pw, ph);
      return { bg: { c1: '#FFFFFF', c2: C.paper }, layers: c.L, over: c.over };
    }
    if (dp) {
      c.add({ t: 'date', role: 'dateblock', ...dp, fill: C.red, ink: C.primary, x: M, y, w: bs, h: bs * 1.08 });
      const fx = M + bs + 34 * u; sdFacts(c, fx, y + 10 * u, W - M - fx, { stack: true, fill: C.paper, size: c.square ? 26 : 30 }); y += bs * 1.08 + 36 * u;
    }
    const hd = sdHead(c, { x: M, y, w: bw, size: (c.story ? 84 : c.square ? 62 : 74) * u * c.s }); y += hd.h + 18 * u;
    const sb = sdSub(c, { x: M, y, w: bw }); if (sb) y += sb.h + 24 * u;
    if (!dp) { y = sdFacts(c, M, y, bw, { fill: C.paper }) + 24 * u; }
    const ft = sdFoot(c, M, bw * .6), lw = c.b.points.length ? bw * .58 : 0; y = sdList(c, M, y, lw || bw, { size: c.square ? 26 : 29, fill: C.paper, shadow: false }); if (y > ft) c.over = true;
    const top = c.b.points.length ? Math.max(y - 200 * u, hd.y + hd.h + 20 * u) : y, ph = Math.min(c.bot - top, bw * .5), pw = ph * 1.0;
    if (ph > 160 * u) { sdStage(c, W - M - pw * 1.1, c.bot - ph, pw * 1.1 + M, ph); sdHero(c, null, W - M - pw, c.bot - ph, pw, ph); }
    return { bg: { c1: '#FFFFFF', c2: C.paper }, layers: c.L, over: c.over };
  },
  minimal(c) {
    const { W, H, u, M, C, b } = c, bw = W - 2 * M, lg = sdLogo(c, false), tw = c.land ? W * .7 : bw;
    const ft = sdFoot(c, M, bw, { align: 'center' });
    const hs = Math.min((ft - c.top) * (c.land ? .42 : .34), bw * .5);
    let y = c.top + lg.h + (c.land ? 30 : 80) * u * c.s; const x = (W - tw) / 2;
    const kk = sdKicker(c, { x: 0, y, pill: C.paper, color: C.primary }); if (kk) { kk.x = (W - kk.w) / 2; y += kk.h + 30 * u; }
    const hd = sdHead(c, { x, y, w: tw, align: 'center', size: (c.land ? 80 : c.story ? 100 : c.square ? 76 : 90) * u * c.s, emph: -1 }); y += hd.h + 24 * u;
    c.add({ t: 'shape', role: 'deco', kind: 'line', fill: C.red, x: W / 2 - 40 * u, y, w: 80 * u, h: 10 * u }); y += 40 * u;
    const sb = sdSub(c, { x: x + tw * .08, y, w: tw * .84, align: 'center' }); if (sb) y += sb.h + 24 * u;
    y = sdFacts(c, M, y, bw, { align: 'center', fill: '#FFFFFF' }) + 20 * u;
    if (c.b.points.length) { y = sdList(c, M + bw * .1, y, bw * .8, { size: 27, shadow: false, fill: '#FFFFFF' }) + 20 * u; }
    const room = ft - y; if (room < 120 * u && c.b.points.length) c.over = true;
    const h2 = Math.min(hs, room); if (h2 > 110 * u) { sdStage(c, W / 2 - h2 * .6, ft - h2 * 1.1, h2 * 1.2, h2 * 1.1, { look: 'clean' }); sdHero(c, null, W / 2 - h2 * .55, ft - h2 - 10 * u, h2 * 1.1, h2); }
    return { bg: { c1: C.paper, c2: '#FFFFFF' }, layers: c.L, over: c.over };
  },
};
const SD_MIN_SCALE = { portrait: .86, square: .95, story: .9, landscape: .95 };   // below this the type is too small to read on a phone
function sdFit(b, design, fk) {
  let r = null;
  for (const s of [1.6, 1.45, 1.3, 1.2, 1.1, 1, .93, .86, .8, .74, .68, .62, .56]) { r = SD_GEN[design](sdCtx(b, fk, s)); r.scale = s; if (!r.over && r.fill !== false) break; }   // largest type that fits
  return r;
}
function sdBuild(b, design, fk) {   // art direction per format: keep type readable — drop secondary copy before shrinking the type
  if (b.pr && PR_LAYOUTS[design]) return prBuild(b, design, fk);
  const tries = [[b, '']], min = SD_MIN_SCALE[fk] || .86;
  if (b.sub && b.points.length) tries.push([{ ...b, sub: '' }, 'ซ่อนข้อความสรุปในขนาดนี้ เพื่อให้ตัวอักษรใหญ่อ่านง่าย']);
  if (b.points.some(p => p.body)) tries.push([{ ...b, sub: b.points.length ? '' : b.sub, points: b.points.map(p => ({ ...p, body: '' })) }, 'ซ่อนคำอธิบายย่อยในขนาดนี้ เพื่อให้ตัวอักษรใหญ่อ่านง่าย']);
  let r = null, best = null;
  for (const [bb, why] of tries) { r = sdFit(bb, design, fk); r.dropped = why; if (!best || r.scale > best.scale) best = r; if (r.scale >= min && !r.over) break; }
  r = r.scale >= min && !r.over ? r : best;
  r.layers.forEach(L => { L.id = L.id || sdId(); });
  const top = L => (L.role === 'logo' ? 2 : L.role === 'cta' || L.role === 'note' || L.role === 'qr' ? 1 : L.role === 'hero' ? -1 : 0);
  r.layers = r.layers.map((L, i) => [L, i]).sort((a, b) => top(a[0]) - top(b[0]) || a[1] - b[1]).map(x => x[0]);   // footer text always above illustrations   // logo on top, footer above art, the person always under the text
  return r;
}
