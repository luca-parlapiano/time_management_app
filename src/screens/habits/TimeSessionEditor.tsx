import { useState } from 'react';
import { CalendarDialog } from '../../components/ui/CalendarDialog';
import { DurationFields } from '../../components/ui/DurationFields';
import { StandardButton } from '../../components/ui/StandardButton';
import { useDB } from '../../hooks/useDB';
import { seriesForSession } from '../../domain/timeSeries';
import { durationMinutes } from '../../domain/calendar';
import { displayDate, today } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';
import type { Occurrence } from '../../model/calendar';
import type { TimeSession } from '../../model/weeklyTime';

interface Props { habitId?: string; session?: TimeSession; occurrence?: Occurrence; onClose: () => void }

/** Registra minuti reali, anche senza appuntamento; un comando stabile rende innocuo il retry dopo un errore. */
export function TimeSessionEditor({ habitId, session, occurrence, onClose }: Props) {
  const { weeklyTimeHabits, timeSessions, saveTimeSession, saving } = useDB();
  const existing = session ?? (occurrence ? timeSessions.find(entry => entry.sourceId === occurrence.sourceId && entry.occurrenceDate === occurrence.occurrenceDate) : undefined);
  const [draft, setDraft] = useState<TimeSession>(() => existing ? { ...existing, removed: false } : { id: crypto.randomUUID(), habitId: habitId ?? occurrence?.weeklyHabitId ?? weeklyTimeHabits.find(habit => !habit.archivedOn)?.id ?? '', date: today(), minutes: occurrence ? durationMinutes(occurrence) : 60, notes: '', removed: false, ...(occurrence ? { sourceId: occurrence.sourceId, occurrenceDate: occurrence.occurrenceDate } : {}) });
  const [commandId, setCommandId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [manualId, setManualId] = useState('');
  const habit = weeklyTimeHabits.find(entry => entry.id === draft.habitId);
  const series = habit ? seriesForSession(habit, draft) ?? habit.series?.at(-1) : undefined;
  const manual = occurrence && !existing ? timeSessions.filter(entry => entry.habitId === draft.habitId && !entry.sourceId && !entry.removed && (!series || (habit && seriesForSession(habit, entry)?.id === series.id))) : [];
  const change = (patch: Partial<TimeSession>) => { setDraft(current => ({ ...current, ...patch })); setCommandId(crypto.randomUUID()); setError(''); };
  return <CalendarDialog title={existing ? 'Modifica tempo registrato' : 'Aggiungi tempo'} onClose={onClose}>
    <form className="habit-editor" onSubmit={async event => {
      event.preventDefault();
      try { await saveTimeSession({ commandId, session: draft }); onClose(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile registrare il tempo.'); }
    }}>
      {(habitId || occurrence || existing) ? <p className="time-session-habit">{habit?.title}</p> : <label>Abitudine<select required value={draft.habitId} onChange={event => change({ habitId: event.target.value })}>{weeklyTimeHabits.filter(entry => !entry.archivedOn).map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>}
      {occurrence && <p className="editor-hint">Previsto: {formatDurationMinutes(durationMinutes(occurrence))}. Conferma il tempo effettivamente svolto: verrà contato una sola volta.</p>}
      {manual.length > 0 && <label>Hai già registrato questa sessione?<select value={manualId} onChange={event => {
        const selected = manual.find(entry => entry.id === event.target.value);
        setManualId(event.target.value);
        change(selected ? { ...selected, sourceId: occurrence?.sourceId, occurrenceDate: occurrence?.occurrenceDate } : { id: crypto.randomUUID(), date: today(), minutes: occurrence ? durationMinutes(occurrence) : 60, notes: '' });
      }}><option value="">No, aggiungi una sessione</option>{manual.map(entry => <option key={entry.id} value={entry.id}>{entry.date} · {formatDurationMinutes(entry.minutes)} · {entry.notes || 'Senza nota'}</option>)}</select></label>}
      <DurationFields label="Tempo effettivamente svolto" value={draft.minutes} maxHours={24} onChange={minutes => change({ minutes })} />
      {existing ? <label>Data<input type="date" required min={series?.startsOn ?? habit?.startsOn} max={series && series.endsOn < today() ? series.endsOn : habit?.archivedOn && habit.archivedOn < today() ? habit.archivedOn : today()} value={draft.date} onChange={event => change({ date: event.target.value })} /></label> : <p className="editor-hint">{manualId ? 'Tempo già registrato il' : 'Tempo svolto oggi ·'} {displayDate(draft.date, { year: 'numeric' })}</p>}
      <label>Cosa hai fatto?<textarea value={draft.notes} placeholder="Una nota facoltativa sui tuoi progressi" onChange={event => change({ notes: event.target.value })} /></label>
      {series?.decision && <p className="editor-hint">Questa serie è conclusa. Il diario è conservato in sola lettura.</p>}
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><StandardButton type="button" variant="secondary" onClick={onClose}>Annulla</StandardButton><StandardButton type="submit" disabled={saving || !habit || Boolean(series?.decision)}>Salva tempo</StandardButton></div>
    </form>
  </CalendarDialog>;
}
