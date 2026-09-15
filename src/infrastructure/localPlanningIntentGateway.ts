import { parsePlanningIntent, type PlanningIntent } from "../domain/planningIntent";

export interface LocalPlanningIntentResult {
  intent: PlanningIntent;
  runtime: string;
}

export async function interpretPlanningMessage(text: string): Promise<LocalPlanningIntentResult> {
  if (!window.plannerAI) {
    throw new Error("Il runtime llama.cpp è disponibile solo nell’app Electron");
  }

  const response = await window.plannerAI.interpret(text);
  const parsed = parsePlanningIntent(response.intent);
  if (!parsed.ok) {
    throw new Error(`Risposta del modello non valida: ${parsed.errors.join("; ")}`);
  }
  return { intent: parsed.value, runtime: response.runtime };
}
