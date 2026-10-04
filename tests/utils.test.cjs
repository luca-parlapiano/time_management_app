const {test} = require('node:test');
const assert = require('node:assert/strict');
const {join} = require('node:path');
const utils = name => require(join(process.env.CALENDAR_TEST_BUILD, 'utils', `${name}.js`));
const {isFiniteNumber, isPositiveNumber, isIntegerInRange, isNonNegativeSafeInteger} = utils('numbers');
const {clamp, percentage, positiveModulo} = utils('math');
const {toMinutes, toTime, formatTimeWithMeridiem, greetingForHour} = utils('time');
const {validDate, addDays, weekStart} = utils('dates');

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
  assert.equal(formatTimeWithMeridiem('00:00'),'12:00 AM');
  assert.equal(formatTimeWithMeridiem('13:05'),'1:05 PM');
  assert.equal(formatTimeWithMeridiem('invalid'),'invalid');
  assert.equal(formatTimeWithMeridiem('Infinity:00'),'Infinity:00');
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
