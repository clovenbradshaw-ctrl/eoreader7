import { test } from "node:test";
import assert from "node:assert/strict";
import { runTournament } from "../kernel/tournament.js";

// The N-candidate selector: each candidate tried against a pristine copy,
// scored { exit code, then minimal diff }, winner landed with losers
// recorded as refused trials. The tester is injected (a stub here);
// production passes an execSync-backed tester. Pure: no fs, no model.

const CODE = "def add(a, b):\n    return a + b\n";

const passIf = (needle) => ({ code }) => (String(code).includes(needle) ? { exitCode: 0, output: "ok" } : { exitCode: 1, output: "missing" });

test("winner: first exit-0 in caller order is NOT enough — smallest diff wins", () => {
  const { winner, trials } = runTournament({
    code: CODE,
    candidates: [
      { find: "return a + b", add: "return a + b  # padded comment making this diff bigger........" },
      { find: "return a + b", add: "return a+b" },
    ],
    test: passIf("return"),
  });
  assert.ok(winner);
  assert.equal(winner.candidate.add, "return a+b");
  assert.equal(trials.length, 2);
  assert.ok(trials.every((t) => t.ok && t.exitCode === 0));
});

test("losers recorded: inapplicable gaps never tested, failures kept as trials", () => {
  let tested = 0;
  const { winner, trials } = runTournament({
    code: CODE,
    candidates: [
      { find: "no such bytes", add: "x" },
      { find: "return a + b", add: "return a - b" },
    ],
    test: () => { tested += 1; return { exitCode: 1, output: "no" }; },
  });
  assert.equal(winner, null);
  assert.equal(tested, 1); // the unlocated candidate never reached the tester
  assert.equal(trials[0].ok, false);
  assert.equal(trials[0].gap.kind, "unlocated");
  assert.equal(trials[1].exitCode, 1);
});

test("pristine copies: a loser leaves no trace on the winner's code", () => {
  const { winner } = runTournament({
    code: CODE,
    candidates: [
      { find: "return a + b", add: "return POISON" },
      { find: "return a + b", add: "return a+b" },
    ],
    test: ({ code }) => (code.includes("POISON") ? { exitCode: 1, output: "poison" } : { exitCode: 0, output: "ok" }),
  });
  assert.ok(winner);
  assert.ok(!winner.code.includes("POISON"));
  assert.match(winner.code, /return a\+b/);
});

test("tester failures are recorded gaps, never wins", () => {
  const throwing = runTournament({ code: CODE, candidates: [{ find: "return a + b", add: "return a+b" }], test: () => { throw new Error("boom"); } });
  assert.equal(throwing.winner, null);
  assert.equal(throwing.trials[0].gap.kind, "test_threw");
  const noVerdict = runTournament({ code: CODE, candidates: [{ find: "return a + b", add: "return a+b" }], test: () => ({}) });
  assert.equal(noVerdict.winner, null);
  assert.equal(noVerdict.trials[0].gap.kind, "test_no_verdict");
});

test("malformed calls refuse without throwing (except never)", () => {
  assert.equal(runTournament({ code: CODE, candidates: [], test: () => ({ exitCode: 0 }) }).winner, null);
  assert.equal(runTournament({ code: CODE, candidates: [{ find: "a", add: "b" }] }).winner, null);
  assert.equal(runTournament({ candidates: [{ find: "a", add: "b" }], test: () => ({ exitCode: 0 }) }).gap.kind, "no-projection");
});

test("rank: priors propose trial order; ties break toward higher rank", () => {
  const seen = [];
  const { winner, trials } = runTournament({
    code: CODE,
    candidates: [
      { find: "return a + b", add: "return a + b  # padded comment making this diff bigger........" },
      { find: "return a + b", add: "return a+b" },
    ],
    test: ({ code, index }) => { seen.push(index); return { exitCode: 0, output: "ok" }; },
    rank: (c, i) => (i === 1 ? 0.9 : 0.1),
  });
  assert.deepEqual(seen, [1, 0]); // higher rank tried first
  assert.deepEqual(trials.map((t) => t.index), [1, 0]);
  assert.equal(winner.candidate.add, "return a+b"); // min-diff rule unchanged
});

test("rank: throwing rank never breaks the tournament (stable caller order)", () => {
  const seen = [];
  const { winner } = runTournament({
    code: CODE,
    candidates: [{ find: "return a + b", add: "return a+b" }],
    test: ({ code, index }) => { seen.push(index); return { exitCode: 0, output: "ok" }; },
    rank: () => { throw new Error("bad prior"); },
  });
  assert.ok(winner);
  assert.deepEqual(seen, [0]);
});
