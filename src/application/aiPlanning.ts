import type { PlannerResult } from "../domain/planning";

// Contratto stabile da inviare in futuro a un servizio AI: niente istruzioni libere
// e tutti i vincoli restano espliciti e verificabili lato server.
export interface AIPlanningRequest {
  profile: PlannerResult["profile"];
  capacity: PlannerResult["capacityCheck"];
  derivedFeatures: PlannerResult["derivedFeatures"];
  hardConstraints: {
    fixedCommitments: PlannerResult["profile"]["fixedCommitments"];
    protectedTime: PlannerResult["profile"]["protectedTime"];
    sleepWindow: PlannerResult["profile"]["sleepWindow"];
  };
}

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
