// void-loop.test.mjs — the DEF/EVA/REC loop against the REAL algebra.
//
// No stubs anywhere that matter: the cube is the engine's own, the grid is
// `makeGrid` bound to it, the space is `void-shape.js`, and every act the
// loop lands goes through the real `parseAct`/`land`. A refusal here is a
// refusal the real composition law produces.
//
// ENGINE PATH, disclosed rather than silently divergent: this file imports
// eoreader7's NATIVE kernel (`native/kernel/cube.js`, `native/kernel/
// task-log.js`), which is what `void-shape.test.mjs` — the module this one
// builds directly on — already imports, and what the repo's own
// "Retire eoreader6.1: the-fold depends on eoreader7 alone" direction
// points at. `grid.test.mjs` still imports the frozen legacy engine path,
// which is an uninitialised submodule in this checkout, so that file cannot
// run here at all. One
// consequence of the native path is real and named: the native kernel
// exports no `checkCubeProgression`/`isCurrentOperator`, and `grid.js`
// already guards for exactly that (`foldGrid`'s `progression` falls back
// to `[]`), so nothing this file asserts depends on the progression check.
//
// The specimen is void-shape.test.mjs's own, reused verbatim rather than
// re-typed: "who was lincoln's vp?", answered "Hannibal Hamlin" on one
// draw and "Andrew Johnson" on the next, each true, neither the answer.

import test from "node:test";
import assert from "node:assert/strict";

import * as operators from "../kernel/cube.js";
import * as taskLog from "../kernel/task-log.js";
import { makeGrid } from "./grid.js";
import { declareVoid } from "./void-shape.js";
import {
  STANCE_LADDER, loopChoreography, currentRung,
  openLoop, proposeFrom, admit, foldLoop, descend, closeLoop,
  reshapeTriggers, reshape, whatWouldSettle, placeFiller,
} from "./void-loop.js";

const { cellOf } = operators;
const freshGrid = () => makeGrid({ operators, taskLog });

const LINCOLN_VP = {
  slot: "vice president of Abraham Lincoln",
  anchor: "Abraham Lincoln (16th president)",
  admits: "person",
  extent: { from: 1861, to: 1865 },
  dimension: "years",
  relation: "was vice president of",
  composition: "successive terms partition the extent",
  cardinality: "unknown",
  admission: "the candidate's own term span lies within the extent",
  reopensOn: "an uncovered stretch of the extent",
};

const decl = (over = {}) => declareVoid({ ...LINCOLN_VP, ...over }, { cellOf });
const HAMLIN = { value: "Hannibal Hamlin", witness: "en.wikipedia.org", span: { from: 1861, to: 1865 } };
const JOHNSON = { value: "Andrew Johnson", witness: "en.wikipedia.org", span: { from: 1865, to: 1865 } };
const HOLDS = () => ({ verdict: "holds", because: "stated by the material", refs: ["wp:1"] });

/** Open + fan out + admit in one step, for cases about what comes after. */
function loopWith(candidates, { admission = HOLDS, declaration = decl() } = {}) {
  const grid = freshGrid();
  let log = grid.createLog();
  const opened = openLoop(declaration, { grid, log, broken: "rotation" });
  assert.equal(opened.ok, true, JSON.stringify(opened.refusal));
  log = opened.log;
  const proposed = proposeFrom(opened.loop, { grid, log, stance: "extraction", candidates });
  assert.equal(proposed.ok, true, JSON.stringify(proposed.refusal));
  log = proposed.log;
  const admitted = admit(proposed.loop, { grid, log, admission });
  assert.equal(admitted.ok, true, JSON.stringify(admitted.refusal));
  return { grid, log: admitted.log, loop: admitted.loop };
}

// ── the choreography is READ off the void's own cells ────────────────────────

test("the loop's three stances are read from the declaration, not typed here", () => {
  const c = loopChoreography(decl());
  assert.equal(c.ok, true);
  // DEF cuts, EVA binds, REC composes — the loop's whole spine, derived.
  assert.deepEqual(
    { op: c.propose.op, terrain: c.propose.terrain, stance: c.propose.stance },
    { op: "DEF", terrain: "Lens", stance: "Dissecting" });
  assert.deepEqual(
    { op: c.admit.op, terrain: c.admit.terrain, stance: c.admit.stance },
    { op: "EVA", terrain: "Lens", stance: "Binding" });
  assert.deepEqual(
    { op: c.reopen.op, terrain: c.reopen.terrain, stance: c.reopen.stance },
    { op: "REC", terrain: "Paradigm", stance: "Composing" });
  // DEF and EVA share a terrain and differ only in stance: you cut with
  // the lens, then you bind with it. That is why they are a loop.
  assert.equal(c.propose.terrain, c.admit.terrain);
  assert.notEqual(c.propose.stance, c.admit.stance);
});

