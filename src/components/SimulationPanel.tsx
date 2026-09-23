import { useEffect, useState } from "react";
import type { SimulationPanelProps } from "../model/SimulationPanel.js";
import { formatTimeRange } from "../utils/time";

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function SimulationPanel({
  answers,
  result,
  simulation,
  onAdvanceSimulation,
  onSimulationChange,
}: SimulationPanelProps) {
  const [weekCount, setWeekCount] = useState(0);

  useEffect(() => {
    setWeekCount(0);
    onSimulationChange(null);
  }, [answers, result]);

  function advanceSimulation(numberOfWeeks: number) {
    setWeekCount((currentWeekCount) => {
      const nextWeekCount = currentWeekCount + numberOfWeeks;
      onAdvanceSimulation(nextWeekCount);
      return nextWeekCount;
    });
  }

  return (
    <section className="simulation-section">
      <div className="simulation-card">
        <p className="eyebrow">User Variables</p>
        <h3>Variabili osservate</h3>
        <div className="metric-list">
          <div className="metric-row">
            <span>Goal attivi</span>
            <strong>{answers.goals.filter((goal) => goal.name.trim().length > 0).length}</strong>
          </div>
          <div className="metric-row">
            <span>Ore lavoro</span>
            <strong>{formatTimeRange(answers.workStart, answers.workEnd)}</strong>
          </div>
          <div className="metric-row">
            <span>Flessibilita'</span>
            <strong>{answers.flexibilityMode}</strong>
          </div>
          <div className="metric-row">
            <span>Energia dominante</span>
            <strong>{result.derivedFeatures.preferredFocusWindow}</strong>
          </div>
          <div className="metric-row">
            <span>Blocco focus</span>
            <strong>{answers.focusMinutes} min</strong>
          </div>
        </div>
      </div>

      <div className="simulation-card">
        <p className="eyebrow">Derived Features</p>
        <h3>Come legge il motore</h3>
        <div className="metric-list">
          <div className="metric-row">
            <span>Sonno al giorno</span>
            <strong>{formatMinutes(result.derivedFeatures.sleepMinutesPerDay)}</strong>
          </div>
          <div className="metric-row">
            <span>Capacita' settimanale</span>
            <strong>{formatMinutes(result.derivedFeatures.weeklyCapacityMinutes)}</strong>
          </div>
          <div className="metric-row">
            <span>Richiesta goal</span>
            <strong>{formatMinutes(result.derivedFeatures.totalGoalMinutes)}</strong>
          </div>
          <div className="metric-row">
            <span>Tempo residuo</span>
            <strong>{formatMinutes(result.derivedFeatures.remainingWeeklyMinutes)}</strong>
          </div>
          <div className="metric-row">
            <span>Blocchi stimati</span>
            <strong>{result.derivedFeatures.estimatedFocusBlocks}</strong>
          </div>
          <div className="metric-row">
            <span>Carico</span>
            <strong>{result.derivedFeatures.workloadLevel}</strong>
          </div>
        </div>
      </div>

      <div className="simulation-card simulation-card-wide">
        <p className="eyebrow">Decision Trace</p>
        <h3>Scelte del motore</h3>
        <div className="decision-list">
          {result.decisions.map((decision) => (
            <article
              key={`${decision.step}-${decision.title}`}
              className={`decision-item decision-item-${decision.impact}`}
            >
              <div className="decision-item-top">
                <span className="decision-step">{decision.step}</span>
                <strong>{decision.title}</strong>
              </div>
              <p>{decision.detail}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="simulation-card simulation-card-wide capacity-simulation-card">
        <div className="simulation-heading">
          <div>
            <p className="eyebrow">Capacity Simulation</p>
            <h3>Settimane reali simulate</h3>
          </div>
          <div className="simulation-actions">
            <button className="ghost-button" onClick={() => advanceSimulation(1)}>
              Avanza di 1 settimana
            </button>
            <button className="primary-button" onClick={() => advanceSimulation(4)}>
              Avanza di 4 settimane
            </button>
          </div>
        </div>

        {simulation ? (
          <>
            <div className="capacity-metrics">
              <div className="capacity-metric">
                <span>Capacita' sostenibile</span>
                <strong>{formatMinutes(simulation.profile.sustainableWeeklyMinutes)}</strong>
              </div>
              <div className="capacity-metric">
                <span>Affidabilita' stimata</span>
                <strong>{Math.round(simulation.profile.completionConfidence * 100)}%</strong>
              </div>
              <div className="capacity-metric">
                <span>Fascia piu' affidabile</span>
                <strong>{simulation.profile.reliableWindow}</strong>
              </div>
              <div className="capacity-metric">
                <span>Buffer efficaci</span>
                <strong>{Math.round(simulation.profile.bufferEffectiveness * 100)}%</strong>
              </div>
            </div>
            <div className="week-results">
              {simulation.weeks.map((week) => (
                <article className="week-result" key={week.weekNumber}>
                  <div>
                    <span>Settimana {week.weekNumber}</span>
                    <strong>{Math.round(week.completionRate * 100)}% completato</strong>
                  </div>
                  <p>
                    {formatMinutes(week.completedFocusMinutes)} su {formatMinutes(week.plannedFocusMinutes)}. {week.completedBlocks} completati, {week.movedBlocks} recuperati, {week.skippedBlocks} saltati.
                  </p>
                </article>
              ))}
            </div>
            <p className="simulation-recommendation">{simulation.recommendation}</p>
          </>
        ) : (
          <p className="simulation-empty-copy">
            Avanza nel tempo per generare eventi ripetibili di completamento, recupero e salto. Il simulatore stima quanto il piano sia sostenibile prima di raccogliere dati reali.
          </p>
        )}
      </div>
    </section>
  );
}
