import type { EventColor, EventIcon } from "./calendar.js";

export type HabitStepTarget = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Habit {
  id: string;
  title: string;
  motivation: string;
  icon: EventIcon;
  color: EventColor;
  stepTarget: HabitStepTarget;
}

export interface HabitDraft {
  title: string;
  motivation: string;
  icon: EventIcon;
  color: EventColor;
  stepTarget: HabitStepTarget;
  startsOn: string;
  weekdays: number[];
  start: string;
  durationMinutes: number;
}
