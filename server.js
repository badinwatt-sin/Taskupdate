#!/usr/bin/env node
/* TEAM Hub server — zero dependencies. Serves the app, shares one team dataset and enforces sign-in.
   Usage: node server.js [port]   (default 3000)   Data lives in ./data (keep it private; use HTTPS in production).
   For Vercel hosting see api/[...path].js and README. */
const http = require('http'), fs = require('fs'), path = require('path');
const { createHub } = require('./lib/hub');
const PORT = +(process.argv[2] || process.env.PORT || 3000), ROOT = __dirname, DIR = path.join(ROOT, 'data');
const DATA = path.join(DIR, 'state.json'), AUTH = path.join(DIR, 'auth.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const write = (f, o) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(o)); fs.renameSync(f + '.tmp', f); };
let db = read(DATA) || { rev: 0, state: null };
const store = {
  async getRev() { return db.rev || 0; }, async getState() { return db; },
  async setState(state) { db = { rev: (db.rev || 0) + 1, state }; write(DATA, db); return db.rev; },
  async getAuth() { return read(AUTH); }, async saveAuth(a) { write(AUTH, a); },
};
const hub = createHub(store, { log: a => console.log(`\n  Initial password for every member: ${a.default}\n  (Admin can change it, and set per-person passwords, in Team & Access)\n`) });
hub.init().catch(e => console.error(e));
http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (p.startsWith('/api/')) return hub(req, res);
  let f0 = path.normalize(decodeURIComponent(p)).replace(/^(\.\.[/\\])+/, '');
  if (f0 === '/' || f0 === '\\') f0 = '/index.html';
  const f = path.join(ROOT, f0);
  if (!f.startsWith(ROOT) || f.startsWith(DIR) || /server\.js$|\.git|lib[/\\]/.test(f) || f.includes(path.sep + 'api' + path.sep)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(f, (err, buf) => { if (err) { res.statusCode = 404; return res.end('Not found'); } res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-cache'); res.end(buf); });
}).listen(PORT, () => console.log(`TEAM Hub → http://localhost:${PORT}   (data in ./data — keep it private)`));
