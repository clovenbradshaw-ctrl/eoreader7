// dark-referent-cluster-test.mjs — does the-fold's relative.js Field cluster
// a DARK REFERENT's scattered, never-admitted mentions together, more than
// chance would predict?
//
// A "dark referent" (named this session, not yet anywhere else in this
// codebase) is a being that clears NEITHER of surfaces.js's two admission
// gates — the capitalisation test (`CAP_TOKEN`, a lowercase definite
// description like "the cook" never starts a candidate run) or, for a
// being that IS capitalised, `sentencesFloorOf`'s recurrence floor — and so
// leaves ZERO trace anywhere on the ledger: no `DEF.admit` event, no
// `ambiguous_surface` gap, no `role:"void"` line (void is for a PRONOUN
// that failed to bind; a dark referent is nominal, never even a candidate).
// Confirmed real and distinct from both existing gap types by direct
// research this session (grep across all 12 ledgers' entity rosters, void
// lines, and refless proposition ends): "the jury" (addressed by name,
// writes a verdict, ch11+ch12), "the cook" (ch6/ch8/ch11), "the puppy"/"an
// enormous puppy" (ch4), "the hedgehog" (ch8) — none has a referent id
// anywhere in the book.
//
// THE QUESTION THIS FILE ANSWERS, kept separate from field-lens-
// improvement-test.mjs's own (which asks: given a KNOWN referent's name,
// does Field.recall(name) surface gold-verified unresolved mentions of it
// better than chance?). Here there is no name to cue with — that is the
// whole point of a dark referent. So the question is narrower and more
// basic: do SEVERAL scattered mentions of the SAME dark referent, cued only
// by their OWN sentence text (never a name), rank each other more highly
// under Field.recall than an unrelated random sentence from the same
// chapter would? If yes, resemblance alone carries a real clustering
// signal even with no name to search for. If no, Field's spread-activation
// resemblance has nothing to offer this problem and a different mechanism
// would be needed.
//
// GROUND TRUTH, HAND-IDENTIFIED, NOT ALGORITHMIC. Which sentences are
// "siblings" (mentions of the same dark referent) is asserted here by hand,
// from a direct mechanical scan of the ledgers (grep for the candidate
// text against unresolved proposition ends, mapped to the containing
// sentence) — this file tests whether Field can FIND that grouping, it
// does not itself discover it. Four specimens, each with >=2 independent
// sibling sentences inside ONE chapter (Field is built per-chapter, same
// as field-lens-improvement-test.mjs, so cross-chapter recurrence of "the
// jury" or "the cook" is out of scope for this specific test):
//   ch4  puppy:    2 siblings ("an enormous puppy" / "the puppy" x2)
//   ch8  hedgehog: 3 siblings
//   ch11 jury:     2 siblings
//   ch12 jury:     2 siblings (the second via "the jurymen")
//
// CONTROL, following this project's own "never a hand-set threshold, always
// a real null" discipline (CLAUDE.md; field-lens-improvement-test.mjs's own
// random-word draws). field-lens-improvement-test.mjs's control draws a
// random single WORD, because its cue is a name (one or two words). Here
// the cue is a whole SENTENCE, so the matched control is 15 random WHOLE
// SENTENCES from the same chapter (excluding the siblings themselves) —
// drawn the same way `nullBand` draws its own null, adapted to the cue's
// actual shape rather than reused unmodified where it would no longer be
// a fair comparison (field-api research, this session: "a mismatch between
// the two null mechanisms" was already found in the existing script's own
// word-vs-nullBand-token-count control; this file does not repeat it).
//
// usage: node dark-referent-cluster-test.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { Field } = await import(path.join(HERE, "..", "..", "..", "..", "the-fold", "relative.js"));

const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const raw = fs.readFileSync(BOOK, "utf8");
const heads = [...raw.matchAll(/^CHAPTER ([IVXLC]+)\.\s*\r?\n([^\r\n]*)\r?\n/gm)];

// Same flat-sentence construction field-lens-improvement-test.mjs already
// uses and already validated against this exact corpus — not re-derived.
function chapterSentences(ch) {
  const lo = heads[ch - 1].index + heads[ch - 1][0].length;
  const hi = ch < heads.length ? heads[ch].index : raw.length;
  const flat = raw.slice(lo, hi).split(/\s+/).join(" ").trim();
  return flat.split(/(?<=[.!?”])\s+/).map((s) => s.trim()).filter((s) => s.length > 4);
}

