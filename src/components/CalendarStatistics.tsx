import { addDays, kindLabels, occurrences, outcomeLabels, type ItemOutcome, type CalendarState, type ItemKind } from "../domain/calendar";

export function CalendarStatistics({ state, week }: { state: CalendarState; week: string }) {
  const entries = occurrences(state.items, week, addDays(week, 6));
  const completed = entries.filter(item => item.completed).length;
  const activities = new Set(entries.map(item => state.items.find(source => source.id === item.sourceId)?.activityId ?? item.sourceId));
  return <div className="calendar-statistics">
    <p className="statistics-intro">Il riepilogo della settimana selezionata. Ogni appuntamento viene contato una volta, anche se prosegue nel giorno successivo.</p>
    <dl className="statistics-cards">
      <div className="statistics-card"><dt>Appuntamenti</dt><dd>{entries.length}</dd></div>
      <div className="statistics-card"><dt>Attività distinte</dt><dd>{activities.size}</dd></div>
      <div className="statistics-card"><dt>Completamenti registrati</dt><dd>{completed}</dd></div>
    </dl>
    {entries.length === 0 ? <div className="statistics-empty"><h3>Una settimana tutta da organizzare</h3><p>Aggiungi un’attività nel Calendario: il riepilogo apparirà qui.</p></div> : <section className="statistics-breakdown" aria-labelledby="statistics-types">
      <h3 id="statistics-types">Come sono organizzati gli appuntamenti</h3>
      <dl>{(Object.keys(kindLabels) as ItemKind[]).map(kind => <div key={kind}><dt>{kindLabels[kind]}</dt><dd>{entries.filter(item => item.kind === kind).length}</dd></div>)}</dl>
      <h3>Com’è andata?</h3>
      <dl>{(Object.keys(outcomeLabels) as ItemOutcome[]).map(outcome => <div key={outcome}><dt>{outcomeLabels[outcome]}</dt><dd>{entries.filter(item => item.outcome === outcome).length}</dd></div>)}
        <div><dt>Esito non registrato</dt><dd>{entries.filter(item => !item.outcome).length}</dd></div>
      </dl>
      <p className="editor-hint">Gli appuntamenti collegati, come le tre sessioni di palestra, contano come una sola attività distinta. I completamenti riflettono solo quelli registrati.</p>
    </section>}
  </div>;
}
