'use strict';
/* ============================================================
   Poster Studio · AXA Prime posters (KTAXA Prime 2027 Canva Poster Masters)
   Three series — Race to Prime · Professional Sales Clinic · Professional Connext — in the four
   master sizes (Square · A4 · 16:9 · 19:6). Artwork (background + "foreground & brand" overlay)
   and every text position, size and colour come from the team's Canva masters, so a poster
   made here matches one made from the Canva file. Layer order follows the master's rule:
   text > Foreground & Brand > added picture > Background.
   Everything is an ordinary Studio layer afterwards: tap to restyle, tap again to type on the poster.
   Loaded after studio-brief.js.
   ============================================================ */
PB_FORMATS.a4 = ['A4', 'แนวตั้ง', 1240, 1754, 'พิมพ์ · PDF'];
PB_FORMATS.wide = ['Wide', '19:6', 1900, 600, 'จอกว้าง'];
const SP_SERIES = {   // key: [name, Thai gloss, what to prepare]
  race: ['Race to Prime', 'แข่งขันสู่คุณวุฒิ Prime', 'รอบและวันที่แข่งขัน · Milestone 01–03 · กติกา'],
  clinic: ['Professional Sales Clinic', 'Skill Lab ฝึกจากเคสจริง', 'หัวข้อ Skill Lab · โค้ช · วัน เวลา สถานที่ · สิ่งที่จะได้ฝึก'],
  connext: ['Professional Connext', 'เสวนาและแบ่งปันประสบการณ์', 'หัวข้อหลัก · วิทยากร · วัน เวลา ช่องทาง · ช่วงสำคัญ'],
};
Object.assign(SD_DESIGNS, { prime_race: ['Race to Prime', 'AXA Prime'], prime_clinic: ['Professional Sales Clinic', 'AXA Prime'], prime_connext: ['Professional Connext', 'AXA Prime'] });
const SP_FMTS = ['square', 'a4', 'landscape', 'wide'], SP_STD_FMTS = ['square', 'portrait', 'story', 'landscape'];
const SP_PAL = [['#FFFFFF', 'White'], ['#DCEEFF', 'Ice White'], ['#B5D2FF', 'Ice Blue'], ['#0026E1', 'Royal Blue'], ['#00228E', 'Deep Royal'], ['#071B64', 'Prime Navy']];   // AXA Prime palette (masters' START_HERE)
/* [x, y, maxWidth, fontSize ÷ height, bold, colour, English label?] per format → series → text, as fractions of the page */
const SP_SPEC = {"square":{"race":{"ed":[0.05,0.1519,0.3981,0.02593,0,"#C8E3FF",0],"h0":[0.05,0.1728,0.6574,0.09077,1,"#FFFFFF",0],"h1":[0.05,0.2803,0.6574,0.09077,1,"#DCEEFF",0],"sup":[0.05,0.3927,0.5741,0.03625,1,"#FFFFFF",0],"dtl":[0.05,0.7843,0.7333,0.03611,1,"#FFFFFF",0],"cta":[0.8083,0.787,0.1333,0.02321,1,"#00228E",0],"l0":[0.05,0.8602,0.287,0.01389,0,"#C8E3FF",1],"v0":[0.05,0.875,0.2861,0.02778,0,"#FFFFFF",0],"l1":[0.35,0.8602,0.287,0.01389,0,"#C8E3FF",1],"v1":[0.35,0.875,0.2861,0.02778,0,"#FFFFFF",0],"l2":[0.65,0.8602,0.287,0.01389,0,"#C8E3FF",1],"v2":[0.65,0.875,0.2861,0.02778,0,"#FFFFFF",0]},"clinic":{"ed":[0.05,0.1519,0.3981,0.02593,0,"#284A87",0],"h0":[0.05,0.1728,0.6574,0.09077,1,"#071B64",0],"h1":[0.05,0.2803,0.6574,0.09077,1,"#0026E1",0],"sup":[0.05,0.3927,0.5741,0.03625,1,"#071B64",0],"dtl":[0.05,0.7843,0.7333,0.03611,1,"#071B64",0],"cta":[0.8083,0.787,0.1157,0.02321,1,"#FFFFFF",0],"l0":[0.05,0.8528,0.287,0.025,1,"#284A87",0],"v0":[0.05,0.875,0.2861,0.02778,0,"#071B64",0],"l1":[0.35,0.8528,0.287,0.025,1,"#284A87",0],"v1":[0.35,0.875,0.2861,0.02778,0,"#071B64",0],"l2":[0.65,0.8528,0.287,0.025,1,"#284A87",0],"v2":[0.65,0.875,0.2861,0.02778,0,"#071B64",0]},"connext":{"ed":[0.05,0.1519,0.3981,0.02593,0,"#C8E3FF",0],"h0":[0.05,0.1728,0.6574,0.09077,1,"#FFFFFF",0],"h1":[0.05,0.2803,0.6574,0.09077,1,"#DCEEFF",0],"sup":[0.05,0.3927,0.5741,0.03625,1,"#FFFFFF",0],"dtl":[0.05,0.7843,0.7333,0.03611,1,"#FFFFFF",0],"cta":[0.8083,0.787,0.1157,0.02321,1,"#00228E",0],"l0":[0.05,0.8528,0.287,0.025,1,"#C8E3FF",0],"v0":[0.05,0.875,0.2861,0.02778,0,"#FFFFFF",0],"l1":[0.35,0.8528,0.287,0.025,1,"#C8E3FF",0],"v1":[0.35,0.875,0.2861,0.02778,0,"#FFFFFF",0],"l2":[0.65,0.8528,0.287,0.025,1,"#C8E3FF",0],"v2":[0.65,0.875,0.2861,0.02778,0,"#FFFFFF",0]}},"a4":{"race":{"ed":[0.0595,0.1608,0.5119,0.02357,0,"#C8E3FF",0],"h0":[0.0595,0.1731,0.8571,0.0742,1,"#FFFFFF",0],"h1":[0.0595,0.261,0.8571,0.0742,1,"#DCEEFF",0],"sup":[0.0595,0.3547,0.7381,0.03295,1,"#FFFFFF",0],"dtl":[0.0595,0.8039,0.6667,0.03282,1,"#FFFFFF",0],"cta":[0.7583,0.8064,0.1714,0.02111,1,"#00228E",0],"l0":[0.0595,0.8729,0.277,0.01261,0,"#C8E3FF",1],"v0":[0.0595,0.8864,0.2758,0.02524,0,"#FFFFFF",0],"l1":[0.3532,0.8729,0.277,0.01261,0,"#C8E3FF",1],"v1":[0.3532,0.8864,0.2758,0.02524,0,"#FFFFFF",0],"l2":[0.6468,0.8729,0.277,0.01261,0,"#C8E3FF",1],"v2":[0.6468,0.8864,0.2758,0.02524,0,"#FFFFFF",0]},"clinic":{"ed":[0.0595,0.1608,0.5119,0.02357,0,"#284A87",0],"h0":[0.0595,0.1731,0.8571,0.0742,1,"#071B64",0],"h1":[0.0595,0.261,0.8571,0.0742,1,"#0026E1",0],"sup":[0.0595,0.3547,0.7381,0.03295,1,"#071B64",0],"dtl":[0.0595,0.8039,0.6667,0.03282,1,"#071B64",0],"cta":[0.7583,0.8064,0.1488,0.02111,1,"#FFFFFF",0],"l0":[0.0595,0.8662,0.277,0.02272,1,"#284A87",0],"v0":[0.0595,0.8864,0.2758,0.02524,0,"#071B64",0],"l1":[0.3532,0.8662,0.277,0.02272,1,"#284A87",0],"v1":[0.3532,0.8864,0.2758,0.02524,0,"#071B64",0],"l2":[0.6468,0.8662,0.277,0.02272,1,"#284A87",0],"v2":[0.6468,0.8864,0.2758,0.02524,0,"#071B64",0]},"connext":{"ed":[0.0595,0.1608,0.5119,0.02357,0,"#C8E3FF",0],"h0":[0.0595,0.1731,0.8571,0.0742,1,"#FFFFFF",0],"h1":[0.0595,0.261,0.8571,0.0742,1,"#DCEEFF",0],"sup":[0.0595,0.3547,0.7381,0.03295,1,"#FFFFFF",0],"dtl":[0.0595,0.8039,0.6667,0.03282,1,"#FFFFFF",0],"cta":[0.7583,0.8064,0.1488,0.02111,1,"#00228E",0],"l0":[0.0595,0.8662,0.277,0.02272,1,"#C8E3FF",0],"v0":[0.0595,0.8864,0.2758,0.02524,0,"#FFFFFF",0],"l1":[0.3532,0.8662,0.277,0.02272,1,"#C8E3FF",0],"v1":[0.3532,0.8864,0.2758,0.02524,0,"#FFFFFF",0],"l2":[0.6468,0.8662,0.277,0.02272,1,"#C8E3FF",0],"v2":[0.6468,0.8864,0.2758,0.02524,0,"#FFFFFF",0]}},"landscape":{"race":{"ed":[0.0425,0.1656,0.2687,0.03111,0,"#C8E3FF",0],"h0":[0.0425,0.1788,0.4781,0.12328,1,"#FFFFFF",0],"h1":[0.0425,0.3104,0.4781,0.12328,1,"#DCEEFF",0],"sup":[0.0425,0.4593,0.3875,0.0435,1,"#FFFFFF",0],"dtl":[0.0494,0.6767,0.3981,0.04333,1,"#FFFFFF",0],"cta":[0.4288,0.8533,0.09,0.02785,1,"#00228E",0],"l0":[0.0425,0.7678,0.1329,0.01667,0,"#C8E3FF",1],"v0":[0.0425,0.7856,0.1323,0.03333,0,"#FFFFFF",0],"l1":[0.1842,0.7678,0.1329,0.01667,0,"#C8E3FF",1],"v1":[0.1842,0.7856,0.1323,0.03333,0,"#FFFFFF",0],"l2":[0.3258,0.7678,0.1329,0.01667,0,"#C8E3FF",1],"v2":[0.3258,0.7856,0.1323,0.03333,0,"#FFFFFF",0]},"clinic":{"ed":[0.0425,0.1656,0.2687,0.03111,0,"#284A87",0],"h0":[0.0425,0.1788,0.4781,0.12328,1,"#071B64",0],"h1":[0.0425,0.3104,0.4781,0.12328,1,"#0026E1",0],"sup":[0.0425,0.4593,0.3875,0.0435,1,"#071B64",0],"dtl":[0.0494,0.6767,0.3981,0.04333,1,"#071B64",0],"cta":[0.4288,0.8533,0.0781,0.02785,1,"#FFFFFF",0],"l0":[0.0425,0.7589,0.1329,0.03,1,"#284A87",0],"v0":[0.0425,0.7856,0.1323,0.03333,0,"#071B64",0],"l1":[0.1842,0.7589,0.1329,0.03,1,"#284A87",0],"v1":[0.1842,0.7856,0.1323,0.03333,0,"#071B64",0],"l2":[0.3258,0.7589,0.1329,0.03,1,"#284A87",0],"v2":[0.3258,0.7856,0.1323,0.03333,0,"#071B64",0]},"connext":{"ed":[0.0425,0.1656,0.2687,0.03111,0,"#C8E3FF",0],"h0":[0.0425,0.1788,0.4781,0.12328,1,"#FFFFFF",0],"h1":[0.0425,0.3104,0.4781,0.12328,1,"#DCEEFF",0],"sup":[0.0425,0.4593,0.3875,0.0435,1,"#FFFFFF",0],"dtl":[0.0494,0.6767,0.3981,0.04333,1,"#FFFFFF",0],"cta":[0.4288,0.8533,0.0781,0.02785,1,"#00228E",0],"l0":[0.0425,0.7589,0.1329,0.03,1,"#C8E3FF",0],"v0":[0.0425,0.7856,0.1323,0.03333,0,"#FFFFFF",0],"l1":[0.1842,0.7589,0.1329,0.03,1,"#C8E3FF",0],"v1":[0.1842,0.7856,0.1323,0.03333,0,"#FFFFFF",0],"l2":[0.3258,0.7589,0.1329,0.03,1,"#C8E3FF",0],"v2":[0.3258,0.7856,0.1323,0.03333,0,"#FFFFFF",0]}},"wide":{"race":{"ed":[0.0358,0.2117,0.2263,0.04667,0,"#C8E3FF",0],"h0":[0.0358,0.2148,0.4132,0.1672,1,"#FFFFFF",0],"h1":[0.0358,0.3912,0.4132,0.1672,1,"#DCEEFF",0],"sup":[0.0358,0.6013,0.3263,0.06089,1,"#FFFFFF",0],"dtl":[0.0416,0.675,0.2842,0.05667,1,"#FFFFFF",0],"cta":[0.3579,0.6699,0.0758,0.0418,1,"#00228E",0],"l0":[0.0358,0.8017,0.1014,0.025,0,"#C8E3FF",1],"v0":[0.0358,0.8317,0.1009,0.045,0,"#FFFFFF",0],"l1":[0.1446,0.8017,0.1014,0.025,0,"#C8E3FF",1],"v1":[0.1446,0.8317,0.1009,0.045,0,"#FFFFFF",0],"l2":[0.2533,0.8017,0.1014,0.025,0,"#C8E3FF",1],"v2":[0.2533,0.8317,0.1009,0.045,0,"#FFFFFF",0]},"clinic":{"ed":[0.0358,0.2117,0.2263,0.04667,0,"#284A87",0],"h0":[0.0358,0.2148,0.4132,0.1672,1,"#071B64",0],"h1":[0.0358,0.3912,0.4132,0.1672,1,"#0026E1",0],"sup":[0.0358,0.6013,0.3263,0.06089,1,"#071B64",0],"dtl":[0.0416,0.675,0.2842,0.05667,1,"#071B64",0],"cta":[0.3579,0.6699,0.0658,0.0418,1,"#FFFFFF",0],"l0":[0.0358,0.7883,0.1014,0.045,1,"#284A87",0],"v0":[0.0358,0.8317,0.1009,0.045,0,"#071B64",0],"l1":[0.1446,0.7883,0.1014,0.045,1,"#284A87",0],"v1":[0.1446,0.8317,0.1009,0.045,0,"#071B64",0],"l2":[0.2533,0.7883,0.1014,0.045,1,"#284A87",0],"v2":[0.2533,0.8317,0.1009,0.045,0,"#071B64",0]},"connext":{"ed":[0.0358,0.2117,0.2263,0.04667,0,"#C8E3FF",0],"h0":[0.0358,0.2148,0.4132,0.1672,1,"#FFFFFF",0],"h1":[0.0358,0.3912,0.4132,0.1672,1,"#DCEEFF",0],"sup":[0.0358,0.6013,0.3263,0.06089,1,"#FFFFFF",0],"dtl":[0.0416,0.675,0.2842,0.05667,1,"#FFFFFF",0],"cta":[0.3579,0.6699,0.0658,0.0418,1,"#00228E",0],"l0":[0.0358,0.7883,0.1014,0.045,1,"#C8E3FF",0],"v0":[0.0358,0.8317,0.1009,0.045,0,"#FFFFFF",0],"l1":[0.1446,0.7883,0.1014,0.045,1,"#C8E3FF",0],"v1":[0.1446,0.8317,0.1009,0.045,0,"#FFFFFF",0],"l2":[0.2533,0.7883,0.1014,0.045,1,"#C8E3FF",0],"v2":[0.2533,0.8317,0.1009,0.045,0,"#FFFFFF",0]}}};
const SP_DEFS = {"race":{"ed":"[ไตรมาส / รอบการแข่งขัน]","h0":"พิชิตทีละเป้า","h1":"ก้าวสู่ Prime","sup":"ทุก Milestone พาคุณเข้าใกล้คุณวุฒิ","dtl":"[วันเริ่ม–วันสิ้นสุด]","cta":"ดูกติกา","l0":"MILESTONE 01","v0":"[เป้าหมายแรก]","l1":"MILESTONE 02","v1":"[เป้าหมายถัดไป]","l2":"MILESTONE 03","v2":"[เป้าหมายรอบนี้]"},"clinic":{"ed":"[ครั้งที่ / รุ่น]","h0":"เปิดบทสนทนา","h1":"อ่านโจทย์ลูกค้า","sup":"ฝึกถามจากเคสจริง","dtl":"[วัน / เวลา]  •  [ห้อง / สถานที่]","cta":"จองที่นั่ง","l0":"หัวข้อ Skill Lab","v0":"[หัวข้อฝึก]","l1":"โค้ช","v1":"[ชื่อโค้ช]","l2":"สิ่งที่จะได้ฝึก","v2":"[กิจกรรมลงมือทำ]"},"connext":{"ed":"[EP. / ครั้งที่]","h0":"จากเคสจริง","h1":"สู่แนวทางที่ใช้ได้","sup":"ฟังประสบการณ์จากคนทำงานจริง","dtl":"[วัน / เวลา]  •  [สถานที่ / ช่องทาง]","cta":"ลงทะเบียน","l0":"วิทยากรหลัก","v0":"[ชื่อ / ตำแหน่ง]","l1":"ผู้ร่วมเสวนา","v1":"[ชื่อ / ตำแหน่ง]","l2":"ช่วงสำคัญ","v2":"[ไฮไลต์งาน]"}};
const SP_FIELDS = [['ed', 'รอบ / ครั้งที่'], ['h0', 'หัวข้อ บรรทัด 1'], ['h1', 'หัวข้อ บรรทัด 2'], ['sup', 'ข้อความสนับสนุน'], ['dtl', 'วัน เวลา สถานที่'], ['cta', 'ข้อความบนปุ่ม']];
const spOn = () => SDOC.mode === 'prime';
const spVals = (series, old, oldSeries) => { const d = SP_DEFS[series], od = oldSeries ? SP_DEFS[oldSeries] : {}, v = {}; Object.keys(d).forEach(k => { v[k] = old && old[k] != null && old[k] !== od[k] ? old[k] : d[k]; }); return v; };   // keep what the person typed, swap untouched sample text for the new series' samples

