'use strict';
/* Google Gemini (free tier from Google AI Studio) — the free AI option for Poster Studio.
   Same brief schema and instructions as the Claude path in lib/ai.js; plain REST, no extra package.
   Note: on Google's free tier, prompts may be used by Google to improve its products — the app only
   sends the poster text the creator typed. */
const { BRIEF_SCHEMA, BRIEF_SYSTEM, briefUserText } = require('./ai');
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash'];   // alias to the current Flash model first, a fixed version as backup

/* JSON Schema → Gemini responseSchema (OpenAPI subset: no additionalProperties, upper-case types) */
function toGemini(s) {
  if (Array.isArray(s)) return s.map(toGemini);
  if (!s || typeof s !== 'object') return s;
  const o = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'additionalProperties') continue;
    if (k === 'type') o.type = String(v).toUpperCase();
    else if (k === 'properties') o.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toGemini(pv)]));
    else if (k === 'items') o.items = toGemini(v);
    else o[k] = v;
  }
  if (o.type === 'OBJECT' && o.properties) o.propertyOrdering = Object.keys(o.properties);
  return o;
}
const SCHEMA = toGemini(BRIEF_SCHEMA);

class GeminiError extends Error { constructor(msg, status, reason) { super(msg); this.status = status; this.reason = reason; } }
async function call(key, path, body, timeoutMs = 60000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/${path}`, { method: body ? 'POST' : 'GET', headers: { 'x-goog-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = j.error || {}; throw new GeminiError(e.message || `Gemini ${r.status}`, r.status, (e.details || []).map(d => d.reason).filter(Boolean)[0] || e.status || ''); }
    return j;
  } catch (e) { if (e.name === 'AbortError') throw new GeminiError('Gemini ตอบช้าเกินไป', 504, 'TIMEOUT'); throw e; }
  finally { clearTimeout(t); }
}
async function checkKey(key) { await call(key, 'models?pageSize=1', null, 15000); return true; }

async function briefPoster(key, args) {
  const body = schema => ({
    systemInstruction: { parts: [{ text: BRIEF_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: briefUserText(args) + (schema ? '' : '\n\nReply with one JSON object only, matching this JSON Schema:\n' + JSON.stringify(BRIEF_SCHEMA)) }] }],
    generationConfig: { responseMimeType: 'application/json', ...(schema ? { responseSchema: SCHEMA } : {}), temperature: 0.4, maxOutputTokens: 8192 },
  });
  let last = null;
  for (const model of MODELS) {
    for (const schema of [true, false]) {   // if the schema form is rejected, ask for the same JSON in the prompt
      try {
        const j = await call(key, `models/${model}:generateContent`, body(schema));
        const cand = (j.candidates || [])[0];
        if (!cand) throw new GeminiError('Gemini ไม่ตอบกลับ (อาจติดตัวกรองความปลอดภัย)', 422, (j.promptFeedback || {}).blockReason || 'NO_CANDIDATE');
        const text = (cand.content && cand.content.parts || []).map(p => p.text || '').join('');
        try { return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { throw new GeminiError('Gemini ตอบกลับในรูปแบบที่อ่านไม่ได้', 502, 'BAD_JSON'); }
      } catch (e) {
        last = e;
        if (e.status === 400 && !/API key/i.test(e.message) && schema) continue;   // schema form rejected (e.g. too complex): ask for the same JSON in the prompt
        if (e.status === 404) break;   // model name not available: next model
        if (e.status === 429 || e.status === 401 || e.status === 403 || (e.status === 400 && /API key/i.test(e.message))) throw e;   // quota / key problems: no point retrying
        if (e.reason === 'BAD_JSON' && schema) continue;
        break;
      }
    }
  }
  throw last || new GeminiError('Gemini ใช้งานไม่ได้', 502, '');
}
function errorMessage(e) {
  if (e.status === 429) return [429, 'โควตาฟรีของ Gemini เต็มชั่วคราว'];
  if (e.status === 400 && /API key/i.test(e.message) || e.reason === 'API_KEY_INVALID') return [400, 'API Key ของ Gemini ใช้ไม่ได้ — ตรวจว่าคัดลอกครบ'];
  if (e.status === 403) return [403, 'API Key นี้ยังไม่ได้เปิดสิทธิ์ใช้ Gemini API'];
  return [e.status || 502, e.message || 'Gemini ขัดข้อง'];
}
module.exports = { checkKey, briefPoster, errorMessage };
