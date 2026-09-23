import { Worker } from 'node:worker_threads';
import type { DatabaseBridge, DatabaseSnapshot, DatabaseWrite, DatabaseWorkerResponse } from '../src/model/database.js';

export class DatabaseService implements DatabaseBridge {
  private readonly worker: Worker;
  private sequence = 0;
  private failure: Error | null = null;
  private readonly pending = new Map<number, {resolve: (value: DatabaseSnapshot | null) => void; reject: (error: Error) => void}>();
  constructor(filename: string) {
    this.worker = new Worker(new URL('./databaseWorker.js',import.meta.url),{workerData:{filename}});
    this.worker.on('message',(response: DatabaseWorkerResponse) => {
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      if (response.error) pending.reject(new Error(response.error)); else pending.resolve(response.result ?? null);
    });
    this.worker.on('error',error => this.fail(error));
    this.worker.on('exit',() => this.fail(new Error('Connessione al database chiusa. Riapri l’app.')));
  }
  private fail(error: Error) { this.failure = error; for(const pending of this.pending.values()) pending.reject(error); this.pending.clear(); }
  private request(action: 'read' | 'write', input?: DatabaseWrite): Promise<DatabaseSnapshot | null> {
    if(this.failure) return Promise.reject(this.failure);
    return new Promise((resolve,reject) => {
      const id = ++this.sequence; this.pending.set(id,{resolve,reject});
      try { this.worker.postMessage({id,action,input}); } catch(error) { this.pending.delete(id); reject(error); }
    });
  }
  read() { return this.request('read'); }
  async write(input: DatabaseWrite) { const result = await this.request('write',input); if(!result) throw new Error('Salvataggio senza risultato.'); return result; }
  async close() { await this.worker.terminate(); }
}
