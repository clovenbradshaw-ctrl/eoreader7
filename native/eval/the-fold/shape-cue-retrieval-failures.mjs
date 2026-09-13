// eval/the-fold/shape-cue-retrieval-failures.mjs — connecting two prior
// passes rather than inventing a third mechanism.
//
// Pass A (eval/lavar/shape-sentence-resemblance.mjs): the-fold/relative.js's
// Field, cued with a shape-anonymized SENTENCE (every resolved referent's
// surface replaced by the fixed placeholder SOMEONE), recovers a genuine
// cross-chapter functional-pattern partner in Alice's Adventures in
// Wonderland at 37.3% (top-10%-activation window) vs 12.8% for a matched
// random-sentence control, and 23.6% clear the field's own null band.
//
// Pass B (witness-paraphrase-corpus.mjs): this project's own declared,
// ground-truth-labelled battery of REAL sentence/fact pairs over the real,
// full, gitignored War and Peace (pg2600.txt) — sixteen items, shape and
// truth fixed BEFORE any run (verbatim/near-verbatim, passive, role-reversed,
// synonym-verb, rearranged-adjunct, each with a FALSE twin) — already run
// through the project's own real keyword/term-overlap retriever,
// source.js::chunkSource + retrieve(), exactly as app.js ranks passages for
// a live turn.
//
// THE QUESTION THIS FILE ANSWERS: on the subset of witness-paraphrase-corpus
// items where retrieve() genuinely fails to surface the TRUE source passage
// in its own top-K (checked against real bytes, not assumed), can shape-cue
// resemblance (Pass A's mechanism) recover it instead? This is the "activation
// without raw grep span, better than keyword matching" result the whole
// lavar/the-fold line of experiments has been chasing.
//
// WHY THE-FOLD, NOT LAVAR. The material (War and Peace via pg2600.txt), the
// battery (witness-paraphrase-corpus.mjs's own BATTERY), and the retrieval
// organ under test (source.js::chunkSource/retrieve) are all the-fold-scoped
// — this file sits beside its two siblings for that reason. relative.js's
// Field (the ACTIVATION mechanism, lavar's own precedent) is imported from
// the-fold root exactly as lavar's shape-sentence-resemblance.mjs already
// does, just from the opposite side of the same directory pair.
//
// THE BATTERY IS COPIED, NOT IMPORTED, AND THAT IS DELIBERATE.
// witness-paraphrase-corpus.mjs is a SCRIPT, not a library: importing it
// would execute its whole top-level body, including sixteen live Ollama
// calls against gemma2:2b. Re-typing its own `export const BATTERY` array
// here VERBATIM (checked byte-for-byte against the source file before this
// comment was written) reuses the real ground truth without triggering that
// side effect — nothing here invents, edits, reorders, or drops an item.
// FALSE twins ride along for completeness (so nobody can accuse this driver
// of quietly deleting the record) but are never scored: the task is
// retrieval of the TRUE claim's source, not precision on a lie.
//
// WHAT COUNTS AS THE ITEM'S "OWN declared true source passage/sentence".
// The BATTERY's own `sentence` field is the CLAIM under test (itself a near-
// verbatim paraphrase for several shapes), not always the book's own bytes.
// Where witness-paraphrase-corpus-RESULTS.md already did this verification
// (item 4, "the French army crossed the Niemen" -> "Borís was thus the
// first to learn the news that the French army had crossed the Niemen..."),
// that finding is reused. For the other eight ENTAILED items this file did
// the identical hand verification this session, against the SAME real
// pg2600.txt, the SAME way: a short, distinctive anchor phrase from the
// claim was located in the raw file with a whitespace-tolerant regex (the
// Gutenberg text hard-wraps at ~70-80 columns with CRLF line endings, so a
// literal substring search across a wrap point fails even on a real quote —
// checked directly, not assumed) and the match's raw byte OFFSET is what
// this file treats as "inside the true source passage" for the containment
// test below. TRUE_SOURCES declares each one, with the exact anchor text and
// the byte offset a fresh grep against pg2600.txt reproduces.
//
// SCOPE DECISION, STATED BEFORE ANY FIELD WAS BUILT: no per-chapter or
// whole-book EOT ledger (role:"entity" surfaces, the kind Pass A read
// straight off disk for Alice in Wonderland) exists for War and Peace at
// this scale — checked directly (`live_priors/11-multi-language/
// war-and-peace/en/*.eot.json` is an 8KB EXCERPT reading, not a whole-book
// referent index). Building one from scratch would mean running full clause
// extraction over 3.3MB of prose, which this pass does not attempt. Building
// a single relative.js Field admitting every sentence of the whole 3.3MB
// book is comparatively CHEAP (chunking alone is 0.3s; the Field's own
// admit() is O(sentences), and Pass A already proved ~1,100 sentences is a
// tractable Field) — but the entity-surface list that drives ANONYMIZATION
// still needs a referent index, and that is the part with no prebuilt
// whole-book artifact to read. So: for the retrieve()-failure subset only,
// this file builds ONE BOUNDED Field per failing item — a fixed neighbourhood
// of chunks around that item's own true source chunk (declared below,
// NEIGHBOURHOOD_CHUNKS chunks each side, ~60 chunks * ~288 avg chars/chunk
// measured on this exact chunking = tens of thousands of characters, hundreds
// of sentences) — and runs the real engine organs
// (adapters/text/surfaces.js::extractSurfaces + discoverReferents) over just
// that neighbourhood to discover its own referents. This is option (a) the
// task explicitly licenses ("scope down to a bounded neighborhood of chunks
// around a retrieval near-miss"), disclosed here rather than silently
// claimed as whole-book. The Borodino excerpt battery (witness-paraphrase.mjs)
// is NOT used as a second check: its items carry no `question` field
// (retrieve() is never exercised in that battery at all — it hands the
// witness the whole 9KB excerpt directly), and manufacturing a question for
// it would be exactly the "invent a new probe" the task forbids.
//
// usage: node shape-cue-retrieval-failures.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FOLD = path.join(HERE, "..", "..", "..", "..", "the-fold");
const { chunkSource, retrieve } = await import(path.join(FOLD, "source.js"));
const { Field } = await import(path.join(FOLD, "relative.js"));
const { extractSurfaces, discoverReferents } = await import(
  path.join(HERE, "..", "..", "adapters", "text", "surfaces.js")
);

