import type { CalendarState } from "../model/calendar.js";
import type { Habit, HabitJourneyProgress, HabitOutcomeIndex, HabitTimelineEntry } from "../model/habit.js";
import { occurrences } from "./calendar.js";

/**
 * Calcola il percorso dall’indice confermato, eventualmente fino alla data civile through.
 * Il filtro temporale avviene dopo le correzioni; senza limite include tutti i completamenti.
 * Parziali e salti non aggiungono step; senza esiti restituisce un progresso nullo.
 */
export function habitJourneyProgress(index: HabitOutcomeIndex, habit: Habit, through?: string): HabitJourneyProgress {
  const dates = index.byActivity.get(habit.id)?.completedDates ?? [];
  const completed = through === undefined ? dates.length : dates.filter(date => date <= through).length;
  const currentStep = Math.min(completed, habit.stepTarget);
  return {
    completed,
    currentStep,
    milestonesReached: completed >= habit.stepTarget ? 1 : 0,
    target: habit.stepTarget,
  };
}

/** Restituisce la prossima occasione non registrata rispetto a data e ora locali. */
export function nextHabitOccurrence(entries: HabitTimelineEntry[], referenceDate: string, referenceTime: string): HabitTimelineEntry | undefined {
  return entries.find(entry => !entry.removed && !entry.outcome && (entry.date > referenceDate || entry.date === referenceDate && (entry.start ?? "00:00") > referenceTime));
}

/**
 * Ricostruisce il percorso nel periodo civile richiesto dalle serie correnti e dall’indice confermato.
 * Un esito di un'occorrenza rimossa resta visibile una sola volta, usando l'ultima correzione;
 * senza un esito registrato, un'occorrenza rimossa non compare nello storico.
 */
export function habitTimeline(calendar: CalendarState, index: HabitOutcomeIndex, habit: Habit, from: string, through: string): HabitTimelineEntry[] {
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
  for (const record of index.byActivity.get(habit.id)?.records ?? []) {
    if (record.eventDate < from || record.eventDate > through) continue;
    const key = keyOf(record.sourceId, record.occurrenceDate);
    if (entries.has(key)) continue;
    entries.set(key, {
      sourceId: record.sourceId, occurrenceDate: record.occurrenceDate, date: record.eventDate,
      outcome: record.outcome, moved: record.eventDate !== record.occurrenceDate, removed: true,
    });
  }
  return [...entries.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "") || keyOf(a.sourceId, a.occurrenceDate).localeCompare(keyOf(b.sourceId, b.occurrenceDate)));
}
