import type { CSSProperties } from "react";
import { addDays, displayDate, eventAppearance, eventColors } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { EventIcon } from "../../icons/EventIcon";
import { RoundButton } from "../ui/RoundButton";
import { SidebarWeeklyDoughnut } from "./SidebarWeeklyDoughnut";

interface AppSidebarProps {
  expanded: boolean;
  week: string;
  onToggle: () => void;
  onAdd: () => void;
  onOpenPreferences: () => void;
  onClear: () => void;
}

/** Barra laterale persistente con azioni e riepilogo della settimana corrente. */
export function AppSidebar({ expanded, week, onToggle, onAdd, onOpenPreferences, onClear }: AppSidebarProps) {
  const { getWeeklyActivities, state, saving } = useDB();
  const activities = getWeeklyActivities(week);
  return (
    <aside id="sidebar-drawer" className="hero-panel" aria-label="Barra laterale">
      <RoundButton
        variant="secondary"
        className="sidebar-toggle"
        icon={expanded ? "sidebar-close" : "sidebar-open"}
        iconSize={24}
        label={expanded ? "Riduci barra laterale" : "Espandi barra laterale"}
        aria-expanded={expanded}
        aria-controls="sidebar-drawer"
        onClick={onToggle}
      />
      <div className="sidebar-intro" hidden={!expanded}>
        <p className="eyebrow">Il tuo tempo, in locale</p>
        <h1>Spazio alle tue giornate.</h1>
        <p className="hero-copy">Attività, impegni e tempo per te. Un calendario continuo, pronto da usare.</p>
      </div>
      <div className="hero-icon-actions" role="group" aria-label="Azioni calendario">
        <RoundButton variant="primary" icon="add" iconSize={26} label="Aggiungi attività" disabled={saving} onClick={onAdd} />
        <RoundButton variant="secondary" icon="profile" label="Profilo" disabled={saving} onClick={onOpenPreferences} />
        <RoundButton variant="ghost" icon="trash" label="Svuota calendario" disabled={saving || state.items.length === 0} onClick={onClear} />
      </div>
      <section className="sidebar-activities" aria-labelledby="sidebar-activities-title">
        <h2 id="sidebar-activities-title" className={expanded ? undefined : "sr-only"}>Le tue statistiche settimanali</h2>
        <p className="sidebar-weekly-range" hidden={!expanded}>{displayDate(week)} – {displayDate(addDays(week, 6))}</p>
        {activities.length === 0 ? (
          <p className="summary-empty-copy" hidden={!expanded}>Nessuna attività creata. Usa + per aggiungerne una.</p>
        ) : (
          <ul className="sidebar-activity-list">
            {activities.map(({ event: item, statistics }) => {
              const appearance = eventAppearance(item);
              return (
                <li
                  key={item.activityId ?? item.id}
                  className="sidebar-activity"
                  title={`${item.title}: ${statistics.completed} superate, ${statistics.skipped} non superate, ${statistics.partial} parziali, ${statistics.pending} senza esito`}
                  tabIndex={expanded ? undefined : 0}
                  style={{ "--event-color": eventColors[appearance.color].value } as CSSProperties}
                >
                  <span className="sidebar-activity-icon"><EventIcon icon={appearance.icon} /></span>
                  <span className={expanded ? "sidebar-activity-title" : "sr-only"}>{item.title}</span>
                  {expanded && <SidebarWeeklyDoughnut title={item.title} statistics={statistics} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