const BOOK = process.env.BOOK ?? path.join(FOLD, "..", "pg2600.txt");
const raw = fs.readFileSync(BOOK, "utf8");

// -----------------------------------------------------------------------
// The battery, copied verbatim from witness-paraphrase-corpus.mjs's own
// `export const BATTERY` (see header). [id, question, sentence, truth,
// shape, end1, end2].
const BATTERY = [
  [1, "who was appointed commander in chief to replace after Kutúzov", "The committee replaced someone with Kutúzov as commander in chief.", "ENTAILED", "role-reversed", "committee", "Kutúzov"],
  [2, "Kutúzov appointed commander in chief full powers armies", "Kutúzov was appointed commander in chief with full powers over the armies.", "ENTAILED", "near-verbatim", "Kutúzov", "commander in chief"],
  [3, "Kutúzov appointed commander in chief full powers armies", "Kutúzov replaced someone else as commander in chief.", "FALSE", "role-reversed-false", "Kutúzov", "commander in chief"],
  [4, "French army crossed the Niemen invasion", "The French army crossed the Niemen at the start of the invasion.", "ENTAILED", "near-verbatim", "French", "Niemen"],
  [5, "French army crossed the Niemen invasion", "The Niemen was crossed by the Russian army.", "FALSE", "swapped-agent", "Niemen", "Russian"],
  [6, "Bagratión wounded flèches captured retaken", "Prince Bagratión was wounded when the flèches were retaken.", "ENTAILED", "rearranged", "Bagratión", "flèches"],
  [7, "Bagratión wounded flèches captured retaken", "Kutúzov was wounded when the flèches were retaken.", "FALSE", "swapped-subject", "Kutúzov", "flèches"],
  [8, "Moscow was burned by its inhabitants", "Moscow was burned by the people who had abandoned it.", "ENTAILED", "near-verbatim", "Moscow", "inhabitants"],
  [9, "Moscow was burned by its inhabitants", "Moscow was burned by the French army.", "FALSE", "swapped-agent", "Moscow", "French"],
  [10, "Prince Andrew fatally wounded left care inhabitants district", "Prince Andrew was left in the care of the local people after being fatally wounded.", "ENTAILED", "passive", "Andrew", "wounded"],
  [11, "Prince Andrew fatally wounded left care inhabitants district", "Prince Andrew died instantly on the battlefield.", "FALSE", "unheard-verb", "Andrew", "battlefield"],
  [12, "Countess Hélène Bezúkhova suddenly died terrible", "Hélène Bezúkhova suddenly died.", "ENTAILED", "near-verbatim", "Hélène", "died"],
  [13, "Countess Hélène Bezúkhova suddenly died terrible", "Natásha Rostova suddenly died.", "FALSE", "swapped-subject", "Natásha", "died"],
  [14, "Natásha engaged brother sister of course out of question", "Natásha was engaged to marry a certain man's brother.", "ENTAILED", "rearranged", "Natásha", "engaged"],
  [15, "Natásha engaged brother sister of course out of question", "Natásha was engaged to marry Pierre.", "FALSE", "swapped-object", "Natásha", "Pierre"],
  [16, "Emperor's dislike Kutúzov committee advise appointment", "The committee advised the Emperor to appoint Kutúzov despite his dislike of him.", "ENTAILED", "role-reversed", "committee", "Emperor"],
];

