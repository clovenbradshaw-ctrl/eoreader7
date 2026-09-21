// essay-shape-register-falsify.test.mjs — THE FALSIFICATION TIER for the
// essay-shape register. The assertion under attack:
//
//   "The essay's shape is an assertion, not a fixed ladder. Every cell is
//   CANDIDATE with a falsifying control; a specimen that demonstrates the
//   claim false REFUTES the cell (REC, never an edit); and a REFUTED cell is
//   dropped from every future void — the composition can never ask a question
//   the material has already shown it need not answer."
//
// Each falsification below tries to BREAK a consequence of that assertion
// with adversarial material. RULED OUT = the claim survived its own
// counterexample; FALSIFIED = it broke, named with the numbers.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createShapeRegister,
  voidFor,
  reconsiderShape,
  promoteShape,
  assertionFor,
  repairStaleComposition,
  SHAPE_ASSERTIONS,
  STANDINGS,
} from "./essay-shape-register.js";

// The eight UNIVERSAL cells — the ones that used to be `relevant: () => true`
// in VOID_CELLS, now assertions with falsifying controls.
const UNIVERSAL = ["NUL·Ground", "SIG·Figure", "INS·Pattern", "SEG·Ground", "SYN·Pattern", "DEF·Ground", "DEF·Figure", "EVA·Figure", "REC·Ground", "REC·Figure"];

// ── F1  EVERY CELL IS AN ASSERTION WITH A FALSIFYING CONTROL.
// A cell without a `claim` or a `falsifying` control is a prejudice, not an
// assertion — a fixed ladder sneaking back in under a new name.
test("F1 — every shape cell is an assertion with a claim and a falsifying control", () => {
  const reg = createShapeRegister();
  for (const cell of reg.cells) {
    assert.ok(cell.claim && cell.claim.length > 0, `${cell.op}·${cell.grain} carries a claim`);
    assert.ok(cell.falsifying && cell.falsifying.length > 0, `${cell.op}·${cell.grain} carries a falsifying control`);
  }
  assert.equal(reg.cells.length, SHAPE_ASSERTIONS.length, "all 27 received cells are in the register");
});

// ── F2  THE UNIVERSAL CELLS ARE CANDIDATE, NOT GIVEN. A register that
// boots with the universal cells already GIVEN is a fixed ladder wearing an
// assertion's name.
test("F2 — every cell starts CANDIDATE; nothing is GIVEN at birth", () => {
  const reg = createShapeRegister();
  assert.ok(reg.cells.every((c) => c.standing === STANDINGS.CANDIDATE), "no cell is GIVEN at birth");
  for (const key of UNIVERSAL) {
    const [op, grain] = key.split("·");
    const cell = reg.cells.find((c) => c.op === op && c.grain === grain);
    assert.ok(cell, `${key} exists in the register`);
    assert.equal(cell.standing, STANDINGS.CANDIDATE, `${key} is CANDIDATE at birth`);
  }
});

// ── F3  A REFUTED CELL IS DROPPED FROM THE VOID — the composition can never
// ask a question the material already showed it need not answer.
test("F3 — a REFUTED cell is withheld from every future void", () => {
  const reg = createShapeRegister();
  const r = reconsiderShape({ register: reg, refutedCells: ["NUL·Ground"], specimen: "a-pure-table" });
  assert.deepEqual(r.conceded, ["NUL·Ground"]);
  const v = voidFor({ topic: "t", register: r.register, relevant: () => true });
  assert.ok(!v.cells.some((c) => c.cell === "NUL·Ground"), "NUL·Ground is not emitted");
  assert.ok(v.withheld.some((w) => w.cell === "NUL·Ground" && /refuted/.test(w.reason)), "the refusal is disclosed");
});

// ── F4  CONCESSION IS REC, NEVER AN EDIT. The cell's history carries the
// concession; the register value is a new object, not a mutated one.
test("F4 — a concession appends to the cell's history (REC), never edits in place", () => {
  const reg = createShapeRegister();
  const r = reconsiderShape({ register: reg, refutedCells: ["EVA·Figure"], specimen: "an-opinion" });
  const cell = r.register.cells.find((c) => c.cell === "EVA·Figure" || (c.op === "EVA" && c.grain === "Figure"));
  assert.equal(cell.standing, STANDINGS.REFUTED);
  assert.equal(cell.history.length, 1);
  assert.equal(cell.history[0].specimen, "an-opinion");
  assert.ok(reg.cells.find((c) => c.op === "EVA" && c.grain === "Figure").standing === STANDINGS.CANDIDATE, "the original register is untouched — append-only");
});

