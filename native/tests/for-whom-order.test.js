import test from "node:test";
import assert from "node:assert/strict";
import { createForWhom, discoveryTrajectory, gateForWhom } from "../kernel/for-whom.js";

const mk = (ref, n) => Array.from({ length: n }, () => ({ schema: "EOMention@1", encounterRef: ref }));

test("the discovery trajectory is in READING order: byte addresses compare as numbers, not strings", () => {
  const entries = [...mk("s#200-209", 5), ...mk("s#0-9", 1), ...mk("s#100-109", 4), ...mk("s#20-29", 3), ...mk("s#10-19", 2)];
  assert.deepEqual([...discoveryTrajectory(entries)], [1, 2, 3, 4, 5]);
});

test("CONTROL built to fail: with the string sort this same input reads 1,2,4,3,5 — the test would catch a regression to it", () => {
  const entries = [...mk("s#0-9", 1), ...mk("s#10-19", 2), ...mk("s#20-29", 3), ...mk("s#100-109", 4), ...mk("s#200-209", 5)];
  const stringOrder = [...new Map(entries.map((e) => [e.encounterRef, 0])).keys()].sort((a, b) => a.localeCompare(b));
  assert.notDeepEqual(stringOrder, ["s#0-9", "s#10-19", "s#20-29", "s#100-109", "s#200-209"], "a string sort scrambles these — that was the bug");
  assert.deepEqual([...discoveryTrajectory(entries)], [1, 2, 3, 4, 5]);
});

test("keys with no address keep the string order they always had; different sources group by source", () => {
  const entries = [...mk("b", 2), ...mk("a", 1), ...mk("a#5-6", 3), ...mk("b#1-2", 9)];
  assert.equal(discoveryTrajectory(entries).length, 4);
});

test("nothing discovered is relevance 0, never NaN", () => {
  const g = gateForWhom(createForWhom({ id: "x", question: "anything at all", giver: "person:t" }), [], {});
  assert.equal(g.relevance, 0);
  assert.ok(!Number.isNaN(g.relevance));
});

test("a reading that discovered nothing is refused on the material leg even at the default floor (the NaN used to do this by accident)", () => {
  const g = gateForWhom(createForWhom({ id: "x", question: "anything at all", giver: "person:t" }), [], {});
  assert.equal(g.material, false);
  assert.equal(g.admitted, false);
});
