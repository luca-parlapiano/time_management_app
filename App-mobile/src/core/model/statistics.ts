// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import type { EventColor, EventIcon, ItemOutcome } from "./calendar";
import type { TimeSession } from "./weeklyTime";

export interface TimeStatisticsSession extends TimeSession {
  title: string;
  color: EventColor;
  icon: EventIcon;
}

export interface TimeDayStatistics {
  date: string;
  minutes: number;
  sessions: TimeStatisticsSession[];
}

export interface TimeActivityStatistics {
  activity: StatisticsActivity;
  minutes: number;
  sessionCount: number;
  completedSeries: number;
  days: TimeDayStatistics[];
}

export interface TimeYearStatistics {
  year: number;
  minutes: number;
  sessionCount: number;
  days: TimeDayStatistics[];
  activities: TimeActivityStatistics[];
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

export interface ActivityDayStatistics {
  date: string;
  total: number;
  completed: number;
  skipped: number;
  pending: number;
  percent: number | null;
  state: "empty" | "future" | "pending" | "recorded";
}

export interface ActivityYearStatistics {
  activity: StatisticsActivity;
  year: number;
  days: ActivityDayStatistics[];
  /** Serie con tutti gli step valutati nell’anno, anche con step già confermati su date future. Null per attività monitorate legacy senza traguardo. */
  completedSeries: number | null;
  /** Singoli eventi completati fino alla data di riferimento. */
  completed: number;
  /** Esiti completati già salvati su date future dell’anno, esclusi dal totale maturato. */
  futureCompleted: number;
  skipped: number;
  recentDays: ActivityDayStatistics[];
}
