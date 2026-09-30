import test from "node:test";
import assert from "node:assert/strict";
import { assembly, createAssemblyRegistry, registerAssembly } from "../kernel/assembly.js";
import { LIMITS, MEASUREMENT_GAP, hasMeasurementGap, limitsFor, placeFromRegistries, profileOfTerrains } from "./capacity-place.js";
import { nativeRegistry } from "../assemblies.js";
import { registeredAssemblies } from "../kernel/assembly.js";

const registryOf = (...asms) => asms.reduce((r, a) => registerAssembly(r, a), createAssemblyRegistry()); // the register is an immutable value: each call returns the next one
const mk = (id, terrains, stagesNotRun = []) => assembly({ id: `assembly:${id}`, version: 1, terrains, organs: [`${id}.js`], stagesNotRun });

test("MEASUREMENT_GAP names a measurement still to do — and not a sealing or a split (control built to fail)", () => {
  for (const s of [
    "measurement on real material — organ exists, thin evidence (§2 state)",
    "measurement on real material — organ exists, unmeasured (§2 state)",
    "native run on real material — the organ exists; P6 calls this layer the substantive product",
  ]) assert.ok(MEASUREMENT_GAP.test(s), s);
  for (const s of [
    "RelationLedger@1 sealing (spec step 8, in declared order after CastLedger@1)",
    "SequenceRegister@1 / DeclarationRegister@1 sealing (spec step 8, in declared order)",
    "per-assembly split (§6, spec step 7)",
  ]) assert.ok(!MEASUREMENT_GAP.test(s), s);
});

test("a synthetic registry: built, declared and registry-measured are three different profiles, and the distance is the dressing", () => {
  const registry = registryOf(
    mk("ent", ["Void", "Entity"]),
    mk("lnk", ["Field", "Link"], ["measurement on real material — unmeasured"]),
    mk("atm", ["Atmosphere"]),
  );
  const capacities = [
    { id: "c1", terrain: "Void" }, { id: "c2", terrain: "Entity" }, { id: "c3", terrain: "Kind" },
    { id: "c4", terrain: "Field" }, { id: "c5", terrain: "Link" }, { id: "c6", terrain: "Network" },
    { id: "c7", terrain: "Atmosphere" }, { id: "c8", terrain: "Lens" }, { id: "c9", terrain: "Paradigm" },
  ];
  const place = placeFromRegistries({ registry, capacities });
  assert.deepEqual({ ...place.built.profile }, { arithmetic: 2, geometric: 2, transcendental: 2 });
  assert.deepEqual({ ...place.declared.profile }, { arithmetic: 1, geometric: 1, transcendental: 0 });
  // Link's assembly names a measurement gap, so neither Field nor Link is registry-measured
  assert.equal(place.registryMeasured.profile.gap, "unplaced_class");
  assert.deepEqual([...place.registryMeasured.unplaced], ["geometric"]);
  assert.equal(place.dressed, null, "an unplaced class has no order to compare — it is not counted as order zero");
  const link = place.rows.find((r) => r.terrain === "Link");
  assert.deepEqual([...link.unmeasuredBy], ["assembly:lnk"]);
  assert.equal(link.registryMeasured, false);
});

test("with every class placed, dressed = built minus registry-measured, with S10's failure mode named only where S10 names one", () => {
  const registry = registryOf(mk("ent", ["Void", "Entity"]), mk("lnk", ["Field"]), mk("atm", ["Atmosphere"]));
  const capacities = ["Void", "Entity", "Kind", "Field", "Link", "Network", "Atmosphere", "Lens", "Paradigm"].map((terrain, i) => ({ id: `c${i}`, terrain }));
  const place = placeFromRegistries({ registry, capacities });
  assert.deepEqual({ ...place.registryMeasured.profile }, { arithmetic: 1, geometric: 0, transcendental: 0 });
  assert.deepEqual([...place.dressed.dressedClasses], ["arithmetic", "geometric", "transcendental"]);
  const by = Object.fromEntries(place.dressed.rows.map((r) => [r.klass, r]));
  assert.equal(by.arithmetic.mode, null);
  assert.match(by.geometric.mode, /failure mode 2/);
  assert.match(by.transcendental.mode, /failure mode 3/);
});

test("the real registries: every place is built, and the registry's own account leaves a Lens unmeasured beneath a measured Paradigm (an orphan the map produces from the registry)", () => {
  // A description of the registries as they stand. When they change this test SHOULD fail:
  // the placement is then to be re-read, not the assertion loosened.
  const place = placeFromRegistries();
  assert.equal(place.rows.length, 9);
  assert.ok(place.rows.every((r) => r.built.length > 0), "every terrain has at least one built organ");
  assert.deepEqual({ ...place.built.profile }, { arithmetic: 2, geometric: 2, transcendental: 2 });
  const lens = place.rows.find((r) => r.terrain === "Lens");
  const paradigm = place.rows.find((r) => r.terrain === "Paradigm");
  assert.equal(lens.registryMeasured, false);
  assert.equal(paradigm.registryMeasured, true);
  assert.deepEqual(place.registryMeasured.orphans.map((o) => [o.terrain, o.missingBeneath]), [["Paradigm", "Lens"]]);
  for (const r of place.rows) for (const id of r.unmeasuredBy) assert.ok(r.declaredBy.includes(id));
  const network = place.rows.find((r) => r.terrain === "Network");
  assert.equal(network.registryMeasured, false, "the registry still says the native Network run is undone");
});

test("baseline assemblies are not a place's declarer: the measuring stick is not a reading", () => {
  const baselineIds = registeredAssemblies(nativeRegistry()).filter((a) => a.layer === "baseline").map((a) => a.id);
  assert.ok(baselineIds.length >= 1);
  const place = placeFromRegistries();
  for (const r of place.rows) for (const id of baselineIds) assert.ok(!r.declaredBy.includes(id));
});

test("profileOfTerrains: an unknown terrain is reported, never silently placed", () => {
  const p = profileOfTerrains(["Void", "Entity", "Sentiment"]);
  assert.deepEqual([...p.terrainsUnknown], ["Sentiment"]);
  assert.equal(hasMeasurementGap({ stagesNotRun: [] }), false);
});

test("the measured limits ride on the places they belong to, and the ledger is the placement's own", () => {
  const place = placeFromRegistries();
  assert.deepEqual([...place.limits].map((l) => l.id), LIMITS.map((l) => l.id));
  const ids = (terrain) => [...place.rows.find((r) => r.terrain === terrain).limits];
  assert.deepEqual(ids("Field"), ["extent-ends-a-sentence-inside-a-name"]);
  assert.deepEqual(ids("Entity"), ["a-cut-off-honorific-is-admitted-as-a-being"]);
  assert.deepEqual(ids("Link"), ["pair-direction-is-a-weak-rung"]);
  assert.deepEqual(ids("Kind"), [], "a place nothing was measured at carries no limit — that is not a finding that it has none");
  assert.deepEqual(limitsFor("Void"), []);
});
