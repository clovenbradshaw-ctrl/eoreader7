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

test("a frame can be redeclared after birth: SUPERSEDE keeps the past, the latest is in force, an identical redeclaration appends nothing", () => {
  let log = notes.createNotes({ frame: { priors: { pos: null } } });
  log = notes.hear(log, { end1: "a", label: "r", end2: "b", spans: [span("s", 0, 1)], witness: "s~r0" });
  const same = notes.redeclareFrame(log, { priors: { pos: null } });
  assert.equal(same, log, "the frame in force is unchanged — nothing to say");
  log = notes.redeclareFrame(log, { priors: { pos: "POSPrior@1" } });
  assert.equal(notes.frameOf(log).declared.priors.pos, "POSPrior@1");
  assert.equal(notes.frameOf(log).revisions, 1);
  assert.equal(notes.frames(log).length, 2, "the birth frame is kept beneath the redeclared one");
  assert.equal(log.entries.at(-1).kind, "supersede");
  assert.equal(log.entries.at(-1).cell, "DEF·Ground");
  const late = notes.redeclareFrame(notes.createNotes(), { organs: { reader: "x" } });
  assert.equal(notes.frameOf(late).revisions, 0, "a frameless ledger given a frame late has a birth frame now, not a revision");
  assert.equal(notes.fold(log).length, 1, "frames are never notes");
});

test("figures: the floor is the stream's own alphabet, so an early first occurrence and a late one read the same bits", () => {
  let log = notes.createNotes();
  const ids = ["p|r|q", "x|r|y", "p|r|q", "x|r|y", "p|r|q", "m|r|n"];
  ids.forEach((id, i) => { const [end1, label, end2] = id.split("|"); log = notes.hear(log, { end1, label, end2, spans: [span("s", i, i + 1)], witness: `s~${i}` }); });
  const f = notes.figures(log, { by: "id", order: 2 });
  assert.equal(f[0].bits, f.at(-1).bits, "first occurrence at seq 0 and at the tail: identical surprise, not a growing-floor artifact");
});

test("dietBoundaries: a source whose tail stops recurring is a boundary; the same hearings shuffled are not; concedeDiet takes back only notes heard nowhere else", () => {
  // The body: a small cast recurring in a planted rhythm. The tail: twelve
  // hearings that share nothing with the body and nothing with each other —
  // the shape of a wrapper, a bibliography, a licence.
  const body = [];
  const cast = ["a", "b", "c", "d"];
  for (let i = 0; i < 60; i += 1) body.push(`${cast[i % 4]}|r|${cast[(i + 1) % 4]}`);
  const tail = Array.from({ length: 12 }, (_, i) => `junk${i}|is|thing${i}`);
  const build = (ids, src) => {
    let log = notes.createNotes({ frame: { instrument: "planted" } });
    ids.forEach((id, i) => { const [end1, label, end2] = id.split("|"); log = notes.hear(log, { end1, label, end2, spans: [span(src, i, i + 1)], witness: `${src}#${i}-${i + 1}~planted` }); });
    return log;
  };
  const P = { by: "end1", order: 2, alpha: 0.05, draws: 40, seed: 3 };
  const withTail = build([...body, ...tail], "doc");
  const [b] = notes.dietBoundaries(withTail, P);
  assert.equal(b.source, "doc", "the source is read off the witness up to its address");
  assert.ok(b.boundary, `the planted tail is a boundary: run ${b.run} vs null ${b.runNull}`);
  assert.ok(b.run >= 12 && b.seqs.length === b.run, "the run is the tail, and every seq in it is returned");
  // control: the same hearings with their order destroyed
  const rng = lcg(11);
  const shuffledIds = [...body, ...tail].map((id) => ({ id, k: rng() })).sort((x, y) => x.k - y.k).map((x) => x.id);
  const [c] = notes.dietBoundaries(build(shuffledIds, "doc"), P);
  assert.ok(!c.boundary || c.run <= b.run / 3, `order destroyed: no comparable tail run (run ${c.run}, null ${c.runNull})`);
  // control: the body alone — real material to its last hearing
  const [d] = notes.dietBoundaries(build(body, "doc"), P);
  assert.ok(!d.boundary, `a source that recurs to its end has no boundary (run ${d.run}, null ${d.runNull})`);
  // the act: concede what was heard only inside the run
  let mixed = withTail;
  mixed = notes.hear(mixed, { end1: "junk3", label: "is", end2: "thing3", spans: [span("doc", 500, 501)], witness: "doc#500-501~planted" }); // heard again — still inside the run, still conceded
  const before = notes.fold(withTail).length;
  const r = notes.concedeDiet(withTail, b, { trigger: "diet boundary" });
  assert.equal(r.conceded.length, 12, "every note heard only in the tail is conceded");
  assert.equal(notes.fold(r.log).length, before - 12);
  assert.equal(notes.fold(r.log).some((n) => n.end1.startsWith("junk")), false);
  assert.match(notes.concededNotes(r.log)[0].trigger, /tail run of \d+ hearings/);
  assert.equal(notes.concedeDiet(withTail, d).refused.type, "no_boundary");
  // a source with one hearing is reported, never judged
  const tiny = notes.dietBoundaries(build(["a|r|b"], "one"), P)[0];
  assert.equal(tiny.refused, "too_short");
  assert.throws(() => notes.dietBoundaries(withTail, { by: "end1", order: 2 }), /is declared/);
});

