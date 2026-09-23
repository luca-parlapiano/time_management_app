import type { CalendarState, ItemOutcome, Occurrence } from "../model/calendar.js";
import type { OutcomeRecord, PlannerArchive } from "../model/outcomeArchive.js";
import { eventAppearance, eventColors, eventIcons, occurrences, outcomeLabels, validDate, validateCalendar } from "./calendar.js";
export type { OutcomeRecord,PlannerArchive } from "../model/outcomeArchive.js";

export const statisticsOutcomeLabels: Record<ItemOutcome, string> = { completed: "Superata", skipped: "Non superata", partial: "Parziale" };
export function outcomeRecord(state: CalendarState, item: Occurrence, outcome: ItemOutcome, recordedAt: string | null = new Date().toISOString()): OutcomeRecord {
  const source = state.items.find(entry => entry.id === item.sourceId);
  if (!source || !Object.hasOwn(outcomeLabels, outcome)) throw new Error("Esito o attività non validi.");
  return { id: crypto.randomUUID(), sourceId: item.sourceId, activityId: source.activityId ?? source.id, occurrenceDate: item.occurrenceDate, eventDate: item.date, title: item.title, ...eventAppearance(item), outcome, recordedAt };
}
export function migrateOutcomeHistory(calendar: CalendarState): OutcomeRecord[] {
  const records: OutcomeRecord[] = [];
  for (const item of calendar.items) {
    const dates = new Set([...Object.keys(item.outcomes ?? {}), ...Object.keys(item.completedDates ?? {}), ...Object.keys(item.exceptions)]);
    if (!item.recurrence) dates.add(item.date);
    for (const originalDate of dates) {
      if (item.exceptions[originalDate] === null) continue;
      const date = item.exceptions[originalDate]?.date ?? originalDate;
      const entry = occurrences([item], date, date).find(value => value.occurrenceDate === originalDate);
      if (entry?.outcome) records.push(outcomeRecord(calendar, entry, entry.outcome, null));
    }
  }
  return records;
}
export function latestOutcomes(history: OutcomeRecord[]): OutcomeRecord[] {
  const latest = new Map<string, OutcomeRecord>();
  for (const record of history) latest.set(JSON.stringify([record.sourceId, record.occurrenceDate]), record);
  return [...latest.values()];
}
export function validateArchive(archive: PlannerArchive): void {
  if (!archive || archive.format !== "time-planner-backup" || archive.version !== 1 || !Array.isArray(archive.history)) throw new Error("Formato di backup non riconosciuto.");
  validateCalendar(archive.calendar);
  const ids = new Set<string>();
  for (const record of archive.history) {
    if (!record || ![record.id, record.sourceId, record.activityId, record.title].every(value => typeof value === "string" && value.trim()) || ids.has(record.id) ||
      !validDate(record.occurrenceDate) || !validDate(record.eventDate) || !Object.hasOwn(outcomeLabels, record.outcome) ||
      !Object.hasOwn(eventIcons, record.icon) || !Object.hasOwn(eventColors, record.color) ||
      !(record.recordedAt === null || typeof record.recordedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(record.recordedAt) && Number.isFinite(Date.parse(record.recordedAt)))) throw new Error("Storico degli esiti non valido.");
    ids.add(record.id);
  }
}
export function parseArchive(text: string): PlannerArchive {
  const parsed = JSON.parse(text);
  if (parsed?.version === 2 && !parsed.format) {
    validateCalendar(parsed);
    return { format: "time-planner-backup", version: 1, calendar: parsed, history: migrateOutcomeHistory(parsed) };
  }
  validateArchive(parsed);
  return { format: "time-planner-backup", version: 1, calendar: parsed.calendar, history: parsed.history };
}
export function exportArchive(archive: PlannerArchive): string {
  validateArchive(archive);
  return JSON.stringify({ ...archive, exportedAt: new Date().toISOString() }, null, 2);
}