// -----------------------------------------------------------------------
// Each ENTAILED item's own true source passage, hand-verified this session
// against the real pg2600.txt bytes (see header). `anchor` is a short,
// distinctive phrase; `find` locates it with a whitespace-tolerant regex
// (the file hard-wraps with CRLF) and asserts exactly one match, so a typo
// or a since-changed file fails loudly rather than silently mis-locating.
function findAnchor(phrase) {
  const esc = phrase.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const re = new RegExp(esc, "g");
  const matches = [];
  let m;
  while ((m = re.exec(raw))) matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return matches;
}

const TRUE_SOURCES = {
  1: "agreed to advise his appointment as commander in chief",
  2: "Kutúzov was appointed commander in chief with full powers",
  4: "the French army had crossed the Niemen",
  6: "Prince Bagratión was wounded",
  8: "Moscow was burned by its inhabitants",
  10: "was left to the care of the inhabitants",
  12: "had suddenly died of that terrible malady",
  14: "was engaged to her brother",
  16: "aware of the Emperor’s dislike of Kutúzov",
};

const sourceAnchors = {};
for (const [id, phrase] of Object.entries(TRUE_SOURCES)) {
  const matches = findAnchor(phrase);
  if (matches.length !== 1) {
    console.error(`FATAL: anchor for item ${id} ("${phrase}") matched ${matches.length} times, expected exactly 1`);
    process.exit(1);
  }
  sourceAnchors[id] = matches[0];
}

console.log("=== True-source anchors, self-verified against real pg2600.txt bytes ===");
for (const [id, a] of Object.entries(sourceAnchors)) {
  console.log(`  item ${id}: [${a.start}-${a.end}] "${a.text.replace(/\s+/g, " ")}"`);
}

// -----------------------------------------------------------------------
// Step 1-2: chunk the whole book exactly as witness-paraphrase-corpus.mjs
// does, run the real retrieve() per ENTAILED item at limit 1 and limit 3,
// and check — against real bytes, not assumed — whether the chunk actually
// containing the true source anchor is among the retrieved chunks.
console.log(`\nchunking ${BOOK} (${raw.length} chars)...`);
const t0 = Date.now();
const chunks = chunkSource(path.basename(BOOK), raw, {});
console.log(`  ${chunks.length} chunks, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

function chunkIndexContaining(offset) {
  return chunks.findIndex((c) => offset >= c.start && offset < c.end);
}

const entailed = BATTERY.filter((row) => row[3] === "ENTAILED").map(([id, question, sentence, truth, shape, e1, e2]) => ({
  id, question, sentence, truth, shape, e1, e2,
}));

const retrievalRows = [];
for (const item of entailed) {
  const anchor = sourceAnchors[item.id];
  const trueIdx = chunkIndexContaining(anchor.start);
  if (trueIdx < 0) {
    console.error(`FATAL: item ${item.id}'s true anchor at ${anchor.start} falls in no chunk`);
    process.exit(1);
  }
  const trueRef = chunks[trueIdx].ref;
  const r1 = retrieve(chunks, item.question, 1).map((c) => c.ref);
  const r3 = retrieve(chunks, item.question, 3).map((c) => c.ref);
  retrievalRows.push({
    id: item.id, shape: item.shape, question: item.question, trueRef, trueIdx,
    retrievedAt1: r1, retrievedAt3: r3,
    hitAt1: r1.includes(trueRef), hitAt3: r3.includes(trueRef),
  });
}

