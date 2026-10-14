const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const root = process.env.CALENDAR_TEST_BUILD;
const c = require(join(root, 'domain/calendar.js'));
const w = require(join(root, 'domain/weeklyTime.js'));
const a = require(join(root, 'domain/outcomeArchive.js'));
const { StatisticsRepository } = require(join(root, 'repository/StatisticsRepository.js'));
const { formatDurationMinutes } = require(join(root, 'utils/time.js'));
const draft = { title: 'Programmare', motivation: '', startsOn: '2026-10-05', targetMinutes: 360, icon: 'study', color: 'teal' };
const empty = () => ({ format: 'time-planner-backup', version: 3, calendar: c.emptyCalendar(), habits: [], history: [] });
const setup = () => w.saveWeeklyTimeHabit(empty(), 'hours', draft, '2026-10-05');
const session = (id, date, minutes, rest = {}) => ({ id, habitId: 'hours', date, minutes, notes: '', removed: false, ...rest });
const save = (archive, session, commandId = `command-${archive.timeSessionHistory.length}`, reference = '2026-10-18') => w.saveTimeSession(archive, { commandId, session }, reference, '2026-10-18T12:00:00Z');
const progress = (archive, date = '2026-10-12') => w.weeklyTimeProgress(archive, 'hours', date, '2026-10-18');
const plan = (archive, date = '2026-10-18', recurrence) => ({ ...archive, calendar: c.putItem(archive.calendar, { id: 'planned', title: draft.title, weeklyHabitId: 'hours', date, endDate: date, start: '10:00', end: '12:00', kind: 'flexible', notes: '', exceptions: {}, ...(recurrence ? { recurrence: {} } : {}) }, { actor: 'user', unlocked: false }) });

test('weekly hours count actual sessions only, preserve excess and leave legacy statistics unchanged', () => {
  let archive = setup();
  const before = new StatisticsRepository(archive).getDailyStatistics('2026-10-12');
  archive = save(archive, session('a', '2026-10-12', 120));
  archive = save(archive, session('b', '2026-10-14', 90));
  archive = save(archive, session('c', '2026-10-17', 60));
  assert.equal(progress(archive).completedMinutes, 270);
  archive = plan(archive);
  assert.equal(progress(archive).completedMinutes, 270);
  assert.equal(progress(archive).plannedMinutes, 120);
  archive = save(archive, session('d', '2026-10-18', 90, { sourceId: 'planned', occurrenceDate: '2026-10-18' }));
  assert.equal(progress(archive).completedMinutes, 360);
  assert.equal(progress(archive).plannedMinutes, 0);
  archive = save(archive, { ...archive.timeSessions.at(-1), minutes: 150 });
  assert.equal(progress(archive).completedMinutes, 420);
  assert.ok(progress(archive).percent > 100);
  assert.equal(progress(archive).state, 'reached');
  assert.equal(progress(archive, '2026-10-19').completedMinutes, 0);
  assert.deepEqual(new StatisticsRepository(archive).getDailyStatistics('2026-10-12'), before);
  assert.deepEqual(new StatisticsRepository(archive).getStatisticsActivities(), []);
  assert.equal(formatDurationMinutes(1590), '26 h 30 min');
});

test('commands are idempotent; corrections, removal and restore keep a single current contribution', () => {
  let archive = save(setup(), session('a', '2026-10-12', 120), 'retry');
  assert.equal(save(archive, session('a', '2026-10-12', 120), 'retry'), archive);
  assert.throws(() => save(archive, session('a', '2026-10-12', 121), 'retry'), /Comando/);
  archive = save(archive, session('a', '2026-10-12', 60));
  archive = save(archive, { ...archive.timeSessions[0], removed: true });
  assert.equal(progress(archive).completedMinutes, 0);
  archive = save(archive, { ...archive.timeSessions[0], removed: false });
  assert.equal(progress(archive).completedMinutes, 60);
  assert.equal(archive.timeSessions.length, 1);
  assert.equal(archive.timeSessionHistory.length, 4);
  assert.equal(archive.timeSessionHistory[0].session.minutes, 120);
  assert.deepEqual(a.parseArchive(a.exportArchive(archive)), seriesDomain.upgradeTimeSeries(archive));
});

