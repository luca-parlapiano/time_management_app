import { useState } from "react";
import { displayDate, isProgressActivity, outcomeLabels } from "../../domain/calendar";
import type { ItemOutcome, Occurrence } from "../../model/calendar.js";
import { StandardButton } from "../../components/ui/StandardButton";
import { CalendarDialog } from "../../components/ui/CalendarDialog";

interface CalendarEventMenuProps {
  item: Occurrence;
  initialConfirmDelete?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOutcome: (outcome: ItemOutcome) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function CalendarEventMenu({ item, onClose, onEdit, onOutcome, onDelete, initialConfirmDelete = false }: CalendarEventMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(initialConfirmDelete);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    try { await action(); } catch (cause) { setError((cause as Error).message); }
  }
  return <CalendarDialog compact title={item.title} onClose={onClose}>
    <p className="editor-hint">{displayDate(item.date, { weekday: "long" })} · {item.start}–{item.end}</p>
    {!confirmDelete && isProgressActivity(item) && <fieldset className="event-outcome-options">
      <legend>Com’è andata?</legend>
      <div>{(Object.keys(outcomeLabels) as ItemOutcome[]).map(outcome => <StandardButton variant="secondary" type="button" key={outcome} aria-pressed={item.outcome === outcome} onClick={() => run(() => onOutcome(outcome))}>{outcomeLabels[outcome]}</StandardButton>)}</div>
    </fieldset>}
    <div className="event-menu-actions">
      {!confirmDelete && <StandardButton variant="secondary" type="button" onClick={onEdit}>Modifica</StandardButton>}
      {!confirmDelete ? <StandardButton variant="ghost" type="button" onClick={() => setConfirmDelete(true)}>Elimina</StandardButton> : <div className="event-delete-confirmation">
        <p>Eliminare questo appuntamento?{item.recurring ? " Gli altri giorni e le ripetizioni successive restano nel calendario." : ""}</p>
        <StandardButton variant="ghost" type="button" onClick={() => setConfirmDelete(false)}>Annulla</StandardButton>
        <StandardButton variant="primary" type="button" onClick={() => run(onDelete)}>{item.kind === "flexible" ? "Conferma eliminazione" : "Sblocca ed elimina"}</StandardButton>
      </div>}
    </div>
    {error && <p role="alert" className="capacity-warning">{error}</p>}
  </CalendarDialog>;
}
