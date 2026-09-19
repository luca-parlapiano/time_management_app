import { useState } from "react";
import { CalendarDialog } from "./CalendarDialog";
import type { CalendarState } from "../domain/calendar";

export function CalendarPreferences({ state, mode, onSave, onClose }: {
  state: CalendarState; mode: "profile" | "goals"; onSave: (next: CalendarState) => void; onClose: () => void;
}) {
  const [profile, setProfile] = useState(state.profile ?? { name: "", notes: "" });
  const [goals, setGoals] = useState(state.goals);
  const [error, setError] = useState("");
  return <CalendarDialog title={mode === "profile" ? "Profilo facoltativo" : "Obiettivi"} onClose={onClose}>
    <form onSubmit={e => {
      e.preventDefault();
      try { onSave({ ...state, ...(mode === "profile" ? { profile } : { goals }) }); onClose(); }
      catch (cause) { setError((cause as Error).message); }
    }}>
      <div className="form-grid">
        {mode === "profile" ? <>
          <p>Queste informazioni serviranno per futuri suggerimenti personalizzati. Gli impegni e il tempo protetto si inseriscono direttamente nel calendario.</p>
          <label>Nome (facoltativo)<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Preferenze personali (facoltative)<textarea rows={5} value={profile.notes} onChange={e => setProfile({ ...profile, notes: e.target.value })} /></label>
        </> : <>
          <p>Puoi collegare ogni attività a un obiettivo. Cambiare il nome conserva tutti i collegamenti.</p>
          {goals.map((goal, index) => <label key={goal.id}>Obiettivo {index + 1}<input required value={goal.name} onChange={e => setGoals(goals.map(entry => entry.id === goal.id ? { ...entry, name: e.target.value } : entry))} /></label>)}
          <button type="button" className="secondary-button" onClick={() => setGoals([...goals, { id: crypto.randomUUID(), name: "" }])}>Aggiungi obiettivo</button>
        </>}
      </div>
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><button className="primary-button" type="submit">Salva {mode === "profile" ? "profilo" : "obiettivi"}</button></div>
    </form>
  </CalendarDialog>;
}
