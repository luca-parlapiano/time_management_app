import type { PlanningIntent } from "./planningIntent.js";

export interface LocalPlanningIntentResult {
  intent: PlanningIntent;
  runtime: string;
}
