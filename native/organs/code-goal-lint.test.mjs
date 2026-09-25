// native/organs/code-goal-lint.test.mjs — the unconscious coding intelligence
// tested: goal evolution WITHOUT regex, WITHOUT a model. The lint reads the
// goal sheet as a claim ledger and a pass as a claim the record must hold;
// a failure is a TYPED finding whose kind IS the next atom.
//
// The falsifying stakes (lesson 26 + the 2026-09-21 runs): the hand-written
// regex parser could not name the content bugs (snake_string produced
// 'aBcDeF' — case transform; repeat_prefix produced 'ababab' — wrong length;
// the empty-input guard missing). The lint must name them by their KIND, with
// referent identity making quote-style differences one referent.
import test from "node:test";
import assert from "node:assert/strict";
import {
  lintCodeGoal, typedGoal, referentOf, goalId, FINDING_KINDS, atomClause,
} from "./code-goal-lint.js";

test("referent identity: quote-style differences are ONE referent, not three regex branches", () => {
  const a = referentOf("repeat_prefix('',4)");
  const b = referentOf('repeat_prefix("", 4)');
  const c = referentOf("repeat_prefix('', 4)");
  assert.equal(a, b, "single vs double quotes are the same referent");
  assert.equal(b, c, "whitespace difference is the same referent");
  assert.notEqual(a, referentOf("repeat_prefix('ab',4)"), "a different input is a different referent");
});

test("CONTESTED: a missing empty-input guard is a contested_claim, and its atom is the guard", () => {
  const goals = [
    { end1: "repeat_prefix(s,k)", label: "returns the first k characters of s repeated forever", end2: "a repeated string" },
    { end1: "repeat_prefix(s,k) when s is empty", label: "returns", end2: "empty string" },
  ];
  // the pass handled the k<=0 guard but NOT the empty-s guard — it returned
  // a non-empty string for the empty-s condition
  const finding = lintCodeGoal({ goals, passClaim: { end1: "repeat_prefix(s,k) when s is empty", label: "returns", end2: "non-empty string" } });
  assert.ok(finding, "the guard contradiction is a finding, not a pass");
  assert.equal(finding.kind, FINDING_KINDS.CONTESTED);
  assert.ok(/empty/.test(atomClause(finding.atom)), "the atom names the empty guard");
});

test("EXPIRED: a return goal the pass fails is an expired_obligation whose atom restates the wanted value", () => {
  const goals = [
    { end1: "snake_string('abcdef')", label: "returns", end2: "'acebdf'" },
  ];
  // the pass returned 'aBcDeF' (case transform) — same address, different value
  const finding = lintCodeGoal({ goals, passClaim: { end1: "snake_string('abcdef')", label: "returns", end2: "'aBcDeF'" } });
  assert.ok(finding);
  assert.equal(finding.kind, FINDING_KINDS.EXPIRED);
  assert.ok(/acebdf/.test(atomClause(finding.atom)), "the atom names the wanted value");
});

test("CONTRADICTION: two goals at one address (wrong-length family) are a standing_contradiction", () => {
  const goals = [
    { end1: "repeat_prefix('ab',5)", label: "returns", end2: "'ababa'" },
    { end1: "repeat_prefix('ab',5)", label: "returns", end2: "'ababab'" },
  ];
  // two goals at ONE address disagree — the sheet itself is incoherent
  const finding = lintCodeGoal({ goals, passClaim: { end1: "repeat_prefix('ab',5)", label: "returns", end2: "'ababa'" } });
  assert.ok(finding);
  assert.equal(finding.kind, FINDING_KINDS.CONTRADICTION);
});

test("CYCLE: a pass returning its input unchanged (begging the question) is a support_cycle", () => {
  const goals = [
    { end1: "snake_string(s)", label: "returns the even-index characters then the odd-index characters", end2: "a reordered string" },
  ];
  // the pass's output IS its input (identity) — end1 and end2 are the same
  // referent: snake_string('abcdef') → 'abcdef'
  const finding = lintCodeGoal({ goals, passClaim: { end1: "snake_string('abcdef')", label: "returns", end2: "snake_string('abcdef')" } });
  assert.ok(finding, "identity output is a finding");
  assert.equal(finding.kind, FINDING_KINDS.CYCLE);
});

test("typedGoal classifies guards vs returns by their label", () => {
  const guard = typedGoal({ end1: "x", label: "returns when s is empty", end2: "''" });
  const ret = typedGoal({ end1: "x", label: "returns", end2: "y" });
  assert.equal(guard.kind, "guard");
  assert.equal(ret.kind, "return");
  assert.ok(goalId({ end1: "a", label: "b", end2: "c" }), "a goal has a stable id");
});