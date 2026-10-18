import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { TimeActivityStatistics, TimeStatisticsSession } from '../../model/statistics';
import { eventColorValue } from '../../constants';
import { EventIcon } from '../../icons/EventIcon';
import { displayDate } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';
import { StandardButton } from '../../components/ui/StandardButton';

/** Mostra le registrazioni confermate ricevute dal Provider, con data, durata e nota. */
export function RecordedTimeEntries({ sessions }: { sessions: TimeStatisticsSession[] }) {
  return <ul className="annual-event-list recorded-time-entries">{sessions.map(session => <li key={session.id} style={{ '--event-color': eventColorValue(session.color) } as CSSProperties}>
    <span className="sidebar-activity-icon"><EventIcon icon={session.icon} /></span>
    <div><strong>{session.title} · {formatDurationMinutes(session.minutes)}</strong><p><time dateTime={session.date}>{displayDate(session.date, { year: 'numeric' })}</time></p>{session.notes && <p>{session.notes}</p>}</div>
  </li>)}</ul>;
}

/** Riepiloga le ore per abitudine nell’anno selezionato, includendo le serie concluse e il diario consultabile. */
export function TimeActivityStatisticsList({ activities }: { activities: TimeActivityStatistics[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!activities.length) return null;
  return <>
    <h3 className="time-statistics-heading">Tempo registrato</h3>
    <p className="annual-hint">Ore effettivamente registrate nell’anno fino a oggi, comprese le serie concluse. Le sessioni pianificate e gli inserimenti rimossi sono esclusi.</p>
    {activities.map(({ activity, minutes, sessionCount, completedSeries, days }) => {
      const expanded = expandedId === activity.id;
      return <article key={activity.id} className="activity-statistics-card time-statistics-card" style={{ '--activity-color': eventColorValue(activity.color) } as CSSProperties}>
        <div className="activity-statistics-row">
          <div className="activity-statistics-identity"><span className="activity-medallion"><EventIcon icon={activity.icon} /></span><h3>{activity.title}</h3></div>
          <div className="activity-completed"><strong>{formatDurationMinutes(minutes)}</strong><span>tempo registrato</span></div>
          <div className="activity-recent"><span>{sessionCount} {sessionCount === 1 ? 'inserimento' : 'inserimenti'}</span><span>{completedSeries} {completedSeries === 1 ? 'serie conclusa' : 'serie concluse'}</span></div>
          <StandardButton variant="secondary" aria-expanded={expanded} aria-controls={`time-statistics-${activity.id}`} onClick={() => setExpandedId(expanded ? null : activity.id)}>{expanded ? 'Nascondi inserimenti' : 'Mostra inserimenti'}</StandardButton>
        </div>
        <div id={`time-statistics-${activity.id}`} className="time-statistics-entries" hidden={!expanded}>{expanded && (sessionCount ? <RecordedTimeEntries sessions={days.flatMap(day => day.sessions)} /> : <p>Nessun tempo registrato in questo anno.</p>)}</div>
      </article>;
    })}
  </>;
}
