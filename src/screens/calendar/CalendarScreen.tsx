import type { TimeSession } from "../../model/weeklyTime";
import { CalendarTimeDay } from "./CalendarTimeDay";
import { useCallback, useState } from "react";
import { StandardButton } from "../../components/ui/StandardButton";
import { addDays, displayDate, today, weekStart } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import type { Occurrence } from "../../model/calendar.js";
import { WeeklyCalendar } from "./WeeklyCalendar";

interface CalendarScreenProps {
  active: boolean;
  onAddTime: (habitId?: string, session?: TimeSession) => void;
  week: string;
  onWeekChange: (week: string) => void;
  onOpenEditor: (date: string, occurrence?: Occurrence, initialKind?: "fixed") => void;
  onOpenEvent: (item: Occurrence, confirmDelete: boolean) => void;
}

/** Schermata settimanale del calendario e relativi comandi di navigazione. */
export function CalendarScreen({ active, week, onWeekChange, onOpenEditor, onOpenEvent, onAddTime }: CalendarScreenProps) {
  const { state, saving, recordOutcome, weeklyTimeHabits } = useDB();
  const [view, setView] = useState<"agenda" | "timeline">("agenda");
  const addItem = useCallback((date: string) => onOpenEditor(date, undefined, "fixed"), [onOpenEditor]);
  const openItem = useCallback((item: Occurrence) => onOpenEvent(item, false), [onOpenEvent]);
  return (
    <section id="panel-calendar" className="app-screen" role="tabpanel" aria-labelledby="tab-calendar" tabIndex={0} hidden={!active}>
      <header className="calendar-header">
        <div>
          <p className="eyebrow">Vista settimanale</p>
          <h2>Calendario</h2>
          <p aria-live="polite">{displayDate(week, { year: "numeric" })} – {displayDate(addDays(week, 6), { year: "numeric" })}</p>
        </div>
        <div className="calendar-header-actions">
          <div className="calendar-view-switch" role="group" aria-label="Vista calendario">
            <StandardButton variant="ghost" aria-pressed={view === "agenda"} onClick={() => setView("agenda")}>Agenda</StandardButton>
            <StandardButton variant="ghost" aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>Griglia oraria</StandardButton>
          </div>
          <nav className="week-navigation" aria-label="Navigazione settimane">
            <StandardButton variant="secondary" aria-label="Settimana precedente" onClick={() => onWeekChange(addDays(week, -7))}>← Precedente</StandardButton>
            <StandardButton variant="secondary" onClick={() => onWeekChange(weekStart(today()))}>Oggi</StandardButton>
            <StandardButton variant="secondary" aria-label="Settimana successiva" onClick={() => onWeekChange(addDays(week, 7))}>Successiva →</StandardButton>
          </nav>
        </div>
      </header>
      <div className="screen-content calendar-screen-content">
        <WeeklyCalendar
          view={view}
          state={state}
          week={week}
          disabled={saving}
          onAdd={addItem}
          onEdit={openItem}
          onOutcome={recordOutcome}
          renderTime={weeklyTimeHabits.length ? date => <CalendarTimeDay date={date} onAddTime={onAddTime} /> : undefined}
        />
      </div>
    </section>
  );
}
