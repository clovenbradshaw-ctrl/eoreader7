// alias-precision-results.test.js — the alias route's measured precision, pinned.
//
// `eval/the-fold/alias-precision.mjs` measured, out of sample and with the labels fixed before the walls' decisions were opened, how often a declared
// "X (Y)" is an alias and what the distinctness walls keep and lose. A committed result nothing reads is a report, not an enforcement (eo-constitution
// III.5; the-fold POLICIES.md P94): the tables in alias-precision-RESULTS.md are regenerated from the committed raw record and labels by the same pure
// function the driver prints with, and the claims the decision rests on are asserted against that record. The decision — the alias route is NOT folded
// into an index — is enforced on the surface side by the-fold's identity-routes-wiring.test.mjs, which names this file.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeAliasPrecision, aliasTallies } from "../eval/the-fold/lib/alias-precision-summary.mjs";

const dir = new URL("../eval/the-fold/results/", import.meta.url);
const raw = JSON.parse(readFileSync(new URL("alias-precision.raw.json", dir), "utf8"));
const labels = JSON.parse(readFileSync(new URL("alias-precision-labels.json", dir), "utf8"));
const doc = readFileSync(new URL("alias-precision-RESULTS.md", dir), "utf8");
const { all, refused } = aliasTallies(raw, labels);

test("the document's tables are exactly what the committed record says", () => {
  const m = doc.match(/<!-- alias:begin -->\n([\s\S]*?)\n<!-- alias:end -->/);
  assert.ok(m, "the generated block is delimited by alias:begin / alias:end");
  assert.equal(m[1], summarizeAliasPrecision(raw, labels));
});

test("every sample item carries a label and every label an item; the decisions are a separate array, one per item", () => {
  assert.equal(raw.sample.length, raw.decisions.length);
  for (const x of raw.sample) { assert.ok(["T", "F", "U"].includes(labels.labels[x.id]), `item ${x.id} is labelled`); assert.ok(raw.decisions.some((d) => d.id === x.id)); }
  assert.equal(Object.keys(labels.labels).length, raw.sample.length);
  assert.match(labels.judge, /BEFORE the wall decisions/);
});

test("the unwalled route is mostly wrong, and the walled route is not good enough to fold by (a bar of 90% on 30 decided admits is not near)", () => {
  const unwalled = all.T / (all.T + all.F), walled = all.wTP / (all.wTP + all.wFP);
  assert.ok(all.T + all.F >= 100, "enough decided pairs for the unwalled rate to mean something");
  assert.ok(unwalled < 0.25, `unwalled precision ${unwalled}`);
  assert.ok(walled < 0.5, `walled precision ${walled} — if this moves past the bar, re-read the-fold's identity-routes-wiring.test.mjs before wiring anything`);
  assert.ok(all.wTP + all.wFP < 30, "and the walled route admits too few for a rate above the bar to be believed");
});

test("the walls are aimed the right way: each wall refuses more false pairs than true ones (they cost recall, they do not invent precision)", () => {
  for (const [why, r] of Object.entries(refused)) assert.ok(r.F > r.T, `${why}: refused ${r.F} false and ${r.T} true`);
  assert.ok(all.wFP < all.F / 4, "the walls remove most of the false admits");
  assert.ok(all.wTP < all.T, "and lose true ones — the recall cost the document states");
});
