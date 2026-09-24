/** Valori e configurazioni statiche dell’app, condivisi da renderer ed Electron.
 * Non contiene istanze di servizi, stato React o dati calcolati durante l’esecuzione.
 */
import type { ItemOutcome, ItemKind, ItemStatus, EventIcon as IconName } from "./model/calendar.js";
import type { RawAnswers, Weekday } from "./model/planning.js";
import type { SimulationScenario } from "./model/scenarios.js";
import type { NewUserWizardStep } from "./model/newUserWizardSteps.js";
import type { NewUserWizardDraft } from "./model/NewUserWizardModal.js";
import type { ChatMessage } from "./model/PlannerChat.js";

// Tempo
/** Millisecondi in un giorno, per l’aritmetica delle date in UTC. */
export const DAY = 86_400_000;

// Calendario: etichette, icone e colori
export const outcomeLabels = { completed: "Fatto", skipped: "Non fatto", partial: "Parziale" } as const satisfies Record<ItemOutcome, string>;

export const eventIcons = {
  activity: "Attività", work: "Lavoro", study: "Studio", sport: "Sport",
  rest: "Riposo", meal: "Pasti", people: "Incontri", heart: "Benessere",
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

export const statusLabels: Record<ItemStatus, string> = {
  todo: "Da fare", completed: "Completato", skipped: "Saltato",
};

// Esiti delle attività
export const statisticsOutcomeLabels: Record<ItemOutcome, string> = { completed: "Superata", skipped: "Non superata", partial: "Parziale" };

// Schema degli intenti di pianificazione
export const requiredRootKeys = [
  "goals",
  "tasks",
  "habits",
  "constraints",
  "preferences",
  "questions",
] as const;

// Chiavi degli archivi locali
export const CALENDAR_STORAGE_KEY = "time-planner.calendar.v2";

export const LEGACY_STORAGE_KEY = "time-planner.local-state.v1";

// Archivio della pianificazione precedente
export const PLANNER_STORAGE_KEY = LEGACY_STORAGE_KEY;

// Temi e preferenze
export const palettes = [
  { id: "natural", label: "Calma naturale", description: "Crema, verde e terracotta" },
  { id: "studio", label: "Studio essenziale", description: "Grigio chiaro e blu" },
  { id: "night", label: "Notte tranquilla", description: "Grafite e lavanda" },
] as const;

export const PALETTE_STORAGE_KEY = "time-planner.palette.v1";

// Valori iniziali della pianificazione
export const weekdayLabels: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Gio" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sab" },
  { key: "sun", label: "Dom" }
];

export const goalPriorityOptions = [1, 2, 3, 4, 5];

export const weeklyGoalDurationOptions = Array.from(
  { length: 20 },
  (_, index) => (index + 1) * 30
);

export const defaultAnswers: RawAnswers = {
  goals: [
    { name: "Studio AI", priority: 5, desiredWeeklyMinutes: 300 },
    { name: "Fitness", priority: 3, desiredWeeklyMinutes: 180 },
    { name: "Deep work", priority: 4, desiredWeeklyMinutes: 240 }
  ],
  workStart: "09:00",
  workEnd: "18:00",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  wake: "07:00",
  sleep: "23:30",
  focusMinutes: 60,
  flexibilityMode: "mixed",
  energyProfile: {
    morning: "high",
    afternoon: "medium",
    evening: "low"
  }
};

