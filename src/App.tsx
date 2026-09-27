import { AppIcon } from "./icons/AppIcon";
import { WeeklyDoughnut } from "./components/statistics/WeeklyDoughnut";
import { RoundButton } from "./components/ui/RoundButton";
import { StandardButton } from "./components/ui/StandardButton";
import type { CSSProperties } from "react";
import { useLayoutEffect, useState } from "react";
import { ArchiveSettings } from "./components/settings/ArchiveSettings";
import { CalendarDialog } from "./components/ui/CalendarDialog";
import { CalendarEventMenu } from "./components/calendar/CalendarEventMenu";
import { CalendarItemEditor } from "./components/calendar/CalendarItemEditor";
import { CalendarPreferences } from "./components/settings/CalendarPreferences";
import { CalendarStatistics } from "./components/statistics/CalendarStatistics";
import { EventIcon } from "./icons/EventIcon";
import { PalettePicker } from "./components/settings/PalettePicker";
import { WeeklyCalendar } from "./components/calendar/WeeklyCalendar";
import {
  addDays,
  displayDate,
  eventAppearance,
  eventColors,
  today,
  weekStart,
} from "./domain/calendar";
import { useDB } from "./hooks/useDB";
import { useLoading } from "./hooks/useLoading";
import type { Occurrence } from "./model/calendar.js";

type AppTab = "calendar" | "statistics" | "settings";
interface CalendarEditorState { date: string; occurrence?: Occurrence }

