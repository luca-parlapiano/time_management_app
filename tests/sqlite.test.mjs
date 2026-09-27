import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readStoredArchive } from '../dist-electron/electron/storedArchive.js';
import { SQLiteStore } from '../dist-electron/electron/sqliteStore.js';
import { DatabaseService } from '../dist-electron/electron/databaseService.js';
import { emptyCalendar, occurrences, setOccurrenceOutcome } from '../dist-electron/src/domain/calendar.js';
import { outcomeRecord, latestOutcomes, parseArchive, exportArchive } from '../dist-electron/src/domain/outcomeArchive.js';
const item = { id:'first',title:'Palestra',date:'2026-09-22',endDate:'2026-09-22',start:'09:00',end:'10:00',kind:'flexible',notes:'',exceptions:{} };
const initial = () => ({format:'time-planner-backup',version:1,calendar:{...emptyCalendar(),items:[item]},history:[]});

test('SQLite: persistence, audit corrections, backup, import recovery and stale revisions', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-sqlite-')); const filename=join(dir,'agenda.sqlite'); let store;
 try {
  store=new SQLiteStore(filename); assert.equal(store.read(),null);
  let saved=store.write({archive:initial(),expectedRevision:null});
  const occurrence=occurrences(saved.archive.calendar.items,item.date,item.date)[0];
  for(const outcome of ['partial','completed','skipped']) {
   const archive={...saved.archive,calendar:setOccurrenceOutcome(saved.archive.calendar,item.id,item.date,outcome),history:[...saved.archive.history,outcomeRecord(saved.archive.calendar,occurrence,outcome)]};
   saved=store.write({archive,expectedRevision:saved.revision});
  }
  store.close(); store=new SQLiteStore(filename);
  assert.deepEqual(store.read(),saved);
  assert.equal(saved.archive.history.length,3); assert.equal(latestOutcomes(saved.archive.history).length,1);
  assert.equal(latestOutcomes(saved.archive.history)[0].outcome,'skipped');
  assert.throws(()=>store.write({archive:initial(),expectedRevision:0}),/altra finestra/);
  assert.deepEqual(store.read(),saved);
  const backup=parseArchive(exportArchive(saved.archive));
  const replaced=store.write({archive:{...initial(),calendar:emptyCalendar()},expectedRevision:saved.revision,replace:true});
  assert.deepEqual(replaced.previous,backup);
  store.close(); store=new SQLiteStore(filename); assert.deepEqual(store.read(),replaced);
  saved=store.write({archive:backup,expectedRevision:replaced.revision,replace:true});
  assert.deepEqual(saved.archive,backup);
  const db=new DatabaseSync(filename); const columns=db.prepare('SELECT outcome,event_date,recorded_at FROM outcome_records').all();
  assert.equal(columns.length,3); assert.equal(columns[0].event_date,'2026-09-22'); assert.ok(columns[0].recorded_at); db.close();
  assert.equal(readFileSync(filename).subarray(0,15).toString(),'SQLite format 3');
 } finally {store?.close();rmSync(dir,{recursive:true,force:true});}
});

