// obligation.test.mjs — the ledger's walls.
import test from "node:test";
import assert from "node:assert/strict";
import { admitObligations, mark, standings, coverage, STANDINGS } from "./obligation.js";

const SPEC = `Build the widget as follows:
1. The header must hold still at every width.
2) Attachments are copied, never live-linked.
- the record is append-only
3. No non-localhost host anywhere.`;

test("the door: declared enumeration splits into clauses; bare prose is a TYPED refusal, never invented boundaries", () => {
  const { ledger } = admitObligations(SPEC);
  assert.equal(ledger.clauses.length, 4, "numbered, parenthesised, and bulleted marks all count");
  assert.match(ledger.clauses[2].text, /append-only/);
  const prose = admitObligations("Please make everything nice and also fast, thanks.");
  assert.equal(prose.refused, "no_enumeration");
});

test("every clause starts NOT-YET-VISITED — absence of a visit is its own standing, never satisfied by silence", () => {
  const { ledger } = admitObligations(SPEC);
  const cov = coverage(ledger);
  assert.equal(cov.counts["not-yet-visited"], 4);
  assert.equal(cov.complete, false);
  assert.equal(cov.unvisited.length, 4, "the unvisited are NAMED, not just tallied");
});

test("standing changes are append-only with a because; a violation later satisfied keeps its history on the log", () => {
  let { ledger } = admitObligations(SPEC);
  assert.equal(mark(ledger, "ob-1", "satisfied", {}).refused, "no_because");
  ({ ledger } = mark(ledger, "ob-1", "violated", { because: "the header re-measures when the status line changes", refs: ["app.js#812-840"] }));
  ({ ledger } = mark(ledger, "ob-1", "satisfied", { because: "transient messages moved to #status-line; header holds", refs: ["app.js#812-870"] }));
  const s = standings(ledger).find((x) => x.id === "ob-1");
  assert.equal(s.standing, "satisfied");
  assert.ok(ledger.entries.some((e) => e.clause === "ob-1" && e.standing === "violated"), "the road stays on the log");
  assert.deepEqual(s.refs, ["app.js#812-870"], "the current standing carries its addresses (P5.2 for obligations)");
});

test("a waiver needs a reason AND a name — an unattributed waiver is a deletion in a standing's clothes", () => {
  let { ledger } = admitObligations(SPEC);
  assert.equal(mark(ledger, "ob-4", "waived", { because: "out of scope this pass" }).refused, "waiver_needs_names");
  ({ ledger } = mark(ledger, "ob-4", "waived", { because: "out of scope this pass", waivedBy: "user, 2026-09-02" }));
  assert.equal(standings(ledger).find((x) => x.id === "ob-4").standing, "waived");
});

test("coverage is ENUMERATION: complete only when nothing is unvisited AND nothing stands violated", () => {
  let { ledger } = admitObligations(SPEC);
  ({ ledger } = mark(ledger, "ob-1", "satisfied", { because: "done" }));
  ({ ledger } = mark(ledger, "ob-2", "satisfied", { because: "done" }));
  ({ ledger } = mark(ledger, "ob-3", "violated", { because: "found a truncation" }));
  ({ ledger } = mark(ledger, "ob-4", "waived", { because: "scope", waivedBy: "user" }));
  let cov = coverage(ledger);
  assert.equal(cov.complete, false, "a standing violation blocks completion");
  assert.deepEqual(cov.violated, ["ob-3"]);
  ({ ledger } = mark(ledger, "ob-3", "satisfied", { because: "truncation removed", refs: ["fold.js#10-30"] }));
  cov = coverage(ledger);
  assert.equal(cov.complete, true);
  assert.equal(cov.counts.satisfied, 3);
});

test("unknown clause and unknown standing are typed refusals", () => {
  const { ledger } = admitObligations(SPEC);
  assert.equal(mark(ledger, "ob-99", "satisfied", { because: "x" }).refused, "unknown_clause");
  assert.equal(mark(ledger, "ob-1", "done", { because: "x" }).refused, "unknown_standing");
  assert.equal(STANDINGS.length, 4);
});
