// surprise-segments.test.js — a stream's own surprise finds its figures,
// on streams whose figures are known by construction; a stream without
// figures cuts nothing; the kernel names no medium.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { surprises, segmentBySurprise, segmentToken, recursiveSegments } from "../kernel/surprise-segments.js";

const P = { order: 2, alpha: 0.05, draws: 10, seed: 1, minLength: 3 };
// eight figures of four events each, in an order the ground cannot foresee
const FIGS = [["a", "b", "c", "d"], ["e", "f", "g", "h"], ["i", "j", "k", "l"]];
const stream = (seq) => seq.flatMap((i) => FIGS[i]);

test("surprise falls to nothing on a stream that only repeats — no figures, no cuts", () => {
  const ev = Array.from({ length: 80 }, (_, i) => ["a", "b", "c", "d"][i % 4]);
  const s = surprises(ev, { order: 2 });
  assert.ok(s.slice(8).every((x) => x < 0.2), "after one cycle the ground is right every time");
  const seg = segmentBySurprise(ev, P);
  assert.equal(seg.figures, 0, "nothing exceeds what shuffling produces");
});

test("boundaries land where one known figure gives way to another — the ground is most wrong there", () => {
  const seq = [0, 1, 2, 0, 2, 1, 1, 0, 2, 2, 0, 1, 2, 0, 1, 1, 2, 0];
  const ev = stream(seq);
  const seg = segmentBySurprise(ev, P);
  const figureStarts = new Set(seq.map((_, i) => i * 4).slice(1));
  const onFigure = seg.boundaries.filter((b) => figureStarts.has(b)).length;
  assert.ok(seg.figures >= 4, `cut something: ${seg.figures}`); // the null licenses only the sharpest changes of figure
  assert.ok(onFigure / seg.figures >= 0.7, `${onFigure} of ${seg.figures} boundaries at a figure start: ${seg.boundaries}`);
});

test("every number is declared; a segment token is its move-shape, symbol-free", () => {
  assert.throws(() => segmentBySurprise(["a", "b"], { order: 2 }), /declared/);
  assert.throws(() => recursiveSegments(["a"], { ...P }), /declared/);
  const t1 = segmentToken(["a", "b", "a", "c"], { order: 2 }), t2 = segmentToken(["x", "y", "x", "z"], { order: 2 });
  assert.equal(t1, t2, "same shape, different symbols: the same kind of segment");
  assert.notEqual(t1, segmentToken(["a", "b", "c", "d"], { order: 2 }));
});

test("recursion: figures become the events of the next level, and a level with nothing to cut stops and says so", () => {
  const seq = Array.from({ length: 60 }, (_, i) => [0, 1, 2, 0, 1, 2, 2, 1, 0][i % 9]);
  const levels = recursiveSegments(stream(seq), { ...P, depth: 3 });
  assert.ok(levels.length >= 1);
  assert.ok(levels[0].figures > 0);
  assert.ok(levels[0].distinctTokens <= levels[0].figures + 1);
  const last = levels[levels.length - 1];
  assert.ok(levels.length === 3 || last.stopped, `either the full depth or a named stop: ${JSON.stringify(last.stopped)}`);
});

test("the kernel names no medium", () => {
  const src = readFileSync(new URL("../kernel/surprise-segments.js", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const w of ["note", "pitch", "word", "sentence", "music", "text", "bar", "phrase"]) assert.doesNotMatch(src, new RegExp(`\\b${w}s?\\b`, "i"), w);
});
