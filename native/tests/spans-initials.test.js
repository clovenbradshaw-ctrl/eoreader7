// tests/spans-initials.test.js — a name's initial is not a sentence end.
//
// The specimen (2026-09-16, live): "Ulysses S. Grant was born in Point
// Pleasant, Ohio, in 1822." read one chunk at a time was split at "S.", so
// retrieval handed "Ulysses S." and a separate subjectless "Grant was born in
// Point Pleasant", and a second paragraph lost its attribution entirely ("A
// later county pamphlet stated that Ulysses S." | "Grant was born in
// Georgetown, Kentucky."). The abbreviation fallback needs a token seen twice
// in the text it is handed, so an initial seen once is always split.
import test from "node:test";
import assert from "node:assert/strict";
import { splitSentences } from "../adapters/text/spans.js";

const texts = (t) => splitSentences(t).map((s) => s.text);

test("an initial inside a name, seen once, keeps the sentence whole", () => {
  assert.deepEqual(texts("Ulysses S. Grant was born in Point Pleasant, Ohio, in 1822. Grant led the Union armies to victory in the Civil War."), [
    "Ulysses S. Grant was born in Point Pleasant, Ohio, in 1822.",
    "Grant led the Union armies to victory in the Civil War.",
  ]);
  assert.deepEqual(texts("A later county pamphlet stated that Ulysses S. Grant was born in Georgetown, Kentucky."), [
    "A later county pamphlet stated that Ulysses S. Grant was born in Georgetown, Kentucky.",
  ], "the attribution stays with its claim");
  assert.deepEqual(texts("Harry S. Truman became president in April 1945, after the death of Franklin D. Roosevelt. Truman had served as vice president for only 82 days."), [
    "Harry S. Truman became president in April 1945, after the death of Franklin D. Roosevelt.",
    "Truman had served as vice president for only 82 days.",
  ]);
});

test("a run of initials is one name", () => {
  assert.deepEqual(texts("J. R. R. Tolkien wrote the book. It sold well."), ["J. R. R. Tolkien wrote the book.", "It sold well."]);
  assert.deepEqual(texts("The order came from A. P. Hill himself. It was ignored."), ["The order came from A. P. Hill himself.", "It was ignored."], "a run opening after a lowercase word is still a name, by the initial that follows");
});

test("a single capital letter that ends a sentence still ends it", () => {
  assert.deepEqual(texts("She finished with an A. Then she left."), ["She finished with an A.", "Then she left."], "after a lowercase word it is not a name's initial");
  assert.deepEqual(texts("The right answer is B. The next question is harder."), ["The right answer is B.", "The next question is harder."]);
  assert.deepEqual(texts("He wrote S.\nTruman read it."), ["He wrote S.", "Truman read it."], "a line break after the letter is a boundary: the rule reads spaces only");
});

test("the measured cost, pinned rather than hidden: an era abbreviation before a capitalised sentence merges", () => {
  // Measured over War and Peace and five Wikipedia pages: 314 boundaries
  // removed, of which 6 were real sentence ends (this one, and bibliography
  // entries "Coddington, Edwin B. The Gettysburg Campaign"). The other ~300
  // were names the splitter used to sever from their own sentence.
  assert.equal(texts("Here men from the planet Earth first set foot upon the Moon July 1969, A. D. We came in peace for all mankind.").length, 1);
});

test("offsets still read back from the text", () => {
  const t = "Before that, Ulysses S. Grant was born in Ohio. Harry S. Truman was not.";
  for (const s of splitSentences(t)) assert.equal(t.slice(s.offset, s.offset + s.text.length), s.text);
});
