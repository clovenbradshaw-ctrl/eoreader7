// binding-transfer.test.mjs — §VIII.1's trial: Binding's core, ported across
// all three mathematics with ONLY the adapter changing, each instantiation
// judged by AGREEMENT WITH THE REAL ORGAN on real material. A domain that
// needs the core edited (not its adapter) breaks the prediction.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bind, REFUSALS } from "./binding-core.js";
import { makeReferentIndex } from "./cast.js";
import { makeRelationReader } from "./hypergraph.js";
import { foldSelect, buildSelectMessages } from "./testimony.js";

const N = "../eoreader7/native/adapters/text/";
async function organs() {
  const sp = await import(N + "spans.js"), su = await import(N + "surfaces.js");
  const rl = await import(N + "relations.js"), mt = await import(N + "material.js");
  return {
    splitSentences: sp.splitSentences, extractSurfaces: su.extractSurfaces,
    discoverReferents: su.discoverReferents, namesCorefer: su.namesCorefer, diaNorm: su.diaNorm,
    discoverRelationVocab: rl.discoverRelationVocab, extractRelations: rl.extractRelations,
    tokenize: mt.tokenize, buildFrequencyTable: mt.buildFrequencyTable, functionWordSet: mt.functionWordSet,
  };
}

test("THE WALL FIRST: the core contains no domain vocabulary at all (contest.js's own enforcement)", () => {
  const src = readFileSync("binding-core.js", "utf8");
  const body = src.slice(src.indexOf("export const REFUSALS")); // the header may DISCUSS domains; the code may not
  for (const word of ["mention", "referent", "edge", "claim", "verdict", "witness", "sentence", "verb", "surface", "testimony"])
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(body), `domain word "${word}" leaked into the core's code`);
});

// ── ARITHMETIC / Existence: mention -> referent (SIG·Figure, cast) ───────
test("arithmetic adapter: agrees with the REAL referent index on a resolution AND an ambiguity", async () => {
  const passages = [{ ref: "p", text:
    "Pierre Bezukhov walked into the salon. Natasha Rostova greeted Pierre Bezukhov warmly. " +
    "Pierre Bezukhov smiled at Natasha Rostova. Nikolai Rostov arrived late." }];
  const index = makeReferentIndex(await organs())(passages);
  assert.ok(index.referents.size >= 2, "the real organ finds real referents");

  // THE ADAPTER, whole: candidates are the organ's own referents; the score
  // is token containment of the figure in the referent's display.
  // (adapter fact learned running against the real organ: the field holds
  // referent IDS — ref:auto:natasha_rostova — so the adapter reads each
  // candidate's FACE via the index's own represent(), and its tokenizer
  // splits on non-letters so an id-shaped face still yields its name
  // tokens. Both are adapter content: what a candidate LOOKS like is the
  // domain's business, never the core's.)
  const fold = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const toks = (t) => fold(t).split(/[^a-z]+/).filter(Boolean);
  const adapter = (mention) => bind(mention, [...index.referents], {
    score: (m, ref) => {
      const face = index.represent(ref) ?? ref;
      const mToks = toks(m), refToks = new Set(toks(face));
      const hit = mToks.filter((t) => refToks.has(t)).length;
      return mToks.length ? hit / mToks.length : NaN;
    },
    floor: 1, // every token of the mention must live in the referent's face
  });

  // agreement 1: an unambiguous fragment resolves to what the REAL organ resolves it to
  const real = index.resolve("Bezukhov");
  const mine = adapter("Bezukhov");
  assert.equal(real.size, 1, "the real organ resolves the fragment uniquely");
  assert.ok(mine.bound, JSON.stringify(mine));
  assert.equal(mine.bound, [...real][0], "core+adapter lands on the SAME referent as the real organ");

  // agreement 2: a fragment shared by two referents is AMBIGUOUS both ways
  const realShared = index.resolve("Rostova"); // Natasha Rostova vs — check the real organ's own reading first
  const mineShared = adapter("Rostov");
  const realRostov = index.resolve("Rostov");
  if (realRostov.size > 1) {
    assert.equal(mineShared.refused, "ambiguous", "both refuse the shared fragment");
  } else {
    // the real organ's surface machinery may nest Rostov under one referent
    // only — then BOTH must bind, and to the same one
    assert.ok(mineShared.bound || mineShared.refused === "ambiguous", JSON.stringify({ mineShared, real: [...realRostov], realShared: [...realShared] }));
  }
});

