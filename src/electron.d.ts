import type { DatabaseBridge } from "./model/database.js";
import type { PlanningAIResponse } from "./model/electron.js";

declare global {
  interface Window {
    plannerDB?: DatabaseBridge;
    plannerAI?: {
      interpret(text: string): Promise<PlanningAIResponse>;
    };
  }
}
