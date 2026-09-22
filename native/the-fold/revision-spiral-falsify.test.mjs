// revision-spiral-falsify.test.mjs — THE FALSIFICATION TIER for the spiral
// of the three appeals (2026-09-21, the user's grid):
//
//   "Aristotle's three appeals map onto three grains of revision. The
//   recursive part is where this stops being a checklist: the appeals
//   ACTIVELY FIGHT each other, so a pass that tightens cohesion flattens
//   rhythm (a pathos cost), and a pathos cut strips a qualifier doing real
//   ethos work. The real move is cut, then immediately re-read for what the
//   cut broke in the other two dimensions, then cut again — a spiral that
//   tightens with each rotation. Macro → meso → micro, then back up."
//
// Each falsification attacks a consequence of that law.
import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID, cellOf, cellsByGrain, cellsByAppeal, runGrain, createSpiral, rotate, spiralPath,
} from "./revision-spiral.js";

// ── S1  THE GRID IS TAXONOMICALLY COMPLETE: 3 appeals × 3 grains = 9 cells,
// every cell names an editor, a grain, and an appeal. No cell is missing.
test("S1 — the grid is 3×3 complete; every cell names its editor, appeal, and grain", () => {
  assert.equal(GRID.length, 9, "3 appeals × 3 grains = 9 cells");
  const appeals = new Set(GRID.map((c) => c.appeal));
  const grains = new Set(GRID.map((c) => c.grain));
  assert.deepEqual([...appeals].sort(), ["ethos", "logos", "pathos"], "all three appeals");
  assert.deepEqual([...grains].sort(), ["macro", "meso", "micro"], "all three grains");
  for (const c of GRID) {
    assert.ok(c.editor && c.editor.length > 0, `${c.cell} names an editor`);
    assert.ok(c.charge && c.charge.length > 0, `${c.cell} names its charge`);
  }
});

// ── S2  THE CELLS WITH MECHANICAL PROBES DETECT THE MEASURED FAILURES. The
// Cumberland piece had 8 "burgeoning" + 2 "vital artery" + 2 "crucial role"
// (micro.ethos, Zinsser — inflation), and a "Despite X, Y" with no real
// tension (micro.logos, Williams — false tension).
test("S2 — the mechanical probes detect the measured failures", () => {
  const inflated = "The Cumberland, a vital artery of the interior, was a bustling, burgeoning hub of flourishing commerce.";
  const ethos = runGrain(inflated, "micro");
  const inflation = ethos.filter((f) => f.kind === "inflation");
  assert.ok(inflation.length >= 3, `Zinsser catches the inflation (got ${inflation.length})`);
  assert.ok(inflation.some((f) => f.word === "vital") && inflation.some((f) => f.word === "burgeoning"), "the specific words are named");
  const falseT = "Despite its name's Scottish origins, the Cumberland River's role in the city's interior expansion was undeniable.";
  const logos = runGrain(falseT, "micro");
  assert.ok(logos.some((f) => f.kind === "false_tension"), "Williams catches the 'despite' doing no logical work");
});

