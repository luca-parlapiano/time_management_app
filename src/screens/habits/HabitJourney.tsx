import type { CSSProperties } from "react";
import type { HabitJourneyProgress } from "../../model/habit.js";
import { percentage } from "../../utils/math.js";

/** Percorso a step con segnaposto statico, pronto per la futura animazione. */
export function HabitJourney({ progress, compact = false }: { progress: HabitJourneyProgress; compact?: boolean }) {
  const position = percentage(progress.currentStep, progress.target);
  const reached = progress.currentStep === progress.target;
  return <div className={`habit-journey${compact ? " habit-journey-compact" : ""}`} aria-label={`Percorso: ${progress.currentStep} eventi valutati su ${progress.target}. ${reached ? "Serie conclusa." : "Serie in corso."} ${progress.completed} eventi fatti.`}>
    <div className="habit-journey-track" style={{ "--journey-position": `${position}%` } as CSSProperties}>
      <span className="habit-journey-character" aria-hidden="true">●</span>
      <ol aria-hidden="true">{Array.from({ length: progress.target }, (_, index) => <li key={index} className={index < progress.currentStep ? "completed" : undefined} />)}</ol>
    </div>
    <p><strong>{progress.currentStep} di {progress.target}</strong> eventi valutati {reached ? "· Serie conclusa" : "· Serie in corso"}</p>
    <small>{progress.completed} eventi fatti su {progress.target}</small>
  </div>;
}