test("DEF is the only Dissecting cell in the whole declaration", () => {
  // The single cut in a space otherwise made of clearings, bindings and
  // compositions — and exactly the cell whose absence produced the
  // specimen (a two-filler slot read as holding one).
  const dissecting = decl().cells.filter((cell) => cell.stance === "Dissecting");
  assert.deepEqual(dissecting.map((cell) => cell.op), ["DEF"]);
  assert.equal(dissecting[0].field, "cardinality");
});

test("loopChoreography refuses anything that is not a real declaration", () => {
  const r = loopChoreography({ slot: "x", extent: { from: 1, to: 2 } });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "not_a_declaration");
});

// ── opening: the strongest refusal in the file ───────────────────────────────

test("a space with no anchor refuses to open, and says which operators are missing", () => {
  const grid = freshGrid();
  const partial = declareVoid({ slot: "vice president of Abraham Lincoln", extent: { from: 1861, to: 1865 } }, { cellOf });
  assert.equal(partial.standing, "under-specified");
  const r = openLoop(partial, { grid, log: grid.createLog(), broken: "rotation" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "no_anchor");
  // Not "something is missing" — the cells, by name, with what each asks.
  assert.match(r.refusal.detail, /SIG \(Entity\)/);
  assert.match(r.refusal.detail, /DEF \(Lens\)/);
  assert.ok(r.refusal.undeclared.length >= 5);
});

test("a space with neither an extent nor a numeric cardinality could never commit, and says so", () => {
  const grid = freshGrid();
  const unclosable = declareVoid({ ...LINCOLN_VP, extent: null, dimension: null }, { cellOf });
  const r = openLoop(unclosable, { grid, log: grid.createLog(), broken: "rotation" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "no_closing_condition");
  assert.match(r.refusal.detail, /does not terminate/);
});

test("an undeclared cell that the loop can survive is DISCLOSED, never fatal", () => {
  // The cardinality route stays open with no extent — which is the whole
  // reason the blanket under-specified refusal was wrong: it made this
  // unreachable. `void-shape.js` supports a null constraint on purpose.
  const grid = freshGrid();
  const noExtent = declareVoid({ ...LINCOLN_VP, extent: null, dimension: null, cardinality: 1 }, { cellOf });
  assert.equal(noExtent.standing, "under-specified");
  const opened = openLoop(noExtent, { grid, log: grid.createLog(), broken: "rotation" });
  assert.equal(opened.ok, true, JSON.stringify(opened.refusal));
  assert.deepEqual(opened.loop.underSpecified.map((u) => u.op), ["SEG"]);
  assert.deepEqual(foldLoop(opened.loop).underSpecified.map((u) => u.field), ["extent"]);
});

test("opening without a perturbation is refused — never defaulted on the caller's behalf", () => {
  const grid = freshGrid();
  const r = openLoop(decl(), { grid, log: grid.createLog(), broken: "" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "no_perturbation");
});

test("the opening act lands as a real NUL at Void, and its stance resolves to Clearing", () => {
  const grid = freshGrid();
  const opened = openLoop(decl(), { grid, log: grid.createLog(), broken: "rotation" });
  assert.equal(opened.ok, true);
  const entry = opened.log.entries.at(-1);
  assert.equal(entry.operator, "NUL");
  assert.equal(entry.terrain, "Void");
  // The line says `from differentiate`; the terrain's own grain resolves
  // it to the NUL cell's derived stance without this loop naming it.
  assert.equal(entry.stance.cell, "Differentiate·Ground");
  assert.equal(cellOf("NUL", "Ground").stance, "Clearing");
  assert.equal(entry.broken, "rotation");
});

// ── the ladder ───────────────────────────────────────────────────────────────

test("the ladder descends extraction -> cultivation -> encounter", () => {
  assert.deepEqual(STANCE_LADDER.map((r) => r.stance), ["extraction", "cultivation", "encounter"]);
});

test("proposing from a stance the loop is not standing on is refused by name", () => {
  const grid = freshGrid();
  const opened = openLoop(decl(), { grid, log: grid.createLog(), broken: "rotation" });
  const r = proposeFrom(opened.loop, { grid, log: opened.log, stance: "encounter", candidates: [HAMLIN] });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "wrong_rung");
  assert.equal(r.refusal.standing, "extraction");
});

// ── fan-out, not walk ────────────────────────────────────────────────────────

test("a fan-out lands every candidate as its own DEF before any EVA runs", () => {
  const grid = freshGrid();
  const opened = openLoop(decl(), { grid, log: grid.createLog(), broken: "rotation" });
  const p = proposeFrom(opened.loop, { grid, log: opened.log, stance: "extraction", candidates: [HAMLIN, JOHNSON] });
  assert.equal(p.ok, true);
  const defs = p.log.entries.filter((e) => e.operator === "DEF");
  assert.deepEqual(defs.map((e) => e.object), ["Hannibal Hamlin", "Andrew Johnson"]);
  // Nothing has been evaluated: both are superposed.
  assert.equal(p.log.entries.filter((e) => e.operator === "EVA").length, 0);
  assert.deepEqual(p.loop.candidates.map((c) => c.standing), ["wish", "wish"]);
  assert.deepEqual(p.loop.candidates.map((c) => c.stance), ["extraction", "extraction"]);
});

test("a candidate with no witness is reported, and the rest of the fan-out still lands", () => {
  const grid = freshGrid();
  const opened = openLoop(decl(), { grid, log: grid.createLog(), broken: "rotation" });
  const p = proposeFrom(opened.loop, {
    grid, log: opened.log, stance: "extraction",
    candidates: [{ value: "Andrew Johnson", span: { from: 1865, to: 1865 } }, HAMLIN],
  });
  assert.equal(p.ok, true);
  assert.equal(p.refusals.length, 1);
  assert.equal(p.refusals[0].type, "no_witness");
  assert.deepEqual(p.loop.candidates.map((c) => c.value), ["Hannibal Hamlin"]);
});

test("witness and stance are different facts and both ride every candidate", () => {
  const { loop } = loopWith([{ ...JOHNSON, witness: "self:model" }]);
  const c = loop.candidates[0];
  assert.equal(c.witness, "self:model");   // WHO offers it
  assert.equal(c.stance, "extraction");    // HOW it was reached
});

// ── admission ────────────────────────────────────────────────────────────────

test("EVA lands one act per wish and attaches the verdict as a RESULT, never as a declared field", () => {
  const { log, loop } = loopWith([JOHNSON]);
  const evas = log.entries.filter((e) => e.operator === "EVA");
  assert.equal(evas.length, 1);
  assert.equal(evas[0].terrain, "Lens");
  assert.equal(evas[0].stance.cell, "Relate·Figure");   // Binding, EVA's own cell
  assert.equal(evas[0].verdict, null);                  // never declared in the line
  const result = log.entries.filter((e) => e.kind === taskLog.ENTRY_KINDS.RESULT).at(-1);
  assert.equal(result.verdict, "holds");                // computed, on the RESULT
  assert.equal(loop.candidates[0].standing, "testimony");
});

test("an inconclusive admission leaves the candidate superposed — not refused", () => {
  const { loop } = loopWith([JOHNSON], { admission: () => ({ verdict: null, because: "nothing in the material settles it" }) });
  assert.equal(loop.candidates[0].standing, "undetermined");
  assert.equal(loop.candidates[0].verdict, null);
  assert.deepEqual(foldLoop(loop).undetermined.map((c) => c.value), ["Andrew Johnson"]);
});

test("evaluated-and-inconclusive never pins the ladder the way unevaluated does", () => {
  // `unbound` is the CORRECT and common answer for a source that says
  // nothing about the relation, so a junk candidate nothing can settle
  // must not block the descent — it has been looked at.
  const { grid, log, loop } = loopWith([JOHNSON], { admission: () => ({ verdict: null, because: "silence" }) });
  assert.equal(foldLoop(loop).wishes.length, 0);
  assert.equal(foldLoop(loop).standing, "posture_spent");
  assert.equal(descend(loop, { grid, log, trigger: "nothing here settles it" }).ok, true);
});

test("a re-zeroed ground re-asks what the old one could not settle", () => {
  const { grid, log, loop } = loopWith([JOHNSON], { admission: () => ({ verdict: null, because: "silence" }) });
  const r = reshape(loop, { grid, log, trigger: "the office runs further", revised: decl({ extent: { from: 1861, to: 1869 } }) });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  assert.equal(r.loop.candidates[0].standing, "wish");   // askable again
});

test("a span wholly outside the extent is refused as arithmetic, without consulting the organ", () => {
  let asked = 0;
  const { loop } = loopWith(
    [{ value: "Schuyler Colfax", witness: "en.wikipedia.org", span: { from: 1869, to: 1873 } }],
    { admission: () => { asked += 1; return HOLDS(); } },
  );
  assert.equal(asked, 0, "the declared admission organ must not be consulted for a candidate the arithmetic already excludes");
  assert.equal(loop.candidates[0].standing, "refused");
  assert.equal(loop.candidates[0].refusedBy, "extensional");
  assert.match(loop.candidates[0].because, /1869-1873 lies wholly outside 1861-1865/);
});

// ── the specimen ─────────────────────────────────────────────────────────────

test("THE SPECIMEN: one true filler admitted, and the loop still reports the space short", () => {
  const { loop } = loopWith([JOHNSON]);
  const fold = foldLoop(loop);
  assert.equal(fold.testimony.length, 1);
  // A correct name, and — unlike every wrong answer this produced — the
  // loop knows it is not finished.
  assert.equal(fold.standing, "posture_spent");
  assert.equal(fold.coverage.standing, "incomplete");
  assert.deepEqual([...fold.coverage.voids], [{ from: 1861, to: 1865 }]);
  assert.match(fold.line, /Do not fill this gap from memory/);
});

// ── a space is not covered while it holds a filler it cannot place ───────────

const JOHNSON_UNPLACED = { value: "Andrew Johnson", witness: "en.wikipedia.org" };  // relation stated, no span

test("THE GOOD RESULT: a covered extent plus an admitted filler it cannot place is NOT complete", () => {
  // Measured on the real specimen: Hamlin's own page states 1861-1865 and
  // covers the whole declared extent; Johnson's own page states the
  // relation and states no span at all. "Hamlin, complete" is the wrong
  // reading of those two together.
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  const fold = foldLoop(loop);
  assert.equal(fold.coverage.standing, "covered");          // the extent itself IS covered
  assert.deepEqual([...fold.coverage.unplaced], ["Andrew Johnson"]);
  assert.equal(fold.standing, "unplaced");                  // and the loop still refuses to call it done
  // Both fillers are named in the answer, one of them without an extent.
  assert.match(fold.line, /Hannibal Hamlin \(1861-1865\); Andrew Johnson/);
});

test("committing a space that reads covered only by not counting a filler is refused by name", () => {
  const { grid, log, loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  const r = closeLoop(loop, { grid, log, stance: "closure" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "unplaced_filler");
  assert.deepEqual(r.refusal.unplaced, ["Andrew Johnson"]);
  assert.match(r.refusal.detail, /which is not the same as being covered/);
});

test("covered_but_unplaced names the cell and carries NO suggested extent", () => {
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  const t = reshapeTriggers(loop).find((x) => x.type === "covered_but_unplaced");
  assert.ok(t);
  assert.equal(t.field, "extent");
  // This module can see the grain is wrong and cannot see what the right
  // one would be. Inventing one would be manufactured precision.
  assert.equal(t.suggested, undefined);
  assert.match(t.detail, /too coarse to sit it anywhere or it does not belong/);
});

test("a genuinely SHORT space with an unplaced filler still descends — unplaced never masks a hole", () => {
  // The control for the ordering: `unplaced` overrides a covered reading,
  // never a short one, or the ladder would stop on the wrong finding.
  const { grid, log, loop } = loopWith([JOHNSON_UNPLACED]);
  const fold = foldLoop(loop);
  assert.equal(fold.coverage.standing, "incomplete");
  assert.equal(fold.standing, "posture_spent");
  assert.equal(descend(loop, { grid, log, trigger: "still short" }).ok, true);
});

test("with no extent declared, an unplaced filler blocks nothing — nothing can be placed in an unbounded space", () => {
  const one = declareVoid({ ...LINCOLN_VP, extent: null, dimension: null, cardinality: 1 }, { cellOf });
  const { loop } = loopWith([JOHNSON_UNPLACED], { declaration: one });
  assert.equal(foldLoop(loop).coverage.standing, "unbounded");
  assert.deepEqual([...foldLoop(loop).coverage.unplaced], ["Andrew Johnson"]);
  assert.equal(foldLoop(loop).standing, "covered");   // the cardinality route stays open
});

// ── curiosity: a gap the loop can name is a question it can ask ──────────────

test("CURIOSITY: an unplaceable filler becomes a targeted question, not a filed gap", () => {
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  const qs = whatWouldSettle(loop);
  const q = qs[0];
  assert.equal(q.type, "place_filler");        // asked FIRST — one read, and it can close the space
  assert.equal(q.about, "Andrew Johnson");
  assert.match(q.ask, /when did «Andrew Johnson» hold «was vice president of» under «Abraham Lincoln \(16th president\)»\?/);
  assert.match(q.wouldSettle, /reads covered only by not counting it/);
  // The source that already said yes is the first place to look harder.
  assert.deepEqual([...q.lookFirst], ["en.wikipedia.org"]);
});

test("an uncovered stretch asks about the world; an inconclusive candidate asks last", () => {
  const { loop } = loopWith([JOHNSON, { value: "Someone", witness: "wp" }],
    { admission: (c) => (c.value === "Someone" ? { verdict: null, because: "silence" } : HOLDS()) });
  const qs = whatWouldSettle(loop);
  assert.deepEqual(qs.map((q) => q.type), ["fill_void", "settle_undetermined"]);
  assert.match(qs[0].ask, /who held .* between 1861 and 1865/);
  assert.match(qs[1].ask, /did «Someone» hold/);
});

test("a settled space has nothing to be curious about", () => {
  const { loop } = loopWith([HAMLIN, JOHNSON]);
  assert.equal(foldLoop(loop).standing, "covered");
  assert.deepEqual([...whatWouldSettle(loop)], []);
});

test("THE ANSWER FOLDS BACK IN: placing the filler closes the space", () => {
  // The whole point of being curious. Deeper reading finds 1865 for
  // Johnson, and the space that was `unplaced` becomes `covered`.
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  assert.equal(foldLoop(loop).standing, "unplaced");
  const r = placeFiller(loop, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 }, source: "wp:full-page" });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  assert.equal(foldLoop(r.loop).standing, "covered");
  assert.deepEqual([...foldLoop(r.loop).coverage.unplaced], []);
  assert.deepEqual([...whatWouldSettle(r.loop)], []);
  assert.match(foldLoop(r.loop).line, /Andrew Johnson \(1865-1865\)/);
});

test("placing rebuilds the space rather than appending — the spanless copy does not survive", () => {
  // `fill` is append-only on purpose, so a naive placement would leave both
  // entries and report the filler unplaced forever.
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  const r = placeFiller(loop, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 } });
  assert.equal(r.loop.space.fillers.filter((f) => f.filler === "Andrew Johnson").length, 1);
});

