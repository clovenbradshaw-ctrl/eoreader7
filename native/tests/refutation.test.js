import test from "node:test";
import assert from "node:assert/strict";
import { hyperedge } from "../kernel/hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance, admitHyperlexiconCandidates } from "../kernel/hyperlexicon.js";
import { refuteRelation, auditChemistry, vetoedPairs } from "../kernel/refutation.js";
import { createReactionSubstrate, closureAffordances } from "../kernel/reaction.js";

// The fixtures are the ones the-fold's falsification probe earned this
// organ with (eval/results/falsification-RESULTS.md) — carried into the
// kernel as real edges so the finding is pinned where the mechanism lives.

const edge = (n, from, rel, to) => hyperedge({
  id: `e${n}`, relation: rel,
  participants: [{ ref: from, standing: "referent" }, { ref: to, standing: "referent" }],
  witness: `text:${n}`,
});

// Structurally identical by construction, opposite in ground truth.
const SUCCESSION = [
  edge(1, "johnson", "replaces", "hamlin"),
  edge(2, "colfax", "replaces", "johnson"),
  edge(3, "wilson", "replaces", "colfax"),
  edge(4, "wheeler", "replaces", "wilson"),
];
const DOMINANCE = [
  edge(1, "alvarez", "defeated", "brennan"),
  edge(2, "brennan", "defeated", "castellan"),
  edge(3, "castellan", "defeated", "dunmore"),
  edge(4, "dunmore", "defeated", "esterhazy"),
];
const CYCLIC = [
  edge(1, "alvarez", "defeated", "brennan"),
  edge(2, "brennan", "defeated", "castellan"),
  edge(3, "castellan", "defeated", "alvarez"),
];
const TENURE = [
  edge(1, "hamlin", "seat", "fessenden"),
  edge(2, "hamlin", "seat", "morrill"),
  edge(3, "lot", "seat", "hamlin"),
];

const CLOSURE = closureAffordances({ base: "replaces", yields: "after", giver: "test:succession" });
const givenAll = (rows) => rows.reduce((hl, row) => giveHyperlexiconAffordance(hl, row), createHyperlexicon());

// ── the finding this organ exists because of ──────────────────────────────

test("THE TWIN TEST: structurally identical chains, opposite truth — neither is refuted, and the scan says so rather than clearing them", () => {
  const sound = refuteRelation(SUCCESSION, "replaces");
  const unsound = refuteRelation(DOMINANCE, "defeated");

  // Identical structure, identical verdict — the scan cannot discriminate.
  assert.equal(sound.examined, unsound.examined);
  assert.equal(sound.refuted, false);
  assert.equal(unsound.refuted, false);

  // ...and neither result is phrased as a licence. This is the wall: a
  // caller reading `refuted: false` as "sound" is making the error the
  // probe was run to prevent, so the disclosure says so on every result.
  for (const scan of [sound, unsound]) {
    assert.match(scan.disclosure, /open-world absence is not refutation and this is not a licence/);
    assert.equal(scan.power, "sufficient");
  }
});

test("a cycle IS refutation — the one counterexample positive-only material can state", () => {
  const scan = refuteRelation(CYCLIC, "defeated");
  assert.equal(scan.refuted, true);
  assert.deepEqual(scan.reasons, ["cycle"]);
  assert.equal(scan.cycles.present, true);
  assert.ok(scan.cycles.examples[0].length >= 3);
  assert.match(scan.disclosure, /a positive counterexample was found/);
});

test("a uniqueness violation IS refutation — the real tenure bug, with its evidence", () => {
  // uniqueness is DECLARED here: immediate succession in one office is 1:1.
  const scan = refuteRelation(TENURE, "seat", { expectUnique: true });
  assert.equal(scan.refuted, true);
  assert.deepEqual(scan.reasons, ["uniqueness"]);
  const v = scan.uniqueness.violations.find((x) => x.referent === "hamlin" && x.side === "functional");
  assert.ok(v, "hamlin stands at the first end twice");
  // copied before sorting: the organ freezes its own evidence, correctly
  assert.deepEqual([...v.partners].sort(), ["fessenden", "morrill"]);
  assert.ok(v.edgeRefs.length >= 2, "the refutation carries the edges that establish it");
});

