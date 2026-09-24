const {test}=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const {StatisticsRepository}=require(join(process.env.CALENDAR_TEST_BUILD,'repository/StatisticsRepository.js'));
const c=require(join(process.env.CALENDAR_TEST_BUILD,'domain/calendar.js'));
const a=require(join(process.env.CALENDAR_TEST_BUILD,'domain/outcomeArchive.js'));
const item=(id,date='2026-09-21',patch={})=>({id,title:'Palestra',date,endDate:date,start:'09:00',end:'10:00',kind:'flexible',status:'todo',notes:'',exceptions:{},...patch});
const archive=(items,history=[])=>({format:'time-planner-backup',version:1,calendar:{...c.emptyCalendar(),items},history});
function record(state,sourceId,date,outcome){const entry=c.occurrences(state.calendar.items,date,date).find(value=>value.sourceId===sourceId);return a.outcomeRecord(state.calendar,entry,outcome);}

test('weekly statistics: groups repeated activities, seven days, outcomes and unrecorded appointments',()=>{
 const mon=item('mon'),wed=item('wed','2026-09-23',{title:'  PALESTRA  '}),sun=item('sun','2026-09-27'),next=item('next','2026-09-28');
 const data=archive([mon,wed,sun,next]);
 data.history=[record(data,'mon',mon.date,'completed'),record(data,'wed',wed.date,'partial')];
 const repo=new StatisticsRepository(data),stats=repo.getWeeklyStatistics(mon,'2026-09-24');
 assert.deepEqual([stats.from,stats.through],['2026-09-21','2026-09-27']);
 assert.deepEqual([stats.total,stats.completed,stats.partial,stats.skipped,stats.pending,stats.recorded,stats.completionRate],[3,1,1,0,1,2,50]);
 assert.equal(stats.days.length,7);assert.equal(stats.days[0].completed,1);assert.equal(stats.days[6].pending,1);
 assert.equal(repo.getWeeklyActivities('2026-09-24').length,1);
 assert.equal(repo.getWeeklyStatistics(mon,'2026-09-28').total,1);
});

test('weekly statistics: last correction wins globally before filtering dates; historical deletion is retained',()=>{
 const event=item('work'),data=archive([event]);
 const first=record(data,event.id,event.date,'completed');
 data.history=[first,{...first,id:'correction',outcome:'skipped'},{...first,id:'moved',eventDate:'2026-09-28',outcome:'partial'}];
 const repo=new StatisticsRepository(data);
 assert.equal(repo.getWeeklyStatistics(event,'2026-09-21').total,0);
 const stats=repo.getWeeklyStatistics(event,'2026-09-28');assert.equal(stats.total,1);assert.equal(stats.partial,1);
 const deleted=new StatisticsRepository(archive([],data.history)).getWeeklyStatistics(event,'2026-09-28');
 assert.equal(deleted.partial,1);assert.equal(deleted.pending,0);
});

test('weekly statistics: shared activity IDs, moved and deleted recurrences, overnight counted on start day',()=>{
 const mon=item('mon','2026-09-21',{activityId:'gym',recurrence:{},exceptions:{'2026-09-28':{...item('patch','2026-09-29'),title:'Palestra spostata'}}});
 const wed=item('wed','2026-09-23',{title:'Pesi',activityId:'gym',recurrence:{},exceptions:{'2026-09-30':null}});
 const overnight=item('night','2026-09-27',{start:'23:00',endDate:'2026-09-28',end:'01:00'});
 const repo=new StatisticsRepository(archive([mon,wed,overnight]));
 const stats=repo.getWeeklyStatistics(mon,'2026-09-30');assert.equal(stats.total,1);assert.equal(stats.days[1].pending,1);
 assert.equal(repo.getWeeklyActivities('2026-09-30').length,1);
 assert.equal(repo.getWeeklyStatistics(mon,'2026-09-27').total,3);
});

