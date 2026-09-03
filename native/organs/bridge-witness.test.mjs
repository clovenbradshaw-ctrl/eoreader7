// bridge-witness.test.mjs — Pass 12 step 4, against the REAL kernel ledger
// and the REAL bridges.js derivation. Nothing about the ledger algebra is
// stubbed: content notes are heard through `notes.hear`, bridges derived by
// `syncBridges`, standings read by `notes.standingOf`, exactly as a
// production caller would.
//
// The ONE thing scripted is `selectAsk` — the model call itself, which is
// this organ's injected seam (witnessNote's own posture). A scripted asker
// is not a weakened test here: every wall this module owns (the arm, the
// indiscriminate check, the unarmed refusal, the diagnostic/act split) is
// logic ABOUT what a picker answered, so scripting the answers is the only
// way to cover the walls deterministically. What a REAL model answers on
// real material is a different question, and it is the eval driver's
// (bridge-witness-measurement.mjs) — named, and not claimed here.
import test from "node:test";
import assert from "node:assert/strict";
import { makeNotes, noteId } from "../kernel/notes.js";
import { BRIDGE_LABEL, syncBridges } from "./bridges.js";
import {
  BRIDGE_WITNESS_KIND, BRIDGE_WITNESS_REFUSALS,
  applyBridgeWitness, buildBridgeSelectMessages, contextOf, decoysFor, witnessBridge, witnessBridgesFor,
} from "./bridge-witness.js";

const norm = (v) => String(v).trim().toLowerCase();
const notes = makeNotes({ identity: (end1, label, end2) => ({ end1: norm(end1), end2: norm(end2) }) });
/** A span carrying its own text — what a real reader attaches, and what a witness needs to read. */
const span = (ref, start, end, text) => ({ ref, start, end, text });

/** One content note crossed from page-a to page-b, with real context on both sides. */
function crossed({ end1Face = "Sir John Smith", end2Face = null } = {}) {
  let log = notes.createNotes();
  log = notes.hear(log, {
    end1: "Smith", label: "chaired", end2: "the commission",
    spans: [span("page-a", 10, 60, "Smith chaired the commission through its first year.")],
    witness: "page-a~walls",
  });
  log = notes.hear(log, {
    end1: "Smith", label: "chaired", end2: "the commission",
    spans: [span("page-b", 40, 95, "Sir John Smith chaired the commission until his retirement.")],
    witness: "page-b~walls", end1Face, ...(end2Face ? { end2Face } : {}),
  });
  return { log, note: notes.fold(log)[0] };
}

/** A scripted picker: `answers` is consulted in call order, each a foldSelect-shaped raw response. */
function scriptedAsk(answers) {
  const calls = [];
  const ask = async (messages) => {
    calls.push(messages);
    return answers[calls.length - 1] ?? { stated: "no", sentence: 0 };
  };
  ask.calls = calls;
  return ask;
}
const YES = { stated: "yes", sentence: 1 };
const NO = { stated: "no", sentence: 0 };

test("contextOf reads BOTH sides' own passages off what the ledger already carries", () => {
  const { note } = crossed();
  const ctx = contextOf(note, note.joins[0]);
  assert.equal(ctx.gap, undefined);
  assert.match(ctx.establishedText, /^Smith chaired the commission/);
  assert.match(ctx.incomingText, /^Sir John Smith chaired the commission/);
  assert.equal(ctx.incomingSpan.at, "page-b#40-95", "the incoming side's own address, carried not recomputed");
});

test("contextOf names its gaps: a pre-widening join has no incoming face; a textless span has no context", () => {
  const noFace = contextOf({ id: "x", end1: "a", end2: "b", spans: [] }, { source: "s2", from: ["s1"], assumed: ["a", "b"] });
  assert.equal(noFace.gap, BRIDGE_WITNESS_REFUSALS.NO_INCOMING_FACE);

  let log = notes.createNotes();
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [{ ref: "page-a", start: 1, end: 2 }], witness: "page-a~walls" });
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [{ ref: "page-b", start: 3, end: 4 }], witness: "page-b~walls", end1Face: "Sir John Smith" });
  const textless = notes.fold(log)[0];
  assert.equal(contextOf(textless, textless.joins[0]).gap, BRIDGE_WITNESS_REFUSALS.NO_CONTEXT);
});