console.log("\n=== retrieve() pass/fail per TRUE item (checked against real chunk bytes) ===");
for (const r of retrievalRows) {
  console.log(`  item ${r.id} (${r.shape}): true=[${r.trueRef}] limit1=${r.hitAt1 ? "HIT" : "miss"} limit3=${r.hitAt3 ? "HIT" : "miss"}`);
  if (!r.hitAt3) console.log(`       question: "${r.question}"  retrieved@3: ${r.retrievedAt3.join(", ") || "(none)"}`);
}

// The declared operative retrieval config is limit=3 — witness-paraphrase-
// corpus.mjs's own comment names it "app.js's own default retrieval width".
// Declared HERE, before any shape-cue Field is built or any recall number
// exists: the retrieve()-FAILURE subset is every ENTAILED item that misses
// at limit=3. limit=1 is reported alongside for transparency but is not
// what selects the subset.
const failureSubset = retrievalRows.filter((r) => !r.hitAt3);

console.log(`\n=== TOTALS: retrieve() ===`);
console.log(`ENTAILED items: ${entailed.length}`);
console.log(`retrieve() hits at limit=1: ${retrievalRows.filter((r) => r.hitAt1).length}/${entailed.length}`);
console.log(`retrieve() hits at limit=3: ${retrievalRows.filter((r) => r.hitAt3).length}/${entailed.length}`);
console.log(`retrieve()-FAILURE subset (limit=3 miss): ${failureSubset.length} item(s): [${failureSubset.map((r) => r.id).join(", ")}]`);

// -----------------------------------------------------------------------
// Step 3: for the failure subset only, build a bounded shape-anonymized
// Field and test the shape-cue channel. Reuses lavar/shape-sentence-
// resemblance.mjs's own sentence-reconstruction and anonymization
// machinery verbatim, generalized from "one chapter's bounds" to "an
// arbitrary raw byte range" (chapterBounds -> an explicit [lo, hi) the
// caller supplies) since War and Peace has no chapter-ledger concept in
// play here.
const NEIGHBOURHOOD_CHUNKS = 60; // each side of the true chunk — declared before any Field was built
const TOPK_FRACTION = 0.1; // reused unchanged from shape-sentence-resemblance.mjs
const RANDOM_DRAWS = 15; // reused unchanged
const NULLBAND_DRAWS = 100; // reused unchanged

// Verbatim from shape-sentence-resemblance.mjs (chapterBounds's callee),
// generalized to take explicit [lo, hi) instead of deriving them from a
// chapter head/next-head pair.
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
  let start = 0, end = flat.length;
  while (start < end && flat[start] === " ") start++;
  while (end > start && flat[end - 1] === " ") end--;
  return { flat: flat.slice(start, end), flatToRaw: flatToRaw.slice(start, end) };
}

// Verbatim from shape-sentence-resemblance.mjs's chapterSentencesWithSpans,
// generalized the same way.
function sentencesWithSpans(lo, hi) {
  const { flat, flatToRaw } = flattenWithMap(lo, hi);
  const pieces = flat.split(/(?<=[.!?”])\s+/).map((s) => s.trim()).filter((s) => s.length > 4);
  const out = [];
  let cursor = 0;
  for (const s of pieces) {
    const idx = flat.indexOf(s, cursor);
    if (idx < 0) continue;
    const flatStart = idx, flatEnd = idx + s.length;
    out.push({ text: s, flatStart, flatEnd, rawStart: flatToRaw[flatStart] });
    cursor = flatEnd;
  }
  for (let i = 0; i < out.length; i++) out[i].rawEnd = i + 1 < out.length ? out[i + 1].rawStart : hi;
  return out;
}

