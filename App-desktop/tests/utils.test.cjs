const {test} = require('node:test');
const assert = require('node:assert/strict');
const {join} = require('node:path');
const utils = name => require(join(process.env.CALENDAR_TEST_BUILD, 'utils', `${name}.js`));
const {isFiniteNumber, isPositiveNumber, isIntegerInRange, isNonNegativeSafeInteger} = utils('numbers');
const {clamp, percentage, positiveModulo} = utils('math');
const {normalizeTimeInput, toMinutes, toTime, greetingForHour} = utils('time');
const {validDate, addDays, weekStart} = utils('dates');
const {agendaTimePosition} = utils('agendaTimeline');
const {buildCalendarTimeline, calendarTimelineOffset} = utils('calendarTimeline');

test('compact hourly grid preserves short headers without inflating a nine-hour event', () => {
  const ranges = [{start:540,end:1080},{start:1080,end:1140},{start:1140,end:1160},{start:1160,end:1165}];
  const timeline = buildCalendarTimeline(480,1200,ranges);
  const offset = minute => calendarTimelineOffset(minute,timeline);
  assert.equal(offset(1080)-offset(540),270);
  for (const range of ranges) assert.ok(offset(range.end)-offset(range.start)>=64);
  assert.ok(timeline.height<600);
  assert.ok(Math.abs(offset(720)-120)<1e-9);
  assert.ok(offset(1020)>offset(540)&&offset(1020)<offset(1080));
  assert.equal(offset(0),0);
  assert.equal(offset(1440),timeline.height);
});

test('compact hourly scale is shared across days and independent of event ordering or duplicates', () => {
  const ranges = [{start:540,end:1080},{start:570,end:575},{start:600,end:660},{start:590,end:605}];
  const timeline = buildCalendarTimeline(480,1200,ranges);
  assert.deepEqual(buildCalendarTimeline(480,1200,[...ranges].reverse()),timeline);
  assert.deepEqual(buildCalendarTimeline(480,1200,[...ranges,...ranges]),timeline);
  for (const range of ranges) {
    assert.ok(calendarTimelineOffset(range.end,timeline)-calendarTimelineOffset(range.start,timeline)>=64);
  }
  for (let minute=481;minute<=1200;minute++) {
    assert.ok(calendarTimelineOffset(minute,timeline)>calendarTimelineOffset(minute-1,timeline));
  }
});

test('compact hourly scale handles empty days, midnight and clipped multi-day events', () => {
  const empty = buildCalendarTimeline(0,1440,[]);
  assert.equal(empty.height,720);
  assert.equal(calendarTimelineOffset(720,empty),360);
  const night = buildCalendarTimeline(0,1440,[{start:-60,end:30},{start:1435,end:1500},{start:60,end:60}]);
  assert.equal(calendarTimelineOffset(30,night),64);
  assert.equal(night.height-calendarTimelineOffset(1435,night),64);
});

test('agenda clock follows the active card despite unequal event durations and card heights', () => {
  const slots = [
    {start:540,end:1080,top:30,bottom:170},
    {start:1080,end:1140,top:178,bottom:318},
    {start:1140,end:1160,top:326,bottom:526},
  ];
  const position = time => agendaTimePosition(toMinutes(time),480,1200,556,slots);
  assert.equal(position('13:30'),100);
  assert.equal(position('18:30'),248);
  assert.equal(position('19:10'),426);
  assert.ok(position('17:00') < slots[0].bottom);
  assert.equal(position('08:00'),0);
  assert.equal(position('20:00'),556);
});

