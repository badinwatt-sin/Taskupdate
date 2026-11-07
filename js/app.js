'use strict';
/* ============================================================
   App shell: router, navigation, search, user switcher
   ============================================================ */
const NAV = MENU_ORDER.map(k => [k, ...PAGE[k]]);
const visibleNav = () => NAV.filter(n => !ADMIN_ONLY.includes(n[0]) || isAdmin());   // [route, name, Thai gloss, icon] — vocabulary lives in labels.js
/* Feature flags — Meeting Hub is parked until the AI part is decided (code kept in views-c.js) */
const FEATURES = { meetings: false };
let lastRoute = '';
function route() { const h = location.hash.replace(/^#\/?/, '').split('/'); return { name: h[0] || 'dashboard', id: h[1] }; }

function render() {
  if (!Store.state) return;
  const r = route();
  if (!V[r.name] || (r.name === 'meetings' && !FEATURES.meetings) || (ADMIN_ONLY.includes(r.name) && !isAdmin())) { location.hash = '#/dashboard'; return; }
  const B = todoBuckets(me().id), badge = B.overdue.length + B.today.length;
  $('#nav').innerHTML = visibleNav().map(([k, l, th, i]) => `<a href="#/${k}" class="${r.name === k ? 'on' : ''}" ${r.name === k ? 'aria-current="page"' : ''} title="${l} · ${th}">${ico(i, 19)}<span class="nl"><b>${l}</b><small>${th}</small></span>${k === 'todo' && badge ? `<em class="${B.overdue.length ? 'warn' : ''}">${badge}</em>` : ''}</a>`).join('');
  const m = me();
  $('#userBtn').innerHTML = `${avatar(m, 36)}<div><b>${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : isPM() ? 'Project Manager' : 'สมาชิก'} · ${ACTION.account[0]}</small></div>`;
  const key = r.name + '/' + (r.id || '');
  const view = $('#view'), y = window.scrollY;
  document.body.dataset.route = r.name;
  view.className = 'view v-' + r.name + (key !== lastRoute ? ' enter' : '');
  V[r.name](view, r.id);
  renderTabbar(r); renderAdd(r); renderBell(); hpBadge(); hpSchedule();
  const tu = $('#tbUser'); if (tu) tu.innerHTML = avatar(m, 32);
  document.title = pageName(r.name) + ' · TEAM Hub';
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; document.body.classList.remove('nav-open'); } else window.scrollTo(0, y);
  Store.setSync();
}
window.addEventListener('hashchange', render);

/* ---------- global search (Ctrl/⌘+K) ----------
   Scope (what this searches, and only what you may see):
   งาน = visibleTasks() (your own, your reports', your projects', team post-its; never someone else's “เฉพาะฉัน”)
   Project = visibleProjects() · Event = every event (everyone sees the calendar) · Offsite = every log (everyone sees Offsite)
   สมาชิก = everyone's name; opening a plan is limited to people in your scope.
   Not searched: attachments, Poster drafts, notifications. */
const SEARCH_SCOPE = 'ค้นหาใน: งานที่คุณมีสิทธิ์เห็น · Project · Event · Offsite · Hub Post · รายชื่อสมาชิก — ไม่รวมไฟล์แนบ, Poster และการแจ้งเตือน';
const SEARCH_MAX = 8;
function openSearch() {
  modal({
    title: ACTION.search[0], cls: 'search-modal',
    body: `<label class="search big">${ico('search', 18)}<input id="gq" type="search" enterkeyhint="search" placeholder="ค้นหางาน, Project, Event, Offsite, สมาชิก…" autocomplete="off" aria-label="คำค้นหา" aria-describedby="gscope" aria-controls="gres"></label><p class="muted small gscope" id="gscope">${SEARCH_SCOPE}</p><div id="gres" class="gres" aria-live="polite"></div>`,
    onOpen(md) {
      const out = $('#gres', md.el), inp = $('#gq', md.el);
      const norm = v => String(v || '').toLowerCase().replace(/\s+/g, ' ');
      const run = () => {
        const q = norm(inp.value).trim(); if (!q) { out.innerHTML = '<p class="muted small pad">พิมพ์อย่างน้อย 1 ตัวอักษรเพื่อค้นหา</p>'; return; }
        const words = q.split(' ').filter(Boolean), hit = (...f) => { const hay = norm(f.join(' ')); return words.every(w => hay.includes(w)); };
        const sec = [];
        const add = (name, list, row) => { if (list.length) sec.push({ name, total: list.length, rows: list.slice(0, SEARCH_MAX).map(row) }); };
        add('งาน', visibleTasks().filter(t => hit(t.title, t.desc, t.ram?.requester, t.ram?.detail, project(t.projectId)?.name, member(t.assigneeId)?.name, member(t.coId)?.name)),
          t => ['งาน', t.title, `${member(t.assigneeId)?.name || '–'} · ${STATUS[t.status].th}${isDelayed(t) ? ' · เลยกำหนด' : ''} · ${project(t.projectId)?.name || 'ไม่ผูก Project'}`, 'openTask', t.id]);
        add('Project', visibleProjects().filter(p => hit(p.name, p.goal, member(p.pmId)?.name)), p => ['Project', p.name, `PM: ${member(p.pmId)?.name || '–'}`, 'goProject', p.id]);
        add('Event', sortBy(S().events.filter(e => hit(e.name, e.venue, catLabel(e.cat), e.note)), e => e.start).reverse(), e => ['Event', e.name, `${fmtRange(e.start, e.end)}${e.venue ? ' · ' + e.venue : ''} · ${(EV_STATUS[e.status] || EV_STATUS.planning).th}`, 'openEvent', e.id]);
        add('Offsite', sortBy((S().offsite || []).filter(o => hit(o.title, o.area, o.note, offNames(o))), o => o.start).reverse(), o => ['Offsite', o.title, `${fmtRange(o.start, o.end)} · ${o.area || '–'} · ${offNames(o) || '–'}`, 'openOffsite', o.id]);
        add('Hub Post', HubPost.posts().filter(p => hit(p.text, member(p.by)?.name, ...p.replies.map(r => r.text))), p => ['โพสต์', (p.text || '').slice(0, 80), `${member(p.by)?.name || '–'} · ${hpAgo(p.at)}${p.replies.length ? ' · ' + p.replies.length + ' ความเห็น' : ''}`, 'hpGoSearch', p.id]);
        if (FEATURES.meetings) add('ประชุม', S().meetings.filter(x => hit(x.title, x.summary)), x => ['ประชุม', x.title, fmtDY(x.date), 'goMeeting', x.id]);
        add('สมาชิก', S().members.filter(x => hit(x.name, x.alias, x.position)), x => ['สมาชิก', x.name, inScope(x.id) ? `${x.position || ''} · ดูแผนงาน` : `${x.position || ''} · ดูแผนได้เฉพาะคนในทีมของคุณ`, inScope(x.id) ? 'goTodo' : '', x.id]);
        out.innerHTML = sec.length ? sec.map(g => `<div class="gsec"><small class="gsec-h">${g.name} <span class="muted">${g.total > SEARCH_MAX ? `แสดง ${SEARCH_MAX} จาก ${g.total} — พิมพ์ให้เจาะจงขึ้น` : g.total + ' รายการ'}</span></small>${g.rows.map(r => `<button type="button" class="gr" ${r[3] ? `data-act="${r[3]}"` : 'aria-disabled="true"'} data-id="${esc(r[4])}" data-close-search><span class="badge">${r[0]}</span><div class="grow"><b>${esc(r[1])}</b><small>${esc(r[2])}</small></div></button>`).join('')}</div>`).join('')
          : `<p class="muted pad">ไม่พบ “${esc(inp.value.trim())}” ในขอบเขตที่คุณมีสิทธิ์เห็น</p>`;
      };
      let tm; inp.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 80); }; run();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const f = $('.gr[data-act]', out); if (f) f.click(); } else if (e.key === 'ArrowDown') { e.preventDefault(); const f = $('.gr', out); if (f) f.focus(); } });
      out.addEventListener('keydown', e => { if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; const all = $$('.gr', out), i = all.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); const n = all[i + (e.key === 'ArrowDown' ? 1 : -1)] || (e.key === 'ArrowUp' ? inp : null); if (n) n.focus(); });
      out.addEventListener('click', e => { const b = e.target.closest('[data-close-search]'); if (b && b.dataset.act && !['openTask', 'openEvent', 'openOffsite'].includes(b.dataset.act)) md.close(); });   // detail windows open on top; closing them returns to the results
    },
  });
}
ACT.goProject = el => { ST.proj.tab = 'overview'; location.hash = '#/projects/' + el.dataset.id; };
ACT.goMeeting = el => { ST.meet.sel = el.dataset.id; ST.meet.draft = null; location.hash = '#/meetings'; render(); };
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (Store.state && !modalStack.length) openSearch(); }
});

