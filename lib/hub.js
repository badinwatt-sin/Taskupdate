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
      if (p === '/api/ping') { const rev = await store.getRev(); return send(res, 200, { server: true, configured: true, hasState: rev > 0, recovery: !!process.env.HUB_RECOVERY_CODE, version: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local' }); }
      const a = await loadAuth();
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const sess = a.sessions[token], me = sess && Date.now() - sess.at < SESSION_MS && a.people.find(x => x.id === sess.id) ? sess.id : null;
      const isAdmin = id => (a.people.find(x => x.id === id) || {}).role === 'admin';
      const aiKey = process.env.ANTHROPIC_API_KEY || a.aiKey || '';
      const geminiKey = process.env.GEMINI_API_KEY || a.geminiKey || '';   // free tier from Google AI Studio   // Vercel env wins; else the key an Admin saved in the app (never sent to browsers)

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
      if (p === '/api/img') {   // project posters (stored apart from the shared state so syncing stays light)
        const id = url.searchParams.get('id') || '';
        if (!/^[a-z0-9_]{1,48}$/i.test(id)) return send(res, 400, { error: 'bad id' });
        if (req.method === 'GET') { const data = await store.getBlob(id); return data ? send(res, 200, { data }) : send(res, 404, { error: 'not found' }); }
        if (req.method === 'PUT') {
          const j = await readJson(req); const data = j && j.data;
          if (data !== null && (typeof data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(data) || data.length > 700000)) return send(res, 400, { error: 'รูปต้องเป็น JPG/PNG และไม่ใหญ่เกิน ~500 KB' });
          await store.setBlob(id, data); return send(res, 200, {});
        }
      }
      if (p === '/api/font') {   // brand font files uploaded by an Admin (commercial fonts stay out of the public repo)
        const id = url.searchParams.get('id') || '';
        if (!/^font_[a-z0-9]{4,24}$/.test(id)) return send(res, 400, { error: 'bad id' });
        if (req.method === 'GET') { const data = await store.getBlob(id); return data ? send(res, 200, { data }) : send(res, 404, { error: 'not found' }); }
        if (req.method === 'PUT') {
          if (!isAdmin(me)) return send(res, 403, { error: 'อัปโหลดฟอนต์ได้เฉพาะ Admin' });
          const j = await readJson(req); const data = j && j.data;
          if (typeof data !== 'string' || !/^data:font\/(ttf|otf|woff2?);base64,/.test(data) || data.length > 950000) return send(res, 400, { error: 'ไฟล์ฟอนต์ต้องเป็น .ttf .otf .woff .woff2 และไม่ใหญ่เกิน ~700 KB ต่อไฟล์ (ใช้ .woff2 จะเล็กกว่า)' });
          await store.setBlob(id, data); return send(res, 200, {});
        }
      }
      if (p.startsWith('/api/push-')) {   // Web Push: device subscriptions + test
        const push = require('./push'), subject = 'https://' + String(req.headers.host || 'localhost').replace(/[^\w.:-]/g, '');
        if (p === '/api/push-key') { const [k, gen] = push.keys(a); if (gen) await store.saveAuth(a); return send(res, 200, { key: k.publicKey }); }
        const j = await readJson(req) || {};
        a.pushSubs ||= {};
        if (p === '/api/push-subscribe' && req.method === 'POST') {
          const sub = j.sub; if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return send(res, 400, { error: 'bad subscription' });
          const list = (a.pushSubs[me] || []).filter(x => x.sub.endpoint !== sub.endpoint);
          list.push({ sub: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }, ua: String(j.ua || '').slice(0, 120), at: Date.now() });
          a.pushSubs[me] = list.slice(-8); await store.saveAuth(a); return send(res, 200, {});
        }
        if (p === '/api/push-unsubscribe' && req.method === 'POST') { a.pushSubs[me] = (a.pushSubs[me] || []).filter(x => x.sub.endpoint !== j.endpoint); await store.saveAuth(a); return send(res, 200, {}); }
        if (p === '/api/push-test' && req.method === 'POST') {
          if (!(a.pushSubs[me] || []).length) return send(res, 400, { error: 'เครื่องนี้ยังไม่ได้เปิดการแจ้งเตือน' });
          const dirty = await push.sendNotices(a, [{ id: 'test', to: me, text: 'ทดสอบการแจ้งเตือน TEAM Hub', sub: 'ถ้าเห็นข้อความนี้ แปลว่าการแจ้งเตือนบนเครื่องนี้ใช้งานได้แล้ว 🎉' }], subject);
          if (dirty) await store.saveAuth(a); return send(res, 200, {});
        }
      }
      if (p === '/api/ai-events' && req.method === 'POST') {
        if (!aiKey) return send(res, 501, { error: 'ยังไม่ได้เปิดใช้ AI — Admin ต้องเพิ่ม ANTHROPIC_API_KEY ใน Vercel → Settings → Environment Variables แล้ว Redeploy' });
        const ai = require('./ai'); ai.useKey(aiKey);
        const j = await readJson(req); const text = String(j?.text || '').trim();
        if (!text) return send(res, 400, { error: 'ชีตนี้ไม่มีข้อมูล' });
        if (text.length > ai.MAX_CHARS) return send(res, 413, { error: `ชีตนี้ใหญ่เกินไปสำหรับ AI (${text.length.toLocaleString()} ตัวอักษร เกิน ${ai.MAX_CHARS.toLocaleString()}) — ลบแถว/คอลัมน์ที่ไม่เกี่ยวข้อง หรือแยกเป็นหลายชีต` });
        try { return send(res, 200, { events: await ai.extractEvents({ text, sheet: j.sheet, today: j.today }) }); }
        catch (e) { console.error('ai-events', e); const [code, msg] = ai.aiErrorMessage(e); return send(res, code, { error: msg }); }
      }
      if (p === '/api/ai-poster' && req.method === 'POST') {
        if (!isAdmin(me)) return send(res, 403, { error: 'Poster ใช้ได้เฉพาะ Admin' });
        if (!aiKey) return send(res, 501, { error: 'ยังไม่ได้เปิดใช้ AI — Admin ต้องเพิ่ม ANTHROPIC_API_KEY ใน Vercel → Settings → Environment Variables แล้ว Redeploy' });
        const ai = require('./ai'); ai.useKey(aiKey);
        const j = await readJson(req); const f = j && j.fields;
        if (!f || !String(f.headline || f.content || '').trim()) return send(res, 400, { error: 'กรอก Headline หรือ Content ก่อน' });
        if (JSON.stringify(f).length > 20000) return send(res, 413, { error: 'ข้อความยาวเกินไปสำหรับโปสเตอร์ — ตัดให้สั้นลงก่อน' });
        try { return send(res, 200, { result: await ai.rewritePoster({ template: String(j.template || ''), format: String(j.format || ''), fields: f }) }); }
        catch (e) { console.error('ai-poster', e); const [code, msg] = ai.aiErrorMessage(e); return send(res, code, { error: msg }); }
      }
      if (p === '/api/ai-status' && req.method === 'GET') {   // which AI is connected (no key material — only where it comes from and, for Admins, the last 4 characters)
        const info = (key, env, saved) => ({ on: !!key, source: env ? 'vercel' : saved ? 'app' : '', tail: isAdmin(me) && key ? key.slice(-4) : '' });
        return send(res, 200, { on: !!(geminiKey || aiKey), provider: geminiKey ? 'gemini' : aiKey ? 'claude' : '', gemini: info(geminiKey, process.env.GEMINI_API_KEY, a.geminiKey), claude: info(aiKey, process.env.ANTHROPIC_API_KEY, a.aiKey) });
      }
      if (p === '/api/ai-key' && req.method === 'POST') {   // Admin connects / removes an AI key from inside the app (Gemini free tier or Claude)
        if (!isAdmin(me)) return send(res, 403, { error: 'ตั้งค่า AI ได้เฉพาะ Admin' });
        const j = await readJson(req); const key = String(j?.key || '').trim(), provider = j?.provider === 'claude' ? 'claude' : 'gemini';
        const field = provider === 'gemini' ? 'geminiKey' : 'aiKey';
        if (!key) { delete a[field]; delete a[field + 'At']; await store.saveAuth(a); return send(res, 200, { ok: true }); }
        if (provider === 'gemini') {
          if (!/^[\w-]{30,60}$/.test(key)) return send(res, 400, { error: 'รูปแบบ API Key ไม่ถูกต้อง — คีย์จาก Google AI Studio มักขึ้นต้นด้วย AIza' });
          const gm = require('./gemini');
          try { await gm.checkKey(key); } catch (e) { console.error('gemini-key', e.message); const [code, msg] = gm.errorMessage(e); return send(res, code >= 500 ? 502 : 400, { error: msg }); }
        } else {
          if (!/^sk-ant-[\w-]{20,}$/.test(key)) return send(res, 400, { error: 'รูปแบบ API Key ไม่ถูกต้อง — ต้องขึ้นต้นด้วย sk-ant-' });
          const ai = require('./ai');
          try { await ai.checkKey(key); } catch (e) { console.error('ai-key', e); const [code, msg] = ai.aiErrorMessage(e); return send(res, code === 502 && /ไม่ถูกต้อง/.test(msg) ? 400 : code, { error: code === 502 && /ไม่ถูกต้อง/.test(msg) ? 'API Key นี้ใช้ไม่ได้ — ตรวจว่าคัดลอกครบและยังไม่ถูกยกเลิก' : msg }); }
        }
        a[field] = key; a[field + 'At'] = Date.now(); await store.saveAuth(a);
        return send(res, 200, { ok: true, tail: key.slice(-4) });
      }
      if (p === '/api/ai-brief' && req.method === 'POST') {   // Poster Studio: read the message → brief (Gemini free tier first, Claude if connected, else the app's own engine)
        if (!isAdmin(me)) return send(res, 403, { error: 'Poster ใช้ได้เฉพาะ Admin' });
        if (!geminiKey && !aiKey) return send(res, 501, { error: 'ยังไม่ได้เชื่อม AI' });
        const j = await readJson(req); const text = String(j?.text || '').trim();
        if (!text) return send(res, 400, { error: 'วางข้อความที่ต้องการสื่อสารก่อน' });
        if (text.length > 8000) return send(res, 413, { error: 'ข้อความยาวเกินไปสำหรับโปสเตอร์ (เกิน 8,000 ตัวอักษร)' });
        const args = { text, format: String(j.format || '').slice(0, 20), guide: String(j.guide || '').slice(0, 1500), design: String(j.design || '').slice(0, 20), accent: String(j.accent || '').slice(0, 20), today: String(j.today || '').slice(0, 20) };
        let err = null;
        if (geminiKey) { const gm = require('./gemini'); try { return send(res, 200, { result: await gm.briefPoster(geminiKey, args), by: 'gemini' }); } catch (e) { console.error('ai-brief gemini', e.status, e.message); err = gm.errorMessage(e); } }
        if (aiKey) { const ai = require('./ai'); ai.useKey(aiKey); try { return send(res, 200, { result: await ai.briefPoster(args), by: 'claude' }); } catch (e) { console.error('ai-brief claude', e); err = ai.aiErrorMessage(e); } }
        return send(res, err[0] || 502, { error: err[1] });
      }
      if (p === '/api/ai-design' && req.method === 'POST') {   // small call: picks the visual only
        if (!isAdmin(me)) return send(res, 403, { error: 'Poster ใช้ได้เฉพาะ Admin' });
        if (!aiKey) return send(res, 501, { error: 'ยังไม่ได้เปิดใช้ AI' });
        const ai = require('./ai'); ai.useKey(aiKey); const j = await readJson(req); const text = String(j?.text || '').trim();
        if (!text) return send(res, 400, { error: 'กรอก Headline หรือ Content ก่อน' });
        try { return send(res, 200, { result: await ai.designPoster({ template: String(j.template || '').slice(0, 40), text: text.slice(0, 600) }) }); }
        catch (e) { console.error('ai-design', e); const [code, msg] = ai.aiErrorMessage(e); return send(res, code, { error: msg }); }
      }
      if ((p === '/api/admin-passwords' || p === '/api/admin/passwords') && req.method === 'GET') {
        if (!isAdmin(me)) return send(res, 403, { error: 'forbidden' });
        return send(res, 200, { default: a.default, list: a.people.map(m => ({ id: m.id, password: pwOf(a, m.id), custom: a.users[m.id] !== undefined })) });
      }
      if ((p === '/api/admin-password' || p === '/api/admin/password') && req.method === 'POST') {
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
          a.people = peopleOf(st);
          const rev = await store.setState(st);
          // Web Push for notices created by this save (sent only by their author, only when fresh)
          const ids = Array.isArray(j.notify) ? j.notify.slice(0, 200) : [];
          if (ids.length && a.pushSubs && Object.keys(a.pushSubs).length) {
            const fresh = (st.notices || []).filter(n => ids.includes(n.id) && n.by === me && Date.now() - n.at < 15 * 60e3);
            if (fresh.length) { try { await require('./push').sendNotices(a, fresh, 'https://' + String(req.headers.host || 'localhost').replace(/[^\w.:-]/g, '')); } catch (e) { console.error('push', e); } }
          }
          await store.saveAuth(a);
          return send(res, 200, { rev });
        }
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) { console.error(e); return send(res, 500, { error: 'server error: ' + e.message }); }
  };
  handle.init = loadAuth;   // lets server.js create (and print) the initial password at start-up
  return handle;
}
module.exports = { createHub };
