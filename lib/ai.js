'use strict';
/* AI helper: turn a spreadsheet dump (CSV text) into a clean list of events.
   Used by POST /api/ai-events. Needs ANTHROPIC_API_KEY in the environment. */
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['events'],
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'category', 'start', 'end', 'venue', 'owner', 'audience', 'status', 'note'],
        properties: {
          name: { type: 'string', description: 'Event name as written in the sheet (keep the original language)' },
          category: { type: 'string', enum: ['agency', 'banca', 'cs', 'academy', 'company', ''], description: 'Business line if the sheet says so (Agency, Banca/bank channel, CS/customer service, Academy/training, Company/corporate-wide); empty string if unknown' },
          start: { type: 'string', description: 'First day, Gregorian calendar, YYYY-MM-DD. Empty string if no date can be found.' },
          end: { type: 'string', description: 'Last day, YYYY-MM-DD (same as start for one-day events)' },
          venue: { type: 'string', description: 'Place / location, or empty string' },
          owner: { type: 'string', description: 'Person or team responsible, or empty string' },
          audience: { type: 'string', description: 'Target audience / participants, or empty string' },
          status: { type: 'string', enum: ['planning', 'confirmed', 'done', 'cancelled'] },
          note: { type: 'string', description: 'Short Thai note when something was guessed or unclear (e.g. year assumed); empty string otherwise' },
        },
      },
    },
  },
};
const SYSTEM = `You extract an event calendar from a spreadsheet that a Thai agency team exported to CSV.
The sheet can have any layout: one event per row, months as columns with days or names inside the cells, a Gantt-style grid with days as columns and marks in the cells, merged title rows, notes, totals, or several tables in one sheet.
Return every real event or activity once. Skip headers, totals, legends, public holidays and empty placeholders.
Dates: write Gregorian ISO dates (YYYY-MM-DD). Thai Buddhist years are 543 more than Gregorian (2569 = 2026; "69" or "70" in a Thai date means 2569 / 2570). Thai month abbreviations: ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.
When the sheet gives no year, use the year stated in the title or headers; if none, use the year of the upcoming dates relative to today and say so in note.
Map status from words like confirmed/ยืนยัน → confirmed, done/จัดแล้ว/เสร็จ → done, cancel/ยกเลิก → cancelled, otherwise planning.
Keep names in their original language. Do not invent events, venues or owners that are not in the sheet.`;

let client = null;
function getClient() {
  if (!client) { const { Anthropic } = require('@anthropic-ai/sdk'); client = new Anthropic(); }   // reads ANTHROPIC_API_KEY
  return client;
}

async function extractEvents({ text, sheet, today }) {
  const response = await getClient().beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',   // if this model declines, the API retries on a fallback model in the same call
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: `Today is ${today || new Date().toISOString().slice(0, 10)}. Sheet name: ${sheet || '-'}\n\n<sheet_csv>\n${text}\n</sheet_csv>` }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('AI ปฏิเสธการอ่านไฟล์นี้'), { status: 422 });
  if (response.stop_reason === 'max_tokens') throw Object.assign(new Error('ชีตมีรายการมากเกินไปสำหรับการอ่านครั้งเดียว — แยกเป็นหลายชีตแล้วลองใหม่'), { status: 413 });
  const block = response.content.find(b => b.type === 'text');
  let data; try { data = JSON.parse(block ? block.text : ''); } catch (e) { throw Object.assign(new Error('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ — ลองใหม่อีกครั้ง'), { status: 502 }); }
  return Array.isArray(data.events) ? data.events : [];
}

