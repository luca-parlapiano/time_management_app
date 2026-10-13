import type { CSSProperties } from 'react';
import { useDB } from '../../hooks/useDB';
import { today } from '../../utils/dates';
import { eventColors } from '../../constants';
import { EventIcon } from '../../icons/EventIcon';
import { StandardButton } from '../../components/ui/StandardButton';
import { WeeklyTimeSummary } from '../habits/WeeklyTimeSummary';
import { TimeSessionStack } from '../habits/TimeSessionStack';

interface Props { onReviewSeries: (habitId: string, seriesId: string) => void; onAddTime: (habitId: string) => void; onOpenHabits: (habitId: string) => void }

/** Mostra il progresso di oggi e propone la chiusura al raggiungimento dell’obiettivo o alla scadenza. */
export function WeeklyTimeToday({ onAddTime, onOpenHabits, onReviewSeries }: Props) {
  const { weeklyTimeHabits, getWeeklyTimeProgress, getRecentTimeSessions } = useDB();
  const date = today();
  const habits = weeklyTimeHabits.filter(habit => !habit.archivedOn && habit.startsOn <= date);
  if (!habits.length) return null;
  return <section className="today-card weekly-time-today" aria-labelledby="weekly-time-today-title"><header className="today-card-heading"><div><p className="eyebrow">Tempo per imparare</p><h3 id="weekly-time-today-title">Le tue serie a ore</h3></div></header><div className="weekly-time-cards">{habits.map(habit => {
    const series = habit.series?.at(-1);
    const progress = getWeeklyTimeProgress(habit.id, date);
    const canConclude = series && !series.decision && (progress.state === 'reached' || series.endsOn < date);
    return <article className="weekly-time-card" key={habit.id} style={{ '--event-color': eventColors[habit.color].value } as CSSProperties}>
      <button type="button" className="today-habit-link" onClick={() => onOpenHabits(habit.id)}><EventIcon icon={habit.icon} /><strong>{habit.title}</strong></button>
      <p className="editor-hint">{series?.period === 'month' ? 'Obiettivo mensile' : 'Obiettivo settimanale'}</p>
      <WeeklyTimeSummary progress={progress} />
      <TimeSessionStack sessions={getRecentTimeSessions(habit.id, date)} />
      {canConclude ? <StandardButton onClick={() => onReviewSeries(habit.id, series.id)}>Concludi la serie</StandardButton> : <StandardButton onClick={() => onAddTime(habit.id)}>Aggiungi tempo</StandardButton>}
  </article>; })}</div></section>;
}
