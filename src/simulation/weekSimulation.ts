import type { CalendarActivity as PlanBlock, Weekday } from "../domain/planning";
import type {
  AdaptiveCapacityProfile,
  BlockOutcome,
  SimulatedBlockEvent,
  SimulatedWeek,
  SimulationInput,
  SimulationRun
} from "./contracts";

const dayScores: Record<Weekday, number> = {
  mon: 0.96,
  tue: 1,
  wed: 0.93,
  thu: 0.9,
  fri: 0.84,
  sat: 0.9,
  sun: 0.86
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDuration(block: PlanBlock) {
  const start = toMinutes(block.start);
  const end = toMinutes(block.end);
  return end > start ? end - start : 24 * 60 - start + end;
}

// Deterministic pseudo-random values make scenario comparisons repeatable.
function seededValue(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getWindow(start: string): "morning" | "afternoon" | "evening" {
  const hour = toMinutes(start) / 60;
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getBaseReliability(input: SimulationInput) {
  const { answers, result } = input;
  const workloadPenalty = {
    light: 0.02,
    balanced: 0.08,
    stretched: 0.18,
    overloaded: 0.32
  }[result.derivedFeatures.workloadLevel];
  const flexibilityBonus = {
    rigid: -0.04,
    mixed: 0.03,
    flexible: 0.08
  }[answers.flexibilityMode];
  const focusPenalty = Math.max(0, answers.focusMinutes - 60) / 300;

  return Math.min(0.92, Math.max(0.35, 0.78 - workloadPenalty + flexibilityBonus - focusPenalty));
}

function simulateFocusBlock(
  block: PlanBlock,
  weekNumber: number,
  baseReliability: number,
  preferredWindow: "morning" | "afternoon" | "evening",
  hasBuffer: boolean,
  index: number
): SimulatedBlockEvent {
  const plannedMinutes = getDuration(block);
  const window = getWindow(block.start);
  const windowBonus = window === preferredWindow ? 0.1 : window === "evening" ? -0.08 : -0.02;
  const durationPenalty = Math.max(0, plannedMinutes - 60) / 240;
  const score = baseReliability + dayScores[block.day] - 1 + windowBonus - durationPenalty;
  const eventValue = seededValue(weekNumber * 100 + index + plannedMinutes);
  let outcome: BlockOutcome = "completed";
  let completedMinutes = plannedMinutes;
  let reason = "Blocco completato nella fascia prevista.";

  if (eventValue > score && hasBuffer && eventValue <= score + 0.13) {
    outcome = "moved";
    completedMinutes = plannedMinutes;
    reason = "Recuperato sfruttando un buffer della settimana.";
  } else if (eventValue > score) {
    outcome = "skipped";
    completedMinutes = 0;
    reason = window === "evening"
      ? "Saltato: fascia serale meno sostenibile per questo profilo."
      : "Saltato: carico e imprevisti hanno ridotto la capacita' disponibile.";
  }

  return {
    blockId: block.id,
    title: block.title,
    day: block.day,
    outcome,
    plannedMinutes,
    completedMinutes,
    reason
  };
}

function buildAdaptiveProfile(input: SimulationInput, weeks: SimulatedWeek[]): AdaptiveCapacityProfile {
  const allEvents = weeks.flatMap((week) => week.events);
  const plannedMinutes = allEvents.reduce((total, event) => total + event.plannedMinutes, 0);
  const completedMinutes = allEvents.reduce((total, event) => total + event.completedMinutes, 0);
  const completionConfidence = plannedMinutes === 0 ? 0 : completedMinutes / plannedMinutes;
  const averageCompletedMinutes = weeks.length === 0 ? 0 : completedMinutes / weeks.length;
  const moved = allEvents.filter((event) => event.outcome === "moved").length;
  const unsuccessful = allEvents.filter((event) => event.outcome === "skipped").length;
  const byWindow = (["morning", "afternoon", "evening"] as const).map((window) => {
    const events = allEvents.filter((event) => {
      const block = input.result.plan.blocks.find((candidate) => candidate.id === event.blockId);
      return block ? getWindow(block.start) === window : false;
    });
    const rate = events.length === 0
      ? 0
      : events.reduce((total, event) => total + event.completedMinutes, 0) /
        events.reduce((total, event) => total + event.plannedMinutes, 0);
    return { window, rate };
  });
  const reliableWindow = [...byWindow].sort((left, right) => right.rate - left.rate)[0].window;

  return {
    sustainableWeeklyMinutes: Math.round(averageCompletedMinutes / 30) * 30,
    sustainableFocusMinutes: Math.min(
      input.answers.focusMinutes,
      completionConfidence < 0.65 ? Math.max(30, input.answers.focusMinutes - 15) : input.answers.focusMinutes
    ),
    preferredFocusWindow: input.result.derivedFeatures.preferredFocusWindow,
    reliableWindow,
    completionConfidence,
    bufferEffectiveness: moved + unsuccessful === 0 ? 0 : moved / (moved + unsuccessful)
  };
}

function buildRecommendation(profile: AdaptiveCapacityProfile, input: SimulationInput) {
  const completionPercent = Math.round(profile.completionConfidence * 100);
  if (profile.completionConfidence < 0.65) {
    return `La simulazione stima una capacita' reale di ${profile.sustainableWeeklyMinutes} minuti a settimana (${completionPercent}% del piano). Riduci il carico iniziale e proteggi blocchi da ${profile.sustainableFocusMinutes} minuti.`;
  }

  if (profile.reliableWindow !== input.result.derivedFeatures.preferredFocusWindow) {
    return `Il profilo simulato riesce meglio nella fascia ${profile.reliableWindow}. Il replanner dovrebbe spostare li' i goal prioritari.`;
  }

  return `Il piano e' sostenibile nella simulazione (${completionPercent}% completato). Mantieni il carico e usa i buffer per i recuperi.`;
}

export function simulateWeeks(input: SimulationInput, numberOfWeeks: number): SimulationRun {
  const focusBlocks = input.result.plan.blocks.filter((block) => block.kind === "focus");
  const hasBuffer = input.result.plan.blocks.some((block) => block.kind === "buffer");
  const baseReliability = getBaseReliability(input);
  const firstWeek = input.initialWeek ?? 1;
  const weeks = Array.from({ length: numberOfWeeks }, (_, weekIndex) => {
    const weekNumber = firstWeek + weekIndex;
    const events = focusBlocks.map((block, index) =>
      simulateFocusBlock(
        block,
        weekNumber,
        baseReliability,
        input.result.derivedFeatures.preferredFocusWindow,
        hasBuffer,
        index
      )
    );
    const plannedFocusMinutes = events.reduce((total, event) => total + event.plannedMinutes, 0);
    const completedFocusMinutes = events.reduce((total, event) => total + event.completedMinutes, 0);

    return {
      weekNumber,
      plannedFocusMinutes,
      completedFocusMinutes,
      completionRate: plannedFocusMinutes === 0 ? 0 : completedFocusMinutes / plannedFocusMinutes,
      completedBlocks: events.filter((event) => event.outcome === "completed").length,
      movedBlocks: events.filter((event) => event.outcome === "moved").length,
      skippedBlocks: events.filter((event) => event.outcome === "skipped").length,
      events
    } satisfies SimulatedWeek;
  });
  const profile = buildAdaptiveProfile(input, weeks);

  return { weeks, profile, recommendation: buildRecommendation(profile, input) };
}
