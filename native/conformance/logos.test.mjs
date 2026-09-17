// native/conformance/logos.test.mjs — a conclusion is warranted only if it
// survives examination, never merely because it was stated. Mirrors
// ethos.test.mjs's own bearing-wall discipline for the second leg.

import { test } from "node:test";
import assert from "node:assert";

import { hyperedge } from "../kernel/hypergraph.js";
import { logosWarrant, requireWarrant, LOGOS_VERDICTS } from "../organs/logos.js";

const edge = (n, from, rel, to) => hyperedge({
  id: `l${n}`, relation: rel,
  participants: [{ ref: from, standing: "referent" }, { ref: to, standing: "referent" }],
  witness: `text:${n}`,
});

test("relation is declared, never inferred — mirrors refuteRelation's own wall", () => {
  assert.throws(() => logosWarrant({ edges: [] }), /the relation to examine is declared/);
});

test("an unrefuted, sufficiently-examined relation is warranted", () => {
  const edges = [edge(1, "a", "childOf", "p"), edge(2, "b", "childOf", "p")];
  const w = logosWarrant({ edges, relation: "childOf" });
  assert.equal(w.verdict, "unrefuted");
  assert.equal(w.warranted, true);
  assert.strictEqual(requireWarrant(w), w);
});

test("a functional relation violated by two distinct partners at one end is refuted", () => {
  const edges = [edge(1, "p", "presidentOf", "nation"), edge(2, "q", "presidentOf", "nation")];
  const w = logosWarrant({ edges, relation: "presidentOf", expectUnique: true });
  assert.equal(w.verdict, "refuted");
  assert.equal(w.warranted, false);
  assert.throws(() => requireWarrant(w), /examined and REFUTED/);
});

test("fewer than two resolved edges is insufficient, never silently unrefuted", () => {
  const w = logosWarrant({ edges: [edge(1, "a", "childOf", "p")], relation: "childOf" });
  assert.equal(w.verdict, "insufficient");
  assert.equal(w.warranted, false);
  // insufficient is a real, honest gap — requireWarrant does not refuse it,
  // it merely does not certify it as warranted either
  assert.strictEqual(requireWarrant(w), w);
});

test("THE BEARING WALL: a forged warrant (hand-written, wrong or fabricated verdict) is refused", () => {
  assert.throws(() => requireWarrant(undefined), /no valid warrant/);
  assert.throws(() => requireWarrant({}), /no valid warrant/);
  assert.throws(() => requireWarrant({ schema: "LogosWarrant@1", verdict: "vibes-based" }), /no valid warrant/);
  for (const v of LOGOS_VERDICTS) {
    // every real verdict at least passes the shape check (refused fires
    // separately, only for "refuted")
    const shaped = { schema: "LogosWarrant@1", verdict: v, relation: "r", violations: [], cycles: [] };
    if (v === "refuted") assert.throws(() => requireWarrant(shaped), /examined and REFUTED/);
    else assert.doesNotThrow(() => requireWarrant(shaped));
  }
});
