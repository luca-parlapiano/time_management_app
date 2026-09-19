const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const c = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/calendar.js'));
const storage = require(join(process.env.CALENDAR_TEST_BUILD, 'infrastructure/localCalendarStorage.js'));
const user = { actor: 'user' };
const unlocked = { actor: 'user', unlocked: true };
const engine = { actor: 'engine', unlocked: true };
const item = (id, patch = {}) => ({ id, title: id, date: '2026-09-14', endDate: '2026-09-14', start: '09:00', end: '10:00', kind: 'flexible', status: 'todo', notes: '', exceptions: {}, ...patch });
const fixed = (id, patch = {}) => item(id, { kind: 'fixed', status: undefined, ...patch });
const series = (id, patch = {}) => fixed(id, { recurrence: {}, ...patch });
const target = (sourceId, occurrenceDate = '2026-09-14', scope = 'occurrence') => ({ sourceId, occurrenceDate, scope });
const put = (state, value, access = user, where) => c.putItem(state, value, access, where);
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}

test('calendar works without profile or plan across weeks and restart', () => {
  const disk = new MemoryStorage();
  let state = storage.loadCalendar(disk).state;
  state = put(state, item('first'));
  state = put(state, item('second', { date: '2026-10-05', endDate: '2026-10-05' }));
  storage.saveCalendar(disk, state);
  const reloaded = storage.loadCalendar(disk).state;
  assert.deepEqual(reloaded, state);
  assert.equal(reloaded.profile, null);
  assert.deepEqual(c.occurrences(reloaded.items, '2026-09-14', '2026-09-20').map(x => x.id), ['first']);
  assert.deepEqual(c.occurrences(reloaded.items, '2026-10-05', '2026-10-11').map(x => x.id), ['second']);
});
test('editing and moving only changes selected item; stable ID and other outcomes survive', () => {
  let state = put(c.emptyCalendar(), item('done', { status: 'completed' }));
  state = put(state, item('move', { start: '11:00', end: '12:00', status: 'skipped' }));
  const original = structuredClone(state);
  state = put(state, item('ignored-new-id', { title: 'Moved', date: '2026-10-05', endDate: '2026-10-05', status: 'skipped' }), user, target('move'));
  assert.deepEqual(state.items[0], original.items[0]);
  assert.equal(state.items[1].id, 'move');
  assert.equal(state.items[1].status, 'skipped');
  assert.equal(original.items[1].date, '2026-09-14');
  state = c.deleteItem(state, target('move'), user);
  assert.deepEqual(state.items, [original.items[0]]);
});
test('constraints require explicit user unlock; engine and AI cannot change or delete them', () => {
  for (const kind of ['fixed', 'protected']) {
    const constraint = fixed('locked', { kind });
    const state = put(c.emptyCalendar(), constraint);
    for (const access of [user, engine, { actor: 'ai', unlocked: true }]) {
      assert.throws(() => put(state, { ...constraint, end: '09:30' }, access, target('locked')), /bloccato/);
      assert.throws(() => c.deleteItem(state, target('locked'), access), /bloccato/);
    }
    assert.equal(put(state, { ...constraint, end: '09:30' }, unlocked, target('locked')).items[0].end, '09:30');
    assert.equal(c.deleteItem(state, target('locked'), unlocked).items.length, 0);
  }
});
test('all writes reject overlaps; adjacent intervals are allowed, constraints untouched', () => {
  const state = put(c.emptyCalendar(), fixed('work'));
  const snapshot = structuredClone(state);
  for (const access of [user, engine, { actor: 'ai' }]) {
    assert.throws(() => put(state, item('overlap', { start: '09:30', end: '10:30' }), access), /Conflitto/);
    assert.equal(put(state, item('adjacent', { start: '10:00', end: '10:30' }), access).items.length, 2);
  }
  assert.deepEqual(state, snapshot);
  assert.throws(() => put(c.emptyCalendar(), fixed('fake'), engine), /solo attività flessibili/);
});
test('weekly constraints block dates many years later without horizon cutoff', () => {
  const state = put(c.emptyCalendar(), series('work'));
  const far = c.addDays('2026-09-14', 7 * 1000);
  assert.throws(() => put(state, item('far', { date: far, endDate: far })), /Conflitto/);
});
test('recurrence exception moves one occurrence between weeks and persists stable original identity', () => {
  const base = series('work');
  let state = put(c.emptyCalendar(), base);
  state = put(state, { ...base, date: '2026-10-06', endDate: '2026-10-06' }, unlocked, target('work', '2026-09-21'));
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27').length, 0);
  const moved = c.occurrences(state.items, '2026-10-05', '2026-10-11');
  assert.deepEqual(moved.map(x => x.id), ['work@2026-10-05', 'work@2026-09-21']);
  assert.equal(moved[1].exception, true);
  assert.equal(c.occurrences(state.items, '2026-09-28', '2026-10-04').length, 1);
  const disk = new MemoryStorage(); storage.saveCalendar(disk, state);
  assert.deepEqual(storage.loadCalendar(disk).state, JSON.parse(JSON.stringify(state)));
});
test('deleted occurrence frees only its date, and does not return after restart', () => {
  let state = put(c.emptyCalendar(), series('work'));
  state = c.deleteItem(state, target('work', '2026-09-21'), unlocked);
  state = put(state, item('free', { date: '2026-09-21', endDate: '2026-09-21' }), engine);
  assert.throws(() => put(state, item('blocked', { date: '2026-09-28', endDate: '2026-09-28' }), engine), /Conflitto/);
  const disk = new MemoryStorage(); storage.saveCalendar(disk, state);
  const loaded = storage.loadCalendar(disk).state;
  assert.deepEqual(c.occurrences(loaded.items, '2026-09-21', '2026-09-27').map(x => x.id), ['free']);
});
test('series edit preserves exception snapshots; series delete removes all exceptions', () => {
  const base = series('work');
  let state = put(c.emptyCalendar(), base);
  state = put(state, { ...base, title: 'Exception', start: '12:00', end: '13:00', date: '2026-09-21', endDate: '2026-09-21' }, unlocked, target('work', '2026-09-21'));
  state = put(state, { ...base, title: 'New series', end: '11:00' }, unlocked, target('work', '2026-09-14', 'series'));
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27')[0].title, 'Exception');
  assert.equal(c.occurrences(state.items, '2026-09-28', '2026-10-04')[0].title, 'New series');
  assert.equal(c.deleteItem(state, target('work', '2026-09-21', 'series'), unlocked).items.length, 0);
});
test('series edits detect future conflicts and moved exceptions cannot collide with their own series', () => {
  const base = series('work');
  let state = put(c.emptyCalendar(), base);
  state = put(state, item('appointment', { date: '2030-01-07', endDate: '2030-01-07', start: '10:00', end: '11:00' }));
  assert.throws(() => put(state, { ...base, end: '10:30' }, unlocked, target('work', base.date, 'series')), /Conflitto/);
  assert.throws(() => put(state, { ...base, date: '2026-09-21', endDate: '2026-09-21' }, unlocked, target('work')), /Conflitto/);
});
test('weekly series overlap beyond deleted exceptions; finite recurrence end is inclusive', () => {
  const exceptions = Object.fromEntries(Array.from({ length: 30 }, (_, n) => [c.addDays('2026-09-14', n * 7), null]));
  let state = put(c.emptyCalendar(), series('a', { exceptions }));
  assert.throws(() => put(state, series('b')), /Conflitto/);
  state = put(c.emptyCalendar(), series('finite', { recurrence: { until: '2026-09-21' } }));
  assert.throws(() => put(state, item('last', { date: '2026-09-21', endDate: '2026-09-21' })), /Conflitto/);
  assert.equal(put(state, item('later', { date: '2026-09-28', endDate: '2026-09-28' })).items.length, 2);
});
test('overnight sleep protects next day and weekly view shows carryover from Sunday', () => {
  const sleep = series('sleep', { date: '2026-09-13', endDate: '2026-09-14', start: '23:00', end: '07:00', kind: 'protected' });
  const state = put(c.emptyCalendar(), sleep);
  assert.equal(c.durationMinutes(sleep), 480);
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20').length, 2);
  assert.throws(() => put(state, item('early', { start: '06:30', end: '07:30' }), engine), /Conflitto/);
  assert.equal(put(state, item('after', { start: '07:00', end: '08:00' })).items.length, 2);
});
test('civil dates are stable across leap days, year boundaries, and daylight saving changes', () => {
  assert.equal(c.weekStart('2027-01-01'), '2026-12-28');
  assert.equal(c.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(c.addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(c.addDays('2026-10-24', 1), '2026-10-25');
  assert.equal(c.durationMinutes(item('dst', { date: '2026-03-29', endDate: '2026-03-29', start: '01:00', end: '04:00' })), 180);
});
test('invalid dates, times, durations, recurrence and goal references are rejected', () => {
  for (const patch of [{ date: '2026-02-30' }, { end: '24:00' }, { end: '08:00' }, { title: '  ' }, { status: undefined }, { recurrence: {} }, { goalId: 'missing' }, { endDate: '2026-09-16' }]) {
    assert.throws(() => put(c.emptyCalendar(), item('bad', patch)));
  }
  assert.throws(() => put(c.emptyCalendar(), series('bad', { recurrence: { until: '2026-09-13' } })));
  assert.throws(() => put(c.emptyCalendar(), series('bad', { exceptions: { '2026-09-15': null } })));
});
test('clear removes all weeks, series and outcomes, retains goals/profile/legacy/palette', () => {
  const disk = new MemoryStorage();
  disk.setItem(storage.LEGACY_STORAGE_KEY, '{"old":"untouched"}');
  disk.setItem('time-planner.palette.v1', 'night');
  let state = { ...c.emptyCalendar(), goals: [{ id: 'g', name: 'Study' }], profile: { name: 'Me', notes: 'Evenings' } };
  state = put(state, item('done', { goalId: 'g', status: 'completed' }));
  state = put(state, series('weekly', { start: '12:00', end: '13:00', exceptions: { '2026-09-21': null } }));
  const cleared = c.clearCalendar(state); storage.saveCalendar(disk, cleared);
  assert.deepEqual(storage.loadCalendar(disk).state, { ...state, items: [] });
  assert.equal(disk.getItem(storage.LEGACY_STORAGE_KEY), '{"old":"untouched"}');
  assert.equal(disk.getItem('time-planner.palette.v1'), 'night');
  assert.deepEqual(c.clearCalendar(cleared), cleared);
});
test('legacy data is preserved byte-for-byte; no arbitrary dates or automatic import', () => {
  const disk = new MemoryStorage();
  const raw = '{"answers":{"goals":[]},"plannerResult":{"plan":{"blocks":[{"day":"mon"}]}},"blockEvents":{}}';
  disk.setItem(storage.LEGACY_STORAGE_KEY, raw);
  const loaded = storage.loadCalendar(disk);
  assert.equal(loaded.legacy, raw); assert.deepEqual(loaded.state, c.emptyCalendar());
  storage.saveCalendar(disk, put(loaded.state, item('new')));
  assert.equal(disk.getItem(storage.LEGACY_STORAGE_KEY), raw);
});
test('corrupt or unsupported archive stays recoverable; failed reads/writes are surfaced', () => {
  for (const raw of ['{broken', '{"version":99}', JSON.stringify({ ...c.emptyCalendar(), items: [{ id: 'broken' }] })]) {
    const disk = new MemoryStorage(); disk.setItem(storage.CALENDAR_STORAGE_KEY, raw);
    const loaded = storage.loadCalendar(disk);
    assert.ok(loaded.error); assert.equal(loaded.raw, raw); assert.equal(disk.getItem(storage.CALENDAR_STORAGE_KEY), raw);
  }
  assert.ok(storage.loadCalendar({ getItem() { throw Error('denied'); } }).error);
  assert.throws(() => storage.saveCalendar({ setItem() { throw Error('quota'); } }, c.emptyCalendar()), /quota/);
});

test('persisted items contain domain fields only, not presentation occurrence metadata', () => {
  const state = put(c.emptyCalendar(), series('work'));
  const occurrence = c.occurrences(state.items, '2026-09-21', '2026-09-27')[0];
  const edited = put(state, { ...state.items[0], ...occurrence, title: 'Edited' }, unlocked, target('work', '2026-09-21'));
  const data = edited.items[0].exceptions['2026-09-21'];
  for (const key of ['sourceId', 'occurrenceDate', 'recurring', 'exception', 'id']) assert.equal(Object.hasOwn(data, key), false);
});

test('conflict detection agrees with exhaustive expansion across finite randomized recurrence scenarios', () => {
  let seed = 821;
  const random = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  for (let run = 0; run < 100; run++) {
    const items = ['a', 'b'].map(id => {
      const date = c.addDays('2026-09-01', random(15));
      const overnight = random(2) === 0;
      const base = series(id, { date, endDate: overnight ? c.addDays(date, 1) : date, start: overnight ? '22:00' : '05:00', end: overnight ? '07:00' : '09:00', recurrence: { until: c.addDays(date, 42) } });
      const original = c.addDays(date, random(5) * 7);
      const moved = c.addDays('2026-09-01', random(50));
      base.exceptions[original] = random(2) ? null : { ...base, date: moved, endDate: overnight ? c.addDays(moved, 1) : moved };
      return base;
    });
    const visible = c.occurrences(items, '2026-08-31', '2026-11-01');
    let conflict = false;
    for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
      if (visible[i].sourceId !== 'b' && visible[j].sourceId !== 'b') continue;
      const a = visible[i], b = visible[j];
      if (`${a.date}T${a.start}` < `${b.endDate}T${b.end}` && `${b.date}T${b.start}` < `${a.endDate}T${a.end}`) conflict = true;
    }
    assert.equal(Boolean(c.findConflict(items, 'b')), conflict, `Scenario ${run}`);
  }
});