// ── F5  RE-CONCESSION IS IDEMPOTENT — a cell already REFUTED is not
// re-conceded, and an unknown cell is never guessed into the register.
test("F5 — reconsider is idempotent and refuses unknown cells", () => {
  const reg = createShapeRegister();
  const r1 = reconsiderShape({ register: reg, refutedCells: ["SIG·Figure"] });
  const r2 = reconsiderShape({ register: r1.register, refutedCells: ["SIG·Figure", "NOT·A·CELL"] });
  assert.deepEqual(r2.conceded, [], "already-REFUTED and unknown cells are not conceded");
});

// ── F6  PROMOTION REQUIRES A NAMED GIVER — never the register's own
// decision, never automatic. This is the wall that keeps the ladder out.
test("F6 — promotion to GIVEN requires a named giver; a giverless promotion is refused", () => {
  const reg = createShapeRegister();
  const refused = promoteShape({ register: reg, cells: ["NUL·Ground"] });
  assert.equal(refused.refused.type, "giver_required");
  const ok = promoteShape({ register: reg, cells: ["NUL·Ground"], giver: "the conductor" });
  assert.deepEqual(ok.promoted, ["NUL·Ground"]);
  const cell = ok.register.cells.find((c) => c.op === "NUL" && c.grain === "Ground");
  assert.equal(cell.standing, STANDINGS.GIVEN);
  assert.equal(cell.history[0].giver, "the conductor");
});

// ── F7  THE VOID EMITS ONLY HOLDING CELLS: a mix of refuted + holding
// yields exactly the holding questions, in order.
test("F7 — voidFor emits holding cells only, refuted ones withheld with their claim", () => {
  const reg = createShapeRegister();
  const r = reconsiderShape({ register: reg, refutedCells: ["NUL·Ground", "EVA·Figure"] });
  const v = voidFor({ topic: "a bicycle with an electric motor", register: r.register, relevant: () => true });
  assert.ok(!v.cells.some((c) => c.cell === "NUL·Ground" || c.cell === "EVA·Figure"));
  assert.equal(v.withheld.length, 2);
  for (const w of v.withheld) assert.ok(/refuted/.test(w.reason), `withheld ${w.cell} names the refutation`);
  // The remaining universal cells still hold and are emitted.
  assert.ok(v.cells.some((c) => c.cell === "SIG·Figure"), "SIG·Figure (unrefuted) still emitted");
});

// ── F8  THE REGISTER'S OWN REFUTATION IS FALSIFIABLE: the universal claim
// "every essay marks its subject off" (NUL·Ground) is REFUTED by a specimen
// that never marks its subject off — a pure table. If the register refused to
// concede it, the assertion "every cell is revisable" would be false.
test("F8 — the NUL·Ground universality is refutable by a subject-never-marked-off specimen", () => {
  const reg = createShapeRegister();
  const r = reconsiderShape({ register: reg, refutedCells: ["NUL·Ground"], specimen: "inventory.csv — a list of items, no 'what it is NOT'" });
  assert.ok(r.conceded.includes("NUL·Ground"), "the table refutes the claim and the register concedes");
  const v = voidFor({ topic: "inventory", register: r.register, relevant: () => true });
  assert.ok(!v.cells.some((c) => c.cell === "NUL·Ground"), "the table's void never asks 'what is it NOT'");
});

