// P165 — the merge record reaches the log, as testimony, not inference.
//
// discoverReferents detects when two surface clusters name one being and
// records {kept, folded, witness}. The perceiver's cache read `events` and
// `gaps` and never `merges`, so the record was computed and discarded, and
// the projection's own claim — "a node at cursor 500 may be two nodes at
// cursor 200, and scrubbing the cursor SHOWS that" — was left to whoever
// compared two node lists. the-fold/cursor.js reconstructed merges from
// dormancy plus surface capture and marked every one `inferred`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel.js";
import { projectHypergraph } from "../kernel/hypergraph-projection.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const POS = JSON.parse(fs.readFileSync(path.join(here, "../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json"), "utf8"));

// THE FIXTURE IS REAL MATERIAL, on purpose. A synthetic six-sentence fixture
// was tried first and the clustering never merged on it: discoverReferents
// assigns longest surface first, so fragments simply join the full name and
// no merge of two established clusters ever occurs. The `merges` branch fired
// 0 times on 120 KB of War and Peace for the same reason. What DOES happen on
// real material is REASSIGNMENT across refreshes — P156 found ref:auto:vasili
// and ref:auto:prince_vasili orphaned beside ref:auto:prince_vasili_kuragin
// in this exact prefix — and that is what these tests pin. The 60 KB prefix
// is the same one read-cost.mjs --identity pins, and reads deterministically.
const BOOK = "/Users/mlacy/Documents/3.0/the-fold/pg2600.txt";
const BYTES = 60000;
const POSp = POS;

// P168 (2026-09-07): the default address rule is now "birth" — a being keeps
// the id it was born with — which is exactly the stabilisation this file's
// last test said would retire it. The finding is kept reproducible: every
// test below reads under `addresses: "founder"`, the rule as it was, so the
// oscillation it pins is still on record; the final test reads under the
// default and pins its absence.
let cached = null;
async function readAll(addresses = "founder") {
  if (addresses === "founder" && cached) return cached;
  const stripped = stripContainer(fs.readFileSync(BOOK, "utf8").slice(0, BYTES));
  const encounters = textEncounters(stripped.text, { source: "file:pg2600", offset: stripped.offset });
  const reader = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POSp, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 }, addresses })],
    adapters: {
      revise: reviseTextFold,
      retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...ev]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }),
    },
  });
  const out = await reader.read(encounters);
  if (addresses === "founder") cached = out;
  return out;
}
const landed = (r) => r.log.flatMap((e) => (e?.schema === "Observation@1" ? (e.graphEntries ?? []) : [])).filter((g) => g?.schema === "EOReferentMerge@1");

test("a merge lands in the LOG as EOReferentMerge@1, carrying the surface that proved it", async () => {
  const r = await readAll();
  const merges = landed(r);
  assert.ok(merges.length >= 1, `expected at least one reassignment in the log — P156 found three ids for one being in this exact prefix`);
  for (const m of merges) {
    assert.ok(m.kept, "a merge names what was kept");
    assert.ok(m.folded.length >= 1, "and what was folded into it");
    assert.ok(typeof m.witness === "string" && m.witness.length, "TESTIMONY: the surface that proved the merge rides with it");
    assert.ok(m.id.startsWith("merge:"), "addressable, so a lineage can reach it");
  }
});

test("THE FOLDED REFERENT IS NOT DELETED — it is marked, so the past still replays", async () => {
  // The fold is upsert-only and cursor scrubbing depends on that: a cursor
  // before the merge must still show two nodes. Deleting the folded id would
  // rewrite history; marking it records the decision where it was made.
  const r = await readAll();
  const merges = (r.fold?.graphEntries ?? []).filter((g) => g?.schema === "EOReferentMerge@1");
  assert.ok(merges.length >= 1);
  const ids = new Set((r.fold?.graphEntries ?? []).filter((g) => g?.schema === "EOReferent@1").map((g) => g.id));
  for (const m of merges) for (const f of m.folded) {
    assert.ok(ids.has(f), `folded referent ${f} must still exist in the fold — marked, never deleted`);
  }
});

