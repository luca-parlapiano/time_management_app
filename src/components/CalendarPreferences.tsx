import { useState } from "react";
import { CalendarDialog } from "./CalendarDialog";
import type { CalendarState, ItemData } from "../domain/calendar";

export function CalendarPreferences({ state, onSave, onClose }: {
  state: CalendarState; onSave: (next: CalendarState) => void; onClose: () => void;
}) {
  const [profile, setProfile] = useState(state.profile ?? { name: "", notes: "" });
  const [goals, setGoals] = useState(state.goals);
  const [error, setError] = useState("");
  return <CalendarDialog title="Profilo" onClose={onClose}>
    <form onSubmit={e => {
      e.preventDefault();
      try {
        const remainingIds = new Set(goals.map(goal => goal.id));
        function unlinkRemovedGoal<T extends ItemData>(item: T): T {
          if (item.goalId === undefined || remainingIds.has(item.goalId)) return item;
          const next = { ...item };
          delete next.goalId;
          return next;
        }
        const items = state.items.map(item => ({
          ...unlinkRemovedGoal(item),
          exceptions: Object.fromEntries(Object.entries(item.exceptions).map(([date, exception]) =>
            [date, exception === null ? null : unlinkRemovedGoal(exception)])),
        }));
        onSave({ ...state, items, profile, goals });
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
