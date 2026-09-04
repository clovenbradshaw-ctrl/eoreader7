// contest-ladder-resolution.mjs — every number contest-ladder.mjs reports,
// asked where it sits in a shuffle.
//
// The posture is derivation-precision-resolution.mjs's, unchanged: run the
// real arm once, then NULL_DRAWS redealt runs (REDEAL_SEED shuffles each
// assertion's object within its own office — marginals kept exactly, the
// succession relation destroyed), and report where the real number falls.
// A number outside the shuffle's range is LICENSED. A number inside it is
// RETRACTED, in those words, in the document this writes.
//
// It exists because the first real run of contest-ladder produced a
// precision of 1.000, which is exactly the number this repo has already
// caught being meaningless once: the person-grain verdict is TRUE for a
// random within-office pair most of the time, so a perfect precision is
// what the null scores too.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "contest-ladder.mjs");
const TMP = path.join(HERE, "results", ".contest-ladder-tmp.json");
const OUT = process.env.OUT_PATH ?? path.join(HERE, "results", "contest-ladder-resolution.json");
const MD = OUT.replace(/\.json$/, ".md");
const NULL_DRAWS = Number(process.env.NULL_DRAWS ?? 40);

function run(env) {
  execFileSync(process.execPath, [DRIVER], { env: { ...process.env, ...env, OUT_PATH: TMP }, stdio: "pipe" });
  return JSON.parse(fs.readFileSync(TMP, "utf8"));
}

const real = run({ REDEAL_SEED: "" });
const nulls = [];
for (let s = 1; s <= NULL_DRAWS; s += 1) nulls.push(run({ REDEAL_SEED: String(s) }));

const median = (xs) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

// `better` says which direction is EVIDENCE for this metric, and it is
// declared per metric rather than assumed: for concession share, LOW is
// good (concentration is fragility — real structure spreads its load), and
// for cross-source disagreement LOW is good too (a shuffle manufactures
// contradictions the real relation does not have).
const METRICS = [
  { key: "derivedFacts", better: "high", real: (r) => r.arms[1].derived, why: "does the layer above the floor actually fill" },
  { key: "trueAgainstOracle", better: "high", real: (r) => r.arms[1].TRUE, why: "how many derived facts an oracle built from OTHER properties confirms" },
  { key: "falseAgainstOracle", better: "low", real: (r) => r.arms[1].FALSE, why: "hard convictions" },
  { key: "precisionOnDecided", better: "high", real: (r) => r.arms[1].precisionOnDecided, why: "the ratio this repo has already caught being uninformative once" },
  // CONFOUNDED, and reported as such rather than scored. A SHARE of the
  // layer cannot be compared across arms whose layers differ in size by
  // more than an order of magnitude: the real wide run spreads 289 facts,
  // the shuffle spreads 5-24, so "19% of the layer" and "21% of the layer"
  // are not the same quantity. This is the aggregate-level trap one
  // register over — a number that is real and also irrelevant, because the
  // comparison it invites cannot be made. `layerSize` is carried beside
  // them so the confound is visible instead of inferred, and no fragility
  // claim is licensed here until a LAYER-SIZE-MATCHED null exists.
  { key: "layerSize", better: "high", real: (r) => r.fragility.liveDerived, why: "the denominator the two rows below are shares OF — if this differs across arms, those rows compare nothing" },
  { key: "worstConcessionShare", better: "low", confounded: "layerSize", real: (r) => r.fragility.worstShare, why: "concentration is fragility — CONFOUNDED by layer size, see above" },
  { key: "meanConcessionShare", better: "low", confounded: "layerSize", real: (r) => r.fragility.meanShare, why: "how evenly the layer's load is spread — CONFOUNDED by layer size, see above" },
  { key: "crossSourceDisagreements", better: "low", real: (r) => r.contest.crossSource, why: "how many genuine n=2 disagreements the material contains" },
  { key: "gateDerivedFacts", better: "high", real: (r) => r.arms[0].derived, why: "what the shipped >=2-source gate yields" },
];

