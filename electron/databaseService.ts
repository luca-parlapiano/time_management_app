import { isPalette } from "../src/theme.js";
import type { Palette } from "../src/model/theme.js";
import { Worker } from 'node:worker_threads';
import type { DatabaseBridge, DatabaseSnapshot, DatabaseWrite, DatabaseWorkerResponse, DatabaseWorkerOperation } from '../src/model/database.js';

export class DatabaseService implements DatabaseBridge {
  private readonly worker: Worker;
  private sequence = 0;
  private failure: Error | null = null;
  private readonly pending = new Map<number, {resolve: (value: DatabaseSnapshot | Palette | null) => void; reject: (error: Error) => void}>();
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
  private request(request: DatabaseWorkerOperation): Promise<DatabaseSnapshot | Palette | null> {
    if(this.failure) return Promise.reject(this.failure);
    return new Promise((resolve,reject) => {
      const id = ++this.sequence; this.pending.set(id,{resolve,reject});
      try { this.worker.postMessage({...request,id}); } catch(error) { this.pending.delete(id); reject(error); }
    });
  }
  async read() {
    const result = await this.request({action: 'read'});
    if (typeof result === 'string') throw new Error('Risposta database non valida.');
    return result;
  }
  async write(input: DatabaseWrite) {
    const result = await this.request({action: 'write', input});
    if (!result || typeof result === 'string') throw new Error('Salvataggio senza risultato valido.');
    return result;
  }
  async readPalette() {
    const result = await this.request({action: 'readPalette'});
    if (!isPalette(result)) throw new Error('Risposta palette non valida.');
    return result;
  }
  async writePalette(input: Palette) {
    const result = await this.request({action: 'writePalette', input});
    if (!isPalette(result)) throw new Error('Risposta palette non valida.');
    return result;
  }
  async close() { await this.worker.terminate(); }
}
