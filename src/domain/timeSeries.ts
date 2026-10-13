import type { PlannerArchive } from '../model/outcomeArchive.js';
import type { CalendarItem } from '../model/calendar.js';
import type { TimePeriod, TimeSeries, TimeSeriesResult, TimeSession, WeeklyTimeHabit } from '../model/weeklyTime.js';
import { addDays, validDate, weekStart } from '../utils/dates.js';
import { isIntegerInRange } from '../utils/numbers.js';
import { MAX_MONTHLY_MINUTES, MAX_WEEKLY_MINUTES } from '../constants.js';

/** Restituisce i confini civili di settimana o mese; rifiuta date fuori dall’intervallo supportato. */
export function timePeriodBounds(date: string, period: TimePeriod) {
  if (!validDate(date)) throw new Error('Data non valida.');
  const start = period === 'week' ? weekStart(date) : `${date.slice(0, 7)}-01`;
  let end = addDays(start, 6);
  if (period === 'month') {
    const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
    end = addDays(`${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`, -1);
  }
  if (!validDate(start) || !validDate(end)) throw new Error('Periodo fuori dall’intervallo supportato.');
  return { start, end };
}

/** Crea una serie che parte nella data richiesta e termina con il periodo civile, senza riporto di ore. */
export function createTimeSeries(id: string, period: TimePeriod, date: string, targetMinutes: number): TimeSeries {
  if (!id.trim() || !['week', 'month'].includes(period) || !isIntegerInRange(targetMinutes, 1, period === 'month' ? MAX_MONTHLY_MINUTES : MAX_WEEKLY_MINUTES)) throw new Error('Obiettivo della serie non valido.');
  return { id, period, startsOn: date, endsOn: timePeriodBounds(date, period).end, targetMinutes };
}

/** Calcola risultati indipendenti per serie sullo snapshot; esclude rimozioni e date future, senza salvare totali. */
export function timeSeriesResults(archive: PlannerArchive, referenceDate: string): TimeSeriesResult[] {
  if (!validDate(referenceDate)) throw new Error('Data non valida.');
  return (archive.weeklyTimeHabits ?? []).flatMap(habit => (habit.series ?? []).map(series => {
    const completedMinutes = (archive.timeSessions ?? []).filter(session => session.habitId === habit.id && !session.removed && seriesForSession(habit, session)?.id === series.id && session.date <= referenceDate)
      .reduce((total, session) => total + session.minutes, 0);
    return { habit, series, completedMinutes, reached: completedMinutes >= series.targetMinutes };
  }));
}

/** Trova l’ultima serie per una data civile; una ripetizione immediata può iniziare nello stesso giorno. */
export function seriesAtDate(habit: WeeklyTimeHabit, date: string) {
  return habit.series?.slice().reverse().find(series => series.startsOn <= date && series.endsOn >= date);
}

/** Risolve l’appartenenza di una registrazione: le chiusure conservano gli ID, i dati precedenti usano le date. */
export function seriesForSession(habit: WeeklyTimeHabit, session: TimeSession) {
  return habit.series?.find(series => series.sessionIds?.includes(session.id))
    ?? habit.series?.slice().reverse().find(series => !series.sessionIds && series.startsOn <= session.date && series.endsOn >= session.date);
}

/** Verifica che una nuova pianificazione o uno spostamento resti nella serie aperta cui è collegato. */
export function validateTimePlan(archive: PlannerArchive, item: CalendarItem): void {
  if (!item.weeklyHabitId) return;
  const habit = archive.weeklyTimeHabits?.find(entry => entry.id === item.weeklyHabitId);
  if (!habit) throw new Error('Abitudine a ore non trovata.');
  if (!habit.series) return;
  const series = seriesAtDate(habit, item.date);
  if (!series || series.decision || item.timeHabitUntil !== series.endsOn || item.endDate > series.endsOn) throw new Error('La pianificazione deve restare nel periodo della serie aperta.');
}

