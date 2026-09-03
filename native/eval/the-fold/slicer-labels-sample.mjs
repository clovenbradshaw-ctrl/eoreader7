// slicer-labels-sample.mjs — the declared sample for hand labels.
//
// The zero-call pass measures silence, distinctness and control divergence
// without a label. The coverage that matters — does an arm's top-K contain a
// sentence that GENUINELY states the proposition — cannot be read off the
// rankings, because a ranking that could tell would be the organ this class
// is defined by the absence of. So a labeled subset, declared here before
// any arm sees it.
//
// The sample is seeded and restricted to notes whose face pool is at most
// MAXPOOL sentences, so that every face can be read IN FULL by the labeler.
// Reading the whole face is the point: a labeler shown a slicer's shortlist
// would inflate that slicer's coverage. The restriction is a bias of its own
// (small faces) and is recorded, not hidden: 117 of 162 notes qualify at 250.
//
// Faces are grouped so each is read once and every sampled note on it is
// labeled together. Labels are byte offsets into the face — auditable
// against the source's own bytes, never a paraphrase of them.
//
// Usage: N=30 MAXPOOL=250 SEED=0 node slicer-labels-sample.mjs
//   writes results/slicer-labels-sample.json and a reading dump to DUMP.
import { writeFileSync } from "node:fs";
process.env.N ??= "162";
const D = await import("./ranke-slicers.mjs");
const { createSeededRng } = await import("../../kernel/rng.js").catch(() => ({ createSeededRng: null }));
const N = Number(process.env.SAMPLE ?? 30), MAXPOOL = Number(process.env.MAXPOOL ?? 250), SEED = process.env.SEED ?? "0";
const DUMP = process.env.DUMP ?? "results/slicer-labels-dump.txt";

const eligible = D.real.map((r, i) => ({ i, ...r })).filter((r) => r.face.pool.length <= MAXPOOL);
// seeded shuffle without a kernel dependency: a tiny LCG over the seed
let x = [...String(SEED)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) || 1;
const rng = () => { x = (1103515245 * x + 12345) >>> 0; return x / 2 ** 32; };
const order = eligible.map((r) => ({ r, k: rng() })).sort((a, b) => a.k - b.k).map((o) => o.r);
const sample = order.slice(0, N);

const byFace = new Map();
for (const r of sample) { const k = r.row.facePath; if (!byFace.has(k)) byFace.set(k, []); byFace.get(k).push(r); }

let dump = `LABELING DUMP — ${sample.length} notes on ${byFace.size} faces (MAXPOOL=${MAXPOOL}, SEED=${SEED})\n`;
dump += `For each note, name the sentence number(s) that STATE the proposition — in any words — or NONE if the face does not state it.\n\n`;
const out = [];
for (const [facePath, rows] of byFace) {
  const face = rows[0].face;
  dump += `${"=".repeat(78)}\nFACE ${facePath}  host=${rows[0].row.host}  sentences=${face.pool.length}\n${"=".repeat(78)}\n`;
  dump += `NOTES ON THIS FACE:\n`;
  for (const r of rows) { dump += `  [note ${r.i}] ${r.row.note}\n           article: ${r.row.article}\n`; out.push({ i: r.i, id: r.row.id, note: r.row.note, article: r.row.article, host: r.row.host, facePath, poolSize: face.pool.length, label: null }); }
  dump += `\nSENTENCES:\n`;
  face.pool.forEach((c, n) => { dump += `  ${String(n).padStart(4)} | ${c.shown}\n`; });
  dump += `\n`;
}
writeFileSync(DUMP, dump);
writeFileSync("results/slicer-labels-sample.json", JSON.stringify({ sampled: sample.length, eligible: eligible.length, of: D.real.length, maxPool: MAXPOOL, seed: SEED, faces: byFace.size, notes: out }, null, 2));
console.log(`sampled ${sample.length} of ${eligible.length} eligible (of ${D.real.length}); ${byFace.size} faces; total sentences to read: ${[...byFace.values()].reduce((s, rows) => s + rows[0].face.pool.length, 0)}`);
console.log(`dump: ${DUMP}`);
