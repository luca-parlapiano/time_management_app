import type { Palette } from "./model/theme.js";
export type { Palette } from "./model/theme.js";
export const palettes = [
  { id: "natural", label: "Calma naturale", description: "Crema, verde e terracotta" },
  { id: "studio", label: "Studio essenziale", description: "Grigio chiaro e blu" },
  { id: "night", label: "Notte tranquilla", description: "Grafite e lavanda" },
] as const;

export const PALETTE_STORAGE_KEY = "time-planner.palette.v1";

export function loadPalette(): Palette {
  try {
    const saved = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    return palettes.find((palette) => palette.id === saved)?.id ?? "natural";
  } catch {
    return "natural";
  }
}
