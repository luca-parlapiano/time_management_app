import type { StatisticsActivity, ActivityYearStatistics } from "./activityStatistics.js";
import type { DailyStatistics } from "./dailyStatistics.js";
import type { StatisticsEvent, WeeklyActivityStatistics, WeeklyActivitySummary } from "./weeklyStatistics.js";
import type { CalendarGoal, CalendarItem, CalendarProfile, CalendarState, EditTarget, ItemOutcome, Occurrence } from "./calendar.js";
import type { LoadingOptions } from "./loading.js";
import type { PlannerArchive } from "./outcomeArchive.js";
import type { Palette } from "./theme.js";

export interface DatabaseSnapshot {
  archive: PlannerArchive;
  revision: number;
  previous: PlannerArchive | null;
}

export interface DatabaseWrite {
  archive: PlannerArchive;
  expectedRevision: number | null;
  replace?: boolean;
  previous?: PlannerArchive | null;
}

export interface DatabaseBridge {
  read(): Promise<DatabaseSnapshot | null>;
  write(input: DatabaseWrite): Promise<DatabaseSnapshot>;
}

export interface DBRepository {
  initialize(): Promise<DatabaseSnapshot>;
  loadPalette(): Promise<Palette>;
  savePalette(value: Palette): Promise<void>;
  save(input: DatabaseWrite): Promise<DatabaseSnapshot>;
  prepareImport(text: string): Promise<PlannerArchive>;
  exportBackup(archive: PlannerArchive): Promise<string>;
}

export interface DBContextValue {
  getStatisticsActivities(): StatisticsActivity[];
  getActivityYearStatistics(id: string, year: number, referenceDate?: string): ActivityYearStatistics;
  getDailyStatistics(date: string): DailyStatistics;
  getWeeklyStatistics(event: StatisticsEvent, dailyDate: string): WeeklyActivityStatistics;
  getWeeklyActivities(dailyDate: string): WeeklyActivitySummary[];
  palette: Palette;
  paletteError: boolean;
  changePalette(value: Palette): Promise<void>;
  state: CalendarState;
  archive: PlannerArchive;
  previous: PlannerArchive | null;
  ready: boolean;
  error: string | null;
  saving: boolean;
  retry(): Promise<void>;
  recordOutcome(item: Occurrence, outcome: ItemOutcome, loading?: LoadingOptions): Promise<void>;
  saveItem(item: CalendarItem, unlocked: boolean, target?: EditTarget, weekdays?: number[], loading?: LoadingOptions): Promise<void>;
  deleteItem(target: EditTarget, unlocked: boolean, loading?: LoadingOptions): Promise<void>;
  savePreferences(profile: CalendarProfile, goals: CalendarGoal[], loading?: LoadingOptions): Promise<void>;
  clearCalendar(loading?: LoadingOptions): Promise<void>;
  prepareImport(text: string): Promise<PlannerArchive>;
  importBackup(archive: PlannerArchive, loading?: LoadingOptions): Promise<void>;
  exportBackup(previous?: boolean): Promise<string>;
}

export type DatabaseWorkerRequest = { id: number } & ({ action: 'read' } | { action: 'write'; input: DatabaseWrite });

export type DatabaseWorkerResponse = { id: number; result?: DatabaseSnapshot | null; error?: string };
