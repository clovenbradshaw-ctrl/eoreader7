// native/eval/read-cost.mjs — what a read costs, and the gate any change to
// the read path must pass.
//
// Two jobs, deliberately in one file so a speed-up cannot be reported without
// the identity check that makes it meaningful:
//
//   --scale     how time and memory grow with the material
//   --identity  the projection output, hashed, at four cursors
//
// MEASURED 2026-09-06, before any change (War and Peace prefixes, standard
// perceiver, refreshEvery 25):
//
//   sentences   read s   ms/sentence   heap MB
//         469      0.2           0.4        33
//         926      2.6           2.8       253
//        1707      9.8           5.7       755
//        3051     40.1          13.1      1752
//
// ms/sentence rises ~2.3x per doubling: the read is QUADRATIC in both time
// and memory. A whole 448 KB book is ~115 s / 5.4 GB and exceeds Node's
// default heap — the committed hypergraph-cursor driver dies on one.
//
// WHERE IT GOES, from a heap snapshot at 1,707 sentences (343 MB total):
//   277.4 MB   97,592 raw array backing stores   <- 84% of the heap
//    31.0 MB  590,675 strings
//    17.8 MB  301,514 objects
// The log serializes to 7 MB and the whole fold to 18 MB, so ~340 MB is
// carrying ~25 MB of data. It is the ARRAYS, not their contents.
//
// WHY: `upsertManyById` does `const next = [...list]` on every call, to keep
// each fold version immutable. Measured slots copied:
//   607 sentences    955 calls    1.0M slots
//   926 sentences  1,761 calls    4.4M slots
//  1707 sentences  3,629 calls   20.5M slots
// Sentences x2.8, slots copied x20.5. Only ~2 calls per sentence, so batching
// the callers cannot help; each call copies the whole array (averaging 5,650
// entries) purely to preserve immutability.
//
// WHAT DOES NOT FIX IT, measured so it is not retried: making the DELTA
// chain's `prev` a WeakRef so the collector can reclaim the tail. It is
// output-identical (verified by this file's own identity mode) and moved
// 1,010 MB to 989 MB. The chain is not what retains the arrays.
//
// THE BASELINE, RECORDED HERE because results/ is gitignored and a gate whose
// reference cannot survive the session is not a gate. Regenerate with:
//   node native/eval/read-cost.mjs --identity \
//     --file ../the-fold/pg2600.txt --bytes 60000
// and expect, on an unchanged read path:
//   logHash            45bbbbbd578d027f
//   926 sentences, 2691 log entries
//   cursor 2691: 38 nodes, 166 links
// Verified reproducible across runs (timings vary; hashes must not). A change
// to the read path that alters any of these has changed the reading, whatever
// it did to the clock.
//
// The remaining candidate is structural sharing — the fold holding one
// growing array with versions tracked separately, since POSITIONS already
// declares the invariant "positions never shift (append/replace-in-place
// only)" and nothing was found that reads an OLD version's contents
// (chainView uses old arrays as memo keys and walks deltas; `reconstruct`
// rebuilds from the log). That changes a core invariant and must not land
// without this file's identity mode passing on a full book.

import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel.js";
import { projectHypergraph } from "../kernel/hypergraph-projection.js";
import { reconstruct } from "../kernel/fold.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const POS = JSON.parse(fs.readFileSync(path.join(here, "../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json"), "utf8"));

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);

function makeReader() {
  return createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })],
    adapters: {
      revise: reviseTextFold,
      retrieve: (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]),
        provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]),
        exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
    },
  });
}

async function readPrefix(file, bytes) {
  const stripped = stripContainer(fs.readFileSync(file, "utf8").slice(0, bytes));
  const encounters = textEncounters(stripped.text, { source: `file:${path.basename(file)}`, offset: stripped.offset });
  global.gc?.();
  const t0 = Date.now();
  const reading = await makeReader().read(encounters);
  return { reading, seconds: (Date.now() - t0) / 1000, sentences: encounters.length,
    heapMB: Math.round(process.memoryUsage().heapUsed / 1048576) };
}

const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);

