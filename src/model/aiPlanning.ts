import type { PlannerResult } from "./planning.js";

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
