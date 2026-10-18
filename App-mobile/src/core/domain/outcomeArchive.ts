// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import { randomUUID as expoRandomUUID } from 'expo-crypto';
import { validateWeeklyTime } from "./weeklyTime";
import { upgradeTimeSeries } from "./timeSeries";
/**
 * Regole dello storico degli esiti e del formato di backup.
 * Il calendario descrive gli appuntamenti attuali; lo storico ne conserva gli esiti
 * anche dopo eliminazioni e correzioni. Qui si preparano e validano dati, senza I/O.
 */
export { statisticsOutcomeLabels } from "../constants";
import { isFiniteNumber } from "../utils/numbers";
import type { CalendarState, ItemOutcome, Occurrence } from "../model/calendar";
import type { OutcomeRecord, PlannerArchive } from "../model/outcomeArchive";
import { eventAppearance, eventIcons, isEventColor, isProgressActivity, outcomeLabels, validDate, validateCalendar } from "./calendar";
import { validateHabits } from "./habits";
export type { OutcomeRecord,PlannerArchive } from "../model/outcomeArchive";

/**
 * Crea una registrazione per un’occorrenza esistente e un esito valido, senza salvarla.
 * Conserva sia la data originale sia quella visualizzata e una copia di titolo/aspetto.
 * Genera un ID nuovo; recordedAt usa l’ora corrente, oppure il valore esplicito ricevuto. Rifiuta fonte o esito mancanti/non validi.
 */
export function outcomeRecord(state: CalendarState, item: Occurrence, outcome: ItemOutcome, recordedAt: string | null = new Date().toISOString()): OutcomeRecord {
  const source = state.items.find(entry => entry.id === item.sourceId);
  if (!source || !Object.hasOwn(outcomeLabels, outcome)) throw new Error("Esito o attività non validi.");
  return { id: expoRandomUUID(), sourceId: item.sourceId, activityId: source.activityId ?? source.id, occurrenceDate: item.occurrenceDate, eventDate: item.date, title: item.title, ...eventAppearance(item), outcome, recordedAt };
}
/**
 * Restituisce una registrazione per coppia sourceId/data originale.
 * Prevale l’ultima voce nell’ordine dell’array, non il timestamp; history non viene modificato.
 * Una correzione sostituisce l’esito considerato, mantenendo l’ordine della prima comparsa.
 */
export function latestOutcomes(history: OutcomeRecord[]): OutcomeRecord[] {
  const latest = new Map<string, OutcomeRecord>();
  for (const record of history) latest.set(JSON.stringify([record.sourceId, record.occurrenceDate]), record);
  return [...latest.values()];
}

/**
 * Seleziona gli esiti delle abitudini e delle attività monitorate legacy ancora presenti nel calendario.
 * Per un’abitudine conserva anche le fonti rimosse cambiando i giorni pianificati,
 * tramite la sua identità stabile. Una fonte esistente ma non monitorata resta esclusa.
 * Le attività eliminate del tutto restano solo nell’archivio di audit e nei backup.
 */