test("placing refuses a span the space cannot contain — widening is REC's act, not a side effect", () => {
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  const r = placeFiller(loop, { filler: "Andrew Johnson", span: { from: 1869, to: 1873 } });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "span_outside_extent");
  assert.match(r.refusal.detail, /concede it with `reshape`/);
});

test("only something already through admission can be placed", () => {
  const { loop } = loopWith([HAMLIN]);
  assert.equal(placeFiller(loop, { filler: "Nobody", span: { from: 1861, to: 1862 } }).refusal.type, "not_admitted");
  assert.equal(placeFiller(loop, { filler: "Hannibal Hamlin", span: { from: 1861, to: 1862 } }).refusal.type, "already_placed");
});

// ── the loop's own law ───────────────────────────────────────────────────────

test("THE LAW: a loop may not close from the posture that proposed its fillers", () => {
  const { grid, log, loop } = loopWith([HAMLIN, JOHNSON]);
  assert.equal(foldLoop(loop).standing, "covered");
  const r = closeLoop(loop, { grid, log, stance: "extraction" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "stance_did_not_change");
  assert.deepEqual(r.refusal.proposedFrom, ["extraction"]);
  assert.match(r.refusal.detail, /the evaluation between them tested nothing/);
});

test("closing while the void is open is refused, and the refusal carries the void line", () => {
  const { grid, log, loop } = loopWith([JOHNSON]);
  const r = closeLoop(loop, { grid, log, stance: "closure" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "void_open");
  assert.match(r.refusal.detail, /1861-1865 is filled by nothing named so far/);
});

test("two covering fillers close from closure, landing a real CON then SYN", () => {
  const { grid, log, loop } = loopWith([HAMLIN, JOHNSON]);
  const r = closeLoop(loop, { grid, log, stance: "closure" });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  const ops = r.log.entries.slice(-2).map((e) => e.operator);
  assert.deepEqual(ops, ["CON", "SYN"]);
  const syn = r.log.entries.at(-1);
  assert.equal(syn.terrain, "Network");
  assert.equal(syn.stance.cell, "Generate·Pattern");   // Composing
  assert.equal(r.loop.closed.by, "coverage");
  assert.deepEqual([...r.loop.closed.fillers], ["Hannibal Hamlin", "Andrew Johnson"]);
});

test("a single filler meeting a declared cardinality closes as testimony, composing nothing", () => {
  // grid.js refuses `synthesize` under two parts, and is right to: you do
  // not compose a whole out of one part. Cardinality is the only route
  // open here, since the extent is deliberately left undeclared.
  const one = declareVoid({ ...LINCOLN_VP, extent: null, dimension: null, cardinality: 1 }, { cellOf });
  const { grid, log, loop } = loopWith([{ value: "Andrew Johnson", witness: "en.wikipedia.org" }], { declaration: one });
  assert.equal(foldLoop(loop).cardinalityMet, true);
  const before = log.entries.length;
  const r = closeLoop(loop, { grid, log, stance: "closure" });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  assert.equal(r.loop.closed.by, "cardinality");
  assert.equal(r.loop.closed.composed, false);
  assert.equal(r.log.entries.length, before, "a one-filler commit lands no further act");
});

// ── descent ──────────────────────────────────────────────────────────────────

test("descending while a wish is untested is refused — a posture is not spent on its own untried candidates", () => {
  const grid = freshGrid();
  const opened = openLoop(decl(), { grid, log: grid.createLog(), broken: "rotation" });
  const p = proposeFrom(opened.loop, { grid, log: opened.log, stance: "extraction", candidates: [JOHNSON] });
  const r = descend(p.loop, { grid, log: p.log, trigger: "nothing else in the material" });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "wishes_outstanding");
  assert.deepEqual(r.refusal.outstanding, ["Andrew Johnson"]);
});

test("a spent posture lands a real REC concession, trigger verbatim, and moves to the next rung", () => {
  const { grid, log, loop } = loopWith([JOHNSON]);
  const trigger = "extraction found no filler for 1861-1865 in the offered passages";
  const r = descend(loop, { grid, log, trigger });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  assert.deepEqual({ from: r.from, to: r.to }, { from: "extraction", to: "cultivation" });
  const rec = r.log.entries.at(-1);
  assert.equal(rec.operator, "REC");
  assert.equal(rec.kind, taskLog.ENTRY_KINDS.EVIDENCE);
  assert.equal(rec.trigger, trigger);          // verbatim, never paraphrased
  assert.equal(rec.concedes, loop.openingId);
  assert.equal(currentRung(r.loop).stance, "cultivation");
  // Conceding the ground does not retract what was already admitted.
  assert.equal(foldLoop(r.loop).testimony.length, 1);
});

test("the ladder refuses to descend past its last rung", () => {
  let { grid, log, loop } = loopWith([JOHNSON]);
  for (const t of ["extraction spent", "cultivation spent"]) {
    const d = descend(loop, { grid, log, trigger: t });
    assert.equal(d.ok, true, JSON.stringify(d.refusal));
    ({ log, loop } = d);
  }
  const d3 = descend(loop, { grid, log, trigger: "encounter spent" });
  assert.equal(d3.ok, true);
  assert.equal(currentRung(d3.loop), null);
  const d4 = descend(d3.loop, { grid, log: d3.log, trigger: "nothing left" });
  assert.equal(d4.ok, false);
  assert.equal(d4.refusal.type, "ladder_exhausted");
});

test("the full descent: extraction is short, cultivation covers it, and the record says which found what", () => {
  let { grid, log, loop } = loopWith([JOHNSON]);
  assert.equal(foldLoop(loop).standing, "posture_spent");

  const d = descend(loop, { grid, log, trigger: "extraction found no filler for 1861-1865" });
  ({ log, loop } = d);
  const p = proposeFrom(loop, { grid, log, stance: "cultivation", candidates: [HAMLIN] });
  ({ log, loop } = p);
  const a = admit(loop, { grid, log, admission: HOLDS });
  ({ log, loop } = a);

  const fold = foldLoop(loop);
  assert.equal(fold.standing, "covered");
  assert.deepEqual(fold.testimony.map((c) => [c.value, c.stance]), [
    ["Andrew Johnson", "extraction"],
    ["Hannibal Hamlin", "cultivation"],
  ]);
  const closed = closeLoop(loop, { grid, log, stance: "closure" });
  assert.equal(closed.ok, true, JSON.stringify(closed.refusal));
});

// ── REC's other trigger: the finding reshapes the space ──────────────────────

test("a filler admitted past the declared extent is a finding about the SPACE, not the filler", () => {
  // Lincoln was elected to a second term; a reading that declared the
  // extent as one term admits a VP whose own span runs past it.
  const { loop } = loopWith([{ value: "Andrew Johnson", witness: "en.wikipedia.org", span: { from: 1865, to: 1869 } }]);
  const triggers = reshapeTriggers(loop);
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].type, "extent_too_small");
  assert.equal(triggers[0].field, "extent");
  assert.deepEqual(triggers[0].suggested, { from: 1861, to: 1869 });
  assert.match(triggers[0].detail, /the space accepted a filler it cannot contain/);
});

