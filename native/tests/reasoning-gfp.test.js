// tests/reasoning-gfp.test.js — the GFP core of the reasoning linter, against
// the real kernel/gfp-claim.js and organs/reasoning-lint.js. No stubs.
import test from "node:test";
import assert from "node:assert/strict";
import { gfpClaim, claimFromTriple, claimKey, project, render, readBack, LENSES, ORDERS, overlap, lca, caselessIdentity } from "../kernel/gfp-claim.js";
import { lintGfp } from "../organs/reasoning-lint.js";

const C = (rel, a0, a1, o = {}) => claimFromTriple(a0, rel, a1, o);

test("every lens — six orders, case-marked free order, code's infix/prefix/postfix — reads back the same claim", () => {
  const c = C("capital-of", "Paris", "France");
  assert.equal(Object.keys(ORDERS).length, 6, "WALS 81A's six orders");
  for (const lens of LENSES) {
    if (lens === "case-marked") {
      for (const perm of [[0, 1, 2], [2, 0, 1], [1, 2, 0], [2, 1, 0]]) {
        const back = readBack(project(c, lens, { permutation: perm }).map((t) => t.text), lens);
        assert.equal(claimKey(back), claimKey(c), `case-marked, order ${perm}`);
      }
      continue;
    }
    const back = readBack(project(c, lens).map((t) => t.text), lens);
    assert.equal(claimKey(back), claimKey(c), lens);
  }
  assert.equal(render(gfpClaim({ rel: "=", roles: { ARG0: "x", ARG1: "3" } }), "infix"), "x = 3");
  assert.equal(render(gfpClaim({ rel: "=", roles: { ARG0: "x", ARG1: "3" } }), "prefix"), "(= x 3)");
  assert.equal(render(gfpClaim({ rel: "=", roles: { ARG0: "x", ARG1: "3" } }), "postfix"), "x 3 =");
});

test("roles make the difference, order does not: capital-of(Paris, France) is not capital-of(France, Paris)", () => {
  assert.notEqual(claimKey(C("capital-of", "Paris", "France")), claimKey(C("capital-of", "France", "Paris")));
});

test("the verdict is the same whichever lens each claim was said in", () => {
  const said = [
    { c: C("born-in", "Lincoln", "Kentucky"), lens: "SOV" },
    { c: C("born-in", "Lincoln", "Illinois"), lens: "VSO" },
  ];
  const base = lintGfp(said.map((x) => x.c), { functional: ["born-in"] });
  for (const la of LENSES.filter((l) => l !== "case-marked")) for (const lb of LENSES.filter((l) => l !== "case-marked")) {
    const cs = [readBack(project(said[0].c, la).map((t) => t.text), la), readBack(project(said[1].c, lb).map((t) => t.text), lb)];
    const r = lintGfp(cs, { functional: ["born-in"] });
    assert.deepEqual(r.counts, base.counts, `${la} × ${lb}`);
  }
  assert.equal(base.counts.standing_contradiction, 1);
});

test("P and not-P at one ground is a contradiction with no declaration at all", () => {
  const r = lintGfp([C("imports", "a", "b"), C("imports", "a", "b", { polarity: "-" })]);
  assert.equal(r.counts.polarity_contradiction, 1);
  assert.equal(r.ok, false);
});

test("siblings never meet: two sections each keep their own fact", () => {
  const r = lintGfp([C("is", "tone", "hopeful", { ground: "/p1" }), C("is", "tone", "hopeful", { ground: "/p2", polarity: "-" })]);
  assert.equal(r.findings.length, 0);
  assert.equal(r.apart, 1, "the pair is counted as held apart, not judged");
  assert.equal(overlap("/p1", "/p2"), false);
  assert.equal(lca("/p3/2", "/p3/4"), "/p3");
});

test("code: an inner binding shadows an outer default — reported, never an error", () => {
  const r = lintGfp([
    C("has-type", "x", "int", { ground: "/src/a.js/f" }),
    C("has-type", "x", "string", { ground: "/src/a.js/f/block2" }),
  ], { functional: [{ rel: "has-type", giver: "one binding, one type per scope" }], strictness: "report" });
  assert.equal(r.counts.overridden_in_scope, 1);
  assert.equal(r.ok, true);
});

test("code: a strict invariant is refuted by a counterexample in a nested scope", () => {
  const r = lintGfp([
    C("returns", "f", "null", { ground: "/src/a.js/f", polarity: "-", force: "strict" }),
    C("returns", "f", "null", { ground: "/src/a.js/f/branch3" }),
  ]);
  assert.equal(r.counts.refuted_in_scope, 1);
  assert.equal(r.ok, false);
});

