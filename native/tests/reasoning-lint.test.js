// tests/reasoning-lint.test.js — Degrees Kelsen's walls, against the
// REAL machinery: kernel/notes.js (via organs/hyperlexicon.js), the kernel
// task-log, and regime.js's own tagClaim. No stubs; the ledger is real.
import test from "node:test";
import assert from "node:assert/strict";
import * as TL from "../kernel/task-log.js";
import * as cube from "../kernel/cube.js";
import { makeHyperlexicon } from "../organs/hyperlexicon.js";
import { makeNotes } from "../kernel/notes.js";
import { tagClaim } from "../organs/regime.js";
import { claimRef } from "../organs/nesting.js";
import { lintLedger, lintInferences, lintContent, lintReport, LINT_STRICTNESS, findClaimCycle } from "../organs/reasoning-lint.js";

const taskLog = { ...TL, cellOf: cube.cellOf };
const hl = makeHyperlexicon(taskLog);
const kernel = makeNotes({ taskLog });

/** A fresh ledger with a declared frame, plus the door — the real bundle. */
const fresh = () => ({ door: hl, log: hl.createHyperlexicon({ frame: { reader: "test", giver: "reasoning-lint.test.js" } }) });

const span = (ref, i, text) => ({ at: `${ref}#${i * 100}-${i * 100 + text.length}`, ref, text });

const HEAR = (log, end1, label, end2, src, i) =>
  hl.hear(log, { subject: end1, verb: label, object: end2, witness: `${src}~r1`, spans: [span(src, i, `${end1} ${label} ${end2}`)] });

// ── the strictness ladder is three declared degrees ────────────────────────

test("LINT_STRICTNESS is the declared ladder, in order", () => {
  assert.deepEqual([...LINT_STRICTNESS], ["report", "standard", "strict"]);
});

// ── cell resolution: every live claim resolves to a cube cell ─────────────

test("unresolved_cell surfaces only for a note the ledger never resolved to a cell", () => {
  const { door, log } = fresh();
  const l1 = HEAR(log, "speed", "wins", "market", "a.txt", 1);
  const r = lintLedger(l1, { door, taskLog });
  assert.equal(r.findings.some((f) => f.kind === "unresolved_cell"), false, "a heard note carries its operator/grain/cell");
  assert.equal(r.ok, true);
});

// ── the two falsifiable facts of the seed's section 7 ──────────────────────
//
// One ordinance with a sunset clause, one contested claim, same corpus.
// Before regime.js + this linter: a transitivity/circularity-only layer
// either silently resolved the contest (bug 3) or had no way to expire the
// obligation. After: expired fails validity first, contested never wins.

test("acceptance: an expired obligation is reported out of its window at standard, before force/entrenchment", () => {
  const { door, log } = fresh();
  const queryTime = Date.parse("2026-09-11");
  const l1 = HEAR(log, "operators", "must-file", "annual-report", "ordinance.txt", 1);
  // Admission-time tag: O force, a sunset that has passed relative to queryTime.
  const tags = new Map([[hl.assertionId("operators", "must-file", "annual-report"), tagClaim({}, {
    operator: "INS",
    validityText: "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.",
    force: "O",
    queryTime,
  })]]);
  const r = lintLedger(l1, { door, taskLog, tags, queryTime, strictness: "standard" });
  const expired = r.findings.filter((f) => f.kind === "expired_out_of_scope");
  assert.equal(expired.length, 1, "the sunset obligation is named as out of its window");
  assert.match(expired[0].detail, /validity-window check before force or entrenchment/);
});

test("acceptance: a contested claim routes to landContest at standard — never silently picked as a winner", () => {
  const { door, log } = fresh();
  const queryTime = Date.parse("2026-09-11");
  // A contested claim: a source disputes the plot→city land claim.
  let l1 = HEAR(log, "plot", "belongs-to", "city", "city.txt", 1);
  const id = hl.assertionId("plot", "belongs-to", "city");
  const d = hl.dispute(l1, id, { source: "third-party.txt", because: "third party denies the plot belongs to the city", span: span("third-party.txt", 2, "the plot does not belong to the city"), kind: hl.DISPUTE_KINDS.CONTEST });
  l1 = d.refused ? l1 : d.log;
  assert.equal(d.refused, null, "the dispute lands");

  const r = lintLedger(l1, { door, taskLog, queryTime, strictness: "standard" });
  const contested = r.findings.filter((f) => f.kind === "contested_open");
  assert.equal(contested.length, 1);
  assert.match(contested[0].detail, /route to landContest/);
  assert.equal(r.ok, true, "a properly-routed contest is not an error at standard");
});

test("acceptance: an expired obligation as a derivation premise is an error — the sunset had to expire it before it was built on", () => {
  const { door, log } = fresh();
  const queryTime = Date.parse("2026-09-11");
  const l1 = HEAR(log, "operators", "must-file", "annual-report", "ordinance.txt", 1);
  const l2 = HEAR(l1, "annual-report", "must-cover", "fiscal-year", "ordinance.txt", 2);
  const tags = new Map([
    [hl.assertionId("operators", "must-file", "annual-report"), tagClaim({}, { operator: "INS", validityText: "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.", queryTime })],
    [hl.assertionId("annual-report", "must-cover", "fiscal-year"), tagClaim({}, { operator: "INS", queryTime })],
  ]);
  // A derived product resting on the expired premise.
  const derived = TL.append(l2, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:operators|must-file|fiscal-year",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: operators must-file fiscal-year",
    subject: "operators", verb: "must-file", object: "fiscal-year",
    witnesses: [], spans: [], derived: true,
    premises: [hl.assertionId("operators", "must-file", "annual-report")],
    restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 },
  });
  const r = lintLedger(derived, { door, taskLog, tags, queryTime, strictness: "standard" });
  const expiredPremise = r.findings.filter((f) => f.kind === "expired_premise");
  assert.equal(expiredPremise.length, 1);
  assert.match(expiredPremise[0].detail, /sunset clause had to expire it/);
  assert.equal(r.ok, false);
});

