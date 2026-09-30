import { useState } from "react";
import { eventColors, eventIcons, weekdayLabels } from "../../constants";
import { CalendarConflictError, displayDate, today } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { EventIcon } from "../../icons/EventIcon";
import type { EventColor, EventIcon as EventIconName } from "../../model/calendar.js";
import { CalendarDialog } from "../../components/ui/CalendarDialog";
import { StandardButton } from "../../components/ui/StandardButton";

interface HabitEditorProps { onClose: () => void }

/** Editor essenziale del primo piano settimanale di un'abitudine. */
export function HabitEditor({ onClose }: HabitEditorProps) {
  const { saveHabit, saving } = useDB();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startsOn, setStartsOn] = useState(today());
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState("19:00");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [icon, setIcon] = useState<EventIconName>("activity");
  const [color, setColor] = useState<EventColor>("purple");
  const [error, setError] = useState("");
  const [collision, setCollision] = useState<CalendarConflictError | null>(null);
  const occupied = collision?.entries.find(entry => entry.sourceId !== collision.changedId);
  return (
    <CalendarDialog title="Nuova abitudine" onClose={onClose}>
      <form className="habit-editor" onChange={() => { setError(""); setCollision(null); }} onSubmit={async event => {
        event.preventDefault();
        try {
          await saveHabit({ title, notes, startsOn, weekdays, start, durationMinutes, icon, color });
          onClose();
        } catch (cause) {
          if (cause instanceof CalendarConflictError) {
            setCollision(cause);
            setError("");
          } else {
            setCollision(null);
            setError(cause instanceof Error ? cause.message : "Impossibile creare l'abitudine.");
          }
        }
      }}>
        <p className="editor-hint">Questa versione inserisce appuntamenti ricorrenti con orario nel Calendario. Le occasioni da collocare sono ancora da implementare.</p>
        <label>Abitudine<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Es. Leggere" /></label>
        <label>Perché vuoi praticarla?<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Una nota facoltativa" /></label>
        <fieldset><legend>Giorni</legend><div className="habit-weekdays">
          {weekdayLabels.map((day, index) => <button key={day.key} type="button" aria-pressed={weekdays.includes(index)} onClick={() => { setCollision(null); setWeekdays(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index].sort()); }}>{day.label}</button>)}
        </div></fieldset>
        <div className="form-row">
          <label>Dal giorno<input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} /></label>
          <label>Alle<input type="time" value={start} onChange={event => setStart(event.target.value)} /></label>
          <label>Durata (minuti)<input type="number" min="5" max="1440" step="5" value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value))} /></label>
        </div>
        <fieldset><legend>Icona</legend><div className="compact-icon-options icon-options">
          {(Object.keys(eventIcons) as EventIconName[]).map(value => <button key={value} type="button" className="icon-option" aria-label={eventIcons[value]} aria-pressed={icon === value} onClick={() => setIcon(value)}><EventIcon icon={value} /></button>)}
        </div></fieldset>
        <fieldset><legend>Colore</legend><div className="habit-colors">
          {(Object.keys(eventColors) as EventColor[]).map(value => <button key={value} type="button" aria-label={eventColors[value].label} aria-pressed={color === value} style={{ background: eventColors[value].value }} onClick={() => setColor(value)} />)}
        </div></fieldset>
        {occupied && <div role="alert" className="capacity-warning"><p>Il {displayDate(occupied.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, dalle {occupied.start} alle {occupied.end}, c’è già <strong>{occupied.title}</strong> nel Calendario.</p><p>Nessun evento è stato sostituito. Scegli un altro orario o cambia i giorni del piano, poi riprova.</p></div>}
        {error && <p role="alert" className="capacity-warning">{error}</p>}
        <div className="modal-actions"><StandardButton type="button" variant="secondary" onClick={onClose}>Annulla</StandardButton><StandardButton type="submit" variant="primary" disabled={saving}>Crea abitudine</StandardButton></div>
      </form>
    </CalendarDialog>
  );
}