test("code: two types for one binding in ONE scope is a standing contradiction", () => {
  const r = lintGfp([
    C("has-type", "x", "int", { ground: "/src/a.js/f" }),
    C("has-type", "x", "string", { ground: "/src/a.js/f" }),
  ], { functional: ["has-type"] });
  assert.equal(r.counts.standing_contradiction, 1);
});

test("code: identity is exact by default — x is not X", () => {
  const r = lintGfp([C("has-type", "x", "int"), C("has-type", "X", "string")], { functional: ["has-type"] });
  assert.equal(r.findings.length, 0);
  const prose = lintGfp([C("born-in", "Lincoln", "Kentucky"), C("born-in", "lincoln", "Illinois")], { functional: ["born-in"], identity: caselessIdentity });
  assert.equal(prose.counts.standing_contradiction, 1, "prose declares caseless identity");
});

test("one-valuedness is declared, never assumed: Lincoln met two Marys is unjudged", () => {
  const r = lintGfp([C("met", "Lincoln", "Mary Owens"), C("met", "Lincoln", "Mary Todd")]);
  assert.equal(r.findings.length, 0);
  assert.equal(r.unjudged, 1);
});

test("symmetric declared: 'Lincoln married Mary' and 'Mary did not marry Lincoln' contradict", () => {
  const cs = [C("married", "Lincoln", "Mary"), C("married", "Mary", "Lincoln", { polarity: "-" })];
  assert.equal(lintGfp(cs).findings.length, 0, "undeclared: the roles differ, so they are different claims");
  assert.equal(lintGfp(cs, { symmetric: ["married"] }).counts.polarity_contradiction, 1);
});

test("code: an import cycle through three modules is found where the relation is declared acyclic", () => {
  const cs = [C("imports", "a", "b"), C("imports", "b", "c"), C("imports", "c", "a")];
  assert.equal(lintGfp(cs, { strictness: "strict" }).findings.length, 0, "undeclared: not judged");
  const r = lintGfp(cs, { acyclic: ["imports"], strictness: "strict" });
  assert.equal(r.counts.circular, 1);
  assert.match(r.findings[0].detail, /a → b → c → a/);
});

test("a cycle only exists within a scope: edges split across sibling holons never close", () => {
  const cs = [C("depends-on", "x", "y", { ground: "/m1" }), C("depends-on", "y", "x", { ground: "/m2" })];
  assert.equal(lintGfp(cs, { acyclic: ["depends-on"], strictness: "strict" }).findings.length, 0);
});

test("roll-up: an error deep in the tree is counted at every ancestor", () => {
  const r = lintGfp([
    C("born-in", "Lincoln", "Kentucky", { ground: "/p3/2" }),
    C("born-in", "Lincoln", "Illinois", { ground: "/p3/2" }),
    C("met", "Lincoln", "Douglas", { ground: "/p1" }),
  ], { functional: ["born-in"] });
  const at = (h) => r.holons.find((x) => x.at === h);
  assert.equal(at("/p3/2").own, 1);
  assert.equal(at("/p3").below, 1);
  assert.equal(at("/").errors, 1);
  assert.equal(at("/p1").errors, 0, "a sibling branch carries none of it");
});

test("the spiral's dependency claims, which the SVO default convicted three times, lint clean", () => {
  const cs = ["void_level", "floor_level", "reopen"].map((x) => C("supports", "addr", x));
  const r = lintGfp(cs);
  assert.equal(r.ok, true);
  assert.equal(r.findings.length, 0);
  assert.equal(r.unjudged, 3, "three values of an undeclared relation: counted, not convicted");
});

test("identity is a claim: a declared alias merges two names, only where its ground reaches", () => {
  const born = (who, y, g = "/") => C("born-in-year", who, y, { ground: g });
  const decl = { functional: ["born-in-year"], identityRels: ["same-as"] };
  assert.equal(lintGfp([born("Andrew Jackson", "1767"), born("Old Hickory", "1779")], decl).findings.length, 0, "no alias stated: two names, two beings");
  const r = lintGfp([born("Andrew Jackson", "1767"), born("Old Hickory", "1779"), C("same-as", "Old Hickory", "Andrew Jackson")], decl);
  assert.equal(r.counts.standing_contradiction, 1, "the alias makes them one being with two birth years");
  const scoped = lintGfp([born("Andrew Jackson", "1767", "/p1"), born("Old Hickory", "1779", "/p1"), C("same-as", "Old Hickory", "Andrew Jackson", { ground: "/p2" })], decl);
  assert.equal(scoped.findings.length, 0, "an alias stated in a sibling section merges nothing here");
});
