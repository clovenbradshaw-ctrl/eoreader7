import test from "node:test";
import assert from "node:assert/strict";
import { orderByNarrative, OUTPUT_ORDER_SCHEMA, ORDER_REFUSALS } from "./output-order.js";

const temporalKinds = [
  { kind: "temporal", position: "first", span: { start: 0, end: 40 } },
  { kind: "temporal", position: "then", span: { start: 41, end: 90 } },
  { kind: "temporal", position: "afterward", span: { start: 91, end: 140 } },
];

test("claims are placed by the temporal window that contains their span", () => {
  const claims = [
    { claim: "army marched", span: { start: 10, end: 30 }, offset: 10 },
    { claim: "they camped", span: { start: 50, end: 70 }, offset: 50 },
    { claim: "battle began", span: { start: 100, end: 130 }, offset: 100 },
  ];
  const { ordered, refused } = orderByNarrative({ kinds: temporalKinds, claims });
  assert.equal(refused, null);
  assert.deepEqual(ordered.map((c) => c.claim), ["army marched", "they camped", "battle began"], "first → then → afterward");
});

test("no temporal anchor is a refusal, never a fallback to document order", () => {
  const claims = [{ claim: "the moon rose", span: { start: 0, end: 20 }, offset: 0 }];
  const { ordered, refused } = orderByNarrative({ kinds: [], claims });
  assert.equal(ordered.length, 0);
  assert.equal(refused.type, ORDER_REFUSALS.NO_TEMPORAL_CLAIMS);
});

test("a declared spine is named in the basis, never an invented order", () => {
  const claims = [{ claim: "marched", span: { start: 5, end: 20 }, offset: 5 }];
  const { basis } = orderByNarrative({ kinds: temporalKinds, claims, spine: "The Recurrence" });
  assert.match(basis, /The Recurrence/);
});

test("the schema is declared", () => {
  assert.equal(OUTPUT_ORDER_SCHEMA, "OutputOrder@1");
});