import type { CSSProperties } from "react";
import { useLayoutEffect, useState } from "react";
import { ArchiveSettings } from "./components/ArchiveSettings";
import { CalendarDialog } from "./components/CalendarDialog";
import { CalendarEventMenu } from "./components/CalendarEventMenu";
import { CalendarItemEditor } from "./components/CalendarItemEditor";
import { CalendarPreferences } from "./components/CalendarPreferences";
import { CalendarStatistics } from "./components/CalendarStatistics";
import { EventIcon } from "./components/EventIcon";
import { PalettePicker } from "./components/PalettePicker";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { addDays, displayDate, eventAppearance, eventColors, today, weekStart } from "./domain/calendar";
import { useDB } from "./hooks/useDB";
import { useLoading } from "./hooks/useLoading";
import type { AppTab, CalendarEditorState } from "./model/App.js";
import type { Occurrence } from "./model/calendar.js";
function AppContent() {
  const { palette, paletteError: paletteSaveError, changePalette, state, archive, saving, recordOutcome, saveItem, deleteItem: removeItem, savePreferences, clearCalendar: clearAll } = useDB();
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
  useLayoutEffect(() => { document.documentElement.dataset.palette = palette; }, [palette]);
  const hasConstraints = state.items.some((item) => item.kind !== "flexible");
  const disabled = saving;
  const activityIds = new Set<string>();
  const activityNames = new Set<string>();
  const activities = state.items.filter((item) => {
    const id = item.activityId ?? item.id;
    const name = item.title
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("it");
    const duplicate = activityIds.has(id) || activityNames.has(name);
    activityIds.add(id);
    activityNames.add(name);
    return !duplicate;
  });
  return (
    <div
      className={`app-shell drawer-layout${sidebarExpanded ? "" : " sidebar-collapsed"}`}
    >
      <aside
        id="sidebar-drawer"
        className="hero-panel"
        aria-label="Barra laterale"
      >
        <button
          type="button"
          className="secondary-button sidebar-toggle"
          aria-expanded={sidebarExpanded}
          aria-controls="sidebar-drawer"
          aria-label={
            sidebarExpanded ? "Riduci barra laterale" : "Espandi barra laterale"
          }
          title={
            sidebarExpanded ? "Riduci barra laterale" : "Espandi barra laterale"
          }
          onClick={() => setSidebarExpanded((value) => !value)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M9 4v16" />
            <path d={sidebarExpanded ? "m16 9-3 3 3 3" : "m13 9 3 3-3 3"} />
          </svg>
        </button>
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
          <button
            type="button"
            aria-label="Aggiungi attività"
            title="Aggiungi attività"
            disabled={disabled}
            className="primary-button hero-icon-button"
            onClick={() =>
              setEditor({ date: week === weekStart(today()) ? today() : week })
            }
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Profilo"
            title="Profilo"
            disabled={disabled}
            className="secondary-button hero-icon-button"
            onClick={() => setPreferences(true)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Svuota calendario"
            title="Svuota calendario"
            disabled={disabled || state.items.length === 0}
            className="ghost-button hero-icon-button"
            onClick={() => {
              setClearUnlocked(false);
              setError("");
              setClearing(true);
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7" />
            </svg>
          </button>
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
          {activities.length === 0 ? (
            <p className="summary-empty-copy" hidden={!sidebarExpanded}>
              Nessuna attività creata. Usa + per aggiungerne una.
            </p>
          ) : (
            <ul className="sidebar-activity-list">
              {activities.map((item) => {
                const appearance = eventAppearance(item);
                return (
                  <li
                    key={item.activityId ?? item.id}
                    className="sidebar-activity"
                    title={item.title}
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
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {tab.id === "calendar" ? (
                  <>
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
                  </>
                ) : tab.id === "statistics" ? (
                  <path d="M4 20V10h4v10m2 0V4h4v16m2 0v-7h4v7M2 20h20" />
                ) : (
                  <>
                    <path d="M4 7h16M4 17h16" />
                    <circle
                      cx="9"
                      cy="7"
                      r="3"
                      fill="rgb(var(--surface-rgb))"
                    />
                    <circle
                      cx="15"
                      cy="17"
                      r="3"
                      fill="rgb(var(--surface-rgb))"
                    />
                  </>
                )}
              </svg>
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
              <button
                className="secondary-button"
                aria-label="Settimana precedente"
                onClick={() => setWeek(addDays(week, -7))}
              >
                ← Precedente
              </button>
              <button
                className="secondary-button"
                onClick={() => setWeek(weekStart(today()))}
              >
                Oggi
              </button>
              <button
                className="secondary-button"
                aria-label="Settimana successiva"
                onClick={() => setWeek(addDays(week, 7))}
              >
                Successiva →
              </button>
            </nav>
          )}
        </header>
        {saving && isLoading() && <p role="status" className="database-save-status">Salvataggio…</p>}
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
          <details
            className="calendar-planning-note"
            aria-label="Pianificazione"
          >
            <summary>Pianificazione e AI</summary>
            <p className="summary-empty-copy">
              La chat del prototipo è temporaneamente disabilitata: rigenerava
              l’intero piano. Puoi organizzare gli elementi direttamente nel
              calendario; i futuri suggerimenti dovranno rispettare date,
              vincoli ed esiti.
            </p>
          </details>
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
          onOutcome={async outcome => {
            await recordOutcome(eventMenu, outcome);
            setEventMenu(null);
          }}
          onDelete={async () => {
            await removeItem({sourceId:eventMenu.sourceId, occurrenceDate:eventMenu.occurrenceDate, scope:"occurrence"}, true);
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
            Restano lo storico degli esiti, il profilo, gli obiettivi, la palette e l’archivio del
            vecchio prototipo. Questa operazione non è annullabile; puoi prima
            esportare il calendario.
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
            <button
              className="secondary-button"
              onClick={() => setClearing(false)}
            >
              Annulla
            </button>
            <button
              disabled={saving || hasConstraints && !clearUnlocked}
              className="primary-button"
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
            </button>
          </div>
        </CalendarDialog>
      )}
    </div>
  );
}
export default function App() {
  const { ready, error, retry } = useDB();
  if (!ready) return <main className="database-loading"><h1>Agenda</h1>{error && <><p role="alert">{error}</p><button className="secondary-button" onClick={() => void retry()}>Riprova</button></>}</main>;
  return <AppContent />;
}
