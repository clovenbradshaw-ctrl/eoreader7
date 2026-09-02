// continuation.test.js — the prior, the shape prior, and the mixture, on
// streams whose structure is known by construction. The decisive pins: a
// shuffled hearing must predict WORSE than the real one (the control built
// to fail), the mixture must never score worse than its best expert plus the
// cost of not knowing which it was, and the kernel must name no medium.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sedimentPrior, predictNext, scorePrequential, continueStream, lcg, shuffled, sedimentShapePrior, shapeOf, scorePrequentialWithShape, expertOf, runMixture, continueMixture } from "../kernel/continuation.js";

const pattern = (n) => Array.from({ length: n }, (_, i) => ["a", "b", "c", "d"][i % 4]);

test("a repeating stream is predicted at (near) zero bits, and its shuffle is not — the control built to fail", () => {
  const heard = pattern(200), held = pattern(80);
  const own = sedimentPrior(heard, { order: 2, giver: "test" });
  const s = scorePrequential(own, held);
  assert.ok(s.bitsPerEvent < 0.05, `real: ${s.bitsPerEvent}`);
  assert.equal(s.top1, 1);
  const ctrl = sedimentPrior(shuffled(heard, lcg(3)), { order: 2, giver: "shuffled" });
  const c = scorePrequential(ctrl, held);
  assert.ok(c.bitsPerEvent > 1.5, `shuffled: ${c.bitsPerEvent} — marginals alone predict a 4-symbol cycle at ~2 bits`);
});

test("every number is declared: order, giver, length, rng", () => {
  assert.throws(() => sedimentPrior(["a"], {}), /declared/);
  assert.throws(() => sedimentPrior(["a"], { order: 1 }), /giver/);
  const p = sedimentPrior(pattern(20), { order: 1, giver: "t" });
  assert.throws(() => continueStream(p, ["a"], {}), /declared/);
  assert.throws(() => continueStream(p, ["a"], { length: 3 }), /rng/);
  assert.throws(() => runMixture([expertOf("x", p)], ["a"], {}), /declared/);
});

test("generation follows the prior: a continuation of the cycle IS the cycle, and it reproduces", () => {
  const p = sedimentPrior(pattern(200), { order: 2, giver: "t" });
  const g1 = continueStream(p, ["c", "d"], { length: 12, rng: lcg(1) }).generated.map((g) => g.event);
  const g2 = continueStream(p, ["c", "d"], { length: 12, rng: lcg(1) }).generated.map((g) => g.event);
  assert.deepEqual(g1, ["a", "b", "c", "d", "a", "b", "c", "d", "a", "b", "c", "d"]);
  assert.deepEqual(g1, g2, "seeded: reproducible");
  assert.ok(g1.every((e, i) => continueStream(p, ["c", "d"], { length: 12, rng: lcg(1) }).generated[i].from === "prior"), "every generated event is marked as the prior's, never as heard");
});

test("shapes are symbol-free: the same move grammar reads off two streams with disjoint alphabets", () => {
  const seen = new Set(["x", "y"]);
  assert.equal(shapeOf(["x", "y"], "y", seen, 3), "r1");
  assert.equal(shapeOf(["x", "y"], "x", seen, 3), "r2");
  assert.equal(shapeOf(["x", "y"], "z", seen, 3), "new");
  assert.equal(shapeOf(["x", "y"], "w", new Set(["x", "y", "w"]), 3), "old");
  const a = sedimentShapePrior(pattern(120), { order: 3, giver: "letters" });
  const b = sedimentShapePrior(pattern(120).map((e) => e + "♯"), { order: 3, giver: "other-alphabet" });
  assert.deepEqual([...a.marginal].sort(), [...b.marginal].sort(), "the move grammar is identical though no symbol is shared");
  // and bearing on a symbol prior it changes nothing on a stream whose shapes it already fits
  const own = sedimentPrior(pattern(200), { order: 3, giver: "t" });
  const plain = scorePrequential(own, pattern(60)).bitsPerEvent, shaped = scorePrequentialWithShape(own, b, pattern(60)).bitsPerEvent;
  assert.ok(Math.abs(plain - shaped) < 0.05, `${plain} vs ${shaped}`);
});

test("THE MIXTURE: never worse than its best expert by more than log2(N)/n, and the shuffled expert fades to nothing", () => {
  const heard = pattern(200), held = pattern(120);
  const good = sedimentPrior(heard, { order: 2, giver: "good" });
  const bad = sedimentPrior(shuffled(heard, lcg(9)), { order: 2, giver: "bad" });
  const experts = [expertOf("good", good), expertOf("bad", bad), expertOf("bad2", sedimentPrior(shuffled(heard, lcg(10)), { order: 2, giver: "bad2" }))];
  const m = runMixture(experts, held, { order: 2, alphabetSize: 4 });
  const best = Math.min(...m.cumulativeBits) / held.length;
  // the Bayesian bound holds exactly for exact likelihoods; the declared
  // alphabet floor (applied to every scorer alike) perturbs it by at most
  // the floor's own mass per event — stated as slack, never hidden
  const floorSlack = Math.log2(1 + 1 / 5) / held.length;
  assert.ok(m.bitsPerEvent <= best + Math.log2(experts.length) / held.length + floorSlack, `mixture ${m.bitsPerEvent} vs best ${best}`);
  assert.ok(m.weights[0] > 0.99, `the real hearing carries the weight: ${m.weights}`);
  assert.ok(m.weights[1] < 0.01 && m.weights[2] < 0.01, "the shuffled experts fade");
  assert.equal(m.leads[m.leads.length - 1].expert, "good");
  const g = continueMixture(experts, m.weights, ["c", "d"], { length: 8, rng: lcg(2), order: 2 }).generated.map((x) => x.event);
  assert.deepEqual(g, ["a", "b", "c", "d", "a", "b", "c", "d"], "generation at the weights the stream taught");
});

test("the kernel names no medium: no note, pitch, word, sentence, music or text in its code", () => {
  const src = readFileSync(new URL("../kernel/continuation.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const w of ["note", "pitch", "word", "sentence", "music", "text", "midi"])
    assert.doesNotMatch(src, new RegExp(`\\b${w}s?\\b`, "i"), `the kernel's code mentions "${w}"`);
});