test("a TRANSITIVE product is never refuted on uniqueness — many-to-many is what transitivity means", () => {
  // The regression for a real bug this organ shipped with for one run: the
  // derived closure `after` was reported refuted because Colfax is after
  // BOTH Hamlin and Breckinridge. That is the closure being correct, and a
  // check applied where its precondition does not hold refutes nothing.
  const closure = [
    edge(1, "colfax", "after", "johnson"),
    edge(2, "colfax", "after", "hamlin"),
    edge(3, "johnson", "after", "hamlin"),
  ];
  const undeclared = refuteRelation(closure, "after");
  assert.equal(undeclared.refuted, false, "a many-to-many product is not a contradiction");
  assert.equal(undeclared.uniqueness.checked, false);
  assert.match(undeclared.uniqueness.why, /not declared 1:1/);

  // ...and the closure's own affordance never declares the product as the
  // adjacency side, so an audit reaches the same answer through the table.
  const chemistry = givenAll(closureAffordances({ base: "replaces", yields: "after", giver: "g" }));
  assert.equal(auditChemistry(closure, chemistry).some((r) => r.refuted), false);

  // A cycle in the product IS still refutation — nothing is after itself.
  const cyclic = [...closure, edge(4, "hamlin", "after", "colfax")];
  assert.equal(refuteRelation(cyclic, "after").refuted, true);
});

// ── P41: the absence of a refusal is not a check ──────────────────────────

test("a scan that COULD NOT refute reports insufficient power, never 'unrefuted'", () => {
  const single = refuteRelation([edge(1, "a", "replaces", "b")], "replaces");
  assert.equal(single.examined, 1);
  assert.equal(single.power, "insufficient");
  assert.equal(single.refuted, false);
  assert.match(single.powerDetail, /neither a uniqueness violation nor a cycle is structurally expressible/);

  const none = refuteRelation(SUCCESSION, "never-appears");
  assert.equal(none.examined, 0);
  assert.equal(none.power, "insufficient");
});

test("edges with unresolved ends are counted, never silently dropped", () => {
  const half = hyperedge({
    id: "e9", relation: "replaces",
    participants: [{ ref: "a", standing: "referent" }, { ref: "occ:1", standing: "unresolved_surface" }],
    witness: "text:9",
  });
  const scan = refuteRelation([...SUCCESSION, half], "replaces", { expectUnique: true });
  assert.equal(scan.ofEdges, 5);
  assert.equal(scan.examined, 4);
  assert.equal(scan.unresolved, 1);
});

// ── the audit: given chemistry against what the material says ─────────────

test("auditChemistry examines only GIVEN affordances — a candidate licenses nothing, so there is nothing to withdraw", () => {
  const nominated = admitHyperlexiconCandidates(createHyperlexicon(), [
    { left: "defeated", right: "defeated", meta: { yields: "beat-transitively" } },
  ]);
  assert.equal(auditChemistry(CYCLIC, nominated).length, 0);

  const given = givenAll([{ left: "defeated", right: "defeated", giver: "test:someone", witnesses: [], meta: { yields: "after", adjacency: "defeated" } }]);
  const audit = auditChemistry(CYCLIC, given);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].refuted, true);
  assert.equal(audit[0].giver, "test:someone");
  assert.ok(audit[0].refutedBy[0].cycles.present, "the audit carries the scan whole, so a caller concedes on evidence");
});

test("an audit over material too thin to refute discloses partial power rather than passing", () => {
  const given = givenAll([{ left: "replaces", right: "replaces", giver: "g", witnesses: [], meta: { yields: "after", adjacency: "replaces" } }]);
  const audit = auditChemistry([edge(1, "a", "replaces", "b")], given);
  assert.equal(audit[0].refuted, false);
  assert.equal(audit[0].power, "partial");
});

// ── the veto, wired into a real settle ────────────────────────────────────

