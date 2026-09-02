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

// ── the settling walk (SPRT shape) and the dark-room guard ──────────────
import { askValue } from "./corroboration.js";

const seedTwo = () => {
  // note K: already SETTLED (two distinct sources vouch mechanically);
  // note N: thin (one source) — the only one worth an ask.
  let log = door.createHyperlexicon();
  let r = door.admit(log, [
    { subject: "Kutuzov", verb: "commanded", object: "the Imperial Russian Army", spans: [{ ref: "page-a", at: "page-a#10-40", text: "..." }] },
  ], { witness: "page-a" });
  r = door.admit(r.log, [
    { subject: "Kutuzov", verb: "commanded", object: "the Imperial Russian Army", spans: [{ ref: "page-c", at: "page-c#5-30", text: "..." }] },
  ], { witness: "page-c" });
  r = door.admit(r.log, [
    { subject: "Bagration", verb: "held", object: "the southern flank", spans: [{ ref: "page-a", at: "page-a#80-110", text: "..." }] },
  ], { witness: "page-a" });
  return r.log;
};

test("THE DARK-ROOM CONTROL: a settled note gets ZERO asks even with budget left and the best overlap", async () => {
  // The first cut of this module ranked by overlap descending — it would
  // have spent this budget on the settled Kutuzov note (maximal overlap
  // with the source) and never asked about Bagration. If this test ever
  // fails by the settled note being asked about, the dark room is back.
  const askedAbout = [];
  const spy = async (sentence, slice) => { askedAbout.push(sentence); return saysNo(sentence, slice); };
  const out = await corroborateLedger(seedTwo(), door, [SOURCE], { ask: spy, testimony, maxAsks: 10 });
  assert.ok(askedAbout.every((s) => !/Kutuzov/.test(s)), `a settled note was asked about: ${askedAbout.join(" | ")}`);
  assert.ok(askedAbout.some((s) => /Bagration/.test(s)), "the thin note is where the calls belong");
  assert.ok(out.standings.settled.length >= 1, "and the settled note is reported settled, not silently skipped");
});

test("the walk stops ITSELF when everything reachable is settled or spent — before the budget does", async () => {
  const out = await corroborateLedger(seedTwo(), door, [SOURCE], { ask: saysNo, testimony, maxAsks: 100 });
  assert.ok(out.asks < 100, `the budget is a ceiling, not a target: ${out.asks} asks`);
});

test("askValue: contested outranks thin outranks settled/disconfirmed — the value IS expected movement", () => {
  const floor = { settleFloor: 2 };
  const thin = askValue({ id: "t", witnesses: ["page-a"] }, { contradictSources: new Map(), ...floor });
  const settled = askValue({ id: "s", witnesses: ["page-a", "testimony:page-b"] }, { contradictSources: new Map(), ...floor });
  const contested = askValue({ id: "c", witnesses: ["page-a", "testimony:page-b"] }, { contradictSources: new Map([["c", new Set(["page-d"])]]), ...floor });
  const down = askValue({ id: "d", witnesses: [] }, { contradictSources: new Map([["d", new Set(["page-d", "page-e"])]]), ...floor });
  assert.equal(settled.value, 0);
  assert.equal(settled.reason, "settled");
  assert.equal(down.value, 0);
  assert.equal(down.reason, "disconfirmed");
  assert.ok(contested.value > thin.value, "a live disagreement is the highest-information ask available");
});

test("LAMPORT FOR FREE: a contradiction drops the net, so a 'settled' note reopens and needs a third source", () => {
  // Two sources vouch (net +2, settled). One contradiction arrives: net +1,
  // contested — the walk asks again. That is 'the third source is
  // qualitatively different' falling out of the arithmetic, not a special
  // case.
  const note = { id: "k", witnesses: ["page-a", "testimony:page-c"] };
  const before = askValue(note, { contradictSources: new Map(), settleFloor: 2 });
  assert.equal(before.value, 0, "settled before the contradiction");
  const after = askValue(note, { contradictSources: new Map([["k", new Set(["page-e"])]]), settleFloor: 2 });
  assert.equal(after.reason, "contested");
  assert.ok(after.value > 0, "the contradiction bought more asks");
});