test('linked session survives moving a single appointment and deletion; its actual date changes only explicitly', () => {
  let archive = plan(setup());
  archive = save(archive, session('a', '2026-10-18', 90, { sourceId: 'planned', occurrenceDate: '2026-10-18' }));
  const old = archive.calendar.items[0];
  archive = { ...archive, calendar: c.putItem(archive.calendar, { ...old, date: '2026-10-19', endDate: '2026-10-19' }, { actor: 'user', unlocked: false }, { sourceId: old.id, occurrenceDate: old.date, scope: 'occurrence' }) };
  const moved = c.occurrences(archive.calendar.items, '2026-10-19', '2026-10-19')[0];
  assert.equal(moved.occurrenceDate, '2026-10-18');
  assert.equal(progress(archive).completedMinutes, 90);
  assert.throws(() => save(archive, session('second', '2026-10-18', 30, { sourceId: 'planned', occurrenceDate: '2026-10-18' })), /sessione|disponibile/);
  archive = { ...archive, calendar: c.clearCalendar(archive.calendar) };
  a.validateArchive(archive);
  assert.equal(progress(archive).completedMinutes, 90);
  archive = save(archive, { ...archive.timeSessions[0], date: '2026-10-19' }, 'move-actual', '2026-10-20');
  assert.equal(progress(archive).completedMinutes, 0);
  assert.equal(w.weeklyTimeProgress(archive, 'hours', '2026-10-19', '2026-10-20').completedMinutes, 90);
});

test('manual session can be linked without adding minutes, including removed-link uniqueness', () => {
  let archive = plan(setup());
  archive = save(archive, session('a', '2026-10-18', 45));
  archive = save(archive, { ...archive.timeSessions[0], sourceId: 'planned', occurrenceDate: '2026-10-18' });
  assert.equal(progress(archive).completedMinutes, 45);
  archive = save(archive, { ...archive.timeSessions[0], removed: true });
  assert.throws(() => save(archive, session('b', '2026-10-18', 20, { sourceId: 'planned', occurrenceDate: '2026-10-18' })), /già una sessione/);
});

test('new targets start next Monday, may be cancelled, and never rewrite old weeks', () => {
  let archive = w.saveWeeklyTimeHabit(setup(), 'hours', { ...draft, targetMinutes: 480 }, '2026-10-18');
  assert.equal(progress(archive).targetMinutes, 360);
  assert.equal(progress(archive, '2026-10-19').targetMinutes, 480);
  archive = w.cancelWeeklyTimeTarget(archive, 'hours', '2026-10-18');
  assert.equal(progress(archive, '2026-10-19').targetMinutes, 360);
  archive = w.saveWeeklyTimeHabit(archive, 'hours', { ...draft, targetMinutes: 480 }, '2026-10-18');
  archive = w.saveWeeklyTimeHabit(archive, 'hours', { ...draft, targetMinutes: 600 }, '2026-10-20');
  assert.equal(progress(archive, '2026-10-19').targetMinutes, 480);
  assert.equal(progress(archive, '2026-10-26').targetMinutes, 600);
  assert.equal(progress(archive).targetMinutes, 360);
});

test('archival clips recurrence and moved future exceptions, preserving prior sessions', () => {
  let archive = plan(setup(), '2026-10-11', true);
  const old = archive.calendar.items[0];
  archive = { ...archive, calendar: c.putItem(archive.calendar, { ...old, date: '2026-10-20', endDate: '2026-10-20' }, { actor: 'user', unlocked: false }, { sourceId: old.id, occurrenceDate: old.date, scope: 'occurrence' }) };
  archive = save(archive, session('a', '2026-10-12', 30));
  archive = w.archiveWeeklyTimeHabit(archive, 'hours', '2026-10-18');
  assert.equal(c.occurrences(archive.calendar.items, '2026-10-19', '2026-11-30').length, 0);
  assert.equal(progress(archive).completedMinutes, 30);
  assert.equal(progress(archive, '2026-10-19').state, 'inactive');
  archive = save(archive, { ...archive.timeSessions[0], minutes: 45 });
  assert.equal(progress(archive).completedMinutes, 45);
  assert.throws(() => save(archive, session('b', '2026-10-19', 10), 'outside', '2026-10-20'), /Sessione/);
});

