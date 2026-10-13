import { useState } from 'react';
import { CalendarDialog } from '../../components/ui/CalendarDialog';
import { StandardButton } from '../../components/ui/StandardButton';
import { AppIcon } from '../../icons/AppIcon';
import { useDB } from '../../hooks/useDB';
import { useLocalMinute } from '../../hooks/useLocalMinute';
import type { TimeSeriesResult } from '../../model/weeklyTime';
import { displayDate, today } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';

/** Presenta il risultato raggiunto o scaduto e salva una sola scelta, senza trasferire ore alla successiva. */
export function TimeSeriesConclusion({ result, onClose }: { result: TimeSeriesResult; onClose: () => void }) {
  const { resolveTimeSeries, saving } = useDB();
  const [nextId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  async function resolve(repeat: boolean) {
    try { await resolveTimeSeries(result.habit.id, result.series.id, repeat, nextId); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile concludere la serie.'); }
  }
  return <CalendarDialog title="La tua serie è terminata" onClose={onClose}>
    <div className="time-series-conclusion">
      {result.reached && <div className="time-series-trophy"><AppIcon name="trophies" size={52} /><strong>Obiettivo raggiunto!</strong><span>Un nuovo trofeo per il tuo percorso</span></div>}
      <h4>{result.habit.title}</h4>
      <p className="editor-hint">{displayDate(result.series.startsOn, { year: 'numeric' })} – {displayDate(result.series.closedOn ?? (result.reached && result.series.endsOn > today() ? today() : result.series.endsOn), { year: 'numeric' })}</p>
      <dl className="time-series-score"><div><dt>Obiettivo</dt><dd>{formatDurationMinutes(result.series.targetMinutes)}</dd></div><div><dt>Ore raggiunte</dt><dd>{formatDurationMinutes(result.completedMinutes)}</dd></div></dl>
      {!result.reached && <p>Ogni ora dedicata resta parte del tuo percorso. Il risultato di questa serie sarà conservato nello storico.</p>}
      <h4>Vuoi continuare con una nuova serie?</h4>
      <p>Stesso obiettivo, {result.series.period === 'month' ? 'nel mese corrente' : 'nella settimana corrente'}, partendo da oggi con zero ore. Le ore eccedenti restano qui.</p>
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><StandardButton disabled={saving} variant="secondary" onClick={() => resolve(false)}>Va bene così</StandardButton><StandardButton disabled={saving} onClick={() => resolve(true)}>Ripeti la serie</StandardButton></div>
    </div>
  </CalendarDialog>;
}

/** Presenta obiettivi raggiunti e scadenze sullo snapshot confermato; chiudere rimanda la scelta, non conclude la serie. */
export function TimeSeriesNotifications({ enabled }: { enabled: boolean }) {
  const { getTimeSeriesResults } = useDB();
  useLocalMinute();
  const [deferred, setDeferred] = useState<string[]>([]);
  const result = getTimeSeriesResults().find(entry => (entry.reached || entry.series.endsOn < today()) && !entry.series.decision && !deferred.includes(`${entry.habit.id}:${entry.series.id}`));
  return enabled && result ? <TimeSeriesConclusion key={`${result.habit.id}:${result.series.id}`} result={result} onClose={() => setDeferred(current => [...current, `${result.habit.id}:${result.series.id}`])} /> : null;
}
