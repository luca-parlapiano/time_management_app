import { useDB } from '../../hooks/useDB';
import { AppIcon } from '../../icons/AppIcon';
import { displayDate, today } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';

/** Mostra un trofeo per ogni serie conclusa con obiettivo raggiunto; i risultati sono derivati dal diario confermato. */
export function TrophiesScreen({ active }: { active: boolean }) {
  const { getTimeSeriesResults } = useDB();
  const trophies = getTimeSeriesResults().filter(result => result.reached && result.series.decision && result.series.endsOn < today());
  return <section id="panel-trophies" className="app-screen" role="tabpanel" aria-labelledby="tab-trophies" tabIndex={0} hidden={!active}>
    <header className="calendar-header"><h2>Trofei</h2></header>
    <div className="screen-content">{trophies.length ? <ul className="time-trophy-list">{trophies.map(result => <li key={`${result.habit.id}:${result.series.id}`}>
      <AppIcon name="trophies" size={40} /><div><h3>{result.habit.title}</h3><p>{result.series.period === 'month' ? 'Serie mensile' : 'Serie settimanale'} · {displayDate(result.series.startsOn, { year: 'numeric' })} – {displayDate(result.series.endsOn, { year: 'numeric' })}</p><strong>{formatDurationMinutes(result.completedMinutes)} raggiunte su {formatDurationMinutes(result.series.targetMinutes)}</strong></div>
    </li>)}</ul> : <p>Il primo trofeo arriverà quando concluderai una serie raggiungendo il tuo obiettivo di ore.</p>}</div>
  </section>;
}
