import type { WeeklyTimeHabit, TimeSession, TimeSessionRecord } from "./weeklyTime.js";
import type { CalendarState, EventColor, EventIcon, ItemOutcome } from "./calendar.js";
import type { Habit } from "./habit.js";

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
