import { test } from "node:test";
import assert from "node:assert/strict";

import {
  patternFindingsFromSettling, patternFindingsFromVolatility, patternFindingsFromConsequential,
  patternFindingsFromKinds, patternFindings, claimFindings, promoteFinding,
  PATTERN_FINDING_SCHEMA, CLAIM_FINDING_SCHEMA,
} from "../organs/surface-findings.js";

import { settling } from "../kernel/settling.js";
import { revisionVolatility } from "../kernel/revision-volatility.js";
import { consequentialSurprise } from "../kernel/consequential-surprise.js";
import { createHolograph, ABSENT } from "../kernel/bayes-surprise.js";
import { dependentsIndex } from "../kernel/cascade.js";
import { signProvisionalKind, corroboration, CANONICALIZATION_FLOOR } from "../kernel/corroboration.js";
import { discoverCompanyKinds } from "../organs/kind-standing.js";
import { admitObligations, mark, standings } from "../organs/obligation.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- settling: real organ, a genuinely repeating regime ----
test("patternFindingsFromSettling normalizes a real settling() call, verdict and gap alike", () => {
  const rng = mulberry32(1);
  const regime = []; // "a" holds for 6 steps straight -- a real settled window
  for (let i = 0; i < CANONICALIZATION_FLOOR + 4; i++) regime.push(new Map([["slot", "a"]]));
  const settledResult = settling(regime, { pValue: 0.2, shuffles: 50, rng });
  const tooShort = settling([new Map()], { pValue: 0.2, shuffles: 50, rng });

  const findings = patternFindingsFromSettling([
    { ...settledResult, subject: "window-a" },
    { ...tooShort, subject: "window-b" },
  ]);

  assert.equal(findings.length, 2);
  assert.equal(findings[0].schema, PATTERN_FINDING_SCHEMA);
  assert.equal(findings[0].organ, "settling");
  assert.equal(findings[0].subject, "window-a");
  assert.ok(findings[0].verdict === "settled_any_order" || findings[0].verdict === "settles_in_sequence" || findings[0].verdict === "settled_order_untestable");
  assert.equal(findings[1].verdict, "too_short", "a gap is reported, never dropped");
  assert.equal(findings[1].p, null);
});

// ---- revision-volatility: real organ, real corroboration.js store ----
test("patternFindingsFromVolatility normalizes a real revisionVolatility() call", () => {
  const store = { concepts: {} };
  // one concept seen many times, never revised (steady); one seen once, then falsified (volatile)
  for (let i = 0; i < 10; i++) signProvisionalKind(store, { name: "steady", source: `s${i}`, at: i });
  signProvisionalKind(store, { name: "volatile", source: "s0", at: 0 });
  store.concepts.volatile.occurrences[0].falsified = true;
  store.concepts.volatile.revision = 2;

  const vol = revisionVolatility(store, { trials: 60, rng: mulberry32(2) });
  const findings = patternFindingsFromVolatility(vol);

  assert.equal(findings.length, 2);
  const byName = Object.fromEntries(findings.map((f) => [f.subject, f]));
  assert.equal(byName.steady.organ, "revision-volatility");
  assert.equal(byName.steady.p, 1, "never revised -- the null always reaches this trivially, p=1");
  assert.ok(byName.volatile.p < byName.steady.p, "the falsified concept must rank more volatile than the untouched one");
  assert.equal(byName.volatile.rank, 1 - byName.volatile.p);
});

// ---- consequential-surprise: real organ, real cascade index, real holograph ----
test("patternFindingsFromConsequential normalizes a real consequentialSurprise() call, including thinButLoadBearing", () => {
  // A tiny real dependency graph: "hub" is depended on by many sentence ids (load-bearing);
  // "rare" is depended on by nothing (local by construction).
  const items = [];
  for (let i = 0; i < 30; i++) items.push({ id: `s${i}`, deps: ["hub"] });
  const index = dependentsIndex(items, (it) => it.deps, (it) => it.id);

  const holo = createHolograph({ alpha: 1, gamma: 1 });
  const facts = new Map([["hub", "present"], ["rare", "present"]]);
  // Only "hub" is ever handed a seed to attach to -- "rare" genuinely
  // attaches to nothing, the real "local by construction" case
  // consequential-surprise.js's own code names (not merely "reaches 0",
  // which is a different, seeded-but-unlucky case with a real rank).
  const result = consequentialSurprise(holo, facts, {
    index, seedsOf: (slot, value) => (slot === "hub" && value === "present" ? [slot] : []),
    pValue: 0.2, trials: 40, rng: mulberry32(3),
  });

  const findings = patternFindingsFromConsequential(result);
  const byName = Object.fromEntries(findings.map((f) => [f.subject, f]));
  assert.equal(byName.hub.verdict, "load_bearing", "hub reaches 30 dependents -- far more than any 1-seed random draw");
  assert.equal(byName.rare.verdict, "local", "rare attaches to no id at all");
  assert.equal(byName.rare.rank, null, "no seeds -- no null was computed for it, honestly null not 0");
});

