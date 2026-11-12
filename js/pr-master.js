'use strict';

const PR_FORMATS = ['portrait', 'square'];
const PR_EXAMPLE = 'เชิญร่วม Prime Clinic\nหัวข้อ: เทคนิคปิดเคสใหญ่\nวิทยากร: คุณกานต์ ตัวอย่าง\nวันที่: 21 พฤศจิกายน 2569\nเวลา: 09.00–11.00 น.\nสถานที่: ผ่าน Zoom\nCTA: ลงทะเบียนกับทีม Agency';
const PR_FIELDS = [
  ['headline', 'หัวเรื่อง', 160], ['sub', 'ข้อความรอง', 220], ['person', 'ชื่อบุคคล', 110],
  ['date', 'วันที่', 85], ['time', 'เวลา', 65], ['venue', 'สถานที่ / ช่องทาง', 110],
  ['cta', 'ข้อความชวนให้ลงมือทำ', 120], ['note', 'เงื่อนไข / หมายเหตุ', 200],
];
const PR_TYPES = { event: 'Prime Clinic / Event Invitation', recognition: 'Prime Recognition', campaign: 'Campaign / Sales Rally' };
let prState;

function prExtract(source, ai, requestedType, fromPowerPoint = false) {
  const local = sdLocalBrief(source);
  const tags = {
    headline: 'หัวข้อ(?:หลัก|เรื่อง)?|headline',
    sub: 'ข้อความรอง|subtitle',
    person: 'ชื่อบุคคล|ชื่อวิทยากร|วิทยากร|ผู้ได้รับรางวัล|ผู้รับรางวัล|speaker|recipient',
    date: 'วันที่|date', time: 'เวลา|time', venue: 'สถานที่|venue',
    cta: 'cta|ข้อความชวนให้ลงมือทำ|ลงทะเบียน|สมัคร', note: 'เงื่อนไข|หมายเหตุ|note',
  };
  const explicit = key => source.match(new RegExp('^(?:' + tags[key] + ')\\s*[:：]\\s*([^\\n]+)', 'im'))?.[1].trim() || '';
  const exact = value => typeof value === 'string' && source.includes(value.trim()) ? value.trim() : '';
  const hasOriginalNumbers = text => pbFacts(text).every(n => pbFacts(source).includes(n));
  const rawHead = Array.isArray(ai?.headline) ? ai.headline.filter(v => typeof v === 'string').join(' ') : '';
  const head = explicit('headline') || (rawHead && hasOriginalNumbers(rawHead) ? rawHead : '')
    || local.headline.join(' ') || source.split('\n')[0];
  const inferred = /recognition|ขอแสดงความยินดี|ยินดีกับ|มอบรางวัล|ผู้(?:ได้)?รับรางวัล|wall of honor/i.test(source)
    || ai?.kind === 'recognition' || local.kind === 'recognition';
  const campaign = ai?.kind === 'campaign' || /แคมเปญ|เปิดเกมรุก|sales rally/i.test(source);
  const kind = requestedType !== 'auto' ? requestedType : inferred ? 'recognition' : campaign ? 'campaign' : 'event';
  const date = explicit('date') || exact(local.date) || exact(ai?.date);
  const time = explicit('time') || exact(local.time) || exact(ai?.time);
  const person = explicit('person') || source.match(/(?:^|\s)(?:วิทยากร(?:คือ|โดย)?|ผู้(?:ได้)?รับรางวัล(?:คือ)?)\s*(คุณ[^\n,·]+?)(?=\s+(?:วันที่|วัน[จอพศส]|เวลา|สถานที่|ณ |ผ่าน |ที่ )|[\n,·]|$)/i)?.[1].trim() || '';
  const localSub = exact(local.sub);
  const sub = explicit('sub') || (Object.values(tags).some(tag => new RegExp('^(?:' + tag + ')\\s*[:：]', 'i').test(localSub))
    || localSub === head ? '' : localSub);
  const kicker = kind === 'recognition' ? 'Prime Recognition' : /\bprime clinic\b/i.test(source) ? 'Prime Clinic' : 'KTAXA Prime';
  const photoFirst = /เน้น(?:ภาพ|รูป)(?:คน|บุคคล|วิทยากร)?|โทน(?:สี)?(?:น้ำเงินเข้ม|royal blue)|portrait[- ]led/i.test(source);
  const editorialFirst = /เน้นหัว(?:เรื่อง|ข้อ)|พื้น(?:หลัง)?(?:สี)?ขาว|editorial/i.test(source);
  const ranked = ai?.designs?.[0];
  const preferPortrait = fromPowerPoint && ['feature', 'circles'].includes(ranked);
  const first = photoFirst || (!editorialFirst && (preferPortrait || kind === 'recognition' || kind === 'campaign')) ? 'pr-portrait' : 'pr-editorial';
  const direction = fromPowerPoint && Array.isArray(ai?.review)
    ? String(ai.review.find(item => item?.by === 'design')?.note || '').slice(0, 240) : '';
  return {
    ...sdEmptyBrief(), kind, headline: [head], kicker,
    sub, date, time, venue: explicit('venue') || exact(ai?.venue) || exact(local.venue),
    cta: explicit('cta') || exact(local.cta) || exact(ai?.cta), note: explicit('note') || exact(local.note) || exact(ai?.note) || pbBrand().footer || '',
    emph: -1, designs: [first, ...Object.keys(PR_LAYOUTS).filter(id => id !== first)],
    by: ai ? 'ai' : 'auto', pr: { person, direction, fromPowerPoint },
  };
}

