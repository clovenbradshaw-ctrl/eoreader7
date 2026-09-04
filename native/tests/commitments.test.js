// commitments.test.js — the Interpretation triad over the act ledger,
// against the REAL kernel. Nothing stubbed: commitments are declared onto
// the same `makeNotes()` log the hearings land on, exactly as a caller
// would, and every projection runs through the real `fold`.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeNotes, noteId } from "../kernel/notes.js";
import { makeCommitments, KINDS, STANDINGS, REFUSALS } from "../kernel/commitments.js";

const notes = makeNotes();
const commit = makeCommitments();
const span = (ref, start, end) => ({ ref, start, end, at: `${ref}#${start}-${end}`, text: `${ref}:${start}` });

/** a real log with three heard notes, two of which a reader might call one */
function heard() {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "The Russian army", label: "withdraws", end2: "from Moscow", spans: [span("a", 1, 9)], witness: "a~r1" });
  log = notes.hear(log, { end1: "Imperial Russian forces", label: "retreated", end2: "from Moscow", spans: [span("b", 2, 9)], witness: "b~r1" });
  log = notes.hear(log, { end1: "Category link", label: "is", end2: "on Wikidata", spans: [span("a", 90, 99)], witness: "a~r1" });
  return log;
}
const ID_A = noteId("The Russian army", "withdraws", "from Moscow");
const ID_B = noteId("Imperial Russian forces", "retreated", "from Moscow");
const ID_FURNITURE = noteId("Category link", "is", "on Wikidata");

const declared = (log, over) => {
  const r = commit.declare(log, { kind: KINDS.SAME_AS, members: over, giver: "test-reader", purpose: "tracking troop movements" });
  assert.equal(r.refused, null);
  return r;
};
/** declare + evaluate-holds, the two acts that put a commitment in force */
function inForce(log, opts) {
  const d = commit.declare(log, { giver: "test-reader", purpose: "tracking troop movements", ...opts });
  assert.equal(d.refused, null, `declare refused: ${JSON.stringify(d.refused)}`);
  const e = commit.evaluate(d.log, d.id, { verdict: "holds", ground: "the heard ledger", broken: "membership" });
  assert.equal(e.refused, null);
  return { log: e.log, id: d.id };
}

test("the log was never a ledger of NOTES — it lands acts, and a note is one product", () => {
  const log = heard();
  assert.equal(notes.fold(log).length, 3);
  const { log: withCommit } = inForce(log, { kind: KINDS.SAME_AS, members: [ID_A, ID_B] });
  // the commitment is IN the log
  assert.ok(withCommit.entries.some((e) => e.operator === "DEF" && e.commitment === KINDS.SAME_AS));
  assert.ok(withCommit.entries.some((e) => e.operator === "EVA" && e.verdict === "holds"));
});

test("THE WALL: a commitment never appears as a note — fold() is unchanged by any number of them", () => {
  const log = heard();
  const before = notes.fold(log);
  let after = inForce(log, { kind: KINDS.SAME_AS, members: [ID_A, ID_B] }).log;
  after = inForce(after, { kind: KINDS.DOES_NOT_MATTER, members: [ID_FURNITURE] }).log;
  after = inForce(after, { kind: KINDS.MATTERS, members: [ID_A] }).log;
  assert.deepEqual(notes.fold(after), before, "the heard record reads byte-identical however much was declared over it");
});

test("THE WALL: a commitment never counts as a witness", () => {
  const log = heard();
  const withCommit = inForce(log, { kind: KINDS.SAME_AS, members: [ID_A, ID_B] }).log;
  const a = notes.fold(withCommit).find((n) => n.id === ID_A);
  assert.equal(notes.standingOf(a).sources, 1, "a giver is not a source");
  assert.equal(notes.standingOf(a).standing, "single-witness");
});

test("DEF refuses without a giver — a commitment nobody is behind is a default, not a defeasible reading", () => {
  const r = commit.declare(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B], purpose: "x" });
  assert.equal(r.refused.type, REFUSALS.NO_GIVER);
});

