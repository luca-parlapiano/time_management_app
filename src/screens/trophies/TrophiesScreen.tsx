import { AppIcon } from '../../icons/AppIcon';

/** Spazio introduttivo dei trofei, separato dallo storico delle serie concluse. */
export function TrophiesScreen({ active }: { active: boolean }) {
  return <section id="panel-trophies" className="app-screen" role="tabpanel" aria-labelledby="tab-trophies" tabIndex={0} hidden={!active}>
    <header className="calendar-header"><h2>Trofei</h2></header>
    <div className="screen-content">
      <div className="trophies-empty">
        <AppIcon name="trophies" size={48} />
        <h3>Uno spazio per i tuoi traguardi</h3>
        <p>Le serie concluse sono nell’Archivio delle abitudini.</p>
      </div>
    </div>
  </section>;
}
