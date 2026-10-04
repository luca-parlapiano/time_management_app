import { percentage } from "../../utils/math.js";
import { toMinutes as minutes, toTime } from "../../utils/time.js";
import { buildCalendarTimeline, calendarTimelineOffset } from "../../utils/calendarTimeline.js";
import type { CSSProperties } from "react";
import { memo, useEffect, useState } from "react";
import { addDays, displayDate, occurrences, today } from "../../domain/calendar";
import type { CalendarState, ItemOutcome, Occurrence } from "../../model/calendar.js";
import { AgendaEventCard } from "./AgendaEventCard";
import { AgendaTimeIndicator } from "./AgendaTimeIndicator";
import { StandardButton } from "../../components/ui/StandardButton";

interface WeeklyCalendarProps {
  view: "agenda" | "timeline";
  state: CalendarState;
  week: string;
  disabled?: boolean;
  onAdd: (date: string) => void;
  onEdit: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
}

interface CurrentTimeIndicator {
  date: string;
  firstHour: number;
  lastHour: number;
  label: string;
}

/** Aggiorna ogni minuto la posizione dell’ora locale e amplia la fascia visibile quando necessario. */
function useCurrentTimeIndicator(days: string[], initialFirstHour: number, initialLastHour: number): CurrentTimeIndicator {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const date = today();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const label = toTime(currentMinutes);
  if (!days.includes(date)) return { date, firstHour: initialFirstHour, lastHour: initialLastHour, label };
  const firstHour = Math.min(initialFirstHour, Math.floor(currentMinutes / 60));
  const lastHour = Math.max(initialLastHour, Math.min(24, Math.floor(currentMinutes / 60) + 1));
  return { date, firstHour, lastHour, label };
}

function WeeklyCalendarContent({ state, week, view, disabled, onAdd, onEdit, onOutcome }: WeeklyCalendarProps) {
  const visible = occurrences(state.items, week, addDays(week, 6));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const dayEntries = days.map(date => visible.filter(item => item.date <= date && (item.endDate > date || (item.endDate === date && item.end > "00:00"))));
  let firstHour = 8;
  let lastHour = 20;
  dayEntries.forEach((entries, index) => entries.forEach(item => {
    firstHour = Math.min(firstHour, item.date < days[index] ? 0 : Math.floor(minutes(item.start) / 60));
    lastHour = Math.max(lastHour, item.endDate > days[index] ? 24 : Math.ceil(minutes(item.end) / 60));
  }));
  const currentTime = useCurrentTimeIndicator(days, firstHour, lastHour);
  firstHour = currentTime.firstHour;
  lastHour = currentTime.lastHour;
  const timeline = buildCalendarTimeline(firstHour * 60, lastHour * 60, dayEntries.flatMap((entries, index) => entries.map(item => ({
    start: item.date < days[index] ? 0 : minutes(item.start),
    end: item.endDate > days[index] ? 1440 : minutes(item.end),
  }))));
  const timelinePercent = (minute: number) => percentage(calendarTimelineOffset(minute, timeline), timeline.height);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const agenda = view === "agenda";
  return <section className={`calendar-grid ${agenda ? "weekly-agenda" : "continuous-calendar hourly-calendar"}`} aria-label={agenda ? "Agenda settimanale" : "Calendario settimanale"} style={{ "--timeline-min-height": `${timeline.height}px` } as CSSProperties}>
    {!agenda && <aside className="calendar-time-column" aria-label="Orari">
      <header className="day-header">Orari</header>
      <div className="time-timeline">
        {hours.map(hour => <span key={hour} className="calendar-hour" style={{ top: `${timelinePercent(hour * 60)}%` }}>{String(hour).padStart(2, "0")}:00</span>)}
      </div>
    </aside>}
    {days.map((date, dayIndex) => {
      const entries = dayEntries[dayIndex];
      return <article key={date} className={`day-column ${date === currentTime.date ? "day-today" : ""}`}>
        <header className="day-header"><time dateTime={date}>{displayDate(date, { weekday: "short", day: "numeric", month: undefined })}</time><small>{date === currentTime.date ? "Oggi" : "\u00a0"}</small>
          <StandardButton variant="ghost" disabled={disabled} type="button" className="day-add" aria-label={`Nuovo appuntamento fisso il ${date}`} onClick={() => onAdd(date)} title="Nuovo appuntamento fisso">+</StandardButton>
        </header>
        <div className={`day-blocks${agenda ? "" : " day-timeline"}`}>
          {!agenda && hours.map(hour => <span key={hour} className="calendar-hour-line" aria-hidden="true" style={{ top: `${timelinePercent(hour * 60)}%` }} />)}
          {agenda && <span className="agenda-range-boundary" aria-label={`Inizio fascia ${toTime(firstHour * 60)}`}>{toTime(firstHour * 60)}</span>}
          {entries.length === 0 && <p className="day-empty">Nessun elemento</p>}
          {agenda && date === currentTime.date && <AgendaTimeIndicator firstHour={firstHour} lastHour={lastHour} date={date} label={currentTime.label} entries={entries} />}
          {!agenda && date === currentTime.date && <div className="current-time-indicator" style={{ top: `${timelinePercent(minutes(currentTime.label))}%` }}>
            <time className="current-time-label" dateTime={currentTime.label}>{currentTime.label}</time>
          </div>}
          {entries.map(item => {
            const start = item.date < date ? 0 : minutes(item.start);
            const end = item.endDate > date ? 1440 : minutes(item.end);
            return <AgendaEventCard key={item.id} item={item} date={date} disabled={disabled}
              layout={view}
              top={agenda ? undefined : `${timelinePercent(start)}%`}
              height={agenda ? undefined : `calc(${timelinePercent(end) - timelinePercent(start)}% - 4px)`}
              onOpen={onEdit} onOutcome={onOutcome} />;
          })}
          {agenda && <span className="agenda-range-boundary" aria-label={`Fine fascia ${lastHour === 24 ? "24:00" : toTime(lastHour * 60)}`}>{lastHour === 24 ? "24:00" : toTime(lastHour * 60)}</span>}
        </div>
      </article>;
    })}
  </section>;
}

/** Mantiene la settimana già calcolata durante i cambi di sezione non pertinenti. */
export const WeeklyCalendar = memo(WeeklyCalendarContent);
