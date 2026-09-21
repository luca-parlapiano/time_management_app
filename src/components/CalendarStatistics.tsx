import { useMemo, useState, type CSSProperties } from "react";
import { CalendarDialog } from "./CalendarDialog";
import { EventIcon } from "./EventIcon";
import { addDays, displayDate, eventAppearance, eventColors, occurrences, outcomeLabels, today, type CalendarState, type Occurrence } from "../domain/calendar";

export function CalendarStatistics({ state }: { state: CalendarState }) {
  const [year, setYear] = useState(() => Number(today().slice(0, 4)));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { entries, byDate } = useMemo(() => {
    const from = `${year}-01-01`;
    const through = `${year}-12-31`;
    const entries = occurrences(state.items, from, through);
    const byDate = new Map<string, Occurrence[]>();
    for (const item of entries) {
      const lastDate = item.end === "00:00" ? addDays(item.endDate, -1) : item.endDate;
      const end = lastDate < through ? lastDate : through;
      for (let date = item.date > from ? item.date : from; date <= end; date = addDays(date, 1)) {
        const day = byDate.get(date) ?? [];
        day.push(item);
        byDate.set(date, day);
      }
    }
    return { entries, byDate };
  }, [state.items, year]);

  return <div className="annual-statistics">
    <div className="annual-toolbar">
      <nav className="annual-navigation" aria-label="Navigazione anni">
        <button type="button" className="secondary-button" aria-label="Anno precedente" disabled={year <= 1900} onClick={() => setYear(value => value - 1)}>←</button>
        <strong aria-live="polite">{year}</strong>
        <button type="button" className="secondary-button" aria-label="Anno successivo" disabled={year >= 9998} onClick={() => setYear(value => value + 1)}>→</button>
        <button type="button" className="ghost-button" onClick={() => setYear(Number(today().slice(0, 4)))}>Anno attuale</button>
      </nav>
      <p>{entries.length} appuntamenti · {entries.filter(item => item.completed).length} completati</p>
    </div>
    <p className="annual-hint">I colori indicano gli eventi del calendario. Seleziona un giorno per consultarli tutti.</p>
    <div className="annual-matrix-wrapper">
      <table className="annual-matrix annual-planner" aria-label={`Calendario annuale ${year}`}>
        <thead><tr>
          <th scope="col" className="annual-month-heading">{year}</th>
          {Array.from({ length: 37 }, (_, column) => <th scope="col" key={column} className={column % 7 >= 5 ? "planner-weekend" : undefined}>
            <abbr title={["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"][column % 7]}>{["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"][column % 7]}</abbr>
          </th>)}
        </tr></thead>
        <tbody>{Array.from({ length: 12 }, (_, monthIndex) => {
          const monthDate = new Date(Date.UTC(year, monthIndex, 1));
          const monthName = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" }).format(monthDate);
          const offset = (monthDate.getUTCDay() + 6) % 7;
          const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
          return <tr key={monthIndex}>
            <th scope="row" className="annual-month-heading">{monthName}</th>
            {Array.from({ length: 37 }, (_, column) => {
              const day = column - offset + 1;
              if (day < 1 || day > count) return <td key={column} className="planner-outside" />;
              const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const events = byDate.get(date) ?? [];
              const colors = [...new Set(events.map(item => eventColors[eventAppearance(item).color].value))];
              return <td key={column} className={column % 7 >= 5 ? "planner-weekend" : undefined}>
                <button type="button" className={`annual-day${events.length ? " annual-day-events" : ""}`} aria-current={date === today() ? "date" : undefined} aria-label={`${displayDate(date, { weekday: "long", year: "numeric" })}, ${events.length} eventi`} title={events.length ? events.map(item => `${item.start} ${item.title}`).join("\n") : `${displayDate(date)}: nessun evento`} onClick={() => setSelectedDate(date)}>
                  <span className="planner-day-number">{day}</span>
                  <span className="annual-event-dots" aria-hidden="true">{colors.slice(0, 3).map(color => <i key={color} style={{ backgroundColor: color }} />)}</span>
                  {events.length > 0 && <span className="annual-event-count" aria-hidden="true">{events.length}</span>}
                </button>
              </td>;
            })}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {selectedDate && <CalendarDialog title={displayDate(selectedDate, { weekday: "long", year: "numeric" })} onClose={() => setSelectedDate(null)}>
      {(byDate.get(selectedDate) ?? []).length === 0 ? <p>Nessun evento in questa data.</p> : <ul className="annual-event-list">
        {byDate.get(selectedDate)!.map(item => {
          const appearance = eventAppearance(item);
          return <li key={item.id} style={{ "--event-color": eventColors[appearance.color].value } as CSSProperties}>
            <span className="sidebar-activity-icon"><EventIcon icon={appearance.icon} /></span>
            <div><strong>{item.title}</strong><p>{item.date < selectedDate ? "Dal giorno precedente" : item.start} – {item.endDate > selectedDate ? "Continua nel giorno successivo" : item.end}</p>{item.outcome && <small>{outcomeLabels[item.outcome]}</small>}</div>
          </li>;
        })}
      </ul>}
    </CalendarDialog>}
  </div>;
}