// ── witness standing: kinds, sources, instruments — medium-blind ──────────
test("standingOf: one source is single-witness however many kinds repeat it; two sources through one instrument corroborate; two instruments corroborate independently; kinds are counted apart", () => {
  const n = (witnesses) => ({ witnesses });
  // a bare mechanical sighting plus a testimony vote FROM THE SAME source: one perspective
  const one = notes.standingOf(n(["page-a.txt#10-40~r1", "testimony:page-a.txt"]));
  assert.equal(one.sources, 1); assert.equal(one.standing, "single-witness");
  assert.deepEqual(one.kinds, { sighting: 1, testimony: 1 });
  // two sources, one decoder: they cannot disagree about the decoder
  const shared = notes.standingOf(n(["take1.wav#0-9~tracker-a", "take2.wav#3-7~tracker-a"]));
  assert.equal(shared.sources, 2); assert.equal(shared.instruments, 1); assert.equal(shared.standing, "corroborated");
  // two sources, two decoders
  const indep = notes.standingOf(n(["take1.wav#0-9~tracker-a", "take2.wav#3-7~tracker-b"]));
  assert.equal(indep.instruments, 2); assert.equal(indep.standing, "corroborated-independently");
  // the omnimodal shape of the primary-source law: an ACCOUNT of a
  // performance (a review) and the performance's own record are different
  // KINDS of witness; the kernel counts them apart and interprets neither
  const account = notes.standingOf(n(["review.txt#120-180~walls-v1"]));
  assert.deepEqual(account.kinds, { sighting: 1 });
  const chased = notes.standingOf(n(["review.txt#120-180~walls-v1", "primary:performance.wav#40-52~goertzel"]));
  assert.equal(chased.sources, 2); assert.equal(chased.instruments, 2);
  assert.deepEqual(chased.kinds, { sighting: 1, primary: 1 });
  assert.equal(chased.standing, "corroborated-independently");
  // undeclared recipes are counted, never silently merged
  assert.equal(notes.standingOf(n(["a.txt#1-2", "b.txt#3-4"])).undeclared, 2);
  // the witness grammar, read back one field at a time
  assert.equal(notes.sourceOfWitness("primary:archive.org#5-9~ranke-v1"), "archive.org");
  assert.equal(notes.recipeOfWitness("primary:archive.org#5-9~ranke-v1"), "ranke-v1");
  assert.equal(notes.kindOfWitness("primary:archive.org#5-9~ranke-v1"), "primary");
  assert.equal(notes.kindOfWitness("archive.org#5-9~ranke-v1"), "sighting");
  // a ref that itself contains a colon after an address is not a kind
  assert.equal(notes.kindOfWitness("http://x#1-2"), "http"); // a declared kind is whatever precedes the first colon with no address in it — callers keep refs colon-free or declare the kind
});

test("foldWithStanding carries the standing on every projected note", () => {
  let log = notes.createNotes({ frame: { reader: "test" } });
  log = notes.hear(log, { end1: "Kutuzov", label: "commanded", end2: "the army", spans: [span("a.txt", 0, 10)], witness: "a.txt#0-10~r" });
  log = notes.hear(log, { end1: "Kutuzov", label: "commanded", end2: "the army", spans: [span("b.txt", 5, 15)], witness: "b.txt#5-15~r" });
  log = notes.hear(log, { end1: "Bagration", label: "held", end2: "the flèches", spans: [span("a.txt", 20, 30)], witness: "a.txt#20-30~r" });
  const f = notes.foldWithStanding(log);
  assert.equal(f[0].standing, "corroborated"); assert.equal(f[0].sources, 2);
  assert.equal(f[1].standing, "single-witness"); assert.deepEqual(f[1].kinds, { sighting: 1 });
});