test("a space that excludes candidates AND reports itself short is evidence about the space", () => {
  // Found by running the loop over real material: a narrowly declared FDR
  // term refused every VP that named the relation, purely for sitting
  // outside it, while reporting the same space unfilled.
  const { loop } = loopWith([{ value: "Schuyler Colfax", witness: "en.wikipedia.org", span: { from: 1869, to: 1873 } }]);
  const t = reshapeTriggers(loop).find((x) => x.type === "extent_excludes");
  assert.ok(t, "an extensionally-excluded candidate over an open void");
  assert.equal(t.field, "extent");
  assert.deepEqual(t.suggested, { from: 1861, to: 1873 });
  // The claim is precisely what happened: excluded WITHOUT being read.
  assert.match(t.detail, /without ever being read/);
});

test("a space already covered does NOT read an out-of-extent candidate as evidence against itself", () => {
  // The control for the case above: exclusion is only evidence about the
  // extent while the extent is still short. Covered, it is just correct.
  const { loop } = loopWith([
    HAMLIN, JOHNSON,
    { value: "Schuyler Colfax", witness: "en.wikipedia.org", span: { from: 1869, to: 1873 } },
  ]);
  assert.equal(foldLoop(loop).coverage.standing, "covered");
  assert.equal(reshapeTriggers(loop).find((x) => x.type === "extent_excludes"), undefined);
});

