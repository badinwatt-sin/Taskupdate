'use strict';
const PUBLIC_HOLIDAYS = new Map(require('../js/holidays'));
const iso = d => d.toISOString().slice(0, 10);
const dateOf = s => new Date(s + 'T00:00:00Z');
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(+dateOf(s)) && iso(dateOf(s)) === s;
const addDays = (s, n) => { const d = dateOf(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const bangkokToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
function periodOf(today = bangkokToday()) {
  if (!validDate(today)) throw new Error('Invalid report date');
  const start = addDays(today, -((dateOf(today).getUTCDay() + 6) % 7));
  return { today, timezone: 'Asia/Bangkok', thisWeek: { start, end: addDays(start, 6) }, nextWeek: { start: addDays(start, 7), end: addDays(start, 13) } };
}

// Same calendar rules as the task editor, including project overrides and company holidays.
function taskDates(t, project, settings) {
  if (!validDate(t.start)) return null;
  const duration = Math.max(1, parseInt(t.duration, 10) || 1);
  if (duration > 999) return null;
  const mode = project?.dayMode || settings.dayMode;
  if (mode === 'calendar') return { start: t.start, target: addDays(t.start, duration - 1) };
  const holidays = new Set((settings.holidays || []).map(h => h.date));
  const weekend = settings.weekend || [0, 6];
  const off = s => weekend.includes(dateOf(s).getUTCDay()) || holidays.has(s) || (settings.usePublicHolidays !== false && PUBLIC_HOLIDAYS.has(s));
  let start = t.start, steps = 0;
  while (off(start)) { if (++steps > 400) return null; start = addDays(start, 1); }
  let target = start, days = 1;
  while (days < duration) { if (++steps > 5000) return null; target = addDays(target, 1); if (!off(target)) days++; }
  return { start, target };
}

function buildWeeklySnapshot(state, today = bangkokToday()) {
  const period = periodOf(today), settings = state.settings || {};
  const members = new Map((state.members || []).map(m => [m.id, m]));
  const projects = new Map((state.projects || []).map(p => [p.id, p]));
  const tasks = new Map((state.tasks || []).map(t => [t.id, t]));
  const groups = new Map((state.groups || []).map(g => [g.id, { id: g.id, name: g.name, tasks: [] }]));
  let unscheduled = 0;
  for (const t of tasks.values()) {
    // Private items never leave the app for a management report, including an Admin's own.
    if (t.private || !['todo', 'doing', 'done'].includes(t.status)) continue;
    const p = projects.get(t.projectId), dates = taskDates(t, p, settings);
    if (!dates) { unscheduled++; continue; }
    const doneAt = validDate(t.doneAt) ? t.doneAt : null;
    const active = t.status !== 'done', overdue = active && dates.target < today;
    const overlaps = w => dates.start <= w.end && dates.target >= w.start;
    const thisWeek = active ? overlaps(period.thisWeek) || overdue : doneAt ? doneAt >= period.thisWeek.start && doneAt <= period.thisWeek.end : overlaps(period.thisWeek);
    const nextWeek = active && overlaps(period.nextWeek);
    if (!thisWeek && !nextWeek) continue;
    // Group once by the primary owner's function; keep co-owners in the source facts.
    const owner = members.get(t.assigneeId), gid = groups.has(owner?.group) ? owner.group : 'unassigned';
    if (!groups.has(gid)) groups.set(gid, { id: gid, name: 'ยังไม่ระบุกลุ่มหน้าที่', tasks: [] });
    groups.get(gid).tasks.push({
      id: String(t.id), title: String(t.title || '').slice(0, 200), detail: String(t.desc || '').slice(0, 500),
      project: p ? String(p.name).slice(0, 160) : null,
      workstream: (p?.taskGroups || []).find(g => g.id === t.groupId)?.name || null,
      owners: [...new Set([t.assigneeId, t.coId])].map(id => members.get(id)?.name).filter(Boolean),
      status: t.status, priority: t.priority || 'med', ...dates, doneAt, thisWeek, nextWeek, overdue,
      pendingDependency: (t.deps || []).some(id => { const dep = tasks.get(id); return dep && !['done', 'cancelled'].includes(dep.status); }),
    });
  }
  const selected = [...groups.values()].filter(g => g.tasks.length);
  const all = selected.flatMap(g => g.tasks);
  return { period, groups: selected, counts: { tasks: all.length, thisWeek: all.filter(t => t.thisWeek).length, nextWeek: all.filter(t => t.nextWeek).length, overdue: all.filter(t => t.overdue).length, unscheduled } };
}

function reportMetadata(snapshot) {
  return { period: snapshot.period, counts: snapshot.counts, groups: snapshot.groups.map(g => ({ id: g.id, name: g.name, count: g.tasks.length })) };
}
module.exports = { bangkokToday, periodOf, taskDates, buildWeeklySnapshot, reportMetadata };
