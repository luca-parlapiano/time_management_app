import { useState } from "react";
import { displayDate, outcomeLabels } from "../domain/calendar";
import type { ItemOutcome } from "../model/calendar.js";
import type { CalendarEventMenuProps } from "../model/CalendarEventMenu.js";
import { CalendarDialog } from "./CalendarDialog";

export function CalendarEventMenu({ item, onClose, onEdit, onOutcome, onDelete, initialConfirmDelete = false }: CalendarEventMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(initialConfirmDelete);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    try { await action(); } catch (cause) { setError((cause as Error).message); }
  }
  return <CalendarDialog compact title={item.title} onClose={onClose}>
    <p className="editor-hint">{displayDate(item.date, { weekday: "long" })} · {item.start}–{item.end}</p>
    {!confirmDelete && <fieldset className="event-outcome-options">
      <legend>Com’è andata?</legend>
      <div>{(Object.keys(outcomeLabels) as ItemOutcome[]).map(outcome => <button type="button" key={outcome} className="secondary-button" aria-pressed={item.outcome === outcome} onClick={() => run(() => onOutcome(outcome))}>{outcomeLabels[outcome]}</button>)}</div>
    </fieldset>}
    <div className="event-menu-actions">
      {!confirmDelete && <button type="button" className="secondary-button" onClick={onEdit}>Modifica</button>}
      {!confirmDelete ? <button type="button" className="ghost-button" onClick={() => setConfirmDelete(true)}>Elimina</button> : <div className="event-delete-confirmation">
        <p>Eliminare questo appuntamento?{item.recurring ? " Gli altri giorni e le ripetizioni successive restano nel calendario." : ""}</p>
        <button type="button" className="ghost-button" onClick={() => setConfirmDelete(false)}>Annulla</button>
        <button type="button" className="primary-button" onClick={() => run(onDelete)}>{item.kind === "flexible" ? "Conferma eliminazione" : "Sblocca ed elimina"}</button>
      </div>}
    </div>
    {error && <p role="alert" className="capacity-warning">{error}</p>}
  </CalendarDialog>;
}
