import { formatDurationMinutes } from "../../utils/time";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { addDays, displayDate, eventColors, today } from "../../domain/calendar";
import { nextHabitOccurrence } from "../../domain/habitTimeline";
import { useDB } from "../../hooks/useDB";
import { useLocalMinute } from "../../hooks/useLocalMinute";
import { EventIcon } from "../../icons/EventIcon";
import { RoundButton } from "../ui/RoundButton";

interface AppSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  onAddHabit: () => void;
  onOpenHabits: (habitId?: string) => void;
}

/** Barra laterale persistente con le abitudini e la loro prossima occasione. */
export function AppSidebar({ expanded, onToggle, onAddHabit, onOpenHabits }: AppSidebarProps) {
  const { habits, weeklyTimeHabits, getWeeklyTimeProgress, getHabitCompletionDate, getHabitTimeline } = useDB();
  const referenceDate = today();
  const now = useLocalMinute();
  const referenceTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const activeHabits = useMemo(() => habits.filter(habit => !getHabitCompletionDate(habit.id)).map(habit => {
    const entries = getHabitTimeline(habit.id, addDays(referenceDate, -27), addDays(referenceDate, 30));
    return { habit, next: nextHabitOccurrence(entries, referenceDate, referenceTime) };
  }), [habits, getHabitCompletionDate, getHabitTimeline, referenceDate, referenceTime]);
  return (
    <aside id="sidebar-drawer" className="hero-panel" aria-label="Barra laterale">
      <div className="sidebar-brand">
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
        <h1 className="sidebar-brand-name" hidden={!expanded}>Il tuo <span>tempo</span></h1>
      </div>
      <section className="sidebar-habits" aria-labelledby={expanded ? "sidebar-habits-title" : undefined} aria-label={expanded ? undefined : "Le tue abitudini"}>
        <div className="sidebar-habits-heading" hidden={!expanded}>
          <h2 id="sidebar-habits-title">Le tue abitudini</h2>
          <button type="button" onClick={() => onOpenHabits()}>Apri</button>
        </div>
        {activeHabits.length === 0 && weeklyTimeHabits.every(habit => habit.archivedOn) ? (
          expanded ? <div className="sidebar-habits-empty">
            <p>Nessuna abitudine attiva. Puoi crearne una o ripetere una serie conclusa.</p>
            <button type="button" onClick={onAddHabit}>Crea</button>
          </div> : <RoundButton variant="secondary" icon="habits" label="Apri abitudini" onClick={() => onOpenHabits()} />
        ) : (
          <ul className="sidebar-habit-list">
            {activeHabits.map(({ habit, next }) => (
                <li key={habit.id} className={`sidebar-habit${expanded ? "" : " sidebar-habit-compact"}`} style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}>
                  {expanded ? <>
                    <div className="sidebar-habit-identity"><span className="sidebar-habit-icon" aria-hidden="true"><EventIcon icon={habit.icon} /></span><strong className="sidebar-habit-title">{habit.title}</strong></div>
                    <span className="sidebar-habit-next">{next ? `Prossima: ${displayDate(next.date, { weekday: "short", day: "numeric", month: "short" })}${next.start ? ` · ${next.start}` : ""}` : "Nessuna prossima occasione pianificata"}</span>
                  </> : <button type="button" className="sidebar-habit-compact-button" onClick={() => onOpenHabits()}
                    aria-label={`Apri abitudine. ${habit.title}`}
                    title={habit.title}><span className="sidebar-habit-icon" aria-hidden="true"><EventIcon icon={habit.icon} /></span></button>}
                </li>
            ))}
          </ul>
        )}
        {weeklyTimeHabits.filter(habit => !habit.archivedOn).map(habit => <button type="button" className="sidebar-time-habit" key={habit.id} onClick={() => onOpenHabits(habit.id)} aria-label={`Apri ${habit.title}`} style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}><EventIcon icon={habit.icon} />{expanded && <span><strong>{habit.title}</strong><small>{formatDurationMinutes(getWeeklyTimeProgress(habit.id, referenceDate).completedMinutes)} / {formatDurationMinutes(getWeeklyTimeProgress(habit.id, referenceDate).targetMinutes || habit.targets[0].minutes)}</small></span>}</button>)}
      </section>
    </aside>
  );
}
