import { useCallback, useLayoutEffect, useState } from "react";
import { today, weekStart } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { useLoading } from "../../hooks/useLoading";
import type { Occurrence } from "../../model/calendar.js";
import { CalendarScreen } from "../../screens/calendar/CalendarScreen";
import { SettingsScreen } from "../../screens/settings/SettingsScreen";
import { StatisticsScreen } from "../../screens/statistics/StatisticsScreen";
import { HabitsScreen } from "../../screens/habits/HabitsScreen";
import { TodayScreen } from "../../screens/today/TodayScreen";
import { AppDialogs, type AppDialogState } from "./AppDialogs";
import { AppSidebar } from "./AppSidebar";
import { ScreenTabs, type ScreenId } from "./ScreenTabs";

/** Layout principale e solo stato condiviso tra più schermate. */
export function AppShell() {
  const { palette, saving } = useDB();
  const { isLoading } = useLoading();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.matchMedia("(min-width: 721px)").matches);
  const [activeScreen, setActiveScreen] = useState<ScreenId>("today");
  const [week, setWeek] = useState(() => weekStart(today()));
  const [dialog, setDialog] = useState<AppDialogState>(null);
  useLayoutEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  const openEditor = useCallback((date: string, occurrence?: Occurrence) => setDialog({ type: "editor", date, occurrence }), []);
  const openEvent = useCallback((item: Occurrence, confirmDelete = false) => setDialog({ type: "event", item, confirmDelete }), []);
  return (
    <div className={`app-shell drawer-layout${sidebarExpanded ? "" : " sidebar-collapsed"}`}>
      <AppSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((value) => !value)}
        onAddHabit={() => setDialog({ type: "habit" })}
        onOpenHabits={() => setActiveScreen("habits")}
      />
      <main className="calendar-panel">
        <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />
        {saving && isLoading() && <p role="status" className="database-save-status">Salvataggio…</p>}
        <TodayScreen active={activeScreen === "today"} onOpenEvent={openEvent} onOpenHabits={() => setActiveScreen("habits")} />
        <HabitsScreen active={activeScreen === "habits"} onAdd={() => setDialog({ type: "habit" })} />
        <CalendarScreen
          active={activeScreen === "calendar"}
          week={week}
          onWeekChange={setWeek}
          onOpenEditor={openEditor}
          onOpenEvent={openEvent}
        />
        <StatisticsScreen active={activeScreen === "statistics"} />
        <SettingsScreen active={activeScreen === "settings"} onOpenProfile={() => setDialog({ type: "preferences" })}
          onClearCalendar={() => setDialog({ type: "clear" })} onResetAll={() => setDialog({ type: "reset-all" })} />
      </main>
      <AppDialogs dialog={dialog} onChange={setDialog} />
    </div>
  );
}
