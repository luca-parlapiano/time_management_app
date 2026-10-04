import type { EventColor, EventIcon, ItemOutcome } from "./calendar.js";

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

export interface ActivityDayStatistics {
  date: string;
  total: number;
  completed: number;
  skipped: number;
  partial: number;
  pending: number;
  percent: number | null;
  state: "empty" | "future" | "pending" | "recorded";
}

export interface ActivityYearStatistics {
  activity: StatisticsActivity;
  year: number;
  days: ActivityDayStatistics[];
}
