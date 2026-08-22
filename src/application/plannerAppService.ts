import type { PlannerGateway } from "./contracts";
import { localPlannerGateway } from "../infrastructure/localPlannerGateway";

// Components depend on this facade, never on a local or remote implementation.
export const plannerAppService: PlannerGateway = localPlannerGateway;
