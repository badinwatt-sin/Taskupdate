'use strict';
/* ============================================================
   Import Events from Excel / CSV
   Smart column detection (header names + cell contents) and
   date interpretation (Excel serials, Thai/English months, BE years,
   ranges). Runs entirely in the browser — nothing is uploaded.
   ============================================================ */
const XLSX_SRC = window.XLSX_SRC || 'js/vendor/xlsx.full.min.js';
function loadXlsx() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = XLSX_SRC; s.onload = res;
    s.onerror = () => rej(new Error('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ')); document.head.appendChild(s);
  });
}

/* ---------- text / date interpretation ---------- */
const thDigits = s => String(s).replace(/[๐-๙]/g, c => '๐๑๒๓๔๕๖๗๘๙'.indexOf(c));
const normTxt = v => thDigits(v).replace(/[–—−~]/g, '-').replace(/\s+/g, ' ').trim();
const MONTH_LOOKUP = (() => {
  const m = {}; const en = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  TH_MON.forEach((x, i) => { m[x.replace(/\./g, '')] = i; m[TH_MON_FULL[i]] = i; m[en[i]] = i; m[en[i].slice(0, 3)] = i; });
  m.sept = 8; m['มกรา'] = 0; m['กุมภา'] = 1; m['มีนา'] = 2; m['เมษา'] = 3; m['พฤษภา'] = 4; m['มิถุนา'] = 5; m['กรกฎา'] = 6; m['สิงหา'] = 7; m['กันยา'] = 8; m['ตุลา'] = 9; m['พฤศจิกา'] = 10; m['ธันวา'] = 11;
  return m;
})();
const monthIdx = t => { const k = t.toLowerCase().replace(/[.\s]/g, ''); return k in MONTH_LOOKUP ? MONTH_LOOKUP[k] : -1; };
function normYear(y) { y = +y; if (y >= 2400) return y - 543; if (y < 100) return y >= 55 ? 1957 + y : 2000 + y; return y; }
function mkDate(y, m, d) { const dt = new Date(y, m, d); return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? iso(dt) : null; }

/* returns { start, end, notes[] } or null */
function parseDateValue(v, defYear) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v)) { const s = iso(v); return { start: s, end: s, notes: [] }; }
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000 && window.XLSX) { const p = XLSX.SSF.parse_date_code(v); const s = mkDate(p.y, p.m - 1, p.d); return s ? { start: s, end: s, notes: [] } : null; }
    return null;
  }
  const s = normTxt(v); if (!s) return null; const notes = [];
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s*(?:-|to|ถึง)\s*(\d{4})-(\d{1,2})-(\d{1,2}))?/i))) {
    const a = mkDate(+m[1], m[2] - 1, +m[3]), b = m[4] ? mkDate(+m[4], m[5] - 1, +m[6]) : a; return a && b ? { start: a, end: b, notes } : null;
  }
  const sep = '\\s*(?:-|ถึง|to)\\s*';
  const num = (d, mo, y) => {
    let D = +d, M = +mo, swapped = false; if (M > 12 && D <= 12) { [D, M] = [M, D]; swapped = true; }
    if (swapped) notes.push('ตีความรูปแบบ เดือน/วัน (ไม่ใช่ วัน/เดือน)');
    let Y; if (y) Y = normYear(y); else { Y = defYear; notes.push(`ไม่ระบุปี ใช้ปี ${Y + 543}`); }
    return mkDate(Y, M - 1, D);
  };
  if ((m = s.match(new RegExp(`^(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{2,4}))?${sep}(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{2,4}))?$`, 'i')))) {
    const a = num(m[1], m[2], m[3] || m[6]), b = num(m[4], m[5], m[6] || m[3]); return a && b ? { start: a, end: b, notes } : null;
  }
  if ((m = s.match(new RegExp(`^(\\d{1,2})${sep}(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{2,4}))?$`, 'i')))) {
    const a = num(m[1], m[3], m[4]), b = num(m[2], m[3], m[4]); return a && b ? { start: a, end: b, notes } : null;
  }
  if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/))) { const a = num(m[1], m[2], m[3]); return a ? { start: a, end: a, notes } : null; }
  // month names: tokens
  const toks = s.match(/\d+|[A-Za-zก-๙]+\.?(?:[ก-๙]\.)*/g) || [];
  const segs = []; let buf = [];
  toks.forEach(t => { if (/^\d+$/.test(t)) buf.push(+t); else { const mi = monthIdx(t); if (mi >= 0) { segs.push({ days: buf, mi }); buf = []; } } });
  if (!segs.length) return null;
  let year = null;
  if (segs[0].days.length === 0 && buf.length) { segs[0].days = [buf[0]]; if (buf[1] != null) year = buf[1]; }   // "Dec 15, 2026"
  else if (buf.length) year = buf[buf.length - 1];
  if (year == null) { year = defYear; notes.push(`ไม่ระบุปี ใช้ปี ${year + 543}`); } else year = normYear(year);
  if (!segs[0].days.length) return null;
  let a, b;
  if (segs.length === 1) { const d = segs[0].days; a = mkDate(year, segs[0].mi, d[0]); b = mkDate(year, segs[0].mi, d[d.length > 1 ? 1 : 0]); }
  else { const s2 = segs[1]; const ys = segs[0].mi > s2.mi ? year - 1 : year; a = mkDate(ys, segs[0].mi, segs[0].days[0]); b = mkDate(year, s2.mi, s2.days[s2.days.length - 1] ?? segs[0].days[0]); }
  return a && b ? { start: a, end: b, notes } : null;
}

