// dispute.test.js — the contest half of the record: CON·Figure·CONTESTED.
//
// WHAT THIS FILE IS FOR. Before it, the ledger could only ever be written in
// the AGREEMENT branch. `attest` landed a corroborating vote; a contradicting
// vote was counted in a Map local to one call (corroboration.js's own comment:
// "THIS RUN"), reported to the caller, and dropped. Corroboration accumulated
// across runs; contest evaporated at the end of every one. The reason given
// was sound — at n=2 you see a disagreement but not who is wrong, so landing
// a verdict would convict on evidence that cannot convict — but it licensed
// NOT CONVICTING, never FORGETTING.
//
// So the two loads this file carries are opposite, and both must hold:
//   1. A dispute CHANGES NOTHING about the note's standing. Leak assay,
//      byte-identical, below — if this fails the act has become a conviction.
//   2. A dispute SURVIVES THE RUN THAT HEARD IT. The control built to fail is
//      the second walk: on the old code a note contested on the first pass
//      read as merely `thin` on the second, so the third source that would
//      have settled it was never sought. That control is the whole point.
//
// Against the REAL kernel ledger, the REAL cube, the REAL derivation circuit.
// No model is called anywhere in this file; the witness is scripted, because
// what is under test is the RECORD's behaviour, not a model's.
import test from "node:test";
import assert from "node:assert/strict";
import { makeNotes, noteId } from "../kernel/notes.js";
import * as H from "../organs/hyperlexicon.js";
import * as TL from "../kernel/task-log.js";
import * as cube from "../kernel/cube.js";
import { makeDerivation, premisesOf } from "../organs/derivation.js";
import { contestedSearch, askValue } from "../organs/corroboration.js";
import { createDeclarationLog, proposeCandidate, promote } from "../interpretation/declarations.js";

const notes = makeNotes();
const taskLog = { ...TL, cellOf: cube.cellOf };
const hl = H.makeHyperlexicon(taskLog);
const D = makeDerivation({ hl, taskLog });

const ID = noteId("lincoln", "was succeeded by", "hamlin");
const seed = () => notes.hear(notes.createNotes({ frame: { reader: "dispute.test.js" } }), {
  end1: "lincoln", label: "was succeeded by", end2: "hamlin",
  witness: "page-a", spans: [{ at: "page-a#0-44", ref: "page-a", text: "Hamlin was Lincoln's vice president." }],
});
const DENIAL = "Andrew Johnson succeeded Lincoln as president in 1865.";
const disputed = () => notes.dispute(seed(), ID, { source: "page-b", because: DENIAL, span: { at: "page-b#12-65", ref: "page-b", text: DENIAL } });

// ── 1. THE LEAK ASSAY: a contest is not a conviction ──────────────────────

test("LEAK ASSAY: a dispute leaves the note's witnesses, spans and standing BYTE-IDENTICAL — a contest that moved a standing would be a conviction n=2 cannot support", () => {
  const before = seed();
  const noteBefore = notes.fold(before)[0];
  const after = notes.fold(disputed().log)[0];
  assert.deepEqual(after.witnesses, noteBefore.witnesses);
  assert.deepEqual(after.spans, noteBefore.spans);
  assert.deepEqual(notes.standingOf(after), notes.standingOf(noteBefore));
  assert.equal(notes.standingOf(after).standing, "single-witness");
});

test("a disputed note is still LIVE — it stays in the fold, and only `concede` ever removes one", () => {
  const log = disputed().log;
  assert.equal(notes.fold(log).length, 1);
  assert.equal(notes.concededIds(log).size, 0);
  assert.deepEqual(notes.fold(log)[0].disputedBy, ["page-b"]);
});

test("a ledger that has heard NO disagreement folds byte-identically to before this act existed — `disputedBy` rides only when live", () => {
  assert.equal("disputedBy" in notes.fold(seed())[0], false);
  const upheld = notes.settleDispute(disputed().log, "con:2", { trigger: "page-c states Hamlin", outcome: "upheld" });
  assert.equal("disputedBy" in notes.fold(upheld.log)[0], false, "a settled contest stops riding on the projection");
});

