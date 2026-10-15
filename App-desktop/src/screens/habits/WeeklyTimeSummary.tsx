import { formatDurationMinutes } from '../../utils/time';
import type { WeeklyTimeProgress } from '../../model/weeklyTime';

/** Mostra il progresso settimanale reale; la barra è limitata al 100%, il totale conserva l’eccedenza. */
export function WeeklyTimeSummary({ progress }: { progress: WeeklyTimeProgress }) {
  const { completedMinutes, targetMinutes, remainingMinutes, percent, state } = progress;
  return <div className="weekly-time-summary">
    <p className="weekly-time-total"><strong>{formatDurationMinutes(completedMinutes)}</strong><span> / {formatDurationMinutes(targetMinutes)}</span></p>
    <progress max="100" value={Math.min(100, percent)} aria-label="Progresso della serie" aria-valuetext={`${formatDurationMinutes(completedMinutes)} su ${formatDurationMinutes(targetMinutes)}`} />
    <p className="weekly-time-status">{state === 'inactive' ? 'Fuori dal periodo attivo' : state === 'future' ? 'Serie futura' : state === 'reached' ? 'Obiettivo raggiunto' : state === 'below' ? 'Serie terminata sotto obiettivo' : `Mancano ${formatDurationMinutes(remainingMinutes)}`}{progress.partial ? ' · Periodo parziale' : ''}</p>
    {progress.plannedMinutes > 0 && <p className="editor-hint">{formatDurationMinutes(progress.plannedMinutes)} pianificate da oggi, ancora da registrare</p>}
    {progress.futureMinutes > 0 && <p className="editor-hint">{formatDurationMinutes(progress.futureMinutes)} registrate su date future, escluse dal totale maturato.</p>}
  </div>;
}
