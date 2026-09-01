// native/tests/affordance-reference.test.js — a reference licensed by a
// GIVEN affordance, resolved through the real kernel/hyperlexicon.js, not
// a stub. Mirrors return-curve.test.js's own posture: prove the kernel
// organ first with opaque, non-linguistic keys, then with English ones —
// same code, no branch on which.

import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates } from "../kernel/hyperlexicon.js";
import {
  synthesizeFromAffordance, resolveAfforded,
  SYNTHESIS_CELL, RESOLUTION_CELL, SYNTHESIZED_SCHEMA,
} from "../kernel/affordance-reference.js";

test("cells are read off the real cube, not restated by hand", () => {
  assert.deepEqual(SYNTHESIS_CELL, cellOf("SYN", "Figure"));
  assert.equal(SYNTHESIS_CELL.domain, "Structure");
  assert.equal(SYNTHESIS_CELL.terrain, "Link");
  assert.equal(SYNTHESIS_CELL.stance, "Making");

  assert.deepEqual(RESOLUTION_CELL, cellOf("CON", "Figure"));
  assert.equal(RESOLUTION_CELL.terrain, "Link");
  assert.equal(RESOLUTION_CELL.stance, "Binding");
});

test("no affordance at all: refused, not guessed", () => {
  const hl = createHyperlexicon();
  const out = synthesizeFromAffordance({ sig: { id: "s1", key: "engine" }, established: [{ id: "e1", key: "car" }], hyperlexicon: hl });
  assert.equal(out.gap, "no_affordance");
});

test("a merely-CANDIDATE affordance (observed adjacency, no giver) does not license synthesis — composition needs a name", () => {
  const observed = admitHyperlexiconCandidates(createHyperlexicon(), [{ left: "car", right: "engine", witnesses: ["seen together once"] }]);
  const out = synthesizeFromAffordance({ sig: { id: "s1", key: "engine" }, established: [{ id: "e1", key: "car" }], hyperlexicon: observed });
  assert.equal(out.gap, "no_affordance", "mere observation is not a license — the same law hyperlexicon.js's own header states");
});

test("a GIVEN affordance licenses synthesis, and the provenance names the real giver", () => {
  const hl = giveHyperlexiconAffordance(createHyperlexicon(), { left: "car", right: "engine", giver: "hand-curated part-whole prior v1" });
  const synthesis = synthesizeFromAffordance({ sig: { id: "s1", key: "engine" }, established: [{ id: "e1", key: "car" }], hyperlexicon: hl });
  assert.equal(synthesis.schema, SYNTHESIZED_SCHEMA);
  assert.deepEqual(synthesis.cell, SYNTHESIS_CELL);
  assert.equal(synthesis.provenance.giver, "hand-curated part-whole prior v1");

  const resolved = resolveAfforded({ id: "s1" }, synthesis);
  assert.equal(resolved.bound, true);
  assert.deepEqual(resolved.cell, RESOLUTION_CELL);
  assert.equal(resolved.key, "engine");
});

test("two GENUINE givers afford the same key from two anchors: refused as ambiguous, not resolved by whichever was found first", () => {
  let hl = createHyperlexicon();
  hl = giveHyperlexiconAffordance(hl, { left: "car", right: "battery", giver: "prior-A" });
  hl = giveHyperlexiconAffordance(hl, { left: "boat", right: "battery", giver: "prior-B" });
  const out = synthesizeFromAffordance({
    sig: { id: "s1", key: "battery" },
    established: [{ id: "e1", key: "car" }, { id: "e2", key: "boat" }],
    hyperlexicon: hl,
  });
  assert.equal(out.gap, "ambiguous_affordance");
  assert.equal(out.candidates.length, 2);
});

test("direction matters: an affordance given the other way round does not license the reverse reference", () => {
  const hl = giveHyperlexiconAffordance(createHyperlexicon(), { left: "engine", right: "car", giver: "backwards on purpose" });
  const out = synthesizeFromAffordance({ sig: { id: "s1", key: "engine" }, established: [{ id: "e1", key: "car" }], hyperlexicon: hl });
  assert.equal(out.gap, "no_affordance");
});

test("hyperlexicon is injected, never assumed", () => {
  assert.throws(() => synthesizeFromAffordance({ sig: { id: "s", key: "k" }, established: [] }), /hyperlexicon is injected/);
});

// ── omnimodal proof: identical kernel functions, opaque non-linguistic keys ──

test("OMNIMODAL: a circuit component's terminal is afforded by the component, not the word 'terminal' — no NL anywhere", () => {
  const hl = giveHyperlexiconAffordance(createHyperlexicon(), {
    left: "COMPONENT:BATTERY", right: "COMPONENT:TERMINAL", giver: "circuit-topology prior, disclosed",
  });
  const synthesis = synthesizeFromAffordance({
    sig: { id: "sig-1", key: "COMPONENT:TERMINAL" },
    established: [{ id: "comp-1", key: "COMPONENT:BATTERY" }],
    hyperlexicon: hl,
  });
  assert.notEqual(synthesis.gap, "no_affordance");
  assert.equal(synthesis.anchorId, "comp-1");
  const resolved = resolveAfforded({ id: "sig-1" }, synthesis);
  assert.equal(resolved.bound, true);
  assert.equal(resolved.key, "COMPONENT:TERMINAL");
});

test("ADAPTER-SHAPED: 'I bought a car. The engine made a strange noise.' — same kernel code, English keys", () => {
  const hl = giveHyperlexiconAffordance(createHyperlexicon(), { left: "car", right: "engine", giver: "hand-curated part-whole prior v1" });
  const established = [{ id: "e1", key: "car" }]; // "a car" already individuated by ordinary INS
  const sig = { id: "s2", key: "engine" };          // "the engine" — a bare definite NP an adapter would extract
  const synthesis = synthesizeFromAffordance({ sig, established, hyperlexicon: hl });
  const resolved = resolveAfforded(sig, synthesis);
  assert.equal(resolved.bound, true);
  assert.equal(resolved.key, "engine");
  assert.equal(resolved.provenance.giver, "hand-curated part-whole prior v1");
});
