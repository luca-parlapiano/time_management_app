const {test}=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const {StatisticsRepository}=require(join(process.env.CALENDAR_TEST_BUILD,'repository/StatisticsRepository.js'));
const c=require(join(process.env.CALENDAR_TEST_BUILD,'domain/calendar.js'));
const a=require(join(process.env.CALENDAR_TEST_BUILD,'domain/outcomeArchive.js'));
const {createHabit,updateHabit,deleteHabit}=require(join(process.env.CALENDAR_TEST_BUILD,'domain/habits.js'));
const {reconcileHabitCompletion}=require(join(process.env.CALENDAR_TEST_BUILD,'domain/habitCompletion.js'));
const item=(id,date='2026-09-21',patch={})=>({id,title:'Palestra',date,endDate:date,start:'09:00',end:'10:00',kind:'flexible',notes:'',recurrence:{until:date},routine:true,exceptions:{},...patch});
const archive=(items,history=[])=>({format:'time-planner-backup',version:3,calendar:{...c.emptyCalendar(),items},habits:[],history});
function record(state,sourceId,date,outcome){const entry=c.occurrences(state.calendar.items,date,date).find(value=>value.sourceId===sourceId);return a.outcomeRecord(state.calendar,entry,outcome);}

test('habit statistics retain confirmed results after changing weekdays and remove fully deleted habits',()=>{
 const draft={title:'Lettura',motivation:'',icon:'study',color:'green',stepTarget:6,startsOn:'2026-10-05',weekdays:[0,1],start:'10:00',durationMinutes:20};
 const data={...archive([]),...createHabit(c.emptyCalendar(),[],draft,{habitId:'reading'})};
 for(const date of ['2026-10-05','2026-10-06']){
  const event=c.occurrences(data.calendar.items,date,date)[0];
  data.history.push(a.outcomeRecord(data.calendar,event,'completed'));
  data.calendar=c.setOccurrenceOutcome(data.calendar,event.sourceId,event.occurrenceDate,'completed');
 }
 Object.assign(data,updateHabit(data.calendar,data.habits,'reading',{...draft,weekdays:[1]}));
 const repo=new StatisticsRepository(reconcileHabitCompletion(data));
 const id=repo.getStatisticsActivities()[0].id;
 assert.equal(repo.getHabitProgress('reading').completed,2);
 assert.equal(repo.getActivityYearStatistics(id,2026,'2026-10-07').completed,2);
 assert.equal(repo.getDailyStatistics('2026-10-05').completed,1);
 assert.equal(a.latestOutcomes(a.progressOutcomeHistory(data.calendar,data.history)).length,2);
 const correction={...data.history[0],id:'correct-removed',outcome:'skipped'};
 const corrected=new StatisticsRepository(reconcileHabitCompletion({...data,history:[...data.history,correction]}));
 assert.equal(corrected.getActivityYearStatistics(id,2026,'2026-10-07').completed,1);
 assert.equal(corrected.getDailyStatistics('2026-10-05').skipped,1);
 const removed={...data,...deleteHabit(data.calendar,data.habits,'reading')};
 const deleted=new StatisticsRepository(removed);
 assert.equal(deleted.getStatisticsActivities().length,0);
 assert.equal(deleted.getDailyStatistics('2026-10-05').completed,0);
 assert.equal(a.progressOutcomeHistory(removed.calendar,removed.history).length,0);
 assert.equal(removed.history.length,2);
});

test('lowering a habit target stops planning without discarding later confirmed results',()=>{
 const draft={title:'Lettura',motivation:'',icon:'study',color:'green',stepTarget:6,startsOn:'2026-10-05',weekdays:[0,1,2],start:'10:00',durationMinutes:20};
 const data={...archive([]),...createHabit(c.emptyCalendar(),[],draft,{habitId:'reading'})};
 for(const date of ['2026-10-05','2026-10-06','2026-10-07']){
  const event=c.occurrences(data.calendar.items,date,date)[0];
  data.history.push(a.outcomeRecord(data.calendar,event,'completed'));
  data.calendar=c.setOccurrenceOutcome(data.calendar,event.sourceId,event.occurrenceDate,'completed');
 }
 Object.assign(data,updateHabit(data.calendar,data.habits,'reading',{...draft,stepTarget:1}));
 const closed=reconcileHabitCompletion(data),repo=new StatisticsRepository(closed);
 assert.equal(repo.getHabitCompletionDate('reading'),'2026-10-05');
 assert.equal(repo.getHabitProgress('reading').completed,3);
 assert.equal(repo.getActivityYearStatistics(repo.getStatisticsActivities()[0].id,2026,'2026-10-07').completed,3);
 assert.equal(repo.getDailyStatistics('2026-10-07').completed,1);
 assert.equal(c.occurrences(closed.calendar.items,'2026-10-12','2026-10-14').length,0);
});

