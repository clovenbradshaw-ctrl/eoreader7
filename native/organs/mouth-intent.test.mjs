// mouth-intent.test.mjs — real, live parser tests for mouth-intent.js's
// structural intent detector (built 2026-09-26 to replace Gary's keyword
// regex, which missed this session's own real prohibition — "is NOT
// acceptable even if correct" matches no fixed phrase in the old list — and
// would have false-flagged real domain facts in this repo's own
// lang-competency.js task specs).
//
// Every case here was run against the real production parser
// (native/priors/parser-eng-ewt.json) before being pinned — nothing is
// asserted from a hand-typed guess at what the parser would say.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEotParser } from "../the-fold/eot-notation.js";
import { garyIntentCheck } from "./mouth-intent.js";
import { TASKS } from "./lang-competency.js";

let parser;
test.before(async () => { parser = await loadEotParser(); });

function check(text) {
  return garyIntentCheck(parser.parse(text, "probe"));
}

test("mouth-intent: eight curated sentences, structural rules only", async (t) => {
  if (!parser.ok) return t.skip(parser.reason);
  const cases = [
    ["Merging and concatenating is not acceptable even if correct.", false],
    ["A name never contains an equals sign.", true],
    ["An item is never paired with itself.", true],
    ["Do not use JSON in your reply.", false],
    ["The reply contains no JSON.", true],
    ["Leading, trailing and repeated spaces do not create extra words.", true],
    ["A closer does not match the most recent unclosed opener.", true],
    ["Never use recursion here.", false],
  ];
  for (const [text, wantOk] of cases) {
    const { ok } = check(text);
    assert.equal(ok, wantOk, `${JSON.stringify(text)}: expected ok=${wantOk}`);
  }
});

test("mouth-intent: this session's own real violation is caught, its Gary-reframed replacement is clean", async (t) => {
  if (!parser.ok) return t.skip(parser.reason);
  const OLD = `Implement findMedianSortedArrays(nums1, nums2) in solution.js. It returns the median of two sorted arrays of numbers, which may have different lengths (including zero, but not both empty). Your solution MUST run in O(log(min(m, n))) time via binary search over the partition point of the smaller array -- merging/concatenating and sorting is NOT acceptable even if correct. Handle every edge case: an empty array, duplicates, negative numbers, and both even and odd combined length (average the two middle elements when even).`;
  const NEW = `Implement findMedianSortedArrays(nums1, nums2) in solution.js. It returns the median of two sorted arrays of numbers, which may have different lengths (including zero). A binary search over the partition point of the smaller array finds the median in O(log(min(m, n))) time. Every edge case is handled: an empty array, duplicates, negative numbers, and both even and odd combined length (the average of the two middle elements when even).`;
  assert.equal(check(OLD).ok, false, "the real prohibition survives even beside garbled math notation (O(log(min(m, n))) derails this prose parser's tokenizer)");
  assert.equal(check(NEW).ok, true);
});

test("mouth-intent: 25 of 27 real lang-competency.js task specs read clean; two disclosed exceptions", async (t) => {
  if (!parser.ok) return t.skip(parser.reason);
  // count_filled_fields: "return how many of the fields are not empty" -- a
  // WH-clause fronted as the object of "return" leaves "empty" with no
  // direct nsubj in this parser's own analysis (measured, not assumed: the
  // WH-word "many" attaches as obj of "return", not nsubj of "empty").
  // Genuine syntactic ambiguity a subject-presence rule cannot resolve
  // without more than dependency structure; not silently exempted.
  const KNOWN_EXCEPTIONS = new Set(["count_filled_fields"]);
  let flaggedUnexpected = [];
  for (const t of TASKS) {
    const { ok } = check(t.spec);
    if (!ok && !KNOWN_EXCEPTIONS.has(t.id)) flaggedUnexpected.push(t.id);
  }
  assert.deepEqual(flaggedUnexpected, [], "no NEW false positives beyond the disclosed exception");
});

test("mouth-intent: two known non-prose-artifact false positives, named rather than hidden", async (t) => {
  if (!parser.ok) return t.skip(parser.reason);
  // code-loop.js's PROPOSAL_FORMAT worked example is a run-on sentence whose
  // literal format labels "FIND"/"ADD" parse as bare imperative verbs
  // (VerbForm=Inf, no subject) when read as plain prose stripped of their
  // <<<>>> markers -- the parser was trained on ordinary web-text prose,
  // never on text mixing in code-format labels, and mis-derives a shared-
  // subject chain through the wreckage. A real, disclosed limit of running a
  // prose parser over non-prose text, not a flaw in the structural rule
  // itself (which resolves every clean-prose case above correctly).
  const { PROPOSAL_FORMAT } = await import("../the-fold/code-loop.js");
  assert.equal(check(PROPOSAL_FORMAT).ok, false, "known false positive: worked-example labels misparse as bare verbs");

  // generationBriefFor("python") lists Python's 35 reserved words, including
  // the literal token "not" -- mentioned as a keyword, never used as an
  // English negator, but this parser has no mention/use distinction and
  // reads the enumeration as if it were a sentence.
  const { generationBriefFor } = await import("../adapters/code/language.js");
  assert.equal(check(generationBriefFor("python")).ok, false, "known false positive: 'not' quoted as a Python keyword, not used as English negation");
});
