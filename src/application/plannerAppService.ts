import type { PlannerGateway } from "./contracts";
import { localPlannerGateway } from "../infrastructure/localPlannerGateway";

// I componenti dipendono dalla facade, che nell'MVP resta locale al dispositivo.
export const plannerAppService: PlannerGateway = localPlannerGateway;
