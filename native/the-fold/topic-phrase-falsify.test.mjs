// topic-phrase-falsify.test.mjs — THE FALSIFICATION TIER for the subject
// extraction (2026-09-21, the "five-paragraph essay on X" fix):
//
//   "the essay's SUBJECT is what the ask names after its own scaffolding —
//   the essay-form words ('write', 'five-paragraph essay', 'give it a title')
//   are instructions, never content. The void cells must ask about the
//   subject, or the mouth writes about the format."
//
// Measured 2026-09-21: "Write a five-paragraph essay on the Cumberland River
// in Nashville" produced void questions about "the five-paragraph essay
// format" — the essay-form words leaked into the topic and the mouth wrote an
// essay about essays. Each falsification attacks a consequence of the law.
import test from "node:test";
import assert from "node:assert/strict";
import { topicPhrase } from "../../proxy-runner.mjs";

// ── T1  THE ESSAY-FORM IS THE ASK'S SCAFFOLDING, NEVER THE SUBJECT. "five-
// paragraph essay on X" → the subject is X, and only X.
test("T1 — 'five-paragraph essay on X' extracts X, not the format", () => {
  assert.equal(topicPhrase("Write a five-paragraph essay on the Cumberland River in Nashville. Give it a title."), "the Cumberland River in Nashville", "the format words are stripped");
  assert.equal(topicPhrase("Write a 5-paragraph essay on the Cumberland River in Nashville."), "the Cumberland River in Nashville", "numeric form stripped too");
  assert.equal(topicPhrase("An essay about the Cumberland River in Nashville."), "the Cumberland River in Nashville", "'essay about X' → X");
});

// ── T2  THE ASK'S INSTRUCTIONS STOP AT THE SENTENCE BOUNDARY. "Give it a
// title. Real prose..." is the writer's brief, not part of the subject.
test("T2 — the ask's instructions are cut at the first sentence boundary", () => {
  assert.equal(topicPhrase("Write a five-paragraph essay on the Cumberland River in Nashville. Give it a title. Real prose, complete sentences, grounded in the material."), "the Cumberland River in Nashville", "trailing instructions are not the subject");
});

// ── T3  THE SUBJECT IS THE THING NAMED, NOT THE VERB. "Describe X", "Write
// about X", "Give me three sections about X" → X survives, the verb and the
// count/unit do not.
test("T3 — the subject is the named thing, not the verb or the unit", () => {
  assert.equal(topicPhrase("Describe the Cumberland River and its role in Nashville."), "the Cumberland River and its role in Nashville", "leading verb stripped, subject kept");
  assert.equal(topicPhrase("Give me three sections about the river."), "the river", "the count/unit is scaffolding, the subject survives");
  assert.equal(topicPhrase("Write an essay on the history of the port of Nashville."), "the port of Nashville", "nested 'of' subject resolves");
});

// ── T4  THE EXTRACTION IS DETERMINISTIC AND TOTAL: the same ask always yields
// the same subject, and the subject NEVER contains the essay-form words.
test("T4 — extraction is deterministic; the subject never carries the format", () => {
  const task = "Write a five-paragraph essay on the Cumberland River in Nashville. Give it a title.";
  const a = topicPhrase(task);
  const b = topicPhrase(task);
  assert.equal(a, b, "deterministic");
  const lower = a.toLowerCase();
  for (const word of ["write", "essay", "paragraph", "title", "prose", "section"]) {
    assert.ok(!lower.includes(word), `the subject never carries "${word}"`);
  }
});