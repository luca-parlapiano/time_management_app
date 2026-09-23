

export type PlanningIntentSource = "explicit" | "inferred";

export interface PlanningIntentGoal {
  name: string;
  priority?: number;
  desiredWeeklyMinutes?: number;
  deadlineExpression?: string;
  source: PlanningIntentSource;
}

export interface PlanningIntentTask {
  name: string;
  durationMinutes?: number;
  whenExpression?: string;
  deadlineExpression?: string;
  source: PlanningIntentSource;
}

export interface PlanningIntentHabit {
  name: string;
  frequency?: string;
  durationMinutes?: number;
  preferredWindow?: string;
  source: PlanningIntentSource;
}

export interface PlanningIntentDescription {
  description: string;
  source: PlanningIntentSource;
}

export interface PlanningIntent {
  goals: PlanningIntentGoal[];
  tasks: PlanningIntentTask[];
  habits: PlanningIntentHabit[];
  constraints: PlanningIntentDescription[];
  preferences: PlanningIntentDescription[];
  questions: string[];
}

export type PlanningIntentParseResult =
  | { ok: true; value: PlanningIntent }
  | { ok: false; errors: string[] };
