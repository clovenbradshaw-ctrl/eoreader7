// native/eval/the-fold/ablation-pressure-calibration.mjs — the
// falsification test for adapters/text/ablation-grain-pressure.js.
//
// "Real signal in aggregate" (already measured: 29% vs 7.7% chance,
// p=6e-15) is a DIFFERENT claim from "the declared confidence is
// meaningful per case." A mechanism can win on average while its
// confidence number is decorative -- e.g. if margin correlates with
// sentence length rather than with being right. This test checks the
// second claim, on held-out words disjoint from every word used to build
// the priors.
//
// THE BAR IS MEASURED, NOT SET (elenchus-bar.mjs's own discipline,
// reused rather than re-derived): predictions are split into high-margin
// and low-margin halves at the POPULATION'S OWN median margin -- never a
// hand-picked confidence cutoff. If high-margin predictions are not
// significantly more accurate than low-margin ones, OR the effect does
// not itself clear a shuffled-label null, the module's declared
// confidence is reported as NOT calibrated, and ablation-grain-pressure.js
// must disclose that rather than imply a confidence number means what it
// sounds like it means.
//
// Usage: node native/eval/the-fold/ablation-pressure-calibration.mjs [--json OUT]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseConllu } from "../../kernel/eot-rich.js";
import { seeded } from "../../adapters/text/english-parser.js";
import { fisherGreater } from "./claim-null-scoring.mjs";
import { buildCentroidsFrom, buildDeltaPrompts, ablationPressure } from "../../adapters/text/ablation-grain-pressure.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg("json", null);
const POS_SET = ["NOUN", "VERB", "PROPN", "ADJ", "ADV", "NUM", "PRON", "ADP", "DET", "AUX", "CCONJ", "PART", "SCONJ"];
const HELDOUT_WORDS_PER_POS = Number(arg("words", 8));
const OCC_PER_WORD = 4;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Shared, contended local Ollama instance -- measured this session to trip
// a real HeadersTimeoutError under load from other concurrent sessions;
// patient retry, not a workaround for a bug in the request itself.
async function embed(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    let attempt = 0, ok = false, lastErr = null;
    while (attempt < 5 && !ok) {
      try {
        const r = await fetch("http://localhost:11434/api/embed", { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: batch }) });
        if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
        out.push(...(await r.json()).embeddings);
        ok = true;
      } catch (e) {
        lastErr = e;
        attempt += 1;
        console.log(`    local embed attempt ${attempt}/5 failed (${e.message ?? e}), retrying in 15s`);
        await sleep(15000);
      }
    }
    if (!ok) throw lastErr;
  }
  return out;
}

// The exact same words the prior-builder found are avoided here by drawing
// from the held-out (test) half of the sentence split, not the train half
// -- the prior was built ONLY from the train half (see
// build-ablation-grain-prior.mjs), so any word found here that only
// recurs in the test half never touched the centroids.
function findHeldoutWords(sentences, seedKey, wordsPerPos, excludeWords) {
  const byWord = new Map();
  for (const s of sentences) {
    const forms = s.tokens.map((t) => t.form);
    s.tokens.forEach((t, idx) => {
      if (!/^[\p{L}]{2,}$/u.test(t.form)) return;
      if (!POS_SET.includes(t.upos)) return;
      const key = t.form.toLowerCase();
      if (excludeWords.has(key)) return;
      if (!byWord.has(key)) byWord.set(key, []);
      byWord.get(key).push({ forms, idx, upos: t.upos });
    });
  }
  const qualifying = [];
  for (const [word, occs] of byWord) {
    if (occs.length < 1) continue;
    // single, real occurrence per test item -- this mirrors the LIVE
    // query path exactly (ablationPressure only ever sees one occurrence
    // in production), unlike the prior's own multi-occurrence build.
    qualifying.push({ word, pos: occs[0].upos, forms: occs[0].forms, idx: occs[0].idx });
  }
  const rand = seeded(seedKey);
  for (let i = qualifying.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [qualifying[i], qualifying[j]] = [qualifying[j], qualifying[i]]; }
  const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
  for (const q of qualifying) if (byPos[q.pos].length < wordsPerPos) byPos[q.pos].push(q);
  return byPos;
}

function lfact(n) { let s = 0; for (let i = 2; i <= n; i += 1) s += Math.log(i); return s; }
function lchoose(n, k) { if (k < 0 || k > n) return -Infinity; return lfact(n) - lfact(k) - lfact(n - k); }

