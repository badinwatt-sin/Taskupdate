/* ============================================================
   Sign-in: password per person, set by Admin, changeable by the person.
   Admin can always see everyone's current password (to help people who forgot).
   Server mode  → enforced by server.js (token required for all data).
   Local mode   → demo only; passwords live in the browser data (not secure).
   ============================================================ */
const LS_TOKEN = 'aex-hub-token';
const Auth = {
  async members() {
    if (Store.mode === 'server') { const r = await fetch('api/members', { cache: 'no-store' }); return r.json(); }
    return S().members.map(m => ({ id: m.id, name: m.name, emoji: m.emoji || '', color: group(m.group).color, role: m.role }));
  },
  /* returns member id if already signed in */
  async restore() {
    if (Store.mode === 'server') {
      let t = null; try { t = localStorage.getItem(LS_TOKEN); } catch (e) { }
      if (!t) return null; Store.token = t;
      try { const r = await fetch('api/session', { headers: Store.headers() }); if (!r.ok) throw 0; return (await r.json()).id; }
      catch (e) { Store.token = null; try { localStorage.removeItem(LS_TOKEN); } catch (x) { } return null; }
    }
    let id = null; try { id = localStorage.getItem(LS_ME); } catch (e) { }
    return id && member(id) ? id : null;
  },
  async login(id, pw) {
    if (Store.mode === 'server') {
      const r = await fetch('api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password: pw }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'เข้าสู่ระบบไม่สำเร็จ');
      Store.token = j.token; try { localStorage.setItem(LS_TOKEN, j.token); } catch (e) { }
      return id;
    }
    const a = S().auth, real = a.pw[id] ?? a.defaultPassword;
    if (pw !== real) throw new Error('รหัสผ่านไม่ถูกต้อง');
    try { localStorage.setItem(LS_ME, id); } catch (e) { }
    return id;
  },
  async recover(code, id, password) {
    const r = await fetch('api/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, id, password }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'กู้คืนไม่สำเร็จ');
  },
  async logout() {
    if (Store.mode === 'server') { try { await fetch('api/logout', { method: 'POST', headers: Store.headers() }); } catch (e) { } try { localStorage.removeItem(LS_TOKEN); } catch (e) { } }
    else { try { localStorage.removeItem(LS_ME); } catch (e) { } }
    location.reload();
  },
  expired() { try { localStorage.removeItem(LS_TOKEN); } catch (e) { } toast('หมดเวลาการเข้าระบบ — กรุณาเข้าสู่ระบบใหม่', 'error'); setTimeout(() => location.reload(), 1200); },
  async change(cur, next) {
    if (Store.mode === 'server') {
      const r = await fetch('api/password', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ current: cur, next }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'เปลี่ยนรหัสไม่สำเร็จ'); return;
    }
    const a = S().auth; if (cur !== (a.pw[AEX.meId] ?? a.defaultPassword)) throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    a.pw[AEX.meId] = next; Store.save();
  },
  /* ---- Admin only ---- */
  async adminList() {
    if (Store.mode === 'server') { const r = await fetch('api/admin/passwords', { headers: Store.headers() }); if (!r.ok) throw new Error('forbidden'); return r.json(); }
    const a = S().auth; return { default: a.defaultPassword, list: S().members.map(m => ({ id: m.id, password: a.pw[m.id] ?? a.defaultPassword, custom: m.id in a.pw })) };
  },
  async adminSet(id, password) {
    if (Store.mode === 'server') { const r = await fetch('api/admin/password', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ id, password }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'ไม่สำเร็จ'); return; }
    const a = S().auth; if (password == null) delete a.pw[id]; else a.pw[id] = password; Store.save();
  },
  async adminDefault(password) {
    if (Store.mode === 'server') { const r = await fetch('api/admin/password', { method: 'POST', headers: Store.headers(true), body: JSON.stringify({ default: password }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'ไม่สำเร็จ'); return; }
    S().auth.defaultPassword = password; Store.save();
  },
};

/* ---------- login screen ---------- */
function showLogin(bootMsg) {
  return new Promise(async resolve => {
    let list = []; try { list = await Auth.members(); } catch (e) { }
    const el = document.createElement('div'); el.id = 'login'; document.body.appendChild(el); document.body.classList.add('no-scroll');
    const tile = m => `<button class="lg-tile" data-id="${esc(m.id)}"><span class="avatar ${m.emoji ? 'emo' : ''}" style="--s:46px;background:${m.emoji ? 'color-mix(in srgb,' + m.color + ' 22%,#fff)' : m.color};${m.emoji ? 'box-shadow:0 0 0 2px ' + m.color : ''}">${esc(m.emoji || m.name.slice(0, 2))}</span><b>${esc(m.name)}</b></button>`;
    const demo = Store.mode === 'local';
    el.innerHTML = `<div class="lg-card"><div class="logo lg-logo"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></div>
      <h1>TEAM Hub</h1><p class="muted">Agency Experience Team · เลือกชื่อของคุณเพื่อเข้าสู่ระบบ</p>
      <div id="lgPick" class="lg-grid">${list.map(tile).join('') || '<p class="muted">ยังไม่มีรายชื่อสมาชิก</p>'}</div>
      <form id="lgForm" hidden autocomplete="off"><div class="lg-who"><button type="button" class="icon-btn" id="lgBack" aria-label="ย้อนกลับ">${ico('left')}</button><span id="lgName"></span></div>
        <label class="field"><span>รหัสผ่าน</span><input type="password" id="lgPw" autocomplete="current-password" placeholder="รหัสผ่านที่ Admin ให้ หรือที่คุณตั้งเอง"></label>
        <div class="lg-err" id="lgErr" role="alert"></div><button class="btn btn-primary lg-go" id="lgGo">เข้าสู่ระบบ</button>
        <p class="muted small center">ลืมรหัสผ่าน? ติดต่อ Admin เพื่อขอรหัส</p></form>
      <form id="lgRec" hidden autocomplete="off"><div class="lg-who"><button type="button" class="icon-btn" id="lgRecBack" aria-label="ย้อนกลับ">${ico('left')}</button><span>กู้คืนบัญชี Admin</span></div>
        <label class="field"><span>บัญชี Admin</span><select id="rcWho">${list.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label>
        <label class="field"><span>รหัสกู้คืน (HUB_RECOVERY_CODE)</span><input type="password" id="rcCode" autocomplete="off"></label>
        <label class="field"><span>รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)</span><input type="password" id="rcPw" minlength="4" autocomplete="new-password"></label>
        <div class="lg-err" id="rcErr" role="alert"></div><button class="btn btn-primary lg-go">ตั้งรหัสผ่านใหม่</button></form>
      ${Store.mode === 'server' && Store.recovery ? '<p class="center mt"><button type="button" class="link-btn" id="lgForgot">ลืมรหัส Admin? กู้คืนด้วยรหัสกู้คืน</button></p>' : ''}
      ${demo ? `<div class="note warn lg-demo">โหมดสาธิต: รหัสผ่านเก็บในเบราว์เซอร์นี้ ไม่ใช่ความปลอดภัยจริง · รหัสเริ่มต้นของทุกคนคือ <b>${esc(S().auth.defaultPassword)}</b></div>` : ''}${bootMsg ? `<div class="note lg-demo">${bootMsg}</div>` : ''}</div>`;
    let cur = null; const form = $('#lgForm', el), pw = $('#lgPw', el), err = $('#lgErr', el);
    el.addEventListener('click', e => { const t = e.target.closest('.lg-tile'); if (!t) return; cur = list.find(m => m.id === t.dataset.id); $('#lgPick', el).hidden = true; form.hidden = false; $('#lgName', el).textContent = cur.name; err.textContent = ''; pw.value = ''; pw.focus(); });
    $('#lgBack', el).onclick = () => { form.hidden = true; $('#lgPick', el).hidden = false; };
    const rec = $('#lgRec', el), forgot = $('#lgForgot', el);
    if (forgot) {
      forgot.onclick = () => { $('#lgPick', el).hidden = true; form.hidden = true; rec.hidden = false; forgot.parentElement.hidden = true; $('#rcCode', el).focus(); };
      $('#lgRecBack', el).onclick = () => { rec.hidden = true; $('#lgPick', el).hidden = false; forgot.parentElement.hidden = false; };
      rec.onsubmit = async e => {
        e.preventDefault(); const err = $('#rcErr', el); err.textContent = '';
        try { await Auth.recover($('#rcCode', el).value, $('#rcWho', el).value, $('#rcPw', el).value); const id = await Auth.login($('#rcWho', el).value, $('#rcPw', el).value); el.remove(); document.body.classList.remove('no-scroll'); toast('ตั้งรหัสใหม่แล้ว — แนะนำให้ลบ HUB_RECOVERY_CODE ออกจาก Vercel'); resolve(id); }
        catch (x) { err.textContent = x.message; }
      };
    }
    form.onsubmit = async e => {
      e.preventDefault(); const go = $('#lgGo', el); go.disabled = true; err.textContent = '';
      try { const id = await Auth.login(cur.id, pw.value); el.remove(); document.body.classList.remove('no-scroll'); resolve(id); }
      catch (x) { err.textContent = x.message; pw.select(); } finally { go.disabled = false; }
    };
  });
}

/* ---------- account menu + change password ---------- */
function openAccount() {
  const m = me();
  modal({
    title: ACTION.account[0],
    body: `<div class="acct"><div class="person">${avatar(m, 52)}<div><b style="font-size:17px">${esc(m.name)}</b><small>${m.role === 'admin' ? 'Admin' : isPM() ? 'Project Manager' : isLeader() ? 'หัวหน้าทีม' : 'สมาชิก'} · ${esc(m.position)}</small></div></div></div>
      <form id="pwForm" class="form-grid mt" autocomplete="off"><div class="full"><b>เปลี่ยนรหัสผ่าน</b></div>
        <label class="field full"><span>รหัสผ่านปัจจุบัน</span><input type="password" name="cur" autocomplete="current-password" required></label>
        <label class="field"><span>รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)</span><input type="password" name="n1" minlength="4" autocomplete="new-password" required></label>
        <label class="field"><span>ยืนยันรหัสผ่านใหม่</span><input type="password" name="n2" minlength="4" autocomplete="new-password" required></label>
        <div class="full muted small">หมายเหตุ: Admin สามารถเห็นรหัสผ่านของทุกคนได้ เพื่อช่วยเหลือกรณีลืมรหัส จึงไม่ควรใช้รหัสเดียวกับที่อื่น</div></form>
      <p class="muted small center mt">TEAM Hub · เวอร์ชัน <b>${esc(Store.version || (Store.mode === 'local' ? 'สาธิต' : '–'))}</b></p>`,
    actions: [{ label: ico('left', 15) + ' ออกจากระบบ', cls: 'btn-danger-ghost', left: true, onClick: () => { Auth.logout(); return false; } }, { label: 'ปิด' }, {
      label: 'บันทึกรหัสใหม่', cls: 'btn-primary', onClick: async () => {
        const f = $('#pwForm'); if (!f.reportValidity()) return false;
        if (f.elements.n1.value !== f.elements.n2.value) { toast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'error'); return false; }
        try { await Auth.change(f.elements.cur.value, f.elements.n1.value); toast('เปลี่ยนรหัสผ่านแล้ว'); } catch (e) { toast(e.message, 'error'); return false; }
      },
    }],
    onOpen(md) { $('#pwForm', md.el).addEventListener('submit', e => e.preventDefault()); },
  });
}
ACT.account = () => openAccount();

/* ---------- Admin: current password shown on every member card ---------- */
let PW_CACHE = null;
function paintCardPasswords(d) {
  const by = new Map(d.list.map(x => [x.id, x]));
  $$('.pwline').forEach(el => {
    const x = by.get(el.dataset.id) || { password: d.default, custom: false };   // member added after the login list was made: still on the default password
    el.innerHTML = `<span class="muted small">รหัสผ่านปัจจุบัน</span><code class="pwc" title="แตะเพื่อคัดลอก" data-act="copyPw" data-pw="${esc(x.password)}">${esc(x.password)}</code><span class="pw-tag ${x.custom ? 'own' : ''}">${x.custom ? 'ตั้งเอง' : 'รหัสเริ่มต้น'}</span>`;
  });
}
async function fillCardPasswords() {
  if (!isAdmin()) return;
  if (PW_CACHE) paintCardPasswords(PW_CACHE);   // instant from the last read, then refresh
  try { PW_CACHE = await Auth.adminList(); paintCardPasswords(PW_CACHE); } catch (e) { if (!PW_CACHE) $$('.pwline .pwc').forEach(c => { c.textContent = 'โหลดไม่ได้'; }); }
}
ACT.copyPw = async el => { try { await navigator.clipboard.writeText(el.dataset.pw); toast('คัดลอกรหัสผ่านแล้ว'); } catch (e) { toast(el.dataset.pw, 'ok'); } };

/* ---------- Admin: passwords table (inside Team) ---------- */
async function loadAccessTable() {
  const box = $('#accessBox'); if (!box) return;
  let data; try { data = await Auth.adminList(); } catch (e) { box.innerHTML = '<p class="muted small">โหลดรายการรหัสผ่านไม่ได้</p>'; return; }
  const byId = new Map(data.list.map(x => [x.id, x]));
  box.innerHTML = `<div class="inline-add" style="grid-template-columns:1fr auto auto;margin-bottom:14px"><label class="field" style="margin:0"><span>รหัสเริ่มต้น (ใช้กับสมาชิกที่ยังไม่เคยตั้งรหัสเอง)</span><input id="defPw" value="${esc(data.default)}"></label><button class="btn btn-ghost btn-sm" data-act="saveDefaultPw" style="align-self:end">บันทึก</button><span></span></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>สมาชิก</th><th>รหัสผ่านปัจจุบัน</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${S().members.map(m => { const x = byId.get(m.id) || { password: data.default, custom: false }; return `<tr data-id="${m.id}"><td><div class="person">${avatar(m, 26)}<b>${esc(m.name)}</b></div></td>
      <td><code class="pwc" data-pw="${esc(x.password)}">••••••••</code> <button class="icon-btn" data-act="togglePw" aria-label="แสดง/ซ่อนรหัส">${ico('search', 15)}</button></td>
      <td class="small">${x.custom ? '<span class="badge st-done">ตั้งเองแล้ว</span>' : '<span class="badge">ใช้รหัสเริ่มต้น</span>'}</td>
      <td class="acts"><button class="btn btn-ghost btn-sm" data-act="setPw" data-id="${m.id}">ตั้งรหัสใหม่</button>${x.custom ? `<button class="btn btn-ghost btn-sm" data-act="resetPw" data-id="${m.id}">รีเซ็ตเป็นรหัสเริ่มต้น</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
}
ACT.togglePw = el => { const c = $('.pwc', el.closest('tr')); c.textContent = c.textContent.startsWith('•') ? c.dataset.pw : '••••••••'; };
ACT.saveDefaultPw = async () => { const v = $('#defPw').value.trim(); if (v.length < 4) return toast('รหัสเริ่มต้นต้องมีอย่างน้อย 4 ตัว', 'error'); try { await Auth.adminDefault(v); toast('บันทึกรหัสเริ่มต้นแล้ว'); loadAccessTable(); } catch (e) { toast(e.message, 'error'); } };
ACT.resetPw = async el => { try { await Auth.adminSet(el.dataset.id, null); toast('รีเซ็ตเป็นรหัสเริ่มต้นแล้ว'); loadAccessTable(); } catch (e) { toast(e.message, 'error'); } };
ACT.setPw = el => {
  const m = member(el.dataset.id);
  modal({
    title: `ตั้งรหัสผ่านใหม่ — ${m.name}`,
    body: `<label class="field"><span>รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)</span><input id="npw" minlength="4" value="" autocomplete="off"></label><p class="muted small mt">แจ้งรหัสนี้ให้ ${esc(m.name)} โดยตรง — เขาเปลี่ยนเองได้หลังเข้าสู่ระบบ</p>`,
    actions: [{ label: 'ยกเลิก' }, { label: 'บันทึก', cls: 'btn-primary', onClick: async () => { const v = $('#npw').value.trim(); if (v.length < 4) { toast('รหัสผ่านต้องมีอย่างน้อย 4 ตัว', 'error'); return false; } try { await Auth.adminSet(m.id, v); toast('ตั้งรหัสใหม่แล้ว'); loadAccessTable(); } catch (e) { toast(e.message, 'error'); return false; } } }],
  });
};
