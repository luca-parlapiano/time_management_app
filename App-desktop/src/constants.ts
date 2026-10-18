/** Valori e configurazioni statiche dell’app, condivisi da renderer ed Electron.
 * Non contiene istanze di servizi, stato React o dati calcolati durante l’esecuzione.
 */
import type { ItemOutcome, ItemKind, EventColor as IconColor, EventIcon as IconName } from "./model/calendar.js";

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
  gaming: "Videogiochi", diving: "Subacquea",
  "ion-star": "Stella", "ion-book": "Libro", "ion-cafe": "Caffè", "ion-airplane": "Viaggi",
  "ion-footsteps": "Camminata", "ion-moon": "Luna", "ion-brush": "Creatività", "ion-sparkles": "Ispirazione",
  "ion-glasses": "Lettura", "ion-code": "Programmazione", "ion-flash": "Energia", "ion-train": "Treno",
  "ion-map": "Esplorazione", "ion-hammer": "Fai da te", "ion-flag": "Traguardo", "ion-paw": "Animali",
  "ion-beaker": "Scienza", "ion-bookmark": "Segnalibro", "ion-folder": "Organizzazione", "ion-cloud": "Nuvola",
  "ion-chatbubble": "Conversazione", "ion-musical-note": "Musica", "ion-pencil": "Scrittura", "ion-shield": "Protezione",
  "ion-key": "Chiave", "ion-umbrella": "Ombrello", "ion-storefront": "Negozio", "ion-podium": "Podio",
} as const satisfies Record<IconName, string>;

export const eventColors = {
  blue: { label: "Blu", value: "#3974cb" },
  green: { label: "Verde", value: "#348566" },
  purple: { label: "Viola", value: "#8b5fc2" },
  orange: { label: "Arancione", value: "#c77728" },
  pink: { label: "Rosa", value: "#bf5283" },
  teal: { label: "Turchese", value: "#27868e" },
} as const;