test('reject invalid/future sessions and inconsistent imports without mutating the last snapshot', () => {
  const archive = setup();
  for (const minutes of [0, -1, NaN, Infinity, 1.5, 1441]) assert.throws(() => save(archive, session('a', '2026-10-12', minutes)), /Sessione/);
  assert.throws(() => save(archive, session('a', '2026-10-19', 30)), /già svolto/);
  assert.throws(() => save(archive, session('a', '2026-10-04', 30)), /Sessione/);
  const saved = save(archive, session('a', '2026-10-12', 1440));
  assert.throws(() => save(saved, session('b', '2026-10-12', 1)), /24 ore/);
  const tampered = structuredClone(saved); tampered.timeSessions[0].minutes = 1;
  assert.throws(() => a.validateArchive(tampered), /allineati/);
  assert.equal(archive.timeSessions.length, 0);
  assert.equal(saved.timeSessions[0].minutes, 1440);
});

test('civil weeks span years and leap days; equal titles keep distinct identities', () => {
  let archive = w.saveWeeklyTimeHabit(empty(), 'hours', { ...draft, startsOn: '2027-12-29' }, '2027-12-29');
  archive = w.saveWeeklyTimeHabit(archive, 'other', { ...draft, startsOn: '2027-12-29' }, '2027-12-29');
  archive = save(archive, session('a', '2028-01-01', 60), 'a', '2028-03-01');
  archive = save(archive, session('b', '2028-02-29', 45), 'b', '2028-03-01');
  assert.equal(w.weeklyTimeProgress(archive, 'hours', '2028-01-01', '2028-03-01').week, '2027-12-27');
  assert.equal(w.weeklyTimeProgress(archive, 'hours', '2028-01-01', '2028-03-01').partial, true);
  assert.equal(w.weeklyTimeProgress(archive, 'hours', '2028-03-01', '2028-03-01').completedMinutes, 45);
  assert.equal(w.weeklyTimeProgress(archive, 'other', '2028-03-01', '2028-03-01').completedMinutes, 0);
  assert.equal(w.weeklyTimeProgress(archive, 'hours', '2027-12-20', '2028-03-01').state, 'inactive');
});

test('v2 backups upgrade without inventing time, and future formats fail', () => {
  const legacy = { ...empty(), version: 2 };
  const upgraded = a.parseArchive(JSON.stringify(legacy));
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.timeSessions, undefined);
  assert.deepEqual(legacy, { ...empty(), version: 2 });
  assert.throws(() => a.parseArchive(JSON.stringify({ ...legacy, version: 99 })), /Formato/);
});

test('recent entries use first insertion order and current values, without removed, future or other habits', () => {
  let archive = setup();
  for (let index = 0; index < 6; index++) archive = save(archive, session(`s${index}`, index % 2 ? '2026-10-12' : '2026-10-13', 30));
  archive = save(archive, session('s1', '2026-10-12', 90, { notes: 'Nota corretta' }));
  archive = save(archive, session('s4', '2026-10-13', 30, { removed: true }));
  archive = save(archive, session('future', '2026-10-19', 30), 'future', '2026-10-20');
  const recent = new StatisticsRepository(archive).getRecentTimeSessions('hours', '2026-10-18');
  assert.deepEqual(recent.map(entry => entry.id), ['s5', 's3', 's2', 's1', 's0']);
  assert.equal(recent[3].minutes, 90);
  assert.equal(recent[3].notes, 'Nota corretta');
  assert.deepEqual(new StatisticsRepository(archive).getRecentTimeSessions('other', '2026-10-18'), []);
  archive = save(archive, session('s4', '2026-10-13', 30));
  assert.deepEqual(new StatisticsRepository(archive).getRecentTimeSessions('hours', '2026-10-18').map(entry => entry.id), ['s5', 's4', 's3', 's2', 's1', 's0']);
});

