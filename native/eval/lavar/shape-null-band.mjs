// shape-null-band.mjs — "The Buried Connection" design doc, Build Order
// Step 1, and ONLY Step 1: build three shape vocabularies (Lens, Atmosphere,
// Paradigm) over one AIW chapter, measure them, and report whether a real
// shape cue is separable from a random same-vocabulary cue under
// the-fold/relative.js's own Field.nullBand. Kill condition, taken
// literally: if the null band is not clearly separable, that is the
// answer — not a bug to fix here.
//
// This is measurement-only. It does not build the shape FIELD with address
// payloads (Step 2), it does not run an uncued background pass (Step 3),
// and it wires nothing behind a feature flag. It is a re-runnable driver in
// this directory's own posture (field-lens-improvement-test.mjs,
// dark-referent-cluster-test.mjs): prints its own numbers, writes a results
// JSON, never asserts anything as a pinned regression.
//
// WHICH CHAPTER, AND WHY (decided from the organ's own declared floor,
// before any null-band number was looked at — see the printed
// "chapter suitability" table below, which this script recomputes live so
// the choice is checked, not just asserted). eoreader7's real Atmosphere
// organ (loops/atmosphere.js::readAtmosphere, imported unmodified from the
// legacy-eoreader6.1 submodule) needs `GROUND_FLOOR_DIFFERENCE(window) =
// 10 * window` chunks of causal-surprisal material before it can build a
// ground AT ALL — a structural floor, not a hand-pick, calibrated and
// recorded in ground-floor.js. At the SAME production regime
// packages/host/terrains.js already uses for real
// ({window:5, draws:256, tolerance:3, hop:5}, CHUNK_WORDS=40), that floor is
// 50 forty-word chunks (~2,000 words). Chapters 1-3 of Alice's Adventures in
// Wonderland are all too short to ever clear it within their own bounds (55,
// 53 and 43 chunks respectively, and the loop's own hop-aligned test
// positions never reach a point where enough material has accumulated) —
// readAtmosphere returns one flat, eventless region for each, a real result
// but a degenerate one for a shape-vocabulary test. Chapter 4 (66 chunks) is
// the only one of the four where the organ's own floor is cleared with room
// to spare, and it is where the real production regime actually produces a
// clearing/rezero cycle. So chapter 4 is used for ALL THREE vocabularies —
// picked for the Atmosphere organ's own structural reason, before any
// separability number existed, and then reused for Lens/Paradigm so the
// three vocabularies describe the same material.
//
// WHICH ATMOSPHERE ORGAN, AND WHY (CLAUDE.md's own instruction to determine
// this and disclose it). `the-fold/resolutions.js::atmosphereBlock` was
// read in full and is the WRONG organ for this: its "ground" segments a
// CONVERSATION's own transcript by referents named in each question/answer
// exchange — there is no conversation here, only a chapter. The right organ
// is `eoreader7/native/organs/source.js::atmosphereBoundaries`'s own named
// dependency, `loops/atmosphere.js::readAtmosphere` — it runs over a
// document's own paragraph/chunk series as read, exactly the "operates over
// a whole chapter's text as read, not a conversational fold" CLAUDE.md asks
// for, and it is the SAME organ host/terrains.js already runs in production
// for real chapters. This script calls `readAtmosphere` directly (not
// `atmosphereBoundaries`, which is source.js's own boundary-DETECTION
// wrapper for chunking, a different consumer) with the exact same
// causal-surprisal-over-40-word-chunks recipe host/terrains.js uses, so the
// numbers below are the organ's real production behavior, not a bespoke
// configuration invented for this test.
//
// WHAT "read across the chapter" MEANS FOR ATMOSPHERE, CONCRETELY.
// `readAtmosphere` returns an aggregate result (an ordered `events` array —
// DEF clearings and REC rezeros, each carrying the hop-position `at` it
// fired at — plus an ordered `regions` array), not a per-position stream by
// itself. The ordered per-hop-position token stream below is a
// RE-PRESENTATION of that same, already-computed result: it walks the exact
// hop positions `readAtmosphere`'s own loop tests (`i = window; i + window
// <= seriesLength; i += hop` — reproduced here only to WALK the already-
// published answer in order, never to re-decide anything `difference()`
// already decided) and, at each position, asks only two already-published
// facts — does `GROUND_FLOOR_DIFFERENCE(window)` say a ground could exist
// yet at this position, and does an event already say what happened here —
// to label the position. No new statistic is computed; every fact used
// here is either the organ's own returned `events`/`regions` or its own
// published floor constant. `apertureOpen`/`apertureClose` (a `volume()`
// float, continuous, in the tens of thousands here) are DELIBERATELY
// excluded from tokenization rather than bucketed — the design doc forbids
// hand-chosen ranges, and there is no natural small-integer reading of a
// continuous volume; `tended` and `opened` are genuinely small/categorical
// (a count, a boolean-or-null) and are tokenized at their exact value.
//
// THE ENDPOINTS FIELD IS NOT ON THIS LEDGER — CHECKED, NOT ASSUMED. The real
// ledger lines (`results/pg11_..._-ch4.eot.jsonl`, role "proposition",
// schema "EOTObservation@1") carry `end1`/`label`/`end2` verbatim, exactly
// as CLAUDE.md's own memory expects — but grepping every proposition line
// for `endpoints` (the P82 hypergraph.js field, `{subject,object}` each one
// of referent/form/tokens/none) found zero. This pass is read-only over
// already-produced ledger files and must not re-run extraction to compute
// it. So Paradigm below uses the documented, disclosed substitute the task
// explicitly allows: the ledger's OWN already-computed argument-structure
// fields, `subjectBasis` ("stated" vs "inherited" — was the subject
// explicit in this sentence or carried over) and `settledAs` (the
// connector's own grammatical class: verb/preposition/conjunction/null) —
// both real organ output already sitting on every line, never invented
// here, and both genuinely argument-structure information even though
// neither is the true referent/form/tokens/none endpoint typing.
//
// FIELD ADMISSION AND ATOMICITY. Lens tokens are natural text (an edge's
// own label, sometimes one word, sometimes several — "had to", "did not
// get") and are admitted to the Field exactly as written; the-fold's own
// tokensOf splits them on word boundaries the same way it splits a
// sentence, which is the intended behavior for natural text. Paradigm and
// Atmosphere tokens are SYNTHETIC compound identifiers, not text, and are
// encoded with punctuation stripped and each component capitalized
// (camelCase, e.g. Paradigm's `to|stated|none` -> `toStatedNone`; Atmosphere's
// `ground=rezero` -> `atmoGroundRezero`) so tokensOf's word-boundary regex
// (`\p{L}\p{N}'+`) reads the whole identifier as ONE word — otherwise a
// colon or pipe would silently fragment "one token" into several unrelated
// words sharing partial vocabulary across otherwise-distinct types. This is
// a display/encoding choice only; the decoded meaning is stated everywhere
// a token is printed.
//
// usage: node shape-null-band.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { Field } = await import(path.join(HERE, "..", "..", "..", "..", "the-fold", "relative.js"));
const { causalSurprisalSeries } = await import(path.join(HERE, "..", "..", "..", "legacy-eoreader6.1", "packages", "engine", "perceiver", "text", "material.js"));
const { readAtmosphere } = await import(path.join(HERE, "..", "..", "..", "legacy-eoreader6.1", "packages", "engine", "loops", "atmosphere.js"));
const { GROUND_FLOOR_DIFFERENCE } = await import(path.join(HERE, "..", "..", "..", "legacy-eoreader6.1", "packages", "engine", "ground-floor.js"));
const { tokenize } = await import(path.join(HERE, "..", "..", "organs", "source.js"));

