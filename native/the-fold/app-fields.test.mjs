// ═══ LOVELACE · TEACH IT TO FISH ═══ ledger row 7: the system splits a wide leaf into fields itself.
// The decomposition is derived from the contract (its worked example's keys, its oracle's per-key messages), never written per leaf.
// What is pinned here: every flat leaf splits; a field's oracle is the parent's filtered to that key; a wrong field fails ONLY itself;
// the composed leaf passes the parent's whole oracle; a field no mouth can make is named, not buried.
import test from "node:test";
import assert from "node:assert/strict";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { speciesHook } from "./app-species.mjs";
import { fieldsOf, fieldPlan, fieldContract, composeFieldCode, makeFieldedUnit, makeUnit, testUnit, testFunction, loadUnit, unitPrompt, openUnitCache, constReassigned, ABSENT } from "./app-units.mjs";
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

test("a field's prompt is NARROWED: not the object shape, only the notes that name its key, a one-expression skeleton, no unread-parameter hint", async () => {
  const { notesFor, testUnit } = await import("./app-units.mjs");
  const c = LEAF_CONTRACTS.find((x) => x.name === "wttrNow");
  const p = unitPrompt(fieldContract(c, "condition"));
  assert.doesNotMatch(p, /an object \{ temp/, "the whole-object shape is what a small model copies");
  assert.match(p, /just the value of `condition`, not an object/);
  assert.match(p, /weatherDesc/, "the clause that names condition stays");
  assert.doesNotMatch(p, /uv = uvIndex as a number/, "another field's clause is gone");
  assert.match(p, /function conditionOf\(current, astronomy, units\) \{\n  return ___;\n\}/);
  assert.match(p, /Units: when units is "metric"/, "the units paragraph of the shape text still applies");
  assert.equal(notesFor("a is one; b is two. c is three", "b"), "b is two.");
  assert.equal(notesFor("a is one; b is two", "zzz"), "a is one; b is two", "no clause names the key: all of it");
  // the hint is for whole leaves: a field that legitimately ignores `units` is not told to read it
  const fc = fieldContract(c, "condition");
  const res = testUnit(`function conditionOf(current, astronomy, units) { return 0; }`, fc);
  assert.equal(res.ok, false); assert.ok(!res.failures.some((f) => /never reads its parameter/.test(f)));
});

test("on the REAL wttrNow field oracles: a temp that ignores units is told so; a condition that ignores units is not", () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "wttrNow");
  const temp = testUnit(`function tempOf(current, astronomy, units) { return parseFloat(current.temp_C); }`, fieldContract(c, "temp"));
  assert.equal(temp.ok, false); assert.match(temp.failures[0], /same result for units = "metric" and "imperial"/);
  const cond = testUnit(`function conditionOf(current, astronomy, units) { return "nothing"; }`, fieldContract(c, "condition"));
  assert.equal(cond.ok, false); assert.ok(!cond.failures.some((f) => /must depend on/.test(f)), cond.failures.join("\n"));
  const right = testUnit(`function tempOf(current, astronomy, units) { return units === "imperial" ? parseFloat(current.temp_F) : parseFloat(current.temp_C); }`, fieldContract(c, "temp"));
  assert.equal(right.ok, true, right.failures.join("\n"));
});

// ---- the canonical stage, through makeUnit: suggestion -> reading -> canonical entry on the log -> fold ----
import { DIVERSE } from "./diverse-tasks.mjs";
test("makeUnit: a suggestion with a const slip and a slipped key is READ; the canonical form passes, and the log holds the raw suggestion, each transformation, and the canonical INS", async () => {
  const c = DIVERSE.find((d) => d.contract.name === "bedReport").contract;
  const suggestion = `function bedReport(ward) { const free = ward.total_beds - ward.occupied_beds; const pct = Math.round((ward.occupied_beds / ward.total_beds) * 100); const status = "ok"; if (free === 0) status = "full"; else if (pct >= 85) status = "busy"; return { name: ward.wardName, free, percentFull: pct, status }; }`;
  const mouth = async () => ({ text: suggestion, ms: 1, promptTokens: 1, outTokens: 1 });
  const events = [];
  const r = await makeUnit(c, { mouths: ["small"], mouth, cache: null, rng: () => 0.99, explore: 0, see: (e, f) => events.push([e, f]) });
  assert.equal(r.ok, true, r.failures.join("\n"));
  assert.match(r.code, /let status = "ok"/); assert.match(r.code, /ward\.ward_name/); assert.doesNotMatch(r.code, /wardName/, "the canonical code names the real key: it needs no run-time resolver");
  assert.deepEqual(r.log.entries.map((e) => e.operator), ["SIG", "CON", "CON", "INS"]);
  assert.match(r.log.entries[0].suggestion, /const status = "ok"/, "the model's own words are kept, unchanged");
  assert.deepEqual(r.log.entries.filter((e) => e.operator === "CON").map((e) => e.transformation.kind).sort(), ["const_to_let", "key_resolved"]);
  assert.ok(events.some(([e]) => e === "canonical"), "the reading is narrated on the build ledger too");
  // with the stage switched off the same suggestion is what it was: a crash on the runs that reassign the const
  const off = await makeUnit({ ...c, canonical: false, resolve: false }, { mouths: ["small"], mouth, cache: null, rng: () => 0.99, explore: 0 });
  assert.equal(off.ok, false);
});

