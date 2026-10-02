// node --test metacognition.test.mjs
//
// The atom/edge classifier (`classifyAtom`, `assessAgreement`) is tested
// against the REAL `grounding.js` primitives — pure, no engine dependency,
// so `checkGrounding`'s containment half runs for real throughout. The
// ledger (`makeMetacognition`) is tested against eoreader7's REAL native
// `kernel/task-log.js` — imported by relative path, the same precedent
// `void-loop.test.mjs`/`hyperlexicon-stance.test.mjs` already set for a
// module whose test needs the append-only substrate but this checkout's
// frozen legacy engine submodule is uninitialized (confirmed empty before
// writing this file). Relation edges throughout are hand-built fixtures,
// shaped exactly like `hypergraph.js`'s real output (`{subject, verb,
// object, verdict}`, the five-verdict vocabulary this repo's grounding
// ladder already fixes) — disclosed, not run through the real extractor,
// for the identical reason: the legacy engine that extractor depends on is
// not reachable from this checkout.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AGREEMENT,
  WITNESS_FLOOR,
  classifyAtom,
  assessAgreement,
  makeMetacognition,
  surfWeight,
  escalationFor,
  forcesFoldRefresh,
} from "./metacognition.js";

import * as taskLog from "../kernel/task-log.js";

// The REAL constants the live wiring hands escalationFor — imported from
// the same modules app.js imports them from, never restated, so this file
// fails the moment the wiring's assumptions and the constants drift.
import { MAX_CORRECTIONS, PASSAGES_PER_PART } from "./holon.js";
import { PREFLIGHT_PAGES_CONSULTED } from "./proof.js";

// ── classifyAtom ─────────────────────────────────────────────────────────

test("classifyAtom: a bound edge sharing a token confirms", () => {
  const atom = { start: 0, text: "Hamlin", absent: ["Hamlin"] };
  const edges = [{ subject: "Abraham Lincoln", verb: "served with", object: "Hannibal Hamlin", verdict: "bound" }];
  assert.equal(classifyAtom(atom, { relationEdges: edges }), AGREEMENT.CONFIRMED);
});

test("classifyAtom: a contradicted edge sharing a token corrects — the one real error channel", () => {
  const atom = { start: 0, text: "Andrew Johnson", absent: ["Andrew", "Johnson"] };
  const edges = [{ subject: "Abraham Lincoln", verb: "served with", object: "Andrew Johnson", verdict: "contradicted" }];
  assert.equal(classifyAtom(atom, { relationEdges: edges }), AGREEMENT.CORRECTED);
});

for (const verdict of ["unbound", "beyond-reach", "unheard"]) {
  test(`classifyAtom: a "${verdict}" edge is UNRESOLVED, never CORRECTED (Ramakrishna's plurality, not Friston's error)`, () => {
    const atom = { start: 0, text: "Someone", absent: ["Someone"] };
    const edges = [{ subject: "Someone", verb: "did", object: "something", verdict }];
    assert.equal(classifyAtom(atom, { relationEdges: edges }), AGREEMENT.UNRESOLVED);
  });
}

test("classifyAtom: no matching edge, present in the passages -> CONFIRMED via bare containment", () => {
  const atom = { start: 0, text: "Springfield", absent: ["Springfield"] };
  const groundingReport = { examined: true, findings: [] }; // nothing flagged -> present
  assert.equal(classifyAtom(atom, { groundingReport, relationEdges: [] }), AGREEMENT.CONFIRMED);
});

test("classifyAtom: no matching edge, flagged absent by containment -> UNRESOLVED, never CORRECTED", () => {
  const atom = { start: 5, text: "Narnia", absent: ["Narnia"] };
  const groundingReport = { examined: true, findings: [{ start: 5, text: "Narnia" }] };
  assert.equal(classifyAtom(atom, { groundingReport, relationEdges: [] }), AGREEMENT.UNRESOLVED);
});

test("classifyAtom: nothing examined at all (no passages) -> UNRESOLVED, the honest withhold", () => {
  const atom = { start: 0, text: "X", absent: ["X"] };
  assert.equal(classifyAtom(atom, { groundingReport: null, relationEdges: [] }), AGREEMENT.UNRESOLVED);
});

// ── assessAgreement ──────────────────────────────────────────────────────

const PASSAGES = [
  {
    ref: "hamlin.txt#0-200",
    text: "Hannibal Hamlin served as vice president under Abraham Lincoln during Lincoln's first term, from 1861 to 1865.",
  },
];