const rows = METRICS.map((m) => {
  const rv = m.real(real);
  const ns = nulls.map(m.real).filter((x) => x !== null && x !== undefined);
  if (rv === null || rv === undefined || !ns.length) return { ...m, real: rv, verdict: "UNAVAILABLE", note: "no comparable draws" };
  const lo = Math.min(...ns), hi = Math.max(...ns), med = median(ns);
  const outside = m.better === "high" ? rv > hi : rv < lo;
  const ties = m.better === "high" ? rv === hi : rv === lo;
  const inside = !outside && !ties;
  return {
    key: m.key, better: m.better, why: m.why, real: rv, nullMedian: med, nullLow: lo, nullHigh: hi, draws: ns.length,
    beatenBy: m.better === "high" ? ns.filter((x) => x >= rv).length : ns.filter((x) => x <= rv).length,
    // A confounded row is never scored. Calling it RETRACTED would imply the
    // comparison was made and failed; it was not made, because it cannot be.
    verdict: m.confounded ? "NOT COMPARABLE" : outside ? "LICENSED" : ties ? "AT THE EDGE" : "RETRACTED",
    confoundedBy: m.confounded ?? null,
    inside,
  };
});

fs.writeFileSync(OUT, JSON.stringify({ driver: "contest-ladder-resolution.mjs", ran: new Date().toISOString().slice(0, 10), modelCalls: 0, nullDraws: NULL_DRAWS, rows, real }, null, 2));

const L = [];
L.push(`# contest-ladder, resolved against its own null\n`);
L.push(`Ran ${new Date().toISOString().slice(0, 10)}. **${NULL_DRAWS} redeals, 0 model calls.** Null: each assertion's object shuffled among assertions of the same office — marginals kept exactly, the succession relation destroyed.\n`);
L.push(`A number outside the shuffle's range is LICENSED. A number inside it is RETRACTED. A number equal to the shuffle's best draw is AT THE EDGE and claims nothing.\n`);
L.push(`| metric | good | real | null median | null range | verdict |`);
L.push(`|---|---|---|---|---|---|`);
for (const r of rows) L.push(`| \`${r.key}\` | ${r.better} | **${r.real}** | ${r.nullMedian} | ${r.nullLow}–${r.nullHigh} | **${r.verdict}** |`);
L.push(`\n## What each row is asking\n`);
for (const r of rows) L.push(`* \`${r.key}\` — ${r.why}`);
L.push(`\n## Retractions\n`);
const retracted = rows.filter((r) => r.verdict === "RETRACTED" || r.verdict === "AT THE EDGE");
if (!retracted.length) L.push(`None.`);
for (const r of retracted) L.push(`* **\`${r.key}\` claims nothing.** Real ${r.real}; the shuffle reaches ${r.nullLow}–${r.nullHigh} (median ${r.nullMedian}), and ${r.beatenBy} of ${r.draws} draws match or beat it.`);
const confounded = rows.filter((r) => r.confoundedBy);
if (confounded.length) {
  const size = rows.find((r) => r.key === "layerSize");
  L.push(`\n## Not comparable (a stronger statement than retracted)\n`);
  L.push(`The real layer holds **${size?.real}** derived facts; the shuffle's holds ${size?.nullLow}–${size?.nullHigh}. A SHARE of the layer is therefore a different quantity in each arm, and these rows were not scored at all:\n`);
  for (const r of confounded) L.push(`* \`${r.key}\` — real ${r.real}, shuffle ${r.nullLow}–${r.nullHigh}. **The comparison was not made, because it cannot be.** A fragility claim needs a layer-size-matched null, which does not exist yet.`);
  L.push(`\nThis is why the earlier 17.4%-vs-39.3% fragility result and this run's 19.0% do not reconcile: neither was measured against a null whose layer was the same size.`);
}
fs.writeFileSync(MD, L.join("\n") + "\n");

console.log(L.join("\n"));
console.log(`\nwrote ${OUT}\nwrote ${MD}\n`);