function AppContent() {
  const {
    getWeeklyActivities,
    palette,
    paletteError: paletteSaveError,
    changePalette,
    state,
    archive,
    saving,
    recordOutcome,
    saveItem,
    deleteItem: removeItem,
    savePreferences,
    clearCalendar: clearAll,
  } = useDB();
  const { isLoading } = useLoading();
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => window.matchMedia("(min-width: 721px)").matches,
  );
  const [activeTab, setActiveTab] = useState<AppTab>("calendar");
  const [week, setWeek] = useState(() => weekStart(today()));
  const [eventMenuDelete, setEventMenuDelete] = useState(false);
  const [eventMenu, setEventMenu] = useState<Occurrence | null>(null);
  const [editor, setEditor] = useState<CalendarEditorState | null>(null);
  const [preferences, setPreferences] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearUnlocked, setClearUnlocked] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  const hasConstraints = state.items.some((item) => item.kind !== "flexible");
  const disabled = saving;
  const activities = getWeeklyActivities(week);
  return (
    <div
      className={`app-shell drawer-layout${sidebarExpanded ? "" : " sidebar-collapsed"}`}
    >
      <aside
        id="sidebar-drawer"
        className="hero-panel"
        aria-label="Barra laterale"
      >
        <RoundButton
          variant="secondary"
          className="sidebar-toggle"
          icon={sidebarExpanded ? "sidebar-close" : "sidebar-open"}
          iconSize={24}
          label={sidebarExpanded ? "Riduci barra laterale" : "Espandi barra laterale"}
          aria-expanded={sidebarExpanded}
          aria-controls="sidebar-drawer"
          onClick={() => setSidebarExpanded((value) => !value)}
        />
        <div className="sidebar-intro" hidden={!sidebarExpanded}>
          <p className="eyebrow">Il tuo tempo, in locale</p>
          <h1>Spazio alle tue giornate.</h1>
          <p className="hero-copy">
            Attività, impegni e tempo per te. Un calendario continuo, pronto da
            usare.
          </p>
        </div>
        <div
          className="hero-icon-actions"
          role="group"
          aria-label="Azioni calendario"
        >
          <RoundButton
            variant="primary"
            icon="add"
            iconSize={26}
            label="Aggiungi attività"
            disabled={disabled}
            onClick={() =>
              setEditor({ date: week === weekStart(today()) ? today() : week })
            }
          />
          <RoundButton
            variant="secondary"
            icon="profile"
            label="Profilo"
            disabled={disabled}
            onClick={() => setPreferences(true)}
          />
          <RoundButton
            variant="ghost"
            icon="trash"
            label="Svuota calendario"
            disabled={disabled || state.items.length === 0}
            onClick={() => {
              setClearUnlocked(false);
              setError("");
              setClearing(true);
            }}
          />
        </div>
        <section
          className="sidebar-activities"
          aria-labelledby="sidebar-activities-title"
        >
          <h2
            id="sidebar-activities-title"
            className={sidebarExpanded ? undefined : "sr-only"}
          >
            Le tue statistiche settimanali
          </h2>
          <p className="sidebar-weekly-range" hidden={!sidebarExpanded}>
            {displayDate(week)} – {displayDate(addDays(week, 6))}
          </p>
          {activities.length === 0 ? (
            <p className="summary-empty-copy" hidden={!sidebarExpanded}>
              Nessuna attività creata. Usa + per aggiungerne una.
            </p>
          ) : (
            <ul className="sidebar-activity-list">
              {activities.map(({ event: item, statistics }) => {
                const appearance = eventAppearance(item);
                return (
                  <li
                    key={item.activityId ?? item.id}
                    className="sidebar-activity"
                    title={`${item.title}: ${statistics.completed} superate, ${statistics.skipped} non superate, ${statistics.partial} parziali, ${statistics.pending} senza esito`}
                    tabIndex={sidebarExpanded ? undefined : 0}
                    style={
                      {
                        "--event-color": eventColors[appearance.color].value,
                      } as CSSProperties
                    }
                  >
                    <span className="sidebar-activity-icon">
                      <EventIcon icon={appearance.icon} />
                    </span>
                    <span
                      className={
                        sidebarExpanded ? "sidebar-activity-title" : "sr-only"
                      }
                    >
                      {item.title}
                    </span>
                    {sidebarExpanded && (
                      <WeeklyDoughnut
                        title={item.title}
                        statistics={statistics}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
      <main className="calendar-panel">
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Sezioni principali"
        >
          {(
            [
              { id: "calendar", label: "Calendario" },
              { id: "statistics", label: "Statistiche" },
              { id: "settings", label: "Impostazioni" },
            ] as const
          ).map((tab, index, tabs) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className="workspace-tab"
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? tabs[0]
                    : event.key === "End"
                      ? tabs[tabs.length - 1]
                      : tabs[
                          (index +
                            (event.key === "ArrowLeft" ? -1 : 1) +
                            tabs.length) %
                            tabs.length
                        ];
                setActiveTab(next.id);
                document.getElementById(`tab-${next.id}`)?.focus();
              }}
            >
              <AppIcon name={tab.id} />
              {tab.label}
            </button>
          ))}
        </div>
        <header className="calendar-header">
          <div>
            <p className="eyebrow">
              {activeTab === "settings"
                ? "Personalizza la tua app"
                : activeTab === "statistics"
                  ? "Vista annuale"
                  : "Vista settimanale"}
            </p>
            <h2>
              {activeTab === "calendar"
                ? "Calendario"
                : activeTab === "statistics"
                  ? "Statistiche"
                  : "Impostazioni"}
            </h2>
            {activeTab === "calendar" && (
              <p aria-live="polite">
                {displayDate(week, { year: "numeric" })} –{" "}
                {displayDate(addDays(week, 6), { year: "numeric" })}
              </p>
            )}
          </div>
          {activeTab === "calendar" && (
            <nav className="week-navigation" aria-label="Navigazione settimane">
              <StandardButton
                variant="secondary"
                aria-label="Settimana precedente"
                onClick={() => setWeek(addDays(week, -7))}
              >
                ← Precedente
              </StandardButton>
              <StandardButton
                variant="secondary"
                onClick={() => setWeek(weekStart(today()))}
              >
                Oggi
              </StandardButton>
              <StandardButton
                variant="secondary"
                aria-label="Settimana successiva"
                onClick={() => setWeek(addDays(week, 7))}
              >
                Successiva →
              </StandardButton>
            </nav>
          )}
        </header>
        {saving && isLoading() && (
          <p role="status" className="database-save-status">
            Salvataggio…
          </p>
        )}
        {error && !clearing && (
          <p role="alert" className="capacity-warning">
            {error}
          </p>
        )}
        <section
          id="panel-calendar"
          role="tabpanel"
          aria-labelledby="tab-calendar"
          tabIndex={0}
          hidden={activeTab !== "calendar"}
        >
          <WeeklyCalendar
            state={state}
            week={week}
            disabled={disabled}
            onAdd={(date) => setEditor({ date })}
            onEdit={(item) => {
              setEventMenuDelete(false);
              setEventMenu(item);
            }}
            onDelete={(item) => {
              setEventMenuDelete(true);
              setEventMenu(item);
            }}
            onOutcome={recordOutcome}
          />
        </section>
        <section
          id="panel-statistics"
          role="tabpanel"
          aria-labelledby="tab-statistics"
          tabIndex={0}
          hidden={activeTab !== "statistics"}
        >
          <CalendarStatistics state={state} history={archive.history} />
        </section>
        <section
          id="panel-settings"
          role="tabpanel"
          aria-labelledby="tab-settings"
          tabIndex={0}
          hidden={activeTab !== "settings"}
        >
          <PalettePicker
            value={palette}
            onChange={changePalette}
            saveError={paletteSaveError}
          />
          <ArchiveSettings />
        </section>
      </main>
      {eventMenu && (
        <CalendarEventMenu
          initialConfirmDelete={eventMenuDelete}
          item={eventMenu}
          onClose={() => setEventMenu(null)}
          onEdit={() => {
            setEditor({ date: eventMenu.date, occurrence: eventMenu });
            setEventMenu(null);
          }}
          onOutcome={async (outcome) => {
            await recordOutcome(eventMenu, outcome);
            setEventMenu(null);
          }}
          onDelete={async () => {
            await removeItem(
              {
                sourceId: eventMenu.sourceId,
                occurrenceDate: eventMenu.occurrenceDate,
                scope: "occurrence",
              },
              true,
            );
            setEventMenu(null);
          }}
        />
      )}
      {editor && (
        <CalendarItemEditor
          items={state.items}
          date={editor.date}
          occurrence={editor.occurrence}
          item={state.items.find(
            (item) => item.id === editor.occurrence?.sourceId,
          )}
          onClose={() => setEditor(null)}
          onSave={async (item, unlocked, target, weekdays) => {
            await saveItem(item, unlocked, target, weekdays);
            setEditor(null);
          }}
          onDelete={async (target, unlocked) => {
            await removeItem(target, unlocked);
            setEditor(null);
          }}
        />
      )}
      {preferences && (
        <CalendarPreferences
          state={state}
          onSave={savePreferences}
          onClose={() => setPreferences(false)}
        />
      )}
      {clearing && (
        <CalendarDialog
          title="Svuota calendario"
          onClose={() => setClearing(false)}
        >
          <p>
            Verranno eliminati{" "}
            <strong>tutti gli elementi di tutte le settimane</strong>, inclusi
            impegni fissi, tempo protetto, serie ricorrenti, eccezioni, note e
            stati di completamento o salto.
          </p>
          <p>
            Restano lo storico degli esiti, il profilo, gli obiettivi e la
            palette. Questa operazione non è annullabile; puoi prima esportare
            il calendario.
          </p>
          {hasConstraints && (
            <label className="clear-unlock">
              <input
                type="checkbox"
                checked={clearUnlocked}
                onChange={(e) => setClearUnlocked(e.target.checked)}
              />
              Sblocco esplicitamente tutti i vincoli per eliminarli.
            </label>
          )}
          {error && (
            <p role="alert" className="capacity-warning">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <StandardButton
              variant="secondary"
              onClick={() => setClearing(false)}
            >
              Annulla
            </StandardButton>
            <StandardButton
              variant="primary"
              disabled={saving || (hasConstraints && !clearUnlocked)}
              onClick={async () => {
                try {
                  await clearAll();
                  setClearing(false);
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}
            >
              Conferma: svuota tutte le settimane
            </StandardButton>
          </div>
        </CalendarDialog>
      )}
    </div>
  );
}
export default function App() {
  const { ready, error, retry } = useDB();
  if (!ready)
    return (
      <main className="database-loading">
        <h1>Agenda</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <StandardButton variant="secondary" onClick={() => void retry()}>
              Riprova
            </StandardButton>
          </>
        )}
      </main>
    );
  return <AppContent />;
}
