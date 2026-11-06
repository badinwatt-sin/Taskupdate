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
const POSTER_ICONS = ['megaphone',  'stethoscope',  'syringe',  'pill',  'hospital',  'cross',  'doctor',  'thermometer',  'umbrella',  'shieldPlus',  'shield',  'family',  'phone',  'chat',  'clipboard',  'wallet',  'pulse',  'virus',  'drop',  'mask',  'eye',  'rain',  'plane',  'calendar',  'clock',  'pin',  'trophy',  'star',  'gift',  'target',  'bulb',  'rocket',  'heart',  'users',  'chart',  'book',  'check',  'sparkles',  'coin',  'mic',  'flag',  'bell',  'info'];
const POSTER_SCENES = { health: 'สุขภาพทั่วไป', vaccine: 'วัคซีน / ป้องกันโรค', hospital: 'โรงพยาบาล / เคลม', doctor: 'ปรึกษาแพทย์', telehealth: 'แอป / ออนไลน์', medicine: 'ยา / อาการป่วย', protect: 'ความคุ้มครอง / ประกัน', family: 'ครอบครัว', money: 'ค่าใช้จ่าย / ผลตอบแทน', time: 'ระยะเวลา / กำหนดการ', checklist: 'ขั้นตอน / เช็กลิสต์', event: 'งาน / กิจกรรม', award: 'รางวัล / ยินดี', campaign: 'แคมเปญ / เป้าหมาย', travel: 'เดินทาง', weather: 'ฤดูกาล / หน้าฝน', air: 'อากาศ / PM 2.5', announce: 'ประกาศทั่วไป' };   // keep in sync with PB_SCENES in js/poster.js
const POSTER_STYLES = ['deep', 'lavender', 'sky', 'pink', 'white'];
const POSTER_ACCENTS = ['sky', 'red', 'primary'];
const DESIGN_PROPS = {
  scene: { type: 'string', enum: Object.keys(POSTER_SCENES), description: 'Illustration that matches the topic: ' + Object.entries(POSTER_SCENES).map(([k, v]) => `${k}=${v}`).join(', ') },
  badges: { type: 'array', items: { type: 'string', enum: POSTER_ICONS }, description: 'Exactly 3 small icons floating around the illustration, each related to the content' },
  style: { type: 'string', enum: POSTER_STYLES, description: 'Background: deep (formal, product, announcement), lavender (friendly campaign), sky (health knowledge, how-to), pink (care, family, women), white (clean data-heavy)' },
  accent: { type: 'string', enum: POSTER_ACCENTS, description: 'Accent for check marks and badges: sky (calm), red (urgent, promotion), primary (formal)' },
};
const POSTER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['keyword', 'headline', 'sub', 'points', 'cta', 'scene', 'badges', 'style', 'accent', 'note'],
  properties: {
    keyword: { type: 'string', description: 'Very short kicker above the headline, 1-3 words (e.g. ประกาศ, NEW, เชิญร่วมงาน). Empty string if not useful.' },
    headline: { type: 'string', description: 'The main message in 1-2 lines separated by \\n. Line 1 is short (shown on a highlight bar, about 8-22 Thai characters); line 2 completes it.' },
    sub: { type: 'string', description: 'One supporting sentence under the headline, or empty string.' },
    points: { type: 'array', items: { type: 'string' }, description: 'Body copy as 0-6 short lines in reading order. For how-to posters these are the steps in order (no numbering, the layout adds it).' },
    cta: { type: 'string', description: 'Short call to action (e.g. ลงทะเบียนเลย, อ่านรายละเอียด) or empty string.' },
    ...DESIGN_PROPS,
    note: { type: 'string', description: 'One short Thai sentence telling the user what you changed. Mention anything that was unclear.' },
  },
};
const POSTER_SYSTEM = `You are the copy editor of a corporate communications team in Thailand. You rewrite the user's draft for a social/internal poster (LINE, Facebook, internal screens) so it is short, clear and easy to read at a glance.
Hard rules — facts are owned by the user:
- Never change, round, add or remove facts: numbers, amounts, percentages, dates, times, places, names, product names, conditions, eligibility and deadlines must stay exactly as written (same digits and units).
- Do not invent benefits, prizes, quotes, people or details that are not in the draft. If something is missing, leave it out.
- Keep the language of the draft (normally Thai; keep English product/brand words as written). Polite, positive, corporate tone. No emoji, no hashtags unless they are in the draft.
- Date, time, venue and fine print are shown separately on the poster; do not repeat them in points unless the draft's body needs them.
Your job: pick the strongest headline, a supporting line, and order the body into short lines (most important first; for how-to keep the original step order). Then pick an illustration scene, three related badge icons, a background and an accent colour that fit the topic.`;

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
/* design only — tiny prompt, tiny answer: picks the visual for the poster from the CI lists */
const DESIGN_SCHEMA = { type: 'object', additionalProperties: false, required: ['scene', 'badges', 'style', 'accent'], properties: DESIGN_PROPS };
async function designPoster({ template, text }) {
  const response = await getClient().messages.create({   // Haiku 5.5: tiny, cheap pick from fixed lists (no server-side fallback exists for it; a refusal just returns an error and the app keeps its keyword-based pick)
    model: 'claude-haiku-5-5',
    max_tokens: 1500,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: DESIGN_SCHEMA } },
    system: 'Pick the visual design for a corporate health-insurance communications poster in Thailand from the allowed options. Match the topic of the text.',
    messages: [{ role: 'user', content: `Poster type: ${template}\n${String(text).slice(0, 600)}` }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('AI ปฏิเสธคำขอนี้'), { status: 422 });
  const block = response.content.find(b => b.type === 'text');
  try { return JSON.parse(block ? block.text : ''); } catch (e) { throw Object.assign(new Error('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ — ลองใหม่อีกครั้ง'), { status: 502 }); }
}

