// native/conformance/verdict-shape.test.mjs — a review ask is a JUDGMENT,
// not a production.
//
// Falsified live (2026-09-19, Control B): a verdict-shaped review ask —
// "Review this patch. … does the patch make the test pass? Answer with
// exactly one word, either YES or NO" — was classified "composition" by
// detectAnswerShape (the artifact language "patch"/"test"/"python" fed the
// register's code signal), so the ask entered the code-generation pipeline
// and the mouth's one-word verdict surfaced as if it were a generated
// artifact. The fix is a verdict shape that fires on the review act + a real
// artifact + an outcome (or an explicit binary-answer instruction), routed
// to chat with a small token budget — and, at the loop, excluded from
// long-extend (the extendable exclusion in runProxyTurn). The plain
// questions and the named-genre compositions must stay where they were.
import { test } from "node:test";
import assert from "node:assert";

const { detectAnswerShape } = await import("../../proxy-runner.mjs");

const autoMode = (shape) =>
  shape === "composition" ? "projection" : shape === "long" ? "long" : "chat";

test("verdict-shaped review asks route to the verdict shape: brief, chat, never composition", () => {
  for (const task of [
    'Review this patch. The test checks: assert add(2, 3) == 5. The patch changed solution.py from [def add(a, b): raise NotImplementedError] to [def add(a, b): return a + b]. Question: does the patch make the test pass? Answer with exactly one word, either YES or NO, nothing else.',
    "Does helpers.py satisfy the test test_greet.py? Answer YES or NO with the reason.",
    "Review this code and tell me if it passes the test. Verdict only.",
    "Is this implementation correct? Reply with YES or NO and why.",
    "Check whether the function works. Give a verdict.",
    "Review the patch. Is it correct?",
    "Evaluate: does the code meet the spec? Verdict YES or NO.",
    "is this code correct?",
    "are the tests passing?",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.equal(shape.shape, "verdict", `"${task}" should be a verdict, got ${shape.shape}`);
    assert.equal(shape.modality, "brief");
    assert.ok(shape.maxTokens <= 200, "a verdict is a judgment, not a production budget");
    assert.equal(autoMode(shape.shape), "chat", `"${task}" must chat, not project`);
  }
});

test("plain questions stay open — the verdict patterns never eat a real question", () => {
  for (const task of [
    "why is the sky blue?",
    "what is 12345 mod 97?",
    "how does photosynthesis work at the molecular level?",
    "check how photosynthesis works at the molecular level",
    "is my hat too big for the party?",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.equal(shape.shape, "open", `"${task}" should be open, got ${shape.shape}`);
  }
});

test("named-genre compositions still fall through to the staged pipeline", () => {
  for (const task of [
    "write a sonnet about debugging code",
    "write a python cli tool that parses logs",
    "write a report on the silk road",
  ]) {
    const shape = detectAnswerShape(task, false, false, false, [], null);
    assert.equal(shape.shape, "composition", `"${task}" should be composition, got ${shape.shape}`);
    assert.equal(autoMode(shape.shape), "projection");
  }
  // "write a review about X" is not a verdict ask — the review VERB must be
  // paired with an artifact + outcome, not a genre noun. It stays wherever
  // the genre router puts it, never misclassified as a judgment.
  const reviewAsk = detectAnswerShape("write a review about the history of debugging", false, false, false, [], null);
  assert.notEqual(reviewAsk.shape, "verdict", "a genre-noun 'review' is a composition, not a verdict");
});