/* ---------- column detection ---------- */
const IMPORT_FIELDS = [
  { k: 'name', label: 'ชื่องาน', req: true, syn: ['ชื่องาน', 'ชื่อกิจกรรม', 'ชื่อโครงการ', 'กิจกรรม', 'โครงการ', 'หัวข้อ', 'eventname', 'event', 'activity', 'title', 'name', 'งาน', 'รายการ'] },
  { k: 'start', label: 'วันที่จัด / วันเริ่ม', req: true, syn: ['วันที่จัดงาน', 'วันที่จัด', 'วันจัดงาน', 'วันเริ่ม', 'เริ่ม', 'startdate', 'start', 'from', 'วันที่', 'วัน', 'date'] },
  { k: 'end', label: 'วันสิ้นสุด', syn: ['วันสิ้นสุด', 'สิ้นสุด', 'วันจบ', 'ถึงวันที่', 'ถึง', 'enddate', 'end', 'to', 'until'] },
  { k: 'month', label: 'เดือน (ถ้าแยกคอลัมน์)', syn: ['เดือน', 'month'] },
  { k: 'venue', label: 'สถานที่', syn: ['สถานที่', 'ที่จัด', 'venue', 'location', 'place', 'พื้นที่'] },
  { k: 'owner', label: 'เจ้าของงาน', syn: ['เจ้าของงาน', 'เจ้าของ', 'ผู้รับผิดชอบ', 'ผู้ดูแล', 'owner', 'responsible', 'pic', 'incharge', 'ทีม'] },
  { k: 'audience', label: 'กลุ่มเป้าหมาย', syn: ['กลุ่มเป้าหมาย', 'ผู้เข้าร่วม', 'เป้าหมาย', 'audience', 'target', 'attendee'] },
  { k: 'status', label: 'สถานะ', syn: ['สถานะ', 'status'] },
];
const hnorm = s => String(s ?? '').toLowerCase().replace(/[\s._\-:/()]/g, '');
function detectLayout(rows) {
  // header row = first of first 15 rows with >=2 text cells that are not date-like
  let hi = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].filter(c => String(c ?? '').trim() !== '');
    if (cells.length >= 2 && cells.filter(c => typeof c === 'string' && !parseDateValue(c, 2026)).length >= Math.ceil(cells.length * .6)) { hi = i; break; }
  }
  const header = rows[hi].map(c => String(c ?? '').trim()), data = rows.slice(hi + 1).filter(r => r.some(c => String(c ?? '').trim() !== ''));
  const defYear = new Date().getFullYear();
  const cols = header.map((h, c) => {
    const vals = data.map(r => r[c]).filter(v => v !== '' && v != null);
    const dateRatio = vals.length ? vals.filter(v => parseDateValue(v, defYear)).length / vals.length : 0;
    const avgLen = vals.length ? vals.reduce((a, v) => a + String(v).length, 0) / vals.length : 0;
    return { c, h, hn: hnorm(h), vals, dateRatio, avgLen, textRatio: vals.length ? vals.filter(v => typeof v === 'string' && !/^[\d\s/.\-]+$/.test(v)).length / vals.length : 0 };
  }).filter(x => x.h || x.vals.length);
  const map = {}, how = {}, used = new Set();
  IMPORT_FIELDS.forEach(f => {   // 1) by header, synonyms ordered by priority
    for (const s of f.syn) { const col = cols.find(x => !used.has(x.c) && (x.hn === hnorm(s) || (hnorm(s).length > 2 && x.hn.includes(hnorm(s))))); if (col) { map[f.k] = col.c; how[f.k] = 'header'; used.add(col.c); break; } }
  });
  if (map.start == null) { const col = cols.filter(x => !used.has(x.c) && x.dateRatio >= .6).sort((a, b) => b.dateRatio - a.dateRatio)[0]; if (col) { map.start = col.c; how.start = 'content'; used.add(col.c); } }
  if (map.name == null) { const col = cols.filter(x => !used.has(x.c) && x.dateRatio < .3 && x.textRatio > .6).sort((a, b) => b.avgLen - a.avgLen)[0]; if (col) { map.name = col.c; how.name = 'content'; used.add(col.c); } }
  if (map.status == null) {   // status column without a clear header: look at the contents
    const col = cols.filter(x => !used.has(x.c) && x.vals.length).map(x => ({ x, r: x.vals.filter(v => STATUS_SYN.some(([rx]) => rx.test(String(v)))).length / x.vals.length })).sort((a, b) => b.r - a.r)[0];
    if (col && col.r >= .3) { map.status = col.x.c; how.status = 'content'; used.add(col.x.c); }
  }
  return { hi, header, data, cols, map, how };
}

