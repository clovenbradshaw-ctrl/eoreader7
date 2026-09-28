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
