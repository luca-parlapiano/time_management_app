import { useMemo, useState } from "react";
import { weekdayLabels } from "../planner/defaults";
import type { ActivityEvent, ActivityOutcome, Weekday, WeeklyPlan } from "../domain/planning";
import { formatTimeRange } from "../utils/time";

function groupBlocksByDay(plan: WeeklyPlan) {
  return weekdayLabels.reduce<Record<Weekday, WeeklyPlan["blocks"]>>((acc, day) => {
    acc[day.key] = plan.blocks
      .filter((block) => block.day === day.key)
      .sort((left, right) => left.start.localeCompare(right.start));
    return acc;
  }, {} as Record<Weekday, WeeklyPlan["blocks"]>);
}

interface WeeklyCalendarProps {
  plan?: WeeklyPlan;
  blockEvents?: Record<string, ActivityEvent>;
  onRecordBlockEvent?: (blockId: string, outcome: ActivityOutcome) => void;
}

const outcomeLabels: Record<ActivityOutcome, string> = {
  completed: "Completato",
  skipped: "Saltato",
  "not-needed": "Non necessario",
};

export function WeeklyCalendar({ plan, blockEvents = {}, onRecordBlockEvent }: WeeklyCalendarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const blocksByDay = useMemo(() => {
    if (!plan) {
      return weekdayLabels.reduce<Record<Weekday, WeeklyPlan["blocks"]>>((acc, day) => {
        acc[day.key] = [];
        return acc;
      }, {} as Record<Weekday, WeeklyPlan["blocks"]>);
    }

    return groupBlocksByDay(plan);
  }, [plan]);

  return (
    <section className="calendar-grid">
      {weekdayLabels.map((day) => (
        <article key={day.key} className="day-column">
          <header className="day-header">
            <span>{day.label}</span>
          </header>
          <div className="day-blocks">
            {blocksByDay[day.key].map((block) => {
              const event = blockEvents[block.id];
              const canRecordOutcome = block.kind === "focus" && onRecordBlockEvent;
              const menuIsOpen = openMenuId === block.id;

              const recordOutcome = (outcome: ActivityOutcome) => {
                onRecordBlockEvent?.(block.id, outcome);
                setOpenMenuId(null);
              };

              return (
                <div
                  key={block.id}
                  className="plan-block"
                  style={{ borderColor: block.color, backgroundColor: `${block.color}20` }}
                >
                  <div className="plan-block-top">
                    <div>
                      <strong>{block.title}</strong>
                      <span>{formatTimeRange(block.start, block.end)}</span>
                    </div>
                    {canRecordOutcome ? (
                      <button
                        aria-expanded={menuIsOpen}
                        aria-label={`Apri azioni per ${block.title}`}
                        className="plan-block-menu-button"
                        onClick={() => setOpenMenuId(menuIsOpen ? null : block.id)}
                        type="button"
                      >
                        Azioni
                      </button>
                    ) : null}
                  </div>
                  <p>{block.rationale}</p>
                  {event ? <span className={`block-outcome outcome-${event.outcome}`}>{outcomeLabels[event.outcome]}</span> : null}
                  {canRecordOutcome && menuIsOpen ? (
                    <div className="plan-block-actions">
                      <button type="button" onClick={() => recordOutcome("completed")}>
                        Segna come completato
                      </button>
                      <button type="button" onClick={() => recordOutcome("skipped")}>
                        Ho saltato questo blocco
                      </button>
                      <button type="button" onClick={() => recordOutcome("not-needed")}>
                        Questo elemento non mi serve
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
