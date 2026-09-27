import { ACTIVITY_PARTIAL_WEIGHT } from "../constants.js";
import type { ActivityDayStatistics, ActivityYearStatistics, DailyActivitySegment, DailyStatistics, DailyStatisticsEntry, StatisticsActivity, StatisticsEntry, StatisticsEvent, WeeklyActivityStatistics, WeeklyActivitySummary, WeeklyDayStatistics } from "../model/statistics.js";
import { isIntegerInRange } from "../utils/numbers.js";
import { today } from "../utils/dates.js";
import { percentage } from "../utils/math.js";
import { addDays, eventAppearance, occurrences, validDate, weekStart } from '../domain/calendar.js';
import { latestOutcomes } from '../domain/outcomeArchive.js';
import type { CalendarItem } from '../model/calendar.js';
import type { PlannerArchive } from '../model/outcomeArchive.js';

const normalizedTitle = (title: string) => title.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it');
const occurrenceKey = (sourceId: string, date: string) => JSON.stringify([sourceId, date]);

/** Read model between the persisted archive and the UI. Never writes derived totals. */
export class StatisticsRepository {
  private readonly latest;
  private readonly dailyCache = new Map<string, DailyStatistics>();
  constructor(private readonly archive: PlannerArchive) {
    this.latest = latestOutcomes(archive.history);
  }

