import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "../adapters/text/spans.js";
import { recurringFormAnchorSpans, scriptIsCaseless } from "../adapters/text/recurring-form-anchors.js";

test("scriptIsCaseless: a case-bearing script is never flipped by a few incidental ASCII letters", () => {
  assert.equal(scriptIsCaseless("Hello World. This is ordinary English prose with real capital letters throughout, sentence after sentence."), false);
});

test("scriptIsCaseless: a genuinely case-less script (Arabic) reads true even with an incidental English metadata line ahead of it — the real bug found live, where a document's own boilerplate header wrongly decided the whole document's script", () => {
  const withHeader = "Language: Arabic (ar)\n\n" +
    "الإعلان العالمي لحقوق الإنسان يولد جميع الناس أحرارا متساوين في الكرامة والحقوق وقد وهبوا عقلا وضميرا وعليهم أن يعامل بعضهم بعضا بروح الإخاء لكل إنسان حق التمتع بجميع الحقوق والحريات دون تمييز";
  assert.equal(scriptIsCaseless(withHeader), true);
});

test("scriptIsCaseless: a genuinely case-bearing document (Spanish) is not flipped by an occasional non-Latin glyph", () => {
  const spanish = "Considerando que la libertad, la justicia y la paz en el mundo tienen por base el reconocimiento de la dignidad intrínseca y de los derechos iguales e inalienables de todos los miembros de la familia humana. — véase también «Artículo»";
  assert.equal(scriptIsCaseless(spanish), false);
});

test("scriptIsCaseless: too little signal returns null, never a guess", () => {
  assert.equal(scriptIsCaseless("hi"), null);
  assert.equal(scriptIsCaseless(""), null);
});

test("a word recurring across 2+ distinct sentences yields one anchor span per real occurrence", () => {
  const text = "The battle raged. The battle ended.";
  const sentences = splitSentences(text);
  const out = recurringFormAnchorSpans(text, { sentences, minArrivals: 2 });
  const battleSpans = out.filter((s) => s.anchor === "form:battle");
  assert.equal(battleSpans.length, 2);
  for (const s of battleSpans) {
    assert.equal(text.slice(s.index, s.index + s.length).toLowerCase(), "battle");
  }
});

test("a word appearing in only one sentence (a hapax) is never anchored", () => {
  const text = "The battle raged. The war ended.";
  const sentences = splitSentences(text);
  const out = recurringFormAnchorSpans(text, { sentences, minArrivals: 2 });
  assert.equal(out.some((s) => s.anchor === "form:battle"), false);
  assert.equal(out.some((s) => s.anchor === "form:war"), false);
});

test("a recurring word repeated twice within ONE sentence still counts as one sentence's worth of recurrence, not two", () => {
  const text = "The battle and the battle raged on. Peace came.";
  const sentences = splitSentences(text);
  const out = recurringFormAnchorSpans(text, { sentences, minArrivals: 2 });
  // "battle" occurs twice in one sentence and never again — distinct-SENTENCE
  // recurrence is 1, not 2, so it must NOT qualify.
  assert.equal(out.some((s) => s.anchor === "form:battle"), false);
});

test("functionWords excludes a recurring closed-class word from anchoring", () => {
  const text = "The battle raged. The war raged.";
  const sentences = splitSentences(text);
  const out = recurringFormAnchorSpans(text, { sentences, minArrivals: 2, functionWords: new Set(["the", "raged"]) });
  assert.equal(out.some((s) => s.anchor === "form:the"), false);
  assert.equal(out.some((s) => s.anchor === "form:raged"), false);
});

test("script-agnostic: works identically on real Arabic prose with real whitespace", () => {
  // "the situation" (الحالة) recurring across two sentences — real Arabic,
  // no capitalisation signal anywhere, ordinary whitespace between words.
  const text = "كانت الحالة خطيرة. ظلت الحالة كما هي.";
  const sentences = splitSentences(text);
  const out = recurringFormAnchorSpans(text, { sentences, minArrivals: 2 });
  const spans = out.filter((s) => s.anchor === "form:الحالة");
  assert.equal(spans.length, 2);
  for (const s of spans) {
    assert.equal(text.slice(s.index, s.index + s.length), "الحالة");
  }
});

test("declared minArrivals is required — no silent default", () => {
  assert.throws(() => recurringFormAnchorSpans("a a", { sentences: [{ text: "a a" }] }), TypeError);
});

test("empty sentences array yields no anchors, never throws", () => {
  assert.deepEqual(recurringFormAnchorSpans("anything", { sentences: [], minArrivals: 2 }), []);
});
