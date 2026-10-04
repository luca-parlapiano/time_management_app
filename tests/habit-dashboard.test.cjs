const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const build = process.env.CALENDAR_TEST_BUILD;
const c = require(join(build, 'domain/calendar.js'));
const { createHabit, updateHabit } = require(join(build, 'domain/habits.js'));
const { outcomeRecord } = require(join(build, 'domain/outcomeArchive.js'));
const { habitDashboard } = require(join(build, 'domain/habitDashboard.js'));
const { indexHabitOutcomes } = require(join(build, 'domain/habitOutcomeIndex.js'));
const { reconcileHabitCompletion } = require(join(build, 'domain/habitCompletion.js'));
// Le fixture di dominio preparano lo snapshot come farebbe DBRepository.
const dashboard = (archive, date, time) => habitDashboard(reconcileHabitCompletion(archive), indexHabitOutcomes(archive.history), date, time);
const draft = { title: 'Lettura', motivation: '', icon: 'study', color: 'teal', stepTarget: 3, startsOn: '2026-09-01', weekdays: [0,1,2,3,4,5,6], start: '10:00', durationMinutes: 20 };
function fixture() {
  const { calendar, habits } = createHabit(c.emptyCalendar(), [], draft, { habitId: 'reading' });
  return { format: 'time-planner-backup', version: 2, calendar, habits, history: [] };
}
function record(archive, date, outcome) {
  const occurrence = c.occurrences(archive.calendar.items, date, date).find(item => item.date === date);
  archive.history.push(outcomeRecord(archive.calendar, occurrence, outcome, null));
  archive.calendar = c.setOccurrenceOutcome(archive.calendar, occurrence.sourceId, occurrence.occurrenceDate, outcome);
  return occurrence;
}

test('dashboard separates missing, partial and skipped outcomes and excludes future appointments', () => {
  const archive = fixture();
  record(archive, '2026-10-01', 'completed');
  record(archive, '2026-10-02', 'partial');
  record(archive, '2026-10-03', 'skipped');
  const before = JSON.stringify(archive);
  const morning = dashboard(archive, '2026-10-04', '09:00');
  assert.deepEqual(morning.rows[0].counts, { completed: 1, partial: 1, skipped: 1, pending: 4 });
  assert.equal(morning.rows[0].entries.at(-1).date, '2026-10-03');
  const afternoon = dashboard(archive, '2026-10-04', '11:00');
  assert.equal(afternoon.rows[0].entries.at(-1).date, '2026-10-04');
  assert.equal(afternoon.rows[0].entries.length, 7);
  assert.equal(JSON.stringify(archive), before);
  record(archive, '2026-10-04', 'completed');
  assert.equal(dashboard(archive, '2026-10-04', '09:00').rows[0].entries.at(-1).outcome, 'completed');
  record(archive, '2026-10-05', 'completed');
  assert.equal(dashboard(archive, '2026-10-04', '11:00').totalHabits, 0);
});

test('corrections reopen a completed series; completed series are excluded from active counts', () => {
  const archive = fixture();
  for (const day of ['01','02','03']) record(archive, `2026-10-${day}`, 'completed');
  assert.equal(dashboard(archive, '2026-10-04', '11:00').totalHabits, 0);
  record(archive, '2026-10-03', 'partial');
  const corrected = dashboard(archive, '2026-10-04', '11:00');
  assert.equal(corrected.featured.remaining, 1);
  assert.equal(corrected.milestonesReached, 0);
  assert.equal(corrected.rows[0].counts.completed, 2);
  assert.equal(corrected.rows[0].counts.partial, 1);
  record(archive, '2026-10-03', 'completed');
  record(archive, '2026-10-04', 'completed');
  const next = dashboard(archive, '2026-10-04', '11:00');
  assert.equal(next.featured, null);
  assert.equal(next.totalHabits, 0);
  assert.equal(next.milestonesReached, 1);
});

test('moved occasions retain their identity and do not leave a historical ghost in the old window', () => {
  const archive = fixture();
  const original = record(archive, '2026-10-01', 'completed');
  const source = archive.calendar.items.find(item => item.id === original.sourceId);
  archive.calendar = c.putItem(archive.calendar, { ...source, date: '2026-10-03', endDate: '2026-10-03', start: '12:00', end: '12:20' }, { actor: 'user', unlocked: false }, { sourceId: original.sourceId, occurrenceDate: original.occurrenceDate, scope: 'occurrence' });
  const moved = dashboard(archive, '2026-10-04', '11:00').rows[0].entries.filter(entry => entry.sourceId === original.sourceId && entry.occurrenceDate === original.occurrenceDate);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].date, '2026-10-03');
  archive.calendar = c.putItem(archive.calendar, { ...source, date: '2026-10-06', endDate: '2026-10-06', start: '12:00', end: '12:20' }, { actor: 'user', unlocked: false }, { sourceId: original.sourceId, occurrenceDate: original.occurrenceDate, scope: 'occurrence' });
  assert.equal(dashboard(archive, '2026-10-04', '11:00').rows[0].entries.some(entry => entry.sourceId === original.sourceId && entry.occurrenceDate === original.occurrenceDate), false);
});

test('schedule changes keep recorded history without inventing missed old occasions', () => {
  const archive = fixture();
  record(archive, '2026-09-01', 'completed');
  record(archive, '2026-10-01', 'completed');
  const changed = updateHabit(archive.calendar, archive.habits, 'reading', { ...draft, startsOn: '2026-10-05', weekdays: [0], start: '11:00' });
  Object.assign(archive, changed);
  const row = dashboard(archive, '2026-10-04', '11:00').rows[0];
  assert.equal(row.entries.length, 1);
  assert.equal(row.entries[0].date, '2026-10-01');
  assert.equal(row.entries[0].removed, true);
  assert.equal(row.journey.completed, 2);
  assert.equal(row.counts.pending, 0);
});

test('dashboard handles empty archives, stable selection and a featured habit beyond the five visible rows', () => {
  const archive = fixture();
  assert.equal(dashboard(archive, '2026-10-04', '11:00').featured, null);
  for (let index = 1; index < 6; index++) Object.assign(archive, createHabit(archive.calendar, archive.habits, { ...draft, start: `${10 + index}:00` }, { habitId: `habit-${index}` }));
  const occurrence = c.occurrences(archive.calendar.items, '2026-10-01', '2026-10-01').find(item => item.habitId === 'habit-5');
  archive.history.push(outcomeRecord(archive.calendar, occurrence, 'completed', null));
  const summary = dashboard(archive, '2026-10-04', '11:00');
  assert.equal(summary.rows.length, 5);
  assert.equal(summary.totalHabits, 6);
  assert.equal(summary.featured.habit.id, 'habit-5');
  assert.deepEqual(summary.rows.map(row => row.habit.id), ['reading','habit-1','habit-2','habit-3','habit-4']);
  const empty = dashboard({ ...archive, habits: [], calendar: c.emptyCalendar() }, '2026-10-04', '11:00');
  assert.equal(empty.featured, null);
  assert.equal(empty.rows.length, 0);
});
