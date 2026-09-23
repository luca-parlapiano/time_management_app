import type { RawAnswers } from "./planning.js";

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  answers: RawAnswers;
}