/* ---------- month-grid layout: ม.ค. … ธ.ค. as column headers, events/days inside the cells ---------- */
function cellMonth(v) {
  if (v instanceof Date && !isNaN(v)) return { mi: v.getMonth(), y: v.getFullYear() };
  const t = normTxt(v); if (!t || t.length > 24) return null;
  const word = t.replace(/[\d'’]+/g, ' ').trim().split(/[\s\-/]+/)[0] || '';
  const mi = monthIdx(word); if (mi < 0) return null;
  const yd = t.match(/(\d{4}|\d{2})\s*$/); return { mi, y: yd ? normYear(yd[1]) : null };
}
function detectMonthGrid(rows) {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const mcols = rows[r].map((v, c) => { const m = cellMonth(v); return m ? { c, ...m } : null; }).filter(Boolean);
    if (mcols.length < 4 || new Set(mcols.map(x => x.mi)).size < 4) continue;
    const data = rows.slice(r + 1).filter(x => x.some(v => String(v ?? '').trim() !== ''));
    const mset = new Set(mcols.map(x => x.c)), header = rows[r].map(v => String(v ?? '').trim());
    const others = header.map((h, c) => ({ c, h, hn: hnorm(h) })).filter(x => !mset.has(x.c));
    const pick = syn => others.find(x => syn.some(s => x.hn === hnorm(s) || (hnorm(s).length > 2 && x.hn.includes(hnorm(s)))))?.c;
    let nameCol = pick(IMPORT_FIELDS[0].syn);
    if (nameCol == null) {   // longest text column left of / outside the month block
      const score = c => data.reduce((a, row) => a + (typeof row[c] === 'string' ? row[c].trim().length : 0), 0);
      nameCol = others.map(x => x.c).sort((a, b) => score(b) - score(a))[0];
    }
    // year: from the month headers, else any 4-digit year in the rows above, else this year
    let year = mcols.find(x => x.y)?.y || null;
    if (!year) for (let i = 0; i <= r && !year; i++) for (const v of rows[i]) { const m = normTxt(v).match(/(25\d\d|20\d\d)/); if (m) { year = normYear(m[1]); break; } }
    return { hi: r, data, header, mcols, nameCol, venueCol: pick(IMPORT_FIELDS.find(f => f.k === 'venue').syn), ownerCol: pick(IMPORT_FIELDS.find(f => f.k === 'owner').syn), year: year || new Date().getFullYear(), yearGuessed: !year };
  }
  return null;
}
function buildGridRows(g) {
  const out = []; let i = 0;
  g.data.forEach(row => {
    const rowName = g.nameCol != null ? String(row[g.nameCol] ?? '').trim() : '';
    let lastMi = -1, y = g.year;
    g.mcols.forEach(mc => {
      if (mc.y) y = mc.y; else if (lastMi >= 0 && mc.mi < lastMi) y++;   // Dec → Jan rolls into next year
      lastMi = mc.mi;
      const v = row[mc.c]; if (v == null || String(v).trim() === '') return;
      const notes = []; let d1 = null, d2 = null, label = '';
      if (v instanceof Date && !isNaN(v)) { d1 = d2 = iso(v); }
      else if (typeof v === 'number' && v > 20000 && window.XLSX) { const p = XLSX.SSF.parse_date_code(v); d1 = d2 = mkDate(p.y, p.m - 1, p.d); }
      else {
        const t = normTxt(v), m = t.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?(?:\s*[,&]\s*\d{1,2}(?:\s*-\s*\d{1,2})?)*\s*(.*)$/);
        if (m && +m[1] >= 1 && +m[1] <= 31) { d1 = mkDate(y, mc.mi, +m[1]); d2 = mkDate(y, mc.mi, +(m[2] || m[1])); label = m[3].replace(/^[:.\-–)\s]+/, '').trim(); }
        else { label = /[A-Za-zก-๙]{2,}/.test(t) ? t : ''; d1 = d2 = mkDate(y, mc.mi, 1); notes.push('ไม่ระบุวันที่ในเซลล์ — ใช้วันที่ 1 ของเดือน'); }
      }
      if (g.yearGuessed) notes.push(`ไม่พบปีในไฟล์ ใช้ปี ${y + 543}`);
      const name = label && rowName ? `${rowName} · ${label}` : (label || rowName);
      out.push({ i: i++, include: true, name, start: d1 || '', end: d2 || d1 || '', venue: g.venueCol != null ? String(row[g.venueCol] ?? '').trim() : '', audience: '',
        ownerText: g.ownerCol != null ? String(row[g.ownerCol] ?? '').trim() : '', owner: g.ownerCol != null ? matchOwner(row[g.ownerCol]) : '', status: 'planning',
        raw: `${g.header[mc.c] || ''}: ${v instanceof Date ? iso(v) : String(v).trim()}`, pre: notes });
    });
  });
  return out.map(validateRow);
}
/* rows that came back from the AI reader */
function aiToRows(list) {
  return list.map((e, i) => validateRow({ i, include: true, name: String(e.name || '').trim(), start: /^\d{4}-\d\d-\d\d$/.test(e.start) ? e.start : '', end: /^\d{4}-\d\d-\d\d$/.test(e.end) ? e.end : '',
    venue: String(e.venue || '').trim(), audience: String(e.audience || '').trim(), ownerText: String(e.owner || '').trim(), owner: matchOwner(e.owner),
    status: ['planning', 'confirmed', 'done', 'cancelled'].includes(e.status) ? e.status : 'planning', raw: 'AI', pre: e.note ? ['AI: ' + String(e.note)] : [] }));
}

