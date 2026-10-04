import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { eventColors } from '../../constants';
import { displayDate, today } from '../../utils/dates';
import { EventIcon } from '../../icons/EventIcon';
import { ActivityHeatmap, dayDescription } from './ActivityHeatmap';

/** Elenca i risultati annuali confermati; il calendario viene montato solo quando richiesto. */
export function ActivityStatisticsList({ year }: { year: number }) {
  const { getStatisticsActivities, getActivityYearStatistics } = useDB();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const referenceDate = today();
  const activities = useMemo(() => getStatisticsActivities().map(activity => getActivityYearStatistics(activity.id, year, referenceDate)), [getStatisticsActivities, getActivityYearStatistics, year, referenceDate]);
  if (!activities.length) return <p>Nessuna attività monitorata. Crea un’abitudine o una routine per iniziare.</p>;
  return <div className="activity-statistics-list">
    <p className="annual-hint">I tuoi completamenti nell’anno, per abitudine e routine. Apri il calendario per esplorare i singoli giorni.</p>
    {activities.map(statistics => {
      const { activity, completed, partial, skipped, recentDays } = statistics;
      const expanded = expandedId === activity.id;
      return <article className="activity-statistics-card" key={activity.id} style={{ '--activity-color': eventColors[activity.color].value } as CSSProperties}>
        <div className="activity-statistics-row">
          <div className="activity-statistics-identity"><span className="activity-medallion"><EventIcon icon={activity.icon} /></span><h3>{activity.title}</h3></div>
          <div className="activity-completed"><strong>{completed}</strong><span>completamenti</span></div>
          <div className="activity-recent"><span>Ultimi giorni pianificati</span><div className="activity-recent-days" aria-label={`Esiti recenti di ${activity.title}`}>
            {recentDays.map(day => <span key={day.date} className={`heatmap-swatch ${day.state}`} style={{ '--completion': `${day.percent ?? 0}%` } as CSSProperties} title={`${displayDate(day.date)} · ${dayDescription(day)}`} role="img" aria-label={`${displayDate(day.date)}: ${dayDescription(day)}`} />)}
            {!recentDays.length && <small>Nessun giorno trascorso nell’anno</small>}
          </div><small>{partial} parziali · {skipped} non superate</small></div>
          <button className="secondary-button" type="button" aria-expanded={expanded} aria-controls={`activity-calendar-${activity.id}`} onClick={() => setExpandedId(expanded ? null : activity.id)}>{expanded ? 'Chiudi calendario' : 'Apri calendario'}</button>
        </div>
        <div id={`activity-calendar-${activity.id}`} hidden={!expanded}>{expanded && <ActivityHeatmap key={`${activity.id}-${year}`} statistics={statistics} />}</div>
      </article>;
    })}
  </div>;
}
