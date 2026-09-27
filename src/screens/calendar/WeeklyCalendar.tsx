import { percentage } from "../../utils/math.js";
import { toMinutes as minutes } from "../../utils/time.js";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { addDays, displayDate, occurrences, today } from "../../domain/calendar";
import type { CalendarState, ItemOutcome, Occurrence } from "../../model/calendar.js";
import { AgendaEventCard } from "./AgendaEventCard";
import { StandardButton } from "../../components/ui/StandardButton";

interface WeeklyCalendarProps {
  state: CalendarState;
  week: string;
  disabled?: boolean;
  onAdd: (date: string) => void;
  onEdit: (item: Occurrence) => void;
  onDelete: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
}

interface CurrentTimeIndicator {
  date: string;
  firstHour: number;
  lastHour: number;
  label: string;
  top: number | null;
}

/** Aggiorna ogni minuto la posizione dell’ora locale e amplia la fascia visibile quando necessario. */
function useCurrentTimeIndicator(days: string[], initialFirstHour: number, initialLastHour: number): CurrentTimeIndicator {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const date = today();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (!days.includes(date)) return { date, firstHour: initialFirstHour, lastHour: initialLastHour, label, top: null };
  const firstHour = Math.min(initialFirstHour, Math.floor(currentMinutes / 60));
  const lastHour = Math.max(initialLastHour, Math.min(24, Math.floor(currentMinutes / 60) + 1));
  return { date, firstHour, lastHour, label, top: percentage(currentMinutes - firstHour * 60, (lastHour - firstHour) * 60) };
}

export function WeeklyCalendar({ state, week, disabled, onAdd, onEdit, onDelete, onOutcome }: WeeklyCalendarProps) {
  const visible = occurrences(state.items, week, addDays(week, 6));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const dayEntries = days.map(date => visible.filter(item => item.date <= date && (item.endDate > date || (item.endDate === date && item.end > "00:00"))));
  let firstHour = 8;
  let lastHour = 20;
  dayEntries.forEach((entries, index) => entries.forEach(item => {
    firstHour = Math.min(firstHour, item.date < days[index] ? 0 : Math.floor(minutes(item.start) / 60));
    lastHour = Math.max(lastHour, item.endDate > days[index] ? 24 : Math.ceil(minutes(item.end) / 60));
  }));
  const currentTime = useCurrentTimeIndicator(days, firstHour, lastHour);
  firstHour = currentTime.firstHour;
  lastHour = currentTime.lastHour;
  const totalMinutes = (lastHour - firstHour) * 60;
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  return <section className="calendar-grid continuous-calendar hourly-calendar" aria-label="Calendario settimanale" style={{ "--hour-count": lastHour - firstHour } as CSSProperties}>
    <aside className="calendar-time-column" aria-label="Orari">
      <header className="day-header">Orari</header>
      <div className="time-timeline">
        {hours.map((hour, index) => <span key={hour} className="calendar-hour" style={{ top: `${percentage(index, lastHour - firstHour)}%` }}>{String(hour).padStart(2, "0")}:00</span>)}
      </div>
    </aside>
    {days.map((date, dayIndex) => {
      const entries = dayEntries[dayIndex];
      return <article key={date} className={`day-column ${date === currentTime.date ? "day-today" : ""}`}>
        <header className="day-header"><time dateTime={date}>{displayDate(date, { weekday: "short", day: "numeric", month: undefined })}</time><small>{date === currentTime.date ? "Oggi" : "\u00a0"}</small>
          <StandardButton variant="ghost" disabled={disabled} type="button" className="day-add" aria-label={`Aggiungi attività il ${date}`} onClick={() => onAdd(date)} title="Aggiungi attività">+</StandardButton>
        </header>
        <div className="day-blocks day-timeline">
          {entries.length === 0 && <p className="day-empty">Nessun elemento</p>}
          {date === currentTime.date && currentTime.top !== null && <div className="current-time-indicator" style={{ top: `${currentTime.top}%` }}>
            <time className="current-time-label" dateTime={currentTime.label}>{currentTime.label}</time>
          </div>}
          {entries.map(item => {
            const start = item.date < date ? 0 : minutes(item.start);
            const end = item.endDate > date ? 1440 : minutes(item.end);
            return <AgendaEventCard key={item.id} item={item} date={date} disabled={disabled}
              top={`${percentage(start - firstHour * 60, totalMinutes)}%`}
              height={`calc(${percentage(end - start, totalMinutes)}% - 1px)`}
              onOpen={onEdit} onDelete={onDelete} onOutcome={onOutcome} />;
          })}
        </div>
      </article>;
    })}
  </section>;
}
