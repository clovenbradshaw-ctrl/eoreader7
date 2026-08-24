import test from "node:test";
import assert from "node:assert/strict";
import {
  createRecursiveReader,
  expectation,
  hyperedge,
  receivedGround,
  applyObservation,
  applyDelta,
  taskForObligation,
} from "../kernel/index.js";
import { reviseTextFold } from "../adapters/text/revision.js";

const anchor = (n) => ({ start: n * 10, end: n * 10 + 9 });
const encounter = (n) => ({ schema: "Encounter@1", source: "composition-fixture", modality: "fixture", sequencePosition: n, anchor: anchor(n), material: `turn-${n}` });
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

function compositionPerceiver() {
  const edges = new Map([
    [0, edge("edge:p1", "p", "ref:a", "ref:b", 0)],
    [1, edge("edge:q1", "q", "ref:b", "ref:c", 1)],
    [2, edge("edge:p2", "p", "ref:d", "ref:e", 2)],
    [3, edge("edge:q2", "q", "ref:e", "ref:f", 3)],
  ]);
  return {
    id: "composition-fixture",
    async perceive(current) {
      const currentEdge = edges.get(current.sequencePosition);
      const distinctions = currentEdge
        ? [{ relation: currentEdge.relation, edge: currentEdge.id }]
        : [{ ref: "ref:e" }];
      return [{
        candidate: { distinctions, hyperedges: currentEdge ? [currentEdge] : [] },
        anchor: current.anchor,
        evidence: `witness:${current.sequencePosition}`,
      }];
    },
  };
}

test("one-off unknown composition is withheld but does not create active reading work", async () => {
  const reader = createRecursiveReader({ perceivers: [compositionPerceiver()] });
  const first = await reader.step(encounter(0));
  const second = await reader.step(encounter(1));
  assert.equal(second.composition.withheld.length, 1);
  assert.equal(second.composition.withheld[0].standing, "unknown");
  assert.equal(second.fold.obligations.filter((o) => o.id.startsWith("obligation:composition:")).length, 0);
  assert.equal(second.proposedTasks.filter((id) => id.includes("composition")).length, 0);
  assert.equal(second.fold.graphEntries.some((entry) => entry?.schema === "EOWithheldComposition@1"), false);
  assert.equal(first.hyperlexicon.schema, "EOHyperlexicon@1");
});

test("repeated witnessed adjacency nominates an HL candidate but remains dormant when it changes no live Fold projection", async () => {
  const reader = createRecursiveReader({ perceivers: [compositionPerceiver()] });
  const turns = [];
  for (let i = 0; i < 5; i += 1) turns.push(await reader.step(encounter(i)));

  assert.equal(turns[3].hyperlexicon.composition["p\u0000q"].standing, "candidate");
  assert.equal(turns[3].composition.licensed.length, 0);
  assert.ok(turns[3].composition.withheld.some((item) => item.standing === "candidate"));
  assert.equal(turns[3].fold.graphEntries.some((entry) => entry?.schema === "EOWithheldComposition@1"), false);
  assert.equal(turns[3].fold.obligations.some((o) => o.id.startsWith("obligation:composition:")), false);
  assert.equal(turns[3].proposedTasks.some((id) => id.includes("obligation:composition:")), false);
  assert.equal(turns[4].orientation.activeTasks.some((task) => task.strategy === "composition_clarification"), false);
  assert.equal(turns[4].fold.graphEntries.some((entry) => entry?.schema === "EOWithheldComposition@1"), false);
});

