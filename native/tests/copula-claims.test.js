import test from "node:test";
import assert from "node:assert/strict";
import { readCopulaClaim, splitAtCopula } from "../adapters/text/copula-claims.js";
import { splitSentences } from "../adapters/text/spans.js";
import { sameNumeral } from "../adapters/text/numeral-words.js";

const P = [
  { ref: "d#1", text: "We tried to be cheerful and encourage each other, and Mina was the brightest and most cheerful of us. Harker was the only one who had any result." },
  { ref: "d#2", text: "R. M. Renfield, ætat 59. Sanguine temperament. Braunau was the headquarters of the commander in chief, Kutúzov." },
];
const opts = { splitSentences };

test("a copula claim is split at its first copula form; a claim with none, or with no content word on a side, is not this organ's", () => {
  assert.deepEqual(splitAtCopula("Mina was the brightest of us.").copula, "was");
  assert.equal(readCopulaClaim("Roberts succeeded Rehnquist.", P, opts).verdict, "not_copula");
  assert.equal(readCopulaClaim("It was the best.", P, opts).verdict, "not_copula", "a pronoun subject carries no content word");
});

test("holds: the subject before its copula and every complement word after it, in one sentence; a different subject with the same complement says nothing (open); a different complement is open, never refused", () => {
  const mina = readCopulaClaim("Mina was the brightest and most cheerful of us.", P, opts);
  assert.equal(mina.verdict, "holds"); assert.equal(mina.ref, "d#1"); assert.match(mina.decider, /Mina was the brightest/);
  assert.equal(readCopulaClaim("Harker was the brightest and most cheerful of us.", P, opts).verdict, "open", "Harker's own copula sentence has a different complement; Mina's sentence is not about Harker");
  assert.equal(readCopulaClaim("Braunau was the headquarters of Napoleon.", P, opts).verdict, "open");
  assert.equal(readCopulaClaim("Braunau was the headquarters of Kutúzov.", P, opts).verdict, "holds");
  assert.equal(readCopulaClaim("Renfield is fifty-nine.", P, opts).verdict, "open", "no numeral folding: fifty-nine is not 59, and 'ætat 59' has no copula");
});

test("refused: the complement stated under a negation, before or after the copula; a negation elsewhere in the sentence is not read", () => {
  const N = [{ ref: "n", text: "Mina never was the brightest of us. Harker was not the only one who had any result. Though he never slept, Renfield was the calmest of the patients." }];
  assert.equal(readCopulaClaim("Mina was the brightest of us.", N, opts).verdict, "refused");
  assert.equal(readCopulaClaim("Harker was the only one who had any result.", N, opts).verdict, "refused");
  assert.equal(readCopulaClaim("Renfield was the calmest of the patients.", N, opts).verdict, "holds", "a negation in an earlier clause is not the copula's");
});

test("an injected sameForm widens equality; without it exact tokens only", () => {
  const sameForm = (a, b) => a === b || (a === "brighter" && b === "brightest");
  assert.equal(readCopulaClaim("Mina was the brighter of us.", P, { ...opts, sameForm }).verdict, "holds");
  assert.equal(readCopulaClaim("Mina was the brighter of us.", P, opts).verdict, "open");
  assert.throws(() => readCopulaClaim("Mina was the brightest.", P, {}), /splitSentences/);
});

test("adjacency (v7's control): the subject ends at the copula and the complement begins at it — a subject somewhere before and a one-word complement somewhere after is not the claim", () => {
  const V = [{ ref: "v", text: "“I accept your limitation,” said Van Helsing, “and all I ask of you is that if you feel it necessary to condemn any act of mine, you will first consider it well.” Arthur was the first." }];
  assert.equal(readCopulaClaim("Van Helsing was the first.", V, opts).verdict, "open");
  assert.equal(readCopulaClaim("Arthur was the first.", V, opts).verdict, "holds");
  assert.equal(readCopulaClaim("Mina was the cheerful one.", P, opts).verdict, "open", "the complement's first word must be the first after the copula: 'brightest' is, 'cheerful' is not");
});

// V9: numeral folding, via an injected sameForm built on adapters/text/numeral-words.js's
// sameNumeral — the gap this organ's own header names by name ("it does not fold
// synonyms or numerals... a morphology or numeral prior is the caller's to inject as
// sameForm"). A real before/after against the raw organ, not the whole slow eval driver.
test("an injected numeral-folding sameForm confirms a claim phrased with digits against a passage phrased in words, and vice versa — without it, neither reads", () => {
  const sameForm = (a, b) => sameNumeral(a, b);
  const words = [{ ref: "r#1", text: "R. M. Renfield is fifty-nine. Sanguine temperament." }];
  const digits = [{ ref: "r#2", text: "R. M. Renfield is 59. Sanguine temperament." }];

  // digit claim against a words passage
  assert.equal(readCopulaClaim("Renfield is 59.", words, opts).verdict, "open", "without sameForm, '59' does not read 'fifty-nine'");
  const withWords = readCopulaClaim("Renfield is 59.", words, { ...opts, sameForm });
  assert.equal(withWords.verdict, "holds");
  assert.equal(withWords.ref, "r#1");

  // words claim against a digit passage — the same fold, the other direction
  assert.equal(readCopulaClaim("Renfield is fifty-nine.", digits, opts).verdict, "open", "without sameForm, 'fifty-nine' does not read '59'");
  const withDigits = readCopulaClaim("Renfield is fifty-nine.", digits, { ...opts, sameForm });
  assert.equal(withDigits.verdict, "holds");
  assert.equal(withDigits.ref, "r#2");

  // a false numeral is still refused open, never folded into holding
  assert.equal(readCopulaClaim("Renfield is 60.", words, { ...opts, sameForm }).verdict, "open", "sameNumeral never folds two DIFFERENT numerals");
});
