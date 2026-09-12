import test from "node:test";
import assert from "node:assert/strict";
import { hyperedge } from "../kernel/hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates } from "../kernel/hyperlexicon.js";
import { createDeclarationLog, proposeCandidate, promote, foldDeclarations } from "../interpretation/declarations.js";
import { deriveExperiencePrior } from "../kernel/experience-priors.js";
import {
  affordancesFromDeclarations,
  refutedAffordances,
  closureAffordances,
  nominateFromExperience,
  createReactionSubstrate,
} from "../kernel/reaction.js";

// ── fixtures: a real succession chain, in the ledger's own shapes ──────────
//
// Five holders, four adjacent facts: e replaced d, d replaced c, c replaced
// b, b replaced a. Every edge is a REAL EOHyperedge@1 built by the kernel's
// own constructor, referent-standing at both ends, witness named.
//
// ORDERED NEWEST-FIRST, deliberately: relation-composition.js's chainOf
// respects reading order (a chain's left edge must not come after its right
// edge in the material), so a succession stated oldest-first never chains
// raw-on-raw — the first cut of this fixture proved that by deriving
// nothing at all. Succession prose genuinely reads this way ("E replaced D.
// D had replaced C. …"), and derived edges carry no sequence position, so
// the closure is order-free once the first products exist.

const replaces = (n, from, to) => hyperedge({
  id: `edge:${n}`,
  relation: "replaces",
  participants: [
    { ref: from, standing: "referent", role: null },
    { ref: to, standing: "referent", role: null },
  ],
  witness: `text:${n}`,
  scope: { sequencePosition: n },
});

const CHAIN = [
  replaces(1, "e", "d"),
  replaces(2, "d", "c"),
  replaces(3, "c", "b"),
  replaces(4, "b", "a"),
];

const CLOSURE = closureAffordances({ base: "replaces", yields: "after", giver: "test:succession-semantics" });
const givenAll = (rows) => rows.reduce((hl, row) => giveHyperlexiconAffordance(hl, row), createHyperlexicon());

// Non-adjacent ordered pairs of a 5-chain: C(5,2) − 4 adjacents = 6.
const EXPECTED_CLOSURE = new Set(["e a", "e b", "e c", "d a", "d b", "c a"]);
const factSet = (derived) => new Set(derived.map((d) => `${d.from} ${d.to}`));

// ── chemistry declarations ─────────────────────────────────────────────────

test("closureAffordances: four rows, one giver, all yielding the closure — and refused without a giver", () => {
  assert.equal(CLOSURE.length, 4);
  for (const row of CLOSURE) {
    assert.equal(row.giver, "test:succession-semantics");
    assert.equal(row.meta.yields, "after");
  }
  const pairs = new Set(CLOSURE.map((r) => `${r.left}|${r.right}`));
  assert.deepEqual([...pairs].sort(), ["after|after", "after|replaces", "replaces|after", "replaces|replaces"]);
  assert.throws(() => closureAffordances({ base: "replaces", yields: "after" }), /giver/);
});

test("affordancesFromDeclarations: GIVEN transitive yields; candidates and functional yield nothing (the grain law)", () => {
  let log = createDeclarationLog();
  const t = proposeCandidate(log, { kind: "transitive", rel: "before", acquisition: { subjects: 5 }, source: "test" });
  log = t.log;
  const f = proposeCandidate(log, { kind: "functional", rel: "capital_of", acquisition: { subjects: 3 }, source: "test" });
  log = f.log;

  // Candidate tier alone: no chemistry at all.
  assert.equal(affordancesFromDeclarations(foldDeclarations(log)).length, 0);

  // Promote the transitive one — a named giver, the only route to a licence.
  const promoted = promote(log, t.id, { giver: "test:temporal-order" });
  assert.equal(promoted.ok, true);
  log = promoted.log;
  const fGiven = promote(log, f.id, { giver: "test:geography" });
  log = fGiven.log;

  const rows = affordancesFromDeclarations(foldDeclarations(log));
  assert.equal(rows.length, 1); // functional, though GIVEN, licenses no composition
  assert.deepEqual({ left: rows[0].left, right: rows[0].right, yields: rows[0].meta.yields, giver: rows[0].giver },
    { left: "before", right: "before", yields: "before", giver: "test:temporal-order" });
});

