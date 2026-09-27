import { ActivityHeatmap } from "./ActivityHeatmap";
import { useDB } from "../../hooks/useDB";
import { DailyDoughnut } from "./DailyDoughnut";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { addDays, displayDate, eventAppearance, eventColors, occurrences, outcomeLabels, today } from "../../domain/calendar";
import { latestOutcomes, statisticsOutcomeLabels } from "../../domain/outcomeArchive";
import type { CalendarState, Occurrence } from "../../model/calendar.js";
import type { OutcomeRecord } from "../../model/outcomeArchive.js";
import { StandardButton } from "../ui/StandardButton";
import { CalendarDialog } from "../ui/CalendarDialog";
import { EventIcon } from "../../icons/EventIcon";

interface CalendarStatisticsProps { state: CalendarState; history: OutcomeRecord[] }

export function CalendarStatistics({ state, history }: CalendarStatisticsProps) {
  const { getDailyStatistics } = useDB();
  const [view, setView] = useState<"overview" | "activity">("overview");
  const [year, setYear] = useState(() => Number(today().slice(0, 4)));
  const [showHistory, setShowHistory] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(50);
  const latest = useMemo(() => latestOutcomes(history), [history]);
  const yearOutcomes = latest.filter(record => record.eventDate.startsWith(`${year}-`));
  const yearHistory = history.filter(record => record.eventDate.startsWith(`${year}-`)).slice().reverse();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { byDate } = useMemo(() => {
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
    return { byDate };
  }, [state.items, year]);

  return <div className="annual-statistics">
    <div className="statistics-views" role="group" aria-label="Vista statistiche">
      <StandardButton variant="secondary" type="button" aria-pressed={view === "overview"} onClick={() => setView("overview")}>Panoramica</StandardButton>
      <StandardButton variant="secondary" type="button" aria-pressed={view === "activity"} onClick={() => setView("activity")}>Per attività</StandardButton>
    </div>
    <div className="annual-toolbar">
      <nav className="annual-navigation" aria-label="Navigazione anni">
        <StandardButton variant="secondary" type="button" aria-label="Anno precedente" disabled={year <= 1900} onClick={() => setYear(value => value - 1)}>←</StandardButton>
        <strong aria-live="polite">{year}</strong>
        <StandardButton variant="secondary" type="button" aria-label="Anno successivo" disabled={year >= 9998} onClick={() => setYear(value => value + 1)}>→</StandardButton>
        <StandardButton variant="ghost" type="button" onClick={() => setYear(Number(today().slice(0, 4)))}>Anno attuale</StandardButton>
      </nav>
      {view === "overview" && <div className="outcome-summary" aria-live="polite">
        <span>{yearOutcomes.filter(record => record.outcome === "completed").length} superate</span>
        <span>{yearOutcomes.filter(record => record.outcome === "skipped").length} non superate</span>
        <span>{yearOutcomes.filter(record => record.outcome === "partial").length} parziali</span>
        <StandardButton variant="secondary" type="button" onClick={() => { setHistoryLimit(50); setShowHistory(true); }}>Registro esiti</StandardButton>
      </div>}
    </div>
    {view === "activity" ? <ActivityHeatmap year={year} /> : <>
    <p className="annual-hint">Ogni appuntamento conta una volta, con l’ultimo esito registrato. Lo storico resta disponibile anche dopo l’eliminazione dal calendario.</p>
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
              const recorded = yearOutcomes.filter(record => record.eventDate === date);
              const daily = getDailyStatistics(date);
              return <td key={column} className={column % 7 >= 5 ? "planner-weekend" : undefined}>
                <button type="button" className={`annual-day${events.length || recorded.length ? " annual-day-events" : ""}`} aria-current={date === today() ? "date" : undefined} aria-label={`${displayDate(date, { weekday: "long", year: "numeric" })}, ${daily.total} appuntamenti, ${daily.recorded ? `${Math.round(daily.completionPercent)}% completato` : "nessun esito"}: ${daily.activities.map(item => `${item.title} ${item.count}`).join(", ")}, ${recorded.length} esiti`} title={daily.total ? daily.activities.map(item => `${item.title}: ${item.count}`).join("\n") : `${displayDate(date)}: nessun evento`} onClick={() => setSelectedDate(date)}>
                  <span className="planner-day-number">{day}</span>
                  {daily.total > 0 && <DailyDoughnut statistics={daily} compact />}
                </button>
              </td>;
            })}
          </tr>;
        })}</tbody>
      </table>
    </div>
    </>}
    {showHistory && <CalendarDialog title={`Registro esiti · ${year}`} onClose={() => setShowHistory(false)}>
      <p>Data attività ed esito vengono conservati a ogni registrazione. Le correzioni sono mostrate separatamente.</p>
      {yearHistory.length === 0 ? <p>Nessun esito registrato in questo anno.</p> : <><div className="outcome-register"><table><thead><tr><th>Attività</th><th>Data attività</th><th>Esito</th><th>Registrato il</th></tr></thead><tbody>
        {yearHistory.slice(0, historyLimit).map(record => <tr key={record.id}><td>{record.title}</td><td>{displayDate(record.eventDate, { year: "numeric" })}</td><td>{statisticsOutcomeLabels[record.outcome]}</td><td>{record.recordedAt ? new Date(record.recordedAt).toLocaleString("it-IT") : "Recuperato: ora originale non disponibile"}</td></tr>)}
      </tbody></table></div>{yearHistory.length > historyLimit && <StandardButton variant="secondary" onClick={() => setHistoryLimit(value => value + 50)}>Mostra altre registrazioni</StandardButton>}</>}
    </CalendarDialog>}
    {selectedDate && <CalendarDialog title={displayDate(selectedDate, { weekday: "long", year: "numeric" })} onClose={() => setSelectedDate(null)}>
      <DailyDoughnut statistics={getDailyStatistics(selectedDate)} />
      {latest.some(record => record.eventDate === selectedDate) && <section><h4>Esiti salvati</h4><ul>{latest.filter(record => record.eventDate === selectedDate).map(record => <li key={record.id}>{record.title}: <strong>{statisticsOutcomeLabels[record.outcome]}</strong></li>)}</ul></section>}
      {(byDate.get(selectedDate) ?? []).length === 0 ? <p>Nessun evento attuale nel calendario per questa data.</p> : <ul className="annual-event-list">
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
