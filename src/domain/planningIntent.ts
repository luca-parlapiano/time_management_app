import { requiredRootKeys } from "../constants.js";
import { isIntegerInRange } from "../utils/numbers.js";
import type { PlanningIntent, PlanningIntentParseResult } from "../model/planningIntent.js";
export type { PlanningIntent,PlanningIntentDescription,PlanningIntentGoal,PlanningIntentHabit,PlanningIntentParseResult,PlanningIntentSource,PlanningIntentTask } from "../model/planningIntent.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateText(
  value: unknown,
  path: string,
  errors: string[],
  maxLength: number,
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} deve essere una stringa non vuota`);
  } else if (value.length > maxLength) {
    errors.push(`${path} supera ${maxLength} caratteri`);
  }
}

function validateSource(value: unknown, path: string, errors: string[]) {
  if (value !== "explicit" && value !== "inferred") {
    errors.push(`${path} deve essere explicit o inferred`);
  }
}

function validateItems(
  value: unknown,
  path: string,
  allowedFields: readonly string[],
  validateItem: (item: Record<string, unknown>, itemPath: string, errors: string[]) => void,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} deve essere un array`);
    return;
  }

  value.forEach((candidate, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${itemPath} deve essere un oggetto`);
      return;
    }
    Object.keys(candidate).forEach((key) => {
      if (!allowedFields.includes(key)) errors.push(`${itemPath}.${key} non e previsto`);
    });
    validateItem(candidate, itemPath, errors);
  });
}

function validateOptionalText(
  item: Record<string, unknown>,
  field: string,
  path: string,
  errors: string[],
  maxLength: number,
) {
  if (field in item) validateText(item[field], `${path}.${field}`, errors, maxLength);
}

function validateOptionalDuration(
  item: Record<string, unknown>,
  path: string,
  errors: string[],
) {
  if (!("durationMinutes" in item)) return;
  const duration = item.durationMinutes;
  if (!isIntegerInRange(duration, 1, 720)) {
    errors.push(`${path}.durationMinutes deve essere un intero tra 1 e 720`);
  }
}

export function parsePlanningIntent(value: unknown): PlanningIntentParseResult {
  if (!isRecord(value)) return { ok: false, errors: ["PlanningIntent deve essere un oggetto"] };

  const errors: string[] = [];
  Object.keys(value).forEach((key) => {
    if (!requiredRootKeys.includes(key as (typeof requiredRootKeys)[number])) {
      errors.push(`PlanningIntent.${key} non e previsto`);
    }
  });
  requiredRootKeys.forEach((key) => {
    if (!(key in value)) errors.push(`PlanningIntent.${key} e obbligatorio`);
  });

  validateItems(value.goals, "goals", ["name", "priority", "desiredWeeklyMinutes", "deadlineExpression", "source"], (item, path) => {
    validateText(item.name, `${path}.name`, errors, 120);
    if ("priority" in item && (!isIntegerInRange(item.priority, 1, 5))) {
      errors.push(`${path}.priority deve essere un intero tra 1 e 5`);
    }
    if ("desiredWeeklyMinutes" in item && (!isIntegerInRange(item.desiredWeeklyMinutes, 1, 10080))) {
      errors.push(`${path}.desiredWeeklyMinutes deve essere un intero tra 1 e 10080`);
    }
    validateOptionalText(item, "deadlineExpression", path, errors, 80);
    validateSource(item.source, `${path}.source`, errors);
  }, errors);

  validateItems(
    value.tasks,
    "tasks",
    ["name", "durationMinutes", "whenExpression", "deadlineExpression", "source"],
    (item, path) => {
      validateText(item.name, `${path}.name`, errors, 120);
      validateOptionalDuration(item, path, errors);
      validateOptionalText(item, "whenExpression", path, errors, 80);
      validateOptionalText(item, "deadlineExpression", path, errors, 80);
      validateSource(item.source, `${path}.source`, errors);
    },
    errors,
  );

  validateItems(
    value.habits,
    "habits",
    ["name", "frequency", "durationMinutes", "preferredWindow", "source"],
    (item, path) => {
      validateText(item.name, `${path}.name`, errors, 120);
      validateOptionalText(item, "frequency", path, errors, 80);
      validateOptionalDuration(item, path, errors);
      validateOptionalText(item, "preferredWindow", path, errors, 80);
      validateSource(item.source, `${path}.source`, errors);
    },
    errors,
  );

  const validateDescription = (item: Record<string, unknown>, path: string) => {
    validateText(item.description, `${path}.description`, errors, 240);
    validateSource(item.source, `${path}.source`, errors);
  };
  validateItems(value.constraints, "constraints", ["description", "source"], validateDescription, errors);
  validateItems(value.preferences, "preferences", ["description", "source"], validateDescription, errors);

  if (!Array.isArray(value.questions)) {
    errors.push("questions deve essere un array");
  } else {
    value.questions.forEach((question, index) => validateText(question, `questions[${index}]`, errors, 240));
  }

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, value: value as unknown as PlanningIntent };
}
