import { isPositiveNumber } from "../../utils/numbers.js";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { activityCovers } from "../../activityCovers";
import { addDays, displayDate, durationMinutes, eventAppearance, eventColors, eventIcons, kindLabels, validDate, validateData, weekStart } from "../../domain/calendar";
import type { CalendarItem, EditTarget, EventColor, EventIcon as IconName, ItemKind, Occurrence } from "../../model/calendar.js";
import { StandardButton } from "../../components/ui/StandardButton";
import { CalendarDialog } from "../../components/ui/CalendarDialog";
import { EventIcon } from "../../icons/EventIcon";

interface CalendarItemEditorProps {
  date: string;
  item?: CalendarItem;
  occurrence?: Occurrence;
  items: CalendarItem[];
  onClose: () => void;
  onSave: (item: CalendarItem, unlocked: boolean, target?: EditTarget, weekdays?: number[]) => Promise<void>;
  onDelete: (target: EditTarget, unlocked: boolean) => Promise<void>;
}

export function CalendarItemEditor({ date, item, occurrence, items, onClose, onSave, onDelete }: CalendarItemEditorProps) {
  const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const [weekdays, setWeekdays] = useState<number[]>([Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i)).indexOf(date)]);
  const [linkedSourceIds, setLinkedSourceIds] = useState<string[]>([]);
  const linked = items.filter(other => item?.activityId && other.activityId === item.activityId);
  const candidates = items.filter(other => item && other.id !== item.id && other.recurrence && (!item.activityId || other.activityId !== item.activityId));
  const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
  const initial: CalendarItem = item && occurrence
    ? { ...item, ...occurrence, id: item.id }
    : { id: crypto.randomUUID(), title: "", date, endDate: date, start: "09:00", end: "10:00", kind: "flexible", notes: "", exceptions: {} };
  const [draft, setDraft] = useState(initial);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: "nearest" }); }
  }, [error]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [appearanceChanged, setAppearanceChanged] = useState(false);
  const locked = Boolean(item && item.kind !== "flexible" && !unlocked);
  const target = item && occurrence ? { sourceId: item.id, occurrenceDate: occurrence.occurrenceDate, scope, applyAppearanceToSeries: appearanceChanged, linkedSourceIds } : undefined;
  const seriesEdit = Boolean(item?.recurrence && scope === "series");
  const duration = durationMinutes(draft);
  const appearance = eventAppearance(draft);
  const shortDate = (value: string) => validDate(value) ? displayDate(value, { day: "numeric", month: "short", year: "numeric" }) : "Scegli una data";
  const repeatDays = !item?.recurrence ? weekdays.map(day => dayLabels[day]).join(", ") : (linked.length ? linked : [item]).map(entry => displayDate(entry.date, { weekday: "short", day: undefined, month: undefined })).join(", ");
  function change(patch: Partial<CalendarItem>) { setDraft(current => ({ ...current, ...patch })); setError(""); setConfirmDelete(false); }
  function changeAppearance(patch: Partial<Pick<CalendarItem, "icon" | "color" | "coverImage">>) { setAppearanceChanged(true); change(patch); }
  return <CalendarDialog title={item ? "Modifica elemento" : "Aggiungi attività"} onClose={onClose}>
    <form noValidate onSubmit={async event => {
      event.preventDefault();
      try {
        validateData(draft);
        await onSave(draft, unlocked, target, !item?.recurrence && draft.recurrence ? weekdays : undefined);
      } catch (cause) {
        setError((cause as Error).message);
        setScheduleOpen(true);
      }
    }}>
      {item?.recurrence && <div className="form-grid">
        <label>Ambito della modifica
          <select value={scope} onChange={event => {
            const next = event.target.value as typeof scope;
            setScope(next); setDraft(next === "series" ? item : initial); setAppearanceChanged(false); setUnlocked(false); setError(""); setConfirmDelete(false);
          }}>
            <option value="occurrence">Solo questa occorrenza ({occurrence?.occurrenceDate})</option>
            <option value="series">Intera serie settimanale</option>
          </select>
        </label>
        <p>{seriesEdit ? "Le modifiche valgono per tutte le date della serie, anche passate. Le eccezioni conservano date, orari e dettagli personalizzati. La prima data e il giorno settimanale restano gli stessi." : "Date, orari ed eliminazione riguardano soltanto questo appuntamento. Titolo, icona, colore e descrizione sono condivisi dagli appuntamenti collegati."}</p>
      </div>}
      {locked && <div className="capacity-warning">
        <p>🔒 Questo vincolo è protetto. Per modificarlo, spostarlo o eliminarlo devi sbloccare {seriesEdit ? "l’intera serie" : "questo elemento"}.</p>
        <StandardButton variant="secondary" type="button" onClick={() => setUnlocked(true)}>Sblocca {seriesEdit ? "serie" : "per modificare"}</StandardButton>
      </div>}
      {unlocked && <p role="status">🔓 Sbloccato per questa modifica. Tornerà protetto dopo il salvataggio.</p>}
      <fieldset disabled={locked} className="editor-fields form-grid">
        {item?.recurrence && <div className="form-grid">
          {linked.length > 0 && <p className="editor-hint">Un’unica attività · {linked.length} appuntamenti settimanali: {linked.map(entry => displayDate(entry.date, { weekday: "long", day: undefined, month: undefined })).join(", ")}. Le modifiche ai dettagli si applicano a tutti.</p>}
          {candidates.length > 0 && <details>
            <summary>Collega appuntamenti già creati</summary>
            <p className="editor-hint">Seleziona le altre card della stessa attività. Salvando, useranno titolo, icona, colore e descrizione di questa card. Ogni appuntamento conserva orario e check.</p>
            <div className="activity-link-options">{candidates.map(other => <label key={other.id} className="activity-check">
              <input type="checkbox" checked={linkedSourceIds.includes(other.id)} onChange={e => setLinkedSourceIds(current => e.target.checked ? [...current, other.id] : current.filter(id => id !== other.id))} />
              <span>{other.title} · {displayDate(other.date, { weekday: "long" })} · {other.start}–{other.end}{other.activityId ? " (con tutti gli appuntamenti collegati)" : ""}</span>
            </label>)}</div>
          </details>}
        </div>}
        <label>Titolo<input autoFocus={!locked && !item} required value={draft.title} onChange={e => change({ title: e.target.value })} /></label>
        <div className="event-appearance" style={{ "--event-color": eventColors[appearance.color].value } as CSSProperties}>
          {item?.recurrence && <p className="editor-hint">Icona, immagine e colore valgono per tutta la serie e per gli appuntamenti collegati, anche nei giorni diversi.</p>}
          <div className="event-cover-preview" style={draft.coverImage !== false ? { "--cover-image": `url("${activityCovers[appearance.icon].src}")` } as CSSProperties : undefined}>
            <span className="event-icon"><EventIcon icon={appearance.icon} /></span><strong>{draft.title.trim() || "La tua attività"}</strong>
          </div>
          <fieldset className="appearance-options">
            <legend>Icona</legend>
            <div className="icon-options compact-icon-options">{(Object.keys(eventIcons) as IconName[]).map(icon => <button key={icon} type="button" className="icon-option" aria-label={eventIcons[icon]} title={eventIcons[icon]} aria-pressed={appearance.icon === icon} onClick={() => changeAppearance({ icon })}>
              <EventIcon icon={icon} />
            </button>)}</div>
          </fieldset>
          <label className="activity-check"><input type="checkbox" checked={draft.coverImage !== false} onChange={e => changeAppearance({ coverImage: e.target.checked })} />Immagine predefinita per questa icona</label>
          {draft.coverImage !== false && <p className="editor-hint">{activityCovers[appearance.icon].label} · {activityCovers[appearance.icon].source ? `Foto di ${activityCovers[appearance.icon].author} / Unsplash` : activityCovers[appearance.icon].author}</p>}
          <fieldset className="appearance-options">
            <legend>Colore</legend>
            <div className="color-options">{(Object.keys(eventColors) as EventColor[]).map(color => <button key={color} type="button" className="color-option" aria-label={eventColors[color].label} title={eventColors[color].label} aria-pressed={appearance.color === color} style={{ "--swatch": eventColors[color].value } as CSSProperties} onClick={() => changeAppearance({ color })}>
              <span aria-hidden="true">{appearance.color === color ? "✓" : ""}</span>
            </button>)}</div>
          </fieldset>
        </div>
        <fieldset className="appearance-options" disabled={Boolean(item?.recurrence)}>
          <legend>Tipo</legend>
          <div className="item-kind-options">
            {(Object.keys(kindLabels) as ItemKind[]).map(kind => <label className="item-kind-option" key={kind} title={kindLabels[kind]}>
              <input type="radio" name="item-kind" aria-label={kindLabels[kind]} value={kind} checked={draft.kind === kind} onChange={() => {
                change({ kind });
              }} />
              <span>{{ fixed: "Fisso", protected: "Protetto", flexible: "Flessibile" }[kind]}</span>
            </label>)}
          </div>
        </fieldset>
        <div className="schedule-control">
          <button type="button" className="schedule-summary" aria-expanded={scheduleOpen} aria-controls="schedule-picker" onClick={() => setScheduleOpen(open => !open)}>
            <span><strong>{shortDate(draft.date)}{draft.endDate !== draft.date ? ` → ${shortDate(draft.endDate)}` : ""}</strong>
              <span>{draft.start}–{draft.end}{draft.endDate !== draft.date ? " · termina il giorno indicato" : ""}</span>
              <small>{draft.recurrence ? `↻ Ogni settimana · ${repeatDays || "scegli i giorni"}${draft.recurrence.until ? ` · fino al ${shortDate(draft.recurrence.until)}` : ""}` : "Una sola volta"}</small>
            </span><span className="schedule-edit-label">{scheduleOpen ? "Chiudi" : "Modifica"}</span>
          </button>
          {scheduleOpen && <div id="schedule-picker" className="schedule-picker form-grid">
            <div className="form-row form-row-two-columns">
              {seriesEdit ? <label>Inizio · {shortDate(draft.date)}<input type="time" required value={draft.start} onChange={e => change({ start: e.target.value })} /></label> :
                <label>Inizio<input type="datetime-local" min="1900-01-01T00:00" max="9998-12-31T23:59" required value={`${draft.date}T${draft.start}`} onChange={e => {
                  const [date, start] = e.target.value.split("T");
                  change({ date: date ?? "", start: start ?? "", endDate: draft.date === draft.endDate ? date ?? "" : draft.endDate });
                }} /></label>}
              <label>Fine<input type="datetime-local" min={`${draft.date}T${draft.start}`} max="9998-12-31T23:59" required value={`${draft.endDate}T${draft.end}`} onChange={e => {
                const [endDate, end] = e.target.value.split("T");
                change({ endDate: endDate ?? "", end: end ?? "" });
              }} /></label>
            </div>
            <p className="editor-hint">{isPositiveNumber(duration) ? `${duration} minuti` : "Controlla date e orari"} · Durata massima 24 ore.</p>
        {!item?.recurrence && <label>Ripetizione<select value={draft.recurrence ? "weekly" : "none"} onChange={e => change({ recurrence: e.target.value === "weekly" ? {} : undefined })}>
          <option value="none">Solo questa data</option><option value="weekly">Ogni settimana nei giorni scelti</option>
        </select></label>}
        {!item?.recurrence && draft.recurrence && <fieldset className="appearance-options"><legend>Giorni della settimana</legend>
          <div className="weekday-options">{dayLabels.map((label, day) => <button type="button" className="icon-option" key={day} aria-pressed={weekdays.includes(day)} onClick={() => setWeekdays(current => current.includes(day) ? current.filter(value => value !== day) : [...current, day].sort())}>{label}</button>)}</div>
          <p className="editor-hint">La card verrà aggiunta ai giorni scelti, a partire dalla data di inizio. Gli appuntamenti già presenti con lo stesso nome, tipo e orario saranno riutilizzati.</p>
        </fieldset>}
        {draft.recurrence && (!item?.recurrence || seriesEdit) && <label>Ultima data della serie
          <input type="date" min={draft.date} value={draft.recurrence.until ?? ""} onChange={e => change({ recurrence: e.target.value ? { until: e.target.value } : {} })} />
        </label>}
            <StandardButton variant="secondary" type="button" onClick={() => {
              try {
                validateData({ ...draft, title: draft.title.trim() || "Attività" });
                if (draft.recurrence && !item?.recurrence && !weekdays.length) throw new Error("Scegli almeno un giorno della settimana.");
                if (draft.recurrence?.until && (!validDate(draft.recurrence.until) || draft.recurrence.until < draft.date)) throw new Error("Controlla la fine della ripetizione.");
                setError(""); setScheduleOpen(false);
              } catch (cause) { setError((cause as Error).message); }
            }}>Conferma date e ripetizione</StandardButton>
          </div>}
        </div>
        <label>Descrizione<textarea rows={3} value={draft.notes} onChange={e => change({ notes: e.target.value })} /></label>
      </fieldset>
      <div className="editor-save-footer">
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="capacity-warning editor-save-error">{error}</p>}
      {confirmDelete && <p role="alert">Eliminare {item?.recurrence && scope === "series" ? "l’intera serie, comprese tutte le eccezioni" : "solo questo elemento"}? L’operazione non è annullabile.</p>}
      <div className="modal-actions">
        {target && <StandardButton variant="ghost" type="button" disabled={locked} onClick={async () => {
          if (!confirmDelete) { setConfirmDelete(true); return; }
          try { await onDelete(target, unlocked); } catch (cause) { setError((cause as Error).message); }
        }}>{confirmDelete ? "Conferma eliminazione" : "Elimina"}</StandardButton>}
        <StandardButton variant="primary" type="submit" disabled={locked}>Salva {seriesEdit ? "serie" : "elemento"}</StandardButton>
      </div>
      </div>
    </form>
  </CalendarDialog>;
}
