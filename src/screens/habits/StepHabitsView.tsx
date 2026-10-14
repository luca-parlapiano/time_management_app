import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { addDays, displayDate, eventColors, today } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { AppIcon } from "../../icons/AppIcon";
import { EventIcon } from "../../icons/EventIcon";
import { StandardButton } from "../../components/ui/StandardButton";
import { HabitStatusTabs } from "./HabitStatusTabs";
import { HabitJourney } from "./HabitJourney";

export interface HabitsScreenProps { active: boolean; selectedHabitId?: string; onSelectHabit: (habitId: string | undefined) => void; onAdd: () => void; onEdit: (habitId: string) => void; onRepeat: (habitId: string) => void }

/** Percorso delle abitudini nel tempo, derivato da occasioni ed esiti confermati. */
export function StepHabitsView({ active, selectedHabitId, onSelectHabit, onEdit, onRepeat }: HabitsScreenProps) {
  const { habits, state, getHabitCompletionDate, getHabitProgress, getHabitTimeline } = useDB();
  const [emptyView, setEmptyView] = useState<"ongoing" | "archive">("ongoing");
  const completionDates = useMemo(() => new Map(habits.map(habit => [habit.id, getHabitCompletionDate(habit.id)])), [habits, getHabitCompletionDate]);
  const requestedHabit = habits.find(habit => habit.id === selectedHabitId);
  const view = requestedHabit ? (completionDates.get(requestedHabit.id) ? "archive" : "ongoing") : emptyView;
  const completedCount = habits.filter(habit => completionDates.get(habit.id)).length;
  const visibleHabits = habits.filter(habit => Boolean(completionDates.get(habit.id)) === (view === "archive"));
  const selected = visibleHabits.find(habit => habit.id === selectedHabitId) ?? visibleHabits[0];
  const changeView = (next: "ongoing" | "archive") => {
    setEmptyView(next);
    onSelectHabit(habits.find(habit => Boolean(completionDates.get(habit.id)) === (next === "archive"))?.id);
  };
  const reference = today();
  const entries = useMemo(() => {
    if (!selected) return [];
    return getHabitTimeline(selected.id, addDays(reference, -28), addDays(reference, 14));
  }, [selected, getHabitTimeline, reference]);
  const closedOn = selected ? completionDates.get(selected.id) : undefined;
  const journey = selected ? getHabitProgress(selected.id) : null;
  return (
    <div hidden={!active}>
      <header className="calendar-header"><div><p className="eyebrow">Il percorso nel tempo</p><h2>Abitudini da acquisire</h2><p>Ogni evento valutato fa avanzare la serie, sia fatto sia non fatto.</p></div></header>
      <HabitStatusTabs label="Stato delle abitudini" archived={view === "archive"} onChange={archived => changeView(archived ? "archive" : "ongoing")} counts={[habits.length - completedCount, completedCount]}>
      <div className="habits-layout">
        {visibleHabits.length === 0 ? <div className="habit-empty">
          <h3>{view === "archive" ? "Nessuna abitudine in archivio" : habits.length === 0 ? "Acquisisci la prima abitudine" : "Nessuna abitudine in corso"}</h3>
          <p>{view === "archive" ? "Qui ritroverai le serie concluse, con lo storico del percorso." : habits.length === 0 ? "Scegli un piccolo traguardo da 1 a 12 step, poi pianifica giorni, orario e durata." : "Puoi iniziare una nuova abitudine o ripetere una serie dall’archivio."}</p>
          {view === "ongoing" && <p className="editor-hint">Usa Crea nell’header per iniziare un nuovo percorso.</p>}
        </div> : <>
          <nav className="habit-list" aria-label={view === "archive" ? "Abitudini archiviate" : "Abitudini in corso"}>{visibleHabits.map(habit => {
            const weeklyOccurrences = state.items.filter(item => item.habitId === habit.id).length;
            const completedOn = completionDates.get(habit.id);
            const progress = view === "archive" ? getHabitProgress(habit.id) : null;
            const allStepsDone = progress?.stepOutcomes.length === habit.stepTarget && progress.stepOutcomes.every(outcome => outcome === "completed");
            return <button key={habit.id} aria-current={habit.id === selected?.id ? "true" : undefined} onClick={() => onSelectHabit(habit.id)} style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}><span className="habit-list-icon"><EventIcon icon={habit.icon} /></span><strong>{habit.title}</strong><small>{completedOn ? `Conclusa - ${displayDate(completedOn, { day: "2-digit", month: "2-digit", year: "numeric" })}` : `${weeklyOccurrences} ${weeklyOccurrences === 1 ? "volta" : "volte"} a settimana · ${habit.stepTarget} step`}</small>{allStepsDone && <span className="habit-list-trophy" role="img" aria-label="Tutti gli step fatti" title="Tutti gli step fatti"><AppIcon name="trophies" size={20} /></span>}</button>;
          })}</nav>
          {selected && journey && <article className="habit-detail" style={{ "--event-color": eventColors[selected.color].value } as CSSProperties}>
            <header><span className="habit-detail-icon"><EventIcon icon={selected.icon} /></span><div><h3>{selected.title}</h3>{selected.motivation && <p>{selected.motivation}</p>}</div><StandardButton variant="ghost" onClick={() => onEdit(selected.id)}>Modifica</StandardButton></header>
            <HabitJourney progress={journey} />
            {closedOn && <div className="habit-completion" role="status"><p><strong>Serie conclusa.</strong> Non genera altre occasioni dopo il {displayDate(closedOn, { day: "numeric", month: "long", year: "numeric" })}. Vuoi ripeterla?</p><StandardButton variant="primary" onClick={() => onRepeat(selected.id)}>Ripeti serie</StandardButton></div>}
            <h4>{closedOn ? "Storico del percorso" : "Percorso recente e prossimi passi"}</h4>
            <ol className="habit-timeline">{entries.map(entry => <li key={`${entry.sourceId}@${entry.occurrenceDate}`} className={entry.outcome ?? (entry.date > reference ? "future" : "pending")}><span className="habit-timeline-node" aria-hidden="true">{entry.outcome === "completed" ? "✓" : entry.outcome === "skipped" ? "×" : ""}</span><div><time>{displayDate(entry.date, { weekday: "short", day: "numeric", month: "short" })}{entry.start && ` · ${entry.start}`}</time><strong>{entry.outcome === "completed" ? "Completata" : entry.outcome === "skipped" ? "Non fatta" : entry.date > reference ? "Pianificata" : "Da registrare"}</strong>{entry.moved && <small>Spostata rispetto al piano originale</small>}{entry.removed && <small>Rimossa dal calendario · esito conservato</small>}</div></li>)}</ol>
          </article>}
        </>}
      </div>
      </HabitStatusTabs>
    </div>
  );
}
