// archon-prove-analysis.mjs — reads the checkpoint ranke-slicers.mjs wrote
// (archon-prove-embedding.json) and reports the license comparison plus the
// BAND null's rank-p, in this repo's own style (cited-source-null.mjs,
// ranke-slicers.mjs's own BAND block). No model calls here — this is pure
// arithmetic over an already-run checkpoint. Never hand-picks a threshold:
// the only comparison made is the real statistic's rank inside its own
// seeded-derangement null distribution (P66).
import { readFileSync } from "node:fs";
const HERE = new URL("./", import.meta.url).pathname;
const OUT = process.argv[2] ?? "archon-prove-embedding.json";
const ckpt = JSON.parse(readFileSync(`${HERE}results/${OUT}`, "utf8"));

console.log(`\n${"=".repeat(78)}\nARCHON-PROVE ANALYSIS — ${OUT}`);
console.log(`page: ${ckpt.page ?? "(band-only checkpoint; see base run for page)"}  walked: ${ckpt.walked ?? "?"}  K: ${ckpt.K ?? "?"}  model: ${ckpt.model ?? "?"}  embedder: ${JSON.stringify(ckpt.embedder ?? null)}`);
console.log(`model calls in this checkpoint's own run: ${ckpt.modelCalls ?? "(see per-arm 'seconds'; calls not separately summed for band-only files)"}`);

const names = Object.keys(ckpt.real ?? {});
console.log(`\nBASE LICENSE TABLE (fixed +1 rotation control, i.e. ONE draw of the null — P66's own caveat: this alone decides nothing):`);
console.log(`  ${"slicer".padEnd(12)} ${"offered".padEnd(8)} ${"real-states".padEnd(12)} ${"ctl-states".padEnd(11)} verdict`);
for (const name of names) {
  const r = ckpt.real[name], c = ckpt.control?.[name];
  if (!r) continue;
  const sep = (r.states ?? 0) - (c?.states ?? 0);
  const verdict = r.offered === 0 ? "never offered — structurally inert on this class"
    : (r.states ?? 0) === 0 ? "no landing — nothing to license"
    : sep <= 0 ? "REFUSED by its own control (single draw)"
    : "separates from single-draw control";
  console.log(`  ${name.padEnd(12)} ${String(r.offered).padEnd(8)} ${String(r.states ?? 0).padEnd(12)} ${String(c?.states ?? 0).padEnd(11)} ${verdict}`);
}

if (ckpt.band) {
  console.log(`\nBAND NULL (seeded derangements of end2 — same subjects/verbs/witnesses/spans, only the object identity redealt; P66/cited-source-null.mjs's own Born-null pattern):`);
  for (const [name, b] of Object.entries(ckpt.band)) {
    console.log(`  ${name}: real ${b.observed}  null draws [${b.draws.join(",")}] (median ${b.median})  ${b.atOrAbove}/${b.draws.length} draws at-or-above real  ->  rank p = ${b.rankP?.toFixed(3)}`);
  }
  console.log(`\n  A rank p is the only claim ${Object.values(ckpt.band)[0]?.draws.length ?? "?"} draws support; per ranke-slicers.mjs's own comment it cannot go below 1/(draws+1).`);
} else {
  console.log(`\n(no 'band' field in this checkpoint — run with BAND=<n> to get a multi-draw null instead of the single fixed-rotation control)`);
}

// Candidate-availability comparison — the zero-call half of the claim,
// computed directly from the per-note records ranke-slicers.mjs already
// wrote (perNote[].verdict includes "no_slicer_candidate"/"no_candidate"
// only when the driver's own pre-witnessNote check fired; offered/noCandidates
// are the aggregate the driver already reports).
console.log(`\nCANDIDATE AVAILABILITY (zero model calls to compute — this is the seam itself, not the witness's judgment of it):`);
for (const name of names) {
  const r = ckpt.real[name];
  if (!r) continue;
  const total = r.offered + r.noCandidates;
  const pct = total ? ((r.offered / total) * 100).toFixed(0) : "?";
  console.log(`  ${name.padEnd(12)} offered candidates on ${r.offered}/${total} notes (${pct}%)`);
}
