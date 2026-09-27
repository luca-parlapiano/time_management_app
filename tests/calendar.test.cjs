const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const c = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/calendar.js'));
// Verifica il formato serializzabile del dominio; la persistenza reale è in sqlite.test.mjs.
const roundTripCalendar = state => {
  const restored = JSON.parse(JSON.stringify(state));
  c.validateCalendar(restored);
  return restored;
};
const user = { actor: 'user' };
const unlocked = { actor: 'user', unlocked: true };
const engine = { actor: 'engine', unlocked: true };
const item = (id, patch = {}) => ({ id, title: id, date: '2026-09-14', endDate: '2026-09-14', start: '09:00', end: '10:00', kind: 'flexible', notes: '', exceptions: {}, ...patch });
const fixed = (id, patch = {}) => item(id, { kind: 'fixed', ...patch });
const series = (id, patch = {}) => fixed(id, { recurrence: {}, ...patch });
const target = (sourceId, occurrenceDate = '2026-09-14', scope = 'occurrence') => ({ sourceId, occurrenceDate, scope });
const put = (state, value, access = user, where) => c.putItem(state, value, access, where);
test('calendar works without profile or plan across weeks and serialization', () => {
  let state = c.emptyCalendar();
  state = put(state, item('first'));
  state = put(state, item('second', { date: '2026-10-05', endDate: '2026-10-05' }));
  const reloaded = roundTripCalendar(state);
  // JSON omits optional properties whose value is undefined.
  assert.deepEqual(reloaded, JSON.parse(JSON.stringify(state)));
  assert.equal(reloaded.profile, null);
  assert.deepEqual(c.occurrences(reloaded.items, '2026-09-14', '2026-09-20').map(x => x.id), ['first']);
  assert.deepEqual(c.occurrences(reloaded.items, '2026-10-05', '2026-10-11').map(x => x.id), ['second']);
});
test('editing and moving only changes selected item; stable ID and other outcomes survive', () => {
  let state = put(c.emptyCalendar(), item('done'));
  state = c.setOccurrenceOutcome(state, 'done', '2026-09-14', 'completed');
  state = put(state, item('move', { start: '11:00', end: '12:00' }));
  state = c.setOccurrenceOutcome(state, 'move', '2026-09-14', 'skipped');
  const original = structuredClone(state);
  state = put(state, item('ignored-new-id', { title: 'Moved', date: '2026-10-05', endDate: '2026-10-05' }), user, target('move'));
  assert.deepEqual(state.items[0], original.items[0]);
  assert.equal(state.items[1].id, 'move');
  assert.equal(state.items[1].outcomes['2026-10-05'], 'skipped');
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
  assert.deepEqual(roundTripCalendar(state), JSON.parse(JSON.stringify(state)));
});
test('deleted occurrence frees only its date, and does not return after serialization', () => {
  let state = put(c.emptyCalendar(), series('work'));
  state = c.deleteItem(state, target('work', '2026-09-21'), unlocked);
  state = put(state, item('free', { date: '2026-09-21', endDate: '2026-09-21' }), engine);
  assert.throws(() => put(state, item('blocked', { date: '2026-09-28', endDate: '2026-09-28' }), engine), /Conflitto/);
  const loaded = roundTripCalendar(state);
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
  for (const patch of [{ date: '2026-02-30' }, { end: '24:00' }, { end: '08:00' }, { title: '  ' }, { recurrence: [] }, { goalId: 'missing' }, { endDate: '2026-09-16' }]) {
    assert.throws(() => put(c.emptyCalendar(), item('bad', patch)));
  }
  assert.throws(() => put(c.emptyCalendar(), series('bad', { recurrence: { until: '2026-09-13' } })));
  assert.throws(() => put(c.emptyCalendar(), series('bad', { exceptions: { '2026-09-15': null } })));
});
test('clear removes all weeks and series while retaining goals and profile', () => {
  let state = { ...c.emptyCalendar(), goals: [{ id: 'g', name: 'Study' }], profile: { name: 'Me', notes: 'Evenings' } };
  state = put(state, item('done', { goalId: 'g' }));
  state = put(state, series('weekly', { start: '12:00', end: '13:00', exceptions: { '2026-09-21': null } }));
  const cleared = c.clearCalendar(state);
  assert.deepEqual(roundTripCalendar(cleared), { ...state, items: [] });
  assert.deepEqual(c.clearCalendar(cleared), cleared);
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

test('event appearance survives serialization, weekly expansion and an individual exception', () => {
  let state = put(c.emptyCalendar(), series('visual', { icon: 'sport', color: 'orange' }));
  const occurrence = c.occurrences(state.items, '2026-09-21', '2026-09-27')[0];
  assert.deepEqual(c.eventAppearance(occurrence), { icon: 'sport', color: 'orange' });
  state = put(state, { ...state.items[0], ...occurrence, icon: 'heart', color: 'pink' }, unlocked, target('visual', '2026-09-21'));
  const loaded = roundTripCalendar(state);
  assert.deepEqual(c.eventAppearance(c.occurrences(loaded.items, '2026-09-21', '2026-09-27')[0]), { icon: 'heart', color: 'pink' });
  assert.deepEqual(c.eventAppearance(c.occurrences(loaded.items, '2026-09-28', '2026-10-04')[0]), { icon: 'sport', color: 'orange' });
});

test('events without appearance retain defaults and unsupported appearance values are rejected', () => {
  const loaded = roundTripCalendar(put(c.emptyCalendar(), fixed('defaults')));
  assert.deepEqual(c.eventAppearance(loaded.items[0]), { icon: 'work', color: 'blue' });
  assert.throws(() => put(c.emptyCalendar(), item('bad-icon', { icon: 'unknown' })), /Icona non valida/);
  assert.throws(() => put(c.emptyCalendar(), item('bad-color', { color: 'unknown' })), /Colore non valido/);
});

test('appearance selected from one recurrence updates the series and moved exceptions, preserving schedules and deletions', () => {
  const movedData = fixed('moved', { goalId: undefined });
  delete movedData.id;
  delete movedData.exceptions;
  const original = series('gym', { icon: 'work', color: 'blue', exceptions: {
    '2026-09-21': { ...movedData, date: '2026-09-22', endDate: '2026-09-22', start: '15:00', end: '16:00', notes: 'Personalizzato', icon: 'heart', color: 'pink' },
    '2026-09-28': null,
  } });
  let state = put(c.emptyCalendar(), original);
  const moved = c.occurrences(state.items, '2026-09-21', '2026-09-27')[0];
  state = put(state, { ...original, ...moved, icon: 'sport', color: 'orange' }, unlocked,
    { ...target('gym', '2026-09-21'), applyAppearanceToSeries: true });
  assert.equal(state.items[0].date, original.date);
  assert.equal(state.items[0].start, original.start);
  assert.deepEqual(state.items[0].exceptions['2026-09-21'], { ...original.exceptions['2026-09-21'], icon: 'sport', color: 'orange' });
  assert.equal(state.items[0].exceptions['2026-09-28'], null);
  for (const occurrence of c.occurrences(roundTripCalendar(state).items, '2026-09-14', '2026-10-11')) {
    assert.deepEqual(c.eventAppearance(occurrence), { icon: 'sport', color: 'orange' });
  }
});

test('series appearance edits also update existing exceptions', () => {
  let state = put(c.emptyCalendar(), series('gym'));
  const occurrence = c.occurrences(state.items, '2026-09-21', '2026-09-27')[0];
  state = put(state, { ...state.items[0], ...occurrence, notes: 'Nota personale' }, unlocked, target('gym', '2026-09-21'));
  state = put(state, { ...state.items[0], icon: 'sport', color: 'green' }, unlocked, target('gym', '2026-09-14', 'series'));
  assert.equal(state.items[0].exceptions['2026-09-21'].notes, 'Nota personale');
  assert.deepEqual(c.eventAppearance(state.items[0].exceptions['2026-09-21']), { icon: 'sport', color: 'green' });
});

test('one activity creates Monday Wednesday Friday appointments, with independent checks across days and weeks', () => {
  let state = c.putWeeklyActivity(c.emptyCalendar(), series('gym', { icon: 'sport' }), [0, 2, 4], user);
  const week = c.occurrences(state.items, '2026-09-14', '2026-09-20');
  assert.deepEqual(week.map(x => x.date), ['2026-09-14', '2026-09-16', '2026-09-18']);
  assert.equal(new Set(state.items.map(x => x.activityId)).size, 1);
  state = c.setOccurrenceOutcome(state, week[0].sourceId, week[0].occurrenceDate, 'completed');
  assert.deepEqual(c.occurrences(state.items, '2026-09-14', '2026-09-20').map(x => x.completed), [true, false, false]);
  assert.ok(c.occurrences(state.items, '2026-09-21', '2026-09-27').every(x => !x.completed));
  state = roundTripCalendar(state);
  const wed = c.occurrences(state.items, '2026-09-14', '2026-09-20')[1];
  const source = state.items.find(x => x.id === wed.sourceId);
  state = put(state, { ...source, ...wed, title: 'Allenamento', icon: 'heart', color: 'pink', notes: 'Scheda A' }, unlocked, target(wed.sourceId, wed.occurrenceDate));
  for (const occurrence of c.occurrences(state.items, '2026-09-14', '2026-09-27')) {
    assert.equal(occurrence.title, 'Allenamento');
    assert.equal(occurrence.icon, 'heart');
    assert.equal(occurrence.color, 'pink');
    assert.equal(occurrence.notes, 'Scheda A');
  }
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20')[0].completed, true);
});

test('existing independent series can be linked explicitly without changing dates or checks', () => {
  let state = put(c.emptyCalendar(), series('mon', { title: 'Palestra', icon: 'study' }));
  state = put(state, series('wed', { title: 'Palestra', date: '2026-09-16', endDate: '2026-09-16', start: '15:00', end: '16:00' }));
  state = put(state, series('fri', { title: 'Palestra', date: '2026-09-18', endDate: '2026-09-18' }));
  state = put(state, series('unrelated', { title: 'Palestra', start: '17:00', end: '18:00' }));
  state = c.setOccurrenceOutcome(state, 'wed', '2026-09-16', 'completed');
  state = c.deleteItem(state, target('fri', '2026-09-25'), unlocked);
  const before = c.occurrences(state.items, '2026-09-14', '2026-09-27');
  state = put(state, { ...state.items[0], icon: 'sport', color: 'orange' }, unlocked,
    { ...target('mon'), linkedSourceIds: ['wed', 'fri'] });
  const after = c.occurrences(state.items, '2026-09-14', '2026-09-27');
  assert.deepEqual(after.map(x => [x.id, x.date, x.start, x.end, x.completed]), before.map(x => [x.id, x.date, x.start, x.end, x.completed]));
  assert.ok(after.filter(x => x.sourceId !== 'unrelated').every(x => x.icon === 'sport' && x.color === 'orange'));
  assert.equal(state.items.find(x => x.id === 'unrelated').activityId, undefined);
  const wed = after.find(x => x.sourceId === 'wed');
  state = put(state, { ...state.items.find(x => x.id === 'wed'), ...wed, icon: 'heart' }, unlocked, target('wed', wed.occurrenceDate));
  assert.ok(c.occurrences(state.items, '2026-09-14', '2026-09-27').filter(x => x.sourceId !== 'unrelated').every(x => x.icon === 'heart'));
});

test('new weekly activity creation is atomic on conflicts and validates days', () => {
  const state = put(c.emptyCalendar(), fixed('busy', { date: '2026-09-16', endDate: '2026-09-16' }));
  const snapshot = structuredClone(state);
  assert.throws(() => c.putWeeklyActivity(state, series('gym'), [0, 2, 4], user), /Conflitto/);
  assert.deepEqual(state, snapshot);
  for (const days of [[], [0, 0], [7], [-1], [1.5]]) assert.throws(() => c.putWeeklyActivity(state, series('gym'), days, user), /giorno/);
});

test('completion follows a moved appointment and does not affect recurrence exceptions or locked schedules', () => {
  let state = put(c.emptyCalendar(), series('gym'));
  state = c.setOccurrenceOutcome(state, 'gym', '2026-09-21', 'completed');
  const occurrence = c.occurrences(state.items, '2026-09-21', '2026-09-27')[0];
  state = put(state, { ...state.items[0], ...occurrence, date: '2026-09-22', endDate: '2026-09-22' }, unlocked, target('gym', '2026-09-21'));
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27')[0].completed, true);
  state = c.setOccurrenceOutcome(state, 'gym', '2026-09-21', 'skipped');
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27')[0].completed, false);
  assert.throws(() => c.setOccurrenceOutcome(state, 'gym', '2026-09-22', 'completed'), /Appuntamento/);
  assert.throws(() => put(state, { ...state.items[0], icon: 'sport' }, user, target('gym')), /bloccato/);
});

test('an explicit outcome follows a rescheduled one-off activity or constraint', () => {
  for (const create of [item, fixed]) {
    let state = put(c.emptyCalendar(), create('visit'));
    state = c.setOccurrenceOutcome(state, 'visit', '2026-09-14', 'completed');
    state = put(state, { ...state.items[0], date: '2026-09-15', endDate: '2026-09-15' }, unlocked, target('visit'));
    const moved = c.occurrences(state.items, '2026-09-14', '2026-09-20')[0];
    assert.equal(moved.outcome, 'completed');
    assert.deepEqual(state.items[0].outcomes, {'2026-09-15': 'completed'});
  }
});

test('flexible activities repeat on selected days, persist, and allow editing one occurrence', () => {
  let state = c.putWeeklyActivity(c.emptyCalendar(), item('gym', { recurrence: {} }), [0, 2, 4], user);
  state = roundTripCalendar(state);
  const week = c.occurrences(state.items, '2026-09-21', '2026-09-27');
  assert.deepEqual(week.map(x => x.date), ['2026-09-21', '2026-09-23', '2026-09-25']);
  const first = week[0];
  state = put(state, { ...state.items.find(x => x.id === first.sourceId), ...first, start: '11:00', end: '12:00' }, user, target(first.sourceId, first.occurrenceDate));
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27')[0].start, '11:00');
  assert.equal(c.occurrences(state.items, '2026-09-28', '2026-10-04')[0].start, '09:00');
});

test('converting a saved card to repetition retains its ID without duplicate dates and rolls back on conflicts', () => {
  const original = put(c.emptyCalendar(), item('saved'));
  const state = c.putWeeklyActivity(original, { ...original.items[0], recurrence: {} }, [0, 2, 4], user, target('saved'));
  assert.equal(state.items.length, 3);
  assert.equal(state.items[0].id, 'saved');
  assert.deepEqual(c.occurrences(state.items, '2026-09-14', '2026-09-20').map(x => x.date), ['2026-09-14', '2026-09-16', '2026-09-18']);
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27').length, 3);
  const busy = put(original, fixed('busy', { date: '2026-09-16', endDate: '2026-09-16' }));
  const snapshot = structuredClone(busy);
  assert.throws(() => c.putWeeklyActivity(busy, { ...busy.items[0], recurrence: {} }, [0, 2], user, target('saved')), /Conflitto/);
  assert.deepEqual(busy, snapshot);
});

test('all three outcomes persist per appointment without affecting linked days or future weeks', () => {
  let state = c.putWeeklyActivity(c.emptyCalendar(), series('gym'), [0, 2, 4], user);
  const week = c.occurrences(state.items, '2026-09-14', '2026-09-20');
  for (const [index, outcome] of ['completed', 'skipped', 'partial'].entries()) {
    state = c.setOccurrenceOutcome(state, week[index].sourceId, week[index].occurrenceDate, outcome);
  }
  state = roundTripCalendar(state);
  assert.deepEqual(c.occurrences(state.items, '2026-09-14', '2026-09-20').map(x => x.outcome), ['completed', 'skipped', 'partial']);
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20').filter(x => x.completed).length, 1);
  assert.ok(c.occurrences(state.items, '2026-09-21', '2026-09-27').every(x => x.outcome === undefined));
  state = c.setOccurrenceOutcome(state, week[0].sourceId, week[0].occurrenceDate, 'partial');
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20')[0].completed, false);
  state = c.deleteItem(state, target(week[0].sourceId, week[0].occurrenceDate), unlocked);
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20').length, 2);
  assert.equal(c.occurrences(state.items, '2026-09-21', '2026-09-27').length, 3);
  assert.throws(() => c.setOccurrenceOutcome(state, week[0].sourceId, week[0].occurrenceDate, 'completed'), /Appuntamento/);
  assert.throws(() => c.setOccurrenceOutcome(state, week[1].sourceId, week[1].occurrenceDate, 'invalid'), /Esito/);
});

test('outcomes survive rescheduling and shared appearance edits', () => {
  let state = c.putWeeklyActivity(c.emptyCalendar(), series('gym'), [0, 2], user);
  const first = c.occurrences(state.items, '2026-09-14', '2026-09-20')[0];
  state = c.setOccurrenceOutcome(state, first.sourceId, first.occurrenceDate, 'partial');
  state = put(state, { ...state.items[0], ...first, date: '2026-09-15', endDate: '2026-09-15', icon: 'sport' }, unlocked, target(first.sourceId, first.occurrenceDate));
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20')[0].outcome, 'partial');
  let single = put(c.emptyCalendar(), item('one'));
  single = c.setOccurrenceOutcome(single, 'one', '2026-09-14', 'skipped');
  single = put(single, { ...single.items[0], date: '2026-09-15', endDate: '2026-09-15' }, user, target('one'));
  assert.equal(c.occurrences(single.items, '2026-09-14', '2026-09-20')[0].outcome, 'skipped');
});

test('converting Palestra reuses an identical appointment on September 21 and preserves its outcome', () => {
  let state = put(c.emptyCalendar(), fixed('original', { title: 'Palestra' }));
  state = put(state, fixed('next-monday', { title: 'Palestra', date: '2026-09-21', endDate: '2026-09-21', notes: 'Scheda personale' }));
  state = c.setOccurrenceOutcome(state, 'next-monday', '2026-09-21', 'partial');
  state = c.putWeeklyActivity(state, { ...state.items[0], recurrence: {} }, [0, 2, 4], unlocked, target('original'));
  const week = c.occurrences(state.items, '2026-09-21', '2026-09-27');
  assert.equal(week.length, 3);
  assert.equal(week[0].sourceId, 'original');
  assert.equal(week[0].outcome, 'partial');
  assert.equal(week[0].notes, 'Scheda personale');
  assert.equal(c.occurrences(roundTripCalendar(state).items, '2026-09-21', '2026-09-27').length, 3);
});

test('conversion reuses a matching weekly series while keeping deleted and moved occurrences', () => {
  let state = put(c.emptyCalendar(), fixed('original', { title: 'Palestra' }));
  state = put(state, series('future', { title: 'Palestra', date: '2026-09-21', endDate: '2026-09-21' }));
  state = c.deleteItem(state, target('future', '2026-09-28'), unlocked);
  const occurrence = c.occurrences(state.items, '2026-10-05', '2026-10-11')[0];
  state = put(state, { ...state.items[1], ...occurrence, date: '2026-10-06', endDate: '2026-10-06' }, unlocked, target('future', '2026-10-05'));
  state = c.setOccurrenceOutcome(state, 'future', '2026-10-05', 'completed');
  state = c.putWeeklyActivity(state, { ...state.items[0], recurrence: {} }, [0], unlocked, target('original'));
  assert.equal(state.items.length, 1);
  assert.equal(c.occurrences(state.items, '2026-09-28', '2026-10-04').length, 0);
  const moved = c.occurrences(state.items, '2026-10-05', '2026-10-11')[0];
  assert.equal(moved.date, '2026-10-06');
  assert.equal(moved.outcome, 'completed');
});

test('conversion does not absorb different overlapping appointments and remains atomic', () => {
  for (const patch of [{ title: 'Visita' }, { start: '09:30', end: '10:30' }, { kind: 'protected' }]) {
    let state = put(c.emptyCalendar(), fixed('original', { title: 'Palestra' }));
    state = put(state, fixed('other', { title: 'Palestra', date: '2026-09-21', endDate: '2026-09-21', ...patch }));
    const before = structuredClone(state);
    assert.throws(() => c.putWeeklyActivity(state, { ...state.items[0], recurrence: {} }, [0], unlocked, target('original')), /Conflitto/);
    assert.deepEqual(state, before);
  }
});

test('cover photo choice persists and updates linked series and exceptions without changing outcomes', () => {
  let state = c.putWeeklyActivity(c.emptyCalendar(), series('covers', { icon: 'sport', coverImage: true }), [0, 2, 4], user);
  const first = state.items.find(entry => entry.date === '2026-09-14');
  const occurrence = c.occurrences(state.items, '2026-09-21', '2026-09-21')[0];
  state = put(state, { ...first, ...occurrence, notes: 'Nota conservata' }, unlocked, target(first.id, '2026-09-21'));
  state = c.setOccurrenceOutcome(state, first.id, '2026-09-21', 'completed');
  state = put(state, { ...state.items.find(entry => entry.id === first.id), coverImage: false }, unlocked,
    { ...target(first.id, '2026-09-14', 'series'), applyAppearanceToSeries: true });
  assert.ok(state.items.every(entry => entry.coverImage === false));
  assert.equal(state.items.find(entry => entry.id === first.id).exceptions['2026-09-21'].coverImage, false);
  const loaded = roundTripCalendar(state);
  const week = c.occurrences(loaded.items, '2026-09-21', '2026-09-27');
  assert.ok(week.every(entry => entry.coverImage === false));
  assert.equal(week.find(entry => entry.sourceId === first.id).outcome, 'completed');
  assert.equal(week.find(entry => entry.sourceId === first.id).notes, 'Nota conservata');
  assert.throws(() => put(c.emptyCalendar(), item('bad-cover', { coverImage: 'url' })), /Immagine non valida/);
});

const archives = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/outcomeArchive.js'));
test('corrections preserve an audit trail but count each appointment once, independent of deletion', () => {
  let state = put(c.emptyCalendar(), item('history'));
  const occurrence = c.occurrences(state.items, '2026-09-14', '2026-09-14')[0];
  const first = archives.outcomeRecord(state, occurrence, 'partial', '2026-09-14T11:00:00.000Z');
  const second = archives.outcomeRecord(state, occurrence, 'completed', '2026-09-14T12:00:00.000Z');
  const history = [first, second];
  state = c.clearCalendar(state);
  assert.equal(history.length, 2);
  assert.deepEqual(archives.latestOutcomes(history), [second]);
  const archive = { format: 'time-planner-backup', version: 1, calendar: state, history };
  assert.deepEqual(archives.parseArchive(archives.exportArchive(archive)).history, history);
});
test('import accepts only the current backup and rejects foreign formats and unknown fields', () => {
  const state = put(c.emptyCalendar(), item('history'));
  const occurrence = c.occurrences(state.items, '2026-09-14', '2026-09-14')[0];
  const record = archives.outcomeRecord(state, occurrence, 'completed');
  const backup = { format: 'time-planner-backup', version: 1, calendar: state, history: [record] };
  assert.deepEqual(archives.parseArchive(archives.exportArchive(backup)), JSON.parse(JSON.stringify(backup)));
  for (const value of [state, { answers: {}, plannerResult: {} }, { ...backup, version: 9 }, null, []]) {
    assert.throws(() => archives.parseArchive(JSON.stringify(value)));
  }
  assert.throws(() => archives.parseArchive('{broken'));
  for (const value of [
    {...backup, extra: true},
    {...backup, calendar: {...state, other: 1}},
    {...backup, calendar: {...state, items: [{...state.items[0], arbitrary: true}]}},
    {...backup, calendar: {...state, items: [{...state.items[0], status: 'completed'}]}},
    {...backup, calendar: {...state, items: [{...state.items[0], completedDates: {'2026-09-14': true}}]}},
    {...backup, calendar: {...state, items: [{...state.items[0], recurrence: {daily: true}}]}},
    {...backup, history: [{...record, imported: true}]},
  ]) assert.throws(() => archives.parseArchive(JSON.stringify(value)), /campo non previsto/);
  assert.throws(() => archives.validateArchive({ ...backup, history: [record, record] }), /Storico/);
  for (const patch of [{ outcome: 'wrong' }, { eventDate: '2026-02-30' }, { recordedAt: 'yesterday' }]) {
    assert.throws(() => archives.validateArchive({ ...backup, history: [{ ...record, ...patch }] }), /Storico/);
  }
});