test("each merge lands ONCE, even though every refresh rediscovers it", async () => {
  // discoverReferents re-clusters everything on every refresh (here every
  // sentence). Without the emitted-set the same merge would land six times.
  const r = await readAll();
  const merges = landed(r);
  const keys = merges.map((m) => `${m.kept}|${[...m.folded].sort().join("+")}`);
  assert.ok(keys.length >= 1, "this test passed vacuously on zero merges once; it may not again");
  assert.equal(new Set(keys).size, keys.length, `duplicate merge records: ${keys.join(" ; ")}`);
});

test("the projection exposes merges ADDITIVELY — nodes and links are byte-identical with or without them", async () => {
  const r = await readAll();
  const g = projectHypergraph(r.log, { atSeq: null });
  assert.ok(Array.isArray(g.merges), "the projection carries the merge record");
  assert.ok(g.merges.length >= 1);
  for (const m of g.merges) { assert.ok(m.kept && m.folded.length && m.witness, "each projected merge is testimony with its witness"); }
  // The node shape the identity gate hashes is untouched: {id, surfaces, arrivals}.
  for (const n of g.nodes) assert.deepEqual(Object.keys(n).sort(), ["arrivals", "id", "surfaces"]);
});

test("BEFORE the merge, the cursor shows two beings; AFTER, the record says they are one", async () => {
  // This is the sentence the projection's own header promised and never
  // delivered: scrubbing the cursor SHOWS a merge, because the record is now
  // in the log at the seq where it was decided.
  const r = await readAll();
  const whole = projectHypergraph(r.log, { atSeq: null });
  const m = whole.merges[0];
  const firstMergeSeq = r.log.findIndex((e) => e?.schema === "Observation@1" && (e.graphEntries ?? []).some((x) => x?.schema === "EOReferentMerge@1"));
  assert.ok(firstMergeSeq > 0, "the merge is landed at a real log position");
  const before = projectHypergraph(r.log, { atSeq: firstMergeSeq });
  assert.equal(before.merges.length, 0, "at a cursor before the merge, no merge is on record");
  const after = projectHypergraph(r.log, { atSeq: firstMergeSeq + 1 });
  assert.ok(after.merges.some((x) => x.kept === m.kept), "one step past it, the record is there");
});

test("P156's inferred residue is now TESTIMONY: the orphaned fragment ids are on record as reassigned, with their witness", async () => {
  const r = await readAll();
  const merges = landed(r);
  const folded = new Set(merges.flatMap((m) => m.folded));
  // P156 reconstructed these from dormancy plus surface capture and had to
  // mark them `inferred`. They are now on record where they were decided.
  const expected = ["ref:auto:vasili", "ref:auto:prince_vasili"];
  const found = expected.filter((id) => folded.has(id));
  assert.ok(found.length >= 1, `expected at least one of ${expected.join(", ")} recorded as folded; got ${[...folded].slice(0, 6).join(", ")}`);
  for (const m of merges) assert.match(m.provenance?.basis ?? "", /reassigned on refresh|witnessed merge/, "every record says which mechanism decided it");
});

// The record can be read forward. Where it is acyclic the chain resolves;
// where it cycles, the cycle is a fact to report, never a tie to break here.
const chainsOf = (merges) => {
  const into = new Map();
  for (const m of merges) for (const f of m.folded) into.set(f, m.kept);
  const resolve = (id) => { const seen = []; let at = id; while (into.has(at) && !seen.includes(at)) { seen.push(at); at = into.get(at); } return { end: at, cyclic: into.has(at) && seen.includes(at), path: [...seen, at] }; };
  return { into, resolve };
};

