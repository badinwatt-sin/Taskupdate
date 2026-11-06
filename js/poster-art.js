'use strict';
/* ============================================================
   Flat-illustration library for the Infographic poster templates.
   Everything is drawn on canvas (no image files): friendly half-body
   people, props and soft room backdrops in pastel colours.
   Units: a person is ~112 high, origin = bottom centre (waist crop line).
   ============================================================ */
const PA_SKIN = ['#F6D2B5', '#EBBB95', '#D39A70', '#A8734D', '#7A4B31'];
const PA_HAIR = ['#1F1A1A', '#3A241B', '#5A3A27', '#8A5A33', '#C07A35', '#D9B26A', '#6B6B72'];
const paP = d => new Path2D(d);
const paCircle = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
const paRR = (g, x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };

/* ---------- person ---------- */
const PA_POSES = {   // arm polylines from the shoulder; hands are drawn at the last point
  rest: { L: [[-31, -50], [-39, -28], [-35, 4]], R: [[31, -50], [39, -28], [35, 4]] },
  holdR: { L: [[-31, -50], [-39, -28], [-35, 4]], R: [[31, -50], [48, -34], [51, -56]] },
  holdL: { L: [[-31, -50], [-48, -34], [-51, -56]], R: [[31, -50], [39, -28], [35, 4]] },
  clip: { L: [[-31, -50], [-41, -28], [-17, -21]], R: [[31, -50], [41, -28], [17, -21]] },
  chest: { L: [[-31, -50], [-38, -30], [-10, -33]], R: [[31, -50], [38, -30], [10, -33]] },
  wave: { L: [[-31, -50], [-39, -28], [-35, 4]], R: [[31, -50], [53, -60], [52, -86]] },
  cheer: { L: [[-31, -50], [-50, -66], [-47, -94]], R: [[31, -50], [50, -66], [47, -94]] },
  point: { L: [[-31, -50], [-39, -28], [-35, 4]], R: [[31, -50], [52, -46], [70, -62]] },
};
function paPerson(g, o) {
  const skin = o.skin || PA_SKIN[1], sh = pbMix(skin, '#8A4B2A', .25), hair = o.hair || PA_HAIR[0], top = o.top || '#00008F', st = o.style || 'long';
  const pose = PA_POSES[o.pose || 'rest'], ex = o.extra || '', sleeve = o.sleeve || (ex === 'coat' ? '#FFFFFF' : top);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  // back hair
  g.fillStyle = hair;
  if (st === 'long') g.fill(paP('M-18,-92 C-28,-78 -28,-56 -34,-34 C-31,-26 -22,-28 -20,-34 L20,-34 C22,-28 31,-26 34,-34 C28,-56 28,-78 18,-92 Z'));
  else if (st === 'bob') g.fill(paP('M-19,-92 C-25,-78 -24,-68 -20,-60 L20,-60 C24,-68 25,-78 19,-92 Z'));
  else if (st === 'pony') g.fill(paP('M12,-98 C36,-104 40,-76 30,-58 C32,-74 27,-86 12,-88 Z'));
  else if (st === 'bun') { g.beginPath(); g.arc(0, -113, 8.5, 0, 6.3); g.fill(); }
  // torso
  const bodyC = ex === 'coat' ? '#FFFFFF' : ex === 'gown' ? '#CBE0F4' : top;
  g.fillStyle = bodyC; g.fill(paP('M-37,4 L-37,-40 C-37,-55 -27,-59 -14,-61 L14,-61 C27,-59 37,-55 37,-40 L37,4 Z'));
  g.fillStyle = pbMix(bodyC, '#000000', .06); g.fill(paP('M-37,4 L-37,-40 C-37,-48 -34,-53 -30,-56 L-26,-56 C-30,-40 -30,-20 -29,4 Z'));
  // neck
  g.fillStyle = sh; g.fillRect(-6.2, -74, 12.4, 17);
  // neckline & outfit details
  if (ex === 'coat') {
    g.fillStyle = o.inner || top; g.fill(paP('M-11,-61 L11,-61 L0,-34 Z'));
    g.fillStyle = skin; g.fill(paP('M-7,-61 L7,-61 L0,-48 Z'));
    g.strokeStyle = '#D5DCEB'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-11, -61); g.lineTo(-3, -30); g.moveTo(11, -61); g.lineTo(3, -30); g.moveTo(0, -30); g.lineTo(0, 4); g.stroke();
    g.strokeStyle = '#3B4670'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, -62); g.bezierCurveTo(-13, -34, -2, -22, 3, -28); g.moveTo(9, -62); g.bezierCurveTo(13, -34, 6, -26, 3, -28); g.stroke(); paCircle(g, 3, -27, 3.4, '#3B4670');
  } else if (ex === 'blazer') {
    g.fillStyle = '#FFFFFF'; g.fill(paP('M-10,-61 L10,-61 L0,-30 Z')); g.fillStyle = skin; g.fill(paP('M-6.5,-61 L6.5,-61 L0,-50 Z'));
    g.fillStyle = pbMix(top, '#000000', .18); g.fill(paP('M-12,-61 L-4,-34 L-14,-22 L-24,-52 Z')); g.fill(paP('M12,-61 L4,-34 L14,-22 L24,-52 Z'));
  } else if (ex === 'scrubs') {
    g.fillStyle = skin; g.fill(paP('M-9,-61 L9,-61 L0,-43 Z')); g.fillStyle = pbMix(top, '#FFFFFF', .25); g.fill(paP('M-9,-61 L-4,-61 L0,-50 L-4,-43 Z')); g.fill(paP('M9,-61 L4,-61 L0,-50 L4,-43 Z'));
    g.fillStyle = pbMix(top, '#000000', .15); g.fillRect(-24, -26, 14, 11);
  } else if (ex === 'gown') {
    g.fillStyle = skin; g.fill(paP('M-9,-61 L9,-61 L0,-45 Z'));
    g.fillStyle = '#9CC2E8'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(-26 + (i % 5) * 13, -36 + Math.floor(i / 5) * 18, 1.8, 0, 6.3); g.fill(); }
  } else if (ex === 'collar') {
    g.fillStyle = skin; g.fill(paP('M-8,-61 L8,-61 L0,-47 Z')); g.fillStyle = '#FFFFFF'; g.fill(paP('M-9,-61 L-2,-61 L-3,-52 Z')); g.fill(paP('M9,-61 L2,-61 L3,-52 Z'));
  } else { g.fillStyle = skin; g.beginPath(); g.ellipse(0, -61, 10, 8, 0, 0, Math.PI); g.fill(); }
  // arms
  const arm = pts => {
    g.strokeStyle = skin; g.lineWidth = 9.5; g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach(p => g.lineTo(...p)); g.stroke();
    const long = o.longSleeve || ex === 'coat'; g.strokeStyle = sleeve; g.lineWidth = 13.5; g.beginPath(); g.moveTo(...pts[0]); (long ? pts.slice(1) : [pts[1]]).forEach(p => g.lineTo(...p)); g.stroke();
  };
  arm(pose.L); arm(pose.R);
  if (o.prop) o.prop(g, pose);
  const hand = p => paCircle(g, p[0], p[1], 5.6, skin);
  if (!o.hideHands) { hand(pose.L[pose.L.length - 1]); hand(pose.R[pose.R.length - 1]); }
  // head
  g.fillStyle = skin; g.beginPath(); g.ellipse(-15.4, -86, 3.3, 4.4, 0, 0, 6.3); g.ellipse(15.4, -86, 3.3, 4.4, 0, 0, 6.3); g.fill();
  g.beginPath(); g.ellipse(0, -88, 15.5, 18.5, 0, 0, 6.3); g.fill();
  g.fillStyle = sh; g.beginPath(); g.ellipse(0, -71, 9, 3.2, 0, 0, Math.PI); g.fill();   // chin shadow
  paCircle(g, -9, -82, 3.2, 'rgba(235,110,110,.22)'); paCircle(g, 9, -82, 3.2, 'rgba(235,110,110,.22)');
  g.fillStyle = '#2A2220'; g.beginPath(); g.ellipse(-6.2, -87.5, 1.55, 2.1, 0, 0, 6.3); g.ellipse(6.2, -87.5, 1.55, 2.1, 0, 0, 6.3); g.fill();
  g.strokeStyle = pbMix(hair, '#000000', .1); g.lineWidth = 1.3; g.beginPath(); g.moveTo(-9.4, -93); g.quadraticCurveTo(-6.2, -95, -3.2, -93.4); g.moveTo(3.2, -93.4); g.quadraticCurveTo(6.2, -95, 9.4, -93); g.stroke();
  g.strokeStyle = sh; g.lineWidth = 1.1; g.beginPath(); g.moveTo(0, -88); g.quadraticCurveTo(2.6, -83, -0.4, -81.6); g.stroke();
  g.strokeStyle = pbMix(skin, '#B8342E', .6); g.lineWidth = 1.7; g.beginPath(); g.moveTo(-4.6, -77.5); g.quadraticCurveTo(0, -73.6, 4.6, -77.5); g.stroke();
  if (o.glasses) { g.strokeStyle = '#2A2F5C'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(-6.2, -87.5, 4.6, 4, 0, 0, 6.3); g.moveTo(1.4, -87.5); g.ellipse(6.2, -87.5, 4.6, 4, 0, 0, 6.3); g.moveTo(-1.6, -88); g.lineTo(1.6, -88); g.stroke(); }
  // front hair / headwear
  g.fillStyle = hair;
  if (st === 'long' || st === 'bob' || st === 'pony' || st === 'bun') g.fill(paP('M-16.8,-84 C-19,-104 -8,-111 2,-110 C13,-109 19,-100 16.8,-84 C15,-93 10,-98 3,-99.5 C-6,-97 -12,-92 -16.8,-84 Z'));
  else if (st === 'short') g.fill(paP('M-16.4,-86 C-19,-105 -4,-112 5,-109.5 C15,-107 19,-98 16.4,-86 C15.5,-93 13,-97 6,-98.5 C0,-96 -9,-96 -14,-93 Z'));
  else if (st === 'crop') g.fill(paP('M-16,-88 C-18,-103 -5,-108 4,-107 C14,-106 18,-98 16,-88 C13,-95 6,-98 -1,-98 C-8,-97 -13,-93 -16,-88 Z'));
  if (ex === 'scrubs' || o.cap) {   // surgical cap
    const cc = o.cap || pbMix(top, '#FFFFFF', .1); g.fillStyle = cc; g.fill(paP('M-17.5,-86 C-19,-110 19,-110 17.5,-86 C14,-96 -14,-96 -17.5,-86 Z')); g.fillStyle = pbMix(cc, '#000000', .12); g.fillRect(-17, -92, 34, 3.2);
  }
  g.restore();
}

