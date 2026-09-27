// identity-exclusion.test.js — the walls of kernel/identity-exclusion.js on
// synthetic, medium-blind referents (opaque ids and relation names).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeIdentityExclusion } from "../kernel/identity-exclusion.js";
import { CONTRADICTED, UNBOUND, BEYOND_REACH } from "../interpretation/hl.js";

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
  assert.equal(r.verdict, CONTRADICTED); assert.equal(r.by, "functional");
  assert.deepEqual(r.proof.map((p) => [p.rel, p.a.id, p.b.id]), [["born", "a#0", "sib#0"]]);
});

test("a shared father is agreement, not identity — and does not outvote the birth date", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "sib");
  assert.ok(r.agreed.some((x) => x.rel === "father"));
  assert.equal(r.verdict, CONTRADICTED);
});

test("different values on a NON-functional relation never exclude", () => {
  const r = makeIdentityExclusion(organs()).judge("a2", "kid2");
  assert.equal(r.verdict, UNBOUND); assert.equal(r.reason, "no_conflict");
});

test("dependency order: no kind, no functional question — a gap, never a verdict", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "nokind");
  assert.equal(r.verdict, UNBOUND); assert.equal(r.reason, "kind_unknown");
  const s = makeIdentityExclusion(organs()).judge("a", "place");
  assert.equal(s.verdict, BEYOND_REACH); assert.equal(s.reason, "no_shared_kind");
});

test("kinds a giver declares disjoint exclude outright", () => {
  const disjointKinds = new Map([["person", new Map([["place", { giver: "test register" }]])]]);
  const r = makeIdentityExclusion(organs({ disjointKinds })).judge("a", "place");
  assert.equal(r.verdict, CONTRADICTED); assert.equal(r.by, "kind");
});

test("an undecidable value pair is incomparable, never a conflict", () => {
  const r = makeIdentityExclusion(organs()).judge("a", "fuzzy");
  assert.equal(r.verdict, UNBOUND);
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
  const v = ex.judge("v1", "v2");
  assert.equal(v.verdict, UNBOUND); assert.equal(v.reason, "unwitnessed_conflict");
  assert.equal(v.raised.length, 1, "the conflict rides on the result, typed");
  assert.equal(ex.judge("w1", "w2").verdict, CONTRADICTED);
});

test("an induced CANDIDATE may raise a conflict but never convict; the same pair with a named giver is convicted (kelsen)", () => {
  const cand = organs({ functional: new Map([["person", new Map([["born", { standing: "candidate", evidence: { agreed: 5 } }]])]]) });
  const r = makeIdentityExclusion(cand).judge("a", "sib");
  assert.equal(r.verdict, UNBOUND); assert.equal(r.reason, "candidate_conflict"); assert.equal(r.raised[0].rel, "born");
  assert.equal(makeIdentityExclusion(organs()).judge("a", "sib").verdict, CONTRADICTED);
});

test("the organ never returns bound: finding no conflict is not evidence of sameness", () => {
  const ex = makeIdentityExclusion(organs());
  for (const [x, y] of [["a", "a2"], ["a2", "kid2"], ["a", "fuzzy"]]) assert.notEqual(ex.judge(x, y).verdict, "bound");
});

test("a register built past the reading cursor cannot license a verdict before it (muninn / clippy)", () => {
  const behind = makeIdentityExclusion(organs({ registerAsOf: 100 }));
  const r = behind.judge("a", "sib", { asOf: 10 });
  assert.equal(r.verdict, BEYOND_REACH); assert.equal(r.reason, "register_ahead_of_cursor");
  assert.equal(makeIdentityExclusion(organs({ registerAsOf: 5 })).judge("a", "sib", { asOf: 10 }).verdict, CONTRADICTED);
  assert.equal(makeIdentityExclusion(organs()).judge("a", "sib", { asOf: 10 }).verdict, BEYOND_REACH, "a register with no cursor was built from everything");
});
