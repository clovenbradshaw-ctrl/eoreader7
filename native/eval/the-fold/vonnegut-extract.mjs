#!/usr/bin/env node
// vonnegut-extract.mjs — Vonnegut sent OUT to extract the record's structure
// organically. The fortune curve is computed ON THE RECORD ITSELF: walk the
// reading in order, and for each position count how many of the record's
// propositions have been established so far. Where conviction climbs, the
// record is doing new work (a movement); where it plateaus, it restates.
// The movements ARE the essay's organic phases — no referent-picking, no
// template: the record's own fortune curve segments itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../../adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "../../adapters/text/surfaces.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { reconstruct } from "../../kernel/fold.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { readingIndexFromLog } from "../../the-fold/reading-log.js";
import { segmentBySurprise } from "../../kernel/surprise-segments.js";
import { appendFortune, classifyFortuneShape, fortuneSummary } from "../../kernel/fortune-prior.js";
import { notesFromEdges } from "../../../proxy-runner.mjs";
import crypto from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const wsDir = path.resolve(HERE, "fixtures/chicago");
const pos = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json"), "utf8"));
const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: pos, reprojectEvery: 10 })], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: () => [] } });

// ── 1. READ THE RECORD, in reading order, sentence by sentence ─────────────
const sentences = [];
for (const f of fs.readdirSync(wsDir).sort()) {
  if (!/\.txt$/.test(f)) continue;
  const t = fs.readFileSync(path.join(wsDir, f), "utf8");
  if (t.trim().length <= 40) continue;
  for (const e of textEncounters(t, { source: `workspace:${f}`, offset: 0 })) await reader.step(e);
  const toks = t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z\u0410-\u042f])/).map((s) => s.trim()).filter((s) => s.length > 40);
  for (const s of toks) sentences.push(s);
}
const log = reader.getLog();
const idx = readingIndexFromLog(log, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
const ge = reader.getFold()?.graphEntries ?? [];
const props = notesFromEdges(ge);
const norm = (t) => String(t ?? "").toLowerCase().split(/\s+/).join(" ");

// ── 2. THE RECORD'S OWN FORTUNE CURVE ──────────────────────────────────────
// A proposition is "established" at the first sentence where its subject OR
// object OR act appears. Cumulative count per sentence = conviction.
const propTerms = props.map((p, i) => ({ i, terms: [norm(p.end1), norm(p.end2), norm(p.label)].filter((t) => t.length > 2) }));
const firstCover = new Array(props.length).fill(-1);
for (let si = 0; si < sentences.length; si++) {
  const s = norm(sentences[si]);
  for (const pt of propTerms) {
    if (firstCover[pt.i] >= 0) continue;
    if (pt.terms.some((t) => s.includes(t))) firstCover[pt.i] = si;
  }
}
const fortune = [];
let cum = 0;
for (let si = 0; si < sentences.length; si++) { cum += firstCover.filter((c) => c === si).length; fortune.push(cum); }

// ── 3. THE MOVEMENTS — the record's OWN seams are the staging (Halliday:
// genre is a staged process; the stages are the record's own seams). The
// surprise-segment boundaries (token space) map onto the sentence stream,
// and each movement is the claims established between two seams. ───────────
let seamBoundaries = [];
try {
  const s = segmentBySurprise(sentences.map((x) => x.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2)).flat(), { order: 3, alpha: 0.7, draws: 64, seed: 7, minLength: 40 });
  seamBoundaries = s?.boundaries ?? [];
} catch { seamBoundaries = []; }
const sentStartTok = [];
let tokAcc = 0;
for (const s of sentences) { sentStartTok.push(tokAcc); tokAcc += s.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2).length; }
const boundaries = [0];
for (const sb of seamBoundaries) {
  for (let i = 1; i < sentStartTok.length; i++) {
    if (sb >= sentStartTok[i - 1] && sb < sentStartTok[i]) { if (!boundaries.includes(i)) boundaries.push(i); break; }
  }
}
if (boundaries[boundaries.length - 1] !== sentences.length - 1) boundaries.push(sentences.length - 1);
boundaries.sort((a, b) => a - b);
const uniq = [...new Set(boundaries)];

