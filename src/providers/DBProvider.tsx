import { saveWeeklyTimeHabit, cancelWeeklyTimeTarget, archiveWeeklyTimeHabit, saveTimeSession } from "../domain/weeklyTime";
import { resolveTimeSeries, validateTimePlan } from "../domain/timeSeries";
import { today } from "../utils/dates";
import { reconcileHabitCompletion } from "../domain/habitCompletion";
import { StatisticsRepository } from "../repository/StatisticsRepository";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { clearCalendar, deleteItem, emptyCalendar, isProgressActivity, occurrences, putItem, putWeeklyActivity, setOccurrenceOutcome } from "../domain/calendar";
import { outcomeRecord } from "../domain/outcomeArchive";
import { createHabit, deleteHabit, updateHabit } from "../domain/habits";
import { useLoading } from "../hooks/useLoading";
import type { ItemData, ItemOutcome, Occurrence } from "../model/calendar.js";
import type { DBContextValue, DatabaseSnapshot, DBRepository } from "../model/database.js";
import type { LoadingOptions } from "../model/loading.js";
import type { PlannerArchive } from "../model/outcomeArchive.js";
import type { Palette } from "../model/theme.js";
import { repositoryDB } from "../repository/RepositoryDB";

interface DBProviderProps { children: ReactNode; repository?: DBRepository }

