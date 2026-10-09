import { useState } from "react";
import { AppDialogs } from "../../components/layout/AppDialogs";
import type { AppDialogState } from "../../components/layout/AppDialogs";
import { StandardButton } from "../../components/ui/StandardButton";
import { addDays, isProgressActivity, today, validDate } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import type { PlannerArchive } from "../../model/outcomeArchive.js";
import { outcomeLabels } from "../../constants";
import type { ItemOutcome, Occurrence } from "../../model/calendar.js";
import { DevInspector } from "./DevInspector";
import { DevPlan } from "./DevPlan";

/** Coordina comandi di prova tramite useDB e apre gli stessi dialoghi delle schermate normali. */
export function DevWorkbench({ sourceArchive }: { sourceArchive?: PlannerArchive }) {
  const db = useDB();
  const [dialog, setDialog] = useState<AppDialogState>(null);
  const [referenceDate, setReferenceDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("Nessuna azione eseguita.");
  const [actionError, setActionError] = useState("");
  const [running, setRunning] = useState(false);
  const busy = running || db.saving;
  // Mantiene distinte anche due serie ripetute con lo stesso nome.
  const activities = [...new Map(db.state.items.filter(isProgressActivity).map(item => [item.activityId ?? item.id, item])).values()];
  const activity = activities.find(entry => entry.id === selectedId) ?? activities.at(-1);
  const habit = db.habits.find(entry => entry.id === db.state.items.find(item => item.id === activity?.id)?.habitId);
  const source = db.state.items.find(item => item.id === activity?.id);
  const planItems = db.state.items.filter(item => isProgressActivity(item) && source && (item.id === source.id || Boolean(source.activityId) && item.activityId === source.activityId));
  const planKey = planItems.map(item => `${item.id}:${item.date}:${item.recurrence?.until ?? ""}`).join("|");
  const inspectDate = (date: string) => {
    setSelectedDate(date);
    setReferenceDate(current => current < date ? date : current);
  };
  const runAction = async (label: string, action: () => Promise<void>) => {
    setActionError(""); setRunning(true);
    try { await action(); setMessage(`${label}: salvato. I risultati mostrano lo stato confermato.`); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Operazione non riuscita."); setMessage(`${label}: interrotto. I risultati mostrano gli esiti già confermati.`); }
    finally { setRunning(false); }
  };
  const applyOutcome = (item: Occurrence, outcome: ItemOutcome) => {
    inspectDate(item.date);
    void runAction(`${outcomeLabels[outcome]} · ${item.date}`, () => db.recordOutcome(item, outcome));
  };
  const applyBatch = async (items: Occurrence[], outcome: ItemOutcome) => {
    setActionError(""); setRunning(true);
    try {
      const result = await db.recordOutcomes(items, outcome);
      if (result.lastDate) inspectDate(result.lastDate);
      setMessage(`${result.saved} esiti salvati; ${result.skipped} date saltate perché già impostate o non più previste dopo la chiusura della serie.`);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Operazione interrotta."); }
    finally { setRunning(false); }
  };
  if (!db.ready) return <div className="dev-card"><p role="status">Preparazione laboratorio…</p>{db.error && <><p role="alert">{db.error}</p><StandardButton onClick={() => void db.retry()}>Riprova</StandardButton></>}</div>;
  return <div className="dev-workbench">
    <div className="dev-card">
      <div className="dev-actions">
        <StandardButton disabled={busy || db.state.items.length > 0} onClick={() => void runAction("Creazione esempio", () => db.saveHabit({ title: "Abitudine di prova", motivation: "Tre eventi valutati per concludere la serie", icon: "study", color: "teal", stepTarget: 3, startsOn: addDays(today(), -2), weekdays: [0, 1, 2, 3, 4, 5, 6], start: "10:00", durationMinutes: 20 }))}>Crea esempio · 3 step</StandardButton>
        <StandardButton disabled={busy} variant="primary" onClick={() => setDialog({ type: "habit" })}>Nuova abitudine</StandardButton>
        <StandardButton disabled={busy} onClick={() => setDialog({ type: "editor", date: selectedDate, routine: true })}>Nuova routine</StandardButton>
        {sourceArchive && <StandardButton disabled={busy} onClick={() => void runAction("Copia dei dati attuali", () => db.importBackup(structuredClone(sourceArchive), { mode: "local" }))}>Copia dati attuali nel laboratorio</StandardButton>}
        <StandardButton disabled={busy} onClick={() => void runAction("Azzeramento laboratorio", () => db.resetAll())}>Azzera laboratorio</StandardButton>
      </div>
      <p className="dev-note">Copia e azzeramento sostituiscono solo i dati di prova. Ogni comando passa da useDB → DBProvider → RepositoryDB; qui il bridge è in memoria, quindi questo laboratorio non verifica IPC o SQLite.</p>
      <p role="status">{busy ? "Salvataggio in corso…" : message}</p>
      {(actionError || db.error) && <p role="alert" className="capacity-warning">{actionError || db.error}</p>}
    </div>
    <div className="dev-controls dev-card">
      <label>Attività da compilare<select disabled={busy} value={activity?.id ?? ""} onChange={event => setSelectedId(event.target.value)}><option value="" disabled>Nessuna attività</option>{activities.map(entry => <option value={entry.id} key={entry.id}>{entry.title}</option>)}</select></label>
      <label>Giorno da esaminare<input type="date" min="1901-01-01" max="9997-12-31" value={selectedDate} disabled={busy} onChange={event => { const value = event.target.value; if (validDate(value) && value >= "1901-01-01" && value <= "9997-12-31") setSelectedDate(value); }} /></label>
      <label>Oggi simulato per i conteggi<input type="date" min="1901-01-01" max="9997-12-31" value={referenceDate} disabled={busy} onChange={event => { const value = event.target.value; if (validDate(value) && value >= "1901-01-01" && value <= "9997-12-31") setReferenceDate(value); }} /></label>
      <p className="dev-note">Il piano si compila a qualsiasi data, anche futura. Registrare un esito o cliccare una data del piano sposta il giorno da esaminare e avanza “Oggi simulato” quando necessario. Puoi anticipare manualmente “Oggi simulato” per verificare gli esiti futuri esclusi dal totale.</p>
    </div>
    <div className="dev-columns">
      <section className="dev-card"><h3>1. Esegui un’azione</h3>
        <div className="dev-actions">{habit && <><StandardButton disabled={busy} onClick={() => setDialog({ type: "habit", habitId: habit.id })}>Modifica abitudine</StandardButton>{db.getHabitCompletionDate(habit.id) && <StandardButton disabled={busy} onClick={() => setDialog({ type: "habit", habitId: habit.id, repeat: true })}>Ripeti serie</StandardButton>}</>}</div>
        {planItems.length > 0 ? <DevPlan key={planKey} items={planItems} busy={busy} onOutcome={applyOutcome} onBatch={(items, outcome) => void applyBatch(items, outcome)} onInspect={inspectDate} onEdit={item => setDialog({ type: "editor", date: item.date, occurrence: item })} /> : <p>Crea un’abitudine o una routine e scegli i giorni della settimana e la data di inizio. Qui compariranno subito tutte le date previste nel periodo, senza aprire il calendario.</p>}
      </section>
      <DevInspector activityId={activity?.id} habitId={habit?.id} selectedDate={selectedDate} referenceDate={referenceDate} />
    </div>
    <details className="dev-card"><summary>Protocollo di prova · risultati attesi</summary><ol>
      <li>Azzera il laboratorio e crea l’esempio: percorso 0/3 e nessun esito.</li>
      <li>Segna “Fatto” ieri: percorso 1/3, totale annuale 1 e panoramica di ieri 100%.</li>
      <li>Premi ancora “Fatto” sulla stessa occorrenza: il conteggio resta 1, il registro contiene due scritture.</li>
      <li>Correggi in “Non fatto”: completamenti 0 e percentuale 0% in entrambe le viste.</li>
      <li>Valuta tre eventi con “Fatto” o “Non fatto”: la serie si conclude. Correggere un esito cambia il risultato, senza riaprire la serie.</li>
      <li>Segna una data futura: Dev avanza la data simulata e aggiorna il totale. Riporta “Oggi simulato” al giorno reale: l’esito torna fra i completamenti futuri.</li>
      <li>Modifica i giorni o abbassa il traguardo: gli esiti confermati rimangono nello storico e nei totali dell’attività.</li>
    </ol></details>
    <AppDialogs dialog={dialog} onChange={setDialog} onHabitSaved={date => { if (dialog?.type === "habit" && (!dialog.habitId || dialog.repeat)) setSelectedId(""); setDialog(null); inspectDate(date); setMessage("Abitudine salvata tramite l’editor dell’app."); }} />
  </div>;
}
