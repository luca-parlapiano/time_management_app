/** Valori e configurazioni statiche dell’app, condivisi da renderer ed Electron.
 * Non contiene istanze di servizi, stato React o dati calcolati durante l’esecuzione.
 */
import type { ItemOutcome, ItemKind, EventIcon as IconName } from "./model/calendar.js";

// Tempo
/** Millisecondi in un giorno, per l’aritmetica delle date in UTC. */
export const DAY = 86_400_000;

// Calendario: etichette, icone e colori
/** Altezza minima di uno slot nella griglia, inclusi i 4 px di separazione fra eventi. */
export const CALENDAR_EVENT_SLOT_MIN_HEIGHT = 64;
/** Densità di base della griglia compatta: 30 px per ora, prima dello spazio minimo per gli header. */
export const CALENDAR_TIMELINE_PIXELS_PER_MINUTE = 0.5;
export const outcomeLabels = { completed: "Fatto", skipped: "Non fatto" } as const satisfies Record<ItemOutcome, string>;

// Riepilogo del percorso nella dashboard
export const HABIT_DASHBOARD_DAYS = 28;
export const HABIT_DASHBOARD_OCCASIONS = 7;
export const HABIT_DASHBOARD_ROWS = 5;
export const habitDashboardStates = {
  completed: { label: "Completata", symbol: "✓" },
  skipped: { label: "Non fatta", symbol: "×" },
  pending: { label: "Senza esito", symbol: "○" },
} as const;

export const eventIcons = {
  activity: "Attività", work: "Lavoro", study: "Studio", sport: "Sport",
  rest: "Riposo", meal: "Pasti", people: "Incontri", heart: "Benessere",
  gaming: "Videogiochi",
} as const;

export const eventColors = {
  blue: { label: "Blu", value: "#3974cb" },
  green: { label: "Verde", value: "#348566" },
  purple: { label: "Viola", value: "#8b5fc2" },
  orange: { label: "Arancione", value: "#c77728" },
  pink: { label: "Rosa", value: "#bf5283" },
  teal: { label: "Turchese", value: "#27868e" },
} as const;

export const kindLabels: Record<ItemKind, string> = {
  fixed: "Impegno fisso", protected: "Tempo protetto", flexible: "Attività flessibile",
};

// Esiti delle attività
export const statisticsOutcomeLabels: Record<ItemOutcome, string> = { completed: "Superata", skipped: "Non superata" };

// Temi e preferenze
export const palettes = [
  { id: "natural", label: "Calma naturale", description: "Crema, verde e terracotta" },
  { id: "studio", label: "Studio essenziale", description: "Grigio chiaro e blu" },
  { id: "night", label: "Notte tranquilla", description: "Grafite e lavanda" },
] as const;

// Etichette dei giorni usate nelle viste statistiche
export const weekdayLabels = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Gio" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sab" },
  { key: "sun", label: "Dom" },
] as const;

// Tracciati SVG delle icone
export const eventIconPaths: Record<IconName, string> = {
  activity: "m5 12 4 4L19 6",
  work: "M4 7h16v13H4z M8 7V4h8v3 M4 12h16 M10 12v3h4v-3",
  study: "M12 6C8 3 4 4 2 5v14c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1Zm0 0v14",
  sport: "m7 3-4 4m14 14 4-4M5 5l14 14M3 11l8-8m2 18 8-8",
  rest: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  meal: "M4 3v6c0 3 6 3 6 0V3M7 3v18M20 21V3c-5 2-5 11 0 11",
  people: "M9 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM2 21v-4a4 4 0 0 1 8 0v4M21 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm-7 14v-4a4 4 0 0 1 8 0v4",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 7 8 15c9-8 11-12 8-15Z",
  gaming: "M7 6h10a4 4 0 0 1 4 3l1 7a3 3 0 0 1-5 2l-3-3h-4l-3 3a3 3 0 0 1-5-2l1-7a4 4 0 0 1 4-3Z M7 9v4M5 11h4M16 10h.01M18 12h.01",
};

// Runtime AI locale: indirizzo, modello e timeout
export const DEFAULT_SERVER_URL = "http://127.0.0.1:39281";

export const DEFAULT_MODEL_REPOSITORY = "Qwen/Qwen3-4B-GGUF:Q4_K_M";

export const STARTUP_TIMEOUT_MS = 5 * 60 * 1_000;

export const REQUEST_TIMEOUT_MS = 60_000;

// Limiti delle registrazioni manuali e degli obiettivi settimanali, in minuti.
export const MAX_SESSION_MINUTES = 1440;
export const MAX_WEEKLY_MINUTES = 10080;
export const MAX_MONTHLY_MINUTES = 44640;
export const TIME_SESSION_PREVIEW_COUNT = 4;
