import type { EventColor, EventIcon } from './calendar.js';
import type { WeeklyDayStatistics } from './weeklyStatistics.js';

export interface StatisticsActivity { id: string; title: string; color: EventColor; icon: EventIcon }
export interface ActivityDayStatistics extends WeeklyDayStatistics {
  percent: number | null;
  state: 'empty' | 'future' | 'pending' | 'recorded';
}
export interface ActivityYearStatistics { activity: StatisticsActivity; year: number; days: ActivityDayStatistics[] }
export interface ActivityHeatmapProps { year: number }
