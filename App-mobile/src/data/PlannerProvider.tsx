import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { clearCalendar, isProgressActivity, setOccurrenceOutcome } from '../core/domain/calendar';
import { reconcileHabitCompletion } from '../core/domain/habitCompletion';
import { createHabit } from '../core/domain/habits';
import { exportArchive, outcomeRecord, parseArchive } from '../core/domain/outcomeArchive';
import { saveWeeklyTimeHabit, saveTimeSession } from '../core/domain/weeklyTime';
import { resolveTimeSeries } from '../core/domain/timeSeries';
import type { HabitDraft } from '../core/model/habit';
import type { CalendarGoal, CalendarProfile, ItemData, ItemOutcome, Occurrence } from '../core/model/calendar';
import type { DatabaseSnapshot } from '../core/model/database';
import type { PlannerArchive } from '../core/model/outcomeArchive';
import type { Palette } from '../core/model/theme';
import type { WeeklyTimeHabitDraft } from '../core/model/weeklyTime';
import { StatisticsRepository } from '../core/repository/StatisticsRepository';
import { today } from '../core/utils/dates';
import { mobileRepository } from './MobileRepository';

interface PlannerValue {
  snapshot: DatabaseSnapshot | null;
  statistics: StatisticsRepository | null;
  saving: boolean;
  error: string | null;
  palette: Palette;
  retry: () => Promise<void>;
  changePalette: (value: Palette) => Promise<void>;
  savePreferences: (profile: CalendarProfile, goals: CalendarGoal[]) => Promise<void>;
  clearCalendar: () => Promise<void>;
  resetAll: () => Promise<void>;
  prepareImport: (text: string) => PlannerArchive;
  importBackup: (archive: PlannerArchive) => Promise<void>;
  exportBackup: (previous?: boolean) => string;
  createStepHabit: (draft: HabitDraft) => Promise<void>;
  createTimeHabit: (draft: WeeklyTimeHabitDraft) => Promise<void>;
  recordOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
  recordTime: (habitId: string, minutes: number, notes: string) => Promise<void>;
  resolveTimeSeries: (habitId: string, seriesId: string, repeat: boolean) => Promise<void>;
  requestedTimeSeries: { habitId: string; seriesId: string } | null;
  reviewTimeSeries: (habitId: string, seriesId: string) => void;
  clearRequestedTimeSeries: () => void;
}

const PlannerContext = createContext<PlannerValue | null>(null);

