import type { HabitOutcomeIndex } from "../model/habit.js";
import type { OutcomeRecord } from "../model/outcomeArchive.js";
import { latestOutcomes } from "./outcomeArchive.js";

/**
 * Indicizza lo storico di uno snapshot senza modificarlo: l’ultima correzione
 * per sourceId/data originale prevale prima di raggruppare per attività.
 * Mantiene anche gli esiti di fonti rimosse e non filtra date future; sono le viste
 * a scegliere il periodo. Due occorrenze completate nello stesso giorno contano due volte.
 */
export function indexHabitOutcomes(history: OutcomeRecord[]): HabitOutcomeIndex {
  const latest = latestOutcomes(history);
  const byOccurrence = new Map<string, OutcomeRecord>();
  const byActivity = new Map<string, { records: OutcomeRecord[]; completedDates: string[]; recordedDates: string[] }>();
  for (const record of latest) {
    byOccurrence.set(JSON.stringify([record.sourceId, record.occurrenceDate]), record);
    let activity = byActivity.get(record.activityId);
    if (!activity) {
      activity = { records: [], completedDates: [], recordedDates: [] };
      byActivity.set(record.activityId, activity);
    }
    activity.records.push(record);
    activity.recordedDates.push(record.eventDate);
    if (record.outcome === "completed") activity.completedDates.push(record.eventDate);
  }
  for (const activity of byActivity.values()) {
    activity.completedDates.sort();
    activity.recordedDates.sort();
  }
  return { latest, byOccurrence, byActivity };
}
