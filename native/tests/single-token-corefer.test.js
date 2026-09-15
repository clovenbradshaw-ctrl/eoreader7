// A bare, single-token side of namesCorefer's subset/containment check
// ("Observatory" against "Dyer Observatory") used to fold unconditionally —
// exactly as dangerous as the shared-final-token case T5 already gated
// behind a witness (surfaces.js's own header), one token earlier. Found
// live 2026-09-15, the-fold: a question about "Northgate Observatory" (real
// material never fetched — it does not exist) had its own single-token
// sub-run candidate "Observatory" corefer with an unrelated, genuinely
// fetched "Dyer Observatory", corrupting what the address check believed
// the question was about and re-asking the model to describe Dyer
// Observatory as if it answered the real question.
import test from "node:test";
import assert from "node:assert/strict";
import { namesCorefer } from "../adapters/text/surfaces.js";

// A minimal stand-in for a real POS prior's classification — the shape
// `commonNoun` is declared to take: one word in, a boolean out. The real
// caller (the-fold's app.js) wraps a UD-treebank prior; this file never
// needs the real prior to prove the gate's own shape is correct.
const commonNoun = (word) => word === "observatory";

test("byte-identical to before this fix: a bare single-token subset still corefers when no commonNoun is injected", () => {
  assert.ok(namesCorefer("Observatory", "Dyer Observatory"), "no organ injected — unconditional containment, exactly as before this file existed");
  assert.ok(namesCorefer("Dyer Observatory", "Observatory"), "either argument order");
});

test("a bare common-noun single token no longer corefers with an unrelated multi-word name once commonNoun is injected", () => {
  assert.ok(!namesCorefer("Observatory", "Dyer Observatory", { commonNoun }));
  assert.ok(!namesCorefer("Dyer Observatory", "Observatory", { commonNoun }), "either argument order");
});

test("a genuine bare personal name still corefers with its own full form — the classifier flags nouns, never an unflagged proper name", () => {
  assert.ok(namesCorefer("Pierre", "Pierre Bezukhov", { commonNoun }), "commonNoun('pierre') is false; the legitimate short-name case is untouched");
  assert.ok(namesCorefer("Pierre Bezukhov", "Pierre", { commonNoun }));
});

test("a multi-token subset side is never blocked, however permissive commonNoun is — singleGeneric only examines a ONE-token side", () => {
  const alwaysCommon = () => true;
  assert.ok(namesCorefer("Dyer Observatory", "the historic Dyer Observatory campus", { commonNoun: alwaysCommon }));
});

test("exact identity is untouched regardless of commonNoun", () => {
  assert.ok(namesCorefer("Dyer Observatory", "Dyer Observatory", { commonNoun: () => true }));
});

test("an unrelated real name is never folded just because commonNoun is present", () => {
  assert.ok(!namesCorefer("Kutuzov", "Napoleon", { commonNoun }));
});

test("commonNoun composes with sameStem and fold — every optional organ independently declared, none silently overriding another", () => {
  const fold = (t) => t.toLowerCase();
  assert.ok(!namesCorefer("OBSERVATORY", "Dyer Observatory", { commonNoun, fold }), "still refused once folded to lowercase");
  assert.ok(namesCorefer("PIERRE", "Pierre Bezukhov", { commonNoun, fold }), "still resolves once folded to lowercase");
});
