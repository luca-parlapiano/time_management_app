import { useDB } from '../../hooks/useDB';
import { StandardButton } from '../../components/ui/StandardButton';
import { formatDurationMinutes } from '../../utils/time';
import { today } from '../../utils/dates';
import type { TimeSession } from '../../model/weeklyTime';

interface Props { date: string; onAddTime: (habitId?: string, session?: TimeSession) => void }

/** Mostra il diario fuori dalla griglia oraria: nessun appuntamento fittizio o doppio conteggio. */
export function CalendarTimeDay({ date, onAddTime }: Props) {
  const { timeSessions, weeklyTimeHabits, getTimeMinutes } = useDB();
  const sessions = timeSessions.filter(session => session.date === date && !session.removed);
  const availableHabit = weeklyTimeHabits.find(habit => !habit.archivedOn && habit.startsOn <= date && (!habit.series || habit.series.some(series => !series.decision && series.startsOn <= date && series.endsOn >= date)));
  const canAdd = Boolean(availableHabit) && date === today();
  return <div className="calendar-time-day">
    {sessions.length > 0 && <strong>Tempo registrato · {formatDurationMinutes(getTimeMinutes(date))}</strong>}
    <div className="calendar-time-sessions">{sessions.map(session => <button type="button" key={session.id} onClick={() => onAddTime(session.habitId, session)}>{weeklyTimeHabits.find(habit => habit.id === session.habitId)?.title} · {formatDurationMinutes(session.minutes)}</button>)}</div>
    <StandardButton variant="ghost" disabled={!canAdd} onClick={() => onAddTime(availableHabit?.id)}>Aggiungi tempo</StandardButton>
  </div>;
}
