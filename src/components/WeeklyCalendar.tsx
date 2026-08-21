import { useMemo } from "react";
import { weekdayLabels } from "../planner/defaults";
import type { Weekday, WeeklyPlan } from "../planner/contracts";
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
}

export function WeeklyCalendar({ plan }: WeeklyCalendarProps) {
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
            {blocksByDay[day.key].map((block) => (
                  <div
                    key={block.id}
                    className="plan-block"
                    style={{ borderColor: block.color, backgroundColor: `${block.color}20` }}
                  >
                    <div className="plan-block-top">
                      <strong>{block.title}</strong>
                      <span>{formatTimeRange(block.start, block.end)}</span>
                    </div>
                    <p>{block.rationale}</p>
                  </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
