import test from "node:test";
import assert from "node:assert/strict";
import { createRelationCompositionLedger, hyperedge } from "../kernel/index.js";

const participant = (ref, role) => Object.freeze({ ref, role, standing: "referent" });
const edge = (id, relation, subject, object, sequencePosition) => hyperedge({
  id,
  relation,
  participants: [participant(subject, "subject"), participant(object, "object")],
  witness: `obs:${id}`,
  scope: { sequencePosition },
});

test("one left witness fanning into two right witnesses is two chain sites but not repeated HL evidence", () => {
  const ledger = createRelationCompositionLedger([
    edge("edge:p1", "p", "ref:a", "ref:bridge", 1),
    edge("edge:q1", "q", "ref:bridge", "ref:c", 2),
    edge("edge:q2", "q", "ref:bridge", "ref:d", 3),
  ]);

  assert.equal(ledger.chains().length, 2);
  const pair = ledger.diagnostics().topPairs.find((item) => item.left === "p" && item.right === "q");
  assert.ok(pair);
  assert.equal(pair.chainSites, 2);
  assert.equal(pair.independentSupport, 1);
  assert.equal(ledger.candidates().length, 0);
});

test("two edge-disjoint p-q chains still nominate one recurrent Hyperlexicon candidate", () => {
  const ledger = createRelationCompositionLedger([
    edge("edge:p1", "p", "ref:a", "ref:b", 1),
    edge("edge:q1", "q", "ref:b", "ref:c", 2),
    edge("edge:p2", "p", "ref:d", "ref:e", 3),
    edge("edge:q2", "q", "ref:e", "ref:f", 4),
  ]);

  const [candidate] = ledger.candidates();
  assert.ok(candidate);
  assert.equal(candidate.left, "p");
  assert.equal(candidate.right, "q");
  assert.equal(candidate.meta.support, 2);
  assert.equal(candidate.meta.chainSites, 2);
  assert.equal(candidate.witnesses.length, 2);
  const used = candidate.witnesses.flat();
  assert.equal(new Set(used).size, 4);
});