/** Coordina scritture confermate e statistiche senza salvare totali derivati. */
export function PlannerProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette>('natural');
  const [requestedTimeSeries, setRequestedTimeSeries] = useState<{ habitId: string; seriesId: string } | null>(null);
  const current = useRef<DatabaseSnapshot | null>(null);
  const locked = useRef(false);
  const retry = useCallback(async () => {
    try {
      const [loaded, savedPalette] = await Promise.all([mobileRepository.read(), mobileRepository.readPalette()]);
      current.current = loaded;
      setSnapshot(loaded);
      setPalette(savedPalette);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossibile aprire il database locale.');
    }
  }, []);
  useEffect(() => {
    void Promise.all([mobileRepository.read(), mobileRepository.readPalette()]).then(([loaded, savedPalette]) => {
      current.current = loaded;
      setSnapshot(loaded);
      setPalette(savedPalette);
      setError(null);
    }).catch(cause => {
      setError(cause instanceof Error ? cause.message : 'Impossibile aprire il database locale.');
    });
  }, []);

  const persist = useCallback(async (update: (archive: PlannerArchive) => PlannerArchive, replace = false) => {
    const base = current.current;
    if (!base) throw new Error('Database non disponibile.');
    if (locked.current) throw new Error('Salvataggio in corso. Attendi e riprova.');
    locked.current = true;
    setSaving(true);
    try {
      const archive = reconcileHabitCompletion(update(base.archive), replace ? undefined : base.archive);
      const saved = await mobileRepository.save({ archive, expectedRevision: base.revision, replace });
      current.current = saved;
      setSnapshot(saved);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Salvataggio non riuscito.');
      throw cause;
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }, []);

  const statistics = useMemo(() => snapshot ? new StatisticsRepository(snapshot.archive) : null, [snapshot]);
  const value = useMemo<PlannerValue>(() => ({
    snapshot, statistics, saving, error, retry, palette, requestedTimeSeries,
    reviewTimeSeries: (habitId, seriesId) => setRequestedTimeSeries({ habitId, seriesId }),
    clearRequestedTimeSeries: () => setRequestedTimeSeries(null),
    changePalette: async value => {
      await mobileRepository.savePalette(value);
      setPalette(value);
    },
    savePreferences: (profile, goals) => persist(archive => {
      const remaining = new Set(goals.map(goal => goal.id));
      const unlink = <T extends ItemData,>(item: T): T => {
        if (!item.goalId || remaining.has(item.goalId)) return item;
        const next = { ...item };
        delete next.goalId;
        return next;
      };
      const items = archive.calendar.items.map(item => ({ ...unlink(item), exceptions: Object.fromEntries(
        Object.entries(item.exceptions).map(([date, exception]) => [date, exception === null ? null : unlink(exception)]),
      ) }));
      return { ...archive, calendar: { ...archive.calendar, items, profile, goals } };
    }),
    clearCalendar: () => persist(archive => ({ ...archive, calendar: clearCalendar(archive.calendar), habits: [] })),
    resetAll: async () => {
      const base = current.current;
      if (!base) throw new Error('Database non disponibile.');
      if (locked.current) throw new Error('Salvataggio in corso. Attendi e riprova.');
      locked.current = true;
      setSaving(true);
      try {
        const saved = await mobileRepository.reset(base.revision);
        current.current = saved;
        setSnapshot(saved);
        setPalette('natural');
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Ripristino non riuscito.');
        throw cause;
      } finally {
        locked.current = false;
        setSaving(false);
      }
    },
    prepareImport: parseArchive,
    importBackup: archive => persist(() => archive, true),
    exportBackup: previous => {
      const archive = previous ? current.current?.previous : current.current?.archive;
      if (!archive) throw new Error('Backup non disponibile.');
      return exportArchive(archive);
    },
    createStepHabit: draft => persist(archive => {
      const result = createHabit(archive.calendar, archive.habits ?? [], draft, { habitId: randomUUID() });
      return { ...archive, calendar: result.calendar, habits: result.habits };
    }),
    createTimeHabit: draft => persist(archive => saveWeeklyTimeHabit(archive, randomUUID(), draft, today())),
    recordOutcome: (item, outcome) => persist(archive => {
      const source = archive.calendar.items.find(entry => entry.id === item.sourceId);
      if (!source || !isProgressActivity(source)) throw new Error('Esito disponibile solo per attività monitorate.');
      if (source.habitClosedOn && item.date > source.habitClosedOn) throw new Error('Questa serie è già conclusa.');
      return { ...archive,
        calendar: setOccurrenceOutcome(archive.calendar, item.sourceId, item.occurrenceDate, outcome),
        history: [...archive.history, outcomeRecord(archive.calendar, item, outcome)],
      };
    }),
    recordTime: (habitId, minutes, notes) => persist(archive => saveTimeSession(archive, {
      commandId: randomUUID(), session: { id: randomUUID(), habitId, date: today(), minutes, notes: notes.trim(), removed: false },
    }, today(), new Date().toISOString())),
    resolveTimeSeries: (habitId, seriesId, repeat) => persist(archive => resolveTimeSeries(archive, habitId, seriesId, repeat, randomUUID(), today())),
  }), [snapshot, statistics, saving, error, retry, palette, requestedTimeSeries, persist]);
  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

/** Restituisce lo snapshot mobile e le operazioni applicative confermate. */
export function usePlanner(): PlannerValue {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner richiede PlannerProvider.');
  return context;
}
