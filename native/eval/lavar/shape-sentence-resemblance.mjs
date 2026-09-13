// shape-sentence-resemblance.mjs — "The Buried Connection" design doc, the
// REAL retry of Step 1 after shape-null-band.mjs came back NOT SEPARABLE for
// all three bare-token vocabularies (Lens/Paradigm/Atmosphere) on one
// chapter. That result is not repeated or re-argued here — read
// shape-null-band.mjs and results/shape-null-band.json first if you have
// not; this file exists because the diagnosis of WHY it failed (bare single
// words carry almost no SDR content, and one 271-token chapter is far too
// small a field for a resemblance mechanism whose own precedents run on
// hundreds of SENTENCES) is testable, and this is the test.
//
// This mirrors, methodologically, the two precedent scripts in this same
// directory that DID find real signal with the-fold/relative.js's Field —
// field-lens-improvement-test.mjs (a referent's own name cued against real
// chapter SENTENCES: 73.5% recovery vs 14.6% random-word control) and
// dark-referent-cluster-test.mjs (a dark referent's own SENTENCE TEXT used
// to cue its siblings: 83.3% vs 12.8% expected by chance) — and it applies
// that same cue-richness/material-scale regime to the design doc's own
// worked concept in GROUND-FIGURE-PATTERN-SPEC.md / the design doc's
// section 4.1: "a claim with its argument slots emptied... two confession
// scenes resonate regardless of who confesses" — the functional-SLOT move,
// done here as a text-level surface substitution (a referent's surface
// occurrences swapped for a generic placeholder), never a bare-label
// reduction.
//
// WHAT MATERIAL, AND WHY. results/pg11_Alice_s_Adventures_in_Wonderland-ch{1..12}.eot.jsonl
// already exist for ALL TWELVE chapters of Alice's Adventures in Wonderland
// (confirmed by directory listing before writing this file — this codebase's
// own "search before you build" rule) — a real whole-book set of ledgers,
// not a single small chapter. No new extraction is run. Chapter 4's own
// four goldens (aiw-ch1..4.json) and golden-tool.mjs's score check are left
// completely undisturbed — this script only READS the twelve .eot.jsonl
// files and the book's own raw text.
//
// SENTENCE RECONSTRUCTION. Each ledger proposition line carries `at:[a,b]`
// — checked directly against the raw book file this session: `raw.slice(a,b)`
// (raw = fs.readFileSync(BOOK,"utf8"), no newline normalisation) reproduces
// the proposition's own end2 text exactly (e.g. ch1 o197 at:[816,823] slices
// to "reading", matching end2). So `at` is an ABSOLUTE byte offset into the
// whole book file — confirmed on a chapter-5 example too (at:[47288,47353]
// slices to the real ch5 opening clause) — not chapter-relative. Sentences
// are reconstructed with the EXACT method golden-tool.mjs already uses and
// this project already trusts (flatten whitespace to single spaces, split
// on `(?<=[.!?”])\s+`), with a parallel flat-index -> raw-offset map built
// alongside the flattening so each reconstructed sentence's raw byte range
// is known; a proposition is assigned to the sentence whose raw range
// contains its `at[0]`.
//
// SHAPE ANONYMIZATION. For each sentence with >=1 real extracted
// proposition, every occurrence of a surface string from that CHAPTER's own
// ledger entity rows (role:"entity", field `surfaces`) is replaced with the
// fixed placeholder token SOMEONE — driven entirely by the engine's own
// referent index, never a hand-typed cast list (some of these auto-
// discovered "referents" are discourse noise, e.g. "Oh", "I'll" — disclosed
// in the report, not filtered by hand, because filtering them would be
// exactly the hand-tuning this codebase's CLAUDE.md forbids). Every other
// word — verbs, prepositions, function words, non-referent nouns — is kept
// verbatim. This is the "argument slots emptied" move done as text, not as
// a bare edge label.
//
// FIELD. One relative.js Field, admitting every proposition-bearing
// sentence from all twelve chapters, IN DOCUMENT ORDER (ch1 sentence 1 ...
// ch12 last sentence) — exactly the admission discipline both precedent
// scripts use (one admit() per sentence, temporal-adjacency synapses
// between consecutive admits).
//
// CANDIDATE PAIRS — the mechanical, stated-in-advance selection rule
// (declared here, in this comment, BEFORE any Field was built or any recall
// number existed): among all proposition labels in the whole book, "said"
// is the most frequent (35 occurrences) verb-shaped label naming a genuine
// recurring functional pattern with different subjects across different
// parts of the book — the nearest real analogue this book has to the design
// doc's own "confession scene" example (a speech act, same functional slot,
// different speaker, different words). For each chapter that has at least
// one proposition with label==="said", take the FIRST such sentence in
// document order as that chapter's one representative. Every ORDERED pair
// of representatives from two DIFFERENT chapters is a candidate: cue with
// one member's shape-anonymized text, check whether the other member is
// recovered. No pair is chosen or discarded after seeing a recall number.
//
// CONTROL — drawn from the SAME shape-anonymized-sentence population that
// is actually in the Field (never a bare word, never a flat single-token
// draw): for each cue, RANDOM_DRAWS=15 random OTHER admitted sentences
// (excluding the cue and its designated partner) are used as alternate
// cues, and the rate at which they land the partner in the same top-K
// window is the expected-by-chance figure — exactly dark-referent-cluster-
// test.mjs's own control discipline, reused unmodified (TOPK_FRACTION=0.1,
// RANDOM_DRAWS=15, nullBand draws=100 — all copied from that file's own
// already-settled constants, not re-tuned here).
//
// usage: node shape-sentence-resemblance.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { Field } = await import(path.join(HERE, "..", "..", "..", "..", "the-fold", "relative.js"));

