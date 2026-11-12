'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { adobeConfig, handleAdobePhoto, inputPhoto, removeBackground } = require('../lib/pr-adobe');

const config = adobeConfig({
  PR_ADOBE_CLIENT_ID: 'client-id',
  PR_ADOBE_CLIENT_SECRET: 'test-only-secret',
  PR_MASTER_PUBLIC_ORIGIN: 'https://hub.example.test',
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2Z0AAAAASUVORK5CYII=', 'base64');
const data = 'data:image/png;base64,' + png.toString('base64');

function fixture() {
  const photos = new Map();
  const store = {
    getPrPhoto: async key => photos.get(key),
    async setPrPhoto(key, value, ttl) {
      if (value === null) photos.delete(key);
      else {
        assert.ok(ttl > 0 && ttl <= 120);
        photos.set(key, value);
      }
    },
  };
  const callback = async (href, method, body) => {
    const req = Object.assign(Readable.from(body ? [body] : []), { method });
    const res = { statusCode: 200, setHeader() {}, end(bytes) { this.bytes = bytes; } };
    await handleAdobePhoto(req, res, new URL(href), store, config);
    return res;
  };
  return { store, photos, callback };
}

test('Adobe photo workflow signs input and output separately and deletes temporary photos', async () => {
  const { store, photos, callback } = fixture();
  let signedInput;
  const fetcher = async (href, options) => {
    const url = new URL(href);
    if (url.hostname === 'ims-na1.adobelogin.com') return Response.json({ access_token: 'test-token' });
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (url.pathname === '/v2/remove-background') {
      const payload = JSON.parse(options.body);
      signedInput = payload.image.source.url;
      const output = payload.output.destination.url;
      assert.equal(payload.mode, 'cutout');
      assert.deepEqual((await callback(signedInput, 'GET')).bytes, png);
      assert.equal((await callback(signedInput.replace('/input?', '/output?'), 'POST', png)).statusCode, 404);
      assert.equal((await callback(output, 'GET')).statusCode, 405);
      assert.equal((await callback(output, 'PUT', Buffer.from('fake png'))).statusCode, 400);
      assert.equal((await callback(output, 'PUT', png)).statusCode, 200);
      return Response.json({ jobId: 'test-job', statusUrl: 'https://image.adobe.io/v2/status/test-job' });
    }
    assert.equal(url.pathname, '/v2/status/test-job');
    return Response.json({ status: 'succeeded' });
  };
  assert.equal(await removeBackground(data, store, config, fetcher), data);
  assert.equal(photos.size, 0);
  assert.equal((await callback(signedInput, 'GET')).statusCode, 404);
});

test('failed Adobe jobs clean up, and foreign status URLs are never contacted', async () => {
  const { store, photos } = fixture();
  let calls = 0;
  const fetcher = async () => ++calls === 1 ? Response.json({ access_token: 'test-token' })
    : Response.json({ jobId: 'test-job', statusUrl: 'https://other.example.test/v2/status/test-job' });
  await assert.rejects(removeBackground(data, store, config, fetcher), /Unexpected Adobe status URL/);
  assert.equal(calls, 2);
  assert.equal(photos.size, 0);
});

test('Adobe configuration and input accept only HTTPS origins and validated raster images', () => {
  assert.equal(config.origin, 'https://hub.example.test');
  assert.equal(adobeConfig({ PR_ADOBE_CLIENT_ID: 'x', PR_ADOBE_CLIENT_SECRET: 'x', PR_MASTER_PUBLIC_ORIGIN: 'https://example.test/path' }), null);
  assert.equal(inputPhoto('data:image/png;base64,YmFk'), null);
  assert.equal(inputPhoto(data.replace('image/png', 'image/jpeg')), null);
  assert.deepEqual(inputPhoto(data).bytes, png);
});
