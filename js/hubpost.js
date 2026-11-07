'use strict';
/* ============================================================
   Hub Post — the team's message board (posts, replies, reactions).
   Server mode: an append-only log at api/posts, kept apart from the shared state, so two people
   posting at the same moment never overwrite each other. Demo mode: kept in the local state.
   Everyone who can sign in can read every post (there are no private channels).
   ============================================================ */
const HP_REACTS = ['👍', '❤️', '🎉', '👏', '🙏'];
const HP_DAYS = 60;   // posts (with replies, reactions and pictures) are removed 60 days after posting — the server does the deleting
const HP_IMG_MAX = 4, HP_IMG_SIDE = 1280, HP_IMG_BYTES = 160 * 1024;
const HP_SEEN_KEY = () => 'aex-hub-seen-' + (AEX.meId || '');
const HubPost = {
  seq: null, entries: [], loaded: false, error: '', timer: null,
  local() { return Store.mode !== 'server'; },
  async load() {
    if (this.local()) { const st = S(), cut = Date.now() - HP_DAYS * 864e5, dead = new Set((st.posts || []).filter(e => e.kind === 'post' && e.at < cut).map(e => e.id)); if (dead.size) { st.posts = st.posts.filter(e => !dead.has(e.id) && !dead.has(e.parent)); Store.save(); } this.entries = (st.posts || []).slice(); this.loaded = true; this.error = ''; return true; }
    try {
      const r = await fetch('api/posts' + (this.seq != null ? '?seq=' + encodeURIComponent(this.seq) : ''), { cache: 'no-store', headers: Store.headers() });
      if (r.status === 304) { this.error = ''; return false; }
      if (r.status === 401) { Auth.expired(); return false; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); const changed = j.seq !== this.seq; this.seq = j.seq; this.entries = j.entries || []; this.loaded = true; this.error = '';
      return changed;
    } catch (e) { this.error = 'โหลดโพสต์ไม่สำเร็จ — ตรวจการเชื่อมต่อ'; this.loaded = true; return true; }
  },
  async send(body) {   // → entry; throws with a readable message
    body.cid = body.cid || uid('c');
    if (this.local()) {
      const st = S(); st.posts ||= []; const n = (st.postSeq || 0) + 1; st.postSeq = n;
      const e = { ...body, id: 'pst_' + n, by: me().id, at: Date.now() }; delete e.cid; if (e.kind !== 'post') { delete e.ref; delete e.tags; delete e.imgs; } else e.tags = [...new Set(e.tags || [])].filter(id => id !== me().id && member(id)).slice(0, 30);
      st.posts.push(e); st.posts = st.posts.slice(-1500); Store.save(); this.entries = st.posts.slice(); return e;
    }
    let r;
    try { r = await fetch('api/posts', { method: 'POST', headers: Store.headers(true), body: JSON.stringify(body) }); }
    catch (e) { throw new Error('ส่งไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง (ข้อความยังอยู่)'); }
    if (r.status === 401) { Auth.expired(); throw new Error('หมดเวลาเข้าสู่ระบบ'); }
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'ส่งไม่สำเร็จ (' + r.status + ')');
    if (!this.entries.some(x => x.id === j.entry.id)) this.entries.push(j.entry);
    this.seq = null;   // next poll fetches the full list again
    return j.entry;
  },
  /* fold the log into posts: replies, reaction toggles and deletions applied */
  posts() {
    const by = new Map(), dels = new Set(), out = [];
    this.entries.forEach(e => { if (e.kind === 'del') dels.add(e.parent); });
    this.entries.forEach(e => {
      if (e.kind === 'post' && !dels.has(e.id) && e.at >= Date.now() - HP_DAYS * 864e5) { const p = { ...e, replies: [], reacts: {} }; by.set(e.id, p); out.push(p); }
      else if (e.kind === 'reply' && by.has(e.parent) && !dels.has(e.id)) by.get(e.parent).replies.push(e);
      else if (e.kind === 'react' && by.has(e.parent)) { const r = by.get(e.parent).reacts; const s = r[e.emoji] ||= new Set(); if (s.has(e.by)) s.delete(e.by); else s.add(e.by); }
    });
    return out.reverse();   // newest first
  },
  seenAt() { try { return +localStorage.getItem(HP_SEEN_KEY()) || 0; } catch (e) { return 0; } },
  markSeen() { const last = Math.max(0, ...this.entries.map(e => e.at || 0)); try { localStorage.setItem(HP_SEEN_KEY(), String(Math.max(last, this.seenAt()))); } catch (e) { } },
  unread() { if (!this.loaded) return 0; const t = this.seenAt(); return this.entries.filter(e => (e.kind === 'post' || e.kind === 'reply') && e.by !== AEX.meId && e.at > t).length; },
};