// Verbatim from shape-sentence-resemblance.mjs.
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function anonymize(text, surfaces) {
  if (!surfaces.length) return text;
  const re = new RegExp(`\\b(?:${surfaces.map(escapeRe).join("|")})\\b`, "g");
  return text.replace(re, "SOMEONE");
}

// The entity-surface list, driven entirely by the real engine's own
// referent-discovery organs run over the local neighbourhood's own
// sentences — the same "engine's own referent index, never a hand-typed
// cast list" discipline shape-sentence-resemblance.mjs states for its
// ledger-based version, adapted because no ledger exists here (see header).
function localEntitySurfaces(sentences) {
  const surfaceEntries = extractSurfaces(sentences.map((s) => ({ text: s.text })), {});
  const { events } = discoverReferents(surfaceEntries, {});
  const surfaces = [...new Set(events.map((e) => e.surface))];
  return surfaces.sort((a, b) => b.length - a.length);
}

const fieldCache = new Map(); // "loIdx-hiIdx" -> { field, admitted, surfaces, sentenceCount }
function buildNeighbourhoodField(trueIdx) {
  const loIdx = Math.max(0, trueIdx - NEIGHBOURHOOD_CHUNKS);
  const hiIdx = Math.min(chunks.length - 1, trueIdx + NEIGHBOURHOOD_CHUNKS);
  const key = `${loIdx}-${hiIdx}`;
  if (fieldCache.has(key)) return fieldCache.get(key);

  const lo = chunks[loIdx].start;
  const hi = chunks[hiIdx].end;
  const sentences = sentencesWithSpans(lo, hi);
  const surfaces = localEntitySurfaces(sentences);
  const admitted = sentences.map((s, idx) => ({ idx, text: anonymize(s.text, surfaces), rawStart: s.rawStart, rawEnd: s.rawEnd }));

  const field = new Field();
  for (const a of admitted) field.admit(a.text, { idx: a.idx });

  const result = { field, admitted, surfaces, loIdx, hiIdx, lo, hi, sentenceCount: sentences.length };
  fieldCache.set(key, result);
  return result;
}

function targetSentenceIdx(admitted, anchorOffset) {
  return admitted.findIndex((a) => anchorOffset >= a.rawStart && anchorOffset < a.rawEnd);
}

console.log(`\n=== Step 3: shape-cue Field over the retrieve()-failure subset ===`);
console.log(`Field scope PER ITEM: a bounded neighbourhood of ±${NEIGHBOURHOOD_CHUNKS} chunks around that item's own true source chunk — NOT the whole book (see header for why).`);

const shapeCueRows = [];
for (const r of failureSubset) {
  const { field, admitted, surfaces, loIdx, hiIdx, lo, hi, sentenceCount } = buildNeighbourhoodField(r.trueIdx);
  const targetIdx = targetSentenceIdx(admitted, sourceAnchors[r.id].start);
  if (targetIdx < 0) {
    shapeCueRows.push({ id: r.id, shape: r.shape, error: "true anchor not recovered inside any admitted sentence's raw span — the sentence splitter's own boundary missed it" });
    continue;
  }

  const item = entailed.find((e) => e.id === r.id);
  const anonQuestion = anonymize(item.question, surfaces);
  const topK = Math.max(3, Math.round(field.size * TOPK_FRACTION));
  const ranked = field.recall(anonQuestion);
  const band = field.nullBand(anonQuestion.split(/\s+/).filter(Boolean).length, { draws: NULLBAND_DRAWS });
  const topIdxSet = new Set(ranked.slice(0, topK).map((rr) => rr.node.payload.idx));
  const hit = topIdxSet.has(targetIdx);
  const rankOfTarget = ranked.findIndex((rr) => rr.node.payload.idx === targetIdx);
  const targetActivation = rankOfTarget >= 0 ? ranked[rankOfTarget].activation : 0;
  const sigHit = hit && targetActivation > band.hi;

  // Matched control: RANDOM_DRAWS other admitted (already-anonymized)
  // sentences from the SAME field, standing in as substitute cues, same
  // topK hit test against the SAME target — shape-sentence-resemblance.mjs's
  // own control discipline, reused unmodified in spirit.
  const pool = admitted.filter((a) => a.idx !== targetIdx);
  let controlHits = 0;
  for (let d = 0; d < RANDOM_DRAWS; d++) {
    const draw = pool[Math.floor(Math.random() * pool.length)];
    const rr = field.recall(draw.text);
    const rIdxSet = new Set(rr.slice(0, topK).map((x) => x.node.payload.idx));
    if (rIdxSet.has(targetIdx)) controlHits += 1;
  }
  const controlRate = controlHits / RANDOM_DRAWS;

  shapeCueRows.push({
    id: r.id, shape: r.shape, fieldSize: field.size, sentenceCount, loIdx, hiIdx,
    anonQuestion, topK, hit, sigHit, controlRate: +controlRate.toFixed(3),
    targetActivation: +targetActivation.toFixed(4), bandHi: +band.hi.toFixed(4),
    rankOfTarget: rankOfTarget >= 0 ? rankOfTarget : null,
  });
}

