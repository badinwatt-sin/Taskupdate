'use strict';
/* Web Push for TEAM Hub. VAPID keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY,
   or are generated once and kept in the private auth record. Device subscriptions
   are kept there too (never in the shared team data). */
const webpush = require('web-push');

function keys(a) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return [{ publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }, false];
  if (a.vapid && a.vapid.publicKey) return [a.vapid, false];
  a.vapid = webpush.generateVAPIDKeys(); return [a.vapid, true];   // caller saves the auth record
}
const REF_URL = { task: '#/todo', event: '#/calendar', calendar: '#/calendar', offsite: '#/support' };
const urlOf = n => !n.ref ? './#/dashboard' : n.ref.type === 'project' ? `./#/projects/${n.ref.id}` : './' + (REF_URL[n.ref.type] || '#/dashboard');

/* send each notice to every device of its recipient; returns true when the auth record changed */
async function sendNotices(a, notices, subject) {
  a.pushSubs ||= {}; let dirty = false;
  const [k, gen] = keys(a); dirty = dirty || gen;
  const jobs = [];
  for (const n of notices) {
    const subs = a.pushSubs[n.to] || []; if (!subs.length) continue;
    const payload = JSON.stringify({ title: n.text, body: n.sub || '', url: urlOf(n), tag: n.ref ? `${n.ref.type}-${n.ref.id || ''}` : n.id });
    for (const s of subs) jobs.push(webpush.sendNotification(s.sub, payload, { vapidDetails: { subject, publicKey: k.publicKey, privateKey: k.privateKey }, TTL: 86400, timeout: 6000 })
      .catch(err => { if (err && (err.statusCode === 404 || err.statusCode === 410)) { a.pushSubs[n.to] = (a.pushSubs[n.to] || []).filter(x => x.sub.endpoint !== s.sub.endpoint); dirty = true; } else console.error('push', err && err.statusCode, err && err.body); }));
  }
  await Promise.race([Promise.allSettled(jobs), new Promise(r => setTimeout(r, 8000))]);
  return dirty;
}
module.exports = { keys, sendNotices };
