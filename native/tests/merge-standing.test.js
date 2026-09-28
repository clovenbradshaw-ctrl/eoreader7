import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeEvidence } from "../kernel/merge-standing.js";
import { deriveIdentityRevision } from "../kernel/identity.js";
import { applyDelta, receivedGround, reconstruct } from "../kernel/fold.js";

const merges = [{ surface: "pierre bezukhov", into: "count bezukhov", witness: "cast#merge:1", basis: "name-variant coreference" }];
const standings = [
  { locus: "count bezukhov", occupant: "ref:cyril", witness: "wp#s3" },
  { locus: "count bezukhov", occupant: "ref:pierre", witness: "wp#s6425" },
];

test("the floor is declared; a merge is a support, a two-occupant locus attacks every merge that names it", () => {
  assert.throws(() => mergeEvidence({ merges, standings }), /declared/);
  const e = mergeEvidence({ merges, standings, minOccupants: 2 });
  assert.equal(e.supports.length, 1); assert.equal(e.supports[0].left, "pierre bezukhov");
  assert.equal(e.positions.length, 1); assert.deepEqual(e.positions[0].occupants, ["ref:cyril", "ref:pierre"]);
  assert.equal(e.attacks.length, 1); assert.match(e.attacks[0].reason, /position_held_by_2/);
  const one = mergeEvidence({ merges, standings: standings.slice(0, 1), minOccupants: 2 });
  assert.equal(one.attacks.length, 0, "one occupant is a description, not a position; nothing is attacked");
});

test("through the real identity organ: CON opens the merge as a hypothesis, SEG splits it to distinct, DEF lands the exclusion — on the fold, replayable", () => {
  const e = mergeEvidence({ merges, standings, minOccupants: 2 });
  const delta = deriveIdentityRevision({ fold: receivedGround(), supports: e.supports, attacks: e.attacks, giver: "test" });
  const ops = delta.operations.map((o) => `${o.operator}·${o.grain}:${o.consequence?.kind}`);
  assert.ok(ops.includes("CON·Figure:identity_hypothesis_opened"), ops.join(", "));
  assert.ok(ops.includes("SEG·Figure:identity_split"), ops.join(", "));
  assert.ok(ops.includes("DEF·Figure:identity_reading_refused"), ops.join(", "));
  const fold = applyDelta(receivedGround(), delta);
  const alt = fold.unresolvedAlternatives.find((x) => x.schema === "EOIdentityAlternative@1");
  assert.equal(alt.standing, "distinct"); assert.equal(alt.attackRefs[0], "wp#s3");
  assert.equal(reconstruct([delta]).unresolvedAlternatives.find((x) => x.schema === "EOIdentityAlternative@1").standing, "distinct");
  assert.ok(fold.exclusions.some((x) => x.kind === "identity_refused"));
});

test("a merge no position touches stays a live hypothesis", () => {
  const e = mergeEvidence({ merges: [{ surface: "natasha", into: "natasha rostova", witness: "cast#merge:2" }], standings, minOccupants: 2 });
  const fold = applyDelta(receivedGround(), deriveIdentityRevision({ fold: receivedGround(), supports: e.supports, attacks: e.attacks, giver: "test" }));
  assert.equal(fold.unresolvedAlternatives[0].standing, "live_hypothesis");
});