// ── the join: proposition identity and referent identity are two claims ──
// A triple that matches a note already here asserts the two PROPOSITIONS
// are the same. A hearing that also arrives from a source no witness has
// named asserts the two documents' REFERENTS are the same — a bridge
// between two readings, each of which established its own universe. These
// tests pin that the second claim is recorded with what it rested on, that
// it can be refused, and that refusing it loses nothing.

test("a cross-source join is RECORDED as an assumed bridge, with what it rested on", () => {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls" });
  const [n] = notes.fold(log);
  assert.equal(n.witnesses.length, 2, "the proposition still joins — that job is unchanged");
  assert.equal(n.joins.length, 1, "and the referent claim it also made is on the record");
  assert.deepEqual(n.joins[0].from, ["page-a"]);
  assert.equal(n.joins[0].source, "page-b");
  assert.deepEqual(n.joins[0].assumed, ["Smith", "the commission"]);
  assert.equal(n.joins[0].basis, "string-identity", "with no identity organ, that is literally all it rested on");
  assert.equal(n.joins[0].standing, "assumed");
  const st = notes.standingOf(n);
  assert.equal(st.standing, "corroborated");
  assert.equal(st.assumedBridges, 1, "so 'corroborated' reads back as 'across one bridge nobody checked'");
});

test("a source re-witnessing its OWN note is not a bridge and records no join", () => {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 90, 110)], witness: "page-a~walls" });
  const [n] = notes.fold(log);
  assert.equal(n.spans.length, 2, "a second sighting in the same document is still evidence");
  assert.equal(n.joins ?? undefined, undefined, "but it crosses no universe, so there is nothing to assume");
  assert.equal(notes.standingOf(n).assumedBridges, 0);
});

test("CONTROL BUILT TO FAIL: one name, two referents — an unrefused join silently corroborates a claim neither document makes", () => {
  // Two real documents. Each says "Smith chaired the commission". They are
  // different Smiths chairing different commissions, and nothing in the
  // triples can tell them apart — which is exactly the case that must not
  // pass silently.
  const heard = (ledger) => {
    let log = ledger.createNotes();
    log = ledger.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("banking-1998", 10, 30)], witness: "banking-1998~walls" });
    log = ledger.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("fisheries-2011", 40, 60)], witness: "fisheries-2011~walls" });
    return log;
  };

  // WITHOUT a bridge organ: one note, two sources, reads as corroborated —
  // and the assumption is at least visible now, which is this step's floor.
  const silent = notes.fold(heard(notes));
  assert.equal(silent.length, 1);
  assert.equal(notes.standingOf(silent[0]).standing, "corroborated");
  assert.equal(notes.standingOf(silent[0]).assumedBridges, 1, "the false corroboration is countable rather than invisible");

  // WITH one: an organ that knows these universes disagree refuses the
  // crossing. The scripted disagreement stands in for whatever a real organ
  // would read (a mismatched date, an incompatible kind) — what is pinned
  // here is that a refusal is honoured and costs no evidence.
  const universes = { "banking-1998": "person:smith-a", "fisheries-2011": "person:smith-b" };
  const withBridge = makeNotes({
    bridge: ({ from, to }) => {
      const theirs = new Set(from.map((f) => universes[f]));
      return theirs.has(universes[to]) ? null : { reason: "referents_differ", detail: `${[...theirs].join(",")} vs ${universes[to]}` };
    },
  });
  const split = withBridge.fold(heard(withBridge));
  assert.equal(split.length, 2, "two universes, two notes — the refusal is not a drop");
  const base = split.find((n) => n.id === noteId("Smith", "chaired", "the commission"));
  const scoped = split.find((n) => n.id !== base.id);
  assert.equal(scoped.id, `${base.id}@fisheries-2011`, "the second sighting keeps its own address under its own source");
  assert.deepEqual(base.witnesses, ["banking-1998~walls"]);
  assert.deepEqual(scoped.witnesses, ["fisheries-2011~walls"]);
  assert.equal(withBridge.standingOf(base).standing, "single-witness");
  assert.equal(withBridge.standingOf(scoped).standing, "single-witness");
  assert.equal(scoped.unbridged.of, base.id);
  assert.equal(scoped.unbridged.reason, "referents_differ");
  assert.deepEqual(scoped.unbridged.from, ["banking-1998"]);
  assert.equal(scoped.spans.length, 1, "the evidence survives the refusal");
});

