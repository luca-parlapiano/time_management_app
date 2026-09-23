import type { AIPlanningRequest } from "../model/aiPlanning.js";
import type { PlannerResult } from "../model/planning.js";
export type { AIPlanningRequest } from "../model/aiPlanning.js";

// Contratto stabile da inviare in futuro a un servizio AI: niente istruzioni libere
// e tutti i vincoli restano espliciti e verificabili lato server.

export function createAIPlanningRequest(result: PlannerResult): AIPlanningRequest {
  return {
    profile: result.profile,
    capacity: result.capacityCheck,
    derivedFeatures: result.derivedFeatures,
    hardConstraints: {
      fixedCommitments: result.profile.fixedCommitments,
      protectedTime: result.profile.protectedTime,
      sleepWindow: result.profile.sleepWindow,
    },
  };
}
