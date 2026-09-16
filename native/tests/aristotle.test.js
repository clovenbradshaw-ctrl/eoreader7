// tests/aristotle.test.js — the entrance organ: mechanical signature path
// (no model call, real Boolos solve, plan verified against every real
// hypothesis), an unrelated text's honest refusal, and the model-assisted
// path (a paraphrase the regex signature can't reach, a stub `modelCall`
// standing in for the injected caller, its output still mechanically
// re-validated before use).
import test from "node:test";
import assert from "node:assert/strict";
import { ENTRANCES, REFUSALS, acceptClassification, classifyEntrance, solve, solveDeduction } from "../organs/aristotle.js";
import { PUZZLE_TEMPLATES } from "../organs/puzzle-templates.js";
import { REFUSALS as CSP_REFUSALS } from "../organs/deduction-csp.js";

const BOOLOS_TEXT =
  "Three gods A, B, and C are called, in some order, True, False, and Random. " +
  "The gods understand English, but will answer all questions in their own language, " +
  "in which the words for yes and no are da and ja, in some order, and you do not know which word means which. " +
  "You may ask three yes-no questions.";

test("classifyEntrance matches the mechanical signature for the canonical text, no model call", () => {
  const classified = classifyEntrance(BOOLOS_TEXT, { modelCall: () => { throw new Error("must not be called"); } });
  assert.equal(classified.entrance, ENTRANCES.mechanical);
  assert.deepEqual([...classified.params.agents], ["A", "B", "C"]);
});

test("solve produces a plan within budget 3, and it is correct against every real hypothesis", () => {
  const result = solve(BOOLOS_TEXT);
  assert.equal(result.refused, undefined);
  assert.equal(result.entrance, ENTRANCES.mechanical);
  assert.equal(result.plan.done, true);
  for (const hKey of result.hypotheses) {
    const answerFn = (queryId) => {
      const [askedAgent] = /^ask (\w+):/.exec(queryId).slice(1);
      const h = Object.fromEntries(hKey.split("/").map((v, i) => [result.params.agents[i], v]));
      // Re-derive the same signal the template's own candidateQueries computed, to prove execute() tracks a real answer, not the plan's own memory.
      const template = PUZZLE_TEMPLATES.find((t) => t.id === result.template);
      const formalized = template.formalize(result.params);
      const q = template.candidateQueries(formalized).find((c) => c.id === queryId);
      const raw = q.ask(hKey);
      return raw === "either" ? Math.random() < 0.5 : raw;
    };
    assert.equal(result.execute(answerFn), hKey, `plan must resolve hypothesis ${hKey} correctly`);
  }
});

test("an unrelated text refuses honestly, with no modelCall injected", () => {
  const classified = classifyEntrance("The quick brown fox jumps over the lazy dog.");
  assert.equal(classified.refused, REFUSALS.no_entrance);
});

test("a Boolos-shaped paraphrase the regex signature cannot reach is accepted via a model-assisted extraction, re-validated mechanically", () => {
  const paraphrase =
    "Picture three oracles named Ann, Bea, and Cy. Exactly one of them always tells the truth, " +
    "one always lies, and one answers unpredictably. When they answer, they use the foreign words " +
    "'bip' and 'bop' for yes and no, but nobody has told you which word means which. " +
    "You get to ask a total of three questions, each answerable yes or no.";

  const classified0 = classifyEntrance(paraphrase);
  assert.equal(classified0.refused, REFUSALS.no_entrance, "the paraphrase must NOT match the closed regex signature — this is the gap Aristotle exists to close");

  const modelCall = () => ({
    matches: true,
    agents: ["Ann", "Bea", "Cy"],
    roleWords: { true: "true", false: "lying", random: "unpredictable" },
    yesOrNoWords: ["bip", "bop"],
    budget: 3,
  });

  const classified = classifyEntrance(paraphrase, { modelCall });
  assert.equal(classified.entrance, ENTRANCES.modelAssisted);

  const result = solve(paraphrase, { modelCall });
  assert.equal(result.refused, undefined);
  assert.equal(result.plan.done, true);
  assert.equal(result.holograph.entrance, ENTRANCES.modelAssisted);
});

