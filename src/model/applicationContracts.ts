import type {
ActivityEvent,
ActivityOutcome,
PlanCapacityCheck,
PlannerResult,
RawAnswers,
} from "./planning.js";
import type { SimulationRun } from "./simulationContracts.js";

// L'MVP usa esclusivamente il motore locale: nessuna chiamata di rete o cloud.
export interface PlannerGateway {
  checkCapacity(answers: RawAnswers): PlanCapacityCheck;
  generatePlan(answers: RawAnswers): Promise<PlannerResult>;
  simulatePlan(answers: RawAnswers, result: PlannerResult, weekCount: number): Promise<SimulationRun>;
  recordActivityOutcome(activityId: string, outcome: ActivityOutcome): Promise<ActivityEvent>;
}
