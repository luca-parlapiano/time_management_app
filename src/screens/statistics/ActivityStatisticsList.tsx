import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { eventColors } from '../../constants';
import { displayDate, today } from '../../utils/dates';
import { EventIcon } from '../../icons/EventIcon';
import { ActivityHeatmap, dayDescription } from './ActivityHeatmap';
import type { TimeActivityStatistics } from '../../model/statistics';
import { TimeActivityStatisticsList } from './TimeStatistics';

/** Elenca i risultati annuali confermati; il calendario viene montato solo quando richiesto. */
export function ActivityStatisticsList({ year, timeActivities }: { year: number; timeActivities: TimeActivityStatistics[] }) {
  const { getStatisticsActivities, getActivityYearStatistics } = useDB();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const referenceDate = today();
  const activities = useMemo(() => getStatisticsActivities().map(activity => getActivityYearStatistics(activity.id, year, referenceDate)), [getStatisticsActivities, getActivityYearStatistics, year, referenceDate]);
  if (!activities.length && !timeActivities.length) return <p>Nessun esito o tempo registrato da mostrare. Crea un’abitudine per iniziare.</p>;
  return <div className="activity-statistics-list">
    <TimeActivityStatisticsList activities={timeActivities} />
    {activities.length > 0 && <p className="annual-hint">Ogni serie a step conta una volta quando tutti gli step scelti hanno un esito, Fatto o Non fatto, nell’anno dell’ultimo step. Sono inclusi gli esiti già registrati su date future. Per le attività ricorrenti già monitorate senza traguardo contiamo i singoli eventi fino a oggi. Apri il calendario per esplorare i singoli giorni.</p>}
    {activities.map(statistics => {
      const { activity, completedSeries, completed, futureCompleted, skipped, recentDays } = statistics;
      const expanded = expandedId === activity.id;
      return <article className="activity-statistics-card" key={activity.id} style={{ '--activity-color': eventColors[activity.color].value } as CSSProperties}>
        <div className="activity-statistics-row">
          <div className="activity-statistics-identity"><span className="activity-medallion"><EventIcon icon={activity.icon} /></span><h3>{activity.title}</h3></div>
          <div className="activity-completed"><strong>{completedSeries ?? completed}</strong><span>{completedSeries !== null ? (completedSeries === 1 ? 'serie conclusa' : 'serie concluse') : (completed === 1 ? 'evento completato' : 'eventi completati')}</span></div>
          <div className="activity-recent"><span>Ultimi giorni pianificati</span><div className="activity-recent-days" aria-label={`Esiti recenti di ${activity.title}`}>
            {recentDays.map(day => <span key={day.date} className={`heatmap-swatch ${day.state}`} style={{ '--completion': `${day.percent ?? 0}%` } as CSSProperties} title={`${displayDate(day.date)} · ${dayDescription(day)}`} role="img" aria-label={`${displayDate(day.date)}: ${dayDescription(day)}`} />)}
            {!recentDays.length && <small>Nessun giorno trascorso nell’anno</small>}
          </div><small>{skipped} non superate</small>
            {completedSeries === null && futureCompleted > 0 && <small>{futureCompleted} {futureCompleted === 1 ? 'evento già segnato su una data futura, escluso' : 'eventi già segnati su date future, esclusi'} dal totale.</small>}
          </div>
          <button className="secondary-button" type="button" aria-expanded={expanded} aria-controls={`activity-calendar-${activity.id}`} onClick={() => setExpandedId(expanded ? null : activity.id)}>{expanded ? 'Chiudi calendario' : 'Apri calendario'}</button>
        </div>
        <div id={`activity-calendar-${activity.id}`} hidden={!expanded}>{expanded && <ActivityHeatmap key={`${activity.id}-${year}`} statistics={statistics} />}</div>
      </article>;
    })}
  </div>;
}
