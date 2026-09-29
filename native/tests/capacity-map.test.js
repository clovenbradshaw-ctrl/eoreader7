// capacity-map.test.js — F1 and F2 of THE-CAPACITY-MAP.md (git 2f81545:native/docs/), plus the
// walls the module's own header claims. F1 and F2 check the CODE, not the
// theory: the empirical predictions (F3–F5) ran in eval/capacity-map/ (git 2f81545).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOMAINS, GRAINS, MODES, STANCE_BY_MODE, TERRAIN_BY_DOMAIN, cellOf } from "../kernel/cube.js";
import {
  CLASS_DOMAIN, CLASS_IDS, CROSSINGS, DECLARED_CROSSINGS, NO_CROSSINGS, PLACES, POSITIONS, UNSUPPORTED_CROSSINGS,
  admissible, admissibleSpace, balancedRoutes, countRoutes, describe, dressed, label, nextSteps,
  orderOf, placeOf, placeReached, positionOfOrder, prerequisites, profile, ringOfOrder, routes, space, spread, terrainAt,
} from "../kernel/capacity-map.js";

// The strict order is a HYPOTHESIS the pre-registered tests did not support; its arithmetic is still checked, explicitly.
const STRICT = { crossings: DECLARED_CROSSINGS };

const SRC = readFileSync(new URL("../kernel/capacity-map.js", import.meta.url), "utf8");
// executable source: comments removed, so a header may quote the sources without tripping a scan
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/([^:"'`])\/\/.*$/gm, "$1");

const TERRAINS = Object.values(TERRAIN_BY_DOMAIN).flatMap((byGrain) => GRAINS.map((g) => byGrain[g]));
const STANCES = Object.values(STANCE_BY_MODE).flatMap((byGrain) => GRAINS.map((g) => byGrain[g]));
const OPERATORS = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"];

// ── F1 — derivation ─────────────────────────────────────────────────────────

test("F1: the nine places are exactly the cube's nine terrains", () => {
  assert.equal(PLACES.length, 9);
  assert.deepEqual(new Set(PLACES.map((p) => p.terrain)), new Set(TERRAINS));
  for (const p of PLACES) {
    const domain = CLASS_DOMAIN.find((c) => c.id === p.klass).domain;
    assert.equal(p.terrain, TERRAIN_BY_DOMAIN[domain][p.position]);
    assert.equal(cellOf("NUL", p.position).grain, p.position, "positions are the cube's grains");
  }
  assert.deepEqual([...POSITIONS], [...GRAINS]);
});

test("F1: the three classes take the three domains in the cube's own order, each row naming its giver", () => {
  assert.deepEqual(CLASS_DOMAIN.map((c) => c.domain), [...DOMAINS]);
  for (const row of CLASS_DOMAIN) {
    assert.ok(row.giver && row.tier && row.grants && row.wall, `${row.id} must carry giver, tier, grants and wall`);
  }
});

test("F1: no terrain, stance or operator name is restated as a string literal in the module's code", () => {
  const literals = [...CODE.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  assert.ok(literals.length > 10, "the scan must be reading real literals");
  for (const name of [...TERRAINS, ...STANCES, ...OPERATORS, ...MODES, ...DOMAINS]) {
    const hit = literals.find((s) => new RegExp(`\\b${name}\\b`).test(s));
    assert.equal(hit, undefined, `"${name}" is restated in a string literal (${JSON.stringify(hit)}) — read it off cube.js`);
  }
});

test("F1: medium-blind — the executable body mentions no medium", () => {
  for (const w of ["sentence", "pronoun", "surface", "token", "word", "text"]) {
    assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(CODE), `capacity-map.js must not mention "${w}" — it would not be medium-general`);
  }
});

test("F1 CONTROL built to fail: the scan does catch a restated name", () => {
  const planted = `${CODE}\nconst leaked = "the Link between two beings";`;
  const literals = [...planted.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].map((m) => m[1]);
  assert.ok(literals.some((s) => /\bLink\b/.test(s)), "a restated terrain in a literal must be visible to the scan");
});

// ── F2 — combinatorics (brute force against closed form) ────────────────────

const multiset = (letters) => {
  const out = new Set();
  const walk = (rest, path) => {
    if (!rest.length) return void out.add(path.join(""));
    rest.forEach((c, i) => walk([...rest.slice(0, i), ...rest.slice(i + 1)], [...path, c]));
  };
  walk(letters, []);
  return [...out];
};
const isLatticeWord = (w) => {
  const n = { A: 0, G: 0, T: 0 };
  for (const c of w) {
    n[c]++;
    if (n.G > n.A || n.T > n.G) return false;
  }
  return true;
};
const hook = (rows) => {
  // hook-length formula for a rectangular shape rows x cols given as [rows, cols]
  const [r, c] = rows;
  let prod = 1;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) prod *= (r - i - 1) + (c - j - 1) + 1;
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  return fact(r * c) / prod;
};
const choose = (n, k) => (k === 0 ? 1 : (n * choose(n - 1, k - 1)) / k);

test("F2: 27 profiles in the first ring; 10 admissible under the strict rule (= C(5,3))", () => {
  assert.equal(space({ rings: 1 }).length, 27);
  assert.equal(admissibleSpace({ rings: 1, ...STRICT }).length, 10);
  assert.equal(admissibleSpace({ rings: 1, ...STRICT }).length, choose(5, 3), "weakly decreasing triples over 3 orders: multichoose(3,3)");
  assert.equal(admissibleSpace({ rings: 1, crossings: NO_CROSSINGS }).length, 27);
});

test("F2: 5 admissible routes (= standard Young tableaux of the 3x2 shape), by DP, by enumeration, and by an independent brute force", () => {
  assert.equal(countRoutes(STRICT), 5);
  assert.equal(countRoutes(STRICT), hook([3, 2]));
  const mine = routes(STRICT);
  assert.equal(mine.length, 5);
  const brute = multiset(["A", "A", "G", "G", "T", "T"]).filter(isLatticeWord).sort();
  const short = { arithmetic: "A", geometric: "G", transcendental: "T" };
  assert.deepEqual(mine.map((r) => r.map((k) => short[k]).join("")).sort(), brute);
  assert.deepEqual(brute, ["AAGGTT", "AAGTGT", "AGAGTT", "AGATGT", "AGTAGT"]);
});

test("F2: exactly one balanced route — arithmetic, geometric, transcendental in turn — and its spread never exceeds 1", () => {
  const balanced = balancedRoutes(STRICT);
  assert.equal(balanced.length, 1);
  assert.deepEqual([...balanced[0]], ["arithmetic", "geometric", "transcendental", "arithmetic", "geometric", "transcendental"]);
});

test("F2: 42 routes carry the spiral to the next ring's ground; 90 with no rule (= 6!/(2!)^3)", () => {
  const ring2 = profile({ arithmetic: 3, geometric: 3, transcendental: 3 });
  assert.equal(countRoutes({ to: ring2, ...STRICT }), 42);
  assert.equal(countRoutes({ to: ring2, ...STRICT }), hook([3, 3]));
  assert.equal(countRoutes({ crossings: NO_CROSSINGS }), 90);
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  assert.equal(countRoutes({ crossings: NO_CROSSINGS }), fact(6) / (fact(2) ** 3));
});

test("the default lattice, with nothing enforced: 27 profiles, 90 routes, 36 balanced (each triple of steps advances every class once: 3! x 3!)", () => {
  assert.equal(CROSSINGS.length, 0);
  assert.equal(admissibleSpace().length, 27);
  assert.equal(countRoutes(), 90);
  assert.equal(balancedRoutes().length, 36);
  assert.equal(balancedRoutes().length, 6 * 6);
});

test("F2: weakening the rule to one crossing gives the brute-force count (reported, not predicted)", () => {
  const onlyAG = DECLARED_CROSSINGS.filter((c) => c.higher === "geometric");
  assert.equal(onlyAG.length, 1);
  const brute = multiset(["A", "A", "G", "G", "T", "T"]).filter((w) => {
    let a = 0, g = 0;
    for (const c of w) { if (c === "A") a++; if (c === "G") g++; if (g > a) return false; }
    return true;
  });
  assert.equal(countRoutes({ crossings: onlyAG }), brute.length);
});

test("F2: a span too long to read is a typed gap, not a silent truncation — and DP still counts it", () => {
  const far = profile({ arithmetic: 8, geometric: 8, transcendental: 8 });
  assert.ok(countRoutes({ to: far, ...STRICT }) > 1000);
  assert.equal(routes({ to: far, ...STRICT }).gap, "too_many_routes");
});

// ── the walls the header claims ─────────────────────────────────────────────

test("admissibility: the rule bites (control built to fail), and a violation names which crossing", () => {
  const ahead = profile({ arithmetic: 0, geometric: 0, transcendental: 1 });
  const ok = admissible(ahead, STRICT);
  assert.equal(ok.ok, false);
  assert.deepEqual(ok.violations.map((v) => [v.higher, v.lower]), [["transcendental", "geometric"]]);
  assert.equal(admissible(ahead, { crossings: NO_CROSSINGS }).ok, true, "with no crossing declared the same profile is admissible — the rule, not the arithmetic, refuses it");
  assert.equal(admissible(profile({ arithmetic: 2, geometric: 1, transcendental: 1 }), STRICT).ok, true);
});

test("no view from nowhere: a class with no ground is a typed gap, never order zero", () => {
  const g = profile({ arithmetic: 0 });
  assert.equal(g.gap, "unplaced_class");
  assert.deepEqual([...g.classes], ["geometric", "transcendental"]);
  assert.equal(profile({ arithmetic: 0, geometric: 0, transcendental: -1 }).gap, "bad_order");
  assert.equal(admissible(g).ok, false);
});

test("the spiral is the same lattice continued: order 3 is the next ring's ground", () => {
  assert.equal(orderOf(GRAINS[0], 1), 3);
  assert.equal(positionOfOrder(4), GRAINS[1]);
  assert.equal(ringOfOrder(5), 1);
  assert.equal(ringOfOrder(6), 2);
  const d = describe(profile({ arithmetic: 4, geometric: 3, transcendental: 3 }));
  assert.equal(d.arithmetic.ring, 1);
  assert.equal(d.arithmetic.position, GRAINS[1]);
  assert.equal(d.arithmetic.terrain, terrainAt("arithmetic", GRAINS[1]));
});

test("prerequisites: what a place needs under the crossing rule, and nothing it does not", () => {
  const need = prerequisites("transcendental", 1, STRICT).map((p) => p.terrain).sort();
  const expected = [
    terrainAt("arithmetic", GRAINS[0]), terrainAt("arithmetic", GRAINS[1]),
    terrainAt("geometric", GRAINS[0]), terrainAt("geometric", GRAINS[1]),
    terrainAt("transcendental", GRAINS[0]),
  ].sort();
  assert.deepEqual(need, expected);
  assert.deepEqual(prerequisites("arithmetic", 0), [], "the first ground needs nothing beneath it");
  assert.deepEqual(prerequisites("transcendental", 1, { crossings: NO_CROSSINGS }).map((p) => p.terrain), [terrainAt("transcendental", GRAINS[0])]);
});

test("nextSteps: a refusal says what must advance first", () => {
  const steps = nextSteps(profile({ arithmetic: 0, geometric: 0, transcendental: 0 }), STRICT);
  const by = Object.fromEntries(steps.map((s) => [s.klass, s]));
  assert.equal(by.arithmetic.ok, true);
  assert.equal(by.geometric.ok, false);
  assert.deepEqual(by.geometric.needs.map((n) => [n.klass, n.order]), [["arithmetic", 1]]);
  assert.deepEqual(by.transcendental.needs.map((n) => [n.klass, n.order]), [["geometric", 1]]);
});

test("placeReached: a run from the ground; a reached place with an unreached one beneath it is an orphan, not counted", () => {
  const all = placeReached(PLACES.map((p) => p.terrain));
  assert.deepEqual({ ...all.profile }, { arithmetic: 2, geometric: 2, transcendental: 2 });
  assert.equal(all.orphans.length, 0);

  const registryShaped = placeReached([
    terrainAt("arithmetic", GRAINS[0]), terrainAt("arithmetic", GRAINS[1]),
    terrainAt("geometric", GRAINS[0]), terrainAt("geometric", GRAINS[1]),
    terrainAt("transcendental", GRAINS[0]), terrainAt("transcendental", GRAINS[2]),
  ]);
  assert.deepEqual({ ...registryShaped.profile }, { arithmetic: 1, geometric: 1, transcendental: 0 });
  assert.deepEqual(registryShaped.orphans.map((o) => [o.klass, o.terrain, o.missingBeneath]), [["transcendental", terrainAt("transcendental", GRAINS[2]), terrainAt("transcendental", GRAINS[1])]]);

  const none = placeReached([]);
  assert.equal(none.profile.gap, "unplaced_class");
  assert.equal(none.unplaced.length, 3);
  const onlyOne = placeReached([terrainAt("arithmetic", GRAINS[0])]);
  assert.deepEqual([...onlyOne.unplaced], ["geometric", "transcendental"]);
});

test("dressed: over-claims are S10's only where S10 names them; an out-of-order claim names the over-claimed class", () => {
  const claimed = profile({ arithmetic: 2, geometric: 2, transcendental: 2 });
  const earned = profile({ arithmetic: 1, geometric: 1, transcendental: 0 });
  const d = dressed({ claimed, earned }, STRICT);
  assert.deepEqual([...d.dressedClasses], ["arithmetic", "geometric", "transcendental"]);
  const by = Object.fromEntries(d.rows.map((r) => [r.klass, r]));
  assert.equal(by.arithmetic.mode, null, "S10 names no failure mode for the arithmetic class — the map does not invent one");
  assert.match(by.geometric.mode, /failure mode 2/);
  assert.match(by.transcendental.mode, /failure mode 3/);
  assert.equal(d.earnedOrder.ok, true);

  const outOfOrder = dressed({ claimed: profile({ arithmetic: 1, geometric: 2, transcendental: 2 }), earned }, STRICT);
  assert.deepEqual(outOfOrder.claimedOrder.violations.map((v) => [v.higher, v.lower]), [["geometric", "arithmetic"]]);
});

test("the map carries its own falsification history: every declared crossing is either in force or kept as unsupported, never both, never lost", () => {
  const key = (c) => `${c.higher}<=${c.lower}`;
  const declared = new Set(DECLARED_CROSSINGS.map(key));
  assert.equal(declared.size, 2);
  const held = [...CROSSINGS, ...UNSUPPORTED_CROSSINGS].map(key);
  assert.deepEqual(new Set(held), declared);
  assert.equal(held.length, declared.size, "a crossing may move between the lists but never appear in both or vanish");
  for (const c of UNSUPPORTED_CROSSINGS) {
    assert.ok(c.result?.rule && c.result?.reading, "an unsupported crossing carries the rule that judged it and the reading of the outcome");
    assert.ok(c.evidence.length > 0, "and the files that hold the runs");
  }
});

test("the default is what the evidence left: with both crossings unsupported nothing is enforced, and the strict pair is still there to be asked for", () => {
  assert.equal(CROSSINGS.length, DECLARED_CROSSINGS.length - UNSUPPORTED_CROSSINGS.length);
  assert.equal(admissibleSpace({ rings: 1 }).length, CROSSINGS.length === 0 ? 27 : admissibleSpace({ rings: 1 }).length);
  assert.equal(admissibleSpace({ rings: 1, ...STRICT }).length, 10);
  // within a class the ground-before-figure-before-pattern chain is not a crossing and is still a prerequisite
  assert.deepEqual(prerequisites("transcendental", 1).filter((p) => p.klass === "transcendental").map((p) => p.order), [0]);
});

test("label and spread are plain", () => {
  const p = profile({ arithmetic: 2, geometric: 1, transcendental: 0 });
  assert.equal(label(p), "a:2 g:1 t:0");
  assert.equal(spread(p), 2);
  assert.equal(placeOf(terrainAt("geometric", GRAINS[1])).klass, "geometric");
  assert.equal(placeOf("not a terrain"), null);
  assert.deepEqual([...CLASS_IDS], ["arithmetic", "geometric", "transcendental"]);
});
