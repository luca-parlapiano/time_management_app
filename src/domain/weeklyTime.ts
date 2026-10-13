import { createTimeSeries, seriesAtDate, timePeriodBounds } from './timeSeries.js';
import { eventColors, eventIcons, MAX_MONTHLY_MINUTES, MAX_SESSION_MINUTES, MAX_WEEKLY_MINUTES } from '../constants.js';
import { addDays, validDate, weekStart } from '../utils/dates.js';
import { isFiniteNumber, isIntegerInRange } from '../utils/numbers.js';
import { percentage } from '../utils/math.js';
import { durationMinutes, occurrences } from './calendar.js';
import type { PlannerArchive } from '../model/outcomeArchive.js';
import type { TimeSession, TimeSessionCommand, TimeSessionRecord, WeeklyTimeHabit, WeeklyTimeHabitDraft, WeeklyTimeProgress } from '../model/weeklyTime.js';

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Dati delle ore non validi.');
  return value as Record<string, unknown>;
}
function identity(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function requireDate(date: string) { if (!validDate(date)) throw new Error('Data non valida.'); }
function sameSession(a: TimeSession, b: TimeSession): boolean {
  return a.id === b.id && a.habitId === b.habitId && a.date === b.date && a.minutes === b.minutes && a.notes === b.notes && a.sourceId === b.sourceId && a.occurrenceDate === b.occurrenceDate && a.removed === b.removed;
}
function requireHabit(archive: PlannerArchive, id: string): WeeklyTimeHabit {
  const habit = archive.weeklyTimeHabits?.find(entry => entry.id === id);
  if (!habit) throw new Error('Abitudine a ore non trovata.');
  return habit;
}
function validateSession(value: unknown, habits: Map<string, WeeklyTimeHabit>): asserts value is TimeSession {
  const entry = object(value, ['id', 'habitId', 'date', 'minutes', 'notes', 'sourceId', 'occurrenceDate', 'removed']);
  const habit = typeof entry.habitId === 'string' ? habits.get(entry.habitId) : undefined;
  if (!identity(entry.id) || !habit || !validDate(entry.date) || entry.date < habit.startsOn || (habit.archivedOn && entry.date > habit.archivedOn) ||
    !isIntegerInRange(entry.minutes, 1, MAX_SESSION_MINUTES) || typeof entry.notes !== 'string' || typeof entry.removed !== 'boolean' ||
    ((entry.sourceId !== undefined || entry.occurrenceDate !== undefined) && (!identity(entry.sourceId) || !validDate(entry.occurrenceDate)))) throw new Error('Sessione di tempo non valida.');
}

/** Valida definizioni, sessioni e audit da dati esterni; ammette fonti di calendario rimosse, mai duplicati o totali impossibili. */
export function validateWeeklyTime(archive: PlannerArchive): void {
  const values: unknown = archive.weeklyTimeHabits === undefined ? [] : archive.weeklyTimeHabits;
  const sessions: unknown = archive.timeSessions === undefined ? [] : archive.timeSessions;
  const history: unknown = archive.timeSessionHistory === undefined ? [] : archive.timeSessionHistory;
  if (!Array.isArray(values) || !Array.isArray(sessions) || !Array.isArray(history)) throw new Error('Archivio delle ore non valido.');
  const habits = new Map<string, WeeklyTimeHabit>();
  for (const value of values) {
    const h = object(value, ['id', 'title', 'motivation', 'icon', 'color', 'startsOn', 'archivedOn', 'targets', 'series']);
    if (!identity(h.id) || habits.has(h.id) || archive.habits?.some(entry => entry.id === h.id) || !identity(h.title) || typeof h.motivation !== 'string' ||
      typeof h.icon !== 'string' || !Object.hasOwn(eventIcons, h.icon) || typeof h.color !== 'string' || !Object.hasOwn(eventColors, h.color) ||
      !validDate(h.startsOn) || (h.archivedOn !== undefined && (!validDate(h.archivedOn) || h.archivedOn < h.startsOn)) || !Array.isArray(h.targets) || !h.targets.length) throw new Error('Abitudine a ore non valida.');
    let previous = '';
    for (const [index, value] of h.targets.entries()) {
      const target = object(value, ['effectiveFrom', 'minutes']);
      if (!validDate(target.effectiveFrom) || weekStart(target.effectiveFrom) !== target.effectiveFrom || target.effectiveFrom <= previous ||
        (index === 0 && target.effectiveFrom !== weekStart(h.startsOn)) || !isIntegerInRange(target.minutes, 1, MAX_WEEKLY_MINUTES)) throw new Error('Obiettivo settimanale non valido.');
      previous = target.effectiveFrom;
    }
    if (h.series !== undefined) {
      if (!Array.isArray(h.series) || !h.series.length) throw new Error('Serie delle ore non valide.');
      let end = '';
      const seriesIds = new Set<string>();
      for (const [index, raw] of h.series.entries()) {
        const series = object(raw, ['id', 'period', 'startsOn', 'endsOn', 'targetMinutes', 'decision', 'nextSeriesId']);
        if (!identity(series.id) || seriesIds.has(series.id) || (series.period !== 'week' && series.period !== 'month') ||
          !validDate(series.startsOn) || !validDate(series.endsOn) || series.startsOn < h.startsOn || series.startsOn <= end ||
          series.endsOn !== timePeriodBounds(series.startsOn, series.period).end ||
          !isIntegerInRange(series.targetMinutes, 1, series.period === 'month' ? MAX_MONTHLY_MINUTES : MAX_WEEKLY_MINUTES) ||
          (series.decision !== undefined && series.decision !== 'repeat' && series.decision !== 'stop') ||
          (index < h.series.length - 1 && !series.decision)) throw new Error('Serie delle ore non valida.');
        const next: unknown = h.series[index + 1];
        if ((series.decision === 'repeat' && (!identity(series.nextSeriesId) || !next || typeof next !== 'object' || !('id' in next) || next.id !== series.nextSeriesId)) ||
          (series.decision !== 'repeat' && series.nextSeriesId !== undefined)) throw new Error('Ripetizione della serie non valida.');
        seriesIds.add(series.id); end = series.endsOn;
      }
    }
    habits.set(h.id, h as unknown as WeeklyTimeHabit);
  }
  for (const item of archive.calendar.items) {
    if (!item.weeklyHabitId) continue;
    const habit = habits.get(item.weeklyHabitId);
    if (!habit || item.date < habit.startsOn || (!habit.series && item.timeHabitUntil !== habit.archivedOn) || (habit?.series && (!item.timeHabitUntil || item.timeHabitUntil > habit.series.at(-1)!.endsOn)) || Object.values(item.exceptions).some(value => value && value.date < habit.startsOn)) throw new Error('Pianificazione delle ore non valida.');
  }
  const ids = new Set<string>(), links = new Set<string>(), totals = new Map<string, number>();
  for (const session of sessions) {
    validateSession(session, habits);
    if (habits.get(session.habitId)?.series && !seriesAtDate(habits.get(session.habitId)!, session.date)) throw new Error('Sessione fuori dalla sua serie.');
    if (ids.has(session.id)) throw new Error('Sessione duplicata.');
    ids.add(session.id);
    if (session.sourceId) {
      const key = JSON.stringify([session.sourceId, session.occurrenceDate]);
      if (links.has(key)) throw new Error('Questa occorrenza ha già una sessione.');
      links.add(key);
      const source = archive.calendar.items.find(item => item.id === session.sourceId);
      if (source && source.weeklyHabitId !== session.habitId) throw new Error('Sessione collegata a un’altra abitudine.');
    }
    if (!session.removed) {
      const key = JSON.stringify([session.habitId, session.date]);
      const total = (totals.get(key) ?? 0) + session.minutes;
      if (total > MAX_SESSION_MINUTES) throw new Error('Il tempo registrato per questa abitudine supera 24 ore nella giornata.');
      totals.set(key, total);
    }
  }
  const commands = new Set<string>(), latest = new Map<string, TimeSession>();
  for (const value of history) {
    const record = object(value, ['id', 'session', 'recordedAt']);
    if (!identity(record.id) || commands.has(record.id) || typeof record.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(record.recordedAt) || !isFiniteNumber(Date.parse(record.recordedAt))) throw new Error('Storico delle ore non valido.');
    validateSession(record.session, habits);
    if (!ids.has(record.session.id)) throw new Error('Storico senza sessione.');
    const previous = latest.get(record.session.id);
  if (previous && previous.habitId !== record.session.habitId) throw new Error('Identità della sessione modificata.');
    commands.add(record.id);
    latest.set(record.session.id, record.session);
  }
  for (const session of sessions as TimeSession[]) {
    const last = latest.get(session.id);
    if (!last || !sameSession(last, session)) throw new Error('Sessione e storico non allineati.');
  }
}

/** Crea o modifica l’identità di un’abitudine; i cambi del target attivo decorrono dal lunedì successivo. */
export function saveWeeklyTimeHabit(archive: PlannerArchive, id: string, draft: WeeklyTimeHabitDraft, referenceDate: string): PlannerArchive {
  requireDate(referenceDate);
  const previous = archive.weeklyTimeHabits?.find(habit => habit.id === id);
  if (previous?.archivedOn) throw new Error('L’abitudine è archiviata.');
  if (previous && previous.startsOn !== draft.startsOn) throw new Error('La data iniziale non può essere modificata.');
  if (!isIntegerInRange(draft.targetMinutes, 1, draft.period === 'month' ? MAX_MONTHLY_MINUTES : MAX_WEEKLY_MINUTES)) throw new Error('Scegli un obiettivo valido per il periodo selezionato.');
  requireDate(draft.startsOn);
  if (draft.period || previous?.series) {
    const current = previous?.series?.at(-1);
    if (current && (current.decision || current.endsOn < referenceDate)) throw new Error('La serie è terminata: scegli se ripeterla dal riepilogo.');
    const period = draft.period ?? current?.period ?? 'week';
    if (current && period !== current.period) throw new Error('Il periodo di una serie avviata non può cambiare.');
    const series = current ? { ...current, targetMinutes: draft.targetMinutes } : createTimeSeries(`${id}:first`, period, draft.startsOn, draft.targetMinutes);
    const habit: WeeklyTimeHabit = { id, title: draft.title.trim(), motivation: draft.motivation, icon: draft.icon, color: draft.color, startsOn: draft.startsOn,
      targets: previous?.targets ?? [{ effectiveFrom: weekStart(draft.startsOn), minutes: Math.min(draft.targetMinutes, MAX_WEEKLY_MINUTES) }],
      series: current ? previous!.series!.map(entry => entry.id === current.id ? series : entry) : [series] };
    const result = { ...archive, timeSessions: archive.timeSessions ?? [], timeSessionHistory: archive.timeSessionHistory ?? [], weeklyTimeHabits: [...(archive.weeklyTimeHabits ?? []).filter(entry => entry.id !== id), habit] };
    validateWeeklyTime(result); return result;
  }
  const targets = previous ? [...previous.targets] : [{ effectiveFrom: weekStart(draft.startsOn), minutes: draft.targetMinutes }];
  if (previous) {
    if (previous.startsOn > referenceDate) targets[0] = { ...targets[0], minutes: draft.targetMinutes };
    else {
      const nextWeek = addDays(weekStart(referenceDate), 7);
      requireDate(nextWeek);
      const current = targets.filter(target => target.effectiveFrom <= weekStart(referenceDate)).at(-1)!;
      const future = targets.find(target => target.effectiveFrom === nextWeek);
      if (draft.targetMinutes !== (future?.minutes ?? current.minutes)) {
        const retained = targets.filter(target => target.effectiveFrom < nextWeek);
        if (draft.targetMinutes !== current.minutes) retained.push({ effectiveFrom: nextWeek, minutes: draft.targetMinutes });
        targets.splice(0, targets.length, ...retained);
      }
    }
  }
  const habit: WeeklyTimeHabit = { id, title: draft.title.trim(), motivation: draft.motivation, color: draft.color, icon: draft.icon, startsOn: draft.startsOn, targets };
  const result = { ...archive, timeSessions: archive.timeSessions ?? [], timeSessionHistory: archive.timeSessionHistory ?? [], weeklyTimeHabits: [...(archive.weeklyTimeHabits ?? []).filter(entry => entry.id !== id), habit] };
  validateWeeklyTime(result);
  return result;
}

/** Annulla solo la variazione non ancora entrata in vigore; lo storico dei target trascorsi resta intatto. */
export function cancelWeeklyTimeTarget(archive: PlannerArchive, id: string, referenceDate: string): PlannerArchive {
  requireDate(referenceDate);
  const habit = requireHabit(archive, id);
  return { ...archive, weeklyTimeHabits: archive.weeklyTimeHabits?.map(entry => entry.id === id ? { ...habit, targets: habit.targets.filter((target, index) => index === 0 || target.effectiveFrom <= weekStart(referenceDate)) } : entry) };
}

/** Archivia da oggi conservando diario e audit; il limite del piano esclude anche le eccezioni spostate nel futuro. */
export function archiveWeeklyTimeHabit(archive: PlannerArchive, id: string, referenceDate: string): PlannerArchive {
  requireDate(referenceDate);
  const habit = requireHabit(archive, id);
  if (habit.startsOn > referenceDate) throw new Error('Puoi archiviare l’abitudine dalla sua data iniziale.');
  const result = { ...archive,
    weeklyTimeHabits: archive.weeklyTimeHabits?.map(entry => entry.id === id ? { ...entry, archivedOn: referenceDate, ...(entry.series ? { series: entry.series.map(series => series.decision ? series : { ...series, decision: 'stop' as const }) } : {}) } : entry),
    calendar: { ...archive.calendar, items: archive.calendar.items.map(item => item.weeklyHabitId === id ? { ...item, timeHabitUntil: item.timeHabitUntil && item.timeHabitUntil < referenceDate ? item.timeHabitUntil : referenceDate } : item) },
  };
  validateWeeklyTime(result);
  return result;
}

/** Salva valori espliciti con ID comando stabile: retry identici sono innocui; correzioni e rimozioni conservano l’audit. */
export function saveTimeSession(archive: PlannerArchive, command: TimeSessionCommand, referenceDate: string, recordedAt: string): PlannerArchive {
  requireDate(referenceDate);
  if (!identity(command.commandId)) throw new Error('Comando non valido.');
  const repeated = archive.timeSessionHistory?.find(record => record.id === command.commandId);
  if (repeated) {
    if (!sameSession(repeated.session, command.session)) throw new Error('Comando già usato per dati differenti.');
    return archive;
  }
  const session = { ...command.session };
  const habit = requireHabit(archive, session.habitId);
  const previous = archive.timeSessions?.find(entry => entry.id === session.id);
  if (habit.series) {
    const series = seriesAtDate(habit, session.date);
    if (!series || series.decision || (previous && seriesAtDate(habit, previous.date)?.id !== series.id)) throw new Error('La registrazione deve restare nella sua serie aperta.');
  }
  if (previous && previous.habitId !== session.habitId) throw new Error('Non puoi cambiare abitudine a una sessione.');
  if (session.date > referenceDate && (!session.removed || !previous || !sameSession({ ...previous, removed: true }, session))) throw new Error('Puoi registrare soltanto tempo già svolto.');
  if (session.sourceId && (!previous || previous.sourceId !== session.sourceId || previous.occurrenceDate !== session.occurrenceDate)) {
    const source = archive.calendar.items.find(item => item.id === session.sourceId);
    if (!source || source.weeklyHabitId !== habit.id || !session.occurrenceDate) throw new Error('Appuntamento non disponibile.');
    const data = source.exceptions[session.occurrenceDate];
    const date = source.recurrence ? data?.date ?? session.occurrenceDate : source.date;
    const event = occurrences([source], date, date).find(entry => entry.occurrenceDate === session.occurrenceDate);
    if (event && habit.series && seriesAtDate(habit, event.date)?.id !== seriesAtDate(habit, session.date)?.id) throw new Error('Appuntamento e registrazione appartengono a serie diverse.');
    if (!event || event.date > referenceDate) throw new Error('La sessione pianificata non è ancora disponibile.');
  }
  if (previous?.sourceId && (previous.sourceId !== session.sourceId || previous.occurrenceDate !== session.occurrenceDate)) throw new Error('Il collegamento originale va conservato.');
  const record: TimeSessionRecord = { id: command.commandId, session: { ...session }, recordedAt };
  const result = { ...archive,
    timeSessions: [...(archive.timeSessions ?? []).filter(entry => entry.id !== session.id), session],
    timeSessionHistory: [...(archive.timeSessionHistory ?? []), record],
  };
  validateWeeklyTime(result);
  return result;
}

/** Calcola una settimana civile sullo snapshot: solo minuti svolti, mai esiti o totali persistiti; la barra può superare il 100% nei dati. */
export function weeklyTimeProgress(archive: PlannerArchive, id: string, date: string, referenceDate: string): WeeklyTimeProgress {
  requireDate(date); requireDate(referenceDate);
  const habit = requireHabit(archive, id);
  const series = habit.series ? seriesAtDate(habit, date) ?? habit.series.at(-1)! : undefined;
  const week = series?.startsOn ?? weekStart(date), end = series?.endsOn ?? addDays(week, 6);
  requireDate(week); requireDate(end);
  const targetMinutes = series?.targetMinutes ?? habit.targets.filter(target => target.effectiveFrom <= week).at(-1)?.minutes ?? 0;
  const sessions = (archive.timeSessions ?? []).filter(session => session.habitId === id && !session.removed && session.date >= week && session.date <= end);
  const completedMinutes = sessions.filter(session => session.date <= referenceDate).reduce((total, session) => total + session.minutes, 0);
  const futureMinutes = sessions.filter(session => session.date > referenceDate).reduce((total, session) => total + session.minutes, 0);
  const links = new Set((archive.timeSessions ?? []).filter(session => !session.removed && session.sourceId).map(session => JSON.stringify([session.sourceId, session.occurrenceDate])));
  const plannedMinutes = occurrences(archive.calendar.items.filter(item => item.weeklyHabitId === id), week, end)
    .filter(item => item.date >= week && item.date >= referenceDate && !links.has(JSON.stringify([item.sourceId, item.occurrenceDate])))
    .reduce((total, item) => total + durationMinutes(item), 0);
  const inactive = end < habit.startsOn || (habit.archivedOn !== undefined && week > habit.archivedOn);
  return { period: series?.period, week, end, targetMinutes, completedMinutes, futureMinutes, plannedMinutes,
    remainingMinutes: Math.max(0, targetMinutes - completedMinutes), percent: percentage(completedMinutes, targetMinutes),
    partial: (series ? series.startsOn > timePeriodBounds(series.startsOn, series.period).start : habit.startsOn > week && habit.startsOn <= end) || Boolean(habit.archivedOn && habit.archivedOn >= week && habit.archivedOn < end),
    state: inactive ? 'inactive' : week > referenceDate ? 'future' : completedMinutes >= targetMinutes ? 'reached' : end < referenceDate || Boolean(habit.archivedOn && habit.archivedOn <= referenceDate) ? 'below' : 'ongoing',
  };
}