test("the prompt names BOTH faces and numbers its candidates — the model is asked to point, never to write", () => {
  const [system, user] = buildBridgeSelectMessages("Smith", "Smith chaired it.", "Sir John Smith", ["Sir John Smith chaired it."]);
  assert.match(system.content, /"Smith"/);
  assert.match(system.content, /"Sir John Smith"/);
  assert.match(system.content, /SAME real-world/);
  assert.match(user.content, /^Passage: "Smith chaired it\."/);
  assert.match(user.content, /1\. Sir John Smith chaired it\./);
});

test("an ARMED same — the picker affirms the real pairing and REFUSES the decoy — is the one reading that lands", async () => {
  const ask = scriptedAsk([YES, NO]);
  const v = await witnessBridge(
    { establishedFace: "Smith", establishedContext: "Smith chaired it.", incomingFace: "Sir John Smith", realContext: "Sir John Smith chaired it.", decoyContext: "Margaret Jones audited the accounts." },
    { selectAsk: ask },
  );
  assert.equal(v.verdict, "same");
  assert.equal(v.because, "Sir John Smith chaired it.");
  assert.equal(ask.calls.length, 2, "real then arm — two calls, never one");
});

test("CONTROL BUILT TO FAIL: a picker that says yes to EVERYTHING decides nothing — refused indiscriminate, never landed", async () => {
  const ask = scriptedAsk([YES, YES]);
  const v = await witnessBridge(
    { establishedFace: "Smith", establishedContext: "Smith chaired it.", incomingFace: "Sir John Smith", realContext: "Sir John Smith chaired it.", decoyContext: "Margaret Jones audited the accounts." },
    { selectAsk: ask },
  );
  assert.equal(v.verdict, undefined);
  assert.equal(v.refused, "indiscriminate");
});

test("an UNARMED yes is refused (no decoy to challenge it), while an unarmed NO still stands as an honest reading", async () => {
  const yes = await witnessBridge(
    { establishedFace: "Smith", establishedContext: "Smith chaired it.", incomingFace: "Sir John Smith", realContext: "Sir John Smith chaired it.", decoyContext: null },
    { selectAsk: scriptedAsk([YES]) },
  );
  assert.equal(yes.refused, "unarmed", "an unchallenged yes is not a witness — witnessNote's own rule");

  const no = await witnessBridge(
    { establishedFace: "Smith", establishedContext: "Smith chaired it.", incomingFace: "Sir John Smith", realContext: "Sir John Smith chaired it.", decoyContext: null },
    { selectAsk: scriptedAsk([NO]) },
  );
  assert.equal(no.verdict, "different", "withholding trust in a yes is not the same as disbelieving a no");
});

test("no context on either side spends no call at all", async () => {
  const ask = scriptedAsk([YES, NO]);
  const v = await witnessBridge({ establishedFace: "Smith", establishedContext: null, incomingFace: "S", realContext: "x" }, { selectAsk: ask });
  assert.equal(v.refused, "no-context");
  assert.equal(ask.calls.length, 0);
});

test("selectAsk is injected — never defaulted to something that could quietly answer", async () => {
  await assert.rejects(() => witnessBridge({ establishedContext: "a", realContext: "b" }, {}), /selectAsk is injected/);
});

