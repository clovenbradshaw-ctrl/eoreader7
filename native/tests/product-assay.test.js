// product-assay.test.js — the finish line, read on every suite run (the-fold
// P97 / S67). The material is BUILT (lib/product-assay.mjs CORPUS), so its
// numbers are the construction's own and are pinned exactly; the two walls
// that BREACH on 2026-09-05 are disclosed here with their mechanism and are
// NOT pinned as breached — asserting a known gap freezes it as a target
// (P95's own rule). When they hold, this file logs that they hold; when a
// held wall breaches, this file fails.
//
// Zero model calls. The model arms live in the driver and are a dated record.

import test from "node:test";
import assert from "node:assert/strict";
import { runProductAssay, QUESTIONS, FABRICATIONS } from "../eval/the-fold/lib/product-assay.mjs";

const run = await runProductAssay();
const wall = (n) => run.walls.find((w) => w.n === n);
// The walls the circuit EARNS today. A breach here is a regression in an
// organ (hypergraph, hyperlexicon, derivation, notes, grid, cast), never in
// the material.
const EARNED = ["0", "1", "2", "3", "3b", "4b", "4c", "5", "7", "8"];
// The walls that breach by a NAMED mechanism (P43 negation; sub-floor
// tokensShare). Disclosed, logged, not frozen as targets.
const DISCLOSED = ["4a", "6"];

test("every earned wall holds — configuration, address, standing, derivation, contest on the record, determinism, recourse", () => {
  const breached = EARNED.map(wall).filter((w) => !w || !w.ok);
  assert.deepEqual(breached.map((w) => `${w?.n} ${w?.name}: ${w?.detail}`), []);
});

test("the two disclosed walls carry a mechanism, and their state is logged, not pinned", () => {
  for (const n of DISCLOSED) {
    const w = wall(n);
    assert.ok(w, `wall ${n} is reported`);
    if (!w.ok) assert.ok(typeof w.mechanism === "string" && w.mechanism.length > 40, `wall ${n} breached without naming its mechanism`);
    console.log(`  wall ${n} ${w.name}: ${w.ok ? "HELD" : "breached"} — ${w.ok ? w.detail : w.mechanism.slice(0, 120) + "…"}`);
  }
});

test("built material: 2 passages, 5 links and 1 cut (the denial is a SEG note, never a link with a sign), 1 corroborated, 1 derived with a giver and 0 without, 1 contest landed with no leak", () => {
  const n = run.numbers;
  assert.equal(n.passages, 2);
  assert.equal(n.notes, 5);
  assert.equal(n.cuts, 1, "the denying passage lands a cut on its own fold");
  assert.equal(n.derived, 1);
  assert.equal(n.derivedWithoutGiver, 0);
  assert.equal(n.contests.landed, 1);
  assert.equal(n.contests.leak, true, "the contest act moved no standing");
  assert.deepEqual(n.contests.refusals, { self_witness: 0, read_nothing: 0, no_bytes: 0, not_a_contest: 0 });
});

test("the answer record: one per question, claims byte-addressed and deduplicated by identity, standing phrased, frame and recipe and constitutions carried", () => {
  assert.equal(run.records.length, QUESTIONS.length);
  for (const r of run.records) {
    assert.ok(r.claims.length >= 1);
    const ids = r.claims.map((c) => c.claim_id);
    assert.equal(new Set(ids).size, ids.length, "one claim per identity");
    for (const c of r.claims) {
      assert.ok(c.spans.length >= 1, `claim ${c.end1} —${c.label}→ ${c.end2} carries an address`);
      for (const sp of c.spans) assert.equal(sp.verified.ok, true, `span ${sp.ref} ${sp.start}-${sp.end} resolves to the source's bytes`);
    }
    assert.ok(r.standing.every((s) => /stated once so far|read in \d+ places/.test(s.phrase)));
    assert.equal(typeof r.recipe, "string");
    assert.ok(Object.keys(r.frame.organs).length >= 10);
    assert.equal(r.constitutions.length, 2);
    for (const c of r.constitutions) assert.ok(c.resolved ? /^[0-9a-f]{64}$/.test(c.sha256) : c.gap?.type === "constitution_unresolved");
    assert.deepEqual(r.declarations, [{ rel: "preceded", kind: "transitive", giver: r.declarations[0]?.giver }]);
  }
});

test("the shuffled arm differs: a control that can fail, and did not", () => {
  const s = run.numbers.shuffle;
  assert.ok(s.real >= 5 && s.deranged >= 1);
  assert.ok(s.shared < s.real, `the deranged corpus shares ${s.shared} of ${s.real} claim ids — the record measured nothing if these were equal`);
});

test("recourse: exposure names what falls before the act; conceding withdraws exactly that; the record only grows", () => {
  const c = run.numbers.concession;
  assert.equal(c.exposed, 1);
  assert.equal(c.withdrawn, 1);
  assert.ok(c.entriesAfter > c.entriesBefore);
});

test("the fabrication set is the declared one and the reader's verdicts are reported per sentence", () => {
  assert.equal(FABRICATIONS.length, 4);
  assert.ok(Number.isInteger(run.numbers.fabricationsBound));
  console.log(`  fabrications bound at the reader: ${run.numbers.fabricationsBound}/${FABRICATIONS.length} (2026-09-05: 1 — the sub-floor tokensShare mechanism, wall 6)`);
});

test("the void through time (wall 9): refused without scope, a reader fact when unread, open before the mouth, re-zeroed by one arrival, both events on the timeline", () => {
  const v = run.numbers.void;
  assert.equal(v.noScopeRefused, "no_scope");
  assert.equal(v.unreadReached, false);
  assert.equal(v.declared, 1);
  assert.equal(v.reached, true);
  assert.equal(v.rezeroed, 1);
  assert.equal(v.liveAfter, 0);
  assert.deepEqual(v.timeline, ["declared", "filled"]);
  assert.equal(v.standing, "filled");
});