test("the act lands in the cell the kernel already named, on a basis that until now nothing on disk had ever written", () => {
  const e = disputed().log.entries.at(-1);
  assert.equal(e.cell, "CON·Figure");
  assert.equal(e.operator_basis, TL.OPERATOR_BASIS.CONTESTED);
  assert.equal(e.terrain, "Link");
  assert.equal(e.disputes, ID);
  assert.equal(e.span.at, "page-b#12-65", "the decider carries an address in the DISPUTING source's own bytes — the contest is re-openable, not a bare vote");
});

// ── 2. THE REFUSALS ───────────────────────────────────────────────────────

test("a disagreement names who disagrees and what it read — an unattributed or undeciphered contest is refused, never landed", () => {
  const log = seed();
  assert.equal(notes.dispute(log, ID, { because: DENIAL }).refused.type, "no_source");
  assert.equal(notes.dispute(log, ID, { source: "page-b" }).refused.type, "no_decider");
  assert.equal(notes.dispute(log, "nobody|did|this", { source: "page-b", because: DENIAL }).refused.type, "unknown_note");
});

test("one perspective does not testify on both sides, and does not testify twice", () => {
  const log = disputed().log;
  assert.equal(notes.dispute(log, ID, { source: "page-a", because: DENIAL }).refused.type, "source_already_witnesses");
  assert.equal(notes.dispute(log, ID, { source: "page-b", because: "a second denial from the same page" }).noop, true);
  assert.equal(notes.disputesOf(log).get(ID).length, 1);
});

test("a withdrawn note cannot be contested — there is nothing left to contest", () => {
  const conceded = notes.concede(seed(), ID, { trigger: "misread" }).log;
  assert.equal(notes.dispute(conceded, ID, { source: "page-b", because: DENIAL }).refused.type, "already_conceded");
});

test("a settlement records which way it went and what settled it — neither is ever defaulted", () => {
  const log = disputed().log;
  assert.equal(notes.settleDispute(log, "con:2", { outcome: "upheld" }).refused.type, "no_trigger");
  assert.equal(notes.settleDispute(log, "con:2", { trigger: "t" }).refused.type, "no_outcome");
  assert.equal(notes.settleDispute(log, "con:2", { trigger: "t", outcome: "true" }).refused.type, "no_outcome");
  assert.equal(notes.settleDispute(log, "con:999", { trigger: "t", outcome: "upheld" }).refused.type, "unknown_dispute");
});

// ── 3. THE CONTROL BUILT TO FAIL: does contest survive the run? ───────────

test("CONTROL BUILT TO FAIL — a contest read back by a reader that never saw the run that heard it; on the old per-run Map this set is empty and the note ranks `thin`", () => {
  const log = disputed().log;
  const freshReader = makeNotes(); // knows nothing but the bytes of the log
  const live = freshReader.disputesOf(log);
  assert.equal(live.size, 1, "contest is durable — this is the assertion the old code could not make");
  assert.equal(live.get(ID)[0].source, "page-b");
  assert.equal(live.get(ID)[0].because, DENIAL);

  // And the consequence that matters: the walk's ranking. A contested note
  // is the highest-value ask in the pool because one more independent vote
  // DECIDES it; a thin note's next vote merely seconds it.
  const note = freshReader.fold(log)[0];
  const seeded = new Map([[ID, new Set(live.get(ID).map((d) => d.source))]]);
  assert.equal(askValue(note, { contradictSources: seeded, settleFloor: 2 }).reason, "contested");
  assert.equal(askValue(note, { contradictSources: seeded, settleFloor: 2 }).value, 2);
  assert.equal(askValue(note, { contradictSources: new Map(), settleFloor: 2 }).reason, "thin", "the old behaviour, kept here as the thing being fixed");
});