test("more admitted fillers than the declared cardinality is a finding about the declaration", () => {
  const two = declareVoid({ ...LINCOLN_VP, cardinality: 1 }, { cellOf });
  const { loop } = loopWith([HAMLIN, JOHNSON], { declaration: two });
  const t = reshapeTriggers(loop).find((x) => x.type === "cardinality_exceeded");
  assert.ok(t, "two admitted fillers against a declared cardinality of one");
  assert.equal(t.field, "cardinality");
  assert.equal(t.suggested, 2);
});

test("a test nothing can pass is a claim about the test — reported once the ladder is spent", () => {
  let { grid, log, loop } = loopWith([JOHNSON], { admission: () => ({ verdict: "refused", because: "no" }) });
  for (const t of ["a", "b", "c"]) ({ log, loop } = descend(loop, { grid, log, trigger: t }));
  const t = reshapeTriggers(loop).find((x) => x.type === "admission_impassable");
  assert.ok(t);
  assert.equal(t.field, "admission");
});

test("reshape lands a REC that SUPERSEDES the opening act — the space it zeroed was the wrong one", () => {
  const { grid, log, loop } = loopWith([{ value: "Andrew Johnson", witness: "en.wikipedia.org", span: { from: 1865, to: 1869 } }]);
  const trigger = reshapeTriggers(loop)[0];
  // The loop's OWN finding must be carriable by the loop's OWN act line:
  // the composition law has no escape syntax, so a generated detail
  // quotes with « » (crown.js's own mark) rather than a straight ".
  assert.ok(!trigger.detail.includes('"'), "a generated trigger must survive its own act line");
  const r = reshape(loop, { grid, log, trigger: trigger.detail, revised: decl({ extent: trigger.suggested }) });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  const rec = r.log.entries.at(-1);
  assert.equal(rec.operator, "REC");
  assert.equal(rec.kind, taskLog.ENTRY_KINDS.SUPERSEDE);   // not EVIDENCE — see void-loop.js's header
  assert.equal(rec.supersedes, loop.openingId);
  assert.deepEqual(r.loop.declaration.extent, { from: 1861, to: 1869 });
  // Everything already earned carries across, and the ladder resets.
  assert.equal(foldLoop(r.loop).testimony.length, 1);
  assert.equal(currentRung(r.loop).stance, "extraction");
  assert.deepEqual(r.loop.reshapes.at(-1).to, { from: 1861, to: 1869 });
});

