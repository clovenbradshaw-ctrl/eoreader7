// tests/conversation-compare.test.js — the conversation figures are computed in
// lib/conversation-compare.mjs and READ here (S64/S65): by-construction rows
// with known answers, so the numbers a results doc transcribes cannot drift
// from the computation that produced them. The rows are shaped as the driver
// WRITES them (counts: sections, boundClaims, unsupported), not as the turn
// returns them — the first cut read `sections[].relations.claims` off a
// number and threw on the first real run (P96's rule, caught again).
import test from "node:test";
import assert from "node:assert/strict";
import { summarizeRows, compareRuns, renderComparison } from "../eval/the-fold/lib/conversation-compare.mjs";

const rows = [
  { turn: 1, move: "open", addressed: true, resolved: true, calls: 1, promptTokens: 200, ms: 3000, turnAddressed: [{ all: true, reasked: false, resolvedOn: null }], expectation: { authorship: 0.5, novel: 1 }, unsupported: 0, learnedAdded: 0, owned: 0, retrieval: [{ basis: "activation" }], resolutions: [{ handed: "activated sentences" }], sections: 1, boundClaims: 1 },
  { turn: 2, move: "clarify", addressed: null, resolved: false, calls: 2, promptTokens: 1000, ms: 9000, turnAddressed: [{ all: null, reasked: false, resolvedOn: "absence" }], expectation: null, unsupported: 1, learnedAdded: 1, owned: 0, voidsDeclared: [{ name: "X" }], retrieval: [{ basis: "surface" }], resolutions: [{ handed: "passages" }], sections: 1, boundClaims: 0 },
  { turn: 3, move: "reflect", addressed: false, resolved: true, calls: 1, promptTokens: 300, ms: 4000, turnAddressed: [{ all: false, reasked: true, resolvedOn: "re-ask" }], position: { verdict: "no" }, expectation: { authorship: 1, novel: 0 }, unsupported: 0, learnedAdded: 0, owned: 1, retrieval: [{ basis: "activation" }], resolutions: [{ handed: "activated sentences" }], sections: 1, boundClaims: 1 },
];

test("summarizeRows: every figure by construction", () => {
  const s = summarizeRows(rows);
  assert.equal(s.turns, 3);
  assert.equal(s.tokPerCall, Math.round(1500 / 4));
  assert.equal(s.callsPerTurn, Number((4 / 3).toFixed(2)));
  assert.equal(s.sPerTurn, Number((16 / 3).toFixed(1)));
  assert.equal(s.reasked, 1); assert.equal(s.allNamed, 1); assert.equal(s.addressChecks, 3); assert.equal(s.absences, 1); assert.equal(s.voids, 1);
  assert.equal(s.positions, 1);
  assert.equal(s.authorship, 0.75); assert.equal(s.authorshipTurns, 2, "authorship averages only turns where one was measurable");
  assert.equal(s.unsupported, 1); assert.equal(s.learned, 1); assert.equal(s.owned, 1);
  assert.deepEqual(s.retrieval, { activation: 2, surface: 1 }); assert.deepEqual(s.handed, { "activated sentences": 2, passages: 1 });
  assert.deepEqual(s.moves.open, { n: 1, addressed: 1, resolved: 1 }); assert.deepEqual(s.moves.clarify, { n: 1, addressed: 0, resolved: 0 });
  assert.equal(s.recordBacked.perTurn, Number((2 / 3).toFixed(2))); assert.equal(s.recordBacked.additions, 2, "the mouth's additions: novel claims plus unsupported sentences — what a model swap compares (S68)");
});

test("no expectation anywhere → authorship null, never 0; empty rows → turns 0", () => {
  const s = summarizeRows([{ turn: 1, move: "verify", calls: 0, promptTokens: 0, ms: 5 }]);
  assert.equal(s.authorship, null); assert.equal(s.authorshipTurns, 0);
  assert.deepEqual(summarizeRows([]), { turns: 0 });
});

test("compareRuns / renderComparison: one row per figure, labels in order, a null rendered as a dash", () => {
  const cmp = compareRuns([{ label: "A", rows }, { label: "B", rows: rows.slice(0, 1) }]);
  assert.deepEqual(cmp.labels, ["A", "B"]);
  const auth = cmp.table.find((r) => r.figure === "authorship");
  assert.equal(auth.A, 0.75); assert.equal(auth.B, 0.5);
  const md = renderComparison(cmp);
  assert.match(md, /^\| figure \| A \| B \|/);
  assert.match(md, /\| reasked \| 1 \| 0 \|/);
});
