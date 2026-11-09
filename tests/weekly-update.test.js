'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { buildWeeklySnapshot, periodOf, bangkokToday, taskDates } = require('../lib/weekly-data');
const { generateWeeklyUpdate, validateOutput } = require('../lib/weekly-ai');
const { createHub } = require('../lib/hub');

const task = (id, extra = {}) => ({ id, title: id, assigneeId: 'creative', start: '2026-11-09', duration: 1, status: 'todo', priority: 'med', source: 'personal', ...extra });
function fixture() {
  return {
    settings: { dayMode: 'working', weekend: [0, 6], holidays: [] },
    groups: [{ id: 'g_creative', name: 'Creative & Production' }, { id: 'g_event', name: 'Event Management' }],
    members: [{ id: 'admin', name: 'Admin', role: 'admin', group: 'g_creative' }, { id: 'creative', name: 'Creative', role: 'member', group: 'g_creative' }, { id: 'event', name: 'Event', role: 'member', group: 'g_event' }],
    projects: [{ id: 'p1', name: 'Cross-functional Project', dayMode: null, squad: ['creative', 'event'] }],
    tasks: [
      task('current', { projectId: 'p1', coId: 'event', status: 'doing', duration: 3, desc: 'Source facts', files: [{ data: 'attachment-must-not-leak' }] }),
      task('next', { start: '2026-11-16', assigneeId: 'event' }),
      task('overdue', { start: '2026-11-02' }),
      task('completed', { start: '2026-11-02', status: 'done', doneAt: '2026-11-10' }),
      task('old-done', { status: 'done', doneAt: '2026-11-01' }),
      task('later', { start: '2026-11-23' }),
      task('private-secret', { private: true, desc: 'private-detail' }),
      task('cancelled', { status: 'cancelled' }),
      task('undated', { start: '' }),
    ],
  };
}
const summary = snapshot => ({ overview: ['บันทึกความคืบหน้าตามกลุ่มหน้าที่'], groups: snapshot.groups.map(g => ({ id: g.id, thisWeek: g.tasks.some(t => t.thisWeek) ? ['ความคืบหน้าตามงานที่บันทึก'] : [], nextWeek: g.tasks.some(t => t.nextWeek) ? ['แผนงานสัปดาห์หน้าตามที่บันทึก'] : [], attention: [] })) });

test('Monday–Sunday boundaries use Bangkok time across Sunday and year changes', () => {
  assert.equal(bangkokToday(new Date('2026-11-15T18:00:00Z')), '2026-11-16');
  assert.deepEqual(periodOf('2026-11-15').thisWeek, { start: '2026-11-09', end: '2026-11-15' });
  assert.deepEqual(periodOf('2026-11-16').nextWeek, { start: '2026-11-23', end: '2026-11-29' });
  assert.deepEqual(periodOf('2026-12-31').nextWeek, { start: '2027-01-04', end: '2027-01-10' });
});