const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const raw = fs.readFileSync(BOOK, "utf8");
const heads = [...raw.matchAll(/^CHAPTER ([IVXLC]+)\.\s*\r?\n([^\r\n]*)\r?\n/gm)];

function chapterBody(ch) {
  const lo = heads[ch - 1].index + heads[ch - 1][0].length;
  const hi = ch < heads.length ? heads[ch].index : raw.length;
  return raw.slice(lo, hi);
}
function loadProps(ch) {
  const p = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1)
    .sort((a, b) => a.seq - b.seq);
}

// -------------------------------------------------------------------------
// Reused verbatim from eoreader6.1 packages/host/terrains.js — the organ's
// real production configuration. Never hand-picked for this test.
const ATMOSPHERE_REGIME = Object.freeze({ window: 5, draws: 256, tolerance: 3, hop: 5 });
const CHUNK_WORDS = 40;

function chunkWords(words, n) {
  const out = [];
  for (let i = 0; i < words.length; i += n) out.push(words.slice(i, i + n));
  return out;
}

function atmosphereRun(body) {
  const words = body.split(/\s+/).filter(Boolean);
  const chunks = chunkWords(words, CHUNK_WORDS).map((w) => tokenize(w.join(" ")));
  const series = causalSurprisalSeries(chunks);
  const result = readAtmosphere({ material: series, ...ATMOSPHERE_REGIME });
  return { series, chunkCount: chunks.length, result };
}

