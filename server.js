#!/usr/bin/env node
/* TEAM Hub server — zero dependencies.
   Serves the app, shares one team dataset (data/state.json) and enforces sign-in.
   Usage: node server.js [port]   (default 3000)
   Passwords (data/auth.json) are stored in PLAIN TEXT on purpose: the Admin must be able to read them
   to help people who forgot. Keep the data/ folder private and serve over HTTPS in production. */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +(process.argv[2] || process.env.PORT || 3000), ROOT = __dirname, DIR = path.join(ROOT, 'data');
const DATA = path.join(DIR, 'state.json'), AUTH = path.join(DIR, 'auth.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const SESSION_MS = 30 * 864e5;

let db = { rev: 0, state: null };
try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { }
let auth = { default: '', users: {}, sessions: {} };
try { auth = Object.assign(auth, JSON.parse(fs.readFileSync(AUTH, 'utf8'))); } catch (e) { }
const write = (f, o) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(o)); fs.renameSync(f + '.tmp', f); };
const persist = () => write(DATA, db), saveAuth = () => write(AUTH, auth);
if (!auth.default) { auth.default = crypto.randomBytes(3).toString('hex'); saveAuth(); console.log(`\n  Initial password for every member: ${auth.default}\n  (Admin can change it, and set per-person passwords, in Team & Access)\n`); }

const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
const body = (req, cb, max = 60e6) => { let b = ''; req.on('data', c => { b += c; if (b.length > max) req.destroy(); }); req.on('end', () => { try { cb(JSON.parse(b || '{}')); } catch (e) { cb(null); } }); };
const members = () => (db.state && db.state.members) || [];
const meOf = req => { const t = (req.headers.authorization || '').replace(/^Bearer /, ''), s = auth.sessions[t]; if (!s || Date.now() - s.at > SESSION_MS || !members().find(m => m.id === s.id)) return null; return s.id; };
const isAdmin = id => (members().find(m => m.id === id) || {}).role === 'admin';
const passwordOf = id => (auth.users[id] !== undefined ? auth.users[id] : auth.default);
const tries = {};   // brute-force guard: 6 wrong passwords → 1 minute lock per member
const locked = id => tries[id] && tries[id].n >= 6 && Date.now() < tries[id].until;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  if (p.startsWith('/api/')) {
    const me = meOf(req);
    if (p === '/api/ping') return send(res, 200, { server: true, hasState: !!db.state });
    if (p === '/api/members' && req.method === 'GET') {
      const gc = {}; ((db.state && db.state.groups) || []).forEach(g => { gc[g.id] = g.color; });
      return send(res, 200, members().map(m => ({ id: m.id, name: m.name, emoji: m.emoji || '', color: gc[m.group] || '#64748b' })));
    }
    if (p === '/api/login' && req.method === 'POST') return body(req, j => {
      if (!j) return send(res, 400, { error: 'bad request' });
      const m = members().find(x => x.id === j.id); if (!m) return send(res, 401, { error: 'ไม่พบผู้ใช้' });
      if (locked(m.id)) return send(res, 429, { error: 'ใส่รหัสผิดหลายครั้ง กรุณารอ 1 นาทีแล้วลองใหม่' });
      if (String(j.password) !== String(passwordOf(m.id))) { const t = tries[m.id] = tries[m.id] || { n: 0 }; t.n++; t.until = Date.now() + 60e3; return send(res, 401, { error: 'รหัสผ่านไม่ถูกต้อง' }); }
      delete tries[m.id]; const token = crypto.randomBytes(24).toString('hex'); auth.sessions[token] = { id: m.id, at: Date.now() }; saveAuth(); send(res, 200, { token, id: m.id });
    });
    if (p === '/api/state' && req.method === 'PUT' && !db.state) {   // one-time bootstrap of an empty server
      return body(req, j => { if (!j || !j.state || !j.state.members) return send(res, 400, { error: 'bad state' }); delete j.state.auth; db = { rev: 1, state: j.state }; persist(); send(res, 200, { rev: db.rev }); });
    }
    if (!me) return send(res, 401, { error: 'unauthorized' });
    if (p === '/api/session') return send(res, 200, { id: me });
    if (p === '/api/logout') { const t = (req.headers.authorization || '').replace(/^Bearer /, ''); delete auth.sessions[t]; saveAuth(); return send(res, 200, {}); }
    if (p === '/api/password' && req.method === 'POST') return body(req, j => {
      if (!j || String(j.current) !== String(passwordOf(me))) return send(res, 400, { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      if (!j.next || String(j.next).length < 4) return send(res, 400, { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัว' });
      auth.users[me] = String(j.next); saveAuth(); send(res, 200, {});
    });
    if (p === '/api/admin/passwords' && req.method === 'GET') {
      if (!isAdmin(me)) return send(res, 403, { error: 'forbidden' });
      return send(res, 200, { default: auth.default, list: members().map(m => ({ id: m.id, password: passwordOf(m.id), custom: auth.users[m.id] !== undefined })) });
    }
    if (p === '/api/admin/password' && req.method === 'POST') return body(req, j => {
      if (!isAdmin(me)) return send(res, 403, { error: 'forbidden' }); if (!j) return send(res, 400, { error: 'bad request' });
      if (j.default !== undefined) { if (String(j.default).length < 4) return send(res, 400, { error: 'รหัสต้องมีอย่างน้อย 4 ตัว' }); auth.default = String(j.default); }
      else if (!members().find(m => m.id === j.id)) return send(res, 400, { error: 'ไม่พบผู้ใช้' });
      else if (j.password === null) delete auth.users[j.id];
      else if (String(j.password).length < 4) return send(res, 400, { error: 'รหัสต้องมีอย่างน้อย 4 ตัว' });
      else auth.users[j.id] = String(j.password);
      saveAuth(); send(res, 200, {});
    });
    if (p === '/api/state') {
      if (req.method === 'GET') { if (url.searchParams.get('rev') === String(db.rev)) { res.statusCode = 304; return res.end(); } return send(res, 200, db); }
      if (req.method === 'PUT') return body(req, j => {
        if (!j || !j.state || !j.state.members) return send(res, 400, { error: 'bad state' });
        delete j.state.auth; db = { rev: db.rev + 1, state: j.state }; persist(); send(res, 200, { rev: db.rev });
      });
    }
    return send(res, 404, { error: 'not found' });
  }
  let f0 = path.normalize(decodeURIComponent(p)).replace(/^(\.\.[/\\])+/, '');
  if (f0 === '/' || f0 === '\\') f0 = '/index.html';
  const f = path.join(ROOT, f0);
  if (!f.startsWith(ROOT) || f.startsWith(DIR) || f.endsWith('server.js') || f.includes('.git')) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-cache'); res.end(buf);
  });
}).listen(PORT, () => console.log(`TEAM Hub → http://localhost:${PORT}   (data in ./data — keep it private)`));