/* ---------- props (person-local units) ---------- */
function paBag(g, x, by) {
  g.fillStyle = '#FFFFFF'; g.fill(paP(`M${x - 14},${by} L${x - 14},${by - 30} L${x + 14},${by - 30} L${x + 14},${by} Z`)); g.fillStyle = '#E6EAF4'; g.fillRect(x + 6, by - 30, 8, 30);
  g.fillStyle = '#F4F6FB'; g.fill(paP(`M${x - 14},${by - 30} L${x - 9},${by - 36} L${x + 9},${by - 36} L${x + 14},${by - 30} Z`));
  g.fillStyle = '#E5484D'; g.fillRect(x - 7.5, by - 17.5, 15, 5); g.fillRect(x - 2.5, by - 22.5, 5, 15);
}
function paClip(g, x, y, w = 34, h = 44) {
  paRR(g, x - w / 2, y - h / 2, w, h, 3, '#B9814D'); paRR(g, x - w / 2 + 3, y - h / 2 + 5, w - 6, h - 8, 1.5, '#FFFFFF'); paRR(g, x - 7, y - h / 2 - 2, 14, 7, 2, '#8C97AD');
  for (let i = 0; i < 3; i++) { const yy = y - h / 2 + 15 + i * 9.5; g.strokeStyle = '#3DBA6B'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x - w / 2 + 6, yy); g.lineTo(x - w / 2 + 8, yy + 2.2); g.lineTo(x - w / 2 + 11.5, yy - 2.4); g.stroke(); g.strokeStyle = '#C5CCDC'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w / 2 + 15, yy); g.lineTo(x + w / 2 - 6, yy); g.stroke(); }
}
function paPhone(g, x, y) {
  paRR(g, x - 9, y - 17, 18, 34, 4, '#1B2559'); paRR(g, x - 7.2, y - 14, 14.4, 28, 2.5, '#EAF2FF');
  paRR(g, x - 5.6, y - 11, 10, 6, 2.5, '#6574F8'); paRR(g, x - 3.6, y - 3, 9.6, 6, 2.5, '#FFFFFF'); g.strokeStyle = '#C8D3F0'; g.lineWidth = 1; g.strokeRect(x - 3.6, y - 3, 9.6, 6); paRR(g, x - 5.6, y + 5, 8, 5, 2.5, '#6574F8');
}
function paTablet(g, x, y, w = 40, h = 29) {
  paRR(g, x - w / 2, y - h / 2, w, h, 3.5, '#1B2559'); paRR(g, x - w / 2 + 2.6, y - h / 2 + 2.6, w - 5.2, h - 5.2, 2, '#EAF2FF');
  [[-11, 6, '#6574F8'], [-4, 10, '#00008F'], [3, 4, '#FF1721'], [10, 8, '#6574F8']].forEach(([dx, hh, c]) => paRR(g, x + dx - 2.4, y + 6 - hh, 4.8, hh, 1, c));
}
function paShield(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#00008F'; g.fill(paP('M0,-24 L19,-17 L19,-2 C19,10 9,18 0,22 C-9,18 -19,10 -19,-2 L-19,-17 Z')); g.fillStyle = '#FFFFFF'; g.fillRect(-9, -4, 18, 6); g.fillRect(-3, -10, 6, 18); g.restore();
}
function paCoins(g, x, by) { [[0, '#F2A93B'], [-5.5, '#F6B93B'], [-11, '#F9C95C']].forEach(([dy, c], i) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, by + dy, 12, 4.5, 0, 0, 6.3); g.fill(); g.fillRect(x - 12, by + dy - 4.5, 24, 4.5); g.beginPath(); g.ellipse(x, by + dy - 4.5, 12, 4.5, 0, 0, 6.3); g.fillStyle = i === 2 ? '#FBD878' : c; g.fill(); }); }
function paTrophy(g, x, by) {
  g.fillStyle = '#F6B93B'; g.fill(paP(`M${x - 13},${by - 38} L${x + 13},${by - 38} C${x + 13},${by - 20} ${x + 6},${by - 14} ${x},${by - 14} C${x - 6},${by - 14} ${x - 13},${by - 20} ${x - 13},${by - 38} Z`));
  g.strokeStyle = '#F6B93B'; g.lineWidth = 3; g.beginPath(); g.arc(x - 14, by - 32, 6, Math.PI * .5, Math.PI * 1.5); g.arc(x + 14, by - 32, 6, Math.PI * 1.5, Math.PI * .5); g.stroke();
  g.fillStyle = '#E39A1F'; g.fillRect(x - 2.5, by - 14, 5, 9); g.fillRect(x - 9, by - 6, 18, 6); g.fillStyle = '#FFFFFF'; g.globalAlpha = .55; g.fillRect(x - 8, by - 34, 3, 14); g.globalAlpha = 1;
}
function paMega(g, x, y) {
  g.save(); g.translate(x, y); g.rotate(-.35); g.fillStyle = '#FF1721'; g.fill(paP('M-12,-6 L8,-18 L8,18 L-12,6 Z')); g.fillStyle = '#FFFFFF'; g.fillRect(-18, -7, 8, 14); g.fillStyle = '#00008F'; g.fillRect(-14, 6, 6, 10);
  g.strokeStyle = '#00008F'; g.lineWidth = 2; [[14, 8], [20, 12]].forEach(([r]) => { g.beginPath(); g.arc(8, 0, r, -.7, .7); g.stroke(); }); g.restore();
}
function paCal(g, x, y) { paRR(g, x - 15, y - 16, 30, 32, 4, '#FFFFFF'); paRR(g, x - 15, y - 16, 30, 9, 4, '#FF1721'); g.fillStyle = '#FF1721'; g.fillRect(x - 15, y - 11, 30, 4); g.fillStyle = '#00008F'; for (let i = 0; i < 6; i++) g.fillRect(x - 10 + (i % 3) * 8, y - 2 + Math.floor(i / 3) * 9, 5, 5); }
function paHeart(g, x, y, s = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#FF4D5E'; g.fill(paP('M0,12 C-18,0 -16,-14 -7,-14 C-3,-14 0,-11 0,-8 C0,-11 3,-14 7,-14 C16,-14 18,0 0,12 Z')); g.restore(); }
function paIV(g, x, y0, h) {   // drip stand (scene element, absolute coordinates)
  g.strokeStyle = '#B9C4D8'; g.lineWidth = Math.max(2, h * .02); g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 - h); g.moveTo(x - h * .09, y0 - h); g.lineTo(x + h * .09, y0 - h); g.moveTo(x - h * .1, y0); g.lineTo(x + h * .1, y0); g.stroke();
  const bw = h * .12, bh = h * .2, bx = x - bw / 2, by = y0 - h + h * .03; paRR(g, bx, by, bw, bh, bw * .22, '#FFFFFF'); paRR(g, bx + bw * .12, by + bh * .4, bw * .76, bh * .5, bw * .15, '#F2A5B8'); g.strokeStyle = '#E5A0B0'; g.lineWidth = Math.max(1.5, h * .012); g.beginPath(); g.moveTo(x, by + bh); g.bezierCurveTo(x, y0 - h * .45, x - h * .12, y0 - h * .4, x - h * .1, y0 - h * .2); g.stroke();
}

