import * as SQLite from 'expo-sqlite';
import { emptyCalendar } from '../core/domain/calendar';
import { reconcileHabitCompletion } from '../core/domain/habitCompletion';
import { archiveForStorage, upgradeArchive, validateArchive } from '../core/domain/outcomeArchive';
import { upgradeTimeSeries } from '../core/domain/timeSeries';
import type { DatabaseSnapshot, DatabaseWrite } from '../core/model/database';
import type { PlannerArchive } from '../core/model/outcomeArchive';

type StoredRow = { archive: string; previous: string | null; revision: number };
const initialArchive: PlannerArchive = {
  format: 'time-planner-backup', version: 3, calendar: emptyCalendar(), habits: [], history: [],
};
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Apre l'archivio locale una sola volta e inizializza la riga senza sovrascrivere dati esistenti. */
async function database(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync('time-planner-mobile.sqlite').then(async db => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS planner_snapshot (id INTEGER PRIMARY KEY CHECK (id = 1), archive TEXT NOT NULL, previous TEXT, revision INTEGER NOT NULL)');
    await db.runAsync('INSERT OR IGNORE INTO planner_snapshot (id, archive, previous, revision) VALUES (1, ?, NULL, 0)', JSON.stringify(initialArchive));
    return db;
  }).catch(cause => {
    databasePromise = null;
    throw cause;
  });
  return databasePromise;
}

/** Valida il JSON letto da SQLite e ricostruisce le proprietà derivate della serie. */
function preparedArchive(text: string): PlannerArchive {
  const decoded: unknown = JSON.parse(text);
  const legacy = upgradeArchive(decoded);
  validateArchive(legacy);
  const upgraded = upgradeTimeSeries(legacy);
  validateArchive(upgraded);
  return reconcileHabitCompletion(upgraded);
}

/** Repository SQLite mobile con revisione ottimistica e precedente importazione. */
export class MobileRepository {
  async read(): Promise<DatabaseSnapshot> {
    const db = await database();
    const row = await db.getFirstAsync<StoredRow>('SELECT archive, previous, revision FROM planner_snapshot WHERE id = 1');
    if (!row || !Number.isSafeInteger(row.revision) || row.revision < 0) throw new Error('Archivio mobile non leggibile.');
    return {
      archive: preparedArchive(row.archive),
      previous: row.previous === null ? null : preparedArchive(row.previous),
      revision: row.revision,
    };
  }

  async save(input: DatabaseWrite): Promise<DatabaseSnapshot> {
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision === null || input.expectedRevision < 0) {
      throw new Error('Revisione non valida.');
    }
    validateArchive(input.archive);
    const db = await database();
    const serialized = JSON.stringify(archiveForStorage(input.archive));
    // Una sola istruzione aggiorna archivio, copia precedente e revisione atomicamente.
    const result = await db.runAsync(
      'UPDATE planner_snapshot SET previous = CASE WHEN ? = 1 THEN archive ELSE previous END, archive = ?, revision = revision + 1 WHERE id = 1 AND revision = ?',
      input.replace ? 1 : 0, serialized, input.expectedRevision,
    );
    if (result.changes !== 1) throw new Error('Dati aggiornati altrove. Riapri l’app prima di continuare.');
    return this.read();
  }
}

export const mobileRepository = new MobileRepository();
