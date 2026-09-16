// document-ledger.test.js — kelsenGrade's dispute veto, reachable end to end.
//
// WHAT THIS FILE IS FOR. `document-ledger.js::kelsenGrade` calls
// `organs/regime.js::tagClaim` on every pair of conflicting propositions it
// resolves, and `precedence()`'s own SECOND rule (after validity) is regime:
// a claim either side has disputed is never silently picked as a winner —
// it routes to landContest instead (regime.test.js pins that rule in
// isolation). Audited 2026-09-14: the veto was structurally UNREACHABLE from
// this file. `kelsenGrade`'s own two `tagClaim(...)` calls never passed
// `disputedBy` — regardless of what a proposition carried, tagClaim's own
// default (`disputedBy: []`) was what regime.js ever saw, so `isSettled`
// could never come back false and the regime step could never fire. Fixed
// by forwarding `a.disputedBy` / `b.disputedBy` at both call sites.
//
// That alone would still be a dead letter: nothing upstream of kelsenGrade
// put a `disputedBy` field on a proposition in the first place.
// proxy-runner.mjs's `notesFromEdges` — which builds kelsenGrade's
// `propositions` from the fold's raw perception graph
// (kernel/fold.js::graphEntries, via the text perceiver) — had no dispute
// field at ANY layer, because dispute information actually lives in a
// completely separate structure: kernel/notes.js's assertion ledger (the
// attest/dispute/concede triple, CON·Figure·CONTESTED), which nothing in
// the live proxy-runner.mjs pipeline ever builds or reads. The two
// structures share one thing: notes.js's own `noteId(end1, label, end2)`
// identity, which is byte-for-byte the (subject, relation, object) triple
// `notesFromEdges` already builds. `notesFromEdges` now takes an optional
// `disputeLog` (a real notes.js ledger) and looks a note's live disputes up
// by that SAME identity — reusing notes.js's own `disputesOf`, never a
// second dispute-detection mechanism duplicated at the perception layer.
//
// Both halves are pinned below: kelsenGrade forwarding disputedBy in
// isolation (no proxy-runner.mjs involved), and the full chain from a real
// notes.js dispute through notesFromEdges into kelsenGrade's own verdict —
// the reachability check this file's header promises, in the same spirit as
// dispute.test.js's own "the record survives the run that heard it" control.
import test from "node:test";
import assert from "node:assert/strict";
import { kelsenGrade } from "../the-fold/document-ledger.js";
import { precedence, tagClaim, PRECEDENCE_STEPS, precedenceOrderPhrase } from "../organs/regime.js";
import { makeNotes, noteId } from "../kernel/notes.js";
import { notesFromEdges } from "../../proxy-runner.mjs";

// ── kelsenGrade alone: disputedBy on a proposition must reach tagClaim ─────

test("kelsenGrade: a proposition carrying disputedBy is never picked as a winner — routes to landContest, same as regime.js's own rule", () => {
  const propositions = [
    { end1: "lincoln", label: "was succeeded by", end2: "hamlin", disputedBy: [{ source: "page-b" }] },
    { end1: "lincoln", label: "was succeeded by", end2: "andrew johnson" },
  ];
  const result = kelsenGrade({ propositions, precedence, tagClaim, queryTime: Date.now() });
  assert.equal(result.conflicts, 1);
  assert.equal(result.ok, false, "an unresolved dispute must not read as a resolved essay");
  assert.equal(result.resolutions.length, 1);
  const r = result.resolutions[0];
  assert.equal(r.winner, null);
  assert.equal(r.reason, "route_to_landContest");
  assert.match(r.why, /disputed/i);
});

test("kelsenGrade: without any disputedBy, the SAME shape of conflict resolves normally (entrenchment) — the fix does not make every conflict a dispute", () => {
  const propositions = [
    { end1: "lincoln", label: "was succeeded by", end2: "hamlin" },
    { end1: "lincoln", label: "was succeeded by", end2: "andrew johnson" },
  ];
  const result = kelsenGrade({ propositions, precedence, tagClaim, queryTime: Date.now() });
  assert.equal(result.conflicts, 1);
  const r = result.resolutions[0];
  assert.notEqual(r.reason, "route_to_landContest");
  assert.ok(r.winner === "a" || r.winner === "b" || r.reason === "tied");
});

