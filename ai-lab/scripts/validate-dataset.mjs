import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dataDir = new URL("../data/", import.meta.url);
const requiredKeys = ["goals", "habits", "constraints", "preferences", "questions"];
const validSources = new Set(["explicit", "inferred"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateSourcedItems(items, file, line) {
  assert(Array.isArray(items), `${file}:${line} must be an array`);
  for (const item of items) {
    assert(item && typeof item === "object", `${file}:${line} contains an invalid item`);
    assert(validSources.has(item.source), `${file}:${line} has an invalid source`);
  }
}

for (const file of readdirSync(dataDir).filter((name) => name.endsWith(".jsonl"))) {
  const lines = readFileSync(join(dataDir.pathname, file), "utf8").trim().split("\n");
  for (const [index, line] of lines.entries()) {
    const record = JSON.parse(line);
    assert(typeof record.id === "string" && record.id.length > 0, `${file}:${index + 1} lacks an id`);
    assert(typeof record.input === "string" && record.input.length > 0, `${file}:${index + 1} lacks input`);
    assert(record.output && typeof record.output === "object", `${file}:${index + 1} lacks output`);
    for (const key of requiredKeys) assert(key in record.output, `${file}:${index + 1} lacks ${key}`);
    validateSourcedItems(record.output.goals, file, index + 1);
    validateSourcedItems(record.output.habits, file, index + 1);
    validateSourcedItems(record.output.constraints, file, index + 1);
    validateSourcedItems(record.output.preferences, file, index + 1);
    assert(Array.isArray(record.output.questions), `${file}:${index + 1} questions must be an array`);
  }
  console.log(`${file}: ${lines.length} examples valid`);
}
