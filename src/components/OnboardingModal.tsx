import { useMemo, useState } from "react";
import { checkPlanCapacity } from "../planner/mockPlanner";
import {
  createEmptyGoal,
  formatWeeklyGoalDuration,
  goalPriorityOptions,
  weeklyGoalDurationOptions
} from "../planner/defaults";
import type { GoalInput, RawAnswers } from "../planner/contracts";

interface OnboardingModalProps {
  answers: RawAnswers;
  onClose: () => void;
  onSubmit: (answers: RawAnswers) => void;
}

export function OnboardingModal({ answers, onClose, onSubmit }: OnboardingModalProps) {
  const [localAnswers, setLocalAnswers] = useState<RawAnswers>(answers);
  const capacityCheck = useMemo(() => checkPlanCapacity(localAnswers), [localAnswers]);

  function updateGoal(index: number, partial: Partial<GoalInput>) {
    setLocalAnswers((current) => ({
      ...current,
      goals: current.goals.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, ...partial } : goal
      )
    }));
  }

  function addGoal() {
    setLocalAnswers((current) => ({
      ...current,
      goals: [...current.goals, createEmptyGoal()]
    }));
  }

  function removeGoal(index: number) {
    setLocalAnswers((current) => ({
      ...current,
      goals:
        current.goals.length === 1
          ? [createEmptyGoal()]
          : current.goals.filter((_, goalIndex) => goalIndex !== index)
    }));
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Onboarding</p>
            <h3>Domande base del planner</h3>
          </div>
          <button className="ghost-button" onClick={onClose}>
            Chiudi
          </button>
        </div>

        <div className="form-grid">
          <section className="form-section">
            <div className="form-section-header">
              <h4>Lavoro</h4>
              <p>Blocco fisso da proteggere nel calendario.</p>
            </div>

            <div className="form-row form-row-two-columns">
              <label>
                Inizio
                <input
                  type="time"
                  value={localAnswers.workStart}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      workStart: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Fine
                <input
                  type="time"
                  value={localAnswers.workEnd}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      workEnd: event.target.value
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h4>Routine personale</h4>
              <p>Finestra di veglia utile per sapere quando puoi pianificare.</p>
            </div>

            <div className="form-row form-row-two-columns">
              <label>
                Risveglio
                <input
                  type="time"
                  value={localAnswers.wake}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      wake: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Sonno
                <input
                  type="time"
                  value={localAnswers.sleep}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      sleep: event.target.value
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h4>Profilo energia</h4>
              <p>Serve a vedere come la distribuzione energia cambia la scelta dei blocchi focus.</p>
            </div>

            <div className="form-row form-row-three-columns">
              <label>
                Mattina
                <select
                  value={localAnswers.energyProfile.morning}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      energyProfile: {
                        ...current.energyProfile,
                        morning: event.target.value as RawAnswers["energyProfile"]["morning"]
                      }
                    }))
                  }
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </label>

              <label>
                Pomeriggio
                <select
                  value={localAnswers.energyProfile.afternoon}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      energyProfile: {
                        ...current.energyProfile,
                        afternoon: event.target.value as RawAnswers["energyProfile"]["afternoon"]
                      }
                    }))
                  }
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </label>

              <label>
                Sera
                <select
                  value={localAnswers.energyProfile.evening}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      energyProfile: {
                        ...current.energyProfile,
                        evening: event.target.value as RawAnswers["energyProfile"]["evening"]
                      }
                    }))
                  }
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h4>Obiettivi</h4>
              <p>
                Per ogni obiettivo definisci importanza e tempo settimanale desiderato.
                La scelta qui sotto usa ore/settimana, piu' facile da capire al primo colpo.
              </p>
            </div>

            <div className="goal-list">
              {localAnswers.goals.map((goal, index) => (
                <div key={`goal-${index}`} className="goal-item">
                  <div className="goal-item-header">
                    <span className="goal-item-index">Obiettivo {index + 1}</span>
                    <button
                      type="button"
                      className="goal-remove-button"
                      onClick={() => removeGoal(index)}
                    >
                      Rimuovi
                    </button>
                  </div>

                  <div className="form-row">
                    <label>
                      Nome obiettivo
                      <input
                        value={goal.name}
                        placeholder="Es. Studio AI"
                        onChange={(event) =>
                          updateGoal(index, { name: event.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="form-row form-row-goals">
                    <label>
                      Importanza
                      <select
                        value={goal.priority}
                        onChange={(event) =>
                          updateGoal(index, { priority: Number(event.target.value) })
                        }
                      >
                        {goalPriorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority} / 5
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Quanto tempo vuoi dedicarci ogni settimana
                      <select
                        value={goal.desiredWeeklyMinutes}
                        onChange={(event) =>
                          updateGoal(index, {
                            desiredWeeklyMinutes: Number(event.target.value) || 30
                          })
                        }
                      >
                        {weeklyGoalDurationOptions.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {formatWeeklyGoalDuration(minutes)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}

              <button type="button" className="goal-add-button" onClick={addGoal}>
                + Aggiungi obiettivo
              </button>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-header">
              <h4>Strategia del piano</h4>
              <p>Definisce dimensione dei blocchi e margine per gli imprevisti.</p>
            </div>

            <div className="form-row form-row-two-columns">
              <label>
                Durata blocco focus (minuti)
                <select
                  value={localAnswers.focusMinutes}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      focusMinutes: Number(event.target.value)
                    }))
                  }
                >
                  <option value={30}>30 minuti</option>
                  <option value={60}>60 minuti</option>
                  <option value={90}>90 minuti</option>
                  <option value={120}>120 minuti</option>
                </select>
              </label>

              <label>
                Flessibilita'
                <select
                  value={localAnswers.flexibilityMode}
                  onChange={(event) =>
                    setLocalAnswers((current) => ({
                      ...current,
                      flexibilityMode: event.target.value as RawAnswers["flexibilityMode"]
                    }))
                  }
                >
                  <option value="rigid">Rigido</option>
                  <option value="mixed">Misto</option>
                  <option value="flexible">Flessibile</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        {!capacityCheck.isCompatible ? (
          <div className="capacity-warning" role="alert">
            <h4>Piano incompatibile con le 24h</h4>
            <p>
              Il piano non puo' essere generato finche' lavoro, sonno e obiettivi
              richiesti non rientrano nel tempo disponibile.
            </p>
            {capacityCheck.dailyIssues.map((issue) => (
              <p key={issue} className="capacity-warning-line">
                {issue}
              </p>
            ))}
            {capacityCheck.weeklyIssue ? (
              <p className="capacity-warning-line">{capacityCheck.weeklyIssue}</p>
            ) : null}
          </div>
        ) : (
          <div className="capacity-ok">
            Restano circa{" "}
            <strong>
              {Math.floor(capacityCheck.remainingWeeklyMinutes / 60)}h{" "}
              {capacityCheck.remainingWeeklyMinutes % 60}m
            </strong>{" "}
            liberi dopo lavoro, sonno e obiettivi richiesti.
          </div>
        )}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Annulla
          </button>
          <button
            className="primary-button"
            onClick={() => onSubmit(localAnswers)}
            disabled={!capacityCheck.isCompatible}
          >
            Genera piano
          </button>
        </div>
      </div>
    </div>
  );
}
