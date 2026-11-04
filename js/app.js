'use strict';
/* ============================================================
   App shell: router, navigation, search, user switcher
   ============================================================ */
const NAV = MENU_ORDER.map(k => [k, ...PAGE[k]]);   // [route, name, Thai gloss, icon] — vocabulary lives in labels.js
/* Feature flags — Meeting Hub is parked until the AI part is decided (code kept in views-c.js) */
const FEATURES = { meetings: false };
let lastRoute = '';
function route() { const h = location.hash.replace(/^#\/?/, '').split('/'); return { name: h[0] || 'dashboard', id: h[1] }; }

function render() {
  if (!Store.state) return;
  const r = route();
  if (!V[r.name] || (r.name === 'meetings' && !FEATURES.meetings)) { location.hash = '#/dashboard'; return; }
  const B = todoBuckets(me().id), badge = B.overdue.length + B.today.length;
  $('#nav').innerHTML = NAV.map(([k, l, th, i]) => `<a href="#/${k}" class="${r.name === k ? 'on' : ''}" ${r.name === k ? 'aria-current="page"' : ''} title="${th}">${ico(i, 19)}<span class="nl"><b>${l}</b><small>${th}</small></span>${k === 'todo' && badge ? `<em class="${B.overdue.length ? 'warn' : ''}">${badge}</em>` : ''}</a>`).join('');
  const m = me();
  $('#userBtn').innerHTML = `${avatar(m, 36)}<div><b>${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : isPM() ? 'Project Manager' : 'สมาชิก'} · ${ACTION.account[0]}</small></div>`;
  const key = r.name + '/' + (r.id || '');
  const view = $('#view'), y = window.scrollY;
  document.body.dataset.route = r.name;
  view.className = 'view v-' + r.name + (key !== lastRoute ? ' enter' : '');
  V[r.name](view, r.id);
  renderTabbar(r);
  const tu = $('#tbUser'); if (tu) tu.innerHTML = avatar(m, 32);
  document.title = pageName(r.name) + ' · TEAM Hub';
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; document.body.classList.remove('nav-open'); } else window.scrollTo(0, y);
  Store.setSync();
}
window.addEventListener('hashchange', render);

/* ---------- global search (Ctrl/⌘+K) ---------- */
function openSearch() {
  const m = modal({
    title: ACTION.search[0], cls: 'search-modal',
    body: `<label class="search big">${ico('search', 18)}<input id="gq" placeholder="ค้นหางาน, Project, Major Event, สมาชิก…" autocomplete="off"></label><div id="gres" class="gres"></div>`,
    onOpen(md) {
      const out = $('#gres', md.el), inp = $('#gq', md.el);
      const run = () => {
        const q = inp.value.trim().toLowerCase(); if (!q) { out.innerHTML = '<p class="muted small pad">พิมพ์เพื่อค้นหาในทุกส่วนของระบบ</p>'; return; }
        const has = s => String(s || '').toLowerCase().includes(q), rows = [];
        visibleTasks().filter(t => has(t.title) || has(t.ram?.requester) || has(t.desc)).slice(0, 8).forEach(t => rows.push(['งาน', t.title, `${member(t.assigneeId)?.name || '–'} · ${STATUS[t.status].th}`, 'openTask', t.id]));
        visibleProjects().filter(p => has(p.name) || has(p.goal)).forEach(p => rows.push(['Project', p.name, `PM: ${member(p.pmId)?.name || '–'}`, 'goProject', p.id]));
        S().events.filter(e => has(e.name) || has(e.venue)).forEach(e => rows.push(['Event', e.name, fmtRange(e.start, e.end), 'openEvent', e.id]));
        if (FEATURES.meetings) S().meetings.filter(x => has(x.title) || has(x.summary)).forEach(x => rows.push(['ประชุม', x.title, fmtDY(x.date), 'goMeeting', x.id]));
        S().members.filter(x => has(x.name) || has(x.alias)).forEach(x => rows.push(['สมาชิก', x.name, x.position, 'goTodo', x.id]));
        out.innerHTML = rows.length ? rows.map(r => `<button class="gr" data-act="${r[3]}" data-id="${r[4]}" data-close-search><span class="badge">${r[0]}</span><div class="grow"><b>${esc(r[1])}</b><small>${esc(r[2])}</small></div></button>`).join('') : '<p class="muted pad">ไม่พบผลลัพธ์</p>';
      };
      inp.oninput = run; run();
      out.addEventListener('click', e => { if (e.target.closest('[data-close-search]') && !['openTask', 'openEvent'].includes(e.target.closest('[data-act]').dataset.act)) md.close(); });
    },
  });
}
ACT.goProject = el => { ST.proj.tab = 'overview'; location.hash = '#/projects/' + el.dataset.id; };
ACT.goMeeting = el => { ST.meet.sel = el.dataset.id; ST.meet.draft = null; location.hash = '#/meetings'; render(); };
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (Store.state && !modalStack.length) openSearch(); }
});

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
  $('#searchBtn').onclick = openSearch;
  $('#addBtn').onclick = openQuickCreate; $('#fab').onclick = openQuickCreate; $('#tbUser').onclick = openMore;
  if (innerWidth < 720) ST.cal.mode = 'agenda';
  await Store.detect();
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
  AEX.meId = id; AEX.onRemote = () => { if (!modalStack.length) render(); };
  if (!member(AEX.meId)) AEX.meId = S().members[0].id;
  render();
})();
