'use strict';
/* ============================================================
   Event Calendar summary — one landscape 16:9 page (1920×1080)
   drawn on a canvas, for executives and the sales team.
   Download as PNG, or print / save as PDF.
   ============================================================ */
const EXP_FONT = '"IBM Plex Sans Thai", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const EXP_COL = { planning: '#ff9500', confirmed: '#007aff', done: '#34c759' };
const EXP_MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function expEvents(year) {
  const y = String(year);
  return S().events
    .filter(e => e.status !== 'cancelled' && (e.start.startsWith(y) || e.end.startsWith(y) || (e.start.slice(0, 4) < y && e.end.slice(0, 4) > y)))
    .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
}
const expVersion = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`; };

function drawCalendarSummary(cv, year) {
  const W = 1920, H = 1080, S2 = 2;
  cv.width = W * S2; cv.height = H * S2;
  const g = cv.getContext('2d'); g.setTransform(S2, 0, 0, S2, 0, 0);
  const font = (w, px) => `${w} ${px}px ${EXP_FONT}`;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  const fit = (t, max) => { if (g.measureText(t).width <= max) return t; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };

  // background: soft colour fields like the app
  g.fillStyle = '#f5f6fb'; g.fillRect(0, 0, W, H);
  [[160, -80, 760, 'rgba(0,122,255,.16)'], [1780, 60, 700, 'rgba(175,82,222,.13)'], [1500, 1160, 820, 'rgba(52,199,89,.12)']].forEach(([x, y, r, c]) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  });

  const evs = expEvents(year), by = Array.from({ length: 12 }, () => []);
  evs.forEach(e => { const s = e.start.slice(0, 4) < String(year) ? `${year}-01-01` : e.start; by[+s.slice(5, 7) - 1].push(e); });
  const cnt = k => evs.filter(e => e.status === k).length;

  // header
  const X = 72;
  g.fillStyle = '#007aff'; g.font = font(700, 20); g.fillText('AGENCY EXPERIENCE TEAM', X, 92);
  g.fillStyle = '#1c1c1e'; g.font = font(700, 72); g.fillText(`Event Calendar ${year}`, X - 3, 170);
  const tw = g.measureText(`Event Calendar ${year}`).width;
  g.fillStyle = '#8e8e93'; g.font = font(500, 26); g.fillText(`พ.ศ. ${year + 543}`, X + tw + 22, 168);
  g.font = font(500, 22); g.fillStyle = '#636366';
  g.fillText(`ปฏิทินงานสำคัญประจำปี · ${evs.length} งาน`, X, 212);

  // version + stats (right)
  const R = W - 72;
  g.textAlign = 'right';
  g.font = font(600, 20); g.fillStyle = '#636366'; g.fillText(`Version ${expVersion()}`, R, 92);
  const stats = [['จัดแล้ว', cnt('done'), EXP_COL.done], ['วางแผน', cnt('planning'), EXP_COL.planning], ['ยืนยันแล้ว', cnt('confirmed'), EXP_COL.confirmed]];   // drawn right → left, so it reads ยืนยันแล้ว · วางแผน · จัดแล้ว
  let sx = R;
  stats.forEach(([l, n, c]) => {
    g.font = font(700, 44); const nw = g.measureText(String(n)).width; g.font = font(500, 18); const lw = g.measureText(l).width;
    const bw = Math.max(nw, lw) + 44, bx = sx - bw;
    g.fillStyle = 'rgba(255,255,255,.85)'; rr(bx, 118, bw, 96, 20); g.fill();
    g.textAlign = 'center'; g.fillStyle = c; g.font = font(700, 44); g.fillText(String(n), bx + bw / 2, 172);
    g.fillStyle = '#636366'; g.font = font(500, 18); g.fillText(l, bx + bw / 2, 200);
    sx = bx - 14;
  });
  g.textAlign = 'left';

  // month grid: 6 × 2
  const top = 250, gap = 18, cols = 6, cw = (W - 2 * X - gap * (cols - 1)) / cols, ch = (H - top - 92 - gap) / 2;
  const now = new Date(), curY = now.getFullYear(), curM = now.getMonth();
  by.forEach((list, m) => {
    const cx = X + (m % cols) * (cw + gap), cy = top + Math.floor(m / cols) * (ch + gap), isNow = year === curY && m === curM;
    g.save(); g.shadowColor = 'rgba(0,0,0,.07)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
    g.fillStyle = '#ffffff'; rr(cx, cy, cw, ch, 24); g.fill(); g.restore();
    if (isNow) { g.strokeStyle = '#007aff'; g.lineWidth = 3; rr(cx + 1.5, cy + 1.5, cw - 3, ch - 3, 23); g.stroke(); }
    // month header
    g.fillStyle = list.length ? '#1c1c1e' : '#aeaeb2'; g.font = font(700, 30); g.fillText(TH_MON_FULL[m], cx + 22, cy + 50);
    g.fillStyle = '#aeaeb2'; g.font = font(600, 15); g.fillText(EXP_MON_EN[m], cx + 24, cy + 74);
    if (list.length) {
      g.font = font(700, 18); const t = String(list.length), bw = Math.max(34, g.measureText(t).width + 20);
      g.fillStyle = isNow ? '#007aff' : '#f2f2f7'; rr(cx + cw - 22 - bw, cy + 26, bw, 32, 16); g.fill();
      g.fillStyle = isNow ? '#fff' : '#1c1c1e'; g.textAlign = 'center'; g.fillText(t, cx + cw - 22 - bw / 2, cy + 48); g.textAlign = 'left';
    }
    g.strokeStyle = '#ececf1'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + 22, cy + 92); g.lineTo(cx + cw - 22, cy + 92); g.stroke();
    // events — names wrap to 2 lines when the month has room
    const wrap = (t, max, lines) => {   // word-aware wrap (Intl.Segmenter knows Thai word breaks)
      const segs = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(t)].map(x => x.segment) : t.split(/(\s+)/);
      const out = []; let cur = '', i = 0;
      for (; i < segs.length; i++) {
        const seg = segs[i];
        if (g.measureText(cur + seg).width <= max) { cur += seg; continue; }
        if (!cur.trim()) { cur = fit(seg, max); continue; }   // one very long word
        out.push(cur.trim()); cur = seg.trimStart(); if (out.length === lines) break;
      }
      if (out.length < lines && cur.trim()) { out.push(cur.trim()); i = segs.length; }
      if (i < segs.length) out[lines - 1] = fit(out[lines - 1] + '…', max);
      return out;
    };
    const avail = ch - 112, few = list.length <= 4, busy = list.length > 6, nameFont = few ? 18 : busy ? 15 : 16, nameLH = few ? 23 : 20;
    if (!list.length) { g.fillStyle = '#c7c7cc'; g.font = font(500, 18); g.fillText('— ไม่มีงาน —', cx + 22, cy + 132); }
    let ly = cy + 108, shown = 0;
    for (const e of list) {
      const sd = parse(e.start), ed = parse(e.end);
      const day = e.start === e.end ? `${sd.getDate()}` : (sd.getMonth() === ed.getMonth() ? `${sd.getDate()}–${ed.getDate()}` : `${sd.getDate()}–${ed.getDate()} ${TH_MON[ed.getMonth()]}`);
      g.font = font(700, 15); const dw = Math.max(44, g.measureText(day).width + 16), tw2 = cw - dw - 54;
      g.font = font(600, nameFont); const lines = wrap(e.name, tw2, few ? 2 : 1);
      const hasVenue = few && e.venue, h = Math.max(30, lines.length * nameLH + (hasVenue ? 18 : 0)) + (few ? 16 : busy ? 4 : 10);
      const left = list.length - shown;
      if (ly + h > cy + 108 + avail - (left > 1 ? 30 : 0)) break;
      const c = EXP_COL[e.status] || '#8e8e93';
      g.fillStyle = c + '1f'; rr(cx + 20, ly, dw, 28, 9); g.fill();
      g.font = font(700, 15); g.fillStyle = c; g.textAlign = 'center'; g.fillText(day, cx + 20 + dw / 2, ly + 19.5); g.textAlign = 'left';
      g.fillStyle = '#1c1c1e'; g.font = font(600, nameFont); lines.forEach((t, k) => g.fillText(t, cx + 30 + dw, ly + 20 + k * nameLH));
      if (hasVenue) { g.fillStyle = '#8e8e93'; g.font = font(500, 13); g.fillText(fit(e.venue, tw2), cx + 30 + dw, ly + 20 + lines.length * nameLH - 2); }
      ly += h; shown++;
    }
    if (shown < list.length) { g.fillStyle = '#007aff'; g.font = font(600, 16); g.fillText(`+ อีก ${list.length - shown} งาน`, cx + 22, ly + 18); }
  });

  // footer legend
  const fy = H - 44; let lx = X;
  g.font = font(500, 17);
  [['ยืนยันแล้ว', EXP_COL.confirmed], ['วางแผน', EXP_COL.planning], ['จัดแล้ว', EXP_COL.done]].forEach(([l, c]) => {
    g.fillStyle = c; rr(lx, fy - 14, 18, 18, 6); g.fill(); g.fillStyle = '#636366'; g.fillText(l, lx + 26, fy); lx += g.measureText(l).width + 60;
  });
  g.textAlign = 'right'; g.fillStyle = '#aeaeb2'; g.fillText(`TEAM Hub · Agency Experience · อัปเดตล่าสุด ${expVersion()}`, R, fy); g.textAlign = 'left';
  return evs.length;
}

async function openCalExport() {
  let year = ST.cal.y || new Date().getFullYear();
  try { await Promise.all([document.fonts.load(`700 72px ${EXP_FONT}`), document.fonts.load(`500 18px ${EXP_FONT}`), document.fonts.load(`600 18px ${EXP_FONT}`)]); } catch (e) { }
  const years = [...new Set([year - 1, year, year + 1, ...S().events.map(e => +e.start.slice(0, 4))])].sort();
  modal({
    title: 'Export ปฏิทิน', wide: true, cls: 'exp-modal',
    body: `<div class="exp-bar"><label class="field"><span>ปี</span><select id="expYear">${years.map(y => opt(y, `${y} (พ.ศ. ${y + 543})`, year)).join('')}</select></label>
        <p class="muted small">สรุปหน้าเดียวแนวนอน 16:9 สำหรับส่งผู้บริหารและฝ่ายขาย · ไม่รวมงานที่ยกเลิก · Version = วันที่ Export</p></div>
      <div class="exp-pv"><canvas id="expCv" aria-label="ตัวอย่างสรุปปฏิทิน"></canvas></div>`,
    actions: [
      { label: `${ico('download', 15)} Excel (ข้อมูลดิบ)`, cls: 'btn-ghost', left: true, onClick: () => { ACT.exportCal(); return false; } },
      { label: `${ico('print', 15)} พิมพ์ / PDF`, cls: 'btn-ghost', onClick: () => { printCanvas($('#expCv'), year); return false; } },
      { label: `${ico('image', 15)} ดาวน์โหลดรูป (PNG)`, cls: 'btn-primary', onClick: () => { downloadCanvas($('#expCv'), year); return false; } },
    ],
    onOpen(md) {
      const cv = $('#expCv', md.el), paint = () => { const n = drawCalendarSummary(cv, year); if (!n) toast(`ปี ${year} ยังไม่มี Event`, 'error'); };
      paint();
      $('#expYear', md.el).onchange = e => { year = +e.target.value; paint(); };
    },
  });
}
function downloadCanvas(cv, year) {
  cv.toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `Event-Calendar-${year}_v${expVersion().replace(/\//g, '-')}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('ดาวน์โหลดรูปแล้ว');
  }, 'image/png');
}
function printCanvas(cv, year) {
  const w = window.open('', '_blank'); if (!w) return toast('เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาต Pop-up แล้วลองอีกครั้ง', 'error');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Event Calendar ${year}</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%;background:#fff}img{width:100%;height:100%;object-fit:contain;display:block}</style></head><body><img src="${cv.toDataURL('image/png')}" alt="Event Calendar ${year}" onload="setTimeout(function(){window.focus();window.print()},150)"></body></html>`);
  w.document.close();
}
ACT.calExport = () => openCalExport();
