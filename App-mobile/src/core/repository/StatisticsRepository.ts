// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import { weeklyTimeProgress } from "../domain/weeklyTime";
import type { TimeActivityStatistics, TimeDayStatistics, TimeYearStatistics } from "../model/statistics";
import { timeSeriesResults, seriesForSession } from "../domain/timeSeries";
import type { ActivityDayStatistics, ActivityYearStatistics, DailyActivitySegment, DailyStatistics, DailyStatisticsEntry, StatisticsActivity, StatisticsEntry } from "../model/statistics";
import { isIntegerInRange } from "../utils/numbers";
import { today, weekStart } from "../utils/dates";
import { percentage } from "../utils/math";
import { addDays, eventAppearance, isProgressActivity, occurrences, validDate } from '../domain/calendar';
import { indexHabitOutcomes } from '../domain/habitOutcomeIndex';
import { habitCompletionDate } from '../domain/habitCompletion';
import { habitJourneyProgress, habitTimeline } from '../domain/habitTimeline';
import type { CalendarItem } from '../model/calendar';
import type { PlannerArchive } from '../model/outcomeArchive';
import type { Trophy } from '../model/trophy';
import { habitDashboard } from '../domain/habitDashboard';
import { progressOutcomeHistory } from '../domain/outcomeArchive';

const normalizedTitle = (title: string) => title.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it');
const occurrenceKey = (sourceId: string, date: string) => JSON.stringify([sourceId, date]);

/** Calcola le statistiche dallo snapshot già preparato da DBRepository, senza normalizzarlo né salvare totali derivati. */
export class StatisticsRepository {
  private readonly habitOutcomes;
  private readonly habitsById;
  private readonly latest;
  private readonly items;
  private readonly dailyCache = new Map<string, DailyStatistics>();
  constructor(private readonly archive: PlannerArchive) {
    this.habitOutcomes = indexHabitOutcomes(archive.history);
    this.habitsById = new Map((archive.habits ?? []).map(habit => [habit.id, habit]));
    this.items = this.archive.calendar.items.filter(isProgressActivity);
    // La chiusura ferma la pianificazione, senza cancellare risultati già confermati.
    this.latest = progressOutcomeHistory(archive.calendar, this.habitOutcomes.latest);
  }

  /** Restituisce il progresso per data o seriesId esplicito, necessario per consultare serie concluse nello stesso giorno. */
  getWeeklyTimeProgress(id: string, date: string, referenceDate = today(), seriesId?: string) {
    return weeklyTimeProgress(this.archive, id, date, referenceDate, seriesId);
  }

