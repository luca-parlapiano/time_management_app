import { isPalette } from "../src/theme.js";
import type { Palette } from "../src/model/theme.js";
import { isNonNegativeSafeInteger } from "../src/utils/numbers.js";
import { DatabaseSync } from 'node:sqlite';
import { readStoredArchive } from './storedArchive.js';
import { validateArchive } from '../src/domain/outcomeArchive.js';
import type { DatabaseSnapshot, DatabaseWrite } from '../src/model/database.js';
import type { CalendarItem, CalendarGoal, CalendarProfile } from '../src/model/calendar.js';
import type { OutcomeRecord } from '../src/model/outcomeArchive.js';
import type { Habit } from '../src/model/habit.js';

export class SQLiteStore {
  private readonly db: DatabaseSync;
  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    const version = (this.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version;
    if (version > 2) { this.db.close(); throw new Error('Database creato da una versione più recente dell’app.'); }
    this.db.exec(`BEGIN;
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outcome_records (
        id TEXT PRIMARY KEY, sequence INTEGER UNIQUE NOT NULL,
        source_id TEXT NOT NULL, activity_id TEXT NOT NULL,
        occurrence_date TEXT NOT NULL, event_date TEXT NOT NULL,
        title TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL,
        outcome TEXT NOT NULL CHECK(outcome IN ('completed','skipped','partial')), recorded_at TEXT
      );
      CREATE INDEX IF NOT EXISTS outcomes_event_date ON outcome_records(event_date);
      CREATE INDEX IF NOT EXISTS outcomes_occurrence ON outcome_records(source_id, occurrence_date);
      PRAGMA user_version = 2;
      COMMIT;`);
  }
  private metadata(key: string): string | undefined { return (this.db.prepare('SELECT value FROM metadata WHERE key=?').get(key) as {value:string} | undefined)?.value; }
  private putMetadata(key: string, value: unknown) { this.db.prepare('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)').run(key,JSON.stringify(value)); }
  read(): DatabaseSnapshot | null {
    this.db.exec("BEGIN");
    try { const result = this.readSnapshot(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  private readSnapshot(): DatabaseSnapshot | null {
    const revision = this.metadata('revision');
    if (revision === undefined) return null;
    const items = this.db.prepare('SELECT data FROM activities ORDER BY position').all().map(row => JSON.parse(row.data as string) as CalendarItem);
    const goals = this.db.prepare('SELECT data FROM goals ORDER BY position').all().map(row => JSON.parse(row.data as string) as CalendarGoal);
    const habits = this.db.prepare('SELECT data FROM habits ORDER BY position').all().map(row => JSON.parse(row.data as string) as Habit);
    const profile = JSON.parse(this.metadata('profile') ?? 'null') as CalendarProfile | null;
    const history = this.db.prepare(`SELECT id,source_id AS sourceId,activity_id AS activityId,occurrence_date AS occurrenceDate,
      event_date AS eventDate,title,icon,color,outcome,recorded_at AS recordedAt FROM outcome_records ORDER BY sequence`).all().map(row => ({...row})) as unknown as OutcomeRecord[];
    const archive = readStoredArchive({format:'time-planner-backup',version:1,calendar:{version:2,items,goals,profile},habits,history});
    const storedPrevious: unknown = JSON.parse(this.metadata('previousImport') ?? 'null');
    const previous = storedPrevious === null ? null : readStoredArchive(storedPrevious);
    const parsedRevision = JSON.parse(revision);
    if (!isNonNegativeSafeInteger(parsedRevision)) throw new Error('Versione archivio non valida.');
    return {archive,revision:parsedRevision,previous};
  }
  write(input: DatabaseWrite): DatabaseSnapshot {
    if (!input || (input.expectedRevision !== null && (!isNonNegativeSafeInteger(input.expectedRevision)))) throw new Error('Richiesta database non valida.');
    validateArchive(input.archive);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.readSnapshot();
      if ((existing?.revision ?? null) !== input.expectedRevision) throw new Error('Dati aggiornati in un’altra finestra. Riapri l’app prima di continuare.');
      const {archive} = input;
      const previous = input.replace && existing ? existing.archive : existing?.previous ?? null;
      this.db.exec('DELETE FROM activities; DELETE FROM goals; DELETE FROM habits; DELETE FROM outcome_records;');
      const activityInsert = this.db.prepare('INSERT INTO activities(id,position,data) VALUES (?,?,?)');
      archive.calendar.items.forEach((item,index) => activityInsert.run(item.id,index,JSON.stringify(item)));
      const goalInsert = this.db.prepare('INSERT INTO goals(id,position,data) VALUES (?,?,?)');
      archive.calendar.goals.forEach((goal,index) => goalInsert.run(goal.id,index,JSON.stringify(goal)));
      const habitInsert = this.db.prepare('INSERT INTO habits(id,position,data) VALUES (?,?,?)');
      (archive.habits ?? []).forEach((habit,index) => habitInsert.run(habit.id,index,JSON.stringify(habit)));
      const outcomeInsert = this.db.prepare('INSERT INTO outcome_records VALUES (?,?,?,?,?,?,?,?,?,?,?)');
      archive.history.forEach((record,index) => outcomeInsert.run(record.id,index,record.sourceId,record.activityId,record.occurrenceDate,record.eventDate,record.title,record.icon,record.color,record.outcome,record.recordedAt));
      const revision = (existing?.revision ?? -1) + 1;
      this.putMetadata('profile',archive.calendar.profile);
      this.putMetadata('revision',revision);
      this.putMetadata('previousImport',previous);
      this.db.exec('COMMIT');
      return {archive,revision,previous};
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  /** Legge il tema del dispositivo; un database senza preferenza usa la palette iniziale. */
  readPalette(): Palette {
    const stored = this.metadata('palette');
    if (stored === undefined) return 'natural';
    const value: unknown = JSON.parse(stored);
    if (!isPalette(value)) throw new Error('Palette salvata non valida.');
    return value;
  }
  /** Aggiorna un solo metadato, indipendente da revisioni e importazioni del calendario. */
  writePalette(value: unknown): Palette {
    if (!isPalette(value)) throw new Error('Palette non valida.');
    this.putMetadata('palette', value);
    return value;
  }
  close() { this.db.close(); }
}
