import { runMigrationTests } from "./legacyMigration.browser";
// Run at /tests/database.browser.html with Vite. Only an in-memory test repository is used.
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingProvider } from '../src/providers/LoadingProvider';
import { DBProvider } from '../src/providers/DBProvider';
import { useDB } from '../src/hooks/useDB';
import { useLoading } from '../src/hooks/useLoading';
import { emptyCalendar, occurrences, today } from '../src/domain/calendar';
import { exportArchive, parseArchive } from '../src/domain/outcomeArchive';
import { RepositoryDB } from '../src/repository/RepositoryDB';
import type { DBContextValue, DBRepository, DatabaseSnapshot, DatabaseWrite } from '../src/model/database';
import type { LoadingContextValue } from '../src/model/loading';
import type { CalendarItem } from '../src/model/calendar';
import type { Palette } from '../src/model/theme';
import App from '../src/App';
import '../src/styles.css';
import '../src/themes.css';

(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let db: DBContextValue;
let loading: LoadingContextValue;
let initializeCount=0;
let gate: Promise<void> | null=null;
let release: (()=>void) | null=null;
let rejectGate: ((error: Error)=>void) | null=null;
let failInitialization=true;
const date=today();
const item: CalendarItem={id:'test-activity',title:'Attività di prova',date,endDate:date,start:'09:00',end:'11:00',kind:'flexible',status:'todo',notes:'Solo dati di test',exceptions:{},icon:'sport',color:'green'};
let saved: DatabaseSnapshot={archive:{format:'time-planner-backup',version:1,calendar:{...emptyCalendar(),items:[item]},history:[]},revision:0,previous:null};
const repository: DBRepository={
 initialize:async()=>{initializeCount++;if(failInitialization)throw new Error('Simulated open failure');return structuredClone(saved);},
 loadPalette:async()=> 'natural', savePalette:async(_value: Palette)=>{},
 save:async(input: DatabaseWrite)=>{
  if(gate)await gate;
  if(saved.revision!==input.expectedRevision)throw new Error('Stale revision');
  saved={archive:structuredClone(input.archive),revision:saved.revision+1,previous:input.replace?saved.archive:saved.previous};
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
 const occurrence=occurrences(db!.state.items,date,date)[0];
 await act(async()=>{await db.recordOutcome(occurrence,'partial');});
 check(db!.archive.history.length===1&&db!.state.items[0].outcomes?.[date]==='partial','Provider commits calendar and audit together');
 await act(async()=>{await db.recordOutcome(occurrence,'completed');});
 check(db!.archive.history.length===2&&loading!.pending===0,'Correction preserves history and releases loading');
 gate=new Promise<void>((resolve,reject)=>{release=resolve;rejectGate=reject;});
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
 await act(async()=>{await db.clearCalendar();});
 check(db!.state.items.length===0&&db!.archive.history.length===2,'Clearing calendar retains audit');
 await act(async()=>{await db.importBackup(candidate);});
 check(db!.state.items.length===1&&db!.previous?.calendar.items.length===0,'Import restores data and keeps prior archive');
 const bridgeRepository = new RepositoryDB(()=>({read:async()=>saved,write:async()=>{throw new Error('Unexpected migration');}}));
 check((await bridgeRepository.initialize()).revision===saved.revision,'Existing SQLite archive bypasses legacy migration');
 let missingBridge=false;
 try {await new RepositoryDB(()=>undefined).initialize();}catch(error){missingBridge=String(error).includes('desktop');}
 check(missingBridge,'Missing Electron bridge fails explicitly without IndexedDB fallback');
 results.push(...await runMigrationTests());
 results.push('ALL PROVIDER AND MIGRATION TESTS PASSED');
 await act(async()=>{root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><App/></DBProvider></LoadingProvider></StrictMode>);});
} catch(error) {results.push(`FAIL ${error instanceof Error?error.stack:error}`);}
finally {document.querySelector('#results')!.textContent=results.join('\n');}
