import type { TimeSeriesResult } from '../core/model/weeklyTime';

export interface CompletedSeries {
  key: string;
  result: TimeSeriesResult;
  closedOn: string;
  order: number;
}

export interface MonthSeriesSummary {
  key: string;
  concluded: number;
  reached: number;
  minutes: number;
}

/** Elenca solo le serie confermate entro la data corrente, conservando l'ordine delle ripetizioni nello stesso giorno. */
export function completedTimeSeries(results: TimeSeriesResult[], referenceDate: string): CompletedSeries[] {
  return results.flatMap((result, order) => {
    const closedOn = result.series.closedOn ?? result.series.endsOn;
    return result.series.decision && closedOn <= referenceDate
      ? [{ key: JSON.stringify([result.habit.id, result.series.id]), result, closedOn, order }]
      : [];
  }).sort((a, b) => b.closedOn.localeCompare(a.closedOn) || b.order - a.order);
}

/** Costruisce gli ultimi mesi civili, includendo quelli senza serie concluse. */
export function recentSeriesMonths(series: CompletedSeries[], referenceDate: string, count = 6): MonthSeriesSummary[] {
  const year = Number(referenceDate.slice(0, 4));
  const month = Number(referenceDate.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, index) => {
    const key = new Date(Date.UTC(year, month - count + index + 1, 1)).toISOString().slice(0, 7);
    const entries = series.filter(entry => entry.closedOn.startsWith(key));
    return {
      key,
      concluded: entries.length,
      reached: entries.filter(entry => entry.result.reached).length,
      minutes: entries.reduce((total, entry) => total + entry.result.completedMinutes, 0),
    };
  });
}
