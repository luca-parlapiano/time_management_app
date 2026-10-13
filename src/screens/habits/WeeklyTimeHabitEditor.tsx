import { useState } from 'react';
import { CalendarDialog } from '../../components/ui/CalendarDialog';
import { StandardButton } from '../../components/ui/StandardButton';
import { eventColors, eventIcons, MAX_MONTHLY_MINUTES, MAX_WEEKLY_MINUTES } from '../../constants';
import { useDB } from '../../hooks/useDB';
import { EventIcon } from '../../icons/EventIcon';
import { today } from '../../utils/dates';
import type { WeeklyTimeHabit, WeeklyTimeHabitDraft } from '../../model/weeklyTime';

interface Props { habit?: WeeklyTimeHabit; onClose: () => void; onSaved: (id: string) => void }

/** Crea una serie da oggi; il periodo di una serie già avviata resta stabile e lo storico non viene riscritto. */
export function WeeklyTimeHabitEditor({ habit, onClose, onSaved }: Props) {
  const { saveWeeklyTimeHabit, saving } = useDB();
  const [id] = useState(() => habit?.id ?? crypto.randomUUID());
  const reference = today();
  const current = habit?.series?.at(-1);
  const [draft, setDraft] = useState<WeeklyTimeHabitDraft>(() => ({ title: habit?.title ?? '', motivation: habit?.motivation ?? '', icon: habit?.icon ?? 'study', color: habit?.color ?? 'teal', startsOn: habit?.startsOn ?? reference, period: current?.period ?? 'week', targetMinutes: current?.targetMinutes ?? habit?.targets.at(-1)?.minutes ?? 360 }));
  const [hours, setHours] = useState(() => String(draft.targetMinutes / 60));
  const maxHours = (draft.period === 'month' ? MAX_MONTHLY_MINUTES : MAX_WEEKLY_MINUTES) / 60;
  const [error, setError] = useState('');
  const change = (patch: Partial<WeeklyTimeHabitDraft>) => { setDraft(current => ({ ...current, ...patch })); setError(''); };
  const changeHours = (value: string) => { setHours(value); setError(''); };
  return <CalendarDialog title={habit ? 'Modifica obiettivo di ore' : 'Un obiettivo, una serie alla volta'} onClose={onClose}>
    <form className="habit-editor weekly-time-editor" onSubmit={async event => {
      event.preventDefault();
      try { await saveWeeklyTimeHabit(id, { ...draft, startsOn: habit?.startsOn ?? today(), targetMinutes: Math.round(Number(hours) * 60) }); onSaved(id); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossibile salvare l’abitudine.'); }
    }}>
      <p className="editor-hint">Scegli quanto tempo dedicarti. Potrai distribuirlo liberamente nei tuoi giorni e annotare quello che impari.</p>
      <label>Quale abitudine vuoi acquisire?<input autoFocus required value={draft.title} placeholder="Es. Imparare a programmare" onChange={event => change({ title: event.target.value })} /></label>
      <label>Perché vuoi acquisirla?<textarea value={draft.motivation} placeholder="Una motivazione facoltativa" onChange={event => change({ motivation: event.target.value })} /></label>
      <fieldset className="weekly-hours-picker">
        <legend>Obiettivo della serie</legend>
        <div className="time-period-switch" role="group" aria-label="Periodo della serie">
          <button type="button" aria-pressed={draft.period === 'week'} disabled={Boolean(current)} onClick={() => change({ period: 'week' })}>Settimana</button>
          <button type="button" aria-pressed={draft.period === 'month'} disabled={Boolean(current)} onClick={() => change({ period: 'month' })}>Mese</button>
        </div>
        <div className="weekly-hours-control">
          <button type="button" aria-label="Riduci di un’ora" disabled={Number(hours) <= 1} onClick={() => changeHours(String(Math.max(1, Number(hours) - 1)))}>−</button>
          <label><input aria-label="Ore da raggiungere" type="number" inputMode="decimal" required min={1 / 60} max={maxHours} step="any" value={hours} onChange={event => changeHours(event.target.value)} /><span>{draft.period === 'month' ? 'ore nel mese' : 'ore nella settimana'}</span></label>
          <button type="button" aria-label="Aggiungi un’ora" disabled={Number(hours) >= maxHours} onClick={() => changeHours(String(Math.min(maxHours, Number(hours) + 1)))}>+</button>
        </div>
      </fieldset>
      <p className="editor-hint">{current ? 'Le modifiche riguardano solo questa serie. Il periodo resta quello scelto alla partenza.' : 'Si parte da oggi. Alla fine del periodo scegli tu se ripetere la serie.'}</p>
      <fieldset><legend>Icona</legend><div className="compact-icon-options icon-options">{(Object.keys(eventIcons) as (keyof typeof eventIcons)[]).map(icon => <button type="button" className="icon-option" key={icon} aria-label={eventIcons[icon]} aria-pressed={draft.icon === icon} onClick={() => change({ icon })}><EventIcon icon={icon} /></button>)}</div></fieldset>
      <fieldset><legend>Colore</legend><div className="habit-colors">{(Object.keys(eventColors) as (keyof typeof eventColors)[]).map(color => <button type="button" key={color} aria-label={eventColors[color].label} aria-pressed={draft.color === color} style={{ background: eventColors[color].value }} onClick={() => change({ color })} />)}</div></fieldset>
      {error && <p role="alert" className="capacity-warning">{error}</p>}
      <div className="modal-actions"><StandardButton type="button" variant="secondary" onClick={onClose}>Annulla</StandardButton><StandardButton type="submit" disabled={saving}>{habit ? 'Salva obiettivo' : 'Crea abitudine a ore'}</StandardButton></div>
    </form>
  </CalendarDialog>;
}
