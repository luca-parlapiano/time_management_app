import { useDB } from "../../hooks/useDB";
import { ArchiveSettings } from "./ArchiveSettings";
import { PalettePicker } from "./PalettePicker";

interface SettingsScreenProps { active: boolean }

/** Schermata delle preferenze visive e della gestione dei backup. */
export function SettingsScreen({ active }: SettingsScreenProps) {
  const { palette, paletteError, changePalette } = useDB();
  return (
    <section id="panel-settings" className="app-screen" role="tabpanel" aria-labelledby="tab-settings" tabIndex={0} hidden={!active}>
      <header className="calendar-header">
        <div><p className="eyebrow">Personalizza la tua app</p><h2>Impostazioni</h2></div>
      </header>
      <div className="screen-content settings-screen-content">
        <PalettePicker value={palette} onChange={changePalette} saveError={paletteError} />
        <ArchiveSettings />
      </div>
    </section>
  );
}
