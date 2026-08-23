import test from "node:test";
import assert from "node:assert/strict";
import * as native from "../kernel/index.js";
import * as legacy from "../../legacy-eoreader6.1/packages/engine/dynamics/index.js";

const materiality = Object.freeze({ makesDifference: true, reasons: Object.freeze([{ kind: "fixture_consequence" }]) });
const openA = { id: "obl:a", status: "open", openedAt: 2, grounds: ["ref:x"], alternatives: ["ref:y"], consequences: [{ kind: "identity", ref: "ref:z" }], distinction: { materiality } };
const openB = { id: "obl:b", status: "strengthened", openedAt: 4, grounds: ["ref:y"], alternatives: [], consequences: [{ kind: "boundary", ref: "ref:q" }], distinction: { materiality } };

test("surprise is derived from consequential DeltaFold rather than raw observation novelty", () => {
  const delta = native.deltaFold([
    native.eoOperation({ op: "REC", grain: "Figure", witness: "obs:1", consequence: "recanonicalized identity", payload: { action: "provisional", value: { id: "ref:a" } } }),
    native.eoOperation({ op: "NUL", grain: "Ground" }),
  ], { id: "delta:1" });
  const n = native.deriveSurprise(delta);
  const l = legacy.deriveSurprise(delta);
  assert.deepEqual(n, l);
  assert.equal(n.operations.length, 1);
  assert.equal(n.recanonicalizations.length, 1);
  assert.deepEqual(n.downstreamConsequences, ["recanonicalized identity"]);
});

test("tension preserves unresolved consequential structure while v7 derives its magnitude from Atmosphere math", () => {
  const fold = native.receivedGround({ sequence: 7, obligations: [openA, openB, { id: "obl:closed", status: "resolved", distinction: { materiality } }] });
  const n = native.deriveTension(fold);
  assert.deepEqual(n.obligations.map((o) => o.id), ["obl:a", "obl:b"]);
  assert.equal(n.schema, "TensionProfile@2");
  assert.equal(n.field.model, "coupled_unresolved_potential_field");
  assert.ok(n.energy > 0);
  assert.ok(n.couplingEnergy > 0);
  assert.equal(n.interactionNetwork.length, 1);
  assert.equal(n.interactionNetwork[0].shared, 1);
  assert.deepEqual(n.persistence.map((item) => item.value), [6, 4]);

  // Preserve the semantic boundary inherited from 6.1: resolved structure is
  // absent and persistence is a function of the recursive sequence. We no
  // longer require byte-for-byte equality with 6.1's count/overlap profile.
  const legacyFold = native.receivedGround({ sequence: 7, obligations: [
    { ...openA, consequences: ["ref:z"] },
    { ...openB, consequences: ["ref:q"] },
    { id: "obl:closed", status: "resolved" },
  ] });
  const l = legacy.deriveTension(legacyFold);
  assert.deepEqual(l.obligations.map((o) => o.id), n.obligations.map((o) => o.id));
  assert.deepEqual(l.persistence, n.persistence);
});

test("non-material unresolved questions do not create tension", () => {
  const fold = native.receivedGround({ sequence: 7, obligations: [{ ...openA, id: "obl:dormant", distinction: { materiality: { makesDifference: false } } }] });
  const tension = native.deriveTension(fold);
  assert.equal(tension.obligations.length, 0);
  assert.equal(tension.energy, 0);
});

test("release requires a witnessed transformation that actually closes an obligation", () => {
  const before = native.receivedGround({ sequence: 4, obligations: [openA] });
  const delta = native.deltaFold([
    native.eoOperation({ op: "REC", grain: "Ground", witness: "obs:resolution", payload: { action: "resolve-obligation", id: "obl:a", status: "resolved" } }),
  ], { id: "delta:release" });
  const after = native.applyDelta(before, delta);
  const n = native.deriveRelease(delta, before, after);
  const l = legacy.deriveRelease(delta, before, after);
  assert.deepEqual(n, l);
  assert.equal(n.length, 1);
  assert.deepEqual(n[0].witness, ["obs:resolution"]);
});

test("status change without a corresponding DeltaFold operation is not release", () => {
  const before = native.receivedGround({ obligations: [openA] });
  const after = native.receivedGround({ obligations: [{ ...openA, status: "resolved" }] });
  assert.deepEqual(native.deriveRelease(native.deltaFold([]), before, after), []);
});