test("acceptance: a derived product resting on a contested premise with restsOn.contested = 0 claims a settled base it does not have", () => {
  const { door, log } = fresh();
  let l1 = HEAR(log, "a", "precedes", "b", "src1.txt", 1);
  const bcId = hl.assertionId("b", "precedes", "c");
  l1 = HEAR(l1, "b", "precedes", "c", "src1.txt", 2);
  const d = hl.dispute(l1, bcId, { source: "src2.txt", because: "src2 denies b precedes c", span: span("src2.txt", 1, "b does not precede c"), kind: hl.DISPUTE_KINDS.CONTEST });
  l1 = d.refused ? l1 : d.log;
  const derived = TL.append(l1, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:a|precedes|c",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: a precedes c", subject: "a", verb: "precedes", object: "c",
    witnesses: [], spans: [], derived: true,
    premises: [hl.assertionId("a", "precedes", "b"), bcId],
    restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 2 }, // claims NO contested ground
  });
  const r = lintLedger(derived, { door, taskLog, strictness: "standard" });
  const cp = r.findings.filter((f) => f.kind === "contested_premise");
  assert.equal(cp.length, 1);
  assert.match(cp[0].detail, /restsOn\.contested = 0/);
  assert.equal(r.ok, false);
});

// ── the precedence order run over disagreements ────────────────────────────

test("two live claims at one address resolved by force are reported as resolved by the order, not an error", () => {
  const { door, log } = fresh();
  const l1 = HEAR(log, "corner", "allows", "parking", "rules.txt", 1);
  const l2 = HEAR(l1, "corner", "allows", "loading", "rules.txt", 2);
  const tags = new Map([
    [hl.assertionId("corner", "allows", "parking"), tagClaim({}, { operator: "INS", force: "P" })],
    [hl.assertionId("corner", "allows", "loading"), tagClaim({}, { operator: "INS", force: "O" })],
  ]);
  const r = lintLedger(l2, { door, taskLog, tags, strictness: "standard" });
  const resolved = r.findings.filter((f) => f.kind === "resolved_by_order");
  assert.equal(resolved.length, 1);
  assert.match(resolved[0].detail, /force/);
  assert.equal(r.ok, true, "a disagreement the order can resolve is not incoherence");
});

test("two live claims at one address no rule separates is a standing contradiction (error at standard)", () => {
  const { door, log } = fresh();
  const l1 = HEAR(log, "a", "equals", "x", "m1.txt", 1);
  const l2 = HEAR(l1, "a", "equals", "y", "m2.txt", 2);
  const tags = new Map([
    [hl.assertionId("a", "equals", "x"), tagClaim({}, { operator: "INS", force: "default" })],
    [hl.assertionId("a", "equals", "y"), tagClaim({}, { operator: "INS", force: "default" })],
  ]);
  const r = lintLedger(l2, { door, taskLog, tags, strictness: "standard" });
  const sc = r.findings.filter((f) => f.kind === "standing_contradiction");
  assert.equal(sc.length, 1);
  assert.equal(r.ok, false);
});

test("an unrouted cut (a denial whose link carries no contest) is an error", () => {
  // The text face's hear() does not forward `cut` (a cut reaches the ledger
  // through the door's admit with polarity "-", which lands the contest). To
  // build an UNROUTED cut — a denial heard without a contest landed — use the
  // kernel door directly, exactly as S69's `hear` semantics allow.
  const { door, log } = fresh();
  let l = kernel.hear(log, { end1: "a", label: "precedes", end2: "b", witness: "src1~r1", spans: [span("src1.txt", 1, "a precedes b")] });
  l = kernel.hear(l, { end1: "a", label: "precedes", end2: "b", witness: "denier.txt~r1", spans: [span("denier.txt", 3, "a does not precede b")], cut: true });
  const r = lintLedger(l, { door, taskLog, strictness: "standard" });
  const unrouted = r.findings.filter((f) => f.kind === "unrouted_cut");
  assert.equal(unrouted.length, 1, "a cut with no landed contest on its link is named");
  assert.equal(r.ok, false);
});

// ── circularity (strict) ───────────────────────────────────────────────────

test("findClaimCycle: a directed cycle in the claim graph is found; a DAG is clean", () => {
  const a = { end1: "a", label: "supports", end2: "b", id: "1" };
  const b = { end1: "b", label: "supports", end2: "c", id: "2" };
  const c = { end1: "c", label: "supports", end2: "a", id: "3" };
  const cyc = findClaimCycle([a, b, c]);
  assert.ok(cyc, "a 3-cycle is found");
  assert.equal(cyc.cycle[0], "a");
  assert.equal(findClaimCycle([a, b]), null, "a DAG has no cycle");
});

test("a claim graph that loops is a circular finding at strict, an error", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "speed", "justifies", "winning", "essay.txt", 1);
  l = HEAR(l, "winning", "justifies", "speed", "essay.txt", 2);
  const rStrict = lintLedger(l, { door, taskLog, strictness: "strict" });
  const rReport = lintLedger(l, { door, taskLog, strictness: "report" });
  assert.equal(rStrict.findings.some((f) => f.kind === "circular"), true);
  assert.equal(rStrict.ok, false);
  assert.equal(rReport.findings.some((f) => f.kind === "circular"), false, "circularity is a strict-level finding");
});

// ── the inference tier (R1: structure never licenses composition) ──────────

test("an inference nothing licenses is unlicensed at strict — 'by the same reasoning' over an undeclared operation", async () => {
  const r = await lintInferences([
    { kind: "same-reasoning", end1: "A > B", label: "by the same reasoning", end2: "A² > B²", relation: ">", yields: "square", ref: "math.txt" },
  ], { strictness: "strict" });
  assert.equal(r.findings.some((f) => f.kind === "unlicensed_inference"), true);
  assert.equal(r.ok, false);
});