const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const raw = fs.readFileSync(BOOK, "utf8");

// Same head-detection + real-title fix as golden-tool.mjs, reused verbatim.
const heads = [...raw.matchAll(/^CHAPTER ([IVXLC]+)\.\s*\r?\n([^\r\n]*)\r?\n/gmd)].map((m) => {
  const candidateEnd = m.index + m[0].length;
  const hasRealTitle = Boolean(m[2].trim()) && /^\r?\n/.test(raw.slice(candidateEnd));
  return { ...m, headEnd: hasRealTitle ? candidateEnd : m.indices[2][0], realTitle: hasRealTitle ? m[2].trim() : "" };
});
const NCHAPTERS = 12;

function chapterBounds(ch) {
  const lo = heads[ch - 1].headEnd;
  const hi = ch < heads.length ? heads[ch].index : raw.length;
  return [lo, hi];
}

// Flatten a chapter's raw body to single-spaced text (golden-tool.mjs's own
// `.split(/\s+/).join(" ").trim()`), while recording, for every character
// emitted into the flattened string, the ABSOLUTE raw-file offset it came
// from — so sentence spans found in the flattened text can be mapped back
// to real byte ranges in `raw`, which is the coordinate system every
// ledger's `at` field is already confirmed (see header) to use.
function flattenWithMap(lo, hi) {
  let flat = "";
  const flatToRaw = [];
  let inWs = false;
  for (let i = lo; i < hi; i++) {
    const c = raw[i];
    if (/\s/.test(c)) {
      if (!inWs) { flat += " "; flatToRaw.push(i); inWs = true; }
    } else {
      flat += c; flatToRaw.push(i); inWs = false;
    }
  }
  // Mirror the trim() golden-tool.mjs applies after flattening.
  let start = 0, end = flat.length;
  while (start < end && flat[start] === " ") start++;
  while (end > start && flat[end - 1] === " ") end--;
  return { flat: flat.slice(start, end), flatToRaw: flatToRaw.slice(start, end) };
}

// Reconstruct sentences with real RAW byte ranges [rawStart, rawEnd).
function chapterSentencesWithSpans(ch) {
  const [lo, hi] = chapterBounds(ch);
  const { flat, flatToRaw } = flattenWithMap(lo, hi);
  const pieces = flat.split(/(?<=[.!?”])\s+/).map((s) => s.trim()).filter((s) => s.length > 4);
  const out = [];
  let cursor = 0;
  for (const s of pieces) {
    const idx = flat.indexOf(s, cursor);
    if (idx < 0) continue; // should not happen; skip defensively
    const flatStart = idx, flatEnd = idx + s.length;
    out.push({ text: s, flatStart, flatEnd, rawStart: flatToRaw[flatStart] });
    cursor = flatEnd;
  }
  // rawEnd of sentence i = rawStart of sentence i+1, or chapter end for the last.
  for (let i = 0; i < out.length; i++) out[i].rawEnd = i + 1 < out.length ? out[i + 1].rawStart : hi;
  return out;
}