test("a spent pair is spent — a refusal never earns a re-ask of the same note against the same source", async () => {
  let calls = 0;
  const countingNo = async () => { calls += 1; return { answer: "no", because: null }; };
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: countingNo, testimony, maxAsks: 50 });
  // an ASK is one protocol run; an ARMED run spends TWO model calls (the
  // claim, then its sibling) — the budget counts protocol runs, and this
  // line pins the exchange rate so nobody reads maxAsks as a call cap
  assert.ok(calls >= out.asks && calls <= 2 * out.asks, `calls ${calls} vs asks ${out.asks}`);
  assert.ok(out.asks <= 2, `each (note, source) pair at most once: ${out.asks}`);
});

// ── the decider-company wall (P31's company law aimed at the decider) ────
test("THE LIVE SPECIMEN: a byte-verbatim decider that does not state the claim is REFUSED — the Tolstoy sentence never lands a vote again", async () => {
  // The exact shape of the first note ever through the >=2-source mouth:
  // the witness says yes and points at a sentence genuinely present in the
  // slice — about something else entirely. Byte containment passed; company
  // must not.
  // The FULL live decider — including "the Imperial Russian Army" VERBATIM
  // (end2, three shared features with the claim), which defeated the first
  // whole-claim floor. Only the per-end rule catches it: end1 (the Grande
  // Armée) appears nowhere in the decider.
  const src = {
    ref: "wp",
    text: "The Grande Armée marched east. Tolstoy used a great deal of his own experience in the Crimean War to bring vivid detail and first-hand accounts of how the Imperial Russian Army was structured. The river waited.",
  };
  // yes ONLY to the real claim (with the off-topic decider); no to the
  // swapped sibling — so the insensitivity wall passes and the COMPANY wall
  // is the one doing the refusing.
  const tolstoyDecider = async (sentence) =>
    /fought against the Imperial/.test(sentence)
      ? { answer: "yes", because: "Tolstoy used a great deal of his own experience in the Crimean War to bring vivid detail and first-hand accounts of how the Imperial Russian Army was structured." }
      : { answer: "no", because: null };
  const w = await witnessNote("The Grande Armée fought against the Imperial Russian Army", src,
    { ask: tolstoyDecider, testimony, ends: { end1: "The Grande Armée", end2: "the Imperial Russian Army" } });
  assert.equal(w.refused, "decider_unrelated", JSON.stringify(w));
  assert.equal(w.missingEnd, "end1", "the decider mentions end2 verbatim — it is end1 it is silent on");
});

test("CONTROL: a decider that genuinely keeps the claim's company still lands", async () => {
  const src = {
    ref: "wp2",
    text: "Napoleon and Prince Mikhail Kutuzov faced each other across the field. The morning was cold.",
  };
  const goodDecider = async (sentence) =>
    /fought against General/.test(sentence)
      ? { answer: "yes", because: "Napoleon and Prince Mikhail Kutuzov faced each other across the field." }
      : { answer: "no", because: null };
  const w = await witnessNote("Napoleon fought against General Mikhail Kutuzov", src,
    { ask: goodDecider, testimony, ends: { end1: "Napoleon", end2: "General Mikhail Kutuzov" } });
  assert.notEqual(w.refused, "decider_unrelated", JSON.stringify(w));
});

// ── the co-presence prefilter and slice centering (Pass 1) ──────────────
import { endsCopresentWindow } from "./corroboration.js";

test("endsCopresentWindow: finds the window where both ends' features co-occur, null when they never do", () => {
  const text = "A long preamble about weather. Marshal Kutuzov faced Napoleon at the river that morning. Unrelated epilogue.";
  const w = endsCopresentWindow(text, { end1: "Napoleon", end2: "Kutuzov" });
  assert.ok(w, "both ends co-occur — a window exists");
  assert.match(w.text, /Kutuzov/);
  assert.match(w.text, /Napoleon/);
  assert.equal(endsCopresentWindow(text, { end1: "Napoleon", end2: "Bagration" }), null, "Bagration is nowhere — no window, ever");
});

test("a structurally hopeless candidate is SKIPPED WITHOUT AN ASK — no model call is spent where the wall could never pass", async () => {
  // note ends that never co-occur in SOURCE: the walk must not ask.
  let calls = 0;
  const counting = async () => { calls += 1; return { answer: "no", because: null }; };
  let log = door.createHyperlexicon();
  const r = door.admit(log, [
    { subject: "Bagration", verb: "commanded", object: "the Danube flotilla", spans: [{ ref: "page-a", at: "page-a#1-9", text: "..." }] },
  ], { witness: "page-a" });
  const out = await corroborateLedger(r.log, door, [SOURCE], { ask: counting, testimony, maxAsks: 10 });
  assert.equal(calls, 0, "no ask spent");
  assert.equal(out.asks, 0);
  assert.equal(out.skippedNoCopresence, 1, "and the skip is tallied apart from witness refusals");
});

