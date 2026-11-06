'use strict';
/* ============================================================
   "Checklist Notes" poster layout — paper notes pinned on a soft background:
   numbered notes with tick bullets, one ruled note with a pin, a white
   "tip" note with a red label, a hand holding a pen, QR + closing line.
   Uses the same editor fields as the Infographic template.
   ============================================================ */
const PN_PAPER = { amber: '#FCE9A4', blue: '#CFE5F8', pink: '#F8D6DA', mint: '#CDEFE0', lavender: '#DCDAF8' };
const PN_ORDER = ['amber', 'blue', 'amber', 'mint'];
const pnColor = (sec, i) => PN_PAPER[sec.color] || PN_PAPER[PN_ORDER[i % 4]];

function paHandPen(g, x, y, sc, sleeve) {   // origin = pen tip; the pen runs up and to the right
  g.save(); g.translate(x, y); g.rotate(-.62); g.scale(sc, sc); g.lineCap = 'round';
  const skin = '#F1C9A5', sh = '#DDAE88';
  g.fillStyle = '#C8CCD6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(38, -9); g.lineTo(38, 9); g.closePath(); g.fill();   // nib
  paRR(g, 36, -11, 380, 22, 9, '#2B2F3A'); paRR(g, 36, -11, 60, 22, 9, '#444A5C');
  paRR(g, 300, -34, 260, 96, 18, sleeve);                                                                   // sleeve
  paRR(g, 214, -30, 150, 80, 34, skin);                                                                     // palm
  [[118, 6], [146, 4], [174, 0]].forEach(([fx, fy], i) => { paRR(g, fx, fy - 4, 34, 74 - i * 6, 17, i % 2 ? sh : skin); });   // fingers over the pen
  g.fillStyle = skin; g.beginPath(); g.ellipse(132, -28, 52, 17, -.42, 0, 6.3); g.fill();                   // thumb
  g.fillStyle = sh; g.beginPath(); g.ellipse(112, -38, 11, 9, -.4, 0, 6.3); g.fill();
  g.restore();
}

