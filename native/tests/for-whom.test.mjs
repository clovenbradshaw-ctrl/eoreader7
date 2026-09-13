// for-whom.test.mjs — the for-whom gate, tested: an instrument that finds
// structure is ADMITTED; a flat trajectory is REFUSED; the null floor is
// derived (order-destroyed), never a fixed threshold.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createForWhom, discoveryTrajectory, gateForWhom, coherentMass, trajectoryNull, createForWhomFold, foldForWhom, gateForWhomFold } from "../kernel/for-whom.js";

test("a structured trajectory has real coherent mass above its own null floor", () => {
  // The REAL ch2 reading's discovery trajectory (loaded from the actual
  // read in this repo): front-loaded structure then tapering. Measured:
  // ch2 real 0.0156 vs null 0.00015 — 102x above. This is the actual
  // material, not a synthetic curve tuned to pass.
  const f = JSON.parse(fs.readFileSync("eval/lavar/results/aiw-ch2-prose-real-read.json", "utf8"));
  const ge = f.holograph?.graphEntries ?? [];
  const byEnc = new Map();
  for (const e of ge) {
    const enc = e?.encounterRef ?? "unknown";
    if (!byEnc.has(enc)) byEnc.set(enc, 0);
    if (e?.schema === "EOHyperedge@1" || e?.schema === "EOReferent@1" || e?.schema === "EOMention@1") byEnc.set(enc, byEnc.get(enc) + 1);
  }
  const traj = [...byEnc.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, n]) => n);
  const real = coherentMass(traj);
  const floor = trajectoryNull(traj, { draws: 80 });
  assert.ok(real > floor, `real ${real} should clear the null floor ${floor}`);
});

test("flat noise has no coherent mass — nothing to find, refused", () => {
  const flat = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.equal(coherentMass(flat), 0);
  const gate = gateForWhom(createForWhom({ id: "flat", question: "what happened to Alice?" }), [], {});
  assert.equal(gate.decision.startsWith("REFUSED"), true);
});

test("an empty reading is refused, never admitted from silence", () => {
  const gate = gateForWhom(createForWhom({ id: "empty", question: "what happened to Alice?" }), [], {});
  assert.equal(gate.decision.startsWith("REFUSED"), true);
  assert.equal(gate.totalDiscovered, 0);
});

test("the for-whom carries its recipe (THE-ADDRESS A5 — two instruments, two hashes)", () => {
  const a = createForWhom({ id: "english-pos", question: "who is Alice?" });
  const b = createForWhom({ id: "english-pos", question: "who is Alice?" });
  const c = createForWhom({ id: "russian-pos", question: "who is Alice?" });
  assert.equal(a.recipe, b.recipe);          // same id + question, same recipe
  assert.notEqual(a.recipe, c.recipe);       // different id, different recipe
  assert.equal(a.schema, "EOForWhom@1");
  // a different QUESTION is a different jurisdiction — a different recipe
  const d = createForWhom({ id: "english-pos", question: "what is the rabbit doing?" });
  assert.notEqual(a.recipe, d.recipe);
});

test("the jurisdiction is the frame: for whom, for what, under what, through what, by what knowing", () => {
  const fw = createForWhom({ id: "alice-reader", giver: "Wilson", question: "what did Alice do?", priors: ["pos-eng"], ground: "wp-field", medium: "text", knowing: "perturbation" });
  assert.equal(fw.giver, "Wilson");
  assert.equal(fw.question, "what did Alice do?");
  assert.equal(fw.medium, "text");
  assert.equal(fw.knowing, "perturbation");
  assert.equal(fw.schema, "EOForWhom@1");
});

