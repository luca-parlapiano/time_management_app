import { useState } from "react";
import {
  NewUserWizardModal,
  type NewUserWizardSubmission,
} from "./components/NewUserWizardModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { SimulationPanel } from "./components/SimulationPanel";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { defaultAnswers } from "./planner/defaults";
import { buildPrototypePlan } from "./planner/mockPlanner";
import type { PlannerResult, RawAnswers } from "./planner/contracts";
import { formatTimeRange } from "./utils/time";

interface ActivePlanSummary {
  id: string;
  title: string;
  description: string;
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewUserWizardOpen, setIsNewUserWizardOpen] = useState(false);
  const [answers, setAnswers] = useState<RawAnswers | null>(null);
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlanSummary | null>(null);
  const hasActivePlan = Boolean(activePlan && answers && plannerResult);

  const goalNames = (answers?.goals ?? [])
    .filter((goal) => goal.name.trim().length > 0)
    .map((goal) => `${goal.name} (${Math.round(goal.desiredWeeklyMinutes / 60)}h)`)
    .join(", ");

  function applyAnswers(nextAnswers: RawAnswers, nextPlan?: ActivePlanSummary) {
    setAnswers(nextAnswers);
    setPlannerResult(buildPrototypePlan(nextAnswers));
    if (nextPlan) {
      setActivePlan(nextPlan);
    }
  }

  function applyWizardSubmission(submission: NewUserWizardSubmission) {
    applyAnswers(submission.answers, submission.selectedPlan);
    setIsNewUserWizardOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className="hero-panel">
        <p className="eyebrow">Prototype Desktop</p>
        <h1>Simulatore locale del planner prima del motore definitivo.</h1>
        <p className="hero-copy">
          Ora il prototipo non mostra solo il calendario: mette a confronto profili
          utente, feature derivate e scelte del motore per capire cosa influenza davvero
          la pianificazione.
        </p>

        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => setIsNewUserWizardOpen(true)}
          >
            Nuovo utente
          </button>
          <button className="secondary-button" onClick={() => setIsModalOpen(true)}>
            Modifica profilo
          </button>
        </div>

        <div className="summary-card">
          <h2>Profilo attuale</h2>
          {hasActivePlan && answers && plannerResult ? (
            <>
              <p>
                Goal: <strong>{goalNames || "Nessun obiettivo definito"}</strong>
              </p>
              <p>
                Lavoro: <strong>{formatTimeRange(answers.workStart, answers.workEnd)}</strong>
              </p>
              <p>
                Energia focus: <strong>{plannerResult.derivedFeatures.preferredFocusWindow}</strong>
              </p>
              <p>
                Carico rilevato: <strong>{plannerResult.derivedFeatures.workloadLevel}</strong>
              </p>
            </>
          ) : (
            <p className="summary-empty-copy">
              Nessun profilo applicato. Completa il wizard e premi <strong>Avvia piano</strong>.
            </p>
          )}
        </div>

        <div className="summary-card">
          <h2>Piano selezionato</h2>
          {activePlan ? (
            <>
              <p>
                <strong>{activePlan.title}</strong>
              </p>
              <p>{activePlan.description}</p>
            </>
          ) : (
            <p className="summary-empty-copy">
              La dashboard resta vuota finche' non avvii un piano dall'anteprima finale.
            </p>
          )}
        </div>

        <div className="summary-card">
          <h2>Logica prototipo</h2>
          {plannerResult ? (
            <ul className="summary-list">
              {plannerResult.plan.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="summary-empty-copy">
              Qui compariranno le scelte del prototipo quando il piano verra' avviato.
            </p>
          )}
        </div>
      </aside>

      <main className="calendar-panel">
        <div className="calendar-header">
          <div>
            <p className="eyebrow">Week View</p>
            <h2>Calendario del piano</h2>
          </div>
          <div className="calendar-header-badge">
            {activePlan ? (
              <>
                Piano attivo: <strong>{activePlan.title}</strong>
              </>
            ) : (
              "Nessun piano attivo"
            )}
          </div>
        </div>

        <WeeklyCalendar plan={plannerResult?.plan} />
        {answers && plannerResult ? (
          <SimulationPanel answers={answers} result={plannerResult} />
        ) : null}
      </main>

      {isModalOpen ? (
        <OnboardingModal
          answers={answers ?? defaultAnswers}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(nextAnswers) => {
            applyAnswers(nextAnswers, {
              id: "custom-profile",
              title: "Profilo personalizzato",
              description: "Profilo aggiornato manualmente dalla dashboard.",
            });
            setIsModalOpen(false);
          }}
        />
      ) : null}

      {isNewUserWizardOpen ? (
        <NewUserWizardModal
          onClose={() => setIsNewUserWizardOpen(false)}
          onSubmit={applyWizardSubmission}
        />
      ) : null}
    </div>
  );
}

export default App;
