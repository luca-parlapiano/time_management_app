import { useState } from "react";
import { StandardButton } from "../../components/ui/StandardButton";
import { DAY, outcomeLabels } from "../../constants";
import { addDays, dateNumber, displayDate, occurrences, validDate } from "../../domain/calendar";
import type { CalendarItem, ItemOutcome, Occurrence } from "../../model/calendar.js";

interface DevPlanProps {
  items: CalendarItem[];
  busy: boolean;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => void;
  onBatch: (items: Occurrence[], outcome: ItemOutcome) => void;
  onInspect: (date: string) => void;
  onEdit: (item: Occurrence) => void;
}

/** Espande il piano selezionato su date esplicite, senza alcun filtro basato sul giorno reale. */
export function DevPlan({ items, busy, onOutcome, onBatch, onInspect, onEdit }: DevPlanProps) {
  const firstDate = items.map(item => item.date).sort()[0];
  const lastDates = items.map(item => item.habitClosedOn ?? item.recurrence?.until ?? (!item.recurrence ? item.endDate : undefined));
  const limit = addDays(firstDate, 365) < "9998-12-31" ? addDays(firstDate, 365) : "9998-12-31";
  const planEnd = lastDates.every(Boolean) ? lastDates.filter((date): date is string => Boolean(date)).sort().at(-1)! : addDays(firstDate, 30);
  const [from, setFrom] = useState(firstDate);
  const [through, setThrough] = useState(planEnd < limit ? planEnd : limit);
  const valid = validDate(from) && validDate(through) && from <= through && dateNumber(through) - dateNumber(from) <= 365 * DAY;
  const events = valid ? occurrences(items, from, through).filter(item => item.date >= from && item.date <= through) : [];
  return <div className="dev-plan">
    <div className="dev-controls">
      <label>Piano dal<input type="date" min="1900-01-01" max="9998-12-31" value={from} disabled={busy} onChange={event => setFrom(event.target.value)} /></label>
      <label>Piano al<input type="date" min="1900-01-01" max="9998-12-31" value={through} disabled={busy} onChange={event => setThrough(event.target.value)} /></label>
    </div>
    <p>Il piano inizia il {displayDate(firstDate, { year: "numeric" })}. {lastDates.every(Boolean) ? `Termina il ${displayDate(planEnd, { year: "numeric" })}.` : "La ricorrenza non ha una data finale: scegli il periodo da provare."} Puoi compilare subito anche tutte le date future.</p>
    {!valid && <p role="alert">Scegli un intervallo valido di massimo 366 giorni. Per piani più lunghi prova un periodo alla volta.</p>}
    <div className="dev-actions" role="group" aria-label="Esiti in blocco">{(["completed", "skipped"] as const).map(outcome => <StandardButton key={outcome} disabled={busy || !events.length} onClick={() => onBatch(events, outcome)}>{outcomeLabels[outcome]} su tutte le date</StandardButton>)}</div>
    <p className="dev-note">{events.length} occorrenze previste nell’intervallo. Gli esiti vengono salvati uno alla volta; al traguardo le date successive escono dal piano. Gli esiti già identici non vengono riscritti.</p>
    <div className="dev-table-wrap dev-plan-table"><table><thead><tr><th>Data prevista</th><th>Orario</th><th>Imposta esito</th><th>Dettagli</th></tr></thead><tbody>{events.map(item => <tr key={item.id}>
      <td><button type="button" className="dev-date-link" disabled={busy} onClick={() => onInspect(item.date)}>{displayDate(item.date, { weekday: "short", year: "numeric" })}</button>{item.exception && <small>Data originale: {item.occurrenceDate}</small>}</td>
      <td>{item.start}–{item.end}</td>
      <td><div className="dev-actions" role="group" aria-label={`Esito ${item.title} ${item.date}`}>{(["completed", "skipped"] as const).map(outcome => <StandardButton key={outcome} disabled={busy} aria-pressed={item.outcome === outcome} onClick={() => onOutcome(item, outcome)}>{outcomeLabels[outcome]}</StandardButton>)}</div>{!item.outcome && <small>Senza esito</small>}</td>
      <td><StandardButton disabled={busy} onClick={() => onEdit(item)}>Sposta / modifica</StandardButton></td>
    </tr>)}</tbody></table></div>
    {valid && !events.length && <p>Nessuna data prevista in questo intervallo. Cambia il periodo, i giorni dell’abitudine o ripeti la serie conclusa.</p>}
  </div>;
}