/* ---------- room backdrops (panel coordinates, r = {x,y,w,h}) ---------- */
function paBg(g, r, tint, kind) {
  const { x, y, w, h } = r, light = pbMix(tint, '#FFFFFF', .55), mid = pbMix(tint, '#FFFFFF', .32), dark = pbMix(tint, '#000000', .06);
  g.fillStyle = light; g.fillRect(x, y, w, h);
  if (kind === 'clinic') {
    paRR(g, x + w * .07, y + h * .12, w * .3, h * .38, 4, '#FFFFFF'); paRR(g, x + w * .09, y + h * .14, w * .26, h * .34, 3, pbMix(tint, '#FFFFFF', .75)); g.strokeStyle = '#FFFFFF'; g.lineWidth = w * .012; g.beginPath(); g.moveTo(x + w * .22, y + h * .14); g.lineTo(x + w * .22, y + h * .48); g.moveTo(x + w * .09, y + h * .31); g.lineTo(x + w * .35, y + h * .31); g.stroke();
    g.fillStyle = '#FFFFFF'; g.globalAlpha = .75; g.fillRect(x + w * .74, y + h * .14, w * .13, w * .04); g.fillRect(x + w * .785, y + h * .14 - w * .045, w * .04, w * .13); g.globalAlpha = 1;
    paRR(g, x + w * .66, y + h * .56, w * .34, h * .44, 4, mid); g.strokeStyle = light; g.lineWidth = w * .008; g.beginPath(); g.moveTo(x + w * .66, y + h * .78); g.lineTo(x + w, y + h * .78); g.stroke();
  } else if (kind === 'ward') {
    g.fillStyle = mid; for (let i = 0; i < 5; i++) g.fillRect(x + w * (.05 + i * .045), y, w * .02, h * .5);
    paRR(g, x + w * .55, y + h * .52, w * .5, h * .5, w * .05, '#FFFFFF'); paRR(g, x + w * .58, y + h * .46, w * .3, h * .14, w * .05, pbMix(tint, '#FFFFFF', .8)); g.fillStyle = mid; g.fillRect(x + w * .55, y + h * .8, w * .5, h * .06);
  } else if (kind === 'office') {
    paRR(g, x + w * .06, y + h * .14, w * .34, h * .05, 2, '#FFFFFF'); [[.08, '#6574F8'], [.14, '#FF9D87'], [.2, '#00008F'], [.26, '#F2B64A']].forEach(([dx, c], i) => paRR(g, x + w * dx, y + h * (.04 + (i % 2) * .02), w * .05, h * (.1 - (i % 2) * .02), 2, c));
    paRR(g, x + w * .76, y + h * .62, w * .12, h * .1, 3, '#FFFFFF'); g.fillStyle = '#7CC4A4'; [-40, -20, 0, 20, 40].forEach(a => { g.beginPath(); g.ellipse(x + w * .82 + Math.sin(a / 57) * w * .05, y + h * .52, w * .028, h * .09, a / 57, 0, 6.3); g.fill(); });
  } else if (kind === 'home') {
    paRR(g, x + w * .08, y + h * .1, w * .26, h * .34, 4, '#FFFFFF'); paRR(g, x + w * .1, y + h * .12, w * .22, h * .3, 3, pbMix(tint, '#FFFFFF', .8));
    g.fillStyle = '#FFFFFF'; g.globalAlpha = .6; g.beginPath(); g.arc(x + w * .86, y + h * .3, w * .12, 0, 6.3); g.fill(); g.globalAlpha = 1;
    paRR(g, x + w * .78, y + h * .68, w * .14, h * .12, 3, '#FFFFFF'); g.fillStyle = '#7CC4A4'; [-30, 0, 30].forEach(a => { g.beginPath(); g.ellipse(x + w * .85 + Math.sin(a / 57) * w * .05, y + h * .6, w * .03, h * .09, a / 57, 0, 6.3); g.fill(); });
  } else {   // bright: soft shapes + sparkles
    g.fillStyle = mid; g.beginPath(); g.arc(x + w * .78, y + h * .3, w * .3, 0, 6.3); g.fill(); g.beginPath(); g.arc(x + w * .1, y + h * .8, w * .22, 0, 6.3); g.fill();
    g.fillStyle = '#FFFFFF'; g.globalAlpha = .8; [[.2, .2, 5], [.88, .12, 4], [.9, .6, 3.5]].forEach(([a, b, s]) => { const cx = x + w * a, cy = y + h * b, q = s * w * .008; g.fillRect(cx - q * 3, cy - q / 2, q * 6, q); g.fillRect(cx - q / 2, cy - q * 3, q, q * 6); }); g.globalAlpha = 1;
  }
}