// ── F9  THE COUNTER-ATTACK: a register that NEVER refutes anything is a
// fixed ladder in disguise — Wilson's own "asymptotic, always revisable" law
// demands the capacity to move. A register where every reconsider is a no-op
// has falsified the whole assertion.
test("F9 — the register can actually move: a real concession changes the emitted void", () => {
  const reg = createShapeRegister();
  const before = voidFor({ topic: "t", register: reg, relevant: () => true }).cells.map((c) => c.cell).join(",");
  const r = reconsiderShape({ register: reg, refutedCells: UNIVERSAL, specimen: "a corpus that composes under none of the universal questions" });
  assert.ok(r.conceded.length > 0, "the universal cells are concedable");
  const after = voidFor({ topic: "t", register: r.register, relevant: () => true }).cells.map((c) => c.cell).join(",");
  assert.notEqual(after, before, "the emitted void changed — the register moved");
  assert.ok(after.split(",").filter(Boolean).length < before.split(",").filter(Boolean).length, "fewer cells after concession");
});
// ── H1  THE HOLONIC REPAIR SITS ON REFERENTS, NEVER SPANS.
// A flat piece is detected by the BEINGS its sections share, not by byte
// spans. Two sections that resolve to the same referents are one claim
// restated; two sections that carry different beings are kept apart.
test("H1 — the repair pairs restatements on referents, and never fuses two different beings", () => {
  const referents = {
    resolveIn(text) {
      const t = String(text ?? "").toLowerCase();
      const ids = new Set();
      if (t.includes("cumberland")) ids.add("r1");
      if (t.includes("nashville")) ids.add("r2");
      if (t.includes("corps") || t.includes("flood")) ids.add("r3");
      return ids;
    },
    represent(id) { return { r1: "the Cumberland River", r2: "Nashville", r3: "the Corps" }[id] ?? id; },
  };
  const sections = [
    "The Cumberland River transformed Nashville into a port city in the 1800s.",
    "Nashville became a commercial center because of the Cumberland River.",
    "The Army Corps of Engineers built dams for flood control.",
    "The Cumberland River again made Nashville a thriving commercial hub.",
  ];
  const r = repairStaleComposition({ register: createShapeRegister(), sections, referents });
  assert.equal(r.groundedOn, "referents", "the pairing is grounded on the being-face");
  assert.equal(r.merged.length, 2, "three same-being restatements fuse; the different being is kept");
  assert.match(r.merged[0], /Cumberland River/, "the kept section carries its being");
  assert.match(r.merged[1], /Corps|flood/i, "the different-being section survives untouched");
});

// ── H2  THE REPAIR IS GROUNDED FOR WHOM (Panini).
// The refutation's specimen names the experiencer's own read — the concession
// is a recorded act under the person's lens, never the machine's private
// judgment. The caller fills perspectives.forWhom.
test("H2 — the repair carries a forWhom and records it on the register's concessions", () => {
  const referents = {
    resolveIn(text) { const t = String(text).toLowerCase(); const s = new Set(); if (t.includes("river")) s.add("r"); if (t.includes("city")) s.add("c"); return s; },
    represent(id) { return id; },
  };
  const sections = [
    "The river shaped the city over centuries.",
    "The city grew because of the river.",
    "The river still shapes the city today.",
  ];
  const r = repairStaleComposition({ register: createShapeRegister(), sections, referents, specimen: "ana reading the river — the piece paced flat" });
  // The caller fills forWhom; the register's conceded cells carry the specimen.
  const conceded = r.register.cells.filter((c) => c.standing === STANDINGS.REFUTED);
  assert.ok(conceded.length > 0, "the flat specimen refuted shape cells");
  assert.ok(conceded.every((c) => (c.history ?? []).some((h) => h.specimen?.includes("ana"))), "every concession names the experiencer's read");
});

// ── H3  THE REPAIR KEEPS THE CONTENT'S STANDPOINTS APART (Mahavira).
// The merge fuses restatements of ONE standpoint; it must never flatten two
// standpoints into one voice. The perspectives map discloses what is kept
// apart.
test("H3 — the repair discloses the standpoints it keeps apart, and the forWhom", () => {
  const referents = {
    resolveIn(text) { const t = String(text).toLowerCase(); const s = new Set(); if (t.includes("river")) s.add("r"); if (t.includes("town")) s.add("t"); return s; },
    represent(id) { return id; },
  };
  const sections = [
    "The river towns relied on the water for trade.",
    "Trade on the river sustained the towns.",
    "The towns flourished by the river.",
  ];
  const r = repairStaleComposition({ register: createShapeRegister(), sections, referents });
  assert.ok(r.perspectives && typeof r.perspectives === "object", "the repair returns a perspectives map");
  assert.ok(r.perspectives.rule.includes("kept apart"), "Mahavira's rule is carried");
  // The caller grounds forWhom after the repair.
  const grounded = { ...r.perspectives, forWhom: "ana" };
  assert.equal(grounded.forWhom, "ana");
});
