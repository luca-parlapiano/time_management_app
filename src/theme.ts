import { palettes, PALETTE_STORAGE_KEY } from "./constants.js";
export { palettes, PALETTE_STORAGE_KEY } from "./constants.js";
import type { Palette } from "./model/theme.js";
export type { Palette } from "./model/theme.js";

export function loadPalette(): Palette {
  try {
    const saved = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    return palettes.find((palette) => palette.id === saved)?.id ?? "natural";
  } catch {
    return "natural";
  }
}