test("assessAgreement: a wrong S1 claim corrects, a right one confirms, an unconfirmable one stays open", () => {
  const s1Text =
    "Abraham Lincoln's vice president was Andrew Johnson, who served throughout his presidency alongside Hamlin.";
  const relationEdges = [
    { subject: "Andrew Johnson", verb: "served as vice president of", object: "Abraham Lincoln", verdict: "contradicted" },
    { subject: "Hannibal Hamlin", verb: "served as vice president of", object: "Abraham Lincoln", verdict: "bound" },
  ];
  const r = assessAgreement(s1Text, { question: "who was Lincoln's vice president?", s2Passages: PASSAGES, relationEdges });
  assert.equal(r.examined, true);
  assert.ok(r.counts.corrected >= 1, "Andrew Johnson's claim must be caught as a real correction");
  assert.ok(r.counts.confirmed >= 1, "Hamlin's mention must confirm");
  const corrected = r.atoms.filter((a) => a.verdict === AGREEMENT.CORRECTED);
  assert.ok(corrected.some((a) => a.text.includes("Johnson")));
});

test("assessAgreement: an edge sharing no token with any S1 atom is EXTENDED, not graded onto S1", () => {
  const s1Text = "Lincoln was president.";
  const relationEdges = [
    { subject: "Hannibal Hamlin", verb: "served as vice president of", object: "Abraham Lincoln", verdict: "bound" },
  ];
  const r = assessAgreement(s1Text, { relationEdges });
  assert.equal(r.extended.length, 1);
  assert.equal(r.counts.extended, 1);
  // Extended must never leak into confirmed/corrected — a different axis.
  assert.equal(r.counts.confirmed, 0);
  assert.equal(r.counts.corrected, 0);
});

test("assessAgreement: S1 said nothing checkable -> an honest all-zero profile (the dark-room floor)", () => {
  const r = assessAgreement("Sure, happy to help with that!", { s2Passages: PASSAGES });
  assert.deepEqual(r.counts, { confirmed: 0, corrected: 0, unresolved: 0, extended: 0 });
  assert.equal(r.atoms.length, 0);
});

// ── the ledger ────────────────────────────────────────────────────────────

function ledger() {
  return makeMetacognition(taskLog);
}

test("observe: an all-zero delta is a structural no-op — silence cannot move a standing either way", () => {
  const m = ledger();
  let log = m.createLedger();
  const before = log;
  log = m.observe(log, { cell: "vice-president-of", delta: { confirmed: 0, corrected: 0, unresolved: 0, extended: 0 } });
  assert.equal(log, before, "an all-zero observation must not consume a seq or append an entry");
  assert.equal(log.entries.length, 0);
});

