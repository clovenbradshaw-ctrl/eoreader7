import test from "node:test";
import assert from "node:assert/strict";
import { proposeCandidates, witnessNote, corroborateLedger, distinctSources } from "./corroboration.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { witnessSlice, siblingSwap, foldTestimony } from "./testimony.js";

// real native task-log bundle — the same one hyperlexicon-stance.test.mjs uses
const tl = await import("../eoreader7/native/kernel/task-log.js");
const { cellOf } = await import("../eoreader7/native/kernel/cube.js");
const { GRAINS } = await import("../eoreader7/native/kernel/cube.js").catch(() => ({ GRAINS: null }));
const { adaptTaskLog } = await import("./consequence.js");
const door = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog: tl.createTaskLog, append: tl.append, ENTRY_KINDS: tl.ENTRY_KINDS, OPERATOR_BASIS: tl.OPERATOR_BASIS, GRAINS: (await import("../eoreader7/native/kernel/cube.js")).GRAINS }), projectTasks: tl.projectTasks, cellOf });

const testimony = { witnessSlice, siblingSwap, foldTestimony };

// a source whose bytes really state the fact, sibling included, so the
// protocol's containment walls are exercised against real text
const SOURCE = {
  ref: "page-b",
  text: "The campaign turned at the river. Marshal Kutuzov commanded the Imperial Russian Army through the retreat. " +
        "Napoleon pressed east regardless. Later histories argued about supply lines. " +
        "General Bagration held the southern flank until he fell.",
};

const seed = () => {
  let log = door.createHyperlexicon();
  const r = door.admit(log, [
    // The object carries a name on purpose: cite.js's namesIn refuses a
    // SENTENCE-INITIAL capital as identity (L2 — position is not identity),
    // so a note whose only name is its subject can never be ARMED. That is
    // pinned as its own test below; this fixture uses the real shape the
    // live cross-document run produced ("Napoleon fought against General
    // Mikhail Kutuzov"), where a mid-sentence name survives the veto.
    { subject: "Kutuzov", verb: "commanded", object: "the Imperial Russian Army", spans: [{ ref: "page-a", at: "page-a#10-40", text: "..." }] },
    { subject: "Napoleon", verb: "retreated", object: "in winter", spans: [{ ref: "page-a", at: "page-a#50-70", text: "..." }] },
  ], { witness: "page-a" });
  return r.log;
};

// scripted witnesses (the cast.js pattern applied to a model): each returns
// the readTestimony-shaped { answer, because }
const saysYesWithDecider = async (sentence) =>
  /Kutuzov/.test(sentence)
    ? { answer: "yes", because: "Marshal Kutuzov commanded the Imperial Russian Army through the retreat." }
    : { answer: "no", because: null };
const saysYesToEverything = async () => ({ answer: "yes", because: "Marshal Kutuzov commanded the Imperial Russian Army through the retreat." });
const saysNo = async () => ({ answer: "no", because: null });

test("declared budgets and injected organs are required (P3/P9)", async () => {
  assert.throws(() => proposeCandidates([], "", {}), /declared by the caller/);
  await assert.rejects(() => witnessNote("x", SOURCE, { testimony }), /injected/);
  await assert.rejects(() => corroborateLedger(door.createHyperlexicon(), door, [], { ask: saysNo, testimony }), /declared by the caller/);
});

test("a 'states' verdict lands as a NAMESPACED witness with the decider's own address in the source", async () => {
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: saysYesWithDecider, testimony, maxAsks: 10 });
  assert.equal(out.attested.length, 1, JSON.stringify(out.refusals));
  const notes = door.foldHyperlexicon(out.log);
  const kutuzov = notes.find((n) => n.subject === "Kutuzov");
  assert.ok(kutuzov.witnesses.includes("testimony:page-b"), kutuzov.witnesses.join());
  assert.equal(distinctSources(kutuzov.witnesses).size, 2, "two DISTINCT sources now vouch");
  const span = kutuzov.spans.find((s) => s.ref === "page-b");
  assert.ok(span, "the decider rides as a span");
  assert.match(span.at, /^page-b#\d+-\d+$/, "with a real address in the corroborating source's own bytes");
});

test("THE CONTROL, built to fail: a witness that affirms EVERYTHING lands nothing — the sibling arm catches it as insensitive", async () => {
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: saysYesToEverything, testimony, maxAsks: 10 });
  assert.equal(out.attested.length, 0, "an indiscriminate witness must never produce a vote");
  assert.ok(out.refusals.insensitive >= 1, JSON.stringify(out.refusals));
});

test("a refusal is nothing — the note stands exactly as it stood, and refusals are tallied typed", async () => {
  const before = door.foldHyperlexicon(seed());
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: saysNo, testimony, maxAsks: 10 });
  assert.equal(out.attested.length, 0);
  assert.deepEqual(door.foldHyperlexicon(out.log), before, "a refusal never touches the ledger");
});

test("a source never seconds its own sighting (Ladha: correlated witnesses are one perspective)", async () => {
  const sameSource = { ref: "page-a", text: SOURCE.text };
  const out = await corroborateLedger(seed(), door, [sameSource], { ask: saysYesWithDecider, testimony, maxAsks: 10 });
  assert.equal(out.attested.length, 0, "page-a already witnessed these notes mechanically");
  assert.equal(out.asks, 0, "and no model call is even spent on it");
});

