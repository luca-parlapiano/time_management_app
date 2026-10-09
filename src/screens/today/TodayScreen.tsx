import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { eventAppearance, eventColors, today, todayOccurrences } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { useLocalMinute } from "../../hooks/useLocalMinute";
import { EventIcon } from "../../icons/EventIcon";
import type { ItemOutcome, Occurrence } from "../../model/calendar.js";
import { StandardButton } from "../../components/ui/StandardButton";
import { HabitJourney } from "../habits/HabitJourney";
import { HabitProgressCard } from "./HabitProgressCard";
import { toMinutes, toTime } from "../../utils/time";

interface TodayScreenProps { active: boolean; onOpenEvent: (item: Occurrence) => void; onOpenHabits: (habitId?: string) => void; onAddHabit: () => void }

/** Dashboard operativa della giornata corrente. */
export function TodayScreen({ active, onOpenEvent, onOpenHabits, onAddHabit }: TodayScreenProps) {
  const { state, habits, saving, recordOutcome, getHabitDashboard, getHabitProgress } = useDB();
  const [outcomeError, setOutcomeError] = useState<{ id: string; message: string } | null>(null);
  const now = useLocalMinute();
  const date = today();
  const events = todayOccurrences(state.items, date);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const time = toTime(minutes);
  const progress = useMemo(() => getHabitDashboard(date, time), [getHabitDashboard, date, time]);
  const next = events.find(item => !item.outcome && toMinutes(item.start) >= minutes);
  const setOutcome = async (item: Occurrence, outcome: ItemOutcome) => {
    try {
      await recordOutcome(item, outcome);
      setOutcomeError(null);
    } catch (cause) {
      setOutcomeError({ id: item.id, message: cause instanceof Error ? cause.message : "Impossibile registrare l'esito." });
    }
  };
  return (
    <section id="panel-today" className="app-screen" role="tabpanel" aria-labelledby="tab-today" tabIndex={0} hidden={!active}>
      <div className="screen-content today-screen-content">
        {next && <section className="today-next" aria-labelledby="today-next-title"><p className="eyebrow">Prossimo passo</p><h3 id="today-next-title">{next.title}</h3><p>{next.start}–{next.end}{next.habitId ? " · Abitudine" : next.routine ? " · Routine" : ""}</p></section>}
        <div className="today-columns">
        <section className="today-card today-agenda" aria-labelledby="today-agenda-title">
        <header className="today-card-heading"><div><p className="eyebrow">Il piano di oggi</p><h3 id="today-agenda-title">La tua giornata</h3></div><StandardButton variant="ghost" onClick={() => onOpenHabits()}>Abitudini</StandardButton></header>
        {events.length === 0 ? <div className="today-empty"><h3>Nessuna attività da seguire</h3><p>Qui compaiono abitudini e routine. Gli appuntamenti fissi restano nel Calendario.</p></div> : <ol className="today-timeline">
          {events.map(item => {
            const appearance = eventAppearance(item);
            const habit = habits.find(entry => entry.id === item.habitId);
            return <li key={item.id} className={`today-event${item.outcome ? " has-outcome" : ""}`} style={{ "--event-color": eventColors[appearance.color].value } as CSSProperties}>
              <time>{item.start}</time><span className="today-node" aria-hidden="true" />
              <article><button type="button" className="today-event-open" onClick={() => onOpenEvent(item)}><span className="today-event-icon"><EventIcon icon={appearance.icon} /></span><span><strong>{item.title}</strong><small>{item.start}–{item.end}{item.habitId ? " · Abitudine" : item.routine ? " · Routine" : ""}</small></span></button>
                {habit && <HabitJourney progress={getHabitProgress(habit.id)} compact />}
                <div className="today-outcomes" role="group" aria-label={`Esito ${item.title}`}>
                  <button disabled={saving} aria-pressed={item.outcome === "completed"} onClick={() => void setOutcome(item, "completed")}>Fatto</button>
                  <button disabled={saving} aria-pressed={item.outcome === "skipped"} onClick={() => void setOutcome(item, "skipped")}>Non fatto</button>
                </div>
                {outcomeError?.id === item.id && <p role="alert" className="capacity-warning">{outcomeError.message}</p>}
              </article>
            </li>;
          })}
        </ol>}
        </section>
        <HabitProgressCard progress={progress} onOpenHabits={id => onOpenHabits(id ?? (progress.totalHabits === 0 ? habits[0]?.id : undefined))} onAddHabit={onAddHabit} />
        </div>
      </div>
    </section>
  );
}
