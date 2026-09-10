import test from "node:test";
import assert from "node:assert/strict";
import { saysDa, word, DA, JA, HONESTY_TYPES, NULL_WITNESS, isNullWitness } from "../organs/embedded-query.js";

// A brute-force, independent simulator: literally tracks the uttered WORD
// at every step (never an abstract yes/no value — that conflation was the
// real bug this test caught in the first draft). `secretMapping` says
// which word means "yes" in this hypothetical world; the simulator uses
// it only to decide what a TRUTHFUL/LYING god utters in response to a
// plain yes/no fact, never to interpret the final answer.
function bruteForceUtteredWord(honesty, propositionTruth, secretYesWord) {
  const secretNoWord = secretYesWord === DA ? JA : DA;
  if (honesty === "random") return null; // no signal — the brute-force control agrees there is none
  // What would this god utter if asked "P?" directly?
  const directWord = (honesty === "true") === propositionTruth ? secretYesWord : secretNoWord;
  // "Would you say da?" — a plain yes/no fact.
  const wouldSayDaTruth = directWord === DA;
  // The god's LITERAL utterance to that meta-question.
  return (honesty === "true") === wouldSayDaTruth ? secretYesWord : secretNoWord;
}

test("saysDa: matches an independent brute-force simulator, exhaustively — both secret word mappings, both honesty types, both proposition values", () => {
  for (const secretYesWord of [DA, JA]) {
    for (const honesty of ["true", "false"]) {
      for (const propositionTruth of [true, false]) {
        const closedForm = word(saysDa(honesty, propositionTruth));
        const bruteForce = bruteForceUtteredWord(honesty, propositionTruth, secretYesWord);
        assert.equal(closedForm, bruteForce, `mismatch: secretYesWord=${secretYesWord} honesty=${honesty} p=${propositionTruth}`);
      }
    }
  }
});

test("saysDa: the uttered WORD is fixed — always literally 'da' when p is true, 'ja' when p is false — for both True and False, regardless of secret meaning", () => {
  for (const honesty of ["true", "false"]) {
    assert.equal(word(saysDa(honesty, true)), DA);
    assert.equal(word(saysDa(honesty, false)), JA);
  }
});

test("saysDa: random carries no signal — null, never guessed, regardless of propositionTruth", () => {
  assert.equal(saysDa("random", true), null);
  assert.equal(saysDa("random", false), null);
});

test("saysDa: refuses an undeclared honesty type or a non-boolean proposition", () => {
  assert.throws(() => saysDa("maybe", true), /honesty must be one of/);
  assert.throws(() => saysDa("true", "yes"), /propositionTruth is a declared boolean/);
});

test("word: refuses a non-boolean input — it only ever translates a real saysDa result, never a mapped yes/no value", () => {
  assert.throws(() => word("yes"), /saysDaBool is declared/);
});

test("isNullWitness: only random is declared a coin-flip witness; true/false are not merely 'weak', they are real testimony", () => {
  assert.equal(isNullWitness("random"), true);
  assert.equal(isNullWitness("true"), false);
  assert.equal(isNullWitness("false"), false);
  assert.throws(() => isNullWitness("unknown"), /honesty must be one of/);
});

test("HONESTY_TYPES and NULL_WITNESS are the declared closed classes this module promises", () => {
  assert.deepEqual([...HONESTY_TYPES], ["true", "false", "random"]);
  assert.equal(typeof NULL_WITNESS, "string");
});