// ── the full chain: a real notes.js dispute, through notesFromEdges, into kelsenGrade ──

test("REACHABILITY: a claim disputed on a real notes.js ledger reaches kelsenGrade as disputed, and the veto actually fires", () => {
  const notes = makeNotes();
  let log = notes.createNotes({ frame: { reader: "document-ledger.test.js" } });
  // The fold's own reading heard this once, from one source.
  log = notes.hear(log, {
    end1: "lincoln", label: "was succeeded by", end2: "hamlin",
    witness: "page-a", spans: [{ at: "page-a#0-40", ref: "page-a", text: "Hamlin was Lincoln's vice president." }],
  });
  const id = noteId("lincoln", "was succeeded by", "hamlin");
  const disputeResult = notes.dispute(log, id, {
    source: "page-b", because: "Andrew Johnson succeeded Lincoln as president in 1865.",
  });
  assert.equal(disputeResult.refused, null, "the dispute itself must land cleanly");
  log = disputeResult.log;
  assert.ok(notes.disputedIds(log).has(id), "sanity: the ledger itself reports this note as live-disputed");

  // The fold's raw perception graph: the same claim, as graphEntries — the
  // shape notesFromEdges actually consumes in the live pipeline, carrying
  // NOTHING about the dispute (graphEntries have no dispute field at any
  // layer — that is the gap this test exists to close).
  const graphEntries = [
    { schema: "EOHyperedge@1", relation: "was succeeded by", participants: [{ surface: "lincoln" }, { surface: "hamlin" }], witness: "page-a" },
    { schema: "EOHyperedge@1", relation: "was succeeded by", participants: [{ surface: "lincoln" }, { surface: "andrew johnson" }], witness: "page-b" },
  ];

  // Without a disputeLog: the historical (broken) behaviour — no dispute
  // reaches kelsenGrade, so a genuine live contest reads as an ordinary
  // resolvable conflict. Pinned so a regression toward "always disputed" or
  // "disputeLog silently required" would be caught here too.
  const propsWithoutLog = notesFromEdges(graphEntries);
  assert.equal(propsWithoutLog.every((p) => !p.disputedBy?.length), true);
  const withoutDispute = kelsenGrade({ propositions: propsWithoutLog, precedence, tagClaim });
  assert.notEqual(withoutDispute.resolutions[0]?.reason, "route_to_landContest");

  // With the real notes.js ledger threaded through: the dispute reaches the
  // proposition...
  const propsWithLog = notesFromEdges(graphEntries, { disputeLog: log });
  const disputedProp = propsWithLog.find((p) => p.object === "hamlin");
  assert.ok(disputedProp, "the disputed claim must still be present as a proposition");
  assert.deepEqual(disputedProp.disputedBy, ["page-b"]);

  // ...and the veto actually fires: kelsenGrade never picks a winner between
  // the disputed claim and its rival, however either would otherwise resolve.
  const withDispute = kelsenGrade({ propositions: propsWithLog, precedence, tagClaim, queryTime: Date.now() });
  assert.equal(withDispute.conflicts, 1);
  assert.equal(withDispute.ok, false);
  const r = withDispute.resolutions[0];
  assert.equal(r.winner, null, "a disputed claim is never presented as settled");
  assert.equal(r.reason, "route_to_landContest");
});

// ── the six-rule order is now data, derived once (regime.js), never restated ──

test("PRECEDENCE_STEPS: all six rules, in order, regime included (the step three independent restatements had dropped)", () => {
  assert.deepEqual(PRECEDENCE_STEPS.map((s) => s.reason), [
    "validity_window", "route_to_landContest", "specificity", "force", "recency", "entrenchment",
  ]);
  assert.ok(precedenceOrderPhrase().includes("regime"));
});
