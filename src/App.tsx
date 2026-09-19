import { useLayoutEffect, useState } from "react";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { CalendarItemEditor } from "./components/CalendarItemEditor";
import { CalendarDialog } from "./components/CalendarDialog";
import { CalendarPreferences } from "./components/CalendarPreferences";
import { PalettePicker } from "./components/PalettePicker";
import { loadPalette, PALETTE_STORAGE_KEY, type Palette } from "./theme";
import { addDays, clearCalendar, deleteItem, displayDate, putItem, today, weekStart, type CalendarState, type Occurrence } from "./domain/calendar";
import { loadCalendar, saveCalendar } from "./infrastructure/localCalendarStorage";

function readableArchive(data: string) {
  try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
}
function download(name: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
  const [loaded] = useState(() => {
    try { return loadCalendar(window.localStorage); }
    catch { return { state: { version: 2, items: [], goals: [], profile: null } as CalendarState, raw: null, legacy: null, error: "Archivio locale non accessibile. Riapri l’app per riprovare." }; }
  });
  const [state, setState] = useState(loaded.state);
  const [week, setWeek] = useState(() => weekStart(today()));
  const [editor, setEditor] = useState<{ date: string; occurrence?: Occurrence } | null>(null);
  const [preferences, setPreferences] = useState<"profile" | "goals" | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearUnlocked, setClearUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [palette, setPalette] = useState(loadPalette);
  const [paletteSaveError, setPaletteSaveError] = useState(false);
  useLayoutEffect(() => { document.documentElement.dataset.palette = palette; }, [palette]);
  function changePalette(next: Palette) {
    setPalette(next);
    try { window.localStorage.setItem(PALETTE_STORAGE_KEY, next); setPaletteSaveError(false); }
    catch { setPaletteSaveError(true); }
  }
  function commit(next: CalendarState) {
    if (loaded.error) throw new Error(loaded.error);
    try { saveCalendar(window.localStorage, next); }
    catch { throw new Error("Salvataggio non riuscito. Nessuna modifica applicata: controlla lo spazio disponibile e riprova."); }
    setState(next); setError("");
  }
  const hasConstraints = state.items.some(item => item.kind !== "flexible");
  const disabled = Boolean(loaded.error);
  return <div className="app-shell">
    <aside className="hero-panel">
      <PalettePicker value={palette} onChange={changePalette} saveError={paletteSaveError} />
      <p className="eyebrow">Il tuo tempo, in locale</p>
      <h1>Spazio alle tue giornate.</h1>
      <p className="hero-copy">Attività, impegni e tempo per te. Un calendario continuo, pronto da usare.</p>
      <div className="hero-actions">
        <button disabled={disabled} className="primary-button" onClick={() => setEditor({ date: week === weekStart(today()) ? today() : week })}>Aggiungi attività</button>
        <button disabled={disabled} className="secondary-button" onClick={() => setPreferences("goals")}>Obiettivi</button>
        <button disabled={disabled} className="secondary-button" onClick={() => setPreferences("profile")}>Profilo facoltativo</button>
      </div>
      <div className="summary-card">
        <h2>Il tuo calendario</h2>
        <p>🔒 Impegni fissi e tempo protetto richiedono uno sblocco esplicito per le modifiche.</p>
        <p>Le attività flessibili possono essere spostate cambiando data e orari.</p>
        <p className="summary-empty-copy">Dati salvati solo su questo dispositivo. Nessun account o sincronizzazione.</p>
      </div>
      {state.goals.length > 0 && <div className="summary-card"><h2>Obiettivi</h2><ul className="summary-list">{state.goals.map(goal => <li key={goal.id}>{goal.name}</li>)}</ul></div>}
      <div className="summary-card">
        <h2>Dati locali</h2>
        <div className="hero-actions">
          <button className="secondary-button" disabled={disabled} onClick={() => download("calendario.json", JSON.stringify(state, null, 2))}>Esporta calendario</button>
          <button disabled={disabled || state.items.length === 0} className="ghost-button" onClick={() => { setClearUnlocked(false); setError(""); setClearing(true); }}>Svuota calendario</button>
        </div>
      </div>
      {loaded.legacy !== null && <div className="summary-card">
        <h2>Recupero del prototipo</h2>
        <p>Il vecchio archivio è conservato integralmente: profilo, piano e risultati. I blocchi settimanali non avevano date e non sono stati inseriti nel calendario.</p>
        <p>Esporta il JSON per recuperare i dati originali. Puoi consultarli qui e ricreare gli elementi scegliendo le date corrette.</p>
        <button className="secondary-button" onClick={() => download("recupero-prototipo.json", loaded.legacy!)}>Esporta dati precedenti</button>
        <details className="legacy-details"><summary>Consulta archivio precedente</summary><pre>{readableArchive(loaded.legacy)}</pre></details>
      </div>}
    </aside>
    <main className="calendar-panel">
      <header className="calendar-header">
        <div><p className="eyebrow">Vista settimanale</p><h2>Calendario</h2><p aria-live="polite">{displayDate(week, { year: "numeric" })} – {displayDate(addDays(week, 6), { year: "numeric" })}</p></div>
        <nav className="week-navigation" aria-label="Navigazione settimane">
          <button className="secondary-button" aria-label="Settimana precedente" onClick={() => setWeek(addDays(week, -7))}>← Precedente</button>
          <button className="secondary-button" onClick={() => setWeek(weekStart(today()))}>Oggi</button>
          <button className="secondary-button" aria-label="Settimana successiva" onClick={() => setWeek(addDays(week, 7))}>Successiva →</button>
        </nav>
      </header>
      {loaded.error && <div role="alert" className="capacity-warning"><p>{loaded.error}</p>{loaded.raw !== null && <button className="secondary-button" onClick={() => download("recupero-calendario.json", loaded.raw!)}>Esporta archivio da recuperare</button>}</div>}
      <WeeklyCalendar state={state} week={week} disabled={disabled} onAdd={date => setEditor({ date })} onEdit={occurrence => setEditor({ date: occurrence.date, occurrence })} />
      <section className="summary-card" aria-label="Pianificazione facoltativa"><h2>Pianificazione e AI</h2><p className="summary-empty-copy">La chat del prototipo è temporaneamente disabilitata: rigenerava l’intero piano. Puoi organizzare gli elementi direttamente nel calendario; i futuri suggerimenti dovranno rispettare date, vincoli ed esiti.</p></section>
    </main>
    {editor && <CalendarItemEditor date={editor.date} occurrence={editor.occurrence} item={state.items.find(item => item.id === editor.occurrence?.sourceId)} goals={state.goals} onClose={() => setEditor(null)}
      onSave={(item, unlocked, target) => {
        commit(putItem(state, item, { actor: "user", unlocked }, target)); setEditor(null);
      }} onDelete={(target, unlocked) => {
        commit(deleteItem(state, target, { actor: "user", unlocked })); setEditor(null);
      }} />}
    {preferences && <CalendarPreferences mode={preferences} state={state} onSave={commit} onClose={() => setPreferences(null)} />}
    {clearing && <CalendarDialog title="Svuota calendario" onClose={() => setClearing(false)}>
      <p>Verranno eliminati <strong>tutti gli elementi di tutte le settimane</strong>, inclusi impegni fissi, tempo protetto, serie ricorrenti, eccezioni, note e stati di completamento o salto.</p>
      <p>Restano il profilo facoltativo, gli obiettivi, la palette e l’archivio del vecchio prototipo. Questa operazione non è annullabile; puoi prima esportare il calendario.</p>
      {hasConstraints && <label className="clear-unlock"><input type="checkbox" checked={clearUnlocked} onChange={e => setClearUnlocked(e.target.checked)} />Sblocco esplicitamente tutti i vincoli per eliminarli.</label>}
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><button className="secondary-button" onClick={() => setClearing(false)}>Annulla</button><button disabled={hasConstraints && !clearUnlocked} className="primary-button" onClick={() => {
        try { commit(clearCalendar(state)); setClearing(false); } catch (cause) { setError((cause as Error).message); }
      }}>Conferma: svuota tutte le settimane</button></div>
    </CalendarDialog>}
  </div>;
}
export default App;
