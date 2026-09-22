import type { CSSProperties } from "react";
import { AgendaEventCard } from "./AgendaEventCard";
import { addDays, displayDate, occurrences, today, type CalendarState, type ItemOutcome, type Occurrence } from "../domain/calendar";

interface WeeklyCalendarProps {
  state: CalendarState;
  week: string;
  disabled?: boolean;
  onAdd: (date: string) => void;
  onEdit: (item: Occurrence) => void;
  onDelete: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => void;
}
function minutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
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
  const totalMinutes = (lastHour - firstHour) * 60;
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  return <section className="calendar-grid continuous-calendar hourly-calendar" aria-label="Calendario settimanale" style={{ "--hour-count": lastHour - firstHour } as CSSProperties}>
    <aside className="calendar-time-column" aria-label="Orari">
      <header className="day-header">Orari</header>
      <div className="time-timeline">
        {hours.map((hour, index) => <span key={hour} className="calendar-hour" style={{ top: `${index / (lastHour - firstHour) * 100}%` }}>{String(hour).padStart(2, "0")}:00</span>)}
      </div>
    </aside>
    {days.map((date, dayIndex) => {
      const entries = dayEntries[dayIndex];
      return <article key={date} className={`day-column ${date === today() ? "day-today" : ""}`}>
        <header className="day-header"><time dateTime={date}>{displayDate(date, { weekday: "short", day: "numeric", month: undefined })}</time><small>{date === today() ? "Oggi" : "\u00a0"}</small>
          <button disabled={disabled} type="button" className="day-add ghost-button" aria-label={`Aggiungi attività il ${date}`} onClick={() => onAdd(date)} title="Aggiungi attività">+</button>
        </header>
        <div className="day-blocks day-timeline">
          {entries.length === 0 && <p className="day-empty">Nessun elemento</p>}
          {entries.map(item => {
            const start = item.date < date ? 0 : minutes(item.start);
            const end = item.endDate > date ? 1440 : minutes(item.end);
            return <AgendaEventCard key={item.id} item={item} date={date} disabled={disabled}
              top={`${(start - firstHour * 60) / totalMinutes * 100}%`}
              height={`calc(${(end - start) / totalMinutes * 100}% - 1px)`}
              onOpen={onEdit} onDelete={onDelete} onOutcome={onOutcome} />;
          })}
        </div>
      </article>;
    })}
  </section>;
}