function loadLedger(ch) {
  const p = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function entitySurfaces(ledgerLines) {
  const surfaces = [];
  for (const l of ledgerLines) if (l.role === "entity" && Array.isArray(l.surfaces)) surfaces.push(...l.surfaces);
  // Longest-first so "White Rabbit" is tried before "White".
  return [...new Set(surfaces)].sort((a, b) => b.length - a.length);
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function anonymize(text, surfaces) {
  if (!surfaces.length) return text;
  const re = new RegExp(`\\b(?:${surfaces.map(escapeRe).join("|")})\\b`, "g");
  return text.replace(re, "SOMEONE");
}

// -------------------------------------------------------------------------
// Build, per chapter: sentences with spans, which propositions land in
// which sentence (by rawStart <= at[0] < rawEnd), and the shape-anonymized
// text of every sentence that got >=1 proposition.
const perChapter = [];
let totalPropLines = 0, totalMappedProps = 0, totalUnmapped = 0;

for (let ch = 1; ch <= NCHAPTERS; ch++) {
  const ledgerLines = loadLedger(ch);
  const props = ledgerLines.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1 && Array.isArray(l.at));
  totalPropLines += props.length;
  const sentences = chapterSentencesWithSpans(ch);
  const surfaces = entitySurfaces(ledgerLines);

  // Sort sentences by rawStart (should already be in order) for a binary-ish
  // linear scan; chapters are short enough that linear scan per prop is fine.
  const bySentence = sentences.map(() => []);
  for (const p of props) {
    const at0 = p.at[0];
    const idx = sentences.findIndex((s) => at0 >= s.rawStart && at0 < s.rawEnd);
    if (idx < 0) { totalUnmapped += 1; continue; }
    bySentence[idx].push(p);
    totalMappedProps += 1;
  }

  const sentenceRows = sentences.map((s, i) => ({
    ch, idx: i, text: s.text, props: bySentence[i],
    hasSaid: bySentence[i].some((p) => p.label === "said"),
    anon: bySentence[i].length ? anonymize(s.text, surfaces) : null,
  }));

  perChapter.push({ ch, surfaces, sentenceRows });
}

console.log(`=== Sentence <-> proposition mapping ===`);
console.log(`proposition lines: ${totalPropLines}  mapped to a sentence: ${totalMappedProps}  unmapped: ${totalUnmapped}`);

// -------------------------------------------------------------------------
// The Field: every proposition-bearing sentence, shape-anonymized, admitted
// in document order across all twelve chapters.
const admitted = []; // { ch, idx, text: anonymized }
for (const { sentenceRows } of perChapter) {
  for (const row of sentenceRows) {
    if (row.anon == null) continue;
    admitted.push({ ch: row.ch, idx: row.idx, text: row.anon });
  }
}
console.log(`shape-anonymized sentences admitted to the Field: ${admitted.length}`);

const field = new Field();
for (const a of admitted) field.admit(a.text, { ch: a.ch, idx: a.idx });

// -------------------------------------------------------------------------
// Candidate pairs — the pre-declared mechanical rule (see header): one
// representative "said" sentence per chapter (first in document order),
// every ordered cross-chapter pair of representatives is a candidate.
const representatives = [];
for (const { ch, sentenceRows } of perChapter) {
  const first = sentenceRows.find((r) => r.anon != null && r.hasSaid);
  if (first) representatives.push({ ch, idx: first.idx, real: first.text, anon: first.anon });
}
console.log(`\n=== Representatives (first "said" sentence per chapter) ===`);
for (const r of representatives) console.log(`  ch${r.ch} [${r.idx}]: "${r.real}"`);

const candidatePairs = [];
for (const a of representatives) for (const b of representatives) if (a.ch !== b.ch) candidatePairs.push([a, b]);
console.log(`\ncandidate ordered pairs (cross-chapter "said" representatives): ${candidatePairs.length}`);

// -------------------------------------------------------------------------
// Recall test, mirroring dark-referent-cluster-test.mjs exactly: same
// TOPK_FRACTION, same RANDOM_DRAWS, same nullBand draws.
const TOPK_FRACTION = 0.1;
const RANDOM_DRAWS = 15;
const NULLBAND_DRAWS = 100;
const topK = Math.max(3, Math.round(field.size * TOPK_FRACTION));
console.log(`field size: ${field.size}  topK: ${topK}`);

function indexOfAdmitted(ch, idx) { return admitted.findIndex((a) => a.ch === ch && a.idx === idx); }

let cueHits = 0, cueSigHits = 0, controlHitsSum = 0;
const rows = [];

for (const [a, b] of candidatePairs) {
  const targetPos = indexOfAdmitted(b.ch, b.idx);
  const ranked = field.recall(a.anon);
  const band = field.nullBand(a.anon.split(/\s+/).filter(Boolean).length, { draws: NULLBAND_DRAWS });
  const topIdxSet = new Set(ranked.slice(0, topK).map((r) => indexOfAdmitted(r.node.payload.ch, r.node.payload.idx)));
  const hit = topIdxSet.has(targetPos);
  let sigHit = false;
  if (hit) {
    const rankOfTarget = ranked.findIndex((r) => r.node.payload.ch === b.ch && r.node.payload.idx === b.idx);
    if (rankOfTarget >= 0 && ranked[rankOfTarget].activation > band.hi) sigHit = true;
  }
  if (hit) cueHits += 1;
  if (sigHit) cueSigHits += 1;

  // Control: RANDOM_DRAWS random OTHER admitted sentences as cues (excluding
  // this pair's own two members), same topK hit test against the SAME target.
  const excludeCh = new Set([a.ch, b.ch]);
  const pool = admitted.filter((x) => !(x.ch === a.ch && x.idx === a.idx) && !(x.ch === b.ch && x.idx === b.idx));
  let controlHits = 0;
  for (let d = 0; d < RANDOM_DRAWS; d++) {
    const draw = pool[Math.floor(Math.random() * pool.length)];
    const rr = field.recall(draw.text);
    const rIdxSet = new Set(rr.slice(0, topK).map((r) => indexOfAdmitted(r.node.payload.ch, r.node.payload.idx)));
    if (rIdxSet.has(targetPos)) controlHits += 1;
  }
  const controlRate = controlHits / RANDOM_DRAWS;
  controlHitsSum += controlRate;

  rows.push({
    from: `ch${a.ch}[${a.idx}]`, to: `ch${b.ch}[${b.idx}]`,
    hit, sigHit, controlRate: +controlRate.toFixed(3),
    topActivationOfTarget: +(ranked.find((r) => r.node.payload.ch === b.ch && r.node.payload.idx === b.idx)?.activation ?? 0).toFixed(4),
    bandHi: +band.hi.toFixed(4),
  });
}

console.log(`\n=== Per-pair results (first 20 of ${rows.length}) ===`);
for (const r of rows.slice(0, 20)) {
  console.log(`  ${r.from} -> ${r.to}: hit=${r.hit} sig=${r.sigHit} (act=${r.topActivationOfTarget} vs band.hi=${r.bandHi}) | control rate ${(100 * r.controlRate).toFixed(1)}%`);
}

const totalPairs = candidatePairs.length;
console.log(`\n=== TOTALS ===`);
console.log(`candidate pairs tested: ${totalPairs}`);
console.log(`recovered by the real shape-anonymized cue: ${cueHits} (${(100 * cueHits / totalPairs).toFixed(1)}%)`);
console.log(`...of which cleared the null band: ${cueSigHits} (${(100 * cueSigHits / totalPairs).toFixed(1)}%)`);
console.log(`expected by the matched random-shape-sentence control: ${controlHitsSum.toFixed(2)} (${(100 * controlHitsSum / totalPairs).toFixed(1)}%)`);

// Verdict, with no hand-set multiplier: SEPARABLE requires (a) a real,
// non-trivial rate of null-band CLEARS — the field's own Born-null
// mechanism, not a chosen cutoff — since band.hi is the highest top
// activation chance itself produced over 100 draws per pair, so a random
// cue clearing it at all is already rare by the band's own construction;
// and (b) the plain top-K hit rate beating the matched random-sentence
// control outright (no margin required beyond ">"), the same bar
// shape-null-band.mjs's own separabilityTest used (figure vs nothing).
let verdict;
if (field.size < 50) verdict = "UNDERPOWERED";
else if (cueSigHits > 0 && cueHits / totalPairs > controlHitsSum / totalPairs) verdict = "SEPARABLE";
else verdict = "NOT SEPARABLE";
console.log(`\nVERDICT: ${verdict}`);
console.log(cueHits > controlHitsSum ? "real shape cue beats the matched random-sentence control on raw hit count" : "real shape cue does NOT beat the matched random-sentence control");

fs.writeFileSync(
  path.join(HERE, "results", "shape-sentence-resemblance.json"),
  JSON.stringify(
    {
      fieldSize: field.size,
      topK,
      constants: { TOPK_FRACTION, RANDOM_DRAWS, NULLBAND_DRAWS },
      mapping: { totalPropLines, totalMappedProps, totalUnmapped },
      representatives: representatives.map((r) => ({ ch: r.ch, idx: r.idx, real: r.real, anon: r.anon })),
      candidatePairCount: totalPairs,
      rows,
      totals: { cueHits, cueSigHits, controlHitsSum, totalPairs },
      verdict,
    },
    null,
    1
  )
);
console.log(`\n-> results/shape-sentence-resemblance.json`);