/* Poster Studio — read the message, understand the communication, return a brief the layouts can use */
const BRIEF_VISUALS = { pharmacy: 'ร้านยา / รับยา / ผู้ป่วยนอก OPD', patient: 'ผู้ป่วยนอนโรงพยาบาล IPD', nurse: 'พยาบาล / ผ่าตัด', doctor: 'แพทย์ / สุขภาพ', advisor: 'ตัวแทน / ที่ปรึกษา / วางแผน', family: 'ครอบครัว / ลูก / ผู้สูงวัย', phone: 'แอป / ออนไลน์ / LINE / โทร', money: 'เงิน / ค่าใช้จ่าย / เบี้ย / ภาษี', shield: 'ความคุ้มครอง / ประกัน', check: 'เช็กลิสต์ / ขั้นตอน / เงื่อนไข', award: 'รางวัล / ยินดี / ผลงาน', event: 'ประกาศ / กิจกรรม / โปรโมชัน', team: 'ทีมงาน / พนักงาน / ร่วมกัน', presenter: 'อบรม / สัมมนา / นำเสนอ / ประชุม', cheer: 'ฉลอง / เปิดตัว / ข่าวดี', calendar: 'วันที่ / กำหนดการ / เส้นตาย', laptop: 'ทำงาน / ระบบ / อีเมล / เรียนออนไลน์' };   // keep in sync with PA_CHARS in js/poster-art.js + js/studio-art.js
const BRIEF_PROPS = ['shield', 'coins', 'trophy', 'mega', 'cal', 'heart', 'phone', 'clip', 'gift', 'clock', 'pin', 'star', 'chat', 'bulb', 'doc', 'laptop'];
const BRIEF_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['kind', 'tone', 'audience', 'summary', 'kicker', 'headline', 'emph', 'sub', 'points', 'date', 'time', 'venue', 'cta', 'note', 'hero', 'props', 'accent', 'designs', 'warn'],
  properties: {
    kind: { type: 'string', enum: ['announce', 'change', 'event', 'campaign', 'reminder', 'recognition', 'knowledge', 'recruit'], description: 'announce=general news/notice, change=policy or process change, event=invitation/training/meeting, campaign=sales campaign/contest/promotion, reminder=deadline or reminder, recognition=congratulations/award, knowledge=tips/how-to/explainer, recruit=open for applications' },
    tone: { type: 'string', enum: ['formal', 'friendly', 'urgent', 'celebratory'] },
    audience: { type: 'string', description: 'Who the message is for, in Thai, short (e.g. ตัวแทนทุกคน, ลูกค้า). Empty if unclear.' },
    summary: { type: 'string', description: 'One Thai sentence: what you understood (what happens, for whom, what they must do).' },
    kicker: { type: 'string', description: 'Very short label above the headline, 1-3 words (e.g. ประกาศ, แจ้งเปลี่ยนแปลง, ขอเชิญ, NEW). Empty if not useful.' },
    headline: { type: 'array', items: { type: 'string' }, description: '1-3 short headline lines that carry the key message (each about 6-22 Thai characters). Readers must get the point from the headline alone.' },
    emph: { type: 'integer', description: 'Index of the headline line to put on the dark highlight bar (the most important words). -1 for none.' },
    sub: { type: 'string', description: 'One supporting sentence, or empty string.' },
    points: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'body', 'visual'], properties: {
      title: { type: 'string', description: 'Short title of this point (2-6 words)' },
      body: { type: 'string', description: 'Explanation in 1-2 short lines, or empty. Several short items can be separated by \\n.' },
      visual: { type: 'string', enum: Object.keys(BRIEF_VISUALS), description: 'Character that illustrates this point: ' + Object.entries(BRIEF_VISUALS).map(([k, v]) => `${k}=${v}`).join(', ') },
    } }, description: '0-4 key points in reading order (steps keep their order). Leave empty for a single simple message. Do not repeat date/time/venue here.' },
    date: { type: 'string', description: 'Date or date range exactly as written in the message (same digits and month words), or empty.' },
    time: { type: 'string', description: 'Time exactly as written, or empty.' },
    venue: { type: 'string', description: 'Place / channel exactly as written (e.g. Zoom, ห้องประชุม 12A), or empty.' },
    cta: { type: 'string', description: 'Short action for the reader (e.g. ลงทะเบียนภายใน 15 ม.ค., สแกนเพื่อสมัคร), or empty. Keep any deadline as written.' },
    note: { type: 'string', description: 'Fine print / conditions / contact exactly as written, or empty.' },
    hero: { type: 'string', enum: Object.keys(BRIEF_VISUALS), description: 'Main character for the whole poster, matching the overall message.' },
    props: { type: 'array', items: { type: 'string', enum: BRIEF_PROPS }, description: '2-3 small decorative objects related to the topic.' },
    accent: { type: 'string', enum: ['blue', 'pink', 'amber', 'mint', 'lavender'], description: 'Pastel accent: blue=calm/formal, pink=care/family/celebration, amber=attention/money/reminder, mint=health/positive, lavender=knowledge/tech' },
    designs: { type: 'array', items: { type: 'string', enum: ['hero', 'banner', 'cards', 'notes', 'split', 'date', 'minimal'] }, description: 'All 7 layouts ordered best-first for this message. hero=one big message + character; banner=formal announcement on an AXA Blue band; cards=explainer with a character per point; notes=checklist on sticky notes; split=half illustration half text; date=event or deadline with a big date block; minimal=short statement with lots of white space.' },
    warn: { type: 'string', description: 'Thai note about anything unclear or missing (e.g. no year in the date). Empty if all clear.' },
  },
};
const BRIEF_SYSTEM = `You are the communications designer of the Agency Experience team at Krungthai-AXA Life Insurance in Thailand. A content creator pastes a message (email, LINE text, memo, notes). Understand the communication first: what kind of message it is, who it is for, what the single key message is, and what the reader must do. Then turn it into a short poster brief.
Hard rules — facts belong to the writer:
- Never change, round, add or remove facts: numbers, amounts, percentages, dates, times, places, names, product names, conditions and deadlines stay exactly as written (same digits, same month words, same units).
- Do not invent benefits, prizes, people, places or details. If something is missing, leave the field empty and say so in warn.
- Keep the message's language (normally Thai; keep English product/brand words). Polite, positive, corporate tone. No emoji, no hashtags.
- Posters are read in 3 seconds: headline lines short, points short, no long paragraphs. Everything important must still be on the poster (put conditions in note).
Choose characters and objects that match each point's meaning, not just its words.`;
async function briefPoster({ text, format }) {
  const response = await getClient().beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: BRIEF_SCHEMA } },
    system: BRIEF_SYSTEM,
    messages: [{ role: 'user', content: `Poster format: ${format || 'portrait'}\n\n<message>\n${text}\n</message>` }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('AI ปฏิเสธการอ่านข้อความนี้'), { status: 422 });
  const block = response.content.find(b => b.type === 'text');
  try { return JSON.parse(block ? block.text : ''); } catch (e) { throw Object.assign(new Error('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ — ลองใหม่อีกครั้ง'), { status: 502 }); }
}

function aiErrorMessage(e) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  if (e instanceof Anthropic.AuthenticationError) return [502, 'ANTHROPIC_API_KEY ไม่ถูกต้อง — ตรวจค่าใน Vercel → Settings → Environment Variables'];
  if (e instanceof Anthropic.RateLimitError) return [429, 'AI ถูกใช้งานถี่เกินไป — รอสักครู่แล้วลองใหม่'];
  if (e instanceof Anthropic.BadRequestError) return [400, 'AI รับคำขอนี้ไม่ได้: ' + e.message];
  if (e instanceof Anthropic.APIError) return [502, `AI ขัดข้องชั่วคราว (${e.status || 'network'}) — ลองใหม่อีกครั้ง`];
  return [e.status || 500, e.message || 'AI อ่านไม่สำเร็จ'];
}
module.exports = { extractEvents, rewritePoster, designPoster, briefPoster, aiErrorMessage, MAX_CHARS: 150000 };
