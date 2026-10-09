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
import { createHabit } from '../dist-electron/src/domain/habits.js';
import { outcomeRecord, latestOutcomes, parseArchive, exportArchive } from '../dist-electron/src/domain/outcomeArchive.js';
const item = { id:'first',title:'Palestra',date:'2026-09-22',endDate:'2026-09-22',start:'09:00',end:'10:00',kind:'flexible',notes:'',exceptions:{} };
const initial = () => ({format:'time-planner-backup',version:2,calendar:{...emptyCalendar(),items:[item]},habits:[],history:[]});

test('SQLite: persistence, audit corrections, backup, import recovery and stale revisions', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-sqlite-')); const filename=join(dir,'agenda.sqlite'); let store;
 try {
  store=new SQLiteStore(filename); assert.equal(store.read(),null);
  let saved=store.write({archive:initial(),expectedRevision:null});
  const occurrence=occurrences(saved.archive.calendar.items,item.date,item.date)[0];
  for(const outcome of ['skipped','completed','skipped']) {
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

test('SQLite reset clears all app data, prior import and palette atomically', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-reset-'));const filename=join(dir,'agenda.sqlite');let store=new SQLiteStore(filename);
 try {
  const base={...emptyCalendar(),profile:{name:'Luca',notes:''},goals:[{id:'goal',name:'Salute'}]};
  const created=createHabit(base,[],{title:'Lettura',motivation:'',icon:'study',color:'teal',stepTarget:5,startsOn:'2026-09-28',weekdays:[0],start:'13:00',durationMinutes:20},{habitId:'habit'});
  const calendar={...created.calendar,items:[...created.calendar.items,item]};
  const occurrence=occurrences(calendar.items,item.date,item.date)[0];
  const archive={...initial(),calendar,habits:created.habits,history:[outcomeRecord(calendar,occurrence,'completed')]};
  let saved=store.write({archive,expectedRevision:null});
  saved=store.write({archive,expectedRevision:saved.revision,replace:true});
  store.writePalette('night');
  const before=store.read();
  assert.throws(()=>store.reset(saved.revision-1),/altra finestra/);
  assert.deepEqual(store.read(),before);
  assert.equal(store.readPalette(),'night');
  const fault=new DatabaseSync(filename);
  fault.exec("CREATE TRIGGER fail_reset BEFORE DELETE ON activities BEGIN SELECT RAISE(ABORT,'injected reset failure'); END");
  fault.close();
  assert.throws(()=>store.reset(saved.revision),/injected reset failure/);
  assert.deepEqual(store.read(),before);
  assert.equal(store.readPalette(),'night');
  const repair=new DatabaseSync(filename);repair.exec('DROP TRIGGER fail_reset');repair.close();
  const reset=store.reset(saved.revision);
  assert.equal(reset.revision,saved.revision+1);
  assert.deepEqual(reset.archive,{format:'time-planner-backup',version:2,calendar:emptyCalendar(),habits:[],history:[]});
  assert.equal(reset.previous,null);
  assert.equal(store.readPalette(),'natural');
  store.close();store=new SQLiteStore(filename);
  assert.deepEqual(store.read(),reset);
  assert.equal(store.readPalette(),'natural');
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
  const reset=await service.reset(1);
  assert.deepEqual(reset.archive.calendar,emptyCalendar());
  assert.equal((await service.read()).revision,2);
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

test('SQLite upgrades a version 1 database with an empty habits table', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-migration-'));const filename=join(dir,'agenda.sqlite');let store;
 try {
  const legacy=new DatabaseSync(filename);
  legacy.exec(`CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE activities (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE goals (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE outcome_records (id TEXT PRIMARY KEY, sequence INTEGER UNIQUE NOT NULL, source_id TEXT NOT NULL, activity_id TEXT NOT NULL, occurrence_date TEXT NOT NULL, event_date TEXT NOT NULL, title TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL, outcome TEXT NOT NULL, recorded_at TEXT);
    PRAGMA user_version = 1;`);
  legacy.close();
  store=new SQLiteStore(filename);
  assert.equal(store.read(),null);
  store.close();store=undefined;
  const migrated=new DatabaseSync(filename);
  assert.equal(migrated.prepare('PRAGMA user_version').get().user_version,4);
  assert.ok(migrated.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='habits'").get());
  migrated.close();
 } finally {store?.close();rmSync(dir,{recursive:true,force:true});}
});

test('SQLite version 3 migration removes legacy habits and their linked appointments', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-habits-v3-'));const filename=join(dir,'agenda.sqlite');let store;
 try {
  const legacy=new DatabaseSync(filename);
  legacy.exec(`CREATE TABLE activities (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE TABLE habits (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
    PRAGMA user_version = 2;`);
  const oldItem={...item,id:'old-habit-0',activityId:'old-habit',habitId:'old-habit',habitPlanId:'old-plan',recurrence:{}};
  const oldHabit={id:'old-habit',title:'Vecchia abitudine',notes:'',icon:'study',color:'teal',status:'active',plans:[]};
  legacy.prepare('INSERT INTO activities VALUES (?,?,?)').run(oldItem.id,0,JSON.stringify(oldItem));
  legacy.prepare('INSERT INTO habits VALUES (?,?,?)').run(oldHabit.id,0,JSON.stringify(oldHabit));
  legacy.close();
  store=new SQLiteStore(filename);store.close();store=undefined;
  const migrated=new DatabaseSync(filename);
  assert.equal(migrated.prepare('PRAGMA user_version').get().user_version,4);
  assert.equal(migrated.prepare('SELECT count(*) AS total FROM activities').get().total,0);
  assert.equal(migrated.prepare('SELECT count(*) AS total FROM habits').get().total,0);
  migrated.close();
 } finally {store?.close();rmSync(dir,{recursive:true,force:true});}
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
   {...item,id:'series',recurrence:{},status:'todo',outcomes:{'2026-09-29':'skipped'},completedDates:{'2026-09-22':true,'2026-09-29':true,'2026-10-06':false},exceptions:{
    '2026-09-29':{...Object.fromEntries(Object.entries(item).filter(([key])=>!['id','exceptions'].includes(key))),date:'2026-09-30',endDate:'2026-09-30',status:'skipped'},
    '2026-10-13':null,
   }},
  ]}};
  const historical={id:'audit',sourceId:'series',activityId:'series',occurrenceDate:'2026-09-29',eventDate:'2026-09-30',title:'Titolo storico',icon:'sport',color:'green',outcome:'skipped',recordedAt:null};
  legacy.history=[historical];
  const db=new DatabaseSync(filename);
  db.exec('DELETE FROM activities');
  for(const [index,entry] of legacy.calendar.items.entries()) db.prepare('INSERT INTO activities VALUES (?,?,?)').run(entry.id,index,JSON.stringify(entry));
  db.prepare('INSERT INTO outcome_records VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('audit',0,'series','series','2026-09-29','2026-09-30','Titolo storico','sport','green','skipped',null);
  db.prepare('UPDATE metadata SET value=? WHERE key=?').run(JSON.stringify(legacy),'previousImport');db.close();
  store.close();store=new SQLiteStore(filename);
  const recovered=store.read();
  assert.equal(recovered.revision,saved.revision);
  assert.deepEqual(recovered.archive.calendar.items[0].outcomes,{'2026-09-22':'completed'});
  assert.deepEqual(recovered.archive.calendar.items[1].outcomes,{'2026-09-22':'completed','2026-09-29':'skipped'});
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

test('SQLite: completed habits close on read and remain closed after reopening without losing audit', () => {
 const dir = mkdtempSync(join(tmpdir(), 'agenda-habit-completion-'));
 const filename = join(dir, 'agenda.sqlite');
 let store;
 try {
  store = new SQLiteStore(filename);
  const created = createHabit(emptyCalendar(), [], { title: 'Percorso finito', motivation: '', icon: 'gaming', color: 'green', stepTarget: 1, startsOn: '2026-10-05', weekdays: [0,1], start: '12:00', durationMinutes: 20 }, { habitId: 'closed' });
  const entry = occurrences(created.calendar.items, '2026-10-05', '2026-10-05')[0];
  const archive = { format: 'time-planner-backup', version: 2, ...created, history: [outcomeRecord(created.calendar, entry, 'completed')] };
  archive.calendar = setOccurrenceOutcome(archive.calendar, entry.sourceId, entry.occurrenceDate, 'completed');
  const saved = store.write({ archive, expectedRevision: null });
  assert.equal(saved.archive.history.length, 1);
  assert.equal(occurrences(saved.archive.calendar.items, '2026-10-06', '2027-12-31').length, 0);
  store.close();
  store = new SQLiteStore(filename);
  assert.deepEqual(store.read(), JSON.parse(JSON.stringify(saved)));
  const db = new DatabaseSync(filename);
  assert.equal(db.prepare("SELECT count(*) AS count FROM activities WHERE json_type(data, '$.habitClosedOn') IS NOT NULL").get().count, 0);
  db.exec("UPDATE activities SET data = json_remove(data, '$.habitClosedOn')");
  db.close();
  const legacy = store.read();
  assert.deepEqual(legacy, JSON.parse(JSON.stringify(saved)));
  assert.equal(legacy.revision, saved.revision);
 } finally { store?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('SQLite v4 converts legacy outcomes atomically and preserves audit, previous import and revision', () => {
 const dir=mkdtempSync(join(tmpdir(),'agenda-binary-')),filename=join(dir,'agenda.sqlite');let store;
 try {
  store=new SQLiteStore(filename);
  const saved=store.write({archive:initial(),expectedRevision:null});
  store.close();store=undefined;
  const legacy={...initial(),calendar:{...emptyCalendar(),items:[{...item,notes:'partial is a note, not an outcome',outcomes:{[item.date]:'partial'}}]},history:[]};
  const entry={id:'old-result',sourceId:item.id,activityId:item.id,occurrenceDate:item.date,eventDate:item.date,title:item.title,icon:'sport',color:'green',outcome:'partial',recordedAt:null};
  legacy.history=[{...entry,id:'first-result',outcome:'completed'},entry];
  const db=new DatabaseSync(filename);
  db.exec(`DROP TABLE outcome_records;
    CREATE TABLE outcome_records (id TEXT PRIMARY KEY, sequence INTEGER UNIQUE NOT NULL, source_id TEXT NOT NULL, activity_id TEXT NOT NULL, occurrence_date TEXT NOT NULL, event_date TEXT NOT NULL, title TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL, outcome TEXT NOT NULL, recorded_at TEXT);
    PRAGMA user_version = 3;`);
  db.prepare('UPDATE activities SET data=? WHERE id=?').run(JSON.stringify(legacy.calendar.items[0]),item.id);
  for(const [i,r] of legacy.history.entries())db.prepare('INSERT INTO outcome_records VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(r.id,i,r.sourceId,r.activityId,r.occurrenceDate,r.eventDate,r.title,r.icon,r.color,r.outcome,r.recordedAt);
  db.prepare('UPDATE metadata SET value=? WHERE key=?').run(JSON.stringify(legacy),'previousImport');db.close();
  const untouched=structuredClone(legacy);
  const imported=parseArchive(JSON.stringify(legacy));
  assert.deepEqual(imported.history.map(r=>r.outcome),['completed','skipped']);
  assert.equal(imported.calendar.items[0].outcomes[item.date],'skipped');
  assert.deepEqual(legacy,untouched);
  store=new SQLiteStore(filename);
  const migrated=store.read();
  assert.equal(migrated.revision,saved.revision);
  assert.deepEqual(migrated.archive,imported);
  assert.deepEqual(migrated.previous,imported);
  assert.equal(migrated.archive.calendar.items[0].notes,legacy.calendar.items[0].notes);
  store.close();store=new SQLiteStore(filename);
  assert.deepEqual(store.read(),migrated);
  const persisted=new DatabaseSync(filename);
  assert.equal(persisted.prepare('PRAGMA user_version').get().user_version,4);
  assert.deepEqual(persisted.prepare('SELECT outcome FROM outcome_records ORDER BY sequence').all().map(r=>r.outcome),['completed','skipped']);
  assert.equal(JSON.parse(persisted.prepare('SELECT data FROM activities').get().data).outcomes[item.date],'skipped');
  assert.throws(()=>persisted.prepare('UPDATE outcome_records SET outcome=?').run('partial'),/CHECK/);
  persisted.close();
 } finally {store?.close();rmSync(dir,{recursive:true,force:true});}
});
