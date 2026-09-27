import type { CalendarItem, EventColor, EventIcon, ItemOutcome, Occurrence } from "./calendar.js";

export type StatisticsEvent = CalendarItem | Occurrence;

export interface WeeklyDayStatistics {
  date: string;
  total: number;
  completed: number;
  skipped: number;
  partial: number;
  pending: number;
}

export interface WeeklyActivityStatistics extends Omit<WeeklyDayStatistics, "date"> {
  from: string;
  through: string;
  recorded: number;
  /** Percentuale degli esiti superati sugli esiti registrati; nulla in assenza di esiti. */
  completionRate: number | null;
  days: WeeklyDayStatistics[];
}

export interface WeeklyActivitySummary {
  event: CalendarItem;
  statistics: WeeklyActivityStatistics;
}

export interface StatisticsEntry {
  date: string;
  outcome?: ItemOutcome;
}

export interface DailyStatisticsEntry {
  title: string;
  color: EventColor;
  icon: EventIcon;
  outcome?: ItemOutcome;
}

export interface DailyActivitySegment {
  key: string;
  title: string;
  color: EventColor;
  icon: EventIcon;
  count: number;
  completed: number;
  contributionPercent: number;
}

export interface DailyStatistics {
  date: string;
  total: number;
  completed: number;
  skipped: number;
  partial: number;
  pending: number;
  recorded: number;
  completionPercent: number;
  activities: DailyActivitySegment[];
}

export interface StatisticsActivity {
  id: string;
  title: string;
  color: EventColor;
  icon: EventIcon;
}

export interface ActivityDayStatistics extends WeeklyDayStatistics {
  percent: number | null;
  state: "empty" | "future" | "pending" | "recorded";
}

export interface ActivityYearStatistics {
  activity: StatisticsActivity;
  year: number;
  days: ActivityDayStatistics[];
}