console.log(`\n=== Per-item shape-cue results (failure subset only, ${shapeCueRows.length} item(s)) ===`);
for (const row of shapeCueRows) {
  if (row.error) { console.log(`  item ${row.id} (${row.shape}): ERROR — ${row.error}`); continue; }
  console.log(
    `  item ${row.id} (${row.shape}): field=${row.fieldSize} topK=${row.topK} hit=${row.hit} sig=${row.sigHit} ` +
    `(act=${row.targetActivation} vs band.hi=${row.bandHi}, rank=${row.rankOfTarget}) control=${(100 * row.controlRate).toFixed(1)}%`,
  );
  console.log(`       question (anonymized cue): "${row.anonQuestion}"`);
}

const scored = shapeCueRows.filter((r) => !r.error);
const cueHits = scored.filter((r) => r.hit).length;
const cueSigHits = scored.filter((r) => r.sigHit).length;
const controlSum = scored.reduce((a, r) => a + r.controlRate, 0);

console.log(`\n=== TOTALS: shape-cue recovery on the retrieve()-failure subset ===`);
console.log(`TRUE items total: ${entailed.length}`);
console.log(`retrieve()-failure subset (the interesting subset): ${failureSubset.length}`);
console.log(`  of which scored (true anchor recovered inside a sentence span): ${scored.length}`);
if (scored.length) {
  console.log(`shape-cue recovered in top-${TOPK_FRACTION * 100}% window: ${cueHits}/${scored.length} (${(100 * cueHits / scored.length).toFixed(1)}%)`);
  console.log(`  ...of which cleared the field's own null band: ${cueSigHits}/${scored.length} (${(100 * cueSigHits / scored.length).toFixed(1)}%)`);
  console.log(`expected by the matched random-cue control: ${controlSum.toFixed(2)}/${scored.length} (${(100 * controlSum / scored.length).toFixed(1)}%)`);
}

let verdict;
if (failureSubset.length === 0) verdict = "SUBSET EMPTY — retrieve() succeeded on every TRUE item at limit=3; see report for what this means";
else if (!scored.length) verdict = "UNSCORABLE — every failing item's true anchor fell outside its own admitted-sentence spans";
else if (cueHits / scored.length > controlSum / scored.length && cueSigHits > 0) verdict = "SEPARABLE — shape-cue beats the matched random-cue control and clears the null band at least once";
else verdict = "NOT SEPARABLE";
console.log(`\nVERDICT: ${verdict}`);

fs.writeFileSync(
  path.join(HERE, "results", "shape-cue-retrieval-failures.json"),
  JSON.stringify(
    {
      book: BOOK,
      bookChars: raw.length,
      chunkCount: chunks.length,
      constants: { NEIGHBOURHOOD_CHUNKS, TOPK_FRACTION, RANDOM_DRAWS, NULLBAND_DRAWS, retrieveLimitDeclared: 3 },
      trueSourceAnchors: sourceAnchors,
      entailedCount: entailed.length,
      retrievalRows,
      failureSubsetIds: failureSubset.map((r) => r.id),
      shapeCueRows,
      totals: { cueHits, cueSigHits, controlSum, scoredCount: scored.length },
      verdict,
    },
    null,
    1,
  ),
);
console.log(`\n-> results/shape-cue-retrieval-failures.json`);
