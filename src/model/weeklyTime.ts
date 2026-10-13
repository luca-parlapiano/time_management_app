import type { EventColor, EventIcon } from './calendar.js';

export type TimePeriod = 'week' | 'month';

export interface TimeSeries {
  id: string;
  period: TimePeriod;
  startsOn: string;
  endsOn: string;
  targetMinutes: number;
  decision?: 'repeat' | 'stop';
  nextSeriesId?: string;
  closedOn?: string;
  sessionIds?: string[];
}

export interface TimeSeriesResult {
  habit: WeeklyTimeHabit;
  series: TimeSeries;
  completedMinutes: number;
  reached: boolean;
}

export interface WeeklyTimeHabit {
  id: string;
  title: string;
  motivation: string;
  icon: EventIcon;
  color: EventColor;
  startsOn: string;
  archivedOn?: string;
  targets: { effectiveFrom: string; minutes: number }[];
  series?: TimeSeries[];
}

export interface WeeklyTimeHabitDraft {
  title: string;
  motivation: string;
  icon: EventIcon;
  color: EventColor;
  startsOn: string;
  targetMinutes: number;
  period?: TimePeriod;
}

export interface TimeSession {
  id: string;
  habitId: string;
  date: string;
  minutes: number;
  notes: string;
  sourceId?: string;
  occurrenceDate?: string;
  removed: boolean;
}

export interface TimeSessionRecord {
  id: string;
  session: TimeSession;
  recordedAt: string;
}

export interface TimeSessionCommand {
  commandId: string;
  session: TimeSession;
}

export interface WeeklyTimeProgress {
  period?: TimePeriod;
  week: string;
  end: string;
  targetMinutes: number;
  completedMinutes: number;
  plannedMinutes: number;
  futureMinutes: number;
  remainingMinutes: number;
  percent: number;
  partial: boolean;
  state: 'inactive' | 'future' | 'ongoing' | 'reached' | 'below';
}
