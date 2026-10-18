import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { today } from '../../utils/dates';
import { eventColorValue } from '../../constants';
import { EventIcon } from '../../icons/EventIcon';
import { StandardButton } from '../../components/ui/StandardButton';
import { WeeklyTimeSummary } from '../habits/WeeklyTimeSummary';
import { TimeSessionStack } from '../habits/TimeSessionStack';

interface Props { onReviewSeries: (habitId: string, seriesId: string) => void; onAddTime: (habitId: string) => void; onOpenHabits: (habitId: string) => void }

/** Mostra il progresso di oggi e propone la chiusura al raggiungimento dell’obiettivo o alla scadenza. */
export function WeeklyTimeToday({ onAddTime, onOpenHabits, onReviewSeries }: Props) {
  const { weeklyTimeHabits, getWeeklyTimeProgress, getRecentTimeSessions } = useDB();
  const date = today();
  const habits = weeklyTimeHabits.filter(habit => !habit.archivedOn && habit.startsOn <= date && !habit.series?.at(-1)?.decision);
  if (!habits.length) return null;
  return <>{habits.map(habit => {
    const series = habit.series?.at(-1);
    const progress = getWeeklyTimeProgress(habit.id, date, date, series?.id);
    const canConclude = series && !series.decision && (progress.state === 'reached' || series.endsOn < date);
    return <article className="today-path-row" key={habit.id} style={{ '--event-color': eventColorValue(habit.color) } as CSSProperties}>
      <div className="today-path-main">
      <div className="today-path-identity"><span className="today-path-icon"><EventIcon icon={habit.icon} /></span><div>
      <p className="eyebrow">{series?.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}</p>
      <button type="button" className="today-habit-link" onClick={() => onOpenHabits(habit.id)}><strong>{habit.title}</strong></button>
      </div></div>
      <WeeklyTimeSummary progress={progress} />
      {canConclude ? <StandardButton onClick={() => onReviewSeries(habit.id, series.id)}>Concludi la serie</StandardButton> : <StandardButton variant="secondary" disabled={progress.state === 'future' || progress.state === 'inactive'} onClick={() => onAddTime(habit.id)}>Aggiungi tempo</StandardButton>}
      </div>
      <details className="today-path-details"><summary>Ultime registrazioni</summary><TimeSessionStack sessions={getRecentTimeSessions(habit.id, date)} /><StandardButton variant="ghost" onClick={() => onOpenHabits(habit.id)}>Apri percorso</StandardButton></details>
  </article>; })}</>;
}
