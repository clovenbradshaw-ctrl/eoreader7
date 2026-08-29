// native/conformance/concession-cascade.test.mjs — spec test 5
// (ASSEMBLIES-AND-ARTIFACTS.md §7.5): conceding an assembly enumerates and
// re-zeroes exactly its derivedUnder set, evidence retained (A5.2);
// provenance is stamped where deltas are built (A5.1) and absent-when-
// unstamped stays byte-identical; downstream consumers of a conceded
// artifact are notified, never rewritten (A5.3).

import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, applyDelta, deltaFold, eoOperation } from "../kernel/fold.js";
import { stampDelta, contributionsOf, concedeAssembly, concededAssemblies, derivedUnderConceded } from "../kernel/assembly.js";
import { reviseTextFold } from "../adapters/text/revision.js";

const A = { id: "assembly:entity", version: 1 };
const B = { id: "assembly:link", version: 1 };

const graphOp = (id) => eoOperation({
  op: "INS",
  grain: "Figure",
  witness: `w:${id}`,
  outputs: [id],
  consequence: { kind: "referent_admitted", ref: id },
  payload: { action: "graph-object", value: { schema: "EOReferent@1", id, surfaces: [id] } },
});

function stampedFold() {
  let fold = receivedGround();
  fold = applyDelta(fold, stampDelta(deltaFold([graphOp("ref:a1"), graphOp("ref:a2")], { id: "delta:a" }), A));
  fold = applyDelta(fold, stampDelta(deltaFold([graphOp("ref:b1")], { id: "delta:b" }), B));
  return fold;
}

test("A5.1: stampDelta lands provenance.assembly on every operation and nothing else; an unstamped delta carries no provenance key at all", () => {
  const bare = deltaFold([graphOp("ref:x")]);
  assert.ok(!("provenance" in bare.operations[0]), "unstamped stays byte-identical — the key is absent, not null");
  const stamped = stampDelta(bare, A);
  assert.deepEqual(stamped.operations[0].provenance.assembly, { id: "assembly:entity", version: 1 });
  assert.equal(stamped.operations[0].payload, bare.operations[0].payload, "everything else rides through untouched");
});

test("A5.1 at the adapter's own delta-assembly point: reviseTextFold stamps when the caller names the assembly, and is silent otherwise", async () => {
  const observations = [{
    id: "obs:0",
    witness: "Verona spoke.",
    provenance: { source: "fixture" },
    graphEntries: [{ schema: "EOReferent@1", id: "ref:verona", surfaces: ["Verona"] }],
    hyperedges: [],
  }];
  const unstamped = await reviseTextFold({ observations, fold: {} });
  assert.ok(unstamped.operations.length > 0);
  assert.ok(unstamped.operations.every((op) => !("provenance" in op)), "no assembly named, no provenance key — byte-identical to the pre-A5 shape");
  const stamped = await reviseTextFold({ observations, fold: {}, assembly: A });
  assert.ok(stamped.operations.length > 0);
  assert.ok(stamped.operations.every((op) => op.provenance?.assembly?.id === "assembly:entity"), "stamped where the delta is built");
});

test("A5.2: contributionsOf surfaces exactly one assembly's standing contribution — operations and the graph objects they put there", () => {
  const fold = stampedFold();
  const ofA = contributionsOf(fold, "assembly:entity");
  assert.equal(ofA.operations.length, 2);
  assert.deepEqual([...ofA.outputRefs], ["ref:a1", "ref:a2"]);
  const ofB = contributionsOf(fold, "assembly:link");
  assert.deepEqual([...ofB.outputRefs], ["ref:b1"]);
});

test("A5.2: a concession refuses a missing trigger and refuses an assembly with nothing to enumerate — a re-zero that reaches nothing is a version bump wearing an operator's name", () => {
  const fold = stampedFold();
  assert.throws(() => concedeAssembly(fold, { assembly: A }), /trigger/);
  assert.throws(() => concedeAssembly(fold, { assembly: { id: "assembly:kind", version: 1 }, trigger: "x" }), /enumerate/);
});

test("A5.2: one REC concedes the set — enumeration exact, evidence retained, the other assembly untouched", () => {
  const fold = stampedFold();
  const before = {
    graphEntries: (fold.graphEntries ?? []).length,
    operations: (fold.transformationObjects ?? []).length,
  };
  const { delta, conceded } = concedeAssembly(fold, { assembly: A, trigger: "severance run refuted the entity boundary (synthetic fixture)" });
  assert.equal(delta.operations.length, 1, "ONE REC concedes the whole set");
  assert.equal(delta.operations[0].operator, "REC");
  assert.equal(delta.operations[0].grain, "Pattern");
  assert.deepEqual([...conceded.outputRefs], ["ref:a1", "ref:a2"], "the enumerated set is exactly derivedUnder(assembly)");

  const after = applyDelta(fold, delta);
  const concessions = concededAssemblies(after);
  assert.equal(concessions.length, 1);
  assert.equal(concessions[0].assembly.id, "assembly:entity");
  assert.match(concessions[0].trigger, /severance/);
  assert.deepEqual([...concessions[0].outputRefs], ["ref:a1", "ref:a2"]);
  assert.equal(concessions[0].reZeroes.length, 2, "the REC names exactly the operations it re-zeroes");

  // evidence never deleted: everything the conceded assembly put there is
  // still on the fold — the concession is a marking read by projection.
  assert.equal((after.graphEntries ?? []).length >= before.graphEntries, true);
  assert.ok((after.graphEntries ?? []).some((g) => g?.id === "ref:a1"), "conceded evidence retained");
  assert.equal((after.transformationObjects ?? []).length, before.operations + 1, "the log grew by the REC and lost nothing");
  assert.deepEqual([...contributionsOf(after, "assembly:link").outputRefs], ["ref:b1"], "the other assembly's contribution is untouched");
});

test("A5.3: downstream consumers of a conceded artifact are notified, not rewritten", () => {
  const fold = applyDelta(stampedFold(), concedeAssembly(stampedFold(), { assembly: A, trigger: "synthetic concession" }).delta);
  const concessions = concededAssemblies(fold);
  const consumed = [
    { kind: "CastLedger@1", producer: { assembly: "assembly:entity", version: 1 } },
    { kind: "RhythmPrior@1", producer: { assembly: "assembly:atmosphere", version: 1 } },
  ];
  const notice = derivedUnderConceded(consumed, concessions);
  assert.equal(notice.length, 1);
  assert.equal(notice[0].kind, "CastLedger@1");
  assert.equal(notice[0].standing, "consumed_artifact_producer_conceded");
  assert.match(notice[0].trigger, /synthetic/);
});
