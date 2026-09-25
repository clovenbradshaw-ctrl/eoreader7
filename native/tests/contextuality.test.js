// contextuality.test.js — kernel/contextuality.js pinned on the canonical
// possibilistic models (2026-09-25). Falsifiers, each named for why it could
// be wrong:
//   1. Hardy's model not read as logically contextual — could be wrong if the
//      extension search found an extension for (a1=0,b1=0), or none for the
//      sections that do extend.
//   2. the PR box not read as strongly contextual — could be wrong if any
//      global section slipped through the parity constraints.
//   3. a product (classical) model not read as noncontextual.
//   4. a model whose overlaps disagree not read as signalling, or read as
//      contextual instead.
//   5. THE LEMMA: one section per context with consistent overlaps is always
//      gluable — could be wrong if the union failed to restrict correctly.
//   6. the budget wall: an exhausted search refuses, typed, never verdicts.
//   7. contextualityOfSteps groups instances by slot set into contexts.
//   8. the cell is SYN at Pattern grain, terrain Network, per cube.js.
//   9. every model with a global section is at most logically contextual.
import test from "node:test";
import assert from "node:assert/strict";
import { contextuality, contextualityOfSteps, empiricalModel, signallingPairs, extend, CELL, VERDICTS } from "../kernel/contextuality.js";
import { ABSENT } from "../kernel/bayes-surprise.js";
import { cellOf } from "../kernel/cube.js";

const ctx = (id, pairs) => ({ id, sections: pairs.map(([a, b]) => Object.fromEntries([[id.split("|")[0], a], [id.split("|")[1], b]])) });

// Hardy (possibilistic): (a1,b1) all four; (a1,b2) and (a2,b1) exclude 00; (a2,b2) excludes 11.
const HARDY = [
  ctx("a1|b1", [[0, 0], [0, 1], [1, 0], [1, 1]]),
  ctx("a1|b2", [[0, 1], [1, 0], [1, 1]]),
  ctx("a2|b1", [[0, 1], [1, 0], [1, 1]]),
  ctx("a2|b2", [[0, 0], [0, 1], [1, 0]]),
];
// PR box: a xor b = i·j.
const PR = [
  ctx("a1|b1", [[0, 0], [1, 1]]),
  ctx("a1|b2", [[0, 0], [1, 1]]),
  ctx("a2|b1", [[0, 0], [1, 1]]),
  ctx("a2|b2", [[0, 1], [1, 0]]),
];
// Classical: every context's support is the full product — always gluable.
const PRODUCT = [
  ctx("a1|b1", [[0, 0], [0, 1], [1, 0], [1, 1]]),
  ctx("a1|b2", [[0, 0], [0, 1], [1, 0], [1, 1]]),
  ctx("a2|b1", [[0, 0], [0, 1], [1, 0], [1, 1]]),
  ctx("a2|b2", [[0, 0], [0, 1], [1, 0], [1, 1]]),
];

test("1. Hardy's model is logically contextual: exactly (a1=0,b1=0) has no global extension", () => {
  const r = contextuality(HARDY, { budget: 10000 });
  assert.equal(r.verdict, "logically_contextual", r.basis);
  assert.equal(r.signalling.length, 0, "Hardy is no-signalling");
  assert.equal(r.sections, 13, "4 + 3 + 3 + 3 local sections");
  assert.equal(r.unextendable.length, 1);
  assert.deepEqual(r.unextendable[0], { context: "a1|b1", section: { a1: "0", b1: "0" } });
  assert.equal(r.extendable, 12);
  assert.equal(r.contextualFraction, null, "the LP is owed, reported null with its basis");
  assert.match(r.owed[0], /contextual fraction/);
});

test("2. the PR box is strongly contextual: no-signalling everywhere and no global section at all", () => {
  const r = contextuality(PR, { budget: 10000 });
  assert.equal(r.verdict, "strongly_contextual", r.basis);
  assert.equal(r.signalling.length, 0);
  assert.equal(r.gluable, false);
  assert.equal(r.unextendable.length, r.sections);
});

test("3. a product model is noncontextual: every local section extends", () => {
  const r = contextuality(PRODUCT, { budget: 10000 });
  assert.equal(r.verdict, "noncontextual", r.basis);
  assert.equal(r.unextendable.length, 0);
  assert.equal(r.extendable, r.sections);
});

