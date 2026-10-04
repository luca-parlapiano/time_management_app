/** Scheda riservata alla futura raccolta dei trofei. */
export function TrophiesScreen({ active }: { active: boolean }) {
  return <section id="panel-trophies" className="app-screen" role="tabpanel" aria-labelledby="tab-trophies" tabIndex={0} hidden={!active}>
    <header className="calendar-header"><h2>Trofei</h2></header>
    <div className="screen-content"><p>Qui prenderà forma la tua raccolta di trofei.</p></div>
  </section>;
}
