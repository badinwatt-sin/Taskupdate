'use strict';

const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto');
const { setTimeout: wait } = require('node:timers/promises');

const ADOBE_IMAGE = 'https://image.adobe.io';
const INPUT_MAX = 1800000;
const OUTPUT_MAX = 3000000;
const TTL_SECONDS = 120;

function adobeConfig(env = process.env) {
  const clientId = env.PR_ADOBE_CLIENT_ID, clientSecret = env.PR_ADOBE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !env.PR_MASTER_PUBLIC_ORIGIN) return null;
  try {
    const url = new URL(env.PR_MASTER_PUBLIC_ORIGIN);
    if (url.protocol !== 'https:' || url.username || url.password || url.href !== url.origin + '/') return null;
    return { clientId, clientSecret, origin: url.origin };
  } catch { return null; }
}

function rasterType(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (buf.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  return '';
}

function inputPhoto(data) {
  if (typeof data !== 'string' || data.length > Math.ceil(INPUT_MAX / 3) * 4 + 25) return null;
  const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  return bytes.length <= INPUT_MAX && rasterType(bytes) === match[1] ? { type: match[1], bytes } : null;
}

const photoKey = (id, purpose) => id + ':' + purpose;
const photoSignature = (secret, id, purpose, expires) => createHmac('sha256', secret).update([id, purpose, expires].join(':')).digest('hex');

function signedPhotoUrl(config, id, purpose, expires) {
  const sig = photoSignature(config.clientSecret, id, purpose, expires);
  return config.origin + '/api/pr-photo/' + id + '/' + purpose + '?' + new URLSearchParams({ expires, sig });
}

async function readPng(req) {
  if (Buffer.isBuffer(req.body)) return req.body.length <= OUTPUT_MAX ? req.body : null;
  if (req.body != null && typeof req.body !== 'string') return null;
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > OUTPUT_MAX) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function handleAdobePhoto(req, res, url, store, config = adobeConfig()) {
  const match = /^\/api\/pr-photo\/([a-f0-9-]{36})\/(input|output)$/.exec(url.pathname);
  const expires = Number(url.searchParams.get('expires')), sig = url.searchParams.get('sig') || '';
  res.setHeader('Cache-Control', 'private, no-store');
  if (!config || !match || !/^[a-f0-9]{64}$/.test(sig) || !Number.isSafeInteger(expires) || expires <= Date.now()) {
    res.statusCode = 404; return res.end();
  }
  const [, id, purpose] = match;
  const expected = photoSignature(config.clientSecret, id, purpose, expires);
  if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) { res.statusCode = 404; return res.end(); }
  const input = await store.getPrPhoto(photoKey(id, 'input'));
  if (!input) { res.statusCode = 404; return res.end(); }
  if (purpose === 'input' && req.method === 'GET') {
    const photo = inputPhoto(input);
    if (!photo) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', photo.type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', photo.bytes.length);
    return res.end(photo.bytes);
  }
  if (purpose === 'output' && ['PUT', 'POST'].includes(req.method)) {
    const png = await readPng(req);
    if (!png || rasterType(png) !== 'image/png') { res.statusCode = 400; return res.end(); }
    const remaining = Math.ceil((expires - Date.now()) / 1000);
    if (remaining <= 0) { res.statusCode = 404; return res.end(); }
    await store.setPrPhoto(photoKey(id, 'output'), 'data:image/png;base64,' + png.toString('base64'), remaining);
    res.statusCode = 200; return res.end();
  }
  res.statusCode = 405; return res.end();
}

async function removeBackground(data, store, config, fetcher = fetch) {
  const id = randomUUID(), expires = Date.now() + TTL_SECONDS * 1000;
  const inputKey = photoKey(id, 'input'), outputKey = photoKey(id, 'output');
  const signal = AbortSignal.timeout(32000);
  const json = async (url, options) => {
    const response = await fetcher(url, { ...options, signal, redirect: 'error' });
    if (!response.ok) throw new Error('Adobe returned HTTP ' + response.status);
    return response.json();
  };
  const auth = await json('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST', body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret,
      scope: 'openid,AdobeID,read_organizations',
    }),
  });
  if (typeof auth.access_token !== 'string') throw new Error('Adobe token missing');
  const headers = { Authorization: 'Bearer ' + auth.access_token, 'x-api-key': config.clientId };
  await store.setPrPhoto(inputKey, data, TTL_SECONDS);
  try {
    const job = await json(ADOBE_IMAGE + '/v2/remove-background', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: { source: { url: signedPhotoUrl(config, id, 'input', expires) } },
        mode: 'cutout', trim: true,
        output: { destination: { url: signedPhotoUrl(config, id, 'output', expires) }, mediaType: 'image/png' },
      }),
    });
    if (typeof job.jobId !== 'string' || !/^[\w-]{1,100}$/.test(job.jobId)) throw new Error('Adobe job ID missing');
    const statusUrl = new URL(job.statusUrl || '/v2/status/' + job.jobId, ADOBE_IMAGE);
    if (![ADOBE_IMAGE, 'https://photoshop-api.adobe.io'].includes(statusUrl.origin) || statusUrl.pathname !== '/v2/status/' + job.jobId) {
      throw new Error('Unexpected Adobe status URL');
    }
    while (!signal.aborted) {
      const status = await json(statusUrl, { headers });
      if (status.status === 'succeeded') {
        const result = await store.getPrPhoto(outputKey);
        if (result) return result;
        throw new Error('Adobe PNG missing');
      }
      if (['failed', 'cancelled', 'canceled'].includes(status.status)) throw new Error('Adobe could not cut out this image');
      await wait(1000, undefined, { signal });
    }
    throw new Error('Adobe timed out');
  } finally {
    await Promise.allSettled([store.setPrPhoto(inputKey, null), store.setPrPhoto(outputKey, null)]);
  }
}

module.exports = { adobeConfig, handleAdobePhoto, inputPhoto, removeBackground };
