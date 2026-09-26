/**
 * Regole dello storico degli esiti e del formato di backup.
 * Il calendario descrive gli appuntamenti attuali; lo storico ne conserva gli esiti
 * anche dopo eliminazioni e correzioni. Qui si preparano e validano dati, senza I/O.
 */
export { statisticsOutcomeLabels } from "../constants.js";
import { isFiniteNumber } from "../utils/numbers.js";
import type { CalendarState, ItemOutcome, Occurrence } from "../model/calendar.js";
import type { OutcomeRecord, PlannerArchive } from "../model/outcomeArchive.js";
import { eventAppearance, eventColors, eventIcons, occurrences, outcomeLabels, validDate, validateCalendar } from "./calendar.js";
export type { OutcomeRecord,PlannerArchive } from "../model/outcomeArchive.js";

/**
 * Crea una registrazione per un’occorrenza esistente e un esito valido, senza salvarla.
 * Conserva sia la data originale sia quella visualizzata e una copia di titolo/aspetto.
 * Genera un ID nuovo; recordedAt usa l’ora corrente, oppure null per migrazioni in cui
 * il momento reale della registrazione non è noto. Rifiuta fonte o esito mancanti/non validi.
 */
export function outcomeRecord(state: CalendarState, item: Occurrence, outcome: ItemOutcome, recordedAt: string | null = new Date().toISOString()): OutcomeRecord {
  const source = state.items.find(entry => entry.id === item.sourceId);
  if (!source || !Object.hasOwn(outcomeLabels, outcome)) throw new Error("Esito o attività non validi.");
  return { id: crypto.randomUUID(), sourceId: item.sourceId, activityId: source.activityId ?? source.id, occurrenceDate: item.occurrenceDate, eventDate: item.date, title: item.title, ...eventAppearance(item), outcome, recordedAt };
}
/**
 * Ricostruisce lo storico dagli esiti presenti in un calendario già validato.
 * Considera solo date note, senza espandere serie infinite, e ignora occorrenze eliminate
 * o senza esito. Non inventa timestamp né correzioni precedenti assenti dai dati originali.
 */
export function migrateOutcomeHistory(calendar: CalendarState): OutcomeRecord[] {
  const records: OutcomeRecord[] = [];
  for (const item of calendar.items) {
    const dates = new Set([...Object.keys(item.outcomes ?? {}), ...Object.keys(item.completedDates ?? {}), ...Object.keys(item.exceptions)]);
    if (!item.recurrence) dates.add(item.date);
    for (const originalDate of dates) {
      if (item.exceptions[originalDate] === null) continue;
      // Espande la data di destinazione, ma cerca l’occorrenza tramite la sua identità originale.
      const date = item.exceptions[originalDate]?.date ?? originalDate;
      const entry = occurrences([item], date, date).find(value => value.occurrenceDate === originalDate);
      if (entry?.outcome) records.push(outcomeRecord(calendar, entry, entry.outcome, null));
    }
  }
  return records;
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
 * Valida formato/versione del backup, calendario e registrazioni dello storico.
 * Solleva un errore per dati incoerenti, ID di registrazione duplicati o timestamp non validi.
 * Ammette esiti di attività eliminate: non richiede che la fonte esista nel calendario attuale.
 */
export function validateArchive(archive: PlannerArchive): void {
  if (!archive || archive.format !== "time-planner-backup" || archive.version !== 1 || !Array.isArray(archive.history)) throw new Error("Formato di backup non riconosciuto.");
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
 * Accetta anche calendari v2 senza involucro di backup e ne ricostruisce lo storico.
 * Propaga errori di parsing/validazione; non salva dati né converte i piani v1 senza date.
 */
export function parseArchive(text: string): PlannerArchive {
  const parsed = JSON.parse(text);
  if (parsed?.version === 2 && !parsed.format) {
    validateCalendar(parsed);
    return { format: "time-planner-backup", version: 1, calendar: parsed, history: migrateOutcomeHistory(parsed) };
  }
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
