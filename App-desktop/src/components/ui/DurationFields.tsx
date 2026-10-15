import { useId } from 'react';

interface DurationFieldsProps { label: string; value: number; onChange: (minutes: number) => void; maxHours: number }

/** Raccoglie ore e minuti come durata intera; non applica il ciclo di 24 ore degli orari. */
export function DurationFields({ label, value, onChange, maxHours }: DurationFieldsProps) {
  const id = useId();
  return <fieldset className="duration-fields"><legend>{label}</legend><div className="form-row">
    <label htmlFor={`${id}-hours`}>Ore<input id={`${id}-hours`} type="number" inputMode="numeric" min="0" max={maxHours} step="1" required value={Math.floor(value / 60)} onChange={event => onChange(Number(event.target.value) * 60 + value % 60)} /></label>
    <label htmlFor={`${id}-minutes`}>Minuti<input id={`${id}-minutes`} type="number" inputMode="numeric" min="0" max="59" step="1" required value={value % 60} onChange={event => onChange(Math.floor(value / 60) * 60 + Number(event.target.value))} /></label>
  </div></fieldset>;
}
