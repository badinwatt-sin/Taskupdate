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
const store = {
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
