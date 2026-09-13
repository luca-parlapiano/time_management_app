import type { GoalInput, RawAnswers } from "../domain/planning";
import type { PlanningIntent } from "../domain/planningIntent";

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

function uniqueQuestions(questions: string[]) {
  return [...new Set(questions.map((question) => question.trim()).filter(Boolean))];
}

export function createPlanningIntentReview(intent: PlanningIntent): PlanningIntentReview {
  const requiredGoalDetails = intent.goals.map((goal, intentIndex) => ({
    intentIndex,
    name: goal.name,
    needsPriority: true as const,
    needsDesiredWeeklyMinutes: true as const,
  }));
  const goalMissingFields: PlanningIntentMissingField[] = intent.goals.flatMap((goal, intentIndex) => [
    ...(goal.priority === undefined ? [{
      key: `goals.${intentIndex}.priority`,
      category: "goals" as const,
      intentIndex,
      field: "priority" as const,
      question: `Che priorita da 1 a 5 vuoi assegnare a "${goal.name}"?`,
    }] : []),
    ...(goal.desiredWeeklyMinutes === undefined ? [{
      key: `goals.${intentIndex}.desiredWeeklyMinutes`,
      category: "goals" as const,
      intentIndex,
      field: "desiredWeeklyMinutes" as const,
      question: `Quanti minuti alla settimana vuoi dedicare a "${goal.name}"?`,
    }] : []),
  ]);
  const taskMissingFields: PlanningIntentMissingField[] = intent.tasks.flatMap((task, intentIndex) => {
    const missing: PlanningIntentMissingField[] = [];
    if (task.durationMinutes === undefined) {
      missing.push({
        key: `tasks.${intentIndex}.durationMinutes`,
        category: "tasks",
        intentIndex,
        field: "durationMinutes",
        question: `Quanto tempo prevedi per "${task.name}"?`,
      });
    }
    if (!task.whenExpression && !task.deadlineExpression) {
      missing.push({
        key: `tasks.${intentIndex}.whenExpression`,
        category: "tasks",
        intentIndex,
        field: "whenExpression",
        question: `Quando vuoi svolgere "${task.name}"?`,
      });
    }
    return missing;
  });
  const habitMissingFields: PlanningIntentMissingField[] = intent.habits.flatMap((habit, intentIndex) => {
    const missing: PlanningIntentMissingField[] = [];
    if (!habit.frequency) {
      missing.push({
        key: `habits.${intentIndex}.frequency`,
        category: "habits",
        intentIndex,
        field: "frequency",
        question: `Con quale frequenza vuoi ripetere "${habit.name}"?`,
      });
    }
    if (habit.durationMinutes === undefined) {
      missing.push({
        key: `habits.${intentIndex}.durationMinutes`,
        category: "habits",
        intentIndex,
        field: "durationMinutes",
        question: `Quanto deve durare ogni sessione di "${habit.name}"?`,
      });
    }
    return missing;
  });
  const missingFields = [...goalMissingFields, ...taskMissingFields, ...habitMissingFields];

  return {
    intent,
    requiredGoalDetails,
    missingFields,
    unmapped: {
      goalDeadlines: intent.goals.flatMap((goal) =>
        goal.deadlineExpression
          ? [{ name: goal.name, deadlineExpression: goal.deadlineExpression }]
          : [],
      ),
      tasks: intent.tasks,
      habits: intent.habits,
      constraints: intent.constraints,
      preferences: intent.preferences,
    },
    questions: uniqueQuestions([...intent.questions, ...missingFields.map((item) => item.question)]),
    readyForFinalConfirmation: missingFields.length === 0 && intent.questions.length === 0,
  };
}

export function getNextPlanningQuestion(review: PlanningIntentReview) {
  return review.questions[0];
}

export function buildPlanningFollowUpInput(
  initialRequest: string,
  question: string,
  userAnswer: string,
) {
  return [
    `Richiesta iniziale: ${initialRequest.trim()}`,
    `Domanda dell'app: ${question.trim()}`,
    `Risposta dell'utente: ${userAnswer.trim()}`,
  ].join("\n");
}

function validatedGoal(intent: PlanningIntent, resolution: GoalIntentResolution): GoalInput {
  const goal = intent.goals[resolution.intentIndex];
  if (!goal) throw new Error(`Obiettivo ${resolution.intentIndex} non presente nell'intento`);
  const priority = resolution.priority ?? goal.priority;
  const desiredWeeklyMinutes = resolution.desiredWeeklyMinutes ?? goal.desiredWeeklyMinutes;
  if (!Number.isInteger(priority) || Number(priority) < 1 || Number(priority) > 5) {
    throw new Error(`La priorita di "${goal.name}" deve essere un intero tra 1 e 5`);
  }
  if (!Number.isInteger(desiredWeeklyMinutes) || Number(desiredWeeklyMinutes) < 1) {
    throw new Error(`I minuti settimanali di "${goal.name}" devono essere un intero positivo`);
  }
  return {
    name: goal.name,
    priority: Number(priority),
    desiredWeeklyMinutes: Number(desiredWeeklyMinutes),
  };
}

export function applyConfirmedIntentGoals(
  currentAnswers: RawAnswers,
  intent: PlanningIntent,
  resolutions: GoalIntentResolution[],
  mode: "append" | "replace" = "append",
): RawAnswers {
  const resolutionsByIndex = new Map(resolutions.map((resolution) => [resolution.intentIndex, resolution]));
  const indexes = new Set(resolutions.map((resolution) => resolution.intentIndex));
  if (indexes.size !== resolutions.length) {
    throw new Error("Le conferme degli obiettivi contengono indici duplicati");
  }
  const confirmedGoals = intent.goals.map((_, intentIndex) =>
    validatedGoal(intent, resolutionsByIndex.get(intentIndex) ?? { intentIndex }),
  );

  return {
    ...currentAnswers,
    goals: mode === "replace" ? confirmedGoals : [...currentAnswers.goals, ...confirmedGoals],
  };
}
