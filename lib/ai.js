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

let client = null, clientKey = null, KEY = '';
function useKey(k) { KEY = k || ''; }   // set per request by lib/hub.js: Vercel env var, or the key an Admin saved in the app
function getClient() {
  const key = KEY || process.env.ANTHROPIC_API_KEY || '';
  if (!client || clientKey !== key) { const { Anthropic } = require('@anthropic-ai/sdk'); client = new Anthropic({ apiKey: key }); clientKey = key; }
  return client;
}
async function checkKey(key) {   // cheap validity check: list models with this key (no tokens used)
  const { Anthropic } = require('@anthropic-ai/sdk');
  const page = await new Anthropic({ apiKey: key, maxRetries: 1, timeout: 15000 }).models.list({ limit: 1 });
  return !!page;
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
const BRIEF_KIT = { H01: 'ที่ปรึกษาถือแท็บเล็ต (person)', H02: 'ที่ปรึกษาอธิบายข้อมูล (person)', H03: 'แพทย์ถือคลิปบอร์ด (person)', H04: 'พยาบาลถือแฟ้ม (person)', H05: 'พนักงานทำงานที่โต๊ะ (person)', H06: 'ลูกค้าถือแบบฟอร์ม (person)', H07: 'ลูกค้าทบทวนกรมธรรม์ (person)', H08: 'ครอบครัว (person)', H09: 'ผู้ป่วยนั่งพัก (person)', H10: 'เจ้าหน้าที่ดูแลการเคลม (person)', H11: 'เล่มกรมธรรม์ (object)', H12: 'แบบฟอร์มเคลม (object)', H13: 'บัตรประกันสุขภาพ (object)', H14: 'ใบเสร็จค่ารักษา (object)', H15: 'อาคารโรงพยาบาล (object)', H16: 'เตียงผู้ป่วย (object)', H17: 'หูฟังแพทย์ (object)', H18: 'โล่และหัวใจ (object)', H19: 'ปฏิทินและนาฬิกา (object)', H20: 'แฟ้มเอกสาร (object)', H21: 'ตัวแทนรุ่นใหม่ชาย (person)', H22: 'ตัวแทนรุ่นใหม่หญิง (person)', H23: 'นักธุรกิจชาย (person)', H24: 'นักธุรกิจหญิง (person)', H25: 'คู่รักวัยเกษียณ (person)', H26: 'ผู้สูงวัยเดินเล่น (person)', H27: 'ผู้สูงวัยทำสวน (person)', H28: 'ท่องเที่ยววัยเกษียณ (person)', H29: 'ไลฟ์สไตล์ช้อปปิ้ง (person)', H30: 'พักผ่อนที่คาเฟ่ (person)', H31: 'ลูกค้าใช้แอป (person)', H32: 'คู่รักเดินออกกำลังกาย (person)', H33: 'ตัวแทนให้คำปรึกษา (person)', H34: 'วิทยากรชาย (person)', H35: 'วิทยากรหญิง + ฟลิปชาร์ต (person)', H36: 'ทีมงานอีเวนต์หญิง (person)', H37: 'ผู้ประสานงานอีเวนต์ (person)', H38: 'ตัวแทนรับรางวัล (person)', H39: 'ถ้วยรางวัล (object)', H40: 'แอปและบริการดิจิทัล (object)', R01: 'ที่ปรึกษาหญิง (เสมือนจริง) (person, photorealistic)', R02: 'ที่ปรึกษาชาย (เสมือนจริง) (person, photorealistic)', R03: 'ผู้ประสานงานอีเวนต์ (เสมือนจริง) (person, photorealistic)', R04: 'ทีมงานโปรดักชัน (เสมือนจริง) (person, photorealistic)', R05: 'ครีเอทีฟ / นักออกแบบ (เสมือนจริง) (person, photorealistic)', R06: 'นักวิเคราะห์การเงิน (เสมือนจริง) (person, photorealistic)', R07: 'เจ้าหน้าที่ดูแลลูกค้า (เสมือนจริง) (person, photorealistic)', R08: 'เจ้าหน้าที่พิจารณารับประกัน (เสมือนจริง) (person, photorealistic)', R09: 'วิทยากร (เสมือนจริง) (person, photorealistic)', R10: 'เจ้าหน้าที่ IT (เสมือนจริง) (person, photorealistic)', R11: 'เจ้าของธุรกิจหญิง (เสมือนจริง) (person, photorealistic)', R12: 'ลูกค้าระดับพรีเมียม (เสมือนจริง) (person, photorealistic)', R13: 'ลูกค้าวัยทำงานใช้มือถือ (เสมือนจริง) (person, photorealistic)', R14: 'คุณพ่อกับลูก (เสมือนจริง) (person, photorealistic)', R15: 'คู่รักวัยเกษียณ (เสมือนจริง) (person, photorealistic)', R16: 'คุณแม่วัยเกษียณ (เสมือนจริง) (person, photorealistic)', R17: 'ลูกค้ารถเข็น (เสมือนจริง) (person, photorealistic)', R18: 'แพทย์ (เสมือนจริง) (person, photorealistic)', R19: 'พยาบาล (เสมือนจริง) (person, photorealistic)', R20: 'ลูกค้าผู้ถือกรมธรรม์ (เสมือนจริง) (person, photorealistic)', N01: 'ที่ปรึกษาประกันชาย (person)', N02: 'ที่ปรึกษาประกันหญิง (person)', N03: 'ตัวแทนภาคสนาม (person)', N04: 'เจ้าหน้าที่ Call Center (person)', N05: 'เจ้าหน้าที่ Compliance (person)', N06: 'เจ้าหน้าที่พิจารณารับประกัน (person)', N07: 'นักวิเคราะห์การเงิน (person)', N08: 'เจ้าหน้าที่ IT (person)', N09: 'ผู้จัดการ HR (person)', N10: 'นักออกแบบ / ครีเอทีฟ (person)', N11: 'ทีมงานจัดงาน (person)', N12: 'เจ้าหน้าที่บริการลูกค้า (person)', N13: 'คุณพ่อมือใหม่ (person)', N14: 'ลูกค้าคู่แต่งงานใหม่ (person)', N15: 'ลูกค้าวัยเกษียณชาย (person)', N16: 'เจ้าของธุรกิจขนาดเล็ก (person)', N17: 'ลูกค้าระดับพรีเมียมชาย (person)', N18: 'ลูกค้ารถเข็น (person)', N19: 'ผู้รับผลประโยชน์ (person)', N20: 'ที่ปรึกษาวางแผนเกษียณ (person)', I01: 'ที่ปรึกษาหญิงถือแท็บเล็ต (ชุดสุขภาพ) — female advisor in navy blazer holding a tablet (person)', I03: 'แพทย์หญิงถือคลิปบอร์ด — female doctor with clipboard (person)', I04: 'แพทย์ชายอธิบาย — male doctor presenting a health option (person)', I07: 'ผู้ป่วยนอกถือถุงยา — outpatient holding a medication bag (OPD) (person)', I08: 'ผู้ป่วยนอนพักบนเตียง — recovering inpatient sitting up in a hospital bed with IV (IPD, admission) (person)', I09: 'ผู้ป่วยผ่าตัดวันเดียวกลับ — day-surgery patient ready to go home (person)', I10: 'ที่ปรึกษาชายชี้แจงเงื่อนไข — male advisor raising a finger to explain a policy detail (person)', I11: 'ผู้หญิงปวดศีรษะ — woman with a headache touching her temple (person)', I12: 'ผู้สูงวัยนั่งพัก — older patient seated, resting (person)', I13: 'ครอบครัวพ่อแม่ลูก — parents and child standing together (family protection) (person)', I14: 'ลูกค้าปรึกษาเคลมกับเจ้าหน้าที่ — customer reviewing a policy or claim with an advisor at a desk (person)', I15: 'พยาบาลชุดสครับถือแท็บเล็ต — nurse in blue scrubs holding a tablet (person)', I16: 'แพทย์ปรึกษาออนไลน์ — doctor giving an online consultation at a laptop (telemedicine) (person)', I17: 'ผู้ชายครุ่นคิด (ระยะรอคอย) — man thinking, holding a document (waiting period, questions) (person)', I19: 'ทีมแพทย์ตรวจสุขภาพ — female and male doctors reviewing a health check (person)', I20: 'เจ้าหน้าที่บริการลูกค้าหญิง — customer care advisor wearing a headset (person)', S01: 'ลูกค้าดูกรมธรรม์บนแท็บเล็ต (เสมือนจริง) — woman reviewing policy details on a tablet (person, photorealistic)', S03: 'ผู้บาดเจ็บใส่ที่คล้องแขน (เสมือนจริง) — injured customer with arm sling and neck collar (accident) (person, photorealistic)', S05: 'ลูกค้านั่งรอพบแพทย์ (เสมือนจริง) — woman seated in an armchair reading a document, waiting for consultation (person, photorealistic)', S06: 'คนเป็นหวัด / ภูมิแพ้ (เสมือนจริง) — woman with flu or allergy holding a tissue (person, photorealistic)', S07: 'พนักงานออฟฟิศปวดตา (เสมือนจริง) — office worker with eye fatigue and headache (person, photorealistic)', S08: 'พยาบาลฉีดวัคซีน (เสมือนจริง) — nurse giving an adult an upper-arm vaccination (person, photorealistic)', S10: 'ผู้หญิงวิ่งออกกำลังกาย (เสมือนจริง) — healthy woman running (exercise, prevention) (person, photorealistic)', S11: 'นักวิ่งเจ็บเข่า (เสมือนจริง) — runner squatting with a sore knee (sports injury) (person, photorealistic)', S12: 'ครอบครัวพ่อแม่ลูก (เสมือนจริง) — parents with their daughter (family health and coverage) (person, photorealistic)', S13: 'คู่สูงวัยสุขภาพดี (เสมือนจริง) — healthy senior couple smiling (person, photorealistic)', S14: 'คุณแม่ตั้งครรภ์ (เสมือนจริง) — pregnant woman (pregnancy, maternity) (person, photorealistic)', S15: 'ลูกค้าปรึกษาแพทย์ผ่านมือถือ (เสมือนจริง) — man in an armchair using telehealth on a smartphone (person, photorealistic)', S16: 'แพทย์หญิงถือแท็บเล็ต (เสมือนจริง) — female doctor holding a tablet (person, photorealistic)', S18: 'คนใส่หน้ากากอนามัย (เสมือนจริง) — woman wearing a protective face mask (person, photorealistic)', E01: 'สมุดกรมธรรม์ — policy booklet (object)', E03: 'แฟ้มเอกสารเปิด — open document folder (object)', E04: 'คลิปบอร์ดเช็กลิสต์ — clipboard with checklist (infographic)', E05: 'ปฏิทินรายเดือน — monthly calendar with a marked date (object)', E06: 'นาฬิกาจับเวลา — stopwatch (waiting period, deadline) (object)', E07: 'นาฬิกา — round clock (object)', E08: 'โล่เครื่องหมายถูก — shield with a check mark (protection, approved) (object)', E09: 'อาคารโรงพยาบาล — hospital building (object)', E10: 'หูฟังแพทย์ — stethoscope (object)', E11: 'แคปซูลยา — medicine capsule (object)', E12: 'แผงยาเม็ด — medicine blister pack (object)', E13: 'กากบาทการแพทย์ — medical cross in a circle (object)', E14: 'ประวัติสุขภาพ — health record card (object)', E15: 'กองเหรียญ — coin stacks (money, limits) (finance)', E16: 'บัตรชำระเงิน — payment card (finance)', E17: 'แว่นขยาย — magnifying glass (infographic)', E18: 'ไทม์ไลน์ 3 จุด — three-step timeline (infographic)', E26: 'ลูกศรขวา — arrow pointing right (infographic)', E27: 'ลูกศรโค้ง — curved arrow (infographic)', E31: 'หัวใจชีพจร — heart with pulse line (object)', E32: 'จอ ECG — ECG monitor (object)', E33: 'DNA — DNA helix (object)', E34: 'ปอด — lungs (object)', E35: 'ไต — kidneys (object)', E36: 'ฟัน — tooth (object)', E37: 'เข็มฉีดวัคซีน — vaccine syringe (object)', E38: 'ขวดวัคซีน — vaccine vial (object)', E39: 'หลอดเลือดตรวจแล็บ — lab test tube (object)', E40: 'หน้ากากอนามัย — protective face mask (object)', E41: 'พลาสเตอร์ปิดแผล — adhesive bandage (object)', E42: 'ปรอทวัดไข้ — thermometer (object)', E43: 'หยดน้ำ — water droplet (object)', E44: 'กระเป๋าพยาบาล — medical bag (object)', E45: 'ใบเสร็จ — blank receipt (medical bill) (finance)', E46: 'สมาร์ตโฟน — smartphone (object)', E47: 'โน้ตติดหมุด — pinned sticky note (infographic)', E48: 'สมุดจด — lined notebook (infographic)', E49: 'หูฟังคอลเซ็นเตอร์ — support headset (object)', E50: 'ร่มคุ้มครอง — benefit umbrella (coverage) (object)', E51: 'เครื่องหมายถูก — circular check (yes, covered) (infographic)', E52: 'เครื่องหมายเตือน — circular alert (warning, exclusion) (infographic)', E53: 'สัญลักษณ์ข้อมูล — circular information sign (infographic)', E54: 'หมุดสถานพยาบาล — care location pin (object)', E55: 'ค้นหาเอกสารการแพทย์ — medical document search (object)', E56: 'กราฟขาขึ้น — upward trend chart (finance)', E57: 'ลูกศรเปรียบเทียบสองทาง — two-way comparison arrows (infographic)', F01: 'เครื่องคิดเลข (finance)', F02: 'กระปุกออมสิน (finance)', F03: 'กองเหรียญ (finance)', F04: 'เอกสารภาษี (finance)', F05: 'เป้าหมายการออม (finance)', F06: 'เงินสำรองฉุกเฉิน (finance)', F07: 'สมุดแผนงบประมาณ (finance)', F08: 'กระเป๋าเงินรายรับรายจ่าย (finance)', F09: 'เงินออมเพื่อเกษียณ (finance)', F10: 'กระปุกแยกเป้าหมาย (finance)', F11: 'ไทม์ไลน์ 5 จุด (infographic)', F12: 'ขั้นตอน 1-2-3 (infographic)', F13: 'ตารางเปรียบเทียบ (infographic)', F14: 'เช็กลิสต์ (infographic)', F15: 'กล่องคำพูด (infographic)', F16: 'กล่องข้อมูล (infographic)', F17: 'กล่องข้อควรระวัง (infographic)', F18: 'แผนผังแยกทางเลือก (infographic)', F19: 'แถบหัวข้อ (infographic)', F20: 'แผนผังวงจร (infographic)' };   // keep in sync with SD_KIT in js/studio-kit.js (the team's illustration kit)
const BRIEF_ALL = BRIEF_KIT;   // the team's kit only (the old drawn set is retired)
const BRIEF_PEOPLE = Object.keys(BRIEF_KIT).filter(k => /\(person/.test(BRIEF_KIT[k]));
const BRIEF_THINGS = Object.keys(BRIEF_KIT).filter(k => !/\(person/.test(BRIEF_KIT[k]));
const BRIEF_SCENES = { none: 'no photo, flat CI colour (default for most posters)', P01: 'hospital lounge photo', P02: 'home living room photo', P03: 'modern office photo', P04: 'wellness park photo', P06: 'soft studio photo' };
const BRIEF_CATALOG = [['People - illustrated', k => /\(person\)/.test(BRIEF_KIT[k])], ['People - photorealistic', k => /photorealistic/.test(BRIEF_KIT[k])], ['Health & document objects', k => /\(object\)/.test(BRIEF_KIT[k])], ['Finance objects', k => /\(finance/.test(BRIEF_KIT[k])], ['Infographic pieces and symbols', k => /\(infographic/.test(BRIEF_KIT[k])]]
  .map(([t, f]) => `${t}:\n` + Object.keys(BRIEF_KIT).filter(f).map(k => `${k} ${BRIEF_KIT[k].replace(/ \([^)]*\)$/, '')}`).join('; ')).join('\n');
const BRIEF_PROPS = ['shield', 'coins', 'trophy', 'mega', 'cal', 'heart', 'phone', 'clip', 'gift', 'clock', 'pin', 'star', 'chat', 'bulb', 'doc', 'laptop'];
const BRIEF_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['review', 'kind', 'kind_text', 'tone', 'audience', 'summary', 'kicker', 'headline', 'emph', 'sub', 'points', 'date', 'time', 'venue', 'cta', 'note', 'hero', 'scene', 'props', 'accent', 'designs', 'warn'],
  properties: {
    kind: { type: 'string', enum: ['announce', 'change', 'event', 'campaign', 'reminder', 'recognition', 'knowledge', 'recruit'], description: 'announce=general news/notice, change=policy or process change, event=invitation/training/meeting, campaign=sales campaign/contest/promotion, reminder=deadline or reminder, recognition=congratulations/award, knowledge=tips/how-to/explainer, recruit=open for applications' },
    kind_text: { type: 'string', description: 'Short Thai label of what this communication is, in your own words (e.g. ประกาศเชิญอบรมตัวแทนใหม่, แจ้งเปลี่ยนระบบส่งงาน).' },
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
      visual: { type: 'string', enum: BRIEF_THINGS, description: 'Icon-sized picture for this point from the kit catalogue (objects / finance / symbols; E01-E57 are the cleanest icons). It must show what the point is about. Every point gets a different picture.' },
    } }, description: '0-4 key points in reading order (steps keep their order). Leave empty for a single simple message. Do not repeat date/time/venue here.' },
    date: { type: 'string', description: 'Date or date range exactly as written in the message (same digits and month words), or empty.' },
    time: { type: 'string', description: 'Time exactly as written, or empty.' },
    venue: { type: 'string', description: 'Place / channel exactly as written (e.g. Zoom, ห้องประชุม 12A), or empty.' },
    cta: { type: 'string', description: 'Short action for the reader (e.g. ลงทะเบียนภายใน 15 ม.ค., สแกนเพื่อสมัคร), or empty. Keep any deadline as written.' },
    note: { type: 'string', description: 'Fine print / conditions / contact exactly as written, or empty.' },
    review: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['by', 'note'], properties: { by: { type: 'string', enum: ['content', 'design'] }, note: { type: 'string', description: 'One short Thai sentence.' } } }, description: 'Before answering, review your own draft as two reviewers and fix what they find: content = a senior Thai copy chief (one clear message, plain words, facts unchanged, no jargon, nothing important missing); design = the art director (headline fits 2-3 short lines, points parallel and short, the picture matches the meaning). Return 1-3 notes about what was improved or what the creator should check.' },
    hero: { type: 'string', enum: BRIEF_PEOPLE, description: 'Main picture: the person from the kit catalogue whose role, situation and mood match the message (see the picture rules).' },
    scene: { type: 'string', enum: Object.keys(BRIEF_SCENES), description: 'Soft photo setting behind the poster (used only when the creator picks the photo background): ' + Object.entries(BRIEF_SCENES).map(([k, v]) => `${k}=${v}`).join(', ') },
    props: { type: 'array', items: { type: 'string', enum: Object.keys(BRIEF_KIT).filter(k => !/person/.test(BRIEF_KIT[k])) }, description: '2 small kit objects (not people) placed around the main picture as decoration, related to the topic.' },
    accent: { type: 'string', enum: ['blue', 'pink', 'amber', 'mint', 'lavender'], description: 'Pastel accent: blue=calm/formal, pink=care/family/celebration, amber=attention/money/reminder, mint=health/positive, lavender=knowledge/tech' },
    designs: { type: 'array', items: { type: 'string', enum: ['feature', 'band', 'circles', 'date'] }, description: 'All 4 layouts ordered best-first. feature=the team main style: headline top-left, big person on the right, statement box + checklist bubble on the left, QR + call to action bottom-left (best default); band=formal announcement with an AXA Blue header band; circles=2-3 key points in bold colour circles around the person ("3 things to know"); date=event, training or deadline with a calendar page.' },
    warn: { type: 'string', description: 'Thai note about anything unclear or missing (e.g. no year in the date). Empty if all clear.' },
  },
};
function posterBriefSchema(assetCount) {
  if (!assetCount) return BRIEF_SCHEMA;
  return {
    ...BRIEF_SCHEMA,
    required: [...BRIEF_SCHEMA.required, 'visual_plan'],
    properties: {
      ...BRIEF_SCHEMA.properties,
      visual_plan: {
        type: 'array',
        description: 'Assign visual roles to numbered images from the selected slide. Only IDs 1 to ' + assetCount + ' can be placed. Use at most one background, one hero and one accent. Use reference for logos, watermarks, slogans in images and images unsuitable for placement. Other slides guide the art direction only.',
        items: { type: 'object', additionalProperties: false, required: ['id', 'role'], properties: {
          id: { type: 'integer' }, role: { type: 'string', enum: ['background', 'hero', 'accent', 'reference'] },
        } },
      },
    },
  };
}
const BRIEF_SYSTEM = `You are the senior communications designer of the Agency Experience team at Krungthai-AXA Life Insurance (Thailand). Your readers are mostly insurance agents, agency leaders and sometimes customers; posters go to LINE groups, Facebook and internal screens.
The content creator gives you their input in <input>. It can be a finished message (email, LINE text, memo) OR a request/prompt describing the poster they want ("ทำโปสเตอร์เชิญอบรม...", "อยากประกาศว่า..."), OR rough notes. Work out which it is:
- If it is a request or notes, write the poster copy yourself from the facts given — do not copy the instruction words onto the poster.
- If it is a finished message, condense it.
Before writing, think through: (1) what kind of communication this is and its purpose; (2) who reads it and what they care about; (3) the ONE key message a reader must get in 3 seconds; (4) what the reader must do and by when; (5) which details are essential and which can go into the fine print. Then write the brief.
Facts belong to the writer:
- Never change, round, add or remove facts: numbers, amounts, percentages, dates, times, places, names, product names, conditions and deadlines stay exactly as written (same digits, same month words, same units).
- Do not invent benefits, prizes, people, places, links or details. If something important is missing (e.g. no date for an event, no year), leave the field empty and say so in warn.
- Keep the input's language (normally Thai; keep English product/brand words). Polite, positive, corporate tone unless the creator asks for another tone. No emoji, no hashtags.
Writing for a poster: headline lines short and concrete (the reader should understand the point from the headline alone), points short and parallel, no long paragraphs; put conditions/contacts in note so nothing important is lost.
<creator_notes> are extra instructions from the creator (tone, emphasis, audience, what to highlight or leave out). Follow them unless they ask you to change or invent facts.
Choose pictures from the team's illustration kit that match the meaning of each point, not just its words.
House style of the team's posters (follow it):
- Headline: a hook in 2-3 short lines, often a question or a promise ("เมื่อต้องแอดมิท / ประกันสุขภาพ เบิกอะไรได้บ้าง?", "3 เรื่องควรรู้ / ก่อนปักปากกา!"). emph = the line that names the topic or the number; it is shown in a dark box.
- sub: one or two plain sentences that set the context (shown in a dark statement box). Not a repeat of the headline.
- points: 2-4 items; title = 2-6 words in bold, body = one short line. Parallel wording.
- cta: what to do next, can mention the product (e.g. "เลือกประกันสุขภาพที่ตอบโจทย์ไลฟ์สไตล์ได้ จากกรุงไทย-แอกซ่า"). note: conditions / disclaimer.
- hero: a person whose role and mood fit the message (an advisor for advice, a patient for claims, a family for protection).
Picture rules (art director):
- Read the situation, not single words: who is in the story and how they feel. Inpatient/admission -> patient in bed (I08); outpatient/medicine -> I07; day surgery -> I09; accident -> S03; sports injury -> S11; flu/allergy -> S06; vaccination -> S08 or the nurse I15; pregnancy -> S14; telemedicine -> I16 or S15; waiting period / things to know -> I17 or I10; claims -> I14; call center -> I20; health check -> I19; family protection -> I13 or S12; seniors -> I12 or S13; training, events and awards for agents -> the trainer, event or award people (H34-H38, R03, R09).
- Keep one style per poster: photorealistic people (R, S) for a photo look, illustrated people (H, N, I) otherwise. Point pictures are always objects or symbols (never people), each different and each showing its own point (e.g. coins E15 for limits, receipt E45 for bills, stopwatch E06 for waiting periods, calendar E05 for dates, shield E08 for coverage, alert E52 for exclusions, check E51 for what is covered, phone E46 for apps, hospital E09 for network hospitals).
- scene: pick a photo only when the setting itself helps the story (hospital for claims, home for family, office for agent news, park for wellness); otherwise none.
The kit catalogue (key + what it shows):
${BRIEF_CATALOG}`
function briefUserText({ text, format, guide, design, accent, today }) {
  return `Today: ${today || 'unknown'}\nPoster format: ${format || 'portrait'}${design && design !== 'auto' ? `\nLayout chosen by the creator: ${design} (write copy that fits it; still rank all layouts in designs)` : ''}${accent && accent !== 'auto' ? `\nAccent colour chosen by the creator: ${accent} (return it as accent)` : ''}\n\n<input>\n${text}\n</input>${guide ? `\n\n<creator_notes>\n${guide}\n</creator_notes>` : ''}` ;
}
async function briefPoster({ text, format, guide, design, accent, today, reference, assetCount }) {
  const prompt = briefUserText({ text, format, guide, design, accent, today });
  const content = reference ? [
    { type: 'text', text: prompt },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: reference } },
  ] : prompt;
  const response = await getClient().beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: posterBriefSchema(assetCount) } },   // medium: reads intent and context more carefully than low
    system: BRIEF_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('AI ปฏิเสธการอ่านข้อความนี้'), { status: 422 });
  const block = response.content.find(b => b.type === 'text');
  try { return JSON.parse(block ? block.text : ''); } catch (e) { throw Object.assign(new Error('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ — ลองใหม่อีกครั้ง'), { status: 502 }); }
}

function aiErrorMessage(e) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  if (e instanceof Anthropic.AuthenticationError) return [502, 'API Key ของ AI ไม่ถูกต้องหรือถูกยกเลิก — Admin ตั้งค่าใหม่ที่ Poster → เชื่อมต่อ AI (หรือ Vercel → Environment Variables)'];
  if (e instanceof Anthropic.RateLimitError) return [429, 'AI ถูกใช้งานถี่เกินไป — รอสักครู่แล้วลองใหม่'];
  if (e instanceof Anthropic.BadRequestError) return [400, 'AI รับคำขอนี้ไม่ได้: ' + e.message];
  if (e instanceof Anthropic.APIError) return [502, `AI ขัดข้องชั่วคราว (${e.status || 'network'}) — ลองใหม่อีกครั้ง`];
  return [e.status || 500, e.message || 'AI อ่านไม่สำเร็จ'];
}
module.exports = { BRIEF_SCHEMA, posterBriefSchema, BRIEF_SYSTEM, briefUserText, useKey, checkKey, extractEvents, rewritePoster, designPoster, briefPoster, aiErrorMessage, MAX_CHARS: 150000 };
