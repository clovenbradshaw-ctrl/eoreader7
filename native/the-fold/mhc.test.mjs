// node --test mhc.test.mjs
//
// Conformance for the MHC measuring door. These are the WALLS — the axiom
// arms, the refused-vs-failed distinction, the quantal rule, and the refusal
// to read a stage across an unmeasured order. They are deliberately organ-free
// (every task and arm here is a plain function) for the same reason
// grid.test.mjs keeps its parser cases separate from its capacity cases: the
// machinery's own guarantees must stay testable wherever this repo is checked
// out, including where the sibling engine is absent. The battery bound to the
// REAL organs is eval/mhc-battery.mjs, a re-runnable driver, matching P19's
// and P27's own posture for measurement drivers.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ORDERS,
  GIVER,
  AXIOMS,
  SYMBOLIC_FLOOR,
  FLOOR_REASON,
  ITEM_REFUSALS,
  orderOf,
  declareItem,
  checkAxiom1,
  runItem,
  runBattery,
  stageFrom,
  contentIndependence,
} from "./mhc.js";

// A whole item in one line. Every arm defaults to the CORRECT value for a
// genuine order-N task — which is `false`, because all three arms are
// negative controls: each one must fail to accomplish the task.
const item = (over = {}) => ({
  id: "i",
  order: 6,
  organ: "test",
  assembly: "hand-chained organs (an experiment, not the host reader) — READING-POLICY P0",
  stages: ["perception"],
  organizes: "coordinates its constituents",
  definedInTermsOf: ["c"],
  task: async () => true,
  arms: { lowerOrder: async () => false, arbitrary: async () => false, discrimination: async () => false },
  ...over,
});
const floorItem = (over = {}) =>
  item({ id: "c", order: SYMBOLIC_FLOOR, definedInTermsOf: [], ...over });

// Every battery in this file declares its priors and its assembly, because
// READING-POLICY P3 and P0 require it of every reported run — including the
// ones that exist only to exercise a wall.
const runBattery2 = (items, ctx = {}) =>
  runBattery(items, ctx, { priors: [], assembly: "conformance — no organs, no material" });

// ── the received table is received ────────────────────────────────────────

test("the sixteen orders are Commons's, complete and in sequence, with the giver named", () => {
  assert.equal(ORDERS.length, 17, "orders 0 through 16 inclusive");
  assert.deepEqual(
    ORDERS.map((o) => o.order),
    Array.from({ length: 17 }, (_, i) => i),
  );
  assert.equal(orderOf(5).name, "Nominal");
  assert.equal(orderOf(11).name, "Formal");
  assert.equal(orderOf(13).name, "Metasystematic");
  assert.match(GIVER.authors, /Commons/);
  assert.match(GIVER.primary, /Beyond formal operations/);
});

test("the discrimination arm is attributed to this battery, never to Commons", () => {
  // The three real axioms carry Commons as giver; the fourth control is this
  // repo's own addition and says so. Borrowing authority for an invented
  // check is exactly what naming a giver exists to prevent.
  const commons = AXIOMS.filter((a) => a.axiom !== null);
  assert.equal(commons.length, 3);
  for (const a of commons) assert.equal(a.giver, "Commons");
  const ours = AXIOMS.find((a) => a.axiom === null);
  assert.match(ours.giver, /NOT Commons/);
  assert.match(ours.checkedBy, /discrimination/);
});

test("orders 0-4 are out of scope by construction, not an unmeasured gap", () => {
  assert.equal(SYMBOLIC_FLOOR, 5);
  assert.equal(FLOOR_REASON.gap, "out_of_scope_by_construction");
  assert.match(FLOOR_REASON.detail, /no sensor/);
});

// ── axiom 1: defined in terms of the NEXT lower order ─────────────────────

test("an item above the floor must name its constituents; the floor item need not", () => {
  assert.equal(declareItem(floorItem()).ok, true);
  const bad = declareItem(item({ definedInTermsOf: [] }));
  assert.equal(bad.ok, false);
  assert.match(bad.refusal.detail, /must name its constituents \(axiom 1\)/);
});

test("a constituent two orders down is refused — the MHC's orders do not skip", () => {
  const items = [floorItem(), declareItem(item({ order: 7, definedInTermsOf: ["c"] })).item];
  const checked = checkAxiom1([declareItem(floorItem()).item, items[1]]);
  assert.equal(checked.held, false);
  assert.match(checked.findings[0].detail, /requires the next lower order \(6\)/);
});

test("a constituent that names no real item is refused, and the item never runs", async () => {
  let ran = false;
  const report = await runBattery2([
    floorItem(),
    item({ definedInTermsOf: ["nope"], task: async () => { ran = true; return true; } }),
  ]);
  const row = report.items.find((r) => r.id === "i");
  assert.equal(row.status, "refused");
  assert.equal(row.reason, ITEM_REFUSALS.CONSTITUENT_MISSING);
  assert.equal(ran, false, "a refused item must not be executed — its number would be unreadable");
});