const seriesDomain = require(join(root, 'domain/timeSeries.js'));
const periodic = (period = 'week', startsOn = '2026-10-05', targetMinutes = 120) => w.saveWeeklyTimeHabit(empty(), 'hours', { ...draft, startsOn, targetMinutes, period }, startsOn);

test('series use civil weeks and calendar months, including leap years and year boundaries', () => {
  assert.deepEqual(seriesDomain.timePeriodBounds('2028-02-15', 'month'), { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(seriesDomain.timePeriodBounds('2026-12-31', 'month'), { start: '2026-12-01', end: '2026-12-31' });
  assert.deepEqual(seriesDomain.timePeriodBounds('2027-01-01', 'week'), { start: '2026-12-28', end: '2027-01-03' });
  assert.equal(periodic('month', '2026-10-12', 1200).weeklyTimeHabits[0].series[0].endsOn, '2026-10-31');
});

test('repeat preserves excess and starts an isolated series at zero, without filling skipped periods', () => {
  let archive = save(periodic(), session('a', '2026-10-06', 180));
  const first = archive.weeklyTimeHabits[0].series[0];
  assert.throws(() => seriesDomain.resolveTimeSeries(archive, 'hours', first.id, true, 'next', '2026-10-05'), /non è ancora/);
  archive = seriesDomain.resolveTimeSeries(archive, 'hours', first.id, true, 'next', '2026-11-04');
  a.validateArchive(archive);
  const results = seriesDomain.timeSeriesResults(archive, '2026-11-04');
  assert.equal(results.length, 2);
  assert.equal(results[0].completedMinutes, 180);
  assert.equal(results[0].reached, true);
  assert.equal(results[1].completedMinutes, 0);
  assert.equal(results[1].series.startsOn, '2026-11-04');
  assert.equal(results[1].series.endsOn, '2026-11-08');
  assert.equal(results[1].series.targetMinutes, 120);
  assert.equal(seriesDomain.resolveTimeSeries(archive, 'hours', first.id, true, 'retry-id', '2026-11-04'), archive);
  assert.throws(() => seriesDomain.resolveTimeSeries(archive, 'hours', first.id, false, '', '2026-11-04'), /già conclusa/);
  archive = save(archive, session('b', '2026-11-04', 30), 'new', '2026-11-04');
  assert.deepEqual(seriesDomain.timeSeriesResults(archive, '2026-11-04').map(entry => entry.completedMinutes), [180, 30]);
  assert.deepEqual(new StatisticsRepository(archive).getRecentTimeSessions('hours', '2026-11-04').map(entry => entry.id), ['b']);
  assert.throws(() => save(archive, { ...archive.timeSessions[0], date: '2026-11-04' }, 'move', '2026-11-04'), /sua serie/);
  assert.throws(() => save(archive, { ...archive.timeSessions[0], removed: true }, 'remove-closed', '2026-11-04'), /sua serie/);
  assert.deepEqual(a.parseArchive(a.exportArchive(archive)), archive);
});

test('reaching or exceeding the target can restart immediately, including multiple series on the same day', () => {
  for (const minutes of [120, 128]) {
    const date = '2026-10-06';
    let archive = save(periodic(), session('a', date, minutes), 'first', date);
    const firstId = archive.weeklyTimeHabits[0].series[0].id;
    const history = structuredClone(archive.timeSessionHistory);
    archive = seriesDomain.resolveTimeSeries(archive, 'hours', firstId, true, 'second', date);
    a.validateArchive(archive);
    assert.deepEqual(archive.timeSessionHistory, history);
    assert.deepEqual(seriesDomain.timeSeriesResults(archive, date).map(result => result.completedMinutes), [minutes, 0]);
    assert.equal(w.weeklyTimeProgress(archive, 'hours', date, date).completedMinutes, 0);
    assert.equal(w.weeklyTimeProgress(archive, 'hours', date, date, firstId).completedMinutes, minutes);
    assert.deepEqual(new StatisticsRepository(archive).getRecentTimeSessions('hours', date), []);
    assert.equal(seriesDomain.resolveTimeSeries(archive, 'hours', firstId, true, 'retry', date), archive);
    assert.throws(() => save(archive, { ...archive.timeSessions[0], removed: true }, 'remove-closed', date), /sua serie/);
    archive = save(archive, session('b', date, 120), 'second-session', date);
    archive = seriesDomain.resolveTimeSeries(archive, 'hours', 'second', true, 'third', date);
    archive = save(archive, session('c', date, 30), 'third-session', date);
    a.validateArchive(archive);
    assert.deepEqual(seriesDomain.timeSeriesResults(archive, date).map(result => result.completedMinutes), [minutes, 120, 30]);
    const statistics = new StatisticsRepository(archive);
    assert.equal(statistics.getTimeMinutes(date), minutes + 150);
    assert.deepEqual(statistics.getTimeSessions('hours', date, date, firstId).map(entry => entry.id), ['a']);
    assert.deepEqual(statistics.getRecentTimeSessions('hours', date).map(entry => entry.id), ['c']);
    assert.deepEqual(a.parseArchive(a.exportArchive(archive)), archive);
    const duplicated = structuredClone(archive);
    duplicated.weeklyTimeHabits[0].series[1].sessionIds.push('a');
    assert.throws(() => a.validateArchive(duplicated), /Appartenenza/);
  }
});

test('early stop preserves its result and does not allow an unfinished series to close', () => {
  const date = '2026-10-06';
  let archive = save(periodic(), session('a', date, 119), 'first', date);
  const id = archive.weeklyTimeHabits[0].series[0].id;
  assert.throws(() => seriesDomain.resolveTimeSeries(archive, 'hours', id, true, 'next', date), /non è ancora/);
  archive = save(archive, session('a', date, 120), 'correct', date);
  archive = seriesDomain.resolveTimeSeries(archive, 'hours', id, false, '', date);
  a.validateArchive(archive);
  assert.equal(archive.weeklyTimeHabits[0].archivedOn, date);
  assert.equal(seriesDomain.timeSeriesResults(archive, date)[0].reached, true);
  assert.equal(archive.weeklyTimeHabits[0].series.length, 1);
});

test('stop archives the series, below-target results do not award a trophy, and no automatic restart occurs', () => {
  let archive = save(periodic('month', '2026-10-12', 1200), session('a', '2026-10-12', 90));
  const first = archive.weeklyTimeHabits[0].series[0];
  archive = seriesDomain.resolveTimeSeries(archive, 'hours', first.id, false, '', '2026-11-01');
  a.validateArchive(archive);
  assert.equal(archive.weeklyTimeHabits[0].archivedOn, '2026-10-31');
  const results = seriesDomain.timeSeriesResults(archive, '2027-02-01');
  assert.equal(results.length, 1);
  assert.equal(results[0].reached, false);
  assert.equal(results[0].series.decision, 'stop');
  assert.throws(() => save(archive, session('b', '2026-11-01', 90), 'late', '2026-11-01'), /sua serie/);
});

test('monthly totals include all days and reject sessions or plans outside the series', () => {
  let archive = periodic('month', '2026-10-01', 1200);
  archive = save(archive, session('a', '2026-10-02', 120));
  archive = save(archive, session('b', '2026-10-18', 240));
  const result = w.weeklyTimeProgress(archive, 'hours', '2026-10-18', '2026-10-18');
  assert.equal(result.completedMinutes, 360);
  assert.equal(result.end, '2026-10-31');
  assert.equal(result.period, 'month');
  assert.throws(() => save(archive, session('c', '2026-11-01', 30), 'outside', '2026-11-01'), /sua serie/);
  const overlap = structuredClone(archive);
  overlap.weeklyTimeHabits[0].series.push({ ...overlap.weeklyTimeHabits[0].series[0], id: 'overlap' });
  assert.throws(() => a.validateArchive(overlap), /Serie/);
});

test('legacy migration preserves current sessions and audit, partitions weeks, and is deterministic', () => {
  let legacy = setup();
  legacy = save(legacy, session('a', '2026-10-05', 60));
  legacy = save(legacy, session('b', '2026-10-18', 90));
  const converted = seriesDomain.upgradeTimeSeries(legacy);
  assert.equal(legacy.weeklyTimeHabits[0].series, undefined);
  assert.deepEqual(converted.timeSessions, legacy.timeSessions);
  assert.deepEqual(converted.timeSessionHistory, legacy.timeSessionHistory);
  assert.deepEqual(seriesDomain.timeSeriesResults(converted, '2026-10-20').map(result => result.completedMinutes), [60, 90]);
  assert.equal(converted.weeklyTimeHabits[0].series[0].decision, 'stop');
  assert.equal(converted.weeklyTimeHabits[0].series[1].decision, undefined);
  assert.deepEqual(a.upgradeArchive(converted), converted);
});

test('annual time statistics include archived and repeated series without counting corrections, removed entries or future days twice', () => {
  const date = '2026-10-13';
  let archive = periodic('month', '2026-10-01', 120);
  const dailyBefore = new StatisticsRepository(archive).getDailyStatistics(date);
  archive = save(archive, session('a', date, 120), 'original', date);
  archive = save(archive, session('a', date, 128, { notes: 'Correzione confermata' }), 'corrected', date);
  archive = save(archive, session('removed', date, 30), 'extra', date);
  archive = save(archive, session('removed', date, 30, { removed: true }), 'remove', date);
  archive = seriesDomain.resolveTimeSeries(archive, 'hours', archive.weeklyTimeHabits[0].series[0].id, true, 'next', date);
  archive = save(archive, session('b', date, 120), 'second-series', date);
  archive = seriesDomain.resolveTimeSeries(archive, 'hours', 'next', false, '', date);
  archive = w.saveWeeklyTimeHabit(archive, 'same-name', { ...draft, startsOn: date, period: 'month', targetMinutes: 120 }, date);
  archive = save(archive, session('other', date, 10, { habitId: 'same-name' }), 'other', date);
  const repository = new StatisticsRepository(archive);
  const statistics = repository.getTimeYearStatistics(2026, date);
  assert.equal(statistics.minutes, 258);
  assert.equal(statistics.sessionCount, 3);
  assert.equal(statistics.activities.length, 2);
  const archived = statistics.activities.find(value => value.activity.id === 'hours');
  assert.equal(archived.minutes, 248);
  assert.equal(archived.completedSeries, 2);
  assert.equal(archived.sessionCount, 2);
  assert.equal(statistics.days[0].minutes, 258);
  assert.deepEqual(statistics.days[0].sessions.map(entry => entry.id).sort(), ['a', 'b', 'other']);
  assert.equal(statistics.days[0].sessions.find(entry => entry.id === 'a').notes, 'Correzione confermata');
  assert.equal(repository.getTimeYearStatistics(2026, '2026-10-12').sessionCount, 0);
  assert.equal(repository.getTimeYearStatistics(2025, date).minutes, 0);
  assert.deepEqual(repository.getDailyStatistics(date), dailyBefore);
  assert.throws(() => repository.getTimeYearStatistics(0, date), /Periodo/);
});


test('dashboard weekly time counts current sessions through today across year boundaries', () => {
  const archive = empty();
  archive.timeSessions = [
    session('previous', '2026-12-27', 90),
    session('monday', '2026-12-28', 30),
    session('corrected', '2027-01-01', 45),
    session('removed', '2027-01-01', 120, { removed: true }),
    session('future', '2027-01-02', 180),
  ];
  archive.timeSessionHistory = [{ id: 'old-value', session: session('corrected', '2027-01-01', 120), recordedAt: '2027-01-01T12:00:00Z' }];
  const statistics = new StatisticsRepository(archive);
  assert.equal(statistics.getTimeWeekMinutes('2027-01-01'), 75);
  assert.equal(statistics.getTimeWeekMinutes('2027-01-04'), 0);
  assert.throws(() => statistics.getTimeWeekMinutes('2027-02-30'), /Data non valida/);
});
