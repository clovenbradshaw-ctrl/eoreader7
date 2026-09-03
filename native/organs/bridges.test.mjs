// bridges.test.mjs — Pass 12 step 2, against the REAL kernel ledger.
// Nothing stubbed: bridges are heard onto a real `makeNotes()` instance
// via `notes.hear` itself, exactly as a production caller would.
//
// A crossing needs a STABLE id across sources to be recognised as one
// note at all — `end1Face`/`end2Face` alone, with no `identity` organ,
// change what a hearing's id computes to (canonId falls back to the face
// when the organ names nothing), which would make two sightings of "the
// same thing, worded differently" land as two unrelated notes rather than
// a crossing. So every test here that wants a REAL crossing keeps end1/
// end2 literally identical across sources (as a plain-string identity
// organ, `norm`-only, would) and varies only the Face — the shape a real
// per-source identity organ actually produces: a stable canonical id, a
// richer per-source display.
import test from "node:test";
import assert from "node:assert/strict";
import { makeNotes, noteId } from "../kernel/notes.js";
import { BRIDGE_LABEL, BRIDGE_REFUSALS, deriveBridgeArrangements, syncBridges, bridgeStandingFor } from "./bridges.js";

const norm = (v) => String(v).trim().toLowerCase();
// A minimal, real identity organ: canonicalises by lowercased end1/end2 so
// two hearings that used the same words cross as one note regardless of
// what Face they also carried — never a mock, a genuine (if trivial)
// implementation of the `identity` contract `notes.js` itself declares.
const notes = makeNotes({ identity: (end1, label, end2) => ({ end1: norm(end1), end2: norm(end2) }) });
const span = (ref, start, end) => ({ ref, start, end, face: `${ref}:${start}` });

function crossed(end1Face, end2Face) {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  log = notes.hear(log, {
    end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls",
    end1Face, end2Face,
  });
  return notes.fold(log)[0];
}

test("a join derives one bridge arrangement PER END, faced by each side's own words, provenanced to the note and which end", () => {
  const note = crossed("Sir John Smith", "the Fisheries Commission");
  const { heard, turnedAway } = deriveBridgeArrangements(note);
  assert.equal(turnedAway.length, 0);
  assert.equal(heard.length, 2);
  const [e1, e2] = heard;
  assert.equal(e1.end1, "page-a:Smith");
  assert.equal(e1.label, BRIDGE_LABEL);
  assert.equal(e1.end2, "page-b:Sir John Smith");
  assert.equal(e1.witness, `bridge-inferred:${note.id}#end1`);
  assert.match(e1.because, /basis: identity-organ/);
  assert.equal(e2.end1, "page-a:the commission");
  assert.equal(e2.end2, "page-b:the Fisheries Commission");
  assert.equal(e2.witness, `bridge-inferred:${note.id}#end2`);
  assert.equal(e1.spans[0].at, "page-b#40-60", "the bridge's own address is where the CROSSING was heard, not the established side");
});

test("a join with no incoming face (pre-widening, or a caller that skipped it) is turned away by name, never guessed", () => {
  const note = { id: "x", end1: "a", label: "l", end2: "b", joins: [{ source: "s2", from: ["s1"], assumed: ["a", "b"], basis: "string-identity", standing: "assumed" }] };
  const { heard, turnedAway } = deriveBridgeArrangements(note);
  assert.equal(heard.length, 0);
  assert.equal(turnedAway.length, 1);
  assert.equal(turnedAway[0].reason, BRIDGE_REFUSALS.NO_INCOMING_FACE);
});

test("a note with no joins derives nothing — it crossed no universe", () => {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "q2", label: "precedes", end2: "q4", spans: [span("run-a", 1, 2)], witness: "run-a~hole" });
  const [n] = notes.fold(log);
  const { heard, turnedAway } = deriveBridgeArrangements(n);
  assert.equal(heard.length, 0);
  assert.equal(turnedAway.length, 0);
});

test("CAPABILITY step 1 could not have: two INDEPENDENT content notes crossing the same two sources via the same referent pair corroborate ONE bridge", () => {
  const bridges = makeNotes();
  let content = notes.createNotes();
  // Note A: "Smith chaired the commission" — page-a, then page-b (via "Sir John Smith").
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls", end1Face: "Sir John Smith" });
  // Note B: a COMPLETELY DIFFERENT claim, "Smith resigned in 1999" — same two sources, same identification of Smith.
  content = notes.hear(content, { end1: "Smith", label: "resigned in", end2: "1999", spans: [span("page-a", 70, 90)], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "resigned in", end2: "1999", spans: [span("page-b", 5, 25)], witness: "page-b~walls", end1Face: "Sir John Smith" });

  let bridgeLog = bridges.createNotes();
  const sync = syncBridges(bridgeLog, bridges, notes.fold(content));
  bridgeLog = sync.log;

  const smithBridgeId = noteId("page-a:Smith", BRIDGE_LABEL, "page-b:Sir John Smith");
  const [smithBridge] = bridges.fold(bridgeLog).filter((n) => n.id === smithBridgeId);
  assert.ok(smithBridge, "the Smith<->Sir John Smith correspondence exists as its own note");
  assert.equal(smithBridge.witnesses.length, 2, "TWO independent content notes assumed it — real corroboration, not a bare count on one note");
  assert.equal(bridges.standingOf(smithBridge).standing, "corroborated");

  // The commission bridge (end2 of note A only) and the 1999 bridge (end2 of note B only) each have exactly one witness.
  const commissionBridge = bridges.fold(bridgeLog).find((n) => n.id === noteId("page-a:the commission", BRIDGE_LABEL, "page-b:the commission"));
  assert.equal(commissionBridge.witnesses.length, 1);
});

