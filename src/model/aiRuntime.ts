export interface PlanningAIResponse {
  intent: unknown;
  rawText: string;
  runtime: string;
}

export interface ApplyTemplateResponse {
  prompt?: unknown;
}

export interface CompletionResponse {
  content?: unknown;
  error?: { message?: unknown };
}
