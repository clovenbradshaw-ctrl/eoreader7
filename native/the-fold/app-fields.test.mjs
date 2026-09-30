// ═══ LOVELACE · TEACH IT TO FISH ═══ ledger row 7: the system splits a wide leaf into fields itself.
// The decomposition is derived from the contract (its worked example's keys, its oracle's per-key messages), never written per leaf.
// What is pinned here: every flat leaf splits; a field's oracle is the parent's filtered to that key; a wrong field fails ONLY itself;
// the composed leaf passes the parent's whole oracle; a field no mouth can make is named, not buried.
import test from "node:test";
import assert from "node:assert/strict";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { fieldsOf, fieldPlan, fieldContract, composeFieldCode, makeFieldedUnit, testUnit, testFunction, loadUnit, unitPrompt, openUnitCache, constReassigned, ABSENT } from "./app-units.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const flat = LEAF_CONTRACTS.filter((c) => fieldsOf(c).length);

test("the flat-object leaves split by their worked example's keys; a leaf that answers a scalar or a list does not", () => {
  const names = flat.map((c) => c.name);
  for (const n of ["wttrNow", "wttrHour", "metnoNow", "metnoHour", "parseStation", "nominatimStation", "parsePlace"]) assert.ok(names.includes(n), `${n} splits`);
  for (const n of ["newestWeek", "priceAfter"]) assert.ok(!names.includes(n), `${n} answers one value: it IS the field`);
  assert.deepEqual(fieldsOf(LEAF_CONTRACTS.find((c) => c.name === "wttrHour")), ["at", "temp", "condition", "windSpeed", "humidity", "rain"]);
});

test("for every flat leaf, each field built from the reference passes its own field oracle (no false failure, no throw on missing sibling keys)", () => {
  for (const c of flat) {
    const ref = loadUnit(REFERENCE_LEAVES[c.name], c.name);
    for (const key of fieldPlan(c)) {
      const fc = fieldContract(c, key);
      const r = testFunction((...a) => { const v = ref(...a); return key === ABSENT ? v === null : v[key]; }, fc);
      assert.deepEqual(r.failures, [], `${c.name}.${key}`);
    }
  }
});

test("a leaf whose oracle accepts null for some arguments gets an absent-guard field; one that never does, does not", () => {
  assert.equal(fieldPlan(LEAF_CONTRACTS.find((c) => c.name === "parseStation"))[0], ABSENT, "parseStation: null if it has no position");
  assert.ok(!fieldPlan(LEAF_CONTRACTS.find((c) => c.name === "wttrNow")).includes(ABSENT));
  const c = LEAF_CONTRACTS.find((x) => x.name === "parseStation"), ref = loadUnit(REFERENCE_LEAVES.parseStation, "parseStation");
  // a guard that never says "absent" fails the null runs; the answer fields are never asked on those runs
  const never = testFunction(() => false, fieldContract(c, ABSENT));
  assert.equal(never.ok, false); assert.ok(never.failures.every((f) => /absent is false, the recorded data says true/.test(f)));
  const name = fieldContract(c, "name");
  assert.ok(name.runs.length < c.runs.length, "the null-expecting runs are not the field's");
  assert.equal(testFunction((...a) => ref(...a).name, name).ok, true);
});

test("a wrong field fails ONLY its own field oracle — the other fields' checks stay silent, so each draw is judged on its own", () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "wttrNow");
  const ref = loadUnit(REFERENCE_LEAVES.wttrNow, "wttrNow");
  const wrong = testFunction((...a) => 0, fieldContract(c, "temp"));
  assert.equal(wrong.ok, false); assert.ok(wrong.failures.every((f) => /temp is/.test(f)), wrong.failures.join("\n"));
  // the same wrong value on a DIFFERENT field is judged by that field's oracle, not temp's
  const sunrise = testFunction((...a) => ref(...a).temp, fieldContract(c, "sunrise"));
  assert.equal(sunrise.ok, false); assert.ok(sunrise.failures.every((f) => /sunrise is/.test(f)));
  assert.equal(testFunction((...a) => ref(...a).sunrise, fieldContract(c, "sunrise")).ok, true);
});