/* ---------- characters ---------- */
const PA_EXT = { rest: [-41, 41], holdR: [-41, 68], holdL: [-68, 41], clip: [-43, 43], chest: [-42, 42], wave: [-41, 62], cheer: [-54, 54], point: [-41, 78] };
function paFig(g, r, o) {
  const e = o.ext || PA_EXT[o.pose || 'rest'], S = Math.min(r.h * (o.hs || .94) / 114, r.w * (o.ws || .94) / (e[1] - e[0]));
  const ox = r.x + r.w / 2 - ((e[0] + e[1]) / 2) * S + (o.dx || 0) * r.w;
  g.save(); g.translate(ox, r.y + r.h); g.scale(S, S); paPerson(g, o); g.restore();
}
const PA_CHARS = {   // key: [Thai name, keywords, draw(g, rect, tint)]
  pharmacy: ['ร้านยา / ผู้ป่วยนอก', /opd|ผู้ป่วยนอก|ร้านยา|ยา(?!ว)|รับยา|ตรวจ(?!สอบ)/i, (g, r, t) => { paBg(g, r, t, 'clinic'); paFig(g, r, { skin: PA_SKIN[1], hair: PA_HAIR[0], style: 'long', top: '#9A5B35', extra: 'collar', pose: 'holdR', ext: [-41, 68], prop: g2 => paBag(g2, 50, -52) }); }],
  patient: ['ผู้ป่วยใน / นอน รพ.', /ipd|ผู้ป่วยใน|นอนโรงพยาบาล|ค้างคืน|ห้องพัก|admit/i, (g, r, t) => { paBg(g, r, t, 'ward'); paIV(g, r.x + r.w * .17, r.y + r.h * .98, r.h * .86); paFig(g, r, { skin: PA_SKIN[0], hair: PA_HAIR[3], style: 'long', top: '#CBE0F4', extra: 'gown', pose: 'chest', hideHands: false }); }],
  nurse: ['พยาบาล / ผ่าตัดวันเดียว', /surgery|ผ่าตัด|พยาบาล|nurse|วันเดียวกลับ|day/i, (g, r, t) => { paBg(g, r, t, 'ward'); paIV(g, r.x + r.w * .84, r.y + r.h * .98, r.h * .8); paFig(g, r, { skin: PA_SKIN[0], hair: PA_HAIR[4], style: 'bob', top: '#6BC3C0', extra: 'scrubs', cap: '#6BC3C0', pose: 'holdL', ext: [-72, 41], prop: g2 => paClip(g2, -53, -70, 24, 32) }); }],
  doctor: ['แพทย์', /แพทย์|หมอ|doctor|ปรึกษา|consult|สุขภาพ|health/i, (g, r, t) => { paBg(g, r, t, 'clinic'); paFig(g, r, { skin: PA_SKIN[1], hair: PA_HAIR[1], style: 'short', top: '#FFFFFF', inner: '#6574F8', extra: 'coat', pose: 'clip', glasses: true, prop: g2 => paClip(g2, 0, -26, 34, 42) }); }],
  advisor: ['ที่ปรึกษา / ตัวแทน', /ตัวแทน|ที่ปรึกษา|advisor|แนะนำ|วางแผน|แผน|plan|เลือก/i, (g, r, t) => { paBg(g, r, t, 'office'); paFig(g, r, { skin: PA_SKIN[2], hair: PA_HAIR[0], style: 'short', top: '#1B2A78', extra: 'blazer', pose: 'chest', prop: g2 => paTablet(g2, 0, -33, 42, 28) }); }],
  family: ['ครอบครัว', /ครอบครัว|ลูก|พ่อแม่|ผู้สูงวัย|เด็ก|family|บุตร/i, (g, r, t) => { paBg(g, r, t, 'home'); paFig(g, { ...r, x: r.x - r.w * .08, w: r.w * .72 }, { skin: PA_SKIN[1], hair: PA_HAIR[1], style: 'bun', top: '#E68B7A', extra: 'collar', pose: 'rest' }); paFig(g, { ...r, x: r.x + r.w * .4, w: r.w * .62 }, { skin: PA_SKIN[1], hair: PA_HAIR[0], style: 'crop', top: '#F2B64A', pose: 'wave', hs: .66, ws: .98 }); }],
  phone: ['แอป / ออนไลน์', /แอป|app|ออนไลน์|online|line|ไลน์|ดาวน์โหลด|ทางโทรศัพท์|โทร/i, (g, r, t) => { paBg(g, r, t, 'bright'); paFig(g, r, { skin: PA_SKIN[2], hair: PA_HAIR[1], style: 'pony', top: '#6574F8', pose: 'holdR', prop: g2 => paPhone(g2, 50, -64) }); }],
  money: ['ค่าใช้จ่าย / เงิน', /ค่าใช้จ่าย|ค่ารักษา|บาท|เงิน|เบี้ย|ราคา|ส่วนลด|ผลตอบแทน|ออม|coin|ลดหย่อน|ภาษี/i, (g, r, t) => { paBg(g, r, t, 'bright'); paFig(g, r, { skin: PA_SKIN[1], hair: PA_HAIR[2], style: 'bob', top: '#2F8F83', extra: 'collar', pose: 'holdR', prop: g2 => paCoins(g2, 51, -48) }); }],
  shield: ['ความคุ้มครอง', /คุ้มครอง|ประกัน|กรมธรรม์|ปกป้อง|ปลอดภัย|ความเสี่ยง|protect|insurance/i, (g, r, t) => { paBg(g, r, t, 'bright'); paFig(g, r, { skin: PA_SKIN[3], hair: PA_HAIR[0], style: 'short', top: '#00008F', extra: 'collar', pose: 'holdR', ext: [-41, 74], prop: g2 => paShield(g2, 52, -68, 1.02) }); }],
  check: ['เช็กลิสต์ / ขั้นตอน', /เช็ก|เช็ค|ขั้นตอน|วิธี|ต้องรู้|ข้อควรรู้|checklist|how|tips|เงื่อนไข|ข้อยกเว้น/i, (g, r, t) => { paBg(g, r, t, 'office'); paFig(g, r, { skin: PA_SKIN[0], hair: PA_HAIR[5], style: 'long', top: '#F2B64A', pose: 'clip', prop: g2 => paClip(g2, 0, -26, 34, 42) }); }],
  award: ['รางวัล / ยินดี', /รางวัล|ยินดี|award|congrat|แชมป์|ผลงาน|สำเร็จ|trophy/i, (g, r, t) => { paBg(g, r, t, 'bright'); paFig(g, r, { skin: PA_SKIN[2], hair: PA_HAIR[1], style: 'bun', top: '#E86A92', pose: 'holdR', ext: [-41, 74], prop: g2 => paTrophy(g2, 52, -46) }); }],
  event: ['งาน / ประกาศ', /งาน|กิจกรรม|event|สัมมนา|ประชุม|ประกาศ|เชิญ|อบรม|campaign|แคมเปญ|โปรโมชั่น/i, (g, r, t) => { paBg(g, r, t, 'bright'); paFig(g, r, { skin: PA_SKIN[1], hair: PA_HAIR[0], style: 'short', top: '#FF6B57', pose: 'holdR', ext: [-41, 82], prop: g2 => paMega(g2, 60, -60) }); }],
  team: ['ทีมงาน', /ทีม|team|ร่วมกัน|พนักงาน|หัวหน้า|ลูกค้า/i, (g, r, t) => { paBg(g, r, t, 'office'); paFig(g, { ...r, w: r.w * .6, x: r.x }, { skin: PA_SKIN[3], hair: PA_HAIR[0], style: 'short', top: '#6574F8', extra: 'collar', pose: 'rest', hs: .9 }); paFig(g, { ...r, w: r.w * .6, x: r.x + r.w * .4 }, { skin: PA_SKIN[0], hair: PA_HAIR[4], style: 'long', top: '#00008F', pose: 'wave', hs: .98 }); }],
};
const PA_ORDER = ['pharmacy', 'patient', 'nurse', 'doctor', 'advisor', 'family', 'phone', 'money', 'shield', 'check', 'award', 'event', 'team'];
function paPick(sec, i) {   // zero-token: the character whose keywords appear most; otherwise a friendly rotation
  if (sec.char && sec.char !== 'auto' && PA_CHARS[sec.char]) return sec.char;
  const t = [sec.title, sec.body, sec.tag].join(' '); let best = null, n = 0;
  for (const [k, c] of Object.entries(PA_CHARS)) { const m = (t.match(new RegExp(c[1].source, 'gi')) || []).length; if (m > n) { n = m; best = k; } }
  return best || ['doctor', 'shield', 'advisor', 'check'][i % 4];
}

