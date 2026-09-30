import type { CSSProperties } from "react";
import { addDays, displayDate, eventColors, today } from "../../domain/calendar";
import { habitSummary, habitTimeline } from "../../domain/habitTimeline";
import { useDB } from "../../hooks/useDB";
import { EventIcon } from "../../icons/EventIcon";
import { RoundButton } from "../ui/RoundButton";

interface AppSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onAddHabit: () => void;
  onOpenHabits: () => void;
  onOpenPreferences: () => void;
  onClear: () => void;
}

/** Barra laterale persistente con azioni e stato delle abitudini attive. */
export function AppSidebar({ expanded, onToggle, onAdd, onAddHabit, onOpenHabits, onOpenPreferences, onClear }: AppSidebarProps) {
  const { habits, archive, state, saving } = useDB();
  const referenceDate = today();
  const now = new Date();
  const referenceTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const activeHabits = habits.filter(habit => habit.status === "active");
  return (
    <aside id="sidebar-drawer" className="hero-panel" aria-label="Barra laterale">
      <RoundButton
        variant="secondary"
        className="sidebar-toggle"
        icon={expanded ? "sidebar-close" : "sidebar-open"}
        iconSize={24}
        label={expanded ? "Riduci barra laterale" : "Espandi barra laterale"}
        aria-expanded={expanded}
        aria-controls="sidebar-drawer"
        onClick={onToggle}
      />
      <div className="sidebar-intro" hidden={!expanded}>
        <p className="eyebrow">Il tuo tempo, in locale</p>
        <h1>Spazio alle tue giornate.</h1>
        <p className="hero-copy">Attività, impegni e tempo per te. Un calendario continuo, pronto da usare.</p>
      </div>
      <div className="hero-icon-actions" role="group" aria-label="Azioni calendario">
        <RoundButton variant="primary" icon="add" iconSize={26} label="Aggiungi attività" disabled={saving} onClick={onAdd} />
        <RoundButton variant="secondary" icon="profile" label="Profilo" disabled={saving} onClick={onOpenPreferences} />
        <RoundButton variant="ghost" icon="trash" label="Svuota calendario" disabled={saving || state.items.length === 0} onClick={onClear} />
      </div>
      <section className="sidebar-habits" aria-labelledby="sidebar-habits-title" hidden={!expanded}>
        <div className="sidebar-habits-heading">
          <h2 id="sidebar-habits-title">Le tue abitudini</h2>
          <button type="button" onClick={onOpenHabits}>Apri</button>
        </div>
        {activeHabits.length === 0 ? (
          <div className="sidebar-habits-empty">
            <p>{habits.length === 0 ? "Nessuna abitudine ancora. Parti da un piano semplice." : "Nessuna abitudine attiva."}</p>
            {habits.length === 0 && <button type="button" onClick={onAddHabit}>Crea un’abitudine</button>}
          </div>
        ) : (
          <ul className="sidebar-habit-list">
            {activeHabits.map(habit => {
              const entries = habitTimeline(state, archive.history, habit, addDays(referenceDate, -27), addDays(referenceDate, 30));
              const summary = habitSummary(entries, referenceDate, referenceTime);
              return (
                <li key={habit.id} className="sidebar-habit" style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}>
                  <span className="sidebar-habit-icon" aria-hidden="true"><EventIcon icon={habit.icon} /></span>
                  <div className="sidebar-habit-content">
                    <strong className="sidebar-habit-title">{habit.title}</strong>
                    <span className="sidebar-habit-progress">4 settimane: {summary.completed}/{summary.planned} completate · serie {summary.streak}</span>
                    <span className="sidebar-habit-next">{summary.next ? `Prossima: ${displayDate(summary.next.date, { weekday: "short", day: "numeric", month: "short" })}${summary.next.start ? ` · ${summary.next.start}` : ""}` : "Nessuna prossima occasione pianificata"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