test("applyBridgeWitness lands a `same` as its OWN witness kind, beside the crossing that inferred it", () => {
  const bridges = makeNotes();
  const { note } = crossed();
  let bridgeLog = syncBridges(bridges.createNotes(), bridges, [note]).log;
  const arrangement = { end1: "page-a:Smith", label: BRIDGE_LABEL, end2: "page-b:Sir John Smith" };
  const before = bridges.fold(bridgeLog).find((n) => n.id === noteId(arrangement.end1, arrangement.label, arrangement.end2));
  assert.equal(bridges.standingOf(before).standing, "single-witness");

  const r = applyBridgeWitness(bridgeLog, bridges, arrangement, { verdict: "same", because: "Sir John Smith chaired the commission until his retirement." }, { recipe: "bw-v1", contentNoteId: note.id, which: "end1" });
  assert.equal(r.applied, true);
  const after = bridges.fold(r.log).find((n) => n.id === noteId(arrangement.end1, arrangement.label, arrangement.end2));
  const standing = bridges.standingOf(after);
  assert.equal(standing.kinds["bridge-inferred"], 1, "the mechanical crossing is still counted as itself");
  assert.equal(standing.kinds[BRIDGE_WITNESS_KIND], 1, "and the witnessed confirmation is counted APART, never merged into it");
  assert.ok(after.witnesses.some((w) => w.startsWith(`${BRIDGE_WITNESS_KIND}:`) && w.endsWith("~bw-v1")), "the witness names its kind and its recipe (P68)");
});

test("DIAGNOSTIC AND ACT KEPT APART: a `different` verdict concedes nothing itself — it hands back a named suggestion", () => {
  const bridges = makeNotes();
  const { note } = crossed();
  let bridgeLog = syncBridges(bridges.createNotes(), bridges, [note]).log;
  const entriesBefore = bridgeLog.entries.length;
  const arrangement = { end1: "page-a:Smith", label: BRIDGE_LABEL, end2: "page-b:Sir John Smith" };

  const r = applyBridgeWitness(bridgeLog, bridges, arrangement, { verdict: "different" }, { recipe: "bw-v1", contentNoteId: note.id, which: "end1" });
  assert.equal(r.applied, false);
  assert.equal(r.log.entries.length, entriesBefore, "the ledger is untouched — this organ never concedes on its own reading");
  assert.equal(r.suggestion.concede, true);
  assert.equal(r.suggestion.id, noteId(arrangement.end1, arrangement.label, arrangement.end2));
  assert.match(r.suggestion.trigger, /refer to different things/);
  // and the suggestion is usable: a caller that DOES hold the authority concedes with it
  const conceded = bridges.concede(r.log, r.suggestion.id, { trigger: r.suggestion.trigger });
  assert.equal(conceded.refused, null);
});

test("a refusal writes nothing and suggests nothing — an unarmed yes must not leak in as a soft landing", () => {
  const bridges = makeNotes();
  const { note } = crossed();
  const bridgeLog = syncBridges(bridges.createNotes(), bridges, [note]).log;
  const r = applyBridgeWitness(bridgeLog, bridges, { end1: "page-a:Smith", label: BRIDGE_LABEL, end2: "page-b:Sir John Smith" }, { refused: "unarmed" }, { contentNoteId: note.id, which: "end1" });
  assert.equal(r.applied, false);
  assert.equal(r.suggestion, null);
  assert.equal(r.refused, "unarmed");
  assert.equal(r.log, bridgeLog);
});

test("decoysFor draws a REAL competing referent from the same source, and honestly finds none when there is none", () => {
  const a = crossed();
  const jA = a.note.joins[0];
  // a second, genuinely different correspondence out of the same incoming source
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "Jones", label: "audited", end2: "the accounts", spans: [span("page-a", 5, 40, "Jones audited the accounts.")], witness: "page-a~walls" });
  log = notes.hear(log, { end1: "Jones", label: "audited", end2: "the accounts", spans: [span("page-b", 200, 245, "Margaret Jones audited the accounts twice.")], witness: "page-b~walls", end1Face: "Margaret Jones" });
  const jB = notes.fold(log)[0].joins[0];

  const pool = [{ note: a.note, join: jA }, { note: notes.fold(log)[0], join: jB }];
  const decoy = decoysFor(jA, pool);
  assert.equal(decoy.context, "Margaret Jones audited the accounts twice.", "a competing referent from the very document being read");

  assert.equal(decoysFor(jA, [{ note: a.note, join: jA }]), null, "alone in its walk, a bridge is honestly unarmable");
});

