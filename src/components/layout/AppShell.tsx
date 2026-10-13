import { useCallback, useLayoutEffect, useState } from "react";
import { today, weekStart } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { useLoading } from "../../hooks/useLoading";
import type { ItemKind, Occurrence } from "../../model/calendar.js";
import { CalendarScreen } from "../../screens/calendar/CalendarScreen";
import { SettingsScreen } from "../../screens/settings/SettingsScreen";
import { TrophiesScreen } from "../../screens/trophies/TrophiesScreen";
import { StatisticsScreen } from "../../screens/statistics/StatisticsScreen";
import { HabitsScreen } from "../../screens/habits/HabitsScreen";
import { TodayScreen } from "../../screens/today/TodayScreen";
import { AppHeader } from "./AppHeader";
import { AppDialogs, type AppDialogState } from "./AppDialogs";
import { AppSidebar } from "./AppSidebar";
import { ScreenTabs, type ScreenId } from "./ScreenTabs";
import { TimeSeriesNotifications } from "../../screens/habits/TimeSeriesConclusion";

/** Layout principale e solo stato condiviso tra più schermate. */
export function AppShell() {
  const { palette, saving, weeklyTimeHabits } = useDB();
  const { isLoading } = useLoading();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.matchMedia("(min-width: 721px)").matches);
  const [activeScreen, setActiveScreen] = useState<ScreenId>("today");
  const [selectedHabitId, setSelectedHabitId] = useState<string>();
  const [week, setWeek] = useState(() => weekStart(today()));
  const [dialog, setDialog] = useState<AppDialogState>(null);
  useLayoutEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  const openEditor = useCallback((date: string, occurrence?: Occurrence, initialKind?: ItemKind) => setDialog({ type: "editor", date, occurrence, initialKind }), []);
  const reviewTimeSeries = (habitId: string, seriesId: string) => setDialog({ type: "time-series", habitId, seriesId });
  const openEvent = useCallback((item: Occurrence, confirmDelete = false) => setDialog({ type: "event", item, confirmDelete }), []);
  const openHabits = useCallback((habitId?: string) => {
    if (habitId) setSelectedHabitId(habitId);
    setActiveScreen("habits");
  }, []);
  const showSavedHabit = useCallback((firstOccurrenceDate: string) => {
    setWeek(weekStart(firstOccurrenceDate));
    setActiveScreen("calendar");
    setDialog(null);
  }, []);
  return (
    <div className={`app-shell drawer-layout${sidebarExpanded ? "" : " sidebar-collapsed"}`}>
      <AppSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((value) => !value)}
        onAddHabit={() => setDialog({ type: "create" })}
        onOpenHabits={openHabits}
      />
      <main className="calendar-panel">
        <AppHeader activeScreen={activeScreen} onCreate={() => setDialog({ type: "create" })} />
        <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />
        {saving && isLoading() && <p role="status" className="database-save-status">Salvataggio…</p>}
        <TodayScreen onReviewSeries={reviewTimeSeries} active={activeScreen === "today"} onOpenEvent={openEvent} onOpenHabits={openHabits} onAddHabit={() => setDialog({ type: "create" })} onAddTime={habitId => setDialog({ type: "time-session", habitId })} />
        <HabitsScreen active={activeScreen === "habits"} selectedHabitId={selectedHabitId} onSelectHabit={setSelectedHabitId} onAdd={() => setDialog({ type: "create" })} onEdit={habitId => setDialog({ type: "habit", habitId })} onRepeat={habitId => setDialog({ type: "habit", habitId, repeat: true })}
          onEditWeekly={habitId => setDialog({ type: "weekly-habit", habitId })}
          onReviewSeries={reviewTimeSeries}
          onAddTime={(habitId, session) => setDialog({ type: "time-session", habitId, session })}
          onPlanTime={habitId => setDialog({ type: "editor", weeklyHabitId: habitId, date: [today(), weeklyTimeHabits.find(habit => habit.id === habitId)?.startsOn ?? today()].sort().at(-1)! })} />
        <CalendarScreen
          onReviewSeries={reviewTimeSeries}
          active={activeScreen === "calendar"}
          week={week}
          onWeekChange={setWeek}
          onOpenEditor={openEditor}
          onOpenEvent={openEvent}
          onAddTime={(habitId, session) => setDialog({ type: "time-session", habitId, session })}
        />
        <StatisticsScreen active={activeScreen === "statistics"} />
        <TrophiesScreen active={activeScreen === "trophies"} />
        <SettingsScreen active={activeScreen === "settings"} onOpenProfile={() => setDialog({ type: "preferences" })}
          onClearCalendar={() => setDialog({ type: "clear" })} onResetAll={() => setDialog({ type: "reset-all" })} />
      </main>
      <AppDialogs dialog={dialog} onChange={setDialog} onHabitSaved={showSavedHabit} onWeeklyHabitSaved={id => { setDialog(null); openHabits(id); }} />
      <TimeSeriesNotifications enabled={!dialog} />
    </div>
  );
}