test('agenda clock interpolates idle time, resizes with cards and handles empty days', () => {
  const slots = [{start:540,end:600,top:30,bottom:130},{start:660,end:720,top:138,bottom:278}];
  assert.equal(agendaTimePosition(630,480,1200,308,slots),134);
  assert.equal(agendaTimePosition(630,480,1200,616,slots.map(slot=>({...slot,top:slot.top*2,bottom:slot.bottom*2}))),268);
  assert.equal(agendaTimePosition(840,480,1200,200,[]),100);
  assert.equal(agendaTimePosition(0,480,1200,200,[]),0);
  assert.equal(agendaTimePosition(1440,480,1200,200,[]),200);
  assert.equal(agendaTimePosition(15,0,1440,140,[{start:0,end:30,top:20,bottom:120}]),70);
});

test('numeric validation rejects coercion, non-finite values and unsafe revisions', () => {
  for (const value of ['12', '', null, undefined, true, {}, NaN, Infinity, -Infinity]) {
    assert.equal(isFiniteNumber(value), false);
    assert.equal(isIntegerInRange(value, 0, 12), false);
    assert.equal(isNonNegativeSafeInteger(value), false);
  }
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isPositiveNumber(0), false);
  assert.equal(isPositiveNumber(0.5), true);
  assert.equal(isIntegerInRange(1, 1, 5), true);
  assert.equal(isIntegerInRange(5, 1, 5), true);
  assert.equal(isIntegerInRange(1.5, 1, 5), false);
  assert.equal(isIntegerInRange(6, 1, 5), false);
  assert.equal(isNonNegativeSafeInteger(-1), false);
  assert.equal(isNonNegativeSafeInteger(0), true);
  assert.equal(isNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER + 1), false);
});

test('percentages preserve precision and over-target values; empty totals stay finite', () => {
  assert.ok(Math.abs(percentage(1, 3) - 100 / 3) < 1e-12);
  assert.equal(percentage(2, 4), 50);
  assert.equal(percentage(4, 4), 100);
  assert.equal(percentage(3, 2), 150);
  for (const [part,total] of [[0,0],[1,0],[NaN,2],[1,Infinity],[1,-1]]) assert.equal(percentage(part,total),0);
  assert.equal(clamp(-5,0,10),0);
  assert.equal(clamp(15,0,10),10);
  assert.equal(clamp(5,0,10),5);
  assert.equal(positiveModulo(-1,1440),1439);
});

test('clock conversions preserve midnight wrapping and formatting', () => {
  for (const value of ['00:00','09:05','12:30','23:59']) assert.equal(toTime(toMinutes(value)),value);
  assert.equal(toTime(-1),'23:59');
  assert.equal(toTime(1440),'00:00');
  assert.equal(toTime(1500),'01:00');
});

test('local greeting changes at morning, afternoon and evening boundaries', () => {
  for (const [hour, greeting] of [[0,'Buonasera'],[4,'Buonasera'],[5,'Buongiorno'],[11,'Buongiorno'],[12,'Buon pomeriggio'],[17,'Buon pomeriggio'],[18,'Buonasera'],[23,'Buonasera']]) {
    assert.equal(greetingForHour(hour), greeting);
  }
});

test('civil date helpers preserve leap dates, year rollover and daylight-saving boundaries', () => {
  assert.equal(validDate('2024-02-29'),true);
  for (const date of ['2026-02-29','2026-02-30','2026-13-01','23/09/2026',null]) assert.equal(validDate(date),false);
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.equal(addDays('2026-03-28',2),'2026-03-30');
  assert.equal(weekStart('2027-01-01'),'2026-12-28');
});


test('quick time input accepts compact typing and preserves precise minutes without wrapping invalid times', () => {
  for (const [input, expected] of [['1930','19:30'],['930','09:30'],['9:30','09:30'],['15:57','15:57'],['9','09:00'],['0','00:00'],['0000','00:00'],['2359','23:59'],[' 1930 ','19:30']]) {
    assert.equal(normalizeTimeInput(input), expected);
  }
  for (const input of ['', ' ', '24', '2400', '23:60', '1960', '-1', '9:', '9:3', '12345', '1.5', 'sera']) {
    assert.equal(normalizeTimeInput(input), undefined, input);
  }
});
