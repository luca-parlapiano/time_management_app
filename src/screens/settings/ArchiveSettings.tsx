import { useRef, useState } from "react";
import { latestOutcomes } from "../../domain/outcomeArchive";
import { useDB } from "../../hooks/useDB";
import { useLoading } from "../../hooks/useLoading";
import type { PlannerArchive } from "../../model/outcomeArchive.js";
import { StandardButton } from "../../components/ui/StandardButton";
import { CalendarDialog } from "../../components/ui/CalendarDialog";

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ArchiveSettings() {
  const { previous, saving, ready, importBackup: onImport, prepareImport, exportBackup } = useDB();
  const { isLoading } = useLoading();
  const disabled = !ready || saving || isLoading("backup");
  const input = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<PlannerArchive | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function exportFile(previous = false) {
    setError("");
    try { download(await exportBackup(previous), previous ? "backup-prima-importazione.json" : "time-planner-backup.json"); }
    catch (cause) { setError((cause as Error).message); }
  }
  return <div className="summary-card">
    <h3>Database locale e backup</h3>
    <p>Calendario, profilo, obiettivi e storico degli esiti sono salvati su questo dispositivo. Esporta un backup per conservarli o trasferirli.</p>
    <div className="hero-actions">
      <StandardButton variant="primary" type="button" disabled={disabled || busy} onClick={() => void exportFile()}>Esporta</StandardButton>
      <StandardButton variant="secondary" type="button" disabled={disabled || busy} onClick={() => input.current?.click()}>Importa</StandardButton>
      {previous && <StandardButton variant="ghost" type="button" disabled={disabled || busy} onClick={() => void exportFile(true)}>Esporta copia precedente</StandardButton>}
    </div>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      setError(""); setMessage(""); setBusy(true);
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error("Il backup supera il limite di 20 MB.");
        setCandidate(await prepareImport(await file.text()));
      } catch (cause) { setError(cause instanceof SyntaxError ? "Il file non contiene un JSON valido." : (cause as Error).message); }
      finally { setBusy(false); }
    }} />
    {error && <p className="capacity-warning" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {candidate && <CalendarDialog title="Importa backup" onClose={() => { if (!busy) setCandidate(null); }}>
      <p>Il file contiene {candidate.calendar.items.length} elementi del calendario e {latestOutcomes(candidate.history).length} appuntamenti con esito ({candidate.history.length} registrazioni nello storico).</p>
      <p>Il backup sostituirà calendario, profilo, obiettivi e storico attuali. Una copia dei dati attuali sarà conservata automaticamente e potrai esportarla dalle Impostazioni.</p>
      <p>Sono accettati solo backup esportati dall’app nel formato corrente.</p>
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><StandardButton variant="secondary" type="button" disabled={busy} onClick={() => setCandidate(null)}>Annulla</StandardButton><StandardButton variant="primary" type="button" disabled={busy || disabled} onClick={async () => {
        setBusy(true); setError("");
        try { await onImport(candidate); setCandidate(null); setMessage("Backup importato. La copia precedente è disponibile per l’esportazione."); }
        catch (cause) { setError((cause as Error).message); }
        finally { setBusy(false); }
      }}>{busy ? "Importazione…" : "Conferma: sostituisci i dati"}</StandardButton></div>
    </CalendarDialog>}
  </div>;
}
