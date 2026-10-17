// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import type { Habit, HabitDraft, HabitOutcomeIndex } from "../model/habit";
import type { PlannerArchive } from "../model/outcomeArchive";
import { CalendarConflictError, findConflict } from "./calendar";
import { indexHabitOutcomes } from "./habitOutcomeIndex";
import { habitDraft, habitPlanEnd } from "./habits";
import { addDays, validDate } from "../utils/dates";

/** Restituisce la data dell’ultimo step valutato, fatto o non fatto; senza esiti sufficienti restituisce undefined. */
export function habitCompletionDate(index: HabitOutcomeIndex, habit: Habit): string | undefined {
  return index.byActivity.get(habit.id)?.recordedDates[habit.stepTarget - 1];
}

/**
 * Ricalcola il limite degli appuntamenti dal numero di step e la chiusura dagli esiti,
 * anche per archivi precedenti con pianificazioni illimitate.
 * Mantiene pianificazione originale, eccezioni e storico: cambiare Fatto in Non fatto
 * non riapre la serie. Un aumento degli step può riaprirla, salvo conflitti.
 * Non modifica l'input e non salva contatori derivati.
 */
export function reconcileHabitCompletion(archive: PlannerArchive, previous?: PlannerArchive): PlannerArchive {
  const index = indexHabitOutcomes(archive.history);
  const ends = new Map((archive.habits ?? []).map(habit => [habit.id, habitCompletionDate(index, habit)]));
  const plannedEnds = new Map((archive.habits ?? []).map(habit => [habit.id, habitPlanEnd(
    archive.calendar.items.filter(item => item.habitId === habit.id).map(item => item.date), habit.stepTarget,
  )]));
  const result = { ...archive, calendar: { ...archive.calendar, items: archive.calendar.items.map(item => {
    const end = item.habitId ? ends.get(item.habitId) : undefined;
    const plannedEnd = item.habitId ? plannedEnds.get(item.habitId) : undefined;
    if (item.habitClosedOn === end && item.habitPlannedUntil === plannedEnd) return item;
    const next = { ...item };
    if (end) next.habitClosedOn = end;
    else delete next.habitClosedOn;
    if (plannedEnd) next.habitPlannedUntil = plannedEnd;
    else delete next.habitPlannedUntil;
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
  if (!end || !validDate(date)) throw new Error("Puoi ripetere solo una serie conclusa, da una data valida.");
  return { ...habitDraft(archive.calendar, habit), startsOn: date > end ? date : addDays(end, 1) };
}
