// fold-at.test.mjs — locks in the one real thing this step built (holon-based
// addressing across a claim set) and confirms the three not-yet-wired layers
// stay honestly typed as gaps rather than silently becoming fake values.

import test from "node:test";
import assert from "node:assert/strict";
import { foldAt } from "./fold-at.js";
import { gfpClaim } from "../kernel/gfp-claim.js";
import { createHolograph } from "../kernel/bayes-surprise.js";

const claims = [
  gfpClaim({ ground: "/", rel: "opens", roles: { ARG0: "the-book" } }),
  gfpClaim({ ground: "/p3", rel: "introduces", roles: { ARG0: "the-general" } }),
  gfpClaim({ ground: "/p3/2", rel: "says", roles: { ARG0: "the-general", ARG1: "the-order" } }),
  gfpClaim({ ground: "/p3/2/1", rel: "names", roles: { ARG0: "the-order", ARG1: "the-target" } }),
  gfpClaim({ ground: "/p9", rel: "closes", roles: { ARG0: "the-book" } }),
];

test("here holds only claims whose ground is exactly this address", () => {
  const fold = foldAt("/p3/2", claims);
  assert.equal(fold.here.length, 1);
  assert.equal(fold.here[0].rel, "says");
});

test("ancestors holds claims whose ground CONTAINS this address, ordered outermost-first", () => {
  const fold = foldAt("/p3/2", claims);
  const rels = fold.ancestors.map((c) => c.rel);
  assert.deepEqual(rels, ["opens", "introduces"]);
});

test("descendants holds claims whose ground is CONTAINED BY this address", () => {
  const fold = foldAt("/p3/2", claims);
  assert.equal(fold.descendants.length, 1);
  assert.equal(fold.descendants[0].rel, "names");
});

test("an unrelated sibling ground (/p9) is excluded from a /p3/2 cursor's fold", () => {
  const fold = foldAt("/p3/2", claims);
  const allReturned = [...fold.here, ...fold.ancestors, ...fold.descendants];
  assert.ok(!allReturned.some((c) => c.rel === "closes"));
});

test("with no obligations supplied, atmosphere is honestly wired-but-empty, never a fabricated field", () => {
  const fold = foldAt("/p3/2", claims);
  assert.equal(fold.atmosphere.wired, true);
  assert.equal(fold.atmosphere.field, null);
  assert.equal(typeof fold.atmosphere.reason, "string");
});

test("with a real, correctly-shaped obligation, atmosphere returns interpretiveAtmosphereFactorField's real result", () => {
  const obligation = {
    id: "ob:1",
    grounds: ["/p3/2"],
    alternatives: [],
    consequences: [{ kind: "commitment" }],
    persistence: 1,
    openedAt: 0,
    constraint: null,
  };
  const fold = foldAt("/p3/2", claims, { obligations: [obligation], sequence: 1 });
  assert.equal(fold.atmosphere.wired, true);
  assert.equal(fold.atmosphere.field.obligationCount, 1);
  assert.equal(fold.atmosphere.field.model, "interpretive_constraint_factor_graph");
});

test("paradigm remains a typed gap, never a fabricated value", () => {
  const fold = foldAt("/p3/2", claims);
  assert.equal(fold.paradigm.wired, false);
  assert.equal(typeof fold.paradigm.reason, "string");
});

test("with no holo supplied, significance is a typed gap, never a fabricated value", () => {
  const fold = foldAt("/p3/2", claims);
  assert.equal(fold.significance.wired, false);
  assert.equal(typeof fold.significance.reason, "string");
});

test("with a real holograph supplied, significance returns bayes-surprise.js's real predict() result", () => {
  const holo = createHolograph({ alpha: 1, gamma: 1 });
  const fold = foldAt("/p3/2", claims, { holo });
  assert.equal(fold.significance.wired, true);
  assert.equal(typeof fold.significance.totalBits, "number");
  assert.ok(fold.significance.perSlot.length > 0);
  assert.ok(fold.significance.perSlot.every((s) => typeof s.bits === "number" && typeof s.p === "number"));
});

test("significance never mutates the caller's supplied holograph (predict, not admit)", () => {
  const holo = createHolograph({ alpha: 1, gamma: 1 });
  const admittedBefore = holo.admitted;
  foldAt("/p3/2", claims, { holo });
  assert.equal(holo.admitted, admittedBefore);
});

test("the root cursor (/) has no ancestors and every other claim as a descendant or itself", () => {
  const fold = foldAt("/", claims);
  assert.equal(fold.ancestors.length, 0);
  assert.equal(fold.here.length, 1);
  assert.equal(fold.descendants.length, claims.length - 1);
});