test("withheld composition becomes active only when a live Fold object depends on resolving it", async () => {
  const bridgeExpectation = expectation({
    id: "expectation:bridge-dependent",
    hypothesis: "A downstream interpretation depends on whether p may compose with q",
    giver: "fixture",
    grounds: ["withheld-composition:p__q:candidate"],
    consequences: [],
  });
  const reader = createRecursiveReader({
    seed: { expectations: [bridgeExpectation] },
    perceivers: [compositionPerceiver()],
  });
  const turns = [];
  for (let i = 0; i < 5; i += 1) turns.push(await reader.step(encounter(i)));

  const opened = turns[3].fold.obligations.find((o) => o.id.startsWith("obligation:composition:"));
  assert.ok(opened);
  assert.equal(opened.distinction.materiality.makesDifference, true);
  assert.ok(opened.distinction.materiality.reasons.some((reason) => reason.ref === bridgeExpectation.id));
  assert.ok(turns[3].fold.graphEntries.some((entry) => entry?.schema === "EOWithheldComposition@1"));
  assert.ok(turns[3].proposedTasks.some((id) => id.includes("obligation:composition:")));
  assert.ok(turns[4].orientation.activeTasks.some((task) => task.strategy === "composition_clarification"));
  assert.ok(turns[4].scheduledTasks.some((task) => task.strategy === "composition_clarification"));
  const evidence = turns[4].taskEvidence.find((item) => item.strategy === "composition_clarification");
  assert.ok(evidence);
  assert.equal(evidence.depth, 5);
  assert.equal(evidence.detail?.standing, "candidate");
  assert.match(evidence.detail?.note ?? "", /not witness evidence/i);
  assert.equal(turns[4].composition.licensed.length, 0);
});

const unresolvedEdge = (id, encounterRef, relation, occurrence, sequencePosition) => hyperedge({
  id,
  relation,
  participants: [
    { ref: "ref:victor", role: "subject", standing: "referent" },
    { ref: occurrence, occurrence, surfaceKey: "surface:the_creature", surface: "the creature", role: "object", standing: "unresolved_surface" },
  ],
  witness: `obs:${id}`,
  scope: { sequencePosition },
  meta: { encounterRef },
});
const observation = (n, edgeValue) => Object.freeze({
  schema: "Observation@1",
  id: `obs:${n}`,
  witness: n === 0 ? "Victor watched the creature." : "Victor followed the creature.",
  anchor: anchor(n),
  distinctions: Object.freeze([]),
  hyperedges: Object.freeze([edgeValue]),
  graphEntries: Object.freeze([]),
  provenance: { source: "identity-fixture", modality: "text" },
});

test("descriptor recurrence stays a hypothesis until same-vs-distinct changes live relation attribution", async () => {
  let fold = receivedGround();
  const firstObs = observation(0, unresolvedEdge("edge:i1", "encounter:0", "watched", "occ:0", 0));
  const firstDelta = await reviseTextFold({ observations: [firstObs], fold });
  assert.equal(firstDelta.operations.some((op) => op.payload?.action === "obligation" && op.payload?.value?.id?.startsWith("obligation:identity:")), false);
  fold = applyObservation(fold, firstObs);
  fold = applyDelta(fold, firstDelta);

  const secondObs = observation(1, unresolvedEdge("edge:i2", "encounter:1", "followed", "occ:1", 1));
  const secondDelta = await reviseTextFold({ observations: [secondObs], fold });
  const opened = secondDelta.operations.find((op) => op.payload?.action === "obligation" && op.payload?.value?.id?.startsWith("obligation:identity:"));
  assert.ok(opened);
  assert.equal(opened.payload.value.distinction.surfaceKey, "surface:the_creature");
  assert.equal(opened.payload.value.distinction.materiality.makesDifference, true);
  assert.ok(opened.payload.value.consequences.some((consequence) => consequence.edge === "edge:i1"));

  const identityHypothesis = secondDelta.operations.find((op) => op.consequence?.kind === "identity_hypothesis_opened");
  assert.ok(identityHypothesis);
  assert.equal(secondDelta.operations.some((op) => op.consequence?.kind === "contextual_referent_admitted"), false);

  const task = taskForObligation(opened.payload.value, { sequence: 2 });
  assert.equal(task.strategy, "identity_clarification");
  assert.ok(task.targets.includes("surface:the_creature"));
});