export function progressOutcomeHistory(calendar: CalendarState, history: readonly OutcomeRecord[]): OutcomeRecord[] {
  const sources = new Map(calendar.items.map(item => [item.id, item]));
  const habitIds = new Set(calendar.items.filter(isProgressActivity).flatMap(item => item.habitId ? [item.habitId] : []));
  return history.filter(record => {
    const source = sources.get(record.sourceId);
    return source ? isProgressActivity(source) : habitIds.has(record.activityId);
  });
}
/** Richiede un oggetto con soli campi dichiarati, senza eliminare silenziosamente dati estranei. */
function requireFields(value: unknown, allowed: readonly string[], path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: oggetto non valido.`);
  const unexpected = Object.keys(value).find(key => !allowed.includes(key));
  if (unexpected) throw new Error(`${path}: campo non previsto “${unexpected}”.`);
}

/**
 * Converte i formati precedenti senza modificare l’input. Gli esiti dismessi diventano
 * non fatti, conservando identità e ordine dello storico. Per v1 elimina le vecchie abitudini.
 */
export function upgradeArchive(value: unknown): unknown {
  const cloned: unknown = structuredClone(value);
  if (!cloned || typeof cloned !== "object" || Array.isArray(cloned)) return cloned;
  const archive = cloned as Record<string, unknown>;
  if (archive.format !== "time-planner-backup" || (archive.version !== 1 && archive.version !== 2 && archive.version !== 3)) return cloned;
  if (archive.calendar && typeof archive.calendar === "object" && !Array.isArray(archive.calendar)) {
    const calendar = archive.calendar as Record<string, unknown>;
    if (Array.isArray(calendar.items)) {
      if (archive.version === 1) calendar.items = calendar.items.filter(item => !item || typeof item !== "object" || Array.isArray(item) || !("habitId" in item));
      for (const item of calendar.items as unknown[]) {
        if (!item || typeof item !== "object" || !("outcomes" in item)) continue;
        const outcomes = item.outcomes;
        if (!outcomes || typeof outcomes !== "object" || Array.isArray(outcomes)) continue;
        for (const [date, outcome] of Object.entries(outcomes)) {
          if (outcome === "partial") (outcomes as Record<string, unknown>)[date] = "skipped";
        }
      }
    }
  }
  if (Array.isArray(archive.history)) for (const record of archive.history as unknown[]) {
    if (record && typeof record === "object" && "outcome" in record && record.outcome === "partial") record.outcome = "skipped";
  }
  if (archive.version === 1) archive.habits = [];
  archive.version = 3;
  return archive;
}

/** Controlla i confini del formato prima di applicare le regole di dominio ai contenuti. */
function validateArchiveFields(value: Record<string, unknown>): void {
  requireFields(value.calendar, ['version', 'items', 'goals', 'profile'], 'Calendario');
  const calendar = value.calendar;
  if (!Array.isArray(calendar.items) || !Array.isArray(calendar.goals)) throw new Error('Archivio calendario non riconosciuto.');
  const dataFields = ['coverImage', 'icon', 'color', 'title', 'date', 'endDate', 'start', 'end', 'kind', 'notes', 'goalId'];
  for (const item of calendar.items) {
    requireFields(item, [...dataFields, 'id', 'activityId', 'habitId', 'weeklyHabitId', 'timeHabitUntil', 'timeOriginalDate', 'habitClosedOn', 'habitPlannedUntil', 'routine', 'outcomes', 'recurrence', 'exceptions'], 'Attività');
    if (item.recurrence !== undefined) requireFields(item.recurrence, ['until'], 'Ricorrenza');
    if (!item.exceptions || typeof item.exceptions !== 'object' || Array.isArray(item.exceptions)) throw new Error('Eccezioni non valide.');
    for (const exception of Object.values(item.exceptions)) {
      if (exception !== null) requireFields(exception, dataFields, 'Eccezione');
    }
  }
  for (const goal of calendar.goals) requireFields(goal, ['id', 'name'], 'Obiettivo');
  if (calendar.profile !== null) requireFields(calendar.profile, ['name', 'notes'], 'Profilo');
  if (!Array.isArray(value.history)) throw new Error('Storico non valido.');
  for (const record of value.history) {
    requireFields(record, ['id', 'sourceId', 'activityId', 'occurrenceDate', 'eventDate', 'title', 'icon', 'color', 'outcome', 'recordedAt'], 'Esito');
  }
  if (value.habits !== undefined) {
    if (!Array.isArray(value.habits)) throw new Error('Archivio delle abitudini non valido.');
    for (const habit of value.habits) {
      requireFields(habit, ['id', 'title', 'motivation', 'icon', 'color', 'stepTarget', 'trophiesEnabled'], 'Abitudine');
    }
  }
}

/**
 * Valida formato/versione del backup, calendario e registrazioni dello storico.
 * Solleva un errore per dati incoerenti, ID di registrazione duplicati o timestamp non validi.
 * Ammette esiti di attività eliminate: non richiede che la fonte esista nel calendario attuale.
 */
export function validateArchive(value: unknown): asserts value is PlannerArchive {
  requireFields(value, ['format', 'version', 'calendar', 'habits', 'history', 'weeklyTimeHabits', 'timeSessions', 'timeSessionHistory', 'exportedAt'], 'Backup');
  if (value.format !== 'time-planner-backup' || value.version !== 3) throw new Error("Formato di backup non riconosciuto.");
  if (value.exportedAt !== undefined && (typeof value.exportedAt !== 'string' || !isFiniteNumber(Date.parse(value.exportedAt)))) throw new Error('Data di esportazione non valida.');
  validateArchiveFields(value);
  const archive = value as unknown as PlannerArchive;
  validateCalendar(archive.calendar);
  validateHabits(archive.habits ?? [], archive.calendar);
  validateWeeklyTime(archive);
  const ids = new Set<string>();
  for (const record of archive.history) {
    if (!record || ![record.id, record.sourceId, record.activityId, record.title].every(value => typeof value === "string" && value.trim()) || ids.has(record.id) ||
      !validDate(record.occurrenceDate) || !validDate(record.eventDate) || !Object.hasOwn(outcomeLabels, record.outcome) ||
      !Object.hasOwn(eventIcons, record.icon) || !isEventColor(record.color) ||
      !(record.recordedAt === null || typeof record.recordedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(record.recordedAt) && isFiniteNumber(Date.parse(record.recordedAt)))) throw new Error("Storico degli esiti non valido.");
    ids.add(record.id);
  }
}
/**
 * Legge un JSON e restituisce un backup validato, pronto per l’anteprima di importazione.
 * Accetta il formato corrente e converte il precedente eliminando le vecchie abitudini.
 * Propaga errori di parsing/validazione; non salva né converte formati diversi.
 */
export function parseArchive(text: string): PlannerArchive {
  const parsed = upgradeArchive(JSON.parse(text));
  validateArchive(parsed);
  const { exportedAt: _exportedAt, ...archive } = parsed as PlannerArchive & { exportedAt?: string };
  const upgraded = upgradeTimeSeries({ ...archive, habits: parsed.habits ?? [] });
  validateArchive(upgraded);
  return upgraded;
}
/**
 * Prepara i dati per IPC, SQLite e backup eliminando chiusura e limite pianificato derivati.
 * Il traguardo e gli esiti restano intatti: i limiti si ricalcolano alla lettura.
 * Non modifica l'archivio ricevuto e conserva gli altri campi per la validazione.
 */
export function archiveForStorage(archive: PlannerArchive): PlannerArchive {
  return { ...archive, calendar: { ...archive.calendar, items: archive.calendar.items.map(item => {
    if (item.habitClosedOn === undefined && item.habitPlannedUntil === undefined) return item;
    const stored = { ...item };
    delete stored.habitClosedOn;
    delete stored.habitPlannedUntil;
    return stored;
  }) } };
}
/**
 * Valida l’archivio e lo serializza in JSON leggibile con la data corrente di esportazione.
 * Restituisce il testo, senza scrivere file né modificare l’archivio ricevuto.
 */
export function exportArchive(archive: PlannerArchive): string {
  validateArchive(archive);
  return JSON.stringify({ ...archiveForStorage(archive), exportedAt: new Date().toISOString() }, null, 2);
}
