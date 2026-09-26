/**
 * Adattatore del prototipo tra renderer e bridge AI esposto dal preload Electron.
 * Il main gestisce il runtime; qui si invia il testo e si valida l’intento restituito.
 * Il nome locale non garantisce un server sul dispositivo: il runtime può usare un URL configurato.
 */
import { parsePlanningIntent } from "../domain/planningIntent";
import type { LocalPlanningIntentResult } from "../model/localPlanningIntentGateway.js";
export type { LocalPlanningIntentResult } from "../model/localPlanningIntentGateway.js";

/**
 * Invia text al runtime tramite plannerAI e restituisce intento validato e metadati del runtime.
 * Rifiuta la Promise se il bridge manca, la richiesta fallisce o l’intento viola il contratto.
 * La validazione del testo in ingresso spetta al main; qui non si generano appuntamenti
 * né si salvano proposte. Il chiamante deve presentare all’utente gli eventuali errori.
 */
export async function interpretPlanningMessage(text: string): Promise<LocalPlanningIntentResult> {
  if (!window.plannerAI) {
    throw new Error("Il runtime llama.cpp è disponibile solo nell’app Electron");
  }

  const response = await window.plannerAI.interpret(text);
  // Anche la risposta del modello deve superare il contratto prima di essere usata dal renderer.
  const parsed = parsePlanningIntent(response.intent);
  if (!parsed.ok) {
    throw new Error(`Risposta del modello non valida: ${parsed.errors.join("; ")}`);
  }
  return { intent: parsed.value, runtime: response.runtime };
}
