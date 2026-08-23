import test from "node:test";
import assert from "node:assert/strict";
import {
  createHyperlexicon,
  compositionAffordance,
  admitHyperlexiconCandidates,
  giveHyperlexiconAffordance,
  evaluateRelationCompositions,
  hyperedge,
} from "../kernel/index.js";

const edge = (id, relation, subject, object, sequencePosition) => hyperedge({
  id,
  relation,
  participants: [
    { ref: subject, role: "subject", standing: "referent" },
    { ref: object, role: "object", standing: "referent" },
  ],
  witness: `obs:${id}`,
  scope: { sequencePosition },
});

const chain = [
  edge("edge:1", "parent_of", "ref:a", "ref:b", 0),
  edge("edge:2", "parent_of", "ref:b", "ref:c", 1),
];

test("missing Hyperlexicon pair is explicit unknown with provenance and witnesses", () => {
  const affordance = compositionAffordance(createHyperlexicon(), "parent_of", "parent_of");
  assert.equal(affordance.standing, "unknown");
  assert.equal(affordance.giver, null);
  assert.deepEqual(affordance.witnesses, []);
  assert.ok(affordance.provenance?.basis);
});

test("observed recurrence may nominate candidate but never GIVEN", () => {
  const hl = admitHyperlexiconCandidates(createHyperlexicon(), [{
    left: "parent_of",
    right: "parent_of",
    witnesses: [["edge:1", "edge:2"], ["edge:3", "edge:4"]],
  }]);
  const affordance = compositionAffordance(hl, "parent_of", "parent_of");
  assert.equal(affordance.standing, "candidate");
  assert.equal(affordance.witnesses.length, 2);
  assert.match(affordance.provenance.basis, /not reasoning permission/i);
});

test("candidate standing never licenses relation composition", () => {
  const hl = admitHyperlexiconCandidates(createHyperlexicon(), [{ left: "parent_of", right: "parent_of", witnesses: [["edge:1", "edge:2"]] }]);
  const result = evaluateRelationCompositions(chain, hl);
  assert.equal(result.licensed.length, 0);
  assert.equal(result.withheld.length, 1);
  assert.equal(result.withheld[0].standing, "candidate");
});

test("explicit named giver is required for GIVEN affordance", () => {
  assert.throws(() => giveHyperlexiconAffordance(createHyperlexicon(), { left: "parent_of", right: "parent_of" }), /giver is required/);
  const hl = giveHyperlexiconAffordance(createHyperlexicon(), { left: "parent_of", right: "parent_of", giver: "fixture:kinship-law", witnesses: ["fixture:w1"] });
  const affordance = compositionAffordance(hl, "parent_of", "parent_of");
  assert.equal(affordance.standing, "given");
  assert.equal(affordance.giver, "fixture:kinship-law");
  assert.deepEqual(affordance.witnesses, ["fixture:w1"]);
  assert.equal(affordance.provenance.giver, "fixture:kinship-law");
});

test("observations cannot downgrade an existing GIVEN affordance", () => {
  const given = giveHyperlexiconAffordance(createHyperlexicon(), { left: "p", right: "q", giver: "fixture:giver" });
  const next = admitHyperlexiconCandidates(given, [{ left: "p", right: "q", witnesses: [["edge:x", "edge:y"]] }]);
  assert.equal(compositionAffordance(next, "p", "q").standing, "given");
  assert.equal(compositionAffordance(next, "p", "q").giver, "fixture:giver");
});

test("GIVEN affordance licenses only the structural bridge projection", () => {
  const hl = giveHyperlexiconAffordance(createHyperlexicon(), { left: "parent_of", right: "parent_of", giver: "fixture:kinship-law" });
  const result = evaluateRelationCompositions(chain, hl);
  assert.equal(result.withheld.length, 0);
  assert.equal(result.licensed.length, 1);
  assert.equal(result.licensed[0].relation, "occupies_bridge_between");
  assert.equal(result.licensed[0].provenance.giver, "fixture:kinship-law");
});