test("4. overlaps that disagree are SIGNALLING — a direct influence, named with the side it is on; never read as contextual", () => {
  const r = contextuality([
    { id: "xy", sections: [{ x: 0, y: 0 }] },
    { id: "xz", sections: [{ x: 1, z: 0 }] },
  ], { budget: 1000 });
  assert.equal(r.verdict, "signalling", r.basis);
  assert.equal(r.signalling.length, 1);
  assert.deepEqual(r.signalling[0].shared, ["x"]);
  assert.deepEqual(r.signalling[0].onlyIn, { xy: [{ x: "0" }], xz: [{ x: "1" }] });
  assert.equal(r.gluable, false, "and no single reading fits both — reported beside, not as the verdict");
  assert.ok(r.owed.some((o) => /Contextuality-by-Default/.test(o)), "CbD is named as owed for a signalling system");
});

test("5. THE LEMMA: one section per context with consistent overlaps is always gluable (so a one-reading-per-place ledger can only be signalling or noncontextual)", () => {
  const r = contextuality([
    { id: "xy", sections: [{ x: 0, y: 1 }] },
    { id: "yz", sections: [{ y: 1, z: 0 }] },
    { id: "xz", sections: [{ x: 0, z: 0 }] },
  ], { budget: 1000 });
  assert.equal(r.verdict, "noncontextual", r.basis);
  const model = empiricalModel([{ id: "xy", sections: [{ x: 0, y: 1 }] }, { id: "yz", sections: [{ y: 1, z: 0 }] }]);
  const e = extend(model, new Map([["x", "0"], ["y", "1"]]), 100);
  assert.equal(e.found, true);
  assert.deepEqual([...e.section], [["x", "0"], ["y", "1"], ["z", "0"]], "the union is the global section");
});

test("6. the budget is a declared wall: exhausting it refuses, typed, with the partial count — never a verdict", () => {
  const r = contextuality(HARDY, { budget: 3 });
  assert.equal(r.gap, "search_budget_exceeded");
  assert.equal(r.verdict, undefined);
  assert.equal(r.budget, 3);
  assert.throws(() => extend(empiricalModel(HARDY), new Map(), 0), /budget is declared/);
});

test("7. contextualityOfSteps groups instances by their slot set; a slot an instance lacks is ABSENT, not a missing measurement", () => {
  const steps = [
    { "@1": "a", "@2": "b" }, { "@1": "a", "@2": "c" },
    { "@1": "a", "@2": "b", "@3": "d" }, { "@1": "a", "@2": "c", "@3": "d" },
  ];
  const r = contextualityOfSteps(steps, { budget: 1000 });
  assert.equal(r.forms, 2);
  assert.equal(r.instances, 4);
  assert.equal(r.verdict, "noncontextual", r.basis);
  const model = empiricalModel([{ id: "m", sections: [new Map([["s", 1]]), new Map([["s", 1], ["t", 2]])] }]);
  assert.equal(model.contexts[0].support.length, 2);
  assert.equal(model.contexts[0].support[0].get("t"), ABSENT);
  assert.deepEqual(contextualityOfSteps([], { budget: 10 }), { gap: "no_context", schema: "EOContextuality@1", contexts: 0, basis: "no context carries a measurement: nothing to glue", forms: 0, instances: 0 });
});

test("8. the cell is SYN·Pattern — Generate·Structure over the whole cover, terrain Network", () => {
  const c = cellOf(CELL.op, CELL.grain);
  assert.equal(c.mode, "Generate");
  assert.equal(c.domain, "Structure");
  assert.equal(c.terrain, "Network");
  assert.deepEqual(VERDICTS, ["signalling", "noncontextual", "logically_contextual", "strongly_contextual"]);
});

test("9. every model with a global section is at most logically contextual; signalling pairs are computed independently of gluing", () => {
  for (const m of [HARDY, PRODUCT]) {
    const r = contextuality(m, { budget: 10000 });
    assert.ok(r.gluable);
    assert.notEqual(r.verdict, "strongly_contextual");
  }
  assert.equal(signallingPairs(empiricalModel(PR)).length, 0);
});
