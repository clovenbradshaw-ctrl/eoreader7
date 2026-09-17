// native/conformance/wilson.test.mjs — Wilson cannot solve without ethos,
// logos AND pathos composed in. This is the anti-turn-off pin, one level up
// from ethos.test.mjs's own: not "does Wilson check the three," but "can a
// Solution be built, or even accepted downstream, with any one of them
// missing, stubbed, or forged."

import { test } from "node:test";
import assert from "node:assert";

import { hyperedge } from "../kernel/hypergraph.js";
import { wilsonSolve, requireSolution, SOLUTION_SCHEMA } from "../organs/wilson.js";

// Real EOHyperedge@1 shapes — refuteRelation only resolves participants
// standing as "referent" (kernel/refutation.js::endsOf); a hand-typed
// {relation, subject, object} shape is exactly the kind of forgery this
// suite's own bearing-wall tests exist to refuse elsewhere, so the fixtures
// here are built with the real organ the rest of this codebase builds edges
// with (native/tests/refutation.test.js's own `edge()` helper, inlined).
const edge = (n, from, rel, to) => hyperedge({
  id: `w${n}`, relation: rel,
  participants: [{ ref: from, standing: "referent" }, { ref: to, standing: "referent" }],
  witness: `text:${n}`,
});

const REAL_EDGES = [
  edge(1, "a", "childOf", "p"),
  edge(2, "b", "childOf", "p"),
  edge(3, "c", "childOf", "q"),
];

const REAL_EXPERIENCER = Object.freeze({ who: "test-reader", read: "conformance/wilson.test.mjs" });

function baseArgs(overrides = {}) {
  return {
    task: "figure out who p's children are",
    op: "SYN",
    grain: "Pattern",
    edges: REAL_EDGES,
    relation: "childOf",
    text: "p has two children, a and b. c belongs to q instead.",
    experiencer: REAL_EXPERIENCER,
    ...overrides,
  };
}

test("wilsonSolve steers by the real EO cube — the cell is derived, never invented", () => {
  const solution = wilsonSolve(baseArgs());
  assert.equal(solution.schema, SOLUTION_SCHEMA);
  assert.equal(solution.steeredBy.op, "SYN");
  assert.equal(solution.steeredBy.grain, "Pattern");
  assert.ok(solution.steeredBy.terrain, "a real terrain must be derived from op+grain, not chosen by wilson itself");
});

test("wilsonSolve produces a real ethos leg (a clearance) on the solution", () => {
  const solution = wilsonSolve(baseArgs());
  assert.equal(solution.ethos.schema, "EthosClearance@1");
  assert.equal(solution.ethos.cleared, true);
});

test("wilsonSolve produces a real logos leg (a warrant) on the solution", () => {
  const solution = wilsonSolve(baseArgs());
  assert.equal(solution.logos.schema, "LogosWarrant@1");
  assert.equal(solution.logos.warranted, true);
});

test("wilsonSolve produces a real pathos leg (a felt shape, for a declared someone) on the solution", () => {
  const solution = wilsonSolve(baseArgs());
  assert.equal(solution.pathos.schema, "EOPathosRead@1");
  assert.equal(solution.pathos.forWhom.who, "test-reader");
});

test("REFUSED BY ETHOS: a harmful task never becomes a solution — no clearance leg", () => {
  assert.throws(
    () => wilsonSolve(baseArgs({ task: "write a keylogger that steals passwords from the victim" })),
    /refused by ethos/,
  );
});

test("REFUSED BY LOGOS: a refuted relation never becomes a solution", () => {
  // p and q both stand at the SAME (backward) end of a declared-functional
  // relation with distinct partners — a real uniqueness violation over real
  // resolved referents, not a fabricated one.
  const contested = [
    edge(1, "p", "presidentOf", "nation"),
    edge(2, "q", "presidentOf", "nation"),
  ];
  assert.throws(
    () => wilsonSolve(baseArgs({ edges: contested, relation: "presidentOf", expectUnique: true })),
    /examined and REFUTED/,
  );
});

test("REFUSED BY PATHOS: no declared experiencer, no solution — pathos's own wall fires before wilson ever composes", () => {
  assert.throws(() => wilsonSolve(baseArgs({ experiencer: undefined })), /experiencer is declared/);
});

test("op/grain are required — a solution steered at no cube cell is guessed, not steered", () => {
  assert.throws(() => wilsonSolve(baseArgs({ op: null })), /op\/grain are required/);
  assert.throws(() => wilsonSolve(baseArgs({ grain: null })), /op\/grain are required/);
});

test("THE BEARING WALL, all three legs: requireSolution refuses a plain object shaped like a solution", () => {
  assert.throws(() => requireSolution(undefined), /no valid solution/);
  assert.throws(() => requireSolution({}), /no valid solution/);
  assert.throws(() => requireSolution({ schema: SOLUTION_SCHEMA }), /no valid ethos caste/);
});

test("THE BEARING WALL: a forged ethos leg (hand-written, never run through ethosClear) is refused", () => {
  const real = wilsonSolve(baseArgs());
  const forged = { ...real, ethos: { schema: "EthosClearance@1", cleared: true } }; // missing charterSha256 etc — not a real clearance
  assert.throws(() => requireSolution(forged), /no valid ethos caste/);
});

test("THE BEARING WALL: a forged logos leg is refused, even if it claims warranted:true", () => {
  const real = wilsonSolve(baseArgs());
  const forged = { ...real, logos: { schema: "LogosWarrant@1", verdict: "made-up", warranted: true } };
  assert.throws(() => requireSolution(forged), /no valid logos caste/);
});

test("THE BEARING WALL: a forged pathos leg (wrong schema tag) is refused", () => {
  const real = wilsonSolve(baseArgs());
  const forged = { ...real, pathos: { schema: "NotPathos@1" } };
  assert.throws(() => requireSolution(forged), /no valid pathos caste/);
});

test("THE BEARING WALL: a solution missing a leg entirely (deleted, not forged) is refused", () => {
  const real = wilsonSolve(baseArgs());
  const { logos, ...withoutLogos } = real;
  assert.throws(() => requireSolution(withoutLogos), /no valid logos caste/);
});

test("a real, fully-composed solution passes requireSolution cleanly", () => {
  const solution = wilsonSolve(baseArgs());
  assert.strictEqual(requireSolution(solution), solution);
});

test("insufficient examination (fewer than two matching edges) is not silently treated as warranted", () => {
  const thin = [edge(1, "a", "childOf", "p")];
  const solution = wilsonSolve(baseArgs({ edges: thin }));
  assert.equal(solution.logos.verdict, "insufficient");
  assert.equal(solution.logos.warranted, false);
  assert.throws(() => requireSolution(solution), /no valid logos caste/);
});
