import test from "node:test";
import assert from "node:assert/strict";
import { finiteDomain, declareVariable, declareConstraint, makeCSP, solveCSP } from "./reasoning-core.js";

test("a trivial single-variable CSP: one constraint, one solution", () => {
  const csp = makeCSP(
    [declareVariable("x", finiteDomain([1, 2, 3]))],
    [declareConstraint("x is even", ["x"], (a) => a.x % 2 === 0)],
  );
  const r = solveCSP(csp);
  assert.deepEqual(r.solutions, [{ x: 2 }]);
});

test("an unsatisfiable CSP reports zero solutions, never forces one", () => {
  const csp = makeCSP(
    [declareVariable("x", finiteDomain([1, 3, 5]))],
    [declareConstraint("x is even", ["x"], (a) => a.x % 2 === 0)],
  );
  const r = solveCSP(csp);
  assert.equal(r.solutions.length, 0);
});

test("an underdetermined CSP reports every solution, not one guess", () => {
  const csp = makeCSP(
    [declareVariable("x", finiteDomain([1, 2, 3, 4]))],
    [declareConstraint("x is even", ["x"], (a) => a.x % 2 === 0)],
  );
  const r = solveCSP(csp);
  assert.deepEqual(r.solutions, [{ x: 2 }, { x: 4 }]);
});

test("a constraint referencing an undeclared variable is refused loudly, never silently skipped", () => {
  const csp = makeCSP(
    [declareVariable("x", finiteDomain([1, 2]))],
    [declareConstraint("bogus", ["y"], () => true)],
  );
  assert.throws(() => solveCSP(csp), /never declared/);
});

// ── Real pruning, checked, not asserted ─────────────────────────────────
test("a constraint failing on the FIRST variable prunes the whole remaining subtree — never enumerates it", () => {
  // 1 value for x that always fails, 100 values each for y and z that are
  // never even looked at if pruning works: a leaf-only brute force would
  // visit 1*100*100 = 10,000 leaves; real pruning visits the single failing
  // partial assignment on x and stops, 1 pruned node, 0 trials.
  const big = Array.from({ length: 100 }, (_, i) => i);
  const csp = makeCSP(
    [declareVariable("x", finiteDomain([1])), declareVariable("y", finiteDomain(big)), declareVariable("z", finiteDomain(big))],
    [declareConstraint("x must be 2", ["x"], (a) => a.x === 2)],
  );
  const r = solveCSP(csp);
  assert.equal(r.solutions.length, 0);
  assert.equal(r.pruned.length, 1);
  assert.equal(r.trials.length, 0);
  assert.ok(r.totalNodesVisited < 10, `expected real pruning, visited ${r.totalNodesVisited} nodes`);
});

test("pruned entries name the exact values that broke the rule, not a static sentence", () => {
  const csp = makeCSP(
    [declareVariable("x", finiteDomain([1, 2])), declareVariable("y", finiteDomain([10, 20]))],
    [declareConstraint("x+y must be 12", ["x", "y"], (a) => a.x + a.y === 12)],
  );
  const r = solveCSP(csp);
  assert.deepEqual(r.solutions, [{ x: 2, y: 10 }]);
  // x=1 rules out both y values in one prune (constraint needs both x,y —
  // checkable only once y is assigned), so pruning here fires per (x,y) pair.
  const failing = r.pruned.filter((p) => p.failedConstraint === "x+y must be 12");
  assert.ok(failing.length >= 1);
  for (const p of failing) assert.ok(Number.isFinite(p.failedAt.x) && Number.isFinite(p.failedAt.y));
});

