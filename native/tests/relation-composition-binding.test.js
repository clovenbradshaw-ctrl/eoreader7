import test from "node:test";
import assert from "node:assert/strict";
import { createRelationCompositionLedger, hyperedge } from "../kernel/index.js";

const unresolved = (occurrence, role, surface) => ({
  ref: occurrence,
  occurrence,
  surface,
  surfaceKey: `surface:${surface}`,
  role,
  standing: "unresolved_surface",
});
const referent = (ref, role) => ({ ref, role, standing: "referent" });

test("raw unresolved relations become composition-eligible only through explicit occurrence binding", () => {
  const left = hyperedge({
    id: "edge:left",
    relation: "p",
    participants: [referent("ref:a", "subject"), unresolved("occ:b", "object", "he")],
    witness: "obs:left",
    scope: { sequencePosition: 1 },
  });
  const right = hyperedge({
    id: "edge:right",
    relation: "q",
    participants: [unresolved("occ:b", "subject", "he"), referent("ref:c", "object")],
    witness: "obs:right",
    scope: { sequencePosition: 2 },
  });
  const ledger = createRelationCompositionLedger([left, right]);
  assert.equal(ledger.diagnostics().relationEdges, 2);
  assert.equal(ledger.diagnostics().indexedEdges, 2);
  assert.equal(ledger.diagnostics().fullyReferentResolvedEdges, 0);
  assert.equal(ledger.diagnostics().chainSites, 0);

  ledger.ingest([{
    schema: "EOPronounBinding@1",
    id: "pronoun-binding:occ:b",
    occurrence: "occ:b",
    referent: "ref:b",
    standing: "provisional",
    provenance: { giver: "fixture" },
  }]);

  const diagnostics = ledger.diagnostics();
  assert.equal(diagnostics.fullyReferentResolvedEdges, 2);
  assert.equal(diagnostics.chainSites, 1);
  const [chain] = ledger.chains();
  assert.equal(chain.from, "ref:a");
  assert.equal(chain.bridge, "ref:b");
  assert.equal(chain.to, "ref:c");
});
