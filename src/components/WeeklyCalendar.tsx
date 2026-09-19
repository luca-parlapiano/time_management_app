import { addDays, displayDate, durationMinutes, kindLabels, occurrences, statusLabels, today, type CalendarState, type Occurrence } from "../domain/calendar";

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
          {entries.map(item => <button disabled={disabled} type="button" key={item.id} className={`plan-block calendar-item plan-block-${item.kind === "fixed" ? "commitment" : item.kind === "protected" ? "recovery" : "focus"}`} onClick={() => onEdit(item)} aria-label={`Modifica ${item.title}, ${date}`}>
            <strong>{item.kind !== "flexible" && <span aria-label="Vincolo bloccato">🔒 </span>}{item.title}</strong>
            <span>{item.date < date ? "Dal giorno precedente" : item.start} – {item.endDate > date ? `${item.end} domani` : item.end}</span>
            <small>{durationMinutes(item)} min · {kindLabels[item.kind]}</small>
            {item.recurring && <small>↻ Settimanale{item.exception ? " · eccezione" : ""}</small>}
            {item.status && <span className={`block-outcome outcome-${item.status}`}>{statusLabels[item.status]}</span>}
            {item.goalId && <small>Obiettivo: {state.goals.find(goal => goal.id === item.goalId)?.name}</small>}
            {item.notes && <p>{item.notes}</p>}
          </button>)}
        </div>
      </article>;
    })}
  </section>;
}