// --- Step 1: which chapter clears the organ's own floor? Printed, not assumed. ---
console.log("=== Chapter suitability for readAtmosphere at the real production regime ===");
console.log(`regime: ${JSON.stringify(ATMOSPHERE_REGIME)}  CHUNK_WORDS=${CHUNK_WORDS}  MIN_GROUND(window)=${GROUND_FLOOR_DIFFERENCE(ATMOSPHERE_REGIME.window)}`);
for (let ch = 1; ch <= 4; ch++) {
  const { chunkCount, result } = atmosphereRun(chapterBody(ch));
  const gap = result.gap ? `GAP:${JSON.stringify(result.gap)}` : `regions=${result.regions.length} clearings=${result.clearingCount} rezeros=${result.rezeroCount} stepsRead=${result.stepsRead}`;
  console.log(`  ch${ch}: chunks=${chunkCount}  ${gap}`);
}
console.log("chapter 4 is the only one of the four with any DEF/REC events at all — used below for all three vocabularies.\n");

const CH = 4;
const props = loadProps(CH);
const body = chapterBody(CH);

// --- Lens: the edge's own label, verbatim, in ledger order. ---
const lensTokens = props.map((p) => p.label);

// --- Paradigm: the SAME edges, re-keyed by the ledger's own disclosed
// argument-structure substitute for endpoints (subjectBasis + settledAs). ---
const clean = (s) => String(s ?? "").replace(/[^A-Za-z0-9]+/g, "");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const paradigmDecode = new Map(); // atomic token -> readable form, for reporting only
function paradigmToken(p) {
  const raw = `${p.label}|${p.subjectBasis ?? "unknown"}|${p.settledAs ?? "none"}`;
  const atomic = `${clean(p.label)}${cap(clean(p.subjectBasis ?? "unknown"))}${cap(clean(p.settledAs ?? "none"))}`;
  paradigmDecode.set(atomic, raw);
  return atomic;
}
const paradigmTokens = props.map(paradigmToken);

// --- Atmosphere: readAtmosphere's own events/regions, walked in the exact
// hop-position order its loop tests, labeled only from its own published
// floor + its own returned events/regions (see header comment). ---
const atmoDecode = new Map();
function atmosphereTokens(body) {
  const { series, result } = atmosphereRun(body);
  if (result.gap) return { tokens: [], gap: result.gap };
  const { window, hop } = ATMOSPHERE_REGIME;
  const floor = GROUND_FLOOR_DIFFERENCE(window);
  const positions = [];
  for (let i = window; i + window <= series.length; i += hop) positions.push(i);
  const defAt = new Set(result.events.filter((e) => e.op === "DEF").map((e) => e.at));
  const recAt = new Set(result.events.filter((e) => e.op === "REC").map((e) => e.at));
  const regionByEnd = new Map(result.regions.map((r) => [r.end, r]));
  const mint = (raw, atomic) => { atmoDecode.set(atomic, raw); return atomic; };
  const tokens = [];
  let regionStart = 0;
  for (const p of positions) {
    if (p - regionStart < floor) { tokens.push(mint("ground=none", "atmoGroundNone")); continue; }
    tokens.push(defAt.has(p) ? mint("ground=clearing", "atmoGroundClearing") : mint("ground=tending", "atmoGroundTending"));
    if (recAt.has(p)) {
      tokens.push(mint("ground=rezero", "atmoGroundRezero"));
      const closed = regionByEnd.get(p);
      if (closed) {
        tokens.push(mint(`tended=${closed.tended}`, `atmoTended${closed.tended}`));
        tokens.push(mint(`opened=${closed.opened}`, `atmoOpened${cap(String(closed.opened))}`));
      }
      regionStart = p;
    }
  }
  const last = result.regions.at(-1);
  if (last && positions.length && last.end > positions.at(-1)) {
    tokens.push(mint(`tended=${last.tended}`, `atmoTended${last.tended}`));
    tokens.push(mint(`opened=${last.opened}`, `atmoOpened${cap(String(last.opened))}`));
  }
  return { tokens, gap: null };
}
const { tokens: atmosphereTokenStream, gap: atmosphereGap } = atmosphereTokens(body);

