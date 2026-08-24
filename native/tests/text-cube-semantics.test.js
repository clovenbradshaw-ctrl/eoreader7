import test from "node:test";
import assert from "node:assert/strict";
import { reviseTextFold } from "../adapters/text/revision.js";
import { receivedGround, applyDelta, deriveOrientation } from "../kernel/index.js";

test("witnessed descriptor occurrences are Entity/Making figures, not parser-created Void", async () => {
  const fold = receivedGround();
  const witness = "The creature entered.";
  const observation = Object.freeze({
    schema: "Observation@1",
    id: "obs:descriptor-cube",
    witness,
    anchor: Object.freeze({ start: 0, end: witness.length }),
    provenance: Object.freeze({ source: "fixture" }),
    distinctions: Object.freeze([]),
    graphEntries: Object.freeze([]),
    hyperedges: Object.freeze([]),
  });

  const delta = await reviseTextFold({ observations: [observation], fold });
  const occurrenceOp = delta.operations.find((op) => op?.payload?.value?.schema === "EOReferentOccurrence@1");
  assert.ok(occurrenceOp, "descriptor occurrence should be admitted");
  assert.equal(occurrenceOp.operator, "INS");
  assert.equal(occurrenceOp.grain, "Figure");
  assert.equal(occurrenceOp.terrain, "Entity");
  assert.equal(occurrenceOp.stance, "Making");

  const next = applyDelta(fold, delta);
  const orientation = deriveOrientation(next);
  const occurrenceId = occurrenceOp.payload.value.id;
  assert.ok(orientation.terrainState.Entity.some((entry) => entry.id === occurrenceId));
  assert.equal(orientation.terrainState.Void.length, 0);
  assert.ok(orientation.stanceState.Making.some((entry) => entry.id === occurrenceId));
  assert.equal(orientation.stanceState.Cultivating.length, 0);
});
