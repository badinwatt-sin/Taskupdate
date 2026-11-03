'use strict';
/* ============================================================
   App shell: router, navigation, search, user switcher
   ============================================================ */
const NAV = [   // [route, English name, Thai gloss, icon]
  ['dashboard', 'Dashboard', 'ภาพรวมทีม', 'dashboard'],
  ['support', 'Offsite Support', 'งานนอกสถานที่ / สนับสนุน Event', 'inbox'],
  ['calendar', 'Event Calendar', 'ปฏิทินงานสำคัญประจำปี', 'calendar'],
  ['projects', 'Projects', 'โครงการและ Squad', 'folder'],
  ['board', 'Timeline & Board', 'Gantt และ Kanban ทุก Project', 'board'],
  ['todo', 'My Weekly Plan', 'แผนงานรายสัปดาห์ของฉัน', 'check'],
  ['meetings', 'Meeting Hub', 'สรุปประชุมและ Action Items', 'mic'],
  ['team', 'Team & Access', 'ทีม สิทธิ์ และการตั้งค่า', 'users'],
];
let lastRoute = '';
function route() { const h = location.hash.replace(/^#\/?/, '').split('/'); return { name: h[0] || 'dashboard', id: h[1] }; }

function render() {
  if (!Store.state) return;
  const r = route();
  if (!V[r.name]) { location.hash = '#/dashboard'; return; }
  const B = todoBuckets(me().id), badge = B.overdue.length + B.today.length;
  $('#nav').innerHTML = NAV.map(([k, l, th, i]) => `<a href="#/${k}" class="${r.name === k ? 'on' : ''}" ${r.name === k ? 'aria-current="page"' : ''} title="${th}">${ico(i, 19)}<span class="nl"><b>${l}</b><small>${th}</small></span>${k === 'todo' && badge ? `<em class="${B.overdue.length ? 'warn' : ''}">${badge}</em>` : ''}</a>`).join('');
  const m = me();
  $('#userBtn').innerHTML = `${avatar(m, 36)}<div><b>${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : isPM() ? 'Project Manager' : 'สมาชิก'} · เปลี่ยนผู้ใช้</small></div>`;
  const key = r.name + '/' + (r.id || '');
  const view = $('#view'), y = window.scrollY;
  view.className = 'view v-' + r.name;
  V[r.name](view, r.id);
  document.title = (NAV.find(n => n[0] === r.name)?.[1] || 'Hub') + ' · TEAM Hub';
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; document.body.classList.remove('nav-open'); } else window.scrollTo(0, y);
  Store.setSync();
}
window.addEventListener('hashchange', render);

/* ---------- user switcher ---------- */
function pickUser(first) {
  modal({
    title: first ? 'ยินดีต้อนรับ — คุณคือใคร?' : 'เปลี่ยนผู้ใช้', wide: true,
    body: `<p class="muted">${first ? 'เลือกชื่อของคุณเพื่อเริ่มใช้งาน ระบบจะแสดงงานและสิทธิ์ตามบทบาท' : 'สลับมุมมองเพื่อดูสิทธิ์ของแต่ละบทบาท'} <small>(โหมดสาธิต — ใช้งานจริงควรเชื่อมระบบล็อกอินขององค์กร)</small></p>
    <div class="user-grid">${S().members.map(m => `<button class="ubtn ${m.id === AEX.meId ? 'on' : ''}" data-act="setUser" data-id="${m.id}">${avatar(m, 40)}<b>${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : esc(group(m.group).short)}</small></button>`).join('')}</div>`,
    actions: first ? [] : [{ label: 'ปิด' }],
  });
}
ACT.setUser = el => {
  AEX.meId = el.dataset.id; try { localStorage.setItem(LS_ME, AEX.meId); } catch (e) { }
  ST.todo.user = null; modalStack.slice().forEach(m => m.close()); render();
  toast(`เข้าใช้งานในนาม ${me().name}`);
};

/* ---------- global search (Ctrl/⌘+K) ---------- */
function openSearch() {
  const m = modal({
    title: 'ค้นหา', cls: 'search-modal',
    body: `<label class="search big">${ico('search', 18)}<input id="gq" placeholder="ค้นหางาน, Project, Major Event, การประชุม, สมาชิก…" autocomplete="off"></label><div id="gres" class="gres"></div>`,
    onOpen(md) {
      const out = $('#gres', md.el), inp = $('#gq', md.el);
      const run = () => {
        const q = inp.value.trim().toLowerCase(); if (!q) { out.innerHTML = '<p class="muted small pad">พิมพ์เพื่อค้นหาในทุกส่วนของระบบ</p>'; return; }
        const has = s => String(s || '').toLowerCase().includes(q), rows = [];
        visibleTasks().filter(t => has(t.title) || has(t.ram?.requester) || has(t.desc)).slice(0, 8).forEach(t => rows.push(['งาน', t.title, `${member(t.assigneeId)?.name || '–'} · ${STATUS[t.status].th}`, 'openTask', t.id]));
        visibleProjects().filter(p => has(p.name) || has(p.goal)).forEach(p => rows.push(['Project', p.name, `PM: ${member(p.pmId)?.name || '–'}`, 'goProject', p.id]));
        S().events.filter(e => has(e.name) || has(e.venue)).forEach(e => rows.push(['Event', e.name, fmtRange(e.start, e.end), 'openEvent', e.id]));
        S().meetings.filter(x => has(x.title) || has(x.summary)).forEach(x => rows.push(['ประชุม', x.title, fmtDY(x.date), 'goMeeting', x.id]));
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
  $('#userBtn').onclick = () => pickUser(false);
  $('#searchBtn').onclick = openSearch;
  $('#addBtn').onclick = () => openTask(newTask('personal'));
  await Store.init();
  AEX.onRemote = () => { if (!modalStack.length) render(); };
  try { AEX.meId = localStorage.getItem(LS_ME); } catch (e) { }
  const known = member(AEX.meId);
  if (!known) AEX.meId = S().members[0].id;
  render();
  if (!known) pickUser(true);
})();