// ── axiom 2/3 as arms ─────────────────────────────────────────────────────

test("an item that states no coordination is refused (axiom 2)", () => {
  const bad = declareItem(item({ organizes: "  " }));
  assert.equal(bad.ok, false);
  assert.match(bad.refusal.detail, /coordination it performs/);
});

test("an item missing an arm is refused — a coordination nobody can perturb is not one", () => {
  const bad = declareItem(item({ arms: { lowerOrder: async () => false, arbitrary: async () => false } }));
  assert.equal(bad.ok, false);
  assert.match(bad.refusal.detail, /missing the discrimination arm/);
});

test("when the constituents alone accomplish the task, the item is REFUSED, not passed", async () => {
  const r = await runItem(declareItem(item({ arms: { ...item().arms, lowerOrder: async () => true } })).item);
  assert.equal(r.status, "refused");
  assert.equal(r.reason, ITEM_REFUSALS.LOWER_ORDER_SUFFICES);
  assert.match(r.detail, /UNMEASURED here, not failing/);
});

test("when an arbitrary re-coordination still succeeds, the item is REFUSED (axiom 3)", async () => {
  const r = await runItem(declareItem(item({ arms: { ...item().arms, arbitrary: async () => true } })).item);
  assert.equal(r.status, "refused");
  assert.equal(r.reason, ITEM_REFUSALS.ARBITRARY_COORDINATION);
  assert.match(r.detail, /arbitrary chaining/);
});

test("a task that also succeeds on unsupporting material is REFUSED as indiscriminate", async () => {
  const r = await runItem(declareItem(item({ arms: { ...item().arms, discrimination: async () => true } })).item);
  assert.equal(r.status, "refused");
  assert.equal(r.reason, ITEM_REFUSALS.INDISCRIMINATE);
  assert.match(r.detail, /not Commons/);
});

test("the arms run BEFORE the task — a mis-declared item never produces a performance number", async () => {
  let taskRan = false;
  await runItem(
    declareItem(
      item({
        task: async () => { taskRan = true; return true; },
        arms: { ...item().arms, lowerOrder: async () => true },
      }),
    ).item,
  );
  assert.equal(taskRan, false);
});

// ── quantal, and the refused/failed/unmeasured trichotomy ─────────────────

test("scoring is quantal: a task returns completed or not, and `false` is a real failure", async () => {
  const r = await runItem(declareItem(item({ task: async () => ({ completed: false, detail: "half of it" }) })).item);
  assert.equal(r.status, "failed");
  assert.equal(r.detail, "half of it");
});

test("an unreachable organ is UNMEASURED, never a failure", async () => {
  // The distinction this whole module turns on: an absent organ says nothing
  // about the system's capacity, and must never be scored as if it did.
  const thrown = await runItem(declareItem(item({ task: async () => { throw new Error("no engine on this disk"); } })).item);
  assert.equal(thrown.status, "unmeasured");
  assert.equal(thrown.reason, ITEM_REFUSALS.ORGAN_UNREACHABLE);
  assert.match(thrown.detail, /no engine on this disk/);

  const declaredUnreachable = await runItem(
    declareItem(item({ task: async () => ({ unreachable: true, detail: "organ absent" }) })).item,
  );
  assert.equal(declaredUnreachable.status, "unmeasured");

  const armUnreachable = await runItem(
    declareItem(item({ arms: { ...item().arms, arbitrary: async () => { throw new Error("gone"); } } })).item,
  );
  assert.equal(armUnreachable.status, "unmeasured");
  assert.match(armUnreachable.detail, /arbitrary arm could not run/);
});

test("a malformed item is reported without killing the battery", async () => {
  const report = await runBattery2([floorItem(), { id: "junk", order: 99 }]);
  assert.equal(report.malformed.length, 1);
  assert.match(report.malformed[0].detail, /not one of the sixteen/);
  assert.equal(report.items.length, 1, "the well-formed item still ran");
});

test("an order passes only if every item at it passes — conjunctive, no partial credit", async () => {
  const report = await runBattery2([
    floorItem({ id: "a" }),
    floorItem({ id: "b", task: async () => false }),
  ]);
  const row = report.orders.find((o) => o.order === SYMBOLIC_FLOOR);
  assert.equal(row.status, "failed");
  assert.equal(row.failedCount, 1);
});

test("an order carries its failures and its gaps apart, never collapsed to one word", async () => {
  const report = await runBattery2([
    floorItem({ id: "a", task: async () => false }),
    floorItem({ id: "b", task: async () => { throw new Error("absent"); } }),
  ]);
  const row = report.orders.find((o) => o.order === SYMBOLIC_FLOOR);
  assert.equal(row.status, "failed");
  assert.equal(row.failedCount, 1);
  assert.equal(row.unmeasuredCount, 1);
});

