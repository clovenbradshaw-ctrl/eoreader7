// slicer-coverage-score.mjs — coverage@K against the hand labels. 0 model calls.
// For each note labeled STATED (any grade), does each arm's top-K contain a
// labeled sentence? This is the number the witness's success is bounded by.
import { readFileSync } from "node:fs";
process.env.N ??= "162";
const D = await import("./ranke-slicers.mjs");
const cov = JSON.parse(readFileSync("results/slicer-coverage.json", "utf8"));
const L = JSON.parse(readFileSync("results/slicer-labels.json", "utf8")).labels;
const key = (c) => `${c.start ?? "?"}:${c.shown.slice(0, 60)}`;
const tally = {};
for (const [i, lab] of Object.entries(L)) { tally[lab.status] = (tally[lab.status] ?? 0) + 1; }
console.log("\nLABEL TALLY over 30 notes:", JSON.stringify(tally));
// labels are keyed by note id; resolve each to its position in THIS run's real[] (a re-walk shifts positions)
const posOf = new Map(D.real.map((r, i) => [r.row.id, i]));
const stated = Object.entries(L).filter(([, l]) => l.status.startsWith("stated")).map(([id, l]) => [posOf.has(id) ? String(posOf.get(id)) : null, { ...l, id }]).filter(([i]) => i != null);
console.log(`labels resolved to this run: ${stated.length} stated of ${Object.values(L).filter((l) => l.status.startsWith("stated")).length} (a label whose note left the class is not counted)`);
console.log(`\nCOVERAGE@${cov.K} — of the ${stated.length} notes where the face states the proposition, does the arm's top-K contain a stating sentence?`);
console.log(`  ${"note".padEnd(6)} ${"status".padEnd(20)} ${cov.arms.map((a) => a.padEnd(12)).join("")}`);
const hits = Object.fromEntries(cov.arms.map((a) => [a, 0]));
for (const [i, lab] of stated) {
  const face = D.real[Number(i)].face;
  // a label names sentences by TEXT: a re-cut face keeps its sentences and loses its indices
  const want = (lab.sentenceText ?? []).filter(Boolean).map((t) => t.replace(/\s+/g, " ").trim());
  const targets = new Set(face.pool.filter((c) => want.some((t) => c.shown === t || c.shown.includes(t) || t.includes(c.shown))).map(key));
  if (!targets.size) { console.log(`  ${i.padEnd(6)} ${lab.status.padEnd(20)} labeled sentence not in this face (${D.real[Number(i)].row.facePath}); label not applicable`); continue; }
  const row = cov.arms.map((a) => {
    const c = cov.real[a][Number(i)].cands;
    if (c == null) return "silent";
    if (!c.length) return "empty";
    const hit = c.some((k) => targets.has(k)); if (hit) hits[a] += 1;
    return hit ? "HIT" : `miss(${c.length})`;
  });
  console.log(`  ${i.padEnd(6)} ${lab.status.padEnd(20)} ${row.map((r) => r.padEnd(12)).join("")}`);
}
console.log(`  ${"".padEnd(6)} ${"TOTAL".padEnd(20)} ${cov.arms.map((a) => `${hits[a]}/${stated.length}`.padEnd(12)).join("")}`);
