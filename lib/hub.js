'use strict';
/* TEAM Hub API — shared by server.js (file storage) and api/[...path].js (Vercel + Upstash Redis).
   `store` must provide: getRev() getState() setState(state) getAuth() saveAuth(auth)  (all async).
   Passwords are kept in PLAIN TEXT on purpose so the Admin can read them for people who forgot. */
const crypto = require('crypto');
const SESSION_MS = 30 * 864e5;

function createHub(store, opts = {}) {
  const tries = {};   // brute-force guard (per server instance)
  const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  const readJson = req => new Promise(resolve => {
    if (req.body !== undefined && req.body !== null) { try { return resolve(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString() || '{}') : req.body); } catch (e) { return resolve(null); } }
    let b = ''; req.on('data', c => { b += c; if (b.length > 8e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve(null); } });
  });
  const peopleOf = st => { const gc = {}; (st.groups || []).forEach(g => { gc[g.id] = g.color; }); return (st.members || []).map(m => ({ id: m.id, name: m.name, emoji: m.emoji || '', role: m.role, color: gc[m.group] || '#64748b' })); };
  async function loadAuth() {
    let a = await store.getAuth(); let dirty = false;
    if (!a) { a = {}; dirty = true; }
    a.users ||= {}; a.sessions ||= {}; a.people ||= [];
    if (!a.default) { a.default = process.env.HUB_DEFAULT_PASSWORD || crypto.randomBytes(3).toString('hex'); a._generated = !process.env.HUB_DEFAULT_PASSWORD; dirty = true; if (opts.log) opts.log(a); }
    if (dirty) await store.saveAuth(a);
    return a;
  }
  const pwOf = (a, id) => (a.users[id] !== undefined ? a.users[id] : a.default);

  const handle = async function (req, res) {
    const url = new URL(req.url, 'http://x'), p = url.pathname.replace(/\/+$/, '');
    try {
      if (p === '/api/ping') { const rev = await store.getRev(); return send(res, 200, { server: true, configured: true, hasState: rev > 0, recovery: !!process.env.HUB_RECOVERY_CODE }); }
      const a = await loadAuth();
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const sess = a.sessions[token], me = sess && Date.now() - sess.at < SESSION_MS && a.people.find(x => x.id === sess.id) ? sess.id : null;
      const isAdmin = id => (a.people.find(x => x.id === id) || {}).role === 'admin';

      if (p === '/api/members' && req.method === 'GET') return send(res, 200, a.people.map(({ id, name, emoji, color }) => ({ id, name, emoji, color })));
      if (p === '/api/login' && req.method === 'POST') {
        const j = await readJson(req); if (!j) return send(res, 400, { error: 'bad request' });
        const m = a.people.find(x => x.id === j.id); if (!m) return send(res, 401, { error: 'ไม่พบผู้ใช้' });
        const t = tries[m.id] || (tries[m.id] = { n: 0, until: 0 });
        if (t.n >= 6 && Date.now() < t.until) return send(res, 429, { error: 'ใส่รหัสผิดหลายครั้ง กรุณารอ 1 นาทีแล้วลองใหม่' });
        if (String(j.password) !== String(pwOf(a, m.id))) { t.n++; t.until = Date.now() + 60e3; return send(res, 401, { error: 'รหัสผ่านไม่ถูกต้อง' }); }
        delete tries[m.id];
        for (const k of Object.keys(a.sessions)) if (Date.now() - a.sessions[k].at > SESSION_MS) delete a.sessions[k];
        const tk = crypto.randomBytes(24).toString('hex'); a.sessions[tk] = { id: m.id, at: Date.now() }; await store.saveAuth(a);
        return send(res, 200, { token: tk, id: m.id });
      }
      /* Admin recovery: needs the secret HUB_RECOVERY_CODE (set by whoever controls the hosting account).
         Each code value works ONCE; to use it again, change the value. Only Admin accounts can be recovered. */
      if (p === '/api/recover' && req.method === 'POST') {
        const j = await readJson(req); if (!j) return send(res, 400, { error: 'bad request' });
        const code = process.env.HUB_RECOVERY_CODE;
        if (!code || code.length < 8) return send(res, 403, { error: 'ยังไม่ได้เปิดใช้การกู้คืน — ตั้งค่า HUB_RECOVERY_CODE (อย่างน้อย 8 ตัว) ใน Vercel แล้ว Redeploy' });
        const t = tries.__recover || (tries.__recover = { n: 0, until: 0 });
        if (t.n >= 6 && Date.now() < t.until) return send(res, 429, { error: 'ลองผิดหลายครั้ง กรุณารอ 1 นาที' });
        const h = s => crypto.createHash('sha256').update(String(s)).digest();
        if (!crypto.timingSafeEqual(h(j.code || ''), h(code))) { t.n++; t.until = Date.now() + 60e3; return send(res, 401, { error: 'รหัสกู้คืนไม่ถูกต้อง' }); }
        const digest = h(code).toString('hex');
        if (a.recoveryUsed === digest) return send(res, 403, { error: 'รหัสกู้คืนนี้ถูกใช้ไปแล้ว — ตั้งค่า HUB_RECOVERY_CODE เป็นค่าใหม่ แล้ว Redeploy' });
        const target = a.people.find(x => x.id === j.id);
        if (!target || target.role !== 'admin') return send(res, 400, { error: 'กู้คืนได้เฉพาะบัญชี Admin' });
        if (!j.password || String(j.password).length < 4) return send(res, 400, { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัว' });
        delete tries.__recover; delete tries[target.id];
        a.users[target.id] = String(j.password); a.recoveryUsed = digest;
        for (const k of Object.keys(a.sessions)) if (a.sessions[k].id === target.id) delete a.sessions[k];   // sign that account out everywhere
        await store.saveAuth(a); return send(res, 200, {});
      }
      if (p === '/api/state' && req.method === 'PUT' && (await store.getRev()) === 0) {   // one-time bootstrap of an empty store
        const j = await readJson(req); if (!j || !j.state || !j.state.members) return send(res, 400, { error: 'bad state' });
        delete j.state.auth; a.people = peopleOf(j.state); const first = a._generated ? a.default : undefined; delete a._generated; await store.saveAuth(a);
        const rev = await store.setState(j.state); return send(res, 200, { rev, initialPassword: first });
      }
      if (!me) return send(res, 401, { error: 'unauthorized' });

      if (p === '/api/session') return send(res, 200, { id: me });
      if (p === '/api/logout') { delete a.sessions[token]; await store.saveAuth(a); return send(res, 200, {}); }
      if (p === '/api/password' && req.method === 'POST') {
        const j = await readJson(req);
        if (!j || String(j.current) !== String(pwOf(a, me))) return send(res, 400, { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        if (!j.next || String(j.next).length < 4) return send(res, 400, { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัว' });
        a.users[me] = String(j.next); await store.saveAuth(a); return send(res, 200, {});
      }
      if (p === '/api/admin/passwords' && req.method === 'GET') {
        if (!isAdmin(me)) return send(res, 403, { error: 'forbidden' });
        return send(res, 200, { default: a.default, list: a.people.map(m => ({ id: m.id, password: pwOf(a, m.id), custom: a.users[m.id] !== undefined })) });
      }
      if (p === '/api/admin/password' && req.method === 'POST') {
        if (!isAdmin(me)) return send(res, 403, { error: 'forbidden' });
        const j = await readJson(req); if (!j) return send(res, 400, { error: 'bad request' });
        if (j.default !== undefined) { if (String(j.default).length < 4) return send(res, 400, { error: 'รหัสต้องมีอย่างน้อย 4 ตัว' }); a.default = String(j.default); }
        else if (!a.people.find(m => m.id === j.id)) return send(res, 400, { error: 'ไม่พบผู้ใช้' });
        else if (j.password === null) delete a.users[j.id];
        else if (String(j.password).length < 4) return send(res, 400, { error: 'รหัสต้องมีอย่างน้อย 4 ตัว' });
        else a.users[j.id] = String(j.password);
        await store.saveAuth(a); return send(res, 200, {});
      }
      if (p === '/api/state') {
        if (req.method === 'GET') {
          const rev = await store.getRev();
          if (url.searchParams.get('rev') === String(rev)) { res.statusCode = 304; return res.end(); }
          return send(res, 200, await store.getState());
        }
        if (req.method === 'PUT') {
          const j = await readJson(req); if (!j || !j.state || !j.state.members) return send(res, 400, { error: 'bad state' });
          const st = j.state; delete st.auth;
          if (!isAdmin(me)) {   // only Admin may add/remove members or change roles
            st.members = st.members.filter(m => a.people.find(x => x.id === m.id));
            st.members.forEach(m => { m.role = a.people.find(x => x.id === m.id).role; });
            if (st.members.length < a.people.length) return send(res, 403, { error: 'เฉพาะ Admin เท่านั้นที่ลบสมาชิกได้' });
          }
          a.people = peopleOf(st); await store.saveAuth(a);
          return send(res, 200, { rev: await store.setState(st) });
        }
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) { console.error(e); return send(res, 500, { error: 'server error: ' + e.message }); }
  };
  handle.init = loadAuth;   // lets server.js create (and print) the initial password at start-up
  return handle;
}
module.exports = { createHub };
