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

export interface HabitJourneyProgress {
  completed: number;
  currentStep: number;
  chapter: number;
  milestonesReached: number;
  target: Habit["stepTarget"];
}

/**
 * Calcola il percorso permanente dell'abitudine usando l'ultimo esito confermato
 * di ogni occorrenza. Parziali, salti e tempo trascorso non sottraggono step.
 */
export function habitJourneyProgress(history: OutcomeRecord[], habit: Habit): HabitJourneyProgress {
  const completed = latestOutcomes(history).filter(record => record.activityId === habit.id && record.outcome === "completed").length;
  const currentStep = completed === 0 ? 0 : (completed - 1) % habit.stepTarget + 1;
  return {
    completed,
    currentStep,
    chapter: completed === 0 ? 1 : Math.floor((completed - 1) / habit.stepTarget) + 1,
    milestonesReached: Math.floor(completed / habit.stepTarget),
    target: habit.stepTarget,
  };
}

/** Restituisce la prossima occasione non registrata rispetto a data e ora locali. */
export function nextHabitOccurrence(entries: HabitTimelineEntry[], referenceDate: string, referenceTime: string): HabitTimelineEntry | undefined {
  return entries.find(entry => !entry.removed && !entry.outcome && (entry.date > referenceDate || entry.date === referenceDate && (entry.start ?? "00:00") > referenceTime));
}

/**
 * Ricostruisce il percorso nel periodo richiesto dalle serie correnti e dagli esiti storici.
 * Un esito di un'occorrenza rimossa resta visibile una sola volta, usando l'ultima correzione;
 * senza un esito registrato, un'occorrenza rimossa non compare nello storico.
 */
export function habitTimeline(calendar: CalendarState, history: OutcomeRecord[], habit: Habit, from: string, through: string): HabitTimelineEntry[] {
  const sources = new Set(calendar.items.filter(item => item.habitId === habit.id).map(item => item.id));
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
    if (record.activityId !== habit.id || record.eventDate < from || record.eventDate > through) continue;
    const key = keyOf(record.sourceId, record.occurrenceDate);
    if (entries.has(key)) continue;
    entries.set(key, {
      sourceId: record.sourceId, occurrenceDate: record.occurrenceDate, date: record.eventDate,
      outcome: record.outcome, moved: record.eventDate !== record.occurrenceDate, removed: true,
    });
  }
  return [...entries.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "") || keyOf(a.sourceId, a.occurrenceDate).localeCompare(keyOf(b.sourceId, b.occurrenceDate)));
}
