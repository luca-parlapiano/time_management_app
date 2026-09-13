import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validatePlanningIntent } from "./planning-intent-validation.mjs";
import { auditPlanningIntentGrounding } from "./planning-intent-grounding.mjs";

const files = {
  train: fileURLToPath(new URL("../data/train.jsonl", import.meta.url)),
  validation: fileURLToPath(new URL("../data/validation.jsonl", import.meta.url)),
  test: fileURLToPath(new URL("../data/test.jsonl", import.meta.url)),
};

function readJsonl(path) {
  return readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim()).map(JSON.parse);
}

function normalizeInput(input) {
  return input.toLocaleLowerCase("it-IT").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const seenIds = new Map();
const seenInputs = new Map();
let failed = false;

for (const [split, path] of Object.entries(files)) {
  const records = readJsonl(path);
  for (const [index, record] of records.entries()) {
    const location = `${split}:${index + 1}`;
    if (typeof record.id !== "string" || !record.id) {
      console.error(`${location}: missing id`);
      failed = true;
    }
    if (typeof record.input !== "string" || !record.input) {
      console.error(`${location}: missing input`);
      failed = true;
      continue;
    }
    for (const error of validatePlanningIntent(record.output)) {
      console.error(`${location} (${record.id}) ${error}`);
      failed = true;
    }
    for (const error of auditPlanningIntentGrounding(record.input, record.output)) {
      console.error(`${location} (${record.id}) ${error}`);
      failed = true;
    }
    if (seenIds.has(record.id)) {
      console.error(`${location}: duplicate id also found in ${seenIds.get(record.id)}`);
      failed = true;
    }
    seenIds.set(record.id, location);
    const normalized = normalizeInput(record.input);
    if (seenInputs.has(normalized)) {
      console.error(`${location}: duplicate input also found in ${seenInputs.get(normalized)}`);
      failed = true;
    }
    seenInputs.set(normalized, location);
  }
  console.log(`${split}: ${records.length} valid records`);
}

if (failed) process.exitCode = 1;
else console.log("dataset validation, grounding and split isolation passed");