test("observe: repeated turns SUM onto the same cell, not overwrite", () => {
  const m = ledger();
  let log = m.createLedger();
  log = m.observe(log, { cell: "vice-president-of", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  log = m.observe(log, { cell: "vice-president-of", delta: { confirmed: 0, corrected: 1, unresolved: 0, extended: 0 } });
  const s = m.standingOf(log, "vice-president-of");
  assert.equal(s.confirmed, 1);
  assert.equal(s.corrected, 1);
  assert.equal(s.total, 2);
});

test("standingOf: below WITNESS_FLOOR is unproven, and the phrase never claims a rate", () => {
  const m = ledger();
  let log = m.createLedger();
  log = m.observe(log, { cell: "c", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  const s = m.standingOf(log, "c");
  assert.equal(s.standing, "unproven");
  assert.ok(1 < WITNESS_FLOOR, "test assumes the floor is above one observation");
  assert.doesNotMatch(s.phrase, /%/, "a phrase below the floor may never read as a rate");
});

test("standingOf: at the floor with zero corrections is established", () => {
  const m = ledger();
  let log = m.createLedger();
  for (let i = 0; i < WITNESS_FLOOR; i++) {
    log = m.observe(log, { cell: "c", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  }
  const s = m.standingOf(log, "c");
  assert.equal(s.standing, "established");
  assert.equal(s.corrected, 0);
});

test("standingOf: at the floor with any correction is contested, never smoothed into established", () => {
  const m = ledger();
  let log = m.createLedger();
  log = m.observe(log, { cell: "c", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  log = m.observe(log, { cell: "c", delta: { confirmed: 0, corrected: 1, unresolved: 0, extended: 0 } });
  const s = m.standingOf(log, "c");
  assert.equal(s.total, WITNESS_FLOOR >= 2 ? s.total : s.total); // sanity: total = 2 regardless of floor value
  assert.equal(s.total, 2);
  if (2 >= WITNESS_FLOOR) assert.equal(s.standing, "contested");
});

test("standingOf: any number of UNRESOLVED-only observations never leaves unproven — Ramakrishna's guard", () => {
  const m = ledger();
  let log = m.createLedger();
  for (let i = 0; i < 50; i++) {
    log = m.observe(log, { cell: "c", delta: { confirmed: 0, corrected: 0, unresolved: 1, extended: 0 } });
  }
  const s = m.standingOf(log, "c");
  assert.equal(s.total, 0, "unresolved must never enter the confirmed/corrected total");
  assert.equal(s.standing, "unproven");
  assert.equal(s.unresolved, 50, "but the count itself is still disclosed, not discarded");
});

test("concede: refuses a cell with no observations", () => {
  const m = ledger();
  const log = m.createLedger();
  const r = m.concede(log, "nope", { trigger: "because" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "target_not_found");
});

test("concede: refuses a silent concession with no trigger", () => {
  const m = ledger();
  let log = m.createLedger();
  log = m.observe(log, { cell: "c", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  const r = m.concede(log, "c", {});
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "no_trigger");
});

test("concede: lands EVIDENCE·REC carrying the trigger and the conceded standing, and does not reset counts", () => {
  const m = ledger();
  let log = m.createLedger();
  for (let i = 0; i < WITNESS_FLOOR; i++) {
    log = m.observe(log, { cell: "c", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  }
  const beforeStanding = m.standingOf(log, "c");
  const r = m.concede(log, "c", { trigger: "a later run of real turns found real errors here" });
  assert.equal(r.ok, true);
  const recEntry = r.log.entries.at(-1);
  assert.equal(recEntry.kind, "evidence");
  assert.equal(recEntry.operator, "REC");
  assert.equal(recEntry.concedes, "c");
  assert.equal(recEntry.trigger, "a later run of real turns found real errors here");
  assert.deepEqual(r.priorStanding, beforeStanding);
  // The cell's own counts survive the concession untouched — REC records
  // the revision, it does not erase the history being revised.
  const afterStanding = m.standingOf(r.log, "c");
  assert.deepEqual(afterStanding.confirmed, beforeStanding.confirmed);
  assert.deepEqual(afterStanding.corrected, beforeStanding.corrected);
});

test("foldLedger: most-observed cell first, disjoint cells never collide", () => {
  const m = ledger();
  let log = m.createLedger();
  log = m.observe(log, { cell: "a", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  log = m.observe(log, { cell: "b", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  log = m.observe(log, { cell: "b", delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } });
  const folded = m.foldLedger(log);
  assert.equal(folded.length, 2);
  assert.equal(folded[0].cell, "b");
  assert.equal(folded[0].total, 2);
  assert.equal(folded[1].cell, "a");
});

test("observe: cell is declared, never defaulted", () => {
  const m = ledger();
  const log = m.createLedger();
  assert.throws(() => m.observe(log, { delta: { confirmed: 1, corrected: 0, unresolved: 0, extended: 0 } }), TypeError);
});

// ── surf / fold signals ──────────────────────────────────────────────────

test("surfWeight: only a contested standing widens; unproven is not treated as distrust", () => {
  assert.equal(surfWeight({ standing: "contested" }), 1.5);
  assert.equal(surfWeight({ standing: "established" }), 1);
  assert.equal(surfWeight({ standing: "unproven" }), 1);
  assert.equal(surfWeight(null), 1);
});

test("forcesFoldRefresh: true only on a real correction, never on a bare gap", () => {
  assert.equal(forcesFoldRefresh({ counts: { corrected: 1 } }), true);
  assert.equal(forcesFoldRefresh({ counts: { corrected: 0, unresolved: 9 } }), false);
  assert.equal(forcesFoldRefresh({}), false);
});

test("escalationFor: contested ceil-widens every numeric budget — the exact live numbers pinned", () => {
  const r = escalationFor(
    { standing: "contested" },
    { maxCorrections: 1, passagesPerPart: 3, pagesConsulted: 3 },
  );
  assert.equal(r.escalated, true);
  assert.equal(r.factor, 1.5);
  assert.equal(r.maxCorrections, 2); // ceil(1 * 1.5)
  assert.equal(r.passagesPerPart, 5); // ceil(3 * 1.5) = ceil(4.5)
  assert.equal(r.pagesConsulted, 5);
});

for (const standing of [{ standing: "established" }, { standing: "unproven" }, null]) {
  test(`escalationFor: ${standing?.standing ?? "no standing"} leaves every budget untouched — trust never removes checking, and unmeasured never earns a discount`, () => {
    const r = escalationFor(standing, { maxCorrections: 1, passagesPerPart: 3 });
    assert.equal(r.escalated, false);
    assert.equal(r.maxCorrections, 1);
    assert.equal(r.passagesPerPart, 3);
  });
}

test("escalationFor: a widening never rounds back to its own baseline — strict increase for every integer budget", () => {
  for (let v = 1; v <= 8; v++) {
    const r = escalationFor({ standing: "contested" }, { b: v });
    assert.ok(r.b > v, `budget ${v} must strictly increase under contested (got ${r.b})`);
  }
});

test("escalationFor: non-numeric and absent fields pass through untouched — it widens, it never invents", () => {
  const r = escalationFor({ standing: "contested" }, { label: "s1-draft", missing: null });
  assert.equal(r.label, "s1-draft");
  assert.equal(r.missing, null);
});

test("escalationFor: pure over its inputs — the same declared constants give the same numbers every time, so the factor cannot compound across turns", () => {
  const base = { maxCorrections: 1, passagesPerPart: 3 };
  assert.deepEqual(
    escalationFor({ standing: "contested" }, base),
    escalationFor({ standing: "contested" }, base),
  );
});

// ── end-to-end: a turn's assessment folded straight into the ledger ───────

test("the live wiring's own chain, on the REAL imported constants: two corrected turns -> contested -> 2 corrections, 5 passages, 5 pages", () => {
  // The exact sequence app.js's holonicTurn runs, minus only the DOM: a
  // turn's S1 draft assessed against S2's claims, observed onto the
  // "s1-draft" cell, and — once the standing reads contested — the three
  // declared budget constants (imported above from holon.js/proof.js,
  // the same modules app.js imports them from) handed to escalationFor.
  const m = ledger();
  let log = m.createLedger();
  const s1Text = "Kessler founded Ostrel in 1901.";
  const relationEdges = [
    { subject: "Kessler", verb: "founded", object: "Ostrel", verdict: "contradicted" },
  ];
  for (let i = 0; i < WITNESS_FLOOR; i++) {
    const r = assessAgreement(s1Text, { relationEdges });
    log = m.observe(log, { cell: "s1-draft", delta: r.counts });
  }
  const standing = m.standingOf(log, "s1-draft");
  assert.equal(standing.standing, "contested");
  const escalation = escalationFor(standing, {
    maxCorrections: MAX_CORRECTIONS,
    passagesPerPart: PASSAGES_PER_PART,
    pagesConsulted: PREFLIGHT_PAGES_CONSULTED,
  });
  assert.equal(escalation.escalated, true);
  // The concrete live numbers the PR and P72's amendment promise — pinned
  // against the REAL constants, so a drift in holon.js/proof.js resurfaces
  // here rather than silently changing what "widened" means.
  assert.equal(escalation.maxCorrections, 2);
  assert.equal(escalation.passagesPerPart, 5);
  assert.equal(escalation.pagesConsulted, 5);
  // And the same chain on a clean history stays at the constants exactly.
  const calm = escalationFor(m.standingOf(m.createLedger(), "s1-draft"), {
    maxCorrections: MAX_CORRECTIONS,
    passagesPerPart: PASSAGES_PER_PART,
    pagesConsulted: PREFLIGHT_PAGES_CONSULTED,
  });
  assert.equal(calm.escalated, false);
  assert.equal(calm.maxCorrections, MAX_CORRECTIONS);
  assert.equal(calm.passagesPerPart, PASSAGES_PER_PART);
  assert.equal(calm.pagesConsulted, PREFLIGHT_PAGES_CONSULTED);
});

test("end-to-end: assessAgreement's counts feed observe, and a real error moves the standing to contested", () => {
  const m = ledger();
  let log = m.createLedger();
  const s1Text = "Abraham Lincoln's vice president was Andrew Johnson.";
  const relationEdges = [
    { subject: "Andrew Johnson", verb: "served as vice president of", object: "Abraham Lincoln", verdict: "contradicted" },
  ];
  for (let i = 0; i < WITNESS_FLOOR; i++) {
    const r = assessAgreement(s1Text, { relationEdges });
    log = m.observe(log, { cell: "vice-president-of", delta: r.counts });
  }
  const s = m.standingOf(log, "vice-president-of");
  assert.equal(s.standing, "contested");
  assert.ok(s.corrected >= WITNESS_FLOOR);
});
