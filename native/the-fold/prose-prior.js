// prose-prior.js — a real, measured floor for "does this read as English
// prose," using the same medium-blind sedimented-prior machinery this
// project already proved on Bach (kernel/continuation.js;
// eval/the-fold/midi-continuation.mjs, 2026-09-02: a prior sedimented from
// what was heard predicts real continuation far better than a shuffled
// control, judged prequentially, in bits). No hand-typed theory of what
// code looks like — a word-level order-2 prior sedimented from a real prose
// corpus predicts real, unseen English far better than it predicts code,
// because code's own identifiers are almost entirely outside its
// vocabulary. Measured, not assumed: see this file's own ceiling below.
//
// Built 2026-09-25 for eot-draft.js's code-vs-prose block filter, whose
// existing signal (hard-meaning.mjs's garbled_token) needs >= 3 symbol-heavy
// tokens to fire and so stays silent on short code — a COUNT, blind to a
// short block. bitsPerWord is a RATE: it needs no minimum length to be
// honest, which is the whole reason to reach for it here.
import fs from "node:fs";
import { sedimentPrior, scorePrequential } from "../kernel/continuation.js";

// The same reference corpus eval/the-fold/midi-continuation.mjs already
// uses as a real prose stream (its "structural analogy" arm) — reused here,
// never duplicated. Overridable so a caller not on this machine (the
// midi-continuation eval's own disclosed case) can point at any real prose
// file, or so a caller with the document's own trusted prose wants that
// instead of a fresh read.
const CORPUS_PATH = process.env.ER7_PROSE_CORPUS ?? new URL("../../../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt", import.meta.url).pathname;
const ORDER = 2;
const HELD_OUT_FRACTION = 0.2;

const tokenize = (text) => String(text ?? "").toLowerCase().match(/[a-z']+/g) ?? [];

// A SHORT TEXT IS SCORED COLD: scorePrequential builds each word's context
// only from the words already inside the SAME scored sequence (never from
// outside it), so a 10-word candidate spends most of its length at low
// grain while a single long held-out block spends almost none of its
// length there. Measured live 2026-09-25: comparing a short candidate
// against one 33,000-word held-out block's average bits/word convicted
// real prose alongside real code — a length mismatch, not a signal
// failure. The fix is a LENGTH-MATCHED ceiling: sample many held-out
// windows of the SAME length as the candidate, cold-started the same way,
// and compare like for like.
const SAMPLE_WINDOWS = 150;
const lcgLocal = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

let cached; // undefined = not tried yet; false = tried, corpus absent; object = ready
/**
 * proseFloor() → { prior, heldOut, corpus, trainWords, heldOutWords } | null.
 * null when the corpus is not on this machine — disclosed by returning
 * null, never by faking a floor. Computed once per process (module cache);
 * the corpus does not change mid-run. `heldOut` is the raw held-out word
 * array; ceilings are measured per-length from it, not once for everything.
 */
export function proseFloor() {
  if (cached !== undefined) return cached || null;
  let text;
  try { text = fs.readFileSync(CORPUS_PATH, "utf8"); }
  catch { cached = false; return null; }
  const words = tokenize(text);
  const split = Math.floor(words.length * (1 - HELD_OUT_FRACTION));
  const trainPrior = sedimentPrior(words.slice(0, split), { order: ORDER, giver: "prose-prior:train-80pct" });
  const heldOut = words.slice(split);
  cached = { prior: trainPrior, heldOut, corpus: CORPUS_PATH, trainWords: split, heldOutWords: heldOut.length };
  return cached;
}

/** bitsPerWord(text, prior) → number | null (null when no floor is available). */
export function bitsPerWord(text, prior = proseFloor()?.prior) {
  if (!prior) return null;
  const toks = tokenize(text);
  if (!toks.length) return null;
  return scorePrequential(prior, toks, {}).bitsPerEvent;
}

/**
 * lengthMatchedCeiling(wordCount) → number | null. The measured bits/word
 * ceiling for a genuine, unseen, cold-started English passage of exactly
 * this length: SAMPLE_WINDOWS windows of `wordCount` words are drawn from
 * the held-out corpus (never the training prior's own words), each scored
 * cold against the SAME training prior a candidate would be scored
 * against, and the maximum of those real scores is the ceiling — the
 * worst a genuine passage of this length actually cost, not a guess.
 */
export function lengthMatchedCeiling(wordCount) {
  const floor = proseFloor();
  if (!floor || wordCount < 1 || floor.heldOutWords < wordCount) return null;
  const rng = lcgLocal(20260925 + wordCount);
  let worst = -Infinity;
  for (let i = 0; i < SAMPLE_WINDOWS; i += 1) {
    const at = Math.floor(rng() * (floor.heldOutWords - wordCount + 1));
    const window = floor.heldOut.slice(at, at + wordCount);
    const b = scorePrequential(floor.prior, window, {}).bitsPerEvent;
    if (b > worst) worst = b;
  }
  return worst;
}

/**
 * looksLikeCode(text) → boolean | null. true when this text's own bits/word
 * exceeds the LENGTH-MATCHED ceiling — real English passages of the same
 * length, scored the same cold way, still read at or under that cost; code
 * identifiers mostly do not. null when no floor is available (the corpus
 * is not on this machine) or the text is too short to sample a ceiling
 * for: the caller must fall back to its own signal, never treat null as
 * "not code."
 */
export function looksLikeCode(text) {
  const floor = proseFloor();
  if (!floor) return null;
  const toks = tokenize(text);
  if (!toks.length) return null;
  const b = bitsPerWord(text, floor.prior);
  const ceiling = lengthMatchedCeiling(toks.length);
  return b == null || ceiling == null ? null : b > ceiling;
}
