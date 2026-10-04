import type { CSSProperties } from "react";
import { useState } from "react";
import { appearsOnTodayScreen, eventAppearance, eventColors, occurrences, today } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { useLocalMinute } from "../../hooks/useLocalMinute";
import { EventIcon } from "../../icons/EventIcon";
import type { ItemOutcome, Occurrence } from "../../model/calendar.js";
import { StandardButton } from "../../components/ui/StandardButton";
import { habitJourneyProgress } from "../../domain/habitTimeline";
import { HabitJourney } from "../habits/HabitJourney";

interface TodayScreenProps { active: boolean; onOpenEvent: (item: Occurrence) => void; onOpenHabits: () => void }

/** Dashboard operativa della giornata corrente. */
export function TodayScreen({ active, onOpenEvent, onOpenHabits }: TodayScreenProps) {
  const { state, habits, archive, saving, recordOutcome } = useDB();
  const [outcomeError, setOutcomeError] = useState<{ id: string; message: string } | null>(null);
  const now = useLocalMinute();
  const date = today();
  const events = occurrences(state.items, date, date).filter(item => item.date === date && appearsOnTodayScreen(item));
  const minutes = now.getHours() * 60 + now.getMinutes();
  const next = events.find(item => !item.outcome && Number(item.start.slice(0, 2)) * 60 + Number(item.start.slice(3)) >= minutes);
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
        <div className="today-heading"><h3>La tua giornata</h3><StandardButton variant="ghost" onClick={onOpenHabits}>Segui le abitudini</StandardButton></div>
        {events.length === 0 ? <div className="today-empty"><h3>Nessuna attività da seguire</h3><p>Qui compaiono abitudini e routine. Gli appuntamenti fissi restano nel Calendario.</p></div> : <ol className="today-timeline">
          {events.map(item => {
            const appearance = eventAppearance(item);
            const habit = habits.find(entry => entry.id === item.habitId);
            return <li key={item.id} className={`today-event${item.outcome ? " has-outcome" : ""}`} style={{ "--event-color": eventColors[appearance.color].value } as CSSProperties}>
              <time>{item.start}</time><span className="today-node" aria-hidden="true" />
              <article><button type="button" className="today-event-open" onClick={() => onOpenEvent(item)}><span className="today-event-icon"><EventIcon icon={appearance.icon} /></span><span><strong>{item.title}</strong><small>{item.start}–{item.end}{item.habitId ? " · Abitudine" : item.routine ? " · Routine" : ""}</small></span></button>
                {habit && <HabitJourney progress={habitJourneyProgress(archive.history, habit)} compact />}
                <div className="today-outcomes" role="group" aria-label={`Esito ${item.title}`}>
                  <button disabled={saving} aria-pressed={item.outcome === "completed"} onClick={() => void setOutcome(item, "completed")}>Fatto</button>
                  <button disabled={saving} aria-pressed={item.outcome === "partial"} onClick={() => void setOutcome(item, "partial")}>Parziale</button>
                  <button disabled={saving} aria-pressed={item.outcome === "skipped"} onClick={() => void setOutcome(item, "skipped")}>Non fatto</button>
                </div>
                {outcomeError?.id === item.id && <p role="alert" className="capacity-warning">{outcomeError.message}</p>}
              </article>
            </li>;
          })}
        </ol>}
      </div>
    </section>
  );
}
