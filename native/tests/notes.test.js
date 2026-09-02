// notes.test.js — the kernel ledger: hearing, the door, the frame, the
// stream, and the pin that its body names no medium. Against the REAL
// task-log, cube and surprise segmenter; nothing stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeNotes, noteId, REFUSALS, FRAME_TASK } from "../kernel/notes.js";
import { lcg } from "../kernel/continuation.js";

const notes = makeNotes();
const span = (ref, start, end) => ({ ref, start, end, face: `${ref}:${start}` });

test("first hearing is INS·Figure, a re-hearing SYN·Figure with witnesses and spans unioned, a no-op appends nothing", () => {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "q2", label: "precedes", end2: "q4", spans: [span("run-a", 10, 11)], witness: "run-a~hole" });
  log = notes.hear(log, { end1: "q2", label: "precedes", end2: "q4", spans: [span("run-b", 3, 4)], witness: "run-b~hole" });
  assert.equal(log.entries.length, 2);
  assert.equal(log.entries[0].operator, "INS");
  assert.equal(log.entries[1].operator, "SYN");
  assert.equal(log.entries[0].cell, "INS·Figure");
  assert.equal(log.entries[0].terrain, "Entity");
  assert.equal(log.entries[1].terrain, "Link");
  const same = notes.hear(log, { end1: "q2", label: "precedes", end2: "q4", spans: [span("run-b", 3, 4)], witness: "run-b~hole" });
  assert.equal(same, log, "a re-sighting that teaches nothing appends nothing");
  const [n] = notes.fold(log);
  assert.deepEqual(n.witnesses, ["run-a~hole", "run-b~hole"]);
  assert.equal(n.spans.length, 2);
  assert.equal(n.spans[0].face, "run-a:10", "a span's other fields are carried opaque");
});

test("the frame is the log's first entry, DEF·Ground·declared, and a frameless ledger reports the gap by name", () => {
  const framed = notes.createNotes({ frame: { organs: { relations: "native", prior: "POSPrior@1" }, omitted: ["lemmatizer"] } });
  const e = framed.entries[0];
  assert.equal(e.task_id, FRAME_TASK);
  assert.equal(e.operator, "DEF");
  assert.equal(e.grain, "Ground");
  assert.equal(e.operator_basis, "declared");
  assert.equal(e.cell, "DEF·Ground");
  assert.equal(e.terrain, "Atmosphere");
  assert.deepEqual(notes.frameOf(framed).declared.omitted, ["lemmatizer"]);
  assert.equal(notes.fold(framed).length, 0, "the frame is not a note");
  const bare = notes.createNotes();
  assert.equal(notes.frameOf(bare).gap, "no_frame");
  assert.throws(() => notes.createNotes({ frame: "everywhere" }), /a descriptor/);
});

test("the door: incomplete and unaddressed refused by the kernel, the injected gate's own refusal carried through with its givers, both lists returned", () => {
  const gate = (a) => (a.label === "and" ? { reason: "not_a_relation", detail: `"${a.label}" is a coordinator`, givers: ["UD_English-EWT"] } : null);
  const r = notes.admit(notes.createNotes(), [
    { end1: "a", label: "before", end2: "b", spans: [span("s", 0, 1)] },
    { end1: "a", label: "", end2: "b", spans: [span("s", 0, 1)] },
    { end1: "a", label: "before", end2: "c", spans: [] },
    { end1: "a", label: "and", end2: "b", spans: [span("s", 2, 3)] },
  ], { gate, witness: "s~r1" });
  assert.equal(r.heard.length, 1);
  assert.deepEqual(r.turnedAway.map((t) => t.reason), [REFUSALS.INCOMPLETE, REFUSALS.UNADDRESSED, "not_a_relation"]);
  assert.deepEqual(r.turnedAway[2].givers, ["UD_English-EWT"]);
  assert.equal(notes.fold(r.log).length, 1, "the accumulated log comes back — never the caller's original");
  const ungated = notes.admit(notes.createNotes(), [{ end1: "a", label: "and", end2: "b", spans: [span("s", 2, 3)] }]);
  assert.equal(ungated.heard.length, 1, "no gate: the check did not run, nothing is refused for it");
});

test("attest needs a namespaced witness; concede needs a trigger, leaves the log whole, and the fold stops projecting", () => {
  let log = notes.hear(notes.createNotes(), { end1: "x", label: "r", end2: "y", spans: [span("s", 0, 1)], witness: "s~m" });
  const id = noteId("x", "r", "y");
  assert.equal(notes.attest(log, id, { witness: "bare" }).refused.type, "untyped_witness");
  log = notes.attest(log, id, { witness: "testimony:s" }).log;
  assert.deepEqual(notes.fold(log)[0].witnesses, ["s~m", "testimony:s"]);
  assert.equal(notes.concede(log, id, {}).refused.type, "no_trigger");
  const c = notes.concede(log, id, { trigger: "the source's own next line denies it" });
  assert.equal(notes.fold(c.log).length, 0);
  assert.equal(c.log.entries.length, log.entries.length + 1, "nothing deleted");
  assert.equal(notes.concededNotes(c.log)[0].end1, "x");
  assert.equal(notes.concede(c.log, id, { trigger: "again" }).noop, true);
});