  /** Legge il diario tra due date inclusive; seriesId separa serie contemporanee. Conserva le sessioni rimosse per il ripristino. */
  getTimeSessions(id: string, from: string, through: string, seriesId?: string) {
    if (!validDate(from) || !validDate(through) || from > through) throw new Error("Periodo non valido.");
    const habit = this.archive.weeklyTimeHabits?.find(entry => entry.id === id);
    return (this.archive.timeSessions ?? []).filter(session => session.habitId === id && session.date >= from && session.date <= through && (!seriesId || (habit && seriesForSession(habit, session)?.id === seriesId)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  /** Elenca le sessioni attive dalla più recente inserita; correzioni e ripristini mantengono la posizione originale. Esclude date successive al riferimento. */
  getRecentTimeSessions(id: string, referenceDate = today()) {
    if (!validDate(referenceDate)) throw new Error("Data non valida.");
    const habit = this.archive.weeklyTimeHabits?.find(entry => entry.id === id);
    const series = habit?.series?.at(-1);
    const current = new Map((this.archive.timeSessions ?? [])
      .filter(session => session.habitId === id && !session.removed && session.date <= referenceDate && (!series || seriesForSession(habit!, session)?.id === series.id))
      .map(session => [session.id, session]));
    const insertionOrder = new Set((this.archive.timeSessionHistory ?? []).map(record => record.session.id));
    return [...insertionOrder].reverse().flatMap(sessionId => {
      const session = current.get(sessionId);
      return session ? [session] : [];
    });
  }

  /** Restituisce i risultati delle serie, inclusi quelli scaduti in attesa di una scelta e quelli archiviati. */
  getTimeSeriesResults(referenceDate = today()) { return timeSeriesResults(this.archive, referenceDate); }

  /**
   * Ricostruisce la griglia dei trofei scelti dall'utente sullo snapshot confermato.
   * Include serie in corso, concluse senza premio e conquistate; earnedOn esiste soltanto
   * per un obiettivo interamente raggiunto e concluso entro il riferimento.
   * Un campo di adesione assente equivale a false per mantenere compatibili gli archivi precedenti.
   */
  getTrophies(referenceDate = today()): Trophy[] {
    if (!validDate(referenceDate)) throw new Error('Data non valida.');
    const trophies: Trophy[] = [];
    for (const habit of this.archive.habits ?? []) {
      if (!habit.trophiesEnabled) continue;
      const concludedOn = this.getHabitCompletionDate(habit.id);
      const progress = this.getHabitProgress(habit.id);
      const achieved = progress.stepOutcomes.filter(outcome => outcome === 'completed').length;
      const concluded = Boolean(concludedOn && concludedOn <= referenceDate);
      const earnedOn = concluded && achieved === habit.stepTarget ? concludedOn : undefined;
      trophies.push({ id: `steps:${habit.id}`, kind: 'steps', title: habit.title, icon: habit.icon, color: habit.color,
        ...(earnedOn ? { earnedOn } : {}), concluded, achieved, target: habit.stepTarget });
    }
    for (const result of this.getTimeSeriesResults(referenceDate)) {
      if (!result.series.trophiesEnabled) continue;
      const concluded = Boolean(result.series.decision && result.series.closedOn && result.series.closedOn <= referenceDate);
      const earnedOn = concluded && result.reached ? result.series.closedOn : undefined;
      trophies.push({ id: `time:${result.habit.id}:${result.series.id}`, kind: 'time', title: result.habit.title,
        icon: result.habit.icon, color: result.habit.color, ...(earnedOn ? { earnedOn } : {}), concluded,
        achieved: result.completedMinutes, target: result.series.targetMinutes });
    }
    return trophies.sort((a, b) => Number(Boolean(b.earnedOn)) - Number(Boolean(a.earnedOn)) ||
      (b.earnedOn ?? '').localeCompare(a.earnedOn ?? '') || a.id.localeCompare(b.id));
  }

  /** Somma il tempo attivo di una data civile, eventualmente per abitudine; le sessioni rimosse non contribuiscono. */
  getTimeMinutes(date: string, habitId?: string) {
    if (!validDate(date)) throw new Error("Data non valida.");
    return (this.archive.timeSessions ?? []).filter(session => !session.removed && session.date === date && (!habitId || session.habitId === habitId))
      .reduce((total, session) => total + session.minutes, 0);
  }

  /** Somma le sessioni correnti da lunedì alla data civile ricevuta, inclusi i percorsi archiviati.
   * Esclude rimozioni, pianificazioni e date future; le correzioni contribuiscono una sola volta.
   * Rifiuta una data non valida e non modifica lo snapshot.
   */
  getTimeWeekMinutes(date: string): number {
    if (!validDate(date)) throw new Error('Data non valida.');
    const from = weekStart(date);
    return (this.archive.timeSessions ?? [])
      .filter(session => !session.removed && session.date >= from && session.date <= date)
      .reduce((total, session) => total + session.minutes, 0);
  }

  /** Aggrega il tempo confermato dell’anno fino alla data di riferimento, comprese abitudini archiviate e serie ripetute.
   * Conta le sessioni correnti una sola volta: rimozioni, audit delle correzioni e pianificazioni non contribuiscono.
   * Restituisce giorni e attività con durata e diario; rifiuta anni o date non validi.
   */
  getTimeYearStatistics(year: number, referenceDate = today()): TimeYearStatistics {
    if (!isIntegerInRange(year, 1900, 9998) || !validDate(referenceDate)) throw new Error('Periodo non valido.');
    const from = `${year}-01-01`, through = `${year}-12-31`;
    const days = new Map<string, TimeDayStatistics>();
    const activities = new Map<string, TimeActivityStatistics>();
    const habits = new Map((this.archive.weeklyTimeHabits ?? []).map(habit => [habit.id, habit]));
    const concluded = this.getTimeSeriesResults(referenceDate).filter(result => {
      const date = result.series.closedOn ?? result.series.endsOn;
      return result.series.decision && date >= from && date <= through && date <= referenceDate;
    });
    for (const habit of habits.values()) {
      activities.set(habit.id, { activity: { id: habit.id, title: habit.title, color: habit.color, icon: habit.icon }, minutes: 0, sessionCount: 0,
        completedSeries: concluded.filter(result => result.habit.id === habit.id).length, days: [] });
    }
    for (const session of this.archive.timeSessions ?? []) {
      if (session.removed || session.date < from || session.date > through || session.date > referenceDate) continue;
      const habit = habits.get(session.habitId), activity = activities.get(session.habitId);
      if (!habit || !activity) continue;
      const entry = { ...session, title: habit.title, color: habit.color, icon: habit.icon };
      const day = days.get(session.date) ?? { date: session.date, minutes: 0, sessions: [] };
      day.minutes += session.minutes;
      day.sessions.push(entry);
      days.set(session.date, day);
      let activityDay = activity.days.find(value => value.date === session.date);
      if (!activityDay) { activityDay = { date: session.date, minutes: 0, sessions: [] }; activity.days.push(activityDay); }
      activityDay.minutes += session.minutes;
      activityDay.sessions.push(entry);
      activity.minutes += session.minutes;
      activity.sessionCount++;
    }
    const visible = [...activities.values()].filter(activity => activity.sessionCount || activity.completedSeries);
    visible.forEach(activity => activity.days.sort((a, b) => b.date.localeCompare(a.date)));
    return { year, days: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)), activities: visible,
      minutes: visible.reduce((sum, activity) => sum + activity.minutes, 0), sessionCount: visible.reduce((sum, activity) => sum + activity.sessionCount, 0) };
  }

  /** Cerca l’abitudine nello snapshot corrente; rifiuta identità inesistenti o eliminate. */
  private requireHabit(id: string) {
    const habit = this.habitsById.get(id);
    if (!habit) throw new Error("Abitudine non trovata.");
    return habit;
  }

  /** Legge la chiusura dall’indice condiviso; restituisce undefined per una serie in corso. */
  getHabitCompletionDate(id: string) {
    return habitCompletionDate(this.habitOutcomes, this.requireHabit(id));
  }

  /** Restituisce gli step confermati dell’abitudine, compresi gli esiti di occasioni rimosse. */
  getHabitProgress(id: string) {
    return habitJourneyProgress(this.habitOutcomes, this.requireHabit(id));
  }

  /** Ricostruisce il periodo civile inclusivo dall’indice condiviso; rifiuta intervalli non validi. */
  getHabitTimeline(id: string, from: string, through: string) {
    if (!validDate(from) || !validDate(through) || from > through) throw new Error("Periodo del percorso non valido.");
    return habitTimeline(this.archive.calendar, this.habitOutcomes, this.requireHabit(id), from, through);
  }

  /** Restituisce traguardi e occasioni recenti per data/orario civili, senza scritture. */
  getHabitDashboard(date: string, time: string) {
    return habitDashboard(this.archive, this.habitOutcomes, date, time);
  }

  /** Raggruppa una fonte monitorata con quelle collegate per identità o titolo normalizzato, anche transitivamente. */
  private group(source: CalendarItem): CalendarItem[] {
    const ids = new Set([source.id]);
    const groups = new Set(source.activityId ? [source.activityId] : []);
    const names = new Set([normalizedTitle(source.title)]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of this.items) {
        if (ids.has(item.id)) {
          if (item.activityId) groups.add(item.activityId);
          names.add(normalizedTitle(item.title));
        } else if ((item.activityId && groups.has(item.activityId)) || names.has(normalizedTitle(item.title))) {
          ids.add(item.id);
          if (item.activityId) groups.add(item.activityId);
          names.add(normalizedTitle(item.title));
          changed = true;
        }
      }
    }
    return this.items.filter(item => ids.has(item.id));
  }

