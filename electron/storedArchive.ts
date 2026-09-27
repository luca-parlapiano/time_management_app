import { isOccurrenceDate, occurrences, validDate } from '../src/domain/calendar.js';
import { outcomeRecord, validateArchive } from '../src/domain/outcomeArchive.js';
import type { PlannerArchive } from '../src/model/outcomeArchive.js';

/** Richiede un oggetto JSON salvato; rifiuta valori nulli, primitivi e array. */
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Archivio salvato non valido.');
  return value as Record<string, unknown>;
}

/** Legge lo stato precedente, rifiutando valori sconosciuti invece di eliminarli. */
function legacyStatus(value: unknown): 'completed' | 'skipped' | undefined {
  if (value === undefined || value === 'todo') return undefined;
  if (value === 'completed' || value === 'skipped') return value;
  throw new Error('Stato salvato non valido.');
}

/**
 * Converte solo i campi dismessi dei dati SQLite in un archivio attuale validato.
 * Non modifica l’input né il database: il prossimo salvataggio persiste la conversione.
 * Gli esiti espliciti prevalgono; le serie usano solo date note, senza inventare esiti
 * futuri. Lo storico esistente resta intatto e i record recuperati non hanno timestamp.
 */
export function readStoredArchive(value: unknown): PlannerArchive {
  const archive = object(structuredClone(value));
  const calendar = object(archive.calendar);
  if (!Array.isArray(calendar.items)) throw new Error('Archivio calendario non riconosciuto.');
  const legacy = calendar.items.map(value => {
    const item = object(value);
    const status = legacyStatus(item.status);
    const completed = item.completedDates === undefined ? {} : object(item.completedDates);
    for (const [date, result] of Object.entries(completed)) {
      if (!validDate(date) || typeof result !== 'boolean') throw new Error('Completamenti salvati non validi.');
    }
    const exceptions = object(item.exceptions);
    const statuses = new Map<string, 'completed' | 'skipped' | undefined>();
    let changed = Object.hasOwn(item, 'status') || Object.hasOwn(item, 'completedDates');
    for (const [date, value] of Object.entries(exceptions)) {
      if (value === null) continue;
      const exception = object(value);
      changed ||= Object.hasOwn(exception, 'status');
      statuses.set(date, legacyStatus(exception.status));
      delete exception.status;
    }
    delete item.status;
    delete item.completedDates;
    return { status, completed, statuses, changed };
  });
  validateArchive(archive);
  for (const [index, item] of archive.calendar.items.entries()) {
    const { status, completed, statuses, changed } = legacy[index];
    for (const date of Object.keys(completed)) {
      if (item.recurrence ? !isOccurrenceDate(item, date) : date !== item.date) throw new Error('Data di completamento salvata non valida.');
    }
    if (!changed) continue;
    const dates = new Set([...Object.keys(item.outcomes ?? {}), ...Object.keys(completed), ...Object.keys(item.exceptions)]);
    if (!item.recurrence) dates.add(item.date);
    for (const date of dates) {
      if (item.exceptions[date] === null) continue;
      const fallback = statuses.has(date) ? statuses.get(date) : status;
      const outcome = item.outcomes?.[date] ?? (completed[date] === true ? 'completed' : completed[date] === false ? undefined : fallback);
      if (!outcome) continue;
      item.outcomes = { ...item.outcomes, [date]: outcome };
      if (archive.history.some(record => record.sourceId === item.id && record.occurrenceDate === date)) continue;
      const eventDate = item.exceptions[date]?.date ?? date;
      const entry = occurrences([item], eventDate, eventDate).find(entry => entry.occurrenceDate === date);
      if (entry) {
        let id = `sqlite-legacy:${JSON.stringify([item.id, date])}`;
        while (archive.history.some(record => record.id === id)) id += ':';
        archive.history.push({ ...outcomeRecord(archive.calendar, entry, outcome, null), id });
      }
    }
  }
  validateArchive(archive);
  return archive;
}