// ---- the prompt built from the FOLD ----
const nowContract = () => {
  const ARGV = [{ temp_C: 18, temp_F: 65, desc: "Sunny", place: "London" }, "metric"];
  const want = (c, u) => ({ temp: u === "imperial" ? c.temp_F : c.temp_C, condition: c.desc, label: c.place });
  const run = (label, c, u) => ({ label, args: () => JSON.parse(JSON.stringify([c, u])), check: (o) => Object.entries(want(c, u)).flatMap(([k, v]) => (o?.[k] === v ? [] : [`${k} is ${JSON.stringify(o?.[k])}, the recorded data says ${JSON.stringify(v)}`])) });
  return {
    name: "now", kind: "leaf", params: ["current", "units"], doc: "Turn current conditions into the now reading.",
    returns: "an object { temp, condition, label }\n  Units: when units is \"metric\", temperatures are degrees Celsius; when \"imperial\", degrees Fahrenheit",
    notes: "temp comes from the _C or _F field by units; condition = the description; label is the place name.",
    shown: "current = {...}\nunits = \"metric\"", sampleJson: ARGV[0], example: { args: "", input: () => JSON.parse(JSON.stringify(ARGV)), output: () => want(ARGV[0], "metric") },
    runs: [run("metric", ARGV[0], "metric"), run("imperial", ARGV[0], "imperial"), run("other place", { temp_C: 3, temp_F: 37, desc: "Fog", place: "Oslo" }, "imperial")],
  };
};
const scripted = (replies) => { const prompts = []; let i = 0; return { prompts, mouth: async (model, prompt) => { prompts.push(prompt); return { text: replies[Math.min(i++, replies.length - 1)], ms: 1, promptTokens: 1, outTokens: 1 }; } }; };
const IGNORES = `function now(current, units) { return { temp: current.temp_C, condition: current.desc, label: current.place }; }`;
const RIGHT = `function now(current, units) { return { temp: units === "imperial" ? current.temp_F : current.temp_C, condition: current.desc, label: current.place }; }`;

test("repair: \"fold\" — the next prompt carries the CANONICAL current version and what the reading established about it, in plain words; \"edit\" does not", async () => {
  const c = nowContract();
  const a = scripted([IGNORES, RIGHT]);
  const r = await makeUnit(c, { mouths: ["small"], mouth: a.mouth, cache: null, rng: () => 0.99, explore: 0, repair: "fold" });
  assert.equal(r.ok, true, r.failures.join("\n")); assert.equal(a.prompts.length, 2);
  assert.doesNotMatch(a.prompts[0], /Current version of the function/, "the first draw is a first draw");
  assert.match(a.prompts[1], /Current version of the function:\nfunction now\(current, units\)/);
  assert.match(a.prompts[1], /What is known about it:\n- `temp` has to follow `units`/);
  assert.match(a.prompts[1], /temp comes from the _C or _F field by units/, "what is SAID of the output rides with the fact");
  const b = scripted([IGNORES, RIGHT]);
  await makeUnit(c, { mouths: ["small"], mouth: b.mouth, cache: null, rng: () => 0.99, explore: 0, repair: "edit" });
  assert.doesNotMatch(b.prompts[1], /What is known about it/);
});

test("the fold is what the next prompt is built from: a const slip the reading closed is closed in the code the model is shown", async () => {
  const c = nowContract();
  const slip = `function now(current, units) { const t = 0; t = units === "imperial" ? current.temp_F : current.temp_C; return { temp: t, condition: current.desc, label: "x" + current.place }; }`;
  const a = scripted([slip, RIGHT]);
  await makeUnit(c, { mouths: ["small"], mouth: a.mouth, cache: null, rng: () => 0.99, explore: 0, repair: "fold" });
  assert.match(a.prompts[1], /let t = 0/, "the canonical form, not the raw suggestion");
  assert.doesNotMatch(a.prompts[1], /const t = 0/);
});

test("carry: a second mouth starts from the fold the first mouth left, not from nothing", async () => {
  const c = nowContract();
  const prompts = [];
  const mouth = async (model, prompt) => { prompts.push([model, prompt]); return { text: model === "a" ? IGNORES : RIGHT, ms: 1, promptTokens: 1, outTokens: 1 }; };
  const r = await makeUnit(c, { mouths: ["a", "b"], mouth, cache: null, rng: () => 0.99, explore: 0, repair: "fold", carry: true });
  assert.equal(r.ok, true); const b = prompts.find(([m]) => m === "b")[1];
  assert.match(b, /Current version of the function:\nfunction now/); assert.match(b, /`temp` has to follow `units`/);
  const cold = []; await makeUnit(c, { mouths: ["a", "b"], mouth: async (m, p) => { cold.push([m, p]); return { text: m === "a" ? IGNORES : RIGHT, ms: 1, promptTokens: 1, outTokens: 1 }; }, cache: null, rng: () => 0.99, explore: 0, repair: "fold", carry: false });
  assert.doesNotMatch(cold.find(([m]) => m === "b")[1], /Current version of the function/, "without carry the second mouth starts cold");
});