test("a declared licence for a composition makes it licensed, never an error", async () => {
  const r = await lintInferences([
    { kind: "deduction", end1: "A > B and B > C", label: "therefore", end2: "A > C", relation: ">", yields: ">", ref: "math.txt" },
  ], { licenses: new Set([">→>"]), strictness: "strict" });
  assert.equal(r.findings.some((f) => f.kind === "licensed_inference"), true);
  assert.equal(r.ok, true);
});

test("a universal claim a counterexample refutes is an error at standard", async () => {
  const r = await lintInferences([
    { kind: "universal", end1: "A > B", label: "implies", end2: "A² > B² for all real A, B", ref: "math.txt" },
  ], {
    refute: () => ({ refuted: true, detail: "A=0, B=-1: 0 > -1 but 0² < (-1)²" }),
    strictness: "standard",
  });
  assert.equal(r.findings.some((f) => f.kind === "universal_refuted"), true);
  assert.equal(r.ok, false);
});

test("an equation claim the declared oracle refutes is an error; one that holds is info", async () => {
  const bad = await lintInferences([
    { kind: "equation", statement: "0.1 + 0.2 = 0.3 exactly in IEEE 754", ref: "math.txt" },
  ], { verify: () => ({ verdict: "false", detail: "0.1 + 0.2 = 0.30000000000000004 in IEEE 754" }), strictness: "standard" });
  assert.equal(bad.findings.some((f) => f.kind === "claim_fails_oracle"), true);
  assert.equal(bad.ok, false);

  const good = await lintInferences([
    { kind: "equation", statement: "2 + 2 = 4", ref: "math.txt" },
  ], { verify: () => ({ verdict: "holds" }), strictness: "standard" });
  assert.equal(good.findings.some((f) => f.kind === "claim_holds"), true);
  assert.equal(good.ok, true);
});

// ── content → EOT → holograph → lint, the full door ────────────────────────

test("lintContent runs convert → admit → both lints over a fresh ledger", async () => {
  const convert = () => ({
    arrangements: [
      { subject: "operators", verb: "must-file", object: "annual-report", spans: [span("ordinance.txt", 1, "operators must file an annual report")] },
    ],
    inferences: [
      { kind: "deduction", end1: "A > B and B > C", label: "therefore", end2: "A > C", relation: ">", yields: ">", ref: "math.txt" },
    ],
  });
  const makeLedger = ({ frame }) => { const log = hl.createHyperlexicon({ frame }); return { door: hl, log }; };
  const r = await lintContent({
    text: "operators must file an annual report",
    convert,
    makeLedger,
    source: "lint-source.txt",
    frame: { reader: "test", giver: "reasoning-lint.test.js" },
    licenses: new Set([">→>"]),
    strictness: "strict",
  });
  assert.equal(r.admitted.heard.length, 1, "the arrangement was admitted");
  assert.equal(r.findings.some((f) => f.kind === "licensed_inference"), true);
  assert.equal(r.ok, true);
});

// ── strictness filtering ───────────────────────────────────────────────────

test("strictness filters: a strict-only finding is absent at report and standard, present at strict", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "a", "justifies", "b", "x.txt", 1);
  l = HEAR(l, "b", "justifies", "a", "x.txt", 2);
  for (const s of ["report", "standard"]) {
    const r = lintLedger(l, { door, taskLog, strictness: s });
    assert.equal(r.findings.some((f) => f.kind === "circular"), false, `${s} must not show strict-only circular`);
  }
  assert.equal(lintLedger(l, { door, taskLog, strictness: "strict" }).findings.some((f) => f.kind === "circular"), true);
});

// ── harder: the boundaries the seventeen above do not push ──────────────────
//
// Each case below was chosen because the linter's own prose claims to draw
// the line there: licence granularity (R1 licenses a STEP, never a chain),
// the exclusive `until` of the validity window, what a conceded claim is
// allowed to do, and the honesty of an absent oracle. Real machinery, no
// stubs — except one deliberate stub door used ONLY to reach a note whose
// cell was never resolved, which the real door can never produce.

// ── cycle detection, past the toy graphs ───────────────────────────────────

test("findClaimCycle folds case before hunting — 'Speed → Winning' then 'winning → speed' is a cycle", () => {
  const cyc = findClaimCycle([
    { end1: "Speed", label: "justifies", end2: "Winning", id: "1" },
    { end1: "winning", label: "justifies", end2: "speed", id: "2" },
  ]);
  assert.ok(cyc, "case-folding must not hide a loop");
  assert.equal(cyc.cycle[0], "speed");
  assert.equal(cyc.cycle[cyc.cycle.length - 1], "speed");
});

test("findClaimCycle finds the real loop through a spur, not the dead end", () => {
  const cyc = findClaimCycle([
    { end1: "a", label: "justifies", end2: "b", id: "1" },
    { end1: "a", label: "justifies", end2: "x", id: "2" },
    { end1: "b", label: "justifies", end2: "c", id: "3" },
    { end1: "c", label: "justifies", end2: "d", id: "4" },
    { end1: "d", label: "justifies", end2: "a", id: "5" },
  ]);
  assert.ok(cyc, "the 4-loop through the spur is found");
  assert.deepEqual(cyc.cycle, ["a", "b", "c", "d", "a"]);
});

test("findClaimCycle does not see a self-edge (a→a) as a cycle — documented boundary, not a license", () => {
  // The `a === b` guard deliberately skips self-loops. A claim that justi-
  // fies itself is the purest begging of the question, so this is a KNOWN
  // gap: the guard keeps the graph acyclic but lets self-support pass.
  const cyc = findClaimCycle([{ end1: "a", label: "justifies", end2: "a", id: "1" }]);
  assert.equal(cyc, null, "today the self-edge is skipped — flag this to the maintainers");
});