/* ---------- row building & validation ---------- */
const STATUS_SYN = [[/ยกเลิก|cancel/i, 'cancelled'], [/เสร็จ|จัดแล้ว|done|complete|finished/i, 'done'], [/ยืนยัน|confirm|approved|อนุมัติ/i, 'confirmed'], [/วางแผน|plan|draft|รอ|tbc|pending/i, 'planning']];
function matchOwner(t) { t = String(t || '').toLowerCase(); if (!t) return ''; return S().members.find(m => t.includes(m.name.toLowerCase()) || (m.alias && t.includes(m.alias)))?.id || ''; }
function buildRows(layout, map) {
  const { data } = layout, get = (r, k) => (map[k] != null ? r[map[k]] : '');
  // pick the dominant year of parseable dates, to fill dates written without a year
  const years = {}; data.forEach(r => { const d = parseDateValue(get(r, 'start'), new Date().getFullYear()); if (d && !d.notes.length) { const y = +d.start.slice(0, 4); years[y] = (years[y] || 0) + 1; } });
  const defYear = +(Object.entries(years).sort((a, b) => b[1] - a[1])[0]?.[0] || new Date().getFullYear());
  return data.map((r, i) => {
    const notes = []; let d = parseDateValue(get(r, 'start'), defYear), e = null;
    const rawStart = String(get(r, 'start') ?? '').trim();
    if (!d && map.month != null) {   // "วันที่ = 15" + "เดือน = ธ.ค."
      const mi = monthIdx(String(get(r, 'month') ?? '')), day = parseInt(thDigits(rawStart), 10);
      if (mi >= 0 && day) { const s = mkDate(defYear, mi, day); if (s) { d = { start: s, end: s, notes: [`รวมจากคอลัมน์วันที่+เดือน ใช้ปี ${defYear + 543}`] }; } }
    }
    if (d) notes.push(...d.notes);
    if (map.end != null) { e = parseDateValue(get(r, 'end'), d ? +d.start.slice(0, 4) : defYear); if (e) notes.push(...e.notes); }
    const row = { i, include: true, name: String(get(r, 'name') ?? '').trim(), start: d?.start || '', end: e ? e.end : (d?.end || ''), venue: String(get(r, 'venue') ?? '').trim(), audience: String(get(r, 'audience') ?? '').trim(),
      ownerText: String(get(r, 'owner') ?? '').trim(), owner: matchOwner(get(r, 'owner')), status: (STATUS_SYN.find(([rx]) => rx.test(String(get(r, 'status') ?? ''))) || [0, 'planning'])[1],
      raw: rawStart instanceof Date ? iso(rawStart) : (get(r, 'start') instanceof Date ? iso(get(r, 'start')) : rawStart), pre: notes };
    return row;
  }).map((row, i, all) => {
    const r = validateRow(row);
    if (r.name && r.start && all.slice(0, i).some(o => hnorm(o.name) === hnorm(r.name) && o.start === r.start)) { r.issues.push(['warn', 'ซ้ำกับแถวก่อนหน้าในไฟล์']); if (r._dupInit == null) { r._dupInit = true; r.include = false; } }
    return r;
  });
}
function validateRow(r) {
  const is = []; r.pre.forEach(n => is.push(['info', n]));
  if (!r.name) is.push(['err', 'ไม่พบชื่องาน']);
  if (!r.start) is.push(['err', 'อ่านวันที่ไม่ได้ — เลือกวันที่เอง']);
  else {
    if (!r.end) r.end = r.start;
    if (r.end < r.start) { is.push(['warn', 'วันสิ้นสุดก่อนวันเริ่ม — ปรับให้เป็นวันเดียวกัน']); r.end = r.start; }
    const off = Math.abs(diffDays(today(), r.start)); if (off > 550) is.push(['warn', `วันที่ห่างจากวันนี้ ${Math.round(off / 365 * 10) / 10} ปี — ตรวจปี พ.ศ./ค.ศ.`]);
    if (diffDays(r.start, r.end) > 30) is.push(['warn', 'งานยาวกว่า 30 วัน — ตรวจวันสิ้นสุด']);
  }
  if (r.name && r.start && S().events.some(e => hnorm(e.name) === hnorm(r.name) && e.start === r.start)) { is.push(['warn', 'ซ้ำกับ Event ที่มีอยู่แล้ว']); if (r._dupInit == null) { r._dupInit = true; r.include = false; } }
  if (r.ownerText && !r.owner) is.push(['warn', `ไม่พบ “${r.ownerText}” ในทีม — จะใช้ชื่อคุณเป็นเจ้าของ`]);
  r.issues = is; if (is.some(x => x[0] === 'err')) r.include = false; return r;
}

