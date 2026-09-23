import type { RawAnswers } from "./planning.js";
import type { PlanningIntent } from "./planningIntent.js";

export interface GoalIntentResolution {
  intentIndex: number;
  priority?: number;
  desiredWeeklyMinutes?: number;
}

export type PlanningIntentMissingField = {
  key: string;
  category: "goals" | "tasks" | "habits";
  intentIndex: number;
  field:
    | "priority"
    | "desiredWeeklyMinutes"
    | "durationMinutes"
    | "whenExpression"
    | "frequency";
  question: string;
};

export interface PlanningIntentReview {
  intent: PlanningIntent;
  requiredGoalDetails: Array<{
    intentIndex: number;
    name: string;
    needsPriority: true;
    needsDesiredWeeklyMinutes: true;
  }>;
  missingFields: PlanningIntentMissingField[];
  unmapped: {
    goalDeadlines: Array<{ name: string; deadlineExpression: string }>;
    tasks: PlanningIntent["tasks"];
    habits: PlanningIntent["habits"];
    constraints: PlanningIntent["constraints"];
    preferences: PlanningIntent["preferences"];
  };
  questions: string[];
  readyForFinalConfirmation: boolean;
}

export interface PlanningIntentApplication {
  answers: RawAnswers;
  changes: string[];
  questions: string[];
}