// ── the disagreement tier the seventeen never reach ────────────────────────

test("a contested claim in a disagreement routes to landContest — contested_disagreement, never a pick", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "corner", "allows", "parking", "rules.txt", 1);
  l = HEAR(l, "corner", "allows", "loading", "rules.txt", 2);
  const d = hl.dispute(l, hl.assertionId("corner", "allows", "loading"), {
    source: "residents.txt", because: "the residents say the corner is loading-only", span: span("residents.txt", 3, "the corner is loading only"), kind: hl.DISPUTE_KINDS.CONTEST,
  });
  l = d.refused ? l : d.log;
  assert.equal(d.refused, null);
  const r = lintLedger(l, { door, taskLog, strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "contested_disagreement"), true);
  assert.equal(r.findings.some((f) => f.kind === "standing_contradiction"), false, "a contested disagreement is never a tie to break");
  assert.equal(r.findings.some((f) => f.kind === "resolved_by_order"), false, "precedence refuses to pick here");
  assert.equal(r.ok, true, "the route-to-landContest warning does not convict");
});

test("a disagreement the validity window settles is expired_in_conflict, before force is consulted", () => {
  const { door, log } = fresh();
  const queryTime = Date.parse("2026-09-11");
  let l = HEAR(log, "corner", "allows", "parking", "rules.txt", 1);
  l = HEAR(l, "corner", "allows", "loading", "rules.txt", 2);
  const tags = new Map([
    [hl.assertionId("corner", "allows", "parking"), tagClaim({}, { operator: "INS", validityText: "This rule is effective as of 2015-01-01 and shall terminate on 2020-12-31.", queryTime })],
    [hl.assertionId("corner", "allows", "loading"), tagClaim({}, { operator: "INS", queryTime })],
  ]);
  const r = lintLedger(l, { door, taskLog, tags, queryTime, strictness: "standard" });
  const eic = r.findings.filter((f) => f.kind === "expired_in_conflict");
  assert.equal(eic.length, 1);
  assert.match(eic[0].detail, /validity_window/);
  assert.equal(r.ok, false);
});

test("the validity window's until is exclusive and from is inclusive, through the linter", () => {
  const { door, log } = fresh();
  const log1 = HEAR(log, "operators", "must-file", "annual-report", "ordinance.txt", 1);
  const TEXT = "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.";
  const atUntil = lintLedger(log1, { door, taskLog, tags: new Map([[hl.assertionId("operators", "must-file", "annual-report"), tagClaim({}, { operator: "INS", validityText: TEXT, queryTime: Date.parse("2020-12-31T00:00:00.000Z") })]]), queryTime: Date.parse("2020-12-31T00:00:00.000Z"), strictness: "report" });
  assert.equal(atUntil.findings.some((f) => f.kind === "expired_out_of_scope"), true, "a query AT the until instant is already out (exclusive until)");
  const oneMsBefore = lintLedger(log1, { door, taskLog, tags: new Map([[hl.assertionId("operators", "must-file", "annual-report"), tagClaim({}, { operator: "INS", validityText: TEXT, queryTime: Date.parse("2020-12-30T23:59:59.999Z") })]]), queryTime: Date.parse("2020-12-30T23:59:59.999Z"), strictness: "report" });
  assert.equal(oneMsBefore.findings.some((f) => f.kind === "expired_out_of_scope"), false, "one millisecond before until it is still in scope");
  const atFrom = lintLedger(log1, { door, taskLog, tags: new Map([[hl.assertionId("operators", "must-file", "annual-report"), tagClaim({}, { operator: "INS", validityText: TEXT, queryTime: Date.parse("2015-01-01T00:00:00.000Z") })]]), queryTime: Date.parse("2015-01-01T00:00:00.000Z"), strictness: "report" });
  assert.equal(atFrom.findings.some((f) => f.kind === "expired_out_of_scope"), false, "a query AT the from instant is in scope (inclusive from)");
});

test("a note heard only through one speaker's testimony is flagged testimony_only; two voices clear it", () => {
  const { door, log } = fresh();
  const single = hl.hear(log, { subject: "driver", verb: "admits", object: "running-red", witness: "testimony:driver#1-9", spans: [span("depo.txt", 1, "the driver admits the red light")] });
  const doubled = hl.hear(single, { subject: "driver", verb: "admits", object: "running-red", witness: "testimony:driver#10-20", spans: [span("depo.txt", 2, "the driver admits the red light")] });
  const r1 = lintLedger(doubled, { door, taskLog, strictness: "report" });
  assert.equal(r1.findings.some((f) => f.kind === "testimony_only"), true, "two snippets, one voice, is an account");
  const twoVoices = hl.hear(doubled, { subject: "driver", verb: "admits", object: "running-red", witness: "testimony:officer#30-40", spans: [span("depo.txt", 3, "the driver admits the red light")] });
  const r2 = lintLedger(twoVoices, { door, taskLog, strictness: "report" });
  assert.equal(r2.findings.some((f) => f.kind === "testimony_only"), false, "a second voice is corroboration, not testimony_only");
});

test("a conceded claim leaves the projection — it can neither stand in a contradiction nor close a loop", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "corner", "allows", "parking", "rules.txt", 1);
  l = HEAR(l, "corner", "allows", "loading", "rules.txt", 2);
  const c = hl.concede(l, hl.assertionId("corner", "allows", "parking"), { trigger: "re-measured and withdrawn" });
  assert.equal(c.refused, null);
  const r = lintLedger(c.log, { door, taskLog, strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "standing_contradiction"), false, "a conceded claim is not a standing contradiction");
  assert.equal(r.ok, true);
});

