export type ItemKind = "fixed" | "protected" | "flexible";

export type ItemOutcome = "completed" | "skipped";

export type EventIcon = "activity" | "work" | "study" | "sport" | "rest" | "meal" | "people" | "heart" | "gaming";

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
  notes: string;
  goalId?: string;
}

export interface CalendarItem extends ItemData {
  id: string;
  activityId?: string;
  habitId?: string;
  /** Fine effettiva del percorso, ricalcolata dagli esiti confermati. */
  habitClosedOn?: string;
  /** Ultima data originale pianificata per gli step della serie; derivata dal traguardo. */
  habitPlannedUntil?: string;
  /** Identifica una routine monitorata, distinta da una normale serie del calendario. */
  routine?: true;
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
  habitId?: string;
  routine?: true;
}

export interface CalendarGoal { id: string; name: string }

export interface CalendarProfile { name: string; notes: string }

export interface CalendarState {
  version: 2;
  items: CalendarItem[];
  goals: CalendarGoal[];
  profile: CalendarProfile | null;
}

/** Intervallo di un evento nella giornata e limiti verticali della sua scheda in pixel. */
export interface AgendaTimeSlot {
  start: number;
  end: number;
  top: number;
  bottom: number;
}

/** Intervallo civile, espresso in minuti dalla mezzanotte, da rappresentare nella griglia. */
export interface CalendarTimeRange { start: number; end: number }

/** Scala verticale condivisa dai giorni: punti di cambio densità e altezza minima in pixel. */
export interface CalendarTimeline {
  points: { minute: number; offset: number }[];
  height: number;
}

export interface EditTarget { sourceId: string; occurrenceDate: string; scope: "occurrence" | "series"; applyAppearanceToSeries?: boolean; linkedSourceIds?: string[] }

export interface EditAccess { actor: "user" | "engine" | "ai"; unlocked?: boolean }