test('weekly statistics: year and daylight-saving boundaries, invalid dates and empty weeks',()=>{
 const event=item('a','2026-12-31'),repo=new StatisticsRepository(archive([event]));
 const year=repo.getWeeklyStatistics(event,'2027-01-01');
 assert.deepEqual([year.from,year.through],['2026-12-28','2027-01-03']);assert.equal(year.total,1);
 const dst=repo.getWeeklyStatistics(event,'2026-10-25');assert.equal(dst.days.length,7);assert.equal(dst.total,0);assert.equal(dst.completionRate,null);
 assert.deepEqual(dst.days.map(day=>day.date),['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
 assert.throws(()=>repo.getWeeklyStatistics(event,'2026-02-30'),/Data non valida/);
 assert.throws(()=>repo.getWeeklyActivities('invalid'),/Data non valida/);
});

test('weekly statistics: a renamed source retains its own audit without attributing it to another activity',()=>{
 const original=item('renamed'),data=archive([original]);
 const oldRecord=record(data,original.id,original.date,'completed');
 const renamed={...original,title:'Allenamento'},different=item('other','2026-09-23');
 const repo=new StatisticsRepository(archive([renamed,different],[oldRecord]));
 assert.equal(repo.getWeeklyStatistics(renamed,'2026-09-21').completed,1);
 assert.equal(repo.getWeeklyStatistics(different,'2026-09-21').completed,0);
 assert.equal(repo.getWeeklyActivities('2026-09-21').length,2);
});

test('daily statistics: segments preserve event colors and count appointments, not duration',()=>{
 const data=archive([item('a',undefined,{color:'green',icon:'sport'}),item('b',undefined,{color:'green',icon:'sport',end:'12:00'}),item('c',undefined,{color:'blue',icon:'sport'}),item('d',undefined,{title:'Lavoro',color:'green',icon:'work'}),item('tomorrow','2026-09-22')]);
 const stats=new StatisticsRepository(data).getDailyStatistics('2026-09-21');
 assert.equal(stats.total,4);assert.equal(stats.pending,4);
 assert.deepEqual(stats.activities.map(x=>[x.title,x.color,x.count]),[['Palestra','green',2],['Palestra','blue',1],['Lavoro','green',1]]);
 assert.equal(stats.activities.reduce((sum,x)=>sum+x.count,0),stats.total);
});

test('daily statistics: last correction wins, live colors override archived colors and deleted events remain',()=>{
 const event=item('a',undefined,{color:'blue'}),data=archive([event]);
 const first=record(data,event.id,event.date,'partial');
 data.history=[first,{...first,id:'last',outcome:'completed',recordedAt:'2026-10-01T12:00:00Z'}];
 data.calendar.items[0]={...event,color:'green'};
 const stats=new StatisticsRepository(data).getDailyStatistics(event.date);
 assert.equal(stats.total,1);assert.equal(stats.completed,1);assert.equal(stats.partial,0);assert.equal(stats.activities[0].color,'green');
 const deleted=new StatisticsRepository(archive([],data.history));
 assert.equal(deleted.getDailyStatistics(event.date).activities[0].color,'blue');
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
 assert.equal(repo.getDailyStatistics(event.date).total,0);assert.equal(repo.getDailyStatistics('2026-09-22').skipped,1);
 assert.deepEqual(repo.getDailyStatistics('2026-12-31').activities,[]);
 assert.throws(()=>repo.getDailyStatistics('2026-02-30'),/Data non valida/);
});

test('daily progress: denominator includes every planned appointment; colored contributions sum to completion',()=>{
 const data=archive([item('a',undefined,{color:'green'}),item('b',undefined,{color:'blue'}),item('c',undefined,{color:'purple'}),item('d',undefined,{color:'orange'})]);
 data.history=[record(data,'a','2026-09-21','completed'),record(data,'b','2026-09-21','partial'),record(data,'c','2026-09-21','skipped')];
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