test("the field prompt shows ONE key's worked value and says it returns just that value", () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "metnoNow");
  const p = unitPrompt(fieldContract(c, "windDir"));
  assert.match(p, /`windDirOf\(/); assert.match(p, /just the value of `windDir`/);
  assert.match(p, /For that example.*must return[\s\S]*"S"/, "the worked example is this key's value");
  assert.doesNotMatch(p, /sunrise:/, "no other key's example value is shown");
});

test("composed from reference fields, the leaf passes the parent's whole oracle — each field in its own scope, the guard first", () => {
  for (const c of flat) {
    const plan = fieldPlan(c);
    const copy = `const __ref = ${REFERENCE_LEAVES[c.name].replace(new RegExp(`^function ${c.name}`), "function")};`;
    const codes = Object.fromEntries(plan.map((k) => [k, k === ABSENT ? `function ${k}Of(...a) { return __ref(...a) === null; }\n${copy}` : `function ${k}Of(...a) { return __ref(...a)["${k}"]; }\n${copy}`]));
    const r = testUnit(composeFieldCode(c, plan, codes), c);
    assert.deepEqual(r.failures, [], `${c.name}: composed`);
  }
});

test("constReassigned: the same name declared again in another scope is not a reassignment", () => {
  assert.deepEqual(constReassigned(`const a = 1;\nfunction g() { return a; }\nconst b = (() => { const a = 2; return a; })();`), []);
  assert.deepEqual(constReassigned(`const a = 1;\na = 2;\nconst b = (() => { const a = 3; return a; })();`), ["a"], "an assignment BEFORE the redeclaration still counts");
});

function fakeMouth(reference, { breakKey = null } = {}) {
  const calls = [];
  const mouth = async (model, prompt) => {
    calls.push(model);
    const m = prompt.match(/`(\w+)Of\(/); const key = m?.[1];
    const code = key === breakKey ? `function ${key}Of() { return null; }` : `function ${key}Of(...a) { return __ref(...a)["${key}"]; }\nconst __ref = ${reference};`;
    return { text: code, ms: 1, promptTokens: 1, outTokens: 1 };
  };
  return { mouth, calls };
}

test("makeFieldedUnit: one draw per field, composed, verified against the whole oracle — and cached so the second build costs zero draws", async () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "wttrHour");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fielded-"));
  const cache = openUnitCache(dir);
  const ref = REFERENCE_LEAVES.wttrHour.replace(/^function wttrHour/, "function");
  const f = fakeMouth(ref);
  const r = await makeFieldedUnit(c, { mouths: ["small"], mouth: f.mouth, cache, rng: () => 0.99, explore: 0 });
  assert.equal(r.ok, true, r.failures.join("\n")); assert.deepEqual(r.fields, fieldsOf(c));
  assert.equal(f.calls.length, fieldsOf(c).length, "one draw per field, all passing round 0");
  assert.equal(testUnit(r.code, c).ok, true);
  const again = fakeMouth(ref);
  const r2 = await makeFieldedUnit(c, { mouths: ["small"], mouth: again.mouth, cache, rng: () => 0.99, explore: 0 });
  assert.equal(r2.ok, true); assert.equal(again.calls.length, 0, "every field served from its verified cache entry");
});

test("makeFieldedUnit: a field no mouth can make pass is NAMED in the gap; the other fields are not re-drawn for it", async () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "wttrHour");
  const ref = REFERENCE_LEAVES.wttrHour.replace(/^function wttrHour/, "function");
  const f = fakeMouth(ref, { breakKey: "rain" });
  const r = await makeFieldedUnit(c, { mouths: ["small"], mouth: f.mouth, cache: null, rng: () => 0.99, explore: 0 });
  assert.equal(r.ok, false); assert.deepEqual(r.failedFields.map((x) => x.key), ["rain"]);
  assert.ok(r.failures.every((m) => m.startsWith("rain:")), r.failures.join("\n"));
  assert.equal(r.code, null, "nothing half-built is shipped");
});

test("CONTROL built to fail: a field set that each pass alone but compose WRONG (a swapped pair) is caught by the whole oracle", async () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "wttrHour");
  const keys = fieldsOf(c);
  const ref = REFERENCE_LEAVES.wttrHour.replace(/^function wttrHour/, "function");
  const codes = Object.fromEntries(keys.map((k) => [k, `function ${k}Of(...a) { return __ref(...a)["${k === "temp" ? "windSpeed" : k}"]; }\nconst __ref = ${ref};`]));
  assert.equal(testUnit(composeFieldCode(c, keys, codes), c).ok, false, "temp read from windSpeed must fail the whole oracle");
});

test("makeFieldedUnit: the whole leaf is cached under its own hash too — a later build of the leaf is one re-test, zero draws, even with no field cache entries", async () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "metnoHour");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fielded-whole-"));
  const cache = openUnitCache(dir);
  const ref = REFERENCE_LEAVES.metnoHour.replace(/^function metnoHour/, "function");
  const first = await makeFieldedUnit(c, { mouths: ["small"], mouth: fakeMouth(ref).mouth, cache, rng: () => 0.99, explore: 0 });
  assert.equal(first.ok, true, first.failures.join("\n"));
  const only = openUnitCache(fs.mkdtempSync(path.join(os.tmpdir(), "fielded-whole2-")));
  only.put(first.hash ?? (await import("./app-units.mjs")).contractHash(c), { code: first.code, model: first.model });
  const dead = async () => { throw new Error("no draw may happen"); };
  const again = await makeFieldedUnit(c, { mouths: ["small"], mouth: dead, cache: only, rng: () => 0.99, explore: 0 });
  assert.equal(again.ok, true); assert.equal(again.cached, true); assert.equal(again.calls, 0);
});
