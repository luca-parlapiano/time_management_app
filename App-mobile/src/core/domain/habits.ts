// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import { eventIcons, isEventColor } from "../constants";
import type { CalendarItem, CalendarState } from "../model/calendar";
import type { Habit, HabitDraft, HabitStepTarget } from "../model/habit";
import { addDays, dateNumber, durationMinutes, isOccurrenceDate, putWeeklyActivity, validDate, validateCalendar, weekStart } from "./calendar";
import { isIntegerInRange } from "../utils/numbers";
import { toMinutes } from "../utils/time";

export interface CreateHabitIds { habitId: string }

/** Restituisce true soltanto per un numero intero di step compreso tra 1 e 12. */
export function isHabitStepTarget(value: unknown): value is HabitStepTarget {
  return typeof value === "number" && isIntegerInRange(value, 1, 12);
}

/**
 * Restituisce la prima data pianificata non precedente all'inizio dell'abitudine.
 * Se un giorno scelto è già trascorso nella settimana iniziale, usa la settimana seguente.
 */
export function firstHabitOccurrenceDate(input: Pick<HabitDraft, "startsOn" | "weekdays">): string {
  if (!validDate(input.startsOn) || !Array.isArray(input.weekdays) || !input.weekdays.length ||
    input.weekdays.some(day => !isIntegerInRange(day, 0, 6))) throw new Error("Pianificazione dell’abitudine non valida.");
  const [first] = input.weekdays.map(day => {
    const date = addDays(weekStart(input.startsOn), day);
    return date < input.startsOn ? addDays(date, 7) : date;
  }).sort();
  if (!first) throw new Error("Pianificazione dell’abitudine non valida.");
  return first;
}

/**
 * Calcola la data originale dell’ultimo step dalle prime date settimanali e dal traguardo.
 * Conta gli appuntamenti in ordine civile, anche a cavallo d’anno; non modifica le date ricevute.
 * Richiede almeno una data valida e un traguardo da 1 a 12.
 */
export function habitPlanEnd(firstDates: string[], stepTarget: HabitStepTarget): string {
  if (!firstDates.length || firstDates.some(date => !validDate(date)) || !isHabitStepTarget(stepTarget)) throw new Error("Pianificazione dell’abitudine non valida.");
  const dates = firstDates.flatMap(date => Array.from({ length: stepTarget }, (_, index) => addDays(date, index * 7))).sort();
  return dates[stepTarget - 1];
}

/** Valida identità, motivazione, traguardo e pianificazione di un'abitudine da acquisire. */
export function validateHabitDraft(input: HabitDraft): void {
  if (!input || typeof input.title !== "string" || !input.title.trim()) throw new Error("Inserisci il nome dell’abitudine.");
  if (typeof input.motivation !== "string") throw new Error("Motivazione non valida.");
  if (!Object.hasOwn(eventIcons, input.icon) || !isEventColor(input.color)) throw new Error("Aspetto dell’abitudine non valido.");
  if (!isHabitStepTarget(input.stepTarget)) throw new Error("Scegli un traguardo da 1 a 12 step.");
  if (input.trophiesEnabled !== undefined && typeof input.trophiesEnabled !== "boolean") throw new Error("Preferenza dei trofei non valida.");
  if (!validDate(input.startsOn)) throw new Error("Data iniziale non valida.");
  if (!Array.isArray(input.weekdays) || !input.weekdays.length || input.weekdays.some(day => !isIntegerInRange(day, 0, 6)) || new Set(input.weekdays).size !== input.weekdays.length) {
    throw new Error("Scegli almeno un giorno della settimana.");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start)) throw new Error("Orario non valido.");
  if (!isIntegerInRange(input.durationMinutes, 5, 1440)) throw new Error("La durata deve essere compresa tra 5 minuti e 24 ore.");
}

function proposedItem(draft: HabitDraft, habitId: string): CalendarItem {
  const startMinutes = toMinutes(draft.start);
  const endTotal = startMinutes + draft.durationMinutes;
  return {
    id: habitId,
    habitId,
    habitPlannedUntil: habitPlanEnd(draft.weekdays.map(day => {
      const date = addDays(weekStart(draft.startsOn), day);
      return date < draft.startsOn ? addDays(date, 7) : date;
    }), draft.stepTarget),
    title: draft.title.trim(),
    notes: draft.motivation,
    icon: draft.icon,
    color: draft.color,
    coverImage: false,
    date: draft.startsOn,
    endDate: endTotal >= 1440 ? addDays(draft.startsOn, 1) : draft.startsOn,
    start: draft.start,
    end: `${String(Math.floor(endTotal / 60) % 24).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`,
    kind: "flexible",
    recurrence: {},
    exceptions: {},
  };
}

function habitOf(id: string, draft: HabitDraft): Habit {
  return { id, title: draft.title.trim(), motivation: draft.motivation, icon: draft.icon, color: draft.color, stepTarget: draft.stepTarget,
    ...(draft.trophiesEnabled ? { trophiesEnabled: true } : {}) };
}

/**
 * Crea un'abitudine e le serie settimanali collegate in un unico risultato immutabile.
 * Un conflitto lascia calendario e abitudini originali invariati.
 */