test("a concession breaks a support cycle: the strict circular finding no longer fires", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "speed", "justifies", "winning", "essay.txt", 1);
  l = HEAR(l, "winning", "justifies", "speed", "essay.txt", 2);
  const c = hl.concede(l, hl.assertionId("speed", "justifies", "winning"), { trigger: "withdrawn" });
  assert.equal(c.refused, null);
  const r = lintLedger(c.log, { door, taskLog, strictness: "strict" });
  assert.equal(r.findings.some((f) => f.kind === "circular"), false, "the loop is cut by the concession");
  assert.equal(r.ok, true);
});

test("a case-folded re-hearing is the same note: one fold entry, no contradiction", () => {
  const { door, log } = fresh();
  let l = hl.hear(log, { subject: "a", verb: "equals", object: "X", witness: "m.txt~r1", spans: [span("m.txt", 1, "a equals X")] });
  const again = hl.hear(l, { subject: "a", verb: "equals", object: "x", witness: "m.txt~r1", spans: [span("m.txt", 1, "a equals X")] });
  assert.equal(again === l, true, "a byte-identical re-hearing appends nothing");
  const r = lintLedger(again, { door, taskLog, strictness: "standard" });
  assert.equal(hl.foldHyperlexicon(again).length, 1);
  assert.equal(r.findings.some((f) => f.kind === "standing_contradiction"), false);
  assert.equal(r.ok, true);
});

test("a note under two open contests names both sources and is in the contested set", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "plot", "belongs-to", "city", "city.txt", 1);
  const id = hl.assertionId("plot", "belongs-to", "city");
  let d = hl.dispute(l, id, { source: "srcA.txt", because: "A denies the plot is the city's", span: span("srcA.txt", 1, "the plot is not the city's"), kind: hl.DISPUTE_KINDS.CONTEST });
  l = d.refused ? l : d.log;
  d = hl.dispute(l, id, { source: "srcB.txt", because: "B denies the plot is the city's", span: span("srcB.txt", 1, "the plot is not the city's"), kind: hl.DISPUTE_KINDS.CONTEST });
  l = d.refused ? l : d.log;
  const r = lintLedger(l, { door, taskLog, strictness: "report" });
  const co = r.findings.filter((f) => f.kind === "contested_open");
  assert.equal(co.length, 1);
  assert.match(co[0].detail, /srcA\.txt, srcB\.txt/);
  assert.equal(r.contested.includes(id), true);
});

test("a note whose cell never resolved is reported, and is excluded from disagreement resolution", () => {
  // The real door always resolves a cell, so this boundary is reached with
  // a deliberately minimal stub door/taskLog — the only stub in this file.
  const stub = {
    log: {},
    door: {
      foldHyperlexicon: () => [
        { id: "u", end1: "a", label: "claims", end2: "x", witnesses: ["s1~r1"] },
        { id: "v", end1: "a", label: "claims", end2: "y", witnesses: ["s2~r1"] },
      ],
      foldCuts: () => [],
      disputesOf: () => new Map(),
      concededIds: () => new Set(),
    },
    taskLog: {
      projectTasks: () => [
        { task_id: "u" },
        { task_id: "v", operator: "INS", grain: "Figure", cell: "INS×Figure" },
      ],
    },
  };
  const r = lintLedger(stub.log, { door: stub.door, taskLog: stub.taskLog, strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "unresolved_cell"), true, "the unresolved note is named");
  assert.equal(r.findings.some((f) => f.kind === "standing_contradiction"), false, "unresolved notes cannot be reasoned about — the pair is held, not judged");
  assert.equal(r.ok, true, "unresolved_cell is disclosure, not a conviction");
});

// ── derived products on premises that are BOTH expired and contested ───────

test("a derived product on a premise that is expired AND contested earns both errors", () => {
  const { door, log } = fresh();
  const queryTime = Date.parse("2026-09-11");
  let l = HEAR(log, "operators", "must-file", "annual-report", "ordinance.txt", 1);
  const id = hl.assertionId("operators", "must-file", "annual-report");
  const d = hl.dispute(l, id, { source: "regulator.txt", because: "the regulator denies the filing duty", span: span("regulator.txt", 4, "there is no filing duty"), kind: hl.DISPUTE_KINDS.CONTEST });
  l = d.refused ? l : d.log;
  const tags = new Map([[id, tagClaim({}, { operator: "INS", validityText: "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.", queryTime })]]);
  const derived = TL.append(l, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:operators|must-file|fiscal-year",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: operators must-file fiscal-year",
    subject: "operators", verb: "must-file", object: "fiscal-year",
    witnesses: [], spans: [], derived: true,
    premises: [id], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 },
  });
  const r = lintLedger(derived, { door, taskLog, tags, queryTime, strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "expired_premise"), true);
  assert.equal(r.findings.some((f) => f.kind === "contested_premise"), true);
  assert.equal(r.ok, false);
});

test("a derived product that DOES record its contested ground is not a contested_premise", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "a", "precedes", "b", "src1.txt", 1);
  const id = hl.assertionId("a", "precedes", "b");
  const d = hl.dispute(l, id, { source: "src2.txt", because: "src2 denies it", span: span("src2.txt", 1, "a does not precede b"), kind: hl.DISPUTE_KINDS.CONTEST });
  l = d.refused ? l : d.log;
  const derived = TL.append(l, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:a|precedes|c",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: a precedes c", subject: "a", verb: "precedes", object: "c",
    witnesses: [], spans: [], derived: true,
    premises: [id], restsOn: { sources: 1, instruments: 1, contested: 1, grounds: 2 },
  });
  const r = lintLedger(derived, { door, taskLog, strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "contested_premise"), false, "the declared contested ground clears it");
  assert.equal(r.ok, true);
});

// ── the inference tier, past the two happy paths ───────────────────────────

