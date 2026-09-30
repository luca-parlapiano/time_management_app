import { useState } from "react";
import { useDB } from "../../hooks/useDB";
import type { Occurrence } from "../../model/calendar.js";
import { CalendarEventMenu } from "../../screens/calendar/CalendarEventMenu";
import { CalendarItemEditor } from "../../screens/calendar/CalendarItemEditor";
import { CalendarPreferences } from "../../screens/settings/CalendarPreferences";
import { HabitEditor } from "../../screens/habits/HabitEditor";
import { CalendarDialog } from "../ui/CalendarDialog";
import { StandardButton } from "../ui/StandardButton";

export type AppDialogState =
  | { type: "event"; item: Occurrence; confirmDelete: boolean }
  | { type: "editor"; date: string; occurrence?: Occurrence }
  | { type: "preferences" }
  | { type: "habit" }
  | { type: "clear" }
  | { type: "reset-all" }
  | null;

interface AppDialogsProps {
  dialog: AppDialogState;
  onChange: (dialog: AppDialogState) => void;
}

/** Coordina i dialoghi aperti dalle diverse aree dell’app. */
export function AppDialogs({ dialog, onChange }: AppDialogsProps) {
  const { state, recordOutcome, saveItem, deleteItem, savePreferences } = useDB();
  if (!dialog) return null;
  if (dialog.type === "event") {
    const { item } = dialog;
    return (
      <CalendarEventMenu
        initialConfirmDelete={dialog.confirmDelete}
        item={item}
        onClose={() => onChange(null)}
        onEdit={() => onChange({ type: "editor", date: item.date, occurrence: item })}
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
  if (dialog.type === "preferences") {
    return <CalendarPreferences state={state} onSave={savePreferences} onClose={() => onChange(null)} />;
  }
  if (dialog.type === "habit") return <HabitEditor onClose={() => onChange(null)} />;
  if (dialog.type === "clear") return <ClearCalendarDialog onClose={() => onChange(null)} />;
  return <ResetAllDialog onClose={() => onChange(null)} />;
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
      <p>Restano lo storico degli esiti, il profilo, gli obiettivi e la palette. Le abitudini collegate vengono eliminate insieme al loro piano; questa operazione non è annullabile. Puoi prima esportare il calendario.</p>
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
