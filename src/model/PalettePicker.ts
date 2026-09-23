import type { Palette } from "./theme.js";

export interface PalettePickerProps {
  value: Palette;
  onChange: (palette: Palette) => void;
  saveError: boolean;
}
