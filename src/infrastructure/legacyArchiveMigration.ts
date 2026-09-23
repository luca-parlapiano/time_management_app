import { emptyCalendar } from "../domain/calendar";
import { migrateOutcomeHistory, validateArchive } from "../domain/outcomeArchive";
import type { LegacyArchive, LegacyMigrationOptions } from "../model/database";
import type { OutcomeRecord, PlannerArchive } from "../model/outcomeArchive.js";
import { loadCalendar } from "./localCalendarStorage";

// Read-only compatibility path. SQLite is the only destination for new writes.
export async function readLegacyArchive(options: LegacyMigrationOptions = {}): Promise<LegacyArchive> {
  const stored = await readIndexedArchive(options.databaseName);
  if (stored) return stored;
  const legacy = loadCalendar(options.storage ?? localStorage);
  if (legacy.error) throw new Error(legacy.error);
  const calendar = legacy.state ?? emptyCalendar();
  return { archive: { format: 'time-planner-backup', version: 1, calendar, history: migrateOutcomeHistory(calendar) }, previous: null };
}
async function readIndexedArchive(name = 'time-planner.database.v1'): Promise<LegacyArchive | null> {
  if (!globalThis.indexedDB) return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let missing = false;
    request.onupgradeneeded = () => { missing = true; request.transaction!.abort(); };
    request.onerror = () => missing ? resolve(null) : reject(new Error('Impossibile recuperare il database precedente. Nessun dato è stato sostituito.'));
    request.onblocked = () => reject(new Error('Chiudi le altre finestre per recuperare i dati precedenti.'));
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction(['calendar','outcomes','metadata'], 'readonly');
        const snapshot = tx.objectStore('calendar').get('current');
        const history = tx.objectStore('outcomes').getAll();
        const order = tx.objectStore('metadata').get('historyOrder');
        const previous = tx.objectStore('metadata').get('previousImport');
        tx.oncomplete = () => {
          db.close();
          try {
            if (!snapshot.result) { resolve(null); return; }
            const records = new Map<string, OutcomeRecord>(history.result.map((record: OutcomeRecord) => [record.id, record]));
            const ids: string[] = order.result;
            if (!Array.isArray(ids) || ids.length !== records.size || new Set(ids).size !== ids.length || ids.some(id => !records.has(id))) throw new Error('Storico precedente non valido.');
            const archive: PlannerArchive = {format:'time-planner-backup',version:1,calendar:snapshot.result.calendar,history:ids.map(id => records.get(id)!)};
            validateArchive(archive);
            if (previous.result) validateArchive(previous.result);
            resolve({archive,previous:previous.result ?? null});
          } catch(error) { reject(error); }
        };
        tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Recupero dati interrotto.')); };
      } catch(error) { db.close(); reject(error); }
    };
  });
}
