import { useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface HabitStatusTabsProps {
  label: string;
  archived: boolean;
  onChange: (archived: boolean) => void;
  counts?: [number, number];
  children: ReactNode;
}

/** Schede del fascicolo: mostra il contenuto selezionato e permette di cambiare stato con frecce, Home e Fine. */
export function HabitStatusTabs({ label, archived, onChange, counts, children }: HabitStatusTabsProps) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = archived ? 1 : 0;
  return <div className="habit-folder">
    <div className="habit-status-tabs" role="tablist" aria-label={label}>
      {['In corso', 'Archivio'].map((title, index) => <button key={title} ref={element => { buttons.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected === index} aria-controls={`${id}-panel`} tabIndex={selected === index ? 0 : -1} onClick={() => onChange(index === 1)} onKeyDown={event => {
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 1 - index : undefined;
        if (next === undefined) return;
        event.preventDefault();
        onChange(next === 1);
        buttons.current[next]?.focus();
      }}>{title}{counts && <span className="habit-status-count">{counts[index]}</span>}</button>)}
    </div>
    <div className="habit-folder-content" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected}`} tabIndex={0}>{children}</div>
  </div>;
}