/** Conclude una serie raggiunta o scaduta; conserva l’appartenenza delle sessioni e riparte da oggi solo su scelta esplicita. I retry non duplicano serie. */
export function resolveTimeSeries(archive: PlannerArchive, habitId: string, seriesId: string, repeat: boolean, nextId: string, referenceDate: string): PlannerArchive {
  const habit = archive.weeklyTimeHabits?.find(entry => entry.id === habitId);
  const series = habit?.series?.find(entry => entry.id === seriesId);
  if (!habit || !series || !validDate(referenceDate)) throw new Error('La serie non è ancora terminata.');
  const decision: 'repeat' | 'stop' = repeat ? 'repeat' : 'stop';
  if (series.decision) {
    if (series.decision === decision) return archive;
    throw new Error('La serie è già conclusa.');
  }
  if (series.endsOn >= referenceDate && !timeSeriesResults(archive, referenceDate).find(result => result.habit.id === habitId && result.series.id === seriesId)?.reached) throw new Error('La serie non è ancora terminata.');
  if (habit.series?.at(-1)?.id !== series.id) throw new Error('Puoi proseguire soltanto dall’ultima serie.');
  if (repeat && (!nextId.trim() || habit.series.some(entry => entry.id === nextId))) throw new Error('Identità della nuova serie non valida.');
  const next = repeat ? createTimeSeries(nextId, series.period, referenceDate, series.targetMinutes) : undefined;
  const closedOn = series.endsOn < referenceDate ? series.endsOn : referenceDate;
  const sessionIds = (archive.timeSessions ?? []).filter(session => session.habitId === habitId && seriesForSession(habit, session)?.id === seriesId).map(session => session.id);
  return { ...archive, weeklyTimeHabits: archive.weeklyTimeHabits?.map(entry => entry.id !== habitId ? entry : {
    ...entry, ...(!repeat ? { archivedOn: closedOn } : {}),
    series: [...entry.series!.map(value => value.id === seriesId ? { ...value, decision, closedOn, sessionIds, ...(next ? { nextSeriesId: next.id } : {}) } : value), ...(next ? [next] : [])],
  }) };
}

/** Converte le vecchie settimane continue in serie senza spostare sessioni o audit. Conserva solo settimane iniziali/con dati, senza creare periodi vuoti saltati. */
export function upgradeTimeSeries(archive: PlannerArchive): PlannerArchive {
  if (!archive.weeklyTimeHabits?.some(habit => !habit.series)) return archive;
  const weeklyTimeHabits = archive.weeklyTimeHabits.map(habit => {
    if (habit.series) return habit;
    const dates = [habit.startsOn, ...(archive.timeSessions ?? []).filter(session => session.habitId === habit.id).map(session => session.date), ...(archive.timeSessionHistory ?? []).filter(record => record.session.habitId === habit.id).map(record => record.session.date)];
    const weeks = [...new Set(dates.map(weekStart))].sort();
    const series = weeks.map((week, index): TimeSeries => ({
      id: `${habit.id}:${week}`, period: 'week', startsOn: week < habit.startsOn ? habit.startsOn : week,
      endsOn: timePeriodBounds(week, 'week').end,
      targetMinutes: habit.targets.filter(target => target.effectiveFrom <= week).at(-1)!.minutes,
      ...(index < weeks.length - 1 || habit.archivedOn ? { decision: 'stop' as const } : {}),
    }));
    return { ...habit, series };
  });
  return { ...archive, weeklyTimeHabits, calendar: { ...archive.calendar, items: archive.calendar.items.map(item => {
    const habit = weeklyTimeHabits.find(entry => entry.id === item.weeklyHabitId);
    if (!habit || archive.weeklyTimeHabits?.find(entry => entry.id === habit.id)?.series) return item;
    return { ...item, timeHabitUntil: habit.archivedOn ?? habit.series!.at(-1)!.endsOn };
  }) } };
}
