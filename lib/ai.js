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
        required: ['name', 'start', 'end', 'venue', 'owner', 'audience', 'status', 'note'],
        properties: {
          name: { type: 'string', description: 'Event name as written in the sheet (keep the original language)' },
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

function aiErrorMessage(e) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  if (e instanceof Anthropic.AuthenticationError) return [502, 'ANTHROPIC_API_KEY ไม่ถูกต้อง — ตรวจค่าใน Vercel → Settings → Environment Variables'];
  if (e instanceof Anthropic.RateLimitError) return [429, 'AI ถูกใช้งานถี่เกินไป — รอสักครู่แล้วลองใหม่'];
  if (e instanceof Anthropic.BadRequestError) return [400, 'AI รับคำขอนี้ไม่ได้: ' + e.message];
  if (e instanceof Anthropic.APIError) return [502, `AI ขัดข้องชั่วคราว (${e.status || 'network'}) — ลองใหม่อีกครั้ง`];
  return [e.status || 500, e.message || 'AI อ่านไม่สำเร็จ'];
}
module.exports = { extractEvents, aiErrorMessage, MAX_CHARS: 150000 };
