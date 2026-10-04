import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { addDays, displayDate, eventColors, today } from "../../domain/calendar";
import { habitJourneyProgress, habitTimeline } from "../../domain/habitTimeline";
import { useDB } from "../../hooks/useDB";
import { EventIcon } from "../../icons/EventIcon";
import { StandardButton } from "../../components/ui/StandardButton";
import { HabitJourney } from "./HabitJourney";

interface HabitsScreenProps { active: boolean; onAdd: () => void; onEdit: (habitId: string) => void }

/** Percorso delle abitudini nel tempo, derivato da occasioni ed esiti confermati. */
export function HabitsScreen({ active, onAdd, onEdit }: HabitsScreenProps) {
  const { habits, state, archive } = useDB();
  const [selectedId, setSelectedId] = useState<string>();
  useEffect(() => { if (!selectedId || !habits.some(habit => habit.id === selectedId)) setSelectedId(habits[0]?.id); }, [habits, selectedId]);
  const selected = habits.find(habit => habit.id === selectedId);
  const reference = today();
  const entries = useMemo(() => {
    if (!selected) return [];
    return habitTimeline(state, archive.history, selected, addDays(reference, -28), addDays(reference, 14));
  }, [selected, state, archive.history, reference]);
  const journey = selected ? habitJourneyProgress(archive.history, selected) : null;
  return (
    <section id="panel-habits" className="app-screen" role="tabpanel" aria-labelledby="tab-habits" tabIndex={0} hidden={!active}>
      <header className="calendar-header"><div><p className="eyebrow">Il percorso nel tempo</p><h2>Abitudini da acquisire</h2><p>Un completamento alla volta, fino al piccolo traguardo che hai scelto.</p></div><StandardButton variant="primary" onClick={onAdd}>Crea</StandardButton></header>
      <div className="screen-content habits-layout">
        {habits.length === 0 ? <div className="habit-empty"><h3>Acquisisci la prima abitudine</h3><p>Scegli un piccolo traguardo da 1 a 12 completamenti, poi pianifica giorni, orario e durata.</p><StandardButton variant="primary" onClick={onAdd}>Inizia</StandardButton></div> : <>
          <nav className="habit-list" aria-label="Le tue abitudini">{habits.map(habit => {
            const weeklyOccurrences = state.items.filter(item => item.habitId === habit.id).length;
            return <button key={habit.id} aria-current={habit.id === selectedId ? "true" : undefined} onClick={() => setSelectedId(habit.id)} style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}><span><EventIcon icon={habit.icon} /></span><strong>{habit.title}</strong><small>{weeklyOccurrences} {weeklyOccurrences === 1 ? "volta" : "volte"} a settimana · {habit.stepTarget} step</small></button>;
          })}</nav>
          {selected && journey && <article className="habit-detail" style={{ "--event-color": eventColors[selected.color].value } as CSSProperties}>
            <header><span className="habit-detail-icon"><EventIcon icon={selected.icon} /></span><div><h3>{selected.title}</h3>{selected.motivation && <p>{selected.motivation}</p>}</div><StandardButton variant="ghost" onClick={() => onEdit(selected.id)}>Modifica</StandardButton></header>
            <HabitJourney progress={journey} />
            <h4>Percorso recente e prossimi passi</h4>
            <ol className="habit-timeline">{entries.map(entry => <li key={`${entry.sourceId}@${entry.occurrenceDate}`} className={entry.outcome ?? (entry.date > reference ? "future" : "pending")}><span className="habit-timeline-node" aria-hidden="true">{entry.outcome === "completed" ? "✓" : entry.outcome === "partial" ? "◐" : entry.outcome === "skipped" ? "×" : ""}</span><div><time>{displayDate(entry.date, { weekday: "short", day: "numeric", month: "short" })}{entry.start && ` · ${entry.start}`}</time><strong>{entry.outcome === "completed" ? "Completata" : entry.outcome === "partial" ? "Parziale" : entry.outcome === "skipped" ? "Non fatta" : entry.date > reference ? "Pianificata" : "Da registrare"}</strong>{entry.moved && <small>Spostata rispetto al piano originale</small>}{entry.removed && <small>Rimossa dal calendario · esito conservato</small>}</div></li>)}</ol>
          </article>}
        </>}
      </div>
    </section>
  );
}
