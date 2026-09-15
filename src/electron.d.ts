interface PlanningAIResponse {
  intent: unknown;
  rawText: string;
  runtime: string;
}

interface Window {
  plannerAI?: {
    interpret(text: string): Promise<PlanningAIResponse>;
  };
}
