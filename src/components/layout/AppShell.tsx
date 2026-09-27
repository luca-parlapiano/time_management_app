import { useLayoutEffect, useState } from "react";
import { today, weekStart } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { useLoading } from "../../hooks/useLoading";
import type { Occurrence } from "../../model/calendar.js";
import { CalendarScreen } from "../../screens/calendar/CalendarScreen";
import { SettingsScreen } from "../../screens/settings/SettingsScreen";
import { StatisticsScreen } from "../../screens/statistics/StatisticsScreen";
import { AppDialogs, type AppDialogState } from "./AppDialogs";
import { AppSidebar } from "./AppSidebar";
import { ScreenTabs, type ScreenId } from "./ScreenTabs";

/** Layout principale e solo stato condiviso tra più schermate. */
export function AppShell() {
  const { palette, saving } = useDB();
  const { isLoading } = useLoading();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.matchMedia("(min-width: 721px)").matches);
  const [activeScreen, setActiveScreen] = useState<ScreenId>("calendar");
  const [week, setWeek] = useState(() => weekStart(today()));
  const [dialog, setDialog] = useState<AppDialogState>(null);
  useLayoutEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  const openEditor = (date: string, occurrence?: Occurrence) => setDialog({ type: "editor", date, occurrence });
  return (
    <div className={`app-shell drawer-layout${sidebarExpanded ? "" : " sidebar-collapsed"}`}>
      <AppSidebar
        expanded={sidebarExpanded}
        week={week}
        onToggle={() => setSidebarExpanded((value) => !value)}
        onAdd={() => openEditor(week === weekStart(today()) ? today() : week)}
        onOpenPreferences={() => setDialog({ type: "preferences" })}
        onClear={() => setDialog({ type: "clear" })}
      />
      <main className="calendar-panel">
        <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />
        {saving && isLoading() && <p role="status" className="database-save-status">Salvataggio…</p>}
        <CalendarScreen
          active={activeScreen === "calendar"}
          week={week}
          onWeekChange={setWeek}
          onOpenEditor={openEditor}
          onOpenEvent={(item, confirmDelete) => setDialog({ type: "event", item, confirmDelete })}
        />
        <StatisticsScreen active={activeScreen === "statistics"} />
        <SettingsScreen active={activeScreen === "settings"} />
      </main>
      <AppDialogs dialog={dialog} onChange={setDialog} />
    </div>
  );
}
