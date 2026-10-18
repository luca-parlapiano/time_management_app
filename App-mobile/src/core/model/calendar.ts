// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
export type ItemKind = "fixed" | "protected" | "flexible";

export type ItemOutcome = "completed" | "skipped";

export type EventIcon = "activity" | "work" | "study" | "sport" | "rest" | "meal" | "people" | "heart" | "gaming" | "diving"
  | "ion-star" | "ion-book" | "ion-cafe" | "ion-airplane" | "ion-footsteps" | "ion-moon" | "ion-brush"
  | "ion-sparkles" | "ion-glasses" | "ion-code" | "ion-flash" | "ion-train" | "ion-map" | "ion-hammer"
  | "ion-flag" | "ion-paw" | "ion-beaker" | "ion-bookmark" | "ion-folder" | "ion-cloud"
  | "ion-chatbubble" | "ion-musical-note" | "ion-pencil" | "ion-shield" | "ion-key" | "ion-umbrella"
  | "ion-storefront" | "ion-podium";

export type EventColor = "blue" | "green" | "purple" | "orange" | "pink" | "teal" | `#${string}`;

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
  /** Ultima data visualizzata ammessa dopo l’archiviazione dell’abitudine a ore. */
  timeHabitUntil?: string;
  timeOriginalDate?: string;
  habitId?: string;
  weeklyHabitId?: string;
  /** Fine effettiva del percorso, ricalcolata dagli esiti confermati. */
  habitClosedOn?: string;
  /** Ultima data originale pianificata per gli step della serie; derivata dal traguardo. */
  habitPlannedUntil?: string;
  /** Compatibilità: identifica una vecchia attività ricorrente monitorata. Non usarlo per nuove creazioni. */
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
  weeklyHabitId?: string;
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
