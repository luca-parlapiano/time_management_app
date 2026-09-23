import { readLegacyArchive } from '../src/infrastructure/legacyArchiveMigration';
import { RepositoryDB } from '../src/repository/RepositoryDB';
import { emptyCalendar } from '../src/domain/calendar';
import { CALENDAR_STORAGE_KEY } from '../src/infrastructure/localCalendarStorage';
import type { CalendarState } from '../src/model/calendar';
import type { DatabaseWrite } from '../src/model/database';

export async function runMigrationTests() {
 const name=`agenda-migration-test.${crypto.randomUUID()}`;
 const lines:string[]=[];
 const check=(value:unknown,message:string)=>{if(!value)throw new Error(message);lines.push(`PASS ${message}`);};
 const calendar:CalendarState={...emptyCalendar(),items:[{id:'legacy',title:'Legacy',date:'2026-09-22',endDate:'2026-09-22',start:'09:00',end:'10:00',kind:'flexible',status:'completed',notes:'',exceptions:{}}]};
 const storage={getItem:(key:string)=>key===CALENDAR_STORAGE_KEY?JSON.stringify(calendar):null,setItem:()=>{throw new Error('Migration must not write localStorage');}};
 try {
  const legacy=await readLegacyArchive({databaseName:name,storage});
  check(legacy.archive.calendar.items.length===1&&legacy.archive.history[0]?.recordedAt===null,'Legacy localStorage migrates without invented timestamps');
  const connections=await indexedDB.databases();
  check(!connections.some(db=>db.name===name),'Reading a missing IndexedDB does not create an archive');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open(name,1);request.onerror=()=>reject(request.error);
   request.onupgradeneeded=()=>{request.result.createObjectStore('calendar');request.result.createObjectStore('outcomes',{keyPath:'id'});request.result.createObjectStore('metadata');};
   request.onsuccess=()=>resolve(request.result);
  });
  const previous={...legacy.archive,calendar:emptyCalendar(),history:[]};
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(['calendar','outcomes','metadata'],'readwrite');
   tx.objectStore('calendar').put({calendar,revision:3},'current');
   tx.objectStore('outcomes').add(legacy.archive.history[0]);
   tx.objectStore('metadata').put(legacy.archive.history.map(record=>record.id),'historyOrder');
   tx.objectStore('metadata').put(previous,'previousImport');
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  }); db.close();
  const stored=await readLegacyArchive({databaseName:name,storage:{getItem:()=>'{invalid',setItem:()=>{}}});
  check(JSON.stringify(stored.archive)===JSON.stringify(legacy.archive)&&JSON.stringify(stored.previous)===JSON.stringify(previous),'IndexedDB audit and previous backup take precedence over stale localStorage');
  let written:DatabaseWrite|undefined;
  const repository=new RepositoryDB(()=>({read:async()=>null,write:async input=>{written=input;return {archive:input.archive,revision:0,previous:input.previous??null};}}),()=>readLegacyArchive({databaseName:name,storage}));
  await repository.initialize();
  check(written?.expectedRevision===null&&written.archive.history.length===1&&written.previous?.calendar.items.length===0,'Repository transfers legacy archive atomically on first SQLite initialization');
  const intact=await readLegacyArchive({databaseName:name,storage});
  check(JSON.stringify(intact)===JSON.stringify(stored),'Migration leaves original IndexedDB unchanged');
  const broken=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  await new Promise<void>((resolve,reject)=>{const tx=broken.transaction('metadata','readwrite');tx.objectStore('metadata').put(['missing-record'],'historyOrder');tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});broken.close();
  let rejected=false;try{await readLegacyArchive({databaseName:name,storage});}catch{rejected=true;}
  check(rejected,'Damaged legacy history is rejected rather than replaced');
 } finally {await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});}
 return lines;
}
