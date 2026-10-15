import { useId, useState } from 'react';
import type { TimeSession } from '../../model/weeklyTime';
import { displayDate } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';
import { StandardButton } from '../../components/ui/StandardButton';
import { TIME_SESSION_PREVIEW_COUNT } from '../../constants';

interface Props { sessions: TimeSession[] }

/** Mostra gli ultimi inserimenti del diario; espande lo storico su richiesta senza duplicare le correzioni. */
export function TimeSessionStack({ sessions }: Props) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? sessions : sessions.slice(0, TIME_SESSION_PREVIEW_COUNT);
  return <section className="time-session-stack" aria-label="Ultime registrazioni">
    <div className="time-stack-heading"><h4>Ultime registrazioni</h4><span>{sessions.length} {sessions.length === 1 ? 'sessione' : 'sessioni'}</span></div>
    {sessions.length === 0 ? <p className="editor-hint">Il tuo diario inizia da qui. Aggiungi il tempo che hai dedicato a questa abitudine.</p> : <ol id={listId} className="time-stack-list">{visible.map(session => <li key={session.id}>
      <div className="time-stack-entry"><time dateTime={session.date}>{displayDate(session.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</time><strong>+{formatDurationMinutes(session.minutes)}</strong></div>
      {session.notes && <p>{session.notes}</p>}
    </li>)}</ol>}
    {sessions.length > TIME_SESSION_PREVIEW_COUNT && <StandardButton variant="ghost" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(value => !value)}>{expanded ? 'Mostra meno' : `Mostra tutte (${sessions.length})`}</StandardButton>}
  </section>;
}
