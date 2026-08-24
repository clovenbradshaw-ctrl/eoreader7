import test from "node:test";
import assert from "node:assert/strict";
import {
  projectDiscourseReferents,
  createDiscourseIndex,
  admitDiscourseOccurrence,
  admitDiscourseLink,
  discourseReferentForRoot,
} from "../adapters/text/discourse-referents.js";

const occ = (id, surface) => Object.freeze({ schema: "EOReferentOccurrence@1", id, surface, canonicalSurface: surface });
const link = (id, left, right) => Object.freeze({ schema: "EODiscourseIdentityLink@1", id, leftOccurrence: left, rightOccurrence: right, standing: "supported" });

function referentsFromIndex(index, roots) {
  const out = [];
  for (const root of roots) {
    const r = discourseReferentForRoot(index, root);
    if (r) out.push(r);
  }
  return out;
}

test("incremental admission reproduces projectDiscourseReferents' single-link result", () => {
  const entries = [occ("a", "the wretch"), occ("b", "the monster"), link("l1", "a", "b")];
  const expected = projectDiscourseReferents(entries);

  const index = createDiscourseIndex();
  const touched = new Set();
  admitDiscourseOccurrence(index, entries[0], touched);
  admitDiscourseOccurrence(index, entries[1], touched);
  admitDiscourseLink(index, entries[2], touched);
  const actual = referentsFromIndex(index, touched);

  assert.equal(actual.length, 1);
  assert.deepEqual(actual, expected);
});

test("a later link merging two previously-separate components produces the union, matching the oracle", () => {
  // Two independent pairs first (two separate 2-occurrence components)...
  const entries = [
    occ("a", "the wretch"), occ("b", "the fiend"), link("l1", "a", "b"),
    occ("c", "the demon"), occ("d", "the devil"), link("l2", "c", "d"),
    // ...then a third link bridges one member of each into ONE component.
    link("l3", "b", "c"),
  ];
  const expected = projectDiscourseReferents(entries);
  assert.equal(expected.length, 1, "oracle sanity check: all four occurrences should merge into one referent");
  assert.equal(expected[0].occurrenceRefs.length, 4);
  assert.deepEqual(new Set(expected[0].supportRefs), new Set(["l1", "l2", "l3"]));

  const index = createDiscourseIndex();
  const touched = new Set();
  for (const e of entries) {
    if (e.schema === "EOReferentOccurrence@1") admitDiscourseOccurrence(index, e, touched);
    else admitDiscourseLink(index, e, touched);
  }
  // Only the FINAL touched root (after the merge) should still resolve to a
  // real component; the losing root's own bucket no longer exists.
  const actual = [...touched].map((root) => discourseReferentForRoot(index, root)).filter(Boolean);
  assert.equal(actual.length, 1);
  assert.equal(actual[0].occurrenceRefs.length, 4);
  assert.deepEqual(new Set(actual[0].supportRefs), new Set(["l1", "l2", "l3"]));
});

test("admitting the same occurrence or link twice is a no-op (idempotent, matches append-only replay)", () => {
  const index = createDiscourseIndex();
  const touched = new Set();
  const a = occ("a", "the wretch"), b = occ("b", "the monster"), l = link("l1", "a", "b");
  admitDiscourseOccurrence(index, a, touched);
  admitDiscourseOccurrence(index, b, touched);
  admitDiscourseLink(index, l, touched);
  admitDiscourseOccurrence(index, a, touched); // replay, as a self-healing sync catch-up might
  admitDiscourseLink(index, l, touched);
  const referents = [...touched].map((root) => discourseReferentForRoot(index, root)).filter(Boolean);
  assert.equal(referents.length, 1);
  assert.equal(referents[0].occurrenceRefs.length, 2);
});

test("a lone occurrence, or two occurrences never linked, never forms a referent", () => {
  const index = createDiscourseIndex();
  const touched = new Set();
  admitDiscourseOccurrence(index, occ("a", "the wretch"), touched);
  admitDiscourseOccurrence(index, occ("b", "the wretch"), touched); // same surface, no link
  const referents = [...touched].map((root) => discourseReferentForRoot(index, root)).filter(Boolean);
  assert.equal(referents.length, 0);
});