/* ============================================================
   Infographic layout — headline on a bar, pastel section cards with a
   character per card, summary pills, closing statement + QR card.
   Portrait / story: cards stacked, sides alternate. Square / landscape:
   cards side by side (character on top). Text is never cut: the layout
   finds the largest type scale that fits.
   ============================================================ */
const PA_COLS = { blue: ['ฟ้า', '#8DB8EA'], pink: ['ชมพู', '#F2A0AB'], amber: ['เหลือง', '#F6C873'], mint: ['เขียวมิ้นต์', '#A9DDC5'], lavender: ['ม่วงอ่อน', '#B9B7F0'] };
const PA_COL_ORDER = ['blue', 'pink', 'amber', 'mint', 'lavender'];
const paSecColor = (sec, i) => (PA_COLS[sec.color] || PA_COLS[PA_COL_ORDER[i % 5]])[1];
const PA_GHOST = [
  { title: 'หัวข้อที่ 1', body: 'อธิบายสั้น ๆ ให้เข้าใจง่ายใน 2–3 บรรทัด', tag: 'ประเด็นสำคัญ' },
  { title: 'หัวข้อที่ 2', body: 'เพิ่มได้สูงสุด 4 หัวข้อ ตัวละครเลือกให้ตามเนื้อหา', tag: '' },
  { title: 'หัวข้อที่ 3', body: 'สีการ์ดและตัวละครเปลี่ยนได้ในช่องฟอร์มด้านซ้าย', tag: 'คุ้มครอง*' },
];

