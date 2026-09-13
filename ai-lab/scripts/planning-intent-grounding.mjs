const NUMBER_WORDS = new Map([
  ["zero", 0], ["uno", 1], ["una", 1], ["un", 1], ["one", 1],
  ["due", 2], ["two", 2], ["tre", 3], ["three", 3], ["quattro", 4], ["four", 4],
  ["cinque", 5], ["five", 5], ["sei", 6], ["six", 6], ["sette", 7], ["seven", 7],
  ["otto", 8], ["eight", 8], ["nove", 9], ["nine", 9], ["dieci", 10], ["ten", 10],
  ["undici", 11], ["eleven", 11], ["dodici", 12], ["twelve", 12],
  ["quindici", 15], ["fifteen", 15],
  ["venti", 20], ["twenty", 20], ["trenta", 30], ["thirty", 30],
  ["quaranta", 40], ["forty", 40], ["cinquanta", 50], ["fifty", 50],
  ["sessanta", 60], ["sixty", 60],
]);

const TEMPORAL_TEXT_FIELDS = new Set([
  "deadlineExpression",
  "whenExpression",
  "preferredWindow",
  "frequency",
  "description",
]);
const PLACEHOLDER_VALUES = new Set(["non specificato", "non specificata", "unknown", "n/a", "none", "null"]);

function normalized(value) {
  return String(value).toLocaleLowerCase("it-IT").replace(/[’']/g, "'");
}

function numericFacts(text) {
  const facts = new Set((normalized(text).match(/\d+(?::\d{1,2})?/g) ?? []).flatMap((token) => {
    const [hours, minutes] = token.split(":");
    return minutes === undefined ? [String(Number(hours))] : [String(Number(hours)), `${Number(hours)}:${minutes.padStart(2, "0")}`];
  }));
  for (const [word, value] of NUMBER_WORDS) {
    if (new RegExp(`\\b${word}\\b`, "u").test(normalized(text))) facts.add(String(value));
  }
  return facts;
}

function numbersIn(text) {
  return (normalized(text).match(/\d+(?::\d{1,2})?/g) ?? []).map((token) => {
    const [hours, minutes] = token.split(":");
    return minutes === undefined ? String(Number(hours)) : `${Number(hours)}:${minutes.padStart(2, "0")}`;
  });
}

function weekdayCount(text) {
  const input = normalized(text);
  const weekdays = [
    ["lunedi", "lunedì", "monday"],
    ["martedi", "martedì", "tuesday"],
    ["mercoledi", "mercoledì", "wednesday"],
    ["giovedi", "giovedì", "thursday"],
    ["venerdi", "venerdì", "friday"],
    ["sabato", "saturday"],
    ["domenica", "sunday"],
  ];
  return weekdays.filter((aliases) => aliases.some((day) => input.includes(day))).length;
}

function explicitDurations(text) {
  const input = normalized(text).replace(/'/g, " ");
  const durations = new Set();
  if (/\bmezz[' ]ora\b/u.test(input) || /\bhalf an hour\b/u.test(input)) durations.add(30);
  if (/\bun[' ]ora e mezz[ao]\b/u.test(input) || /\bone and a half hours?\b/u.test(input)) durations.add(90);

  const halfHourPattern = "(\\d+|" + [...NUMBER_WORDS.keys()].join("|") + ")";
  const halfHourValue = (token) => /^\\d+$/.test(token) ? Number(token) : NUMBER_WORDS.get(token);
  for (const match of input.matchAll(new RegExp(`${halfHourPattern}\\s*(?:ore|hours?)\\s*e\\s*(?:mezzora|mezza\\s*ora|mezza)`, "gu"))) {
    durations.add(halfHourValue(match[1]) * 60 + 30);
  }

  const numberPattern = "(\\d+|" + [...NUMBER_WORDS.keys()].join("|") + ")";
  const valueOf = (token) => /^\d+$/.test(token) ? Number(token) : NUMBER_WORDS.get(token);
  for (const match of input.matchAll(new RegExp(`${numberPattern}\\s*(?:ore|ora|hours?|hrs?)(?:\\s*e\\s*${numberPattern}\\s*(?:minuti|minutes?|mins?))?`, "gu"))) {
    const hours = valueOf(match[1]);
    const minutes = match[2] === undefined ? 0 : valueOf(match[2]);
    durations.add(hours * 60 + minutes);
  }
  for (const match of input.matchAll(new RegExp(`${numberPattern}\\s*(?:minuti|minutes?|mins?)`, "gu"))) {
    durations.add(valueOf(match[1]));
  }
  return durations;
}

function walkItems(output) {
  return ["goals", "tasks", "habits", "constraints", "preferences"]
    .flatMap((category) => (output[category] ?? []).map((item, index) => ({ category, index, item })));
}

export function auditPlanningIntentGrounding(input, output) {
  if (!output || typeof output !== "object") return ["output: cannot audit a non-object value"];
  const errors = [];
  const facts = numericFacts(input);
  const durations = explicitDurations(input);
  const mentionedWeekdays = weekdayCount(input);

  for (const { category, index, item } of walkItems(output)) {
    for (const [field, value] of Object.entries(item)) {
      const path = `output.${category}[${index}].${field}`;
      if (TEMPORAL_TEXT_FIELDS.has(field) && typeof value === "string") {
        if (PLACEHOLDER_VALUES.has(normalized(value).trim())) {
          errors.push(`${path}: omit the optional field instead of using a placeholder`);
        }
        for (const number of numbersIn(value)) {
          const baseNumber = number.includes(":") ? String(Number(number.split(":")[0])) : number;
          const supportedWeekdayCount = field === "frequency"
            && !number.includes(":")
            && Number(number) === mentionedWeekdays;
          if (!facts.has(number) && !facts.has(baseNumber) && !supportedWeekdayCount) {
            errors.push(`${path}: contains unsupported numeric value ${number}`);
          }
        }
      }
      if (field === "durationMinutes" && Number.isInteger(value) && !durations.has(value)) {
        errors.push(`${path}: duration ${value} minutes is not explicit in the input`);
      }
      if (field === "desiredWeeklyMinutes" && Number.isInteger(value) && !durations.has(value)) {
        errors.push(`${path}: weekly duration ${value} minutes is not explicit in the input`);
      }
      if (field === "priority" && Number.isInteger(value) && !facts.has(String(value))) {
        errors.push(`${path}: priority ${value} is not explicit in the input`);
      }
    }
  }

  for (const [index, task] of (output.tasks ?? []).entries()) {
    if (typeof task.whenExpression === "string" && typeof task.deadlineExpression === "string"
      && normalized(task.whenExpression).trim() === normalized(task.deadlineExpression).trim()) {
      errors.push(`output.tasks[${index}]: whenExpression and deadlineExpression must not duplicate the same value`);
    }
  }

  const categoriesByName = new Map();
  for (const { category, item } of walkItems(output)) {
    if (typeof item.name !== "string") continue;
    const key = normalized(item.name).trim();
    const categories = categoriesByName.get(key) ?? new Set();
    categories.add(category);
    categoriesByName.set(key, categories);
  }
  for (const [name, categories] of categoriesByName) {
    if (categories.size > 1) errors.push(`output: "${name}" appears in multiple categories: ${[...categories].join(", ")}`);
  }

  return errors;
}
