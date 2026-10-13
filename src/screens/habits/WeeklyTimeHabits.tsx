import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { StandardButton } from '../../components/ui/StandardButton';
import { EventIcon } from '../../icons/EventIcon';
import { AppIcon } from '../../icons/AppIcon';
import { eventColors } from '../../constants';
import { displayDate, today } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';
import { WeeklyTimeSummary } from './WeeklyTimeSummary';
import type { TimeSession } from '../../model/weeklyTime';

export interface WeeklyTimeActions {
  onEditWeekly: (id?: string) => void;
  onAddTime: (habitId?: string, session?: TimeSession) => void;
  onPlanTime: (habitId: string) => void;
  onReviewSeries: (habitId: string, seriesId: string) => void;
}
interface Props extends WeeklyTimeActions { selectedId?: string; onSelect: (id: string) => void }

/** Consulta le serie isolate e il loro diario. Le serie confermate rimangono nello storico in sola lettura. */
export function WeeklyTimeHabits({ selectedId, onSelect, onEditWeekly, onAddTime, onPlanTime, onReviewSeries }: Props) {
  const { weeklyTimeHabits, getWeeklyTimeProgress, getTimeSessions, getTimeSeriesResults, saving, saveTimeSession } = useDB();
  const [archive, setArchive] = useState(false);
  const [seriesId, setSeriesId] = useState('');
  const [error, setError] = useState('');
  const requested = weeklyTimeHabits.find(habit => habit.id === selectedId);
  const archived = requested ? Boolean(requested.archivedOn) : archive;
  const visible = weeklyTimeHabits.filter(habit => Boolean(habit.archivedOn) === archived);
  const selected = visible.find(habit => habit.id === selectedId) ?? visible[0];
  const series = selected?.series?.find(entry => entry.id === seriesId) ?? selected?.series?.at(-1);
  const sessions = selected && series ? getTimeSessions(selected.id, series.startsOn, series.endsOn) : [];
  const result = getTimeSeriesResults().find(entry => entry.series.id === series?.id && entry.habit.id === selected?.id);
  const ended = Boolean(series && series.endsOn < today());
  const run = async (action: () => Promise<void>) => { try { await action(); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Operazione non riuscita.'); } };
  function choose(id: string) { onSelect(id); setSeriesId(''); setError(''); }
  return <div className="weekly-habits">
    <div className="calendar-view-switch" role="group" aria-label="Stato degli obiettivi a ore">
      <StandardButton variant="ghost" aria-pressed={!archived} onClick={() => { setArchive(false); choose(weeklyTimeHabits.find(habit => !habit.archivedOn)?.id ?? ''); }}>In corso</StandardButton>
      <StandardButton variant="ghost" aria-pressed={archived} onClick={() => { setArchive(true); choose(weeklyTimeHabits.find(habit => habit.archivedOn)?.id ?? ''); }}>Archivio</StandardButton>
    </div>
    {!selected ? <div className="habit-empty"><h3>{archived ? 'Nessun obiettivo archiviato' : 'Fai spazio a ciò che vuoi imparare'}</h3><p>Scegli le ore da raggiungere in una settimana o in un mese.</p>{!archived && <p className="editor-hint">Usa Crea nell’header per iniziare un nuovo percorso.</p>}</div> : <div className="habits-layout">
      <nav className="habit-list" aria-label="Abitudini a ore">{visible.map(habit => <button key={habit.id} aria-current={habit.id === selected.id ? 'true' : undefined} style={{ '--event-color': eventColors[habit.color].value } as CSSProperties} onClick={() => choose(habit.id)}><span className="habit-list-icon"><EventIcon icon={habit.icon} /></span><strong>{habit.title}</strong><small>{habit.archivedOn ? 'Archiviata' : habit.series?.at(-1)?.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}</small></button>)}</nav>
      {series && <article className="habit-detail weekly-time-detail" style={{ '--event-color': eventColors[selected.color].value } as CSSProperties}>
        <header><span className="habit-detail-icon"><EventIcon icon={selected.icon} /></span><div><h3>{selected.title}</h3>{selected.motivation && <p>{selected.motivation}</p>}</div>{!ended && !series.decision && <StandardButton variant="ghost" onClick={() => onEditWeekly(selected.id)}>Modifica obiettivo</StandardButton>}</header>
        <label className="time-series-selector">Serie<select value={series.id} onChange={event => setSeriesId(event.target.value)}>{[...selected.series!].reverse().map(entry => <option key={entry.id} value={entry.id}>{entry.period === 'month' ? 'Mese' : 'Settimana'} · {displayDate(entry.startsOn, { year: 'numeric' })} – {displayDate(entry.endsOn, { year: 'numeric' })}{entry.decision ? ' · Conclusa' : entry.endsOn < today() ? ' · Da concludere' : ' · In corso'}</option>)}</select></label>
        <WeeklyTimeSummary progress={getWeeklyTimeProgress(selected.id, series.startsOn)} />
        {ended && result?.reached && <p className="time-series-earned"><AppIcon name="trophies" /> Trofeo conquistato per questa serie</p>}
        {ended && !series.decision && <StandardButton onClick={() => onReviewSeries(selected.id, series.id)}>Concludi la serie</StandardButton>}
        {!series.decision && <div className="time-detail-actions"><StandardButton disabled={ended || series.startsOn > today()} onClick={() => onAddTime(selected.id)}>Aggiungi tempo</StandardButton>{!ended && <StandardButton variant="secondary" onClick={() => onPlanTime(selected.id)}>Pianifica una sessione</StandardButton>}</div>}
        <h4>Diario della serie</h4>
        {sessions.length === 0 ? <p className="editor-hint">Nessun tempo registrato in questa serie.</p> : <ul className="time-session-list">{sessions.map(session => <li key={session.id} className={session.removed ? 'time-session-removed' : ''}>
          <div><time dateTime={session.date}>{displayDate(session.date, { weekday: 'short', day: 'numeric', month: 'short' })}</time><strong>{formatDurationMinutes(session.minutes)}{session.removed ? ' · Rimossa' : ''}</strong>{session.notes && <p>{session.notes}</p>}</div>
          {!series.decision && <div className="time-session-actions">{!session.removed && <StandardButton variant="ghost" onClick={() => onAddTime(selected.id, session)}>Modifica</StandardButton>}<StandardButton variant="ghost" disabled={saving} onClick={() => run(() => saveTimeSession({ commandId: crypto.randomUUID(), session: { ...session, removed: !session.removed } }))}>{session.removed ? 'Ripristina' : 'Rimuovi'}</StandardButton></div>}
        </li>)}</ul>}
        {series.decision && <p className="editor-hint">Serie conclusa. Le sue ore e il risultato restano nello storico e non passano alle serie successive.</p>}
        {error && <p role="alert" className="capacity-warning">{error}</p>}
      </article>}
    </div>}
  </div>;
}
