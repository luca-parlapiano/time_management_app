import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { addDays, displayDate, eventColors, today } from "../../domain/calendar";
import { habitTimeline } from "../../domain/habitTimeline";
import { useDB } from "../../hooks/useDB";
import { EventIcon } from "../../icons/EventIcon";
import { StandardButton } from "../../components/ui/StandardButton";

interface HabitsScreenProps { active: boolean; onAdd: () => void }

/** Percorso delle abitudini nel tempo, derivato da occasioni ed esiti confermati. */
export function HabitsScreen({ active, onAdd }: HabitsScreenProps) {
  const { habits, state, archive } = useDB();
  const [selectedId, setSelectedId] = useState<string>();
  useEffect(() => { if (!selectedId || !habits.some(habit => habit.id === selectedId)) setSelectedId(habits[0]?.id); }, [habits, selectedId]);
  const selected = habits.find(habit => habit.id === selectedId);
  const reference = today();
  const entries = useMemo(() => {
    if (!selected) return [];
    return habitTimeline(state, archive.history, selected, addDays(reference, -28), addDays(reference, 14));
  }, [selected, state, archive.history, reference]);
  const past = entries.filter(entry => entry.date <= reference);
  const completed = past.filter(entry => entry.outcome === "completed").length;
  return (
    <section id="panel-habits" className="app-screen" role="tabpanel" aria-labelledby="tab-habits" tabIndex={0} hidden={!active}>
      <header className="calendar-header"><div><p className="eyebrow">Il percorso nel tempo</p><h2>Abitudini</h2><p>Osserva, impara e adatta il piano.</p></div><StandardButton variant="primary" onClick={onAdd}>Nuova abitudine</StandardButton></header>
      <div className="screen-content habits-layout">
        {habits.length === 0 ? <div className="habit-empty"><h3>Costruisci la prima abitudine</h3><p>Scegli giorni, orario e durata. Gli appuntamenti ricorrenti appariranno anche in Oggi e nel Calendario.</p><StandardButton variant="primary" onClick={onAdd}>Crea un’abitudine</StandardButton></div> : <>
          <nav className="habit-list" aria-label="Le tue abitudini">{habits.map(habit => <button key={habit.id} aria-current={habit.id === selectedId ? "true" : undefined} onClick={() => setSelectedId(habit.id)} style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}><span><EventIcon icon={habit.icon} /></span><strong>{habit.title}</strong><small>{habit.plans.at(-1)?.weekdays.length} volte a settimana</small></button>)}</nav>
          {selected && <article className="habit-detail" style={{ "--event-color": eventColors[selected.color].value } as CSSProperties}>
            <header><span className="habit-detail-icon"><EventIcon icon={selected.icon} /></span><div><h3>{selected.title}</h3>{selected.notes && <p>{selected.notes}</p>}</div></header>
            <div className="habit-progress"><strong>{completed} su {past.length}</strong><span>occasioni completate nelle ultime quattro settimane</span></div>
            <h4>Percorso recente e prossimi passi</h4>
            <ol className="habit-timeline">{entries.map(entry => <li key={`${entry.sourceId}@${entry.occurrenceDate}`} className={entry.outcome ?? (entry.date > reference ? "future" : "pending")}><span className="habit-timeline-node" aria-hidden="true">{entry.outcome === "completed" ? "✓" : entry.outcome === "partial" ? "◐" : entry.outcome === "skipped" ? "×" : ""}</span><div><time>{displayDate(entry.date, { weekday: "short", day: "numeric", month: "short" })}{entry.start && ` · ${entry.start}`}</time><strong>{entry.outcome === "completed" ? "Completata" : entry.outcome === "partial" ? "Parziale" : entry.outcome === "skipped" ? "Non fatta" : entry.date > reference ? "Pianificata" : "Da registrare"}</strong>{entry.moved && <small>Spostata rispetto al piano originale</small>}{entry.removed && <small>Rimossa dal calendario · esito conservato</small>}</div></li>)}</ol>
          </article>}
        </>}
      </div>
    </section>
  );
}
