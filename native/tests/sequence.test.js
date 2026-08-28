// The sequence type's walls. Every case here is either a declared commitment
// of the module's own ALGEBRA or a defect the admission gate actually hit —
// nothing decorative. The live failure (a pooled locus predicting the wrong
// occupant from a parallel seat) is reproduced synthetically so it can never
// silently return.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hyperedge } from "../kernel/hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances } from "../kernel/reaction.js";
import { declareSequence, readSequence, refuteLocus, predictNeighbour, locusOf, sameLocus } from "../kernel/sequence.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const DECL = declareSequence({
  relation: "next", locus: "l", occupant: "who", position: (r, i) => r.s ?? `stmt${i}`,
  predecessor: "prev", successor: "then", orderedBy: "s", until: "e",
  giver: "sequence.test.js — declared for conformance",
});

// ── declaration walls ─────────────────────────────────────────────────────
test("a declaration without a giver, a locus, or a distinct position is refused", () => {
  assert.throws(() => declareSequence({ relation: "r", locus: "l", occupant: "o", position: "p" }), /giver/);
  assert.throws(() => declareSequence({ relation: "r", occupant: "o", position: "p", giver: "g" }), /locus/);
  assert.throws(() => declareSequence({ relation: "r", locus: "l", occupant: "o", giver: "g" }), /occupant and position/);
});

// ── a return is a sequence, never a cycle ─────────────────────────────────
test("an occupant returning to a locus makes a LINE at position grain, not a loop", () => {
  const records = [
    { l: "L", who: "x", s: "10", e: "20", prev: null, then: "y" },
    { l: "L", who: "y", s: "20", e: "30", prev: "x", then: "x" },
    { l: "L", who: "x", s: "30", e: "40", prev: "y", then: null },
  ];
  const read = readSequence(records, DECL, { hyperedge });
  // x has TWO positions; every edge relates distinct position ids
  const ids = new Set(read.positions.map((p) => p.id));
  assert.equal(ids.size, 3);
  for (const e of read.edges) {
    assert.notEqual(e.participants[0].ref, e.participants[e.participants.length - 1].ref,
      "an edge from a position to itself is the person-grain cycle wearing new ids");
  }
});

// ── continuity: strict abutment only; a gap belongs to someone else ───────
test("continuity links strictly abutting standings of one occupant and never bridges a gap", () => {
  const records = [
    { l: "L", who: "x", s: "10", e: "20" },
    { l: "L", who: "x", s: "20", e: "30" },   // abuts: linked
    { l: "L", who: "x", s: "40", e: "50" },   // gap 30..40: NOT linked
  ];
  const read = readSequence(records, DECL, { hyperedge });
  const cont = read.edges.filter((e) => e.meta.bases.includes("continuity-abutment"));
  assert.equal(cont.length, 1);
  assert.match(cont[0].participants[0].ref, /\|20$/);
  assert.match(cont[0].participants[2].ref, /\|10$/);
});

// ── ambiguity is disclosed, never first-match ─────────────────────────────
test("a pointer at a multi-standing occupant with no deciding key is unresolved, not guessed", () => {
  const noKeys = declareSequence({ relation: "next", locus: "l", occupant: "who",
    position: (r, i) => `stmt${i}`, predecessor: "prev", giver: "test" });
  const records = [
    { l: "L", who: "b" }, { l: "L", who: "b" },          // two standings, no order keys
    { l: "L", who: "a", prev: "b" },
  ];
  const read = readSequence(records, noKeys, { hyperedge });
  assert.equal(read.unresolved.length, 1);
  assert.equal(read.unresolved[0].occupant, "b");
  assert.equal(read.edges.length, 0, "no edge on an unresolved pointer — an occupant-grain fallback is the conflation this type removes");
});

// ── a linked list is a sequence with no clock ─────────────────────────────
test("a declaration with no order keys still reads a linked list whole", () => {
  const listDecl = declareSequence({ relation: "next", locus: "list", occupant: "node",
    position: (r, i) => `n${i}`, predecessor: "prev", giver: "test" });
  const records = [
    { list: "L1", node: "head", prev: null },
    { list: "L1", node: "mid", prev: "head" },
    { list: "L1", node: "tail", prev: "mid" },
  ];
  const read = readSequence(records, listDecl, { hyperedge });
  assert.equal(read.edges.length, 2);
  // and the abutment affordances are honestly absent, not defaulted
  const p = predictNeighbour(read.positions, { locus: "L1", of: read.positions[1].id, side: "predecessor" });
  assert.equal(p.refused, "no_order_key");
});

