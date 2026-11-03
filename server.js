#!/usr/bin/env node
/* Zero-dependency server: serves the app and shares one team dataset (data/state.json).
   Usage: node server.js [port]    (default 3000)
   Note: whole-state, last-write-wins sync (fine for a small team; not a full multi-user database). */
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || process.env.PORT || 3000), ROOT = __dirname;
const DATA = path.join(ROOT, 'data', 'state.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
let db = { rev: 0, state: null };
try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { }
const persist = () => { fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA + '.tmp', JSON.stringify(db)); fs.renameSync(DATA + '.tmp', DATA); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/state') {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      if (url.searchParams.get('rev') === String(db.rev)) { res.statusCode = 304; return res.end(); }
      res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(db));
    }
    if (req.method === 'PUT') {
      let body = ''; req.on('data', c => { body += c; if (body.length > 60e6) req.destroy(); });
      req.on('end', () => {
        try { const j = JSON.parse(body); if (!j.state || !j.state.members) throw 0; db = { rev: db.rev + 1, state: j.state }; persist(); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ rev: db.rev })); }
        catch (e) { res.statusCode = 400; res.end('{"error":"bad state"}'); }
      }); return;
    }
    res.statusCode = 405; return res.end();
  }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p === '/' || p === '\\') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || f.startsWith(path.join(ROOT, 'data')) || f.endsWith('server.js')) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-cache'); res.end(buf);
  });
}).listen(PORT, () => console.log(`Agency Experience Hub → http://localhost:${PORT}  (team data: data/state.json)`));