test("licences can be a function, and grant one STEP — a same-reasoning with an undeclared yields stays unlicensed", async () => {
  const r = await lintInferences([
    { kind: "deduction", end1: "A > B and B > C", label: "therefore", end2: "A > C", relation: ">", yields: ">", ref: "math.txt" },
    { kind: "same-reasoning", end1: "A > B", label: "by the same reasoning", end2: "A² > B²", relation: ">", yields: "square", ref: "math.txt" },
  ], { licenses: (rel, yields) => rel === ">" && yields === ">", strictness: "strict" });
  assert.equal(r.findings.some((f) => f.kind === "licensed_inference"), true);
  assert.equal(r.findings.some((f) => f.kind === "unlicensed_inference"), true, "squaring is a different composition than transitivity");
  assert.equal(r.ok, false);
});

test("a licence keyed to the wrong yields does not cover the step — >→> never licences squaring", async () => {
  const r = await lintInferences([
    { kind: "same-reasoning", end1: "A > B", label: "by the same reasoning", end2: "A² > B²", relation: ">", yields: "square", ref: "math.txt" },
  ], { licenses: new Set([">→>"]), strictness: "strict" });
  assert.equal(r.findings.some((f) => f.kind === "unlicensed_inference"), true);
  assert.equal(r.ok, false);
});

test("inference-tier strictness: an unlicensed inference is invisible at report and standard, fatal at strict", async () => {
  const INF = [{ kind: "same-reasoning", end1: "A > B", label: "by the same reasoning", end2: "A² > B²", relation: ">", yields: "square", ref: "math.txt" }];
  for (const s of ["report", "standard"]) {
    const r = await lintInferences(INF, { strictness: s });
    assert.equal(r.findings.some((f) => f.kind === "unlicensed_inference"), false, `${s} must not show strict-only unlicensed`);
    assert.equal(r.ok, true);
  }
  const strict = await lintInferences(INF, { strictness: "strict" });
  assert.equal(strict.findings.some((f) => f.kind === "unlicensed_inference"), true);
  assert.equal(strict.ok, false);
});

test("an undeclared inference kind is a warn, never an error, at any strictness", async () => {
  for (const s of ["report", "standard", "strict"]) {
    const r = await lintInferences([{ kind: "psychic", end1: "a", label: "therefore", end2: "b", ref: "x.txt" }], { strictness: s });
    assert.equal(r.findings.some((f) => f.kind === "unknown_inference_kind"), true);
    assert.equal(r.ok, true, `an unknown kind warns but never convicts at ${s}`);
  }
});

test("vacuous_support surfaces at report as info, and never fails the ledger", async () => {
  const r = await lintInferences([
    { kind: "vacuous", end1: "since 2¹⁰ = 2¹⁰", label: "we get", end2: "2¹⁰ + 2¹⁰ = 2¹¹", detail: "X = X restated", ref: "math.txt" },
  ], { strictness: "standard" });
  const v = r.findings.filter((f) => f.kind === "vacuous_support");
  assert.equal(v.length, 1);
  assert.equal(v[0].severity, "info");
  assert.equal(r.ok, true);
});

test("an equation the oracle calls undefined is an error — 1/0 is not infinite", async () => {
  const r = await lintInferences([
    { kind: "equation", statement: "1 / 0 = ∞", ref: "math.txt" },
  ], { verify: () => ({ verdict: "undefined", detail: "1/0 is undefined — no value satisfies it" }), strictness: "standard" });
  const u = r.findings.filter((f) => f.kind === "undefined_claim");
  assert.equal(u.length, 1);
  assert.equal(u[0].severity, "error");
  assert.equal(r.ok, false);
});

test("an equation the oracle calls ambiguous is convention_dispute, info — never a conviction", async () => {
  const r = await lintInferences([
    { kind: "equation", statement: "√16 = ±4", ref: "math.txt" },
  ], { verify: () => ({ verdict: "ambiguous", detail: "principal root vs equation-solving convention" }), strictness: "standard" });
  const c = r.findings.filter((f) => f.kind === "convention_dispute");
  assert.equal(c.length, 1);
  assert.equal(c[0].severity, "info");
  assert.equal(r.ok, true);
});

test("a universal that survives the counterexample search is checked — report info, not silent", async () => {
  const r = await lintInferences([
    { kind: "universal", end1: "A > B", label: "implies", end2: "A + c > B + c for all real A, B, c", ref: "math.txt" },
  ], { refute: () => ({ refuted: false, detail: "no counterexample found in 10⁴ samples" }), strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "universal_checked"), true);
  assert.equal(r.ok, true);
});

test("a universal with no oracle injected is left alone — absence is honest, not a pass", async () => {
  const r = await lintInferences([
    { kind: "universal", end1: "A > B", label: "implies", end2: "A² > B² for all real A, B", ref: "math.txt" },
  ], { strictness: "standard" });
  assert.equal(r.findings.length, 0, "no oracle, no fabricated verdict");
  assert.equal(r.ok, true);
});

test("an equation with no oracle injected is left alone for the same reason", async () => {
  const r = await lintInferences([
    { kind: "equation", statement: "0.1 + 0.2 = 0.3", ref: "math.txt" },
  ], { strictness: "standard" });
  assert.equal(r.findings.length, 0);
  assert.equal(r.ok, true);
});

test("an oracle that withholds (unchecked) produces a disclosed gap, never a conviction", async () => {
  const r = await lintInferences([
    { kind: "equation", statement: "this JS function computes the factorial", ref: "code.txt" },
  ], { verify: () => ({ verdict: "unchecked", detail: "javascript cannot be executed by this oracle" }), strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "oracle_withheld" && f.severity === "info"), true, "a withheld claim is disclosed");
  assert.equal(r.findings.some((f) => f.severity === "error"), false, "withholding never convicts");
  assert.equal(r.ok, true, "a gap is not an error");
});

