import type { Habit, HabitDraft, HabitOutcomeIndex } from "../model/habit.js";
import type { PlannerArchive } from "../model/outcomeArchive.js";
import { CalendarConflictError, findConflict } from "./calendar.js";
import { indexHabitOutcomes } from "./habitOutcomeIndex.js";
import { habitDraft } from "./habits.js";
import { addDays, validDate } from "../utils/dates.js";

/** Legge dall’indice la data del traguardo; senza completamenti sufficienti restituisce undefined. */
export function habitCompletionDate(index: HabitOutcomeIndex, habit: Habit): string | undefined {
  return index.byActivity.get(habit.id)?.completedDates[habit.stepTarget - 1];
}

/**
 * Ricalcola la fine dei percorsi dagli esiti confermati, anche per archivi precedenti.
 * Mantiene pianificazione originale, eccezioni e storico: una correzione può riaprire
 * il percorso. Con uno stato precedente, rifiuta riaperture in conflitto.
 * Non modifica l'input e non salva contatori derivati.
 */
export function reconcileHabitCompletion(archive: PlannerArchive, previous?: PlannerArchive): PlannerArchive {
  const index = indexHabitOutcomes(archive.history);
  const ends = new Map((archive.habits ?? []).map(habit => [habit.id, habitCompletionDate(index, habit)]));
  const result = { ...archive, calendar: { ...archive.calendar, items: archive.calendar.items.map(item => {
    const end = item.habitId ? ends.get(item.habitId) : undefined;
    if (item.habitClosedOn === end) return item;
    const next = { ...item };
    if (end) next.habitClosedOn = end;
    else delete next.habitClosedOn;
    return next;
  }) } };
  if (previous) {
    const sources = new Map(previous.calendar.items.map(item => [item.id, item]));
    for (const item of result.calendar.items) {
      const oldEnd = sources.get(item.id)?.habitClosedOn;
      if (oldEnd && (!item.habitClosedOn || item.habitClosedOn > oldEnd)) {
        const conflict = findConflict(result.calendar.items, item.id);
        if (conflict) throw new CalendarConflictError(conflict, item.id);
      }
    }
  }
  return result;
}

/** Prepara una nuova serie indipendente, dalla data richiesta o dal giorno dopo la chiusura; rifiuta percorsi ancora attivi. */
export function repeatHabitDraft(archive: PlannerArchive, habit: Habit, date: string): HabitDraft {
  const end = habitCompletionDate(indexHabitOutcomes(archive.history), habit);
  if (!end || !validDate(date)) throw new Error("Puoi ripetere solo un’abitudine completata, da una data valida.");
  return { ...habitDraft(archive.calendar, habit), startsOn: date > end ? date : addDays(end, 1) };
}
