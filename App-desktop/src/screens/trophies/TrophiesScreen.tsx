import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { eventColorValue } from '../../constants';
import { useDB } from '../../hooks/useDB';
import { EventIcon } from '../../icons/EventIcon';
import { TrophyIcon } from '../../icons/TrophyIcon';
import type { Trophy } from '../../model/trophy';
import { displayDate } from '../../utils/dates';
import { formatDurationMinutes } from '../../utils/time';

type TrophyTab = Trophy['kind'];
const tabs: { id: TrophyTab; label: string }[] = [{ id: 'steps', label: 'A step' }, { id: 'time', label: 'A tempo' }];

function trophyProgress(trophy: Trophy): string {
  if (trophy.kind === 'time') return `${formatDurationMinutes(trophy.achieved)} su ${formatDurationMinutes(trophy.target)}`;
  return `${trophy.achieved} su ${trophy.target} ${trophy.target === 1 ? 'step fatto' : 'step fatti'}`;
}

function trophyStatus(trophy: Trophy): string {
  if (trophy.earnedOn) return `Conquistato il ${displayDate(trophy.earnedOn, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return trophy.concluded ? 'Non conquistato' : 'Da conquistare';
}

/** Griglia facoltativa dei trofei: separa step e tempo e colora soltanto i premi conquistati. */
export function TrophiesScreen({ active }: { active: boolean }) {
  const { getTrophies } = useDB();
  const [selected, setSelected] = useState<TrophyTab>('steps');
  const [showUnearned, setShowUnearned] = useState(false);
  const trophies = getTrophies();
  const categoryTrophies = trophies.filter(trophy => trophy.kind === selected);
  const visible = categoryTrophies.filter(trophy => showUnearned || trophy.earnedOn);
  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    setSelected(next.id);
    document.getElementById(`trophy-tab-${next.id}`)?.focus();
  };
  return <section id="panel-trophies" className="app-screen" role="tabpanel" aria-labelledby="tab-trophies" tabIndex={0} hidden={!active}>
    <header className="calendar-header"><div><p className="eyebrow">La tua bacheca personale</p><h2>Trofei</h2><p>Coloriamo solo i traguardi che hai davvero conquistato.</p></div></header>
    <div className="screen-content trophy-screen-content">
      <div className="trophy-tabs" role="tablist" aria-label="Tipo di trofeo">
        {tabs.map((tab, index) => {
          const total = trophies.filter(trophy => trophy.kind === tab.id).length;
          return <button key={tab.id} type="button" role="tab" id={`trophy-tab-${tab.id}`} aria-selected={selected === tab.id} aria-controls="trophy-grid-panel" tabIndex={selected === tab.id ? 0 : -1} onClick={() => setSelected(tab.id)} onKeyDown={event => selectWithKeyboard(event, index)}>
            <span>{tab.label}</span><small>{total}</small>
          </button>;
        })}
      </div>
      <label className="trophy-visibility-option">
        <input type="checkbox" checked={showUnearned} onChange={event => setShowUnearned(event.target.checked)} />
        <span><strong>Mostra anche i non conquistati</strong><small>Visualizza in ombra i trofei che puoi ancora ottenere o che non hai raggiunto.</small></span>
      </label>
      <div id="trophy-grid-panel" role="tabpanel" aria-labelledby={`trophy-tab-${selected}`}>
        {visible.length === 0 ? <div className="trophies-empty">
          <TrophyIcon variant={selected} size={58} />
          <h3>{categoryTrophies.length ? 'Nessun trofeo conquistato' : `Nessun trofeo ${selected === 'steps' ? 'a step' : 'a tempo'}`}</h3>
          <p>{categoryTrophies.length ? 'Puoi attivare l’opzione qui sopra per vedere anche quelli non conquistati.' : 'Attiva “Usa trofei” in una serie per aggiungere il suo traguardo a questa griglia.'}</p>
        </div> : <ul className="trophy-grid" aria-label={`${visible.length} ${visible.length === 1 ? 'trofeo' : 'trofei'} ${selected === 'steps' ? 'a step' : 'a tempo'}`}>
          {visible.map(trophy => {
            const earned = Boolean(trophy.earnedOn);
            return <li key={trophy.id} className="trophy-tile" data-earned={earned} style={{ '--event-color': eventColorValue(trophy.color) } as CSSProperties}>
              <div className="trophy-symbol">
                <TrophyIcon variant={trophy.kind} />
                <span className="trophy-symbol-activity"><EventIcon icon={trophy.icon} /></span>
              </div>
              <h3>{trophy.title}</h3>
              <p>{trophyProgress(trophy)}</p>
              <span className="trophy-state">{trophyStatus(trophy)}</span>
            </li>;
          })}
        </ul>}
      </div>
    </div>
  </section>;
}
