import type { ActivityEvent, PlannerResult, RawAnswers } from "../domain/planning";

const STORAGE_KEY = "time-planner.local-state.v1";

export interface LocalActivePlan {
  id: string;
  title: string;
  description: string;
}

export interface LocalPlannerState {
  answers: RawAnswers;
  plannerResult: PlannerResult;
  activePlan: LocalActivePlan;
  blockEvents: Record<string, ActivityEvent>;
}

function hasRequiredFields(value: unknown): value is LocalPlannerState {
  if (!value || typeof value !== "object") return false;

  const state = value as Partial<LocalPlannerState>;
  return Boolean(state.answers && state.plannerResult && state.activePlan && state.blockEvents);
}

// The first release keeps the full planner state on this device only.
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

export function saveLocalPlannerState(state: LocalPlannerState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
