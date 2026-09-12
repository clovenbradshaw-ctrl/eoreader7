import { test } from "node:test";
import assert from "node:assert/strict";
import { witnessSentences, endsFor, settledBy, rowFor } from "./witness-sentences.js";
import * as T from "../../../the-fold/testimony.js";
import { splitSentences } from "../adapters/text/spans.js";

// The live specimen (2026-09-02): one answer, two sentences — a TRUE
// paraphrase the relation tier could not bind, and a FALSE sentence whose
// verb the material never uses. The witness is a fake that answers the way
// the real select protocol is asked: by INDEX into the candidates shown.
const passages = [
  { ref: "p1", text: "After the Battle of Smolensk, the Tsar replaced the unpopular Barclay de Tolly with Mikhail Kutuzov, who on 18 August took over the army. Kutuzov strengthened the line with earthworks." },
  { ref: "p2", text: "After the Battle of Borodino, Napoleon remained on the battlefield with his army; the Imperial Russian forces retreated southwards. What followed was the French occupation of Moscow." },
];
const trueS = "Mikhail Kutuzov replaced Barclay de Tolly as commander.";
const falseS = "After the Battle of Borodino, the Russian army continued to fight.";
const claims = [
  { sentence: trueS, end1: "Mikhail Kutuzov", label: "replaced", end2: "Barclay de Tolly", verdict: "unbound" },
  { sentence: falseS, end1: "Russian army", label: "continued", end2: "to fight", verdict: "unheard" },
];
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };
// a witness that points at a candidate only when one literally names the replacement — and never at the twin
const selectAsk = async (messages) => {
  const user = messages.find((m) => m.role === "user").content;
  const claim = (user.match(/^Claim: "([\s\S]*?)"/) ?? [])[1] ?? "";
  const cands = [...user.matchAll(/^(\d+)\. (.*)$/gm)];
  // a DISCRIMINATING witness: yes only to the true sentence itself, pointing
  // at the candidate that names the replacement; the arm's twin gets no
  const hit = claim === trueS ? cands.find(([, , c]) => /replaced .*Barclay.*Kutuzov/.test(c)) : null;
  return hit ? { stated: "yes", sentence: Number(hit[1]) } : { stated: "no", sentence: 0 };
};
const ask = async () => ({ verdict: null, refused: "no-testimony" });

test("a true paraphrase the relation tier left unbound is witnessed as stated, by a passage's own sentence", async () => {
  const { rows, asks } = await witnessSentences([trueS], claims, passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 4 });
  if (rows[0].witness !== "states") console.log("ROW:", JSON.stringify(rows[0]));
  assert.equal(rows[0].witness, "states");
  assert.match(rows[0].decider ?? "", /replaced the unpopular Barclay de Tolly with Mikhail Kutuzov/);
  assert.ok(asks >= 1);
});
test("a false sentence nothing states is refused — marked, never convicted", async () => {
  const { rows } = await witnessSentences([falseS], claims, passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 4 });
  assert.equal(rows[0].witness, "refused");
  assert.ok(rows[0].why);
});
test("a sentence the relation tier already bound is skipped without an ask; the budget is declared and holds", async () => {
  const bound = [{ ...claims[0], verdict: "bound" }];
  const { rows, asks } = await witnessSentences([trueS, falseS], bound.concat(claims[1]), passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 0 });
  assert.equal(rows[0].witness, "skipped"); assert.equal(rows[1].witness, "skipped"); assert.equal(asks, 0);
  await assert.rejects(witnessSentences([trueS], claims, passages, { ask, selectAsk, splitSentences, testimony }), /maxAsks is declared/);
});
test("ends come from the claim when there is one, else from the sentence's own words — never invented", () => {
  assert.equal(endsFor(trueS, claims).from, "claim");
  assert.equal(endsFor("Moscow burned for days afterwards.", []).from, "longest-words");
  assert.equal(endsFor("It was.", []), null);
  assert.equal(settledBy(trueS, [{ ...claims[0], verdict: "bound" }]), true);
});

// BUG (2026-09-08): the fallback used to sort a sentence's own content words
// by raw length, so a denial's own vocabulary ("mentioned", "sources") beat
// the actual topic word ("goats") whenever it happened to be longer —
// guaranteeing the witness a zero-candidate search over a source that
// states the fact verbatim. Fixed by preferring words the source itself
// actually uses; only when nothing overlaps does length-only ranking run.
test("the fallback prefers a word the source actually uses over a merely longer one, and a single shared word anchors both ends", () => {
  const src = "Did you know Google had hundreds of live goats to cut the grass in the past?";
  const e = endsFor("Nope, goats were not mentioned in the sources.", [], src);
  assert.equal(e.end1, "goats");
  assert.equal(e.end2, "goats");
});
test("two words shared with the source win outright over the sentence's own longer, unshared vocabulary", () => {
  const src = "What did you think about the Disney movie Frozen?";
  const e = endsFor("The sources do not mention a Disney movie.", [], src);
  assert.equal(new Set([e.end1, e.end2]).size, 2);
  assert.ok([e.end1, e.end2].every((w) => ["disney", "movie"].includes(w)));
});
test("no source text, or no word shared with it, keeps the old length-only fallback byte-identical", () => {
  const noOverlap = endsFor("Nope, goats were not mentioned in the sources.", [], "An entirely unrelated passage about something else.");
  assert.deepEqual(noOverlap, endsFor("Nope, goats were not mentioned in the sources.", []));
});

