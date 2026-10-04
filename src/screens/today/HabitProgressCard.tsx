import type { CSSProperties } from "react";
import { HABIT_DASHBOARD_DAYS, HABIT_DASHBOARD_OCCASIONS, eventColors, habitDashboardStates } from "../../constants";
import { StandardButton } from "../../components/ui/StandardButton";
import { EventIcon } from "../../icons/EventIcon";
import type { HabitDashboard, HabitDashboardRow } from "../../model/habit";
import { displayDate } from "../../utils/dates";
import { HabitJourney } from "../habits/HabitJourney";

interface HabitProgressCardProps {
  progress: HabitDashboard;
  onOpenHabits: (habitId?: string) => void;
  onAddHabit: () => void;
}

/** Mostra traguardi e occasioni disponibili; apre il percorso senza modificare esiti. */
export function HabitProgressCard({ progress, onOpenHabits, onAddHabit }: HabitProgressCardProps) {
  const { featured } = progress;
  return <section className="today-card today-progress" aria-labelledby="today-progress-title">
    <header className="today-card-heading">
      <div><p className="eyebrow">Un passo alla volta</p><h3 id="today-progress-title">Il tuo percorso</h3></div>
      {progress.milestonesReached > 0 && <span className="today-milestone-count">{progress.milestonesReached} {progress.milestonesReached === 1 ? "traguardo" : "traguardi"}</span>}
    </header>
    {progress.totalHabits === 0 ? <div className="today-progress-empty">
      <h4>{progress.milestonesReached ? "Tutte le abitudini sono completate" : "Da un piccolo gesto nasce un percorso"}</h4>
      <p>{progress.milestonesReached ? "Non hai altre abitudini da completare. Vuoi ripetere una serie?" : "Scegli un’abitudine e un traguardo alla tua portata. Qui vedrai i passi che costruisci nel tempo."}</p>
      {progress.milestonesReached > 0 && <StandardButton variant="secondary" onClick={() => onOpenHabits()}>Vedi le serie completate</StandardButton>}
      <StandardButton onClick={onAddHabit}>Crea un’abitudine</StandardButton>
    </div> : <>
      {featured ? <div className="today-milestone" style={{ "--event-color": eventColors[featured.habit.color].value } as CSSProperties}>
        <p className="eyebrow">Il prossimo traguardo</p>
        <button className="today-habit-link" onClick={() => onOpenHabits(featured.habit.id)}>
          <EventIcon icon={featured.habit.icon} /><strong>{featured.habit.title}</strong><span aria-hidden="true">↗</span>
        </button>
        <p>{featured.remaining === 1 ? "Manca un completamento al prossimo traguardo." : `Mancano ${featured.remaining} completamenti al prossimo traguardo.`}</p>
        <HabitJourney progress={featured.journey} compact />
      </div> : <div className="today-milestone today-milestone-intro"><h4>Il percorso inizia dal primo completamento</h4><p>Ogni volta che pratichi aggiungi uno step. Un’occasione saltata non cancella quelli raggiunti.</p></div>}
      <div className="today-recent-heading"><h4>Il tuo ritmo recente</h4><p>Fino a {HABIT_DASHBOARD_OCCASIONS} occasioni per abitudine · ultimi {HABIT_DASHBOARD_DAYS} giorni</p></div>
      <ul className="today-progress-list">{progress.rows.map(row => <HabitProgressRow key={row.habit.id} row={row} onOpen={() => onOpenHabits(row.habit.id)} />)}</ul>
      <ul className="today-progress-legend" aria-label="Legenda degli esiti">{Object.entries(habitDashboardStates).map(([state, { label, symbol }]) => <li key={state}><span className={`today-outcome-mark ${state}`} aria-hidden="true">{symbol}</span>{label}</li>)}</ul>
      <details className="today-progress-note"><summary>Come leggere il percorso</summary><p>Da sinistra a destra, dalle occasioni meno recenti alle più recenti. I conteggi si riferiscono agli indicatori visibili. Dopo una modifica del piano, alcune occasioni passate senza esito potrebbero non essere disponibili. I traguardi seguono il numero di step scelto per ogni abitudine.</p></details>
      <StandardButton className="today-progress-all" variant="ghost" onClick={() => onOpenHabits()}>{progress.totalHabits > progress.rows.length ? `Vedi tutte le ${progress.totalHabits} abitudini` : "Vedi i percorsi"}<span aria-hidden="true"> →</span></StandardButton>
    </>}
  </section>;
}

/** Rende accessibili data ed esito di ogni occasione, anche al focus da tastiera. */
function HabitProgressRow({ row, onOpen }: { row: HabitDashboardRow; onOpen: () => void }) {
  const { habit, entries, counts } = row;
  const summary = [
    counts.completed && `${counts.completed} ${counts.completed === 1 ? "completata" : "completate"}`,
    counts.partial && `${counts.partial} ${counts.partial === 1 ? "parziale" : "parziali"}`,
    counts.skipped && `${counts.skipped} ${counts.skipped === 1 ? "non fatta" : "non fatte"}`,
    counts.pending && `${counts.pending} senza esito`,
  ].filter(Boolean).join(" · ");
  return <li className="today-progress-row" style={{ "--event-color": eventColors[habit.color].value } as CSSProperties}>
    <button className="today-habit-link" onClick={onOpen}><EventIcon icon={habit.icon} /><strong>{habit.title}</strong><span aria-hidden="true">↗</span></button>
    {entries.length ? <>
      <ol className="today-outcome-strip" aria-label={`Occasioni recenti di ${habit.title}`}>{entries.map(entry => {
        const state = entry.outcome ?? "pending";
        const { label, symbol } = habitDashboardStates[state];
        const description = `${displayDate(entry.date, { day: "numeric", month: "short" })}${entry.start ? ` · ${entry.start}` : ""}: ${label}${entry.moved ? " · Spostata" : ""}${entry.removed ? " · Rimossa dal calendario" : ""}`;
        return <li key={`${entry.sourceId}@${entry.occurrenceDate}`}><span tabIndex={0} className={`today-outcome-mark ${state}`} aria-label={description}><span aria-hidden="true">{symbol}</span><span className="today-outcome-tooltip" aria-hidden="true">{description}</span></span></li>;
      })}</ol>
      <p className="today-progress-counts">{summary}</p>
    </> : <p className="today-progress-counts">Nessuna occasione trascorsa disponibile negli ultimi {HABIT_DASHBOARD_DAYS} giorni.</p>}
  </li>;
}
