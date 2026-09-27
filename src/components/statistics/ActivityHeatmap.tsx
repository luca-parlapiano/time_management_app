import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { eventColors, weekdayLabels } from '../../constants';
import { dateNumber, displayDate, today } from '../../utils/dates';
import type { ActivityDayStatistics } from '../../model/statistics.js';
import { EventIcon } from '../../icons/EventIcon';
import { CalendarDialog } from '../ui/CalendarDialog';

interface ActivityHeatmapProps { year: number }

/** Descrive la cella senza affidare il significato al solo colore. */
function dayDescription(day: ActivityDayStatistics): string {
  if (day.state === 'empty') return 'Non pianificata';
  if (day.state === 'future') return `${day.total} occorrenze future`;
  if (day.state === 'pending') return `${day.total} occorrenze · Nessun esito`;
  return `${Math.round(day.percent ?? 0)}% · ${day.completed} superate, ${day.partial} parziali, ${day.skipped} non superate, ${day.pending} senza esito`;
}

/** Griglia mensile degli esiti di un’attività; i calcoli arrivano dal Provider. */
export function ActivityHeatmap({year}: ActivityHeatmapProps) {
  const {getStatisticsActivities, getActivityYearStatistics} = useDB();
  const activities = useMemo(() => getStatisticsActivities(), [getStatisticsActivities]);
  const [chosenId, setChosenId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activity = activities.find(item => item.id === chosenId) ?? activities[0];
  const referenceDate = today();
  const statistics = useMemo(() => activity ? getActivityYearStatistics(activity.id, year, referenceDate) : null, [activity, year, referenceDate, getActivityYearStatistics]);
  if (!activity || !statistics) return <p>Nessuna attività disponibile. Crea un’attività nel calendario per iniziare.</p>;
  const selected = statistics.days.find(day => day.date === selectedDate);
  return <section className="activity-heatmap" aria-label="Statistiche per attività" style={{'--activity-color': eventColors[activity.color].value} as CSSProperties}>
    <div className="activity-heatmap-heading">
      <label>Attività<select value={activity.id} onChange={event => {setChosenId(event.target.value); setSelectedDate(null);}}>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <span className="activity-heatmap-title"><EventIcon icon={activity.icon} /><strong>{activity.title}</strong></span>
    </div>
    <p className="annual-hint">Ogni quadrato è un giorno. Superata = 100%, parziale = 50%, non superata = 0%. Con più occorrenze mostriamo la media sul totale pianificato, contando quelle senza esito come zero. I giorni futuri non mostrano risultati.</p>
    <div className="activity-heatmap-legend" aria-label="Legenda">
      <span><i className="heatmap-swatch empty" />Non pianificata</span>
      <span><i className="heatmap-swatch pending" />Senza esito</span>
      <span><i className="heatmap-swatch recorded" />0%</span>
      <span><i className="heatmap-swatch recorded" style={{'--completion': '50%'} as CSSProperties} />50%</span>
      <span><i className="heatmap-swatch recorded" style={{'--completion': '100%'} as CSSProperties} />100%</span>
      <span><i className="heatmap-swatch future" />Futura</span>
    </div>
    <div className="activity-months">{Array.from({length: 12}, (_, monthIndex) => {
      const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const days = statistics.days.filter(day => day.date.startsWith(prefix));
      const offset = (new Date(dateNumber(`${prefix}-01`)).getUTCDay() + 6) % 7;
      return <section className="activity-month" key={prefix} aria-label={displayDate(`${prefix}-01`, {month:'long', day: undefined})}>
        <h3>{displayDate(`${prefix}-01`, {month:'long', day: undefined})}</h3>
        <div className="activity-days">
          {weekdayLabels.map(day => <span className="activity-weekday" key={day.key}>{day.label}</span>)}
          {Array.from({length: offset}, (_, index) => <span key={`offset-${index}`} aria-hidden="true" />)}
          {days.map(day => <button type="button" key={day.date} className={`heatmap-swatch ${day.state}`} style={{'--completion': `${day.percent ?? 0}%`} as CSSProperties} aria-current={day.date === referenceDate ? 'date' : undefined} title={`${displayDate(day.date)} · ${dayDescription(day)}`} aria-label={`${displayDate(day.date)}, ${activity.title}: ${dayDescription(day)}`} onClick={() => setSelectedDate(day.date)}>{Number(day.date.slice(-2))}</button>)}
        </div>
      </section>;
    })}</div>
    {selected && <CalendarDialog title={`${activity.title} · ${displayDate(selected.date, {year:'numeric'})}`} onClose={() => setSelectedDate(null)}>
      <p>{dayDescription(selected)}</p>
      {selected.total > 0 && <p>{selected.total} occorrenze pianificate nella giornata.</p>}
      {selected.state === 'recorded' && <p>La percentuale include tutte le occorrenze: una parziale vale metà di una superata; quelle senza esito restano da valutare.</p>}
    </CalendarDialog>}
  </section>;
}
