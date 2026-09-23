import { localPlannerGateway } from "../infrastructure/localPlannerGateway";
import type { PlannerGateway } from "../model/applicationContracts.js";

// I componenti dipendono dalla facade, che nell'MVP resta locale al dispositivo.
export const plannerAppService: PlannerGateway = localPlannerGateway;
