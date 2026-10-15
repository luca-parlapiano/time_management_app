import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { DBProvider } from '../src/providers/DBProvider';
import { LoadingProvider } from '../src/providers/LoadingProvider';
import { createDevRepository } from '../src/repository/DevRepository';
import { useDB } from '../src/hooks/useDB';
import { TimeSessionEditor } from '../src/screens/habits/TimeSessionEditor';
import { addDays, today, weekStart } from '../src/utils/dates';
import type { DBContextValue } from '../src/model/database';
import type { TimeSessionCommand } from '../src/model/weeklyTime';
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
  const date = today();
  await act(async () => { await db.saveWeeklyTimeHabit('hours', { title: 'Imparare a programmare', motivation: 'Un po’ di pratica ogni settimana', startsOn: weekStart(date), period: 'week', targetMinutes: 360, icon: 'study', color: 'teal' }); });
  const command: TimeSessionCommand = { commandId: 'first', session: { id: 'session', habitId: 'hours', date, minutes: 120, notes: 'Componenti e form React', removed: false } };
  await act(async () => { await db.saveTimeSession(command); await db.saveTimeSession(command); });
  check(db!.getWeeklyTimeProgress('hours', date).completedMinutes === 120 && db!.archive.timeSessionHistory?.length === 1, 'Retry idempotente: due ore e una sola registrazione');
  const before = JSON.stringify(db!.archive);
  const originalSave = repository.save.bind(repository);
  repository.save = async () => { throw new Error('Errore di scrittura simulato'); };
  let failed = false;
  await act(async () => { try { await db.saveTimeSession({ commandId: 'failed', session: { ...command.session, minutes: 60 } }); } catch { failed = true; } });
  repository.save = originalSave;
  check(failed && JSON.stringify(db!.archive) === before && !db!.saving, 'Errore locale senza pubblicare dati non confermati');
  await act(async () => { await db.retry(); });
  check(db!.getWeeklyTimeProgress('hours', date).completedMinutes === 120, 'Riapertura del repository conserva il diario');
  const backup = await db!.prepareImport(await db!.exportBackup());
  await act(async () => { await db.clearCalendar(); });
  check(db!.weeklyTimeHabits.length === 1 && db!.timeSessions.length === 1, 'Svuotare il calendario conserva obiettivo e diario');
  await act(async () => { await db.resetAll(); await db.importBackup(backup); });
  check(db!.getWeeklyTimeProgress('hours', date).completedMinutes === 120, 'Backup/import dopo reset recupera tutte le ore');
  await act(async () => { await db.saveTimeSession({ commandId: 'remove', session: { ...command.session, removed: true } }); });
  check(db!.getWeeklyTimeProgress('hours', date).completedMinutes === 0, 'Rimozione reversibile aggiorna il riepilogo');
  await act(async () => { await db.saveTimeSession({ commandId: 'restore', session: command.session }); });
  check(db!.getWeeklyTimeProgress('hours', date).completedMinutes === 120 && db!.getDailyStatistics(date).total === 0, 'Ripristino senza alterare percentuali degli step');
  for (const [index, notes] of ['Esercizi sulle funzioni', 'Ripasso TypeScript', 'Pratica con i componenti', 'Gestione dello stato', 'Un piccolo progetto personale'].entries()) {
    await act(async () => { await db.saveTimeSession({ commandId: `demo-${index}`, session: { id: `demo-${index}`, habitId: 'hours', date: [weekStart(date), addDays(date, index - 4)].sort().at(-1)!, minutes: 30 + index * 15, notes, removed: false } }); });
  }
  check(db!.getRecentTimeSessions('hours').length === 6 && db!.getRecentTimeSessions('hours')[0].notes === 'Un piccolo progetto personale', 'Storico degli inserimenti disponibile tramite Provider');
  const minutesBefore = db!.getTimeMinutes(date);
  const sessionIdsBefore = new Set(db!.timeSessions.map(session => session.id));
  await act(async () => { root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><Probe /><TimeSessionEditor habitId="hours" onClose={() => {}} /></DBProvider></LoadingProvider></StrictMode>); });
  check(!document.querySelector('input[type="date"]'), 'Aggiungi tempo non permette di scegliere una data');
  await act(async () => { document.querySelector('form')!.requestSubmit(); });
  const addedSession = db!.timeSessions.find(session => !sessionIdsBefore.has(session.id));
  check(addedSession?.date === date && db!.getTimeMinutes(date) === minutesBefore + 60, 'Il tempo aggiunto viene salvato e conteggiato nella giornata corrente');
  await act(async () => { await db.saveTimeSession({ commandId: 'remove-editor-test', session: { ...addedSession!, removed: true } }); });
  const pastSession = db!.timeSessions.find(session => session.id === 'demo-0')!;
  await act(async () => { root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><Probe /><TimeSessionEditor key="edit-past" session={pastSession} onClose={() => {}} /></DBProvider></LoadingProvider></StrictMode>); });
  await act(async () => { document.querySelector('form')!.requestSubmit(); });
  check(db!.timeSessions.find(session => session.id === pastSession.id)?.date === pastSession.date, 'Modificare tempo già registrato conserva la data originale');
  results.push('TUTTI I TEST ORE SUPERATI');
  await act(async () => { root.render(<StrictMode><LoadingProvider><DBProvider repository={repository}><App /></DBProvider></LoadingProvider></StrictMode>); });
} catch (cause) { results.push(`FAIL ${cause instanceof Error ? cause.stack : String(cause)}`); }
finally { document.getElementById('results')!.textContent = results.join('\n'); globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