test("history stays whole — a settled dispute leaves the live set and stays on the record with how it closed", () => {
  const d = disputed();
  const settled = notes.settleDispute(d.log, d.id, { trigger: "page-c: Johnson, not Hamlin, succeeded on Lincoln's death", outcome: "conceded" });
  assert.equal(notes.disputesOf(settled.log).size, 0);
  const hist = notes.disputeHistory(settled.log);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].source, "page-b");
  assert.equal(hist[0].settled.outcome, "conceded");
  assert.match(hist[0].settled.trigger, /Johnson/);
  assert.equal(notes.settleDispute(settled.log, d.id, { trigger: "again", outcome: "upheld" }).noop, true, "a settled contest does not reopen by being settled again");
});

// ── 4. THE THIRD SOURCE: the search that now has an input ─────────────────

const SOURCES = [
  { ref: "page-a", text: "Hamlin was Lincoln's vice president." },
  { ref: "page-b", text: DENIAL },
  { ref: "page-c", text: "On Lincoln's death in 1865 the office passed to Johnson; Hamlin had served the first term." },
  { ref: "page-d", text: "A treatise on nineteenth-century canal engineering." },
];

test("contestedSearch reads the standing contests off the LEDGER and ranks a third source — the seeker's missing input", () => {
  const contest = notes.dispute(seed(), ID, { source: "page-b", because: DENIAL, kind: "contest", span: { at: "page-b#12-65" } }).log;
  const { seeking, unrouted } = contestedSearch(contest, hl, SOURCES, { limit: 5, kinds: notes.NEEDS_THIRD_SOURCE });
  assert.equal(seeking.length, 1);
  assert.equal(unrouted.length, 0);
  assert.deepEqual(seeking[0].stating, ["page-a"]);
  assert.deepEqual(seeking[0].contradicting, ["page-b"]);
  const refs = seeking[0].candidates.map((c) => c.source.ref);
  assert.ok(refs.includes("page-c"), "a source where both ends are co-present is a real third-source candidate");
  assert.equal(refs.includes("page-a"), false, "a source that already stated it is not a third source");
  assert.equal(refs.includes("page-b"), false, "nor is the one that denied it");
  assert.equal(refs.includes("page-d"), false, "and a source that mentions neither end could not answer");
  assert.equal(contestedSearch(seed(), hl, SOURCES, { limit: 5, kinds: ["contest"] }).seeking.length, 0, "no contest, no search — the seeker is not run on hope");
  assert.throws(() => contestedSearch(contest, hl, SOURCES, { kinds: ["contest"] }), /declared by the caller/);
});

test("THE ROUTING RULE: a third source is spent only on the kind it can settle — measured, both real contradictions were individuation and neither needed one", () => {
  assert.deepEqual(notes.NEEDS_THIRD_SOURCE, ["contest"]);
  // individuation: one office, two disjoint tenures — decidable at n=1
  const indiv = notes.dispute(seed(), ID, { source: "page-b", because: DENIAL, kind: "individuation" }).log;
  const r = contestedSearch(indiv, hl, SOURCES, { limit: 5, kinds: notes.NEEDS_THIRD_SOURCE });
  assert.equal(r.seeking.length, 0, "no model call is aimed where a third source cannot settle anything");
  assert.equal(r.unrouted.length, 1, "and it is REPORTED, never silently skipped — a live disagreement that needs typing, not a source");
  assert.match(r.unrouted[0].reason, /decidable at n=1/);

  // untyped — what a model witness can honestly produce — is also not routed
  const un = contestedSearch(disputed().log, hl, SOURCES, { limit: 5, kinds: notes.NEEDS_THIRD_SOURCE });
  assert.equal(un.seeking.length, 0);
  assert.equal(un.unrouted[0].kind, "untyped");
  assert.match(un.unrouted[0].reason, /cannot be aimed/);

  // the kinds sought are DECLARED — routing everything is what the argument stops
  assert.throws(() => contestedSearch(indiv, hl, SOURCES, { limit: 5 }), /`kinds` is declared/);
  assert.throws(() => contestedSearch(indiv, hl, SOURCES, { limit: 5, kinds: [] }), /`kinds` is declared/);
  assert.equal(contestedSearch(indiv, hl, SOURCES, { limit: 5, kinds: ["individuation"] }).seeking.length, 1,
    "a caller that declares it wants them anyway still gets them — the rule is no-default, not no-choice");
});

