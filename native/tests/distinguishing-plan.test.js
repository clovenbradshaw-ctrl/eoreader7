import test from "node:test";
import assert from "node:assert/strict";
import { planDistinguishingQueries, executePlan, EITHER } from "../organs/distinguishing-plan.js";

test("planDistinguishingQueries: declares budget, hypotheses and candidateQueries — nothing defaulted", () => {
  assert.throws(() => planDistinguishingQueries(["a", "b"], [{ id: "q", ask: () => true }], {}), /budget is a declared/);
  assert.throws(() => planDistinguishingQueries([], [{ id: "q", ask: () => true }], { budget: 1 }), /non-empty array/);
  assert.throws(() => planDistinguishingQueries(["a"], [], { budget: 1 }), /non-empty array/);
});

test("planDistinguishingQueries: refuses above the declared caps rather than running unbounded search", () => {
  const many = Array.from({ length: 65 }, (_, i) => `h${i}`);
  assert.throws(() => planDistinguishingQueries(many, [{ id: "q", ask: () => true }], { budget: 1 }), /exceeds the declared cap/);
});

test("a single perfectly-splitting query resolves 2 hypotheses in budget 1", () => {
  const plan = planDistinguishingQueries(["a", "b"], [{ id: "isA", ask: (h) => h === "a" }], { budget: 1 });
  assert.equal(plan.done, true);
  assert.equal(plan.query, "isA");
  assert.equal(executePlan(plan, () => true), "a");
  assert.equal(executePlan(plan, () => false), "b");
});

test("a query that splits nothing is skipped, never spent", () => {
  const useless = { id: "useless", ask: () => true }; // every hypothesis lands on the same branch
  const useful = { id: "isA", ask: (h) => h === "a" };
  const plan = planDistinguishingQueries(["a", "b"], [useless, useful], { budget: 1 });
  assert.equal(plan.query, "isA", "the useless query must never be chosen when a useful one exists");
});

test("4 hypotheses need 2 binary queries, not 1 — budget 1 correctly refuses rather than guessing", () => {
  const hyps = ["00", "01", "10", "11"];
  const refused = planDistinguishingQueries(hyps, [{ id: "bit0", ask: (h) => h[0] === "1" }], { budget: 1 });
  assert.equal(refused.done, false);
  // No plan within budget 1 fully resolves all 4 — the function reports
  // the original ambiguity honestly (all 4 still undetermined) rather
  // than a partial branch that itself doesn't complete; it does not
  // pretend "narrowed to 2" is progress when nothing usable followed.
  assert.equal(refused.undetermined.length, 4);

  const solved = planDistinguishingQueries(hyps, [
    { id: "bit0", ask: (h) => h[0] === "1" },
    { id: "bit1", ask: (h) => h[1] === "1" },
  ], { budget: 2 });
  assert.equal(solved.done, true);
  for (const h of hyps) {
    const result = executePlan(solved, (q) => (q === "bit0" ? h[0] === "1" : h[1] === "1"));
    assert.equal(result, h);
  }
});

test("EITHER: a hypothesis whose query answer is nondeterministic lands on BOTH branches and must be resolved on both", () => {
  // h "coin" answers EITHER to the first query; the plan must still work
  // whichever way that hypothesis's coin actually falls when executed.
  const hyps = ["fixed-true", "fixed-false", "coin"];
  const q1 = { id: "q1", ask: (h) => (h === "coin" ? EITHER : h === "fixed-true") };
  // A second query that distinguishes "coin" from whichever fixed
  // hypothesis it landed beside, on EITHER branch.
  const q2true = { id: "q2true", ask: (h) => h === "fixed-true" }; // used on the true branch (fixed-true vs coin)
  const q2false = { id: "q2false", ask: (h) => h === "coin" }; // used on the false branch (fixed-false vs coin)
  const plan = planDistinguishingQueries(hyps, [q1, q2true, q2false], { budget: 2 });
  assert.equal(plan.done, true);

  // Execute against the real "coin" hypothesis many times — since its
  // first answer is genuinely random, sometimes it lands true, sometimes
  // false, and the plan must resolve it correctly either way, every time.
  for (let t = 0; t < 100; t++) {
    const firstAnswerForCoin = Math.random() < 0.5;
    const answerFn = (queryId) => {
      if (queryId === "q1") return firstAnswerForCoin; // coin's own real, re-flipped answer
      if (queryId === "q2true") return false; // "coin" is not "fixed-true"
      if (queryId === "q2false") return true; // "coin" IS "coin"
      throw new Error("unexpected query " + queryId);
    };
    assert.equal(executePlan(plan, answerFn), "coin");
  }
  // And the two fixed hypotheses resolve deterministically, on their own real branch.
  assert.equal(executePlan(plan, (q) => (q === "q1" ? true : true)), "fixed-true");
  assert.equal(executePlan(plan, (q) => (q === "q1" ? false : false)), "fixed-false");
});

test("executePlan refuses an undetermined plan rather than guessing", () => {
  const refused = planDistinguishingQueries(["a", "b", "c"], [{ id: "q", ask: () => true }], { budget: 1 });
  assert.throws(() => executePlan(refused, () => true), /never resolves/);
});

test("executePlan refuses a non-boolean answer from the caller's answerFn", () => {
  const plan = planDistinguishingQueries(["a", "b"], [{ id: "isA", ask: (h) => h === "a" }], { budget: 1 });
  assert.throws(() => executePlan(plan, () => "yes"), /must return true or false/);
});
