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
//     sonnet") RETURNED the whole ask, verb included, as if the verb+form
//     text were itself the topic — a real, scoped gap in declareVoidSpec's
//     whole.slot. CLOSED 2026-09-22: no subject is null, stated [unmeasured].
//
// 2026-09-22, the gate (user: "we dont want a set of shapes pre-set" … "the
// prompt may say 'again' and that is a referent pointing to something that
// defines the shape"): candidateFormToken reads the form-word off the ask's
// grammar with no table; declareForm resolves it — an anaphor off this
// engine's own ledger (measured), else the received table (declared), else
// unmeasured with the form-word carried for SURF. Tested against real
// output, never assumed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { topicOf, askedExtent, declareVoidSpec, declareForm, candidateFormToken, voidSpecLines } from "./void-spec.js";
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

test("GAP CLOSED (was: topicOf returned the whole ask, verb included): a bare form-request with no stated subject has NO topic, stated as null", () => {
  // Measured 2026-09-21: these four returned the entire ask and the void's
  // slot was declared [asked] "write a sonnet". A form-word with no subject
  // phrase is now null — never the verb and form pretending to be a subject.
  assert.equal(topicOf("write a sonnet"), null);
  assert.equal(topicOf("write a poem"), null);
  assert.equal(topicOf("wright an essay"), null);
  assert.equal(topicOf("write a five-paragraph essay"), null);
  // The subject phrase still comes through when one is stated.
  assert.equal(topicOf("write a five-paragraph essay on the river"), "the river");
});

test("candidateFormToken reads the ask's form-word off its grammar — head noun after verb and article — with no table and no verb match", () => {
  assert.equal(candidateFormToken("write a sonnet"), "sonnet");
  assert.equal(candidateFormToken("write me a poem"), "poem");
  assert.equal(candidateFormToken("wright an essay"), "essay", "the verb is never matched, so its typo cannot matter");
  assert.equal(candidateFormToken("rite @ whiteppr"), "whiteppr", "a letterless token is skipped; the garbled form-word is carried for SURF");
  assert.equal(candidateFormToken("write a five-paragraph essay on the river"), "essay", "the head noun is the LAST word of the form phrase");
  assert.equal(candidateFormToken("please write a short story about a dog"), "story");
  assert.equal(candidateFormToken("write a manifesto"), "manifesto", "an unregistered form-word is still a form-word");
  assert.equal(candidateFormToken("hello"), null, "one word names no form");
  // An anaphor is not a form-word (measured 2026-09-22: "write it again" gave
  // "again", and SURF would have gone looking for "what is a again").
  assert.equal(candidateFormToken("write it again"), null);
  assert.equal(candidateFormToken("give me another one"), null);
  assert.equal(candidateFormToken("write another sonnet like before"), "sonnet", "a form-word beside an anaphor is still read");
});

test("declareForm, the gate: received sign → declared; no sign → unmeasured with the form-word carried; anaphor → measured off this engine's own ledger", () => {
  const sonnet = declareForm("write a sonnet");
  assert.equal(sonnet.field, "lyric");
  assert.equal(sonnet.basis, "declared", "a table entry is a received prior, never a measurement");
  assert.equal(sonnet.token, "sonnet");

  const garbled = declareForm("rite @ whiteppr");
  assert.equal(garbled.field, null);
  assert.equal(garbled.basis, "unmeasured");
  assert.equal(garbled.token, "whiteppr");
  assert.match(garbled.source, /SURF must find what it names/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "form-gate-"));
  try {
    fs.writeFileSync(path.join(dir, "prior-run_1.jsonl"), [
      JSON.stringify({ role: "prompt", text: "write a sonnet about the sea" }),
      JSON.stringify({ role: "void", text: "  admits       [declared] lyric   ← x" }),
    ].join("\n") + "\n");
    const again = declareForm("write it again", { documentsDir: dir });
    assert.equal(again.cue, "again");
    assert.equal(again.field, "lyric", "read off the prior run's ledger");
    assert.equal(again.basis, "measured");
    assert.equal(again.token, "sonnet", "the form-word is the PRIOR ask's, since this ask names none");
    assert.equal(again.register.field.field, "lyric", "the register the pipeline speaks in is the prior piece's");
    // The same anaphor with no ledger to read is an honest gap, not lyric.
    const nowhere = declareForm("write it again");
    assert.equal(nowhere.field, null);
    assert.equal(nowhere.basis, "unmeasured");
    assert.match(nowhere.source, /no ledger directory given/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("declareVoidSpec carries the gate: admits takes the form's basis, and a bare form-ask's slot is an honest unmeasured, not the ask itself", () => {
  const spec = declareVoidSpec({ task: "write a sonnet" });
  assert.equal(spec.field, "lyric");
  assert.equal(spec.levels.whole.admits.value, "lyric");
  assert.equal(spec.levels.whole.admits.basis, "declared");
  assert.equal(spec.levels.whole.slot.value, null);
  assert.equal(spec.levels.whole.slot.basis, "unmeasured");
  assert.match(spec.levels.whole.slot.source, /"sonnet"/);
  assert.equal(spec.form.token, "sonnet");
  assert.match(voidSpecLines(spec)[0], /^FORM$/);
  // With a subject stated, the slot is asked, as before.
  const river = declareVoidSpec({ task: "write an essay on the river" });
  assert.equal(river.levels.whole.slot.value, "the river");
  assert.equal(river.levels.whole.slot.basis, "asked");
});

test("askedExtent reads a stated extent and only a stated one", () => {
  assert.deepEqual(askedExtent("write a five-paragraph essay"), { n: 5, unit: "paragraph" });
  assert.equal(askedExtent("write a poem"), null, "no extent is stated, so none is invented");
});
