import { palettes } from "./constants.js";
import type { Palette } from "./model/theme.js";

/** Verifica una preferenza esterna senza convertirla o applicare valori di ripiego. */
export function isPalette(value: unknown): value is Palette {
  return palettes.some(palette => palette.id === value);
}
