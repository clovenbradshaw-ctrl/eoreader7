// claims-from-feat.test.mjs -- claimsFromFeat's own contract, tested against
// synthetic feat entries shaped exactly as arrangeEssay's own real feat/notesOf
// output is shaped (f.pt.part, f.notes[i].{id,end1,label,end2,polarity}),
// verified by reading arrange.js's own source (points construction line 121,
// notesOf's own return shape) before writing this test, not guessed.
import test from "node:test";
import assert from "node:assert/strict";
import { claimsFromFeat } from "./arrange.js";
import { holon } from "../kernel/gfp-claim.js";

function feat(part, notes) {
  return { pt: { id: `pt:${part}`, part }, notes };
}

test("when a point carries a real hierarchical path, claimsFromFeat grounds by path, not the flatter part id", () => {
  // real shape, verified against eot-draft.js's own point construction
  // (whole/p{N}/{M}) -- not a guessed format.
  const withPath = { pt: { id: "p4.3", part: "p4", path: "whole/p4/3" }, notes: [{ id: "n1", end1: "a", label: "b", end2: "c", polarity: "+" }] };
  const { claims } = claimsFromFeat([withPath]);
  assert.equal(claims[0].ground, holon("whole/p4/3"));
  assert.notEqual(claims[0].ground, holon("/p4"));
});

test("a point with no path falls back to the flat part-only ground, unchanged", () => {
  const noPath = feat("p4", [{ id: "n1", end1: "a", label: "b", end2: "c", polarity: "+" }]);
  const { claims } = claimsFromFeat([noPath]);
  assert.equal(claims[0].ground, holon("/p4"));
});

test("a resolved-polarity note becomes a real GFP claim, holon-grounded by its own point's part", () => {
  const f = [feat("p1", [{ id: "pt:p1:root", end1: "dam", label: "regulate", end2: "river", polarity: "+" }])];
  const { claims, unresolved } = claimsFromFeat(f);
  assert.equal(claims.length, 1);
  assert.equal(unresolved, 0);
  assert.equal(claims[0].ground, holon("/p1"));
  assert.equal(claims[0].rel, "regulate");
  assert.equal(claims[0].roles.ARG0, "dam");
  assert.equal(claims[0].roles.ARG1, "river");
  assert.equal(claims[0].polarity, "+");
});

test("a negative-polarity note is preserved as a real negative claim, never flipped or dropped", () => {
  const f = [feat("p2", [{ id: "pt:p2:root", end1: "flood", label: "reach", end2: "town", polarity: "-" }])];
  const { claims, unresolved } = claimsFromFeat(f);
  assert.equal(claims.length, 1);
  assert.equal(unresolved, 0);
  assert.equal(claims[0].polarity, "-");
});

test("an unresolved ('?') polarity note is excluded from claims and counted, never guessed", () => {
  const f = [
    feat("p1", [{ id: "pt:p1:a", end1: "x", label: "y", end2: "z", polarity: "?" }]),
    feat("p2", [{ id: "pt:p2:a", end1: "a", label: "b", end2: "c", polarity: "+" }]),
  ];
  const { claims, unresolved } = claimsFromFeat(f);
  assert.equal(claims.length, 1);
  assert.equal(unresolved, 1);
  assert.equal(claims[0].roles.ARG0, "a");
});

test("multiple points in the same part share the same holon ground", () => {
  const f = [
    feat("p1", [{ id: "n1", end1: "a", label: "r1", end2: "b", polarity: "+" }]),
    feat("p1", [{ id: "n2", end1: "c", label: "r2", end2: "d", polarity: "+" }]),
  ];
  const { claims } = claimsFromFeat(f);
  assert.equal(claims.length, 2);
  assert.equal(claims[0].ground, claims[1].ground);
});

test("a point with no notes contributes nothing, silently and correctly (not an error)", () => {
  const f = [{ pt: { id: "pt:p1", part: "p1" }, notes: [] }, { pt: { id: "pt:p2", part: "p2" } }];
  const { claims, unresolved } = claimsFromFeat(f);
  assert.equal(claims.length, 0);
  assert.equal(unresolved, 0);
});

test("claimsFromFeat's output is a real, valid input to foldAt (end-to-end check)", async () => {
  const { foldAt } = await import("./fold-at.js");
  const f = [
    feat("p1", [{ id: "n1", end1: "dam", label: "regulate", end2: "river", polarity: "+" }]),
    feat("p1/2", [{ id: "n2", end1: "river", label: "flood", end2: "town", polarity: "-" }]),
  ];
  const { claims } = claimsFromFeat(f);
  const fold = foldAt("/p1/2", claims);
  assert.equal(fold.here.length, 1);
  assert.equal(fold.ancestors.length, 1);
  assert.equal(fold.ancestors[0].rel, "regulate");
});