/** Accetta i colori storici e i colori personali nel formato HEX a sei cifre. */
export function isEventColor(value: unknown): value is IconColor {
  return typeof value === "string" && (Object.hasOwn(eventColors, value) || /^#[0-9a-fA-F]{6}$/.test(value));
}

/** Restituisce il colore CSS usato da icone, bordi e grafici. */
export function eventColorValue(color: IconColor): string {
  return color.startsWith("#") ? color : eventColors[color as keyof typeof eventColors].value;
}

/** Etichetta leggibile anche per un colore creato dall'utente. */
export function eventColorLabel(color: IconColor): string {
  return color.startsWith("#") ? `Personalizzato · ${color.toUpperCase()}` : eventColors[color as keyof typeof eventColors].label;
}

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
  diving: "M2.5 10.5c0-2 1.5-3.5 3.5-3.5h10c2 0 3.5 1.5 3.5 3.5v3c0 2.5-2 4.5-4.5 4.5h-1c-1.4 0-2.4-.7-3-2-.6 1.3-1.6 2-3 2H7c-2.5 0-4.5-2-4.5-4.5v-3Z M11 8v7 M19.5 10H20c1.1 0 2-.9 2-2V3 M20 3h2",
  // Tracciati outline da Ionicons 8.0.13 (MIT): licenza in IONICONS_LICENSE.txt.
  "ion-star": "M480 208H308L256 48l-52 160H32l140 96-54 160 138-100 138 100-54-160Z",
  "ion-book": "M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0 1 16 16v288a16 16 0 0 1-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0 1 16-16c131.57.59 192 32.84 208 96M256 160v288",
  "ion-cafe": "M368 80h64a16 16 0 0 1 16 16v34a46 46 0 0 1-46 46h-34M96 80h272v192a80 80 0 0 1-80 80H176a80 80 0 0 1-80-80zM64 416h336",
  "ion-airplane": "M407.72 224c-3.4 0-14.79.1-18 .3l-64.9 1.7a1.83 1.83 0 0 1-1.69-.9L193.55 67.56a9 9 0 0 0-6.66-3.56H160l73 161a2.35 2.35 0 0 1-2.26 3.35l-121.69 1.8a8.06 8.06 0 0 1-6.6-3.1l-37-45c-3-3.9-8.62-6-13.51-6H33.08c-1.29 0-1.1 1.21-.75 2.43l19.84 71.42a16.3 16.3 0 0 1 0 11.9L32.31 333c-.59 1.95-.52 3 1.77 3H52c8.14 0 9.25-1.06 13.41-6.3l37.7-45.7a8.19 8.19 0 0 1 6.6-3.1l120.68 2.7a2.7 2.7 0 0 1 2.43 3.74L160 448h26.64a9 9 0 0 0 6.65-3.55L323.14 287c.39-.6 2-.9 2.69-.9l63.9 1.7c3.3.2 14.59.3 18 .3C452 288.1 480 275.93 480 256s-27.88-32-72.28-32",
  "ion-footsteps": "M200 246.84c8.81 58.62-7.33 90.67-52.91 97.41-50.65 7.49-71.52-26.44-80.33-85.06-11.85-78.88 16-127.94 55.71-131.1 36.14-2.87 68.71 60.14 77.53 118.75ZM223.65 409.53c3.13 33.28-14.86 64.34-42 69.66-27.4 5.36-58.71-16.37-65.09-49.19s17.75-34.56 47.32-40.21 55.99-20.4 59.77 19.74ZM312 150.83c-8.81 58.62 7.33 90.67 52.9 97.41 50.66 7.49 71.52-26.44 80.33-85.06 11.86-78.89-16-128.22-55.7-131.1-36.4-2.64-68.71 60.13-77.53 118.75ZM288.35 313.53c-3.13 33.27 14.86 64.34 42 69.66 27.4 5.36 58.71-16.37 65.09-49.19s-17.75-34.56-47.32-40.22-55.99-20.4-59.77 19.75Z",
  "ion-moon": "M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216",
  "ion-brush": "M452.37 59.63a40.49 40.49 0 0 0-57.26 0L184 294.74c23.08 4.7 46.12 27.29 49.26 49.26l219.11-227.11a40.49 40.49 0 0 0 0-57.26M138 336c-29.88 0-54 24.5-54 54.86 0 23.95-20.88 36.57-36 36.57C64.56 449.74 92.82 464 120 464c39.78 0 72-32.73 72-73.14 0-30.36-24.12-54.86-54-54.86",
  "ion-sparkles": "M259.92 262.91 216.4 149.77a9 9 0 0 0-16.8 0l-43.52 113.14a9 9 0 0 1-5.17 5.17L37.77 311.6a9 9 0 0 0 0 16.8l113.14 43.52a9 9 0 0 1 5.17 5.17l43.52 113.14a9 9 0 0 0 16.8 0l43.52-113.14a9 9 0 0 1 5.17-5.17l113.14-43.52a9 9 0 0 0 0-16.8l-113.14-43.52a9 9 0 0 1-5.17-5.17M108 68 88 16 68 68 16 88l52 20 20 52 20-52 52-20zM426.67 117.33 400 48l-26.67 69.33L304 144l69.33 26.67L400 240l26.67-69.33L496 144z",
  "ion-glasses": "M224 232a32 32 0 0 1 64 0M448 200h16M64 200H48M64 200c0 96 16 128 80 128s80-32 80-128c0 0-16-16-80-16s-80 16-80 16M448 200c0 96-16 128-80 128s-80-32-80-128c0 0 16-16 80-16s80 16 80 16",
  "ion-code": "M160 368 32 256l128-112M352 368l128-112-128-112",
  "ion-flash": "M315.27 33 96 304h128l-31.51 173.23a2.36 2.36 0 0 0 2.33 2.77h0a2.36 2.36 0 0 0 1.89-.95L416 208H288l31.66-173.25a2.45 2.45 0 0 0-2.44-2.75h0a2.42 2.42 0 0 0-1.95 1",
  "ion-train": "M344 48h-24a16 16 0 0 0-16-16h-96a16 16 0 0 0-16 16h-24a56.16 56.16 0 0 0-56 56v247c0 35.3 144 65 144 65s144-29.7 144-65V104a56 56 0 0 0-56-56m-88 304a48 48 0 1 1 48-48 48 48 0 0 1-48 48m96-160a16 16 0 0 1-16 16H176a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16ZM144 464h224M336 432l48 48M176 432l-48 48",
  "ion-map": "M313.27 124.64 198.73 51.36a32 32 0 0 0-29.28.35L56.51 127.49A16 16 0 0 0 48 141.63v295.8a16 16 0 0 0 23.49 14.14l97.82-63.79a32 32 0 0 1 29.5-.24l111.86 73a32 32 0 0 0 29.27-.11l115.43-75.94a16 16 0 0 0 8.63-14.2V74.57a16 16 0 0 0-23.49-14.14l-98 63.86a32 32 0 0 1-29.24.35M328 128v336M184 48v336",
  "ion-hammer": "M277.42 247a24.7 24.7 0 0 0-4.08-5.47L255 223.44a21.6 21.6 0 0 0-6.56-4.57 20.93 20.93 0 0 0-23.28 4.27c-6.36 6.26-18 17.68-39 38.43C146 301.3 71.43 367.89 37.71 396.29a16 16 0 0 0-1.09 23.54l39 39.43a16.13 16.13 0 0 0 23.67-.89c29.24-34.37 96.3-109 136-148.23 20.39-20.06 31.82-31.58 38.29-37.94a21.76 21.76 0 0 0 3.84-25.2M478.43 201l-34.31-34a5.44 5.44 0 0 0-4-1.59 5.6 5.6 0 0 0-4 1.59h0a11.41 11.41 0 0 1-9.55 3.27c-4.48-.49-9.25-1.88-12.33-4.86-7-6.86 1.09-20.36-5.07-29a243 243 0 0 0-23.08-26.72c-7.06-7-34.81-33.47-81.55-52.53a123.8 123.8 0 0 0-47-9.24c-26.35 0-46.61 11.76-54 18.51-5.88 5.32-12 13.77-12 13.77a91 91 0 0 1 10.81-3.2 79.5 79.5 0 0 1 23.28-1.49C241.19 76.8 259.94 84.1 270 92c16.21 13 23.18 30.39 24.27 52.83.8 16.69-15.23 37.76-30.44 54.94a7.85 7.85 0 0 0 .4 10.83l21.24 21.23a8 8 0 0 0 11.14.1c13.93-13.51 31.09-28.47 40.82-34.46s17.58-7.68 21.35-8.09a35.7 35.7 0 0 1 21.3 4.62 13.7 13.7 0 0 1 3.08 2.38c6.46 6.56 6.07 17.28-.5 23.74l-2 1.89a5.5 5.5 0 0 0 0 7.84l34.31 34a5.5 5.5 0 0 0 4 1.58 5.65 5.65 0 0 0 4-1.58L478.43 209a5.82 5.82 0 0 0 0-8",
  "ion-flag": "M80 464V68.14a8 8 0 0 1 4-6.9C91.81 56.66 112.92 48 160 48c64 0 145 48 192 48a199.5 199.5 0 0 0 77.23-15.77 2 2 0 0 1 2.77 1.85v219.36a4 4 0 0 1-2.39 3.65C421.37 308.7 392.33 320 352 320c-48 0-128-32-192-32s-80 16-80 16",
  "ion-paw": "M457.74 170.1a30.3 30.3 0 0 0-11.16-2.1h-.4c-20.17.3-42.79 19.19-54.66 47.76-14.23 34.18-7.68 69.15 14.74 78.14a30.2 30.2 0 0 0 11.15 2.1c20.27 0 43.2-19 55.17-47.76 14.13-34.18 7.48-69.15-14.84-78.14ZM327.6 303.48C299.8 257.35 287.8 240 256 240s-43.9 17.46-71.7 63.48c-23.8 39.36-71.9 42.64-83.9 76.07a50.9 50.9 0 0 0-3.6 19.25c0 27.19 20.8 49.2 46.4 49.2 31.8 0 75.1-25.39 112.9-25.39S337 448 368.8 448c25.6 0 46.3-22 46.3-49.2a51 51 0 0 0-3.7-19.25c-12-33.55-60-36.71-83.8-76.07ZM192.51 196a26.5 26.5 0 0 0 4-.3c23.21-3.37 37.7-35.53 32.44-71.85C224 89.61 203.22 64 181.49 64a26.5 26.5 0 0 0-4 .3c-23.21 3.37-37.7 35.53-32.44 71.85C150 170.29 170.78 196 192.51 196ZM366.92 136.15c5.26-36.32-9.23-68.48-32.44-71.85a26.5 26.5 0 0 0-4-.3c-21.73 0-42.47 25.61-47.43 59.85-5.26 36.32 9.23 68.48 32.44 71.85a26.5 26.5 0 0 0 4 .3c21.73 0 42.51-25.71 47.43-59.85ZM105.77 293.9c22.39-9 28.93-44 14.72-78.14C108.53 187 85.62 168 65.38 168a30.2 30.2 0 0 0-11.15 2.1c-22.39 9-28.93 44-14.72 78.14C51.47 277 74.38 296 94.62 296a30.2 30.2 0 0 0 11.15-2.1Z",
  "ion-beaker": "M445.2 48.05 398 48H128c-54.3 0-64 35.7-64 48 30.3 4.2 48 8 48 40v264a64 64 0 0 0 64 64h192a64 64 0 0 0 64-64V96c0-19 11.5-38.35 12.6-40 1.2-1.9 3.4-4.4 3.4-5.5s-.3-2.45-2.8-2.45M112 176h320",
  "ion-bookmark": "M352 48H160a48 48 0 0 0-48 48v368l144-128 144 128V96a48 48 0 0 0-48-48",
  "ion-folder": "M440 432H72a40 40 0 0 1-40-40V120a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H440a40 40 0 0 1 40 40v240a40 40 0 0 1-40 40M32 192h448",
  "ion-cloud": "M400 240c-8.89-89.54-71-144-144-144-69 0-113.44 48.2-128 96-60 6-112 43.59-112 112 0 66 54 112 120 112h260c55 0 100-27.44 100-88 0-59.82-53-85.76-96-88Z",
  "ion-chatbubble": "M87.49 380c1.19-4.38-1.44-10.47-3.95-14.86a45 45 0 0 0-2.54-3.8 199.8 199.8 0 0 1-33-110C47.65 139.09 140.73 48 255.83 48 356.21 48 440 117.54 459.58 209.85a199 199 0 0 1 4.42 41.64c0 112.41-89.49 204.93-204.59 204.93-18.3 0-43-4.6-56.47-8.37s-26.92-8.77-30.39-10.11a31.1 31.1 0 0 0-11.12-2.07 30.7 30.7 0 0 0-12.09 2.43l-67.83 24.48a16 16 0 0 1-4.67 1.22 9.6 9.6 0 0 1-9.57-9.74 16 16 0 0 1 .6-3.29Z",
  "ion-musical-note": "M240 343.31V424a32.28 32.28 0 0 1-21.88 30.65l-21.47 7.23c-25.9 8.71-52.65-10.75-52.65-38.32h0A34.29 34.29 0 0 1 167.25 391l50.87-17.12A32.29 32.29 0 0 0 240 343.24V92a16.13 16.13 0 0 1 12.06-15.66L360.49 48.2A6 6 0 0 1 368 54v57.76a16.13 16.13 0 0 1-12.12 15.67l-91.64 23.13A32.25 32.25 0 0 0 240 181.91v39.39",
  "ion-pencil": "M364.13 125.25 87 403l-23 45 44.99-23 277.76-277.13zM420.69 68.69l-22.62 22.62 22.62 22.63 22.62-22.63a16 16 0 0 0 0-22.62h0a16 16 0 0 0-22.62 0",
  "ion-shield": "M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63",
  "ion-key": "M218.1 167.17c0 13 0 25.6 4.1 37.4-43.1 50.6-156.9 184.3-167.5 194.5a20.17 20.17 0 0 0-6.7 15c0 8.5 5.2 16.7 9.6 21.3 6.6 6.9 34.8 33 40 28 15.4-15 18.5-19 24.8-25.2 9.5-9.3-1-28.3 2.3-36s6.8-9.2 12.5-10.4 15.8 2.9 23.7 3c8.3.1 12.8-3.4 19-9.2 5-4.6 8.6-8.9 8.7-15.6.2-9-12.8-20.9-3.1-30.4s23.7 6.2 34 5 22.8-15.5 24.1-21.6-11.7-21.8-9.7-30.7c.7-3 6.8-10 11.4-11s25 6.9 29.6 5.9c5.6-1.2 12.1-7.1 17.4-10.4 15.5 6.7 29.6 9.4 47.7 9.4 68.5 0 124-53.4 124-119.2S408.5 48 340 48s-121.9 53.37-121.9 119.17ZM400 144a32 32 0 1 1-32-32 32 32 0 0 1 32 32Z",
  "ion-umbrella": "M256 272v160a32 32 0 0 1-32 32h0a32 32 0 0 1-32-32M464 272c0-114.88-93.12-208-208-208S48 157.12 48 272h0a67.88 67.88 0 0 1 96 0h0a78.28 78.28 0 0 1 102.31-7.27L256 272l9.69-7.27A78.28 78.28 0 0 1 368 272h0a67.88 67.88 0 0 1 96 0M256 64V48",
  "ion-storefront": "M448 448V240M64 240v208M382.47 48H129.53c-21.79 0-41.47 12-49.93 30.46L36.3 173c-14.58 31.81 9.63 67.85 47.19 69h2c31.4 0 56.85-25.18 56.85-52.23 0 27 25.46 52.23 56.86 52.23s56.8-23.38 56.8-52.23c0 27 25.45 52.23 56.85 52.23s56.86-23.38 56.86-52.23c0 28.85 25.45 52.23 56.85 52.23h1.95c37.56-1.17 61.77-37.21 47.19-69l-43.3-94.54C423.94 60 404.26 48 382.47 48M32 464h448M136 288h80a24 24 0 0 1 24 24v88h0-128 0v-88a24 24 0 0 1 24-24M288 464V312a24 24 0 0 1 24-24h64a24 24 0 0 1 24 24v152",
  "ion-podium": "M32 160v296a8 8 0 0 0 8 8h136V160a16 16 0 0 0-16-16H48a16 16 0 0 0-16 16M320 48H192a16 16 0 0 0-16 16v400h160V64a16 16 0 0 0-16-16M464 208H352a16 16 0 0 0-16 16v240h136a8 8 0 0 0 8-8V224a16 16 0 0 0-16-16",
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