test("the ask budget is a hard wall", async () => {
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: saysYesWithDecider, testimony, maxAsks: 1 });
  assert.equal(out.asks, 1);
});

test("attest refuses a bare, un-namespaced witness — a model vote must never look mechanical", () => {
  const log = seed();
  const note = door.foldHyperlexicon(log)[0];
  const r = door.attest(log, note.id, { witness: "page-b" });
  assert.equal(r.refused.type, "untyped_witness");
});

test("attest refuses an unknown note — testimony attaches to what exists", () => {
  const r = door.attest(seed(), "assert:nope", { witness: "testimony:page-b" });
  assert.equal(r.refused.type, "unknown_note");
});

test("distinctSources collapses a mechanical and a testimony vote from ONE source into one", () => {
  assert.equal(distinctSources(["page-a", "testimony:page-a"]).size, 1);
  assert.equal(distinctSources(["page-a", "testimony:page-b"]).size, 2);
});

test("DISCLOSED LIMIT: a note whose only name is its SUBJECT ships unarmed — sentence-initial capitals are position, not identity (L2)", async () => {
  // Found while building this module, and pinned rather than worked around:
  // cite.js's namesIn vetoes a sentence-initial capital, so siblingSwap has
  // no claim-side name to swap and returns null. foldTestimony then folds
  // an UNARMED "yes" into `states` — the insensitivity check never runs.
  // Consequence, stated plainly: a subject-first note with no other name is
  // corroborated on a single unchallenged yes. The live cross-document run
  // was checked against this and its two corroborations were armable
  // (each carried a mid-sentence name), so that result stands — but a
  // consumer must not assume every testimony vote was armed.
  const slice = "The campaign turned at the river. Marshal Kutuzov commanded the Imperial Russian Army through the retreat. Napoleon pressed east regardless.";
  assert.equal(siblingSwap("Kutuzov commanded the army", slice, { hint: "" }), null,
    "a subject-only name must yield no sibling — if this ever returns a swap, the limit is gone and this test should be deleted");
  // And the corrected other half: a mid-sentence name CAN arm. (My first
  // draft asserted this of "Napoleon fought against General Mikhail
  // Kutuzov" and it also returns null — for a DIFFERENT reason, the slot
  // scorer refusing a zero-score tie rather than guessing. Two distinct
  // unarmed causes, and conflating them would have made this test claim
  // something it never measured.)
  assert.notEqual(siblingSwap("Kutuzov commanded the Imperial Russian Army", slice, { hint: "" }), null,
    "a mid-sentence name IS armable — the limit is specifically sentence-initial");
});

// ── II.11: medium-blindness EARNED, not declared ────────────────────────
test("the protocol carries to a NON-TEXT medium — same code, a synthetic score", async () => {
  // A "source" is a bar of music; a "note" is an arrangement between two
  // motifs; features are motif ids, not words. No string in this test is
  // read as language by the module: the featurizer and the renderer are the
  // adapter, and they are injected. If corroboration.js ever grows a fact
  // about English, this test breaks.
  const motifSource = { ref: "bar-12", text: { motifs: ["m-fate", "m-horn", "m-answer"] } };
  const featuresOfSource = (src) => new Set(src?.motifs ?? []);
  const featuresOfNote = (n) => new Set([n.subject, n.object]);
  const render = (n) => `${n.end1 ?? n.subject}|${n.label ?? n.verb}|${n.end2 ?? n.object}`;
  const notes = [
    { id: "a", subject: "m-fate", verb: "answered-by", object: "m-answer" },
    { id: "b", subject: "m-drone", verb: "answered-by", object: "m-cadence" },
  ];
  const proposed = proposeCandidates(notes, motifSource.text, { limit: 5, featuresOfSource, featuresOfNote, render });
  assert.equal(proposed.length, 1, "only the arrangement whose motifs occur in this bar is proposable");
  assert.equal(proposed[0].note.id, "a");
  assert.ok(proposed[0].shared > 0.5, `overlap measured in motifs, not words: ${proposed[0].shared}`);
});

test("CONTROL for medium-blindness: the default featurizer is a TEXT adapter and drops what it cannot see", () => {
  // Named rather than hidden: the default is Latin-script biased by
  // construction (\p{L}{4,} — a two-character CJK word is invisible to it),
  // which is exactly why featuresOf is injectable. This test pins the
  // limitation so nobody mistakes the default for medium-blindness.
  const notes = [{ id: "z", subject: "\u5317\u4eac", verb: "\u662f", object: "\u9996\u90fd" }];
  const withDefault = proposeCandidates(notes, "\u5317\u4eac\u662f\u4e2d\u56fd\u7684\u9996\u90fd", { limit: 5 });
  assert.equal(withDefault.length, 0, "the text default cannot propose CJK — a disclosed adapter limit, not a protocol limit");
  const chars = (t) => new Set(String(t ?? "").split(""));
  const withAdapter = proposeCandidates(notes, "\u5317\u4eac\u662f\u4e2d\u56fd\u7684\u9996\u90fd", {
    limit: 5,
    featuresOfSource: chars,
    featuresOfNote: (n) => chars(`${n.subject}${n.verb}${n.object}`),
    render: (n) => `${n.subject}${n.verb}${n.object}`,
  });
  assert.equal(withAdapter.length, 1, "with a script-appropriate adapter the SAME protocol proposes it");
});
