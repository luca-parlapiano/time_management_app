
import type { PlannerResult, RawAnswers } from "./planning.js";

export interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  planning?: PlannerResult;
}

export interface PlannerChatProps {
  answers: RawAnswers | null;
  result: PlannerResult | null;
  onApplyAnswers: (answers: RawAnswers) => Promise<PlannerResult>;
}

export interface PlanningOutputProps { result: PlannerResult }
