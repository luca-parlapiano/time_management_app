import { useState } from "react";
import { eventColors, eventIcons, weekdayLabels } from "../../constants";
import { CalendarConflictError, displayDate, today } from "../../domain/calendar";
import { firstHabitOccurrenceDate, habitDraft } from "../../domain/habits";
import { useDB } from "../../hooks/useDB";
import { EventIcon } from "../../icons/EventIcon";
import type { EventColor, EventIcon as EventIconName } from "../../model/calendar.js";
import type { Habit, HabitStepTarget } from "../../model/habit.js";
import { CalendarDialog } from "../../components/ui/CalendarDialog";
import { StandardButton } from "../../components/ui/StandardButton";

interface HabitEditorProps { habit?: Habit; onClose: () => void; onSaved: (firstOccurrenceDate: string) => void }

const stepTargets = Array.from({ length: 12 }, (_, index) => index + 1) as HabitStepTarget[];

/** Crea o modifica un'abitudine da imparare e la sua pianificazione settimanale. */
export function HabitEditor({ habit, onClose, onSaved }: HabitEditorProps) {
  const { state, saveHabit, updateHabit, deleteHabit, saving } = useDB();
  const initial = habit ? habitDraft(state, habit) : {
    title: "", motivation: "", startsOn: today(), weekdays: [] as number[], start: "19:00", durationMinutes: 20,
    icon: "activity" as EventIconName, color: "purple" as EventColor, stepTarget: 5 as HabitStepTarget,
  };
  const [title, setTitle] = useState(initial.title);
  const [motivation, setMotivation] = useState(initial.motivation);
  const [startsOn, setStartsOn] = useState(initial.startsOn);
  const [weekdays, setWeekdays] = useState<number[]>(initial.weekdays);
  const [start, setStart] = useState(initial.start);
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes);
  const [icon, setIcon] = useState<EventIconName>(initial.icon);
  const [color, setColor] = useState<EventColor>(initial.color);
  const [stepTarget, setStepTarget] = useState<HabitStepTarget>(initial.stepTarget);
  const [error, setError] = useState("");
  const [collision, setCollision] = useState<CalendarConflictError | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const occupied = collision?.entries.find(entry => entry.sourceId !== collision.changedId);
  return (
    <CalendarDialog title={habit ? "Modifica abitudine" : "Nuova abitudine"} onClose={onClose}>
      <form className="habit-editor" onChange={() => { setError(""); setCollision(null); setConfirmDelete(false); }} onSubmit={async event => {
        event.preventDefault();
        try {
          const draft = { title, motivation, startsOn, weekdays, start, durationMinutes, icon, color, stepTarget };
          if (habit) await updateHabit(habit.id, draft);
          else await saveHabit(draft);
          onSaved(firstHabitOccurrenceDate(draft));
        } catch (cause) {
          if (cause instanceof CalendarConflictError) {
            setCollision(cause);
            setError("");
          } else {
            setCollision(null);
            setError(cause instanceof Error ? cause.message : "Impossibile salvare l’abitudine.");
          }
        }
      }}>
        <label>Quale abitudine vuoi acquisire?<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Es. Leggere 20 minuti" /></label>
        <label>Perché vuoi acquisirla?<textarea value={motivation} onChange={event => setMotivation(event.target.value)} placeholder="Una motivazione facoltativa" /></label>
        <fieldset><legend>Piccolo traguardo</legend><p className="editor-hint">Scegli da 1 a 12 completamenti. Ogni esito positivo vale uno step; le occasioni saltate non cancellano quelli raggiunti.</p><div className="habit-step-options">
          {stepTargets.map(value => <button key={value} type="button" aria-pressed={stepTarget === value} onClick={() => setStepTarget(value)}>{value}</button>)}
        </div></fieldset>
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
        {occupied && <div role="alert" className="capacity-warning"><p>Il {displayDate(occupied.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, dalle {occupied.start} alle {occupied.end}, c’è già <strong>{occupied.title}</strong> nel Calendario.</p><p>Nessun evento è stato sostituito. Scegli un altro orario o cambia i giorni, poi riprova.</p></div>}
        {error && <p role="alert" className="capacity-warning">{error}</p>}
        <div className="habit-editor-footer">
          {habit && confirmDelete && <div className="habit-delete-confirmation" role="alert"><strong>Eliminare “{habit.title}”?</strong><p>Verranno rimossi l’abitudine e tutti i suoi appuntamenti dal calendario. Lo storico degli esiti resterà nell’archivio, ma non comparirà più nelle statistiche. L’operazione non è annullabile.</p></div>}
          {habit && confirmDelete ? <div className="modal-actions habit-confirm-delete-actions">
            <StandardButton type="button" variant="secondary" disabled={saving} onClick={() => setConfirmDelete(false)}>Annulla eliminazione</StandardButton>
            <StandardButton type="button" variant="primary" className="habit-delete-button" disabled={saving} onClick={async () => {
              try {
                await deleteHabit(habit.id);
                onClose();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Impossibile eliminare l’abitudine.");
              }
            }}>Elimina definitivamente</StandardButton>
          </div> : <div className="modal-actions habit-editor-actions">
            {habit && <StandardButton type="button" variant="ghost" className="habit-delete-button" disabled={saving} onClick={() => setConfirmDelete(true)}>Elimina abitudine</StandardButton>}
            <div className="habit-save-actions"><StandardButton type="button" variant="secondary" disabled={saving} onClick={onClose}>Annulla</StandardButton><StandardButton type="submit" variant="primary" disabled={saving}>{habit ? "Salva e mostra nel calendario" : "Crea e mostra nel calendario"}</StandardButton></div>
          </div>}
        </div>
      </form>
    </CalendarDialog>
  );
}