test('annual completed totals stop at the reference date and never count unrecorded future plans',()=>{
 const data=archive([item('reading','2026-10-05',{recurrence:{}})]);
 data.history=['2026-10-05','2026-10-12'].map(date=>record(data,'reading',date,'completed'));
 const stats=new StatisticsRepository(data).getActivityYearStatistics('reading',2026,'2026-10-07');
 assert.equal(stats.completed,1);
 assert.equal(stats.futureCompleted,1);
 assert.equal(stats.days.find(day=>day.date==='2026-10-12').state,'future');
 assert.equal(stats.days.find(day=>day.date==='2026-10-19').completed,0);
});

test('activity statistics group normalized titles and preserve planned days and outcomes',()=>{
 const mon=item('mon'),wed=item('wed','2026-09-23',{title:'  PALESTRA  '}),sun=item('sun','2026-09-27'),next=item('next','2026-09-28');
 const data=archive([mon,wed,sun,next]);
 data.history=[record(data,'mon',mon.date,'completed'),record(data,'wed',wed.date,'skipped')];
 const repo=new StatisticsRepository(data);
 assert.equal(repo.getStatisticsActivities().length,1);
 const days=repo.getActivityYearStatistics('mon',2026,'2026-09-30').days;
 assert.deepEqual(days.filter(day=>day.total).map(day=>[day.date,day.completed,day.skipped,day.pending,day.percent]),[
  ['2026-09-21',1,0,0,100],['2026-09-23',0,1,0,0],['2026-09-27',0,0,1,null],['2026-09-28',0,0,1,null],
 ]);
});

test('activity statistics apply the last correction before assigning an occurrence to its day',()=>{
 const event=item('work'),data=archive([event]);
 const first=record(data,event.id,event.date,'completed');
 data.history=[first,{...first,id:'correction',outcome:'skipped'},{...first,id:'moved',eventDate:'2026-09-28',outcome:'skipped'}];
 const repo=new StatisticsRepository(data);
 const days=repo.getActivityYearStatistics(event.id,2026,'2026-09-30').days;
 assert.equal(days.find(day=>day.date===event.date).total,0);
 assert.deepEqual(days.filter(day=>day.total).map(day=>[day.date,day.total,day.skipped,day.percent]),[['2026-09-28',1,1,0]]);
 const deleted=new StatisticsRepository(archive([],data.history));
 assert.deepEqual(deleted.getStatisticsActivities(),[]);
});

test('activity statistics preserve shared IDs, moved and deleted recurrences, and overnight start dates',()=>{
 const mon=item('mon','2026-09-21',{activityId:'gym',recurrence:{},exceptions:{'2026-09-28':{...item('patch','2026-09-29'),title:'Palestra spostata'}}});
 const wed=item('wed','2026-09-23',{title:'Pesi',activityId:'gym',recurrence:{},exceptions:{'2026-09-30':null}});
 const overnight=item('night','2026-09-27',{start:'23:00',endDate:'2026-09-28',end:'01:00'});
 const repo=new StatisticsRepository(archive([mon,wed,overnight]));
 assert.equal(repo.getStatisticsActivities().length,1);
 const days=repo.getActivityYearStatistics('mon',2026,'2026-09-30').days;
 const total=date=>days.find(day=>day.date===date).total;
 assert.equal(total('2026-09-27'),1);
 assert.equal(total('2026-09-28'),0);
 assert.equal(total('2026-09-29'),1);
 assert.equal(total('2026-09-30'),0);
});

