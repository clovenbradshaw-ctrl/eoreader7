// native/eval/fold-prediction.mjs — does the FOLD predict the corpus?
//
// THE QUESTION, made falsifiable. Standing at sentence t having read only
// 1..t, rank every motif the reading currently holds by how likely it is to
// arrive in sentence t+1. Then look. This is a prediction a language model
// cannot answer from parametric memory — "which content words occur in
// sentence 2,431 of Frankenstein" is not a memorized fact — and it is
// answered here with ZERO model calls, from state the reader built causally.
//
// THE METRIC IS CALIBRATION-FREE AND PARAMETER-FREE. At each step the truth
// itself supplies k: the number of live motifs that actually arrive next.
// Each predictor ranks the live set and is scored precision@k. No
// probability calibration (which would need bins), no threshold (which would
// need a number), and k is never chosen — it is read off the answer.
//
// BASELINES ARE MANDATORY, CONTROLS COME FIRST. Both are the prediction
// framework's own law (packages/engine/prediction: "an unbaselined
// competency claim is unfalsifiable"; "a candidate that beats baselines on a
// regime-switching series and also beats them on white noise has not
// detected regimes"). That framework's numeric CRPS runner does not apply to
// a categorical target, so its CONTRACT is reused and its scoring rule is
// not — stated rather than quietly bent.
//
//   baseline:base-rate  — rank by how often the motif has occurred. No order,
//                         no recency: the honest "structure-free" reader.
//   baseline:recency    — rank by how recently it last occurred.
//   candidate:fold      — rank by the fold's decayed activation
//                         (kernel/activation.js), the repo's own claim about
//                         what "present" means, with its window MEASURED by
//                         dmdWindow over the warmup prefix, never typed.
//
//   NEGATIVE CONTROL    — the identical run on a sentence-shuffled corpus.
//                         Order is destroyed, marginals preserved. If the
//                         fold's edge survives shuffling it was never reading
//                         order, and the positive result is withdrawn.
//
// Usage: node native/eval/fold-prediction.mjs <book.txt>

import fs from "node:fs";
import { stripContainer, splitSentences } from "../adapters/text/spans.js";
import { tokens, codeOf, encodeFrame } from "../memory/activation.js";
import { createActivation, dmdWindow } from "../kernel/activation.js";
import { conclusionOf, dyadicCandidates } from "../adapters/text/contextual-dmd.js";
import { dominantClass } from "../adapters/text/construction.js";

