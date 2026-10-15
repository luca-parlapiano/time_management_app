import { useId, useRef, useState } from "react";
import { normalizeTimeInput } from "../../utils/time";

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];
const invalidMessage = "Inserisci un orario valido, per esempio 1930 oppure 19:30.";

interface QuickTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Campo digitabile e scelta tramite pulsanti; conserva i minuti precisi e restituisce HH:MM alla selezione o all'uscita dal campo. */
export function QuickTimePicker({ label, value, onChange }: QuickTimePickerProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);
  const normalized = normalizeTimeInput(value);
  const [selectedHour, selectedMinute] = (normalized ?? "00:00").split(":");
  const choose = (time: string) => {
    input.current?.setCustomValidity("");
    setError(false);
    onChange(time);
  };
  return <div className="quick-time-picker">
    <label htmlFor={id}>{label}</label>
    <input ref={input} id={id} type="text" inputMode="numeric" autoComplete="off" required
      value={value} placeholder="19:30" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-invalid={error || undefined}
      onChange={event => {
        const next = event.target.value;
        event.target.setCustomValidity(normalizeTimeInput(next) ? "" : invalidMessage);
        setError(false);
        onChange(next);
      }}
      onBlur={() => {
        if (normalized) choose(normalized);
        else setError(true);
      }}
      onInvalid={() => setError(true)} />
    <small id={`${id}-hint`}>Scrivi 1930 per 19:30, oppure scegli con i pulsanti.</small>
    {error && <small id={`${id}-error`} className="quick-time-error" role="alert">{invalidMessage}</small>}
    <details className="quick-time-options">
      <summary>Scegli ora e minuti</summary>
      <div className="quick-time-section" role="group" aria-label="Ore">
        <span>Ora</span>
        <div className="quick-time-hours">{hours.map(hour => <button key={hour} type="button" aria-label={`Ore ${hour}`} aria-pressed={!!normalized && selectedHour === hour} onClick={() => choose(`${hour}:${selectedMinute}`)}>{hour}</button>)}</div>
      </div>
      <div className="quick-time-section" role="group" aria-label="Minuti rapidi">
        <span>Minuti</span>
        <div className="quick-time-minutes">{minutes.map(minute => <button key={minute} type="button" aria-label={`${minute} minuti`} aria-pressed={!!normalized && selectedMinute === minute} onClick={() => choose(`${selectedHour}:${minute}`)}>{minute}</button>)}</div>
      </div>
    </details>
  </div>;
}
