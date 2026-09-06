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
  const first = rows[0]?.msPerSentence ?? 0, last = rows[rows.length - 1]?.msPerSentence ?? 0;
  return { rows, growth: first > 0 ? Number((last / first).toFixed(1)) : null,
    linear: first > 0 && last / first < 1.5,
    verdict: first > 0 && last / first < 1.5 ? "linear" : `SUPER-LINEAR: ms/sentence grew ${(last / first).toFixed(1)}x across this range` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = arg("file", path.join(here, "../../legacy-eoreader6.1/scripts/adversarial/fixtures/pg84-frankenstein.txt"));
  if (has("identity")) {
    const out = await identity(file, Number(arg("bytes", 60000)));
    const to = arg("out", null);
    if (to) { fs.writeFileSync(to, JSON.stringify(out, null, 1)); console.log(`wrote ${to}`); }
    console.log(JSON.stringify(out, null, 1));
  } else {
    const sizes = String(arg("sizes", "15000,30000,60000,120000")).split(",").map(Number);
    const s = await scale(file, sizes);
    console.log(" sentences   read s   ms/sentence   heap MB");
    for (const r of s.rows) console.log(`${String(r.sentences).padStart(10)} ${String(r.seconds).padStart(8)} ${String(r.msPerSentence).padStart(13)} ${String(r.heapMB).padStart(9)}`);
    console.log(`\n  ${s.verdict}`);
  }
}
