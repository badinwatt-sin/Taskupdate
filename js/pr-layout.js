'use strict';

const PR_LAYOUTS = {
  'pr-portrait': ['เน้นภาพบุคคล', 'ภาพด้านขวาและข้อความบนพื้นน้ำเงินเข้ม'],
  'pr-editorial': ['เน้นหัวเรื่อง', 'หัวเรื่องเต็มหน้ากว้างและรายละเอียดด้านล่าง'],
};
Object.assign(SD_DESIGNS, PR_LAYOUTS);

function prBuild(b, design, format) {
  const c = sdCtx(b, format, 1), { W, M, u } = c;
  const feature = design === 'pr-portrait', dark = feature, ink = dark ? '#FFFFFF' : '#00008F';
  const inner = W - 2 * M, gutter = 32 * u, logoH = 75 * u, top = c.top;
  const logo = (variant, x, right) => c.add(sdM({ t: 'logo', role: 'logo', variant, dark, x, right, y: top, w: logoH * 2.1, h: logoH }));
  logo(dark ? 'bordered' : 'color', M);
  logo(dark ? 'prime' : 'primeBlue', W - M - logoH * 2, W - M);

  const left = M, fullWidth = !b.pr.photo, split = feature ? .51 : .55;
  const textW = fullWidth ? inner : inner * split - gutter;
  const photoW = inner * (1 - split), photoX = W - M - photoW;
  const start = top + logoH + 55 * u, end = c.bot;
  const text = (role, value, x, y, w, size, color, weight = 400) => value ? sdT({
    role, text: value, x, y, w, size: size * u, font: role === 'headline' ? 'head' : 'body',
    weight, color, lh: 1.25,
  }) : null;

  const sections = scale => {
    const layers = [];
    let y = start;
    const put = (role, value, w, size, color, weight, gap = 18) => {
      const layer = text(role, value, left, y, w, size * scale, color, weight);
      if (layer) { layers.push(layer); y += layer.h + gap * u; }
    };
    const headingW = feature ? textW : inner;
    put('kicker', b.kicker, headingW, 35, ink, 600, 20);
    put('headline', sdHeadText(b), headingW, feature && !fullWidth ? 70 : 83, ink, 700, 26);
    const detailsY = y;
    put('sub', b.sub, textW, 38, ink, 400, 24);
    put('person', b.pr.person, textW, b.kind === 'recognition' ? 56 : 44, ink, 700, 22);
    if (b.date || b.time || b.venue) {
      layers.push({ t: 'shape', role: 'factRule', kind: 'rect', x: left, y, w: 58 * u, h: 4 * u, fill: dark ? '#E2EFFF' : '#00008F' });
      y += 26 * u;
    }
    put('date', b.date, textW, 39, ink, 600, 5);
    put('time', b.time, textW, 37, ink, 400, 5);
    put('venue', b.venue, textW, 37, ink, 400, 0);
    if (b.cta || b.note) {
      const bodyEnd = y;
      put('cta', b.cta, textW, 38, ink, 700, b.note ? 14 : 0);
      put('note', b.note, textW, 30, ink, 400, 0);
      const offset = Math.max(22 * u, end - y);
      layers.filter(layer => layer.role === 'cta' || layer.role === 'note').forEach(layer => { layer.y += offset; });
      y = Math.max(bodyEnd, y + offset);
    }
    return { layers, detailsY, y };
  };
  let result;
  for (const scale of [1, .93, .86, .79, .72, .65]) {
    result = sections(scale);
    result.scale = scale;
    if (result.y <= end && (feature || fullWidth || end - result.detailsY >= 205 * u)) break;
  }

  if (b.pr.photo) {
    const photoY = feature ? start : result.detailsY;
    const photoH = Math.max(100 * u, end - photoY);
    c.add({ t: 'shape', role: 'photoPanel', kind: 'round', x: photoX, y: photoY, w: photoW, h: photoH, fill: '#E2EFFF', r: .06 });
    c.add({ t: 'img', role: 'hero', src: b.pr.photo.src, x: photoX, y: photoY, w: photoW, h: photoH, r: .055,
      contain: !!b.pr.photo.cutout, cropX: b.pr.cropX, cropY: b.pr.photo.cutout ? 1 : b.pr.cropY });
  }
  result.layers.forEach(c.add);
  return { bg: dark ? { ...SD_THEMES.deep.bg } : { c1: '#FFFFFF' }, layers: c.L, scale: result.scale,
    over: result.y > end || (!feature && !fullWidth && end - result.detailsY < 100 * u) };
}
