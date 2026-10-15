import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { StandardButton } from '../../components/ui/StandardButton';
import { EventIcon } from '../../icons/EventIcon';
import { AppIcon } from '../../icons/AppIcon';
import { eventColors } from '../../constants';
import { displayDate, today } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';
import { HabitStatusTabs } from './HabitStatusTabs';
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
  const { weeklyTimeHabits, getWeeklyTimeProgress, getTimeSessions, getTimeSeriesResults, setTimeSeriesTrophiesEnabled, saving, saveTimeSession } = useDB();
  const [view, setView] = useState(() => ({ selectedId, archived: Boolean(weeklyTimeHabits.find(habit => habit.id === selectedId)?.archivedOn) }));
  const [seriesId, setSeriesId] = useState('');
  const [error, setError] = useState('');
  const requested = weeklyTimeHabits.find(habit => habit.id === selectedId);
  const archived = view.selectedId === selectedId ? view.archived : Boolean(requested?.archivedOn);
  const completed = weeklyTimeHabits.filter(habit => habit.series?.some(entry => entry.decision));
  const ongoing = weeklyTimeHabits.filter(habit => !habit.archivedOn && habit.series?.some(entry => !entry.decision));
  const visible = archived ? completed : ongoing;
  const selected = visible.find(habit => habit.id === selectedId) ?? visible[0];
  const visibleSeries = selected?.series?.filter(entry => Boolean(entry.decision) === archived) ?? [];
  const series = visibleSeries.find(entry => entry.id === seriesId) ?? visibleSeries.at(-1);
  const sessions = selected && series ? getTimeSessions(selected.id, series.startsOn, series.endsOn, series.id) : [];
  const result = getTimeSeriesResults().find(entry => entry.series.id === series?.id && entry.habit.id === selected?.id);
  const ended = Boolean(series && series.endsOn < today());
  const canConclude = ended || Boolean(result?.reached);
  const run = async (action: () => Promise<void>) => { try { await action(); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Operazione non riuscita.'); } };
  function choose(id: string, showArchive = archived) { setView({ selectedId: id, archived: showArchive }); onSelect(id); setSeriesId(''); setError(''); }
  return <div className="weekly-habits">
    <HabitStatusTabs label="Stato degli obiettivi a ore" archived={archived} onChange={showArchive => {
      const habits = showArchive ? completed : ongoing;
      choose(habits.find(habit => habit.id === selectedId)?.id ?? habits[0]?.id ?? '', showArchive);
    }}>
    {!selected ? <div className="habit-empty"><h3>{archived ? 'Nessuna serie conclusa' : 'Fai spazio a ciò che vuoi imparare'}</h3><p>{archived ? 'Qui ritroverai le serie concluse, anche quando scegli di ripeterle.' : 'Scegli le ore da raggiungere in una settimana o in un mese.'}</p>{!archived && <p className="editor-hint">Usa Crea nell’header per iniziare un nuovo percorso.</p>}</div> : <div className="habits-layout">
      <nav className="habit-list" aria-label="Abitudini a ore">{visible.map(habit => <button key={habit.id} aria-current={habit.id === selected.id ? 'true' : undefined} style={{ '--event-color': eventColors[habit.color].value } as CSSProperties} onClick={() => choose(habit.id)}><span className="habit-list-icon"><EventIcon icon={habit.icon} /></span><strong>{habit.title}</strong><small>{archived ? `${habit.series?.filter(entry => entry.decision).length ?? 0} ${habit.series?.filter(entry => entry.decision).length === 1 ? 'serie conclusa' : 'serie concluse'}` : habit.series?.at(-1)?.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}</small></button>)}</nav>
      {series && <article className="habit-detail weekly-time-detail" style={{ '--event-color': eventColors[selected.color].value } as CSSProperties}>
        <header><span className="habit-detail-icon"><EventIcon icon={selected.icon} /></span><div><h3>{selected.title}</h3>{selected.motivation && <p>{selected.motivation}</p>}</div>{!ended && !series.decision && <StandardButton variant="ghost" onClick={() => onEditWeekly(selected.id)}>Modifica obiettivo</StandardButton>}</header>
        <label className="time-series-selector">Serie<select value={series.id} onChange={event => setSeriesId(event.target.value)}>{[...visibleSeries].reverse().map(entry => <option key={entry.id} value={entry.id}>Serie {selected.series!.findIndex(value => value.id === entry.id) + 1} · {entry.period === 'month' ? 'Mese' : 'Settimana'} · {displayDate(entry.startsOn, { year: 'numeric' })} – {displayDate(entry.closedOn ?? entry.endsOn, { year: 'numeric' })}{entry.decision ? ' · Conclusa' : entry.endsOn < today() ? ' · Da concludere' : ' · In corso'}</option>)}</select></label>
        <WeeklyTimeSummary progress={getWeeklyTimeProgress(selected.id, series.startsOn, today(), series.id)} />
        <label className="series-trophy-option"><input type="checkbox" checked={Boolean(series.trophiesEnabled)} disabled={saving} onChange={event => run(() => setTimeSeriesTrophiesEnabled(selected.id, series.id, event.target.checked))} /><span><strong>Usa trofei per questa serie</strong><small>Il trofeo compare nella raccolta se raggiungi le ore scelte e concludi la serie.</small></span></label>
        {series.trophiesEnabled && result?.reached && series.decision && <p className="time-series-earned"><AppIcon name="trophies" /> Trofeo conquistato per questa serie</p>}
        {canConclude && !series.decision && <StandardButton onClick={() => onReviewSeries(selected.id, series.id)}>Concludi la serie</StandardButton>}
        {!series.decision && !canConclude && <div className="time-detail-actions"><StandardButton disabled={ended || series.startsOn > today()} onClick={() => onAddTime(selected.id)}>Aggiungi tempo</StandardButton>{!ended && <StandardButton variant="secondary" onClick={() => onPlanTime(selected.id)}>Pianifica una sessione</StandardButton>}</div>}
        <h4>Diario della serie</h4>
        {sessions.length === 0 ? <p className="editor-hint">Nessun tempo registrato in questa serie.</p> : <ul className="time-session-list">{sessions.map(session => <li key={session.id} className={session.removed ? 'time-session-removed' : ''}>
          <div><time dateTime={session.date}>{displayDate(session.date, { weekday: 'short', day: 'numeric', month: 'short' })}</time><strong>{formatDurationMinutes(session.minutes)}{session.removed ? ' · Rimossa' : ''}</strong>{session.notes && <p>{session.notes}</p>}</div>
          {!series.decision && <div className="time-session-actions">{!session.removed && <StandardButton variant="ghost" onClick={() => onAddTime(selected.id, session)}>Modifica</StandardButton>}<StandardButton variant="ghost" disabled={saving} onClick={() => run(() => saveTimeSession({ commandId: crypto.randomUUID(), session: { ...session, removed: !session.removed } }))}>{session.removed ? 'Ripristina' : 'Rimuovi'}</StandardButton></div>}
        </li>)}</ul>}
        {series.decision && <p className="editor-hint">Serie conclusa. Le sue ore e il risultato restano nello storico e non passano alle serie successive.</p>}
        {error && <p role="alert" className="capacity-warning">{error}</p>}
      </article>}
    </div>}
    </HabitStatusTabs>
  </div>;
}