test("an ACYCLIC reassignment chain resolves to the fuller name", async () => {
  const r = await readAll();
  const { resolve } = chainsOf(landed(r));
  // Measured on this exact prefix: pierre -> monsieur_pierre, monsieur ->
  // monsieur_pierre, emperor -> emperor_alexander. Each is one honest hop
  // to a fuller name and never comes back.
  for (const [from, to] of [["ref:auto:pierre", "ref:auto:monsieur_pierre"], ["ref:auto:monsieur", "ref:auto:monsieur_pierre"], ["ref:auto:emperor", "ref:auto:emperor_alexander"]]) {
    const c = resolve(from);
    assert.equal(c.cyclic, false, `${from} must not cycle: ${c.path.join(" -> ")}`);
    assert.equal(c.end, to, `${from} resolves to ${to}, got ${c.end}`);
  }
});

test("THE FINDING THE RECORD MAKES VISIBLE: the clustering OSCILLATES, and a cycle is reported, not resolved by fiat", async () => {
  // vasili -> prince_vasili at one refresh, prince_vasili -> vasili at the
  // next; helene <-> princess_helene the same. assignmentOrder's tiebreaks
  // (sentences, then mentions) shift as counts accrue, so which surface is
  // "maximal" alternates. The old code could not show this — the record was
  // discarded — and the projection's header promised that scrubbing the
  // cursor SHOWS identity change. What it shows is instability. Breaking the
  // tie here (last wins, longest wins) would be a hand rule wearing a
  // verdict; the honest output is the cycle itself, witnessed at both ends.
  const r = await readAll();
  const merges = landed(r);
  const { resolve } = chainsOf(merges);
  const cyclic = ["ref:auto:vasili", "ref:auto:helene"].map((id) => ({ id, ...resolve(id) })).filter((c) => c.cyclic);
  assert.ok(cyclic.length >= 1, "at least one oscillation is expected on this prefix; if this ever passes with zero, the clustering has been stabilised and this test should be retired with that finding recorded");
  for (const c of cyclic) {
    // Both directions are on record, each with its own witness and encounter.
    const legs = merges.filter((m) => c.path.includes(m.kept) && m.folded.some((f) => c.path.includes(f)));
    assert.ok(legs.length >= 2, `an oscillation has at least two recorded legs: ${c.path.join(" -> ")}`);
    assert.ok(new Set(legs.map((m) => m.encounterRef)).size >= 2, "decided at different encounters, not twice at one");
    assert.ok(legs.every((m) => m.witness), "each leg carries the surface that decided it");
  }
});

test("P168 — UNDER THE DEFAULT (addresses: \"birth\") the oscillation is gone: no address flips back, the merges that remain are witnessed, and the partition of surfaces is the founder rule's", async () => {
  const founder = await readAll("founder");
  const birth = await readAll("birth");
  const merges = (r) => landed(r);
  const { resolve } = chainsOf(merges(birth));
  for (const id of ["ref:auto:vasili", "ref:auto:helene", "ref:auto:prince_vasili", "ref:auto:princess_helene"]) assert.equal(resolve(id).cyclic, false, `${id} does not oscillate under the birth rule`);
  const surfacesByBeing = (r) => r.fold.graphEntries.filter((g) => g.schema === "EOReferent@1").map((x) => [...x.surfaces].sort().join("|")).sort();
  // Every being the founder rule ends with exists under the birth rule with the same surfaces — the partition is the same; only addresses differ.
  const b = new Set(surfacesByBeing(birth));
  const liveFounder = (() => { const folded = new Set(merges(founder).flatMap((m) => m.folded)); return founder.fold.graphEntries.filter((g) => g.schema === "EOReferent@1" && !folded.has(g.id)); })();
  for (const ref of liveFounder) assert.ok(b.has([...ref.surfaces].sort().join("|")) || ref.surfaces.every((s) => birth.fold.graphEntries.some((g) => g.schema === "EOReferent@1" && g.surfaces.includes(s))), `the founder rule's being ${ref.id} (${ref.surfaces.join(", ")}) has its surfaces under the birth rule`);
  assert.ok(merges(birth).length < merges(founder).length, `fewer records: birth ${merges(birth).length}, founder ${merges(founder).length}`);
});