// ---- kind-standing: real organ, a genuine company pattern ----
test("patternFindingsFromKinds normalizes real discoverCompanyKinds() output, plus caller-supplied checks", () => {
  const sentences = [
    { text: "the cat sat" }, { text: "the dog sat" }, { text: "the bird sat" }, { text: "the fish sat" },
  ];
  const vocabulary = ["cat", "dog", "bird", "fish"];
  const kinds = discoverCompanyKinds(sentences, vocabulary, { minMentions: 1, minShare: 0.5, minMembers: 2 });
  assert.ok(kinds.length >= 1, "cat/dog/bird/fish should cohere as a kind (all follow \"the\")");

  const findings = patternFindingsFromKinds(kinds, [
    { candidate: "rock", kind: kinds[0].name, permitted: false, reason: "rock never appears after \"the\" in this material" },
  ]);
  const cohesive = findings.find((f) => f.verdict === "cohesive");
  const rejected = findings.find((f) => f.subject === "rock");
  assert.ok(cohesive, "the discovered kind itself is reported");
  assert.equal(rejected.verdict, "does_not_fit");
});

// ---- patternFindings: the flat aggregator, every argument optional ----
test("patternFindings aggregates whatever the caller ran, and nothing else", () => {
  const empty = patternFindings({});
  assert.deepEqual(empty, [], "a caller who ran nothing gets nothing -- no organ is invoked here");
});

// ---- claimFindings: real obligation ledger, ref-matched cross-reference ----
test("claimFindings cross-references claims against a real obligation ledger by ref, honestly empty when unchecked", () => {
  const { ledger: admitted } = admitObligations("1. Spend within the approved budget.\n2. Report quarterly.");
  const { ledger: marked } = mark(admitted, "ob-1", "violated", { because: "spent $350K off-contract", refs: ["claim-42"] });

  const claims = [
    { id: "claim-42", text: "OHS spent $350K on off-contract rent.", corroboration: { witnesses: 2, sources: 2, standing: "corroborated" } },
    { id: "claim-99", text: "OHS held a meeting on Tuesday.", corroboration: { witnesses: 1, sources: 1, standing: "single-witness" } },
  ];

  const findings = claimFindings(claims, marked);
  assert.equal(findings.length, 2);
  const byId = Object.fromEntries(findings.map((f) => [f.claim, f]));
  assert.equal(byId["claim-42"].schema, CLAIM_FINDING_SCHEMA);
  assert.equal(byId["claim-42"].obligationChecks.length, 1);
  assert.equal(byId["claim-42"].obligationChecks[0].standing, "violated");
  assert.equal(byId["claim-99"].obligationChecks.length, 0, "an unnamed claim is honestly unchecked, never implied clean");

  // Confirm the real ledger's own standings() agrees — this file didn't invent the standing, it read it.
  const real = standings(marked).find((s) => s.id === "ob-1");
  assert.equal(real.standing, "violated");
});

// ---- promoteFinding: obligation path against the REAL mark(); testimony path against a stub ----
test("promoteFinding dispatches to the real obligation.mark()", () => {
  const { ledger: admitted } = admitObligations("1. Report quarterly.");
  const { kind, result } = promoteFinding("obligation",
    { ledger: admitted, clauseId: "ob-1", standing: "satisfied", because: "Q3 report filed on time", refs: ["claim-7"] },
    { mark },
  );
  assert.equal(kind, "obligation");
  assert.ok(result.ledger, "a real ledger came back, not a refusal");
  assert.equal(standings(result.ledger).find((s) => s.id === "ob-1").standing, "satisfied");
});

test("promoteFinding dispatches to an injected landSelfAssertion for testimony, passing arguments through unmodified", () => {
  let seen = null;
  const stubLandSelfAssertion = (grid, log, args) => { seen = { grid, log, args }; return { landed: true }; };
  const { kind, result } = promoteFinding("testimony",
    { grid: "GRID", log: "LOG", subject: "OHS", verb: "spent", object: "$350K off-contract", verdict: "holds", claimId: "c1" },
    { landSelfAssertion: stubLandSelfAssertion },
  );
  assert.equal(kind, "testimony");
  assert.deepEqual(result, { landed: true });
  assert.equal(seen.grid, "GRID");
  assert.equal(seen.args.subject, "OHS");
  assert.equal(seen.args.verdict, "holds");
});

test("promoteFinding refuses an unknown kind by name, never guesses", () => {
  const { refused, detail } = promoteFinding("vibes", {}, {});
  assert.equal(refused, "unknown_kind");
  assert.ok(detail);
});

test("promoteFinding throws a typed error when the declared door was not injected", () => {
  assert.throws(() => promoteFinding("obligation", {}, {}), TypeError);
  assert.throws(() => promoteFinding("testimony", {}, {}), TypeError);
});
