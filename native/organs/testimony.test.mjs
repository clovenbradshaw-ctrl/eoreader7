// node --test testimony.test.mjs
//
// The witness tier's walls, offline — no model, no network: the witness's
// replies are scripted, because what this module owns is not the reading
// but the DISCIPLINE around it (pointer containment, the sibling arm,
// typed refusals), and every wall is testable with canned testimony.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  WITNESS_SCHEMA,
  WITNESS_SLICE_MAX,
  becauseContained,
  buildWitnessMessages,
  foldTestimony,
  readTestimony,
  siblingSwap,
  witnessSlice,
} from "../organs/index.js";

// The measured specimen, in miniature: a page about the 1960 World Series
// where the claim's vocabulary saturates the bytes but the fact runs the
// other way.
const PAGE = [
  "The 1960 World Series was played between the New York Yankees and the Pittsburgh Pirates.",
  "The Pittsburgh Pirates defeated the New York Yankees in seven games to win the 1960 World Series.",
  "Bill Mazeroski ended game seven with a walk-off home run at Forbes Field.",
  "The town festival was unrelated to baseball, and the bakery on the square sold out by noon.",
].join(" ");

const CLAIM = {
  kind: "name",
  text: "New York Yankees won the 1960 World Series",
  tokens: ["Yankees", "won", "1960"],
  sentence: "The New York Yankees won the 1960 World Series.",
};

test("witnessSlice anchors on the claim's vocabulary and carries the neighbours where the contradiction lives", () => {
  const slice = witnessSlice(CLAIM, PAGE);
  assert.ok(slice, "the claim's tokens anchor in this page");
  assert.ok(slice.includes("Pirates defeated the New York Yankees"), slice);
  assert.ok(!slice.includes("bakery"), "an unanchored sentence far from the claim stays out");
  assert.ok(slice.length <= WITNESS_SLICE_MAX);
});

test("witnessSlice returns null when nothing anchors — a typed absence, never the top of the page", () => {
  assert.equal(witnessSlice(CLAIM, "The festival ran all weekend. The bakery sold out."), null);
  assert.equal(witnessSlice(CLAIM, ""), null);
});

test("readTestimony parses the constrained object, tolerates prose wrapping, refuses anything off the enum", () => {
  assert.deepEqual(readTestimony('{"answer":"no","because":"the Pirates defeated the Yankees"}'), {
    answer: "no",
    because: "the Pirates defeated the Yankees",
  });
  assert.deepEqual(readTestimony('Sure! {"answer":"yes","because":"quoted words"} hope that helps'), {
    answer: "yes",
    because: "quoted words",
  });
  assert.equal(readTestimony('{"answer":"maybe","because":"x"}'), null);
  assert.equal(readTestimony("no object here"), null);
  // The schema the caller hands Ollama is the same closed enum — binary on
  // purpose: the verdict is derived in foldTestimony, never asked as a
  // label (measured 2026-08-19: the three-way form drew the right
  // `because` and the wrong label out of gemma2:2b).
  assert.deepEqual(WITNESS_SCHEMA.properties.answer.enum, ["yes", "no"]);
});

test("becauseContained: the decider must be in the bytes the witness read", () => {
  const slice = "The Pittsburgh Pirates defeated the New York Yankees in seven games.";
  assert.ok(becauseContained("the Pittsburgh Pirates defeated the New York Yankees", slice), "verbatim, case-folded");
  assert.ok(becauseContained("Pirates defeated Yankees", slice), "word-level: every content word present");
  assert.ok(!becauseContained("the Pirates lost the series", slice), "a word the slice never carries refuses");
  assert.ok(!becauseContained("", slice), "an empty decider is no pointer at all");
});