// Each sibling named by a short, unique anchor substring (whitespace-
// flattened, matching how chapterSentences itself flattens) found by hand
// against the raw sentence text confirmed at each ledger address above.
const SPECIMENS = [
  { name: "puppy (ch4)", chapter: 4, anchors: [
    "An enormous puppy was looking down at her",
    "held it out to the puppy; whereupon the puppy jumped into the air off",
  ] },
  { name: "hedgehog (ch8)", chapter: 8, anchors: [
    "going to give the hedgehog a blow with its head",
    "fighting for the hedgehogs; and in a very short time",
    "The hedgehog was engaged in a fight with another hedgehog",
  ] },
  // chapterSentences' own split regex breaks at EVERY closing curly quote,
  // not only a sentence-final one — a dialogue-attribution tail like
  // "the King said to the jury." survives as its own fragment (confirmed
  // by direct inspection of the split output), while the quoted dialogue
  // before it becomes a separate node. Anchored to the real fragments, not
  // to the full quoted sentence.
  { name: "jury (ch11)", chapter: 11, anchors: [
    "the King said to the jury.",
    "the King said to the jury, and the jury eagerly wrote down all three dates",
  ] },
  { name: "jury (ch12)", chapter: 12, anchors: [
    "he said to the jury, in a low, trembling voice.",
    "the King said, turning to the jury.",
  ] },
];

const TOPK_FRACTION = 0.1;
const RANDOM_DRAWS = 15;

let totalPairs = 0, cueHits = 0, cueSigHits = 0, controlHitsSum = 0;
const rows = [];

for (const spec of SPECIMENS) {
  const sentences = chapterSentences(spec.chapter);
  const field = new Field();
  for (const s of sentences) field.admit(s, {});
  const topK = Math.max(3, Math.round(field.size * TOPK_FRACTION));

  const siblingIdx = spec.anchors.map((a) => sentences.findIndex((s) => s.includes(a)));
  if (siblingIdx.some((i) => i < 0)) {
    console.log(`${spec.name}: SKIPPED — an anchor did not match any split sentence (indices ${JSON.stringify(siblingIdx)})`);
    continue;
  }
  const siblingSet = new Set(siblingIdx);

  let hits = 0, sigHits = 0, pairs = 0;
  for (const i of siblingIdx) {
    const cueText = sentences[i];
    const ranked = field.recall(cueText);
    const band = field.nullBand(cueText.split(/\s+/).length, { draws: 100 });
    const topIdx = ranked.slice(0, topK).map((r) => sentences.indexOf(r.node.text));
    for (const j of siblingIdx) {
      if (i === j) continue;
      pairs += 1;
      if (topIdx.includes(j)) {
        hits += 1;
        const rankOfJ = ranked.findIndex((r) => r.node.text === sentences[j]);
        if (rankOfJ >= 0 && ranked[rankOfJ].activation > band.hi) sigHits += 1;
      }
    }
  }

  // Control: random WHOLE SENTENCES (not words), excluding the siblings.
  const nonSiblingIdx = sentences.map((_, i) => i).filter((i) => !siblingSet.has(i));
  let controlPairHits = 0, controlDraws = 0;
  for (let d = 0; d < RANDOM_DRAWS; d++) {
    const ri = nonSiblingIdx[Math.floor(Math.random() * nonSiblingIdx.length)];
    const ranked = field.recall(sentences[ri]);
    const topIdx = ranked.slice(0, topK).map((r) => sentences.indexOf(r.node.text));
    for (const j of siblingIdx) { controlDraws += 1; if (topIdx.includes(j)) controlPairHits += 1; }
  }
  const controlRate = controlPairHits / controlDraws;
  const controlExpected = controlRate * pairs;

  totalPairs += pairs; cueHits += hits; cueSigHits += sigHits; controlHitsSum += controlExpected;
  rows.push({ specimen: spec.name, fieldSize: field.size, topK, siblingPairs: pairs, cueHits: hits, cueSigHits: sigHits, controlRate: +controlRate.toFixed(3), controlExpected: +controlExpected.toFixed(2) });
  console.log(`${spec.name}: ${pairs} sibling-ordered-pairs, cue hits ${hits} (${sigHits} above null band) | control rate ${(100 * controlRate).toFixed(1)}% -> expected ${controlExpected.toFixed(2)} hits by chance`);
}

console.log(`\n=== TOTALS ===`);
console.log(`sibling-ordered-pairs tested: ${totalPairs}`);
console.log(`recovered by the real sibling cue: ${cueHits} (${totalPairs ? (100 * cueHits / totalPairs).toFixed(1) : "n/a"}%)`);
console.log(`...of which cleared the null band: ${cueSigHits}`);
console.log(`expected by the random-sentence control: ${controlHitsSum.toFixed(2)} (${totalPairs ? (100 * controlHitsSum / totalPairs).toFixed(1) : "n/a"}%)`);
console.log(cueHits > controlHitsSum ? "REAL SIBLING CUE BEATS THE RANDOM-SENTENCE CONTROL" : "REAL SIBLING CUE DOES NOT CLEARLY BEAT THE CONTROL");

fs.writeFileSync(path.join(HERE, "results", "dark-referent-cluster-test.json"), JSON.stringify({ rows, totals: { totalPairs, cueHits, cueSigHits, controlHitsSum } }, null, 1));