test("a vetoed pair never fires, and is reported apart from a merely unlicensed one", () => {
  const chemistry = givenAll([
    ...CLOSURE,
    { left: "defeated", right: "defeated", giver: "test:wrong", witnesses: [], meta: { yields: "beat-after", adjacency: "defeated" } },
  ]);
  const entries = [...SUCCESSION, ...CYCLIC.map((e) => hyperedge({ ...e, id: `c-${e.id}` }))];
  const substrate = createReactionSubstrate({ entries, hyperlexicon: chemistry, window: null });

  const audit = auditChemistry(entries, chemistry);
  const veto = vetoedPairs(audit);
  assert.ok(veto.some((p) => p.left === "defeated"), "the cyclic relation is vetoed");
  assert.ok(!veto.some((p) => p.left === "replaces"), "succession is not");

  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 8, veto });
  assert.ok(settled.derived.length > 0, "unrefuted chemistry still fires");
  assert.ok(settled.derived.every((d) => d.relation.startsWith("after")), "nothing derived under the refuted affordance");

  // withheld (nobody vouched) and vetoed (somebody vouched and was refuted)
  // are different facts and must not collapse into one bucket.
  assert.ok(settled.vetoed.some((v) => v.left === "defeated" && v.chains > 0));
  assert.ok(settled.vetoed.every((v) => v.reasons.includes("cycle")));
  assert.ok(!settled.withheld.some((w) => w.left === "defeated"), "a vetoed pair is not also reported as unlicensed");
});

test("no veto supplied → byte-identical to before: the veto is opt-in, never a silent new refusal", () => {
  const chemistry = givenAll(CLOSURE);
  const a = createReactionSubstrate({ entries: SUCCESSION, hyperlexicon: chemistry, window: null }).settle({ cue: null, floor: null, maxSteps: 8 });
  const b = createReactionSubstrate({ entries: SUCCESSION, hyperlexicon: chemistry, window: null }).settle({ cue: null, floor: null, maxSteps: 8, veto: [] });
  assert.deepEqual(a.derived.map((d) => `${d.from} ${d.to}`).sort(), b.derived.map((d) => `${d.from} ${d.to}`).sort());
  assert.equal(a.vetoed.length, 0);
});

// ── continuous concession: the corpus grows and takes a licence back ──────

test("PRUNING, end to end: a licence sound at four facts is refuted at five, and the concession reaches its own products", () => {
  const chemistry = givenAll(CLOSURE);
  const substrate = createReactionSubstrate({ entries: SUCCESSION, hyperlexicon: chemistry, window: null });

  // Round 1 — nothing refutes it, real facts derive.
  const first = substrate.settle({ cue: null, floor: null, maxSteps: 8, veto: vetoedPairs(auditChemistry(substrate.edges(), chemistry)) });
  assert.ok(first.derived.length >= 3);
  const produced = substrate.derivedUnder({ giver: "test:succession" });
  assert.equal(produced.length, first.derived.length, "every fact traces to the affordance that produced it");

  // Round 2 — one more fact arrives and closes a cycle: the SAME licence,
  // sound a moment ago, is now refuted by the material itself.
  substrate.admit([edge(9, "hamlin", "replaces", "wheeler")]);
  const audit = auditChemistry(substrate.edges(), chemistry);
  const row = audit.find((r) => r.left === "replaces" && r.right === "replaces");
  assert.equal(row.refuted, true, "the grown corpus refutes what the smaller one could not");
  assert.ok(row.refutedBy[0].cycles.present);

  // The concession reaches its products: they are findable, by giver, from
  // the affordance alone — a re-zero that could not name what it re-zeroes
  // would be a version bump wearing an operator's name.
  const toWithdraw = substrate.derivedUnder({ giver: "test:succession" });
  assert.ok(toWithdraw.length > 0);
  for (const fact of toWithdraw) assert.equal(fact.edge.meta.affordance.giver, "test:succession");

  // And the veto stops any FURTHER derivation under it.
  const after = substrate.settle({ cue: null, floor: null, maxSteps: 8, veto: vetoedPairs(audit) });
  assert.ok(after.vetoed.some((v) => v.left === "replaces"), "the refuted licence is now vetoed at the door");
});
