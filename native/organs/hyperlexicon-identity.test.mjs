// The identity seam (P73): which two sightings are ONE note is an
// injectable question, never a string accident.
//
// SEPARATE FILE, the same reason hyperlexicon-stance.test.mjs states in its
// own header: `hyperlexicon.test.mjs` reaches the engine through
// `legacy-eoreader6.1`, an uninitialised submodule in some checkouts, so a
// test appended there can silently never run. These import eoreader7's
// NATIVE kernel — a real sibling — so the seam is exercised wherever this
// repo is checked out.
//
// The measured need these pin against (eval/hyperlexicon-door-probe.mjs,
// real Wikipedia fixtures): with identity = the exact triple, 0 of 29
// admitted notes ever reached two witnesses — restatements can never fold,
// so the >=2-witness ledger block was structurally unreachable on prose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHyperlexicon, VERB_CLASS } from "./hyperlexicon.js";
import { adaptTaskLog } from "./consequence.js";
import * as cube from "../eoreader7/native/kernel/cube.js";
import * as nativeTaskLog from "../eoreader7/native/kernel/task-log.js";

const taskLog = {
  ...adaptTaskLog({
    createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
    ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS,
    GRAINS: cube.GRAINS,
  }),
  projectTasks: nativeTaskLog.projectTasks,
};
const span = (ref) => [{ ref, start: 0, end: 9, text: "some text" }];

// A TOY canonicalizer, test-only: lowercase, strip one leading determiner
// from the ends, fold two verb inflections. The production organ (referent
// faces + sameAct) is named future wiring — these tests pin the SEAM's
// contract, not any particular canonicalization.
const toyIdentity = (subject, verb, object) => {
  const end = (s) => String(s).toLowerCase().replace(/^(the|a|an)\s+/, "");
  const v = String(verb).toLowerCase();
  return { subject: end(subject), verb: v === "withdrew" ? "withdraws" : v, object: end(object) };
};

test("without a noteIdentity organ, identity stays the exact triple — two wordings are two notes (byte-identical default)", () => {
  const hl = makeHyperlexicon(taskLog);
  let log = hl.createHyperlexicon();
  log = hl.admit(log, [{ subject: "The Russian army", verb: "withdraws", object: "the next day", spans: span("a") }], { witness: "a" }).log;
  log = hl.admit(log, [{ subject: "Russian army", verb: "withdrew", object: "the next day", spans: span("b") }], { witness: "b" }).log;
  const notes = hl.foldHyperlexicon(log);
  assert.equal(notes.length, 2);
  assert.ok(notes.every((n) => n.witnesses.length === 1));
});

test("an injected identity folds two restatements into ONE note with TWO witnesses — the corroboration mechanism is reachable", () => {
  const hl = makeHyperlexicon({ ...taskLog, noteIdentity: toyIdentity });
  let log = hl.createHyperlexicon();
  log = hl.admit(log, [{ subject: "The Russian army", verb: "withdraws", object: "the next day", spans: span("borodino.txt#1-9") }], { witness: "borodino.txt#1-9" }).log;
  log = hl.admit(log, [{ subject: "Russian army", verb: "withdrew", object: "The next day", spans: span("war-and-peace.txt#2-9") }], { witness: "war-and-peace.txt#2-9" }).log;
  const notes = hl.foldHyperlexicon(log);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].witnesses.length, 2);
  assert.equal(notes[0].spans.length, 2);
});

test("the FIRST reading's face wins the display — evidence accumulates, the words do not drift", () => {
  const hl = makeHyperlexicon({ ...taskLog, noteIdentity: toyIdentity });
  let log = hl.createHyperlexicon();
  log = hl.admit(log, [{ subject: "The Russian army", verb: "withdraws", object: "the next day", spans: span("a") }], { witness: "a" }).log;
  log = hl.admit(log, [{ subject: "russian ARMY", verb: "withdrew", object: "the Next Day", spans: span("b") }], { witness: "b" }).log;
  const [note] = hl.foldHyperlexicon(log);
  assert.equal(note.subject, "The Russian army");
  assert.equal(note.verb, "withdraws");
  assert.equal(note.object, "the next day");
});

test("a gapping identity organ falls back to surface identity per field and never blocks admission", () => {
  const hl = makeHyperlexicon({ ...taskLog, noteIdentity: () => null });
  let log = hl.createHyperlexicon();
  const r = hl.admit(log, [{ subject: "Anatole", verb: "loses", object: "a leg", spans: span("w") }], { witness: "w" });
  assert.equal(r.heard.length, 1);
  assert.equal(r.turnedAway.length, 0);
  assert.equal(hl.foldHyperlexicon(r.log).length, 1);

  const half = makeHyperlexicon({ ...taskLog, noteIdentity: (s) => ({ subject: s.toLowerCase(), verb: "", object: undefined }) });
  let log2 = half.createHyperlexicon();
  log2 = half.admit(log2, [{ subject: "Anatole", verb: "loses", object: "a leg", spans: span("x") }], { witness: "x" }).log;
  log2 = half.admit(log2, [{ subject: "ANATOLE", verb: "loses", object: "a leg", spans: span("y") }], { witness: "y" }).log;
  const notes = half.foldHyperlexicon(log2);
  assert.equal(notes.length, 1, "the one canonical field still folds; the gapped fields fall back to surface forms");
  assert.equal(notes[0].witnesses.length, 2);
});

test("the grammar gate composes with the identity seam: a settled non-verb is refused BEFORE identity ever runs", () => {
  // A stub lens shaped exactly as makeGrammarLens's return: settled
  // conjunction for "and", out-of-vocabulary for everything else.
  const lens = ({ verb }) =>
    String(verb).toLowerCase() === "and"
      ? { settled: true, thraxClass: "conjunction", givers: null }
      : { settled: false, thraxClass: null, givers: null };
  assert.notEqual(VERB_CLASS, "conjunction");
  const hl = makeHyperlexicon({ ...taskLog, noteIdentity: toyIdentity });
  const r = hl.admit(hl.createHyperlexicon(), [
    { subject: "Anatole Kuragin", verb: "and", object: "Prince Andrei", spans: span("p") },
    { subject: "Anatole", verb: "loses", object: "a leg", spans: span("p") },
  ], { witness: "p", classifyConnector: lens });
  assert.equal(r.heard.length, 1);
  assert.equal(r.turnedAway.length, 1);
  assert.equal(r.turnedAway[0].reason, "not_a_verb");
  const notes = hl.foldHyperlexicon(r.log);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].verb, "loses");
});