test("a refused source that hears the same triple twice accumulates on ITS OWN note, never back across the refusal", () => {
  const withBridge = makeNotes({ bridge: () => ({ reason: "referents_differ" }) });
  let log = withBridge.createNotes();
  log = withBridge.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("a", 1, 2)], witness: "a~w" });
  log = withBridge.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("b", 3, 4)], witness: "b~w" });
  log = withBridge.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("b", 9, 10)], witness: "b~w" });
  const all = withBridge.fold(log);
  assert.equal(all.length, 2);
  const scoped = all.find((n) => n.id.endsWith("@b"));
  assert.equal(scoped.spans.length, 2, "the second sighting from b lands on b's own note");
  assert.equal(all.find((n) => !n.id.includes("@")).spans.length, 1, "and never on a's");
});

test("no bridge organ: witnesses, spans and ids are byte-identical to before this seam existed", () => {
  let log = notes.createNotes();
  for (const [ref, at] of [["a", 1], ["b", 2], ["c", 3]])
    log = notes.hear(log, { end1: "q2", label: "precedes", end2: "q4", spans: [span(ref, at, at + 1)], witness: `${ref}~hole` });
  const [n] = notes.fold(log);
  assert.equal(n.id, noteId("q2", "precedes", "q4"));
  assert.deepEqual(n.witnesses, ["a~hole", "b~hole", "c~hole"]);
  assert.equal(n.spans.length, 3);
  assert.equal(notes.standingOf(n).assumedBridges, 2, "two crossings past the first source, both recorded");
});

// ── the join now carries BOTH sides — step 2's own prerequisite ──────────
// Step 1 recorded only the established side's face (`assumed`); a bridge
// with one end visible cannot be shown as a correspondence, only counted.
// `bridges.js` (step 2) needs the incoming side's own face and spans to
// record a bridge as a real arrangement, not a fabricated one.

test("a join now carries the INCOMING side's own face and spans, not only the established side's", () => {
  const withIdentity = makeNotes({ identity: () => ({ end1: "smith-1998", end2: "the-commission-1998" }) });
  let log = withIdentity.createNotes();
  log = withIdentity.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  log = withIdentity.hear(log, {
    end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls",
    end1Face: "Sir John Smith", end2Face: "the Fisheries Commission",
  });
  const [n] = withIdentity.fold(log);
  assert.deepEqual(n.joins[0].incomingEnds, { end1: "Sir John Smith", end2: "the Fisheries Commission" }, "the incoming source's OWN words for each end, not the established note's");
  assert.equal(n.joins[0].incomingSpans.length, 1);
  assert.equal(n.joins[0].incomingSpans[0].at, "page-b#40-60");
});

test("with no face supplied, incomingEnds falls back to the raw end text — never blank, never invented", () => {
  let log = notes.createNotes();
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-a", 10, 30)], witness: "page-a~walls" });
  log = notes.hear(log, { end1: "Smith", label: "chaired", end2: "the commission", spans: [span("page-b", 40, 60)], witness: "page-b~walls" });
  const [n] = notes.fold(log);
  assert.deepEqual(n.joins[0].incomingEnds, { end1: "Smith", end2: "the commission" });
});

// ── S69: the cut — a denial is SEG·Figure with its own id, never a witness of its link ──
test("a cut lands SEG·Figure under its own id, folds apart from the links, and can never corroborate the link it denies", () => {
  let log = notes.createNotes();
  const r1 = notes.admit(log, [{ end1: "the observatory", label: "opened", end2: "in 1889", spans: [span("a.txt", 0, 10)] }], { witness: "a.txt#0-10~r" });
  log = r1.log;
  const r2 = notes.admit(log, [{ end1: "the observatory", label: "opened", end2: "in 1889", polarity: "-", decider: "never opened in 1889", spans: [span("b.txt", 5, 20)] }], { witness: "b.txt#5-20~r" });
  log = r2.log;
  assert.equal(r2.heard[0].cut, true);
  assert.ok(r2.heard[0].id.startsWith("cut:"));
  const links = notes.fold(log);
  assert.equal(links.length, 1, "the fold carries the link only");
  assert.deepEqual(links[0].witnesses, ["a.txt#0-10~r"], "the denial is NOT a witness of the link");
  const cuts = notes.foldCuts(log);
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].link, links[0].id);
  assert.deepEqual(cuts[0].witnesses, ["b.txt#5-20~r"]);
  const cutEntry = log.entries.find((e) => e.cut === true);
  assert.equal(cutEntry.operator, "SEG");
  assert.equal(cutEntry.cell, "SEG·Figure");
});

