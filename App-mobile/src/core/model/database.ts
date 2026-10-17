// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import type { TimeSeriesResult, WeeklyTimeHabit, WeeklyTimeHabitDraft, TimeSession, TimeSessionCommand, WeeklyTimeProgress } from "./weeklyTime";
import type { ActivityYearStatistics, DailyStatistics, StatisticsActivity, TimeYearStatistics } from "./statistics";
import type { CalendarGoal, CalendarItem, CalendarProfile, CalendarState, EditTarget, ItemOutcome, Occurrence } from "./calendar";
import type { LoadingOptions } from "./loading";
import type { PlannerArchive } from "./outcomeArchive";
import type { Palette } from "./theme";
import type { Habit, HabitDraft, HabitDashboard, HabitJourneyProgress, HabitTimelineEntry } from "./habit";
import type { Trophy } from "./trophy";

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
  weeklyTimeHabits: WeeklyTimeHabit[];
  timeSessions: TimeSession[];
  saveWeeklyTimeHabit(id: string, draft: WeeklyTimeHabitDraft): Promise<void>;
  cancelWeeklyTimeTarget(id: string): Promise<void>;
  archiveWeeklyTimeHabit(id: string): Promise<void>;
  saveTimeSession(command: TimeSessionCommand): Promise<void>;
  getWeeklyTimeProgress(id: string, date: string, referenceDate?: string, seriesId?: string): WeeklyTimeProgress;
  getTimeSessions(id: string, from: string, through: string, seriesId?: string): TimeSession[];
  getRecentTimeSessions(id: string, referenceDate?: string): TimeSession[];
  getTimeWeekMinutes(date: string): number;
  getTimeMinutes(date: string, habitId?: string): number;
  getTimeYearStatistics(year: number, referenceDate?: string): TimeYearStatistics;
  getTimeSeriesResults(referenceDate?: string): TimeSeriesResult[];
  resolveTimeSeries(habitId: string, seriesId: string, repeat: boolean, nextId: string): Promise<void>;
  setTimeSeriesTrophiesEnabled(habitId: string, seriesId: string, enabled: boolean): Promise<void>;
  getTrophies(referenceDate?: string): Trophy[];

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
  recordOutcomes(items: readonly Occurrence[], outcome: ItemOutcome): Promise<{ saved: number; skipped: number; lastDate?: string }>;
  saveHabit(input: HabitDraft, loading?: LoadingOptions): Promise<void>;
  updateHabit(id: string, input: HabitDraft, loading?: LoadingOptions): Promise<void>;
  setHabitTrophiesEnabled(id: string, enabled: boolean): Promise<void>;
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
