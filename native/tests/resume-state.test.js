import test from "node:test";
import assert from "node:assert/strict";
import { createRecursiveReader } from "../../kernel.js";
import { reconstruct } from "../kernel/fold.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";

const TEXT = [
  "Rodion Raskolnikov walked home.",
  "Raskolnikov met Razumihin.",
  "Razumihin brought soup.",
  "Raskolnikov thanked Razumihin.",
  "Porfiry Petrovich questioned Raskolnikov.",
  "Porfiry smiled.",
].join(" ");
const encounters = textEncounters(TEXT, { source: "resume.txt", offset: 0 });
const adapters = {
  revise: reviseTextFold,
  retrieve: (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
};
const make = (seed = {}) => createRecursiveReader({ seed, perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 1, refreshEvery: 2 })], adapters });

test("resuming from the persisted log restores the perceiver accumulators", async () => {
  const straight = make();
  const full = await straight.read(encounters);

  const first = make();
  const prefix = await first.read(encounters.slice(0, 3));
  const resumed = make(reconstruct(prefix.log));
  await resumed.restore(prefix.log);
  const rest = await resumed.read(encounters.slice(3));

  assert.deepEqual(rest.fold.graphEntries, full.fold.graphEntries);
});