/* ---------- CI Poster Builder: tidy the copy, keep every fact ---------- */
const POSTER_ICONS = ['megaphone', 'calendar', 'clock', 'pin', 'trophy', 'star', 'gift', 'target', 'bulb', 'rocket', 'heart', 'users', 'chart', 'shield', 'book', 'check', 'sparkles', 'coin', 'mic', 'flag', 'bell', 'info'];
const POSTER_MOTIFS = ['geometric', 'rays', 'dots', 'waves', 'confetti', 'stripes'];
const POSTER_ACCENTS = ['sky', 'coral', 'amber', 'primary'];
const POSTER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['keyword', 'headline', 'sub', 'points', 'cta', 'icon', 'motif', 'accent', 'note'],
  properties: {
    keyword: { type: 'string', description: 'Very short kicker above the headline, 1-3 words (e.g. ประกาศ, NEW, เชิญร่วมงาน). Empty string if not useful.' },
    headline: { type: 'string', description: 'The main message, short and punchy. Thai: about 12-40 characters.' },
    sub: { type: 'string', description: 'One supporting sentence under the headline, or empty string.' },
    points: { type: 'array', items: { type: 'string' }, description: 'Body copy as 0-6 short lines in reading order. For how-to posters these are the steps in order (no numbering, the layout adds it).' },
    cta: { type: 'string', description: 'Short call to action (e.g. ลงทะเบียนเลย, อ่านรายละเอียด) or empty string.' },
    icon: { type: 'string', enum: POSTER_ICONS, description: 'Icon that best fits the message' },
    motif: { type: 'string', enum: POSTER_MOTIFS, description: 'Background graphic pattern that fits the mood' },
    accent: { type: 'string', enum: POSTER_ACCENTS, description: 'Accent colour from the approved corporate palette: sky (calm blue), coral (urgent, campaign), amber (celebration, warmth), primary (formal)' },
    note: { type: 'string', description: 'One short Thai sentence telling the user what you changed. Mention anything that was unclear.' },
  },
};
const POSTER_SYSTEM = `You are the copy editor of a corporate communications team in Thailand. You rewrite the user's draft for a social/internal poster (LINE, Facebook, internal screens) so it is short, clear and easy to read at a glance.
Hard rules — facts are owned by the user:
- Never change, round, add or remove facts: numbers, amounts, percentages, dates, times, places, names, product names, conditions, eligibility and deadlines must stay exactly as written (same digits and units).
- Do not invent benefits, prizes, quotes, people or details that are not in the draft. If something is missing, leave it out.
- Keep the language of the draft (normally Thai; keep English product/brand words as written). Polite, positive, corporate tone. No emoji, no hashtags unless they are in the draft.
- Date, time, venue and fine print are shown separately on the poster; do not repeat them in points unless the draft's body needs them.
Your job: pick the strongest headline, a supporting line, and order the body into short lines (most important first; for how-to keep the original step order). Then pick an icon, a background motif and an accent colour that fit the poster type and mood.`;

async function rewritePoster({ template, format, fields }) {
  const f = fields || {}, line = (k, v) => v ? `${k}: ${String(v).slice(0, 3000)}\n` : '';
  const draft = line('Keyword', f.keyword) + line('Headline', f.headline) + line('Sub-headline', f.sub) + line('Body', f.content)
    + line('Highlight / honoree (shown as is)', f.highlight) + line('Date (shown as is)', f.date) + line('Time (shown as is)', f.time)
    + line('Venue (shown as is)', f.venue) + line('Call to action', f.cta) + line('Fine print (shown as is)', f.note);
  const response = await getClient().beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: POSTER_SCHEMA } },
    system: POSTER_SYSTEM,
    messages: [{ role: 'user', content: `Poster type: ${template || 'announcement'} · Format: ${format || 'square'}\n\n<draft>\n${draft}</draft>` }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('AI ปฏิเสธการเรียบเรียงข้อความนี้'), { status: 422 });
  const block = response.content.find(b => b.type === 'text');
  let data; try { data = JSON.parse(block ? block.text : ''); } catch (e) { throw Object.assign(new Error('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ — ลองใหม่อีกครั้ง'), { status: 502 }); }
  data.points = (Array.isArray(data.points) ? data.points : []).map(String).filter(Boolean).slice(0, 6);
  return data;
}

function aiErrorMessage(e) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  if (e instanceof Anthropic.AuthenticationError) return [502, 'ANTHROPIC_API_KEY ไม่ถูกต้อง — ตรวจค่าใน Vercel → Settings → Environment Variables'];
  if (e instanceof Anthropic.RateLimitError) return [429, 'AI ถูกใช้งานถี่เกินไป — รอสักครู่แล้วลองใหม่'];
  if (e instanceof Anthropic.BadRequestError) return [400, 'AI รับคำขอนี้ไม่ได้: ' + e.message];
  if (e instanceof Anthropic.APIError) return [502, `AI ขัดข้องชั่วคราว (${e.status || 'network'}) — ลองใหม่อีกครั้ง`];
  return [e.status || 500, e.message || 'AI อ่านไม่สำเร็จ'];
}
module.exports = { extractEvents, rewritePoster, aiErrorMessage, MAX_CHARS: 150000 };