test("mixed verdicts in one call: counts keep both, and one error fails the whole", async () => {
  const r = await lintInferences([
    { kind: "equation", statement: "2 + 2 = 4", ref: "a.txt" },
    { kind: "equation", statement: "0.1 + 0.2 = 0.3", ref: "b.txt" },
  ], { verify: (inf) => inf.statement.startsWith("2 + 2") ? { verdict: "holds", detail: "4" } : { verdict: "false", detail: "0.30000000000000004" }, strictness: "standard" });
  assert.equal(r.counts.claim_holds, 1);
  assert.equal(r.counts.claim_fails_oracle, 1);
  assert.equal(r.ok, false);
});

test("a finding without a ref is attributed to the inference's own end1", async () => {
  const r = await lintInferences([
    { kind: "equation", end1: "0.1 + 0.2 = 0.3", statement: "0.1 + 0.2 = 0.3" },
  ], { verify: () => ({ verdict: "false", detail: "it is 0.30000000000000004" }), strictness: "standard" });
  const f = r.findings.find((x) => x.kind === "claim_fails_oracle");
  assert.ok(f);
  assert.equal(f.at, "0.1 + 0.2 = 0.3");
});

// ── the full door, past the happy path ─────────────────────────────────────

test("lintContent surfaces what the door turned away — nothing is silently dropped", async () => {
  const convert = () => ({
    arrangements: [
      { subject: "operators", verb: "must-file", object: "annual-report", spans: [span("ordinance.txt", 1, "operators must file an annual report")] },
      { subject: "operators", verb: "must-file", object: "", spans: [span("ordinance.txt", 2, "operators must file")] },
    ],
    inferences: [],
  });
  const makeLedger = ({ frame }) => { const log = hl.createHyperlexicon({ frame }); return { door: hl, log }; };
  const r = await lintContent({ text: "x", convert, makeLedger, source: "ordinance.txt", frame: { reader: "test", giver: "reasoning-lint.test.js" }, strictness: "standard" });
  assert.equal(r.admitted.heard.length, 1, "the complete arrangement is admitted");
  assert.equal(r.admitted.turnedAway.length, 1, "the incomplete one is turned away with a reason");
  assert.equal(r.admitted.turnedAway[0].reason, "incomplete");
  assert.equal(r.ok, true);
});

test("tagsOf feeds admission-time tags end to end — the expiry is seen on the fresh ledger", async () => {
  const queryTime = Date.parse("2026-09-11");
  const convert = () => ({
    arrangements: [{ subject: "operators", verb: "must-file", object: "annual-report", spans: [span("ordinance.txt", 1, "operators must file an annual report")] }],
    inferences: [],
  });
  const makeLedger = ({ frame }) => { const log = hl.createHyperlexicon({ frame }); return { door: hl, log }; };
  const r = await lintContent({
    text: "operators must file an annual report", convert, makeLedger, source: "ordinance.txt",
    frame: { reader: "test", giver: "reasoning-lint.test.js" }, queryTime, strictness: "report",
    tagsOf: () => tagClaim({}, { operator: "INS", validityText: "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.", queryTime }),
  });
  assert.equal(r.findings.some((f) => f.kind === "expired_out_of_scope"), true, "the admission-time tag travels through to the lint");
});

test("strictness holds through the full door: unlicensed content is fatal at strict, clean at standard", async () => {
  const INF = [{ kind: "same-reasoning", end1: "A > B", label: "by the same reasoning", end2: "A² > B²", relation: ">", yields: "square", ref: "math.txt" }];
  const convert = () => ({ arrangements: [], inferences: INF });
  const makeLedger = ({ frame }) => { const log = hl.createHyperlexicon({ frame }); return { door: hl, log }; };
  const strict = await lintContent({ text: "x", convert, makeLedger, source: "math.txt", frame: { reader: "test", giver: "reasoning-lint.test.js" }, licenses: new Set([">→>"]), strictness: "strict" });
  assert.equal(strict.findings.some((f) => f.kind === "unlicensed_inference"), true);
  assert.equal(strict.ok, false);
  const standard = await lintContent({ text: "x", convert, makeLedger, source: "math.txt", frame: { reader: "test", giver: "reasoning-lint.test.js" }, licenses: new Set([">→>"]), strictness: "standard" });
  assert.equal(standard.findings.some((f) => f.kind === "unlicensed_inference"), false);
  assert.equal(standard.ok, true);
});

// ── the report, and the honesty of its one-line-per-finding promise ────────

test("lintReport emits one line per distinct finding, grouping duplicates", () => {
  const lines = lintReport({
    findings: [
      { kind: "claim_fails_oracle", level: "standard", severity: "error", detail: "the same failure" },
      { kind: "claim_fails_oracle", level: "standard", severity: "error", detail: "the same failure" },
      { kind: "claim_holds", level: "report", severity: "info", detail: "a different one" },
    ],
  });
  assert.equal(lines.length, 2);
  assert.match(lines[0], /\[standard·error\] claim_fails_oracle: the same failure/);
});

// ── harder: nesting — claims whose ends are themselves claims (claim:ref) ──
//
// A nested end is an ordinary string to THIS linter (nesting.js owns depth
// and the leak wall; reasoning-lint never re-derives either). What the
// linter must still do is read the nested ledger honestly: a contest on the
// inner claim never contaminates the outer attribution note, a cycle that
// runs through a claim:ref is still a cycle, and a disagreement at one
// address is judged on the address, whatever its ends name.

