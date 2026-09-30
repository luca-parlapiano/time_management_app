import type { CalendarState, ItemOutcome } from "../model/calendar.js";
import type { Habit } from "../model/habit.js";
import type { OutcomeRecord } from "../model/outcomeArchive.js";
import { occurrences } from "./calendar.js";
import { latestOutcomes } from "./outcomeArchive.js";

export interface HabitTimelineEntry {
  sourceId: string;
  occurrenceDate: string;
  date: string;
  start?: string;
  outcome?: ItemOutcome;
  moved: boolean;
  removed: boolean;
}

export interface HabitSummary {
  completed: number;
  planned: number;
  streak: number;
  next?: HabitTimelineEntry;
}

/**
 * Riassume le occasioni già iniziate nel periodo ricevuto, la serie consecutiva
 * di completamenti e la prossima occasione ancora pianificata. Quelle future
 * non entrano nel denominatore; quelle rimosse senza esito non entrano nel percorso.
 */
export function habitSummary(entries: HabitTimelineEntry[], referenceDate: string, referenceTime: string): HabitSummary {
  const due = entries.filter(entry => entry.date < referenceDate || entry.date === referenceDate && (entry.start ?? "00:00") <= referenceTime);
  const completed = due.filter(entry => entry.outcome === "completed").length;
  const settled = entries.filter(entry => entry.date < referenceDate || entry.date === referenceDate && entry.outcome !== undefined);
  let streak = 0;
  for (let index = settled.length - 1; index >= 0 && settled[index].outcome === "completed"; index -= 1) streak += 1;
  const next = entries.find(entry => !entry.removed && !entry.outcome && (entry.date > referenceDate || entry.date === referenceDate && (entry.start ?? "00:00") > referenceTime));
  return { completed, planned: due.length, streak, next };
}

/**
 * Ricostruisce il percorso nel periodo richiesto dalle serie correnti e dagli esiti storici.
 * Un esito di un'occorrenza rimossa resta visibile una sola volta, usando l'ultima correzione;
 * senza un esito registrato, un'occorrenza rimossa non compare nello storico.
 */
export function habitTimeline(calendar: CalendarState, history: OutcomeRecord[], habit: Habit, from: string, through: string): HabitTimelineEntry[] {
  const sources = new Set(habit.plans.flatMap(plan => plan.sourceIds));
  const entries = new Map<string, HabitTimelineEntry>();
  const keyOf = (sourceId: string, occurrenceDate: string) => JSON.stringify([sourceId, occurrenceDate]);
  for (const occurrence of occurrences(calendar.items.filter(item => sources.has(item.id)), from, through)) {
    if (occurrence.date < from || occurrence.date > through) continue;
    entries.set(keyOf(occurrence.sourceId, occurrence.occurrenceDate), {
      sourceId: occurrence.sourceId, occurrenceDate: occurrence.occurrenceDate, date: occurrence.date,
      start: occurrence.start, outcome: occurrence.outcome, moved: occurrence.exception, removed: false,
    });
  }
  for (const record of latestOutcomes(history)) {
    if (!sources.has(record.sourceId) || record.eventDate < from || record.eventDate > through) continue;
    const key = keyOf(record.sourceId, record.occurrenceDate);
    if (entries.has(key)) continue;
    entries.set(key, {
      sourceId: record.sourceId, occurrenceDate: record.occurrenceDate, date: record.eventDate,
      outcome: record.outcome, moved: record.eventDate !== record.occurrenceDate, removed: true,
    });
  }
  return [...entries.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "") || keyOf(a.sourceId, a.occurrenceDate).localeCompare(keyOf(b.sourceId, b.occurrenceDate)));
}
