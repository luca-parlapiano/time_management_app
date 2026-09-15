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

export interface PlanningIntentApplication {
  answers: RawAnswers;
  changes: string[];
  questions: string[];
}

function normalizedGoalName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function goalNamesMatch(left: string, right: string) {
  const normalizedLeft = normalizedGoalName(left);
  const normalizedRight = normalizedGoalName(right);
  if (normalizedLeft === normalizedRight) return true;
  if (
    Math.min(normalizedLeft.length, normalizedRight.length) >= 5 &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
  ) {
    return true;
  }
  return (
    Math.min(normalizedLeft.length, normalizedRight.length) >= 5 &&
    Math.abs(normalizedLeft.length - normalizedRight.length) <= 1 &&
    editDistance(normalizedLeft, normalizedRight) <= 1
  );
}

function requestsAnIncrease(text: string) {
  return /\b(aggiung\w*|aument\w*|increment\w*|ulterior\w*|altr[ei]?|extra|in piu)\b/i.test(
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
}

function explicitGoalIncrease(currentAnswers: RawAnswers, userText: string): GoalInput | null {
  if (!requestsAnIncrease(userText)) return null;

  const normalizedText = normalizedGoalName(userText);
  const currentGoal = currentAnswers.goals.find((goal) =>
    normalizedText.includes(normalizedGoalName(goal.name)),
  );
  if (!currentGoal) return null;

  const duration = userText.match(/\b(\d+(?:[.,]\d+)?)\s*(ore?|h|min(?:ut[oi])?)\b/i);
  if (!duration) return null;
  const amount = Number(duration[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = duration[2].toLocaleLowerCase("it");
  const desiredWeeklyMinutes = Math.round(
    unit.startsWith("or") || unit === "h" ? amount * 60 : amount,
  );

  return {
    name: currentGoal.name,
    priority: currentGoal.priority,
    desiredWeeklyMinutes,
  };
}

export function applyPlanningIntentUpdate(
  currentAnswers: RawAnswers,
  intent: PlanningIntent,
  userText: string,
): PlanningIntentApplication {
  const nextGoals = [...currentAnswers.goals];
  const changes: string[] = [];
  const questions: string[] = [];
  const additive = requestsAnIncrease(userText);
  const explicitIncrease = explicitGoalIncrease(currentAnswers, userText);
  const goals = explicitIncrease
    ? [
        { ...explicitIncrease, source: "explicit" as const },
        ...intent.goals.filter((goal) => !goalNamesMatch(goal.name, explicitIncrease.name)),
      ]
    : intent.goals;

  goals.forEach((goal) => {
    const goalIndex = nextGoals.findIndex(
      (candidate) => goalNamesMatch(candidate.name, goal.name),
    );
    const currentGoal = goalIndex >= 0 ? nextGoals[goalIndex] : undefined;
    const priority = goal.priority ?? currentGoal?.priority;
    let desiredWeeklyMinutes = goal.desiredWeeklyMinutes ?? currentGoal?.desiredWeeklyMinutes;

    if (currentGoal && additive && goal.desiredWeeklyMinutes !== undefined) {
      desiredWeeklyMinutes = currentGoal.desiredWeeklyMinutes + goal.desiredWeeklyMinutes;
    }
    if (priority === undefined) {
      questions.push(`Che priorità da 1 a 5 vuoi assegnare a “${goal.name}”?`);
    }
    if (desiredWeeklyMinutes === undefined) {
      questions.push(`Quanti minuti alla settimana vuoi dedicare a “${goal.name}”?`);
    }
    if (priority === undefined || desiredWeeklyMinutes === undefined) return;

    const updatedGoal: GoalInput = {
      name: currentGoal?.name ?? goal.name,
      priority,
      desiredWeeklyMinutes,
    };
    if (currentGoal) {
      nextGoals[goalIndex] = updatedGoal;
      changes.push(
        `${updatedGoal.name}: da ${currentGoal.desiredWeeklyMinutes} a ${desiredWeeklyMinutes} minuti settimanali`,
      );
    } else {
      nextGoals.push(updatedGoal);
      changes.push(`${updatedGoal.name}: aggiunto con ${desiredWeeklyMinutes} minuti settimanali`);
    }
  });

  return {
    answers: { ...currentAnswers, goals: nextGoals },
    changes,
    questions: uniqueQuestions([...questions, ...intent.questions]),
  };
}
