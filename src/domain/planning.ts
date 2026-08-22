// Giorni disponibili nella vista e nella pianificazione settimanale.
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// Livello di energia che l'utente dichiara per una fascia oraria.
export type EnergyLevel = "low" | "medium" | "high";

// Quanto il piano puo' spostare le attivita' quando cambiano le condizioni.
export type FlexibilityMode = "rigid" | "mixed" | "flexible";

// Un obiettivo che l'utente vuole coltivare nella settimana.
export interface GoalInput {
  // Nome mostrato nel calendario, ad esempio "Studio AI".
  name: string;
  // Importanza da 1 a 5: guida l'ordine di assegnazione del planner.
  priority: number;
  // Tempo desiderato per questo obiettivo, espresso in minuti alla settimana.
  desiredWeeklyMinutes: number;
}

// Un impegno che non puo' essere spostato dal planner, ad esempio il lavoro.
export interface FixedCommitment {
  title: string;
  days: Weekday[];
  start: string;
  end: string;
}

// Risposte raccolte dall'interfaccia per generare o modificare un piano.
export interface RawAnswers {
  goals: GoalInput[];
  workStart: string;
  workEnd: string;
  workDays: Weekday[];
  wake: string;
  sleep: string;
  focusMinutes: number;
  flexibilityMode: FlexibilityMode;
  energyProfile: Record<"morning" | "afternoon" | "evening", EnergyLevel>;
}

// Profilo normalizzato dal motore dopo aver interpretato le risposte dell'utente.
export interface UserProfile {
  goals: GoalInput[];
  planningHorizon: "weekly";
  fixedCommitments: FixedCommitment[];
  sleepWindow: { wake: string; sleep: string };
  availableTimeByDay: Record<Weekday, number>;
  energyProfile: RawAnswers["energyProfile"];
  slotSizeMinutes: number;
  flexibilityMode: FlexibilityMode;
}

// Una singola attivita' collocata in un giorno e in un intervallo orario.
export interface CalendarActivity {
  // Identificatore stabile: collega calendario, feedback e simulazione.
  id: string;
  day: Weekday;
  start: string;
  end: string;
  title: string;
  // Tipo tecnico dell'attivita': impegno, focus, spazio buffer o recupero.
  kind: "commitment" | "focus" | "buffer" | "recovery";
  color: string;
  rationale: string;
}

// Contenitore generico per le attivita' di un calendario e il suo fuso orario.
export interface Calendar {
  activities: CalendarActivity[];
  timezone: string;
}

// Piano operativo della settimana generato dal planner e mostrato nella UI.
export interface WeeklyPlan {
  // Le attivita' del piano; il nome "blocks" e' mantenuto per compatibilita' con il prototipo.
  blocks: CalendarActivity[];
  // Breve spiegazione delle scelte prese dal planner.
  summary: string[];
}

// Verifica che obiettivi, sonno e impegni fissi stiano nella capacita' disponibile.
export interface PlanCapacityCheck {
  isCompatible: boolean;
  remainingWeeklyMinutes: number;
  weeklyCapacityMinutes: number;
  totalGoalMinutes: number;
  dailyIssues: string[];
  weeklyIssue?: string;
}

// Misure calcolate dal motore, non inserite direttamente dall'utente.
export interface DerivedFeatures {
  sleepMinutesPerDay: number;
  workMinutesPerWorkDay: number;
  totalGoalMinutes: number;
  weeklyCapacityMinutes: number;
  remainingWeeklyMinutes: number;
  focusBlockMinutes: number;
  estimatedFocusBlocks: number;
  preferredFocusWindow: "morning" | "afternoon" | "evening";
  workloadLevel: "light" | "balanced" | "stretched" | "overloaded";
}

// Una scelta spiegabile del planner: cosa ha deciso e per quale ragione.
export interface PlannerDecision {
  step: "normalize" | "capacity" | "allocation" | "buffer";
  impact: "info" | "decision" | "warning";
  title: string;
  detail: string;
}

// Risposta completa della generazione piano: profilo, piano e spiegazioni.
export interface PlannerResult {
  profile: UserProfile;
  plan: WeeklyPlan;
  capacityCheck: PlanCapacityCheck;
  derivedFeatures: DerivedFeatures;
  decisions: PlannerDecision[];
}

// Esito reale che l'utente registra per una attivita' del calendario.
export type ActivityOutcome = "completed" | "skipped" | "not-needed";

// Traccia di un feedback utente, pronta per essere salvata in futuro nel database.
export interface ActivityEvent {
  activityId: string;
  outcome: ActivityOutcome;
  recordedAt: string;
}
