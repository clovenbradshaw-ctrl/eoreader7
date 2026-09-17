// native/conformance/lyric-shape.test.mjs — genres are not hardcoded.
//
// With no discovered correction in force, the answer router must not
// special-case a genre noun. A sonnet therefore falls through to the staged
// pipeline exactly like an essay, story, or code ask. The correction-rule
// battery proves the complementary half: once NL discovers the rule, later
// requests invoking the corrected form are steered without a noun table.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-shape-baseline-"));
const rulesFile = path.join(dir, "correction-rules.jsonl");
const priorRulesEnv = process.env.ER7_CORRECTION_RULES;
process.env.ER7_CORRECTION_RULES = rulesFile;

const { detectAnswerShape } = await import("../../proxy-runner.mjs");

const autoMode = (shape) =>
  shape === "composition" ? "projection" : shape === "long" ? "long" : "chat";

test("without a discovered correction, named genres fall through to the staged pipeline", () => {
  for (const task of [
    "write a sonnet about debugging code",
    "write a haiku about debugging code",
    "write an essay about the history of debugging",
    "write a story about a lighthouse keeper",
    "write a python cli tool that parses logs",
    "write a report on the silk road",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.equal(shape.shape, "composition", `"${task}" should fall through before discovery, got ${shape.shape}`);
    assert.equal(autoMode(shape.shape), "projection", `"${task}" should project before discovery`);
  }
});

test("a plain question is unchanged — open, at the full chat budget", () => {
  for (const task of [
    "why is the sky blue?",
    "what is 12345 mod 97?",
    "how does photosynthesis work at the molecular level?",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.equal(shape.shape, "open", `"${task}" should be open, got ${shape.shape}`);
    assert.equal(autoMode(shape.shape), "chat", `"${task}" should chat`);
  }
});

test("cleanup", () => {
  if (priorRulesEnv === undefined) delete process.env.ER7_CORRECTION_RULES;
  else process.env.ER7_CORRECTION_RULES = priorRulesEnv;
  fs.rmSync(dir, { recursive: true, force: true });
});
