import { StatisticsRepository } from "../repository/StatisticsRepository";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { clearCalendar, deleteItem, emptyCalendar, putItem, putWeeklyActivity, setOccurrenceOutcome } from "../domain/calendar";
import { outcomeRecord } from "../domain/outcomeArchive";
import { createHabit } from "../domain/habits";
import { useLoading } from "../hooks/useLoading";
import type { ItemData } from "../model/calendar.js";
import type { DBContextValue, DatabaseSnapshot, DBRepository } from "../model/database.js";
import type { LoadingOptions } from "../model/loading.js";
import type { PlannerArchive } from "../model/outcomeArchive.js";
import type { Palette } from "../model/theme.js";
import { repositoryDB } from "../repository/RepositoryDB";

interface DBProviderProps { children: ReactNode; repository?: DBRepository }

export const DBContext = createContext<DBContextValue | null>(null);
const emptyArchive: PlannerArchive = { format: 'time-planner-backup', version: 1, calendar: emptyCalendar(), habits: [], history: [] };
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
        const next = await repository.save({ archive: update(base.archive), expectedRevision: base.revision, replace });
        current.current = next; setSnapshot(next);
      }, {mode:'local', scope:'database:save', message:'Salvataggio…', ...loading});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Salvataggio non riuscito.'); throw cause; }
    finally { locked.current = false; setSaving(false); }
  }, [repository, run]);
  const statistics = useMemo(() => new StatisticsRepository(snapshot?.archive ?? emptyArchive), [snapshot?.archive]);
  const value = useMemo<DBContextValue>(() => ({
    getStatisticsActivities: () => statistics.getStatisticsActivities(),
    getActivityYearStatistics: (id, year, referenceDate) => statistics.getActivityYearStatistics(id, year, referenceDate),
    getDailyStatistics: date => statistics.getDailyStatistics(date),
    getWeeklyStatistics: (event, date) => statistics.getWeeklyStatistics(event, date),
    getWeeklyActivities: date => statistics.getWeeklyActivities(date),
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
    recordOutcome: (item, outcome, loading) => mutate(archive => ({...archive,
      calendar: setOccurrenceOutcome(archive.calendar, item.sourceId, item.occurrenceDate, outcome),
      history: [...archive.history, outcomeRecord(archive.calendar, item, outcome)],
    }), false, loading ?? {scope:`outcome:${item.id}`}),
    saveHabit: (input, loading) => mutate(archive => {
      const result = createHabit(archive.calendar, archive.habits ?? [], input, { habitId: crypto.randomUUID(), planId: crypto.randomUUID() });
      return { ...archive, calendar: result.calendar, habits: result.habits };
    }, false, loading ?? { scope: "habit:save" }),
    saveItem: (item, unlocked, target, weekdays, loading) => mutate(archive => ({...archive,
      calendar: weekdays ? putWeeklyActivity(archive.calendar,item,weekdays,{actor:'user',unlocked},target) : putItem(archive.calendar,item,{actor:'user',unlocked},target),
    }), false, loading),
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
    prepareImport: text => run(() => repository.prepareImport(text), {mode:'local',scope:'backup',message:'Verifica backup…'}),
    importBackup: (archive, loading) => mutate(() => archive,true,{mode:'blocking',scope:'backup',message:'Importazione backup…',...loading}),
    exportBackup: previous => run(() => {
      const archive = previous ? current.current?.previous : current.current?.archive;
      if (!archive) throw new Error('Backup non disponibile.');
      return repository.exportBackup(archive);
    }, {mode:'local',scope:'backup',message:'Preparazione backup…'}),
  }), [snapshot,error,saving,retry,mutate,repository,run,palette,paletteError,statistics]);
  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}