test("witnessBridgesFor walks a real ledger under a declared budget, landing only what its arm cleared", async () => {
  const bridges = makeNotes();
  let content = notes.createNotes();
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 60, "Smith chaired the commission through its first year.")], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 95, "Sir John Smith chaired the commission until his retirement.")], witness: "page-b~walls", end1Face: "Sir John Smith" });
  content = notes.hear(content, { end1: "Jones", label: "audited", end2: "the accounts", spans: [span("page-a", 5, 40, "Jones audited the accounts.")], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Jones", label: "audited", end2: "the accounts", spans: [span("page-b", 200, 245, "Margaret Jones audited the accounts twice.")], witness: "page-b~walls", end1Face: "Margaret Jones" });
  const contentNotes = notes.fold(content);

  let bridgeLog = syncBridges(bridges.createNotes(), bridges, contentNotes).log;
  // first candidate: armed yes (lands). second: armed no (suggests). budget stops it there.
  const ask = scriptedAsk([YES, NO, NO, NO]);
  const r = await witnessBridgesFor(bridgeLog, bridges, contentNotes, { selectAsk: ask, maxAsks: 2, recipe: "bw-v1" });

  assert.equal(r.asked, 2, "the declared budget is the spend, exactly");
  assert.equal(r.applied.length, 1);
  assert.equal(r.suggestions.length, 1);
  const landed = bridges.fold(r.log).find((n) => n.id === r.applied[0].bridgeId);
  assert.equal(bridges.standingOf(landed).kinds[BRIDGE_WITNESS_KIND], 1);
});

test("maxAsks is declared by the caller (P9) — a walk with no budget is refused, never defaulted", async () => {
  const bridges = makeNotes();
  const { note } = crossed();
  await assert.rejects(
    () => witnessBridgesFor(bridges.createNotes(), bridges, [note], { selectAsk: scriptedAsk([YES]) }),
    /maxAsks is declared/,
  );
});

test("a bridge already corroborated by two independent crossings is not re-asked — a call is never spent where it cannot matter", async () => {
  const bridges = makeNotes();
  let content = notes.createNotes();
  // TWO different content notes crossing page-a -> page-b via the SAME Smith correspondence
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 60, "Smith chaired the commission.")], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 95, "Sir John Smith chaired the commission.")], witness: "page-b~walls", end1Face: "Sir John Smith" });
  content = notes.hear(content, { end1: "Smith", label: "resigned in", end2: "1999", spans: [span("page-a", 70, 99, "Smith resigned in 1999.")], witness: "page-a~walls" });
  content = notes.hear(content, { end1: "Smith", label: "resigned in", end2: "1999", spans: [span("page-b", 5, 35, "Sir John Smith resigned in 1999.")], witness: "page-b~walls", end1Face: "Sir John Smith" });
  const contentNotes = notes.fold(content);
  const bridgeLog = syncBridges(bridges.createNotes(), bridges, contentNotes).log;

  const smithBridge = bridges.fold(bridgeLog).find((n) => n.id === noteId("page-a:Smith", BRIDGE_LABEL, "page-b:Sir John Smith"));
  assert.equal(bridges.standingOf(smithBridge).standing, "corroborated", "two crossings already agree — the precondition for this test");

  const ask = scriptedAsk([YES, NO, YES, NO, YES, NO]);
  const r = await witnessBridgesFor(bridgeLog, bridges, contentNotes, { selectAsk: ask, maxAsks: 6, recipe: "bw-v1" });
  const askedSmith = r.applied.concat(r.suggestions, r.refused).some((x) => x.bridgeId === smithBridge.id);
  assert.equal(askedSmith, false, "the already-corroborated bridge was skipped, not re-litigated");
});
