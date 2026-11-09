'use strict';
/* Admin-only Management Weekly Update. AI reads the saved team snapshot on the server. */
const Weekly = { meta: null, report: null, language: 'th', loading: false, fetching: false, error: '', failedAction: null, rev: null };
const weeklyRefresh = () => { if (isAdmin() && route().name === 'weekly') V.weekly($('#view')); };
const weeklyDates = w => `${fmtDY(w.start)} – ${fmtDY(w.end)}`;
const weeklyBullets = items => `<ul class="weekly-bullets">${items.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;

function weeklyText(report) {
  const en = report.language === 'en', p = report.period, r = report.result;
  const date = w => en ? `${w.start} – ${w.end}` : weeklyDates(w);
  const lines = ['Management Weekly Update', `${en ? 'This week' : 'สัปดาห์นี้'}: ${date(p.thisWeek)}`, `${en ? 'Next week' : 'สัปดาห์หน้า'}: ${date(p.nextWeek)}`, '', en ? 'Team overview' : 'ภาพรวมทีม', ...r.overview.map(s => '• ' + s)];
  for (const g of r.groups) {
    lines.push('', g.name);
    for (const [key, title] of [['thisWeek', en ? 'This week' : 'สัปดาห์นี้'], ['nextWeek', en ? 'Next week' : 'สัปดาห์หน้า'], ['attention', en ? 'Management attention' : 'ประเด็นติดตาม']]) {
      if (!g[key].length && key === 'attention') continue;
      lines.push(title, ...(g[key].length ? g[key].map(s => '• ' + s) : [en ? '• No work recorded for this week.' : '• ยังไม่มีงานที่บันทึกไว้ในช่วงนี้']));
    }
  }
  return lines.join('\n');
}

V.weekly = root => {
  if (!isAdmin()) { location.hash = '#/dashboard'; return; }
  const w = Weekly, meta = w.meta, report = w.report, r = report?.result;
  const en = report?.language === 'en';
  const local = Store.mode !== 'server';
  root.innerHTML = pageHead(pageName('weekly'), 'Management weekly update · สรุปงานสัปดาห์นี้ถึงสัปดาห์หน้า แยกตามกลุ่มหน้าที่ทีม') + `
    <section class="card weekly-controls">
      <div class="grow"><h3>สรุปสำหรับผู้บริหาร</h3><p class="muted small">สรุปจากงานใน My Plan และ Projects รวมงานค้างที่ต้องติดตาม · ไม่รวมงาน “เฉพาะฉัน” และงานยกเลิก</p>
        ${meta ? `<p class="small mt">สัปดาห์นี้: <b>${weeklyDates(meta.period.thisWeek)}</b><br>สัปดาห์หน้า: <b>${weeklyDates(meta.period.nextWeek)}</b></p><p class="muted small">${meta.counts.tasks} งาน · ${meta.groups.length} กลุ่มหน้าที่ · อ้างอิงวันตามเวลาประเทศไทย</p>` : ''}</div>
      <div class="weekly-actions"><label class="field"><span>ภาษาของสรุป</span><select id="weeklyLanguage" ${w.loading ? 'disabled' : ''}>${opt('th', 'ภาษาไทย', w.language)}${opt('en', 'English', w.language)}</select></label>
        <button class="btn btn-primary" data-act="weeklyGenerate" ${local || w.loading || w.fetching || !meta?.counts.tasks || !meta?.aiConnected ? 'disabled' : ''}>${ico('chart', 16)} ${w.loading ? 'กำลังสรุป…' : 'ให้ AI สรุปงาน'}</button>
        <button class="btn btn-ghost" data-act="weeklyCopy" ${!r || w.loading ? 'disabled' : ''}>${ico('copy', 16)} คัดลอกสรุป</button>
        <button class="btn btn-ghost" data-act="weeklyReload" ${w.loading || w.fetching || local ? 'disabled' : ''}>${ico('refresh', 16)} ตรวจข้อมูลล่าสุด</button></div>
    </section>
    ${local ? '<div class="note mt">เปิดฟีเจอร์นี้ผ่านเว็บไซต์ที่เชื่อมข้อมูลทีม เพื่อให้ AI อ่านงานล่าสุดของทีมได้</div>' : ''}
    ${w.fetching || w.loading ? `<p class="muted mt" role="status">${w.loading ? 'AI กำลังเรียบเรียง bullet points สำหรับผู้บริหาร…' : 'กำลังตรวจงานของทีม…'}</p>` : ''}
    ${w.error ? `<div class="note warn mt" role="alert">${esc(w.error)} <button type="button" class="link-btn" data-act="weeklyRetry">ลองใหม่</button></div>` : ''}
    ${!local && meta && !meta.aiConnected ? '<div class="note warn mt">ยังไม่ได้เชื่อม AI · Admin เชื่อม Gemini หรือ Claude ได้ที่ Poster → CI Control</div>' : ''}
    ${meta?.counts.unscheduled ? `<p class="muted small mt">มี ${meta.counts.unscheduled} งานที่ยังไม่มีช่วงวันที่ที่ใช้ได้ จึงยังไม่รวมในสรุปนี้</p>` : ''}
    ${!w.fetching && meta && !meta.counts.tasks ? empty('check', 'ยังไม่มีงานในช่วงนี้', 'เมื่อมีงานในสองสัปดาห์นี้ หรืองานค้างที่ต้องติดตาม จะสรุปให้ได้ที่นี่') : ''}
    ${r ? `<div class="weekly-output mt"><section class="card"><h2>Management Weekly Update</h2><p class="muted small">${weeklyDates(report.period.thisWeek)} → ${weeklyDates(report.period.nextWeek)}</p><h3 class="mt">${en ? 'Team overview' : 'ภาพรวมทีม'}</h3>${weeklyBullets(r.overview)}</section>
      ${r.groups.map(g => `<section class="card mt"><h2>${esc(g.name)}</h2>${[['thisWeek', en ? 'This week' : 'สัปดาห์นี้'], ['nextWeek', en ? 'Next week' : 'สัปดาห์หน้า'], ['attention', en ? 'Management attention' : 'ประเด็นติดตาม']].map(([key, label]) => !g[key].length && key === 'attention' ? '' : `<h3 class="mt">${label}</h3>${g[key].length ? weeklyBullets(g[key]) : `<p class="muted small">${en ? 'No work recorded for this week.' : 'ยังไม่มีงานที่บันทึกไว้ในช่วงนี้'}</p>`}`).join('')}</section>`).join('')}
      <p class="muted small mt">ฉบับร่างจาก AI · ตรวจข้อเท็จจริงก่อนนำไปใช้ · สร้างเมื่อ ${esc(new Date(report.generatedAt).toLocaleString('th-TH'))}</p></div>` : ''}`;
  const language = $('#weeklyLanguage', root); if (language) language.onchange = () => { w.language = language.value; };
  if (!local && !w.fetching && !w.loading && (w.rev !== Store.rev || !meta || lastRoute !== 'weekly/') && !w.error) weeklyLoad();
};

async function weeklyRequest(method, body) {
  const res = await fetch('api/weekly-update', { method, headers: Store.headers(!!body), ...(body ? { body: JSON.stringify(body) } : {}) });
  if (res.status === 401) { Auth.expired(); throw new Error('กรุณาเข้าสู่ระบบใหม่'); }
  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'โหลด Weekly Update ไม่สำเร็จ');
  return data;
}
async function weeklyLoad() {
  if (!isAdmin() || Weekly.fetching || Weekly.loading || Store.mode !== 'server') return;
  Weekly.fetching = true; Weekly.error = ''; weeklyRefresh();
  try { Weekly.meta = await weeklyRequest('GET'); Weekly.rev = Store.rev; }
  catch (e) { Weekly.error = e.message || 'โหลดข้อมูลไม่สำเร็จ'; Weekly.failedAction = 'load'; }
  finally { Weekly.fetching = false; weeklyRefresh(); }
}
ACT.weeklyReload = () => { Weekly.rev = null; weeklyLoad(); };
ACT.weeklyRetry = () => Weekly.failedAction === 'generate' ? ACT.weeklyGenerate() : weeklyLoad();
ACT.weeklyGenerate = async () => {
  const w = Weekly; if (!isAdmin() || w.loading || w.fetching || Store.mode !== 'server') return;
  w.loading = true; w.error = ''; weeklyRefresh();
  try {
    if (Store.pending) { clearTimeout(Store.timer); await Store.push(); if (Store.pending) throw new Error('กรุณารอให้บันทึกงานล่าสุดสำเร็จก่อนสรุป'); }
    const report = await weeklyRequest('POST', { language: w.language });
    w.meta = { ...report, aiConnected: w.meta?.aiConnected }; w.rev = Store.rev;
    if (report.result) w.report = report;
    else w.report = null;
  } catch (e) { w.error = e.message || 'AI สรุปไม่สำเร็จ กรุณาลองใหม่'; w.failedAction = 'generate'; }
  finally { w.loading = false; weeklyRefresh(); }
};
ACT.weeklyCopy = async () => {
  if (!isAdmin() || !Weekly.report?.result) return;
  const text = weeklyText(Weekly.report);
  try { await navigator.clipboard.writeText(text); toast('คัดลอก Management Weekly Update แล้ว'); }
  catch (e) { modal({ title: 'คัดลอกสรุป', body: `<label class="field"><span>เลือกข้อความแล้วคัดลอก</span><textarea id="weeklyCopyText" rows="16" readonly>${esc(text)}</textarea></label>`, actions: [{ label: 'ปิด' }], wide: true, onOpen() { $('#weeklyCopyText').select(); } }); }
};