test("a dispute carries its KIND, and an invented kind is refused", () => {
  assert.equal(notes.disputesOf(disputed().log).get(ID)[0].kind, "untyped", "the honest landing for a witness that cannot type what it produced");
  assert.equal(notes.dispute(seed(), ID, { source: "page-b", because: DENIAL, kind: "wrongness" }).refused.type, "unknown_kind");
  const typed = notes.dispute(seed(), ID, { source: "page-b", because: DENIAL, kind: "provenance" }).log;
  assert.equal(notes.disputeHistory(typed).at(-1).kind, "provenance");
  assert.match(typed.entries.at(-1).description, /contested \(provenance\)/);
});

// ── 5. THE LOOP CLOSES: contest → settlement → concession → cascade ───────

const CHAIN = ["a", "b", "c", "d", "e"];
const relayLedger = () => {
  let log = hl.createHyperlexicon();
  let i = 0;
  for (const s of ["log-1", "log-2"]) for (const r of ["read-v1", "read-v2"])
    for (let k = 0; k + 1 < CHAIN.length; k += 1)
      log = hl.hear(log, { subject: CHAIN[k], verb: "replaces", object: CHAIN[k + 1], witness: `${s}~${r}`, spans: [{ at: `${s}#${i * 10}-${i++ * 10 + 7}`, ref: s, text: "handover" }] });
  return log;
};
const licensed = () => {
  const decl = createDeclarationLog();
  const p = proposeCandidate(decl, { kind: "composes", rel: "replaces", yields: "after", acquisition: { note: "declared by the test" }, source: "relay ledger" });
  return promote(p.log, p.id, { giver: "dispute.test.js — a stand-in giver, disclosed" }).log;
};
const FLOOR = { sources: 2, instruments: 2 };
const PREMISE = hl.assertionId("b", "replaces", "c");

test("a contested premise is ADMITTED and REPORTED, never withheld — you may build on a challenged base provided the structure carries what would fall", () => {
  const built = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 4 });
  const contestedLog = hl.dispute(built.log, PREMISE, { source: "log-3", because: "c replaces b, not the other way round." }).log;
  const p = premisesOf(hl.foldHyperlexicon(contestedLog), { floor: FLOOR });
  assert.ok(p.premises.some((n) => n.id === PREMISE), "a live dispute does not disqualify a premise");
  assert.equal(p.contested.length, 1);
  assert.equal(p.contested[0].id, PREMISE);
  assert.deepEqual(p.contested[0].disputedBy, ["log-3"]);
  assert.equal(p.stopped.some((x) => x.id === PREMISE), false);
});

test("exposure() is the cascade as a QUERY — what would fall, with nothing falling", () => {
  const built = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 4 });
  const before = D.foldDerived(built.log).length;
  const ex = D.exposure(built.log, PREMISE);
  assert.ok(ex.withdrawn.length > 0, "something rests on this premise");
  assert.ok(ex.share > 0 && ex.share <= 1);
  assert.equal(D.foldDerived(built.log).length, before, "asking what would fall does not make anything fall");
  const gone = D.withdrawDerived(built.log, { premise: PREMISE }, { trigger: "check" });
  assert.deepEqual(gone.withdrawn.map((w) => w.id).sort(), ex.withdrawn.map((w) => w.id).sort(),
    "the query and the act walk the same graph — the dry run is the cascade, not an estimate of it");
});