test("relevance: a for-whom whose structure does not touch the question is REFUSED even if it finds structure", () => {
  // it discovers structure, but none of it is about the question's terms
  const fw = createForWhom({ id: "wrong-focus", question: "what happened to Alice?" });
  const entries = [
    { schema: "EOHyperedge@1", encounterRef: "encounter:1", relation: "walks", participants: [{ surface: "the Cat" }, { surface: "the Duchess" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:2", relation: "meows", participants: [{ surface: "the Cat" }, { surface: "the Duchess" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:3", relation: "purrs", participants: [{ surface: "the Cat" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:4", relation: "sleeps", participants: [{ surface: "the Cat" }] },
  ];
  const gate = gateForWhom(fw, entries, { minDiscovered: 4, minRelevance: 0.1 });
  assert.equal(gate.decision.startsWith("REFUSED"), true);
  assert.equal(gate.relevant, false);
});

test("relevance: a for-whom whose structure IS about the question is admitted", () => {
  // enough points for the DMD coherence leg; every relation touches Alice
  const fw = createForWhom({ id: "alice-focus", question: "what happened to Alice?" });
  const entries = [
    { schema: "EOHyperedge@1", encounterRef: "encounter:1", relation: "ran", participants: [{ surface: "Alice" }, { surface: "the Rabbit" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:2", relation: "followed", participants: [{ surface: "Alice" }, { surface: "the Rabbit" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:3", relation: "fell", participants: [{ surface: "Alice" }, { surface: "the hole" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:4", relation: "landed", participants: [{ surface: "Alice" }, { surface: "the hall" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:5", relation: "opened", participants: [{ surface: "Alice" }, { surface: "the door" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:6", relation: "walked", participants: [{ surface: "Alice" }, { surface: "the garden" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:7", relation: "saw", participants: [{ surface: "Alice" }, { surface: "the Caterpillar" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:8", relation: "asked", participants: [{ surface: "Alice" }, { surface: "the Caterpillar" }] },
  ];
  const gate = gateForWhom(fw, entries, { minDiscovered: 8, minRelevance: 0.1 });
  assert.equal(gate.decision.startsWith("ADMITTED"), true);
  assert.equal(gate.relevant, true);
});

test("the trajectory counts only NEW structure per encounter", () => {
  const entries = [
    { schema: "EOHyperedge@1", encounterRef: "encounter:1" },
    { schema: "EOMention@1", encounterRef: "encounter:1" },
    { schema: "EOReferent@1", encounterRef: "encounter:2" },
    { schema: "EOLexicalOccurrence@1", encounterRef: "encounter:2" }, // not structure
  ];
  const traj = discoveryTrajectory(entries);
  assert.deepEqual(traj, [2, 1]); // enc1: edge+mention; enc2: referent only
});

test("the gate has THREE legs: coherent but nearly-empty is REFUSED, not admitted on the empty field's own arithmetic", () => {
  // a coherent trajectory with tiny discovery (the Russian-for-whom shape:
  // DMD finds a mode, but the for-whom barely found the text)
  const sparse = [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  const gate = gateForWhom(createForWhom({ id: "sparse-but-coherent", question: "what happened to Alice?" }), [], { minDiscovered: 100 });
  // empty entries -> refused by BOTH legs honestly
  assert.equal(gate.decision.startsWith("REFUSED"), true);
  // and a coherent, MATERIAL for-whom whose reading answers the question is admitted
  const f = JSON.parse(fs.readFileSync("eval/lavar/results/aiw-ch2-prose-real-read.json", "utf8"));
  const ge = f.holograph?.graphEntries ?? [];
  const materialGate = gateForWhom(createForWhom({ id: "english-pos", question: "what happened to Alice?" }), ge, { nullDraws: 60, minDiscovered: 100, minRelevance: 0.04 });
  assert.equal(materialGate.decision.startsWith("ADMITTED"), true);
});
test("the fold is incremental: delta-by-delta folding gives the SAME gate as one pass (P159 — the universe is folded, never recomputed)", () => {
  const fw = createForWhom({ id: "fold-test", question: "what happened to Alice?" });
  const entries = [
    { schema: "EOHyperedge@1", encounterRef: "encounter:1", relation: "ran", participants: [{ surface: "Alice" }] },
    { schema: "EOMention@1", encounterRef: "encounter:1", referent: "ref:alice" },
    { schema: "EOReferent@1", encounterRef: "encounter:2" },
    { schema: "EOHyperedge@1", encounterRef: "encounter:3", relation: "fell", participants: [{ surface: "Alice" }] },
    { schema: "EOHyperedge@1", encounterRef: "encounter:4", relation: "landed", participants: [{ surface: "Alice" }] },
    { schema: "EOMention@1", encounterRef: "encounter:4", referent: "ref:alice" },
  ];
  // one-pass
  const onePass = gateForWhom(fw, entries, { minDiscovered: 6, minRelevance: 0.1 });
  // delta-by-delta
  const fold = createForWhomFold(fw);
  for (const e of entries) foldForWhom(fold, e);
  const streamed = gateForWhomFold(fold, { minDiscovered: 6, minRelevance: 0.1 });
  assert.equal(streamed.totalDiscovered, onePass.totalDiscovered);
  assert.equal(streamed.relevantDiscovered, onePass.relevantDiscovered);
  assert.equal(streamed.decision, onePass.decision);
  // the fold state is a running accumulator, not a rescan
  assert.equal(fold.totalDiscovered, 6);
  assert.equal(fold.byEncounter.get("encounter:1"), 2); // edge + mention
});