test("CONTROL BUILT TO FAIL: two DIFFERENT face pairs crossing the SAME two sources are two bridges, never merged into one", () => {
  const bridges = makeNotes();
  let content = notes.createNotes();
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls", end1Face: "Sir John Smith" });
  content = notes.hear(content, { end1: "Jones", label: "audited", end2: "the accounts", spans: [span("page-a", 100, 120)], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Jones", label: "audited", end2: "the accounts", spans: [span("page-b", 200, 220)], witness: "page-b~walls", end1Face: "Margaret Jones" });

  let bridgeLog = bridges.createNotes();
  bridgeLog = syncBridges(bridgeLog, bridges, notes.fold(content)).log;
  const all = bridges.fold(bridgeLog);
  const smithId = noteId("page-a:Smith", BRIDGE_LABEL, "page-b:Sir John Smith");
  const jonesId = noteId("page-a:Jones", BRIDGE_LABEL, "page-b:Margaret Jones");
  assert.notEqual(smithId, jonesId, "different faces make different ids by construction");
  assert.equal(all.filter((n) => n.id === smithId).length, 1);
  assert.equal(all.filter((n) => n.id === jonesId).length, 1);
  assert.equal(bridges.standingOf(all.find((n) => n.id === smithId)).standing, "single-witness");
  assert.equal(bridges.standingOf(all.find((n) => n.id === jonesId)).standing, "single-witness", "sharing a source pair is not sharing a referent");
});

test("syncBridges is idempotent: re-syncing an unchanged content ledger appends nothing", () => {
  const bridges = makeNotes();
  const note = crossed("Sir John Smith", "the Fisheries Commission");
  let bridgeLog = bridges.createNotes();
  const first = syncBridges(bridgeLog, bridges, [note]);
  bridgeLog = first.log;
  const before = bridgeLog.entries.length;
  const second = syncBridges(bridgeLog, bridges, [note]);
  assert.equal(second.log.entries.length, before, "re-hearing the identical arrangement teaches the bridge ledger nothing new");
  assert.equal(second.heard.filter((h) => h.changed).length, 0);
});

test("bridgeStandingFor: a caller can read a note's own bridges' standing without touching the content ledger", () => {
  const bridges = makeNotes();
  let content = notes.createNotes();
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls", end1Face: "Sir John Smith" });
  const note = notes.fold(content)[0];

  let bridgeLog = bridges.createNotes();
  bridgeLog = syncBridges(bridgeLog, bridges, [note]).log;
  const before = bridgeStandingFor(bridgeLog, bridges, note);
  assert.equal(before.length, 2);
  assert.ok(before.every((b) => b.standing === "single-witness"));

  const end1BridgeId = before.find((b) => b.which === "end1").id;
  const conceded = bridges.concede(bridgeLog, end1BridgeId, { trigger: "test: a later reading found these are two different Smiths" });
  assert.equal(conceded.refused, null);
  const after = bridgeStandingFor(conceded.log, bridges, note);
  assert.equal(after.find((b) => b.which === "end1").standing, "conceded");
  assert.equal(after.find((b) => b.which === "end2").standing, "single-witness", "conceding one end's bridge never touches the other's");
});

test("a crossing REFUSED upstream (a real bridge organ says the referents differ) produces no join, so nothing to derive — bridges.js never sees a refused crossing as an opportunity", () => {
  const withBridgeOrgan = makeNotes({ bridge: () => ({ reason: "referents_differ", detail: "control: scripted disagreement" }) });
  let log = withBridgeOrgan.createNotes();
  log = withBridgeOrgan.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("banking-1998", 1, 2)], witness: "banking-1998~w" });
  log = withBridgeOrgan.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("fisheries-2011", 3, 4)], witness: "fisheries-2011~w" });
  const scoped = withBridgeOrgan.fold(log).find((n) => n.id.endsWith("@fisheries-2011"));
  assert.equal(scoped.joins ?? undefined, undefined, "the refusal split the sighting onto its own note before any join was recorded");
  const { heard, turnedAway } = deriveBridgeArrangements(scoped);
  assert.equal(heard.length, 0);
  assert.equal(turnedAway.length, 0, "nothing to turn away either — there was no join to examine, refused or otherwise");
});