test("siblingSwap draws the sibling from the page's own universe, never the world at large", () => {
  const slice = "The Pittsburgh Pirates defeated the New York Yankees to win the series.";
  const swap = siblingSwap(CLAIM.sentence, slice);
  assert.ok(swap, "both sides offer a name");
  // namesIn keeps a leading capitalized "The" as part of the run — the swap
  // stays well-formed either way; what matters is WHICH referent moved.
  assert.ok(swap.from.includes("New York Yankees"), swap.from);
  assert.ok(swap.to.includes("Pittsburgh Pirates"), swap.to);
  assert.ok(swap.swapped.includes("Pittsburgh Pirates won the 1960 World Series"), swap.swapped);
  assert.ok(!swap.swapped.includes("Yankees won"), swap.swapped);
  // A page offering no name the claim lacks cannot arm the witness.
  assert.equal(siblingSwap(CLAIM.sentence, "the new york yankees appear here uncapitalized only"), null);
  // A claim with no name cannot be swapped either.
  assert.equal(siblingSwap("it rained on tuesday.", slice), null);
});

// ── real-world furniture, measured live (2026-08-19, 25-specimen batch
// eval against real fetched Wikipedia pages) ────────────────────────────

test("siblingSwap never draws a name spanning a raw newline — table/infobox cells glued by plain-text extraction", () => {
  // The exact shape measured live: "Other\nUndecided\nMargin" (an election
  // infobox row) and "Vice President John Adams\nPreceded" (a succession
  // box) both won as the sibling before this wall existed, because
  // NAME_RUN_RE's \s matches a newline exactly as it matches a space.
  const slice =
    "The New York Yankees played the Pittsburgh Pirates in the 1960 World Series.\n" +
    "Other\nUndecided\nMargin\n10%\n5%\n2%";
  const swap = siblingSwap("The New York Yankees won the 1960 World Series.", slice);
  // "Pittsburgh Pirates" is the only clean, real candidate here; the
  // newline-glued table fragment must never be chosen even though nothing
  // else competes with it on raw length.
  assert.ok(swap, JSON.stringify(swap));
  assert.match(swap.to, /Pittsburgh Pirates/);
  assert.doesNotMatch(swap.to, /\n/);
});

test("siblingSwap never lets an image caption's topic-word restatement outscore the sentence that actually states the fact", () => {
  // The exact shape measured live: a portrait literally titled "Writing the
  // Declaration of Independence, 1776" gave "Jean Leon Gerome Ferris" a
  // higher slot-word score than the real answer's own sentence, because
  // unfiltered stopwords ("the", "of") and the caption's bare repetition of
  // "Declaration"/"Independence" beat a sentence phrased more indirectly
  // ("charge Jefferson with writing the document's original draft").
  const slice =
    "Congress appointed the Committee of Five — John Adams, Benjamin Franklin, Thomas Jefferson, " +
    "Robert R. Livingston, and Roger Sherman — to draft the Declaration. " +
    "Adams persuaded the committee to charge Jefferson with writing the document's original draft. " +
    "Writing the Declaration of Independence, 1776, a 1900 portrait by Jean Leon Gerome Ferris depicting Franklin, Adams, and Jefferson working on the Declaration.";
  const swap = siblingSwap("Benjamin Franklin wrote the Declaration of Independence.", slice);
  assert.ok(swap, JSON.stringify(swap));
  assert.match(swap.to, /Jefferson/);
  assert.doesNotMatch(swap.to, /Ferris/);
});

test("siblingSwap tries the witness's own stated reason FIRST, walled to real candidates in the same slice", () => {
  // The exact shape measured live: real.because already named the correct
  // filler ("the Pittsburgh Pirates were matched against the New York
  // Yankees ... and the Pirates won") while the independent slot-scoring
  // heuristic below picked "Major League Baseball" instead — a worse
  // candidate that happened to co-occur with more of the claim's words.
  const slice =
    "The 1960 World Series was the championship of Major League Baseball's 1960 season. " +
    "It matched the National League champion Pittsburgh Pirates against the American League champion New York Yankees.";
  const hint = "The passage states the Pittsburgh Pirates were matched against the New York Yankees, and the Pirates won.";
  const swap = siblingSwap("The New York Yankees won the 1960 World Series.", slice, { hint });
  assert.ok(swap, JSON.stringify(swap));
  assert.match(swap.to, /Pittsburgh Pirates/);
  assert.equal(swap.hinted, true);

  // The wall: a hinted name that is NOT actually a candidate in this slice
  // (e.g. the model's own reasoning names something the page never
  // establishes) must never be taken on the hint's word alone — falls
  // through to the ordinary slot-scored candidates instead.
  const wrongHint = "The passage says the Cincinnati Reds won it.";
  const fallback = siblingSwap("The New York Yankees won the 1960 World Series.", slice, { hint: wrongHint });
  assert.ok(fallback);
  assert.doesNotMatch(fallback.to, /Reds/);
  assert.notEqual(fallback.hinted, true);
});