// Ordine dei giorni della settimana
export const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Scenari di simulazione
export const simulationScenarios: SimulationScenario[] = [
  {
    id: "balanced-default",
    name: "Profilo bilanciato",
    description: "Settimana standard con carico sostenibile e focus al mattino.",
    answers: defaultAnswers
  },
  {
    id: "overloaded-builder",
    name: "Carico eccessivo",
    description: "Troppe ore richieste per vedere warning e saturazione del motore.",
    answers: {
      goals: [
        { name: "Startup", priority: 5, desiredWeeklyMinutes: 600 },
        { name: "Studio AI", priority: 5, desiredWeeklyMinutes: 420 },
        { name: "Fitness", priority: 4, desiredWeeklyMinutes: 240 },
        { name: "Lingua", priority: 3, desiredWeeklyMinutes: 240 }
      ],
      workStart: "09:00",
      workEnd: "19:00",
      workDays: ["mon", "tue", "wed", "thu", "fri"],
      wake: "06:45",
      sleep: "23:45",
      focusMinutes: 90,
      flexibilityMode: "rigid",
      energyProfile: {
        morning: "medium",
        afternoon: "high",
        evening: "low"
      }
    }
  },
  {
    id: "evening-creative",
    name: "Creativo serale",
    description: "Profilo che rende l'energia serale dominante e sposta i blocchi focus.",
    answers: {
      goals: [
        { name: "Design portfolio", priority: 5, desiredWeeklyMinutes: 300 },
        { name: "Workout breve", priority: 3, desiredWeeklyMinutes: 120 },
        { name: "Lettura", priority: 2, desiredWeeklyMinutes: 90 }
      ],
      workStart: "10:00",
      workEnd: "18:30",
      workDays: ["mon", "tue", "wed", "thu", "fri"],
      wake: "08:00",
      sleep: "01:00",
      focusMinutes: 60,
      flexibilityMode: "flexible",
      energyProfile: {
        morning: "low",
        afternoon: "medium",
        evening: "high"
      }
    }
  },
  {
    id: "part-time-reset",
    name: "Part-time strategico",
    description: "Meno giorni di lavoro e blocchi piu' lunghi per vedere redistribuzione.",
    answers: {
      goals: [
        { name: "Prodotto", priority: 5, desiredWeeklyMinutes: 360 },
        { name: "Amministrazione", priority: 2, desiredWeeklyMinutes: 120 },
        { name: "Recupero", priority: 4, desiredWeeklyMinutes: 180 }
      ],
      workStart: "08:30",
      workEnd: "14:00",
      workDays: ["mon", "wed", "fri"],
      wake: "06:30",
      sleep: "22:30",
      focusMinutes: 120,
      flexibilityMode: "mixed",
      energyProfile: {
        morning: "high",
        afternoon: "medium",
        evening: "medium"
      }
    }
  }
];

// Passaggi del wizard
export const newUserWizardSteps: NewUserWizardStep[] = [
  {
    id: "goals",
    eyebrow: "Step 1",
    title: "Obiettivi e priorita'",
    description:
      "Il primo blocco deve capire che cosa l'utente vuole davvero difendere nella settimana.",
    userGuidance:
      "Inserisci gli obiettivi che vuoi davvero portare avanti, assegna una priorita' chiara e scegli per quanto tempo vuoi impostare il piano.",
    plannedFields: [
      "Obiettivi principali",
      "Priorita' 1-5 per ogni obiettivo",
      "Durata del piano desiderata"
    ]
  },
  {
    id: "non-negotiables",
    eyebrow: "Step 2",
    title: "Impegni e orari fissi",
    description:
      "Prima di distribuire il tempo, il sistema deve sapere quali orari vanno rispettati sempre.",
    userGuidance:
      "Inserisci gli orari che fanno gia' parte della tua giornata, come lavoro, medicine, appuntamenti o routine fisse.",
    plannedFields: [
      "Orario di lavoro",
      "Medicine o routine salute",
      "Appuntamenti e orari fissi"
    ]
  },
  {
    id: "time-structure",
    eyebrow: "Step 3",
    title: "Tempo libero",
    description:
      "Qui puoi indicare il tempo che non e' gia' occupato, ma che vuoi comunque lasciare libero e non far toccare al piano.",
    userGuidance:
      "Segna il tempo che vuoi proteggere, come sonno, una mezza giornata libera o fasce in cui non vuoi far entrare altre attivita'.",
    plannedFields: [
      "Sonno o recupero",
      "Mezze giornate da proteggere",
      "Fasce che vuoi lasciare libere"
    ]
  },
  {
    id: "rhythm",
    eyebrow: "Step 4",
    title: "Ritmo personale",
    description:
      "L'app deve capire quando l'utente rende meglio e qual e' la sua finestra reale di esecuzione.",
    userGuidance:
      "Indicaci quanta energia hai nelle diverse fasce della giornata, quante ore di sonno vuoi proteggere e che tipo di blocchi preferisci.",
    plannedFields: [
      "Ore di sonno da proteggere",
      "Profilo energia mattina-pomeriggio-sera",
      "Durata dei blocchi e stile di lavoro"
    ]
  },
  {
    id: "style",
    eyebrow: "Step 5",
    title: "Stile del piano",
    description:
      "Questa parte definisce quanto il piano deve essere rigido, bufferizzato o aggressivo.",
    userGuidance:
      "Scegli quanto margine vuoi lasciare agli imprevisti e quale stile di lavoro ti somiglia di piu'.",
    plannedFields: [
      "Livello di flessibilita' desiderata",
      "Stile di lavoro preferito",
      "Principali difficolta' percepite"
    ]
  },
  {
    id: "preview",
    eyebrow: "Step 6",
    title: "Anteprima e selezione",
    description:
      "Dopo il profilo, il sistema prepara 4 piani generici coerenti con i dati raccolti e chiede in quale l'utente si riconosce di piu'.",
    userGuidance:
      "Confronta le anteprime e scegli quella che senti piu' vicina al tuo modo reale di lavorare e vivere la settimana.",
    plannedFields: [
      "Confronto delle 4 anteprime",
      "Scelta del piano piu' affine",
      "Conferma del punto di partenza"
    ]
  }
];