// BUG, found driving the real, fixed app live (2026-09-08): two words can
// each genuinely be in the source and STILL fail statingCandidates' AND-gate
// if the source never states them in the SAME sentence. A real dialogue
// ("What about them?" ... "Did you know Google had hundreds of live goats
// ...") makes "about" tie "goats" for longest present word, and no sentence
// carries both — so the presence-only fix above still searched for a pair
// nothing states together. Handing the real segmenter in fixes it: a
// co-occurring pair is preferred, and when none exists the single word that
// IS in the stating sentence anchors both ends instead of a doomed pair.
test("two present words that never co-occur in one source sentence do not out-rank a single word that does — the anchor is checked with the real segmenter, not merely present", () => {
  const src = "Hey, did you see the new landscaping crew at the Google campus? No, what about them? Did you know Google had hundreds of live goats to cut the grass in the past? Really? That sounds hilarious. What did you think about the Disney movie Frozen?";
  const sentence = "They did not mention anything about goats.";
  const withoutSegmenter = endsFor(sentence, [], src);
  assert.deepEqual(new Set([withoutSegmenter.end1, withoutSegmenter.end2]), new Set(["about", "goats"]), "control: presence-then-length alone still picks the non-co-occurring pair ('about' occurs twice, tying 'goats' on length)");
  const withSegmenter = endsFor(sentence, [], src, splitSentences);
  assert.equal(withSegmenter.end1, "goats");
  assert.equal(withSegmenter.end2, "goats");
});
test("witnessSentences hands the joined passages to endsFor, so the anchor fix applies through the real call, not only when called directly", async () => {
  const goatsPassages = [{ ref: "p1", text: "Did you know Google had hundreds of live goats to cut the grass in the past?" }];
  const goatsSentence = "Nope, goats were not mentioned in the sources.";
  // a DISCRIMINATING witness (mirrors selectAsk above): "yes" to a candidate
  // naming goats only when asked about the real claim, "no" for its
  // sibling-swapped twin — so a real "states" verdict requires the pair to
  // actually be told apart, not just the same candidate answered both ways.
  const selectAsk2 = async (messages) => {
    const user = messages.find((m) => m.role === "user").content;
    const claim = (user.match(/^Claim: "([\s\S]*?)"/) ?? [])[1] ?? "";
    const cands = [...user.matchAll(/^(\d+)\. (.*)$/gm)];
    const hit = claim === goatsSentence ? cands.find(([, , c]) => /goats/.test(c)) : null;
    return hit ? { stated: "yes", sentence: Number(hit[1]) } : { stated: "no", sentence: 0 };
  };
  const { rows } = await witnessSentences([goatsSentence], [], goatsPassages, { ask, selectAsk: selectAsk2, splitSentences, testimony, maxAsks: 4 });
  assert.equal(rows[0].witness, "states");
});

test("only the model's own 'no' is a refusal; a protocol non-verdict is a typed skip that draws nothing", () => {
  assert.equal(rowFor({ verdict: "states", because: "x" }).witness, "states");
  assert.equal(rowFor({ refused: "no-testimony", via: "select" }).witness, "refused");
  for (const r of ["decider_unrelated", "unarmed-select", "indiscriminate", "no-slice", "uncontained"]) assert.equal(rowFor({ refused: r }).witness, "skipped", r);
});

test("GFP Pass 41: a sentence the expectation already authors (matched) costs NOTHING to check — skipped, no ask spent; a novel or contradicted one is still witnessed", async () => {
  const matched = new Set([trueS]);
  const { rows, asks } = await witnessSentences([trueS, falseS], claims, passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 4, matched });
  assert.equal(rows[0].witness, "skipped", "the matched sentence is not asked — the expectation already carried its address");
  assert.match(rows[0].why, /already expected/);
  assert.equal(rows[1].witness, "refused", "the novel sentence is still witnessed — error spends the budget");
  assert.ok(asks >= 1, "the error claim was asked");
  // control: without the matched set, the true sentence IS asked
  const { asks: asks2 } = await witnessSentences([trueS], claims, passages, { ask, selectAsk, splitSentences, testimony, maxAsks: 4 });
  assert.ok(asks2 >= 1, "no matched set → the sentence is witnessed as before");
  // contradicted claims are never in the matched set (errorOf keeps them apart) — they are still asked
  const matchedContradicted = new Set();
  const c = witnessSentences;
  assert.ok(settledBy(falseS, [{ sentence: falseS, verdict: "contradicted" }], matchedContradicted) === false, "a contradicted claim is never 'already expected'");
});
