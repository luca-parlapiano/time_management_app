import { useState, type CSSProperties } from "react";
import { EventIcon } from "./EventIcon";
import { eventAppearance, eventColors, outcomeLabels, type ItemOutcome, type Occurrence } from "../domain/calendar";

export function AgendaEventCard({ item, date, top, height, disabled, onOpen, onDelete, onOutcome }: {
  item: Occurrence; date: string; top: string; height: string; disabled?: boolean;
  onOpen: (item: Occurrence) => void;
  onDelete: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => void;
}) {
  const [error, setError] = useState("");
  const appearance = eventAppearance(item);
  const times = `${item.date < date ? "↳" : item.start}–${item.endDate > date ? "↗" : item.end}`;
  return <article className="agenda-event" aria-label={`${item.title}, ${times}`} style={{ "--event-color": eventColors[appearance.color].value, top, height } as CSSProperties}>
    <div className="agenda-surface">
      <header className="agenda-header">
        <button type="button" className="agenda-open" disabled={disabled} onClick={() => onOpen(item)} title={`${item.title} · ${item.start}–${item.end}`} aria-label={`Apri ${item.title}`} aria-haspopup="dialog">
          <span className="agenda-icon"><EventIcon icon={appearance.icon} /></span>
          <span className="agenda-heading"><strong>{item.title}</strong><small>{times}</small></span>
        </button>
        <div className="agenda-tools">
          <button type="button" className="agenda-compact-outcome" disabled={disabled} onClick={() => onOpen(item)} title={item.outcome ? outcomeLabels[item.outcome] : "Registra esito"} aria-label={`Esito ${item.title}: ${item.outcome ? outcomeLabels[item.outcome] : "non registrato"}`} aria-haspopup="dialog">{item.outcome === "completed" ? "✓" : item.outcome === "partial" ? "◐" : item.outcome === "skipped" ? "×" : "○"}</button>
          <button type="button" disabled={disabled} onClick={() => onOpen(item)} title="Altre azioni" aria-label={`Altre azioni per ${item.title}`} aria-haspopup="dialog">⋯</button>
          <button type="button" className="agenda-delete" disabled={disabled} onClick={() => onDelete(item)} title="Elimina appuntamento" aria-label={`Elimina ${item.title}`} aria-haspopup="dialog"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg></button>
        </div>
      </header>
      <div className="agenda-body">{item.notes && <p>{item.notes}</p>}</div>
      <div className="agenda-meta"><span>{item.kind !== "flexible" ? "🔒 " : ""}{item.recurring ? "↻ Settimanale" : "Una volta"}</span><span>{times}</span></div>
      <div className="agenda-outcomes" role="group" aria-label={`Esito ${item.title}`}>
        {(Object.keys(outcomeLabels) as ItemOutcome[]).map(outcome => <button key={outcome} type="button" disabled={disabled} aria-pressed={item.outcome === outcome} aria-label={`${outcomeLabels[outcome]}: ${item.title}`} title={outcomeLabels[outcome]} onClick={() => {
          try { onOutcome(item, outcome); setError(""); } catch (cause) { setError((cause as Error).message); }
        }}><span aria-hidden="true">{outcome === "completed" ? "✓" : outcome === "partial" ? "◐" : "×"}</span><small>{outcomeLabels[outcome]}</small></button>)}
      </div>
    </div>
    {error && <p role="alert" className="agenda-error">{error}</p>}
  </article>;
}