// -------------------------------------------------------------------------
function frequency(tokens) {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function report(name, tokens, decode = null) {
  const freq = frequency(tokens);
  const distinct = freq.length;
  console.log(`--- ${name} ---`);
  console.log(`total tokens: ${tokens.length}   distinct tokens: ${distinct}`);
  console.log(`top 5: ${freq.slice(0, 5).map(([t, n]) => `${decode?.get(t) ?? t}=${n}`).join(", ")}`);
  return { distinct, total: tokens.length, freq };
}

const lensReport = report("LENS", lensTokens);
const paradigmReport = report("PARADIGM", paradigmTokens, paradigmDecode);
const atmosphereReport = atmosphereGap
  ? { distinct: 0, total: 0, freq: [], gap: atmosphereGap }
  : report("ATMOSPHERE", atmosphereTokenStream, atmoDecode);
if (atmosphereGap) console.log(`--- ATMOSPHERE --- DECLINED: ${JSON.stringify(atmosphereGap)}`);
console.log();

// -------------------------------------------------------------------------
// Null-band separability. One Field per vocabulary; admit the stream in
// order (temporal-adjacency synapses connect consecutive tokens); cue with
// the top-5-by-frequency tokens (the same top-5 already reported above —
// chosen by frequency, decided before any null-band number existed, never
// re-picked to make a verdict look better); more cues only if the
// vocabulary is smaller than 5 distinct tokens (test everything it has).
const DRAWS = 200;

function wordCountOf(token, isNatural) {
  return isNatural ? token.split(/\s+/).filter(Boolean).length : 1;
}

function separabilityTest(name, tokens, { isNatural, decode = null } = {}) {
  const freq = frequency(tokens);
  const distinct = freq.length;
  const underpowered = distinct < 5;
  const cues = (underpowered ? freq : freq.slice(0, 5)).map(([t]) => t);
  if (!tokens.length) {
    return { name, verdict: "UNDERPOWERED", reason: "organ declined — no tokens", cues: [], rows: [] };
  }
  const field = new Field();
  for (const t of tokens) field.admit(t, {});
  const rows = [];
  for (const cue of cues) {
    const n = wordCountOf(cue, isNatural);
    const band = field.nullBand(n, { draws: DRAWS });
    const ranked = field.recall(cue);
    const against = field.recallAgainstNull(cue, { draws: DRAWS });
    const top = ranked[0]?.activation ?? 0;
    const second = ranked[1]?.activation ?? 0;
    rows.push({
      cue: decode?.get(cue) ?? cue,
      wordCount: n,
      topActivation: +top.toFixed(4),
      secondActivation: +second.toFixed(4),
      band: { lo: +band.lo.toFixed(4), hi: +band.hi.toFixed(4), margin: +band.margin.toFixed(4), draws: band.draws },
      kind: against.kind, // "figure" | "ambiguous" | "nothing"
    });
    console.log(`  [${name}] cue "${decode?.get(cue) ?? cue}": top=${top.toFixed(3)} vs band.hi=${band.hi.toFixed(3)} margin=${band.margin.toFixed(3)} -> ${against.kind}`);
  }
  const tally = { figure: rows.filter((r) => r.kind === "figure").length, ambiguous: rows.filter((r) => r.kind === "ambiguous").length, nothing: rows.filter((r) => r.kind === "nothing").length };
  let verdict;
  if (underpowered) verdict = "UNDERPOWERED";
  else if (tally.figure === rows.length) verdict = "SEPARABLE";
  else verdict = "NOT SEPARABLE";
  return { name, distinct, total: tokens.length, verdict, tally, cues: rows.map((r) => r.cue), rows, underpoweredReason: underpowered ? `only ${distinct} distinct tokens (<5) — tested all of them` : null };
}

console.log("=== Null-band separability (draws=200 per cue) ===");
const lensSep = separabilityTest("LENS", lensTokens, { isNatural: true });
const paradigmSep = separabilityTest("PARADIGM", paradigmTokens, { isNatural: false, decode: paradigmDecode });
const atmosphereSep = atmosphereGap
  ? { name: "ATMOSPHERE", verdict: "UNDERPOWERED", reason: `organ declined: ${JSON.stringify(atmosphereGap)}`, cues: [], rows: [] }
  : separabilityTest("ATMOSPHERE", atmosphereTokenStream, { isNatural: false, decode: atmoDecode });

console.log("\n=== VERDICTS ===");
for (const s of [lensSep, paradigmSep, atmosphereSep]) {
  console.log(`${s.name}: ${s.verdict}${s.tally ? `  (figure=${s.tally.figure} ambiguous=${s.tally.ambiguous} nothing=${s.tally.nothing} of ${s.cues.length})` : ""}${s.underpoweredReason ? `  — ${s.underpoweredReason}` : ""}${s.reason ? `  — ${s.reason}` : ""}`);
}

// -------------------------------------------------------------------------
// SUPPLEMENTARY, disclosed as exactly that: not the declared 5-cue test the
// task asked for (which stands above, untouched), but a check on whether
// that 5-cue sample (necessarily the most FREQUENT tokens, since that is
// the declared, non-cherry-picked selection rule) might be pessimistic
// relative to the vocabulary as a whole. Every distinct token is tried
// once, exhaustively — this can only ADD evidence, never substitute for the
// primary verdict above, and is reported separately for exactly that reason.
function exhaustiveCheck(name, tokens, { isNatural, decode = null } = {}) {
  const freq = frequency(tokens);
  if (!tokens.length || freq.length < 2) return { name, distinct: freq.length, figure: 0, ambiguous: 0, nothing: 0, figures: [] };
  const field = new Field();
  for (const t of tokens) field.admit(t, {});
  let figure = 0, ambiguous = 0, nothing = 0;
  const figures = [];
  for (const [cue] of freq) {
    const n = wordCountOf(cue, isNatural);
    const against = field.recallAgainstNull(cue, { draws: DRAWS });
    if (against.kind === "figure") { figure++; figures.push(decode?.get(cue) ?? cue); }
    else if (against.kind === "ambiguous") ambiguous++;
    else nothing++;
  }
  return { name, distinct: freq.length, figure, ambiguous, nothing, figures };
}

console.log("\n=== SUPPLEMENTARY: every distinct token tried once (not the declared test) ===");
const lensExhaustive = exhaustiveCheck("LENS", lensTokens, { isNatural: true });
const paradigmExhaustive = exhaustiveCheck("PARADIGM", paradigmTokens, { isNatural: false, decode: paradigmDecode });
const atmosphereExhaustive = atmosphereGap ? { name: "ATMOSPHERE", distinct: 0, figure: 0, ambiguous: 0, nothing: 0, figures: [] } : exhaustiveCheck("ATMOSPHERE", atmosphereTokenStream, { isNatural: false, decode: atmoDecode });
for (const e of [lensExhaustive, paradigmExhaustive, atmosphereExhaustive]) {
  console.log(`${e.name}: ${e.figure}/${e.distinct} distinct tokens clear the band as "figure" (${e.figures.length ? e.figures.join(", ") : "none"})`);
}

fs.writeFileSync(
  path.join(HERE, "results", "shape-null-band.json"),
  JSON.stringify(
    {
      chapter: CH,
      atmosphereRegime: ATMOSPHERE_REGIME,
      chunkWords: CHUNK_WORDS,
      minGround: GROUND_FLOOR_DIFFERENCE(ATMOSPHERE_REGIME.window),
      vocabularies: {
        lens: { total: lensReport.total, distinct: lensReport.distinct, top5: lensReport.freq.slice(0, 5) },
        paradigm: { total: paradigmReport.total, distinct: paradigmReport.distinct, top5: paradigmReport.freq.slice(0, 5).map(([t, n]) => [paradigmDecode.get(t) ?? t, n]) },
        atmosphere: atmosphereGap
          ? { gap: atmosphereGap }
          : { total: atmosphereReport.total, distinct: atmosphereReport.distinct, top5: atmosphereReport.freq.slice(0, 5).map(([t, n]) => [atmoDecode.get(t) ?? t, n]) },
      },
      separability: { lens: lensSep, paradigm: paradigmSep, atmosphere: atmosphereSep },
      supplementaryExhaustiveCheck: { lens: lensExhaustive, paradigm: paradigmExhaustive, atmosphere: atmosphereExhaustive },
    },
    null,
    1
  )
);
console.log(`\n-> results/shape-null-band.json`);