function prHasTransparency(image) {
  const scale = Math.min(1, 96 / Math.max(image.naturalWidth, image.naturalHeight));
  const sample = document.createElement('canvas');
  sample.width = Math.max(1, Math.round(image.naturalWidth * scale));
  sample.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = sample.getContext('2d');
  ctx.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
  let transparent = 0, visible = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 24) transparent++;
    if (pixels[i] > 127) visible++;
  }
  return visible > 0 && transparent >= sample.width * sample.height * .01;
}

async function prPhotoMemory(src, cutout) {
  const image = new Image();
  image.src = src;
  try { await image.decode(); } catch { throw new Error('อ่านรูปนี้ไม่ได้'); }
  const id = 'mem:' + sdId();
  const photo = { src: id, cutout: cutout ?? prHasTransparency(image), width: image.naturalWidth, height: image.naturalHeight };
  SE_MEM.set(id, src);
  PB_IMG.set(src, image);
  return photo;
}

function prReleasePhoto(photo) {
  const src = SE_MEM.get(photo?.src);
  if (!src) return;
  URL.revokeObjectURL(src);
  PB_IMG.delete(src);
  SE_MEM.delete(photo.src);
}

async function prProcessPhoto(file, useAdobe, signal) {
  if (!file) return { photo: null, message: '' };
  const url = URL.createObjectURL(file);
  let original;
  try { original = await prPhotoMemory(url, file.type === 'image/jpeg' ? false : undefined); }
  catch (error) { URL.revokeObjectURL(url); throw error; }
  if (original.cutout) return { photo: original, message: 'จัดวางรูปพื้นหลังโปร่งใสแล้ว' };
  if (useAdobe) {
    try {
      const data = await pbLoadImage(file, 1400, false);
      const response = await fetch('api/pr-photo', {
        method: 'POST', headers: Store.headers(true), body: JSON.stringify({ photo: data }), signal,
      });
      const result = await response.json();
      if (!response.ok || !/^data:image\/png;base64,/.test(result.photo)) throw new Error('Adobe processing failed');
      const photo = await prPhotoMemory(result.photo, true);
      prReleasePhoto(original);
      return { photo, message: 'ตัดพื้นหลังด้วย Adobe Photoshop แล้ว' };
    } catch (error) {
      if (signal.aborted) { prReleasePhoto(original); throw error; }
      return { photo: original, message: 'Adobe ตัดพื้นหลังไม่สำเร็จ จึงใช้รูปเดิม' };
    }
  }
  return { photo: original, message: '' };
}