test("DEF refuses without a purpose — a tolerance is always a tolerance FOR something", () => {
  const r = commit.declare(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B], giver: "g" });
  assert.equal(r.refused.type, REFUSALS.NO_PURPOSE);
});

test("DEF refuses a same-as with one member, and an unknown kind by name", () => {
  assert.equal(commit.declare(heard(), { kind: KINDS.SAME_AS, members: [ID_A], giver: "g", purpose: "p" }).refused.type, REFUSALS.TOO_FEW_MEMBERS);
  assert.equal(commit.declare(heard(), { kind: "obviously-true", members: [ID_A], giver: "g", purpose: "p" }).refused.type, REFUSALS.UNKNOWN_KIND);
});

test("a declared commitment stands as a WISH until an EVA clears it — putting a reading forward is not checking it", () => {
  const d = declared(heard(), [ID_A, ID_B]);
  const [c] = commit.standings(d.log);
  assert.equal(c.standing, STANDINGS.WISH);
  assert.equal(commit.inForce(d.log).length, 0, "a wish does not get to change what a reader sees");
});

test("EVA refuses without a named ground AND the perturbation it was broken against", () => {
  const d = declared(heard(), [ID_A, ID_B]);
  assert.equal(commit.evaluate(d.log, d.id, { verdict: "holds", ground: "the ledger" }).refused.type, "no_ground");
  assert.equal(commit.evaluate(d.log, d.id, { verdict: "holds", broken: "membership" }).refused.type, "no_ground");
  assert.equal(commit.evaluate(d.log, d.id, { verdict: "maybe", ground: "g", broken: "b" }).refused.type, "unknown_verdict");
});

test("EVA holds -> testimony -> the projection applies it: two heard notes read as one, witnesses unioned", () => {
  const { log } = inForce(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B] });
  const read = commit.readUnder(log, notes);
  assert.equal(read.notes.length, 2, "three heard notes read as two under the commitment");
  const folded = read.notes.find((n) => n.folds);
  assert.deepEqual(folded.folds.sort(), [ID_A, ID_B].sort());
  assert.equal(folded.witnesses.length, 2, "the fold is what produces a second witness");
  assert.equal(notes.standingOf(folded).standing, "corroborated");
  assert.ok(folded.under.length, "and it says what it was read under");
});

test("a wish does NOT fold — include it explicitly and it does, which is how EVA measures what it WOULD do", () => {
  const d = declared(heard(), [ID_A, ID_B]);
  assert.equal(commit.readUnder(d.log, notes).notes.length, 3, "default reads testimony only");
  const asIf = commit.readUnder(d.log, notes, { include: [STANDINGS.WISH] });
  assert.equal(asIf.notes.length, 2);
});

test("does-not-matter withholds without deleting, and `matters` overrides it", () => {
  let { log } = inForce(heard(), { kind: KINDS.DOES_NOT_MATTER, members: [ID_FURNITURE] });
  let read = commit.readUnder(log, notes);
  assert.equal(read.notes.length, 2);
  assert.equal(read.dropped[0].id, ID_FURNITURE);
  assert.ok(read.dropped[0].under.length, "and it names the commitment that withheld it");

  log = inForce(log, { kind: KINDS.MATTERS, members: [ID_FURNITURE] }).log;
  read = commit.readUnder(log, notes);
  assert.equal(read.notes.length, 3, "a later `matters` keeps what an earlier `does-not-matter` withheld");
});

test("RECOVERABILITY — the property blankFurniture cannot have: concede, and the withheld note is read again", () => {
  const { log, id } = inForce(heard(), { kind: KINDS.DOES_NOT_MATTER, members: [ID_FURNITURE] });
  assert.equal(commit.readUnder(log, notes).notes.length, 2);

  const r = commit.concede(log, id, { trigger: "it was dialogue, not furniture" });
  assert.equal(r.refused, null);
  assert.equal(commit.standings(r.log).find((c) => c.id === id).standing, STANDINGS.CONCEDED);
  const read = commit.readUnder(r.log, notes);
  assert.equal(read.notes.length, 3, "the note was never deleted, so conceding brings it back");
  assert.ok(read.notes.some((n) => n.id === ID_FURNITURE));
});

