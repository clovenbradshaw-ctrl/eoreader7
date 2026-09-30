import { test } from "node:test";
import assert from "node:assert/strict";
import { extractClaims, falsify, CONCEPT_TABLE } from "./category-discovery.js";

test("extractClaims: pulls real concepts from a real-shaped free-text model answer", () => {
  const modelText = `A podcast app is recognizable by a few concrete things: it shows cover art/thumbnail images for each show, it usually has a persistent mini-player fixed at the bottom of the screen so you can keep browsing while listening, and shows are often arranged in a grid of tiles. There's typically a search icon too.`;
  const claims = extractClaims(modelText);
  const ids = claims.map((c) => c.id).sort();
  assert.deepEqual(ids, ["artwork", "grid-layout", "persistent-player", "search"]);
});

test("extractClaims: a concept never mentioned is never extracted — no guessing", () => {
  const claims = extractClaims("Podcast apps have a nice color scheme.");
  assert.deepEqual(claims, []);
});

test("extractClaims: an unrecognized claim is silently dropped, not force-mapped to the nearest concept", () => {
  const claims = extractClaims("Podcast apps often use rounded corners and friendly typography.");
  assert.deepEqual(claims, []); // real claims, but outside this table's declared scope
});

test("falsify: a model claim the reference does NOT support is model-claim-not-supported, never actioned", () => {
  const claims = [{ id: "duration", label: "shows episode duration" }];
  const result = falsify(claims, { referenceHasIt: () => false, appHasIt: () => false });
  assert.equal(result[0].verdict, "model-claim-not-supported-by-reference");
});

test("falsify: reference has it, app lacks it — confirmed-gap, the ONLY verdict that licenses building anything", () => {
  const claims = [{ id: "artwork", label: "shows artwork" }];
  const result = falsify(claims, { referenceHasIt: () => true, appHasIt: () => false });
  assert.equal(result[0].verdict, "confirmed-gap");
});

test("falsify: both sides already have it — already-present, no gap", () => {
  const claims = [{ id: "artwork", label: "shows artwork" }];
  const result = falsify(claims, { referenceHasIt: () => true, appHasIt: () => true });
  assert.equal(result[0].verdict, "already-present");
});

test("CONTROL, built to fail: an unmeasured side NEVER resolves to confirmed-gap by default — null must stay null, not silently coerce to false", () => {
  const claims = [{ id: "duration", label: "shows episode duration" }];
  const result = falsify(claims, { referenceHasIt: () => true, appHasIt: () => null });
  assert.equal(result[0].verdict, "unmeasured", "a null measurement must never be treated as a confirmed absence");
});

test("every concept in the table has a real, distinct pattern (no accidental duplicate coverage)", () => {
  assert.equal(new Set(CONCEPT_TABLE.map((c) => c.id)).size, CONCEPT_TABLE.length);
});
