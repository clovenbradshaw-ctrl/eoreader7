// unravel.test.mjs — SEG·Pattern's conformance. Ground truth by
// construction, declared before each run; every refusal shown to FIRE
// (R17); determinism pinned; and the module's own source scanned for
// domain vocabulary (the grain-refinement discipline: a mechanism that
// needs material labelled in one domain's vocabulary has learned that
// domain, not anything general).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { unravel, CELL } from "./unravel.js";

test("the cell is stamped in the organ's own code", () => {
  assert.deepEqual(CELL, { op: "SEG", grain: "Pattern" });
});

test("THE SPECIMEN: a two-topic belief graph separates at its one bridge, both halves still readable", () => {
  // The plan's own staged specimen shape: two topic clusters (each
  // internally connected — a triangle), one bridging edge. Ground truth
  // declared in advance: the bridge is the seam; the parts are exactly
  // the two clusters; each part remains connected after the cut.
  const edges = [
    { a: "a1", b: "a2" }, { a: "a2", b: "a3" }, { a: "a3", b: "a1" },
    { a: "b1", b: "b2" }, { a: "b2", b: "b3" }, { a: "b3", b: "b1" },
    { a: "a1", b: "b1", witness: "the-one-crossing#40-61" },
  ];
  const r = unravel(edges);
  assert.equal(r.refused, null);
  assert.equal(r.components.length, 1, "before the cut it is one network");
  assert.equal(r.bridges.length, 1);
  assert.equal(r.bridges[0].index, 6, "the seam is addressed by the caller's own edge index");
  assert.equal(r.bridges[0].edge.witness, "the-one-crossing#40-61",
    "the caller's own edge object rides through — provenance to whatever it carries");
  assert.deepEqual(r.parts, [["a1", "a2", "a3"], ["b1", "b2", "b3"]]);
  assert.deepEqual(r.articulationPoints, ["a1", "b1"], "the seam's own endpoints are the cut vertices");
});

test("a 2-edge-connected network is REFUSED no_seam — no invented threshold buys a cut", () => {
  // K4: every edge sits on a cycle; no single edge separates it.
  const k4 = [];
  const ids = ["w", "x", "y", "z"];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) k4.push({ a: ids[i], b: ids[j] });
  const r = unravel(k4);
  assert.equal(r.refused.type, "no_seam");
  assert.match(r.refused.detail, /invented threshold/);
  assert.equal(r.parts, null, "a refusal carries no cut");
  assert.deepEqual(r.bridges, []);
});

test("a PARALLEL crossing is not a seam — removing one copy disconnects nothing", () => {
  // Two triangles joined by TWO parallel edges: the textbook parent-skip
  // Tarjan would call each copy a bridge; the edge-id walk must not.
  const edges = [
    { a: "a1", b: "a2" }, { a: "a2", b: "a3" }, { a: "a3", b: "a1" },
    { a: "b1", b: "b2" }, { a: "b2", b: "b3" }, { a: "b3", b: "b1" },
    { a: "a1", b: "b1" }, { a: "a1", b: "b1" },
  ];
  const r = unravel(edges);
  assert.deepEqual(r.bridges, [], "neither parallel copy is a bridge");
  assert.equal(r.refused.type, "no_seam");
});

test("material already in parts is reported as its own separation — nothing cut, and cutEdges says so", () => {
  const edges = [
    { a: "a1", b: "a2" }, { a: "a2", b: "a3" }, { a: "a3", b: "a1" },
    { a: "b1", b: "b2" }, { a: "b2", b: "b3" }, { a: "b3", b: "b1" },
  ];
  const r = unravel(edges);
  assert.equal(r.refused, null);
  assert.deepEqual(r.parts, [["a1", "a2", "a3"], ["b1", "b2", "b3"]]);
  assert.deepEqual(r.cutEdges, [], "no edge was cut — the separation was the material's own");
});

