// structural-chemistry.test.mjs — the grain-keyed structural affordance must
// fire in PRODUCTION composition, not only in the measurement harness.
//
// The defect this pins (2026-09-13, found resuming the WIP): reaction.js
// passed the chains' eo.grain into compositionAffordance, so the measurement
// driver (prime-with-field.mjs) composed structurally — while
// evaluateChains (the ledger's own evaluate / evaluateRelationCompositions,
// what experienced-new-book.mjs and every production caller run) called
// compositionAffordance WITHOUT the grain options. The "reading a language
// you've never read is easier because you've read another" chemistry was
// therefore dead in production: the label pair never matches across texts or
// languages, so everything stayed withheld.
//
// THE PIN, in the kernel's own terms: a chain whose relation labels are NOT
// in the hyperlexicon but whose edges carry grain:Figure must be LICENSED by
// a GIVEN `grain:Figure ∘ grain:Figure` affordance through
// evaluateRelationCompositions — the exact shape a cross-lingual read hits
// (был∘сказал has no English label pair to match).

import test from "node:test";
import assert from "node:assert/strict";
import { hyperedge } from "../kernel/hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../kernel/hyperlexicon.js";
import { evaluateRelationCompositions } from "../kernel/relation-composition.js";

const edge = (n, relation, from, to) => hyperedge({
  id: `edge:${n}`,
  relation,
  participants: [
    { ref: from, standing: "referent", role: null },
    { ref: to, standing: "referent", role: null },
  ],
  witness: `text:${n}`,
  scope: { sequencePosition: n },
  // the cube's medium-blind grain, as the text reader stamps every edge
  eo: { op: "CON", grain: "Figure" },
});

// The chain shape from the measured finding: two Figure relations composing
// through a shared referent bridge (E1 —r1→ B —r2→ E2).
const ENTRIES = [
  edge(1, "был", "ref:auto:pierre", "ref:auto:anna"),   // left edge, reads before right
  edge(2, "сказал", "ref:auto:anna", "ref:auto:andrei"), // right edge, shares the bridge
];

const WITHOUT = createHyperlexicon();
const STRUCTURAL = giveHyperlexiconAffordance(createHyperlexicon(), {
  left: "grain:Figure", right: "grain:Figure", giver: "test:structural-chemistry",
  meta: { structural: true, basis: "the grain is the invariant, the label is the lens" },
});
// A label-bound affordance that does NOT match the chain's labels — the
// control that proves the chain needs the structural key, not any given pair.
const UNRELATED_LABEL = giveHyperlexiconAffordance(createHyperlexicon(), {
  left: "approached", right: "began", giver: "test:label-chemistry",
});

test("production composition with no affordance withholds the chain", () => {
  const result = evaluateRelationCompositions(ENTRIES, WITHOUT);
  assert.equal(result.licensed.length, 0, "no affordance means nothing is licensed");
  assert.equal(result.withheld.length, 1, "the chain is withheld, named, never dropped");
});

test("a label-bound affordance that does not match the labels still withholds — the control", () => {
  const result = evaluateRelationCompositions(ENTRIES, UNRELATED_LABEL);
  assert.equal(result.licensed.length, 0, "был∘сказал must not be licensed by approached∘began");
  assert.equal(result.withheld.length, 1);
});

test("the grain-keyed structural affordance licenses the cross-lingual chain in production composition", () => {
  const result = evaluateRelationCompositions(ENTRIES, STRUCTURAL);
  assert.equal(result.licensed.length, 1, "grain:Figure ∘ grain:Figure must license был∘сказал through evaluateRelationCompositions");
  assert.equal(result.withheld.length, 0);
  const licensed = result.licensed[0];
  assert.equal(licensed.relation, "occupies_bridge_between");
  assert.equal(licensed.affordance.giver, "test:structural-chemistry");
  assert.equal(licensed.affordance.standing, "given");
  assert.equal(licensed.from, "ref:auto:pierre");
  assert.equal(licensed.bridge, "ref:auto:anna");
  assert.equal(licensed.to, "ref:auto:andrei");
});

test("the exact label pair still wins over the structural fallback — never shadowed", () => {
  const hl = giveHyperlexiconAffordance(STRUCTURAL, {
    left: "был", right: "сказал", giver: "test:exact-chemistry",
  });
  const result = evaluateRelationCompositions(ENTRIES, hl);
  assert.equal(result.licensed.length, 1);
  assert.equal(result.licensed[0].affordance.giver, "test:exact-chemistry", "the exact given pair, not the structural fallback, is what licensed it");
});