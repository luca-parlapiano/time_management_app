import type { EventColor, EventIcon, ItemOutcome } from "./calendar.js";
import type { OutcomeRecord } from "./outcomeArchive.js";

/** Esiti deduplicati di un solo snapshot; le date completate sono ordinate e conservano le occorrenze dello stesso giorno. */
export interface HabitOutcomeIndex {
  readonly latest: readonly OutcomeRecord[];
  readonly byOccurrence: ReadonlyMap<string, OutcomeRecord>;
  readonly byActivity: ReadonlyMap<string, {
    readonly records: readonly OutcomeRecord[];
    readonly completedDates: readonly string[];
    readonly recordedDates: readonly string[];
  }>;
}

export type HabitStepTarget = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Habit {
  id: string;
  title: string;
  motivation: string;
  icon: EventIcon;
  color: EventColor;
  stepTarget: HabitStepTarget;
  /** Se true, il raggiungimento di tutti gli step compare nella raccolta Trofei. */
  trophiesEnabled?: boolean;
}

export interface HabitDraft {
  title: string;
  motivation: string;
  icon: EventIcon;
  color: EventColor;
  stepTarget: HabitStepTarget;
  trophiesEnabled?: boolean;
  startsOn: string;
  weekdays: number[];
  start: string;
  durationMinutes: number;
}

export interface HabitTimelineEntry {
  sourceId: string;
  occurrenceDate: string;
  date: string;
  start?: string;
  outcome?: ItemOutcome;
  moved: boolean;
  removed: boolean;
}

export interface HabitJourneyProgress {
  /** Eventi fatti; non determina la chiusura della serie. */
  completed: number;
  /** Eventi con esito registrato, limitati al numero di step scelti. */
  currentStep: number;
  /** Esiti degli step valutati in ordine di data, limitati al traguardo. */
  stepOutcomes: ItemOutcome[];
  milestonesReached: number;
  target: HabitStepTarget;
}

export interface HabitDashboardRow {
  habit: Habit;
  journey: HabitJourneyProgress;
  remaining: number;
  entries: HabitTimelineEntry[];
  counts: Record<ItemOutcome | "pending", number>;
}

export interface HabitDashboard {
  rows: HabitDashboardRow[];
  totalHabits: number;
  milestonesReached: number;
  featured: HabitDashboardRow | null;
}