test("concede refuses without a trigger — never a silent concession", () => {
  const { log, id } = inForce(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B] });
  assert.equal(commit.concede(log, id, {}).refused.type, "no_trigger");
});

test("classesOf is transitive — A~B and B~C put all three in one class, so a contradiction three commitments away is findable", () => {
  const live = [
    { kind: KINDS.SAME_AS, members: ["a", "b"] },
    { kind: KINDS.SAME_AS, members: ["b", "c"] },
    { kind: KINDS.DOES_NOT_MATTER, members: ["z"] },
  ];
  const classes = commit.classesOf(live);
  assert.equal(classes.length, 1);
  assert.deepEqual(classes[0], ["a", "b", "c"]);
});

test("CONTROL BUILT TO FAIL: redeal keeps each commitment's kind and size over RANDOM members, and never touches the real log", () => {
  const { log } = inForce(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B] });
  const universe = notes.fold(log).map((n) => n.id);
  const control = commit.redeal(log, universe, { seed: 7 });
  const real = commit.inForce(log);
  const dealt = commit.inForce(control);
  assert.equal(dealt.length, real.length, "same number of commitments");
  assert.equal(dealt[0].kind, real[0].kind, "same kind");
  assert.equal(dealt[0].members.length, real[0].members.length, "same size");
  assert.ok(dealt[0].giver.startsWith("redeal:"), "and it says it is a control");
  // the real log is untouched — an experiment does not land on the record
  assert.equal(commit.standings(log).length, 1);
  assert.notEqual(control, log);
});

test("redeal is seeded — the same seed deals the same control, so a measurement reproduces", () => {
  const { log } = inForce(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B] });
  const universe = notes.fold(log).map((n) => n.id);
  const a = commit.inForce(commit.redeal(log, universe, { seed: 3 }))[0].members;
  const b = commit.inForce(commit.redeal(log, universe, { seed: 3 }))[0].members;
  assert.deepEqual(a, b);
});

test("MEDIUM-BLIND: this kernel names no medium in its executable body", () => {
  const src = readFileSync(new URL("../kernel/commitments.js", import.meta.url), "utf8");
  const body = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*")).join("\n");
  for (const word of ["sentence", "word", "verb", "pixel", "bar", "phoneme"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(body), `the kernel names a medium: "${word}"`);
  }
});

test("a conceded COMMITMENT is on the record but is not a conceded NOTE — the log holds acts, and concededNotes' name is its contract", () => {
  const { log, id } = inForce(heard(), { kind: KINDS.SAME_AS, members: [ID_A, ID_B] });
  const r = commit.concede(log, id, { trigger: "the tolerance was wrong for this purpose" });
  assert.equal(notes.concededNotes(r.log).length, 0, "no NOTE was conceded");
  assert.ok(notes.concededIds(r.log).has(id), "but the concession is on the record");
  assert.equal(commit.standings(r.log).find((c) => c.id === id).standing, STANDINGS.CONCEDED);
  // and a genuinely conceded note still reports, so the filter did not just switch it off
  const withNote = notes.concede(r.log, ID_FURNITURE, { trigger: "misheard" });
  assert.deepEqual(notes.concededNotes(withNote.log).map((n) => n.id), [ID_FURNITURE]);
});

test("commitment ids are printable and unambiguous — no control characters, and two different member sets never collide", () => {
  const log = heard();
  const a = commit.declare(log, { kind: KINDS.SAME_AS, members: ["x y", "z"], giver: "g", purpose: "p" });
  const b = commit.declare(log, { kind: KINDS.SAME_AS, members: ["x", "y z"], giver: "g", purpose: "p" });
  assert.notEqual(a.id, b.id, "'x y'+'z' and 'x'+'y z' are different sets and must not share an id");
  assert.ok(!/[\u0000-\u001f]/.test(a.id), "an id with a control character in it is not addressable");
});