test("nesting: a contest on the inner claim stays on the inner claim — the attribution note is never contaminated", () => {
  const { door, log } = fresh();
  const INNER = hl.assertionId("napoleon", "fought", "kutuzov");
  const OUTER = hl.assertionId("Tolstoy", "states", claimRef(INNER));
  let l = HEAR(log, "napoleon", "fought", "kutuzov", "borodino.txt", 1);
  l = HEAR(l, "Tolstoy", "states", claimRef(INNER), "critics.txt", 2);
  const d = hl.dispute(l, INNER, { source: "skeptic.txt", because: "the skeptic denies the battle claim", span: span("skeptic.txt", 1, "the battle claim is false"), kind: hl.DISPUTE_KINDS.CONTEST });
  l = d.refused ? l : d.log;
  const r = lintLedger(l, { door, taskLog, strictness: "report" });
  assert.equal(r.contested.includes(INNER), true, "the inner claim is under contest");
  assert.equal(r.contested.includes(OUTER), false, "the attribution note is not — contest is per note id");
  assert.equal(r.findings.some((f) => f.kind === "contested_open" && f.note === OUTER), false);
  assert.equal(r.ok, true);
});

test("nesting: a support cycle that runs through a claim:ref end is still a cycle at strict", () => {
  const INNER = hl.assertionId("napoleon", "fought", "kutuzov");
  const cyc = findClaimCycle([
    { end1: "napoleon", label: "fought", end2: "kutuzov", id: INNER },
    { end1: "kutuzov", label: "justifies", end2: claimRef(INNER), id: "k2" },
    { end1: claimRef(INNER), label: "justifies", end2: "napoleon", id: "k3" },
  ]);
  assert.ok(cyc, "napoleon → kutuzov → claim:… → napoleon is a loop");
  assert.equal(cyc.cycle[0], "napoleon");
  assert.equal(cyc.cycle.includes(claimRef(INNER)), true, "the nested reference is a first-class node in the graph");

  const { door, log } = fresh();
  let l = HEAR(log, "napoleon", "fought", "kutuzov", "borodino.txt", 1);
  l = HEAR(l, "kutuzov", "justifies", claimRef(INNER), "essay.txt", 2);
  l = HEAR(l, claimRef(INNER), "justifies", "napoleon", "essay.txt", 3);
  const strict = lintLedger(l, { door, taskLog, strictness: "strict" });
  assert.equal(strict.findings.some((f) => f.kind === "circular"), true);
  assert.equal(strict.ok, false);
  const standard = lintLedger(l, { door, taskLog, strictness: "standard" });
  assert.equal(standard.findings.some((f) => f.kind === "circular"), false, "circularity stays a strict-level finding through nesting");
  assert.equal(standard.ok, true);
});

test("nesting: two nested ends disagreeing at one address are a standing contradiction", () => {
  const { door, log } = fresh();
  let l = HEAR(log, "critic", "states", claimRef("x|y|z"), "m1.txt", 1);
  l = HEAR(l, "critic", "states", claimRef("p|q|r"), "m2.txt", 2);
  const r = lintLedger(l, { door, taskLog, strictness: "standard" });
  const sc = r.findings.filter((f) => f.kind === "standing_contradiction");
  assert.equal(sc.length, 1, "the same speaker named two different claims is a live disagreement");
  assert.equal(r.ok, false);
});

test("nesting: a derived product resting on a contested ATTRIBUTION earns contested_premise; the inner claim's own contest does not", () => {
  const { door, log } = fresh();
  const INNER = hl.assertionId("napoleon", "fought", "kutuzov");
  const OUTER = hl.assertionId("Tolstoy", "states", claimRef(INNER));

  let l = HEAR(log, "napoleon", "fought", "kutuzov", "borodino.txt", 1);
  l = HEAR(l, "Tolstoy", "states", claimRef(INNER), "critics.txt", 2);
  let d = hl.dispute(l, OUTER, { source: "skeptic.txt", because: "the skeptic denies Tolstoy said it", span: span("skeptic.txt", 2, "Tolstoy never said it"), kind: hl.DISPUTE_KINDS.CONTEST });
  l = d.refused ? l : d.log;
  const derived = TL.append(l, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:report|relies|on-attribution",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: report relies on the attribution", subject: "report", verb: "relies-on", object: "attribution",
    witnesses: [], spans: [], derived: true,
    premises: [OUTER], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 },
  });
  const r = lintLedger(derived, { door, taskLog, strictness: "standard" });
  assert.equal(r.findings.some((f) => f.kind === "contested_premise"), true, "the contested outer note is the premise the product names");

  // Counter-case: only the INNER claim is contested; a product resting on the
  // clean attribution note has no contested premise of its own.
  let l2 = HEAR(log, "napoleon", "fought", "kutuzov", "borodino.txt", 1);
  l2 = HEAR(l2, "Tolstoy", "states", claimRef(INNER), "critics.txt", 2);
  d = hl.dispute(l2, INNER, { source: "skeptic.txt", because: "the skeptic denies the battle claim", span: span("skeptic.txt", 1, "the battle claim is false"), kind: hl.DISPUTE_KINDS.CONTEST });
  l2 = d.refused ? l2 : d.log;
  const derived2 = TL.append(l2, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:report|relies|on-attribution",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: report relies on the attribution", subject: "report", verb: "relies-on", object: "attribution",
    witnesses: [], spans: [], derived: true,
    premises: [OUTER], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 },
  });
  const r2 = lintLedger(derived2, { door, taskLog, strictness: "standard" });
  assert.equal(r2.findings.some((f) => f.kind === "contested_premise"), false, "the inner contest does not leak up to the premise");
  assert.equal(r2.ok, true, "the inner contest is disclosed as contested_open, never a conviction on the product");
});

test("nesting: an unresolved claim:ref end is left alone — depth resolution is nesting.js's, not the linter's", () => {
  const { door, log } = fresh();
  const l = HEAR(log, "critic", "states", claimRef("never|heard|here"), "m1.txt", 1);
  const r = lintLedger(l, { door, taskLog, strictness: "standard" });
  assert.equal(r.ok, true, "an inner claim never heard is not a linter error");
  assert.equal(r.findings.some((f) => f.kind === "unresolved_cell"), false, "the outer note resolved to its own cell");
  assert.equal(r.findings.some((f) => f.severity === "error"), false);
});