test("the kernel names no medium", () => {
  const src = readFileSync(new URL("../kernel/merge-standing.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  for (const w of ["sentence", "pronoun", "token", "word", "text"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `names ${w}`);
});

// ── v6 amendment: the two-occupant locus is undecided; nesting names collapse it to one_being ──
import { NESTED_NAMES, CAST_DISTINCTNESS, occupantPairKey } from "../kernel/merge-standing.js";
import { namesNest, nestedOccupants } from "../adapters/text/occupancy-testimony.js";

const wpMerges = ["pierre bezúkhov", "count cyril vladímirovich bezúkhov", "bezúkhov"].map((surface) => ({ surface, into: "ref:count_bezukhov", witness: "wp#cast" }));
const wpStandings = [
  { locus: "ref:count_bezukhov", occupant: "ref:monsieur_pierre", witness: "War and Peace#s3036" },
  { locus: "ref:count_bezukhov", occupant: "ref:pierre", witness: "War and Peace#s6425" },
];
const faces = { "ref:monsieur_pierre": "Monsieur Pierre", "ref:pierre": "Pierre", "ref:fa_cup": "FA Cup", "ref:champions_league": "Champions League", "ref:cyril": "Count Cyril Vladímirovich Bezúkhov" };

test("with no nesting evidence the collapse is the named CAST_DISTINCTNESS rule — v6's behaviour, now a rule with a giver on the record", () => {
  const e = mergeEvidence({ merges: wpMerges, standings: wpStandings, minOccupants: 2 });
  assert.equal(e.slots.length, 1); assert.equal(e.collapses[0].rule.name, CAST_DISTINCTNESS.name); assert.equal(e.collapses[0].chosen.value, "position");
  assert.equal(e.attacks.length, 3); assert.equal(e.withheld.length, 0);
});

test("the real v6 case: Monsieur Pierre and Pierre nest, the locus collapses to one_being, the attack is withheld and the occupants become a merge hypothesis", () => {
  assert.ok(namesNest("Monsieur Pierre", "Pierre")); assert.ok(namesNest("Bezúkhov", "Pierre Bezukhov")); assert.ok(!namesNest("FA Cup", "Champions League")); assert.ok(!namesNest("Pierre", "Count Cyril Vladímirovich Bezúkhov"));
  const nested = nestedOccupants(wpStandings, (id) => faces[id], occupantPairKey);
  const e = mergeEvidence({ merges: wpMerges, standings: wpStandings, minOccupants: 2, nested });
  assert.equal(e.collapses[0].rule.name, NESTED_NAMES.name); assert.equal(e.collapses[0].chosen.value, "one_being");
  assert.equal(e.attacks.length, 0); assert.equal(e.positions.length, 0); assert.equal(e.withheld.length, 1);
  const hyp = e.supports.find((s) => /one_being_under_names/.test(s.reason));
  assert.ok(hyp); assert.deepEqual([hyp.left, hyp.right].sort(), ["ref:monsieur_pierre", "ref:pierre"]); assert.equal(hyp.witness, "War and Peace#s3036");
  const fold = applyDelta(receivedGround(), deriveIdentityRevision({ fold: receivedGround(), supports: e.supports, attacks: e.attacks, giver: "test" }));
  const alts = fold.unresolvedAlternatives.filter((x) => x.schema === "EOIdentityAlternative@1");
  assert.ok(alts.every((x) => x.standing === "live_hypothesis"), "nothing split: the cast's merge and the occupants' merge are both live hypotheses");
  assert.ok(alts.some((x) => /monsieur.pierre/.test(x.left) && /pierre$/.test(x.right)), "the occupants' own alternative is opened on the fold (the organ canonicalises the ids)");
});

test("a true position still attacks under NESTED_NAMES; a mixed locus is contested and attacks nothing", () => {
  const two = [{ locus: "ref:england", occupant: "ref:fa_cup" }, { locus: "ref:england", occupant: "ref:champions_league" }];
  const e = mergeEvidence({ merges: [{ surface: "england", into: "ref:england" }], standings: two, minOccupants: 2, nested: nestedOccupants(two, (id) => faces[id], occupantPairKey) });
  assert.equal(e.collapses[0].chosen.value, "position"); assert.equal(e.attacks.length, 1);
  const three = [...wpStandings, { locus: "ref:count_bezukhov", occupant: "ref:cyril", witness: "wp#s1" }];
  const m = mergeEvidence({ merges: wpMerges, standings: three, minOccupants: 2, nested: nestedOccupants(three, (id) => faces[id], occupantPairKey) });
  assert.equal(m.collapses[0].verdict, "contested"); assert.equal(m.attacks.length, 0); assert.equal(m.withheld[0].verdict, "contested");
  assert.ok(!m.supports.some((s) => /one_being_under_names/.test(s.reason)), "a contested locus proposes no merge either");
});