test('activity statistics preserve civil dates across daylight-saving and year boundaries',()=>{
 const repo=new StatisticsRepository(archive([item('year','2026-12-31'),item('dst','2026-10-25')]));
 const current=repo.getActivityYearStatistics('year',2026,'2026-12-31');
 assert.deepEqual(current.days.filter(day=>day.total).map(day=>day.date),['2026-10-25','2026-12-31']);
 const next=repo.getActivityYearStatistics('year',2027,'2027-01-01');
 assert.equal(next.days.length,365);
 assert.equal(next.days.some(day=>day.total),false);
 const leap=repo.getActivityYearStatistics('year',2024,'2024-12-31');
 assert.equal(leap.days.length,366);
 assert.equal(leap.days.filter(day=>day.date==='2024-02-29').length,1);
 assert.throws(()=>repo.getActivityYearStatistics('year',2026,'2026-02-30'),/Periodo/);
});

test('activity statistics keep a renamed source audit separate from another activity with its old title',()=>{
 const original=item('renamed'),data=archive([original]);
 const oldRecord=record(data,original.id,original.date,'completed');
 const renamed={...original,title:'Allenamento'},different=item('other','2026-09-23');
 const repo=new StatisticsRepository(archive([renamed,different],[oldRecord]));
 assert.equal(repo.getStatisticsActivities().length,2);
 const completed=id=>repo.getActivityYearStatistics(id,2026,'2026-09-30').days.reduce((sum,day)=>sum+day.completed,0);
 assert.equal(completed('renamed'),1);
 assert.equal(completed('other'),0);
});

test('daily statistics: segments preserve event colors and count appointments, not duration',()=>{
 const data=archive([item('a',undefined,{color:'green',icon:'sport'}),item('b',undefined,{color:'green',icon:'sport',end:'12:00'}),item('c',undefined,{color:'blue',icon:'sport'}),item('d',undefined,{title:'Lavoro',color:'green',icon:'work'}),item('tomorrow','2026-09-22')]);
 const stats=new StatisticsRepository(data).getDailyStatistics('2026-09-21');
 assert.equal(stats.total,4);assert.equal(stats.pending,4);
 assert.deepEqual(stats.activities.map(x=>[x.title,x.color,x.count]),[['Palestra','green',2],['Palestra','blue',1],['Lavoro','green',1]]);
 assert.equal(stats.activities.reduce((sum,x)=>sum+x.count,0),stats.total);
});

test('daily statistics: last correction wins, live colors override archived colors and deleted activities leave statistics',()=>{
 const event=item('a',undefined,{color:'blue'}),data=archive([event]);
 const first=record(data,event.id,event.date,'skipped');
 data.history=[first,{...first,id:'last',outcome:'completed',recordedAt:'2026-10-01T12:00:00Z'}];
 data.calendar.items[0]={...event,color:'green'};
 const stats=new StatisticsRepository(data).getDailyStatistics(event.date);
 assert.equal(stats.total,1);assert.equal(stats.completed,1);assert.equal(stats.skipped,0);assert.equal(stats.activities[0].color,'green');
 const deleted=new StatisticsRepository(archive([],data.history));
 assert.equal(deleted.getDailyStatistics(event.date).total,0);
 assert.equal(deleted.getDailyStatistics('2026-10-01').total,0);
});

test('daily statistics: moved and removed recurrences, overnight and exclusive midnight boundary',()=>{
 const recurring=item('r',undefined,{recurrence:{},exceptions:{'2026-09-28':{...item('patch','2026-09-29')},'2026-10-05':null}});
 const repo=new StatisticsRepository(archive([recurring,item('night','2026-09-22',{start:'23:00',endDate:'2026-09-23',end:'01:00'}),item('midnight','2026-09-22',{start:'23:00',endDate:'2026-09-23',end:'00:00'})]));
 assert.equal(repo.getDailyStatistics('2026-09-28').total,0);assert.equal(repo.getDailyStatistics('2026-09-29').total,1);assert.equal(repo.getDailyStatistics('2026-10-05').total,0);
 assert.equal(repo.getDailyStatistics('2026-09-22').total,2);assert.equal(repo.getDailyStatistics('2026-09-23').total,1);
});

test('daily statistics: empty dates, validation and historical date correction',()=>{
 const event=item('a'),data=archive([event]),first=record(data,event.id,event.date,'completed');
 const repo=new StatisticsRepository(archive([],[first,{...first,id:'moved',eventDate:'2026-09-22',outcome:'skipped'}]));
 assert.equal(repo.getDailyStatistics(event.date).total,0);assert.equal(repo.getDailyStatistics('2026-09-22').skipped,0);
 assert.deepEqual(repo.getDailyStatistics('2026-12-31').activities,[]);
 assert.throws(()=>repo.getDailyStatistics('2026-02-30'),/Data non valida/);
});