function pbDrawInfo(cv, st, fmtKey) {
  const fk = fmtKey || st.format, fm = PB_FORMATS[fk], W = fm[2], H = fm[3], B = pbBrand(), f = st.f, P = pbPalette(st, B, false);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), k = pbKit(g), u = Math.min(W, H) / 1080, land = W / H > 1.2, story = H / W > 1.6, square = !land && !story && W / H > .88;
  g.textBaseline = 'alphabetic';
  const M = 62 * u, safeT = story ? 110 * u : 0, safeB = story ? 140 * u : 0, bw = W - 2 * M, top0 = M + safeT, bottom = H - M - safeB;
  if (P.dark) pbBackground(k, P, W, H, u); else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, P.bg[0]); gr.addColorStop(1, P.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  const NAVY = B.colors.navy || '#0C0E45', INK = B.colors.ink || '#0E0E0E';
  const real = (st.secs || []).filter(x => x.title || x.body || x.tag), ghost = !real.length, secs = (ghost ? PA_GHOST : real).slice(0, 4), n = secs.length;
  const cols = land ? n : square ? (n <= 3 ? n : 2) : 1, rowsN = Math.ceil(n / cols), stack = cols === 1;

  /* logo, top right (the CI pair) */
  const lh = (land ? 74 : 88) * u, logoEst = lh * 2.2;
  const hw = bw - logoEst - 26 * u;
  pbLogos(k, P, B, W - M, top0, lh, true);

  /* headline: line 1 plain · line 2 on the dark bar · rest plain (1 line = bar only, 2 lines = bar + plain) */
  const head = (s, draw, x, y) => {
    const sz = (land ? 54 : story ? 70 : square ? 58 : 62) * u * Math.min(Math.max(s, .74), 1.08), parts = String(f.headline || '').split('\n').map(t => t.trim()).filter(Boolean);
    const hl = parts.length ? parts : ['Headline'], dim = !parts.length;
    const pre = hl.length >= 3 ? [hl[0]] : [], bar = hl.length >= 3 ? hl[1] : hl[0], post = hl.length >= 3 ? hl.slice(2) : hl.slice(1);
    let h = 0; g.save(); if (dim) g.globalAlpha = .45;
    k.font(700, sz, PB_HEAD);
    const plain = (txt, yy) => { const L = k.wrap(txt, hw); L.forEach((l, i) => { if (draw) { k.font(700, sz, PB_HEAD); g.fillStyle = P.head; g.fillText(l, x, yy + i * sz * 1.25 + sz * .98); } }); return L.length * sz * 1.25; };
    pre.forEach(t => { h += plain(t, y + h); });
    const BL = k.wrap(bar, hw - sz * .5); BL.forEach(l => { if (draw) { k.font(700, sz, PB_HEAD); const lw = g.measureText(l).width; g.fillStyle = P.boxBg; g.fillRect(x, y + h, lw + sz * .5, sz * 1.34); g.fillStyle = P.boxInk; g.fillText(l, x + sz * .25, y + h + sz * 1.0); } h += sz * 1.34 + sz * .06; });
    if (post.length) { h += sz * .06; h += plain(post.join(' '), y + h); }
    g.restore(); return h;
  };

  /* closing area: statement (left) + mint QR card (right) + fine print */
  const qr = st.qrImg ? null : pbQr(safeUrl(st.qrUrl) || st.qrUrl.trim()), qrIm = pbImg(st.qrImg), hasQr = !!(qr || qrIm);
  const ctaL = String(f.cta || '').split('\n').map(t => t.trim()).filter(Boolean), hasCard = hasQr || ctaL.length, stmt = String(f.sub || '').trim();
  const tail = (s, draw, x, y) => {
    let h = 0; const gap = 26 * u, lw = hasCard && stmt ? bw * .5 : bw, cardW = stmt ? bw - lw - gap : bw, ss = Math.max(s, .72);
    const qs = hasQr ? Math.max(118, 150 * ss) * u : 0, pad = 22 * u * ss;
    const cardTextW = cardW - pad * 2 - (qs ? qs + 20 * u : 0);
    const ctH = (dr, cx, cy) => { let hh = 0; if (ctaL[0]) hh += pbText(k, ctaL[0], { x: cx, y: cy, w: cardTextW, size: 30 * u * ss, weight: 700, lh: 1.3, color: NAVY, draw: dr }); if (ctaL.length > 1) hh += 6 * u + pbText(k, ctaL.slice(1).join('\n'), { x: cx, y: cy + hh + 6 * u, w: cardTextW, size: 21 * u * ss, weight: 500, lh: 1.38, color: hexA(INK, .85), draw: dr }); return hh; };
    const cardH = hasCard ? Math.max(ctH(false, 0, 0) + pad * 2, qs ? qs + 56 * u * ss + pad * 2 - 18 * u : 0) : 0;
    const stH = stmt ? pbText(k, stmt, { w: lw - 10 * u, size: 26 * u * ss, weight: 700, lh: 1.42, color: P.dark ? '#FFFFFF' : NAVY }) : 0;
    const mainH = Math.max(stH, cardH); h += mainH;
    const fine = [f.note, B.footer].filter(Boolean).join('\n'), fH = fine ? pbText(k, fine, { w: bw, size: 18 * u, weight: 500, lh: 1.4, color: P.mute }) : 0;
    if (fine) h += 14 * u + fH;
    if (draw) {
      if (stmt) pbText(k, stmt, { x, y: y + (hasCard ? 0 : 0), w: lw - 10 * u, size: 26 * u * ss, weight: 700, lh: 1.42, color: P.dark ? '#FFFFFF' : NAVY, draw: 1 });
      if (hasCard) {
        const cx = stmt ? x + lw + gap : x, cy = y + (mainH - cardH) / 2;
        g.fillStyle = P.dark ? 'rgba(255,255,255,.14)' : '#CDEFE0'; k.rr(cx, cy, cardW, cardH, 26 * u); g.fill();
        ctH(true, cx + pad, cy + (cardH - ctH(false, 0, 0)) / 2);
        if (qs) {
          const qx = cx + cardW - pad - qs, qy = cy + (cardH - qs - 40 * u * ss) / 2, pd = 10 * u;
          g.fillStyle = '#8FD6B8'; k.rr(qx - 10 * u, qy - 10 * u, qs + 20 * u, qs + 20 * u + 44 * u * ss, 18 * u); g.fill();
          g.fillStyle = '#FFFFFF'; k.rr(qx, qy, qs, qs, 12 * u); g.fill();
          if (qrIm) { const s2 = Math.min((qs - 2 * pd) / qrIm.width, (qs - 2 * pd) / qrIm.height); g.drawImage(qrIm, qx + (qs - qrIm.width * s2) / 2, qy + (qs - qrIm.height * s2) / 2, qrIm.width * s2, qrIm.height * s2); }
          else { const cell = (qs - 2 * pd) / qr.n; g.fillStyle = '#000'; for (let r = 0; r < qr.n; r++) for (let c = 0; c < qr.n; c++) if (qr.dark(r, c)) g.fillRect(qx + pd + c * cell, qy + pd + r * cell, cell + .5, cell + .5); }
          k.font(700, 22 * u * ss, PB_THAI); g.fillStyle = '#14573F'; g.textAlign = 'center'; g.fillText(st.qrLabel || 'สแกนเลย!', qx + qs / 2, qy + qs + 34 * u * ss); g.textAlign = 'left';
        }
      }
      if (fine) pbText(k, fine, { x, y: y + mainH + 14 * u, w: bw, size: 18 * u, weight: 500, lh: 1.4, color: P.mute, draw: 1 });
    }
    return h;
  };

  /* section cards */
  const gapX = 26 * u;
  const secPlan = (s, cw) => {   // text metrics for each section at scale s
    const pad = 28 * u * s, pillH = 50 * u * s, charOn = id => id !== 'none';
    return secs.map((sec, i) => {
      const tw = stack ? cw * .54 - pad * 1.5 : cw - pad * 2, hasT = !!sec.title, hasB = !!sec.body;
      const tH = hasT ? pbText(k, sec.title, { w: tw, size: 38 * u * s, weight: 700, lh: 1.28 }) : 0, bH = hasB ? pbText(k, sec.body, { w: tw, size: 24 * u * s, weight: 500, lh: 1.42 }) : 0;
      return { sec, i, tw, tH, bH, pad, pillH, textH: tH + (tH && bH ? 10 * u * s : 0) + bH };
    });
  };
  const cardH = (m, s, cw) => {
    const noChar = m.sec.char === 'none', pill = m.sec.tag ? m.pillH / 2 + 14 * u * s : m.pad;
    if (stack) return Math.max(m.pad + m.textH + pill, noChar ? 0 : (story ? 250 : 215) * u * Math.max(s, .8));
    const panelH = noChar ? 0 : cw * (land ? .46 : n > 3 || cols < n ? .6 : .78) * Math.max(.72, Math.min(1, s));
    return panelH + m.pad + m.textH + pill;
  };
  const plan = s => {
    const hh = head(s, false, 0, 0), th = tail(s, false, 0, 0), y0 = top0 + Math.max(hh, lh) + 30 * u, y1 = bottom - (th ? th + 40 * u : 0);
    const cw = stack ? bw : (bw - gapX * (cols - 1)) / cols, ms = secPlan(s, cw), pillGap = 22 * u + 25 * u * s;
    const hs = ms.map(m => cardH(m, s, cw));
    let total;
    if (stack) total = hs.reduce((a, b) => a + b, 0) + pillGap * (n - 1);
    else { total = 0; for (let r = 0; r < rowsN; r++) total += Math.max(...hs.slice(r * cols, r * cols + cols)) + (r ? pillGap : 0); }
    return { ok: total <= y1 - y0, hh, th, y0, y1, cw, ms, hs, total, pillGap };
  };
  let S = 1.25, L = plan(S);
  for (; S >= .45; S -= .025) { L = plan(S); if (L.ok) break; }
  const over = !L.ok;

  /* draw */
  g.save(); if (ghost) g.globalAlpha = 1;
  head(S, true, M, top0);
  const free = Math.max(0, L.y1 - L.y0 - L.total), grow = stack ? Math.min(free / n, .35 * L.hs[0]) : 0;
  let yy = L.y0 + (stack ? 0 : Math.min(free * .5, 40 * u));
  const tagged = [];
  const drawCard = (m, x, y, w, h) => {
    const sec = m.sec, col = paSecColor(sec, m.i), cid = paPick(sec, m.i), noChar = sec.char === 'none', R = 28 * u;
    g.save(); if (ghost) g.globalAlpha = .55;
    g.save(); k.rr(x, y, w, h, R); g.clip(); g.fillStyle = col; g.fillRect(x, y, w, h);
    let tx, ty, tw;
    if (stack) {
      const pw = noChar ? 0 : w * .46, left = m.i % 2 === 0, px = left ? x + w - pw : x;
      if (pw) { g.save(); g.beginPath(); g.rect(px, y, pw, h); g.clip(); PA_CHARS[cid][2](g, { x: px, y, w: pw, h }, col); g.restore(); const fx = left ? px : px + pw - 44 * u, fg = g.createLinearGradient(left ? fx : fx + 44 * u, 0, left ? fx + 44 * u : fx, 0); fg.addColorStop(0, hexA(col, 1)); fg.addColorStop(1, hexA(col, 0)); g.fillStyle = fg; g.fillRect(fx, y, 44 * u, h); }
      tx = left ? x + m.pad : x + pw + m.pad * .5; tw = w - pw - m.pad * 1.5; ty = y + m.pad + Math.max(0, (h - m.pad - m.textH - (sec.tag ? m.pillH / 2 + 14 * u * S : m.pad)) * .45);
    } else {
      const ph = noChar ? 0 : h - (m.pad + m.textH + (sec.tag ? m.pillH / 2 + 14 * u * S : m.pad));
      if (ph) { g.save(); g.beginPath(); g.rect(x, y, w, ph); g.clip(); PA_CHARS[cid][2](g, { x, y, w, h: ph }, col); g.restore(); }
      tx = x + m.pad; tw = w - m.pad * 2; ty = y + ph + m.pad;
    }
    g.restore();
    if (sec.title) ty += pbText(k, sec.title, { x: tx, y: ty, w: tw, size: 38 * u * S, weight: 700, lh: 1.28, color: NAVY, draw: 1 }) + (sec.body ? 10 * u * S : 0);
    if (sec.body) pbText(k, sec.body, { x: tx, y: ty, w: tw, size: 24 * u * S, weight: 500, lh: 1.42, color: hexA(INK, .88), draw: 1 });
    g.restore();
    if (sec.tag) tagged.push({ m, col, cx: tx + tw / 2, y: y + h, ghost });
  };
  if (stack) { L.ms.forEach((m, i) => { const h = L.hs[i] + grow; drawCard(m, M, yy, L.cw, h); yy += h + L.pillGap; }); }
  else { for (let r = 0; r < rowsN; r++) { const rh = Math.max(...L.hs.slice(r * cols, r * cols + cols)) + Math.min(free, 80 * u) * (rowsN === 1 ? 1 : .5); L.ms.slice(r * cols, r * cols + cols).forEach((m, c) => drawCard(m, M + c * (L.cw + gapX), yy, L.cw, rh)); yy += rh + L.pillGap; } }
  /* summary pills sit across each card's bottom edge */
  tagged.forEach(({ m, col, cx, y, ghost: gh }) => {
    const s = S, ph = m.pillH; k.font(700, 24 * u * s, PB_THAI); const tw = g.measureText(m.sec.tag).width, pw = Math.min(tw + 100 * u * s, L.cw * (stack ? .62 : .94)), px = Math.min(Math.max(cx - pw / 2, M + 8 * u), W - M - pw - 8 * u);
    g.save(); if (gh) g.globalAlpha = .55;
    g.fillStyle = pbMix(col, NAVY, .3); k.rr(px, y - ph / 2, pw, ph, ph / 2); g.fill();
    paCircle(g, px + ph * .55, y, ph * .3, '#3DBA6B'); g.strokeStyle = '#FFFFFF'; g.lineWidth = 3.4 * u * s; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(px + ph * .42, y + 1 * u); g.lineTo(px + ph * .52, y + ph * .1); g.lineTo(px + ph * .7, y - ph * .1); g.stroke();
    k.font(700, 24 * u * s, PB_THAI); g.fillStyle = '#FFFFFF'; const lines = k.wrap(m.sec.tag, pw - ph * 1.2); g.fillText(lines[0] || '', px + ph * 1.0, y + 8.5 * u * s); g.restore();
  });
  const th = tail(S, false, 0, 0); if (th) tail(S, true, M, bottom - th);
  g.restore();
  return { scale: S, overflow: over, dense: S < .62, scene: 'info' };
}
