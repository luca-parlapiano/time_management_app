import type { CSSProperties } from "react";
import type { HabitJourneyProgress } from "../../domain/habitTimeline.js";

/** Percorso a step con segnaposto statico, pronto per la futura animazione. */
export function HabitJourney({ progress, compact = false }: { progress: HabitJourneyProgress; compact?: boolean }) {
  const position = progress.target === 1 ? (progress.currentStep ? 100 : 0) : progress.currentStep / progress.target * 100;
  const reached = progress.currentStep === progress.target;
  return <div className={`habit-journey${compact ? " habit-journey-compact" : ""}`} aria-label={`Percorso: ${progress.currentStep} step su ${progress.target}. Capitolo ${progress.chapter}.`}>
    <div className="habit-journey-track" style={{ "--journey-position": `${position}%` } as CSSProperties}>
      <span className="habit-journey-character" aria-hidden="true">●</span>
      <ol aria-hidden="true">{Array.from({ length: progress.target }, (_, index) => <li key={index} className={index < progress.currentStep ? "completed" : undefined} />)}</ol>
    </div>
    <p><strong>{progress.currentStep} di {progress.target}</strong> {reached ? "· Traguardo raggiunto" : "verso il traguardo"}</p>
    {!compact && progress.milestonesReached > 0 && <small>{progress.milestonesReached} {progress.milestonesReached === 1 ? "traguardo raggiunto" : "traguardi raggiunti"} nel percorso</small>}
  </div>;
}