test('daily progress: denominator includes every planned appointment; colored contributions sum to completion',()=>{
 const data=archive([item('a',undefined,{color:'green'}),item('b',undefined,{color:'blue'}),item('c',undefined,{color:'purple'}),item('d',undefined,{color:'orange'})]);
 data.history=[record(data,'a','2026-09-21','completed'),record(data,'b','2026-09-21','skipped'),record(data,'c','2026-09-21','skipped')];
 const stats=new StatisticsRepository(data).getDailyStatistics('2026-09-21');
 assert.equal(stats.total,4);assert.equal(stats.recorded,3);assert.equal(stats.completionPercent,25);
 assert.deepEqual(stats.activities.map(x=>x.contributionPercent),[25,0,0,0]);
 assert.equal(stats.activities.reduce((sum,x)=>sum+x.contributionPercent,0),stats.completionPercent);
 data.history.push(record(data,'b','2026-09-21','completed'),record(data,'c','2026-09-21','completed'),record(data,'d','2026-09-21','completed'));
 const done=new StatisticsRepository(data).getDailyStatistics('2026-09-21');
 assert.equal(done.completionPercent,100);assert.equal(done.total,4);assert.equal(done.recorded,4);
 assert.deepEqual(done.activities.map(x=>x.contributionPercent),[25,25,25,25]);
});

test('daily progress: no outcomes differs from recorded zero completion',()=>{
 const event=item('a',undefined,{recurrence:{}}),data=archive([event]);
 const planned=new StatisticsRepository(data).getDailyStatistics('2027-09-20');
 assert.equal(planned.total,1);assert.equal(planned.recorded,0);assert.equal(planned.completionPercent,0);
 data.history=[record(data,'a','2026-09-21','skipped')];
 const zero=new StatisticsRepository(data).getDailyStatistics('2026-09-21');
 assert.equal(zero.recorded,1);assert.equal(zero.completionPercent,0);
});

test('activity heatmap: binary outcomes, mixed occurrences, future and empty states',()=>{
 const data=archive([item('a'),item('b'),item('c','2026-09-22'),item('future','2026-09-28',{recurrence:{}})]);
 data.history=[record(data,'a','2026-09-21','completed'),record(data,'b','2026-09-21','skipped')];
 const repo=new StatisticsRepository(data);
 assert.equal(repo.getStatisticsActivities().length,1);
 const stats=repo.getActivityYearStatistics('a',2026,'2026-09-23');
 assert.equal(stats.days.length,365);
 const day=date=>stats.days.find(day=>day.date===date);
 assert.equal(day('2026-09-21').percent,50);
 assert.equal(day('2026-09-21').state,'recorded');
 assert.equal(day('2026-09-22').state,'pending');
 assert.equal(day('2026-09-23').state,'empty');
 assert.equal(day('2026-09-28').state,'future');
 assert.equal(day('2026-09-28').percent,null);
 assert.equal(repo.getDailyStatistics('2026-09-21').completionPercent,50);
});

test('activity heatmap: deleted activities are excluded, with year and input validation',()=>{
 const event=item('a'),data=archive([event]),first=record(data,'a',event.date,'completed');
 const repo=new StatisticsRepository(archive([],[first,{...first,id:'correction',eventDate:'2024-02-29',outcome:'skipped'}]));
 assert.equal(repo.getStatisticsActivities().length,0);
 assert.throws(()=>repo.getActivityYearStatistics('a',2024,'2026-09-23'),/Attività/);
 assert.throws(()=>repo.getActivityYearStatistics('a',2026.5),/Periodo/);
 assert.throws(()=>repo.getActivityYearStatistics('missing',2026),/Attività/);
});

test('statistics include only habits and recurring routines',()=>{
 const routine=item('routine');
 const fixed={...item('fixed'),title:'Lavoro',kind:'fixed'};delete fixed.routine;
 const protectedBlock={...item('protected'),title:'Sonno',kind:'protected'};delete protectedBlock.routine;
 const single={...item('single'),title:'Dentista'};delete single.recurrence;delete single.routine;
 const calendarSeries={...item('work-series'),title:'Lavoro ricorrente'};delete calendarSeries.routine;
 const data=archive([routine,fixed,protectedBlock,single,calendarSeries]);
 data.history=[record(data,'routine',routine.date,'completed'),record(data,'fixed',fixed.date,'completed'),record(data,'protected',protectedBlock.date,'skipped'),record(data,'single',single.date,'skipped'),record(data,'work-series',calendarSeries.date,'completed')];
 const repo=new StatisticsRepository(data);
 assert.deepEqual(repo.getStatisticsActivities().map(activity=>activity.id),['routine']);
 const daily=repo.getDailyStatistics(routine.date);
 assert.deepEqual([daily.total,daily.completed,daily.skipped],[1,1,0]);
});