  // Match the existing sidebar semantics: one activity per shared identity or normalized title.
  private group(event: StatisticsEvent): CalendarItem[] {
    const sourceId = 'sourceId' in event ? event.sourceId : event.id;
    const source = this.archive.calendar.items.find(item => item.id === sourceId);
    const ids = new Set([sourceId]);
    const groups = new Set(source?.activityId ? [source.activityId] : []);
    const names = new Set([normalizedTitle(source?.title ?? event.title)]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of this.archive.calendar.items) {
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
    return this.archive.calendar.items.filter(item => ids.has(item.id));
  }

  getWeeklyStatistics(event: StatisticsEvent, dailyDate: string): WeeklyActivityStatistics {
    if (!validDate(dailyDate)) throw new Error('Data non valida per le statistiche settimanali.');
    const from = weekStart(dailyDate);
    const through = addDays(from, 6);
    const members = this.group(event);
    const sourceId = 'sourceId' in event ? event.sourceId : event.id;
    const sourceIds = new Set([sourceId, ...members.map(item => item.id)]);
    const activityIds = new Set(members.map(item => item.activityId ?? item.id));
    if ('activityId' in event && event.activityId) activityIds.add(event.activityId);
    const names = new Set(members.length ? members.map(item => normalizedTitle(item.title)) : [normalizedTitle(event.title)]);
    const knownSources = new Set(this.archive.calendar.items.map(item => item.id));
    const entries = new Map<string, StatisticsEntry>();
    for (const item of occurrences(members, from, through)) {
      // An overnight appointment belongs to its start day, and is counted once.
      if (item.date >= from && item.date <= through) {
        entries.set(occurrenceKey(item.sourceId, item.occurrenceDate), {date: item.date, outcome: item.outcome});
      }
    }
    for (const record of this.latest) {
      if (!sourceIds.has(record.sourceId) && !activityIds.has(record.activityId) && !( !knownSources.has(record.sourceId) && names.has(normalizedTitle(record.title)))) continue;
      const key = occurrenceKey(record.sourceId, record.occurrenceDate);
      // The saved event date is authoritative, even after moving or deleting an appointment.
      entries.delete(key);
      if (record.eventDate >= from && record.eventDate <= through) entries.set(key, {date: record.eventDate, outcome: record.outcome});
    }
    const days: WeeklyDayStatistics[] = Array.from({length: 7}, (_, index) => ({date: addDays(from, index), total: 0, completed: 0, skipped: 0, partial: 0, pending: 0}));
    for (const entry of entries.values()) {
      const day = days.find(day => day.date === entry.date)!;
      day.total++;
      day[entry.outcome ?? 'pending']++;
    }
    const totals = days.reduce((sum, day) => ({total: sum.total + day.total, completed: sum.completed + day.completed, skipped: sum.skipped + day.skipped, partial: sum.partial + day.partial, pending: sum.pending + day.pending}), {total: 0, completed: 0, skipped: 0, partial: 0, pending: 0});
    const recorded = totals.completed + totals.skipped + totals.partial;
    return {...totals, from, through, recorded, completionRate: recorded ? Math.round(percentage(totals.completed, recorded)) : null, days};
  }

  getDailyStatistics(date: string): DailyStatistics {
    if (!validDate(date)) throw new Error('Data non valida per le statistiche giornaliere.');
    const cached = this.dailyCache.get(date);
    if (cached) return cached;
    const entries = new Map<string, DailyStatisticsEntry>();
    for (const event of occurrences(this.archive.calendar.items, date, date)) {
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
    const result: DailyStatistics = {date, total: entries.size, completed: 0, skipped: 0, partial: 0, pending: 0, recorded: 0, completionPercent: 0, activities: []};
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
    result.recorded = result.completed + result.skipped + result.partial;
    result.completionPercent = percentage(result.completed, result.total);
    result.activities.forEach(segment => { segment.contributionPercent = percentage(segment.completed, result.total); });
    this.dailyCache.set(date, result);
    return result;
  }

  /** Elenca una sola voce per attività, includendo lo storico delle attività eliminate. */
  getStatisticsActivities(): StatisticsActivity[] {
    const seen = new Set<string>();
    const result: StatisticsActivity[] = [];
    for (const event of this.archive.calendar.items) {
      if (seen.has(event.id)) continue;
      this.group(event).forEach(item => seen.add(item.id));
      result.push({id: event.id, title: event.title, ...eventAppearance(event)});
    }
    for (const record of this.latest) {
      if (seen.has(record.sourceId) || result.some(item => normalizedTitle(item.title) === normalizedTitle(record.title))) continue;
      seen.add(record.sourceId);
      result.push({id: record.sourceId, title: record.title, color: record.color, icon: record.icon});
    }
    return result;
  }

  /** Calcola l’anno per attività: parziale vale 50% solo in questa vista.
   * Ogni occorrenza conta nel giorno di inizio; lo storico usa la data salvata.
   * Le occorrenze senza esito pesano zero nella media, ma restano distinguibili.
   */
  getActivityYearStatistics(id: string, year: number, referenceDate = today()): ActivityYearStatistics {
    if (!isIntegerInRange(year, 1900, 9998) || !validDate(referenceDate)) throw new Error('Periodo non valido.');
    const activity = this.getStatisticsActivities().find(item => item.id === id);
    if (!activity) throw new Error('Attività non trovata.');
    const source = this.archive.calendar.items.find(item => item.id === id);
    const members = source ? this.group(source) : [];
    const sourceIds = new Set([id, ...members.map(item => item.id)]);
    const activityIds = new Set(members.map(item => item.activityId ?? item.id));
    const names = new Set([normalizedTitle(activity.title), ...members.map(item => normalizedTitle(item.title))]);
    const knownSources = new Set(this.archive.calendar.items.map(item => item.id));
    const from = `${year}-01-01`, through = `${year}-12-31`;
    const entries = new Map<string, StatisticsEntry>();
    for (const event of occurrences(members, from, through)) {
      if (event.date >= from && event.date <= through) entries.set(occurrenceKey(event.sourceId, event.occurrenceDate), {date: event.date, outcome: event.outcome});
    }
    for (const record of this.latest) {
      if (!sourceIds.has(record.sourceId) && !activityIds.has(record.activityId) && !( !knownSources.has(record.sourceId) && names.has(normalizedTitle(record.title)))) continue;
      const key = occurrenceKey(record.sourceId, record.occurrenceDate);
      entries.delete(key);
      if (record.eventDate >= from && record.eventDate <= through) entries.set(key, {date: record.eventDate, outcome: record.outcome});
    }
    const days = new Map<string, ActivityDayStatistics>();
    for (let date = from; date <= through; date = addDays(date, 1)) {
      days.set(date, {date, total: 0, completed: 0, partial: 0, skipped: 0, pending: 0, percent: null, state: 'empty'});
    }
    for (const entry of entries.values()) {
      const day = days.get(entry.date)!;
      day.total++;
      day[entry.outcome ?? 'pending']++;
    }
    for (const day of days.values()) {
      if (!day.total) continue;
      day.state = day.date > referenceDate ? 'future' : day.pending === day.total ? 'pending' : 'recorded';
      if (day.state === 'recorded') day.percent = percentage(day.completed + day.partial * ACTIVITY_PARTIAL_WEIGHT, day.total);
    }
    return {activity, year, days: [...days.values()]};
  }

  getWeeklyActivities(dailyDate: string): WeeklyActivitySummary[] {
    if (!validDate(dailyDate)) throw new Error('Data non valida per le statistiche settimanali.');
    const seen = new Set<string>();
    const result: WeeklyActivitySummary[] = [];
    for (const event of this.archive.calendar.items) {
      if (seen.has(event.id)) continue;
      this.group(event).forEach(item => seen.add(item.id));
      result.push({event, statistics: this.getWeeklyStatistics(event, dailyDate)});
    }
    return result;
  }
}
