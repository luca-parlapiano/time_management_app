import { WeeklyTimeHabitEditor } from "../../screens/habits/WeeklyTimeHabitEditor";
import { TimeSeriesConclusion } from "../../screens/habits/TimeSeriesConclusion";
import { TimeSessionEditor } from "../../screens/habits/TimeSessionEditor";
import type { TimeSession } from "../../model/weeklyTime";
import { useState } from "react";
import { useDB } from "../../hooks/useDB";
import type { ItemKind, Occurrence } from "../../model/calendar.js";
import { CalendarEventMenu } from "../../screens/calendar/CalendarEventMenu";
import { CalendarItemEditor } from "../../screens/calendar/CalendarItemEditor";
import { CalendarPreferences } from "../../screens/settings/CalendarPreferences";
import { HabitEditor } from "../../screens/habits/HabitEditor";
import { CalendarDialog } from "../ui/CalendarDialog";
import { StandardButton } from "../ui/StandardButton";
import { today } from "../../domain/calendar";
import { AppIcon } from "../../icons/AppIcon";

export type AppDialogState =
  | { type: "event"; item: Occurrence; confirmDelete: boolean }
  | { type: "editor"; date: string; occurrence?: Occurrence; routine?: boolean; initialKind?: ItemKind; weeklyHabitId?: string }
  | { type: "weekly-habit"; habitId?: string }
  | { type: "time-series"; habitId: string; seriesId: string }
  | { type: "time-session"; habitId?: string; session?: TimeSession; occurrence?: Occurrence }
  | { type: "create" }
  | { type: "preferences" }
  | { type: "habit"; habitId?: string; repeat?: boolean }
  | { type: "clear" }
  | { type: "reset-all" }
  | null;

interface AppDialogsProps {
  dialog: AppDialogState;
  onChange: (dialog: AppDialogState) => void;
  onHabitSaved: (firstOccurrenceDate: string) => void;
  onWeeklyHabitSaved: (id: string) => void;
}

/** Coordina i dialoghi aperti dalle diverse aree dell’app. */
export function AppDialogs({ dialog, onChange, onHabitSaved, onWeeklyHabitSaved }: AppDialogsProps) {
  const { state, habits, weeklyTimeHabits, recordOutcome, saveItem, deleteItem, savePreferences, getTimeSeriesResults } = useDB();
  if (!dialog) return null;
  if (dialog.type === "time-series") {
    const result = getTimeSeriesResults().find(entry => entry.habit.id === dialog.habitId && entry.series.id === dialog.seriesId);
    return result ? <TimeSeriesConclusion result={result} onClose={() => onChange(null)} /> : null;
  }
  if (dialog.type === "weekly-habit") return <WeeklyTimeHabitEditor habit={weeklyTimeHabits.find(habit => habit.id === dialog.habitId)} onClose={() => onChange(null)} onSaved={onWeeklyHabitSaved} />;
  if (dialog.type === "time-session") return <TimeSessionEditor habitId={dialog.habitId} session={dialog.session} occurrence={dialog.occurrence} onClose={() => onChange(null)} />;
  if (dialog.type === "event") {
    const { item } = dialog;
    return (
      <CalendarEventMenu
        initialConfirmDelete={dialog.confirmDelete}
        item={item}
        onClose={() => onChange(null)}
        onRecordTime={item.weeklyHabitId ? () => onChange({ type: "time-session", occurrence: item }) : undefined}
        onEdit={() => onChange(item.habitId ? { type: "habit", habitId: item.habitId } : { type: "editor", date: item.date, occurrence: item })}
        onOutcome={async (outcome) => {
          await recordOutcome(item, outcome);
          onChange(null);
        }}
        onDelete={async () => {
          await deleteItem({ sourceId: item.sourceId, occurrenceDate: item.occurrenceDate, scope: "occurrence" }, true);
          onChange(null);
        }}
      />
    );
  }
  if (dialog.type === "editor") {
    return (
      <CalendarItemEditor
        items={state.items}
        date={dialog.date}
        occurrence={dialog.occurrence}
        routine={dialog.routine}
        weeklyHabit={weeklyTimeHabits.find(habit => habit.id === dialog.weeklyHabitId)}
        initialKind={dialog.initialKind}
        item={state.items.find((item) => item.id === dialog.occurrence?.sourceId)}
        onClose={() => onChange(null)}
        onSave={async (item, unlocked, target, weekdays) => {
          await saveItem(item, unlocked, target, weekdays);
          onChange(null);
        }}
        onDelete={async (target, unlocked) => {
          await deleteItem(target, unlocked);
          onChange(null);
        }}
      />
    );
  }
  if (dialog.type === "create") return <CreationChoiceDialog
    onClose={() => onChange(null)}
    onHabit={() => onChange({ type: "habit" })}
    onWeekly={() => onChange({ type: "weekly-habit" })}
    onRoutine={() => onChange({ type: "editor", date: today(), routine: true })}
  />;
  if (dialog.type === "preferences") {
    return <CalendarPreferences state={state} onSave={savePreferences} onClose={() => onChange(null)} />;
  }
  if (dialog.type === "habit") return <HabitEditor repeat={dialog.repeat} habit={habits.find(habit => habit.id === dialog.habitId)} onClose={() => onChange(null)} onSaved={onHabitSaved} />;
  if (dialog.type === "clear") return <ClearCalendarDialog onClose={() => onChange(null)} />;
  return <ResetAllDialog onClose={() => onChange(null)} />;
}

