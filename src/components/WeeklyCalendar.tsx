import type { CSSProperties } from "react";
import { FolderShape } from "./FolderShape";
import { EventIcon } from "./EventIcon";
import { addDays, displayDate, eventAppearance, eventColors, eventIcons, kindLabels, occurrences, outcomeLabels, today, type CalendarState, type Occurrence } from "../domain/calendar";

interface WeeklyCalendarProps {
  state: CalendarState;
  week: string;
  disabled?: boolean;
  onAdd: (date: string) => void;
  onEdit: (item: Occurrence) => void;
}
export function WeeklyCalendar({ state, week, disabled, onAdd, onEdit }: WeeklyCalendarProps) {
  const visible = occurrences(state.items, week, addDays(week, 6));
  return <section className="calendar-grid continuous-calendar" aria-label="Calendario settimanale">
    {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(date => {
      const entries = visible.filter(item => item.date <= date && (item.endDate > date || (item.endDate === date && item.end > "00:00")));
      return <article key={date} className={`day-column ${date === today() ? "day-today" : ""}`}>
        <header className="day-header"><time dateTime={date}>{displayDate(date, { weekday: "short", month: "short" })}</time>{date === today() && <small>Oggi</small>}</header>
        <div className="day-blocks">
          <button disabled={disabled} type="button" className="day-add ghost-button" aria-label={`Aggiungi attività il ${date}`} onClick={() => onAdd(date)}>+ Aggiungi</button>
          {entries.length === 0 && <p className="day-empty">Nessun elemento</p>}
          {entries.map(item => {
            const appearance = eventAppearance(item);
            const details = `${kindLabels[item.kind]}${item.outcome ? `, ${outcomeLabels[item.outcome]}` : ""}${item.recurring ? ", settimanale" : ""}`;
            return <button disabled={disabled} type="button" key={item.id} className={`calendar-item${item.completed ? " calendar-item-completed" : ""}`} style={{ "--event-color": eventColors[appearance.color].value } as CSSProperties} onClick={() => onEdit(item)} aria-haspopup="dialog" aria-label={`Apri ${item.title}, ${eventIcons[appearance.icon]}, ${details}, ${displayDate(item.date)} ${item.start} – ${displayDate(item.endDate)} ${item.end}`}>
              <FolderShape />
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