test("THE LOOP CLOSES: a contradiction lands, a third source settles it against the note, and the concession cascades — every step on the record with its trigger", () => {
  const built = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 4 });
  const wouldFall = D.exposure(built.log, PREMISE).withdrawn.map((w) => w.id);
  assert.ok(wouldFall.length > 0);

  // 1. the contest is heard and LANDS (this is what used to be dropped)
  const d = hl.dispute(built.log, PREMISE, { source: "log-3", because: "c replaces b, not the other way round.", span: { at: "log-3#0-40", ref: "log-3" } });
  assert.equal(d.refused, null);
  assert.equal(hl.disputedIds(d.log).has(PREMISE), true);
  assert.equal(D.foldDerived(d.log).length, D.foldDerived(built.log).length, "hearing a contest withdraws nothing");

  // 2. a third source settles it AGAINST the note. The settlement still
  //    does not concede — it hands back a ready concession, so a conviction
  //    is always a separate, recorded act.
  const s = hl.settleDispute(d.log, d.id, { trigger: "log-4 reads the same handover in the opposite direction", outcome: "conceded" });
  assert.equal(s.refused, null);
  assert.equal(s.concession.id, PREMISE);
  assert.match(s.concession.trigger, /settled against it/);
  assert.equal(hl.concededIds(s.log).has(PREMISE), false, "settling is not conceding");
  assert.equal(D.foldDerived(s.log).length, D.foldDerived(built.log).length, "and settling withdraws nothing either");

  // 3. the concession, performed by the organ that owns the cascade
  const c = D.concedePremise(s.log, s.concession.id, { trigger: s.concession.trigger });
  assert.equal(c.refused, null);
  assert.deepEqual(c.withdrawn.map((w) => w.id).sort(), wouldFall.sort(), "exactly what exposure() said would fall, fell");
  for (const w of c.withdrawn) assert.ok(w.cascadedFrom, "each withdrawal names what it cascaded from");

  // 4. nothing is deleted, and the whole chain is readable off the log alone
  const reader = makeNotes();
  const hist = reader.disputeHistory(c.log);
  assert.equal(hist[0].source, "log-3");
  assert.equal(hist[0].settled.outcome, "conceded");
  const rec = c.log.entries.filter((e) => e.concedes === PREMISE);
  assert.equal(rec.length, 1);
  assert.match(rec[0].trigger, /log-4 reads the same handover/, "the withdrawal's reason traces to the source that settled the contest");
});

test("the OTHER way it can go: a contest settled UPHELD leaves the note and everything on it exactly where they stood", () => {
  const built = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 4 });
  const derivedBefore = D.foldDerived(built.log).map((x) => x.id).sort();
  const d = hl.dispute(built.log, PREMISE, { source: "log-3", because: "c replaces b, not the other way round." });
  const s = hl.settleDispute(d.log, d.id, { trigger: "log-4 reads it as log-1 and log-2 do", outcome: "upheld" });
  assert.equal(s.concession, null, "an upheld contest hands back no concession");
  assert.equal(hl.disputedIds(s.log).size, 0);
  assert.deepEqual(D.foldDerived(s.log).map((x) => x.id).sort(), derivedBefore);
  assert.equal(premisesOf(hl.foldHyperlexicon(s.log), { floor: FLOOR }).contested.length, 0);
  assert.equal(notes.disputeHistory(s.log)[0].settled.outcome, "upheld", "and the challenge stays on the record even though it failed");
});

// ── 6. TWO REGIMES: corroboration as a label, falsifiability as the licence ──
//
// The floor conflated "how well attested is this claim" (token-level,
// evidentiary, Bayesian in kind) with "may I build on it" (structural,
// theory-shaped, Popperian in kind). Measured below: at n=1 the old gate
// does not make floor 6 sparse, it makes it EMPTY — and the alternative is
// not lowering the gate, it is carrying the fragility and keeping the fall.

const soloLedger = () => {
  let log = hl.createHyperlexicon();
  let i = 0;
  for (let k = 0; k + 1 < CHAIN.length; k += 1)
    log = hl.hear(log, { subject: CHAIN[k], verb: "replaces", object: CHAIN[k + 1], witness: "log-1~read-v1", spans: [{ at: `log-1#${i * 10}-${i++ * 10 + 7}`, ref: "log-1", text: "handover" }] });
  return log;
};