// ── refutedAffordances: a relation may not compose on its own contradiction ─
//
// The gap the-fold's mechanical-logic-battery.mjs TC4 measured (2026-09-10):
// step()/settle() have no notion of "this relation's own premises already
// contradict each other" — composing over a cyclic relation still derives
// a fully circular belief set. refutedAffordances is affordancesFromDeclarations
// forced through refutation.js's afterVeto first, so a relation whose raw
// edges contain a positive cycle or uniqueness counterexample never becomes
// chemistry at all.

test("refutedAffordances: a cyclic relation's own declaration is dropped before it ever becomes chemistry", () => {
  const cyclic = [
    hyperedge({ id: "c1", relation: "older_than", participants: [{ ref: "alice", standing: "referent" }, { ref: "bob", standing: "referent" }], witness: "text:c1" }),
    hyperedge({ id: "c2", relation: "older_than", participants: [{ ref: "bob", standing: "referent" }, { ref: "carol", standing: "referent" }], witness: "text:c2" }),
    hyperedge({ id: "c3", relation: "older_than", participants: [{ ref: "carol", standing: "referent" }, { ref: "alice", standing: "referent" }], witness: "text:c3" }),
  ];
  const fold = { given: [{ rel: "older_than", declKind: "transitive", giver: "test:cycle" }] };
  const guarded = refutedAffordances(fold, cyclic, { expectUnique: true });
  assert.equal(guarded.affordances.length, 0, "a refuted relation licenses no composition at all");
  assert.deepEqual(guarded.survivors, []);
  assert.equal(guarded.vetoed.length, 1);
  assert.equal(guarded.vetoed[0].key, "older_than");
  assert.deepEqual(guarded.vetoed[0].reasons, ["cycle"]);

  // Composing WITHOUT the guard, over the identical cyclic premises, is the
  // regression this test exists to prevent silently reappearing: it still
  // derives a circular belief set, because step() itself has no veto by
  // default.
  const unguarded = createReactionSubstrate({ entries: cyclic, hyperlexicon: givenAll(affordancesFromDeclarations(fold)), window: null });
  const unguardedResult = unguarded.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.ok(unguardedResult.derived.length > 0, "confirms the unguarded path is genuinely unsafe — if this ever derives nothing, the regression this test guards against may already be fixed elsewhere and this assertion should be revisited, not silently loosened");

  // The guarded substrate, by contrast, derives nothing over the same cycle.
  const guardedSubstrate = createReactionSubstrate({ entries: cyclic, hyperlexicon: givenAll(guarded.affordances), window: null });
  const guardedResult = guardedSubstrate.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.equal(guardedResult.derived.length, 0, "the guarded path composes nothing over a relation its own premises refute");
});

test("refutedAffordances: a clean, non-contradictory relation composes exactly as affordancesFromDeclarations alone would", () => {
  const fold = { given: [{ rel: "replaces", declKind: "composes", yields: "after", giver: "test:succession-semantics" }] };
  const guarded = refutedAffordances(fold, CHAIN);
  assert.deepEqual(guarded.survivors, ["replaces"]);
  assert.equal(guarded.vetoed.length, 0);
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(guarded.affordances), window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.deepEqual(factSet(settled.derived), EXPECTED_CLOSURE);
});

test("refutedAffordances: an under-examined relation (below refutation's own power floor) survives — insufficient power is not a refutation", () => {
  const thin = [hyperedge({ id: "t1", relation: "older_than", participants: [{ ref: "alice", standing: "referent" }, { ref: "bob", standing: "referent" }], witness: "text:t1" })];
  const fold = { given: [{ rel: "older_than", declKind: "transitive", giver: "test:thin" }] };
  const guarded = refutedAffordances(fold, thin);
  assert.deepEqual(guarded.survivors, ["older_than"]);
  assert.equal(guarded.vetoed.length, 0);
});