test('activity heatmap: zero differs from unrecorded; pending occurrences stay in denominator',()=>{
 const data=archive([item('a'),item('b')]);
 data.history=[record(data,'a','2026-09-21','skipped')];
 let day=new StatisticsRepository(data).getActivityYearStatistics('a',2026,'2026-09-23').days.find(day=>day.date==='2026-09-21');
 assert.equal(day.state,'recorded');assert.equal(day.percent,0);assert.equal(day.pending,1);
 data.history.push(record(data,'a','2026-09-21','completed'));
 day=new StatisticsRepository(data).getActivityYearStatistics('a',2026,'2026-09-23').days.find(day=>day.date==='2026-09-21');
 assert.equal(day.percent,50);
});

test('series totals count the chosen target once, including confirmed future steps and repeated journeys',()=>{
 const draft={title:'Palestra',motivation:'',icon:'sport',color:'purple',stepTarget:3,startsOn:'2026-10-05',weekdays:[0,2,4],start:'18:00',durationMinutes:60};
 const data={...archive([]),...createHabit(c.emptyCalendar(),[],draft,{habitId:'gym'})};
 const stats=(year=2026)=>new StatisticsRepository(reconcileHabitCompletion(data)).getActivityYearStatistics('gym-0',year,'2026-10-08');
 const complete=(date,habitId='gym')=>{
  const event=c.occurrences(data.calendar.items,date,date).find(event=>event.habitId===habitId);
  data.history.push(a.outcomeRecord(data.calendar,event,'completed'));
  data.calendar=c.setOccurrenceOutcome(data.calendar,event.sourceId,event.occurrenceDate,'completed');
 };
 assert.equal(stats().completedSeries,0);
 complete('2026-10-05');complete('2026-10-07');
 assert.equal(stats().completedSeries,0);
 complete('2026-10-09');
 assert.equal(stats().completedSeries,1);
 assert.equal(stats().completed,2);
 assert.equal(stats().futureCompleted,1);
 complete('2026-10-09');
 assert.equal(stats().completedSeries,1,'Repeated writes do not create another series');
 const last=data.history.at(-1);
 data.history.push({...last,id:'skipped-correction',outcome:'skipped'});
 assert.equal(stats().completedSeries,1,'An outcome correction keeps the series concluded');
 data.history.push({...last,id:'completed-correction'});
 Object.assign(data,createHabit(data.calendar,data.habits,{...draft,startsOn:'2026-10-12',start:'20:00'},{habitId:'repeat'}));
 complete('2026-10-12','repeat');complete('2026-10-14','repeat');complete('2026-10-16','repeat');
 assert.equal(stats().completedSeries,2,'Separate completed journeys with the same title count separately');
 assert.equal(stats(2027).completedSeries,0);
 assert.equal(new StatisticsRepository(archive([item('routine')])).getActivityYearStatistics('routine',2026).completedSeries,null);
});

test('a series spanning years belongs to the year of its final step',()=>{
 const draft={title:'Palestra',motivation:'',icon:'sport',color:'purple',stepTarget:2,startsOn:'2026-12-28',weekdays:[0],start:'18:00',durationMinutes:60};
 const data={...archive([]),...createHabit(c.emptyCalendar(),[],draft,{habitId:'gym'})};
 for(const date of ['2026-12-28','2027-01-04']){
  const event=c.occurrences(data.calendar.items,date,date)[0];
  data.history.push(a.outcomeRecord(data.calendar,event,'completed'));
  data.calendar=c.setOccurrenceOutcome(data.calendar,event.sourceId,event.occurrenceDate,'completed');
 }
 const repo=new StatisticsRepository(reconcileHabitCompletion(data));
 assert.equal(repo.getActivityYearStatistics('gym-0',2026,'2027-01-04').completedSeries,0);
 assert.equal(repo.getActivityYearStatistics('gym-0',2027,'2027-01-04').completedSeries,1);
});
