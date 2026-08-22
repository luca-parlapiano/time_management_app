import type {
  ActivityEvent,
  ActivityOutcome,
  PlanCapacityCheck,
  PlannerResult,
  RawAnswers,
} from "../domain/planning";
import type { SimulationRun } from "../simulation/contracts";

// Questo e' il confine tra interfaccia e dati: oggi usa il motore locale,
// domani potra' usare chiamate HTTP e un database senza cambiare i componenti.
export interface PlannerGateway {
  checkCapacity(answers: RawAnswers): PlanCapacityCheck;
  generatePlan(answers: RawAnswers): Promise<PlannerResult>;
  simulatePlan(answers: RawAnswers, result: PlannerResult, weekCount: number): Promise<SimulationRun>;
  recordActivityOutcome(activityId: string, outcome: ActivityOutcome): Promise<ActivityEvent>;
}