test("reshaping re-opens a candidate the CONCEDED extent had refused, and leaves a judged one refused", () => {
  const colfax = { value: "Schuyler Colfax", witness: "en.wikipedia.org", span: { from: 1869, to: 1873 } };
  const judged = { value: "Mary Todd Lincoln", witness: "en.wikipedia.org", span: { from: 1861, to: 1865 } };
  const { grid, log, loop } = loopWith([colfax, judged], {
    admission: (c) => (c.value === "Mary Todd Lincoln" ? { verdict: "refused", because: "not a vice president" } : HOLDS()),
  });
  assert.equal(loop.candidates[0].refusedBy, "extensional");
  assert.equal(loop.candidates[1].refusedBy, "declared-admission");

  const r = reshape(loop, { grid, log, trigger: "the office runs to 1873", revised: decl({ extent: { from: 1861, to: 1873 } }) });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  assert.deepEqual([...r.reopened], ["Schuyler Colfax"]);
  assert.deepEqual(r.loop.candidates.map((c) => c.standing), ["wish", "refused"]);
});

test("a reshape that declares exactly what the space already declares is refused as churn", () => {
  const { grid, log, loop } = loopWith([JOHNSON]);
  const r = reshape(loop, { grid, log, trigger: "nothing actually changed", revised: decl() });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "no_change");
  assert.match(r.refusal.detail, /would not terminate/);
});

