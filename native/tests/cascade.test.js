// kernel/cascade.js — the shared primitive organs/derivation.js's premise
// cascade and kernel/reaction.js's licence-withdrawal cascade both now run
// on. The two callers' own test suites (organs/derivation.test.mjs,
// tests/reaction.test.js, tests/dispute.test.js, tests/refutation.test.js)
// exercise it end to end, but only ever over a straight succession chain —
// no test there puts two dependents on the SAME id, or calls the walk
// twice against one persistent `seen` set, so a diamond-shaped dependency
// graph and the multi-call exclusion reaction.js's own `withdraw` relies on
// (seeding `seen` with `withdrawn.keys()`) were both unpinned. This file
// pins them directly, against the primitive alone.
import test from "node:test";
import assert from "node:assert/strict";
import { dependentsIndex, cascade } from "../kernel/cascade.js";

test("a diamond dependency is visited ONCE, at the SHORTEST depth, not once per parent", () => {
  // A -> B -> D
  // A -> C -> D   (D depends on both B and C, which both depend on A)
  const items = [
    { id: "B", deps: ["A"] },
    { id: "C", deps: ["A"] },
    { id: "D", deps: ["B", "C"] },
  ];
  const index = dependentsIndex(items, (item) => item.deps);
  const hits = cascade(index, ["A"]);
  const byId = new Map(hits.map((h) => [h.id, h]));
  assert.equal(hits.length, 3, "B, C and D — each exactly once, however many parents lead to it");
  assert.equal(byId.get("B").cascadeDepth, 1);
  assert.equal(byId.get("C").cascadeDepth, 1);
  assert.equal(byId.get("D").cascadeDepth, 2, "D is two hops from the seed through either parent, never double-counted");
  assert.ok(["B", "C"].includes(byId.get("D").cascadedFrom), "D names whichever parent this walk reached it through first");
});

test("multi-source BFS: an id reachable from two seeds at different depths takes the SHORTER one", () => {
  // seed1 -> X -> Y   (Y is 2 hops from seed1)
  // seed2 -> Y        (Y is 1 hop from seed2)
  const items = [
    { id: "X", deps: ["seed1"] },
    { id: "Y", deps: ["X", "seed2"] },
  ];
  const index = dependentsIndex(items, (item) => item.deps);
  const hits = cascade(index, ["seed1", "seed2"]);
  const y = hits.find((h) => h.id === "Y");
  assert.equal(hits.length, 2, "X and Y, each once");
  assert.equal(y.cascadeDepth, 1, "reached through seed2 in the same round X is reached through seed1 — the shorter path wins");
  assert.equal(y.cascadedFrom, "seed2");
});

test("a caller's persistent `seen` set makes a repeat call over the same seed find nothing new — the multi-call exclusion reaction.js's own withdraw depends on", () => {
  const items = [
    { id: "B", deps: ["A"] },
    { id: "C", deps: ["B"] },
  ];
  const index = dependentsIndex(items, (item) => item.deps);
  const seen = new Set();
  const first = cascade(index, ["A"], { seen });
  assert.deepEqual(first.map((h) => h.id).sort(), ["B", "C"]);
  const second = cascade(index, ["A"], { seen });
  assert.deepEqual(second, [], "everything reachable from A is already in the carried `seen` set — nothing to retake");
});

test("dependentsIndex reads a node's own id through `idOf` — not every caller's items carry it at `.id`", () => {
  // reaction.js's own derived-fact rows carry their id at `.edge.id`, not a
  // top-level `.id` — the bug this test would have caught before the fix:
  // dependentsIndex's default `idOf` silently reads `item.id` as
  // `undefined` for such rows, and the index it builds maps every
  // dependency to a Set of one literal `undefined`, so a real cascade finds
  // nothing past the first hop.
  const rows = [
    { edge: { id: "e:B", parents: ["e:A"] } },
    { edge: { id: "e:C", parents: ["e:B"] } },
  ];
  const defaultIndex = dependentsIndex(rows, (r) => r.edge.parents);
  assert.equal(defaultIndex.get("e:A").has("e:B"), false, "control: the default idOf indexes items under their (undefined) `.id`, never their `.edge.id`");

  const index = dependentsIndex(rows, (r) => r.edge.parents, (r) => r.edge.id);
  const hits = cascade(index, ["e:A"]);
  assert.deepEqual(hits.map((h) => h.id), ["e:B", "e:C"], "with the right accessor, the cascade reaches both hops");
});

test("cascade never returns a seed itself — a caller that wants seeds counted (reaction.js's own directly-matched facts) adds them separately", () => {
  const items = [{ id: "B", deps: ["A"] }];
  const index = dependentsIndex(items, (item) => item.deps);
  const hits = cascade(index, ["A", "B"]);
  assert.deepEqual(hits, [], "B is itself a seed here, so it is never re-discovered as its own dependent");
});
