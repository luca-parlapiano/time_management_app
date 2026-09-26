/**
 * Persistenza localStorage dello stato del planner storico (risposte, piano ed eventi).
 * È distinta dal calendario v2 e da SQLite: queste funzioni non migrano né modificano
 * l’archivio corrente. Dipendono dal contesto browser e non sono usate dalla home attuale.
 */
import { PLANNER_STORAGE_KEY as STORAGE_KEY } from "../constants.js";
import type { LocalPlannerState } from "../model/localPlannerStorage.js";
export type { LocalActivePlan,LocalPlannerState } from "../model/localPlannerStorage.js";

/**
 * Controlla soltanto la presenza dei quattro campi principali dello stato storico.
 * Non valida lo schema interno: il type guard mantiene la compatibilità del prototipo,
 * ma non equivale alla validazione completa usata per gli archivi del calendario corrente.
 */
function hasRequiredFields(value: unknown): value is LocalPlannerState {
  if (!value || typeof value !== "object") return false;

  const state = value as Partial<LocalPlannerState>;
  return Boolean(state.answers && state.plannerResult && state.activePlan && state.blockEvents);
}

/**
 * Legge lo stato del prototipo dal localStorage del renderer.
 * Restituisce null per chiave assente, dati incompleti, JSON non valido o accesso fallito;
 * questo percorso storico non distingue l’assenza dei dati dagli errori di lettura.
 */
export function loadLocalPlannerState(): LocalPlannerState | null {
  try {
    const serializedState = window.localStorage.getItem(STORAGE_KEY);
    if (!serializedState) return null;

    const state: unknown = JSON.parse(serializedState);
    return hasRequiredFields(state) ? state : null;
  } catch {
    return null;
  }
}

/**
 * Serializza e sostituisce lo stato del vecchio planner, senza validazione aggiuntiva.
 * Propaga gli errori di serializzazione o storage; non scrive nel calendario corrente.
 */
export function saveLocalPlannerState(state: LocalPlannerState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Rimuove soltanto la chiave del planner storico e propaga eventuali errori di accesso.
 * Non richiede conferma: l’eventuale autorizzazione va gestita dal chiamante.
 */
export function clearLocalPlannerState() {
  window.localStorage.removeItem(STORAGE_KEY);
}