/* ---------- Poster Studio is Admin-only and heavy (~half of all script bytes): load it on demand ---------- */
const POSTER_KIT = ['js/vendor/qrcode.min.js', 'js/poster-art.js', 'js/poster-form.js', 'js/poster-notes.js', 'js/poster.js', 'js/studio-art.js', 'js/studio-kit.js', 'js/studio-fonts.js', 'js/studio-layout.js', 'js/studio-ci.js', 'js/studio-pro.js', 'js/studio.js'];
function loadPosterKit() {
  if (!loadPosterKit.p) loadPosterKit.p = new Promise((res, rej) => {
    POSTER_KIT.forEach((src, i) => { const s = document.createElement('script'); s.src = src; s.async = false;   // download in parallel, run in order
      s.onerror = () => { loadPosterKit.p = null; rej(new Error('โหลด Poster Studio ไม่สำเร็จ')); };
      if (i === POSTER_KIT.length - 1) s.onload = () => res(); document.body.appendChild(s); });
  });
  return loadPosterKit.p;
}
V.poster = root => {   // placeholder until the studio scripts arrive (they replace V.poster)
  root.innerHTML = '<div class="loading" role="status">กำลังเปิด Poster Studio…</div>';
  loadPosterKit().then(() => { if (route().name === 'poster') render(); })
    .catch(e => { if (route().name === 'poster') root.innerHTML = `<div class="card" role="alert"><h3>${esc(e.message)}</h3><p class="muted mt">ตรวจการเชื่อมต่อแล้วลองใหม่</p><p class="mt"><button class="btn btn-primary" data-act="posterRetry">ลองใหม่</button></p></div>`; });
};
ACT.posterRetry = () => render();