test("anchorDir: the record outlives the run — a later build of the same unit is seeded from what the fold settled, and the raw suggestion is on disk", async () => {
  const c = nowContract(), dir = fs.mkdtempSync(path.join(os.tmpdir(), "anchors-"));
  const first = scripted([IGNORES]);
  const r1 = await makeUnit(c, { mouths: ["small"], mouth: first.mouth, cache: null, rng: () => 0.99, explore: 0, repair: "fold", anchorDir: dir });
  assert.equal(r1.ok, false);
  const rows = fs.readFileSync(path.join(dir, "now.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(rows.slice(0, 2).map((e) => e.operator), ["SIG", "INS"]); assert.match(rows[0].suggestion, /current\.temp_C/, "the raw suggestion is on disk");
  const firstRunEntries = rows.length;
  const later = scripted([RIGHT]);
  const r2 = await makeUnit(c, { mouths: ["small"], mouth: later.mouth, cache: null, rng: () => 0.99, explore: 0, repair: "fold", anchorDir: dir });
  assert.equal(r2.ok, true);
  assert.match(later.prompts[0], /Current version of the function:\nfunction now/, "the FIRST prompt of the later build starts from the settled fold");
  const after = fs.readFileSync(path.join(dir, "now.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((e) => e.operator);
  assert.deepEqual(after.slice(0, 2), ["SIG", "INS"]); assert.ok(after.length > firstRunEntries, "the later build APPENDED to the same record, it did not start a new one"); assert.ok(after.slice(firstRunEntries).includes("SYN"), "and its suggestion is a SYN over what was settled");
});

import { HELDOUT as HELDOUT_SET } from "./diverse-heldout.mjs";
test("a field's oracle keeps the failures that point INTO the field (`longest.length is 4`, `times[0] is`), and only that field's — measured 2026-10-01: a wrong list passed its own field check and was caught only by the whole leaf", () => {
  const rt = HELDOUT_SET.find((d) => d.contract.name === "readingTime").contract;
  const longest = fieldContract(rt, "longest"), words = fieldContract(rt, "words");
  assert.ok(longest.runs[0].check(["a", "b", "c", "d"]).length > 0, "a four-item list where three are expected fails the longest field");
  assert.deepEqual(longest.runs[0].check(rt.runs[0].want().longest), [], "the right list passes");
  assert.deepEqual(words.runs[0].check(rt.runs[0].want().words), [], "a sibling's failure is not this field's");
});

// ---- the cheapest filler first: opts.species ----
test("species-first: a slot a species fills costs ZERO model draws and is held to the same field oracle; the model is asked only for the rest", async () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "parsePlace");
  const ref = REFERENCE_LEAVES.parsePlace.replace(/^function parsePlace/, "function");
  const hook = speciesHook(), filled = fieldsOf(c).filter((k) => hook(c, k));
  assert.ok(filled.length >= 3, "the copy species fill the straight-through fields of the place");
  const events = [], f = fakeMouth(ref);
  const r = await makeFieldedUnit(c, { mouths: ["small"], mouth: f.mouth, cache: null, rng: () => 0.99, explore: 0, species: hook, see: (e, x) => events.push([e, x]) });
  assert.equal(r.ok, true, r.failures.join("\n"));
  assert.equal(f.calls.length, fieldsOf(c).length - filled.length, "one draw per field the species could NOT fill");
  assert.deepEqual(Object.keys(r.bySpecies).sort(), [...filled].sort());
  assert.ok(events.some(([e, x]) => e === "unit" && x.species === "copy" && x.calls === 0));
  assert.equal(testUnit(r.code, c).ok, true, "the composed leaf passes the whole oracle");
});

test("CONTROL built to fail: a species fill the field's oracle refuses is NOT used — the model draws that field instead", async () => {
  const c = LEAF_CONTRACTS.find((x) => x.name === "parsePlace");
  const ref = REFERENCE_LEAVES.parsePlace.replace(/^function parsePlace/, "function");
  const liar = (cc, key) => (key === "name" ? { species: "copy", js: "result.country" } : null); // plausible, wrong: reads another field
  const f = fakeMouth(ref), events = [];
  const r = await makeFieldedUnit(c, { mouths: ["small"], mouth: f.mouth, cache: null, rng: () => 0.99, explore: 0, species: liar, see: (e, x) => events.push([e, x]) });
  assert.equal(r.ok, true, r.failures.join("\n"));
  assert.equal(f.calls.length, fieldsOf(c).length, "the refused species fill cost a draw like any field");
  assert.deepEqual(r.bySpecies, {}, "nothing was credited to a species that the oracle refused");
  assert.ok(events.some(([e, x]) => e === "unit" && x.species === "copy" && x.ok === false && /oracle refused/.test(x.gap ?? "")));
});
