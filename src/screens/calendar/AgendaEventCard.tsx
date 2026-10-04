import { AppIcon } from "../../icons/AppIcon";
import type { CSSProperties } from "react";
import { useState } from "react";
import { eventCover } from "../../activityCovers";
import { eventAppearance, eventColors, isProgressActivity, outcomeLabels } from "../../domain/calendar";
import { useLoading } from "../../hooks/useLoading";
import type { ItemOutcome, Occurrence } from "../../model/calendar.js";
import { EventIcon } from "../../icons/EventIcon";

interface AgendaEventCardProps {
  item: Occurrence;
  date: string;
  top: string;
  height: string;
  disabled?: boolean;
  onOpen: (item: Occurrence) => void;
  onDelete: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
}

export function AgendaEventCard({ item, date, top, height, disabled, onOpen, onDelete, onOutcome }: AgendaEventCardProps) {
  const { isLoading } = useLoading();
  const progressActivity = isProgressActivity(item);
  const pending = progressActivity && isLoading(`outcome:${item.id}`);
  const [error, setError] = useState("");
  const appearance = eventAppearance(item);
  const cover = eventCover(item.kind, appearance.icon);
  const times = `${item.date < date ? "↳" : item.start}–${item.endDate > date ? "↗" : item.end}`;
  return <article className="agenda-event" aria-label={`${item.title}, ${times}`} style={{ "--event-color": eventColors[appearance.color].value, top, height } as CSSProperties}>
    <div className="agenda-surface">
      <header className="agenda-header">
        <button type="button" className="agenda-open" disabled={disabled} onClick={() => onOpen(item)} title={`${item.title} · ${item.start}–${item.end}`} aria-label={`Apri ${item.title}`} aria-haspopup="dialog">
          <span className="agenda-icon"><EventIcon icon={appearance.icon} /></span>
          <span className="agenda-heading"><strong>{item.title}</strong><small>{times}</small></span>
        </button>
        <div className="agenda-tools">
          {progressActivity && <button type="button" className="agenda-compact-outcome" disabled={disabled} onClick={() => onOpen(item)} title={item.outcome ? outcomeLabels[item.outcome] : "Registra esito"} aria-label={`Esito ${item.title}: ${item.outcome ? outcomeLabels[item.outcome] : "non registrato"}`} aria-haspopup="dialog">{item.outcome === "completed" ? "✓" : item.outcome === "partial" ? "◐" : item.outcome === "skipped" ? "×" : "○"}</button>}
          <button type="button" disabled={disabled} onClick={() => onOpen(item)} title="Altre azioni" aria-label={`Altre azioni per ${item.title}`} aria-haspopup="dialog">⋯</button>
          <button type="button" className="agenda-delete" disabled={disabled} onClick={() => onDelete(item)} title="Elimina appuntamento" aria-label={`Elimina ${item.title}`} aria-haspopup="dialog"><AppIcon name="delete-event" size={15} /></button>
        </div>
      </header>
      <div className={`agenda-body${item.coverImage !== false ? " agenda-body-photo" : ""}`} style={item.coverImage !== false ? { "--cover-image": `url("${cover.src}")` } as CSSProperties : undefined}>{item.notes && <p>{item.notes}</p>}</div>
      {pending && <span role="status">Salvataggio…</span>}
      <div className="agenda-meta"><span>{item.kind !== "flexible" ? "🔒 " : ""}{item.recurring ? "↻ Settimanale" : "Una volta"}</span><span>{times}</span></div>
      {progressActivity && <div className="agenda-outcomes" role="group" aria-busy={pending} aria-label={`Esito ${item.title}`}>
        {(Object.keys(outcomeLabels) as ItemOutcome[]).map(outcome => <button key={outcome} type="button" disabled={disabled} aria-pressed={item.outcome === outcome} aria-label={`${outcomeLabels[outcome]}: ${item.title}`} title={outcomeLabels[outcome]} onClick={async () => {
          try { await onOutcome(item, outcome); setError(""); } catch (cause) { setError((cause as Error).message); }
        }}><span aria-hidden="true">{outcome === "completed" ? "✓" : outcome === "partial" ? "◐" : "×"}</span><small>{outcomeLabels[outcome]}</small></button>)}
      </div>}
    </div>
    {error && <p role="alert" className="agenda-error">{error}</p>}
  </article>;
}
