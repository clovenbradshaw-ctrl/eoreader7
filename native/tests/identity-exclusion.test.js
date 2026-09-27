// identity-exclusion.test.js — the walls of kernel/identity-exclusion.js on
// synthetic, medium-blind referents (opaque ids and relation names).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeIdentityExclusion } from "../kernel/identity-exclusion.js";

const R = {
  a: { kinds: ["person"], facts: [["born", "d1"], ["father", "f1"]] },
  a2: { kinds: ["person"], facts: [["born", "d1"], ["child", "c1"]] },
  sib: { kinds: ["person"], facts: [["born", "d2"], ["father", "f1"]] },
  place: { kinds: ["place"], facts: [["born", "d1"]] },
  nokind: { kinds: [], facts: [["born", "d9"]] },
  kid2: { kinds: ["person"], facts: [["born", "d1"], ["child", "c2"]] },
  fuzzy: { kinds: ["person"], facts: [["born", "year-only"]] },
};
const organs = (extra = {}) => ({
  kindsOf: (x) => new Set(R[x].kinds),
  assertionsOf: (x) => R[x].facts.map(([rel, value], i) => ({ rel, value, id: `${x}#${i}` })),
  functional: new Map([["person", new Map([["born", { giver: "test register" }], ["father", { giver: "test register" }]])]]),
  sameValue: (u, v) => (u === "year-only" || v === "year-only" ? null : u === v),
  ...extra,
});

test("a functional relation must carry a giver — never assumed", () => {
  assert.throws(() => makeIdentityExclusion(organs({ functional: new Map([["person", new Map([["born", {}]])]]) })), /giver/);
  assert.throws(() => makeIdentityExclusion({}), /must be supplied/);
});

test("different birthdays cannot be the same person, and the two assertions are the proof", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "sib");
  assert.equal(r.verdict, "excluded"); assert.equal(r.by, "functional");
  assert.deepEqual(r.proof.map((p) => [p.rel, p.a.id, p.b.id]), [["born", "a#0", "sib#0"]]);
});

test("a shared father is agreement, not identity — and does not outvote the birth date", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "sib");
  assert.ok(r.agreed.some((x) => x.rel === "father"));
  assert.equal(r.verdict, "excluded");
});

test("different values on a NON-functional relation never exclude", () => {
  const r = makeIdentityExclusion(organs()).judge("a2", "kid2");
  assert.equal(r.verdict, "not_excluded");
});

test("dependency order: no kind, no functional question — a gap, never a verdict", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "nokind");
  assert.equal(r.verdict, "gap"); assert.equal(r.reason, "kind_unknown");
  const s = makeIdentityExclusion(organs()).judge("a", "place");
  assert.equal(s.verdict, "gap"); assert.equal(s.reason, "no_shared_kind");
});

test("kinds a giver declares disjoint exclude outright", () => {
  const disjointKinds = new Map([["person", new Map([["place", { giver: "test register" }]])]]);
  const r = makeIdentityExclusion(organs({ disjointKinds })).judge("a", "place");
  assert.equal(r.verdict, "excluded"); assert.equal(r.by, "kind");
});

test("an undecidable value pair is incomparable, never a conflict", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "fuzzy");
  assert.equal(r.verdict, "not_excluded");
  assert.deepEqual(r.incomparable.map((x) => x.rel), ["born"]);
});

test("the organ names no medium and compares no strings itself", () => {
  const src = readFileSync(new URL("../kernel/identity-exclusion.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  for (const w of ["sentence", "word", "token", "verb", "text", "toLowerCase", "localeCompare"]) assert.ok(!src.includes(w), `kernel body says '${w}'`);
});

test("a proof must stand: a conflict resting on an unwitnessed assertion is contested, not two referents", () => {
  // the Volkonsky shape: one referent's own sources disagree, one side unreferenced
  const facts = { v1: [["born", "d1", 0]], v2: [["born", "d2", 1]], w1: [["born", "d3", 2]], w2: [["born", "d4", 1]] };
  const o = organs({
    kindsOf: () => new Set(["person"]),
    assertionsOf: (x) => facts[x].map(([rel, value, refs], i) => ({ rel, value, refs, id: `${x}#${i}` })),
    witnessed: (a) => a.refs > 0,
  });
  const ex = makeIdentityExclusion(o);
  assert.equal(ex.judge("v1", "v2").verdict, "contested");
  assert.equal(ex.judge("w1", "w2").verdict, "excluded");
});
