import test from "node:test";
import assert from "node:assert/strict";
import { definiteAntecedentIndex, bindDefiniteAnaphora } from "../adapters/text/definite-anaphora.js";
import { createRelationCompositionLedger, hyperedge } from "../kernel/index.js";

const discourseRef = (id, surfaces, support = `discourse-link:${id}`) => Object.freeze({
  schema: "EOReferent@1",
  id,
  surfaces: Object.freeze(surfaces),
  supportRefs: Object.freeze([support]),
  standing: "provisional",
  provenance: Object.freeze({
    giver: "text/discourse-referents::projectDiscourseReferents",
    basis: "fixture explicit occurrence-level identity",
  }),
});

const orientation = (...refs) => Object.freeze({
  schema: "EOOrientation@1",
  terrainState: Object.freeze({ Entity: Object.freeze(refs) }),
  activeReferents: Object.freeze([]),
});

const unresolved = (occurrence, role, surface) => Object.freeze({
  ref: occurrence,
  occurrence,
  surface,
  surfaceKey: `surface:${surface.replace(/\s+/g, "_")}`,
  role,
  standing: "unresolved_surface",
});

const referent = (ref, role) => Object.freeze({ ref, role, standing: "referent" });

test("definite repetition cannot create its own antecedent", () => {
  const empty = definiteAntecedentIndex(orientation());
  assert.equal(empty.size, 0);
  assert.equal(bindDefiniteAnaphora({ surface: "the monster", occurrence: "occ:1", orientation: orientation() }), null);
});

test("only an explicitly supported discourse referent can license definite continuation", () => {
  const unsupported = Object.freeze({
    schema: "EOReferent@1",
    id: "ref:mere-recurrence",
    surfaces: Object.freeze(["the monster"]),
    supportRefs: Object.freeze([]),
    standing: "provisional",
    provenance: Object.freeze({ giver: "fixture", basis: "mere recurrence" }),
  });
  assert.equal(bindDefiniteAnaphora({ surface: "the monster", occurrence: "occ:1", orientation: orientation(unsupported) }), null);

  const earned = discourseRef("ref:monster", ["the wretch", "the monster"]);
  const binding = bindDefiniteAnaphora({ surface: "the monster", occurrence: "occ:2", orientation: orientation(earned) });
  assert.ok(binding);
  assert.equal(binding.schema, "EODefiniteBinding@1");
  assert.equal(binding.referent, earned.id);
  assert.equal(binding.surface, "the monster");
  assert.equal(binding.provenance.receivedFrom, "lang/en");
});

test("a wider argument may inherit one supported definite descriptor inside it", () => {
  const earned = discourseRef("ref:monster", ["the wretch", "the monster"]);
  const binding = bindDefiniteAnaphora({ surface: "the monster whom I pursued", occurrence: "occ:wide", orientation: orientation(earned) });
  assert.ok(binding);
  assert.equal(binding.referent, earned.id);
  assert.deepEqual(binding.matchedSurfaces, ["the monster"]);
  assert.equal(binding.argumentSurface, "the monster whom i pursued");
});

test("ambiguous supported antecedents are refused rather than guessed", () => {
  const first = discourseRef("ref:monster:one", ["the monster"]);
  const second = discourseRef("ref:monster:two", ["the monster"]);
  assert.equal(bindDefiniteAnaphora({ surface: "the monster", occurrence: "occ:3", orientation: orientation(first, second) }), null);

  const wretch = discourseRef("ref:wretch", ["the wretch"]);
  const monster = discourseRef("ref:monster", ["the monster"]);
  assert.equal(bindDefiniteAnaphora({ surface: "the wretch beside the monster", occurrence: "occ:mixed", orientation: orientation(wretch, monster) }), null);
});

test("indefinite or non-the forms cannot inherit a discourse antecedent", () => {
  const earned = discourseRef("ref:monster", ["the monster"]);
  assert.equal(bindDefiniteAnaphora({ surface: "a monster", occurrence: "occ:4", orientation: orientation(earned) }), null);
  assert.equal(bindDefiniteAnaphora({ surface: "monster", occurrence: "occ:5", orientation: orientation(earned) }), null);
});

test("earned definite continuation can resolve a relation-composition bridge without rewriting witness", () => {
  const left = hyperedge({
    id: "edge:left:definite",
    relation: "p",
    participants: [referent("ref:a", "subject"), unresolved("occ:monster:object", "object", "the monster")],
    witness: "obs:left",
    scope: { sequencePosition: 1 },
  });
  const right = hyperedge({
    id: "edge:right:definite",
    relation: "q",
    participants: [unresolved("occ:monster:subject", "subject", "the monster") , referent("ref:c", "object")],
    witness: "obs:right",
    scope: { sequencePosition: 2 },
  });
  const ledger = createRelationCompositionLedger([left, right]);
  assert.equal(ledger.diagnostics().chainSites, 0);

  ledger.ingest([
    { schema: "EODefiniteBinding@1", id: "definite-binding:object", occurrence: "occ:monster:object", referent: "ref:monster", standing: "provisional" },
    { schema: "EODefiniteBinding@1", id: "definite-binding:subject", occurrence: "occ:monster:subject", referent: "ref:monster", standing: "provisional" },
  ]);

  assert.equal(ledger.diagnostics().chainSites, 1);
  const [chain] = ledger.chains();
  assert.equal(chain.bridge, "ref:monster");
  assert.equal(left.participants[1].standing, "unresolved_surface");
  assert.equal(right.participants[0].standing, "unresolved_surface");
});
