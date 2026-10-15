import { displayDate, today } from "../../domain/calendar";
import { useDB } from "../../hooks/useDB";
import { useLocalMinute } from "../../hooks/useLocalMinute";
import { greetingForHour } from "../../utils/time";
import type { ScreenId } from "./ScreenTabs";
import { StandardButton } from "../ui/StandardButton";
import { AppIcon } from "../../icons/AppIcon";

const sectionSummaries: Record<ScreenId, string> = {
  today: "La tua giornata in sintesi",
  habits: "Il percorso delle tue abitudini",
  calendar: "I tuoi impegni nel tempo",
  statistics: "I tuoi progressi",
  trophies: "I tuoi traguardi",
  settings: "Le tue preferenze",
};

/** Saluto condiviso sopra le schede, con descrizione e data locale su righe distinte. */
export function AppHeader({ activeScreen, onCreate }: { activeScreen: ScreenId; onCreate: () => void }) {
  const { state } = useDB();
  const now = useLocalMinute();
  const profileName = state.profile?.name.trim();
  const greeting = greetingForHour(now.getHours());
  const date = today();
  return <header className="calendar-header app-header">
    <div>
      <h2 className="app-greeting">{greeting}{profileName && <>, <strong>{profileName}</strong></>}</h2>
      <p className="app-subtitle">{sectionSummaries[activeScreen]}</p>
      <p className="app-date"><time dateTime={date}>{displayDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</time></p>
    </div>
    <StandardButton className="app-create-button" onClick={onCreate}><AppIcon name="add" size={20} />Crea</StandardButton>
  </header>;
}
