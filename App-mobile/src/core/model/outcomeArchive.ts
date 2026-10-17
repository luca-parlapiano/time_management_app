// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import type { WeeklyTimeHabit, TimeSession, TimeSessionRecord } from "./weeklyTime";
import type { CalendarState, EventColor, EventIcon, ItemOutcome } from "./calendar";
import type { Habit } from "./habit";

export interface OutcomeRecord {
  id: string;
  sourceId: string;
  activityId: string;
  occurrenceDate: string;
  eventDate: string;
  title: string;
  icon: EventIcon;
  color: EventColor;
  outcome: ItemOutcome;
  recordedAt: string | null;
}

export interface PlannerArchive {
  format: "time-planner-backup";
  version: 3;
  calendar: CalendarState;
  /** Assente nei backup creati prima dell'introduzione delle abitudini. */
  habits?: Habit[];
  history: OutcomeRecord[];
  weeklyTimeHabits?: WeeklyTimeHabit[];
  timeSessions?: TimeSession[];
  timeSessionHistory?: TimeSessionRecord[];
}
