import type { EventColor, EventIcon, ItemOutcome } from './calendar.js';

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
export interface DailyDoughnutProps { statistics: DailyStatistics; compact?: boolean }
