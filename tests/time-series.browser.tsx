import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { DBProvider } from '../src/providers/DBProvider';
import { LoadingProvider } from '../src/providers/LoadingProvider';
import { createDevRepository } from '../src/repository/DevRepository';
import { useDB } from '../src/hooks/useDB';
import { addDays, today, weekStart } from '../src/utils/dates';
import type { DBContextValue } from '../src/model/database';
import '../src/styles.css';
import '../src/themes.css';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const repository = createDevRepository();
const root = createRoot(document.getElementById('root')!);
let db: DBContextValue;
function Probe() { db = useDB(); return null; }
const results: string[] = [];
function check(value: unknown, message: string) { if (!value) throw new Error(message); results.push(`PASS ${message}`); }
try {
  await act(async () => { root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><Probe /></DBProvider></LoadingProvider></StrictMode>); });
  const date = today(), previousEnd = addDays(`${date.slice(0, 7)}-01`, -1), previousStart = `${previousEnd.slice(0, 7)}-01`;
  const draft = { title: 'Serie di prova', motivation: '', startsOn: previousStart, period: 'month' as const, targetMinutes: 120, icon: 'study' as const, color: 'teal' as const };
  await act(async () => {
    await db.saveWeeklyTimeHabit('roundtrip', draft);
    await db.saveTimeSession({ commandId: 'sample', session: { id: 'sample', habitId: 'roundtrip', date: previousStart, minutes: 180, notes: 'Tempo della vecchia serie', removed: false } });
  });
  const series = db!.weeklyTimeHabits[0].series![0];
  const before = JSON.stringify(db!.archive), originalSave = repository.save.bind(repository);
  repository.save = async () => { throw new Error('Errore di scrittura simulato'); };
  let failed = false;
  await act(async () => { try { await db.resolveTimeSeries('roundtrip', series.id, true, 'next'); } catch { failed = true; } });
  repository.save = originalSave;
  check(failed && JSON.stringify(db!.archive) === before, 'Errore di conferma: risultato e scelta restano invariati');
  await act(async () => { await db.resolveTimeSeries('roundtrip', series.id, true, 'next'); await db.resolveTimeSeries('roundtrip', series.id, true, 'retry'); });
  check(db!.weeklyTimeHabits[0].series!.length === 2, 'Ripetizione idempotente, nessuna serie duplicata');
  check(db!.getWeeklyTimeProgress('roundtrip', date).completedMinutes === 0 && db!.getRecentTimeSessions('roundtrip').length === 0, 'Nuova serie e stack ripartono da zero');
  check(db!.getTimeSeriesResults().find(result => result.series.id === series.id)?.completedMinutes === 180, 'Le ore eccedenti restano nella serie conclusa');
  await act(async () => { await db.retry(); });
  check(db!.getTimeSeriesResults().filter(result => result.series.decision).length === 1, 'Riapertura conserva la scelta e il risultato');
  const backup = await db!.prepareImport(await db!.exportBackup());
  await act(async () => { await db.resetAll(); await db.importBackup(backup); });
  check(db!.weeklyTimeHabits[0].series!.length === 2 && db!.getTimeSeriesResults()[0].reached, 'Backup ripristina serie e trofei senza duplicazioni');
  await act(async () => {
    await db.saveWeeklyTimeHabit('guitar', { ...draft, title: 'Imparare a suonare la chitarra', targetMinutes: 1200 });
    await db.saveTimeSession({ commandId: 'guitar-1', session: { id: 'guitar-1', habitId: 'guitar', date: previousStart, minutes: 600, notes: 'Accordi e ritmo', removed: false } });
    await db.saveTimeSession({ commandId: 'guitar-2', session: { id: 'guitar-2', habitId: 'guitar', date: addDays(previousStart, 1), minutes: 720, notes: 'Pratica e nuovi brani', removed: false } });
    const pastWeek = addDays(weekStart(date), -7);
    await db.saveWeeklyTimeHabit('reading', { ...draft, title: 'Leggere in inglese', period: 'week', startsOn: pastWeek, targetMinutes: 300 });
    await db.saveTimeSession({ commandId: 'reading', session: { id: 'reading', habitId: 'reading', date: pastWeek, minutes: 60, notes: 'Primo capitolo', removed: false } });
  });
  results.push('TUTTI I TEST SERIE SUPERATI');
  await act(async () => { root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><App /></DBProvider></LoadingProvider></StrictMode>); });
} catch (cause) { results.push(`FAIL ${cause instanceof Error ? cause.stack : String(cause)}`); }
finally { document.getElementById('results')!.textContent = results.join('\n'); globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