export const DBContext = createContext<DBContextValue | null>(null);
const emptyArchive: PlannerArchive = { format: 'time-planner-backup', version: 3, calendar: emptyCalendar(), habits: [], history: [] };
export function DBProvider({ children, repository = repositoryDB }: DBProviderProps) {
  const { run } = useLoading();
  const [palette, setPalette] = useState<Palette>("natural");
  const [paletteError, setPaletteError] = useState(false);
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const current = useRef<DatabaseSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const initialization = useRef<Promise<void> | null>(null);
  const retry = useCallback(() => {
    if (initialization.current) return initialization.current;
    setError(null);
    const promise = run(async () => {
      try {
        const loaded = await repository.initialize();
        setPalette(await repository.loadPalette());
        current.current = loaded; setSnapshot(loaded);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile aprire il database.'); }
    }, { mode: 'blocking', scope: 'database:init', message: 'Apertura del database locale…' });
    initialization.current = promise;
    void promise.finally(() => { initialization.current = null; });
    return promise;
  }, [repository, run]);
  useEffect(() => { void retry(); }, [retry]);
  const mutate = useCallback(async (update: (archive: PlannerArchive) => PlannerArchive, replace = false, loading?: LoadingOptions) => {
    if (!current.current) throw new Error('Database non disponibile.');
    if (locked.current) throw new Error('Salvataggio in corso. Attendi e riprova.');
    locked.current = true; setSaving(true); setError(null);
    try {
      await run(async () => {
        const base = current.current!;
        const archive = reconcileHabitCompletion(update(base.archive), replace ? undefined : base.archive);
        const next = await repository.save({ archive, expectedRevision: base.revision, replace });
        current.current = next; setSnapshot(next);
      }, {mode:'local', scope:'database:save', message:'Salvataggio…', ...loading});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Salvataggio non riuscito.'); throw cause; }
    finally { locked.current = false; setSaving(false); }
  }, [repository, run]);
  const resetAll = useCallback(async () => {
    if (!current.current) throw new Error('Database non disponibile.');
    if (locked.current) throw new Error('Salvataggio in corso. Attendi e riprova.');
    locked.current = true; setSaving(true); setError(null);
    try {
      await run(async () => {
        const next = await repository.reset(current.current!.revision);
        current.current = next; setSnapshot(next); setPalette('natural'); setPaletteError(false);
      }, {mode:'blocking', scope:'database:reset', message:'Ripristino dei dati…'});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ripristino non riuscito.'); throw cause; }
    finally { locked.current = false; setSaving(false); }
  }, [repository, run]);
  const statistics = useMemo(() => new StatisticsRepository(snapshot?.archive ?? emptyArchive), [snapshot?.archive]);
  const recordOutcome = useCallback((item: Occurrence, outcome: ItemOutcome, loading?: LoadingOptions) => mutate(archive => {
    const source = archive.calendar.items.find(entry => entry.id === item.sourceId);
    if (!source || !isProgressActivity(source)) throw new Error("Gli esiti sono disponibili solo per abitudini e routine ricorrenti.");
    if (source.habitClosedOn && item.date > source.habitClosedOn) throw new Error("La serie è già conclusa. Usa Ripeti serie per iniziare un nuovo percorso.");
    return { ...archive,
      calendar: setOccurrenceOutcome(archive.calendar, item.sourceId, item.occurrenceDate, outcome),
      history: [...archive.history, outcomeRecord(archive.calendar, item, outcome)],
    };
  }, false, loading ?? { scope: `outcome:${item.id}` }), [mutate]);
  /**
   * Applica lo stesso comando della UI in ordine di data, rileggendo ogni snapshot confermato.
   * Salta esiti identici e occasioni non più pianificate (per esempio dopo il traguardo).
   * Non è una transazione unica: in caso di errore indica quante scritture sono già riuscite.
   */
  const recordOutcomes = useCallback(async (items: readonly Occurrence[], outcome: ItemOutcome) => {
    let saved = 0, skipped = 0;
    let lastDate: string | undefined;
    for (const requested of [...items].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))) {
      try {
        if (!current.current) throw new Error("Database non disponibile.");
        const live = occurrences(current.current.archive.calendar.items, requested.date, requested.date)
          .find(item => item.sourceId === requested.sourceId && item.occurrenceDate === requested.occurrenceDate && item.date === requested.date);
        if (!live || live.outcome === outcome) { skipped++; continue; }
        await recordOutcome(live, outcome);
        saved++; lastDate = live.date;
      } catch (cause) {
        throw new Error(`Operazione interrotta dopo ${saved} esiti salvati. ${cause instanceof Error ? cause.message : "Salvataggio non riuscito."}`, { cause });
      }
    }
    return { saved, skipped, lastDate };
  }, [recordOutcome]);
  const value = useMemo<DBContextValue>(() => ({
    weeklyTimeHabits: snapshot?.archive.weeklyTimeHabits ?? [],
    timeSessions: snapshot?.archive.timeSessions ?? [],
    saveWeeklyTimeHabit: (id, draft) => mutate(archive => saveWeeklyTimeHabit(archive, id, draft, today()), false, { scope: `weekly:${id}` }),
    cancelWeeklyTimeTarget: id => mutate(archive => cancelWeeklyTimeTarget(archive, id, today())),
    archiveWeeklyTimeHabit: id => mutate(archive => archiveWeeklyTimeHabit(archive, id, today())),
    saveTimeSession: command => mutate(archive => saveTimeSession(archive, command, today(), new Date().toISOString()), false, { scope: `time:${command.session.id}` }),
    getWeeklyTimeProgress: (id, date, referenceDate, seriesId) => statistics.getWeeklyTimeProgress(id, date, referenceDate, seriesId),
    getTimeSessions: (id, from, through, seriesId) => statistics.getTimeSessions(id, from, through, seriesId),
    getRecentTimeSessions: (id, referenceDate) => statistics.getRecentTimeSessions(id, referenceDate),
    getTimeWeekMinutes: date => statistics.getTimeWeekMinutes(date),
    getTimeMinutes: (date, habitId) => statistics.getTimeMinutes(date, habitId),
    getTimeYearStatistics: (year, referenceDate) => statistics.getTimeYearStatistics(year, referenceDate),
    getTimeSeriesResults: referenceDate => statistics.getTimeSeriesResults(referenceDate),
    resolveTimeSeries: (habitId, seriesId, repeat, nextId) => mutate(archive => resolveTimeSeries(archive, habitId, seriesId, repeat, nextId, today())),
    getHabitCompletionDate: id => statistics.getHabitCompletionDate(id),
    getHabitProgress: id => statistics.getHabitProgress(id),
    getHabitTimeline: (id, from, through) => statistics.getHabitTimeline(id, from, through),
    getHabitDashboard: (date, time) => statistics.getHabitDashboard(date, time),
    getStatisticsActivities: () => statistics.getStatisticsActivities(),
    getActivityYearStatistics: (id, year, referenceDate) => statistics.getActivityYearStatistics(id, year, referenceDate),
    getDailyStatistics: date => statistics.getDailyStatistics(date),
    palette, paletteError,
    changePalette: async value => {
      try { await repository.savePalette(value); setPalette(value); setPaletteError(false); }
      catch { setPaletteError(true); }
    },
    state: snapshot?.archive.calendar ?? emptyArchive.calendar,
    habits: snapshot?.archive.habits ?? [],
    archive: snapshot?.archive ?? emptyArchive,
    previous: snapshot?.previous ?? null,
    ready: snapshot !== null, error, saving, retry,
    recordOutcome, recordOutcomes,
    saveHabit: (input, loading) => mutate(archive => {
      const result = createHabit(archive.calendar, archive.habits ?? [], input, { habitId: crypto.randomUUID() });
      return { ...archive, calendar: result.calendar, habits: result.habits };
    }, false, loading ?? { scope: "habit:save" }),
    updateHabit: (id, input, loading) => mutate(archive => {
      const result = updateHabit(archive.calendar, archive.habits ?? [], id, input);
      return { ...archive, calendar: result.calendar, habits: result.habits };
    }, false, loading ?? { scope: `habit:${id}` }),
    deleteHabit: (id, loading) => mutate(archive => {
      const result = deleteHabit(archive.calendar, archive.habits ?? [], id);
      return { ...archive, calendar: result.calendar, habits: result.habits };
    }, false, loading ?? { scope: `habit:${id}` }),
    saveItem: (item, unlocked, target, weekdays, loading) => mutate(archive => {
      validateTimePlan(archive, item);
      const calendar = weekdays ? putWeeklyActivity(archive.calendar,item,weekdays,{actor:'user',unlocked},target) : putItem(archive.calendar,item,{actor:'user',unlocked},target);
      for (const created of calendar.items) if (!archive.calendar.items.some(previous => previous.id === created.id)) validateTimePlan(archive, created);
      return { ...archive, calendar };
    }, false, loading),
    deleteItem: (target, unlocked, loading) => mutate(archive => ({...archive,calendar:deleteItem(archive.calendar,target,{actor:'user',unlocked})}), false, loading),
    savePreferences: (profile, goals, loading) => mutate(archive => {
      const remainingIds = new Set(goals.map(goal => goal.id));
      const unlink = <T extends ItemData,>(item: T): T => {
        if (item.goalId === undefined || remainingIds.has(item.goalId)) return item;
        const next = {...item}; delete next.goalId; return next;
      };
      const items = archive.calendar.items.map(item => ({...unlink(item), exceptions:Object.fromEntries(Object.entries(item.exceptions).map(([date,exception]) => [date,exception === null ? null : unlink(exception)]))}));
      return {...archive,calendar:{...archive.calendar,items,profile,goals}};
    }, false, loading),
    clearCalendar: loading => mutate(archive => ({...archive,calendar:clearCalendar(archive.calendar),habits:[]}), false, loading),
    resetAll,
    prepareImport: text => run(() => repository.prepareImport(text), {mode:'local',scope:'backup',message:'Verifica backup…'}),
    importBackup: (archive, loading) => mutate(() => archive,true,{mode:'blocking',scope:'backup',message:'Importazione backup…',...loading}),
    exportBackup: previous => run(() => {
      const archive = previous ? current.current?.previous : current.current?.archive;
      if (!archive) throw new Error('Backup non disponibile.');
      return repository.exportBackup(archive);
    }, {mode:'local',scope:'backup',message:'Preparazione backup…'}),
  }), [snapshot,error,saving,retry,mutate,resetAll,repository,run,palette,paletteError,statistics,recordOutcome,recordOutcomes]);
  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}
