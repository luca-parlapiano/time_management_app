import { useState } from "react";
import type { CalendarPreferencesProps } from "../model/CalendarPreferences.js";
import { CalendarDialog } from "./CalendarDialog";

export function CalendarPreferences({ state, onSave, onClose }: CalendarPreferencesProps) {
  const [profile, setProfile] = useState(state.profile ?? { name: "", notes: "" });
  const [goals, setGoals] = useState(state.goals);
  const [error, setError] = useState("");
  return <CalendarDialog title="Profilo" onClose={onClose}>
    <form onSubmit={async e => {
      e.preventDefault();
      try {
        await onSave(profile, goals);
        onClose();
      }
      catch (cause) { setError((cause as Error).message); }
    }}>
      <div className="form-grid">
          <label>Nome<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Note<textarea rows={5} value={profile.notes} onChange={e => setProfile({ ...profile, notes: e.target.value })} /></label>
          <h3>Obiettivi</h3>
          {goals.length === 0 && <p className="editor-hint">Non hai ancora aggiunto obiettivi.</p>}
          {goals.map((goal, index) => <div className="profile-goal-row" key={goal.id}>
            <label>Obiettivo {index + 1}<input required value={goal.name} onChange={e => setGoals(goals.map(entry => entry.id === goal.id ? { ...entry, name: e.target.value } : entry))} /></label>
            <button type="button" className="ghost-button" aria-label={`Elimina obiettivo ${goal.name.trim() || index + 1}`} onClick={() => setGoals(current => current.filter(entry => entry.id !== goal.id))}>Elimina</button>
          </div>)}
          {state.goals.some(goal => !goals.some(entry => entry.id === goal.id)) && <p className="editor-hint" role="status">Gli obiettivi rimossi saranno eliminati quando salvi il profilo. Le attività collegate restano nel calendario.</p>}
          <button type="button" className="secondary-button" onClick={() => setGoals([...goals, { id: crypto.randomUUID(), name: "" }])}>Aggiungi obiettivo</button>
      </div>
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><button className="primary-button" type="submit">Salva profilo</button></div>
    </form>
  </CalendarDialog>;
}