// Opzioni del wizard
export const planDurationOptions: Array<{
  value: NewUserWizardDraft["planDuration"];
  title: string;
  description: string;
}> = [
  {
    value: "weekly",
    title: "1 settimana",
    description:
      "Il dettaglio resta molto concreto e adatto a una griglia operativa.",
  },
  {
    value: "monthly",
    title: "1 mese",
    description:
      "Utile se vuoi un piano che copra il ritmo medio delle prossime settimane.",
  },
  {
    value: "quarterly",
    title: "3 mesi",
    description:
      "Adatto quando vuoi distribuire obiettivi importanti su un trimestre.",
  },
  {
    value: "semiannual",
    title: "6 mesi",
    description:
      "Buono per percorsi di crescita o cambi di routine piu' lenti.",
  },
  {
    value: "annual",
    title: "1 anno",
    description:
      "Serve per dare una direzione lunga, non per riempire tutto il calendario.",
  },
];

export const sleepHoursOptions = [6, 7, 8, 9];

export const focusBlockOptions = [30, 60, 90, 120];

export const energyOptions: Array<{
  value: keyof RawAnswers["energyProfile"];
  label: string;
}> = [
  { value: "morning", label: "Mattina" },
  { value: "afternoon", label: "Pomeriggio" },
  { value: "evening", label: "Sera" },
];

export const workStyleOptions: Array<{
  value: NewUserWizardDraft["workStyle"];
  title: string;
  description: string;
}> = [
  {
    value: "deep_work",
    title: "Una cosa per volta",
    description: "Preferisci sessioni piu' profonde e meno cambi di contesto.",
  },
  {
    value: "alternating",
    title: "Alternanza",
    description:
      "Ti trovi bene a distribuire attivita' diverse nella stessa giornata.",
  },
  {
    value: "short_sprints",
    title: "Sessioni brevi",
    description: "Rendi meglio con blocchi piu' corti e frequenti.",
  },
];

export const flexibilityOptions: Array<{
  value: NewUserWizardDraft["flexibilityMode"];
  title: string;
  description: string;
}> = [
  {
    value: "rigid",
    title: "Rigido",
    description: "Pochi spazi vuoti, calendario piu' serrato e difeso.",
  },
  {
    value: "mixed",
    title: "Misto",
    description: "Buon equilibrio tra struttura e margine per adattarsi.",
  },
  {
    value: "flexible",
    title: "Flessibile",
    description: "Più buffer e più spazio per assorbire cambiamenti.",
  },
];

export const planIntensityOptions: Array<{
  value: NewUserWizardDraft["planIntensity"];
  title: string;
  description: string;
}> = [
  {
    value: "light",
    title: "Leggero",
    description: "Meglio meno carico e piu' margine per recuperare.",
  },
  {
    value: "balanced",
    title: "Equilibrato",
    description: "Distribuzione sostenibile senza riempire ogni spazio.",
  },
  {
    value: "push",
    title: "Spinto",
    description: "Vuoi usare molto del tempo disponibile per avanzare.",
  },
];

export const difficultyOptions: Array<{
  value: NewUserWizardDraft["mainDifficulties"][number];
  title: string;
}> = [
  { value: "procrastination", title: "Procrastinazione" },
  { value: "overload", title: "Sovraccarico" },
  { value: "context_switching", title: "Troppi cambi di contesto" },
  { value: "unexpected_events", title: "Imprevisti frequenti" },
];

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
};

// Messaggio iniziale della chat
export const initialChatMessages: ChatMessage[] = [
  {
    id: 1,
    role: "assistant",
    text: "Ciao! Raccontami cosa vuoi organizzare, cambiare o aggiungere al tuo piano.",
  },
];

// Legenda e colori degli esiti settimanali
export const weeklyOutcomeLabels = ['Superate', 'Non superate', 'Parziali', 'Senza esito'];

export const weeklyOutcomeColors = ['#3b9f7c', '#dc6b77', '#e3ad4f', '#8994a7'];

// Pesi giornalieri della simulazione
export const simulationDayScores: Record<Weekday, number> = {
  mon: 0.96,
  tue: 1,
  wed: 0.93,
  thu: 0.9,
  fri: 0.84,
  sat: 0.9,
  sun: 0.86
};

// Runtime AI locale: indirizzo, modello e timeout
export const DEFAULT_SERVER_URL = "http://127.0.0.1:39281";

export const DEFAULT_MODEL_REPOSITORY = "Qwen/Qwen3-4B-GGUF:Q4_K_M";

export const STARTUP_TIMEOUT_MS = 5 * 60 * 1_000;

export const REQUEST_TIMEOUT_MS = 60_000;
