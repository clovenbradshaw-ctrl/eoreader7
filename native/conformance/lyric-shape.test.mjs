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
const { deriveRegister, writeVoiceFor } = await import("../kernel/register.js");

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

// THE ACTUAL FAILURE (2026-09-17, "write me a sonnet about dolphins"): the
// staged pipeline correctly falls through to "composition" above, but its
// write voice had no "lyric" entry, so writeVoiceFor silently returned the
// EXPOSITION voice — "OPEN THE PIECE WITH A THESIS… ANSWER WITH THE
// MATERIAL'S OWN FACTS" — and a small model followed those instructions
// literally, writing a cited paragraph of dolphin facts instead of a poem.
// This is the other half of the fix: a lyric or music register must get its
// OWN voice, never the exposition fallback.
test("a lyric register gets a real voice, never the silent exposition fallback", () => {
  const register = deriveRegister("write me a sonnet about dolphins", { genres: [] });
  assert.equal(register.field.field, "lyric");
  const voice = writeVoiceFor(register, "dolphins");
  const opening = voice.opening("dolphins");
  assert.doesNotMatch(opening, /OPEN THE PIECE WITH A THESIS/i, "a poem must not be told to open with an essay's thesis");
  assert.doesNotMatch(opening, /MATERIAL'S OWN FACTS/i, "a poem must not be told to answer with cited facts");
  assert.match(opening, /poem/i, "the lyric voice must actually name what it is writing");
});

test("a music register also gets a real voice, never the silent exposition fallback", () => {
  const register = deriveRegister("compose a nocturne about the sea", { genres: [] });
  assert.equal(register.field.field, "music");
  const voice = writeVoiceFor(register, "the sea");
  assert.doesNotMatch(voice.opening("the sea"), /OPEN THE PIECE WITH A THESIS/i);
});

test("cleanup", () => {
  if (priorRulesEnv === undefined) delete process.env.ER7_CORRECTION_RULES;
  else process.env.ER7_CORRECTION_RULES = priorRulesEnv;
  fs.rmSync(dir, { recursive: true, force: true });
});
