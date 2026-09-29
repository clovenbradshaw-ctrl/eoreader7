// native/conformance/correction-rule.test.mjs — stir the nest with NL.
//
// A correction is heard as a correction, not as another task. The exact user
// trigger from this investigation — "you wrote an essay, not a sonnet" — must
// author a standing falsifiable rule, and that discovered rule must later
// steer the router away from the composition pipeline. No genre noun is
// hardcoded here or in the correction-rule organ: the requested form comes
// from the correction's own words, and an unrelated lyric form stays
// unsteered until it is corrected too.
//
// General NL coverage:
//   - produced/requested/obligatory form contrast;
//   - an answer-length verdict;
//   - a direct prohibition;
//   - a non-correction task stays a task.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-correction-rule-"));
const rulesFile = path.join(dir, "correction-rules.jsonl");
const priorRulesEnv = process.env.ER7_CORRECTION_RULES;
process.env.ER7_CORRECTION_RULES = rulesFile;

const {
  detectCorrection,
  falsifiableRule,
  authorCorrectionRule,
  readCorrectionRules,
  activeCorrectionRules,
  concedeCorrectionRule,
  observeAndConcede,
  naturalSizeRuleForTask,
  falsifiesFormRule,
} = await import("../organs/correction-rule.js");
const { detectAnswerShape } = await import("../../proxy-runner.mjs");

const SONNET_CORRECTION = "you wrote an essay, not a sonnet";
const SONNET_REQUEST = "write a sonnet about debugging code";
const autoMode = (shape) => (shape === "composition" ? "projection" : shape === "long" ? "long" : "chat");

test("the exact sonnet correction is heard with its declared and rejected forms", () => {
  const correction = detectCorrection(SONNET_CORRECTION);
  assert.equal(correction?.kind, "output-form-mismatch");
  assert.equal(correction?.expected, "sonnet");
  assert.equal(correction?.actual, "essay");
  assert.equal(correction?.actionable, true);
});

test("without the discovered rule, the router does not special-case the genre", () => {
  const shape = detectAnswerShape(SONNET_REQUEST, false, false, false, [], null);
  assert.equal(shape.shape, "composition");
  assert.equal(autoMode(shape.shape), "projection");
});

test("the correction authors one standing falsifiable rule, reproducibly", () => {
  const first = authorCorrectionRule(SONNET_CORRECTION, { now: "2026-09-17T21:30:00.000Z", rulesFile });
  assert.equal(first.persisted, true);
  assert.equal(first.rule?.schema, "CorrectionRule@1");
  assert.equal(first.rule?.expected, "sonnet");
  assert.equal(first.rule?.maxTokens <= 320, true);
  assert.match(first.rule?.falsifier ?? "", /composition/);
  assert.match(first.rule?.falsifier ?? "", /projection/);
  assert.match(first.rule?.falsifier ?? "", /falsifies/);

  const repeat = falsifiableRule(detectCorrection("That should have been a sonnet, not an essay."), {
    at: "2026-09-17T21:31:00.000Z",
  });
  assert.equal(repeat?.id, first.rule?.id, "the same discovered consequence gets the same self-name");
  assert.deepEqual(readCorrectionRules(rulesFile).map((rule) => rule.id), [first.rule?.id]);
});

test("the discovered rule steers only the corrected genre, and makes it streamable", () => {
  const discovered = naturalSizeRuleForTask(SONNET_REQUEST, { rulesFile });
  assert.ok(discovered, "the sonnet correction must now steer a sonnet request");
  const shape = detectAnswerShape(SONNET_REQUEST, false, false, false, [], null);
  assert.equal(shape.shape, "natural");
  assert.equal(shape.modality, "natural-size");
  assert.equal(shape.maxTokens <= 320, true);
  assert.equal(autoMode(shape.shape), "chat");

  const rule = readCorrectionRules(rulesFile)[0];
  assert.equal(falsifiesFormRule(rule, { shape: shape.shape, mode: autoMode(shape.shape) }), false);
  assert.equal(falsifiesFormRule(rule, { shape: "composition", mode: "projection" }), true);
  assert.equal(
    naturalSizeRuleForTask("write a haiku about debugging code", { rulesFile }),
    null,
    "an uncorrected genre is still discovered later, never inherited from a word list",
  );
});

