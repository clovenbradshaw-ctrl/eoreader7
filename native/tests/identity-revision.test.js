import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, applyDelta } from "../kernel/fold.js";
import { hyperedge } from "../kernel/hypergraph.js";
import { deriveIdentityRevision } from "../kernel/identity.js";
import { textIdentityEvidence } from "../adapters/text/identity-evidence.js";

test("apposition opens identity support; separated co-presence attacks it", () => {
  const support = textIdentityEvidence("The hooded courier, Rowan, returned.", { witness: "w:1" });
  assert.equal(support.supports.length, 1);
  assert.equal(support.supports[0].left, "the hooded courier");
  assert.equal(support.supports[0].right, "rowan");

  const live = [{ schema: "EOIdentityAlternative@1", id: "identity:rowan:the_hooded_courier", left: "rowan", right: "the hooded courier", standing: "live_hypothesis", supportRefs: ["w:1"], attackRefs: [] }];
  const attack = textIdentityEvidence("Rowan waited at the fountain while the hooded courier crossed behind him.", { alternatives: live, witness: "w:3" });
  assert.equal(attack.attacks.length, 1);
  assert.equal(attack.attacks[0].reason, "text_separated_copresentation");
});

test("identity contradiction SEG/DEFs the prior reading and REC-canonicalizes affected relations", () => {
  const raw = hyperedge({
    id: "edge:token",
    relation: "carried",
    participants: [
      { role: "actor", standing: "unresolved_surface", ref: "occ:1", surface: "the hooded courier" },
      { role: "object", standing: "unresolved_surface", ref: "occ:2", surface: "the blue token" },
    ],
    witness: "w:edge",
  });
  const fold0 = receivedGround({ graphEntries: [raw] });

  const supportDelta = deriveIdentityRevision({
    fold: fold0,
    supports: [{ left: "the hooded courier", right: "Rowan", witness: "w:1" }],
  });
  const fold1 = applyDelta(fold0, supportDelta);
  const live = fold1.unresolvedAlternatives.find((x) => x.schema === "EOIdentityAlternative@1");
  assert.equal(live?.standing, "live_hypothesis");
  const canonical1 = fold1.graphEntries.find((x) => x.id === "canonical:edge:token");
  assert.deepEqual(canonical1.participants[0].alternatives, ["rowan", "the hooded courier"]);
  assert.ok(supportDelta.operations.some((x) => x.operator === "CON"));
  assert.ok(supportDelta.operations.some((x) => x.operator === "REC"));

  const attackDelta = deriveIdentityRevision({
    fold: fold1,
    attacks: [{ left: "the hooded courier", right: "Rowan", witness: "w:3", reason: "incompatible multiplicity" }],
  });
  const fold2 = applyDelta(fold1, attackDelta);
  assert.ok(attackDelta.operations.some((x) => x.operator === "SEG"));
  assert.ok(attackDelta.operations.some((x) => x.operator === "DEF"));
  assert.ok(attackDelta.operations.some((x) => x.operator === "REC"));

  const split = fold2.unresolvedAlternatives.find((x) => x.id === live.id);
  assert.equal(split.standing, "distinct");
  const canonical2 = fold2.graphEntries.find((x) => x.id === "canonical:edge:token");
  assert.deepEqual(canonical2.participants[0].alternatives, ["the hooded courier"]);

  // Historical witness stays raw and unchanged. Only the current canonical
  // projection changes; the earlier Fold still remembers the earlier reading.
  assert.deepEqual(fold2.graphEntries.find((x) => x.id === raw.id), raw);
  assert.equal(fold1.unresolvedAlternatives.find((x) => x.id === live.id).standing, "live_hypothesis");
  assert.deepEqual(fold1.graphEntries.find((x) => x.id === "canonical:edge:token").participants[0].alternatives, ["rowan", "the hooded courier"]);
});

test("canonicalizationFloor: single-witness support opens the alternative but does not project it; the second witness does", () => {
  const raw = hyperedge({
    id: "edge:floor",
    relation: "carried",
    participants: [
      { role: "actor", standing: "unresolved_surface", ref: "occ:1", surface: "the hooded courier" },
      { role: "object", standing: "unresolved_surface", ref: "occ:2", surface: "the blue token" },
    ],
    witness: "w:edge",
  });
  const fold0 = receivedGround({ graphEntries: [raw] });

  // First support: below the declared floor of 2 — the alternative lands
  // live on the fold, but NO canonical projection is written (single-
  // witness testimony must not rewrite the canonical past).
  const first = deriveIdentityRevision({
    fold: fold0,
    supports: [{ left: "the hooded courier", right: "Rowan", witness: "w:1" }],
    canonicalizationFloor: 2,
  });
  const fold1 = applyDelta(fold0, first);
  const live = fold1.unresolvedAlternatives.find((x) => x.schema === "EOIdentityAlternative@1");
  assert.equal(live?.standing, "live_hypothesis", "the alternative itself is not gated — only projection is");
  assert.equal(live?.supportRefs.length, 1);
  const canonicalAfterOne = fold1.graphEntries.find((x) => x.id === "canonical:edge:floor");
  assert.equal(
    canonicalAfterOne?.participants?.[0]?.alternatives?.includes("rowan") ?? false,
    false,
    "below the floor, the canonical projection must not carry the identity",
  );

  // Second, independent support: the floor is met — the SAME evidence
  // grammar now projects, and the canonical edge carries the identity.
  const second = deriveIdentityRevision({
    fold: fold1,
    supports: [{ left: "the hooded courier", right: "Rowan", witness: "w:2" }],
    canonicalizationFloor: 2,
  });
  const fold2 = applyDelta(fold1, second);
  const canonicalAfterTwo = fold2.graphEntries.find((x) => x.id === "canonical:edge:floor");
  assert.deepEqual(canonicalAfterTwo.participants[0].alternatives, ["rowan", "the hooded courier"]);
});

test("canonicalizationFloor is a declared positive integer or absent — never a fraction or a guess", () => {
  assert.throws(() => deriveIdentityRevision({ canonicalizationFloor: 0 }), /positive integer/);
  assert.throws(() => deriveIdentityRevision({ canonicalizationFloor: 1.5 }), /positive integer/);
  // Absent: byte-identical to before the option existed (the two tests
  // above this file already had pin that behavior).
  assert.doesNotThrow(() => deriveIdentityRevision({}));
});
