/**
 * Regole dello storico degli esiti e del formato di backup.
 * Il calendario descrive gli appuntamenti attuali; lo storico ne conserva gli esiti
 * anche dopo eliminazioni e correzioni. Qui si preparano e validano dati, senza I/O.
 */
export { statisticsOutcomeLabels } from "../constants.js";
import { isFiniteNumber } from "../utils/numbers.js";
import type { CalendarState, ItemOutcome, Occurrence } from "../model/calendar.js";
import type { OutcomeRecord, PlannerArchive } from "../model/outcomeArchive.js";
import { eventAppearance, eventColors, eventIcons, outcomeLabels, validDate, validateCalendar } from "./calendar.js";
export type { OutcomeRecord,PlannerArchive } from "../model/outcomeArchive.js";

/**
 * Crea una registrazione per un’occorrenza esistente e un esito valido, senza salvarla.
 * Conserva sia la data originale sia quella visualizzata e una copia di titolo/aspetto.
 * Genera un ID nuovo; recordedAt usa l’ora corrente, oppure il valore esplicito ricevuto. Rifiuta fonte o esito mancanti/non validi.
 */
export function outcomeRecord(state: CalendarState, item: Occurrence, outcome: ItemOutcome, recordedAt: string | null = new Date().toISOString()): OutcomeRecord {
  const source = state.items.find(entry => entry.id === item.sourceId);
  if (!source || !Object.hasOwn(outcomeLabels, outcome)) throw new Error("Esito o attività non validi.");
  return { id: crypto.randomUUID(), sourceId: item.sourceId, activityId: source.activityId ?? source.id, occurrenceDate: item.occurrenceDate, eventDate: item.date, title: item.title, ...eventAppearance(item), outcome, recordedAt };
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
/** Richiede un oggetto con soli campi dichiarati, senza eliminare silenziosamente dati estranei. */
function requireFields(value: unknown, allowed: readonly string[], path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: oggetto non valido.`);
  const unexpected = Object.keys(value).find(key => !allowed.includes(key));
  if (unexpected) throw new Error(`${path}: campo non previsto “${unexpected}”.`);
}

/** Controlla i confini del formato prima di applicare le regole di dominio ai contenuti. */
function validateArchiveFields(value: Record<string, unknown>): void {
  requireFields(value.calendar, ['version', 'items', 'goals', 'profile'], 'Calendario');
  const calendar = value.calendar;
  if (!Array.isArray(calendar.items) || !Array.isArray(calendar.goals)) throw new Error('Archivio calendario non riconosciuto.');
  const dataFields = ['coverImage', 'icon', 'color', 'title', 'date', 'endDate', 'start', 'end', 'kind', 'notes', 'goalId'];
  for (const item of calendar.items) {
    requireFields(item, [...dataFields, 'id', 'activityId', 'outcomes', 'recurrence', 'exceptions'], 'Attività');
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
}

/**
 * Valida formato/versione del backup, calendario e registrazioni dello storico.
 * Solleva un errore per dati incoerenti, ID di registrazione duplicati o timestamp non validi.
 * Ammette esiti di attività eliminate: non richiede che la fonte esista nel calendario attuale.
 */
export function validateArchive(value: unknown): asserts value is PlannerArchive {
  requireFields(value, ['format', 'version', 'calendar', 'history', 'exportedAt'], 'Backup');
  if (value.format !== 'time-planner-backup' || value.version !== 1) throw new Error("Formato di backup non riconosciuto.");
  if (value.exportedAt !== undefined && (typeof value.exportedAt !== 'string' || !isFiniteNumber(Date.parse(value.exportedAt)))) throw new Error('Data di esportazione non valida.');
  validateArchiveFields(value);
  const archive = value as unknown as PlannerArchive;
  validateCalendar(archive.calendar);
  const ids = new Set<string>();
  for (const record of archive.history) {
    if (!record || ![record.id, record.sourceId, record.activityId, record.title].every(value => typeof value === "string" && value.trim()) || ids.has(record.id) ||
      !validDate(record.occurrenceDate) || !validDate(record.eventDate) || !Object.hasOwn(outcomeLabels, record.outcome) ||
      !Object.hasOwn(eventIcons, record.icon) || !Object.hasOwn(eventColors, record.color) ||
      !(record.recordedAt === null || typeof record.recordedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(record.recordedAt) && isFiniteNumber(Date.parse(record.recordedAt)))) throw new Error("Storico degli esiti non valido.");
    ids.add(record.id);
  }
}
/**
 * Legge un JSON e restituisce un backup validato, pronto per l’anteprima di importazione.
 * Accetta esclusivamente il formato time-planner-backup v1 con calendario e storico.
 * Propaga errori di parsing/validazione; non salva né converte formati diversi.
 */
export function parseArchive(text: string): PlannerArchive {
  const parsed: unknown = JSON.parse(text);
  validateArchive(parsed);
  return { format: "time-planner-backup", version: 1, calendar: parsed.calendar, history: parsed.history };
}
/**
 * Valida l’archivio e lo serializza in JSON leggibile con la data corrente di esportazione.
 * Restituisce il testo, senza scrivere file né modificare l’archivio ricevuto.
 */
export function exportArchive(archive: PlannerArchive): string {
  validateArchive(archive);
  return JSON.stringify({ ...archive, exportedAt: new Date().toISOString() }, null, 2);
}