// ── 4. THE PHASES — each movement's propositions + central being ───────────
const movements = [];
for (let m = 0; m < uniq.length - 1; m++) {
  const lo = uniq[m], hi = uniq[m + 1];
  const claimIdx = firstCover.map((c, i) => (c >= lo && c < hi ? i : -1)).filter((i) => i >= 0);
  const claims = claimIdx.map((i) => props[i]);
  // central being of this movement: the most-covered end across its claims
  const counts = new Map();
  for (const c of claims) for (const t of [norm(c.end1), norm(c.end2)]) if (t.length > 3) counts.set(t, (counts.get(t) ?? 0) + 1);
  const focus = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1).map(([k]) => k)[0] ?? "the subject";
  const gain = fortune[hi - 1] - (lo > 0 ? fortune[lo - 1] : 0);
  movements.push({ from: lo, to: hi, sentences: hi - lo, freshClaims: claims.length, gain, focus: titleCase(focus), claims: claims.slice(0, 12) });
}
function titleCase(s) { return String(s).split(" ").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" "); }

// ── REPORT ────────────────────────────────────────────────────────────────
console.log(`record: ${sentences.length} sentences, ${props.length} propositions, fortune peak ${fortune[fortune.length - 1]}`);
console.log(`\n═══ THE RECORD'S OWN FORTUNE CURVE (conviction per sentence) ═══`);
const marks = new Set(uniq);
for (let i = 0; i < fortune.length; i += Math.max(1, Math.floor(fortune.length / 40))) {
  const bar = "█".repeat(Math.max(1, Math.round((fortune[i] / fortune[fortune.length - 1]) * 40)));
  process.stdout.write(`${marks.has(i) ? "║" : " "}${bar} ${fortune[i]}\n`);
}
console.log(`\n═══ THE ORGANIC MOVEMENTS — the essay's phases, extracted ═══\n`);
for (const m of movements) {
  console.log(`MOVEMENT ${m.from}→${m.to}: "${m.focus}" — ${m.freshClaims} fresh claims (gain ${m.gain})`);
  for (const c of m.claims.slice(0, 4)) console.log(`    · ${c.end1} ${c.label} ${c.end2}`);
  console.log();
}
console.log(`boundaries at sentences: ${uniq.join(", ")}`);

// ── 5. APPEND TO THE PRIOR (FortunePrior@1 — appendable, provenance-carrying) ──
const genre = process.argv.find((a) => a.startsWith("--genre="))?.slice(8) ?? "historical";
const medium = process.argv.find((a) => a.startsWith("--medium="))?.slice(9) ?? "text";
const gains = movements.map((m) => m.gain);
const shape = classifyFortuneShape(gains);
const entry = {
  source: { file: "fixtures/chicago (retained web)", sha: crypto.createHash("sha256").update(recordTextHash()).digest("hex").slice(0, 16), chars: sentences.join(" ").length },
  readAt: new Date().toISOString(),
  recipe: "recursive reader, reprojectEvery 10, fortune curve over sentence stream",
  genre, medium,
  movements: movements.map((m) => ({ focus: m.focus, from: m.from, to: m.to, freshClaims: m.freshClaims, gain: m.gain })),
  gains,
  fortunePeak: fortune[fortune.length - 1] ?? 0,
};
function recordTextHash() { return sentences.join(" "); }

const priorPath = path.resolve(HERE, "../../../../live_priors/derived-priors/arc-priors/fortune-prior-v1.json");
fs.mkdirSync(path.dirname(priorPath), { recursive: true });
let prior = null;
try { prior = JSON.parse(fs.readFileSync(priorPath, "utf8")); } catch {}
prior = appendFortune(prior, entry);
fs.writeFileSync(priorPath, JSON.stringify(prior, null, 2));
console.log(`\n═══ APPENDED TO FortunePrior@1 ═══`);
console.log(`shape: ${shape} · genre: ${genre} · medium: ${medium}`);
console.log(JSON.stringify(fortuneSummary(prior), null, 2));
console.log(`prior: ${priorPath} (${prior.entries.length} entries)`);