// void-spec-falsify.test.mjs — THE FIRST DEDICATED TEST OF void-spec.js
// (2026-09-21). The user, continuing the "how confident are we of the prior
// steps" audit onto the void-definition layer itself: "we need to know what
// the shape is of things that we think would satisfy. 'write a sonnet' /
// 'write a poem' / 'rite @ whiteppr' / 'wright an essay' all need to be
// deciphered as pointing at a referent of a type of thing that has a shape."
//
// void-spec.js had zero dedicated tests before this — only one indirect path
// through pipeline-run-falsify.test.mjs. This locks in what a live probe of
// the user's four examples actually showed (verified against the real
// functions below, not assumed), so the next layer builds on checked ground:
//
//   - topicOf and deriveField (kernel/register.js) already recognize "sonnet"
//     and "poem" as lyric signs, and "essay" as an exposition sign, with NO
//     typo tolerance on the noun itself — a garbled genre-noun ("sonnnet",
//     "eassy") gets exactly the same null as no noun at all.
//   - the verb ("write"/"wright"/"rite") is never inspected by deriveField,
//     so a verb typo is harmless by construction, not by any fuzzy match.
//   - topicOf only strips the verb-and-form scaffolding when an "on/about/of"
//     phrase follows it. A bare form-ask with no stated subject ("write a
//     sonnet") returns the WHOLE ask, verb included, as if the verb+form
//     text were itself the topic — a real, scoped gap in declareVoidSpec's
//     whole.slot, which documents itself as "the ask, less its verb and
//     form" but does not do that stripping in this shape of ask.
import test from "node:test";
import assert from "node:assert/strict";
import { topicOf, askedExtent, declareVoidSpec } from "./void-spec.js";
import { deriveField } from "../kernel/register.js";

test("deriveField already recognizes sonnet and poem as lyric, essay as exposition — no model, no fuzzy match, an exact noun in a fixed table", () => {
  assert.equal(deriveField("write a sonnet").field, "lyric");
  assert.equal(deriveField("write a poem").field, "lyric");
  assert.equal(deriveField("write an essay").field, "exposition");
});

test("a verb typo is harmless because deriveField never inspects the verb, not because it tolerates typos", () => {
  const wright = deriveField("wright an essay");
  assert.equal(wright.field, "exposition");
  assert.equal(wright.noun, "essay");
  // The same noun, same field, same basis text as an untypo'd verb — the
  // function's behavior does not change with the verb at all.
  assert.deepEqual(wright, deriveField("write an essay"));
});

test("REAL GAP, PROVEN NOT ASSUMED: a typo'd genre NOUN gets no fuzzy match — it falls to exactly the same null as no genre-noun at all", () => {
  const typo = deriveField("write a sonnnet");
  assert.equal(typo.field, null);
  assert.equal(typo.noun, null);
  assert.equal(typo.provenance, "staged");
  assert.match(typo.basis, /no registered genre-sign/);
  // The fully garbled ask lands on the identical shape of null — same
  // field/noun/provenance, only the ambient basis text is unaffected by how
  // garbled the ask was (the function does not grade degrees of garbling).
  const garbled = deriveField("rite @ whiteppr");
  assert.equal(garbled.field, null);
  assert.equal(garbled.provenance, "staged");
});

test("this null can also be an honest coverage gap, not only a garbling failure: an intact but unregistered genre noun gets the same null", () => {
  // Checked before asserting: "white paper" was NOT a safe example here —
  // "paper" alone is already a registered exposition noun, so "write a
  // white paper" resolves via that word, not a gap. "manifesto" has no
  // entry in kernel/register.js FIELD_BY_NOUN at all.
  const clean = deriveField("write a manifesto");
  assert.equal(clean.field, null, "manifesto is not a registered genre-noun (kernel/register.js FIELD_BY_NOUN)");
});

test("topicOf strips the verb and form only when an on/about/of phrase names the subject", () => {
  assert.equal(topicOf("write an essay on the role of the Cumberland River"), "the role of the Cumberland River");
});

test("REAL GAP, PROVEN NOT ASSUMED: topicOf returns the WHOLE ask, verb included, for a bare form-request with no stated subject", () => {
  // declareVoidSpec's whole.slot documents itself (void-spec.js line ~106)
  // as "the ask, less its verb and form" — that stripping does not happen
  // here. topicOf's only strip path requires on/about/of; with none, it
  // falls to the raw string minus trailing punctuation, which for these
  // asks is the entire input.
  assert.equal(topicOf("write a sonnet"), "write a sonnet");
  assert.equal(topicOf("write a poem"), "write a poem");
  assert.equal(topicOf("wright an essay"), "wright an essay");
  assert.equal(topicOf("write a five-paragraph essay"), "write a five-paragraph essay");
});

test("declareVoidSpec: the field is admitted correctly for a bare form-ask even though the topic (whole.slot) is not stripped", () => {
  const spec = declareVoidSpec({ task: "write a sonnet" });
  assert.equal(spec.field, "lyric");
  assert.equal(spec.levels.whole.admits.value, "lyric");
  // The gap lands specifically in whole.slot, not in field admission.
  assert.equal(spec.levels.whole.slot.value, "write a sonnet");
  assert.equal(spec.levels.whole.slot.basis, "asked");
});

test("askedExtent reads a stated extent and only a stated one", () => {
  assert.deepEqual(askedExtent("write a five-paragraph essay"), { n: 5, unit: "paragraph" });
  assert.equal(askedExtent("write a poem"), null, "no extent is stated, so none is invented");
});