// ── stage: the contiguity rule ────────────────────────────────────────────

const chain = (through, over = {}) => {
  const out = [floorItem()];
  let prev = "c";
  for (let n = SYMBOLIC_FLOOR + 1; n <= through; n += 1) {
    const id = `i${n}`;
    out.push(item({ id, order: n, definedInTermsOf: [prev], ...(over[n] ?? {}) }));
    prev = id;
  }
  return out;
};

test("stage is the highest order in the contiguous run of passes from the floor", async () => {
  const s = stageFrom(await runBattery2(chain(8)));
  assert.equal(s.stage, 8);
  assert.equal(s.stageName, "Primary");
  assert.equal(s.cappedBy.status, "no_item_declared");
});

test("a measured failure is a real ceiling and is typed as one", async () => {
  const s = stageFrom(await runBattery2(chain(9, { 8: { task: async () => false } })));
  assert.equal(s.stage, 7);
  assert.equal(s.ceilingIsReal, true);
  assert.match(s.cappedBy.detail, /a real ceiling/);
});

test("no stage may be read across an UNMEASURED order, and a pass above it stays isolated", async () => {
  // Order 8's item is mis-declared (its constituents alone suffice), so
  // nothing is known about the system at 8. Order 9 passes anyway. The stage
  // is 7, the cap names the gap, and 9 is carried as an observation that is
  // explicitly NOT folded into the number.
  const s = stageFrom(
    await runBattery2(chain(9, { 8: { arms: { ...item().arms, lowerOrder: async () => true } } })),
  );
  assert.equal(s.stage, 7);
  assert.equal(s.ceilingIsReal, false, "an unmeasured order is not a ceiling");
  assert.match(s.cappedBy.detail, /UNMEASURED/);
  assert.match(s.cappedBy.detail, new RegExp(ITEM_REFUSALS.LOWER_ORDER_SUFFICES));
  assert.deepEqual(s.isolated, [{ order: 9, name: "Concrete" }]);
});

test("a battery with no item at the floor reports no stage at all", async () => {
  const s = stageFrom(await runBattery2([item({ order: 7, definedInTermsOf: ["c"] }), item({ id: "c", order: 6, definedInTermsOf: ["x"] })]));
  assert.equal(s.stage, null);
  assert.equal(s.cappedBy.order, SYMBOLIC_FLOOR);
});

// ── content-independence ──────────────────────────────────────────────────

test("content-independence is refused as unexamined below two materials", async () => {
  const one = await runBattery2(chain(7));
  const c = contentIndependence([{ material: "a", report: one }]);
  assert.equal(c.gap, "not_examined");
});

test("the same profile across different content holds", async () => {
  const a = await runBattery2(chain(7));
  const b = await runBattery2(chain(7));
  const c = contentIndependence([{ material: "a", report: a }, { material: "b", report: b }]);
  assert.equal(c.held, true);
  assert.equal(c.violations.length, 0);
  assert.equal(c.performance.length, 0);
});

test("a performance difference is NOT a content-independence violation", async () => {
  // The MHC separates task from performance precisely so that one performer
  // can meet an order in one domain and fail it in another. Both runs here
  // measured a well-formed order-7 task; the system completed one. That is
  // ordinary, and reporting it as "the item is reading content" — which an
  // earlier version of this function did — is simply false.
  const a = await runBattery2(chain(7));
  const c = await runBattery2(chain(7, { 7: { task: async () => false } }));
  const split = contentIndependence([{ material: "a", report: a }, { material: "c", report: c }]);
  assert.equal(split.held, true, "the scale's claim is untouched by a performance difference");
  assert.equal(split.violations.length, 0);
  assert.equal(split.performance.length, 1);
  assert.equal(split.performance[0].order, 7);
  assert.deepEqual(
    split.performance[0].cells.map((x) => x.status),
    ["passed", "failed"],
  );
});

test("an item valid on one material and MIS-DECLARED on another IS a violation", async () => {
  // This is the real thing the scale forbids: the item's order-hood changed
  // with the content.
  const a = await runBattery2(chain(7));
  const c = await runBattery2(chain(7, { 7: { arms: { ...item().arms, arbitrary: async () => true } } }));
  const split = contentIndependence([{ material: "a", report: a }, { material: "c", report: c }]);
  assert.equal(split.held, false);
  assert.equal(split.violations.length, 1);
  assert.equal(split.violations[0].order, 7);
  assert.deepEqual(
    split.violations[0].cells.map((x) => x.validity),
    ["valid", "mis-declared"],
  );
});