export function createHabit(calendar: CalendarState, habits: Habit[], draft: HabitDraft, ids: CreateHabitIds): { calendar: CalendarState; habits: Habit[] } {
  validateHabitDraft(draft);
  if (!ids.habitId || habits.some(habit => habit.id === ids.habitId)) throw new Error("Identità dell’abitudine non valida.");
  const nextCalendar = putWeeklyActivity(calendar, proposedItem(draft, ids.habitId), [...draft.weekdays].sort(), { actor: "user", unlocked: false });
  return { calendar: nextCalendar, habits: [...habits, habitOf(ids.habitId, draft)] };
}

/**
 * Sostituisce atomicamente dati e pianificazione di un'abitudine esistente. Le serie
 * vengono ricreate con la stessa identità settimanale; gli esiti ancora compatibili
 * restano sul calendario e lo storico conserva tutti i risultati precedenti.
 */
export function updateHabit(calendar: CalendarState, habits: Habit[], id: string, draft: HabitDraft): { calendar: CalendarState; habits: Habit[] } {
  validateHabitDraft(draft);
  if (!habits.some(habit => habit.id === id)) throw new Error("Abitudine non trovata.");
  const previous = calendar.items.filter(item => item.habitId === id);
  const previousById = new Map(previous.map(item => [item.id, item]));
  const withoutHabit = { ...calendar, items: calendar.items.filter(item => item.habitId !== id) };
  let nextCalendar = putWeeklyActivity(withoutHabit, proposedItem(draft, id), [...draft.weekdays].sort(), { actor: "user", unlocked: false });
  nextCalendar = { ...nextCalendar, items: nextCalendar.items.map(item => {
    if (item.habitId !== id) return item;
    const old = previousById.get(item.id);
    if (!old?.outcomes) return item;
    const outcomes = Object.fromEntries(Object.entries(old.outcomes).filter(([date]) => isOccurrenceDate(item, date)));
    return { ...item, outcomes };
  }) };
  validateCalendar(nextCalendar);
  return { calendar: nextCalendar, habits: habits.map(habit => habit.id === id ? habitOf(id, draft) : habit) };
}

/**
 * Elimina un'abitudine e tutte le serie di calendario collegate in un unico risultato.
 * Lo storico degli esiti non fa parte di questo stato e deve essere conservato dal chiamante.
 */
export function deleteHabit(calendar: CalendarState, habits: Habit[], id: string): { calendar: CalendarState; habits: Habit[] } {
  if (!habits.some(habit => habit.id === id)) throw new Error("Abitudine non trovata.");
  const nextCalendar = { ...calendar, items: calendar.items.filter(item => item.habitId !== id) };
  const nextHabits = habits.filter(habit => habit.id !== id);
  validateCalendar(nextCalendar);
  validateHabits(nextHabits, nextCalendar);
  return { calendar: nextCalendar, habits: nextHabits };
}

/** Ricostruisce i campi modificabili dell'abitudine dalle sue serie nel calendario. */
export function habitDraft(calendar: CalendarState, habit: Habit): HabitDraft {
  const items = calendar.items.filter(item => item.habitId === habit.id).sort((a, b) => a.date.localeCompare(b.date));
  const first = items[0];
  if (!first) throw new Error("Pianificazione dell’abitudine non disponibile.");
  const weekdays = [...new Set(items.map(item => (dateNumber(item.date) - dateNumber(weekStart(item.date))) / 86_400_000))].sort();
  return {
    title: habit.title,
    motivation: habit.motivation,
    icon: habit.icon,
    color: habit.color,
    stepTarget: habit.stepTarget,
    trophiesEnabled: habit.trophiesEnabled,
    startsOn: first.date,
    weekdays,
    start: first.start,
    durationMinutes: durationMinutes(first),
  };
}

/** Verifica struttura, identità e collegamenti tra abitudini e calendario. */
export function validateHabits(habits: unknown, calendar: CalendarState): asserts habits is Habit[] {
  if (!Array.isArray(habits)) throw new Error("Archivio delle abitudini non valido.");
  const habitIds = new Set<string>();
  for (const habit of habits) {
    if (!habit || typeof habit !== "object" || typeof habit.id !== "string" || !habit.id || habitIds.has(habit.id) ||
      typeof habit.title !== "string" || !habit.title.trim() || typeof habit.motivation !== "string" || !isHabitStepTarget(habit.stepTarget) ||
      (habit.trophiesEnabled !== undefined && typeof habit.trophiesEnabled !== "boolean") ||
      !Object.hasOwn(eventIcons, habit.icon) || !isEventColor(habit.color)) throw new Error("Abitudine non valida.");
    habitIds.add(habit.id);
    const sources = calendar.items.filter(item => item.habitId === habit.id);
    if (!sources.length || sources.some(item => !item.recurrence || item.activityId !== habit.id)) throw new Error("Pianificazione dell’abitudine non valida.");
  }
  for (const item of calendar.items) {
    if (item.habitId && !habitIds.has(item.habitId)) throw new Error("Appuntamento collegato a un’abitudine mancante.");
  }
}

/** Aggiorna soltanto l'adesione ai trofei di una serie a step, senza ricrearne la pianificazione. */
export function setHabitTrophiesEnabled(habits: Habit[], id: string, enabled: boolean): Habit[] {
  if (typeof enabled !== "boolean") throw new Error("Preferenza dei trofei non valida.");
  if (!habits.some(habit => habit.id === id)) throw new Error("Abitudine non trovata.");
  return habits.map(habit => {
    if (habit.id !== id) return habit;
    const next = { ...habit };
    if (enabled) next.trophiesEnabled = true;
    else delete next.trophiesEnabled;
    return next;
  });
}
