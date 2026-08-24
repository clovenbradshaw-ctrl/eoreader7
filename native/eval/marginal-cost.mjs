// Discrete-derivative diagnostic: instead of timing a whole read and eyeballing
// whether the total feels proportional to book length (which is how the
// Pride & Prejudice anomaly was first caught -- "it's doing it wrong if it
// takes so long"), this instruments the INCREMENTAL wall-clock cost of each
// turn (reader.step) individually, as a function of how much of the book has
// already been read.
//
// If the reading pipeline is genuinely O(n) end to end, the marginal cost per
// turn is asymptotically flat (a turn late in a long book costs the same as
// one early in it) and total cost is turns * constant. If some component
// still rescans "everything read so far" on every turn, marginal cost rises
// with position, and total cost integrates to O(n^2) or worse -- exactly the
// shape this session already found and fixed five times over (task-log
// replay, fold upsert indexing, discourse union-find, compositionOperations'
// full-graphEntries scan).
//
// This is the same diagnostic eoreader6.1's own
// "Checking REC's recourse locality" investigation used (CLAUDE.md):
// recomputeWork / pushes-so-far, checked for a rising trend via Pearson r
// against turn number -- applied here to this reader's own step() loop.
//
// Usage: node native/eval/marginal-cost.mjs <book.txt> [label]

import fs from "fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold, createTextRevisionIndex } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel.js";

const path = process.argv[2];
const label = process.argv[3] ?? path;
if (!path) throw new TypeError("usage: node native/eval/marginal-cost.mjs <book.txt> [label]");

const source = fs.readFileSync(path, "utf8");
const stripped = stripContainer(source);
if (!stripped.looks_like_material) throw new Error("input does not look like readable material");
const relationPosPrior = JSON.parse(fs.readFileSync(new URL("../../bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));

const encounters = textEncounters(stripped.text, { source: `marginal-cost:${label}`, offset: stripped.offset });
const perceiver = createCausalTextPerceiver({
  minRelationSurfaces: 2,
  refreshEvery: 25,
  relationPosPrior,
  pronounResolution: { minActivation: 0.05, minMargin: 0.2 },
});
const revisionIndex = createTextRevisionIndex();
const reader = createRecursiveReader({
  perceivers: [perceiver],
  adapters: {
    revise: (args) => reviseTextFold({ ...args, index: revisionIndex }),
    retrieve: (_fold, evidence) => Object.freeze({
      schema: "EORelevantFold@1",
      witnessed: Object.freeze([...evidence]),
      provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
      unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
    }),
  },
});

const samples = []; // { turn, charOffset, ms }
const overallStart = process.hrtime.bigint();
let i = 0;
for (const item of encounters) {
  const t0 = process.hrtime.bigint();
  await reader.step(item);
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  samples.push({ turn: i, charOffset: item.anchor?.start ?? i, ms });
  i += 1;
}
const overallMs = Number(process.hrtime.bigint() - overallStart) / 1e6;

// --- Pearson r of turn index vs incremental cost ---
function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k += 1) {
    const dx = xs[k] - mx, dy = ys[k] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

const xs = samples.map((s) => s.turn);
const ys = samples.map((s) => s.ms);
const r = pearson(xs, ys);

// --- Decile buckets: average incremental cost per tenth of the read ---
const DECILES = 10;
const bucketSize = Math.ceil(samples.length / DECILES);
const deciles = [];
for (let d = 0; d < DECILES; d += 1) {
  const chunk = samples.slice(d * bucketSize, (d + 1) * bucketSize);
  if (!chunk.length) continue;
  const avg = chunk.reduce((a, s) => a + s.ms, 0) / chunk.length;
  deciles.push({ decile: d, turns: chunk.length, avgMs: avg });
}

const firstHalf = samples.slice(0, Math.floor(samples.length / 2));
const secondHalf = samples.slice(Math.floor(samples.length / 2));
const firstAvg = firstHalf.reduce((a, s) => a + s.ms, 0) / firstHalf.length;
const secondAvg = secondHalf.reduce((a, s) => a + s.ms, 0) / secondHalf.length;

console.log(`\n=== marginal cost: ${label} ===`);
console.log(`turns: ${samples.length}   total wall time: ${(overallMs / 1000).toFixed(2)}s`);
console.log(`pearson r (turn index vs per-turn cost): ${r.toFixed(4)}  (flat/near-zero = O(n) total; rising toward 1 = superlinear)`);
console.log(`first-half avg per-turn cost: ${firstAvg.toFixed(3)}ms   second-half avg: ${secondAvg.toFixed(3)}ms   ratio: ${(secondAvg / firstAvg).toFixed(2)}x`);
console.log(`decile trend (avg ms/turn, early -> late):`);
for (const d of deciles) console.log(`  [${String(d.decile).padStart(2)}] ${d.avgMs.toFixed(3).padStart(10)} ms/turn  (${d.turns} turns)`);

const outPath = `/tmp/marginal-cost-${label.replace(/[^a-z0-9._-]+/gi, "_")}.json`;
fs.writeFileSync(outPath, JSON.stringify({ label, path, turns: samples.length, overallMs, pearsonR: r, firstHalfAvgMs: firstAvg, secondHalfAvgMs: secondAvg, deciles, samples }, null, 2));
console.log(`raw samples written to ${outPath}`);