function pbDrawNotes(cv, st, fmtKey) {
  const fk = fmtKey || st.format, fm = PB_FORMATS[fk], W = fm[2], H = fm[3], B = pbBrand(), f = st.f, P = pbPalette(st, B, false);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), k = pbKit(g), u = Math.min(W, H) / 1080, land = W / H > 1.2, story = H / W > 1.6;
  g.textBaseline = 'alphabetic';
  const M = 62 * u, safeT = story ? 110 * u : 0, safeB = story ? 140 * u : 0, bw = W - 2 * M, top0 = M + safeT, bottom = H - M - safeB;
  if (P.dark) pbBackground(k, P, W, H, u); else { g.fillStyle = P.bg[0]; g.fillRect(0, 0, W, H); }
  const NAVY = B.colors.navy || '#0C0E45', INK = B.colors.ink || '#0E0E0E';
  const real = (st.secs || []).filter(x => x.title || x.body || x.tag), ghost = !real.length, secs = (ghost ? PA_GHOST : real).slice(0, 4), n = secs.length;
  const lh = (land ? 74 : 88) * u; pbLogos(k, P, B, W - M, top0, lh, true);

  /* centred headline, kept clear of the logo */
  const hw = bw - 2 * (lh * 2.2 + 20 * u);
  const head = (s, draw, y) => {
    const sz = (land ? 52 : story ? 66 : 58) * u * Math.min(Math.max(s, .74), 1.08), parts = String(f.headline || '').split('\n').map(t => t.trim()).filter(Boolean), dim = !parts.length, hl = parts.length ? parts : ['Headline'];
    const pre = hl.length >= 3 ? [hl[0]] : [], bar = hl.length >= 3 ? hl[1] : hl[0], post = hl.length >= 3 ? hl.slice(2) : hl.slice(1);
    let h = 0; g.save(); if (dim) g.globalAlpha = .45; k.font(700, sz, PB_HEAD);
    const plain = txt => { const Ls = k.wrap(txt, hw); Ls.forEach((l, i) => { if (draw) { k.font(700, sz, PB_HEAD); g.fillStyle = P.head; g.textAlign = 'center'; g.fillText(l, W / 2, y + h + i * sz * 1.25 + sz * .98); g.textAlign = 'left'; } }); h += Ls.length * sz * 1.25; };
    pre.forEach(plain);
    k.wrap(bar, hw - sz * .6).forEach(l => { if (draw) { k.font(700, sz, PB_HEAD); const lw = g.measureText(l).width + sz * .6; g.fillStyle = P.boxBg; g.fillRect(W / 2 - lw / 2, y + h, lw, sz * 1.34); g.fillStyle = P.boxInk; g.textAlign = 'center'; g.fillText(l, W / 2, y + h + sz * 1.0); g.textAlign = 'left'; } h += sz * 1.34 + sz * .06; });
    if (post.length) { h += sz * .06; plain(post.join(' ')); }
    g.restore(); return h;
  };

  /* bottom: QR + closing line */
  const qr = st.qrImg ? null : pbQr(safeUrl(st.qrUrl) || st.qrUrl.trim()), qrIm = pbImg(st.qrImg), hasQr = !!(qr || qrIm), stmt = String(f.sub || '').trim();
  const tail = (s, draw, y) => {
    const q = hasQr ? Math.max(110, 140 * Math.max(s, .75)) * u : 0, tw = bw - (q ? q + 24 * u : 0) - 60 * u, ss = Math.max(s, .75);
    const stH = stmt ? pbText(k, stmt, { w: tw, size: 22 * u * ss, weight: 600, lh: 1.4 }) : 0, mainH = Math.max(stH, q);
    const fine = [f.note, B.footer].filter(Boolean).join('\n'), fH = fine ? pbText(k, fine, { w: bw, size: 18 * u, weight: 500, lh: 1.4, color: P.mute }) : 0, h = mainH + (fine ? 12 * u + fH : 0);
    if (draw) {
      let x = M;
      if (hasQr) {
        const pd = 8 * u; g.fillStyle = '#FFFFFF'; k.rr(x, y + (mainH - q) / 2, q, q, 10 * u); g.fill();
        const qy = y + (mainH - q) / 2;
        if (qrIm) { const s2 = Math.min((q - 2 * pd) / qrIm.width, (q - 2 * pd) / qrIm.height); g.drawImage(qrIm, x + (q - qrIm.width * s2) / 2, qy + (q - qrIm.height * s2) / 2, qrIm.width * s2, qrIm.height * s2); }
        else { const cell = (q - 2 * pd) / qr.n; g.fillStyle = '#000'; for (let r = 0; r < qr.n; r++) for (let c = 0; c < qr.n; c++) if (qr.dark(r, c)) g.fillRect(x + pd + c * cell, qy + pd + r * cell, cell + .5, cell + .5); }
        x += q + 24 * u;
      }
      if (stmt) pbText(k, stmt, { x, y: y + (mainH - stH) / 2, w: tw, size: 22 * u * ss, weight: 600, lh: 1.4, color: P.dark ? '#FFFFFF' : NAVY, draw: 1 });
      if (fine) pbText(k, fine, { x: M, y: y + mainH + 12 * u, w: bw, size: 18 * u, weight: 500, lh: 1.4, color: P.mute, draw: 1 });
    }
    return h;
  };

  /* notes */
  const gap = 34 * u, cols = land ? Math.min(n + (f.cta ? 1 : 0), 4) : 2, colW = (bw - gap * (cols - 1)) / cols;
  const tipL = String(f.cta || '').split('\n').map(t => t.trim()).filter(Boolean);
  const noteM = (sec, s, w) => {
    const pad = 26 * u * s, tw = w - pad * 2, items = String(sec.body || '').split(/\n+/).map(t => t.trim()).filter(Boolean);
    const tH = sec.title ? pbText(k, sec.title, { w: tw - 40 * u * s, size: 31 * u * s, weight: 700, lh: 1.28 }) : 0;
    const is = items.map(t => pbText(k, t, { w: tw - 40 * u * s, size: 24 * u * s, weight: 500, lh: 1.36 }) + 10 * u * s);
    return { pad, tw, items, tH, is, h: pad + 44 * u * s + tH + (tH ? 10 * u * s : 0) + is.reduce((a, b) => a + b, 0) + pad * .6 };
  };
  const tipM = (s, w) => { const pad = 24 * u * s; if (!tipL.length) return { h: 0 }; const body = tipL.length > 1 ? tipL.slice(1).join('\n') : tipL[0]; const th = pbText(k, body, { w: w - pad * 2, size: 24 * u * s, weight: 600, lh: 1.36 }); return { pad, body, h: (tipL.length > 1 ? 44 * u * s : 0) + th + pad * 2 + 8 * u }; };
  const handH = land ? 0 : 150 * u;
  const plan = s => {
    const hh = head(s, false, 0), th = tail(s, false, 0), y0 = top0 + Math.max(hh, lh) + 34 * u, y1 = bottom - (th ? th + 34 * u : 0);
    const ms = secs.map(x => noteM(x, s, colW)), tm = tipM(s, colW);
    let colsH;
    if (land) colsH = ms.map(m => m.h).concat(tm.h ? [tm.h] : []);
    else { const L = [], R = []; ms.forEach((m, i) => (i % 2 === 0 ? L : R).push(m.h)); if (tm.h) (R.length <= L.length ? R : L).push(tm.h); const sum = a => a.reduce((x, y2) => x + y2, 0) + gap * Math.max(0, a.length - 1); colsH = [sum(L), sum(R) + handH]; }
    return { ok: Math.max(...colsH) <= y1 - y0, hh, th, y0, y1, ms, tm };
  };
  let S = 1.25, L = plan(S); for (; S >= .45; S -= .025) { L = plan(S); if (L.ok) break; }
  const over = !L.ok;

  /* draw */
  head(S, true, top0);
  const papers = [-1.3, .9, .6, -.8, 1.1];
  const drawNote = (m, i, x, y, w, ruled) => {
    const sec = m.sec || secs[i], col = pnColor(sec, i), h = m.h;
    g.save(); if (ghost) g.globalAlpha = .6; g.translate(x + w / 2, y + h / 2); g.rotate(papers[i % 5] * Math.PI / 180); g.translate(-w / 2, -h / 2);
    k.shadow(true, 22 * u, 8 * u, .16); g.fillStyle = col; g.fillRect(0, 0, w, h); k.shadow(false);
    if (ruled) { g.strokeStyle = 'rgba(70,90,150,.16)'; g.lineWidth = 1.6 * u; for (let yy = 70 * u * S; yy < h - 10 * u; yy += 30 * u * S) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); } for (let c = 0; c < 8; c++) paCircle(g, w * (.1 + c * .115), 10 * u, 6 * u, '#FFFFFF'); }
    const pad = m.pad; let ty = pad + 4 * u;
    g.fillStyle = NAVY; g.beginPath(); g.arc(w / 2, ty + 16 * u * S, 17 * u * S, 0, 6.3); g.fill(); k.font(700, 22 * u * S, PB_BODY); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText(String(i + 1), w / 2, ty + 24 * u * S); g.textAlign = 'left'; ty += 44 * u * S;
    if (sec.title) { paCircle(g, pad + 14 * u * S, ty + 15 * u * S, 14 * u * S, '#3DBA6B'); g.strokeStyle = '#FFFFFF'; g.lineWidth = 3 * u * S; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pad + 7 * u * S, ty + 15 * u * S); g.lineTo(pad + 12 * u * S, ty + 20 * u * S); g.lineTo(pad + 21 * u * S, ty + 10 * u * S); g.stroke(); ty += pbText(k, sec.title, { x: pad + 40 * u * S, y: ty, w: m.tw - 40 * u * S, size: 31 * u * S, weight: 700, lh: 1.28, color: NAVY, draw: 1 }) + 10 * u * S; }
    m.items.forEach((t, j) => { g.strokeStyle = hexA(NAVY, .55); g.lineWidth = 2.4 * u * S; g.beginPath(); g.arc(pad + 12 * u * S, ty + 13 * u * S, 8 * u * S, 0, 6.3); g.stroke(); pbText(k, t, { x: pad + 40 * u * S, y: ty, w: m.tw - 40 * u * S, size: 24 * u * S, weight: 500, lh: 1.36, color: hexA(INK, .9), draw: 1 }); ty += m.is[j]; });
    if (i === 0 || i === 3) { g.fillStyle = 'rgba(150,170,230,.7)'; g.save(); g.translate(26 * u, 4 * u); g.rotate(-.5); g.fillRect(-46 * u, -14 * u, 92 * u, 28 * u); g.restore(); }   // tape
    if (i === 2 || ruled) { paCircle(g, 40 * u, 24 * u, 15 * u, '#2F4FB0'); paCircle(g, 35 * u, 19 * u, 5 * u, 'rgba(255,255,255,.7)'); }                  // pin
    g.restore();
  };
  const drawTip = (tm, x, y, w) => {
    const h = tm.h; g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(-2.4 * Math.PI / 180); g.translate(-w / 2, -h / 2);
    k.shadow(true, 20 * u, 8 * u, .18); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); k.shadow(false);
    let ty = tm.pad;
    if (tipL.length > 1) { const lab = tipL[0]; k.font(700, 30 * u * S, PB_THAI); const lw = Math.min(g.measureText(lab).width + 44 * u, w - 20 * u); g.fillStyle = '#E8332E'; g.fillRect(w / 2 - lw / 2, -4 * u, lw, 44 * u * S + 6 * u); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText(k.wrap(lab, lw)[0], w / 2, 32 * u * S + 4 * u); g.textAlign = 'left'; ty = 48 * u * S + tm.pad * .7; }
    pbText(k, tm.body, { x: tm.pad, y: ty, w: w - tm.pad * 2, size: 24 * u * S, weight: 600, lh: 1.36, color: hexA(INK, .88), draw: 1 }); g.restore();
  };
  const free = Math.max(0, L.y1 - L.y0 - Math.max(...(land ? L.ms.map(m => m.h).concat(L.tm.h || 0) : [0]))) * (land ? .4 : 0);
  if (land) { let xx = M; L.ms.forEach((m, i) => { drawNote(m, i, xx, L.y0 + free, colW, i === 2); xx += colW + gap; }); if (L.tm.h) drawTip(L.tm, xx, L.y0 + free, colW); }
  else {
    const left = [], right = []; L.ms.forEach((m, i) => (i % 2 === 0 ? left : right).push([m, i])); const tipLeft = right.length > left.length;
    let yl = L.y0, yr = L.y0 + handH;
    left.forEach(([m, i]) => { drawNote(m, i, M, yl, colW, i === 2); yl += m.h + gap; });
    right.forEach(([m, i]) => { drawNote(m, i, M + colW + gap, yr, colW, i === 2); yr += m.h + gap; });
    if (L.tm.h) { if (tipLeft) drawTip(L.tm, M, yl, colW); else drawTip(L.tm, M + colW + gap, yr, colW); }
    paHandPen(g, W - M - 250 * u, L.y0 + handH - 6 * u, .66 * u * Math.max(.8, Math.min(S, 1.1)), '#F2A0AB');
  }
  const th = tail(S, false, 0); if (th) tail(S, true, bottom - th);
  return { scale: S, overflow: over, dense: S < .62, scene: 'notes' };
}