test("CONTROL: the prefilter must NOT shield a fabricated-but-copresent claim — the witness still judges it", async () => {
  // 'Kutuzov commanded the Imperial Russian Army' has co-present ends in
  // SOURCE, so the prefilter passes it through and the WITNESS is what
  // refuses or confirms. If the prefilter ever blocks copresent
  // candidates, recall was bought by hiding the judge.
  let calls = 0;
  const counting = async (s, sl) => { calls += 1; return saysYesWithDecider(s, sl); };
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: counting, testimony, maxAsks: 10 });
  assert.ok(calls >= 1, "a copresent candidate reached the witness");
  assert.ok(out.attested.length >= 1, "and the clean one still lands");
});

// ── the fifth turn's remaining phaseposts (REC·Figure, DEF·Pattern, CON·Pattern) ──
import { thirdSourceCandidates, WITNESS_OPERATING_POINT } from "./corroboration.js";
import { readFileSync, existsSync } from "node:fs";

test("thirdSourceCandidates: excludes sources already vouching, requires per-end feasibility, declared limit (P9)", () => {
  const note = { id: "k", subject: "Kutuzov", verb: "commanded", object: "the Russian army", witnesses: ["page-a", "testimony:page-b"] };
  const sources = [
    { ref: "page-a", text: "Kutuzov led the Russian army east." },            // already vouches (mechanical)
    { ref: "page-b", text: "Kutuzov and the Russian army withdrew." },        // already vouches (testimony)
    { ref: "page-c", text: "Kutuzov reviewed the Russian army at dawn." },    // NEW and feasible
    { ref: "page-d", text: "A treatise on beekeeping in Provence." },         // hopeless
  ];
  assert.throws(() => thirdSourceCandidates(note, sources, {}), /declared by the caller/);
  const got = thirdSourceCandidates(note, sources, { limit: 5 });
  assert.deepEqual(got.map((g) => g.source.ref), ["page-c"], "only the new, feasible source is proposed");
});

test("THE KUTÚZOV CASE: the fold makes the real novel visible to an unaccented claim — against the real bytes", { skip: !existsSync("/Users/mlacy/Documents/3.0/eoreader7/legacy-eoreader6.1/scripts/corpus/pg2600-war-and-peace.txt") }, () => {
  // The Maude translation writes Kutúzov 524 times. An unfolded feature
  // set makes the novel invisible to a claim about "Kutuzov" — the exact
  // Bezúkhov bug class, recurring at the fifth turn. This test reads the
  // REAL novel bytes; if the fold ever regresses, the third-source seeker
  // goes blind to accented sources and this fails.
  const novel = readFileSync("/Users/mlacy/Documents/3.0/eoreader7/legacy-eoreader6.1/scripts/corpus/pg2600-war-and-peace.txt", "utf8");
  const note = { id: "n", subject: "Napoleon", verb: "fought", object: "Kutuzov", witnesses: ["battle-of-borodino"] };
  const got = thirdSourceCandidates(note, [{ ref: "pg2600", text: novel }], { limit: 3 });
  assert.equal(got.length, 1, "the novel is a feasible third source despite writing Kutúzov");
  assert.match(got[0].window.text, /Kut[uú]zov/u, "and the window really contains him");
});

test("DEF·Pattern: the operating point is declared with method and date, and rides every walk report", async () => {
  assert.equal(WITNESS_OPERATING_POINT.models["gemma2:2b"].falseStates, 0);
  assert.ok(WITNESS_OPERATING_POINT.method.length > 20, "the method is named, not implied");
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: saysNo, testimony, maxAsks: 2 });
  assert.equal(out.calibration, WITNESS_OPERATING_POINT, "every run carries its calibration basis");
});

