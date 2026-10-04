import { useDB } from "../../hooks/useDB";
import { StandardButton } from "../../components/ui/StandardButton";
import { ArchiveSettings } from "./ArchiveSettings";
import { PalettePicker } from "./PalettePicker";

interface SettingsScreenProps {
  active: boolean;
  onOpenProfile: () => void;
  onClearCalendar: () => void;
  onResetAll: () => void;
}

/** Schermata del profilo, delle preferenze visive e dei backup. */
export function SettingsScreen({ active, onOpenProfile, onClearCalendar, onResetAll }: SettingsScreenProps) {
  const { state, habits, archive, previous, saving, palette, paletteError, changePalette } = useDB();
  const hasData = state.items.length > 0 || habits.length > 0 || state.goals.length > 0 || state.profile !== null || archive.history.length > 0 || previous !== null || palette !== "natural";
  return (
    <section id="panel-settings" className="app-screen" role="tabpanel" aria-labelledby="tab-settings" tabIndex={0} hidden={!active}>
      <header className="calendar-header">
        <div><p className="eyebrow">Personalizza la tua app</p><h2>Impostazioni</h2></div>
      </header>
      <div className="screen-content settings-screen-content">
        <section className="summary-card" aria-labelledby="settings-profile-title">
          <h3 id="settings-profile-title">Profilo e obiettivi</h3>
          <p>{state.profile ? `Profilo: ${state.profile.name.trim() || "senza nome"} · ${state.goals.length} obiettivi` : "Crea il tuo profilo e definisci gli obiettivi personali."}</p>
          <StandardButton variant="secondary" type="button" disabled={saving} onClick={onOpenProfile}>{state.profile ? "Modifica profilo" : "Crea profilo"}</StandardButton>
        </section>
        <div className="summary-card">
          <PalettePicker value={palette} onChange={changePalette} saveError={paletteError} />
        </div>
        <ArchiveSettings />
        <section className="summary-card" aria-labelledby="settings-clear-title">
          <h3 id="settings-clear-title">Svuota calendario</h3>
          <p>Rimuove appuntamenti, routine e abitudini pianificate. Conserva profilo, obiettivi, storico degli esiti e palette.</p>
          <StandardButton variant="secondary" type="button" disabled={saving || (state.items.length === 0 && habits.length === 0)} onClick={onClearCalendar}>Svuota calendario</StandardButton>
        </section>
        <section className="summary-card settings-reset-card" aria-labelledby="settings-reset-title">
          <h3 id="settings-reset-title">Ripristina tutto</h3>
          <p>Elimina anche profilo, obiettivi, storico degli esiti, copia precedente e palette personalizzata. I file di backup già esportati restano disponibili.</p>
          <StandardButton variant="secondary" type="button" disabled={saving || !hasData} onClick={onResetAll}>Ripristina tutto</StandardButton>
        </section>
      </div>
    </section>
  );
}
