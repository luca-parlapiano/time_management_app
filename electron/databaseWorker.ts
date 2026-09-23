import { parentPort, workerData } from 'node:worker_threads';
import { SQLiteStore } from './sqliteStore.js';
import type { DatabaseWorkerRequest, DatabaseWorkerResponse } from '../src/model/database.js';
const store = new SQLiteStore(workerData.filename);
parentPort!.on('message', (request: DatabaseWorkerRequest) => {
  let response: DatabaseWorkerResponse;
  try {
    if (request.action !== 'read' && request.action !== 'write') throw new Error('Operazione non supportata.');
    response = {id:request.id,result:request.action === 'read' ? store.read() : store.write(request.input)};
  } catch(error) { response = {id:request.id,error:error instanceof Error ? error.message : 'Errore database.'}; }
  parentPort!.postMessage(response);
});