test("THE GATE EMPTIES THE FLOOR, measured: one source, and carry:false derives NOTHING — not sparse, empty", () => {
  const gated = D.derive(soloLedger(), { declarations: licensed(), floor: FLOOR, carry: false, maxSteps: 4 });
  assert.equal(gated.premises.length, 0);
  assert.equal(gated.derived.length, 0);
  assert.equal(gated.stopped.length, 4, "every note refused for want of a second witness");
  assert.equal(gated.carried.length, 0);
});

test("carry:true builds on n=1 and says so — the count rides as a LABEL instead of gating", () => {
  const carried = D.derive(soloLedger(), { declarations: licensed(), floor: FLOOR, carry: true, maxSteps: 4 });
  assert.equal(carried.stopped.length, 0, "nothing is refused");
  assert.equal(carried.carried.length, 4, "and nothing is hidden either — every below-floor premise is named with its level");
  assert.ok(carried.derived.length > 0, "the layer above is no longer empty");
  assert.equal(carried.carried[0].sources, 1);
  assert.deepEqual(carried.carried[0].floor, FLOOR, "the floor it fell short of is still on the record");
  for (const d of carried.derived) {
    assert.equal(d.restsOn.sources, 1, "every product carries the standing of its weakest ground");
    assert.ok(d.restsOn.grounds >= 1);
  }
});

test("carry is declared, never inferred from the floor", () => {
  assert.throws(() => premisesOf([], { floor: FLOOR, carry: "yes" }), /declared boolean/);
  assert.equal(premisesOf(hl.foldHyperlexicon(soloLedger()), { floor: FLOOR, carry: true }).premises.length, 4);
  assert.equal(premisesOf(hl.foldHyperlexicon(soloLedger()), { floor: FLOOR, carry: false }).premises.length, 0);
});

test("the weakest link is a MIN, never a mean — a strong premise cannot launder a single-source one", () => {
  let log = hl.createHyperlexicon();
  let i = 0;
  for (const s of ["log-1", "log-2"]) for (const r of ["read-v1", "read-v2"])
    for (let k = 0; k + 1 < CHAIN.length; k += 1) {
      if (CHAIN[k] === "c" && s === "log-2") continue; // c->d thin on purpose
      log = hl.hear(log, { subject: CHAIN[k], verb: "replaces", object: CHAIN[k + 1], witness: `${s}~${r}`, spans: [{ at: `${s}#${i * 10}-${i++ * 10 + 7}`, ref: s, text: "handover" }] });
    }
  const out = D.derive(log, { declarations: licensed(), floor: FLOOR, carry: true, maxSteps: 4 });
  const THIN = hl.assertionId("c", "replaces", "d");
  const thin = out.derived.filter((d) => d.grounds.includes(THIN));
  assert.ok(thin.length > 0, "some product reaches across the thin link");
  for (const d of thin) assert.equal(d.restsOn.sources, 1, "one weak ground makes the whole product weak, however strong its siblings");
  for (const d of out.derived.filter((d) => !d.grounds.includes(THIN))) assert.equal(d.restsOn.sources, 2);
});

test("THE POPPERIAN CONDITION: a tower built on n=1 still FALLS — that, not the witness count, is what licenses building it", () => {
  const built = D.derive(soloLedger(), { declarations: licensed(), floor: FLOOR, carry: true, maxSteps: 4 });
  const single = hl.assertionId("b", "replaces", "c");
  assert.equal(built.derived.find((d) => d.grounds.includes(single)).restsOn.sources, 1);

  const d = hl.dispute(built.log, single, { source: "log-9", because: "c replaces b in this account." });
  assert.equal(d.refused, null);
  const ex = D.exposure(d.log, single);
  assert.ok(ex.withdrawn.length > 0, "and what would fall is known BEFORE anything is decided");

  const s = hl.settleDispute(d.log, d.id, { trigger: "log-10 reads the handover the other way", outcome: "conceded" });
  const c = D.concedePremise(s.log, s.concession.id, { trigger: s.concession.trigger });
  assert.deepEqual(c.withdrawn.map((w) => w.id).sort(), ex.withdrawn.map((w) => w.id).sort());
  assert.equal(D.foldDerived(c.log).filter((x) => x.grounds?.includes(single)).length, 0);
});
