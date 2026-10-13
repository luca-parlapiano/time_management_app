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
  const corrected = indexHabitOutcomes([...history, { ...base,id:'skipped',outcome:'skipped' }]);
  assert.equal(habitCompletionDate(corrected, habit), '2026-10-03');
  assert.equal(habitJourneyProgress(corrected, habit).completed, 2);
  assert.equal(habitCompletionDate(index, habit), '2026-10-10');
  assert.deepEqual(history, before);
  assert.equal(habitJourneyProgress(indexHabitOutcomes([]), habit).currentStep, 0);
});

test('shared read model refreshes on correction while the previous snapshot stays closed', () => {
  const created = createHabit(emptyCalendar(), [], { title:'Lettura',motivation:'',icon:'study',color:'teal',stepTarget:1,startsOn:'2026-10-05',weekdays:[0],start:'10:00',durationMinutes:20 }, { habitId:'reading' });
  const entry = occurrences(created.calendar.items, '2026-10-05', '2026-10-05')[0];
  const raw = { format:'time-planner-backup',version:3,...created,history:[outcomeRecord(created.calendar,entry,'completed')] };
  raw.calendar = setOccurrenceOutcome(raw.calendar, entry.sourceId, entry.occurrenceDate, 'completed');
  const closedArchive = reconcileHabitCompletion(raw);
  const closed = new StatisticsRepository(closedArchive);
  assert.equal(closed.getHabitCompletionDate('reading'), '2026-10-05');
  assert.equal(closed.getHabitProgress('reading').currentStep, 1);
  assert.deepEqual(closed.getHabitTimeline('reading','2026-10-12','2026-10-12'), []);
  const corrected = reconcileHabitCompletion({ ...closedArchive,
    calendar:setOccurrenceOutcome(closedArchive.calendar,entry.sourceId,entry.occurrenceDate,'skipped'),
    history:[...closedArchive.history,outcomeRecord(closedArchive.calendar,entry,'skipped')],
  }, closedArchive);
  const reopened = new StatisticsRepository(corrected);
  assert.equal(reopened.getHabitCompletionDate('reading'), '2026-10-05');
  assert.equal(reopened.getHabitProgress('reading').currentStep, 1);
  assert.equal(reopened.getHabitTimeline('reading','2026-10-12','2026-10-12').length, 0);
  assert.equal(reopened.getHabitDashboard('2026-10-12','11:00').totalHabits, 0);
  assert.equal(reopened.getDailyStatistics('2026-10-05').completionPercent, 0);
  assert.equal(reopened.getActivityYearStatistics(entry.sourceId,2026,'2026-10-12').days.find(day=>day.date==='2026-10-05').percent, 0);
  assert.equal(closed.getHabitProgress('reading').currentStep, 1);
  assert.equal(closed.getHabitDashboard('2026-10-12','11:00').totalHabits, 0);
  assert.throws(()=>reopened.getHabitProgress('deleted'), /Abitudine non trovata/);
  assert.throws(()=>reopened.getHabitTimeline('reading','invalid','2026-10-12'), /Periodo/);
});

test('mixed and all-skipped series close after every unique step is assessed and can repeat', () => {
  const {repeatHabitDraft}=require(join(build,'domain/habitCompletion.js'));
  for (const outcomes of [['completed','skipped','completed'],['skipped','skipped','skipped']]) {
    const created=createHabit(emptyCalendar(),[],{title:'Palestra',motivation:'',icon:'sport',color:'purple',stepTarget:3,startsOn:'2026-10-12',weekdays:[0,2,4],start:'18:00',durationMinutes:60},{habitId:'gym'});
    let archive={format:'time-planner-backup',version:3,...created,history:[]};
    const events=occurrences(archive.calendar.items,'2026-10-12','2026-10-16');
    const save=(index,outcome)=>{
      const event=events[index];
      archive=reconcileHabitCompletion({...archive,calendar:setOccurrenceOutcome(archive.calendar,event.sourceId,event.occurrenceDate,outcome),history:[...archive.history,outcomeRecord(archive.calendar,event,outcome)]});
    };
    save(2,outcomes[2]);save(0,outcomes[0]);save(0,outcomes[0]);
    let stats=new StatisticsRepository(archive);
    assert.equal(stats.getHabitProgress('gym').currentStep,2,'Repeated writes never assess another step');
    assert.equal(stats.getHabitCompletionDate('gym'),undefined,'The middle event still needs an outcome');
    save(1,outcomes[1]);
    stats=new StatisticsRepository(archive);
    assert.equal(stats.getHabitCompletionDate('gym'),'2026-10-16');
    assert.equal(stats.getHabitProgress('gym').currentStep,3);
    assert.equal(stats.getHabitProgress('gym').completed,outcomes.filter(value=>value==='completed').length);
    assert.equal(stats.getHabitDashboard('2026-10-16','23:59').totalHabits,0);
    assert.equal(stats.getActivityYearStatistics(events[0].sourceId,2026,'2026-10-16').completedSeries,1);
    assert.equal(stats.getHabitTimeline('gym','2026-10-12','2026-10-16').length,3);
    const repeat=createHabit(archive.calendar,archive.habits,repeatHabitDraft(archive,archive.habits[0],'2026-10-16'),{habitId:'repeat'});
    const repeated=new StatisticsRepository(reconcileHabitCompletion({...archive,...repeat}));
    assert.equal(repeated.getHabitProgress('repeat').currentStep,0);
    assert.equal(repeated.getHabitCompletionDate('repeat'),undefined);
    save(0,outcomes[0]==='completed'?'skipped':'completed');
    assert.equal(new StatisticsRepository(archive).getHabitCompletionDate('gym'),'2026-10-16');
  }
});

test('not-done steps advance an active dashboard and a larger target reopens the series', () => {
  const {updateHabit}=require(join(build,'domain/habits.js'));
  const draft={title:'Test',motivation:'',icon:'sport',color:'purple',stepTarget:3,startsOn:'2026-10-12',weekdays:[0,2,4],start:'18:00',durationMinutes:60};
  const created=createHabit(emptyCalendar(),[],draft,{habitId:'gym'});
  let archive={format:'time-planner-backup',version:3,...created,history:[]};
  const events=occurrences(archive.calendar.items,'2026-10-12','2026-10-16');
  for (const [index,event] of events.entries()) {
    archive={...archive,calendar:setOccurrenceOutcome(archive.calendar,event.sourceId,event.occurrenceDate,'skipped'),history:[...archive.history,outcomeRecord(archive.calendar,event,'skipped')]};
    if(index===0){
      const featured=new StatisticsRepository(reconcileHabitCompletion(archive)).getHabitDashboard('2026-10-12','23:59').featured;
      assert.equal(featured.journey.completed,0);
      assert.equal(featured.journey.currentStep,1);
      assert.equal(featured.remaining,2);
    }
  }
  archive=reconcileHabitCompletion(archive);
  const expanded=reconcileHabitCompletion({...archive,...updateHabit(archive.calendar,archive.habits,'gym',{...draft,stepTarget:4})},archive);
  assert.equal(new StatisticsRepository(expanded).getHabitCompletionDate('gym'),undefined);
  assert.equal(occurrences(expanded.calendar.items,'2026-10-17','2027-01-01').length,1);
});
