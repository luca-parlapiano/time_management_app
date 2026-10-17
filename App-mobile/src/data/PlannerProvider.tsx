import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isProgressActivity, setOccurrenceOutcome } from '../core/domain/calendar';
import { reconcileHabitCompletion } from '../core/domain/habitCompletion';
import { createHabit } from '../core/domain/habits';
import { outcomeRecord } from '../core/domain/outcomeArchive';
import { saveWeeklyTimeHabit, saveTimeSession } from '../core/domain/weeklyTime';
import type { HabitDraft } from '../core/model/habit';
import type { ItemOutcome, Occurrence } from '../core/model/calendar';
import type { DatabaseSnapshot } from '../core/model/database';
import type { PlannerArchive } from '../core/model/outcomeArchive';
import type { WeeklyTimeHabitDraft } from '../core/model/weeklyTime';
import { StatisticsRepository } from '../core/repository/StatisticsRepository';
import { today } from '../core/utils/dates';
import { mobileRepository } from './MobileRepository';

interface PlannerValue {
  snapshot: DatabaseSnapshot | null;
  statistics: StatisticsRepository | null;
  saving: boolean;
  error: string | null;
  retry: () => Promise<void>;
  createStepHabit: (draft: HabitDraft) => Promise<void>;
  createTimeHabit: (draft: WeeklyTimeHabitDraft) => Promise<void>;
  recordOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
  recordTime: (habitId: string, minutes: number, notes: string) => Promise<void>;
}

const PlannerContext = createContext<PlannerValue | null>(null);

/** Coordina scritture confermate e statistiche senza salvare totali derivati. */
export function PlannerProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<DatabaseSnapshot | null>(null);
  const locked = useRef(false);
  const retry = useCallback(async () => {
    try {
      const loaded = await mobileRepository.read();
      current.current = loaded;
      setSnapshot(loaded);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossibile aprire il database locale.');
    }
  }, []);
  useEffect(() => {
    void mobileRepository.read().then(loaded => {
      current.current = loaded;
      setSnapshot(loaded);
      setError(null);
    }).catch(cause => {
      setError(cause instanceof Error ? cause.message : 'Impossibile aprire il database locale.');
    });
  }, []);

  const persist = useCallback(async (update: (archive: PlannerArchive) => PlannerArchive) => {
    const base = current.current;
    if (!base) throw new Error('Database non disponibile.');
    if (locked.current) throw new Error('Salvataggio in corso. Attendi e riprova.');
    locked.current = true;
    setSaving(true);
    try {
      const archive = reconcileHabitCompletion(update(base.archive), base.archive);
      const saved = await mobileRepository.save({ archive, expectedRevision: base.revision });
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
    snapshot, statistics, saving, error, retry,
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
  }), [snapshot, statistics, saving, error, retry, persist]);
  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

/** Restituisce lo snapshot mobile e le operazioni applicative confermate. */
export function usePlanner(): PlannerValue {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner richiede PlannerProvider.');
  return context;
}