test('SQLite: actual transactional write failure rolls back calendar and history together', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-rollback-'));const filename=join(dir,'agenda.sqlite');const store=new SQLiteStore(filename);
 try {
  const saved=store.write({archive:initial(),expectedRevision:null});
  const db=new DatabaseSync(filename);db.exec("CREATE TRIGGER simulate_disk_failure BEFORE INSERT ON outcome_records BEGIN SELECT RAISE(ABORT,'injected failure'); END");db.close();
  const entry=occurrences(saved.archive.calendar.items,item.date,item.date)[0];
  const archive={...saved.archive,calendar:setOccurrenceOutcome(saved.archive.calendar,item.id,item.date,'completed'),history:[outcomeRecord(saved.archive.calendar,entry,'completed')]};
  assert.throws(()=>store.write({archive,expectedRevision:saved.revision}),/injected failure/);
  assert.deepEqual(store.read(),saved);
  assert.throws(()=>store.write({archive:{...initial(),history:[{}]},expectedRevision:saved.revision}),/Storico/);
  assert.deepEqual(store.read(),saved);
 } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('Worker service provides asynchronous SQLite access, concurrent requests and reopening', async () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-worker-'));const filename=join(dir,'agenda.sqlite');let service=new DatabaseService(filename);
 try {
  assert.equal(await service.read(),null);
  const initialWrite=service.write({archive:initial(),expectedRevision:null});assert.ok(initialWrite instanceof Promise);const saved=await initialWrite;
  const results=await Promise.allSettled([service.write({archive:initial(),expectedRevision:saved.revision}),service.write({archive:initial(),expectedRevision:saved.revision})]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected').length,1);
  await service.close();service=new DatabaseService(filename);
  assert.equal((await service.read()).revision,1);
 } finally {await service.close();rmSync(dir,{recursive:true,force:true});}
});

test('SQLite palette persists independently of archive replacement and rejects invalid values', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-palette-'));const filename=join(dir,'agenda.sqlite');let store=new SQLiteStore(filename);
 try {
  assert.equal(store.readPalette(),'natural');
  assert.equal(store.writePalette('night'),'night');
  assert.equal(store.read(),null);
  const saved=store.write({archive:initial(),expectedRevision:null});
  for(const invalid of ['unknown',null,{},42]) assert.throws(()=>store.writePalette(invalid),/Palette/);
  assert.equal(store.readPalette(),'night');
  assert.deepEqual(store.read(),saved);
  store.write({archive:{...initial(),calendar:emptyCalendar()},expectedRevision:saved.revision,replace:true});
  store.close();store=new SQLiteStore(filename);
  assert.equal(store.readPalette(),'night');
  assert.deepEqual(store.read().previous,saved.archive);
 } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('worker handles concurrent palette and calendar writes without losing either', async () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-worker-palette-'));const filename=join(dir,'agenda.sqlite');let service=new DatabaseService(filename);
 try {
  assert.equal(await service.readPalette(),'natural');
  const [saved,palette]=await Promise.all([service.write({archive:initial(),expectedRevision:null}),service.writePalette('studio')]);
  assert.equal(palette,'studio');
  await assert.rejects(service.writePalette('unsupported'),/Palette/);
  await service.close();service=new DatabaseService(filename);
  assert.equal(await service.readPalette(),'studio');
  assert.deepEqual(await service.read(),saved);
 } finally {await service.close();rmSync(dir,{recursive:true,force:true});}
});

test('SQLite: legacy saved fields recover on read, retain history and import undo, then persist on save', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-legacy-'));const filename=join(dir,'agenda.sqlite');let store=new SQLiteStore(filename);
 try {
  const saved=store.write({archive:initial(),expectedRevision:null});
  const legacy={...initial(),calendar:{...emptyCalendar(),items:[
   {...item,status:'completed'},
   {...item,id:'series',recurrence:{},status:'todo',outcomes:{'2026-09-29':'partial'},completedDates:{'2026-09-22':true,'2026-09-29':true,'2026-10-06':false},exceptions:{
    '2026-09-29':{...Object.fromEntries(Object.entries(item).filter(([key])=>!['id','exceptions'].includes(key))),date:'2026-09-30',endDate:'2026-09-30',status:'skipped'},
    '2026-10-13':null,
   }},
  ]}};
  const historical={id:'audit',sourceId:'series',activityId:'series',occurrenceDate:'2026-09-29',eventDate:'2026-09-30',title:'Titolo storico',icon:'sport',color:'green',outcome:'partial',recordedAt:null};
  legacy.history=[historical];
  const db=new DatabaseSync(filename);
  db.exec('DELETE FROM activities');
  for(const [index,entry] of legacy.calendar.items.entries()) db.prepare('INSERT INTO activities VALUES (?,?,?)').run(entry.id,index,JSON.stringify(entry));
  db.prepare('INSERT INTO outcome_records VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('audit',0,'series','series','2026-09-29','2026-09-30','Titolo storico','sport','green','partial',null);
  db.prepare('UPDATE metadata SET value=? WHERE key=?').run(JSON.stringify(legacy),'previousImport');db.close();
  store.close();store=new SQLiteStore(filename);
  const recovered=store.read();
  assert.equal(recovered.revision,saved.revision);
  assert.deepEqual(recovered.archive.calendar.items[0].outcomes,{'2026-09-22':'completed'});
  assert.deepEqual(recovered.archive.calendar.items[1].outcomes,{'2026-09-22':'completed','2026-09-29':'partial'});
  assert.deepEqual(recovered.archive.history[0],historical);
  assert.equal(recovered.archive.history.length,3);
  assert.deepEqual(recovered.previous,recovered.archive);
  assert.deepEqual(store.read(),recovered);
  assert.deepEqual(parseArchive(exportArchive(recovered.archive)),recovered.archive);
  const next=store.write({archive:recovered.archive,expectedRevision:recovered.revision});
  store.close();store=new SQLiteStore(filename);assert.deepEqual(store.read(),next);
  assert.throws(()=>store.write({archive:legacy,expectedRevision:next.revision}),/campo non previsto/);
 } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('SQLite: invalid legacy values and unrelated fields are rejected without changing input', () => {
 for(const fields of [{status:'unknown'}, {completedDates:{'2026-09-23':true}}, {completedDates:{'2026-09-22':'yes'}}, {unexpected:true}]) {
  const archive=initial();archive.calendar.items=[{...item,...fields}];
  const original=structuredClone(archive);
  assert.throws(()=>readStoredArchive(archive));
  assert.deepEqual(archive,original);
 }
 const archive=initial();archive.calendar.items=[{...item,status:'todo'}];
 const original=structuredClone(archive);
 assert.deepEqual(readStoredArchive(archive),initial());
 assert.deepEqual(archive,original);
});
