// voices.test.mjs — source independence, against the REAL kernel ledger and
// the REAL reproduction organ. Nothing stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { makeNotes, sourceOfWitness, standingOf } from "../kernel/notes.js";
import { makeReproduction } from "../kernel/reproduction.js";
import { normalizedIndex } from "./quotes.js";
import { REPEATS_LABEL, repetitionLens, findRepetitions, landRepetitions, independentVoices } from "./voices.js";

const shed = (s) => String(s).replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
const reproduction = makeReproduction({ fold: normalizedIndex, sameRaw: (a, b) => shed(a) === shed(b) });
const notes = makeNotes();
const lens = repetitionLens({ minRun: 30, giver: "voices.test" });

// Two pages that share one stretch verbatim (nothing marks it) and each also
// says something entirely its own.
const SHARED = "The commission reported no irregularities in the audit of the eastern district.";
const pageA = { id: "page-a", material: `Alpha Gazette coverage. ${SHARED} Alpha's own reporter added that turnout fell sharply.` };
const pageB = { id: "page-b", material: `Beta Herald coverage. ${SHARED} Beta's own reporter added that rainfall was heavy.` };

const at = (page, needle) => {
  const from = page.material.indexOf(needle);
  return { at: `${page.id}#${from}-${from + needle.length}`, ref: page.id };
};

test("findRepetitions: the shared stretch is found with nothing claiming it, in both directions", () => {
  const reps = findRepetitions([pageA, pageB], { reproduction, minRun: 30 });
  assert.ok(reps.length >= 2, "reported from each side — this organ cannot say which came first");
  const fromA = reps.find((r) => r.from === "page-a" && r.to === "page-b");
  assert.ok(fromA, "page-a's own side of the reproduction");
  assert.match(fromA.raw, /no irregularities in the audit/);
  assert.equal(fromA.contextChecked, false);
});

test("a note carried BY the shared run collapses to one voice — and standingOf's own number is untouched", () => {
  const reps = findRepetitions([pageA, pageB], { reproduction, minRun: 30 });
  const note = {
    end1: "commission", label: "reported", end2: "no irregularities",
    witnesses: ["page-a~walls", "page-b~walls"],
    spans: [at(pageA, SHARED), at(pageB, SHARED)],
  };
  assert.equal(standingOf(note).sources, 2, "the ledger's own count is unchanged by this file");
  assert.equal(standingOf(note).standing, "corroborated");

  const v = independentVoices(note, { repetitions: reps, lens, sourceOfWitness });
  assert.equal(v.sources, 2, "reported BESIDE the old number, never replacing it");
  assert.equal(v.independentVoices, 1, "one voice repeated is one voice");
  assert.equal(v.collapsed.length, 1);
  assert.equal(v.collapsed[0].contextChecked, false);
  assert.equal(v.lens.giver, "voices.test", "the lens in force is named on the result");
});

test("CONTROL BUILT TO FAIL: the SAME two sources stay two voices for a claim each makes on its own", () => {
  // page-a and page-b demonstrably repeat each other — but not HERE. A
  // collapse driven by the source pair rather than by this claim's own span
  // would wrongly destroy real corroboration, so this must stay 2.
  const reps = findRepetitions([pageA, pageB], { reproduction, minRun: 30 });
  const ownWords = {
    end1: "reporter", label: "added", end2: "detail",
    witnesses: ["page-a~walls", "page-b~walls"],
    spans: [at(pageA, "turnout fell sharply"), at(pageB, "rainfall was heavy")],
  };
  const v = independentVoices(ownWords, { repetitions: reps, lens, sourceOfWitness });
  assert.equal(v.independentVoices, 2, "these two sentences are not reproductions of each other");
  assert.deepEqual(v.collapsed, []);
});

test("a repetition lands as an ordinary arrangement, with both addresses, and is concedable like any note", () => {
  const reps = findRepetitions([pageA, pageB], { reproduction, minRun: 30 });
  let log = notes.createNotes({ frame: { organs: ["reproduction"], lens: lens.name } });
  const landed = landRepetitions(log, notes, reps, { witness: "voices~test-v1" });
  log = landed.log;
  const fold = notes.fold(log);
  const edge = fold.find((n) => n.label === REPEATS_LABEL && n.end1 === "page-a" && n.end2 === "page-b");
  assert.ok(edge, "A repeats B is on the ledger as an ordinary note");
  assert.equal(edge.spans.length, 2, "both sides addressed, so either reads back");
  assert.ok(edge.spans.every((s) => /#\d+-\d+$/.test(s.at)));

  const conceded = notes.concede(log, edge.id, { trigger: "test: the shared run turned out to be a shared template, not a repetition of a claim" });
  assert.equal(conceded.refused, null);
  assert.ok(!notes.fold(conceded.log).some((n) => n.id === edge.id), "revisable, like every other claim here");
});

test("the lens is declared: minRun and a giver, or it is not a lens", () => {
  assert.throws(() => repetitionLens({ giver: "x" }), /minRun is declared/);
  assert.throws(() => repetitionLens({ minRun: 30 }), /names its giver/);
  assert.throws(() => independentVoices({}, { repetitions: [], sourceOfWitness }), /lens is declared/);
});

test("a source repeating a body that is NOT among this note's witnesses changes nothing", () => {
  const pageC = { id: "page-c", material: `Gamma Post. ${SHARED} Gamma's own line.` };
  const reps = findRepetitions([pageA, pageB, pageC], { reproduction, minRun: 30 });
  const note = {
    end1: "commission", label: "reported", end2: "no irregularities",
    witnesses: ["page-a~walls"],
    spans: [at(pageA, SHARED)],
  };
  const v = independentVoices(note, { repetitions: reps, lens, sourceOfWitness });
  assert.equal(v.independentVoices, 1, "one witness is one voice; a body it repeats but that never witnessed this note is not subtracted");
});

test("TRANSITIVE, the real-page regression: two witnesses joined only through a body that never witnessed the note", () => {
  // Measured on real pages: a note witnessed by Gettysburg and Lincoln alone
  // read as "two voices" because the covering runs went Gettysburg->CivilWar
  // and CivilWar->Lincoln. Both were carrying one transcluded template.
  const pageC = { id: "page-c", material: `Gamma Post. ${SHARED} Gamma's own line entirely.` };
  const reps = findRepetitions([pageA, pageB, pageC], { reproduction, minRun: 30 });
  const note = {
    end1: "commission", label: "reported", end2: "no irregularities",
    // page-b is NOT a witness here — it is only the body the other two meet through.
    witnesses: ["page-a~walls", "page-c~walls"],
    spans: [at(pageA, SHARED), at(pageC, SHARED)],
  };
  const v = independentVoices(note, { repetitions: reps, lens, sourceOfWitness });
  assert.equal(v.sources, 2);
  assert.equal(v.independentVoices, 1, "one template carried by both is one voice, however many bodies it travelled through");
});
