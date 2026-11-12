#!/usr/bin/env node
/* TEAM Hub server — zero dependencies. Serves the app, shares one team dataset and enforces sign-in.
   Usage: node server.js [port]   (default 3000)   Data lives in ./data (keep it private; use HTTPS in production).
   For Vercel hosting see api/[...path].js and README. */
const http = require('http'), fs = require('fs'), path = require('path');
const { createHub } = require('./lib/hub');
const PORT = +(process.argv[2] || process.env.PORT || 3000), ROOT = __dirname, DIR = path.join(ROOT, 'data');
const DATA = path.join(DIR, 'state.json'), AUTH = path.join(DIR, 'auth.json'), POSTS = path.join(DIR, 'posts.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const write = (f, o) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(o)); fs.renameSync(f + '.tmp', f); };
/* entries to drop when posts expire: the post, its replies/reactions, deletions that point at them; returns the pictures to delete */
function expiredOf(entries, cutoff) {
  const dead = new Set(entries.filter(e => e.kind === 'post' && e.at < cutoff).map(e => e.id));
  entries.filter(e => e.kind === 'reply' && dead.has(e.parent)).forEach(e => dead.add(e.id));
  const drop = entries.filter(e => dead.has(e.id) || (e.parent && dead.has(e.parent)));
  return { drop, images: drop.flatMap(e => (e.imgs || []).map(i => i.id)) };
}
let db = read(DATA) || { rev: 0, state: null };
const prPhotos = new Map();
const store = {
  async getPrPhoto(key) { return prPhotos.get(key)?.data || null; },
  async setPrPhoto(key, data, ttl) {
    clearTimeout(prPhotos.get(key)?.timer);
    prPhotos.delete(key);
    if (data) prPhotos.set(key, { data, timer: setTimeout(() => prPhotos.delete(key), ttl * 1000).unref() });
  },
  async getRev() { return db.rev || 0; }, async getState() { return db; },
  async setState(state) { db = { rev: (db.rev || 0) + 1, state }; write(DATA, db); return db.rev; },
  async getAuth() { return read(AUTH); }, async saveAuth(a) { write(AUTH, a); },
  async getBlob(k) { try { return fs.readFileSync(path.join(DIR, 'img', k + '.txt'), 'utf8'); } catch (e) { return null; } },
  async getPosts() { const d = read(POSTS) || { seq: 0, entries: [] }; return d; },
  async getPostsVer() { return (read(POSTS) || { seq: 0 }).seq; },
  async addPost(e) {   // single process: read-modify-write is safe here
    const d = read(POSTS) || { seq: 0, entries: [] };
    if (e.cid) { const dup = d.entries.find(x => x.cid === e.cid && x.by === e.by); if (dup) return { seq: d.seq, entry: dup, dup: true }; }
    d.seq++; e.id = 'pst_' + d.seq; d.entries.push(e); d.entries = d.entries.slice(-1500); write(POSTS, d); return { seq: d.seq, entry: e };
  },
  async usage() {   // bytes on disk per part
    const size = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } }, d = path.join(DIR, 'img');
    let blobs = []; try { blobs = fs.readdirSync(d).filter(f => f.endsWith('.txt')).map(f => ({ id: f.slice(0, -4), bytes: size(path.join(d, f)) })); } catch (e) { }
    const posts = read(POSTS) || { entries: [] };
    return { state: size(DATA), auth: size(AUTH), posts: { bytes: size(POSTS), count: posts.entries.length }, blobs, backend: 'file' };
  },
  async prunePosts(cutoff) { const d = read(POSTS) || { seq: 0, entries: [] }; const { drop, images } = expiredOf(d.entries, cutoff); if (!drop.length) return { removed: 0, images: [] }; const ids = new Set(drop); d.entries = d.entries.filter(e => !ids.has(e)); d.seq++; write(POSTS, d); return { removed: drop.length, images }; },
  async trimPosts(keep) { const d = read(POSTS) || { seq: 0, entries: [] }; const before = d.entries.length; d.entries = d.entries.slice(-keep); d.seq++; write(POSTS, d); return { removed: before - d.entries.length }; },
  async setBlob(k, v) { const d = path.join(DIR, 'img'); fs.mkdirSync(d, { recursive: true }); if (v == null) { try { fs.unlinkSync(path.join(d, k + '.txt')); } catch (e) { } } else fs.writeFileSync(path.join(d, k + '.txt'), v); },
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