  getDailyStatistics(date: string): DailyStatistics {
    if (!validDate(date)) throw new Error('Data non valida per le statistiche giornaliere.');
    const cached = this.dailyCache.get(date);
    if (cached) return cached;
    const entries = new Map<string, DailyStatisticsEntry>();
    for (const event of occurrences(this.items, date, date)) {
      entries.set(occurrenceKey(event.sourceId, event.occurrenceDate), {
        title: event.title, ...eventAppearance(event), outcome: event.outcome,
      });
    }
    // Deduplicate corrections before filtering by date; keep live event colors when available.
    for (const record of this.latest) {
      if (record.eventDate !== date) continue;
      const key = occurrenceKey(record.sourceId, record.occurrenceDate);
      const existing = entries.get(key);
      entries.set(key, {title: record.title, color: record.color, icon: record.icon, ...existing, outcome: record.outcome});
    }
    const result: DailyStatistics = {date, total: entries.size, completed: 0, skipped: 0, pending: 0, recorded: 0, completionPercent: 0, activities: []};
    const segments = new Map<string, DailyActivitySegment>();
    for (const event of entries.values()) {
      result[event.outcome ?? 'pending']++;
      // A color change must not recolor other events sharing the same title.
      const key = JSON.stringify([normalizedTitle(event.title), event.color, event.icon]);
      const segment = segments.get(key);
      if (segment) {
        segment.count++;
        if (event.outcome === 'completed') segment.completed++;
      } else segments.set(key, {key, title: event.title, color: event.color, icon: event.icon, count: 1, completed: event.outcome === 'completed' ? 1 : 0, contributionPercent: 0});
    }
    result.activities = [...segments.values()];
    result.recorded = result.completed + result.skipped;
    result.completionPercent = percentage(result.completed, result.total);
    result.activities.forEach(segment => { segment.contributionPercent = percentage(segment.completed, result.total); });
    this.dailyCache.set(date, result);
    return result;
  }

