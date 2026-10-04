const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const build = process.env.CALENDAR_TEST_BUILD;
const { indexHabitOutcomes } = require(join(build, 'domain/habitOutcomeIndex.js'));
const { habitCompletionDate, reconcileHabitCompletion } = require(join(build, 'domain/habitCompletion.js'));
const { habitJourneyProgress } = require(join(build, 'domain/habitTimeline.js'));
const { createHabit } = require(join(build, 'domain/habits.js'));
const { emptyCalendar, occurrences, setOccurrenceOutcome } = require(join(build, 'domain/calendar.js'));
const { outcomeRecord } = require(join(build, 'domain/outcomeArchive.js'));
const { StatisticsRepository } = require(join(build, 'repository/StatisticsRepository.js'));

test('outcome index preserves identity, same-day completions and corrections before date filtering', () => {
  const habit = { id:'reading', title:'Lettura', motivation:'', icon:'study', color:'teal', stepTarget:3 };
  const base = { id:'first',sourceId:'source-a',activityId:habit.id,occurrenceDate:'2026-10-01',eventDate:'2026-10-03',title:habit.title,icon:habit.icon,color:habit.color,outcome:'completed',recordedAt:'2026-10-04T12:00:00Z' };
  const history = [
    base,
    { ...base, id:'second',sourceId:'source-b' },
    { ...base, id:'third',sourceId:'source-c' },
    { ...base, id:'repeat',sourceId:'repeated-source',activityId:'reading-repeat' },
    // Prevale l’ordine dello storico, anche se il timestamp della correzione è precedente.
    { ...base, id:'moved',eventDate:'2026-10-10',recordedAt:'2026-10-02T12:00:00Z' },
  ];
  const before = structuredClone(history);
  const index = indexHabitOutcomes(history);
  assert.deepEqual(index.byActivity.get(habit.id).completedDates, ['2026-10-03','2026-10-03','2026-10-10']);
  assert.equal(habitCompletionDate(index, habit), '2026-10-10');
  assert.equal(habitJourneyProgress(index, habit).completed, 3);
  assert.equal(habitJourneyProgress(index, habit, '2026-10-04').completed, 2);
  assert.equal(habitJourneyProgress(index, { ...habit,id:'reading-repeat' }).completed, 1);
  assert.equal(index.byOccurrence.get(JSON.stringify(['source-a','2026-10-01'])).id, 'moved');
  const corrected = indexHabitOutcomes([...history, { ...base,id:'partial',outcome:'partial' }]);
  assert.equal(habitCompletionDate(corrected, habit), undefined);
  assert.equal(habitJourneyProgress(corrected, habit).completed, 2);
  assert.equal(habitCompletionDate(index, habit), '2026-10-10');
  assert.deepEqual(history, before);
  assert.equal(habitJourneyProgress(indexHabitOutcomes([]), habit).currentStep, 0);
});

test('shared read model refreshes on correction while the previous snapshot stays closed', () => {
  const created = createHabit(emptyCalendar(), [], { title:'Lettura',motivation:'',icon:'study',color:'teal',stepTarget:1,startsOn:'2026-10-05',weekdays:[0],start:'10:00',durationMinutes:20 }, { habitId:'reading' });
  const entry = occurrences(created.calendar.items, '2026-10-05', '2026-10-05')[0];
  const raw = { format:'time-planner-backup',version:2,...created,history:[outcomeRecord(created.calendar,entry,'completed')] };
  raw.calendar = setOccurrenceOutcome(raw.calendar, entry.sourceId, entry.occurrenceDate, 'completed');
  const closedArchive = reconcileHabitCompletion(raw);
  const closed = new StatisticsRepository(closedArchive);
  assert.equal(closed.getHabitCompletionDate('reading'), '2026-10-05');
  assert.equal(closed.getHabitProgress('reading').currentStep, 1);
  assert.deepEqual(closed.getHabitTimeline('reading','2026-10-12','2026-10-12'), []);
  const corrected = reconcileHabitCompletion({ ...closedArchive,
    calendar:setOccurrenceOutcome(closedArchive.calendar,entry.sourceId,entry.occurrenceDate,'partial'),
    history:[...closedArchive.history,outcomeRecord(closedArchive.calendar,entry,'partial')],
  }, closedArchive);
  const reopened = new StatisticsRepository(corrected);
  assert.equal(reopened.getHabitCompletionDate('reading'), undefined);
  assert.equal(reopened.getHabitProgress('reading').currentStep, 0);
  assert.equal(reopened.getHabitTimeline('reading','2026-10-12','2026-10-12').length, 1);
  assert.equal(reopened.getHabitDashboard('2026-10-12','11:00').totalHabits, 1);
  assert.equal(reopened.getDailyStatistics('2026-10-05').completionPercent, 0);
  assert.equal(reopened.getActivityYearStatistics(entry.sourceId,2026,'2026-10-12').days.find(day=>day.date==='2026-10-05').percent, 50);
  assert.equal(closed.getHabitProgress('reading').currentStep, 1);
  assert.equal(closed.getHabitDashboard('2026-10-12','11:00').totalHabits, 0);
  assert.throws(()=>reopened.getHabitProgress('deleted'), /Abitudine non trovata/);
  assert.throws(()=>reopened.getHabitTimeline('reading','invalid','2026-10-12'), /Periodo/);
});