test("CON·Pattern: a contradiction lands in the contests structure with BOTH sides named", async () => {
  const contradicting = async (sentence) =>
    /Kutuzov commanded/.test(sentence)
      ? { answer: "no", because: null }
      : { answer: "yes", because: "Marshal Kutuzov commanded the Imperial Russian Army through the retreat." };
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: contradicting, testimony, maxAsks: 10 });
  if (out.contradicted.length) {
    assert.ok(out.contests.length >= 1);
    const c = out.contests[0];
    assert.ok(c.stating.length >= 1 && c.contradicting.length >= 1, "both sides of the contest are data");
  }
});

// ── the SELECT path: activate, then point (never generate) ──────────────
import { buildSelectMessages, foldSelect } from "./testimony.js";
const selectTestimony = { witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect };
// a real, tiny sentence splitter for the tests (period/!/? boundaries),
// carrying each sentence's own offset — the engine's own {text, offset}
// shape, so the candidate's address is carried forward from the cut (P5.2)
const splitSentences = (t) => {
  const out = []; let at = 0;
  for (const part of String(t).split(/(?<=[.!?])\s+/).filter(Boolean)) {
    const idx = t.indexOf(part, at);
    out.push({ text: part, offset: idx });
    at = idx + part.length;
  }
  return out;
};

test("foldSelect: a valid pick returns the candidate VERBATIM; an out-of-range or no-pick refuses", () => {
  const cands = ["Napoleon faced Kutuzov at the river.", "The weather was cold."];
  assert.deepEqual(foldSelect({ stated: "yes", sentence: 1 }, cands), { verdict: "states", because: "Napoleon faced Kutuzov at the river.", index: 1 });
  assert.equal(foldSelect({ stated: "yes", sentence: 9 }, cands).refused, "no-valid-pick");
  assert.equal(foldSelect({ stated: "no", sentence: 0 }, cands).refused, "no-testimony");
  assert.equal(foldSelect("not json", cands).refused, "unreadable");
});

