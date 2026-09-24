import type { CalendarItem, ItemOutcome, Occurrence } from './calendar.js';

export type StatisticsEvent = CalendarItem | Occurrence;
export interface WeeklyDayStatistics {
  date: string;
  total: number;
  completed: number;
  skipped: number;
  partial: number;
  pending: number;
}
export interface WeeklyActivityStatistics extends Omit<WeeklyDayStatistics, 'date'> {
  from: string;
  through: string;
  recorded: number;
  /** Completed / recorded outcomes. Null when no outcome is available. */
  completionRate: number | null;
  days: WeeklyDayStatistics[];
}
export interface WeeklyActivitySummary { event: CalendarItem; statistics: WeeklyActivityStatistics }
export interface StatisticsEntry { date: string; outcome?: ItemOutcome }
