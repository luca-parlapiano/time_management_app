import type { PlannerResult, RawAnswers } from "./planning.js";
import type { SimulationRun } from "./simulationContracts.js";

export interface SimulationPanelProps {
  answers: RawAnswers;
  result: PlannerResult;
  simulation: SimulationRun | null;
  onSimulationChange: (simulation: SimulationRun | null) => void;
  onAdvanceSimulation: (weekCount: number) => void;
}
