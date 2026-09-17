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
import { extractCaseMarkedRelation, defaultLatinCasePrior, latinBeings, latinRefOf, latinEntries } from "../adapters/text/relations-case-marked.js";

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

// THE BEING TIER (2026-09-17) — greek.mjs::greekBeings' own referent-
// identity mechanism, generalized to a second case-marked language via
// the shared adapters/text/stem-identity.js primitive. Self-contained,
// hand-typed fixtures throughout (not the real live_priors file) so this
// whole section runs regardless of whether that sibling repo is present —
// the same posture "an unattested word ending returns a gap" already
// takes a few lines up. Every fixture value below was checked against the
// real ending distribution before being pinned (build-latin-case-prior.mjs,
// run against a real fetched UD_Latin-Perseus training file), not typed by
// hand and hoped correct.
const fixtureCasePrior = {
  nominalEndings: {
    us: { total: 264, ranked: [{ key: "Nom|Sing", count: 264, share: 0.44 }] },
    um: { total: 481, ranked: [{ key: "Acc|Sing", count: 481, share: 0.63 }] },
    em: { total: 355, ranked: [{ key: "Acc|Sing", count: 355, share: 0.997 }] },
  },
};
const fixturePosPrior = {
  forms: {
    populus: { NOUN: 4 }, ciceronem: { PROPN: 1 }, consul: { NOUN: 12 },
    videt: { VERB: 3 }, amat: { VERB: 1 }, etiam: { ADV: 41 }, tamen: { ADV: 35 },
  },
};

test("latinBeings finds a recurring case-marked referent — no article gate, Latin has none", () => {
  const text = "Populus Ciceronem videt. Populus Ciceronem amat.";
  const beings = latinBeings(text, { casePrior: fixtureCasePrior, posPrior: fixturePosPrior, minOccurrences: 2 });
  const stems = beings.map((b) => b.stem);
  assert.ok(stems.includes("ciceronem"));
  assert.ok(stems.includes("populus"));
});

test("latinBeings refuses a single occurrence — a being recurs", () => {
  const text = "Consul Ciceronem videt.";
  const beings = latinBeings(text, { casePrior: fixtureCasePrior, posPrior: fixturePosPrior, minOccurrences: 2 });
  assert.equal(beings.length, 0, "consul and Ciceronem each occur once — nothing recurs");
});

test("latinBeings' POS veto: a function word with a nominal-shaped ending is refused, measured against real Cicero", () => {
  // Real, measured finding (see results/latin-being-tier-RESULTS.md): the
  // case-ending prior alone has no notion of part-of-speech, so "etiam"
  // (also/even, ADV) and "tamen" (however, ADV) decline into shapes
  // classifyNominal cannot distinguish from a real noun. The POS prior is
  // the second, independent resource that closes this — same discipline
  // greek.mjs::greekClauses now holds for its own POS-silence tolerance.
  const text = "Etiam etiam. Tamen tamen.";
  const beings = latinBeings(text, { casePrior: fixtureCasePrior, posPrior: fixturePosPrior, minOccurrences: 2 });
  assert.equal(beings.length, 0, "both are confidently ADV in the POS prior — refused regardless of any case-ending coincidence");
});

test("latinBeings' capitalisation fallback excludes sentence-initial position — measured, not carried over from greek.mjs", () => {
  // MEASURED on real fetched Latin prose (Cicero's In Catilinam, the real
  // Perseus/A.C. Clark edition): sentence-initial capitalisation (19.1%,
  // 115/601) is roughly 4x the overall word capitalisation rate (4.7%,
  // 604/12734) — a real confound Greek's own edition did not carry (there,
  // 8.9% vs 9.4%, indistinguishable). This is the opposite finding, and
  // the code must not default to Greek's own "no exclusion needed" design.
  // "Cato" (unlike "Marcus", whose -us ending IS in this fixture's own
  // nominalEndings and would be admitted through the case-ending branch
  // regardless of position) is genuinely unattested by both fixture
  // priors -- verified directly (classifyNominal(fixtureCasePrior,
  // "Cato") === null) -- so it can only ever reach latinBeings through
  // the capitalisation fallback, isolating that branch's own behavior.
  const text = "Cato intervenit. Aliud Cato dixit.";
  const beings = latinBeings(text, { casePrior: fixtureCasePrior, posPrior: fixturePosPrior, minOccurrences: 2 });
  assert.equal(beings.map((b) => b.stem).includes("cato"), false,
    "both occurrences of Cato are sentence-initial -- the fallback must refuse them, exactly the measured finding above");
});

test("latinRefOf binds a clause end to a discovered being by the same stem comparison latinBeings used", () => {
  const beingsByStem = new Map([["populus", {}]]);
  assert.equal(latinRefOf("populum", beingsByStem), "ref:lat:auto:populus");
  assert.equal(latinRefOf("consulem", beingsByStem), null);
});

test("latinEntries bridges real clauses into real EOHyperedge@1 entries, never fabricated", () => {
  const text = "Populus Ciceronem videt. Consul Ciceronem laudat. Populus Ciceronem amat.";
  const edges = latinEntries(text, { casePrior: fixtureCasePrior, posPrior: fixturePosPrior });
  assert.equal(edges.length, 2, "the two sentences whose subject AND object both recur -- the Consul sentence has no recurring subject and bridges nothing");
  for (const e of edges) {
    assert.equal(e.schema, "EOHyperedge@1");
    assert.equal(e.participants[0].ref, "ref:lat:auto:populus");
    assert.equal(e.participants[1].ref, "ref:lat:auto:ciceronem");
  }
  assert.deepEqual(edges.map((e) => e.relation).sort(), ["amat", "videt"]);
});

test("latinEntries emits nothing when neither end of a clause binds to a discovered referent", () => {
  const text = "Consul Ciceronem videt.";
  const edges = latinEntries(text, { casePrior: fixtureCasePrior, posPrior: fixturePosPrior });
  assert.equal(edges.length, 0, "nothing here recurs -- no fabricated bridge");
});
