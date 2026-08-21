import type { PlannerResult, RawAnswers } from "../planner/contracts";
import { formatTimeRange } from "../utils/time";

interface SimulationPanelProps {
  answers: RawAnswers;
  result: PlannerResult;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function SimulationPanel({ answers, result }: SimulationPanelProps) {
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
    </section>
  );
}
