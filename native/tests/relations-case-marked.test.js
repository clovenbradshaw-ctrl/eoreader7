// native/tests/relations-case-marked.test.js — the case-marking organ,
// against real prior data (live_priors/derived-priors/case-priors/
// case-marking-lat.json, built from real UD_Latin-Perseus sentences —
// moved there 2026-08-30, act-priors' own precedent). The full measured
// validation
// against held-out gold sentences lives in
// native/eval/latin-case-marking-eval.mjs + its RESULTS.md — this file
// is fast conformance: the mechanism's own declared behaviors, each
// pinned as a regression.
import test from "node:test";
import assert from "node:assert/strict";
import { extractCaseMarkedRelation, defaultLatinCasePrior } from "../adapters/text/relations-case-marked.js";

// LatinCasePrior@1 lives in the live_priors sibling repo (a received prior
// lives with its corpus). A checkout without that sibling — CI's runner —
// degrades to a TYPED SKIP per test, never a file-level load failure.
let prior = null;
try { prior = defaultLatinCasePrior(); } catch { prior = null; }
const ABSENT = "live_priors sibling absent — LatinCasePrior@1 lives there (derived-priors/case-priors/)";

test("OMNIMODAL CLAIM, CHECKED DIRECTLY: a real held-out VOS sentence, verb-object-subject order", (t) => {
  if (!prior) return t.skip(ABSENT);
  // Real UD_Latin-Perseus TEST specimen (never used to build the prior):
  // "possedit cetera pontus" = "the sea possessed the rest," literally
  // verb-object-subject. A positional (SVO or SOV) reader has no
  // consistent rule that gets this right; this organ never looks at
  // position at all, and matches the gold nsubj/obj exactly.
  const r = extractCaseMarkedRelation("possedit cetera pontus.", { casePrior: prior });
  assert.equal(r.end1?.word, "pontus", "the NOMINATIVE-marked participant is the subject, regardless of where it sits");
  assert.equal(r.label.word, "possedit");
  assert.equal(r.end2?.word, "cetera");
});

test("a second real free-order sentence: subject second, object last, verb third", (t) => {
  if (!prior) return t.skip(ABSENT);
  const r = extractCaseMarkedRelation("Maxima pars unda rapitur.", { casePrior: prior });
  assert.equal(r.end1?.word, "pars");
  assert.equal(r.label.word, "rapitur");
});

test("the shape is {end1, label, end2} natively -- never subject/verb/object", (t) => {
  if (!prior) return t.skip(ABSENT);
  const r = extractCaseMarkedRelation("Maxima pars unda rapitur.", { casePrior: prior });
  assert.ok("end1" in r && "label" in r && "end2" in r);
  assert.ok(!("subject" in r) && !("verb" in r) && !("object" in r), "this organ must never populate SAE-grammar field names -- P72's whole point");
});

test("a multi-verb sentence is a typed gap, never a guess at which verb is the clause's own", (t) => {
  if (!prior) return t.skip(ABSENT);
  const r = extractCaseMarkedRelation("Latet arbore opaca aureus et foliis et lento vimine ramus.", { casePrior: prior });
  assert.equal(r.gap?.reason, "ambiguous_verb");
  assert.ok(r.gap.candidates.length > 1);
});

test("no finite verb at all is a typed gap, never an empty guess", (t) => {
  if (!prior) return t.skip(ABSENT);
  const r = extractCaseMarkedRelation("in via.", { casePrior: prior });
  assert.equal(r.gap?.reason, "no_verb_found");
});

test("a weak (single-character) verb ending withdraws when the same word also reads as a confident nominal case", (t) => {
  if (!prior) return t.skip(ABSENT);
  // A real regression from this organ's own build: "-o"/"-m"/"-t" collide
  // with common noun-case endings ("bello" reads as 2nd-decl ablative
  // singular, not "1sg verb") -- unguarded, this forced a spurious second
  // verb candidate on the majority of real single-verb test sentences.
  const r = extractCaseMarkedRelation("Praedator intervenit partem postulans.", { casePrior: prior });
  assert.notEqual(r.gap?.reason, "ambiguous_verb", "intervenit must be the sole verb; postulans and partem must not spuriously compete");
});

test("an oblique (dative/ablative/genitive) participant is typed distinctly, never folded into end2", (t) => {
  if (!prior) return t.skip(ABSENT);
  const r = extractCaseMarkedRelation("Cupidis debeas.", { casePrior: prior });
  // "cupidis" is dative plural -- an oblique, never a direct object.
  assert.ok(!r.end2 || r.end2.case !== "Dat", "a dative participant must never be reported as end2 unlabeled");
});

test("an unattested word ending returns a gap, never a guess dressed as a case", (t) => {
  if (!prior) return t.skip(ABSENT);
  const fakePrior = { nominalEndings: {}, verbPersonalEndings: prior.verbPersonalEndings };
  const r = extractCaseMarkedRelation("Xyzabc currit.", { casePrior: fakePrior });
  assert.equal(r.gap?.[0] ?? r.gap, "no_nominative_found");
});

test("verbHint isolates role-assignment from verb-finding, for measurement only", (t) => {
  if (!prior) return t.skip(ABSENT);
  const r = extractCaseMarkedRelation("Maxima pars unda rapitur.", { casePrior: prior, verbHint: "rapitur" });
  assert.equal(r.label.word, "rapitur");
  assert.equal(r.end1?.word, "pars");
});

test("the prior itself: real provenance, giver named, license disclosed plainly", (t) => {
  if (!prior) return t.skip(ABSENT);
  assert.match(prior.provenance.giver, /UD_Latin-Perseus/);
  assert.match(prior.provenance.license, /NC-SA/);
  assert.ok(prior.provenance.sentences > 1000);
});
