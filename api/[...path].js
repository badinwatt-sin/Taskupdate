'use strict';
/* Vercel serverless entry. Storage: Upstash Redis (add it from Vercel → Storage / Marketplace).
   Env vars (set automatically by the integration): KV_REST_API_URL + KV_REST_API_TOKEN
   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Optional: HUB_DEFAULT_PASSWORD. */
const { createHub } = require('../lib/hub');
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function cmd(args) {
  const r = await fetch(URL_(), { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN(), 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
}
/* entries to drop when posts expire: the post, its replies/reactions, deletions that point at them; returns the pictures to delete */
function expiredOf(entries, cutoff) {
  const dead = new Set(entries.filter(e => e.kind === 'post' && e.at < cutoff).map(e => e.id));
  entries.filter(e => e.kind === 'reply' && dead.has(e.parent)).forEach(e => dead.add(e.id));
  const drop = entries.filter(e => dead.has(e.id) || (e.parent && dead.has(e.parent)));
  return { drop, images: drop.flatMap(e => (e.imgs || []).map(i => i.id)) };
}
const store = {
  async getPrPhoto(key) { return cmd(['GET', 'tmh:pr-photo:' + key]); },
  async setPrPhoto(key, data, ttl) {
    const k = 'tmh:pr-photo:' + key;
    await cmd(data == null ? ['DEL', k] : ['SET', k, data, 'EX', ttl]);
  },
  async getRev() { return +(await cmd(['GET', 'tmh:rev'])) || 0; },
  async getState() { const [rev, st] = await Promise.all([this.getRev(), cmd(['GET', 'tmh:state'])]); return { rev, state: st ? JSON.parse(st) : null }; },
  async setState(state) { await cmd(['SET', 'tmh:state', JSON.stringify(state)]); return +(await cmd(['INCR', 'tmh:rev'])); },
  async getAuth() { const v = await cmd(['GET', 'tmh:auth']); return v ? JSON.parse(v) : null; },
  async saveAuth(a) { await cmd(['SET', 'tmh:auth', JSON.stringify(a)]); },
  async getBlob(k) { return await cmd(['GET', 'tmh:img:' + k]); },
  async getPosts() {
    const list = await cmd(['LRANGE', 'tmh:posts', 0, -1]);
    const entries = (list || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
    return { entries };
  },
  async usage() {   // sizes of the stored values (Redis adds a little overhead per key)
    const [state, auth, plen] = await Promise.all([cmd(['STRLEN', 'tmh:state']), cmd(['STRLEN', 'tmh:auth']), cmd(['LLEN', 'tmh:posts'])]);
    const list = plen ? await cmd(['LRANGE', 'tmh:posts', 0, -1]) : [];
    const keys = []; let cur = '0';
    do { const [next, batch] = await cmd(['SCAN', cur, 'MATCH', 'tmh:img:*', 'COUNT', 500]); cur = String(next); keys.push(...batch); } while (cur !== '0' && keys.length < 5000);
    const blobs = await Promise.all(keys.map(async k => ({ id: k.slice(8), bytes: +(await cmd(['STRLEN', k])) || 0 })));
    return { state: +state || 0, auth: +auth || 0, posts: { bytes: (list || []).reduce((n, x) => n + Buffer.byteLength(x), 0), count: +plen || 0 }, blobs, backend: 'redis' };
  },
  async prunePosts(cutoff) {   // LREM removes exact values, so posts added meanwhile are never touched
    const list = await cmd(['LRANGE', 'tmh:posts', 0, -1]) || [], parsed = list.map(raw => { try { return { raw, e: JSON.parse(raw) }; } catch (x) { return null; } }).filter(Boolean);
    const { drop, images } = expiredOf(parsed.map(x => x.e), cutoff); if (!drop.length) return { removed: 0, images: [] };
    const set = new Set(drop); for (const x of parsed) if (set.has(x.e)) await cmd(['LREM', 'tmh:posts', 1, x.raw]);
    await cmd(['INCR', 'tmh:postver']); return { removed: drop.length, images };
  },
  async trimPosts(keep) { const before = +(await cmd(['LLEN', 'tmh:posts'])) || 0; await cmd(['LTRIM', 'tmh:posts', -keep, -1]); await cmd(['INCR', 'tmh:postver']); return { removed: Math.max(0, before - keep) }; },
  async getPostsVer() { return +(await cmd(['GET', 'tmh:postver'])) || 0; },   // bumped after each entry is in the list
  async addPost(e) {   // INCR + RPUSH are atomic, so concurrent posts all land
    if (e.cid) { const { entries } = await this.getPosts(); const dup = entries.find(x => x.cid === e.cid && x.by === e.by); if (dup) return { entry: dup, dup: true }; }
    const seq = +(await cmd(['INCR', 'tmh:postseq'])); e.id = 'pst_' + seq;
    await cmd(['RPUSH', 'tmh:posts', JSON.stringify(e)]); await cmd(['LTRIM', 'tmh:posts', -1500, -1]); await cmd(['INCR', 'tmh:postver']);
    return { entry: e };
  },
  async setBlob(k, v) { await cmd(v == null ? ['DEL', 'tmh:img:' + k] : ['SET', 'tmh:img:' + k, v]); },
};
const hub = createHub(store);

module.exports = async (req, res) => {
  if (!URL_() || !TOKEN()) {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/api/ping')) return res.end(JSON.stringify({ server: true, configured: false }));
    res.statusCode = 503; return res.end(JSON.stringify({ error: 'storage not configured' }));
  }
  return hub(req, res);
};
module.exports.config = { maxDuration: 60, api: { bodyParser: { sizeLimit: '4mb' } } };   // AI import can take up to ~40 s