test("other correction registers also mint falsifiable rules", () => {
  const length = authorCorrectionRule("that answer was too long", { now: "2026-09-17T21:32:00.000Z", rulesFile });
  assert.equal(length.rule?.kind, "answer-length");
  assert.equal(length.rule?.direction, "shorten");
  assert.match(length.rule?.falsifier ?? "", /falsifies/);

  const ban = authorCorrectionRule("don't put footnotes in a poem", { now: "2026-09-17T21:33:00.000Z", rulesFile });
  assert.equal(ban.rule?.kind, "prohibition");
  assert.equal(ban.rule?.target, "poem");
  assert.match(ban.rule?.falsifier ?? "", /falsifies/);
});

test("an ordinary producing ask and an unmarked report are not corrections", () => {
  assert.equal(detectCorrection("write a haiku about debugging code"), null);
  assert.equal(detectCorrection("you wrote an essay about debugging code"), null);
});

// THE LIVE TRIGGER FOR THIS FIX (2026-09-17): a person corrects a sonnet ask
// with "that not a sonnet" — no production verb, no restated actual form,
// SELF_REFERENCE's trailing noun ("that answer") dropped. Before this, that
// exact real phrasing was heard as nothing at all: no rule was authored, and
// the very next "write a sonnet" ask would have made the identical mistake.
test("a bare rejection with no restated actual form is still heard as a correction", () => {
  for (const statement of [
    "that not a sonnet",
    "that's not a sonnet",
    "this is not a sonnet",
    "it wasn't a sonnet",
    "not a sonnet",
  ]) {
    const correction = detectCorrection(statement);
    assert.equal(correction?.kind, "output-form-mismatch", `"${statement}" must be heard as a correction`);
    assert.equal(correction?.expected, "sonnet");
    assert.equal(correction?.actual, null, "the rejected form was never restated — this is honestly unknown, not guessed");
    assert.equal(correction?.actionable, true);
  }
});

test("a bare rejection still authors a rule that steers the next matching ask", () => {
  const heard = authorCorrectionRule("that not a sonnet", { now: "2026-09-17T21:40:00.000Z", rulesFile });
  assert.equal(heard.persisted, true);
  assert.equal(heard.rule?.expected, "sonnet");
  const discovered = naturalSizeRuleForTask("write me a sonnet about dolphins", { rulesFile });
  assert.ok(discovered, "a later sonnet ask, in the exact shape from the live trigger, must now be steered");
  const shape = detectAnswerShape("write me a sonnet about dolphins", false, false, false, [], null);
  assert.equal(shape.shape, "natural");
});

// THE DEGRADATION PATHWAY: a rule ledger with no retract accumulates law
// forever, and would keep steering a real request toward a form a real,
// later observation already contradicted. concedeCorrectionRule/
// activeCorrectionRules/observeAndConcede are the REC half — a rule
// mints (INS), a falsifying observation retracts it (REC), and only the
// ACTIVE (unconceded) set may ever steer a live task again.
test("a conceded rule stops steering — the retracted law no longer governs, but its history is not erased", () => {
  const authored = authorCorrectionRule("you wrote a limerick, not a haiku", { now: "2026-09-29T00:00:00.000Z", rulesFile });
  assert.equal(authored.persisted, true);
  const task = "write me a haiku about the tides";
  assert.ok(naturalSizeRuleForTask(task, { rulesFile }), "the freshly-minted rule steers a matching task");

  const concede = concedeCorrectionRule(authored.rule.id, { because: "test: a real observation falsified it", at: "2026-09-29T00:01:00.000Z", rulesFile });
  assert.equal(concede.conceded, true);
  assert.equal(concede.ruleId, authored.rule.id);

  assert.equal(naturalSizeRuleForTask(task, { rulesFile }), null, "a conceded rule must not steer any later task");
  assert.equal(activeCorrectionRules(rulesFile).some((r) => r.id === authored.rule.id), false, "the fold excludes the conceded rule");
  assert.equal(readCorrectionRules(rulesFile).some((r) => r.id === authored.rule.id), true, "the raw ledger still remembers it was ever minted — nothing is deleted");

  const second = concedeCorrectionRule(authored.rule.id, { because: "test: conceding twice", rulesFile });
  assert.equal(second.conceded, false, "conceding an already-conceded rule is a no-op, not a second retraction");
});

