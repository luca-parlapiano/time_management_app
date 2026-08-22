import type { PlannerGateway } from "../application/contracts";
import { buildPrototypePlan, checkPlanCapacity } from "../planner/mockPlanner";
import { simulateWeeks } from "../simulation/weekSimulation";

export const localPlannerGateway: PlannerGateway = {
  // Adapter temporaneo: collega il servizio applicativo al motore locale del prototipo.
  checkCapacity(answers) {
    return checkPlanCapacity(answers);
  },

  async generatePlan(answers) {
    return buildPrototypePlan(answers);
  },

  async simulatePlan(answers, result, weekCount) {
    return simulateWeeks({ answers, result }, weekCount);
  },

  async recordActivityOutcome(activityId, outcome) {
    return {
      activityId,
      outcome,
      recordedAt: new Date().toISOString(),
    };
  },
};
