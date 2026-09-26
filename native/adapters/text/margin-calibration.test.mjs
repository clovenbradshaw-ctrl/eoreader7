// margin-calibration.test.mjs -- does Perceptron.bestWithMargin's own margin
// predict real tagging correctness? The same discipline as
// ablation-pressure-calibration.mjs: split at the population's OWN median
// margin (never a hand-set threshold), compare accuracy with Fisher's exact
// test, and check the effect against a shuffled-correctness-label null so a
// spurious split is never mistaken for a real one.
//
// Measured 2026-09-26 on the SAME held-out tenth english-parser.test.mjs's
// own COMPETENCE test already establishes as genuinely unseen by training
// (1,254 sentences, 20,034 words): median margin 26.886, high-margin
// accuracy 0.9987 vs low-margin accuracy 0.9077, Fisher p=9.926e-264; the
// shuffled null shows no effect (p=0.382). This corrects a hastier,
// single-sentence comparison from the immediately preceding session cycle,
// which found "converts" (margin 4.627, from "Photosynthesis converts light
// energy...") was not the LOWEST margin among that one sentence's own 11
// tokens and concluded margin did not license a backoff -- at population
// scale, 4.627 sits far below the real median, squarely in the measured
// low-accuracy half. The floor here sits below the measurement, so a
// regression trips it and no aspiration is written as a gate.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, tagSentenceWithMargins, seeded } from "./english-parser.js";
import { parseConllu } from "../../kernel/eot-rich.js";
import { fisherGreater } from "../../eval/the-fold/claim-null-scoring.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const MODEL = path.join(ROOT, "native", "priors", "parser-eng-ewt.json");
const EWT = path.join(ROOT, "legacy-eoreader6.1", "scripts", "corpus", "en_ewt-ud-train.conllu");
const ready = fs.existsSync(MODEL) && fs.existsSync(EWT);

test("CALIBRATION: margin predicts real tagging correctness on the held-out tenth, floor below measurement", { skip: !ready }, () => {
  const model = loadModel(JSON.parse(fs.readFileSync(MODEL, "utf8")));
  const held = parseConllu(fs.readFileSync(EWT, "utf8")).filter((_, i) => i % 10 === 9);
  const rows = [];
  for (const sent of held) {
    const toks = sent.tokens.filter((t) => t.upos && t.upos !== "_");
    if (!toks.length) continue;
    const { tags, margins } = tagSentenceWithMargins(model.tagger, toks.map((t) => t.form));
    for (let i = 0; i < toks.length; i++) rows.push({ margin: margins[i], correct: tags[i] === toks[i].upos });
  }
  assert.ok(rows.length > 15000, `expected the same ~20k-token held-out set, got ${rows.length}`);

  const sorted = rows.map((r) => r.margin).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const high = rows.filter((r) => r.margin >= median), low = rows.filter((r) => r.margin < median);
  const acc = (arr) => arr.filter((r) => r.correct).length / arr.length;
  const highCorrect = high.filter((r) => r.correct).length, lowCorrect = low.filter((r) => r.correct).length;
  const p = fisherGreater(highCorrect, high.length - highCorrect, lowCorrect, low.length - lowCorrect);

  // The floor sits below the measured result (0.9987 vs 0.9077, p~1e-264) so
  // a real regression trips it without writing an aspiration as a gate.
  assert.ok(acc(high) > acc(low), `high-margin accuracy (${acc(high)}) must exceed low-margin accuracy (${acc(low)})`);
  assert.ok(acc(high) > 0.99, `high-margin accuracy floor: ${acc(high)}`);
  assert.ok(acc(low) < 0.95, `low-margin accuracy must be measurably worse: ${acc(low)}`);
  assert.ok(p < 1e-10, `the real split must clear a strict significance floor, got p=${p}`);

  // NULL ARM: identical margins, shuffled correctness labels -- must show no
  // effect, or the "real" split above would be an artifact of sample size.
  const rand = seeded("margin-vs-error-null");
  const shuffled = rows.map((r) => r.correct);
  for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const nullRows = rows.map((r, i) => ({ margin: r.margin, correct: shuffled[i] }));
  const nullHigh = nullRows.filter((r) => r.margin >= median), nullLow = nullRows.filter((r) => r.margin < median);
  const nullHighCorrect = nullHigh.filter((r) => r.correct).length, nullLowCorrect = nullLow.filter((r) => r.correct).length;
  const nullP = fisherGreater(nullHighCorrect, nullHigh.length - nullHighCorrect, nullLowCorrect, nullLow.length - nullLowCorrect);
  assert.ok(nullP > 0.05, `the shuffled-label null must show no significant effect, got p=${nullP}`);
});
