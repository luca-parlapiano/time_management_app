const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { RepositoryDB } = require(join(process.env.CALENDAR_TEST_BUILD, 'repository/RepositoryDB.js'));
const { emptyCalendar } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/calendar.js'));
const emptyArchive = () => ({ format: 'time-planner-backup', version: 2, calendar: emptyCalendar(), habits: [], history: [] });

test('confirmed snapshots keep calendar, statistics and dashboard aligned across reopen, import and correction', async () => {
  const { createHabit } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habits.js'));
  const { occurrences, setOccurrenceOutcome } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/calendar.js'));
  const { outcomeRecord } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/outcomeArchive.js'));
  const { StatisticsRepository } = require(join(process.env.CALENDAR_TEST_BUILD, 'repository/StatisticsRepository.js'));
  const created = createHabit(emptyCalendar(), [], { title:'Lettura',motivation:'',icon:'study',color:'green',stepTarget:1,startsOn:'2026-10-05',weekdays:[0],start:'22:00',durationMinutes:30 }, {habitId:'reading'});
  const entry = occurrences(created.calendar.items, '2026-10-05', '2026-10-05')[0];
  const completed = { ...emptyArchive(), ...created,
    calendar: setOccurrenceOutcome(created.calendar, entry.sourceId, entry.occurrenceDate, 'completed'),
    history: [outcomeRecord(created.calendar, entry, 'completed')],
  };
  let stored = { archive: completed, revision: 4, previous: structuredClone(completed) };
  const before = structuredClone(stored);
  let writes = 0;
  const repository = new RepositoryDB(() => ({
    read: async () => structuredClone(stored),
    write: async input => {
      assert.equal(input.expectedRevision, stored.revision);
      writes++;
      stored = { archive: structuredClone(input.archive), revision: stored.revision + 1, previous: input.replace ? stored.archive : stored.previous };
      return structuredClone(stored);
    },
    reset: async revision => {
      assert.equal(revision, stored.revision);
      stored = { archive: emptyArchive(), revision: revision + 1, previous: null };
      return structuredClone(stored);
    },
  }));
  const loaded = await repository.initialize();
  assert.equal(writes, 0);
  assert.deepEqual(stored, before);
  assert.equal(loaded.previous.calendar.items[0].habitClosedOn, '2026-10-05');
  const stats = new StatisticsRepository(loaded.archive);
  assert.equal(occurrences(loaded.archive.calendar.items, '2026-10-12', '2026-10-12').length, 0);
  assert.equal(stats.getDailyStatistics('2026-10-12').total, 0);
  assert.equal(stats.getActivityYearStatistics(entry.sourceId, 2026, '2026-10-12').days.find(day => day.date === '2026-10-12').total, 0);
  assert.equal(stats.getHabitDashboard('2026-10-12', '23:00').totalHabits, 0);
  const candidate = await repository.prepareImport(await repository.exportBackup(loaded.archive));
  assert.equal(Object.hasOwn(candidate.calendar.items[0], 'habitClosedOn'), false);
  const imported = await repository.save({ archive: candidate, expectedRevision: loaded.revision, replace: true });
  assert.equal(imported.archive.calendar.items[0].habitClosedOn, '2026-10-05');
  assert.equal(imported.previous.calendar.items[0].habitClosedOn, '2026-10-05');
  const corrected = { ...imported.archive,
    calendar: setOccurrenceOutcome(imported.archive.calendar, entry.sourceId, entry.occurrenceDate, 'skipped'),
    history: [...imported.archive.history, outcomeRecord(imported.archive.calendar, entry, 'skipped')],
  };
  const reopened = await repository.save({ archive: corrected, expectedRevision: imported.revision });
  assert.equal(Object.hasOwn(reopened.archive.calendar.items[0], 'habitClosedOn'), true);
  assert.equal(imported.archive.calendar.items[0].habitClosedOn, '2026-10-05');
  assert.equal(reopened.previous.calendar.items[0].habitClosedOn, '2026-10-05');
  assert.equal(reopened.archive.history.length, 2);
  const reopenedStats = new StatisticsRepository(reopened.archive);
  assert.equal(occurrences(reopened.archive.calendar.items, '2026-10-12', '2026-10-12').length, 0);
  assert.equal(reopenedStats.getDailyStatistics('2026-10-12').pending, 0);
  assert.equal(reopenedStats.getHabitDashboard('2026-10-12', '23:00').featured, null);
  assert.equal(reopenedStats.getHabitDashboard('2026-10-12', '23:00').totalHabits, 0);
  assert.deepEqual((await repository.initialize()).archive, reopened.archive);
  const reset = await repository.reset(reopened.revision);
  assert.deepEqual(reset.archive, emptyArchive());
  assert.equal(reset.previous, null);
  assert.equal(reset.revision, reopened.revision + 1);
});

test('repository initializes once through the bridge and preserves data on reopening without browser storage', async () => {
  let saved = null;
  let writes = 0;
  const repository = new RepositoryDB(() => ({
    read: async () => structuredClone(saved),
    write: async input => {
      assert.equal(input.expectedRevision, null);
      writes++;
      saved = { archive: structuredClone(input.archive), revision: 0, previous: null };
      return structuredClone(saved);
    },
  }));
  assert.deepEqual(await repository.initialize(), { archive: emptyArchive(), revision: 0, previous: null });
  // Simula dati già confermati da SQLite: riaprire non deve azzerare archivio, copia o revisione.
  saved.archive.calendar.profile = { name: 'Profilo salvato', notes: 'Da conservare' };
  saved.previous = emptyArchive();
  saved.revision = 8;
  assert.deepEqual(await repository.initialize(), saved);
  assert.equal(writes, 1);
});

