import type { ActivityYearStatistics, DailyStatistics, StatisticsActivity } from "./statistics.js";
import type { CalendarGoal, CalendarItem, CalendarProfile, CalendarState, EditTarget, ItemOutcome, Occurrence } from "./calendar.js";
import type { LoadingOptions } from "./loading.js";
import type { PlannerArchive } from "./outcomeArchive.js";
import type { Palette } from "./theme.js";
import type { Habit, HabitDraft, HabitDashboard, HabitJourneyProgress, HabitTimelineEntry } from "./habit.js";

export interface DatabaseSnapshot {
  archive: PlannerArchive;
  revision: number;
  previous: PlannerArchive | null;
}

export interface DatabaseWrite {
  archive: PlannerArchive;
  expectedRevision: number | null;
  replace?: boolean;
}

export interface DatabaseBridge {
  read(): Promise<DatabaseSnapshot | null>;
  readPalette(): Promise<Palette>;
  writePalette(value: Palette): Promise<Palette>;
  write(input: DatabaseWrite): Promise<DatabaseSnapshot>;
  reset(expectedRevision: number): Promise<DatabaseSnapshot>;
}

/**
 * Confine della persistenza verso la UI. initialize, save e reset restituiscono
 * snapshot confermati con habitClosedOn ricostruito dagli esiti, anche in previous.
 * Vale anche per i repository in memoria. prepareImport restituisce invece un
 * candidato validato: il Provider lo controlla prima del salvataggio.
 */
export interface DBRepository {
  initialize(): Promise<DatabaseSnapshot>;
  loadPalette(): Promise<Palette>;
  savePalette(value: Palette): Promise<void>;
  save(input: DatabaseWrite): Promise<DatabaseSnapshot>;
  reset(expectedRevision: number): Promise<DatabaseSnapshot>;
  prepareImport(text: string): Promise<PlannerArchive>;
  exportBackup(archive: PlannerArchive): Promise<string>;
}

export interface DBContextValue {
  getHabitCompletionDate(id: string): string | undefined;
  getHabitProgress(id: string): HabitJourneyProgress;
  getHabitTimeline(id: string, from: string, through: string): HabitTimelineEntry[];
  getHabitDashboard(date: string, time: string): HabitDashboard;
  getStatisticsActivities(): StatisticsActivity[];
  getActivityYearStatistics(id: string, year: number, referenceDate?: string): ActivityYearStatistics;
  getDailyStatistics(date: string): DailyStatistics;
  palette: Palette;
  paletteError: boolean;
  changePalette(value: Palette): Promise<void>;
  state: CalendarState;
  habits: Habit[];
  archive: PlannerArchive;
  previous: PlannerArchive | null;
  ready: boolean;
  error: string | null;
  saving: boolean;
  retry(): Promise<void>;
  recordOutcome(item: Occurrence, outcome: ItemOutcome, loading?: LoadingOptions): Promise<void>;
  saveHabit(input: HabitDraft, loading?: LoadingOptions): Promise<void>;
  updateHabit(id: string, input: HabitDraft, loading?: LoadingOptions): Promise<void>;
  deleteHabit(id: string, loading?: LoadingOptions): Promise<void>;
  saveItem(item: CalendarItem, unlocked: boolean, target?: EditTarget, weekdays?: number[], loading?: LoadingOptions): Promise<void>;
  deleteItem(target: EditTarget, unlocked: boolean, loading?: LoadingOptions): Promise<void>;
  savePreferences(profile: CalendarProfile, goals: CalendarGoal[], loading?: LoadingOptions): Promise<void>;
  clearCalendar(loading?: LoadingOptions): Promise<void>;
  resetAll(): Promise<void>;
  prepareImport(text: string): Promise<PlannerArchive>;
  importBackup(archive: PlannerArchive, loading?: LoadingOptions): Promise<void>;
  exportBackup(previous?: boolean): Promise<string>;
}

export type DatabaseWorkerOperation =
  | { action: 'read' }
  | { action: 'write'; input: DatabaseWrite }
  | { action: 'reset'; expectedRevision: number }
  | { action: 'readPalette' }
  | { action: 'writePalette'; input: Palette };
export type DatabaseWorkerRequest = { id: number } & DatabaseWorkerOperation;

export type DatabaseWorkerResponse = { id: number; result?: DatabaseSnapshot | Palette | null; error?: string };