  /** Elenca una sola voce per abitudine o attività monitorata legacy ancora presente. */
  getStatisticsActivities(): StatisticsActivity[] {
    const seen = new Set<string>();
    const result: StatisticsActivity[] = [];
    for (const event of this.items) {
      if (seen.has(event.id)) continue;
      this.group(event).forEach(item => seen.add(item.id));
      result.push({id: event.id, title: event.title, ...eventAppearance(event)});
    }
    return result;
  }

  /** Calcola l’anno per attività usando il rapporto fra eventi fatti e pianificati.
   * Ogni occorrenza conta nel giorno di inizio; lo storico usa la data salvata.
   * Le occorrenze senza esito pesano zero nella media, ma restano distinguibili.
   * I totali arrivano alla data di riferimento; i completamenti futuri già salvati sono separati.
   * Le serie contano una volta quando tutti gli step hanno un esito, nell’anno dello step finale,
   * anche se già confermato su una data futura, come la chiusura del percorso.
   */
  getActivityYearStatistics(id: string, year: number, referenceDate = today()): ActivityYearStatistics {
    if (!isIntegerInRange(year, 1900, 9998) || !validDate(referenceDate)) throw new Error('Periodo non valido.');
    const source = this.items.find(item => item.id === id);
    if (!source) throw new Error('Attività non trovata.');
    const activity = { id: source.id, title: source.title, ...eventAppearance(source) };
    const members = this.group(source);
    const sourceIds = new Set([id, ...members.map(item => item.id)]);
    const activityIds = new Set(members.map(item => item.activityId ?? item.id));
    const from = `${year}-01-01`, through = `${year}-12-31`;
    const habitIds = new Set(members.flatMap(item => item.habitId ? [item.habitId] : []));
    const completedSeries = habitIds.size ? [...habitIds].filter(habitId => {
      const closedOn = this.getHabitCompletionDate(habitId);
      return closedOn !== undefined && closedOn >= from && closedOn <= through;
    }).length : null;
    const entries = new Map<string, StatisticsEntry>();
    for (const event of occurrences(members, from, through)) {
      if (event.date >= from && event.date <= through) entries.set(occurrenceKey(event.sourceId, event.occurrenceDate), {date: event.date, outcome: event.outcome});
    }
    for (const record of this.latest) {
      if (!sourceIds.has(record.sourceId) && !activityIds.has(record.activityId)) continue;
      const key = occurrenceKey(record.sourceId, record.occurrenceDate);
      entries.delete(key);
      if (record.eventDate >= from && record.eventDate <= through) entries.set(key, {date: record.eventDate, outcome: record.outcome});
    }
    const days = new Map<string, ActivityDayStatistics>();
    for (let date = from; date <= through; date = addDays(date, 1)) {
      days.set(date, {date, total: 0, completed: 0, skipped: 0, pending: 0, percent: null, state: 'empty'});
    }
    for (const entry of entries.values()) {
      const day = days.get(entry.date)!;
      day.total++;
      day[entry.outcome ?? 'pending']++;
    }
    for (const day of days.values()) {
      if (!day.total) continue;
      day.state = day.date > referenceDate ? 'future' : day.pending === day.total ? 'pending' : 'recorded';
      if (day.state === 'recorded') day.percent = percentage(day.completed, day.total);
    }
    const elapsedDays = [...days.values()].filter(day => day.date <= referenceDate && day.total > 0);
    return {
      activity, year, days: [...days.values()], completedSeries,
      completed: elapsedDays.reduce((total, day) => total + day.completed, 0),
      futureCompleted: [...days.values()].filter(day => day.date > referenceDate).reduce((total, day) => total + day.completed, 0),
      skipped: elapsedDays.reduce((total, day) => total + day.skipped, 0),
      recentDays: elapsedDays.slice(-14),
    };
  }

}
