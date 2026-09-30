import { eventColors, eventIcons } from "../constants.js";
import type { CalendarItem, CalendarState } from "../model/calendar.js";
import type { Habit, HabitDraft } from "../model/habit.js";
import { addDays, putWeeklyActivity, validDate } from "./calendar.js";
import { isIntegerInRange } from "../utils/numbers.js";
import { toMinutes } from "../utils/time.js";

export interface CreateHabitIds { habitId: string; planId: string }

/** Valida i dati inseriti per una nuova abitudine programmata a giorni e orario definiti. */
export function validateHabitDraft(input: HabitDraft): void {
  if (!input || typeof input.title !== "string" || !input.title.trim()) throw new Error("Inserisci il nome dell'abitudine.");
  if (typeof input.notes !== "string") throw new Error("Note non valide.");
  if (!Object.hasOwn(eventIcons, input.icon) || !Object.hasOwn(eventColors, input.color)) throw new Error("Aspetto dell'abitudine non valido.");
  if (!validDate(input.startsOn)) throw new Error("Data iniziale non valida.");
  if (!Array.isArray(input.weekdays) || !input.weekdays.length || input.weekdays.some(day => !isIntegerInRange(day, 0, 6)) || new Set(input.weekdays).size !== input.weekdays.length) {
    throw new Error("Scegli almeno un giorno della settimana.");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start)) throw new Error("Orario non valido.");
  if (!isIntegerInRange(input.durationMinutes, 5, 1440)) throw new Error("La durata deve essere compresa tra 5 minuti e 24 ore.");
}

/**
 * Crea un'abitudine e le serie settimanali collegate in un unico risultato immutabile.
 * Se un appuntamento entra in conflitto, l'operazione solleva un errore e il chiamante
 * non riceve modifiche parziali.
 */
export function createHabit(calendar: CalendarState, habits: Habit[], draft: HabitDraft, ids: CreateHabitIds): { calendar: CalendarState; habits: Habit[] } {
  validateHabitDraft(draft);
  if (!ids.habitId || !ids.planId || habits.some(habit => habit.id === ids.habitId)) throw new Error("Identità dell'abitudine non valida.");
  const startMinutes = toMinutes(draft.start);
  const endTotal = startMinutes + draft.durationMinutes;
  const end = `${String(Math.floor(endTotal / 60) % 24).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
  const endDate = endTotal >= 1440 ? addDays(draft.startsOn, 1) : draft.startsOn;
  const proposed: CalendarItem = {
    id: ids.planId,
    habitId: ids.habitId,
    habitPlanId: ids.planId,
    title: draft.title.trim(),
    notes: draft.notes,
    icon: draft.icon,
    color: draft.color,
    coverImage: false,
    date: draft.startsOn,
    endDate,
    start: draft.start,
    end,
    kind: "flexible",
    recurrence: {},
    exceptions: {},
  };
  const nextCalendar = putWeeklyActivity(calendar, proposed, [...draft.weekdays].sort(), { actor: "user", unlocked: false });
  const sourceIds = nextCalendar.items.filter(item => item.habitId === ids.habitId && item.habitPlanId === ids.planId).map(item => item.id);
  if (sourceIds.length !== draft.weekdays.length) throw new Error("Piano dell'abitudine incompleto.");
  const habit: Habit = {
    id: ids.habitId,
    title: draft.title.trim(),
    notes: draft.notes,
    icon: draft.icon,
    color: draft.color,
    status: "active",
    plans: [{ id: ids.planId, startsOn: draft.startsOn, weekdays: [...draft.weekdays].sort(), start: draft.start, durationMinutes: draft.durationMinutes, sourceIds }],
  };
  return { calendar: nextCalendar, habits: [...habits, habit] };
}

/** Verifica struttura, identità e collegamenti tra abitudini, piani e calendario. */
export function validateHabits(habits: unknown, calendar: CalendarState): asserts habits is Habit[] {
  if (!Array.isArray(habits)) throw new Error("Archivio delle abitudini non valido.");
  const habitIds = new Set<string>();
  const planIds = new Set<string>();
  const sources = new Map(calendar.items.map(item => [item.id, item]));
  for (const habit of habits) {
    if (!habit || typeof habit !== "object") throw new Error("Abitudine non valida.");
    if (typeof habit.id !== "string" || !habit.id || habitIds.has(habit.id) || typeof habit.title !== "string" || !habit.title.trim() || typeof habit.notes !== "string" ||
      !Object.hasOwn(eventIcons, habit.icon) || !Object.hasOwn(eventColors, habit.color) || !["active", "paused"].includes(habit.status) || !Array.isArray(habit.plans) || !habit.plans.length) {
      throw new Error("Abitudine non valida.");
    }
    habitIds.add(habit.id);
    for (const plan of habit.plans) {
      const draft: HabitDraft = { title: habit.title, notes: habit.notes, icon: habit.icon, color: habit.color, startsOn: plan.startsOn, weekdays: plan.weekdays, start: plan.start, durationMinutes: plan.durationMinutes };
      if (!plan || typeof plan.id !== "string" || !plan.id || planIds.has(plan.id) || !Array.isArray(plan.sourceIds) || plan.sourceIds.length !== plan.weekdays.length) throw new Error("Piano dell'abitudine non valido.");
      validateHabitDraft(draft);
      planIds.add(plan.id);
      for (const sourceId of plan.sourceIds) {
        const source = sources.get(sourceId);
        if (!source || source.habitId !== habit.id || source.habitPlanId !== plan.id) throw new Error("Collegamento dell'abitudine al calendario non valido.");
      }
    }
  }
  for (const item of calendar.items) {
    if (item.habitId && (!habitIds.has(item.habitId) || !planIds.has(item.habitPlanId!))) throw new Error("Appuntamento collegato a un'abitudine mancante.");
  }
}