// ── the wall: no given affordance, no derivation ───────────────────────────

test("an empty hyperlexicon derives nothing — every chain withheld with its standing", () => {
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: createHyperlexicon(), window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.equal(settled.derived.length, 0);
  assert.equal(settled.quiescent, true);
  assert.ok(settled.withheld.length >= 1);
  assert.equal(settled.withheld[0].standing, "unknown");
});

test("a CANDIDATE affordance — nominated, never given — still licenses nothing", () => {
  const nominated = admitHyperlexiconCandidates(createHyperlexicon(), [
    { left: "replaces", right: "replaces", witnesses: [["edge:2", "edge:1"]], meta: { yields: "after" } },
  ]);
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: nominated, window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.equal(settled.derived.length, 0);
  const w = settled.withheld.find((x) => x.left === "replaces" && x.right === "replaces");
  assert.equal(w.standing, "candidate");
});

// ── the control arm: full closure, provenance, dedupe ──────────────────────

test("full closure under the control arm: 6 never-stated facts, each with giver, parents and depth", () => {
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(CLOSURE), window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.equal(settled.quiescent, true);
  assert.deepEqual(factSet(settled.derived), EXPECTED_CLOSURE);
  for (const fact of settled.derived) {
    assert.equal(fact.relation, "after");
    assert.equal(fact.giver, "test:succession-semantics");
    assert.equal(fact.edge.meta.parents.length, 2);
    assert.ok(fact.depth >= 1);
  }
  // The far pair is a real multi-hop derivation with at least two paths.
  const far = settled.derived.find((d) => d.from === "e" && d.to === "a");
  assert.ok(far.depth >= 2, `e→a should be multi-hop, got depth ${far.depth}`);
  assert.ok(far.paths >= 2, `e→a should be reachable by more than one derivation path, got ${far.paths}`);
});

test("provenance closes to raw witnesses: every derived edge's parent chain bottoms out at text-witnessed edges", () => {
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(CLOSURE), window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  const byId = new Map(CHAIN.map((e) => [e.id, e]));
  for (const fact of settled.derived) byId.set(fact.edge.id, fact.edge);
  const bottomsOut = (id, seen = new Set()) => {
    assert.ok(!seen.has(id), "provenance walk must not cycle");
    seen.add(id);
    const edge = byId.get(id);
    assert.ok(edge, `parent ${id} must be findable`);
    if (!edge.meta?.derived) return assert.match(edge.witness, /^text:/);
    for (const parent of edge.meta.parents) bottomsOut(parent, seen);
  };
  for (const fact of settled.derived) bottomsOut(fact.edge.id);
});

test("a raw-witnessed fact is never re-derived — the stated witness stands", () => {
  const stated = hyperedge({
    id: "edge:stated", relation: "after",
    participants: [{ ref: "c", standing: "referent" }, { ref: "a", standing: "referent" }],
    witness: "text:9", scope: { sequencePosition: 9 },
  });
  const substrate = createReactionSubstrate({ entries: [...CHAIN, stated], hyperlexicon: givenAll(CLOSURE), window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  const keys = factSet(settled.derived);
  assert.ok(!keys.has("c a"), "after(c,a) is stated by the material — deriving it would dress a stated fact as an inference");
  assert.ok(keys.has("e c"), "other closure facts still derive");
  const already = settled.steps.reduce((sum, s) => sum + s.alreadyWitnessed, 0);
  assert.ok(already >= 1, "the refusal is counted, never silent");
});

// ── terminal chemistry: given without yields is one hop, no more ───────────

test("a given affordance without yields produces a terminal bridge fact that never chains further", () => {
  let hl = createHyperlexicon();
  hl = giveHyperlexiconAffordance(hl, { left: "replaces", right: "replaces", giver: "test:adjacency-only" });
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: hl, window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 10 });
  assert.equal(settled.derived.length, 0, "no yields, no derived edges");
  assert.equal(settled.terminal.length, 3, "three adjacent chain sites, each a terminal bridge fact");
  for (const t of settled.terminal) assert.equal(t.giver, "test:adjacency-only");
  assert.equal(settled.quiescent, true);
});

