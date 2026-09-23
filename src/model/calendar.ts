export type ItemKind = "fixed" | "protected" | "flexible";

export type ItemOutcome = "completed" | "skipped" | "partial";

export type ItemStatus = "todo" | "completed" | "skipped";

export type EventIcon = "activity" | "work" | "study" | "sport" | "rest" | "meal" | "people" | "heart";

export type EventColor = "blue" | "green" | "purple" | "orange" | "pink" | "teal";

export interface ItemData {
  coverImage?: boolean;
  icon?: EventIcon;
  color?: EventColor;
  title: string;
  date: string;
  endDate: string;
  start: string;
  end: string;
  kind: ItemKind;
  status?: ItemStatus;
  notes: string;
  goalId?: string;
}

export interface CalendarItem extends ItemData {
  id: string;
  activityId?: string;
  completedDates?: Record<string, boolean>;
  outcomes?: Record<string, ItemOutcome>;
  // Weekly on the weekday of date, inclusive until; no end means indefinite.
  recurrence?: { until?: string };
  // Keys always identify the ORIGINAL occurrence date, including moved occurrences.
  exceptions: Record<string, ItemData | null>;
}

export interface Occurrence extends ItemData {
  id: string;
  sourceId: string;
  occurrenceDate: string;
  completed: boolean;
  outcome?: ItemOutcome;
  recurring: boolean;
  exception: boolean;
}

export interface CalendarGoal { id: string; name: string }

export interface CalendarProfile { name: string; notes: string }

export interface CalendarState {
  version: 2;
  items: CalendarItem[];
  goals: CalendarGoal[];
  profile: CalendarProfile | null;
}

export interface EditTarget { sourceId: string; occurrenceDate: string; scope: "occurrence" | "series"; applyAppearanceToSeries?: boolean; linkedSourceIds?: string[] }

export interface EditAccess { actor: "user" | "engine" | "ai"; unlocked?: boolean }