// ── S3  THE SPIRAL LAW: A CUT REPORTS WHAT IT BROKE IN THE OTHER TWO APPEALS.
// A Williams-style cohesion cut that flattens rhythm must be re-read for the
// pathos cost; a Lish cut that strips a qualifier must be re-read for the
// ethos cost. The cut is never a one-way edit.
test("S3 — a cut reports what it broke in the other two appeals (the re-read)", () => {
  const piece = "Despite the river's undeniable importance, the bustling city was a vital commercial hub.";
  const spiral = createSpiral({ text: piece });
  // A micro.logos cut (Williams): tighten the false-tension sentence.
  const r1 = rotate(spiral, { cell: "micro.logos", cut: (t) => t.replace(/Despite the river's undeniable importance, /, ""), basis: "Williams: remove the false-tension connector" });
  assert.equal(r1.log.length, 1);
  // The re-read must check the OTHER two micro appeals (ethos + pathos) for
  // what the cut broke — the inflation words survive and are named.
  const broke = r1.log[0].broke;
  assert.ok(broke.some((b) => b.kind === "inflation"), "the cut did not fix the ethos inflation — the re-read names it");
  assert.ok(r1.log[0].cell === "micro.logos" && r1.log[0].editor.includes("Williams"), "the pass is attributed");
});

// ── S4  THE SPIRAL IS A SPIRAL, NOT NINE INDEPENDENT PASSES: MACRO BEFORE
// MESO BEFORE MICRO, THEN RE-ASCENDING. Each rotation appends to the log; the
// piece's lineage IS the log (append-only, never an edit).
test("S4 — the spiral descends macro→meso→micro and records every rotation", () => {
  const piece = "Despite the bustling city's undeniable growth, the vital river flourished.";
  let spiral = createSpiral({ text: piece });
  // Macro → meso → micro: the same three questions at each grain.
  spiral = rotate(spiral, { cell: "macro.logos", cut: (t) => t, basis: "McPhee: find the shape — no change this rotation" });
  spiral = rotate(spiral, { cell: "meso.logos", cut: (t) => t, basis: "Clark: one job per paragraph" });
  spiral = rotate(spiral, { cell: "micro.ethos", cut: (t) => t.replace(/\b(vital|bustling|burgeoning|flourishing)\b/g, ""), basis: "Zinsser: strip the inflation" });
  const log = spiral.log;
  assert.equal(log.length, 3);
  assert.deepEqual(log.map((e) => e.grain), ["macro", "meso", "micro"], "descends macro→meso→micro");
  assert.equal(log[0].editor.includes("McPhee"), true);
  assert.equal(log[2].editor.includes("Zinsser"), true);
  assert.equal(spiral.rotations, 3, "rotations are counted");
  assert.ok(spiralPath(spiral).length === 3, "the path projects");
  assert.ok(spiralPath(spiral)[0].startsWith("[macro.logos"), "the path shows the grain+appeal");
});

// ── S5  THE LOGOS FLOOR: LOGOS IS DEAD SIMPLE, PATHOS EXPANDS. A pathos cell
// (micro.pathos, Lish/Klinkenborg) names a charge but is not a mechanical cut
// here — the machine names what it cannot do rather than faking a probe.
test("S5 — the grid names capacities honestly: cells without a mechanical probe say so", () => {
  const gornick = cellOf("macro.pathos");
  assert.equal(gornick.editor, "Vivian Gornick");
  assert.equal(gornick.probe == null, true, "the macro.pathos cell carries a charge, not a fake mechanical probe");
  // TAUGHT 2026-09-21 (user: "if you have new rules for the archons, teach
  // them"): Lish/Klinkenborg now read Murch's flatline per passage. The
  // doctrine this test guards still holds — pathos does not CUT: every finding
  // the cell makes licenses no revision, and nothing is word-stripped.
  const lish = cellOf("micro.pathos");
  const flat = "The river is long. The river is wide. The river is deep. The river is old.";
  const found = lish.probe ? lish.probe(flat) : [];
  assert.ok(found.length >= 1, "a flat passage should be named by its cadence archon");
  assert.ok(found.every((f) => f.licenses == null), "Lish's cut-to-charge is a named capacity, not a mechanical word-strip");
  // The mechanical probes live where the logic is mechanical (Zinsser,
  // Williams); the felt/authority/shape cells carry the human charge.
  assert.ok(cellOf("micro.ethos").probe, "Zinsser has a mechanical probe");
  assert.ok(cellOf("micro.logos").probe, "Williams has a mechanical probe");
});

// ── S6  F2 — THE HOLONIC RE-READ: a rotation at one level records what the
// cut did to the PARENT. A micro cut that raises the parent's strain must be
// logged (brokeParent: true) — the spiral sees beyond its own grain.
test("S6 — a rotation re-reads the parent: a cut that breaks the parent's strain is logged (F2)", () => {
  const piece = "Despite the vital city's undeniable growth, the bustling river flourished.";
  const spiral = createSpiral({ text: piece });
  const parentSat = (t) => ({ strain: /vital|bustling|undeniable/.test(t) ? 2 : 1 });
  const r = rotate(spiral, {
    cell: "micro.logos",
    cut: (t) => t.replace(/Despite the vital city's undeniable growth, /, ""),
    basis: "Williams: cut the false-tension opener",
    level: "sentence",
    parent: "Despite the vital city's undeniable growth, the bustling river flourished.",
    parentSat,
    gathered: 1,
  });
  assert.equal(r.log[0].level, "sentence", "the rotation records its holon level");
  assert.equal(r.log[0].gathered, 1, "the rotation records the world it gathered");
  assert.equal(r.log[0].parentReRead.brokeParent, false, "this cut did not break the parent (inflation already present)");
  assert.ok(r.log[0].parentReRead.strainBefore != null, "parent strain is measured before");
  assert.ok(r.log[0].parentReRead.strainAfter != null, "parent strain is measured after");
});

// ── S7  F3 — A ROTATION THAT GATHERS NO NEW WORLD IS REFUSED. The spiral is a
// spiral, not a loop: a no-gather rotation is refused outright (never logged).
test("S7 — a no-gather rotation is refused; the spiral is not a loop (F3)", () => {
  const spiral = createSpiral({ text: "The river." });
  const r = rotate(spiral, { cell: "micro.ethos", cut: (t) => t, basis: "no change", gathered: 0 });
  assert.equal(r.refused.type, "no_gathered_world", "a zero-gather rotation is refused");
  assert.equal(r.log.length, 0, "nothing is appended to the log");
  const ok = rotate(spiral, { cell: "micro.ethos", cut: (t) => t.replace(/\bvital\b/g, ""), basis: "strip inflation", gathered: 2 });
  assert.equal(ok.log.length, 1, "a gathering rotation is logged");
  assert.equal(ok.log[0].gathered, 2);
});