/* ---------- rendering ---------- */
const hpLinkify = s => esc(s).replace(/(https?:\/\/[^\s<>"']+)/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u.length > 60 ? u.slice(0, 57) + '…' : u}</a>`).replace(/\n/g, '<br>');
const hpAgo = t => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return 'เมื่อสักครู่'; if (s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว'; if (s < 86400) return Math.floor(s / 3600) + ' ชม.ที่แล้ว'; const d = new Date(t); return `${d.getDate()} ${TH_MON[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function hpRef(ref) {
  if (!ref) return '';
  if (ref.type === 'event') { const e = S().events.find(x => x.id === ref.id); return e ? `<button type="button" class="hp-ref" data-act="openEvent" data-id="${e.id}">${ico('calendar', 14)}<span><b>${esc(e.name)}</b><small>${fmtRange(e.start, e.end)}${e.venue ? ' · ' + esc(e.venue) : ''}</small></span></button>` : ''; }
  if (ref.type === 'project') { const p = project(ref.id); return p && visibleProjects().includes(p) ? `<a class="hp-ref" href="#/projects/${p.id}">${ico('folder', 14)}<span><b>${esc(p.name)}</b><small>Project</small></span></a>` : ''; }
  return '';
}
const HP_OPEN = new Set();   // posts whose replies are expanded
const hpExpiry = (p, compact) => { const left = Math.ceil((p.at + HP_DAYS * 864e5 - Date.now()) / 864e5); return !compact && left <= 7 ? `<small class="hp-exp">${ico('clock', 12)} ลบอัตโนมัติใน ${Math.max(left, 0)} วัน</small>` : ''; };
/* pictures: stored apart from the post, fetched only when they scroll into view */
const HP_IMGS = new Map();
function hpImgData(im) {
  if (im.data) return Promise.resolve(im.data);
  if (HP_IMGS.has(im.id)) return HP_IMGS.get(im.id);
  const pr = fetch('api/img?id=' + encodeURIComponent(im.id), { headers: Store.headers() }).then(r => r.ok ? r.json() : null).then(j => j && j.data || null).catch(() => null)
    .then(d => { if (!d) HP_IMGS.delete(im.id); return d; });
  HP_IMGS.set(im.id, pr); return pr;
}
function hpImgs(p, compact) {
  const list = (p.imgs || []).slice(0, compact ? 1 : HP_IMG_MAX); if (!list.length) return '';
  return `<div class="hp-imgs n${list.length}${compact ? ' compact' : ''}">${list.map((im, i) => `<button type="button" class="hp-img" data-act="hpImgView" data-id="${p.id}" data-i="${i}" style="--ar:${im.w}/${im.h}" aria-label="ดูรูปที่ ${i + 1}"><span class="hp-img-in" data-hpimg="${esc(im.id)}"></span></button>`).join('')}${compact && p.imgs.length > 1 ? `<span class="hp-more">+${p.imgs.length - 1}</span>` : ''}</div>`;
}
const HP_IO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { HP_IO.unobserve(e.target); hpFill(e.target); } }), { rootMargin: '400px' }) : null;
function hpFill(el) {
  const post = HubPost.entries.find(x => x.imgs && x.imgs.some(i => i.id === el.dataset.hpimg)), im = post && post.imgs.find(i => i.id === el.dataset.hpimg); if (!im) return;
  hpImgData(im).then(d => { if (!el.isConnected) return; el.innerHTML = d ? `<img src="${d}" alt="" loading="lazy" decoding="async">` : '<small class="muted">โหลดรูปไม่สำเร็จ</small>'; });
}
const hpHydrate = root => $$('[data-hpimg]', root).forEach(el => { if (el.firstChild) return; if (HP_IO) HP_IO.observe(el); else hpFill(el); });
/* compress before upload: longest side 1280 px, WebP (JPEG where WebP is not supported), stepping quality down to ~160 KB */
function hpCompress(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error(`${file.name}: ไม่ใช่ไฟล์รูป`));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let side = HP_IMG_SIDE, out = null;
      for (let round = 0; round < 3 && !out; round++, side = Math.round(side * .8)) {
        const k = Math.min(1, side / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
        for (const q of [.72, .62, .52, .42]) {
          let d = cv.toDataURL('image/webp', q); if (!d.startsWith('data:image/webp')) d = cv.toDataURL('image/jpeg', q);
          const bytes = Math.round((d.length - d.indexOf(',') - 1) * .75);
          if (bytes <= HP_IMG_BYTES || (round === 2 && q === .42)) { out = { data: d, w, h, bytes }; break; }
        }
      }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name}: อ่านรูปไม่ได้ — ลอง JPG หรือ PNG`)); };
    img.src = url;
  });
}
ACT.hpImgView = el => {
  const p = HubPost.posts().find(x => x.id === el.dataset.id); if (!p) return; let i = +el.dataset.i || 0;
  const md = modal({ title: 'รูปภาพ', wide: true, cls: 'hp-view', body: `<div class="hp-view-img" id="hpView"></div>${p.imgs.length > 1 ? `<div class="hp-view-nav"><button type="button" class="btn btn-ghost btn-sm" data-v="-1">${ico('left', 14)} ก่อนหน้า</button><span id="hpViewN"></span><button type="button" class="btn btn-ghost btn-sm" data-v="1">ถัดไป ${ico('right', 14)}</button></div>` : ''}` });
  const show = () => { const box = $('#hpView', md.el); box.innerHTML = '<p class="muted small" role="status">กำลังโหลดรูป…</p>'; const n = $('#hpViewN', md.el); if (n) n.textContent = `${i + 1} / ${p.imgs.length}`; hpImgData(p.imgs[i]).then(d => { box.innerHTML = d ? `<img src="${d}" alt="รูปที่ ${i + 1}">` : '<p class="muted">โหลดรูปไม่สำเร็จ</p>'; }); };
  md.el.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; i = (i + +b.dataset.v + p.imgs.length) % p.imgs.length; show(); });
  show();
};
function hpPostHTML(p, compact) {
  const m = member(p.by), mine = p.by === me().id, can = mine || isAdmin();
  const reps = p.replies, showAll = HP_OPEN.has(p.id) || compact === false, shown = compact ? [] : (showAll ? reps : reps.slice(-2));
  return `<article class="hp-post ${(p.tags || []).includes(me().id) ? 'tagged-me' : ''}" data-post="${p.id}">
    <header class="hp-h">${avatar(m, 36)}<div class="grow"><b>${esc(m?.name || 'สมาชิก')}</b><small class="muted">${esc(m?.position || '')}${m?.position ? ' · ' : ''}<time datetime="${new Date(p.at).toISOString()}">${hpAgo(p.at)}</time></small></div>
      ${can && !compact ? `<button type="button" class="icon-btn hp-del" data-act="hpDel" data-id="${p.id}" aria-label="ลบโพสต์" title="ลบโพสต์">${ico('trash', 16)}</button>` : ''}</header>
    ${(p.tags || []).length ? `<div class="hp-to"><span class="muted small">ถึง</span>${p.tags.map(id => { const x = member(id); return x ? `<span class="hp-tag ${id === me().id ? 'me' : ''}">${avatar(x, 18)}${esc(id === me().id ? 'คุณ' : x.name)}</span>` : ''; }).join('')}</div>` : ''}
    ${p.text ? `<div class="hp-text">${hpLinkify(p.text)}</div>` : ''}${hpImgs(p, compact)}${hpRef(p.ref)}${hpExpiry(p, compact)}
    <div class="hp-acts">${HP_REACTS.map(e => { const s = p.reacts[e], n = s ? s.size : 0, on = s && s.has(me().id); return n || !compact ? `<button type="button" class="hp-react ${on ? 'on' : ''} ${n ? '' : 'zero'}" data-act="hpReact" data-id="${p.id}" data-emoji="${e}" aria-pressed="${!!on}" aria-label="${e} ${n}">${e}${n ? `<span>${n}</span>` : ''}</button>` : ''; }).join('')}
      <span class="grow"></span>${compact ? `<a class="link small" href="#/hub" data-act="hpGo" data-id="${p.id}">${reps.length ? reps.length + ' ความเห็น' : 'ตอบกลับ'}</a>` : ''}</div>
    ${compact ? '' : `<div class="hp-replies">${!showAll && reps.length > 2 ? `<button type="button" class="link-btn small" data-act="hpMore" data-id="${p.id}">ดูความเห็นทั้งหมด ${reps.length} รายการ</button>` : ''}
      ${shown.map(r => { const rm = member(r.by), rc = r.by === me().id || isAdmin(); return `<div class="hp-rep">${avatar(rm, 26)}<div class="hp-rep-b"><b>${esc(rm?.name || 'สมาชิก')}</b> <small class="muted">${hpAgo(r.at)}</small><div>${hpLinkify(r.text || '')}</div></div>${rc ? `<button type="button" class="icon-btn hp-del" data-act="hpDel" data-id="${r.id}" aria-label="ลบความเห็น">${ico('x', 14)}</button>` : ''}</div>`; }).join('')}
      <form class="hp-reply" data-parent="${p.id}">${avatar(me(), 26)}<input name="t" maxlength="2000" placeholder="เขียนความเห็น…" aria-label="เขียนความเห็นในโพสต์ของ ${esc(m?.name || '')}" autocomplete="off" enterkeyhint="send"><button class="btn btn-ghost btn-sm" type="submit">ส่ง</button></form></div>`}
  </article>`;
}
const HP_DRAFT = {};   // unsent reply text per post — survives a refresh of the feed
function hpFeedHTML(limit) {
  if (!HubPost.loaded) return '<div class="loading" role="status">กำลังโหลดโพสต์…</div>';
  const ps = HubPost.posts(), list = limit ? ps.slice(0, limit) : ps;
  const err = HubPost.error ? `<div class="note warn" role="alert">${esc(HubPost.error)} <button type="button" class="link-btn" data-act="hpReload">ลองใหม่</button></div>` : '';
  if (!ps.length) return err + empty('chat', 'ยังไม่มีโพสต์', 'เริ่มแชร์ข่าว อัปเดตงาน หรือทักทายทีมได้เลย');
  return err + list.map(p => hpPostHTML(p, !!limit)).join('');
}
function hpDraw() {   // refresh only the feed parts on screen (never the box you are typing in)
  const busy = document.activeElement && document.activeElement.closest && document.activeElement.closest('.hp-reply');
  $$('[data-hp-feed]').forEach(el => {
    if (busy && el.contains(busy)) { el.dataset.stale = '1'; return; }
    $$('.hp-reply input', el).forEach(i => { if (i.value) HP_DRAFT[i.closest('form').dataset.parent] = i.value; });
    el.innerHTML = hpFeedHTML(+el.dataset.hpFeed || 0); delete el.dataset.stale; hpHydrate(el);
    $$('.hp-reply', el).forEach(f => { const d = HP_DRAFT[f.dataset.parent]; if (d) f.elements.t.value = d; });
  });
  if (route().name === 'hub' && !document.hidden) HubPost.markSeen();
  hpBadge();
}
function hpBadge() {
  const n = HubPost.unread(), nav = $('#nav a[href="#/hub"]');
  if (nav) { let em = $('em', nav); if (n && !em) { em = document.createElement('em'); nav.appendChild(em); } if (em) { if (n) em.textContent = n > 99 ? '99+' : n; else em.remove(); } }
  const more = $('#tabbar [data-act="moreSheet"]'); if (more) { let em = $('em', more); if (n && !em) { em = document.createElement('em'); more.appendChild(em); } if (em) { if (n) em.textContent = n > 99 ? '99+' : n; else em.remove(); } }
}
/* polling: fast while the board is on screen, slow otherwise */
function hpSchedule() {
  clearTimeout(HubPost.timer);
  const on = route().name === 'hub';
  if (!on) return;   // elsewhere the regular 90-second sync carries the “new posts” signal (hpNotice)
  HubPost.timer = setTimeout(async () => { if (!document.hidden && Store.state) { if (await HubPost.load()) hpDraw(); } hpSchedule(); }, 30000);
}
async function hpNotice(ver) { if (HubPost.local() || !HubPost.loaded || String(ver) === String(HubPost.seq)) return; if (await HubPost.load()) hpDraw(); }
document.addEventListener('visibilitychange', async () => { if (!document.hidden && Store.state && HubPost.loaded && route().name === 'hub') { if (await HubPost.load()) hpDraw(); } });

/* ---------- page ---------- */
let HP_TAGS = [], HP_PICS = [];   // people tagged / pictures added to the post being written
async function hpUpload(x) {
  if (HubPost.local()) return;
  let r; try { r = await fetch('api/img?id=' + x.id, { method: 'PUT', headers: Store.headers(true), body: JSON.stringify({ data: x.data }) }); } catch (e) { throw new Error('อัปโหลดรูปไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วกดโพสต์อีกครั้ง'); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'อัปโหลดรูปไม่สำเร็จ'); }
}
V.hub = root => {
  const refs = visibleProjects().map(p => ['project', p.id, p.name]);
  root.innerHTML = pageHead(pageName('hub'), `แชร์ข่าว อัปเดตงาน และคุยกันในทีม — ทุกคนในทีมเห็นโพสต์นี้ · โพสต์จะถูกลบอัตโนมัติหลัง ${HP_DAYS} วัน`) + `
    <form class="card hp-compose" id="hpCompose" autocomplete="off">
      <div class="hp-c-top">${avatar(me(), 40)}<label class="grow"><span class="sr">ข้อความ</span><textarea name="text" rows="3" maxlength="2000" placeholder="อยากบอกอะไรกับทีม? ใส่ลิงก์หรือรูปได้"></textarea></label></div>
      <div class="hp-tags" id="hpTags" aria-live="polite"></div>
      <div class="hp-tagpick" id="hpTagPick" hidden><input type="search" id="hpTagQ" placeholder="ค้นหาชื่อ…" aria-label="ค้นหาชื่อคนที่จะแท็ก" autocomplete="off"><div class="hp-tp-list" id="hpTagList" role="group" aria-label="เลือกคนที่จะแท็ก"></div></div>
      <div class="hp-pics" id="hpPics" aria-live="polite"></div>
      <div class="hp-c-foot"><label class="btn btn-ghost hp-picbtn">${ico('image', 16)} รูป<input type="file" id="hpPicIn" accept="image/*" multiple hidden></label><button type="button" class="btn btn-ghost hp-tagbtn" id="hpTagBtn" aria-expanded="false" aria-controls="hpTagPick">@ แท็กคน</button>
        <label class="hp-c-ref"><span class="sr">แนบ Project</span><select name="ref"><option value="">แนบ Project (ไม่บังคับ)</option>${refs.map(([t, id, l]) => `<option value="${t}:${esc(id)}">${esc(l)}</option>`).join('')}</select></label>
        <small class="muted hp-count" aria-live="polite"></small><button class="btn btn-primary" type="submit">${ico('chat', 16)} โพสต์</button></div>
    </form>
    <div class="hp-feed" data-hp-feed="0" aria-live="polite">${hpFeedHTML(0)}</div>`;
  const f = $('#hpCompose', root), ta = f.elements.text;
  try { ta.value = sessionStorage.getItem('aex-hp-draft') || ''; } catch (e) { }
  const cnt = () => { $('.hp-count', f).textContent = ta.value.length > 1500 ? `${ta.value.length}/2000` : ''; try { sessionStorage.setItem('aex-hp-draft', ta.value); } catch (e) { } };
  ta.addEventListener('input', cnt); cnt();
  /* tag people: pick one or more teammates; they get a notification */
  const drawTags = () => {
    $('#hpTags', f).innerHTML = HP_TAGS.length ? `<span class="muted small">ถึง</span>${HP_TAGS.map(id => { const x = member(id); return x ? `<span class="hp-tag">${avatar(x, 20)}${esc(x.name)}<button type="button" data-untag="${id}" aria-label="เอา ${esc(x.name)} ออก">${ico('x', 12)}</button></span>` : ''; }).join('')}` : '';
    const q = ($('#hpTagQ', f).value || '').toLowerCase().trim();
    $('#hpTagList', f).innerHTML = S().members.filter(x => x.id !== me().id && (!q || (x.name + ' ' + (x.alias || '') + ' ' + (x.position || '')).toLowerCase().includes(q)))
      .map(x => { const on = HP_TAGS.includes(x.id); return `<button type="button" class="pp-chip ${on ? 'on' : ''}" data-tag="${x.id}" aria-pressed="${on}">${avatar(x, 22)}<span>${esc(x.name)}</span></button>`; }).join('') || '<span class="muted small">ไม่พบชื่อ</span>';
    $('#hpTagBtn', f).textContent = HP_TAGS.length ? `@ แท็กแล้ว ${HP_TAGS.length} คน` : '@ แท็กคน';
  };
  $('#hpTagBtn', f).onclick = () => { const pk = $('#hpTagPick', f), open = pk.hidden; pk.hidden = !open; $('#hpTagBtn', f).setAttribute('aria-expanded', open); if (open) $('#hpTagQ', f).focus(); };
  $('#hpTagQ', f).oninput = drawTags;
  f.addEventListener('click', e => {
    const t = e.target.closest('[data-tag]'), u = e.target.closest('[data-untag]');
    if (t) { const id = t.dataset.tag; HP_TAGS = HP_TAGS.includes(id) ? HP_TAGS.filter(x => x !== id) : [...HP_TAGS, id]; drawTags(); }
    if (u) { HP_TAGS = HP_TAGS.filter(x => x !== u.dataset.untag); drawTags(); }
  });
  drawTags();
  /* pictures: compressed on this device, uploaded when you press โพสต์ */
  const drawPics = () => { const tot = HP_PICS.reduce((n, x) => n + x.bytes, 0); $('#hpPics', f).innerHTML = HP_PICS.length ? HP_PICS.map((x, i) => `<span class="hp-pic"><img src="${x.data}" alt="รูปที่ ${i + 1}"><button type="button" data-unpic="${i}" aria-label="เอารูปที่ ${i + 1} ออก">${ico('x', 12)}</button></span>`).join('') + `<small class="muted">${HP_PICS.length}/${HP_IMG_MAX} รูป · บีบอัดแล้ว ${fmtBytes(tot)}</small>` : ''; };
  $('#hpPicIn', f).onchange = async e => {
    const files = [...e.target.files].slice(0, HP_IMG_MAX - HP_PICS.length); e.target.value = '';
    if (!files.length) return toast(`แนบได้สูงสุด ${HP_IMG_MAX} รูปต่อโพสต์`, 'error');
    $('#hpPics', f).insertAdjacentHTML('beforeend', '<small class="muted" role="status">กำลังบีบอัดรูป…</small>');
    for (const file of files) { try { HP_PICS.push(await hpCompress(file)); } catch (x) { toast(x.message, 'error'); } }
    drawPics();
  };
  f.addEventListener('click', e => { const u = e.target.closest('[data-unpic]'); if (u) { HP_PICS.splice(+u.dataset.unpic, 1); drawPics(); } });
  drawPics();
  f.onsubmit = async e => {
    e.preventDefault(); const btn = $('[type=submit]', f); if (btn.disabled) return;
    const text = ta.value.trim(); if (!text && !HP_PICS.length) { ta.focus(); return; }
    const [t, id] = (f.elements.ref.value || '').split(':'); btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    try {
      const imgs = []; for (const x of HP_PICS) { x.id ||= 'hp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); if (!x.up) { await hpUpload(x); x.up = true; } imgs.push(HubPost.local() ? { id: x.id, w: x.w, h: x.h, data: x.data } : { id: x.id, w: x.w, h: x.h }); if (!HubPost.local()) HP_IMGS.set(x.id, Promise.resolve(x.data)); }   // a retry skips pictures already uploaded
      await HubPost.send({ kind: 'post', text, ref: t ? { type: t, id } : null, tags: HP_TAGS.slice(), imgs, cid: f.dataset.cid || (f.dataset.cid = uid('c')) });
      const n = HP_TAGS.length; ta.value = ''; f.elements.ref.value = ''; HP_TAGS = []; HP_PICS = []; drawPics(); $('#hpTagPick', f).hidden = true; drawTags(); delete f.dataset.cid; cnt(); hpDraw(); toast(n ? `โพสต์แล้ว · แจ้ง ${n} คนที่แท็กไว้` : 'โพสต์แล้ว');
    }
    catch (x) { toast(x.message, 'error'); }   // the text stays in the box — press โพสต์ again (same client id, so no duplicate)
    finally { btn.disabled = false; btn.removeAttribute('aria-busy'); }
  };
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) f.requestSubmit(); });
  if (!HubPost.loaded || HubPost.local()) HubPost.load().then(hpDraw); else HubPost.markSeen();
  hpHydrate(root);
  hpBadge();
};
/* dashboard: latest posts near the end of Home */
const hpDashHTML = () => `<div class="sec-row"><h2 class="sec-h2">${pageName('hub')}</h2><a class="link" href="#/hub">ดูทั้งหมด · เขียนโพสต์</a></div>
  <section class="card hp-dash"><div data-hp-feed="3">${hpFeedHTML(3)}</div><a class="btn btn-ghost hp-write" href="#/hub">${ico('chat', 16)} เขียนโพสต์ถึงทีม</a></section>`;

/* ---------- actions ---------- */
document.addEventListener('submit', async e => {
  const f = e.target.closest && e.target.closest('.hp-reply'); if (!f) return; e.preventDefault();
  const inp = f.elements.t, btn = $('button', f), text = inp.value.trim(); if (!text || btn.disabled) return;
  btn.disabled = true;
  try { await HubPost.send({ kind: 'reply', parent: f.dataset.parent, text, cid: f.dataset.cid || (f.dataset.cid = uid('c')) }); inp.value = ''; delete HP_DRAFT[f.dataset.parent]; delete f.dataset.cid; HP_OPEN.add(f.dataset.parent); inp.blur(); hpDraw(); }
  catch (x) { toast(x.message, 'error'); }
  finally { btn.disabled = false; }
});
document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('.hp-reply')) setTimeout(() => { if ($$('[data-hp-feed][data-stale]').length && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.hp-reply'))) hpDraw(); }, 50); });
ACT.hpReact = async el => {
  if (el.dataset.busy) return; el.dataset.busy = '1';
  try { await HubPost.send({ kind: 'react', parent: el.dataset.id, emoji: el.dataset.emoji }); hpDraw(); } catch (x) { toast(x.message, 'error'); } finally { delete el.dataset.busy; }
};
ACT.hpDel = async el => { if (!await confirmBox('ลบรายการนี้? คนอื่นจะไม่เห็นอีก', 'ลบ', true)) return; try { await HubPost.send({ kind: 'del', parent: el.dataset.id }); hpDraw(); toast('ลบแล้ว'); } catch (x) { toast(x.message, 'error'); } };
ACT.hpMore = el => { HP_OPEN.add(el.dataset.id); hpDraw(); };
ACT.hpGo = el => { HP_OPEN.add(el.dataset.id); };
ACT.hpReload = async () => { HubPost.seq = null; await HubPost.load(); hpDraw(); };
ACT.hpGoSearch = el => { HP_OPEN.add(el.dataset.id); location.hash = '#/hub'; setTimeout(() => { const a = $(`[data-post="${el.dataset.id}"]`); if (a) { a.scrollIntoView({ block: 'center' }); a.classList.add('flash'); } }, 120); };