test("SELECT PATH: the decider is a real source sentence BY CONSTRUCTION — the echo mode cannot occur", async () => {
  const src = { ref: "novel", text: "A preamble. Napoleon faced General Mikhail Kutuzov across the field that day. An epilogue about the weather." };
  // a scripted selector that points at the (only) both-ends sentence
  const selectAsk = async () => ({ stated: "yes", sentence: 1 });
  const w = await witnessNote("Napoleon fought against General Mikhail Kutuzov", src,
    { ask: saysNo, selectAsk, testimony: selectTestimony, splitSentences,
      ends: { end1: "Napoleon", end2: "General Mikhail Kutuzov" } });
  assert.equal(w.verdict, "states");
  assert.equal(w.via, "select");
  assert.match(w.because, /Napoleon faced General Mikhail Kutuzov/);
  assert.ok(src.text.includes(w.because), "the decider is literally in the source — containment by construction");
  assert.match(w.span.at, /^novel#\d+-\d+$/);
  const [a, b] = w.span.at.slice("novel#".length).split("-").map(Number);
  assert.equal(src.text.slice(a, b), w.because, "the carried address names exactly the decider's own bytes");
});

test("SELECT CONTROL, built to fail: a selector that picks a NON-EXISTENT index is refused, never fabricated", async () => {
  const src = { ref: "novel", text: "Napoleon faced Kutuzov at the river." };
  const selectAsk = async () => ({ stated: "yes", sentence: 7 }); // no such candidate
  const w = await witnessNote("Napoleon fought against Kutuzov", src,
    { ask: saysNo, selectAsk, testimony: selectTestimony, splitSentences,
      ends: { end1: "Napoleon", end2: "Kutuzov" } });
  assert.equal(w.refused, "no-valid-pick");
  assert.equal(w.via, "select");
});

test("a select refusal does NOT silently retry the wanderable generate path on the same slice", async () => {
  const src = { ref: "novel", text: "Napoleon faced Kutuzov at the river." };
  let generateCalls = 0;
  const ask = async () => { generateCalls += 1; return { answer: "yes", because: "Napoleon fought against Kutuzov" }; };
  const selectAsk = async () => ({ stated: "no", sentence: 0 });
  const w = await witnessNote("Napoleon fought against Kutuzov", src,
    { ask, selectAsk, testimony: selectTestimony, splitSentences,
      ends: { end1: "Napoleon", end2: "Kutuzov" } });
  assert.equal(w.refused, "no-testimony");
  assert.equal(generateCalls, 0, "select engaged, so generate was never called");
});

test("no segmenter or no selectAsk: the generate path runs unchanged (opt-in, byte-compatible)", async () => {
  const out = await corroborateLedger(seed(), door, [SOURCE], { ask: saysYesWithDecider, testimony, maxAsks: 10 });
  assert.equal(out.attested.length, 1, "generate path still lands its clean vote when select is not wired");
});

// ── statingCandidates (Pass 1/5, the select gatherer) ────────────────────
import { statingCandidates } from "./corroboration.js";
// an offset-carrying splitter, the engine's own shape ({text, offset})
const splitWithOffsets = (t) => {
  const out = []; let at = 0;
  for (const part of String(t).split(/(?<=[.!?])\s+/)) {
    const idx = t.indexOf(part, at);
    out.push({ text: part, offset: idx });
    at = idx + part.length;
  }
  return out;
};

test("statingCandidates gathers both-ends sentences across the WHOLE source, density-ranked, declared limit, OFFSETS CARRIED FROM THE CUT", () => {
  const src = "Alpha alone here. Napoleon met Kutuzov at the ford and again Napoleon pressed Kutuzov hard. Kutuzov alone. Napoleon and Kutuzov spoke once.";
  assert.throws(() => statingCandidates(src, { end1: "Napoleon", end2: "Kutuzov" }, { splitSentences: splitWithOffsets }), /declared by the caller/);
  const got = statingCandidates(src, { end1: "Napoleon", end2: "Kutuzov" }, { splitSentences: splitWithOffsets, limit: 5 });
  assert.equal(got.length, 2, "only the two both-ends sentences");
  assert.match(got[0].shown, /again Napoleon pressed Kutuzov hard/, "the denser sentence ranks first");
  // P5.2, the user's own correction ("can't we find it by knowing what we
  // prompted it with?"): the address is CARRIED FORWARD from the cut, never
  // searched for afterwards — the candidate knows where it came from.
  assert.equal(src.slice(got[0].start, got[0].end), got[0].raw, "the carried span names exactly the sentence's own bytes");
});

test("the generic-title gate is SOURCE-MEASURED, no hand-list: a word that also lives lowercase is generic", () => {
  // "general" lives lowercase in this source ("the general said"), so it is
  // generic and must not activate candidates by itself; "Kutuzov" never
  // lives lowercase, so it is the distinctive token that carries end2.
  const src = "The general said nothing that day. Napoleon praised the plan loudly. General Kutuzov met Napoleon at the ford. A general rode past the line. The general slept.";
  const got = statingCandidates(src, { end1: "Napoleon", end2: "General Kutuzov" }, { splitSentences: splitWithOffsets, limit: 8 });
  assert.equal(got.length, 1, "only the sentence with BOTH real referents");
  assert.match(got[0].shown, /General Kutúzov met Napoleon|General Kutuzov met Napoleon/);
});

// ── the BECOMING map: runnable referents of what an organ is trying to be ──
//
// A `BECOMING` test names the TARGET CAPABILITY as a runnable predicate —
// the referent of what the organ is trying to become, not what it is and
// not prose about what we think it should be. `todo: true` means it runs,
// reports, and its failure does not fail the suite; the day the organ
// becomes it, the todo flag comes off and the referent is inhabited.
// Grep `BECOMING` across the repo's tests to read the whole aspiration map.

test("BECOMING heard-clean: the generic gate must survive a case-stripped (heard-only) source", { todo: true }, () => {
  // THE HEARD RULE (user, 2026-09-01, verbatim): "the system must be able
  // to work equally well if it only heard the novel and didn't read it."
  // The shipped gate decides on capitalization — a SCRIPT-stratum signal a
  // listener does not have. On the same source with case stripped (what the
  // ear gets), the gate must still separate the title from the name — the
  // hearable signal is determiner precedence ("the general said" vs never
  // "the kutuzov"), a received closed class with a giver, unbuilt here.
  const heard = "the general said nothing that day. napoleon praised the plan loudly. general kutuzov met napoleon at the ford. a general rode past the line. the general slept. napoleon wrote to kutuzov."
  const got = statingCandidates(heard, { end1: "napoleon", end2: "general kutuzov" }, { splitSentences: splitWithOffsets, limit: 8 });
  assert.ok(got.length >= 1, "heard-only input still yields candidates");
  assert.ok(got.every((c) => c.shown.includes("kutuzov")), "every candidate carries the real referent, not the title");
});