test("siblingSwap returns null on an all-zero-score tie rather than handing back the longest surviving name as a guess", () => {
  // No sentence here shares any of the claim's real content words with any
  // candidate name — every candidate scores 0, and the old length-only
  // tiebreak would have picked "International Business Machines" by sheer
  // size. Zero evidence must stay zero evidence.
  const slice =
    "International Business Machines opened a new office in Austin. " +
    "Marcus Aurelius Antoninus enjoyed a quiet afternoon reading in the garden.";
  assert.equal(siblingSwap("Bill Gates founded Apple.", slice), null);
});

test("foldTestimony derives the verdict from the pair — never asked as a label; every refusal typed", () => {
  const slice = "The Pittsburgh Pirates defeated the New York Yankees to win the 1960 World Series.";
  const decider = "the Pittsburgh Pirates defeated the New York Yankees to win the 1960 World Series";

  // The Yankees shape end to end: the page does NOT say the claim is true,
  // and DOES say the Pirates-swapped twin is — contradiction DERIVED from
  // slot competition, carrying the page's own words for the sibling.
  const kept = foldTestimony({
    real: { answer: "no", because: "" },
    arm: { answer: "yes", because: decider },
    armed: true,
    host: "en.wikipedia.org",
    slice,
  });
  assert.equal(kept.verdict, "contradicts");
  assert.equal(kept.armed, true);
  assert.equal(kept.because, decider);
  assert.equal(kept.refused, undefined);

  // Claim affirmed, sibling refused: states, armed.
  const states = foldTestimony({
    real: { answer: "yes", because: decider },
    arm: { answer: "no", because: "" },
    armed: true,
    slice,
  });
  assert.equal(states.verdict, "states");
  assert.equal(states.armed, true);

  // A witness that affirms BOTH fillers of one slot testifies about the
  // vocabulary, not the claim — a distinction without a difference, refused.
  const flat = foldTestimony({
    real: { answer: "yes", because: decider },
    arm: { answer: "yes", because: decider },
    armed: true,
    slice,
  });
  assert.equal(flat.refused, "insensitive");

  // Claim affirmed, no sibling on the page to arm with: ships, disclosed unarmed.
  const unarmed = foldTestimony({ real: { answer: "yes", because: decider }, armed: false, slice });
  assert.equal(unarmed.verdict, "states");
  assert.equal(unarmed.armed, false);

  // "No" alone is silence, not contradiction — the page states neither, and
  // the ∅ count already says that; no testimony to show.
  assert.equal(foldTestimony({ real: { answer: "no", because: "" }, armed: false, slice }).refused, "no-testimony");
  assert.equal(
    foldTestimony({ real: { answer: "no", because: "" }, arm: { answer: "no", because: "" }, armed: true, slice })
      .refused,
    "no-testimony",
  );

  // A decider not in the bytes is no testimony, whichever read supplied it.
  assert.equal(
    foldTestimony({ real: { answer: "yes", because: "the Yankees were disqualified" }, armed: false, slice }).refused,
    "uncontained",
  );
  assert.equal(
    foldTestimony({
      real: { answer: "no", because: "" },
      arm: { answer: "yes", because: "the Pirates were awarded the title by forfeit" },
      armed: true,
      slice,
    }).refused,
    "uncontained",
  );

  assert.equal(foldTestimony({ real: null, slice }).refused, "unreadable");
});

test("buildWitnessMessages: material first, one question, prose — no bracket scaffolding", () => {
  const msgs = buildWitnessMessages(CLAIM.sentence, "some passage");
  assert.equal(msgs.length, 2);
  assert.ok(msgs[1].content.startsWith("Passage:"), "the passage precedes the sentence so the claim cannot prime the read");
  assert.ok(msgs[1].content.includes(CLAIM.sentence));
});
