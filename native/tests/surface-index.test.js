// The once-per-refresh surface index (2026-09-07): exact to containsSurface's
// boundary rule, in the map's own order, for every surface at once.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { containsSurface, surfaceIndex, surfacesIn } from "../adapters/text/recursive.js";
import { diaNorm } from "../adapters/text/surfaces.js";

const BOOK = "/Users/mlacy/Documents/3.0/the-fold/pg2600.txt";
const text = fs.readFileSync(BOOK, "utf8").slice(20000, 140000);
const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20).slice(0, 600);

// Surfaces of every shape the cast produces: single names, multi-word names,
// diacritics, an apostrophe, a title with a period, nested surfaces (one a
// prefix of another), and a needle that begins with a non-letter.
const SURFACES = ["Prince", "Prince Andrew", "Andrew", "Pierre", "Anna Pávlovna", "Anna", "Pávlovna", "St. Petersburg", "the Emperor", "Emperor", "Kutúzov", "Bolkónski", "Prince Vasíli", "Vasíli", "Hélène", "Dólokhov", "'tis", "l'Empereur", "Natásha", "Rostóv", "the old prince", "Bald Hills", "Moscow", "Boris", "Nikolai", "Mademoiselle Bourienne", "Bourienne"];

test("EXACT to containsSurface for every (sentence, surface) pair over real material — the reference is the single-surface organ", () => {
  const index = surfaceIndex(SURFACES);
  let pairs = 0, hits = 0;
  for (const sentence of sentences) {
    const got = new Set(surfacesIn(sentence, index));
    for (const surface of SURFACES) {
      const want = containsSurface(sentence, surface);
      const have = got.has(diaNorm(surface));
      assert.equal(have, want, `"${surface}" in: ${sentence.slice(0, 80)}…`);
      pairs += 1; hits += want ? 1 : 0;
    }
  }
  assert.ok(hits > 100, `the test must exercise real hits, not only misses (hits ${hits} of ${pairs})`);
});

test("nested surfaces both report: 'Prince' is present wherever 'Prince Andrew' is — no alternation swallows the shorter needle", () => {
  const index = surfaceIndex(["Prince Andrew", "Prince", "Andrew"]);
  assert.deepEqual(surfacesIn("Then Prince Andrew came in.", index), ["prince andrew", "prince", "andrew"]);
  assert.deepEqual(surfacesIn("The prince came in.", index), ["prince"]);
  assert.deepEqual(surfacesIn("Princes came in.", index), [], "a word boundary, not a prefix");
});

test("hits come back in the index's own order, which is the map's insertion order", () => {
  const index = surfaceIndex(["Moscow", "Pierre", "Anna"]);
  assert.deepEqual(surfacesIn("Anna met Pierre in Moscow.", index), ["moscow", "pierre", "anna"]);
});

test("a needle that begins with a non-letter keeps the regex path and still answers exactly", () => {
  const index = surfaceIndex(["'tis", "Pierre"]);
  assert.deepEqual(surfacesIn("'Tis Pierre.", index), ["'tis", "pierre"]);
  assert.equal(containsSurface("'Tis Pierre.", "'tis"), true);
  assert.deepEqual(surfacesIn("It is Pierre.", index), ["pierre"]);
});

test("the index is exact at both boundaries: a needle at the very start, at the very end, and glued to punctuation", () => {
  const index = surfaceIndex(["Pierre", "Anna Pávlovna"]);
  assert.deepEqual(surfacesIn("Pierre", index), ["pierre"]);
  assert.deepEqual(surfacesIn("…said Anna Pávlovna", index), ["anna pavlovna"]);
  assert.deepEqual(surfacesIn("(Pierre!)", index), ["pierre"]);
  assert.deepEqual(surfacesIn("Pierres", index), []);
  assert.deepEqual(surfacesIn("Anna Pávlovnas", index), []);
});