test("a concede with no reason is refused — an unreasoned concede is a deletion wearing a ledger's clothes", () => {
  const authored = authorCorrectionRule("stop using bullet points in a story", { now: "2026-09-29T00:02:00.000Z", rulesFile });
  const result = concedeCorrectionRule(authored.rule.id, { rulesFile });
  assert.equal(result.conceded, false);
  assert.match(result.reason, /name/i);
  assert.equal(activeCorrectionRules(rulesFile).some((r) => r.id === authored.rule.id), true, "refused concede leaves the rule standing");
});

test("observeAndConcede finds and retracts every active rule a real observation falsifies, naming which observation did it", () => {
  // A genre pair unique to this test, checked via the TEXT path
  // (falsifiesFormRule's rejectedForms/requestedForms check), not the
  // shape/mode path — forbiddenShapes/forbiddenModes are the SAME literal
  // set ("composition"/"projection") on EVERY output-form-mismatch rule
  // regardless of genre, a real, form-agnostic property of falsifiesFormRule
  // found live: an observation with shape:"composition" falsifies every
  // standing sonnet-mismatch rule at once (this file mints two more earlier:
  // the SONNET_CORRECTION rule and the bare-rejection sonnet rule), so a
  // test asserting "exactly one rule was conceded" must not reuse "sonnet"
  // or the shape/mode path, or it collides with unrelated earlier tests'
  // state on this file's own shared ledger.
  const authored = authorCorrectionRule("you wrote a memo, not a eulogy", { now: "2026-09-29T00:03:00.000Z", rulesFile, source: "observe-test" });
  // A DIFFERENT rule, on a genuinely unrelated form, must survive untouched —
  // observeAndConcede must not be a blunt "clear everything" button.
  const unrelated = authorCorrectionRule("that answer was too long", { now: "2026-09-29T00:03:30.000Z", rulesFile });
  assert.notEqual(authored.rule.id, unrelated.rule.id);

  const observation = { text: "Here is a fitting memo for the occasion.", task: "write a eulogy for the retiring captain" };
  const conceded = observeAndConcede(observation, { rulesFile, at: "2026-09-29T00:04:00.000Z" });
  assert.equal(conceded.length, 1);
  assert.equal(conceded[0].ruleId, authored.rule.id);
  assert.match(conceded[0].because, /retiring captain/);

  const active = activeCorrectionRules(rulesFile);
  assert.equal(active.some((r) => r.id === authored.rule.id), false, "the falsified eulogy rule is gone from the active set");
  assert.equal(active.some((r) => r.id === unrelated.rule.id), true, "the unrelated length rule was never touched");

  // A second call against an observation that does NOT falsify anything
  // active must concede nothing — this is a real check, not a rubber stamp.
  const noop = observeAndConcede({ text: "Here is a heartfelt eulogy for the occasion.", task: "write a eulogy for the retiring captain" }, { rulesFile });
  assert.equal(noop.length, 0);
});

test("cleanup", () => {
  if (priorRulesEnv === undefined) delete process.env.ER7_CORRECTION_RULES;
  else process.env.ER7_CORRECTION_RULES = priorRulesEnv;
  fs.rmSync(dir, { recursive: true, force: true });
});