test('repository rejects unavailable, unreadable or invalid databases without initializing over them', async () => {
  await assert.rejects(new RepositoryDB(() => undefined).initialize(), /desktop/);
  let writes = 0;
  const write = async () => { writes++; throw new Error('Unexpected write'); };
  await assert.rejects(new RepositoryDB(() => ({
    read: async () => { throw new Error('Database unavailable'); }, write,
  })).initialize(), /Database unavailable/);
  await assert.rejects(new RepositoryDB(() => ({
    read: async () => ({ archive: { ...emptyArchive(), version: 99 }, revision: 1, previous: null }), write,
  })).initialize(), /Formato di backup/);
  assert.equal(writes, 0);
});

test('repository surfaces first-write failure and can initialize successfully on retry', async () => {
  let fail = true;
  const repository = new RepositoryDB(() => ({
    read: async () => null,
    write: async input => {
      if (fail) throw new Error('Disk failure');
      return { archive: input.archive, revision: 0, previous: null };
    },
  }));
  await assert.rejects(repository.initialize(), /Disk failure/);
  fail = false;
  assert.deepEqual((await repository.initialize()).archive, emptyArchive());
});

test('repository forwards palette operations and surfaces failed writes', async () => {
  let palette='natural';
  const repository=new RepositoryDB(()=>({
    readPalette:async()=>palette,
    writePalette:async value=>{
      if(value==='night') throw new Error('Disk failure');
      palette=value;
      return palette;
    },
  }));
  assert.equal(await repository.loadPalette(),'natural');
  await repository.savePalette('studio');
  assert.equal(await repository.loadPalette(),'studio');
  await assert.rejects(repository.savePalette('night'),/Disk failure/);
  assert.equal(await repository.loadPalette(),'studio');
});

test('saving to an already running worker omits derived closure fields and restores the confirmed closed state', async () => {
  const { createHabit } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habits.js'));
  const { reconcileHabitCompletion } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/habitCompletion.js'));
  const { occurrences, setOccurrenceOutcome } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/calendar.js'));
  const { outcomeRecord, exportArchive } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/outcomeArchive.js'));
  const created = createHabit(emptyCalendar(), [], { title:'Lettura',motivation:'',icon:'study',color:'green',stepTarget:1,startsOn:'2026-10-05',weekdays:[0],start:'22:00',durationMinutes:30 }, {habitId:'reading'});
  const entry = occurrences(created.calendar.items, '2026-10-05', '2026-10-05')[0];
  const archive = reconcileHabitCompletion({ ...emptyArchive(), ...created,
    calendar: setOccurrenceOutcome(created.calendar, entry.sourceId, entry.occurrenceDate, 'completed'),
    history: [outcomeRecord(created.calendar, entry, 'completed')],
  });
  const before = structuredClone(archive);
  let stored;
  const repository = new RepositoryDB(() => ({
    write: async input => {
      assert.equal(input.expectedRevision, 7);
      assert.equal(input.replace, false);
      // Simula il validatore precedente, ancora caricato dal worker Electron.
      if (input.archive.calendar.items.some(item => Object.hasOwn(item, 'habitClosedOn'))) throw new Error('Attività: campo non previsto “habitClosedOn”.');
      stored = structuredClone(input.archive);
      return {archive: stored, revision: 8, previous: null};
    },
  }));
  const saved = await repository.save({archive, expectedRevision:7, replace:false});
  assert.equal(saved.revision, 8);
  assert.equal(occurrences(saved.archive.calendar.items, '2026-10-06', '2027-01-01').length, 0);
  assert.deepEqual(stored.history, archive.history);
  assert.deepEqual(archive, before);
  assert.equal(JSON.stringify(stored).includes('habitClosedOn'), false);
  assert.equal(exportArchive(archive).includes('habitClosedOn'), false);
  const broken = new RepositoryDB(() => ({write: async () => {throw new Error('Disk failure');}}));
  await assert.rejects(broken.save({archive, expectedRevision:7}), /Disk failure/);
});

test('repository converts outcomes from an older running worker without mutating its snapshot', async () => {
  const item={id:'old',title:'Test',date:'2026-10-08',endDate:'2026-10-08',start:'10:00',end:'11:00',kind:'flexible',notes:'',exceptions:{},outcomes:{'2026-10-08':'partial'}};
  const old={...emptyArchive(),calendar:{...emptyCalendar(),items:[item]},history:[{id:'old-result',sourceId:'old',activityId:'old',occurrenceDate:item.date,eventDate:item.date,title:item.title,icon:'sport',color:'green',outcome:'partial',recordedAt:null}]};
  const original=structuredClone(old);
  const repo=new RepositoryDB(()=>({read:async()=>({archive:old,previous:old,revision:7})}));
  const loaded=await repo.initialize();
  assert.equal(loaded.archive.history[0].outcome,'skipped');
  assert.equal(loaded.archive.calendar.items[0].outcomes[item.date],'skipped');
  assert.equal(loaded.previous.history[0].outcome,'skipped');
  assert.equal(loaded.revision,7);
  assert.deepEqual(old,original);
});