/** Presenta i metodi disponibili e apre l’editor scelto, senza creare dati alla selezione. */
function CreationChoiceDialog({ onClose, onHabit, onRoutine, onWeekly }: { onClose: () => void; onHabit: () => void; onRoutine: () => void; onWeekly: () => void }) {
  return <CalendarDialog title="Come vuoi imparare?" className="creation-dialog creation-dialog-three" onClose={onClose}>
    <p className="creation-intro">Ogni abitudine inizia da un piccolo gesto. Scegli il modo che fa per te.</p>
    <div className="creation-choice">
      <button className="creation-method creation-method-steps" type="button" onClick={onHabit} aria-labelledby="creation-steps-title" aria-describedby="creation-steps-description">
        <span className="creation-method-art" aria-hidden="true"><span className="creation-method-icon"><AppIcon name="steps" size={36} /></span><span className="creation-step-trail"><i /><i /><i /></span></span>
        <span className="creation-method-label">Abitudine a step</span>
        <strong id="creation-steps-title">Un passo alla volta</strong>
        <span className="creation-method-description" id="creation-steps-description">Parti da un piccolo traguardo: da 1 a 12 eventi per allenare una nuova abitudine.</span>
        <span className="creation-method-action" aria-hidden="true">Scegli gli step <AppIcon name="arrow-right" size={18} /></span>
      </button>
      <button className="creation-method creation-method-hours" type="button" onClick={onWeekly} aria-labelledby="creation-hours-title" aria-describedby="creation-hours-description">
        <span className="creation-method-art" aria-hidden="true"><span className="creation-method-icon"><AppIcon name="today" size={36} /></span></span>
        <span className="creation-method-label">Obiettivo di ore</span>
        <strong id="creation-hours-title">Con un obiettivo di ore</strong>
        <span className="creation-method-description" id="creation-hours-description">Scegli le ore da raggiungere in una settimana o in un mese e registra i tuoi progressi.</span>
        <span className="creation-method-action" aria-hidden="true">Scegli le ore <AppIcon name="arrow-right" size={18} /></span>
      </button>
      <button className="creation-method creation-method-routine" type="button" onClick={onRoutine} aria-labelledby="creation-routine-title" aria-describedby="creation-routine-description">
        <span className="creation-method-art" aria-hidden="true"><span className="creation-method-icon"><AppIcon name="repeat" size={36} /></span><span className="creation-routine-orbit" /></span>
        <span className="creation-method-label">Routine</span>
        <strong id="creation-routine-title">Con un ritmo costante</strong>
        <span className="creation-method-description" id="creation-routine-description">Fai spazio a un’attività che si ripete nei tuoi giorni, senza un traguardo di step.</span>
        <span className="creation-method-action" aria-hidden="true">Crea una routine <AppIcon name="arrow-right" size={18} /></span>
      </button>
    </div>
    <div className="modal-actions"><StandardButton type="button" variant="secondary" onClick={onClose}>Annulla</StandardButton></div>
  </CalendarDialog>;
}

/** Conferma separatamente la cancellazione completa e lo sblocco dei vincoli. */
function ClearCalendarDialog({ onClose }: { onClose: () => void }) {
  const { state, saving, clearCalendar } = useDB();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const hasConstraints = state.items.some((item) => item.kind !== "flexible");
  return (
    <CalendarDialog title="Svuota calendario" onClose={onClose}>
      <p>Verranno eliminati <strong>tutti gli elementi di tutte le settimane</strong>, inclusi impegni fissi, tempo protetto, serie ricorrenti, eccezioni, note e stati di completamento o salto.</p>
      <p>Restano le abitudini a ore con il loro diario. Restano nell’archivio lo storico degli esiti, il profilo, gli obiettivi e la palette; senza le attività correnti, gli esiti non compariranno più nelle statistiche. Le abitudini vengono eliminate insieme ai loro appuntamenti; questa operazione non è annullabile. Puoi prima esportare il calendario.</p>
      {hasConstraints && (
        <label className="clear-unlock">
          <input type="checkbox" checked={unlocked} onChange={(event) => setUnlocked(event.target.checked)} />
          Sblocco esplicitamente tutti i vincoli per eliminarli.
        </label>
      )}
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions">
        <StandardButton variant="secondary" onClick={onClose}>Annulla</StandardButton>
        <StandardButton
          variant="primary"
          disabled={saving || (hasConstraints && !unlocked)}
          onClick={async () => {
            try {
              await clearCalendar();
              onClose();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Impossibile svuotare il calendario.");
            }
          }}
        >
          Conferma: svuota tutte le settimane
        </StandardButton>
      </div>
    </CalendarDialog>
  );
}

/** Conferma esplicita per la cancellazione atomica di archivio, storico e preferenze. */
function ResetAllDialog({ onClose }: { onClose: () => void }) {
  const { saving, resetAll } = useDB();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  return <CalendarDialog title="Ripristina tutto" onClose={onClose}>
    <p>Questa operazione elimina <strong>tutti i dati dell’app su questo dispositivo</strong>: calendario, abitudini, profilo, obiettivi, storico degli esiti e copia precedente dell’importazione. La palette torna a quella iniziale.</p>
    <p>Non è annullabile. Esporta un backup dalle Impostazioni prima di continuare, se vuoi conservare i dati. I file già esportati non verranno eliminati.</p>
    <label>Scrivi RESET per confermare<input autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
    {error && <p role="alert" className="capacity-warning">{error}</p>}
    <div className="modal-actions">
      <StandardButton variant="secondary" type="button" onClick={onClose}>Annulla</StandardButton>
      <StandardButton variant="primary" type="button" disabled={saving || confirmation !== "RESET"} onClick={async () => {
        try { await resetAll(); onClose(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Impossibile ripristinare l’app."); }
      }}>Conferma: elimina tutti i dati</StandardButton>
    </div>
  </CalendarDialog>;
}
