import type { CalendarState, EventColor, EventIcon, ItemOutcome } from "./calendar.js";

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
  version: 1;
  calendar: CalendarState;
  history: OutcomeRecord[];
}
