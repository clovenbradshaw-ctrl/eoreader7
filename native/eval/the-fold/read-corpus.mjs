#!/usr/bin/env node
// native/eval/the-fold/read-corpus.mjs — read a set of files with the
// constitutional reader and persist the reading, nothing else (2026-09-25).
//
//   node native/eval/the-fold/read-corpus.mjs --dir plans/ohs/ground --order plans/ohs/ground-manifest.json --label ohs
//   node native/eval/the-fold/read-corpus.mjs --source /path/a.txt --source /path/b.txt
//
// THE READER'S CONFIGURATION (P88) is conversation.mjs's own, copied verbatim
// so the two produce one reading: createRecursiveReader + the causal text
// perceiver (minRelationSurfaces 2, refreshEvery 25, the UD POS prior,
// descriptorAnchoring 0.05/0.2) + reviseTextFold; chunks are the app's own
// chunkSource (paragraphs, no boundaries); textEncounters writes one
// Encounter@1 per sentence under ONE global sequence (stepChunks). The
// output path and corpusId formula are conversation.mjs's too —
// results/readings/<corpusId>-<assembly>.jsonl with its .cursor — so
// surprise-projection.mjs and the eval read the same file, and a killed run
// resumes from its cursor. No model, no network; a complete read before any
// question is not lookahead (S3).
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename } from "node:path";
import { organs as productOrgans } from "./lib/product-assay.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const ROOT = new URL("../../../../", import.meta.url).pathname;
const FOLD = `${ROOT}the-fold/`;
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const many = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));
const label = flag("label", null);
const STRETCH_MS = Number(flag("stretch", 20000));

let paths = many("source");
const dir = flag("dir", null);
if (dir) {
  const names = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();
  const orderFile = flag("order", null);
  if (orderFile) {
    // the manifest's own document order, when it names one; the rest alphabetical after
    const man = JSON.parse(readFileSync(orderFile, "utf8"));
    const rank = new Map((man.docs ?? []).map((d, i) => [String(d.id), i]));
    names.sort((a, b) => ((rank.get(a.replace(/\.txt$/, "")) ?? 1e9) - (rank.get(b.replace(/\.txt$/, "")) ?? 1e9)) || a.localeCompare(b));
  }
  paths = paths.concat(names.map((n) => join(dir, n)));
}
// --dates <json>: { "<id>": "YYYY-MM-DD", … } (id = the file's basename without
// extension) — the documents' own order of creation, from a named giver. The
// reader is causal and its activation is a function of order, so the order is
// the record's, never the manifest's grouping or the filesystem's. A document
// the dates file does not name is REFUSED before anything is read: an undated
// document appended at the end would be a guess about when it came into being.
const datesFile = flag("dates", null);
let datesOf = null;
if (datesFile) {
  const raw = JSON.parse(readFileSync(datesFile, "utf8"));
  datesOf = new Map(Object.entries(raw.dates ?? raw).map(([id, v]) => [id, typeof v === "string" ? v : v?.date]));
  const missing = paths.map((p) => basename(p).replace(/\.[^.]+$/, "")).filter((id) => !datesOf.get(id));
  if (missing.length) { console.error(`refused: ${missing.length} document(s) have no date in ${datesFile}: ${missing.join(", ")}`); process.exit(2); }
  const given = new Map(paths.map((p, i) => [p, i]));
  paths.sort((a, b) => datesOf.get(basename(a).replace(/\.[^.]+$/, "")).localeCompare(datesOf.get(basename(b).replace(/\.[^.]+$/, ""))) || (given.get(a) - given.get(b)));
}
if (!paths.length) { console.error("usage: --source <file> … | --dir <dir> [--order manifest.json] [--dates dates.json] [--label name] [--stretch ms]"); process.exit(2); }

const O = await productOrgans();
const { stepChunks } = await import(`${FOLD}reading-log.js`);
const { createRecursiveReader } = await import(`${ROOT}eoreader7/kernel.js`);
const { createCausalTextPerceiver, textEncounters } = await import(`${NATIVE}/adapters/text/recursive.js`);
const { reviseTextFold } = await import(`${NATIVE}/adapters/text/revision.js`);
const { reconstruct } = await import(`${NATIVE}/kernel/fold.js`);

