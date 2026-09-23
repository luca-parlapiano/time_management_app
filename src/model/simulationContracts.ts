import type { DerivedFeatures, PlannerResult, RawAnswers } from "./planning.js";

// Esito possibile di una attivita' durante una settimana simulata.
export type BlockOutcome = "completed" | "moved" | "skipped";

// Evento simulato per una singola attivita' pianificata nel calendario.
export interface SimulatedBlockEvent {
  blockId: string;
  title: string;
  day: string;
  outcome: BlockOutcome;
  plannedMinutes: number;
  completedMinutes: number;
  reason: string;
}

// Riepilogo di una settimana: risultati aggregati e dettaglio delle attivita'.
export interface SimulatedWeek {
  weekNumber: number;
  plannedFocusMinutes: number;
  completedFocusMinutes: number;
  completionRate: number;
  completedBlocks: number;
  movedBlocks: number;
  skippedBlocks: number;
  events: SimulatedBlockEvent[];
}

// Stima adattiva ottenuta osservando tutte le settimane della simulazione.
export interface AdaptiveCapacityProfile {
  sustainableWeeklyMinutes: number;
  sustainableFocusMinutes: number;
  preferredFocusWindow: DerivedFeatures["preferredFocusWindow"];
  reliableWindow: DerivedFeatures["preferredFocusWindow"];
  completionConfidence: number;
  bufferEffectiveness: number;
}

// Risultato completo restituito dal simulatore alla dashboard.
export interface SimulationRun {
  weeks: SimulatedWeek[];
  profile: AdaptiveCapacityProfile;
  recommendation: string;
}

// Dati necessari per avviare una simulazione: profilo utente e piano generato.
export interface SimulationInput {
  answers: RawAnswers;
  result: PlannerResult;
  initialWeek?: number;
}
