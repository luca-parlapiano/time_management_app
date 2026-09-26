/**
 * Adattatore del vecchio planner: collega il contratto applicativo a motore e simulatore locali.
 * Non usa rete, IPC o SQLite e non è collegato al calendario principale.
 * I metodi asincroni rispettano il contratto del servizio, ma i calcoli avvengono localmente.
 */
import type { PlannerGateway } from "../model/applicationContracts.js";
import { buildPrototypePlan, checkPlanCapacity } from "../planner/mockPlanner";
import { simulateWeeks } from "../simulation/weekSimulation";

/** Implementazione locale del contratto PlannerGateway, conservata per il prototipo. */
export const localPlannerGateway: PlannerGateway = {
  /**
   * Calcola la capacità del piano a partire dalle risposte del profilo.
   * Restituisce il controllo del motore senza generare o salvare un piano.
   */
  checkCapacity(answers) {
    return checkPlanCapacity(answers);
  },

  /** Genera il risultato del planner dalle risposte ricevute, senza persisterlo. */
  async generatePlan(answers) {
    return buildPrototypePlan(answers);
  },

  /**
   * Simula weekCount settimane usando risposte e risultato del planner.
   * Restituisce dati di simulazione: non registra esiti reali nel calendario.
   */
  async simulatePlan(answers, result, weekCount) {
    return simulateWeeks({ answers, result }, weekCount);
  },

  /**
   * Prepara un evento con ID attività, esito e timestamp corrente.
   * Nonostante il nome, non lo salva: la persistenza spetta al chiamante del prototipo.
   */
  async recordActivityOutcome(activityId, outcome) {
    return {
      activityId,
      outcome,
      recordedAt: new Date().toISOString(),
    };
  },
};
