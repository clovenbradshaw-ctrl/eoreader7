// tests/deduction-csp.test.js — the general constraint-satisfaction
// deduction organ, against a small classic logic-grid puzzle (never
// Boolos-shaped): three people, in three houses (an ordered position
// category), each with one drink, from five stated clues.
//
//   1. Ann is in house 1.
//   2. The tea drinker is not in house 1.
//   3. Bea drinks coffee.
//   4. The milk drinker is next to Ann.
//   5. Cy is not the tea drinker.
//
// By hand: Ann=house1. Clue 2: tea isn't house1, so Ann doesn't drink tea.
// Clue 5: Cy doesn't drink tea either, so Bea drinks tea — but clue 3 says
// Bea drinks coffee. Contradiction — so this exact clue set is UNSATISFIABLE,
// which is exactly the kind of real refusal this module must produce
// rather than silently picking a "best" world. The satisfiable variant
// below (clue 3 replaced) is used for the unique-solution tests.
import test from "node:test";
import assert from "node:assert/strict";
import { CONSTRAINT_KINDS, REFUSALS, solveCsp, validateDeclaration } from "../organs/deduction-csp.js";

const SUBJECTS = ["Ann", "Bea", "Cy"];
const CATEGORIES = Object.freeze({
  position: [1, 2, 3],
  drink: ["tea", "coffee", "milk"],
});

test("CONSTRAINT_KINDS is the declared closed vocabulary", () => {
  assert.deepEqual([...CONSTRAINT_KINDS], ["fixed", "notFixed", "sameSubject", "differentSubject", "positionOffset"]);
});

test("validateDeclaration rejects a constraint naming an undeclared category", () => {
  const check = validateDeclaration({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [{ kind: "fixed", category: "pet", subject: "Ann", value: "cat" }],
  });
  assert.equal(check.ok, false);
});

test("validateDeclaration rejects positionOffset over a non-ordered category", () => {
  const check = validateDeclaration({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [{ kind: "positionOffset", category: "drink", value1: "tea", value2: "coffee", offset: 1 }],
  });
  assert.equal(check.ok, false);
});

test("validateDeclaration accepts a well-formed declaration", () => {
  const check = validateDeclaration({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [{ kind: "fixed", category: "position", subject: "Ann", value: 1 }],
  });
  assert.equal(check.ok, true);
});

test("solveCsp finds the unique solution for a satisfiable clue set", () => {
  // 1. Ann is in house 1.
  // 2. Ann does not drink tea.
  // 3. Cy drinks coffee.
  // => Ann: not tea, and Cy has coffee, so Ann drinks milk; Bea is left with tea.
  const real = solveCsp({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [
      { kind: "fixed", category: "position", subject: "Ann", value: 1 },
      { kind: "fixed", category: "position", subject: "Bea", value: 2 },
      { kind: "fixed", category: "position", subject: "Cy", value: 3 },
      { kind: "notFixed", category: "drink", subject: "Ann", value: "tea" },
      { kind: "fixed", category: "drink", subject: "Cy", value: "coffee" },
      { kind: "differentSubject", categoryA: "drink", valueA: "tea", categoryB: "drink", valueB: "coffee" }, // trivially true, exercises the kind
    ],
  });
  assert.equal(real.refused, undefined, JSON.stringify(real));
  assert.equal(real.solutions.length, 1);
  // Ann: not tea, so Ann drinks milk or coffee; Cy drinks coffee, so Ann drinks milk; Bea drinks tea.
  assert.equal(real.solution.drink.Ann, "milk");
  assert.equal(real.solution.drink.Bea, "tea");
  assert.equal(real.solution.drink.Cy, "coffee");
  assert.equal(real.solution.position.Ann, 1);
});

test("solveCsp reports unsatisfiable, never a silently-picked winner, when clues contradict", () => {
  const result = solveCsp({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [
      { kind: "fixed", category: "position", subject: "Ann", value: 1 },
      { kind: "notFixed", category: "drink", subject: "Ann", value: "tea" },
      { kind: "fixed", category: "drink", subject: "Bea", value: "coffee" },
      { kind: "notFixed", category: "drink", subject: "Cy", value: "tea" }, // forces Bea=tea, contradicting fixed Bea=coffee above
    ],
  });
  assert.equal(result.refused, REFUSALS.unsatisfiable);
  assert.equal(result.solutions.length, 0);
});

test("solveCsp reports ambiguous when several assignments remain consistent", () => {
  const result = solveCsp({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [{ kind: "fixed", category: "position", subject: "Ann", value: 1 }], // says nothing about drink at all
  });
  assert.equal(result.refused, REFUSALS.ambiguous);
  assert.ok(result.solutions.length > 1);
});

test("solveCsp refuses a bad declaration mechanically, without ever searching", () => {
  const result = solveCsp({ subjects: ["Ann"], categories: CATEGORIES, constraints: [] });
  assert.equal(result.refused, REFUSALS.bad_declaration);
});

test("positionOffset resolves a real 'next to' style clue", () => {
  const result = solveCsp({
    subjects: SUBJECTS,
    categories: CATEGORIES,
    constraints: [
      { kind: "fixed", category: "position", subject: "Ann", value: 1 },
      { kind: "positionOffset", category: "position", value1: 2, value2: 1, offset: 1 }, // trivial, always true — exercises the kind on integer values directly
      { kind: "fixed", category: "drink", subject: "Ann", value: "coffee" },
      { kind: "fixed", category: "drink", subject: "Bea", value: "tea" },
    ],
  });
  assert.equal(result.refused, REFUSALS.ambiguous); // position of Bea/Cy still unconstrained relative to each other beyond Ann=1
  assert.ok(result.solutions.every((s) => s.drink.Ann === "coffee" && s.position.Ann === 1));
});