/* ---------- UI ---------- */
function openImportEvents() {
  if (!canManageEvents()) return toast('คุณไม่มีสิทธิ์เพิ่ม Event', 'error');
  let wb = null, layout = null, map = {}, rows = [], mode = 'list', aiRows = null, busy = false;
  modal({
    title: 'นำเข้า Event จาก Excel', wide: true, cls: 'import-modal',
    body: `<div id="impStep1"><label class="dropzone" id="drop"><input type="file" id="impFile" accept=".xlsx,.xls,.xlsm,.csv" hidden>${ico('upload', 28)}<b>เลือกไฟล์ Excel หรือ CSV</b><span>ลากไฟล์มาวางได้ · รองรับ .xlsx .xls .csv · คอลัมน์จะเรียงแบบไหนก็ได้</span></label>
      <div class="note mt">${ico('sparkles', 14)} ระบบตรวจชื่อคอลัมน์และเนื้อหาในเซลล์เพื่อจับว่าคอลัมน์ไหนคือชื่องาน วันที่ สถานที่ ฯลฯ รองรับวันที่แบบ Excel, 15/12/2026, 15 ธ.ค. 69, 15-17 ธันวาคม 2569 และปี พ.ศ./ค.ศ. · ทำงานในเครื่องคุณ ไม่ส่งข้อมูลออกนอกระบบ · <b>กรุณาตรวจผลในตารางก่อนนำเข้าเสมอ</b><br>ถ้าไฟล์มีรูปแบบพิเศษ (เช่น ปฏิทินที่มีเดือนเป็นคอลัมน์) ระบบจะอ่านแบบปฏิทินให้ หรือกด “ให้ AI ช่วยอ่าน” เพื่อให้ AI สรุปให้ (ส่งข้อมูลชีตไปประมวลผลที่ Anthropic)</div></div>
      <div id="impStep2" hidden></div>`,
    actions: [{ label: 'ปิด' }, { label: 'นำเข้า', cls: 'btn-primary', onClick: () => doImport() }],
    onOpen(md) {
      const step2 = $('#impStep2', md.el), btn = $$('footer .btn', md.el).pop(); btn.id = 'impGo'; btn.hidden = true;
      const fin = $('#impFile', md.el), drop = $('#drop', md.el);
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
      fin.onchange = () => fin.files[0] && readFile(fin.files[0]);
      async function readFile(file) {
        try {
          await loadXlsx();
          const buf = await file.arrayBuffer();
          wb = XLSX.read(buf, { type: 'array', cellDates: true });
          useSheet(0, file.name);
        } catch (e) { toast('อ่านไฟล์ไม่ได้: ' + e.message, 'error'); }
      }
      function useSheet(idx, fname) {
        const ws = wb.Sheets[wb.SheetNames[idx]];
        const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
        if (grid.length < 2) return toast('ไม่พบข้อมูลในชีตนี้', 'error');
        layout = detectLayout(grid); map = { ...layout.map }; layout.fname = fname || layout.fname; layout.sheet = idx; layout.ws = ws;
        layout.mgrid = detectMonthGrid(grid); mode = layout.mgrid ? 'grid' : 'list'; aiRows = null;
        $('#impStep1', md.el).hidden = true; step2.hidden = false; $('#impGo', md.el).hidden = false; draw();
      }
      function reparse() { rows = mode === 'ai' && aiRows ? aiRows : mode === 'grid' && layout.mgrid ? buildGridRows(layout.mgrid) : buildRows(layout, map); }
      function summary() {
        const ok = rows.filter(r => r.include).length, err = rows.filter(r => r.issues.some(i => i[0] === 'err')).length, warn = rows.filter(r => r.issues.some(i => i[0] === 'warn') && !r.issues.some(i => i[0] === 'err')).length;
        $('#impSum', md.el).innerHTML = `<b>${rows.length}</b> แถว · <span class="ok">พร้อมนำเข้า ${ok}</span> · <span class="warnc">ควรตรวจ ${warn}</span> · <span class="late">ผิดพลาด ${err}</span>`;
        $('#impGo', md.el).innerHTML = `นำเข้า ${ok} รายการ`; $('#impGo', md.el).disabled = !ok;
      }
      function draw() {
        reparse();
        const colOpts = k => opt('', '— ไม่มี —', map[k] ?? '') + layout.cols.map(c => opt(c.c, c.h || `คอลัมน์ ${c.c + 1}`, map[k] ?? '')).join('');
        step2.innerHTML = `<div class="imp-head"><div><b>${esc(layout.fname || 'ไฟล์ที่เลือก')}</b>${wb.SheetNames.length > 1 ? ` · ชีต <select id="impSheet">${wb.SheetNames.map((n, i) => opt(i, n, layout.sheet)).join('')}</select>` : ''}</div><div class="imp-acts"><button class="btn btn-ghost btn-sm" id="impAi">${ico('sparkles', 14)} ${mode === 'ai' ? 'ให้ AI อ่านใหม่' : 'ให้ AI ช่วยอ่าน'}</button><button class="btn btn-ghost btn-sm" id="impAgain">เลือกไฟล์ใหม่</button></div></div>
        <div class="seg-ctl imp-mode">${[['list', 'อ่านแบบรายการ'], ...(layout.mgrid ? [['grid', 'อ่านแบบปฏิทินรายเดือน']] : []), ...(aiRows ? [['ai', 'ผลจาก AI']] : [])].map(([k, l]) => `<button type="button" class="${mode === k ? 'on' : ''}" data-mode="${k}">${l}</button>`).join('')}</div>
        ${mode === 'grid' ? `<div class="note">${ico('calendar', 14)} พบตารางที่มีเดือนเรียงเป็นคอลัมน์ (${layout.mgrid.mcols.length} เดือน) — อ่านวันที่จากช่องใต้แต่ละเดือน และใช้คอลัมน์ “${esc(layout.mgrid.header[layout.mgrid.nameCol] || 'แรก')}” เป็นชื่องาน</div>` : ''}
        ${mode === 'ai' ? `<div class="note">${ico('sparkles', 14)} AI อ่านทั้งชีตแล้วสรุปเป็นรายการด้านล่าง — <b>ตรวจชื่อและวันที่ก่อนนำเข้าเสมอ</b> แก้ไขในตารางได้เลย</div>` : ''}
        <div class="map-grid" ${mode === 'list' ? '' : 'hidden'}>${IMPORT_FIELDS.map(f => `<label class="field"><span>${f.label}${f.req ? ' *' : ''} ${map[f.k] != null ? `<em class="how ${layout.how[f.k] || 'manual'}">${layout.how[f.k] === 'header' ? 'ตรวจพบจากหัวคอลัมน์' : layout.how[f.k] === 'content' ? 'เดาจากเนื้อหา' : 'ตั้งเอง'}</em>` : ''}</span><select data-map="${f.k}">${colOpts(f.k)}</select></label>`).join('')}</div>
        <div id="impSum" class="imp-sum"></div>
        <div class="table-wrap imp-table"><table class="tbl"><thead><tr><th></th><th>ชื่องาน</th><th>วันเริ่ม</th><th>วันสิ้นสุด</th><th>สถานที่</th><th>เจ้าของงาน</th><th>ผลตรวจ</th></tr></thead><tbody id="impBody">${rows.map(rowHTML).join('')}</tbody></table></div>`;
        summary(); bind();
      }
      const dlabel = s => s ? `${TH_DOW[parse(s).getDay()]} ${fmtDY(s)}` : '';
      const issuesHTML = r => r.issues.length ? r.issues.map(([l, m]) => `<div class="iss ${l}">${l === 'err' ? '✕' : l === 'warn' ? '!' : 'i'} ${esc(m)}</div>`).join('') : '<span class="iss ok">✓ ตรวจแล้วปกติ</span>';
      const rowHTML = r => `<tr data-i="${r.i}" class="${r.issues.some(i => i[0] === 'err') ? 'row-err' : ''}"><td><input type="checkbox" class="i-inc" ${r.include ? 'checked' : ''} ${r.issues.some(i => i[0] === 'err') ? 'disabled' : ''} aria-label="เลือก"></td>
        <td><input class="i-name" value="${esc(r.name)}"></td>
        <td><input type="date" class="i-start" value="${r.start}"><small class="muted dl">${dlabel(r.start)}${r.raw ? ` · ต้นฉบับ: ${esc(String(r.raw))}` : ''}</small></td>
        <td><input type="date" class="i-end" value="${r.end}"><small class="muted dl">${r.end && r.end !== r.start ? dlabel(r.end) : ''}</small></td>
        <td><input class="i-venue" value="${esc(r.venue)}"></td>
        <td><select class="i-owner">${opt('', r.ownerText ? `(ไม่พบ: ${r.ownerText})` : '— ฉัน —', r.owner)}${S().members.map(m => opt(m.id, m.name, r.owner)).join('')}</select></td>
        <td class="iss-cell">${issuesHTML(r)}</td></tr>`;
      function bind() {
        $$('[data-mode]', md.el).forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(); });
        $('#impAi', md.el).onclick = () => readWithAi();
        $('#impAgain', md.el).onclick = () => { step2.hidden = true; $('#impStep1', md.el).hidden = false; $('#impGo', md.el).hidden = true; fin.value = ''; };
        const sh = $('#impSheet', md.el); if (sh) sh.onchange = () => useSheet(+sh.value, layout.fname);
        $$('[data-map]', md.el).forEach(s => s.onchange = () => { const k = s.dataset.map; if (s.value === '') delete map[k]; else map[k] = +s.value; layout.how[k] = 'manual'; draw(); });
        const body = $('#impBody', md.el);
        body.onchange = e => {
          const tr = e.target.closest('tr'), r = rows[+tr.dataset.i];
          r.name = $('.i-name', tr).value.trim(); r.start = $('.i-start', tr).value; r.end = $('.i-end', tr).value; r.venue = $('.i-venue', tr).value; r.owner = $('.i-owner', tr).value; r.pre = r.pre.filter(n => !/ใช้ปี|เดือน\/วัน|รวมจาก/.test(n));
          const wasErr = r.issues.some(i => i[0] === 'err'); r.include = e.target.classList.contains('i-inc') ? e.target.checked : (r.include || wasErr);
          validateRow(r); if (!r.issues.some(i => i[0] === 'err') && !e.target.classList.contains('i-inc')) r.include = true;
          tr.outerHTML = rowHTML(r); summary();   // rows[] is the live list for the current mode (list / grid / ai)
        };
      }
      async function readWithAi() {
        if (busy) return;
        if (Store.mode !== 'server') return toast('AI ใช้ได้เมื่อแอปเชื่อมกับเซิร์ฟเวอร์ (บน Vercel) เท่านั้น', 'error');
        const csv = XLSX.utils.sheet_to_csv(layout.ws, { blankrows: false }).replace(/,+$/gm, '');
        const b = $('#impAi', md.el); busy = true; b.disabled = true; b.innerHTML = `<span class="spin"></span> AI กำลังอ่าน… (อาจใช้ 10–40 วินาที)`;
        try {
          const r = await fetch('api/ai-events', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ text: csv, sheet: wb.SheetNames[layout.sheet], today: today() }) });
          const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) { }
          if (!r.ok) throw new Error(j.error || `AI อ่านไม่สำเร็จ (${r.status})`);
          if (!j.events?.length) throw new Error('AI ไม่พบรายการ Event ในชีตนี้');
          aiRows = aiToRows(j.events); mode = 'ai'; toast(`AI พบ ${aiRows.length} รายการ — ตรวจสอบก่อนนำเข้า`);
        } catch (e) { toast(e.message, 'error'); }
        busy = false; draw();
      }
      window.__impDo = () => rows.filter(r => r.include && !r.issues.some(i => i[0] === 'err'));
    },
  });
  function doImport() {
    const picked = window.__impDo ? window.__impDo() : [];
    if (!picked.length) { toast('ยังไม่ได้เลือกรายการที่จะนำเข้า', 'error'); return false; }
    picked.forEach(r => S().events.push({ id: uid('e_'), name: r.name, start: r.start, end: r.end || r.start, venue: r.venue, ownerId: r.owner || me().id, audience: r.audience, status: r.status, projectId: null, milestones: [] }));
    const first = picked.map(r => r.start).sort()[0]; if (first) { ST.cal.y = +first.slice(0, 4); ST.cal.m = +first.slice(5, 7) - 1; }
    commit(); toast(`นำเข้า ${picked.length} Event แล้ว`);
  }
}
ACT.importEvents = () => openImportEvents();