const POS_PRIOR = JSON.parse(fs.readFileSync(new URL("../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));
const UD_CLOSED = new Set(["ADP", "AUX", "CCONJ", "DET", "NUM", "PART", "PRON", "SCONJ"]);
const SEED = 20260825;

const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffle = (arr, seed) => {
  const rnd = mulberry(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

/** One causal pass: per sentence, the band-admitted open-class motifs in it. */
function observationsOf(sentences) {
  const state = { df: new Map(), gramDf: new Map(), posting: new Map(), edges: new Map(), read: 0 };
  const out = [];
  for (const s of sentences) {
    const ws = tokens(s.text);
    const { trace, cue } = codeOf(ws, state, {});
    const present = new Set();
    for (const w of ws) {
      if (!cue.has(w)) continue;
      const c = dominantClass(w, POS_PRIOR);
      if (c == null || UD_CLOSED.has(c)) continue;
      present.add(w);
    }
    out.push(present);
    encodeFrame(state, s.order, ws, trace, {});
  }
  return out;
}

/** precision@k where k is the TRUTH's own size — never a chosen cutoff. */
const precisionAtK = (ranked, truth) => {
  if (!truth.size) return null;
  const k = truth.size;
  let hit = 0;
  for (let i = 0; i < Math.min(k, ranked.length); i += 1) if (truth.has(ranked[i])) hit += 1;
  return hit / k;
};

function runArm(observations, window, label) {
  const fold = createActivation({ window });
  // The explicitly undecayed control the API itself offers (window: null).
  // The fold interpolates between recency (small window) and accumulation
  // (undecayed), so running both ends says WHERE on that continuum this
  // corpus's own answer sits, rather than reporting one point on it.
  const undecayed = createActivation({ window: null });
  const count = new Map();          // motif -> occurrences so far
  const lastAt = new Map();         // motif -> last sentence index
  const scores = { "baseline:base-rate": [], "baseline:recency": [], "candidate:fold": [], "control:fold-undecayed": [] };
  let chance = [];
  let steps = 0;

  for (let t = 0; t < observations.length - 1; t += 1) {
    const here = observations[t];
    for (const m of here) { count.set(m, (count.get(m) ?? 0) + 1); lastAt.set(m, t); }
    fold.observe(here);
    undecayed.observe(here);

    // LIVE SET: the band's own gate — a motif that has recurred at least once
    const live = [...count.entries()].filter(([, n]) => n >= 2).map(([m]) => m);
    if (live.length < 2) continue;

    const truth = new Set([...observations[t + 1]].filter((m) => count.has(m)));
    if (!truth.size) continue;

    const rank = (score) => [...live].sort((a, b) => score(b) - score(a));
    const p1 = precisionAtK(rank((m) => count.get(m) ?? 0), truth);
    const p2 = precisionAtK(rank((m) => lastAt.get(m) ?? -Infinity), truth);
    const p3 = precisionAtK(rank((m) => fold.activationOf(m)), truth);
    const p4 = precisionAtK(rank((m) => undecayed.activationOf(m)), truth);
    if (p1 == null) continue;
    scores["baseline:base-rate"].push(p1);
    scores["baseline:recency"].push(p2);
    scores["candidate:fold"].push(p3);
    scores["control:fold-undecayed"].push(p4);
    chance.push(Math.min(truth.size, live.length) / live.length);
    steps += 1;
  }

  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    arm: label,
    steps,
    chance: mean(chance),
    meanPrecisionAtK: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, mean(v)])),
  };
}

function main() {
  const path = process.argv[2];
  if (!path) throw new TypeError("usage: node native/eval/fold-prediction.mjs <book.txt>");
  const stripped = stripContainer(fs.readFileSync(path, "utf8"));
  const sentences = splitSentences(stripped.text);
  const observations = observationsOf(sentences);

  // WINDOW: measured, from the warmup prefix only, against a discrete
  // conclusion — never typed. The prefix is the first dyadic step that
  // supports a decomposition at all.
  const warmupLen = dyadicCandidates(observations.length).find((d) => d >= 8) ?? 8;
  const warmup = observations.slice(0, warmupLen).map((s) => new Map([...s].map((m) => [m, 1])));
  const measured = dmdWindow(warmup, conclusionOf, { candidates: dyadicCandidates(warmup.length) });
  const window = measured.window ?? null;

  const real = runArm(observations, window, "real");
  const nullArm = runArm(shuffle(observations, SEED), window, "sentence-shuffled");

  const edge = (a) => a.meanPrecisionAtK["candidate:fold"] - a.meanPrecisionAtK["baseline:base-rate"];

  console.log(JSON.stringify({
    schema: "EOFoldPredictionRun@1",
    book: path.split("/").pop(),
    question: "standing at sentence t, having read only 1..t, which motifs arrive at t+1?",
    metric: "precision@k, k = the truth's own size at each step — calibration-free, threshold-free, k never chosen",
    window: { measured: window, basis: measured.basis ?? measured.gap, warmupObservations: warmupLen,
              note: "measured causally from the warmup prefix against a discrete conclusion (rank, oscillatory count); never typed" },
    sentences: sentences.length,
    arms: { real, null: nullArm },
    verdict: {
      foldMinusBaseRate_real: edge(real),
      foldMinusBaseRate_shuffled: edge(nullArm),
      readsOrder: edge(real) > edge(nullArm),
      note: "if the fold's edge over base-rate survives sentence shuffling, it was never reading order and the positive result is withdrawn",
    },
  }, null, 1));
}

main();
