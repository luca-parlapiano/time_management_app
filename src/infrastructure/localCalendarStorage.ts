import { emptyCalendar, validateCalendar } from "../domain/calendar";
import type { CalendarState } from "../model/calendar.js";
import type { CalendarLoad, CalendarStorage } from "../model/localCalendarStorage.js";
export type { CalendarLoad,CalendarStorage } from "../model/localCalendarStorage.js";

export const CALENDAR_STORAGE_KEY = "time-planner.calendar.v2";
export const LEGACY_STORAGE_KEY = "time-planner.local-state.v1";

export function loadCalendar(storage: CalendarStorage): CalendarLoad {
  let raw: string | null = null;
  let legacy: string | null = null;
  try {
    raw = storage.getItem(CALENDAR_STORAGE_KEY);
    legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (raw === null) return { state: emptyCalendar(), raw, legacy, error: null };
    const state: CalendarState = JSON.parse(raw);
    validateCalendar(state);
    return { state, raw, legacy, error: null };
  } catch {
    return { state: emptyCalendar(), raw, legacy, error: "Impossibile leggere l’archivio locale. Le modifiche sono bloccate per evitare sovrascritture. Esporta il recupero disponibile e riprova ad aprire l’app." };
  }
}
export function saveCalendar(storage: CalendarStorage, state: CalendarState): void {
  validateCalendar(state);
  // One atomic localStorage write; the UI commits only after it succeeds.
  storage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(state));
}