test("acceptClassification rejects a model extraction using a role word outside the closed vocabulary", () => {
  const template = PUZZLE_TEMPLATES.find((t) => t.id === "boolos-liar-truthteller-random");
  const bad = { matches: true, agents: ["A", "B", "C"], roleWords: { true: "friendly", false: "lying", random: "random" }, yesOrNoWords: ["da", "ja"], budget: 3 };
  assert.equal(acceptClassification(bad, template), null);
});

test("classifyEntrance discloses a rejected model extraction rather than silently refusing without reason", () => {
  const modelCall = () => ({ matches: true, agents: ["A", "B", "C"], roleWords: { true: "friendly", false: "lying", random: "random" }, yesOrNoWords: ["da", "ja"], budget: 3 });
  const classified = classifyEntrance("some text a regex will never match at all, ever", { modelCall });
  assert.equal(classified.refused, REFUSALS.model_extraction_invalid);
});

// ── solveDeduction: the general logic-grid entrance — deduction is the point, not any one riddle's shape ──

test("solveDeduction requires an injected modelCall — there is no mechanical path into open-prose deduction puzzles", () => {
  const result = solveDeduction("Three people, three houses, some clues.");
  assert.equal(result.refused, REFUSALS.no_model_call);
});

test("solveDeduction solves a genuine (non-Boolos) logic-grid puzzle via a stubbed extraction, verified mechanically", () => {
  const puzzleText =
    "Ann, Bea, and Cy each live in a different house, numbered 1 to 3, and each drinks a " +
    "different drink: tea, coffee, or milk. Ann lives in house 1. Ann does not drink tea. " +
    "Cy drinks coffee. Who drinks what?";

  const modelCall = () => ({
    subjects: ["Ann", "Bea", "Cy"],
    categories: { position: [1, 2, 3], drink: ["tea", "coffee", "milk"] },
    constraints: [
      { kind: "fixed", category: "position", subject: "Ann", value: 1 },
      { kind: "fixed", category: "position", subject: "Bea", value: 2 },
      { kind: "fixed", category: "position", subject: "Cy", value: 3 },
      { kind: "notFixed", category: "drink", subject: "Ann", value: "tea" },
      { kind: "fixed", category: "drink", subject: "Cy", value: "coffee" },
    ],
  });

  const result = solveDeduction(puzzleText, { modelCall });
  assert.equal(result.refused, undefined, JSON.stringify(result));
  assert.equal(result.entrance, ENTRANCES.deduction);
  assert.equal(result.solution.drink.Ann, "milk");
  assert.equal(result.solution.drink.Bea, "tea");
  assert.equal(result.solution.drink.Cy, "coffee");
  assert.ok(result.holograph.notes.length > 0);
});

test("solveDeduction discloses a rejected declaration rather than silently refusing without reason", () => {
  const modelCall = () => ({ subjects: ["Ann"], categories: { drink: ["tea"] }, constraints: [] }); // only 1 subject — fails validateDeclaration
  const result = solveDeduction("some puzzle text", { modelCall });
  assert.equal(result.refused, REFUSALS.deduction_declaration_invalid);
});

test("solveDeduction reports unsatisfiable honestly when the model's own extraction of the clues contradicts itself", () => {
  const modelCall = () => ({
    subjects: ["Ann", "Bea", "Cy"],
    categories: { position: [1, 2, 3], drink: ["tea", "coffee", "milk"] },
    constraints: [
      { kind: "fixed", category: "drink", subject: "Ann", value: "tea" },
      { kind: "notFixed", category: "drink", subject: "Ann", value: "tea" }, // directly contradicts the fixed clue above
    ],
  });
  const result = solveDeduction("some puzzle text", { modelCall });
  assert.equal(result.refused, CSP_REFUSALS.unsatisfiable);
});
