import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { validatePlanningIntent } from "./planning-intent-validation.mjs";
import { auditPlanningIntentGrounding } from "./planning-intent-grounding.mjs";

const [candidatePath, referencePath] = process.argv.slice(2);
if (!candidatePath || !referencePath) {
  throw new Error("Usage: node ai-lab/scripts/evaluate-model-output.mjs <model-output.jsonl> <reference-test.jsonl>");
}

function readJsonl(path) {
  return readFileSync(resolve(path), "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function normalize(value) {
  return String(value).trim().toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
}

function label(item) {
  return normalize(item.name ?? item.description);
}

function rounded(value) {
  return Number(value.toFixed(3));
}

function prf(matches, predicted, expected) {
  const precision = predicted === 0 ? 1 : matches / predicted;
  const recall = expected === 0 ? 1 : matches / expected;
  return {
    precision: rounded(precision),
    recall: rounded(recall),
    f1: rounded(precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall)),
  };
}

const candidates = readJsonl(candidatePath);
const references = new Map(readJsonl(referencePath).map((record) => [record.id, record]));
const categories = ["goals", "tasks", "habits", "constraints", "preferences"];
const totals = Object.fromEntries(categories.map((category) => [category, { matches: 0, predicted: 0, expected: 0 }]));
const cardinalityMatches = Object.fromEntries(categories.map((category) => [category, 0]));
const temporalFields = ["durationMinutes", "whenExpression", "deadlineExpression", "frequency", "preferredWindow"];
const goalDetailFields = ["priority", "desiredWeeklyMinutes"];
const temporal = {
  matches: 0,
  expected: [...references.values()].reduce((count, record) => count + categories.reduce(
    (categoryCount, category) => categoryCount + record.output[category].reduce(
      (itemCount, item) => itemCount + temporalFields.filter((field) => field in item).length,
      0,
    ),
    0,
  ), 0),
  unexpected: 0,
};
const goalDetails = {
  matches: 0,
  expected: [...references.values()].reduce(
    (count, record) => count + record.output.goals.reduce(
      (itemCount, item) => itemCount + goalDetailFields.filter((field) => field in item).length,
      0,
    ),
    0,
  ),
  unexpected: 0,
};
const invalidOutputs = [];
const groundingFailures = [];
const seenIds = new Set();
const latency = [];
let exactCases = 0;
let exactCategoryShapeCases = 0;

for (const record of candidates) {
  seenIds.add(record.id);
  const reference = references.get(record.id);
  if (reference) {
    for (const category of categories) totals[category].expected += reference.output[category].length;
  }
  const errors = validatePlanningIntent(record.output);
  if (errors.length > 0) {
    invalidOutputs.push({ id: record.id, errors });
    continue;
  }
  if (Number.isFinite(record.latencyMs)) latency.push(record.latencyMs);
  if (!reference) continue;
  const expected = reference.output;
  const groundingErrors = auditPlanningIntentGrounding(reference.input, record.output);
  if (groundingErrors.length > 0) groundingFailures.push({ id: record.id, errors: groundingErrors });
  let exact = true;
  let exactCategoryShape = true;

  for (const category of categories) {
    const predictedByLabel = new Map(record.output[category].map((item) => [label(item), item]));
    const expectedByLabel = new Map(expected[category].map((item) => [label(item), item]));
    const matches = [...predictedByLabel.keys()].filter((key) => expectedByLabel.has(key)).length;
    if (predictedByLabel.size === expectedByLabel.size) cardinalityMatches[category] += 1;
    else exactCategoryShape = false;
    totals[category].matches += matches;
    totals[category].predicted += predictedByLabel.size;
    if (matches !== predictedByLabel.size || matches !== expectedByLabel.size) exact = false;

    for (const [key, predictedItem] of predictedByLabel) {
      const expectedItem = expectedByLabel.get(key);
      if (!expectedItem) continue;
      for (const field of temporalFields) {
        if (field in expectedItem) {
          if (normalize(predictedItem[field]) === normalize(expectedItem[field])) temporal.matches += 1;
          else exact = false;
        } else if (field in predictedItem) {
          temporal.unexpected += 1;
          exact = false;
        }
      }
      if (category === "goals") {
        for (const field of goalDetailFields) {
          if (field in expectedItem) {
            if (predictedItem[field] === expectedItem[field]) goalDetails.matches += 1;
            else exact = false;
          } else if (field in predictedItem) {
            goalDetails.unexpected += 1;
            exact = false;
          }
        }
      }
    }
  }
  if (exact) exactCases += 1;
  if (exactCategoryShape) exactCategoryShapeCases += 1;
}

const missingCaseIds = [...references.keys()].filter((id) => !seenIds.has(id));
const report = {
  candidateFile: basename(candidatePath),
  referenceFile: basename(referencePath),
  referenceCases: references.size,
  receivedCases: candidates.length,
  missingCaseIds,
  extraCaseIds: [...seenIds].filter((id) => !references.has(id)),
  validOutputRate: rounded((candidates.length - invalidOutputs.length) / candidates.length),
  invalidOutputs,
  groundedOutputRateAmongValid: rounded(candidates.length === invalidOutputs.length ? 0 : (candidates.length - invalidOutputs.length - groundingFailures.length) / (candidates.length - invalidOutputs.length)),
  acceptedOutputRate: rounded(candidates.length === 0 ? 0 : (candidates.length - invalidOutputs.length - groundingFailures.length) / candidates.length),
  groundingFailures,
  extraction: Object.fromEntries(categories.map((category) => {
    const total = totals[category];
    return [category, prf(total.matches, total.predicted, total.expected)];
  })),
  categoryCardinalityAccuracy: Object.fromEntries(categories.map((category) => [
    category,
    rounded(references.size === 0 ? 0 : cardinalityMatches[category] / references.size),
  ])),
  exactCategoryShapeRate: rounded(references.size === 0 ? 0 : exactCategoryShapeCases / references.size),
  temporalFieldAccuracy: rounded(temporal.expected === 0 ? 1 : temporal.matches / temporal.expected),
  unexpectedTemporalFields: temporal.unexpected,
  goalDetailAccuracy: rounded(goalDetails.expected === 0 ? 1 : goalDetails.matches / goalDetails.expected),
  unexpectedGoalDetailFields: goalDetails.unexpected,
  exactCaseRateWithoutQuestions: rounded(references.size === 0 ? 0 : exactCases / references.size),
  latencyMs: latency.length === 0 ? null : {
    mean: rounded(latency.reduce((sum, value) => sum + value, 0) / latency.length),
    max: Math.max(...latency),
  },
  note: "Names and descriptions use exact normalized matches. Questions still require qualitative review.",
};

console.log(JSON.stringify(report, null, 2));
if (invalidOutputs.length || missingCaseIds.length || report.extraCaseIds.length) process.exitCode = 1;