/* ---------- layers ---------- */
function spTextLayers(series, fmt, v) {
  const fm = PB_FORMATS[fmt], W = fm[2], H = fm[3], sp = SP_SPEC[fmt][series], ctaMax = Math.max(...Object.values(SP_SPEC[fmt]).map(s => s.cta[2])) * 1.12;
  const fb = !sdFontOk(sdFontCfg().thai), fk = fb ? .86 : 1;   // the masters are set in DB Helvethaica X; the stand-in Thai face runs larger and higher, so it is set a little smaller and lower
  return Object.entries(sp).map(([k, [x, y, w, s, b, c, en]]) => {
    const val = String(v[k] == null ? '' : v[k]), pair = /^[lv]\d$/.test(k) ? String(v['v' + k[1]] || '').trim() : val.trim();
    const L = { id: sdId(), t: 'text', role: 'p-' + k, text: val, size: s * H * fk, weight: b ? 700 : en ? 600 : 400, font: 'body', color: c, lh: 1.2, auto: true, x: x * W, y: y * H + (fb ? s * H * .1 : 0), pMax: (k === 'cta' ? ctaMax : w) * W, pBase: s * H * fk, pTxt: null, hide: !pair };
    if (k === 'cta') L.pCx = (x + w / 2) * W;
    return L;
  });
}
function spApply(series, fmt) {   // (re)build the poster from the master; pictures and extra pieces the person added are kept
  const of = PB_FORMATS[SDOC.format], nf = PB_FORMATS[fmt], kx = nf[2] / of[2], ky = nf[3] / of[3], ks = Math.min(kx, ky), was = SDOC.prime;
  const user = (was ? SDOC.layers.filter(L => !L.role || L.role === 'user') : []).map(L => ({ ...L, x: L.x * kx, y: L.y * ky, w: L.w * ks, h: (L.h || 0) * ks, ...(L.size ? { size: L.size * ks } : {}) }));
  const v = spVals(series, (was && was.v) || SDOC.primeDraft, was && was.series), W = nf[2], H = nf[3], base = `assets/prime/${fmt}/${series}`;
  const img = (role, src) => ({ id: sdId(), t: 'img', role, lock: true, src, x: 0, y: 0, w: W, h: H, r: 0 });
  sdPush();
  SDOC.format = fmt; SDOC.prime = { series, v }; SDOC.brief = null; SDOC.design = 'prime_' + series; SDOC.bg = { c1: '#00008F', c2: '#0C0E45' }; SDOC.over = false; SDOC.edited = false; SDOC.warn = []; SDOC.dropped = '';
  SDOC.layers = [img('p-bg', base + '-bg.jpg'), ...user.filter(L => L.pBehind), img('p-fg', base + '-fg.png'), ...spTextLayers(series, fmt, v), ...user.filter(L => !L.pBehind)];
  SDOC.layers.forEach(sdM); SD_SEL = null; sdChanged(true); sdFull();
  sdLogosReady().then(() => sdPaint());
}
const _spTextBase = SD_DRAW.text;
SD_DRAW.text = function (k, L, draw) {   // master texts stay on one line inside their slot: shrink to fit when the words change (wrap and flag it if still too long); the button label stays centred
  if (L.pMax && L.pTxt !== L.text) { if (L.pBase) L.size = L.pBase; _spTextBase(k, L, false); L.auto = true; while (L.w > L.pMax && L.size > (L.pBase || L.size) * .6) { L.size *= .96; _spTextBase(k, L, false); } L.pWrap = L.w > L.pMax; if (L.pWrap) { L.auto = false; L.w = L.pMax; _spTextBase(k, L, false); } if (L.pCx != null) L.x = L.pCx - L.w / 2; L.pTxt = L.text; }
  return _spTextBase(k, L, draw);
};
function spSet(k, val) {   // a form field changed → the matching text on the poster
  if (!SDOC.prime) return; SDOC.prime.v[k] = val;
  const L = SDOC.layers.find(x => x.role === 'p-' + k); if (!L) return;
  L.text = val; L.pTxt = null; sdM(L);
  if (/^[lv]\d$/.test(k)) { const on = !!String(SDOC.prime.v['v' + k[1]] || '').trim(); ['l', 'v'].forEach(p => { const X = SDOC.layers.find(x => x.role === 'p-' + p + k[1]); if (X) X.hide = !on; }); } else L.hide = !val.trim();
  sdChanged();
}
const _spToBrief = sdLayerToBrief;
sdLayerToBrief = function (L) {   // typed on the poster → keep the form in step
  if (SDOC.prime && L && /^p-/.test(L.role || '')) { const k = L.role.slice(2); SDOC.prime.v[k] = L.text; const f = $(`[data-sp="${k}"]`); if (f && f.value !== L.text) f.value = L.text; return; }
  return _spToBrief(L);
};

