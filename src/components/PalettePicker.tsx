import type { PalettePickerProps } from "../model/PalettePicker.js";
import { palettes } from "../constants";

export function PalettePicker({ value, onChange, saveError }: PalettePickerProps) {
  return (
    <fieldset className="palette-picker">
      <legend>Palette dell’app</legend>
      <div className="palette-options">
        {palettes.map((palette) => (
          <label className="palette-option" key={palette.id}>
            <input
              type="radio"
              name="palette"
              value={palette.id}
              checked={value === palette.id}
              onChange={() => onChange(palette.id)}
            />
            <span className="palette-swatches" data-palette={palette.id} aria-hidden="true">
              <span /><span /><span />
            </span>
            <span className="palette-option-copy">
              <strong>{palette.label}</strong>
              <small>{palette.description}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="palette-note" role="status">
        {saveError
          ? "Non riesco a salvare la palette. La scelta precedente resta attiva."
          : "La scelta viene salvata su questo dispositivo."}
      </p>
    </fieldset>
  );
}
