// source-drift.test.mjs — the vendored fold guarded against the organ it was
// copied from.
//
// native/the-fold/source.js's own header says why it exists at all: a
// deliberate SECOND COPY of `tokenize` (plus foldDiacritics/isNumeral/
// STOPWORDS), vendored 2026-09-11 out of native/organs/source.js so this
// module stays independent of the organs import graph. The cost the header
// names is exactly this: "a second copy of the fold" that can drift. Nothing
// in either repo guarded that drift — the class ORGAN-CONSOLIDATION-2026-09.md
// already documents for ground-ladder.js and void-shape.js, unguarded here
// too until now.
//
// This is a pure equivalence test: run the SAME battery of inputs through
// both tokenizers and assert they agree. It does not choose a canonical
// implementation and does not change either file — a future pass that
// re-links the-fold's shim to import the vendored copy directly (the
// FUTURE note in native/the-fold/source.js) removes this file's reason to
// exist; until then, this is what stands between the two.
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize as vendoredTokenize } from "./source.js";
import { tokenize as organTokenize } from "../organs/source.js";

// Every edge case each file's own comments call out, in one place:
//   - plain ASCII with stopwords (the ordinary case, and the length/stopword
//     floor together)
//   - an accented Latin name vs its unaccented form (foldDiacritics' own
//     flagship case, both files' headers name it: Bezúkhov/Bezukhov)
//   - Hebrew with and without nikud (the same fold, widened 2026-08-28,
//     both headers name it: שָׁלוֹם/שלום)
//   - numerals, percent, hyphen, roman numerals together (the isNumeral +
//     dot/dash-trim + short-token-except-numeral rules, all at once)
//   - CJK, both the too-short case and the oversized-amalgam case the organ
//     file's own comment discloses as a KNOWN gap, not a difference between
//     the two copies
//   - a diacritic-bearing Cyrillic form
const BATTERY = [
  "The quick brown fox jumps over the lazy dog, and it was a fine day.",
  "Bezúkhov walked home.",
  "Bezukhov walked home.",
  "שָׁלוֹם עֲלֵיכֶם",
  "שלום עליכם",
  "CHAPTER II — the harvest grew by 12.5% this year, a real hit-and-run.",
  "北京",
  "北京大学",
  "Москва́ — столица России.",
  "",
  "   ",
  "III. IV. IX",
];

test("tokenize: the vendored the-fold copy agrees with the canonical organ, word for word, across the drift battery", () => {
  for (const text of BATTERY) {
    assert.deepEqual(
      vendoredTokenize(text),
      organTokenize(text),
      `tokenize drift on: ${JSON.stringify(text)}`,
    );
  }
});
