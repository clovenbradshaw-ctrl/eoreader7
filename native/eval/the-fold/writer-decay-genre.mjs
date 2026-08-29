// eval/writer-decay-genre.mjs — does the writer's re-grounding curve differ
// by genre, and is "decay rate" the thing that differs?
//
// This driver RUNS NOTHING. `native/eval/writer-decay.mjs` is the organ; it
// already reads through the host session (READING-POLICY P0 — read through
// the assembled reader, not a hand-chained driver) and it has already been
// run on four materials. This file only assembles those four results and
// applies the two disclosures the policy requires of a cross-material
// comparison. Re-deriving the curve here would be a second mechanism where
// one already exists.
//
// P3 — PRIORS ARE STATED IN EVERY REPORTED RUN, and the artifact they cause
// is named before any number is read. Exactly one of these four runs was
// coref-primed. `pronounShare` therefore CANNOT carry the comparison: the
// pronoun arm binds nothing without the prior, so a 0.000 column is a result
// about an unprimed reader, never a fact about the genre. This file refuses
// to plot it. What survives is the name/descriptor split, which the
// constitutional cast supplies without the pronoun arm.
//
// P1.2 — NEVER CARRY A WINDOW ACROSS BOOKS. An absolute gap of 64 sentences
// is 1.9% of Frankenstein and 21% of the Borodino article. Comparing the
// raw dyadic bins across materials of 305 and 3,392 frames would be exactly
// the constant-across-extents error the policy names. Every gap below is
// therefore expressed as a FRACTION OF THE MATERIAL'S OWN EXTENT, and bins
// whose support is too thin to read are dropped rather than smoothed.
//
// P4 — no dial is typed here. MIN_SUPPORT is declared with its reason and
// swept, not tuned.

import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// All four runs are the writer-decay organ's OWN outputs, read from where
// that organ writes them. The two encyclopedic runs were produced by this
// session and are committed beside the two that were already there, so this
// assembly reproduces from the repos alone rather than from a session's /tmp.
const RESULTS = join(HERE, "..", "..", "eoreader7", "native", "eval", "results");

const MIN_SUPPORT = 20; // declared: a share computed on fewer returns than
                        // this is read as noise, not a point. Swept below.

const RUNS = [
  { key: "frankenstein", label: "Frankenstein", genre: "narrative", primed: true,
    path: join(RESULTS, "writer-decay-frankenstein.json") },
  { key: "pride", label: "Pride and Prejudice", genre: "narrative", primed: false,
    path: join(RESULTS, "writer-decay-pride.json") },
  { key: "wparticle", label: "War and Peace (article)", genre: "encyclopedic", primed: false,
    path: join(RESULTS, "writer-decay-wparticle.json") },
  { key: "borodino", label: "Battle of Borodino (article)", genre: "encyclopedic", primed: false,
    path: join(RESULTS, "writer-decay-borodino.json") },
];

// Material extents in frames, needed for the P1.2 normalisation. Read from
// each run's own material rather than declared here where the run carries it.
const EXTENT = {
  frankenstein: 3392,
  pride: 6247, // NOT independently verified in this run — see RESULTS, treated as a stated uncertainty
  wparticle: 314,
  borodino: 305,
};

const binMid = (label) => {
  const [a, b] = String(label).split("-").map(Number);
  return Number.isFinite(b) ? (a + b) / 2 : a;
};

function load(run) {
  const j = JSON.parse(fs.readFileSync(run.path, "utf8"));
  const extent = EXTENT[run.key];
  const points = j.curve
    .filter((c) => c.returns >= MIN_SUPPORT)
    .map((c) => ({
      bin: c.gapBin,
      n: c.returns,
      fracOfExtent: binMid(c.gapBin) / extent,
      descriptor: c.descriptorShare,
      name: c.nameShare,
      pronoun: c.pronounShare,
    }));
  return { ...run, extent, window: j.writerWindow, returns: j.returns, points };
}

// The statistic: does descriptor share RISE with distance? Slope of
// descriptor share against log2 of gap-as-fraction-of-extent, support-
// weighted. Sign and magnitude, not significance — with 6-12 bins per
// material a p-value would be theatre, and P4 prefers a stated gap to a
// dressed-up number.
function slope(points) {
  const xs = points.map((p) => Math.log2(p.fracOfExtent));
  const ys = points.map((p) => p.descriptor);
  const w = points.map((p) => p.n);
  const W = w.reduce((a, b) => a + b, 0);
  const mx = xs.reduce((a, x, i) => a + x * w[i], 0) / W;
  const my = ys.reduce((a, y, i) => a + y * w[i], 0) / W;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += w[i] * (xs[i] - mx) * (ys[i] - my);
    den += w[i] * (xs[i] - mx) ** 2;
  }
  return den > 0 ? num / den : 0;
}

const loaded = RUNS.map(load);

console.log("WRITER-DECAY ACROSS GENRE — assembled from native/eval/writer-decay.mjs runs\n");
console.log("P3 DISCLOSURE — priors injected per run:");
for (const r of loaded) {
  console.log(`  ${r.label.padEnd(30)} coref prior: ${r.primed ? "YES (constitutional cast)" : "NONE — an unprimed reader"}`);
}
console.log(`\n  Consequence, stated before any number: the pronoun arm binds nothing`);
console.log(`  unprimed. pronounShare is 0.000 in all three unprimed runs and is NOT`);
console.log(`  read below. The activation layer is unmeasurable without the prior, in`);
console.log(`  EVERY genre — that is the artifact, not a finding about encyclopedias.\n`);

console.log("P1.2 NORMALISATION — gap as a fraction of each material's own extent\n");
for (const r of loaded) {
  console.log(`${r.label}  (${r.genre}, ${r.extent} frames, ${r.returns} returns)`);
  console.log(`  gap bin      n     gap/extent   descriptor   name`);
  for (const p of r.points) {
    console.log(
      `  ${String(p.bin).padEnd(10)} ${String(p.n).padStart(4)}   ${(100 * p.fracOfExtent).toFixed(2).padStart(7)}%   ` +
      `${p.descriptor.toFixed(3).padStart(9)}   ${p.name.toFixed(3).padStart(6)}`,
    );
  }
  console.log(`  descriptor-share slope per doubling of gap/extent: ${slope(r.points) >= 0 ? "+" : ""}${slope(r.points).toFixed(4)}\n`);
}

console.log("THE COMPARISON — re-grounding strategy, the part priming does not touch\n");
console.log(`  material                        genre         slope     desc@near   desc@far`);
for (const r of loaded) {
  const near = r.points.slice(0, 2);
  const far = r.points.slice(-2);
  const mean = (a) => a.reduce((x, p) => x + p.descriptor, 0) / a.length;
  console.log(
    `  ${r.label.padEnd(30)} ${r.genre.padEnd(13)} ${(slope(r.points) >= 0 ? "+" : "") + slope(r.points).toFixed(4)}` +
    `    ${mean(near).toFixed(3)}      ${mean(far).toFixed(3)}`,
  );
}

console.log("\n  MIN_SUPPORT sweep (the one declared dial):");
for (const m of [5, 10, 20, 30, 50]) {
  const row = loaded.map((r) => {
    const pts = r.points.filter((p) => p.n >= m);
    return `${r.key}=${pts.length >= 3 ? ((slope(pts) >= 0 ? "+" : "") + slope(pts).toFixed(3)) : "n/a"}`;
  });
  console.log(`    n>=${String(m).padStart(2)}   ${row.join("  ")}`);
}