test("a reshape trigger carrying a clause keyword cannot fracture the act line", () => {
  // "...from the material at 1869" holds `from` and `at` as bare words.
  const { grid, log, loop } = loopWith([JOHNSON]);
  const trigger = "read from the material at Lens: the office runs past 1865";
  const r = reshape(loop, { grid, log, trigger, revised: decl({ extent: { from: 1861, to: 1869 } }) });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  assert.equal(r.log.entries.at(-1).because, trigger);   // verbatim, unfractured
  assert.equal(r.log.entries.at(-1).terrain, "Paradigm");
});

test("a value carrying a double quote is refused, never silently mangled", () => {
  const grid = freshGrid();
  const opened = openLoop(decl(), { grid, log: grid.createLog(), broken: "rotation" });
  const p = proposeFrom(opened.loop, {
    grid, log: opened.log, stance: "extraction",
    candidates: [{ value: 'Andrew "Andy" Johnson', witness: "en.wikipedia.org" }],
  });
  assert.equal(p.refusals[0].type, "unquotable_filler");
  assert.equal(p.loop.candidates.length, 0);
});

test("a committed loop takes no further acts", () => {
  const { grid, log, loop } = loopWith([HAMLIN, JOHNSON]);
  const closed = closeLoop(loop, { grid, log, stance: "closure" });
  for (const [name, r] of [
    ["propose", proposeFrom(closed.loop, { grid, log: closed.log, stance: "extraction", candidates: [HAMLIN] })],
    ["descend", descend(closed.loop, { grid, log: closed.log, trigger: "x" })],
    ["reshape", reshape(closed.loop, { grid, log: closed.log, trigger: "x", revised: decl({ extent: { from: 1861, to: 1869 } }) })],
    ["close", closeLoop(closed.loop, { grid, log: closed.log, stance: "cultivation" })],
  ]) {
    assert.equal(r.ok, false, name);
    assert.equal(r.refusal.type, "loop_closed", name);
  }
});