test("a material that offers no probe is neither a violation nor a performance difference", async () => {
  const a = await runBattery2(chain(7));
  const c = await runBattery2(chain(7, { 7: { task: async () => ({ unreachable: true, detail: "no specimen here" }) } }));
  const split = contentIndependence([{ material: "a", report: a }, { material: "c", report: c }]);
  assert.equal(split.held, true);
  assert.equal(split.violations.length, 0);
  assert.equal(split.performance.length, 0);
  assert.equal(split.noProbe.length, 1);
  assert.equal(split.noProbe[0].order, 7);
});

// ── what READING-POLICY binds (P0, P2, P3, A9/A10) ────────────────────────

test("an item must name the assembly it was measured on (P0)", () => {
  const bad = declareItem(item({ assembly: "   " }));
  assert.equal(bad.ok, false);
  assert.match(bad.refusal.detail, /assembly it was measured on \(READING-POLICY P0\)/);
});

test("an item must name the reading stages it uses (P2)", () => {
  const bad = declareItem(item({ stages: [] }));
  assert.equal(bad.ok, false);
  assert.match(bad.refusal.detail, /reading stages it uses \(READING-POLICY P2\)/);
});

test("an undeclared prior list is a typed gap on the report's face (P3)", async () => {
  // P3: a run that does not say which priors were injected has not said which
  // reader it measured. An empty DECLARED list is a different, legitimate
  // statement and is carried as such.
  const undeclared = await runBattery([floorItem()], {}, { assembly: "x" });
  assert.equal(undeclared.priors.declared, false);
  assert.equal(undeclared.priors.gap, "priors_undeclared");

  const declared = await runBattery([floorItem()], {}, { priors: ["lang/en"], assembly: "x" });
  assert.equal(declared.priors.declared, true);
  assert.deepEqual(declared.priors.injected, ["lang/en"]);
});

test("a report that names no assembly says so rather than implying one (P0)", async () => {
  const r = await runBattery([floorItem()], {}, { priors: [] });
  assert.equal(r.assembly.gap, "assembly_unnamed");
  assert.match(r.assembly.detail, /READING-POLICY P0/);
});

test("an arm whose perturbation never reached the task leaves the item UNMEASURED, never passed (A10)", async () => {
  // THE rule this module's arms live under: "a statistic insensitive to its
  // perturbation fails invisibly and globally." An arm reporting
  // `perturbed: false` has tested nothing, and reading its `completed: false`
  // as "axiom 3 held" is that exact invisible failure.
  const r = await runItem(
    declareItem(
      item({
        arms: {
          ...item().arms,
          arbitrary: async () => ({ completed: false, perturbed: false, detail: "the shuffle left the input byte-identical" }),
        },
      }),
    ).item,
  );
  assert.equal(r.status, "unmeasured");
  assert.equal(r.reason, ITEM_REFUSALS.UNLICENSED_PERTURBATION);
  assert.match(r.detail, /byte-identical/);
  assert.match(r.detail, /invisibly and globally/);
});

test("an unlicensed arm is caught even when the item would otherwise have passed", async () => {
  let taskRan = false;
  const r = await runItem(
    declareItem(
      item({
        task: async () => { taskRan = true; return true; },
        arms: { ...item().arms, lowerOrder: async () => ({ completed: false, perturbed: false, detail: "no constituent was withheld" }) },
      }),
    ).item,
  );
  assert.equal(r.status, "unmeasured");
  assert.equal(taskRan, false, "an item whose arm tested nothing must not produce a performance number");
});

test("an arm may report plural seeded grounds, and ANY draw accomplishing the task refuses the item (A9)", async () => {
  // "One null is not a null" — an arm may run at several seeds. The cut is
  // structural, not tuned: if even one arbitrary re-coordination accomplishes
  // the task, the coordination is reachable arbitrarily. The RATE is carried
  // so a reader sees 1-of-20 and 20-of-20 differently.
  const clean = await runItem(
    declareItem(item({ arms: { ...item().arms, arbitrary: async () => ({ completed: false, draws: 20, fired: 0 }) } })).item,
  );
  assert.equal(clean.status, "passed");
  assert.equal(clean.arms.arbitrary.draws, 20);
  assert.equal(clean.arms.arbitrary.fired, 0);

  const leaky = await runItem(
    declareItem(item({ arms: { ...item().arms, arbitrary: async () => ({ completed: true, draws: 20, fired: 1 }) } })).item,
  );
  assert.equal(leaky.status, "refused");
  assert.equal(leaky.reason, ITEM_REFUSALS.ARBITRARY_COORDINATION);
  assert.equal(leaky.arms.arbitrary.fired, 1);
});

test("an item carries its assembly and stages onto its result, so no report has to reconstruct them", async () => {
  const r = await runItem(declareItem(item({ stages: ["perception", "typed, directional relation"] })).item);
  assert.match(r.assembly, /hand-chained/);
  assert.deepEqual(r.stages, ["perception", "typed, directional relation"]);
});
