// node --test asserted.test.mjs
//
// Conformance for the assertion tier's mechanics — the pure parts on their
// own, and the order arm against the ENGINE'S REAL extraction organs (the
// same posture as hypergraph.test.mjs: what counts as a triple must be the
// engine's own answer or the arm measures a different reader than the one
// whose edges it discloses for).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  seededShuffle,
  seedFrom,
  shuffleSentenceWords,
  WITNESS_FLOOR,
  standingOf,
  orderArm,
  assertionPhrase,
} from "./asserted.js";

test("seededShuffle is deterministic and a permutation, never a resample", () => {
  const items = ["a", "b", "c", "d", "e", "f"];
  const one = seededShuffle(items, 7);
  const two = seededShuffle(items, 7);
  assert.deepEqual(one, two);
  assert.deepEqual([...one].sort(), [...items].sort());
  assert.deepEqual(items, ["a", "b", "c", "d", "e", "f"], "the input is never mutated");
  const other = seededShuffle(items, 8);
  assert.notDeepEqual(one, other, "a different seed is a different shuffle");
});

test("seedFrom is deterministic and separates labels", () => {
  assert.equal(seedFrom("0:1:2"), seedFrom("0:1:2"));
  assert.notEqual(seedFrom("0:1:2"), seedFrom("0:2:1"));
});

test("shuffleSentenceWords keeps the sentence's own words, order destroyed", () => {
  const s = "Pierre Bezukhov married Helene that winter in Petersburg.";
  const shuffled = shuffleSentenceWords(s, 3);
  assert.deepEqual(shuffled.split(" ").sort(), s.split(/\s+/).sort());
});

test("the witness floor is structural and pinned — 2, by the meaning of recurrence", () => {
  // The same 2 activation.js's cue gate (df >= 2) and binding.js's
  // arrivals >= 2 earned independently. Changing it is a policy change and
  // lands with its justification or not at all.
  assert.equal(WITNESS_FLOOR, 2);
  assert.equal(standingOf(1), "single-witness");
  assert.equal(standingOf(2), "corroborated");
  assert.equal(standingOf(5), "corroborated");
  assert.equal(standingOf(0), "single-witness");
});

test("orderArm refuses an undeclared resolution and an uninjected organ, by type", () => {
  assert.throws(() => orderArm({ passages: [], splitSentences: (t) => [t], extract: () => [] }), TypeError);
  assert.throws(
    () => orderArm({ passages: [], splitSentences: (t) => [t], extract: () => [], draws: 0 }),
    TypeError,
  );
  assert.throws(() => orderArm({ passages: [], splitSentences: (t) => [t], draws: 4 }), TypeError);
});

test("orderArm is deterministic under its seed, against the real engine extraction", async () => {
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { extractRelations } = await import("../adapters/text/relations.js");
  const passages = [
    { ref: "a#0-1", text: "Pierre Bezukhov married Helene that winter. Pierre Bezukhov trusted Dolokhov entirely." },
    { ref: "a#1-2", text: "Pierre Bezukhov married Helene before the spring, people said." },
  ];
  const verbs = new Set(["married", "trusted"]);
  const extract = (t) => extractRelations(t, { verbs });
  const one = orderArm({ passages, splitSentences, extract, draws: 8, seed: 0 });
  const two = orderArm({ passages, splitSentences, extract, draws: 8, seed: 0 });
  assert.equal(one.draws, 8);
  assert.equal(one.samples.length, 8);
  assert.deepEqual(one.samples, two.samples, "same declaration, same arm — a null that cannot be replayed is not testimony");
  // The vocabulary is held fixed: nothing outside the handed-in verbs can
  // ever be heard from salad.
  for (const sample of one.samples)
    for (const t of sample) assert.ok(verbs.has(t.verb), `salad may only speak the fixed vocabulary: ${t.verb}`);
});

test("the phrase is natural-frequency, never finer than the arm's own resolution", () => {
  const single = assertionPhrase({ standing: "single-witness", statements: 1 });
  assert.match(single, /stated once/);
  const strong = assertionPhrase({
    standing: "corroborated",
    statements: 3,
    orderArm: { draws: 20, fired: 2, seed: 0 },
  });
  assert.match(strong, /stated 3 times/);
  assert.match(strong, /2 of 20/);
  assert.ok(!/%/.test(strong), "counts out of draws, never a percentage the draws cannot support");
  assert.equal(assertionPhrase(null), "");
});
