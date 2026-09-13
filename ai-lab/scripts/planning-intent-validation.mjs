const validSources = new Set(["explicit", "inferred"]);

function issue(path, message) {
  return `${path}: ${message}`;
}

function text(value, path, maxLength, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(issue(path, "must be a non-empty string"));
  } else if (value.length > maxLength) {
    errors.push(issue(path, `must not exceed ${maxLength} characters`));
  }
}

function sourcedItems(items, path, fields, errors) {
  if (!Array.isArray(items)) {
    errors.push(issue(path, "must be an array"));
    return;
  }

  const allowed = new Set(["source", ...fields.map(({ name }) => name)]);
  for (const [index, item] of items.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(issue(itemPath, "must be an object"));
      continue;
    }
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) errors.push(issue(itemPath, `has unexpected property ${key}`));
    }
    if (!validSources.has(item.source)) errors.push(issue(`${itemPath}.source`, "must be explicit or inferred"));
    for (const field of fields) {
      if (!(field.name in item)) {
        if (field.required) errors.push(issue(itemPath, `lacks ${field.name}`));
        continue;
      }
      if (field.type === "text") text(item[field.name], `${itemPath}.${field.name}`, field.maxLength, errors);
      if (field.type === "integer") {
        const value = item[field.name];
        if (!Number.isInteger(value) || value < field.minimum || value > field.maximum) {
          errors.push(issue(`${itemPath}.${field.name}`, `must be an integer between ${field.minimum} and ${field.maximum}`));
        }
      }
    }
  }
}

export function validatePlanningIntent(value) {
  const errors = [];
  const requiredKeys = ["goals", "tasks", "habits", "constraints", "preferences", "questions"];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["output must be an object"];

  for (const key of Object.keys(value)) {
    if (!requiredKeys.includes(key)) errors.push(issue("output", `has unexpected property ${key}`));
  }
  for (const key of requiredKeys) {
    if (!(key in value)) errors.push(issue("output", `lacks ${key}`));
  }

  sourcedItems(value.goals, "output.goals", [
    { name: "name", type: "text", maxLength: 120, required: true },
    { name: "priority", type: "integer", minimum: 1, maximum: 5 },
    { name: "desiredWeeklyMinutes", type: "integer", minimum: 1, maximum: 10080 },
    { name: "deadlineExpression", type: "text", maxLength: 80 },
  ], errors);
  sourcedItems(value.tasks, "output.tasks", [
    { name: "name", type: "text", maxLength: 120, required: true },
    { name: "durationMinutes", type: "integer", minimum: 1, maximum: 720 },
    { name: "whenExpression", type: "text", maxLength: 80 },
    { name: "deadlineExpression", type: "text", maxLength: 80 },
  ], errors);
  sourcedItems(value.habits, "output.habits", [
    { name: "name", type: "text", maxLength: 120, required: true },
    { name: "frequency", type: "text", maxLength: 80 },
    { name: "durationMinutes", type: "integer", minimum: 1, maximum: 720 },
    { name: "preferredWindow", type: "text", maxLength: 80 },
  ], errors);
  const described = [{ name: "description", type: "text", maxLength: 240, required: true }];
  sourcedItems(value.constraints, "output.constraints", described, errors);
  sourcedItems(value.preferences, "output.preferences", described, errors);

  if (!Array.isArray(value.questions)) {
    errors.push(issue("output.questions", "must be an array"));
  } else {
    for (const [index, question] of value.questions.entries()) text(question, `output.questions[${index}]`, 240, errors);
  }
  return errors;
}
