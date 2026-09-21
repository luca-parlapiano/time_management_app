import type { CSSProperties } from "react";
import { EventIcon } from "./EventIcon";
import { addDays, displayDate, eventAppearance, eventColors, eventIcons, kindLabels, occurrences, outcomeLabels, today, type CalendarState, type Occurrence } from "../domain/calendar";

interface WeeklyCalendarProps {
  state: CalendarState;
  week: string;
  disabled?: boolean;
  onAdd: (date: string) => void;
  onEdit: (item: Occurrence) => void;
}
function minutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}
export function WeeklyCalendar({ state, week, disabled, onAdd, onEdit }: WeeklyCalendarProps) {
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
            const appearance = eventAppearance(item);
            const details = `${kindLabels[item.kind]}${item.outcome ? `, ${outcomeLabels[item.outcome]}` : ""}${item.recurring ? ", settimanale" : ""}`;
            const start = item.date < date ? 0 : minutes(item.start);
            const end = item.endDate > date ? 1440 : minutes(item.end);
            const compact = end - start < 90;
            return <button disabled={disabled} type="button" key={item.id} className={`calendar-item timeline-item${compact ? " timeline-item-compact" : ""}${item.completed ? " calendar-item-completed" : ""}`} style={{ "--event-color": eventColors[appearance.color].value, top: `${(start - firstHour * 60) / totalMinutes * 100}%`, height: `calc(${(end - start) / totalMinutes * 100}% - 1px)` } as CSSProperties} title={`${item.title} · ${item.start}–${item.end}`} onClick={() => onEdit(item)} aria-haspopup="dialog" aria-label={`Apri ${item.title}, ${eventIcons[appearance.icon]}, ${details}, ${displayDate(item.date)} ${item.start} – ${displayDate(item.endDate)} ${item.end}`}>
              <span className="event-main"><span className="event-icon"><EventIcon icon={appearance.icon} /></span><strong>{item.title}</strong></span>
              <span className="event-indicators">
                {item.kind !== "flexible" && <span title="Vincolo bloccato" aria-label="Vincolo bloccato">🔒</span>}
                {item.recurring && <span title={item.exception ? "Eccezione alla serie settimanale" : "Settimanale"} aria-label={item.exception ? "Eccezione alla serie settimanale" : "Settimanale"}>↻{item.exception ? " ·" : ""}</span>}
                {item.outcome && <span className={`block-outcome outcome-${item.outcome}`}>{outcomeLabels[item.outcome]}</span>}
                {(item.date < date || item.endDate > date && item.end > "00:00") && <span className="event-continuation">{item.date < date ? "↳ Dal giorno prima" : "Continua domani ↗"}</span>}
              </span>
            </button>;
          })}
        </div>
      </article>;
    })}
  </section>;
}
