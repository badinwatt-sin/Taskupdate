'use strict';

const PR_PPTX_NS = {
  presentation: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  drawing: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  rel: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
};
const PR_PPTX_MAX = 20e6;
const PR_PPTX_IMAGES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const prNodes = (root, ns, tag) => [...root.getElementsByTagNameNS(ns, tag)];

function prCheckPptxZip(buffer) {
  const view = new DataView(buffer);
  let end = buffer.byteLength - 22;
  const lowest = Math.max(0, end - 65535);
  for (; end >= lowest; end--) {
    if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === buffer.byteLength) break;
  }
  if (end < lowest) throw new Error('ไฟล์ PowerPoint ไม่สมบูรณ์');
  const entries = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true), total = 0;
  if (entries > 2500 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('ไฟล์ PowerPoint มีข้อมูลมากเกินไป');
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('ไฟล์ PowerPoint ไม่สมบูรณ์');
    total += view.getUint32(offset + 24, true);
    if (total > 80e6) throw new Error('ไฟล์ PowerPoint มีข้อมูลมากเกินไป');
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
}

async function prReadPptx(file) {
  if (!/\.pptx$/i.test(file.name) || file.size > PR_PPTX_MAX) throw new Error('เลือกไฟล์ .pptx ขนาดไม่เกิน 20 MB');
  const bytes = await file.arrayBuffer();
  prCheckPptxZip(bytes);
  await loadXlsx();
  const zip = XLSX.CFB.read(new Uint8Array(bytes), { type: 'array' });
  const parts = new Map(zip.FullPaths.map((path, i) => [path.slice(path.indexOf('/') + 1), zip.FileIndex[i].content]));
  const decoder = new TextDecoder();
  const xml = path => {
    const data = parts.get(path);
    if (!data?.length) return null;
    const doc = new DOMParser().parseFromString(decoder.decode(data), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('อ่านข้อมูลในสไลด์ไม่ได้');
    return doc;
  };
  const rels = path => {
    const slash = path.lastIndexOf('/'), folder = path.slice(0, slash + 1), fileName = path.slice(slash + 1);
    const doc = xml(folder + '_rels/' + fileName + '.rels');
    const map = new Map();
    for (const node of doc ? prNodes(doc, '*', 'Relationship') : []) {
      const target = node.getAttribute('Target');
      if (!target || node.getAttribute('TargetMode') === 'External') continue;
      const url = new URL(target, 'https://local.invalid/' + path);
      if (url.origin === 'https://local.invalid') map.set(node.getAttribute('Id'), url.pathname.slice(1));
    }
    return map;
  };
  const main = 'ppt/presentation.xml', deck = xml(main);
  if (!deck) throw new Error('ไม่พบสไลด์ในไฟล์ .pptx');
  const deckRels = rels(main);
  const slides = prNodes(deck, PR_PPTX_NS.presentation, 'sldId').map((id, index) => {
    const path = deckRels.get(id.getAttributeNS(PR_PPTX_NS.rel, 'id'));
    const slide = path && xml(path);
    if (!slide) return { number: index + 1, text: '', images: [] };
    const paragraphs = prNodes(slide, PR_PPTX_NS.drawing, 'p');
    const text = paragraphs.map(p => prNodes(p, PR_PPTX_NS.drawing, 't').map(t => t.textContent).join('').trim()).filter(Boolean).join('\n');
    const slideRels = rels(path);
    const sources = prNodes(slide, PR_PPTX_NS.drawing, 'blip').map(blip => slideRels.get(blip.getAttributeNS(PR_PPTX_NS.rel, 'embed')));
    const images = [...new Set(sources.filter(Boolean))].flatMap(src => {
      const type = PR_PPTX_IMAGES[src.split('.').at(-1).toLowerCase()], data = parts.get(src);
      return type && data?.length && data.length <= 15e6 ? [new File([data], src.split('/').at(-1), { type })] : [];
    });
    return { number: index + 1, text, images };
  });
  if (!slides.some(s => s.text || s.images.length)) throw new Error('ไม่พบข้อความหรือรูป JPG, PNG หรือ WebP ในสไลด์');
  return slides;
}

function prBindPowerPoint(app, state) {
  const input = $('#prDeck', app), picker = $('#prDeckSlide', app), pane = $('#prDeckOptions', app);
  const photos = $('#prDeckPhoto', app), apply = $('#prDeckApply', app), status = $('#prDeckStatus', app);
  let revision = 0;
  const slide = () => state.deck?.slides[Number(picker.value)];
  const refreshPhotos = () => {
    const item = slide();
    photos.replaceChildren(new Option('ใช้รูปที่แนบอยู่', ''));
    item?.images.forEach((file, index) => photos.add(new Option('รูป ' + (index + 1) + ' · ' + file.name, String(index))));
    photos.disabled = !item?.images.length;
    if (item?.images.length === 1 && !state.file) photos.value = '0';
    apply.disabled = !item?.text && !item?.images.length;
    status.textContent = item ? (item.text.split('\n')[0] || 'สไลด์ภาพ · เพิ่มข้อความบรีฟเองได้') : '';
  };
  const showDeck = () => {
    picker.replaceChildren();
    const slides = state.deck?.slides || [];
    pane.hidden = !slides.length;
    slides.forEach((item, index) => picker.add(new Option('สไลด์ ' + item.number + ' · ' + (item.text.split('\n')[0] || 'ภาพประกอบ').slice(0, 70), String(index))));
    if (slides.length) {
      picker.value = String(state.deck.selected ?? slides.findIndex(s => s.text || s.images.length));
      refreshPhotos();
    }
  };
  input.onchange = async () => {
    const file = input.files[0], current = ++revision;
    if (!file) return;
    state.deck = null;
    showDeck();
    status.textContent = 'กำลังอ่านข้อความและรูปใน PowerPoint…';
    try {
      const slides = await prReadPptx(file);
      if (current !== revision || !app.isConnected) return;
      state.deck = { slides };
      showDeck();
    } catch (error) {
      if (current === revision) status.textContent = error.message || 'เปิด PowerPoint ไม่สำเร็จ';
    }
  };
  picker.onchange = () => { state.deck.selected = Number(picker.value); refreshPhotos(); };
  apply.onclick = () => {
    const item = slide();
    if (!item) return;
    const photo = photos.value === '' ? null : item.images[Number(photos.value)];
    if (item.text.length > 8000) { status.textContent = 'สไลด์นี้มีข้อความเกิน 8,000 ตัวอักษร กรุณาใช้สไลด์ที่สั้นลง'; return; }
    if (item.text) {
      if (state.text.trim() && state.text.trim() !== item.text && !window.confirm('แทนที่ข้อความในช่องบรีฟด้วยข้อความจากสไลด์นี้หรือไม่?')) return;
      $('#prText', app).value = state.text = item.text;
    }
    if (photo) {
      state.file = photo;
      $('#prPhoto', app).value = '';
      $('#prPhotoName', app).textContent = photo.name + ' · จากสไลด์ ' + item.number;
    }
    state.fromPowerPoint = true;
    status.textContent = 'นำเข้าจากสไลด์ ' + item.number + ' แล้ว · ตรวจบรีฟก่อนกดสร้างโปสเตอร์';
  };
  showDeck();
}
