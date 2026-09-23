import type { CalendarGoal, CalendarProfile, CalendarState } from "./calendar.js";

export interface CalendarPreferencesProps {
  state: CalendarState; onSave: (profile: CalendarProfile, goals: CalendarGoal[]) => Promise<void>; onClose: () => void;
}