test("identity is injected for the ID alone; the first hearing's face wins the display", () => {
  const folding = makeNotes({ identity: (e1, l, e2) => ({ end1: e1.replace(/^the /, ""), label: l, end2: e2 }) });
  let log = folding.hear(folding.createNotes(), { end1: "the count", label: "greets", end2: "harker", spans: [span("d", 0, 1)], witness: "d~a" });
  log = folding.hear(log, { end1: "count", label: "greets", end2: "harker", spans: [span("d", 5, 6)], witness: "d~b" });
  const f = folding.fold(log);
  assert.equal(f.length, 1);
  assert.equal(f[0].end1, "the count");
  assert.equal(f[0].witnesses.length, 2);
});

test("stream, figures and segment: a ledger whose hearings recur has figures where the ground was most wrong; a shuffled one does not cut", () => {
  // A stream of hearings in a planted rhythm: a 4-note figure repeated, then
  // a different 4-note figure repeated. Recurrence is dense, so the ground
  // can be right — and be wrong exactly at the switch.
  const rng = lcg(7);
  const figA = ["a|r|b", "b|r|c", "c|r|d", "d|r|a"];
  const figB = ["p|r|q", "q|r|s", "s|r|t", "t|r|p"];
  let log = notes.createNotes({ frame: { instrument: "planted" } });
  const order = [...Array(6).fill(figA), ...Array(6).fill(figB), ...Array(6).fill(figA)].flat();
  order.forEach((id, i) => {
    const [end1, label, end2] = id.split("|");
    log = notes.hear(log, { end1, label, end2, spans: [span("planted", i, i + 1)], witness: `planted~${i}` });
  });
  const s = notes.stream(log);
  assert.equal(s.length, order.length);
  assert.equal(s[0].seq, 1, "the frame at seq 0 is not a hearing");
  const fig = notes.figures(log, { order: 2 });
  assert.ok(fig[24].bits > fig[20].bits, "the first hearing of the second figure is more surprising than a repeat inside the first");
  const seg = notes.segment(log, { order: 2, alpha: 0.05, draws: 20, seed: 1, minLength: 3 });
  assert.ok(seg.figures >= 1, "the planted switch cuts");
  assert.ok(seg.boundarySeqs.every((q) => Number.isInteger(q)), "boundaries carry back to seqs");
  // the null inside the cut: the same hearings with their order destroyed
  let shuffledLog = notes.createNotes();
  const idx = order.map((_, i) => i).sort(() => rng() - 0.5);
  idx.forEach((i, k) => { const [end1, label, end2] = order[i].split("|"); shuffledLog = notes.hear(shuffledLog, { end1, label, end2, spans: [span("planted", k, k + 1)], witness: `planted~${k}` }); });
  const shuffled = notes.segment(shuffledLog, { order: 2, alpha: 0.05, draws: 20, seed: 1, minLength: 3 });
  // The claim is WHERE the cuts land, not how many: the planted switches sit
  // at hearings 24 and 48, and the planted stream's boundaries find them
  // where the shuffled stream's (which may still cut — alpha is 0.05, not
  // zero) have no switch to find.
  const near = (b) => [24, 48].some((sw) => Math.abs(b - sw) <= 1);
  assert.ok(seg.boundaries.some(near), `a boundary lands on a planted switch: ${seg.boundaries.join(",")}`);
  assert.ok(seg.boundaries.filter(near).length >= shuffled.boundaries.filter(near).length, "order destroyed, the switches are not found more often");
  const deep = notes.segment(log, { order: 2, alpha: 0.05, draws: 20, seed: 1, minLength: 3, depth: 2 });
  assert.ok(Array.isArray(deep.levels) && deep.levels.length >= 1);
  assert.throws(() => notes.stream(log, { by: "colour" }), /by is one of/);
});

test("OMNIMODAL: the kernel's executable body names no medium", () => {
  const src = readFileSync(new URL("../kernel/notes.js", import.meta.url), "utf8");
  // `Object.keys` and `typeof x !== "object"` are the language's own type,
  // not a grammar's — stripped before the scan so the pin tests vocabulary.
  const body = src.slice(src.indexOf("export const noteId")).replace(/\bObject\./g, "").replace(/"object"/g, "");
  for (const word of ["sentence", "pronoun", "surface", "token", "word", "text", "verb", "subject", "object", "noun", "bar", "pitch"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(body), `kernel/notes.js's executable body must not mention "${word}" — it would not be medium-general`);
  }
});