// ── A held-out THIRD domain, never involved in this module's design:
// map-coloring — the classic CSP taught in every AI textbook, chosen
// specifically because it shares nothing with knights-and-knaves (no
// self-referential typed statements, no truth/lie semantics) or arithmetic
// (no numbers, no equations). If this core is genuinely puzzle-blind, it
// solves this with zero new code. ──────────────────────────────────────
test("map-coloring — Australia, three colors, adjacency constraints only (a genuinely different domain)", () => {
  const REGIONS = ["WA", "NT", "SA", "Q", "NSW", "V"];
  const ADJACENT = [["WA", "NT"], ["WA", "SA"], ["NT", "SA"], ["NT", "Q"], ["SA", "Q"], ["SA", "NSW"], ["SA", "V"], ["Q", "NSW"], ["NSW", "V"]];
  const colors = finiteDomain(["red", "green", "blue"]);
  const csp = makeCSP(
    REGIONS.map((r) => declareVariable(r, colors)),
    ADJACENT.map(([a, b]) => declareConstraint(`${a}≠${b}`, [a, b], (asg) => asg[a] !== asg[b])),
  );
  const r = solveCSP(csp);
  assert.ok(r.solutions.length > 0, "Australia is 3-colorable — a real solution must exist");
  for (const sol of r.solutions) {
    for (const [a, b] of ADJACENT) assert.notEqual(sol[a], sol[b], `${a} and ${b} share a border and must differ`);
  }
  // Real pruning matters here too: 3^6 = 729 complete colorings exist, but
  // a genuinely adjacent-aware search should visit far fewer nodes than
  // that to find them all, because WA/NT/SA mutually adjacent alone
  // eliminates most of the space before Q/NSW/V are even touched.
  assert.ok(r.totalNodesVisited < 729, `expected pruning below full enumeration, visited ${r.totalNodesVisited}`);
});

test("two-coloring the same map is unsatisfiable (a real, checkable negative — WA/NT/SA form a 3-clique)", () => {
  const csp = makeCSP(
    ["WA", "NT", "SA"].map((r) => declareVariable(r, finiteDomain(["red", "blue"]))),
    [
      declareConstraint("WA≠NT", ["WA", "NT"], (a) => a.WA !== a.NT),
      declareConstraint("WA≠SA", ["WA", "SA"], (a) => a.WA !== a.SA),
      declareConstraint("NT≠SA", ["NT", "SA"], (a) => a.NT !== a.SA),
    ],
  );
  const r = solveCSP(csp);
  assert.equal(r.solutions.length, 0);
});

// ── Cross-checked against an independently written brute force ─────────
test("agrees with a naive, independently-written full enumeration on a real specimen", () => {
  const vars = [declareVariable("a", finiteDomain([1, 2, 3])), declareVariable("b", finiteDomain([1, 2, 3])), declareVariable("c", finiteDomain([1, 2, 3]))];
  const cons = [
    declareConstraint("a<b", ["a", "b"], (x) => x.a < x.b),
    declareConstraint("b<c", ["b", "c"], (x) => x.b < x.c),
    declareConstraint("a+c is even", ["a", "c"], (x) => (x.a + x.c) % 2 === 0),
  ];
  const csp = makeCSP(vars, cons);
  const r = solveCSP(csp);

  const naive = [];
  for (const a of [1, 2, 3]) for (const b of [1, 2, 3]) for (const c of [1, 2, 3]) {
    const asg = { a, b, c };
    if (asg.a < asg.b && asg.b < asg.c && (asg.a + asg.c) % 2 === 0) naive.push(asg);
  }
  const sortKey = (s) => `${s.a},${s.b},${s.c}`;
  assert.deepEqual(r.solutions.map(sortKey).sort(), naive.map(sortKey).sort());
  assert.ok(naive.length > 0, "the specimen should have at least one real solution to compare against");
});

test("the organ names no puzzle domain — general by construction, not by claim", async () => {
  const { readFile } = await import("node:fs/promises");
  const body = (await readFile(new URL("./reasoning-core.js", import.meta.url), "utf8")).replace(/\/\/.*$/gm, "");
  for (const word of ["knight", "knave", "archivist", "cryptarithmetic", "coloring", "australia"]) {
    assert.ok(!new RegExp(word, "i").test(body), `found forbidden domain word: ${word}`);
  }
});