async function prReferenceSheet(files) {
  if (!files.length) return '';
  const width = 960, columns = Math.min(files.length, 4), rows = Math.ceil(files.length / columns);
  const cell = Math.max(1, Math.floor(Math.min(width / columns, 1440 / rows)));
  const canvas = document.createElement('canvas');
  canvas.width = columns * cell; canvas.height = rows * cell;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  let drawn = 0;
  for (const [index, file] of files.entries()) {
    const image = new Image(), url = URL.createObjectURL(file);
    try {
      image.src = url;
      await image.decode();
      const scale = Math.min(cell * .94 / image.naturalWidth, cell * .94 / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      const x = (index % columns) * cell, y = Math.floor(index / columns) * cell;
      ctx.drawImage(image, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
      ctx.fillStyle = '#00008F'; ctx.fillRect(x, y, 34, 25);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(String(index + 1), x + 4, y + 18);
      drawn++;
    } catch { /* A broken embedded picture does not prevent the remaining images from being used. */ }
    finally { URL.revokeObjectURL(url); }
  }
  return drawn ? canvas.toDataURL('image/jpeg', .76).split(',')[1] : '';
}

async function prLoadSlideAssets(entries, plan, currentFile) {
  const visual = {};
  const choices = new Map((Array.isArray(plan) ? plan : []).filter(item => Number.isInteger(item?.id)
    && ['background', 'hero', 'accent', 'reference'].includes(item.role)).map(item => [item.id, item.role]));
  const candidates = await Promise.all(entries.map(async ({ file, role }, index) => {
    if (role === 'reference' || file === currentFile) return null;
    const suggested = role === 'auto' ? choices.get(index + 1) : role;
    if (suggested === 'reference') return null;
    const url = URL.createObjectURL(file);
    try {
      const photo = await prPhotoMemory(url);
      const ratio = photo.width / photo.height;
      const fallback = photo.cutout && ratio < .82 && photo.height >= 250 ? 'hero'
        : !photo.cutout && ratio >= 1.45 && photo.width >= 650 ? 'background' : 'reference';
      return { photo, role: suggested || fallback, manual: role !== 'auto' };
    } catch { URL.revokeObjectURL(url); return null; }
  }));
  candidates.filter(Boolean).sort((a, b) => Number(b.manual) - Number(a.manual)).forEach(({ photo, role }) => {
    if (role === 'reference' || visual[role] || (role === 'hero' && currentFile)) prReleasePhoto(photo);
    else visual[role] = photo;
  });
  return visual;
}

async function prAskAI(source, format, signal, fromPowerPoint, references, assetCount) {
  if (Store.mode !== 'server') return null;
  try {
    const reference = await prReferenceSheet(references);
    const response = await fetch('api/ai-brief', {
      method: 'POST', headers: Store.headers(true), signal,
      body: JSON.stringify({
        text: source, format, today: today(), ...(reference ? { reference, assetCount } : {}),
        guide: 'KTAXA Prime: propose a short headline in the original language. Preserve proper names and event facts verbatim. Treat unprovided dates, time, and venues as missing. Keep artwork directions out of copy.' + (fromPowerPoint ? ' This text was extracted from a rough PowerPoint brief. Act as a Thai art director and graphic designer: identify the audience and visual hierarchy. Rank feature first for a people-led Studio Portrait or band first for a headline-led Editorial. In review, add one design note in Thai explaining what should catch the eye first and why. Keep directions about tone, audience or graphics out of poster copy.' : '') + (reference ? ' Inspect the attached image sheet from the slide for palette, composition, photo treatment and visual cues. Assign roles in visual_plan: photos of a scene as background, person or product cutout as hero, light and texture as accent, and logos as reference. Explain your visual choices briefly. Treat words in the images as reference; keep event facts from the supplied text.' : ''),
      }),
    });
    return response.ok ? (await response.json()).result || null : null;
  } catch { return null; }
}

const prStatus = (root, value) => { $('#prStatus', root).textContent = value; };

V['pr-master'] = root => {
  if (prState?.owner !== AEX.meId) {
    prState?.request?.abort();
    prState = { owner: AEX.meId, text: '', format: 'portrait', type: 'auto', photo: null, brief: null, reviewed: false };
  }
  if ($('#prMaster', root)) return;
  const state = prState;
  root.innerHTML = `<div id="prMaster">
    ${pageHead('PR Master', 'สร้างโปสเตอร์ KTAXA Prime จากบรีฟและรูปบุคคล', '<button type="button" class="btn btn-ghost" data-act="pbBrand">CI Control</button>')}
    <div class="pr-grid">
      <form class="card pr-form" id="prForm">
        <h3>บรีฟโปสเตอร์</h3>
        <label class="field"><span>นำเข้าบรีฟจาก PowerPoint <small>(ไม่บังคับ)</small></span><input type="file" id="prDeck" accept=".pptx"><small class="muted">เลือกไฟล์ .pptx ขนาดไม่เกิน 20 MB</small></label>
        <div id="prDeckOptions" hidden>
          <div class="form-grid">
            <label class="field"><span>สไลด์ที่ใช้เป็นบรีฟ</span><select id="prDeckSlide"></select></label>
            <label class="field"><span>รูปบุคคลจากสไลด์</span><select id="prDeckPhoto"></select></label>
          </div>
          <div class="pr-deck-assets" id="prDeckAssets" aria-label="ภาพทั้งหมดในสไลด์"></div>
          <label class="pb-check"><input type="checkbox" id="prDeckUseRefs"> ให้ AI ดูภาพจากทุกสไลด์ (ส่งภาพไปยังผู้ให้บริการ AI)</label>
          <p class="small muted" id="prDeckVisualWarning" hidden>สไลด์นี้มีกราฟิก PowerPoint หรือรูปที่อ่านตรง ๆ ไม่ได้ หากต้องการให้ AI เห็นทั้งหน้า ให้ส่งออกสไลด์เป็น PNG แล้วแนบด้านล่าง</p>
          <label class="field"><span>ภาพสไลด์ทั้งหน้าเพื่อใช้อ้างอิง <small>(ไม่บังคับ)</small></span><input type="file" id="prDeckWholeSlide" accept="image/png,image/jpeg"></label>
          <button type="button" class="btn btn-sm btn-ghost" id="prDeckApply">ใช้สไลด์นี้</button>
        </div>
        <p class="small muted" id="prDeckStatus" role="status"></p>
        <label class="field"><span>รายละเอียดที่ต้องการสื่อสาร</span><textarea id="prText" rows="8" required maxlength="8000" placeholder="พิมพ์หัวข้อ วัน เวลา ชื่อบุคคล และสิ่งที่อยากให้คนทำต่อ">${esc(state.text)}</textarea></label>
        <button type="button" class="btn btn-sm btn-ghost" id="prExample">ใช้บรีฟตัวอย่าง</button>
        <div class="form-grid">
          <label class="field"><span>ประเภทงาน</span><select id="prType"><option value="auto">เลือกจากบรีฟ</option>${Object.entries(PR_TYPES).map(([key, label]) => `<option value="${key}" ${state.type === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
          <label class="field"><span>ขนาดภาพ</span><select id="prFormat">${PR_FORMATS.map(key => `<option value="${key}" ${state.format === key ? 'selected' : ''}>${PB_FORMATS[key][1]} · ${PB_FORMATS[key][2]} × ${PB_FORMATS[key][3]}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>รูปบุคคล <small>(ไม่บังคับ)</small></span><input type="file" id="prPhoto" accept="image/jpeg,image/png,image/webp"><small id="prPhotoName">${esc(state.file?.name || 'JPG, PNG หรือ WebP · สูงสุด 15 MB')}</small></label>
        <label class="pb-check" id="prAdobeRow" hidden><input type="checkbox" id="prAdobe" checked> ตัดพื้นหลังด้วย Adobe Photoshop</label>
        <small id="prAdobeInfo" class="muted"></small>
        <div class="pr-adobe-express">
          <a href="https://www.adobe.com/express/feature/image/remove-background" target="_blank" rel="noopener noreferrer">ตัดพื้นหลังใน Adobe Express (เปิดแท็บใหม่)</a>
          <small class="muted">อัปโหลดรูปใน Adobe Express แล้วดาวน์โหลด PNG โปร่งใสมาแนบที่นี่</small>
        </div>
        <button class="btn btn-primary" id="prGenerate" type="submit">${ico('sparkles', 16)} สร้างโปสเตอร์</button>
        <p class="small muted" id="prStatus" role="status" aria-live="polite"></p>
      </form>
      <section class="card pr-result" id="prResult" aria-label="ตัวอย่างโปสเตอร์"></section>
    </div></div>`;
  const app = $('#prMaster', root), form = $('#prForm', app);
  prBindPowerPoint(app, state);
  if (state.message) prStatus(app, state.message);
  $('#prText', app).oninput = e => { state.text = e.target.value; };
  $('#prType', app).onchange = e => { state.type = e.target.value; };
  $('#prFormat', app).onchange = e => {
    state.format = e.target.value;
    state.reviewed = false;
    if (state.brief) prResult(app, state);
  };
  $('#prExample', app).onclick = () => { state.fromPowerPoint = false; state.slideImages = []; state.slideAssets = []; $('#prDeckWholeSlide', app).value = ''; $('#prText', app).value = state.text = PR_EXAMPLE; };
  $('#prPhoto', app).onchange = e => {
    const file = e.target.files[0];
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15e6)) {
      e.target.value = '';
      prStatus(app, 'เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 15 MB');
      return;
    }
    state.file = file || null;
    $('#prPhotoName', app).textContent = file?.name || 'JPG, PNG หรือ WebP · สูงสุด 15 MB';
    prStatus(app, '');
  };
  if (Store.mode === 'server') fetch('api/pr-photo', { headers: Store.headers() })
    .then(r => r.ok ? r.json() : null).then(data => {
      $('#prAdobeRow', app).hidden = !data?.adobe;
      $('#prAdobeInfo', app).textContent = data?.adobe ? 'เมื่อเลือกตัดพื้นหลัง ระบบจะส่งรูปไปประมวลผลกับ Adobe' : 'ใช้รูปต้นฉบับหรือ PNG โปร่งใสได้';
    }).catch(() => { $('#prAdobeInfo', app).textContent = 'ตรวจสถานะ Adobe ไม่สำเร็จ · ระบบจัดวางรูปต้นฉบับได้'; });
  form.onsubmit = async event => {
    event.preventDefault();
    const source = state.text.trim();
    if (!source || state.request) return;
    const request = new AbortController();
    state.request = request;
    const controls = [...form.elements].filter(el => !el.disabled);
    controls.forEach(el => { el.disabled = true; });
    prStatus(app, 'กำลังอ่านบรีฟและจัดวางโปสเตอร์…');
    try {
      const useAdobe = !$('#prAdobeRow', app).hidden && $('#prAdobe', app).checked;
      const whole = $('#prDeckWholeSlide', app).files[0];
      const assets = state.slideAssets || [];
      const assetFiles = assets.map(asset => asset.file);
      const referenceFiles = $('#prDeckUseRefs', app).checked && state.fromPowerPoint
        ? [...new Set([...assetFiles.slice(0, 24), ...(whole && whole.size <= 15e6 ? [whole] : []), ...(state.slideImages || [])])].slice(0, 36) : [];
      const [ai, original] = await Promise.all([
        prAskAI(source, state.format, request.signal, state.fromPowerPoint, referenceFiles, Math.min(24, assetFiles.length)),
        prProcessPhoto(state.file, useAdobe, request.signal),
      ]);
      const visual = await prLoadSlideAssets(assets, ai?.visual_plan, state.file);
      const photo = original.photo || visual.hero;
      delete visual.hero;
      if (request.signal.aborted || prState !== state) { [photo, ...Object.values(visual)].forEach(prReleasePhoto); return; }
      if (state.photo?.src !== SDOC.brief?.pr?.photo?.src) prReleasePhoto(state.photo);
      const editorVisuals = Object.values(SDOC.brief?.pr?.visual || {});
      Object.values(state.brief?.pr?.visual || {}).filter(asset => !editorVisuals.some(item => item.src === asset.src)).forEach(prReleasePhoto);
      state.photo = photo;
      state.brief = prExtract(source, ai, state.type, state.fromPowerPoint);
      state.brief.pr.photo = photo;
      state.brief.pr.visual = visual;
      state.design = state.brief.designs[0];
      state.reviewed = false;
      const active = $('#prMaster') || app;
      state.message = [ai ? 'AI อ่านบรีฟแล้ว' : 'จัดจากบรีฟด้วยเทมเพลตอัตโนมัติ', visual.background ? 'จัดฉากหลังจากภาพในสไลด์' : '', original.message].filter(Boolean).join(' · ');
      prResult(active, state);
      prStatus(active, state.message);
    } catch (error) {
      if (!request.signal.aborted) prStatus($('#prMaster') || app, error.message || 'สร้างโปสเตอร์ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      state.request = null;
      controls.forEach(el => { el.disabled = false; });
    }
  };
  prResult(app, state);
};

function prDoc(state, design = state.design) {
  const { bg, layers, over, scale } = prBuild(state.brief, design, state.format);
  return { format: state.format, design, brief: state.brief, text: state.text, bg, layers, over, fit: scale };
}

function prCheck(doc) {
  const issues = sdCiCheck(doc).map(issue => issue.text);
  const b = doc.brief, active = doc.layers.filter(layer => !layer.hide);
  const [W, H] = PB_FORMATS[doc.format].slice(2, 4);
  const headline = active.find(layer => layer.role === 'headline');
  if (!headline || !b.headline.join('').trim()) issues.push('เติมหัวเรื่อง');
  if (b.kind === 'event' && !active.some(layer => layer.role === 'date' && (SD_RE_DATE.test(pbThaiDigits(layer.text)) || /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?)$/.test(pbThaiDigits(layer.text.trim()))))) issues.push('ระบุวันที่จัดงานให้ครบ');
  if (b.kind === 'recognition' && !active.some(layer => layer.role === 'person' && layer.text.trim())) issues.push('ระบุชื่อผู้ได้รับการยกย่อง');
  const logo = active.find(layer => layer.role === 'logo' && ['color', 'bordered'].includes(layer.variant));
  const prime = active.find(layer => layer.role === 'logo' && ['prime', 'primeBlue'].includes(layer.variant));
  const clearance = logo && logo.h / 2;
  if (!logo || !prime || logo.x < clearance || logo.y < clearance || prime.x < logo.x + logo.w + clearance || W - prime.x - prime.w < prime.h / 2
    || ![logo, prime].every(layer => pbImg(sdLogoSrc(layer)))) issues.push('ตรวจโลโก้และพื้นที่ว่างรอบโลโก้');
  if (doc.over || active.some(layer => layer.t === 'text' && (layer.y < 0 || layer.x < 0 || layer.y + layer.h > H || layer.x + layer.w > W
    || sdTextLayout(SD_MK, layer).w > layer.w + 1))) issues.push('มีข้อความล้นพื้นที่ ลองย่อข้อความหรือเปลี่ยนขนาดภาพ');
  const cfg = sdFontCfg(), loaded = name => [...document.fonts].some(face => face.family.replace(/["']/g, '') === name && face.status === 'loaded');
  const text = active.filter(layer => layer.t === 'text');
  if (text.some(layer => /[A-Za-z0-9]/.test(layer.text) && (layer.ff || layer.font) === 'head') && (cfg.head !== 'Publico' || !loaded('Publico'))) issues.push('ตั้งค่าและโหลด Publico ใน CI Control');
  if (text.some(layer => /[A-Za-z0-9]/.test(layer.text) && (layer.ff || layer.font) === 'body') && (cfg.body !== 'Source Sans Pro' || !loaded('Source Sans Pro'))) issues.push('ตั้งค่า Source Sans Pro ใน CI Control');
  if (text.some(layer => /[\u0e00-\u0e7f]/.test(layer.text)) && (cfg.thai !== 'DB Helvethaica X' || !loaded('DB Helvethaica X'))) issues.push('ตั้งค่าและโหลด DB Helvethaica X ใน CI Control');
  return [...new Set(issues)];
}

async function prPrepare(doc) {
  await Promise.all([
    sdFontFiles(),
    ...doc.layers.filter(layer => layer.t === 'logo').map(async layer => {
      const src = sdLogoSrc(layer);
      pbImg(src);
      await PB_IMG.get(src)?.decode().catch(() => {});
    }),
  ]);
  const fonts = Object.values(sdFontCfg());
  await Promise.allSettled(fonts.flatMap(family => [400, 600, 700].map(weight => document.fonts.load(weight + ' 32px "' + family + '"', 'AXA ไทย'))));
}

async function prDownload(doc, format) {
  await prPrepare(doc);
  doc.layers.forEach(sdM);
  const issues = prCheck(doc);
  const cv = document.createElement('canvas');
  sdRender(cv, doc);
  if (issues.length) {
    const proceed = await confirmBox('มีจุดที่ต้องตรวจ ' + issues.join(' · ') + ' ต้องการดาวน์โหลดเป็นฉบับร่างหรือไม่?', 'ดาวน์โหลดฉบับร่าง');
    if (!proceed) return;
    const ctx = cv.getContext('2d'), h = 50;
    ctx.fillStyle = '#0C0E45'; ctx.fillRect(0, cv.height - h, cv.width, h);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '600 25px "Source Sans Pro", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('DRAFT', cv.width / 2, cv.height - 16);
  }
  const jpg = format === 'jpg';
  await pbDownload(cv, 'PR_Master_' + (issues.length ? 'DRAFT_' : '') + doc.format + '_' + today() + (jpg ? '.jpg' : '.png'), jpg ? 'image/jpeg' : 'image/png');
  toast('ดาวน์โหลดแล้ว');
}

function prResult(app, state) {
  const root = $('#prResult', app), b = state.brief;
  if (!b) {
    root.innerHTML = '<div class="pr-empty">' + ico('image', 30) + '<h3>ตัวอย่างโปสเตอร์</h3><p class="muted">พิมพ์บรีฟแล้วกดสร้างเพื่อเลือกจากสองแบบ</p></div>';
    return;
  }
  root.innerHTML = `<h3>เลือกแบบโปสเตอร์</h3>
    ${b.pr.direction ? `<p class="small muted">ทิศทางภาพจาก AI · ${esc(b.pr.direction)}</p>` : ''}
    <div class="pr-options">${b.designs.map(d => `<button type="button" data-design="${d}" aria-pressed="${d === state.design}"><canvas aria-label="${PR_LAYOUTS[d][0]}" role="img"></canvas><b>${PR_LAYOUTS[d][0]}</b></button>`).join('')}</div>
    <details class="pr-copy" open><summary>ตรวจและแก้ข้อความ</summary><div class="form-grid">${PR_FIELDS.map(([key, title, max]) => {
      const value = key === 'headline' ? b.headline.join(' ') : key === 'person' ? b.pr.person : b[key];
      return `<label class="field"><span>${title}</span><input data-pr-field="${key}" maxlength="${max}" value="${esc(value)}"></label>`;
    }).join('')}</div>
    ${b.pr.photo && (!b.pr.photo.cutout || state.design === 'pr-editorial') ? '<div class="form-grid"><label class="field"><span>จัดตำแหน่งรูปแนวนอน</span><input type="range" min="0" max="1" step=".05" value="' + (b.pr.cropX ?? .5) + '" data-crop="cropX"></label><label class="field"><span>จัดตำแหน่งรูปแนวตั้ง</span><input type="range" min="0" max="1" step=".05" value="' + (b.pr.cropY ?? (b.pr.photo.cutout ? 0 : .38)) + '" data-crop="cropY"></label></div>' : ''}
    ${b.pr.photo ? `<div class="form-grid">
      <label class="field"><span>ความสว่างของรูป</span><input type="range" min=".8" max="1.25" step=".01" value="${b.pr.exposure ?? (state.design === 'pr-portrait' ? 1.08 : 1.03)}" data-crop="exposure"></label>
      <label class="field"><span>คอนทราสต์ของรูป</span><input type="range" min=".85" max="1.25" step=".01" value="${b.pr.contrast ?? 1.04}" data-crop="contrast"></label>
    </div>` : ''}
    </details>
    <p class="small muted" id="prChecks" role="status"></p>
    <label class="pb-check"><input type="checkbox" id="prReview" ${state.reviewed ? 'checked' : ''}> ตรวจชื่อ ข้อความ และรายละเอียดแล้ว</label>
    <div class="btn-row"><button type="button" class="btn btn-primary" data-pr-download="png">PNG</button><button type="button" class="btn btn-ghost" data-pr-download="jpg">JPG</button><button type="button" class="btn btn-ghost" id="prStudio">แก้เลเยอร์ใน Poster Studio</button></div>`;
  const choose = $$('[data-design]', root), review = $('#prReview', root), downloads = $$('[data-pr-download]', root);
  const paint = () => {
    choose.forEach(button => {
      const doc = prDoc(state, button.dataset.design);
      button.setAttribute('aria-pressed', String(doc.design === state.design));
      sdRender($('canvas', button), doc, { scale: 440 / PB_FORMATS[doc.format][2] });
    });
    const issues = prCheck(prDoc(state));
    $('#prChecks', root).textContent = issues.length ? 'ก่อนเผยแพร่ · ' + issues.join(' · ') : 'ผ่านการตรวจรูปแบบ CI';
    downloads.forEach(button => { button.disabled = !state.reviewed; });
  };
  const invalidate = () => { state.reviewed = review.checked = false; paint(); };
  choose.forEach(button => { button.onclick = () => { state.design = button.dataset.design; state.reviewed = false; prResult(app, state); $('[data-design="' + state.design + '"]', root)?.focus(); }; });
  $$('[data-pr-field]', root).forEach(field => {
    field.oninput = () => {
      const key = field.dataset.prField, value = field.value.trim();
      if (key === 'headline') b.headline = value ? [value] : [];
      else if (key === 'person') b.pr.person = value;
      else b[key] = value;
      invalidate();
    };
  });
  $$('[data-crop]', root).forEach(range => { range.oninput = () => { b.pr[range.dataset.crop] = Number(range.value); invalidate(); }; });
  review.onchange = () => { state.reviewed = review.checked; downloads.forEach(button => { button.disabled = !state.reviewed; }); };
  downloads.forEach(button => { button.onclick = () => prDownload(prDoc(state), button.dataset.prDownload).catch(() => toast('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่', 'error')); });
  $('#prStudio', root).onclick = async () => {
    if (!sdBoot.done) { sdBoot(); sdBoot.done = true; }
    if (SDOC.layers.length && !sdSaveDraft(true)) {
      if (!await confirmBox('พื้นที่บันทึกฉบับร่างเต็ม ต้องการแทนที่งานที่เปิดอยู่ใน Poster Studio หรือไม่?', 'เปิดใน Poster Studio')) return;
    }
    const doc = prDoc(state);
    SDOC = { ...sdBlankDoc(), ...doc, brief: structuredClone(doc.brief), prefTheme: doc.design === 'pr-portrait' ? 'deep' : 'white' };
    SD_SEL = null; SD_UNDO = []; SD_REDO = [];
    sdChanged(true);
    location.hash = '#/poster';
  };
  paint();
  prPrepare(prDoc(state)).then(() => { if (root.isConnected && $('#prReview', root) === review) paint(); });
}
