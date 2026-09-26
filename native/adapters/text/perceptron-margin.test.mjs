// perceptron-margin.test.mjs -- Perceptron.bestWithMargin (2026-09-26): the
// real prerequisite for a future register/confidence-aware POS backoff,
// added while diagnosing why "Photosynthesis converts light energy into
// chemical energy stored in glucose." mistags "converts" as NOUN. best()
// already computed a full score array and threw it away; this exposes the
// margin between the winning class and the runner-up, purely additively --
// best() itself is untouched, verified below by cross-checking they always
// agree on which class wins.
//
// CORRECTED (2026-09-26, same day): margin-calibration.test.mjs's own real,
// population-scale measurement (20,034 held-out tokens) found margin IS a
// strong, real calibration signal (high-margin accuracy 0.9987 vs low-margin
// 0.9077, p=9.926e-264) -- and "converts" own margin (4.627) sits far below
// the real median (26.886), squarely in the measured low-accuracy half. The
// real-sentence test below still passes and its own assertion is still true
// (converts is not the single lowest margin among that one sentence's 10
// other tokens), but comparing within one sentence undersold a real, now-
// confirmed signal; see margin-calibration.test.mjs for the finding that
// actually licenses a backoff.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Perceptron, loadModel, tokenize } from "./english-parser.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

test("bestWithMargin always agrees with best() on the winning class, and reports a non-negative margin with 2+ valid classes", () => {
  const p = new Perceptron(["A", "B", "C"]);
  p.w.set("f1", new Float32Array([3, 1, 0]));
  p.w.set("f2", new Float32Array([0, 0, 5]));
  const cases = [["f1"], ["f2"], ["f1", "f2"]];
  for (const feats of cases) {
    const bi = p.best(feats);
    const r = p.bestWithMargin(feats);
    assert.equal(r.index, bi, `bestWithMargin disagreed with best() for ${JSON.stringify(feats)}`);
    assert.ok(r.margin >= 0, `margin must be non-negative, got ${r.margin}`);
  }
});

test("a single valid class has no runner-up to be close to -- margin is Infinity, never a fabricated number", () => {
  const p = new Perceptron(["A", "B"]);
  p.w.set("f1", new Float32Array([2, 7]));
  const r = p.bestWithMargin(["f1"], [true, false]);
  assert.equal(r.index, 0);
  assert.equal(r.margin, Infinity);
});

test("no valid class at all returns a null index and a null margin, never a guessed winner", () => {
  const p = new Perceptron(["A", "B"]);
  p.w.set("f1", new Float32Array([2, 7]));
  const r = p.bestWithMargin(["f1"], [false, false]);
  assert.equal(r.index, -1);
  assert.equal(r.margin, null);
});

test("REAL MODEL, REAL SENTENCE: margins on the exact sentence this session found mistagged -- 'converts' is not the single lowest margin among this one sentence's own tokens (see margin-calibration.test.mjs for the real, population-scale finding that it IS calibrated low-confidence)", () => {
  const model = loadModel(JSON.parse(fs.readFileSync(path.join(ROOT, "native/priors/parser-eng-ewt.json"), "utf8")));
  const sent = "Photosynthesis converts light energy into chemical energy stored in glucose.";
  const words = tokenize(sent).map((t) => t.form);
  const context = ["-START-", "-START2-", ...words.map((w) => w.toLowerCase()), "-END-", "-END2-"];
  let prev = "-START-", prev2 = "-START2-";
  const margins = {};
  for (let i = 0; i < words.length; i++) {
    const feats = [];
    const add = (...k) => feats.push(k.join(" "));
    const w = context[i + 2];
    add("b"); add("s3", w.slice(-3)); add("s2", w.slice(-2)); add("p1", w[0]);
    add("t-1", prev); add("t-2", prev2); add("t-1t-2", prev, prev2);
    add("w", w); add("t-1w", prev, w);
    add("w-1", context[i + 1]); add("s3-1", context[i + 1].slice(-3)); add("w-2", context[i]);
    add("w+1", context[i + 3]); add("s3+1", context[i + 3].slice(-3)); add("w+2", context[i + 4]);
    const r = model.tagger.bestWithMargin(feats);
    const withBest = model.tagger.best(feats);
    assert.equal(r.index, withBest, `bestWithMargin disagreed with best() for real token "${words[i]}"`);
    margins[words[i]] = r.margin;
    prev2 = prev; prev = model.tagger.classes[r.index];
  }
  // Measured live: "converts" (mistagged NOUN) does not have the SINGLE
  // lowest margin among this one sentence's own 10 other tokens ("energy"
  // and "glucose" measure lower and are correctly tagged) -- true, but a
  // later, real, population-scale measurement (margin-calibration.test.mjs,
  // 20,034 held-out tokens) found this within-sentence comparison was the
  // wrong standard: "converts" own margin (4.627) sits far below the real
  // population median (26.886), squarely in the measured low-accuracy half.
  // Kept here as a real, narrower, still-true observation about this one
  // sentence, not as evidence against a backoff -- see margin-calibration
  // .test.mjs for the finding that actually settles the question.
  assert.ok(margins["converts"] > 0 && Number.isFinite(margins["converts"]), "converts must have a real, finite margin");
  const lowerThanConverts = Object.entries(margins).filter(([w, m]) => w !== "converts" && m < margins["converts"]);
  assert.ok(lowerThanConverts.length > 0, "at least one other real token in this sentence measures a lower margin than the mistagged one -- true within this one sentence, not evidence against calibration at population scale");
});
