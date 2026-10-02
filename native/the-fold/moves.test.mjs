// moves.test.mjs — the move space, against the REAL operators table and the
// REAL capacity registry. No fixture cube, because a cube this file invented
// would agree with itself and prove nothing.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeMoves } from "./moves.js";
import { CAPACITIES } from "../organs/index.js";

const operators = await import("../kernel/cube.js");
const moves = makeMoves({ operators });

test("the space is nine operators at three grains, and terrain is DERIVED", () => {
  const all = moves.everyMove();
  assert.equal(all.length, 27);
  assert.equal(new Set(all.map((m) => m.cell)).size, 27, "every cell is distinct");
  for (const m of all) {
    // Never a free label: an operator's domain is fixed by its letter, so the
    // terrain follows from (domain, grain) and cannot be chosen.
    assert.equal(m.terrain, operators.TERRAIN_BY_DOMAIN[m.domain][m.grain]);
    assert.equal(m.domain, operators.cellOf(m.op, m.grain).domain);
  }
});

test("a capability naming a terrain its operator cannot reach is ILLEGAL, never coverage", () => {
  // capacities.js's own header records this exact class caught twice by hand
  // while that table was written. SYN is Structure-domain and can never land
  // on Kind, whatever grain is picked.
  const { illegal, covered } = moves.coverage([{ id: "bogus", op: "SYN", terrain: "Kind" }]);
  assert.equal(covered.length, 0, "an illegal row must not be counted as an organ");
  assert.equal(illegal.length, 1);
  assert.match(illegal[0].why, /Structure-domain and can never land on Kind/);
});

test("a compound operator occupies every cell it names", () => {
  // `distinguish` is genuinely two operators in one motion (grid.js), so
  // `cast`'s "SIG+INS" holds two cells; splitting it would report a covered
  // cell as empty.
  const { covered } = moves.coverage([{ id: "cast", op: "SIG+INS", terrain: "Entity" }]);
  assert.deepEqual(covered.map((m) => m.cell).sort(), ["INS·Figure", "SIG·Figure"]);
});

test("an unknown operator is refused rather than admitted as a new cell", () => {
  const { illegal, covered } = moves.coverage([{ id: "x", op: "ZZZ", terrain: "Link" }]);
  assert.equal(covered.length, 0);
  assert.equal(illegal.length, 1);
});

test("THE SPECIMEN: the list failed at a cell this instrument has never occupied", () => {
  // The computed form of the diagnosis. `relations` — the SVO extractor that
  // returned zero edges on a page listing ten prime ministers with their exact
  // terms — sits at CON·Figure. The arrangement it failed to read is
  // CON·Pattern, and that cell is empty.
  const c = moves.coverage(CAPACITIES);
  assert.equal(c.illegal.length, 0, "the shipped registry is domain-legal throughout");

  const link = c.moves.find((m) => m.cell === "CON·Figure");
  assert.equal(link.terrain, "Link");
  assert.deepEqual(link.organs, ["relations", "positionalSlots"], "relations sits beside positionalSlots (the native RoleConfig@1 slot organ, S122) on the same cell — reconciled 2026-09-20 when the legacy operatorOf namespace was retired");

  // The cell WAS empty when the specimen was measured — that emptiness, its
  // stated-before-the-file prediction, and the zero-edges confirmation are
  // the historical record this file's own header keeps. P58 then built
  // network.js in answer, and P64's connection pass registered it, so the
  // live registry now shows the cell CLOSED — which is this test's current
  // truth, asserted without erasing how the cell earned its organ.
  const network = c.moves.find((m) => m.cell === "CON·Pattern");
  assert.equal(network.terrain, "Network");
  assert.deepEqual(network.organs, ["network"], "the cell the specimen exposed is now occupied by the organ built for it (P58, registered P64)");

  // The lead-grading machinery still reads: the same act at every other
  // grain is now covered — CON·Ground closed 2026-09-02 (`field`, the
  // running summary's maintenance act), so it lists beside CON·Figure.
  const n = moves.neighbours("CON·Pattern", c.covered);
  assert.deepEqual(n.sameActOtherGrain, ["CON·Ground", "CON·Figure"]);
});

test("coverage is honest about how much of the space is empty", () => {
  const c = moves.coverage(CAPACITIES);
  assert.equal(c.covered.length + c.empty.length, 27);
  // Nine of twenty-seven when this test was first written; nineteen after
  // P64's connection pass paid the registry debt (ten organs that already
  // existed, registered at their own documented cells); twenty-four after
  // the development pass (P65) built the plan's Tier 1 plus the frontier
  // cell — clearance.js (NUL·Figure), unravel.js (SEG·Pattern),
  // whatWouldSettle registered (SIG·Ground), and the native kinds pair
  // (SIG·Pattern + NUL·Pattern, whose "legacy path" gate turned out already
  // dissolved). The original ratio's lesson stands — a reading that misses
  // something is far more often an unoccupied cell than a misconfigured
  // organ — and P64's law with it: an empty cell is a lead, never a
  // verdict. DEF·Ground got its specimen (the 54/58-vs-52/58 provider
  // incident) and its build (frame.js, from its depth-siblings,
  // 2026-09-02); the TWO still empty (CON·Ground, INS·Ground — Ground
  // grain, Relate and Generate modes) wait on the fold-architecture
  // session's boundary, exactly as the plan wrote them.
  // 25 since DEF·Ground (frame.js) was built from its depth-siblings and
  // registered, 2026-09-02 — this pin moves exactly when the registry does,
  // which is the honesty it exists to enforce
  assert.equal(c.covered.length, 27); // 27/27 since the Ground row closed (field, preflight — 2026-09-02)
  assert.equal(c.empty.length, 0);
});
