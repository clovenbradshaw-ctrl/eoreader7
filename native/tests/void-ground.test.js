import test from "node:test";
import assert from "node:assert/strict";
import { explicitExistentialGrounds } from "../adapters/text/existential-ground.js";
import { createCausalTextPerceiver } from "../adapters/text/recursive.js";
import { createRecursiveReader, deriveOrientation, reasoningAffordances, novelGenerationAffordances } from "../kernel/index.js";

const POS = Object.freeze({
  schema: "POSPrior@1",
  language: "eng",
  forms: Object.freeze({
    answer: Object.freeze({ NOUN: 10 }),
    sound: Object.freeze({ NOUN: 9, VERB: 1 }),
    was: Object.freeze({ AUX: 10 }),
    is: Object.freeze({ AUX: 10 }),
  }),
  provenance: Object.freeze({ source: "fixture/ud-pos" }),
});

test("explicit negative existence earns a carrier-relative bounded Void, not a NUL operation or stance", () => {
  const grounds = explicitExistentialGrounds("There was no answer.", { sequencePosition: 4, encounterRef: "encounter:room:4", posPrior: POS });
  assert.equal(grounds.length, 1);
  const ground = grounds[0];
  assert.equal(ground.schema, "EOExistentialGround@1");
  assert.equal(ground.terrain, "Void");
  assert.equal(ground.absenceSurface, "answer");
  assert.equal(ground.carrierRef, "encounter:room:4");
  assert.equal(ground.complement.model, "bounded_relative_complement");
  assert.equal(ground.complement.carrierRef, "encounter:room:4");
  assert.equal(ground.complement.excludedSurface, "answer");
  assert.equal(ground.complement.absoluteVoid, false);
  assert.equal(ground.witnessed, true);
  assert.equal(ground.provenance.giver, "lang/en");
  assert.equal(ground.provenance.posPrior, "fixture/ud-pos");
  assert.equal("eo" in ground, false);
  assert.equal("stance" in ground, false);
  assert.equal("operator" in ground, false);
});

test("the same absence surface in different carriers is not the same Void", () => {
  const [room] = explicitExistentialGrounds("There was no answer.", { sequencePosition: 4, encounterRef: "encounter:room", posPrior: POS });
  const [phone] = explicitExistentialGrounds("There was no answer.", { sequencePosition: 5, encounterRef: "encounter:phone", posPrior: POS });
  assert.equal(room.absenceSurface, phone.absenceSurface);
  assert.notEqual(room.carrierRef, phone.carrierRef);
  assert.notDeepEqual(room.complement, phone.complement);
});

test("ordinary negation or positive existence does not become Void", () => {
  assert.equal(explicitExistentialGrounds("Victor did not answer.", { posPrior: POS }).length, 0);
  assert.equal(explicitExistentialGrounds("There was an answer.", { posPrior: POS }).length, 0);
  assert.equal(explicitExistentialGrounds("No answer surprised Victor.", { posPrior: POS }).length, 0);
});

test("recursive reading exposes Void to all three reasoning modes without inventing prior stance", async () => {
  const perceiver = createCausalTextPerceiver({ relationPosPrior: POS });
  const text = "There was no answer.";
  const reader = createRecursiveReader({ perceivers: [perceiver] });
  const reading = await reader.read([{
    schema: "Encounter@1",
    source: "fixture",
    modality: "text",
    anchor: { start: 0, end: text.length },
    extent: text.length,
    material: text,
    sequencePosition: 0,
  }]);

  assert.equal(reading.effectiveTerrainState.Void.length, 1);
  assert.equal(reading.effectiveTerrainState.Void[0].complement.absoluteVoid, false);
  assert.equal(Object.values(reading.stanceState).flat().length, 0);
  const orientation = deriveOrientation(reading.fold, {
    terrainState: reading.terrainState,
    emergentTerrainState: reading.emergentTerrainState,
    stanceState: reading.stanceState,
  });
  const moves = reasoningAffordances(orientation).filter((move) => move.address.terrain === "Void");
  assert.equal(moves.length, 3);
  assert.deepEqual(moves.map((move) => move.move).sort(), ["distinguish", "generate", "relate"]);
  assert.ok(moves.every((move) => move.stanceContinuity === false));

  const novel = novelGenerationAffordances(orientation).filter((move) => move.address.terrain === "Void");
  assert.equal(novel.length, 1);
  assert.equal(novel[0].address.stance, "Cultivating");
  assert.equal(novel[0].stanceContinuity, false);
  assert.equal(novel[0].admission, "requires_grounding");
  assert.equal(novel[0].witnessed, false);
});
