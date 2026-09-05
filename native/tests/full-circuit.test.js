// full-circuit.test.js — the relay's nine walls and its by-construction
// numbers, read on every suite run (the-fold P95 / S65).
//
// `results/full-circuit-RESULTS.md` (2026-09-02) is a hand transcription of
// `eval/the-fold/full-circuit.mjs`'s stdout. The 2026-09-05 audit (P94)
// found that nothing read it. The material is BUILT (seeded relay logs,
// one planted cycle-closer), so — unlike a specimen — its numbers are the
// construction's own and may be pinned exactly: 1,020 event-ordinal spans,
// 4 handovers corroborated and the planted e→a stopped, 6 never-stated
// facts, a-before-e at depth 2 through 3 paths, and the leaky arm's 3
// refutations with 0 derived. Re-run 2026-09-05: reproduced exactly.
//
// A drift here is a drift in an organ (signal, arrangements, hyperlexicon,
// hl-acquire, declarations, reaction, refutation), not in the material.

import test from "node:test";
import assert from "node:assert/strict";
import { runFullCircuit } from "../eval/the-fold/lib/full-circuit.mjs";

const run = await runFullCircuit();

test("every wall holds — ten wall checks, three ways of knowing in relay", () => {
  // The doc's heading says "Nine walls, all held" and its own table lists
  // ten rows (1, 1', 2, 3, 4, 5, 5', 6, 7, 7'); the driver prints ten. The
  // heading is the transcription error — found by this test's first run.
  assert.equal(run.walls.length, 10, "ten wall checks are exercised");
  const breached = run.walls.filter((w) => !w.ok);
  assert.deepEqual(breached, [], `breached: ${breached.map((w) => `${w.n} ${w.name}: ${w.detail}`).join("; ")}`);
});

test("discovery: e←d beats the 0.500 ceiling, corroborated 2×2; the noise arm finds nothing", () => {
  const n = run.numbers;
  assert.equal(Number(n.searchCeiling.toFixed(3)), 0.5);
  assert.equal(n.corroboratedFindings, 1);
  assert.equal(n.noiseFindings, 0);
});

test("arrangements and corroboration: 1,020 spans; 4 handovers proceed, the planted e→a is stopped", () => {
  const n = run.numbers;
  assert.equal(n.spanChecks, 1020);
  assert.equal(n.chainNotes, 5);
  assert.equal(n.corroborated, 4);
  assert.deepEqual(n.stopped, ["e->a"]);
});

test("acquisition and declaration: precedes is a candidate, nothing given until a named giver; no license derives nothing", () => {
  const n = run.numbers;
  assert.deepEqual(n.candidates, ["precedes"]);
  assert.deepEqual(n.given, ["precedes"]);
  assert.equal(n.unlicensedDerived, 0);
});

test("composition: 6 never-stated facts, a before e at depth 2 via 3 paths, 0 refutations on the clean circuit", () => {
  const n = run.numbers;
  assert.equal(n.derived.length, 6);
  const ae = n.derived.find((d) => d.from === "a" && d.to === "e");
  assert.deepEqual(ae, { from: "a", to: "e", depth: 2, paths: 3 });
  assert.ok(n.derived.find((d) => d.from === "a" && d.to === "c"), "a before c derived");
  assert.ok(!n.derived.some((d) => d.from === d.to), "no self-loop");
  assert.equal(n.cleanRefuted, 0);
});

test("veto: the leaky arm that skips triangulation is caught by refutation — 3 pre, 3 post, 0 derived", () => {
  const n = run.numbers;
  assert.equal(n.leakyPreRefuted, 3);
  assert.equal(n.leakyPostRefuted, 3);
  assert.equal(n.leakyDerived, 0);
});