/* ---------- checks: the masters carry their own palette, so the Prime poster is checked for what people forget ---------- */
const _spCi = sdCiCheck;
sdCiCheck = function (doc) {
  if (!doc.prime) return _spCi(doc);
  const out = [], left = (doc.layers || []).filter(L => L.t === 'text' && !L.hide && /\[[^\]]*\]/.test(L.text || ''));
  if (left.length) out.push({ level: 'error', text: `ยังมี ${left.length} ช่องที่เป็นตัวอย่างใน [วงเล็บ] — ใส่ข้อมูลจริงหรือลบออก` });
  if ((doc.layers || []).some(L => L.t === 'text' && L.color && !SP_PAL.some(c => c[0].toLowerCase() === String(L.color).toLowerCase()) && !/^#(c8e3ff|284a87)$/i.test(L.color))) out.push({ level: 'warn', text: 'มีสีตัวอักษรนอกชุดสี AXA Prime (Royal Blue · Deep Royal · Ice Blue · White)' });
  if ((doc.layers || []).some(L => L.t === 'text' && !L.hide && L.pWrap)) out.push({ level: 'warn', text: 'มีข้อความยาวเกินพื้นที่ของต้นแบบ — ทำให้สั้นลง หรือแบ่งเป็น 2 บรรทัด' });
  return out;
};
const _spQa = sdDesignQa;
sdDesignQa = function (doc) { const r = _spQa(doc); return doc.prime ? r.filter(x => !/ซ้อนทับ|เล็กเกินไป/.test(x.text)) : r; };   // the master's own tight stacking and small labels are intended

/* ---------- actions ---------- */
ACT.spMode = async el => {
  const to = el.dataset.id === 'prime';
  if (to === spOn()) return;
  if (SDOC.layers.length && !(await confirmBox(to ? 'เปลี่ยนไปทำโปสเตอร์ AXA Prime? โปสเตอร์ที่ทำอยู่จะถูกเก็บไว้ใน “งานของฉัน”' : 'กลับไปทำโปสเตอร์ทั่วไป? โปสเตอร์ AXA Prime ที่ทำอยู่จะถูกเก็บไว้ใน “งานของฉัน”', 'เปลี่ยน'))) return;
  if (SDOC.layers.length) sdSaveDraft(true);
  const keep = { text: SDOC.text, guide: SDOC.guide, qr: SDOC.qr }; SDOC = { ...sdBlankDoc(), ...keep, mode: to ? 'prime' : '' };
  if (to) { SDOC.format = 'square'; SDOC.primeSeries = 'race'; }
  SD_SEL = null; SD_UNDO = []; SD_REDO = []; sdLS.set('cur', SDOC); sdFull();
};
const spSeries = () => (SDOC.prime && SDOC.prime.series) || SDOC.primeSeries || 'race';
ACT.spSeries = el => { SDOC.primeSeries = el.dataset.id; if (SDOC.prime) spApply(el.dataset.id, SDOC.format); else sdFull(); };
ACT.spFmt = el => { const f = el.dataset.id; if (!SP_FMTS.includes(f)) return; if (SDOC.prime) spApply(SDOC.prime.series, f); else { SDOC.format = f; sdFull(); } };
ACT.spGo = () => { spApply(spSeries(), SP_FMTS.includes(SDOC.format) ? SDOC.format : 'square'); toast('สร้างโปสเตอร์ AXA Prime แล้ว — แก้ข้อความในช่องด้านซ้าย หรือแตะบนโปสเตอร์เพื่อพิมพ์แก้'); if (matchMedia('(max-width: 900px)').matches) $('#sdStage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACT.spReset = async () => { if (!SDOC.prime || !(await confirmBox('คืนข้อความและตำแหน่งทั้งหมดเป็นค่าตั้งต้นของต้นแบบ?', 'คืนค่า'))) return; const s = SDOC.prime.series; SDOC.prime = null; SDOC.layers = SDOC.layers.filter(L => !L.role || L.role === 'user'); spApply(s, SDOC.format); };
ACT.spPhoto = async () => {   // a cut-out person or a venue picture goes between the background and the brand overlay
  if (!SDOC.prime) return toast('สร้างโปสเตอร์ AXA Prime ก่อน', 'error');
  const p = await sePickPhoto(); if (!p) return;
  const fm = sdFmt(), W = fm[2], H = fm[3], wide = W / H > 1.2, h = H * (wide ? .78 : .46), w = Math.min(h * p.w / p.h, W * (wide ? .42 : .6)), hh = w * p.h / p.w;
  const L = { id: sdId(), t: 'img', role: 'user', pBehind: true, fit: 'contain', src: p.src, x: W * (wide ? .74 : .68) - w / 2, y: (wide ? H * .98 : H * .76) - hh, w, h: hh, r: 0 };
  sdPush(); SDOC.layers.splice(1 + SDOC.layers.filter(x => x.pBehind).length, 0, L); SD_SEL = L.id; SDOC.edited = true; sdChanged(); sdProps();
  toast('วางภาพหลังกราฟิกแบรนด์แล้ว — ลากเพื่อจัดตำแหน่ง ลากมุมเพื่อย่อขยาย (ภาพไม่ถูกเก็บในระบบ)');
};
ACT.spFill = async () => {   // read a pasted message and fill the slots (team AI when connected, built-in reader otherwise)
  const text = (SDOC.text || '').trim(); if (!text) { toast('วางข้อความประกาศในช่องก่อน', 'error'); $('#spText')?.focus(); return; }
  const btn = $('#spFillBtn'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังอ่านข้อความ…'; }
  let b = null;
  if (Store.mode === 'server' && SDOC.useAI !== false && !(SD_AI && SD_AI.usage && SD_AI.usage.limited)) {
    try { const r = await fetch('api/ai-brief', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ text, format: 'square', guide: `โปสเตอร์ซีรีส์ ${SP_SERIES[spSeries()][0]} ของ AXA Prime: หัวข้อ 2 บรรทัดสั้น ๆ`, design: 'auto', accent: 'auto', today: today() }) }); if (r.ok) { const j = await r.json(); b = sdNormBrief(j.result); if (j.usage && SD_AI) SD_AI.usage = j.usage; } } catch (e) { console.warn('prime fill', e); }
  }
  if (!b) b = sdNormBrief(sdLocalBrief(text));
  const v = { ...spVals(spSeries(), SDOC.prime && SDOC.prime.v, SDOC.prime && SDOC.prime.series) }, when = [b.date, b.time].filter(Boolean).join(' ');
  if (b.headline[0]) { v.h0 = b.headline[0]; v.h1 = b.headline[1] || ''; }
  if (b.sub) v.sup = b.sub; if (b.kicker) v.ed = b.kicker;
  if (when || b.venue) v.dtl = [when, b.venue].filter(Boolean).join('  •  ');
  if (b.cta) v.cta = b.cta;
  b.points.slice(0, 3).forEach((p, i) => { if (p.title || p.body) v['v' + i] = p.title || p.body; });
  SDOC.prime = { series: spSeries(), v }; SDOC.layers = SDOC.layers.filter(L => !L.role || L.role === 'user');
  const warn = sdFactWarn(text, { ...b, headline: [v.h0, v.h1], sub: v.sup, points: b.points });
  spApply(spSeries(), SP_FMTS.includes(SDOC.format) ? SDOC.format : 'square'); SDOC.warn = warn; sdPaint();
  toast('เติมช่องจากข้อความแล้ว — ตรวจวันที่ ตัวเลข และชื่อก่อน Export');
};

/* ---------- panel ---------- */
function spCard() {
  const on = spOn(), s = spSeries(), v = (SDOC.prime && SDOC.prime.v) || { ...spVals(s), ...(SDOC.primeDraft || {}) }, made = !!SDOC.prime;
  const mode = `<div class="sp-mode" role="group" aria-label="ประเภทโปสเตอร์"><button type="button" class="${on ? '' : 'on'}" data-act="spMode" data-id="std" aria-pressed="${!on}">โปสเตอร์ทั่วไป</button><button type="button" class="${on ? 'on' : ''}" data-act="spMode" data-id="prime" aria-pressed="${on}"><img src="assets/brand/axa-prime-logo-blue.png" alt="" onerror="this.remove()">AXA Prime</button></div>`;
  if (!on) return mode;
  const inp = (k, label, ph) => `<label class="field"><span>${label}</span><input data-sp="${k}" value="${esc(v[k] || '')}" placeholder="${esc(ph || SP_DEFS[s][k] || '')}"></label>`;
  return `${mode}
    <h3><span class="pb-n">1</span>เลือกซีรีส์ AXA Prime</h3>
    <div class="sp-series">${Object.entries(SP_SERIES).map(([k, x]) => `<button type="button" class="${k === s ? 'on' : ''}" data-act="spSeries" data-id="${k}" aria-pressed="${k === s}"><i style="background-image:url(assets/prime/square/${k}-fg.png),url(assets/prime/square/${k}-bg.jpg)"></i><b>${x[0]}</b><small>${x[1]}</small></button>`).join('')}</div>
    <p class="small muted sp-need">เตรียมข้อมูล: ${SP_SERIES[s][2]}</p>
    <div class="sd-sub">ขนาด <small class="muted">— ตามต้นแบบ Canva ของทีม</small></div>
    <div class="seg-chips sd-fmts sp-fmts">${SP_FMTS.map(k => { const f = PB_FORMATS[k]; return `<button type="button" class="${k === SDOC.format ? 'on' : ''}" data-act="spFmt" data-id="${k}" title="${f[2]}×${f[3]} · ${f[4]}"><i style="aspect-ratio:${f[2]}/${f[3]}"></i>${f[0]} ${f[1]}</button>`; }).join('')}</div>
    <details class="sd-more sp-paste" ${SDOC.text ? 'open' : ''}><summary>มีข้อความประกาศอยู่แล้ว? วางให้ระบบเติมช่องให้</summary><textarea id="spText" rows="4" maxlength="8000" placeholder="วางข้อความจากอีเมล / LINE …">${esc(SDOC.text || '')}</textarea><button type="button" class="btn btn-ghost btn-sm" id="spFillBtn" data-act="spFill">${ico('sparkles', 14)} เติมช่องจากข้อความนี้</button></details>
    <div class="sd-sub">ข้อความบนโปสเตอร์ <small class="muted">— เว้นว่าง = ไม่แสดง</small></div>
    <div class="form-grid sp-form">${SP_FIELDS.map(([k, l]) => inp(k, l)).join('')}
      ${[0, 1, 2].map(i => `<div class="sp-pair full"><label class="field"><span>หัวช่อง ${i + 1}</span><input data-sp="l${i}" value="${esc(v['l' + i] || '')}"></label><label class="field"><span>ข้อมูลช่อง ${i + 1}</span><input data-sp="v${i}" value="${esc(v['v' + i] || '')}" placeholder="${esc(SP_DEFS[s]['v' + i])}"></label></div>`).join('')}</div>
    <div class="btn-row mt"><button type="button" class="btn btn-primary sd-go" data-act="spGo">${ico('sparkles', 16)} ${made ? 'จัดวางใหม่ตามต้นแบบ' : 'สร้างโปสเตอร์ AXA Prime'}</button>${made ? `<button type="button" class="btn btn-ghost" data-act="spPhoto">${ico('image', 15)} ใส่ภาพคน / สถานที่</button><button type="button" class="btn btn-ghost btn-sm" data-act="spReset">คืนค่าต้นแบบ</button>` : ''}</div>
    <p class="small muted mt">ภาพที่ใส่จะอยู่หลังกราฟิกแบรนด์ตามกติกาของต้นแบบ (ข้อความ › กราฟิกแบรนด์ › ภาพ › พื้นหลัง) · ใช้ภาพไดคัต PNG จะสวยที่สุด</p>`;
}
const _spViewBase = V.poster;
V.poster = (root, force) => {
  const had = !!$('#sdRoot', root); _spViewBase(root, force);
  if (had && !force) return;
  const R = $('#sdRoot', root), left = $('.sd-left', root); if (!R || !left) return;
  R.classList.toggle('sp-on', spOn());
  let card = $('#spCard', root); if (!card) { card = document.createElement('section'); card.id = 'spCard'; card.className = 'card sd-step sp-card'; left.insertAdjacentElement('afterbegin', card); }
  card.innerHTML = spCard();
  card.addEventListener('input', e => { const t = e.target; if (t.dataset.sp) { if (SDOC.prime) spSet(t.dataset.sp, t.value); else { SDOC.primeDraft = { ...(SDOC.primeDraft || {}), [t.dataset.sp]: t.value }; } } else if (t.id === 'spText') { SDOC.text = t.value; } });
  $$('#sdStep1 .sd-fmts [data-id]', root).forEach(b => { b.hidden = !SP_STD_FMTS.includes(b.dataset.id); });   // A4 and 19:6 belong to the Prime masters
  if (!spOn() && !SP_STD_FMTS.includes(SDOC.format)) SDOC.format = 'portrait';
};
