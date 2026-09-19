import { useState } from "react";
import { CalendarDialog } from "./CalendarDialog";
import {
  durationMinutes, kindLabels, statusLabels, type CalendarItem, type CalendarGoal,
  type EditTarget, type ItemKind, type ItemStatus, type Occurrence,
} from "../domain/calendar";

interface Props {
  date: string;
  item?: CalendarItem;
  occurrence?: Occurrence;
  goals: CalendarGoal[];
  onClose: () => void;
  onSave: (item: CalendarItem, unlocked: boolean, target?: EditTarget) => void;
  onDelete: (target: EditTarget, unlocked: boolean) => void;
}
export function CalendarItemEditor({ date, item, occurrence, goals, onClose, onSave, onDelete }: Props) {
  const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
  const initial: CalendarItem = item && occurrence
    ? { ...item, ...occurrence, id: item.id }
    : { id: crypto.randomUUID(), title: "", date, endDate: date, start: "09:00", end: "10:00", kind: "flexible", status: "todo", notes: "", exceptions: {} };
  const [draft, setDraft] = useState(initial);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const locked = Boolean(item && item.kind !== "flexible" && !unlocked);
  const target = item && occurrence ? { sourceId: item.id, occurrenceDate: occurrence.occurrenceDate, scope } : undefined;
  const seriesEdit = Boolean(item?.recurrence && scope === "series");
  const duration = durationMinutes(draft);
  function change(patch: Partial<CalendarItem>) { setDraft(current => ({ ...current, ...patch })); setError(""); setConfirmDelete(false); }
  return <CalendarDialog title={item ? "Modifica elemento" : "Aggiungi attività"} onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault();
      try { onSave(draft, unlocked, target); } catch (cause) { setError((cause as Error).message); }
    }}>
      {item?.recurrence && <div className="form-grid">
        <label>Ambito della modifica
          <select value={scope} onChange={event => {
            const next = event.target.value as typeof scope;
            setScope(next); setDraft(next === "series" ? item : initial); setUnlocked(false); setError(""); setConfirmDelete(false);
          }}>
            <option value="occurrence">Solo questa occorrenza ({occurrence?.occurrenceDate})</option>
            <option value="series">Intera serie settimanale</option>
          </select>
        </label>
        <p>{seriesEdit ? "Le modifiche valgono per tutte le date della serie, anche passate. Le eccezioni già salvate restano invariate. La prima data e il giorno settimanale restano gli stessi." : "La modifica o l’eliminazione riguarda soltanto questa data. Le altre occorrenze restano invariate."}</p>
      </div>}
      {locked && <div className="capacity-warning">
        <p>🔒 Questo vincolo è protetto. Per modificarlo, spostarlo o eliminarlo devi sbloccare {seriesEdit ? "l’intera serie" : "questo elemento"}.</p>
        <button type="button" className="secondary-button" onClick={() => setUnlocked(true)}>Sblocca {seriesEdit ? "serie" : "per modificare"}</button>
      </div>}
      {unlocked && <p role="status">🔓 Sbloccato per questa modifica. Tornerà protetto dopo il salvataggio.</p>}
      <fieldset disabled={locked} className="editor-fields form-grid">
        <label>Titolo<input autoFocus={!locked && !item} required value={draft.title} onChange={e => change({ title: e.target.value })} /></label>
        <label>Tipo<select value={draft.kind} disabled={Boolean(item?.recurrence)} onChange={e => {
          const kind = e.target.value as ItemKind;
          change({ kind, status: kind === "flexible" ? "todo" : undefined, recurrence: undefined });
        }}>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <div className="form-row form-row-two-columns">
          <label>Data di inizio<input type="date" min="1900-01-01" max="9998-12-31" required disabled={seriesEdit} value={draft.date} onChange={e => {
            change({ date: e.target.value, endDate: draft.date === draft.endDate ? e.target.value : draft.endDate });
          }} /></label>
          <label>Ora di inizio<input type="time" required value={draft.start} onChange={e => change({ start: e.target.value })} /></label>
          <label>Data di fine<input type="date" min={draft.date} max="9998-12-31" required value={draft.endDate} onChange={e => change({ endDate: e.target.value })} /></label>
          <label>Ora di fine<input type="time" required value={draft.end} onChange={e => change({ end: e.target.value })} /></label>
        </div>
        <p className="editor-hint">Durata: {Number.isFinite(duration) && duration > 0 ? `${duration} minuti` : "controlla date e orari"}. Per un intervallo notturno indica il giorno successivo come data di fine (massimo 24 ore).</p>
        {draft.kind === "flexible" && <label>Stato<select value={draft.status} onChange={e => change({ status: e.target.value as ItemStatus })}>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>}
        {!item && draft.kind !== "flexible" && <label>Ripetizione<select value={draft.recurrence ? "weekly" : "none"} onChange={e => change({ recurrence: e.target.value === "weekly" ? {} : undefined })}>
          <option value="none">Solo questa data</option><option value="weekly">Ogni settimana nello stesso giorno</option>
        </select></label>}
        {draft.recurrence && (!item || seriesEdit) && <label>Ultima data della serie (facoltativa)
          <input type="date" min={draft.date} value={draft.recurrence.until ?? ""} onChange={e => change({ recurrence: e.target.value ? { until: e.target.value } : {} })} />
        </label>}
        <label>Obiettivo (facoltativo)<select value={draft.goalId ?? ""} onChange={e => change({ goalId: e.target.value || undefined })}>
          <option value="">Nessun obiettivo</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
        </select></label>
        <label>Note (facoltative)<textarea rows={3} value={draft.notes} onChange={e => change({ notes: e.target.value })} /></label>
      </fieldset>
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      {confirmDelete && <p role="alert">Eliminare {item?.recurrence && scope === "series" ? "l’intera serie, comprese tutte le eccezioni" : "solo questo elemento"}? L’operazione non è annullabile.</p>}
      <div className="modal-actions">
        {target && <button type="button" className="ghost-button" disabled={locked} onClick={() => {
          if (!confirmDelete) { setConfirmDelete(true); return; }
          try { onDelete(target, unlocked); } catch (cause) { setError((cause as Error).message); }
        }}>{confirmDelete ? "Conferma eliminazione" : "Elimina"}</button>}
        <button type="submit" className="primary-button" disabled={locked}>Salva {seriesEdit ? "serie" : "elemento"}</button>
      </div>
    </form>
  </CalendarDialog>;
}