/* ---------- theme: Auto (follow device) / Light / Dark ---------- */
const THEME_KEY = 'aex-theme', THEMES = [['auto', 'อัตโนมัติ', 'auto'], ['light', 'สว่าง', 'sun'], ['dark', 'มืด', 'moon']];
const getTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } };
function applyTheme() {
  const t = getTheme(), root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
  const [, label, icon] = THEMES.find(x => x[0] === t) || THEMES[0], b = $('#themeBtn');
  if (b) { b.innerHTML = `${ico(icon, 14)} ${label}`; b.title = 'ธีม: ' + label + ' (กดเพื่อสลับ)'; }
}
function cycleTheme() { const i = THEMES.findIndex(x => x[0] === getTheme()); try { localStorage.setItem(THEME_KEY, THEMES[(i + 1) % 3][0]); } catch (e) { } applyTheme(); }

/* ---------- boot ---------- */
(async function boot() {
  $('#themeBtn').onclick = cycleTheme; applyTheme();
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
  $('#scrim').onclick = () => document.body.classList.remove('nav-open');
  $('#userBtn').onclick = openAccount;
  $('#searchBtn').onclick = openSearch; $('#bellBtn').onclick = openBell;
  $('#addBtn').onclick = runPageAdd; $('#fab').onclick = runPageAdd; $('#tbUser').onclick = openMore;
  if (innerWidth < 720) ST.cal.mode = 'agenda';
  try { await bootApp(); } catch (e) {
    console.error(e);
    $('#view').innerHTML = `<div class="card boot-err" role="alert" style="max-width:560px;margin:60px auto"><h3>โหลดข้อมูลไม่สำเร็จ</h3><p class="muted mt">${navigator.onLine === false ? 'อุปกรณ์ไม่ได้เชื่อมต่ออินเทอร์เน็ต' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ หรือเครือข่ายช้าเกินไป'} — ข้อมูลของทีมยังปลอดภัยอยู่บนเซิร์ฟเวอร์</p><p class="mt"><button class="btn btn-primary" onclick="location.reload()">ลองใหม่</button></p></div>`;
  }
})();
async function bootApp() {
  await Store.detect();
  if (Store.offline) throw new Error('offline');
  let id = null, note = '';
  if (Store.mode === 'server') {
    if (Store.configured === false) { $('#view').innerHTML = `<div class="card" style="max-width:640px;margin:60px auto"><h3>ยังไม่ได้เชื่อมฐานข้อมูล</h3><p class="muted mt">เซิร์ฟเวอร์ทำงานแล้ว แต่ยังไม่พบการตั้งค่าที่เก็บข้อมูล (Upstash Redis) — ใน Vercel ไปที่ <b>Storage → Create → Upstash Redis</b> แล้วเชื่อมกับโปรเจกต์นี้ จากนั้นกด Redeploy และรีเฟรชหน้านี้</p></div>`; return; }
    if (!Store.hasState) { await Store.bootstrap(); note = Store.initialPassword ? `เริ่มใช้งานครั้งแรก — รหัสผ่านเริ่มต้นของทุกคนคือ <b>${esc(Store.initialPassword)}</b> (แสดงครั้งเดียว กรุณาจดไว้ แล้วเข้าสู่ระบบเป็น Admin เพื่อเปลี่ยน)` : 'เริ่มใช้งานครั้งแรก — ใช้รหัสผ่านเริ่มต้นที่ตั้งไว้ในค่า HUB_DEFAULT_PASSWORD (หรือดูใน terminal)'; }
    id = await Auth.restore();
    if (!id) id = await showLogin(note);
    await Store.loadState();
  } else {
    await Store.loadState();
    id = await Auth.restore();
    if (!id) id = await showLogin();
  }
  AEX.meId = id; takeSnap(); if (Store.mode === 'server') swReady();
  HubPost.load().then(hpDraw);
  AEX.onRemote = () => { if (!modalStack.length) render(); };
  if (!member(AEX.meId)) AEX.meId = S().members[0].id;
  render();
}