// ── the physics: presence gates the reaction, the front propagates ─────────

test("an uncued substrate reasons nothing: no presence, no reaction", () => {
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(CLOSURE), window: 8 });
  const settled = substrate.settle({ cue: [], floor: 0.05, maxSteps: 10 });
  assert.equal(settled.derived.length, 0);
  assert.equal(settled.quiescent, true);
});

test("a cue in the middle settles to the full closure, one bridge-hop per step — the front is visible in the trace", () => {
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(CLOSURE), window: 8 });
  const settled = substrate.settle({ cue: ["c"], floor: 0.05, maxSteps: 12 });
  assert.equal(settled.quiescent, true);
  assert.deepEqual(factSet(settled.derived), EXPECTED_CLOSURE, "the cued settle reaches the same closure");
  const perStep = settled.steps.map((s) => s.derived);
  assert.ok(perStep[0] < 6, `the first pass must be local to the cue, got ${perStep[0]} of 6`);
  assert.ok(settled.steps.length > 2, "the closure takes multiple passes — reach is earned hop by hop");
  // Products lit their ends: the chain's far ends are now present.
  const present = new Set(substrate.present(0.01).Entity.map((e) => e.id));
  assert.ok(present.has("a") && present.has("e"), "the reaction front reached both ends of the chain");
});

test("maxSteps caps a settling honestly: quiescent false, partial closure disclosed", () => {
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(CLOSURE), window: 8 });
  const settled = substrate.settle({ cue: ["c"], floor: 0.05, maxSteps: 1 });
  assert.equal(settled.quiescent, false);
  assert.ok(settled.derived.length < 6);
});

test("declared walls: window, cue, floor and maxSteps are never defaulted", () => {
  assert.throws(() => createReactionSubstrate({ entries: CHAIN }), /window is declared/);
  const substrate = createReactionSubstrate({ entries: CHAIN, hyperlexicon: givenAll(CLOSURE), window: null });
  assert.throws(() => substrate.settle({ floor: 0.05, maxSteps: 5 }), /cue is declared/);
  assert.throws(() => substrate.settle({ cue: ["c"], floor: 0.05 }), /maxSteps/);
  assert.throws(() => substrate.step({}), /floor is declared/);
});

// ── priors nominate; nomination is not reasoning permission ────────────────

const readingWith = (source, relations) => ({
  source,
  reading: {
    fold: {
      graphEntries: relations.map((rel, i) => hyperedge({
        id: `${source}:edge:${i}`, relation: rel,
        participants: [{ ref: `${source}:s${i}`, standing: "referent" }, { ref: `${source}:o${i}`, standing: "referent" }],
        witness: `text:${i}`,
      })),
      transformationObjects: [],
    },
    terrainState: {},
  },
});

test("nominateFromExperience: recurrent cross-work memory gates candidates, annotations carried, non-memories dropped", () => {
  const prior = deriveExperiencePrior([
    readingWith("work:one", ["advised", "replaced"]),
    readingWith("work:two", ["advised"]),
  ], { giver: "test:reader" });
  // "advised" is a 2-work memory; "replaced" was met once — not recurrent.
  const candidates = [
    { left: "advised", right: "replaced", meta: { support: 3 } },
    { left: "replaced", right: "married", meta: { support: 5 } },
  ];
  const gated = nominateFromExperience([prior], candidates);
  assert.equal(gated.length, 1);
  assert.equal(gated[0].left, "advised");
  assert.equal(gated[0].meta.rememberedLeft, true);
  assert.equal(gated[0].meta.rememberedRight, false);
  assert.equal(gated[0].meta.support, 3, "the candidate's own meta survives the gate");
  assert.ok(gated[0].meta.workSupport >= 2);

  const strict = nominateFromExperience([prior], candidates, { requireBoth: true });
  assert.equal(strict.length, 0, "requireBoth demands both sides be cross-work memories");
});
