// Run at /tests/database.browser.html with Vite. Only an in-memory test repository is used.
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingProvider } from '../src/providers/LoadingProvider';
import { DBProvider } from '../src/providers/DBProvider';
import { useDB } from '../src/hooks/useDB';
import { useLoading } from '../src/hooks/useLoading';
import { addDays, emptyCalendar, occurrences, today } from '../src/domain/calendar';
import { exportArchive, parseArchive, validateArchive } from '../src/domain/outcomeArchive';
import { RepositoryDB } from '../src/repository/RepositoryDB';
import type { DBContextValue, DBRepository, DatabaseBridge, DatabaseSnapshot, DatabaseWrite } from '../src/model/database';
import type { LoadingContextValue } from '../src/model/loading';
import type { CalendarItem } from '../src/model/calendar';
import type { Palette } from '../src/model/theme';
import App from '../src/App';
import '../src/styles.css';
import '../src/themes.css';

(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const testBridge = (bridge: Pick<DatabaseBridge, 'read' | 'write'>): DatabaseBridge => ({
 ...bridge, readPalette: async () => 'natural', writePalette: async value => value,
 reset: async () => { throw new Error('Unexpected reset'); },
});
let db: DBContextValue;
let loading: LoadingContextValue;
let initializeCount=0;
let gate: Promise<void> | null=null;
let rejectGate: ((error: Error)=>void) | null=null;
let failInitialization=true;
const date=today();
const item: CalendarItem={id:'test-activity',title:'Attività di prova',date,endDate:date,start:'09:00',end:'11:00',kind:'flexible',notes:'Solo dati di test',exceptions:{},recurrence:{until:date},routine:true,icon:'sport',color:'green'};
let saved: DatabaseSnapshot={archive:{format:'time-planner-backup',version:2,calendar:{...emptyCalendar(),items:[item]},habits:[],history:[]},revision:0,previous:null};
const repository: DBRepository={
 initialize:async()=>{initializeCount++;if(failInitialization)throw new Error('Simulated open failure');return structuredClone(saved);},
 loadPalette:async()=> 'natural', savePalette:async(_value: Palette)=>{},
 save:async(input: DatabaseWrite)=>{
  if(gate)await gate;
  if(saved.revision!==input.expectedRevision)throw new Error('Stale revision');
  validateArchive(input.archive);
  saved={archive:structuredClone(input.archive),revision:saved.revision+1,previous:input.replace?saved.archive:saved.previous};
  return structuredClone(saved);
 },
 reset:async expectedRevision=>{
  if(saved.revision!==expectedRevision)throw new Error('Stale revision');
  saved={archive:{format:'time-planner-backup',version:2,calendar:emptyCalendar(),habits:[],history:[]},revision:saved.revision+1,previous:null};
  return structuredClone(saved);
 },
 prepareImport:async text=>parseArchive(text),exportBackup:async archive=>exportArchive(archive),
};
function Probe(){db=useDB();loading=useLoading();return null;}
const results: string[]=[];
function check(value: unknown,message:string){if(!value)throw new Error(message);results.push(`PASS ${message}`);}
const root=createRoot(document.querySelector('#test-root')!);
try {
 await act(async()=>{root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><Probe/></DBProvider></LoadingProvider></StrictMode>);});
 check(initializeCount===1,'StrictMode initializes repository once');
 check(!db!.ready&&db!.error==='Simulated open failure'&&loading!.pending===0,'Initialization error releases blocking loading');
 failInitialization=false;
 await act(async()=>{await db.retry();});
 check(db!.ready&&db!.error===null,'Initialization retry succeeds');
 const weekday=(new Date(`${date}T00:00:00Z`).getUTCDay()+6)%7;
 await act(async()=>{await db.saveHabit({title:'Lettura',motivation:'Dati di prova',icon:'study',color:'teal',stepTarget:5,startsOn:date,weekdays:[weekday],start:'13:00',durationMinutes:20});});
 check(db!.habits.length===1&&db!.state.items.filter(entry=>entry.habitId===db!.habits[0].id).length===1,'Provider creates habit and linked calendar series atomically');
 const habitId=db!.habits[0].id;
 await act(async()=>{await db.updateHabit(habitId,{title:'Lettura serale',motivation:'Imparare con costanza',icon:'study',color:'teal',stepTarget:12,startsOn:date,weekdays:[weekday],start:'13:00',durationMinutes:20});});
check(db!.habits[0].title==='Lettura serale'&&db!.habits[0].stepTarget===12&&db!.state.items.some(entry=>entry.habitId===habitId&&entry.title==='Lettura serale'),'Provider updates habit and schedule atomically');
 const habitSource=db!.state.items.find(entry=>entry.habitId===db!.habits[0].id)!;
 const originalDate=addDays(date,7);
 const habitOccurrence=occurrences(db!.state.items,originalDate,originalDate).find(entry=>entry.sourceId===habitSource.id)!;
 const movedDate=addDays(originalDate,1);
 await act(async()=>{await db.saveItem({...habitSource,...habitOccurrence,id:habitSource.id,date:movedDate,endDate:movedDate},false,{sourceId:habitSource.id,occurrenceDate:originalDate,scope:'occurrence'});});
 check(occurrences(db!.state.items,movedDate,movedDate).some(entry=>entry.habitId===db!.habits[0].id&&entry.occurrenceDate===originalDate),'Provider saves a moved habit occurrence without changing its identity');
 let seriesRejected=false;
 await act(async()=>{try{await db.deleteItem({sourceId:habitSource.id,occurrenceDate:originalDate,scope:'series'},false);}catch{seriesRejected=true;}});
check(seriesRejected&&db!.state.items.some(entry=>entry.id===habitSource.id),'Provider rejects whole-series deletion while the habit still owns it');
 let finishFirst!:()=>void,finishSecond!:()=>void;
 await act(async()=>{finishFirst=loading.start({mode:'blocking',message:'First'});finishSecond=loading.start({mode:'blocking',message:'Second'});});
 check(loading!.pending===2&&loading!.blocking&&document.querySelector('dialog[open]'),'Overlapping operations show blocking dialog');
 await act(async()=>{finishFirst();finishFirst();});
 check(loading!.pending===1&&loading!.blocking,'Idempotent release keeps other operation loading');
 await act(async()=>{finishSecond();});
 check(loading!.pending===0&&!document.querySelector('dialog[open]'),'Last completion closes blocking dialog');
 let stop!:()=>void;
 await act(async()=>{stop=loading.start({mode:'silent',scope:'silent'});});
 check(loading!.pending===1&&!loading!.isLoading('silent')&&!loading!.blocking,'Silent loading has no visual indicator');
 await act(async()=>{stop();});
 const occurrence=occurrences(db!.state.items,date,date).find(entry=>entry.sourceId===item.id)!;
 await act(async()=>{await db.recordOutcome(occurrence,'partial');});
 check(db!.archive.history.length===1&&db!.state.items[0].outcomes?.[date]==='partial','Provider commits calendar and audit together');
 await act(async()=>{await db.recordOutcome(occurrence,'completed');});
 check(db!.archive.history.length===2&&loading!.pending===0,'Correction preserves history and releases loading');
 gate=new Promise<void>((_resolve,reject)=>{rejectGate=reject;});
 let pending!:Promise<void>, failure:unknown;
 await act(async()=>{pending=db.recordOutcome(occurrence,'skipped').catch(error=>{failure=error;});});
 check(db!.saving&&loading!.isLoading(`outcome:${occurrence.id}`)&&!loading!.blocking,'Local save is observable without blocking dialog');
 let duplicateRejected=false;
 await act(async()=>{try{await db.recordOutcome(occurrence,'skipped');}catch{duplicateRejected=true;}});
 check(duplicateRejected,'Concurrent save cannot overwrite state');
 await act(async()=>{rejectGate!(new Error('Simulated disk failure'));await pending;});
 gate=null;
 check(failure instanceof Error&&db!.archive.history.length===2&&!db!.saving&&loading!.pending===0,'Failed write leaves UI data intact and resets loading');
 const text=await db!.exportBackup();
 const candidate=await db!.prepareImport(text);
 check(candidate.history.length===2,'Backup is exported and validated through repository');
 await act(async()=>{await db.deleteHabit(habitId);});
 check(db!.habits.length===0&&db!.state.items.length===1&&db!.archive.history.length===2,'Provider deletes a habit and its schedule while retaining audit history');
 await act(async()=>{await db.importBackup(candidate);});
 check(db!.state.items.length===2&&db!.habits.length===1,'Import restores the habit after the deletion check');
 await act(async()=>{await db.clearCalendar();});
 check(db!.state.items.length===0&&db!.habits.length===0&&db!.archive.history.length===2,'Clearing calendar and habits retains audit');
 await act(async()=>{await db.importBackup(candidate);});
 check(db!.state.items.length===2&&db!.habits.length===1&&db!.previous?.calendar.items.length===0,'Import restores data and keeps prior archive');
 await act(async()=>{await db.resetAll();});
 check(db!.state.items.length===0&&db!.habits.length===0&&db!.archive.history.length===0&&db!.previous===null&&db!.palette==='natural','Reset clears archive, audit and prior import');
 await act(async()=>{await db.importBackup(candidate);});
 check(db!.state.items.length===2&&db!.archive.history.length===2,'An exported backup restores test data after reset');
 const bridgeRepository = new RepositoryDB(()=>testBridge({read:async()=>saved,write:async()=>{throw new Error('Unexpected initialization write');}}));
 check((await bridgeRepository.initialize()).revision===saved.revision,'Existing SQLite archive is loaded without rewriting it');
 let missingBridge=false;
 try {await new RepositoryDB(()=>undefined).initialize();}catch(error){missingBridge=String(error).includes('desktop');}
 check(missingBridge,'Missing Electron bridge fails explicitly');
 let initialized: DatabaseSnapshot | null = null;
 let writes = 0;
 const freshRepository = new RepositoryDB(() => testBridge({
  read: async () => initialized,
  write: async input => {
   check(input.expectedRevision === null, 'First initialization requires an uninitialized database');
   writes++;
   initialized = {archive: structuredClone(input.archive), revision: 0, previous: null};
   return initialized;
  },
 }));
 const fresh = await freshRepository.initialize();
 check(JSON.stringify(fresh.archive.calendar) === JSON.stringify(emptyCalendar()) && fresh.archive.history.length === 0 && fresh.previous === null,
  'First SQLite initialization creates an empty calendar and audit');
 await freshRepository.initialize();
 check(writes === 1, 'Reopening the initialized repository does not reset data');
 let readFailed = false;
 try {
  await new RepositoryDB(() => testBridge({read: async () => {throw new Error('Read failure');}, write: async () => {throw new Error('Unexpected write after read failure');}})).initialize();
 } catch (error) { readFailed = error instanceof Error && error.message === 'Read failure'; }
 check(readFailed, 'Read failure is surfaced without replacing the archive');
 let writeFailed = false;
 try {
  await new RepositoryDB(() => testBridge({read: async () => null, write: async () => {throw new Error('Write failure');}})).initialize();
 } catch (error) { writeFailed = error instanceof Error && error.message === 'Write failure'; }
 check(writeFailed, 'First initialization write failure is surfaced');
 results.push('ALL PROVIDER AND REPOSITORY TESTS PASSED');
 await act(async()=>{root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><App/></DBProvider></LoadingProvider></StrictMode>);});
} catch(error) {results.push(`FAIL ${error instanceof Error?error.stack:error}`);}
finally {document.querySelector('#results')!.textContent=results.join('\n');globalThis.IS_REACT_ACT_ENVIRONMENT=false;}