/**
 * THE GATE THAT SURVIVES A REPRESENTATION CHANGE (P159).
 *
 * `identity` below hashes the LOG, which is exactly right while the log's
 * shape is fixed and exactly wrong the moment it is not. Storing acts in EO
 * notation — `(operator, grain)` with mode/domain/terrain/stance derived by
 * `cellOf` rather than written out — changes the record without changing the
 * reading, and a log hash cannot tell those two apart.
 *
 * So the claim moves to where it belongs: **the reading is the same even
 * though the record is written differently.** `projectionIdentity` hashes what
 * the log PROJECTS TO — nodes, links and the reconstructed graphEntries at
 * several cursors — and says nothing about how the log spells itself.
 *
 * `trace` is the sharper instrument and the one to reach for first: it records
 * a hash per STEP, so a divergence is localised to the encounter that caused
 * it instead of being discovered at the end of a book. A whole-run hash tells
 * you that something broke; a step trace tells you where.
 */

/** A hash per step: the fold after each encounter. A divergence names its own step. */
export async function trace(file, bytes, { every = 1 } = {}) {
  const stripped = stripContainer(fs.readFileSync(file, "utf8").slice(0, bytes));
  const encounters = textEncounters(stripped.text, { source: `file:${path.basename(file)}`, offset: stripped.offset });
  const reader = makeReader();
  const steps = [];
  for (const [i, e] of encounters.entries()) {
    await reader.step(e);
    if (i % every !== 0 && i !== encounters.length - 1) continue;
    const f = reader.getFold();
    steps.push({ step: i, entries: (f?.graphEntries ?? []).length, hash: hash(f?.graphEntries ?? []) });
  }
  return { file: path.basename(file), bytes, sentences: encounters.length, every, steps };
}

/** Compare a fresh trace against a recorded one. The FIRST differing step is the answer. */
export function differential(before, after) {
  const n = Math.min(before.steps.length, after.steps.length);
  for (let i = 0; i < n; i += 1) {
    const b = before.steps[i], a = after.steps[i];
    if (b.hash !== a.hash || b.entries !== a.entries) {
      return { same: false, step: b.step,
        why: `first divergence at step ${b.step}: ${b.entries} entries/${b.hash} became ${a.entries}/${a.hash}` };
    }
  }
  if (before.steps.length !== after.steps.length) return { same: false, step: n, why: `same through ${n} steps, then the traces differ in length (${before.steps.length} vs ${after.steps.length})` };
  return { same: true, steps: n, why: `identical across all ${n} sampled steps` };
}

/**
 * What the log PROJECTS TO, hashed — independent of how the log spells itself.
 * `graphEntries` is included deliberately: nodes and links alone would not
 * notice a change to entries that no node or link happens to carry.
 */
export async function projectionIdentity(file, bytes, { cursors = [0.25, 0.5, 0.75, 1] } = {}) {
  const { reading, seconds, sentences, heapMB } = await readPrefix(file, bytes);
  const rebuilt = reconstruct(reading.log);
  return {
    file: path.basename(file), bytes, sentences, logEntries: reading.log.length,
    seconds: Number(seconds.toFixed(2)), heapMB,
    // The fold as the log projects it — the thing that must not change.
    reconstructedEntries: (rebuilt?.graphEntries ?? []).length,
    reconstructedHash: hash(rebuilt?.graphEntries ?? []),
    cursors: cursors.map((q) => {
      const atSeq = Math.floor(reading.log.length * q);
      const g = projectHypergraph(reading.log, { atSeq });
      return { at: q, atSeq, nodes: g.nodes.length, links: g.links.length,
        nodeHash: hash(g.nodes), linkHash: hash(g.links), entryHash: hash(g.graphEntries ?? []) };
    }),
  };
}

