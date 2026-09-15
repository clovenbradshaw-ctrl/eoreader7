// firewall.test.mjs — the wall, enforced against the REAL output of
// buildFactBlock (fact-block.js, a sibling organ). Not a test of a copy of
// the strings: it imports them, so a fact block edited tomorrow to explain
// the machinery to the model fails HERE rather than being discovered weeks
// later in an answer that says "The prompt specifically identifies…".
//
// This is the same shape as constitution.test.mjs's II.13 host scan: the
// invariant is checked against what the app actually loads, never against
// a list someone has to remember to update.
//
// MOVED from the-fold 2026-09-14 (Phase 4 organ migration): the two tests
// that check the-fold's OWN system-prompt constants (holon.js, which does
// not cross this boundary — CLAUDE.md's Phase 4 inventory) stayed behind in
// the-fold as their own small test file, importing this organ through its
// shim. Everything here is pure — no the-fold import anywhere.

import { test } from "node:test";
import assert from "node:assert/strict";

import { apparatusMentions, assertModelFacing, APPARATUS_TERMS, speaksOfApparatus } from "./firewall.js";
import { buildFactBlock } from "./fact-block.js";

test("the fact block states its facts and none of its own bookkeeping", () => {
  const relations = {
    read: (text) =>
      /Hamlin/.test(text)
        ? {
            examined: true,
            claims: [
              { verdict: "bound", subject: "Hannibal Hamlin", verb: "was", object: "the 15th vice president", end1: "Hannibal Hamlin", label: "was", end2: "the 15th vice president", sentence: text },
            ],
          }
        : { examined: true, claims: [] },
  };
  const block = buildFactBlock(relations, [{ ref: "x#0-9", text: "Hannibal Hamlin was the 15th vice president." }], "who was lincoln's vp");
  assert.ok(block, "a real bound fact still produces a block");
  assertModelFacing({ factBlock: block.text });
  assert.match(block.text, /Hannibal Hamlin/, "the fact itself survives the wall");
});

test("the counts left the prompt but did NOT leave the instrument", () => {
  // The firewall moves bookkeeping to the thinking; it never deletes it.
  // A reader must still be able to see coverage — this is what the
  // disclosure panel reads.
  const relations = {
    read: () => ({
      examined: true,
      claims: [{ verdict: "bound", subject: "A", verb: "is", object: "B", end1: "A", label: "is", end2: "B", sentence: "A is B." }],
    }),
  };
  const block = buildFactBlock(relations, [{ ref: "x#0-9", text: "A is B." }], "");
  assert.equal(typeof block.coverage, "number");
  assert.equal(typeof block.sentenceCount, "number");
  assert.equal(typeof block.boundSentenceCount, "number");
  assert.equal(typeof block.omitted, "number");
});

test("the stated void keeps its force — the Hargis case must not regress", () => {
  // A silent absence is what a model fills from memory (measured: "who was
  // lincoln's vp?" → "William R. Hargis", a person who does not exist), so
  // the empty block must still SAY the emptiness, just without describing
  // the extractor that found it.
  const relations = { read: () => ({ examined: true, claims: [] }) };
  const block = buildFactBlock(relations, [{ ref: "x#0-9", text: "Some sentence with no relation." }], "");
  assert.ok(block, "an empty result is still a block, never a vanished section");
  assert.equal(block.empty, true);
  assertModelFacing({ emptyFactBlock: block.text });
  assert.match(block.text, /not.*from memory/i, "the instruction not to invent survives");
});

test("apparatusMentions reports where and what, so a failure is actionable", () => {
  const hits = apparatusMentions("Write from the passages; the prompt is the record.");
  assert.ok(hits.length >= 3);
  assert.ok(hits.every((h) => typeof h.index === "number" && h.excerpt.length));
  assert.deepEqual(
    hits.map((h) => h.term),
    [...hits].sort((a, b) => a.index - b.index).map((h) => h.term),
    "reported in the order they appear",
  );
});

test("an overlapping term is reported once, as the longest match", () => {
  const hits = apparatusMentions("consult the search results");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].term, "search results");
});

test("words that name the world are not apparatus", () => {
  // The wall must not make it impossible to write a prompt at all: a model
  // told to answer a question is being told about the world, not about us.
  assert.equal(speaksOfApparatus("Answer the question directly, in your own words."), false);
  assert.equal(speaksOfApparatus("If the answer is not there, say so plainly."), false);
});

test("the apparatus vocabulary is a declared closed class", () => {
  assert.ok(APPARATUS_TERMS.includes("prompt"));
  assert.ok(APPARATUS_TERMS.includes("passages"));
  assert.ok(APPARATUS_TERMS.includes("material"));
  assert.equal(new Set(APPARATUS_TERMS).size, APPARATUS_TERMS.length, "no duplicates");
});

test("assertModelFacing throws with every leak named, not just the first", () => {
  assert.throws(
    () => assertModelFacing({ a: "read the passages", b: "the prompt says" }),
    (e) => /a:/.test(e.message) && /b:/.test(e.message),
  );
});
