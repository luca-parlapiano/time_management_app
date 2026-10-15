import type { CSSProperties } from "react";
import { HABIT_DASHBOARD_DAYS, HABIT_DASHBOARD_OCCASIONS, eventColors, habitDashboardStates } from "../../constants";
import { StandardButton } from "../../components/ui/StandardButton";
import { EventIcon } from "../../icons/EventIcon";
import { useDB } from "../../hooks/useDB";
import type { HabitDashboard, HabitDashboardRow } from "../../model/habit";
import { displayDate, today } from "../../utils/dates";
import { HabitJourney } from "../habits/HabitJourney";
import { WeeklyTimeToday } from "./WeeklyTimeToday";

interface HabitProgressCardProps {
  progress: HabitDashboard;
  onOpenHabits: (habitId?: string) => void;
  onAddHabit: () => void;
  onAddTime: (habitId: string) => void;
  onReviewSeries: (habitId: string, seriesId: string) => void;
}

/** Riunisce i percorsi in righe compatte; conserva diario e occasioni recenti nei dettagli espandibili. */
export function HabitProgressCard({ progress, onOpenHabits, onAddHabit, onAddTime, onReviewSeries }: HabitProgressCardProps) {
  const { weeklyTimeHabits } = useDB();
  const hasTimeHabits = weeklyTimeHabits.some(habit => !habit.archivedOn && habit.startsOn <= today() && !habit.series?.at(-1)?.decision);
  const empty = progress.totalHabits === 0 && !hasTimeHabits;
  return <section className="today-paths" aria-labelledby="today-progress-title">
    <header className="today-card-heading">
      <div><p className="eyebrow">Un passo alla volta</p><h3 id="today-progress-title">I tuoi percorsi</h3></div>
      <StandardButton variant="ghost" onClick={() => onOpenHabits()}>Vedi tutti i percorsi →</StandardButton>
    </header>
    {empty ? <div className="today-empty">
      <h4>{progress.milestonesReached ? "Tutte le serie a step sono concluse" : "Il tuo prossimo percorso parte da qui"}</h4>
      <p>Scegli un’abitudine e un traguardo alla tua portata.</p>
      <StandardButton onClick={onAddHabit}>Crea un’abitudine</StandardButton>
    </div> : <div className="today-path-list">
      {progress.rows.map(row => <article className="today-path-row" key={row.habit.id} style={{ "--event-color": eventColors[row.habit.color].value } as CSSProperties}>
        <div className="today-path-main">
          <div className="today-path-identity"><span className="today-path-icon"><EventIcon icon={row.habit.icon} /></span><div><p className="eyebrow">Serie a step</p><button className="today-habit-link" onClick={() => onOpenHabits(row.habit.id)}><strong>{row.habit.title}</strong></button></div></div>
          <HabitJourney progress={row.journey} compact />
          <StandardButton variant="secondary" onClick={() => onOpenHabits(row.habit.id)}>Apri percorso</StandardButton>
        </div>
        <details className="today-path-details"><summary>Ritmo recente</summary>
          <p className="editor-hint">Fino a {HABIT_DASHBOARD_OCCASIONS} occasioni · ultimi {HABIT_DASHBOARD_DAYS} giorni</p>
          <HabitRecentOutcomes row={row} />
          <ul className="today-progress-legend" aria-label="Legenda degli esiti">{Object.entries(habitDashboardStates).map(([state, { label, symbol }]) => <li key={state}><span className={`today-outcome-mark ${state}`} aria-hidden="true">{symbol}</span>{label}</li>)}</ul>
        </details>
      </article>)}
      <WeeklyTimeToday onAddTime={onAddTime} onOpenHabits={onOpenHabits} onReviewSeries={onReviewSeries} />
      {progress.totalHabits > progress.rows.length && <StandardButton variant="ghost" onClick={() => onOpenHabits()}>Vedi tutte le {progress.totalHabits} abitudini a step</StandardButton>}
    </div>}
    {!empty && <details className="today-progress-note"><summary>Come leggere i percorsi</summary><p>Fatto e Non fatto fanno avanzare le serie a step; gli eventi fatti restano un conteggio distinto. Le occasioni recenti sono ordinate dalla meno recente alla più recente, senza includere attività future senza esito. Dopo una modifica del piano, alcune occasioni passate senza esito potrebbero non essere disponibili. Le serie a ore mostrano il tempo registrato nel proprio periodo.</p></details>}
  </section>;
}

/** Rende accessibili data ed esito di ogni occasione, anche al focus da tastiera. */
function HabitRecentOutcomes({ row }: { row: HabitDashboardRow }) {
  const { habit, entries, counts } = row;
  const summary = [
    counts.completed && `${counts.completed} ${counts.completed === 1 ? "completata" : "completate"}`,
    counts.skipped && `${counts.skipped} ${counts.skipped === 1 ? "non fatta" : "non fatte"}`,
    counts.pending && `${counts.pending} senza esito`,
  ].filter(Boolean).join(" · ");
  return <div>
    {entries.length ? <>
      <ol className="today-outcome-strip" aria-label={`Occasioni recenti di ${habit.title}`}>{entries.map(entry => {
        const state = entry.outcome ?? "pending";
        const { label, symbol } = habitDashboardStates[state];
        const description = `${displayDate(entry.date, { day: "numeric", month: "short" })}${entry.start ? ` · ${entry.start}` : ""}: ${label}${entry.moved ? " · Spostata" : ""}${entry.removed ? " · Rimossa dal calendario" : ""}`;
        return <li key={`${entry.sourceId}@${entry.occurrenceDate}`}><span tabIndex={0} className={`today-outcome-mark ${state}`} aria-label={description}><span aria-hidden="true">{symbol}</span><span className="today-outcome-tooltip" aria-hidden="true">{description}</span></span></li>;
      })}</ol>
      <p className="today-progress-counts">{summary}</p>
    </> : <p className="today-progress-counts">Nessuna occasione trascorsa disponibile negli ultimi {HABIT_DASHBOARD_DAYS} giorni.</p>}
  </div>;
}
