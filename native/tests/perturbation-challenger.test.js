// perturbation-challenger.test.js — the Challenge stage's first real
// challenger (kernel/perturbation-challenger.js): a candidate survives only
// if the SAME extraction, re-run on a perturbed version of the SAME
// material, still nominates it. Structural, not a model call — see that
// file's own header for the LR=1.0 finding this is built to avoid repeating.
//
// `nul/` is the verbatim port under native/legacy-ported/nul/ (READING-SPEC
// S129; same guard as native/tests/measure-media.test.js) — refused typed,
// not an uncaught MODULE_NOT_FOUND, if that port is ever missing.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createPerturbationChallenger } from "../kernel/perturbation-challenger.js";

const NUL_PATH = new URL("../legacy-ported/nul/index.js", import.meta.url);
const SKIP = existsSync(NUL_PATH) ? undefined : `the vendored nul/index.js port is missing (looked for ${NUL_PATH})`;
const nul = SKIP ? null : await import("../legacy-ported/nul/index.js");

// Material with exactly ONE structural artifact ("alpha" immediately
// followed by "beta" — true only of THIS arrangement) and one genuine
// content fact ("gamma" occurs somewhere in the material" — true of any
// arrangement of the same multiset, since shuffle preserves it exactly).
const material = ["alpha", "beta", "x1", "x2", "x3", "gamma", "x4", "x5", "x6", "x7", "x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15", "x16", "x17"];

// The extraction under test: nominate a candidate for the "alpha immediately
// before beta" adjacency (an artifact of ARRANGEMENT) and a separate
// candidate for "gamma is present" (a fact about the MULTISET). Re-run
// verbatim against every perturbed encounter — this IS the "same extraction"
// the challenger's whole mechanism depends on.
function extract(encounter) {
  const tokens = encounter.value;
  const found = [];
  for (let i = 0; i + 1 < tokens.length; i += 1) {
    if (tokens[i] === "alpha" && tokens[i + 1] === "beta") found.push({ candidate: { id: "adjacency:alpha-beta" }, evidence: "adjacent" });
  }
  if (tokens.includes("gamma")) found.push({ candidate: { id: "contains:gamma" }, evidence: "present" });
  return found;
}

const encounter = Object.freeze({ schema: "Encounter@1", source: "fixture", modality: "text", sequencePosition: 0, value: material });

test("a candidate the material itself supports survives every reshuffling and is not challenged away", { skip: SKIP }, async () => {
  const challenger = createPerturbationChallenger({ nul, extract, draws: 8 });
  const candidates = extract(encounter); // the ORIGINAL nomination: both candidates present
  assert.deepEqual(candidates.map((c) => c.candidate.id).sort(), ["adjacency:alpha-beta", "contains:gamma"]);

  const result = await challenger.challenge({ encounter, orientation: {}, candidates });
  const survivingIds = result.candidates.map((c) => c.candidate.id);
  assert.ok(survivingIds.includes("contains:gamma"), "a real content fact (present under any arrangement of the same multiset) is not challenged away");
});

test("a candidate that is an artifact of the one specific arrangement (survives-on-original, vanishes-on-shuffle) IS flagged", { skip: SKIP }, async () => {
  const challenger = createPerturbationChallenger({ nul, extract, draws: 8 });
  const candidates = extract(encounter);

  const result = await challenger.challenge({ encounter, orientation: {}, candidates });
  const survivingIds = result.candidates.map((c) => c.candidate.id);
  assert.ok(!survivingIds.includes("adjacency:alpha-beta"), "an order-dependent artifact that never reappears under reshuffling is challenged away");
  assert.ok(result.attacks.includes("vanishes_on_shuffle"));
  assert.equal(result.detail.length, 1);
  assert.equal(result.detail[0].candidate.candidate.id, "adjacency:alpha-beta");
});

test("wires into createRecursiveReader's own challengers array unmodified — the shape challengeCandidates expects", { skip: SKIP }, async () => {
  const { createRecursiveReader } = await import("../kernel/reading.js");
  const challenger = createPerturbationChallenger({ nul, extract, draws: 8 });
  const reader = createRecursiveReader({
    challengers: [challenger],
    adapters: {
      perceive: async (enc) => extract(enc),
      admit: async (_enc, candidate) => ({ admitted: true, witness: candidate.evidence }),
    },
  });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0, value: material });
  assert.equal(turn.challenge.schema, "EOChallengeFrontier@1");
  const survivingIds = turn.challenge.candidates.map((c) => c.candidate.id);
  assert.ok(survivingIds.includes("contains:gamma"));
  assert.ok(!survivingIds.includes("adjacency:alpha-beta"));
  // Only the surviving candidate ever reaches an Observation.
  assert.deepEqual(turn.observations.map((o) => o.distinctions[0]?.id), ["contains:gamma"]);
});

test("fewer than two elements to perturb: refuses to manufacture a verdict, every candidate passes untouched", { skip: SKIP }, async () => {
  const challenger = createPerturbationChallenger({ nul, extract, draws: 8 });
  const tinyEncounter = Object.freeze({ ...encounter, value: ["alpha"] });
  const candidates = [{ candidate: { id: "whatever" }, evidence: "e" }];
  const result = await challenger.challenge({ encounter: tinyEncounter, orientation: {}, candidates });
  assert.deepEqual(result.candidates, candidates);
  assert.equal(result.gap, "no_room_to_perturb");
});

test("required numbers are declared, never defaulted: draws and nul are both refused when missing", () => {
  assert.throws(() => createPerturbationChallenger({ nul: nul ?? { PERTURBATIONS: { shuffle: () => [] } }, extract, draws: 0 }), /draws is declared/);
  assert.throws(() => createPerturbationChallenger({ nul: null, extract, draws: 8 }), /requires `nul`/);
  assert.throws(() => createPerturbationChallenger({ nul: nul ?? { PERTURBATIONS: { shuffle: () => [] } }, draws: 8 }), /requires `extract`/);
});