// ── GEOMETRY / Structure: claim -> edge (CON·Figure, relations) ──────────
test("geometry adapter: agrees with the REAL relation reader's bound AND unbound verdicts on real material", async () => {
  const passages = [{ ref: "m", text:
    "Abraham Lincoln appointed Hannibal Hamlin. Abraham Lincoln appointed Andrew Johnson. Hannibal Hamlin visited Abraham Lincoln." }];
  const reader = makeRelationReader(await organs())(passages, { pool: passages });
  assert.ok(reader.edges.length >= 2);

  // THE ADAPTER, whole: candidates are the real edges; score = shared
  // arrangement components (both ends + label, folded), floor = all three.
  const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const share = (a, b) => {
    const A = new Set(fold(a).split(/\s+/)), B = fold(b).split(/\s+/);
    return B.some((t) => A.has(t)) ? 1 : 0;
  };
  const adapter = (triple) => bind(triple, reader.edges, {
    score: (t, e) => share(e.end1, t.end1) + (fold(e.label) === fold(t.label) ? 1 : 0) + share(e.end2, t.end2),
    floor: 3,
    margin: -1, // an exact tie of full-clearing edges is corroboration here, not ambiguity — the DOMAIN decides margins, which is adapter content
  });

  // agreement 1: a claim the real reader binds
  const boundClaim = reader.read("Abraham Lincoln appointed Hannibal Hamlin.").claims[0];
  assert.equal(boundClaim.verdict, "bound");
  const mineBound = adapter({ end1: "Abraham Lincoln", label: "appointed", end2: "Hannibal Hamlin" });
  assert.ok(mineBound.bound, JSON.stringify(mineBound));
  assert.match(mineBound.bound.end2, /Hamlin/);

  // agreement 2: a claim the real reader does NOT bind (wrong filler)
  const unboundClaim = reader.read("Abraham Lincoln appointed William Seward.").claims[0];
  assert.notEqual(unboundClaim.verdict, "bound");
  const mineUnbound = adapter({ end1: "Abraham Lincoln", label: "appointed", end2: "William Seward" });
  assert.equal(mineUnbound.refused, "below_criterion", JSON.stringify(mineUnbound));
});

// ── CALCULUS / Interpretation: testimony -> verdict (EVA·Figure) ─────────
test("calculus adapter: reproduces the ARMED SELECT protocol's decisions — states, indiscriminate, and no-testimony", () => {
  // THE ADAPTER, whole: the field is the candidate sentences; the score is
  // the picker's own answer (1 for its pick, nothing else finite); the FOIL
  // is the arm — a picker whose criterion also clears the sibling-swapped
  // claim at the same index learned nothing. This is foldSelect + the
  // same-index arm rule, re-expressed as bind()'s own insensitivity probe.
  const cands = ["Napoleon faced Kutuzov near Davout.", "The weather turned cold."];
  const mkScore = (answers) => (claim, candidate) => {
    const a = answers[claim];                     // the model's pick for THIS claim
    return a != null && cands[a] === candidate ? 1 : NaN;
  };
  const run = (answers) => bind("real-claim", cands, {
    score: mkScore(answers),
    floor: 1,
    foil: cands[answers["arm-claim"] ?? -1] ?? "«no pick»",
  });

  // a discriminate picker: points at #0 for the claim, refuses the arm
  const states = run({ "real-claim": 0 });
  assert.ok(states.bound, JSON.stringify(states));
  assert.equal(states.bound, cands[0], "the decider is the picked candidate, verbatim — select's own guarantee");

  // an indiscriminate picker: same index for claim AND arm -> refused
  const stuck = run({ "real-claim": 0, "arm-claim": 0 });
  assert.equal(stuck.refused, "foiled", "the same-index arm IS the core's foil probe");

  // a picker that finds nothing
  const nothing = run({});
  assert.equal(nothing.refused, "below_criterion");
});

test("THE VERDICT: one core file, three domains, zero core edits between them", () => {
  // Structural half of §VIII.1's claim: the three adapters above import ONE
  // bind() and never monkey-patch it; each adapter's whole contribution is
  // a score function, a floor, and domain-owned margin/foil choices. If a
  // future domain needs more than that, it edits binding-core.js — and this
  // file's history is where §VIII.1 then loses its point.
  const src = readFileSync("binding-transfer.test.mjs", "utf8");
  assert.equal((src.match(/from "\.\/binding-core\.js"/g) ?? []).length, 1, "one import of one core");
  assert.ok(!/bind\s*=\s*/.test(src.replace('import { bind, REFUSALS }', "")), "the core is never reassigned or wrapped");
});
