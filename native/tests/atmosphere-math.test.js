import test from "node:test";
import assert from "node:assert/strict";
import { interpretiveAtmosphereFactorField } from "../kernel/atmosphere-math.js";

const materiality = Object.freeze({ makesDifference: true, reasons: Object.freeze([{ kind: "fixture" }]) });

function obligation(id, ground, constraint = null, openedAt = 1) {
  return Object.freeze({
    schema: "EOObligation@1",
    id,
    status: "open",
    openedAt,
    grounds: Object.freeze([ground]),
    alternatives: Object.freeze([]),
    consequences: Object.freeze([{ kind: "identity", ref: ground }]),
    distinction: Object.freeze({ materiality }),
    ...(constraint ? { constraint: Object.freeze(constraint) } : {}),
  });
}

function binaryConstraint(variable, leftCost, rightCost) {
  return {
    variables: Object.freeze([variable]),
    assignments: Object.freeze([
      Object.freeze({ values: Object.freeze({ [variable]: "left" }), cost: leftCost }),
      Object.freeze({ values: Object.freeze({ [variable]: "right" }), cost: rightCost }),
    ]),
  };
}

test("shared Fold variables create coupling topology but do not fabricate energetic tension", () => {
  const field = interpretiveAtmosphereFactorField([
    obligation("obl:a", "ref:x"),
    obligation("obl:b", "ref:x"),
  ], { sequence: 5 });
  assert.equal(field.model, "interpretive_constraint_factor_graph");
  assert.equal(field.factorCount, 2);
  assert.equal(field.variableCount, 2, "the shared ground plus nested consequence reference are explicit variable nodes");
  assert.ok(field.couplingCount > 0);
  assert.equal(field.tensionAvailable, false);
  assert.equal(field.tension, null);
  assert.equal(field.frustration.reason, "no_explicit_constraint_costs");
});

test("compatible explicit constraints have zero frustration even when strongly coupled", () => {
  const variable = "ref:x";
  const field = interpretiveAtmosphereFactorField([
    obligation("obl:a", variable, binaryConstraint(variable, 0, 2)),
    obligation("obl:b", variable, binaryConstraint(variable, 0, 3)),
  ]);
  assert.equal(field.tensionAvailable, true);
  assert.equal(field.frustration.satisfiable, true);
  assert.equal(field.frustration.localMinimum, 0);
  assert.equal(field.frustration.globalMinimum, 0);
  assert.equal(field.tension, 0);
});

test("incompatible local optima produce irreducible frustration", () => {
  const variable = "ref:x";
  const field = interpretiveAtmosphereFactorField([
    obligation("obl:left", variable, binaryConstraint(variable, 0, 1)),
    obligation("obl:right", variable, binaryConstraint(variable, 1, 0)),
  ]);
  assert.equal(field.tensionAvailable, true);
  assert.equal(field.frustration.localMinimum, 0, "each obligation is independently satisfiable");
  assert.equal(field.frustration.globalMinimum, 1, "no global assignment satisfies both local minima");
  assert.equal(field.frustration.frustration, 1);
  assert.equal(field.tension, 1);
});

test("persistence changes unresolved exposure but not instantaneous constraint frustration", () => {
  const variable = "ref:x";
  const obligations = [
    obligation("obl:left", variable, binaryConstraint(variable, 0, 1), 1),
    obligation("obl:right", variable, binaryConstraint(variable, 1, 0), 1),
  ];
  const early = interpretiveAtmosphereFactorField(obligations, { sequence: 2 });
  const late = interpretiveAtmosphereFactorField(obligations, { sequence: 10 });
  assert.ok(late.persistenceExposure > early.persistenceExposure);
  assert.equal(late.tension, early.tension);
});

test("no live material constraints is exactly zero tension, not unknown tension", () => {
  const field = interpretiveAtmosphereFactorField([]);
  assert.equal(field.tensionAvailable, true);
  assert.equal(field.tension, 0);
  assert.equal(field.frustration.reason, "no_live_material_constraints");
});
