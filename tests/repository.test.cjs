const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { RepositoryDB } = require(join(process.env.CALENDAR_TEST_BUILD, 'repository/RepositoryDB.js'));
const { emptyCalendar } = require(join(process.env.CALENDAR_TEST_BUILD, 'domain/calendar.js'));
const emptyArchive = () => ({ format: 'time-planner-backup', version: 1, calendar: emptyCalendar(), habits: [], history: [] });

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
