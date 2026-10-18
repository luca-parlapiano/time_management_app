import type { CSSProperties } from 'react';
import type { Occurrence } from '../../model/calendar';
import { useDB } from '../../hooks/useDB';
import { eventColorValue } from '../../constants';
import { formatDurationMinutes } from '../../utils/time';
import { displayDate, weekStart } from '../../utils/dates';

interface Props { date: string; next?: Occurrence; onOpenEvent: (item: Occurrence) => void }

/** Riassume la data civile ricevuta con dati confermati; senza esiti mostra solo i pallini delle attività. */
export function TodaySummary({ date, next, onOpenEvent }: Props) {
  const { getDailyStatistics, getTimeWeekMinutes } = useDB();
  const daily = getDailyStatistics(date);
  const minutes = getTimeWeekMinutes(date);
  return <div className="today-summary" aria-label="La giornata in sintesi">
    <section className="today-summary-card today-summary-next" aria-labelledby="today-next-title">
      <p className="eyebrow" id="today-next-title">Prossimo passo</p>
      {next ? <button className="today-next-link" onClick={() => onOpenEvent(next)}><strong>{next.title}</strong><span>{next.start}–{next.end} <span aria-hidden="true">↗</span></span></button>
        : <><strong className="today-summary-value">Nessun altro impegno</strong><p>Nessuna attività in arrivo oggi.</p></>}
    </section>
    <section className="today-summary-card" aria-labelledby="today-summary-day">
      <p className="eyebrow" id="today-summary-day">Oggi</p>
      <strong className="today-summary-value">{daily.total ? <>{daily.completed}<small> / {daily.total} fatte</small></> : 'Giornata libera'}</strong>
      {daily.total > 0 ? <>
        {daily.recorded > 0 ? <div className="today-completion" role="img" aria-label={`${daily.completed} attività fatte su ${daily.total}`}>
          {daily.activities.filter(activity => activity.completed > 0).map(activity => <span key={activity.key} style={{ width: `${activity.contributionPercent}%`, background: eventColorValue(activity.color) }} />)}
        </div> : <div className="today-summary-dots" aria-label="Attività pianificate, nessun esito registrato">{daily.activities.map(activity => <span key={activity.key} title={activity.title} style={{ '--event-color': eventColorValue(activity.color) } as CSSProperties} />)}</div>}
        <p>{daily.recorded ? `${daily.skipped} non fatte · ${daily.pending} senza esito` : 'Il primo passo ti aspetta'}</p>
      </> : <p>Nessuna attività pianificata per oggi.</p>}
    </section>
    <section className="today-summary-card" aria-labelledby="today-summary-time">
      <p className="eyebrow" id="today-summary-time">Tempo questa settimana</p>
      <strong className="today-summary-value">{formatDurationMinutes(minutes)}</strong>
      <p>{minutes ? 'Tempo registrato' : 'Nessuna registrazione'} · dal {displayDate(weekStart(date), { day: 'numeric', month: 'short' })} a oggi</p>
    </section>
  </div>;
}