// ── the locus rides the edge and the closure cannot cross it ──────────────
test("cross-locus chains are impossible by identity, with the kernel unchanged", () => {
  const records = [
    { l: "A", who: "x", s: "10", e: "20", prev: "w" },
    { l: "A", who: "y", s: "20", e: "30", prev: "x" },
    { l: "B", who: "y", s: "20", e: "30", prev: "z" },  // same occupant, other locus
  ];
  const read = readSequence(records, DECL, { hyperedge });
  assert.ok(read.edges.every((e) => locusOf(e) === "A" || locusOf(e) === "B"));
  const hl = closureAffordances({ base: "next", yields: "after", giver: "test" })
    .reduce((acc, row) => giveHyperlexiconAffordance(acc, row), createHyperlexicon());
  const sub = createReactionSubstrate({ entries: read.edges, hyperlexicon: hl, window: null });
  sub.settle({ cue: null, floor: null, maxSteps: 8 });
  for (const d of sub.derived()) {
    const ends = [d.edge.participants[0].ref, d.edge.participants[d.edge.participants.length - 1].ref];
    const loci = new Set(ends.map((r) => String(r).startsWith("pos:") ? String(r).slice(4).split("|")[0] : null).filter(Boolean));
    assert.ok(loci.size <= 1, `a derived fact crossed loci: ${ends.join(" / ")}`);
  }
});

// ── the pool refutation: the admission gate's own live failure, pinned ────
test("concurrent standings of different occupants refute the locus, and prediction refuses there", () => {
  // the synthetic twin of "United States senator": two seats, one locus name,
  // synchronized boundaries — exactly what predicted the wrong occupant live
  const records = [
    { l: "pool", who: "seatA1", s: "10", e: "20", then: "seatA2" },
    { l: "pool", who: "seatA2", s: "20", e: "30", prev: "seatA1" },
    { l: "pool", who: "seatB1", s: "10", e: "20", then: "seatB2" },   // parallel seat, same boundaries
    { l: "pool", who: "seatB2", s: "20", e: "30", prev: "seatB1" },
    { l: "single", who: "p", s: "10", e: "20", then: "q" },
    { l: "single", who: "q", s: "20", e: "30", prev: "p" },
  ];
  const read = readSequence(records, DECL, { hyperedge });
  const scan = refuteLocus(read.positions);
  assert.deepEqual([...scan.refutedLoci], ["pool"], "the overlap refutes exactly the pooled locus");
  // without the refutation, abutment in the pool is AMBIGUOUS at best and a
  // wrong occupant at worst; with it, the refusal is typed
  const q2 = read.positions.find((p) => p.occupant === "seatA2");
  const refused = predictNeighbour(read.positions, { locus: "pool", of: q2.id, side: "predecessor", refutedLoci: scan.refutedLoci });
  assert.equal(refused.refused, "locus_refuted");
  // and the clean locus still predicts
  const qq = read.positions.find((p) => p.occupant === "q");
  const ok = predictNeighbour(read.positions, { locus: "single", of: qq.id, side: "predecessor", refutedLoci: scan.refutedLoci });
  assert.equal(ok.position?.occupant, "p");
  // open-world: an unrefuted locus is not thereby proven single-file
  assert.match(scan.disclosure, /refutes nothing/);
});

test("prediction refuses a near miss — a gap is someone this material has not witnessed", () => {
  const records = [
    { l: "L", who: "a", s: "10", e: "19" },   // ends 19
    { l: "L", who: "b", s: "20", e: "30" },   // starts 20: NOT abutting
  ];
  const read = readSequence(records, DECL, { hyperedge });
  const b = read.positions.find((p) => p.occupant === "b");
  const p = predictNeighbour(read.positions, { locus: "L", of: b.id, side: "predecessor" });
  assert.equal(p.refused, "no_abutment");
});

// ── the module's own two mechanical walls ─────────────────────────────────
test("the module is domain-free and never parses time — scanned, not eyeballed", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "kernel", "sequence.js"), "utf8");
  const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const w of ["office", "tenure", "senat", "president", "wikidata", "politic", "hospital", "patient"]) {
    assert.ok(!new RegExp(w, "i").test(code), `domain word "${w}" in the CODE — the type learned a domain`);
  }
  for (const w of ["new Date", "Date.parse", "getTime", "toISOString"]) {
    assert.ok(!code.includes(w), `"${w}" found — order keys are OPAQUE; the arrow is structural, not metric`);
  }
});

test("sameLocus answers only where both edges declare a locus ordinal", () => {
  const read = readSequence([{ l: "A", who: "x", s: "1", e: "2", prev: "w" }], DECL, { hyperedge });
  const bare = hyperedge({ id: "b", relation: "next", witness: "w",
    participants: [{ ref: "p", standing: "referent" }, { ref: "q", standing: "referent" }] });
  assert.equal(sameLocus(read.edges[0], bare), false, "an edge with no declared locus never matches — absence is not agreement");
});