test("a chain unravels at every link, and the middle is the articulation", () => {
  const r = unravel([{ a: "p", b: "q" }, { a: "q", b: "r" }]);
  assert.equal(r.bridges.length, 2);
  assert.deepEqual(r.parts, [["p"], ["q"], ["r"]]);
  assert.deepEqual(r.articulationPoints, ["q"]);
});

test("a self-loop is never a seam and never connects", () => {
  const r = unravel([
    { a: "a1", b: "a2" }, { a: "a2", b: "a3" }, { a: "a3", b: "a1" },
    { a: "solo", b: "solo" },
  ]);
  assert.ok(!r.bridges.some((b) => b.a === "solo"));
  assert.equal(r.components.length, 2, "the self-looped node is its own component, not glued in");
});

test("deterministic under input order — the same graph, shuffled, reads the same", () => {
  const edges = [
    { a: "a1", b: "a2" }, { a: "a2", b: "a3" }, { a: "a3", b: "a1" },
    { a: "b1", b: "b2" }, { a: "b2", b: "b3" }, { a: "b3", b: "b1" },
    { a: "a1", b: "b1" },
  ];
  const shuffled = [edges[6], edges[3], edges[0], edges[5], edges[1], edges[4], edges[2]];
  const r1 = unravel(edges);
  const r2 = unravel(shuffled);
  assert.deepEqual(r1.parts, r2.parts);
  assert.deepEqual(
    r1.bridges.map((b) => [b.a, b.b]),
    r2.bridges.map((b) => [b.a, b.b]),
    "same seam endpoints; the index differs only because it addresses the caller's own array",
  );
});

test("isolated declared nodes join the reading; empty material is refused no_material", () => {
  const r = unravel([{ a: "x", b: "y" }], { nodes: ["lone"] });
  assert.equal(r.components.length, 2);
  assert.ok(r.components.some((c) => c.length === 1 && c[0] === "lone"));
  assert.equal(unravel([]).refused.type, "no_material");
});

test("a bowtie refuses no_seam yet still reports its articulation point", () => {
  // Two triangles sharing one node: 2-edge-connected everywhere (no
  // bridge), yet node m is a real cut VERTEX — the refusal must not
  // swallow the articulation finding (adversarial-review case).
  const r = unravel([
    { a: "a1", b: "a2" }, { a: "a2", b: "m" }, { a: "m", b: "a1" },
    { a: "b1", b: "b2" }, { a: "b2", b: "m" }, { a: "m", b: "b1" },
  ]);
  assert.equal(r.refused.type, "no_seam");
  assert.deepEqual(r.articulationPoints, ["m"]);
});

test("an edge missing either end is refused by index — never a phantom node", () => {
  const r = unravel([{ a: "x", b: "y" }, { a: "x" }, { b: "z" }]);
  assert.equal(r.refused.type, "malformed_edges");
  assert.deepEqual(r.refused.indices, [1, 2]);
});

test("returned lists are the caller's to mutate — cutEdges never aliases bridges", () => {
  const r = unravel([
    { a: "a1", b: "a2" }, { a: "a2", b: "a3" }, { a: "a3", b: "a1" },
    { a: "a1", b: "b1" }, { a: "b1", b: "b2" }, { a: "b2", b: "b3" }, { a: "b3", b: "b1" },
  ]);
  r.cutEdges.pop();
  assert.equal(r.bridges.length, 1, "mutating cutEdges leaves bridges intact");
});

test("the organ's CODE carries no domain vocabulary — scanned, not eyeballed", () => {
  const src = readFileSync(fileURLToPath(new URL("./unravel.js", import.meta.url)), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const banned = /\b(sentence|verb|subject|referent|office|president|person|tenure|wikipedia|cast|atmosphere|pronoun|document|word)\b/i;
  assert.ok(!banned.test(code), "unravel.js's code names no domain — nodes are opaque ids");
});