test('server task dates match the existing client calendar, including holidays and project overrides', () => {
  const context = vm.createContext({});
  for (const file of ['holidays.js', 'core.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  for (const dayMode of ['working', 'calendar']) for (const usePublicHolidays of [true, false]) {
    const state = fixture(); state.settings = { dayMode, usePublicHolidays, weekend: [0, 6], holidays: [{ date: '2026-11-20' }] };
    for (const override of [null, 'calendar', 'working']) for (const start of ['2026-11-14', '2026-11-19', '2026-12-04', '2026-12-30']) for (const duration of [1, 3, 10]) {
      state.projects[0].dayMode = override;
      const t = task('dates', { projectId: 'p1', start, duration });
      vm.runInContext(`Store.state=${JSON.stringify(state)}; globalThis.dateTask=${JSON.stringify(t)};`, context);
      const expected = vm.runInContext('JSON.stringify({start:taskStart(dateTask),target:taskEnd(dateTask)})', context);
      assert.deepEqual(taskDates(t, state.projects[0], state.settings), JSON.parse(expected));
    }
  }
});

test('selection includes current/next week, carry-over and actual completions, but excludes private/cancelled/old/future work', () => {
  const snapshot = buildWeeklySnapshot(fixture(), '2026-11-11');
  assert.deepEqual(snapshot.groups.map(g => g.name), ['Creative & Production', 'Event Management']);
  assert.deepEqual(snapshot.groups.flatMap(g => g.tasks).map(t => t.id).sort(), ['completed', 'current', 'next', 'overdue']);
  assert.deepEqual(snapshot.counts, { tasks: 4, thisWeek: 3, nextWeek: 1, overdue: 1, unscheduled: 1 });
  assert.deepEqual(snapshot.groups[0].tasks.find(t => t.id === 'current').owners, ['Creative', 'Event']);
  assert.equal(snapshot.groups[0].tasks.find(t => t.id === 'current').project, 'Cross-functional Project');
  const wire = JSON.stringify(snapshot);
  assert.ok(!wire.includes('private-secret') && !wire.includes('private-detail') && !wire.includes('attachment-must-not-leak'));
});

test('a cross-week task is counted once and remains in its primary functional group', () => {
  const state = fixture(); state.tasks = [task('span', { start: '2026-11-13', duration: 4, projectId: 'p1', coId: 'event' })];
  const snapshot = buildWeeklySnapshot(state, '2026-11-11');
  assert.equal(snapshot.groups.length, 1);
  assert.deepEqual(snapshot.counts, { tasks: 1, thisWeek: 1, nextWeek: 1, overdue: 0, unscheduled: 0 });
  assert.equal(snapshot.groups[0].id, 'g_creative');
});

test('unassigned work is retained and private dependencies never expose private text', () => {
  const state = fixture(); state.tasks = [task('unassigned', { assigneeId: '', deps: ['secret'] }), task('secret', { private: true, title: 'Private dependency title' })];
  const snapshot = buildWeeklySnapshot(state, '2026-11-11');
  assert.equal(snapshot.groups[0].id, 'unassigned');
  assert.equal(snapshot.groups[0].tasks[0].pendingDependency, true);
  assert.ok(!JSON.stringify(snapshot).includes('Private dependency title'));
});

test('AI SDK structured generation receives facts and enforces exact groups and week sections', async () => {
  const snapshot = buildWeeklySnapshot(fixture(), '2026-11-11');
  const { MockLanguageModelV4 } = await import('ai/test');
  let prompt;
  const model = new MockLanguageModelV4({ doGenerate: async options => {
    prompt = JSON.stringify(options.prompt);
    return { content: [{ type: 'text', text: JSON.stringify(summary(snapshot)) }], finishReason: { unified: 'stop' }, usage: { inputTokens: { total: 10 }, outputTokens: { total: 30 } }, warnings: [] };
  } });
  const report = await generateWeeklyUpdate(snapshot, { language: 'en', model });
  assert.equal(report.result.groups[0].name, 'Creative & Production');
  assert.ok(prompt.includes('Output language: English') && !prompt.includes('private-secret'));
  const badGroup = summary(snapshot); badGroup.groups[0].id = 'invented';
  assert.throws(() => validateOutput(badGroup, snapshot));
  const badWeek = summary(snapshot); badWeek.groups[0].nextWeek = ['Invented plan'];
  assert.throws(() => validateOutput(badWeek, snapshot));
  const missing = summary(snapshot); missing.groups[0].thisWeek = [];
  assert.throws(() => validateOutput(missing, snapshot));
});

test('a valid summary taking longer than 22 seconds is allowed to finish', async t => {
  const snapshot = buildWeeklySnapshot(fixture(), '2026-11-11');
  const { MockLanguageModelV4 } = await import('ai/test');
  const started = Promise.withResolvers();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const model = new MockLanguageModelV4({ doGenerate: async () => {
    started.resolve();
    await new Promise(resolve => setTimeout(resolve, 23000));
    return { content: [{ type: 'text', text: JSON.stringify(summary(snapshot)) }], finishReason: { unified: 'stop' }, usage: { inputTokens: { total: 10 }, outputTokens: { total: 30 } }, warnings: [] };
  } });
  const pending = generateWeeklyUpdate(snapshot, { model });
  await started.promise;
  t.mock.timers.tick(23000);
  const report = await pending;
  assert.equal(report.result.groups.length, snapshot.groups.length);
});

async function testApi(t, options = {}) {
  const state = fixture();
  const auth = { default: 'test-only', users: {}, people: state.members, sessions: { admin: { id: 'admin', at: Date.now() }, staff: { id: 'creative', at: Date.now() } }, ...(options.auth || {}) };
  const store = { async getAuth() { return auth; }, async saveAuth() {}, async getState() { return { rev: 1, state }; } };
  const server = http.createServer(createHub(store, { now: () => new Date('2026-11-11T05:00:00Z'), ...(options.hub || {}) }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const request = async (token, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/weekly-update`, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  return { request, state };
}

test('Gemini adapter sends structured source data and Claude fallback handles provider quota errors', async () => {
  const snapshot = buildWeeklySnapshot(fixture(), '2026-11-11'), calls = [];
  const fetch = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url: String(url), body });
    assert.ok(!JSON.stringify(body).includes('private-secret'));
    if (String(url).includes('googleapis.com')) {
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      return new Response(JSON.stringify({ error: { code: 429, message: 'Test quota exceeded', status: 'RESOURCE_EXHAUSTED' } }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [{ type: 'text', text: JSON.stringify(summary(snapshot)) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 30 } }), { headers: { 'Content-Type': 'application/json' } });
  };
  const report = await generateWeeklyUpdate(snapshot, { geminiKey: 'test-gemini', aiKey: 'test-anthropic', fetch });
  assert.equal(report.provider, 'claude'); assert.equal(calls.length, 2);
  assert.ok(calls[0].url.includes('gemini-3.8-flash') && calls[1].url.includes('anthropic.com'));
});

test('API denies unauthenticated and non-Admin callers, including direct POST', async t => {
  const { request } = await testApi(t);
  assert.equal((await request(null)).status, 401);
  assert.equal((await request('staff')).status, 403);
  assert.equal((await request('staff', 'POST', { language: 'th' })).status, 403);
  assert.equal((await request('admin', 'DELETE')).status, 405);
});

test('API uses saved server data, validates language and coalesces identical AI requests', async t => {
  let calls = 0, captured;
  const { request, state } = await testApi(t, { auth: { aiKey: 'test-provider-key' }, hub: { generateWeeklyUpdate: async (snapshot, config) => { calls++; captured = snapshot; assert.equal(config.language, 'en'); return { result: validateOutput(summary(snapshot), snapshot), provider: 'test' }; } } });
  const meta = await request('admin');
  assert.equal(meta.status, 200); assert.equal(meta.body.aiConnected, true);
  assert.ok(!JSON.stringify(meta.body).includes('test-provider-key'));
  assert.equal((await request('admin', 'POST', { language: 'xx' })).status, 400);
  const responses = await Promise.all([request('admin', 'POST', { language: 'en', tasks: [{ title: 'forged-client-task' }] }), request('admin', 'POST', { language: 'en' })]);
  assert.ok(responses.every(r => r.status === 200 && r.body.result.groups.length === 2));
  assert.equal(calls, 1); assert.ok(!JSON.stringify(captured).includes('forged-client-task'));
  state.tasks.push(task('new-work'));
  await request('admin', 'POST', { language: 'en' });
  assert.equal(calls, 2);
});

test('missing AI and empty periods return honest states rather than fabricated summaries', async t => {
  const { request, state } = await testApi(t);
  assert.equal((await request('admin', 'POST', { language: 'th' })).status, 501);
  state.tasks = [];
  const empty = await request('admin', 'POST', { language: 'th' });
  assert.equal(empty.status, 200); assert.equal(empty.body.empty, true); assert.equal(empty.body.result, null);
});
