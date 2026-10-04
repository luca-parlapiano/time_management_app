import { useLayoutEffect, useRef } from "react";
import type { Occurrence } from "../../model/calendar.js";
import { agendaTimePosition } from "../../utils/agendaTimeline.js";
import { toMinutes } from "../../utils/time.js";

interface AgendaTimeIndicatorProps {
  firstHour: number;
  lastHour: number;
  date: string;
  label: string;
  entries: Occurrence[];
}

/**
 * Sovrappone la linea dell'ora attuale alle schede della giornata indicata.
 * Misura le altezze effettive e aggiorna la posizione quando cambiano orario, eventi o layout.
 * Gli eventi notturni vengono limitati alla porzione visibile nella data civile corrente.
 */
export function AgendaTimeIndicator({ firstHour, lastHour, date, label, entries }: AgendaTimeIndicatorProps) {
  const indicator = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const line = indicator.current;
    const column = line?.parentElement;
    if (!line || !column) return;
    const cards = Array.from(column.querySelectorAll<HTMLElement>(":scope > .agenda-event"));
    const updatePosition = () => {
      const origin = column.getBoundingClientRect().top;
      const slots = cards.flatMap((card, index) => {
        const item = entries[index];
        if (!item) return [];
        const bounds = card.getBoundingClientRect();
        return [{ start: item.date < date ? 0 : toMinutes(item.start),
          end: item.endDate > date ? 1440 : toMinutes(item.end),
          top: bounds.top - origin, bottom: bounds.bottom - origin }];
      });
      line.style.top = `${agendaTimePosition(toMinutes(label), firstHour * 60, lastHour * 60, column.clientHeight, slots)}px`;
      line.style.visibility = "visible";
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(column);
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [date, entries, firstHour, label, lastHour]);
  return <div ref={indicator} className="current-time-indicator agenda-current-time-indicator" style={{ visibility: "hidden" }} aria-label={`Ora attuale ${label}`}>
    <time className="current-time-label" dateTime={`${date}T${label}`}>{label}</time>
  </div>;
}
