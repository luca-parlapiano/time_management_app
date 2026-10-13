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
test('home includes flexible activities but keeps calendar constraints out', () => {
  assert.equal(c.appearsOnTodayScreen({kind:'flexible',recurring:true}),false);
  assert.equal(c.appearsOnTodayScreen({kind:'flexible',recurring:true,routine:true}),true);
  assert.equal(c.appearsOnTodayScreen({kind:'flexible',recurring:true,habitId:'reading'}),true);
  assert.equal(c.appearsOnTodayScreen({kind:'flexible',recurring:false}),false);
  assert.equal(c.appearsOnTodayScreen({kind:'fixed',recurring:true}),false);
  assert.equal(c.appearsOnTodayScreen({kind:'protected',recurring:true}),false);
  assert.equal(c.isProgressActivity({kind:'flexible',routine:true}),true);
  assert.equal(c.isProgressActivity({kind:'flexible'}),false);
  assert.equal(c.isProgressActivity({kind:'fixed',routine:true}),false);
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

test('both outcomes persist per appointment without affecting linked days or future weeks', () => {
  let state = c.putWeeklyActivity(c.emptyCalendar(), series('gym'), [0, 2, 4], user);
  const week = c.occurrences(state.items, '2026-09-14', '2026-09-20');
  for (const [index, outcome] of ['completed', 'skipped', 'skipped'].entries()) {
    state = c.setOccurrenceOutcome(state, week[index].sourceId, week[index].occurrenceDate, outcome);
  }
  state = roundTripCalendar(state);
  assert.deepEqual(c.occurrences(state.items, '2026-09-14', '2026-09-20').map(x => x.outcome), ['completed', 'skipped', 'skipped']);
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20').filter(x => x.completed).length, 1);
  assert.ok(c.occurrences(state.items, '2026-09-21', '2026-09-27').every(x => x.outcome === undefined));
  state = c.setOccurrenceOutcome(state, week[0].sourceId, week[0].occurrenceDate, 'skipped');
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
  state = c.setOccurrenceOutcome(state, first.sourceId, first.occurrenceDate, 'skipped');
  state = put(state, { ...state.items[0], ...first, date: '2026-09-15', endDate: '2026-09-15', icon: 'sport' }, unlocked, target(first.sourceId, first.occurrenceDate));
  assert.equal(c.occurrences(state.items, '2026-09-14', '2026-09-20')[0].outcome, 'skipped');
  let single = put(c.emptyCalendar(), item('one'));
  single = c.setOccurrenceOutcome(single, 'one', '2026-09-14', 'skipped');
  single = put(single, { ...single.items[0], date: '2026-09-15', endDate: '2026-09-15' }, user, target('one'));
  assert.equal(c.occurrences(single.items, '2026-09-14', '2026-09-20')[0].outcome, 'skipped');
});

test('converting Palestra reuses an identical appointment on September 21 and preserves its outcome', () => {
  let state = put(c.emptyCalendar(), fixed('original', { title: 'Palestra' }));
  state = put(state, fixed('next-monday', { title: 'Palestra', date: '2026-09-21', endDate: '2026-09-21', notes: 'Scheda personale' }));
  state = c.setOccurrenceOutcome(state, 'next-monday', '2026-09-21', 'skipped');
  state = c.putWeeklyActivity(state, { ...state.items[0], recurrence: {} }, [0, 2, 4], unlocked, target('original'));
  const week = c.occurrences(state.items, '2026-09-21', '2026-09-27');
  assert.equal(week.length, 3);
  assert.equal(week[0].sourceId, 'original');
  assert.equal(week[0].outcome, 'skipped');
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
const habits = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habits.js'));
const { habitJourneyProgress: indexedProgress, habitTimeline: indexedTimeline, nextHabitOccurrence } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habitTimeline.js'));
const { indexHabitOutcomes } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habitOutcomeIndex.js'));
const habitJourneyProgress = (history, habit) => indexedProgress(indexHabitOutcomes(history), habit);
const habitTimeline = (calendar, history, habit, from, through) => indexedTimeline(calendar, indexHabitOutcomes(history), habit, from, through);
const habitDraft = (patch={}) => ({ title:'Leggere',motivation:'Dopo cena',icon:'study',color:'teal',stepTarget:5,startsOn:'2026-09-28',weekdays:[0,2,4],start:'21:00',durationMinutes:20,...patch });
test('habit creation links weekly occasions atomically and preserves their identity', () => {
  const draft = habitDraft();
  const created = habits.createHabit(c.emptyCalendar(), [], draft, {habitId:'habit-reading'});
  assert.equal(created.habits.length,1);
  assert.equal(created.calendar.items.length,3);
  assert.deepEqual(new Set(created.calendar.items.map(entry=>entry.habitId)),new Set(['habit-reading']));
  assert.deepEqual(created.habits[0],{id:'habit-reading',title:'Leggere',motivation:'Dopo cena',icon:'study',color:'teal',stepTarget:5});
  const visible=c.occurrences(created.calendar.items,'2026-09-28','2026-10-04');
  assert.deepEqual(visible.map(entry=>[entry.date,entry.start,entry.end]),[
    ['2026-09-28','21:00','21:20'],['2026-09-30','21:00','21:20'],['2026-10-02','21:00','21:20'],
  ]);
  archives.validateArchive({format:'time-planner-backup',version:3,calendar:created.calendar,habits:created.habits,history:[]});
  const occupied=put(c.emptyCalendar(),item('occupied',{date:'2026-09-28',endDate:'2026-09-28',start:'21:10',end:'22:00'}));
  assert.throws(()=>habits.createHabit(occupied,[],draft,{habitId:'habit-conflict'}),/Conflitto/);
  for (const stepTarget of [0,13,2.5]) assert.throws(()=>habits.createHabit(c.emptyCalendar(),[],habitDraft({stepTarget}),{habitId:`bad-${stepTarget}`}),/1 a 12/);
  assert.equal(occupied.items.length,1);
});
test('habit first occurrence follows the selected start date and weekday', () => {
  assert.equal(habits.firstHabitOccurrenceDate(habitDraft({startsOn:'2026-10-01',weekdays:[0,2]})),'2026-10-05');
  assert.equal(habits.firstHabitOccurrenceDate(habitDraft({startsOn:'2026-10-01',weekdays:[4,0]})),'2026-10-02');
  assert.equal(habits.firstHabitOccurrenceDate(habitDraft({startsOn:'2026-10-01',weekdays:[3]})),'2026-10-01');
});
test('habit collision identifies the occupied calendar event without changing it', () => {
  const draft = habitDraft({weekdays:[0]});
  const occupied = put(c.emptyCalendar(), fixed('Lavoro', {date:'2026-09-28',endDate:'2026-09-28',start:'21:10',end:'22:00'}));
  const before = structuredClone(occupied);
  assert.throws(() => habits.createHabit(occupied, [], draft, {habitId:'habit-reading'}), error => {
    assert.ok(error instanceof c.CalendarConflictError);
    assert.equal(error.entries.find(entry => entry.sourceId !== error.changedId).title, 'Lavoro');
    return true;
  });
  assert.deepEqual(occupied, before);
});
test('habit journey preserves ordered outcomes and stops at its target', () => {
  const created = habits.createHabit(c.emptyCalendar(), [], habitDraft({weekdays:[0],stepTarget:2}), {habitId:'habit-reading'});
  // Simula uno storico precedente al limite degli step.
  const occurrences = c.occurrences(created.calendar.items.map(item => ({...item,habitPlannedUntil:undefined})),'2026-09-28','2026-10-19');
  const first = archives.outcomeRecord(created.calendar,occurrences[0],'completed');
  const secondSkipped = archives.outcomeRecord(created.calendar,occurrences[1],'skipped');
  const third = archives.outcomeRecord(created.calendar,occurrences[2],'completed');
  assert.deepEqual(habitJourneyProgress([third,first,secondSkipped],created.habits[0]),{completed:2,currentStep:2,stepOutcomes:['completed','skipped'],milestonesReached:1,target:2});
  const secondCompleted = archives.outcomeRecord(created.calendar,occurrences[1],'completed');
  assert.deepEqual(habitJourneyProgress([first,secondSkipped,third,secondCompleted],created.habits[0]),{completed:3,currentStep:2,stepOutcomes:['completed','completed'],milestonesReached:1,target:2});
  const firstCorrected = archives.outcomeRecord(created.calendar,occurrences[0],'skipped');
  assert.equal(habitJourneyProgress([first,secondSkipped,third,secondCompleted,firstCorrected],created.habits[0]).completed,2);
});
test('habit update replaces its schedule atomically and keeps its stable progress identity', () => {
  const unrelated = put(c.emptyCalendar(),item('other',{date:'2026-09-28',endDate:'2026-09-28',start:'08:00',end:'09:00'}));
  const created = habits.createHabit(unrelated,[],habitDraft({weekdays:[0]}),{habitId:'habit-reading'});
  const occurrence = c.occurrences(created.calendar.items,'2026-09-28','2026-09-28').find(entry=>entry.habitId==='habit-reading');
  const history = [archives.outcomeRecord(created.calendar,occurrence,'completed')];
  const updated = habits.updateHabit(created.calendar,created.habits,'habit-reading',habitDraft({title:'Studiare',motivation:'Esame',weekdays:[1,3],start:'18:00',stepTarget:12}));
  assert.equal(updated.calendar.items.filter(entry=>entry.habitId==='habit-reading').length,2);
  assert.ok(updated.calendar.items.some(entry=>entry.id==='other'));
  assert.deepEqual(updated.habits[0],{id:'habit-reading',title:'Studiare',motivation:'Esame',icon:'study',color:'teal',stepTarget:12});
  assert.equal(habitJourneyProgress(history,updated.habits[0]).completed,1);
  assert.throws(()=>habits.updateHabit(created.calendar,created.habits,'habit-reading',habitDraft({weekdays:[0],start:'08:30'})),/Conflitto/);
  assert.equal(created.calendar.items.filter(entry=>entry.habitId==='habit-reading').length,1);
});
test('habit deletion removes its entire schedule without touching unrelated calendar data', () => {
  const unrelated = put(c.emptyCalendar(), item('other', {date:'2026-09-28',endDate:'2026-09-28',start:'08:00',end:'09:00'}));
  const created = habits.createHabit(unrelated, [], habitDraft({weekdays:[0,2]}), {habitId:'habit-reading'});
  const before = structuredClone(created);
  const deleted = habits.deleteHabit(created.calendar, created.habits, 'habit-reading');
  assert.deepEqual(deleted.habits, []);
  assert.deepEqual(deleted.calendar.items.map(entry => entry.id), ['other']);
  assert.deepEqual(created, before);
  assert.throws(() => habits.deleteHabit(deleted.calendar, deleted.habits, 'habit-reading'), /Abitudine non trovata/);
});
test('a moved habit occurrence saves with its original identity and a real collision is rejected', () => {
  const created = habits.createHabit(c.emptyCalendar(), [], habitDraft({weekdays:[0]}), {habitId:'habit-reading'});
  const source = created.calendar.items[0];
  const occurrence = c.occurrences(created.calendar.items, '2026-09-28', '2026-09-28')[0];
  const proposed = {...source, ...occurrence, id:source.id, date:'2026-09-29', endDate:'2026-09-29'};
  const moved = put(created.calendar, proposed, user, target(source.id, occurrence.occurrenceDate));
  const exception = moved.items[0].exceptions[occurrence.occurrenceDate];
  assert.equal(exception.date, '2026-09-29');
  assert.equal(Object.hasOwn(exception, 'habitId'), false);
  const visible = c.occurrences(moved.items, '2026-09-29', '2026-09-29')[0];
  assert.equal(visible.occurrenceDate, '2026-09-28');
  assert.equal(visible.habitId, 'habit-reading');
  archives.validateArchive({format:'time-planner-backup',version:3,calendar:moved,habits:created.habits,history:[]});
  const occupied = put(created.calendar, fixed('Lavoro', {date:'2026-09-29',endDate:'2026-09-29',start:'21:10',end:'22:00'}));
  assert.throws(() => put(occupied, proposed, user, target(source.id, occurrence.occurrenceDate)), c.CalendarConflictError);
  assert.deepEqual(occupied.items[0], source);
});
test('a removed habit occurrence keeps its latest recorded result; deleting its whole series is refused', () => {
  const created = habits.createHabit(c.emptyCalendar(), [], habitDraft({weekdays:[0]}), {habitId:'habit-reading'});
  const occurrence = c.occurrences(created.calendar.items, '2026-09-28', '2026-09-28')[0];
  const history = [archives.outcomeRecord(created.calendar, occurrence, 'skipped'), archives.outcomeRecord(created.calendar, occurrence, 'completed')];
  const recorded = c.setOccurrenceOutcome(created.calendar, occurrence.sourceId, occurrence.occurrenceDate, 'completed');
  assert.throws(() => c.deleteItem(recorded, target(occurrence.sourceId, occurrence.occurrenceDate, 'series'), user), /sezione Abitudini/);
  const removed = c.deleteItem(recorded, target(occurrence.sourceId, occurrence.occurrenceDate), user);
  archives.validateArchive({format:'time-planner-backup',version:3,calendar:removed,habits:created.habits,history});
  const entries = habitTimeline(removed, history, created.habits[0], '2026-09-28', '2026-09-28');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].outcome, 'completed');
  assert.equal(entries[0].removed, true);
  assert.equal(nextHabitOccurrence(entries,'2026-09-28','12:00'),undefined);
});
test('corrections preserve an audit trail but count each appointment once, independent of deletion', () => {
  let state = put(c.emptyCalendar(), item('history'));
  const occurrence = c.occurrences(state.items, '2026-09-14', '2026-09-14')[0];
  const first = archives.outcomeRecord(state, occurrence, 'skipped', '2026-09-14T11:00:00.000Z');
  const second = archives.outcomeRecord(state, occurrence, 'completed', '2026-09-14T12:00:00.000Z');
  const history = [first, second];
  state = c.clearCalendar(state);
  assert.equal(history.length, 2);
  assert.deepEqual(archives.latestOutcomes(history), [second]);
  const archive = { format: 'time-planner-backup', version: 3, calendar: state, habits: [], history };
  assert.deepEqual(archives.parseArchive(archives.exportArchive(archive)).history, history);
});
test('import accepts only the current backup and rejects foreign formats and unknown fields', () => {
  const state = put(c.emptyCalendar(), item('history'));
  const occurrence = c.occurrences(state.items, '2026-09-14', '2026-09-14')[0];
  const record = archives.outcomeRecord(state, occurrence, 'completed');
  const backup = { format: 'time-planner-backup', version: 3, calendar: state, habits: [], history: [record] };
  assert.deepEqual(archives.parseArchive(archives.exportArchive(backup)), JSON.parse(JSON.stringify(backup)));
  const legacy = {...backup}; delete legacy.habits;
  assert.deepEqual(archives.parseArchive(JSON.stringify(legacy)).habits, []);
  const oldHabitItem = {...item('old-habit',{recurrence:{},habitId:'old',habitPlanId:'old-plan'}),activityId:'old'};
  const oldBackup = {format:'time-planner-backup',version:1,calendar:{...state,items:[...state.items,oldHabitItem]},habits:[{id:'old',title:'Vecchia',notes:'',icon:'study',color:'teal',status:'active',plans:[]}],history:[record]};
  const migrated = archives.parseArchive(JSON.stringify(oldBackup));
  assert.equal(migrated.version,3);
  assert.deepEqual(migrated.habits,[]);
  assert.ok(!migrated.calendar.items.some(entry=>entry.habitId));
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

const { habitCompletionDate: indexedCompletion, reconcileHabitCompletion, repeatHabitDraft } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habitCompletion.js'));
const habitCompletionDate = (history, habit) => indexedCompletion(indexHabitOutcomes(history), habit);
const { StatisticsRepository: CompletionStatistics } = require(join(process.env.CALENDAR_TEST_BUILD, 'repository/StatisticsRepository.js'));
function completedHabitFixture(stepTarget = 12, recorded = stepTarget) {
  const created = habits.createHabit(c.emptyCalendar(), [], habitDraft({ stepTarget, weekdays: [0,1,2,3,4] }), { habitId: 'finite-habit' });
  const archive = { format: 'time-planner-backup', version: 3, ...created, history: [] };
  // I casi legacy possono contenere esiti oltre il traguardo attuale.
  const entries = c.occurrences(archive.calendar.items.map(item => ({...item,habitPlannedUntil:undefined})), '2026-09-28', '2026-11-30').slice(0, recorded);
  for (const entry of entries) {
    archive.history.push(archives.outcomeRecord(archive.calendar, entry, 'completed'));
    archive.calendar = c.setOccurrenceOutcome(archive.calendar, entry.sourceId, entry.occurrenceDate, 'completed');
  }
  return { archive, entries };
}
test('the twelfth completion closes every weekday, removes future denominators and survives export', () => {
  const { archive, entries } = completedHabitFixture();
  const before = structuredClone(archive);
  const closed = reconcileHabitCompletion(archive);
  const end = entries.at(-1).date;
  assert.equal(habitCompletionDate(closed.history, closed.habits[0]), end);
  assert.equal(c.occurrences(closed.calendar.items, c.addDays(end, 1), '2027-12-31').length, 0);
  assert.equal(c.occurrences(closed.calendar.items, '2026-09-28', end).length, 12);
  const stats = new CompletionStatistics(closed);
  assert.equal(stats.getDailyStatistics(c.addDays(end, 1)).total, 0);
  assert.equal(stats.getDailyStatistics(end).completed, 1);
  assert.equal(stats.getHabitDashboard(c.addDays(end, 1), '23:00').totalHabits, 0);
  assert.deepEqual(reconcileHabitCompletion(archives.parseArchive(archives.exportArchive(closed))), JSON.parse(JSON.stringify(closed)));
  assert.deepEqual(archive, before);
});
test('legacy completions beyond the target remain in statistics without extending the closed series', () => {
  const { archive, entries } = completedHabitFixture(6, 20);
  const closed = reconcileHabitCompletion(archive);
  assert.equal(closed.history.length, 20);
  assert.equal(habitCompletionDate(closed.history, closed.habits[0]), entries[5].date);
  assert.equal(c.occurrences(closed.calendar.items, entries[6].date, '2027-12-31').length, 0);
  const stats = new CompletionStatistics(closed);
  assert.equal(stats.getDailyStatistics(entries[6].date).completed, 1);
  assert.equal(stats.getActivityYearStatistics(stats.getStatisticsActivities()[0].id, 2026, '2026-12-31').completed, 20);
  assert.equal(habitJourneyProgress(closed.history, closed.habits[0]).currentStep, 6);
});
test('repeat creates independent progress, preserves the closed series and allows its freed time slots', () => {
  const { archive } = completedHabitFixture(1);
  const closed = reconcileHabitCompletion(archive);
  const draft = repeatHabitDraft(closed, closed.habits[0], '2026-09-28');
  assert.equal(draft.startsOn, '2026-09-29');
  const repeated = habits.createHabit(closed.calendar, closed.habits, draft, { habitId: 'second-series' });
  const next = reconcileHabitCompletion({ ...closed, ...repeated });
  archives.validateArchive(next);
  assert.equal(habitJourneyProgress(next.history, next.habits[1]).currentStep, 0);
  assert.equal(habitJourneyProgress(next.history, next.habits[0]).currentStep, 1);
  assert.deepEqual(next.history, archive.history);
  assert.ok(c.occurrences(next.calendar.items, '2026-09-29', '2026-10-30').every(entry => entry.habitId === 'second-series'));
  assert.throws(() => repeatHabitDraft(next, next.habits[1], '2026-10-01'), /solo una serie conclusa/);
});
test('correcting an outcome keeps the series closed without deleting its history', () => {
  const { archive, entries } = completedHabitFixture(1);
  const closed = reconcileHabitCompletion(archive);
  const corrected = reconcileHabitCompletion({ ...closed,
    calendar: c.setOccurrenceOutcome(closed.calendar, entries[0].sourceId, entries[0].occurrenceDate, 'skipped'),
    history: [...closed.history, archives.outcomeRecord(closed.calendar, entries[0], 'skipped')],
  });
  assert.equal(habitCompletionDate(corrected.history, corrected.habits[0]), entries[0].date);
  assert.ok(corrected.calendar.items.every(item => item.habitClosedOn === entries[0].date));
  assert.equal(c.occurrences(corrected.calendar.items, '2026-10-01', '2026-11-30').length, 0);
  assert.equal(c.occurrences(corrected.calendar.items, entries[0].date, entries[0].date)[0].outcome, 'skipped');
  assert.equal(corrected.history.length, 2);
});
test('closure uses moved event dates and suppresses unrecorded exceptions after the target', () => {
  const { archive, entries } = completedHabitFixture(1);
  const moved = entries[0];
  const source = archive.calendar.items.find(item => item.id === moved.sourceId);
  archive.calendar = c.putItem(archive.calendar, { ...source, date: '2026-09-27', endDate: '2026-09-27' }, user, target(source.id, moved.occurrenceDate));
  archive.history.push({ ...archives.outcomeRecord(archive.calendar, moved, 'completed'), eventDate: '2026-09-27' });
  const nextSource = archive.calendar.items.find(item => item.id !== source.id);
  archive.calendar = c.putItem(archive.calendar, { ...nextSource, date: '2026-11-01', endDate: '2026-11-01' }, user, target(nextSource.id, nextSource.date));
  const closed = reconcileHabitCompletion(archive);
  assert.equal(habitCompletionDate(closed.history, closed.habits[0]), '2026-09-27');
  const visible = c.occurrences(closed.calendar.items, '2026-09-27', '2027-01-01');
  assert.equal(visible.length, 1);
  assert.equal(visible[0].occurrenceDate, moved.occurrenceDate);
});

test('three-step repeat plans exactly three appointments across all views and legacy reloads', () => {
  const draft = habitDraft({stepTarget:3,startsOn:'2026-10-05',start:'18:00'});
  const original = habits.createHabit(c.emptyCalendar(),[],draft,{habitId:'gym'});
  const archive = {format:'time-planner-backup',version:3,...original,history:[]};
  for (const event of c.occurrences(archive.calendar.items,'2026-01-01','2027-12-31')) {
    archive.history.push(archives.outcomeRecord(archive.calendar,event,'completed'));
    archive.calendar = c.setOccurrenceOutcome(archive.calendar,event.sourceId,event.occurrenceDate,'completed');
  }
  const closed = reconcileHabitCompletion(archive);
  const repeated = habits.createHabit(closed.calendar,closed.habits,repeatHabitDraft(closed,closed.habits[0],'2026-10-08'),{habitId:'repeat'});
  const next = reconcileHabitCompletion({...closed,...repeated});
  const planned = c.occurrences(next.calendar.items,'2026-10-10','2027-12-31');
  assert.deepEqual(planned.map(event=>event.date),['2026-10-12','2026-10-14','2026-10-16']);
  assert.equal(next.habits[1].stepTarget,3);
  const stats = new CompletionStatistics(next);
  assert.equal(stats.getHabitTimeline('repeat','2026-10-10','2027-12-31').length,3);
  assert.equal(stats.getDailyStatistics('2026-10-19').total,0);
  assert.equal(stats.getActivityYearStatistics(planned[0].sourceId,2026).days.filter(day=>day.total).length,6);
  const stored = archives.archiveForStorage(next);
  assert.ok(stored.calendar.items.every(item=>item.habitPlannedUntil===undefined));
  assert.deepEqual(c.occurrences(reconcileHabitCompletion(stored).calendar.items,'2026-10-10','2027-12-31'),planned);
  assert.deepEqual(next.history,closed.history);
});

test('step limits preserve weekdays, moved identities and free time beyond the last appointment', () => {
  const created = habits.createHabit(c.emptyCalendar(),[],habitDraft({stepTarget:1,startsOn:'2026-12-31',weekdays:[0,3,4]}),{habitId:'short'});
  assert.deepEqual(c.occurrences(created.calendar.items,'2026-01-01','2027-12-31').map(event=>event.date),['2026-12-31']);
  assert.deepEqual(habits.habitDraft(created.calendar,created.habits[0]).weekdays,[0,3,4]);
  const source = created.calendar.items.find(item=>item.date==='2026-12-31');
  const moved = c.putItem(created.calendar,{...source,date:'2027-01-10',endDate:'2027-01-10'},user,target(source.id,source.date));
  const events = c.occurrences(moved.items,'2026-01-01','2027-12-31');
  assert.equal(events.length,1);
  assert.equal(events[0].date,'2027-01-10');
  assert.equal(events[0].occurrenceDate,'2026-12-31');
  const occupied = {...c.emptyCalendar(),items:[item('later',{date:'2026-10-19',endDate:'2026-10-19',start:'21:00',end:'21:20'})]};
  assert.doesNotThrow(()=>habits.createHabit(occupied,[],habitDraft({stepTarget:3,startsOn:'2026-10-05'}),{habitId:'finite'}));
});

test('new outcomes accept only done and not done, keeping missing outcomes distinct', () => {
  const state = {...c.emptyCalendar(),items:[series('binary')]};
  const event = c.occurrences(state.items,'2026-09-14','2026-09-14')[0];
  assert.deepEqual(Object.keys(c.outcomeLabels),['completed','skipped']);
  assert.equal(event.outcome,undefined);
  for (const invalid of ['partial','maybe','pending',null]) {
    assert.throws(()=>c.setOccurrenceOutcome(state,event.sourceId,event.occurrenceDate,invalid),/Esito/);
    assert.throws(()=>archives.outcomeRecord(state,event,invalid),/Esito/);
  }
});
