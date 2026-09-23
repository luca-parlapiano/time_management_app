import type { ActivityEvent, PlannerResult, RawAnswers } from "./planning.js";

export interface LocalActivePlan {
  id: string;
  title: string;
  description: string;
}

export interface LocalPlannerState {
  answers: RawAnswers;
  plannerResult: PlannerResult;
  activePlan: LocalActivePlan;
  blockEvents: Record<string, ActivityEvent>;
}
