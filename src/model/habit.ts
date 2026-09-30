import type { EventColor, EventIcon } from "./calendar.js";

export interface HabitPlan {
  id: string;
  startsOn: string;
  weekdays: number[];
  start: string;
  durationMinutes: number;
  sourceIds: string[];
}

export interface Habit {
  id: string;
  title: string;
  notes: string;
  icon: EventIcon;
  color: EventColor;
  status: "active" | "paused";
  plans: HabitPlan[];
}

export interface HabitDraft {
  title: string;
  notes: string;
  icon: EventIcon;
  color: EventColor;
  startsOn: string;
  weekdays: number[];
  start: string;
  durationMinutes: number;
}