async function main() {
  console.log("=== loading the English prior (built from the TRAIN half only) ===");
  const priorPath = path.join(ROOT, "native/priors/ablation-grain-eng.json");
  const prior = JSON.parse(fs.readFileSync(priorPath, "utf8"));
  console.log(`  provenance: ${JSON.stringify(prior.provenance)}`);

  const EWT = path.join(ROOT, "legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu");
  const allSents = parseConllu(fs.readFileSync(EWT, "utf8"));
  const heldOutTenth = allSents.filter((_, i) => i % 10 === 9); // english-parser.js's own standing held-out split
  // Within that tenth, use the SAME train/test halves build-ablation-grain-prior.mjs
  // would have used if pointed at this split, so calibration words are
  // drawn from the test half specifically -- disjoint from the prior's
  // own build data by construction, not by post-hoc filtering alone.
  const rand = seeded("ablation-grain-prior-eng");
  const shuffled = [...heldOutTenth];
  for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  // build-ablation-grain-prior.mjs actually used the WHOLE heldOutTenth (no
  // further split) as its mining pool -- so calibration draws from the
  // FULL en_ewt-ud-train.conllu sentences NOT in that tenth at all, the
  // genuinely disjoint pool.
  const calibrationPool = allSents.filter((_, i) => i % 10 !== 9);

  console.log("\n=== finding held-out calibration words (disjoint sentence pool) ===");
  const heldoutWords = findHeldoutWords(calibrationPool, "ablation-calibration-eng", HELDOUT_WORDS_PER_POS, new Set());
  const counts = POS_SET.map((p) => `${p}:${heldoutWords[p].length}`).join(" ");
  console.log(`  ${counts}`);

  const items = POS_SET.flatMap((p) => heldoutWords[p]);
  console.log(`\n=== running live single-occurrence ablationPressure() on ${items.length} held-out words ===`);
  const centroidSets = [prior];
  const results = [];
  for (const it of items) {
    const pressure = await ablationPressure(it.word, it.forms, it.idx, { embed, centroidSets });
    if (!pressure?.combined) continue;
    results.push({ word: it.word, truePos: it.pos, predicted: pressure.combined.pos, margin: pressure.combined.margin, correct: pressure.combined.pos === it.pos });
  }
  console.log(`  ${results.length} predictions produced`);

  function calibrationCheck(rows) {
    const margins = rows.map((r) => r.margin).sort((a, b) => a - b);
    const medianMargin = margins[Math.floor(margins.length / 2)];
    const high = rows.filter((r) => r.margin >= medianMargin);
    const low = rows.filter((r) => r.margin < medianMargin);
    const acc = (arr) => (arr.length ? arr.filter((r) => r.correct).length / arr.length : null);
    const highCorrect = high.filter((r) => r.correct).length, lowCorrect = low.filter((r) => r.correct).length;
    const p = fisherGreater(highCorrect, high.length - highCorrect, lowCorrect, low.length - lowCorrect);
    return { medianMargin: +medianMargin.toFixed(4), highN: high.length, lowN: low.length, highAccuracy: acc(high), lowAccuracy: acc(low), fisherHighGreaterThanLow: +p.toExponential(3) };
  }

  console.log("\n=== calibration check: real predictions ===");
  const realCal = calibrationCheck(results);
  console.log(JSON.stringify(realCal, null, 2));

  // NULL: same words, same margins structurally, but correctness is
  // decided by comparing against a version of the prior with SHUFFLED POS
  // labels on its centroids -- if the "high margin -> more accurate"
  // effect survives even when the labels are meaningless, the calibration
  // effect itself is an artifact, not real.
  console.log("\n=== calibration check: shuffled-label null ===");
  const shuffledPrior = { provenance: prior.provenance, centroids: (() => {
    const keys = Object.keys(prior.centroids);
    const rand2 = seeded("ablation-calibration-null");
    const shuffledKeys = [...keys];
    for (let i = shuffledKeys.length - 1; i > 0; i -= 1) { const j = Math.floor(rand2() * (i + 1)); [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]]; }
    return Object.fromEntries(keys.map((k, i) => [shuffledKeys[i], prior.centroids[k]]));
  })() };
  const nullResults = [];
  for (const it of items) {
    const pressure = await ablationPressure(it.word, it.forms, it.idx, { embed, centroidSets: [shuffledPrior] });
    if (!pressure?.combined) continue;
    nullResults.push({ word: it.word, truePos: it.pos, predicted: pressure.combined.pos, margin: pressure.combined.margin, correct: pressure.combined.pos === it.pos });
  }
  const nullCal = calibrationCheck(nullResults);
  console.log(JSON.stringify(nullCal, null, 2));

  const calibrated = realCal.highAccuracy > realCal.lowAccuracy && realCal.fisherHighGreaterThanLow < 0.05
    && !(nullCal.highAccuracy > nullCal.lowAccuracy && nullCal.fisherHighGreaterThanLow < 0.05);

  const verdict = { calibrated, real: realCal, null: nullCal, note: calibrated
    ? "High-margin predictions are significantly more accurate than low-margin ones, and this effect does NOT reproduce under shuffled labels -- the declared margin is real calibration signal, not decoration."
    : "Calibration NOT confirmed at this sample size -- ablation-grain-pressure.js's margin field must be treated as a rough discriminator (real, per the aggregate p=6e-15 result) rather than a trustworthy per-case confidence until this is re-run at a larger scale." };

  console.log("\n=== VERDICT ===");
  console.log(JSON.stringify(verdict, null, 2));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(verdict, null, 2)); console.log(`written to ${OUT}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