// conversation.mjs's own: a file with no blank line is windowed so the paragraph chunker has something to cut at
const windowed = (text, size) => { const out = []; let i = 0; while (i < text.length) { let j = Math.min(text.length, i + size); const nl = text.lastIndexOf("\n", j); const cm = text.lastIndexOf(",", j); const cut = nl > i + size / 2 ? nl + 1 : cm > i + size / 2 ? cm + 1 : j; out.push(text.slice(i, cut)); i = cut; } return out.join("\n\n"); };

const chunks = []; const loaded = [];
for (const p of paths) {
  if (!existsSync(p)) { console.error(`source missing: ${p}`); process.exit(2); }
  let text = readFileSync(p, "utf8");
  if (!/\n\s*\n/.test(text)) text = windowed(text, 1500);
  const name = basename(p);
  const cs = O.chunkSource(name, text, { boundaries: null }).map((c) => ({ ...c, source: name, kind: "prose" }));
  chunks.push(...cs);
  loaded.push({ kind: "prose", name, path: p, bytes: text.length, chunks: cs.length, sha256: createHash("sha256").update(text).digest("hex").slice(0, 16) });
}
const corpusId = createHash("sha256").update(loaded.map((l) => `${l.kind}:${l.name}:${l.sha256}`).join("|")).digest("hex").slice(0, 16);
const POS_PRIOR_PATH = `${ROOT}eoreader7/legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json`;
const READING_ASSEMBLY = "causalTextPerceiver+reviseTextFold@refresh25";
const RESULTS_ROOT = join(NATIVE, "eval/the-fold/results");
const READING_PATH = join(RESULTS_ROOT, "readings", `${corpusId}-${READING_ASSEMBLY.replace(/[^\w.-]+/g, "_")}.jsonl`);
const READING_CURSOR = `${READING_PATH}.cursor`;
mkdirSync(join(RESULTS_ROOT, "readings"), { recursive: true });
const POS = JSON.parse(readFileSync(POS_PRIOR_PATH, "utf8"));

let readingLog = [], readCursor = 0, readSeq = 0;
if (existsSync(READING_PATH)) {
  readingLog = readFileSync(READING_PATH, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const cur = existsSync(READING_CURSOR) ? JSON.parse(readFileSync(READING_CURSOR, "utf8")) : { cursor: 0, sequence: 0 };
  readCursor = Number(cur.cursor) || 0; readSeq = Number(cur.sequence) || 0;
}
const reader = createRecursiveReader({
  seed: readingLog.length ? reconstruct(readingLog) : {},
  perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })],
  adapters: { revise: reviseTextFold, retrieve: (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }) },
});
if (readingLog.length) await reader.restore(readingLog);

console.log(`reading ${loaded.length} source(s), ${chunks.length} chunks, corpus ${corpusId}${label ? ` (${label})` : ""} — assembly ${READING_ASSEMBLY}, POS prior ${basename(POS_PRIOR_PATH)}${readCursor ? `; resuming at chunk ${readCursor} with ${readingLog.length} entries` : ""}`);
for (const l of loaded) console.log(`  ${datesOf ? `${datesOf.get(l.name.replace(/\.[^.]+$/, ""))}  ` : ""}${l.name.padEnd(40)} ${String(l.bytes).padStart(8)} bytes ${String(l.chunks).padStart(5)} chunks  ${l.sha256}`);
console.log(`  → ${READING_PATH}`);

let persistedFromReader = 0;
const t0 = Date.now();
while (readCursor < chunks.length) {
  const r = await stepChunks(reader, chunks, { textEncounters, cursor: readCursor, budgetMs: STRETCH_MS, sequence: readSeq });
  const all = reader.getLog(); const fresh = all.slice(persistedFromReader); persistedFromReader = all.length;
  if (fresh.length) appendFileSync(READING_PATH, fresh.map((e) => JSON.stringify(e)).join("\n") + "\n");
  readCursor = r.cursor; readSeq = r.sequence;
  writeFileSync(READING_CURSOR, JSON.stringify({ cursor: readCursor, sequence: readSeq }));
  console.log(`  ${readCursor}/${chunks.length} chunks · ${readingLog.length + all.length} log entries · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (!r.read) break;
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${READING_PATH}`);