test("a cut meeting its link lands the contest at the door — either order — kind contest, the denying span as decider, and never twice", () => {
  const link = { end1: "the observatory", label: "opened", end2: "in 1889", spans: [span("a.txt", 0, 10)] };
  const cut = { ...link, polarity: "-", decider: "never opened in 1889", spans: [span("b.txt", 5, 20)] };
  let log = notes.createNotes();
  log = notes.admit(log, [link], { witness: "a.txt#0-10~r" }).log;
  const r = notes.admit(log, [cut], { witness: "b.txt#5-20~r" });
  assert.equal(r.contests.length, 1);
  assert.equal(r.contests[0].source, "b.txt");
  const ds = notes.disputesOf(r.log);
  assert.equal(ds.size, 1);
  const [[id, list]] = [...ds.entries()];
  assert.equal(id, noteId("the observatory", "opened", "in 1889"));
  assert.equal(list[0].kind ?? list[0].disputeKind, "contest");
  assert.equal(list[0].because, "never opened in 1889");
  // the other order: the cut first, then the link
  let log2 = notes.createNotes();
  log2 = notes.admit(log2, [cut], { witness: "b.txt#5-20~r" }).log;
  assert.equal(notes.disputesOf(log2).size, 0, "a cut alone waits for its link");
  const r2 = notes.admit(log2, [link], { witness: "a.txt#0-10~r" });
  assert.equal(r2.contests.length, 1);
  assert.equal(notes.disputesOf(r2.log).size, 1);
  // a repeat is a no-op, never a second contest
  const r3 = notes.admit(r2.log, [cut], { witness: "b.txt#5-20~r" });
  assert.equal(notes.disputesOf(r3.log).size, 1);
  assert.equal([...notes.disputesOf(r3.log).values()][0].length, 1);
  // the leak assay: the link's standing is byte-identical across the acts
  const standing = (l) => JSON.stringify(notes.foldWithStanding(l).map(({ disputedBy, ...n }) => n));
  assert.equal(standing(r2.log), standing(log2.entries.length ? notes.admit(notes.createNotes(), [link], { witness: "a.txt#0-10~r" }).log : r2.log));
});

test("a source that witnesses the link cannot also cut it — the act refuses, one perspective never testifies on both sides", () => {
  const link = { end1: "x", label: "did", end2: "y", spans: [span("a.txt", 0, 5)] };
  let log = notes.createNotes();
  log = notes.admit(log, [link], { witness: "a.txt#0-5~r" }).log;
  const r = notes.admit(log, [{ ...link, polarity: "-", decider: "not", spans: [span("a.txt", 9, 14)] }], { witness: "a.txt#9-14~r" });
  assert.equal(r.contests.length, 0);
  assert.equal(notes.foldCuts(r.log).length, 1, "the cut still lands as its own note");
  assert.equal(notes.disputesOf(r.log).size, 0);
});


test("a denial through time: the link, the cut, the contest and a concession are ordered events with seqs, and a conceded cut stays in the timeline", () => {
  const notes = makeNotes();
  let log = notes.createNotes();
  const link = { end1: "the observatory", label: "opened", end2: "in 1889", spans: [span("a.txt", 0, 10)] };
  log = notes.admit(log, [link], { witness: "a.txt#0-10~r" }).log;
  const linkId = notes.noteId(link.end1, link.label, link.end2);
  const r2 = notes.admit(log, [{ ...link, polarity: "-", decider: "never opened in 1889", spans: [span("b.txt", 5, 20)] }], { witness: "b.txt#5-20~r" });
  log = r2.log;
  let t = notes.negationTimeline(log, linkId);
  assert.deepEqual(t.events.map((e) => e.act), ["link", "cut", "contest"]);
  assert.ok(t.events[0].at < t.events[1].at && t.events[1].at <= t.events[2].at, "the acts landed in the order they are told");
  assert.equal(t.events[1].because, "never opened in 1889");
  assert.deepEqual(t.standing, { link: "live", cut: "live", contest: "open" });
  assert.equal(notes.foldCuts(log)[0].heardAt, t.events[1].at, "the cut's fold row carries the seq it was heard at");
  const cutId = notes.CUT_PREFIX + linkId;
  log = notes.concede(log, cutId, { trigger: "b.txt retracted its denial" }).log;
  t = notes.negationTimeline(log, linkId);
  assert.deepEqual(t.events.map((e) => e.act), ["link", "cut", "contest", "conceded"]);
  assert.equal(t.events.at(-1).id, cutId);
  assert.equal(t.standing.cut, "conceded");
  assert.equal(notes.foldCuts(log).length, 0, "a conceded cut leaves the fold and stays in the timeline");
  assert.deepEqual(notes.negationTimeline(log, "nobody|did|nothing").standing, { link: "unheard", cut: "unheard", contest: "none" });
});
