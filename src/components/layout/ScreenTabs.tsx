import { AppIcon } from "../../icons/AppIcon";

export type ScreenId = "today" | "habits" | "calendar" | "statistics" | "settings";

interface ScreenTabsProps {
  activeScreen: ScreenId;
  onChange: (screen: ScreenId) => void;
}

const screens: ReadonlyArray<{ id: ScreenId; label: string }> = [
  { id: "today", label: "Oggi" },
  { id: "habits", label: "Abitudini" },
  { id: "calendar", label: "Calendario" },
  { id: "statistics", label: "Statistiche" },
  { id: "settings", label: "Impostazioni" },
];

/** Navigazione accessibile tra le schermate principali dell’app. */
export function ScreenTabs({ activeScreen, onChange }: ScreenTabsProps) {
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Sezioni principali">
      {screens.map((screen, index) => (
        <button
          key={screen.id}
          id={`tab-${screen.id}`}
          type="button"
          role="tab"
          aria-selected={activeScreen === screen.id}
          aria-controls={`panel-${screen.id}`}
          tabIndex={activeScreen === screen.id ? 0 : -1}
          className="workspace-tab"
          onClick={() => onChange(screen.id)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home"
              ? screens[0]
              : event.key === "End"
                ? screens[screens.length - 1]
                : screens[(index + (event.key === "ArrowLeft" ? -1 : 1) + screens.length) % screens.length];
            onChange(next.id);
            document.getElementById(`tab-${next.id}`)?.focus();
          }}
        >
          <AppIcon name={screen.id} />
          {screen.label}
        </button>
      ))}
    </div>
  );
}
