// names-corefer.test.mjs — adversarial tests for namesCorefer's own rejection
// posture (T5's witness requirement) and, more importantly, where it still
// OVER-FIRES: folds two surfaces into one referent with no witness at all.
//
// T5 (fold-gate.test.mjs, surfaces.js:86-104) closed exactly one over-firing
// path: a shared FINAL token with no containment either way ("Katerina
// Ivanovna" / "Alyona Ivanovna", a shared patronymic) now requires an
// injected witness. This file checks that fix holds under adversarial
// input, and separately pins a DIFFERENT over-firing path the fix left
// open: the CONTAINMENT branch (surfaces.js:110-111) folds unconditionally,
// with no witness gate of any kind — including when the shorter side is a
// single common-noun-shaped token that only coincidentally IS a name's
// final word ("Keep" / "Karsten Keep", "Mill" / "Veldt Mill" — the exact
// place-kind fixture fold-gate.test.mjs itself uses to demonstrate a
// cross-kind veto, built from words namesCorefer will merge on sight).
import test from "node:test";
import assert from "node:assert/strict";
import { namesCorefer } from "./surfaces.js";

test("REJECTS: a shared final token with no containment and no witness does not corefer (T5)", () => {
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna"), false);
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", {}), false);
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: null }), false);
});

test("REJECTS: a witness that is not a function is never called and never confers coreference", () => {
  // opts.witness a non-function (a stale caller passing a truthy flag instead
  // of a predicate, e.g. `{ witness: true }`) must refuse, not throw and not
  // silently treat truthiness as confirmation — `typeof witness === "function"`
  // is the only path that grants a witness fold.
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: true }), false);
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: "yes" }), false);
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: 1 }), false);
});

test("REJECTS: no tokens on either side (empty or whitespace-only surfaces) never corefer, witness or not", () => {
  assert.equal(namesCorefer("", ""), false);
  assert.equal(namesCorefer("   ", "Aldric"), false);
  assert.equal(namesCorefer("Aldric", ""), false);
  assert.equal(namesCorefer("", "", { witness: () => true }), false);
});

test("a witness that returns true grants the fold — but a witness that THROWS propagates, it is not swallowed into a refusal", () => {
  assert.equal(namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: () => true }), true);
  assert.throws(
    () => namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: () => { throw new Error("evidence lookup failed"); } }),
    /evidence lookup failed/,
    "a broken witness must fail loudly, not be read as 'no evidence, refuse'",
  );
});

test("a witness returning a falsy NON-boolean (0, '', null, undefined) still refuses — coerced, not passed through raw", () => {
  for (const v of [0, "", null, undefined, NaN]) {
    assert.equal(
      namesCorefer("Katerina Ivanovna", "Alyona Ivanovna", { witness: () => v }),
      false,
      `witness() => ${String(v)} must refuse`,
    );
  }
});

// ── OVER-FIRING, PINNED: containment folds with NO witness gate at all ─────
//
// This is not the T5 defect (that one required a shared FINAL token with no
// containment). This is the OTHER branch: `tokenSetContains` treats a single
// bare token as "contained in" any surface ending with that exact token, and
// `namesCorefer` returns `true` on containment before witness is ever
// consulted (surfaces.js:110-111). A single common noun that is capitalised
// (title case, sentence-initial, or simply a word that IS also part of a
// proper name — "Keep", "Mill", "Hall", "Lodge") folds into ANY multi-word
// name ending in that token, unconditionally. This is the identical
// engine-tier failure mode reviewMerges' own place-kind fixture
// (fold-gate.test.mjs) builds to demonstrate a veto for ("Aldric Keep",
// person-companied, sharing the token "Keep" with "Karsten Keep") — except
// namesCorefer itself, one layer upstream of any kind-standing gate, has
// already folded the bare token into BOTH place names before a kind
// declaration ever gets a chance to see the merge as a merge.
test("OVER-FIRES (pinned defect): a bare common-noun-shaped token folds unconditionally into any name ending in it, no witness required", () => {
  assert.equal(namesCorefer("Keep", "Karsten Keep"), true,
    "a person's stray reference to 'the Keep' would corefer with a proper name it merely shares one token with");
  assert.equal(namesCorefer("Mill", "Veldt Mill"), true);
  // AND it does not disambiguate between two DIFFERENT declared members that
  // both end in the same bare token — "Keep" folds into EITHER one it is
  // compared against, with no signal to prefer one over the other:
  assert.equal(namesCorefer("Keep", "Karsten Keep"), true);
  assert.equal(namesCorefer("Keep", "Aldric Keep"), true,
    "the same bare token folds into a totally unrelated (here, person-companied) surface too — containment alone cannot tell them apart");
});

test("containment still fires when the CONTAINED side is genuinely a name variant — the mechanism is not wrong in general, only unwitnessed", () => {
  // The positive control: containment correctly handles the ordinary,
  // desired case (a shorter real name form contained in a fuller one),
  // with no witness needed — the same unconditional path the pinned defect
  // above rides to fold a bare common noun instead.
  assert.equal(namesCorefer("Aldric", "Aldric the Younger"), true);
});

test("REJECTS asymmetrically as documented: subset containment is checked BOTH directions, order does not change the verdict", () => {
  assert.equal(namesCorefer("Karsten Keep", "Keep"), namesCorefer("Keep", "Karsten Keep"));
  assert.equal(namesCorefer("Alyona Ivanovna", "Katerina Ivanovna"), namesCorefer("Katerina Ivanovna", "Alyona Ivanovna"));
});