/** The gate: the reading's log and its projection at four cursors, hashed. A faster read must be the SAME read. */
export async function identity(file, bytes) {
  const { reading, seconds, sentences, heapMB } = await readPrefix(file, bytes);
  const cursors = [0.25, 0.5, 0.75, 1].map((q) => Math.floor(reading.log.length * q));
  return {
    file: path.basename(file), bytes, sentences, logEntries: reading.log.length,
    logHash: hash(reading.log), seconds: Number(seconds.toFixed(2)), heapMB,
    cursors: cursors.map((atSeq) => {
      const g = projectHypergraph(reading.log, { atSeq });
      return { atSeq, nodes: g.nodes.length, links: g.links.length, nodeHash: hash(g.nodes), linkHash: hash(g.links) };
    }),
  };
}

/** Is the read linear? ms/sentence flat means yes; rising means no. */
export async function scale(file, sizes) {
  const rows = [];
  for (const bytes of sizes) {
    const { seconds, sentences, heapMB } = await readPrefix(file, bytes);
    rows.push({ bytes, sentences, seconds: Number(seconds.toFixed(2)), msPerSentence: Number((seconds * 1000 / sentences).toFixed(2)), heapMB });
  }
  // The verdict, computed rather than eyeballed: linear iff ms/sentence does
  // not systematically rise.
  // THE RATIO ALONE IS A BAD VERDICT, and it misled once already (P159): a
  // change that made the SMALLEST read 4.7x faster and the largest 3.3x
  // faster reported a WORSE growth ratio, because the ratio's denominator had
  // shrunk. Every absolute number had fallen. So the reading reports both —
  // the shape (is it still super-linear) and the cost (how much does it
  // actually take) — and never lets the first stand in for the second.
  const first = rows[0]?.msPerSentence ?? 0, last = rows[rows.length - 1]?.msPerSentence ?? 0;
  const growth = first > 0 ? last / first : null;
  const linear = growth != null && growth < 1.5;
  return { rows, growth: growth == null ? null : Number(growth.toFixed(1)), linear,
    msPerSentenceAtLargest: last, secondsAtLargest: rows[rows.length - 1]?.seconds ?? null,
    verdict: linear
      ? `linear — ${last} ms/sentence at the largest size`
      : `SUPER-LINEAR (grew ${growth.toFixed(1)}x) — but the cost that matters is ${last} ms/sentence at the largest size, ${rows[rows.length - 1]?.seconds}s total` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = arg("file", path.join(here, "../../legacy-eoreader6.1/scripts/adversarial/fixtures/pg84-frankenstein.txt"));
  const bytes = Number(arg("bytes", 60000));
  const save = (name, obj) => { const to = arg("out", null); if (to) { fs.writeFileSync(to, JSON.stringify(obj, null, 1)); console.log(`wrote ${to}`); } return obj; };

  if (has("trace")) {
    // Per-step hashes. With --against <file>, compares and names the first
    // differing step; without it, writes a baseline.
    const t = await trace(file, bytes, { every: Number(arg("every", 1)) });
    const against = arg("against", null);
    if (against) {
      const before = JSON.parse(fs.readFileSync(against, "utf8"));
      const d = differential(before, t);
      console.log(d.same ? `DIFFERENTIAL: identical — ${d.why}` : `DIFFERENTIAL: DIVERGED — ${d.why}`);
      process.exitCode = d.same ? 0 : 1;
    } else {
      save("trace", t);
      console.log(`traced ${t.steps.length} of ${t.sentences} steps (every ${t.every})`);
      console.log(`  final: ${t.steps[t.steps.length - 1]?.entries} entries, ${t.steps[t.steps.length - 1]?.hash}`);
    }
  } else if (has("projection-identity")) {
    const p = await projectionIdentity(file, bytes);
    save("projection", p);
    console.log(JSON.stringify(p, null, 1));
  } else if (has("identity")) {
    const out = await identity(file, bytes);
    save("identity", out);
    console.log(JSON.stringify(out, null, 1));
  } else {
    const sizes = String(arg("sizes", "15000,30000,60000,120000")).split(",").map(Number);
    const s = await scale(file, sizes);
    console.log(" sentences   read s   ms/sentence   heap MB");
    for (const r of s.rows) console.log(`${String(r.sentences).padStart(10)} ${String(r.seconds).padStart(8)} ${String(r.msPerSentence).padStart(13)} ${String(r.heapMB).padStart(9)}`);
    console.log(`\n  ${s.verdict}`);
  }
}
