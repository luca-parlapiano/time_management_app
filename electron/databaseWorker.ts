import { parentPort, workerData } from 'node:worker_threads';
import { SQLiteStore } from './sqliteStore.js';
import type { DatabaseWorkerRequest, DatabaseWorkerResponse } from '../src/model/database.js';
const store = new SQLiteStore(workerData.filename);
parentPort!.on('message', (request: DatabaseWorkerRequest) => {
  let response: DatabaseWorkerResponse;
  try {
    switch (request.action) {
      case 'read': response = {id: request.id, result: store.read()}; break;
      case 'write': response = {id: request.id, result: store.write(request.input)}; break;
      case 'reset': response = {id: request.id, result: store.reset(request.expectedRevision)}; break;
      case 'readPalette': response = {id: request.id, result: store.readPalette()}; break;
      case 'writePalette': response = {id: request.id, result: store.writePalette(request.input)}; break;
      default: throw new Error('Operazione non supportata.');
    }
  } catch(error) { response = {id:request.id,error:error instanceof Error ? error.message : 'Errore database.'}; }
  parentPort!.postMessage(response);
});
