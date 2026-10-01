import test from "node:test";
import assert from "node:assert/strict";
import { UNIT_CONTRACTS, geocodeContract, wttrContract, metnoContract, stationsContract, eiaContract, compass16, haversineKm } from "./app-weather-fuel.mjs";
import { testUnit, contractHash, unitPrompt, extractCode, loadUnit, trimSample, makeUnit, openUnitCache, locate } from "./app-units.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { REFERENCE } from "./app-weather-fuel.reference.mjs";

for (const c of UNIT_CONTRACTS) {
  test(`${c.name}: a correct reference passes every run of its oracle`, () => {
    const r = testUnit(REFERENCE[c.name], c);
    assert.deepEqual(r.failures, []);
    assert.equal(r.ok, true);
  });
}

// The controls built to fail: a function that returns the example it was shown must not pass, for EVERY unit.
test("a unit that hard-codes the recorded example's answer fails the mutated run (the oracle re-reads the changed bytes)", () => {
  for (const c of UNIT_CONTRACTS) {
    const sample = c.sampleJson ?? c.sampleText;
    const ref = loadUnit(REFERENCE[c.name], c.name);
    const frozen = JSON.stringify(ref(...c.runs[0].args(sample)));
    const cheat = `function ${c.name}(){return ${frozen};}`;
    const r = testUnit(cheat, c);
    assert.equal(r.ok, false, `${c.name}: a hard-coded answer must not pass`);
    assert.ok(r.failures.some((f) => /mutated|no results/.test(f)) || c.runs.length === 1, `${c.name}: failed on a run that changes the bytes`);
  }
});

test("wrong-unit and wrong-shape mistakes are each caught and named by path", () => {
  const fix = (name, from, to) => REFERENCE[name].replace(from, to);
  // wttr: swapping the imperial/metric fields
  let r = testUnit(fix("parseWttr", "Number(im?c.temp_F:c.temp_C)", "Number(im?c.temp_C:c.temp_F)"), wttrContract);
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /now\.temp/);
  // metno: forgetting m/s -> km/h
  r = testUnit(fix("parseMetNo", "const wind=x=>Math.round(im?x*2.23694:x*3.6)", "const wind=x=>Math.round(x)"), metnoContract);
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /windSpeed/);
  // metno: no compass rounding
  r = testUnit(fix("parseMetNo", "C[Math.round(i.wind_from_direction/22.5)%16]", "C[Math.floor(i.wind_from_direction/22.5)%16]"), metnoContract);
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /windDir/, "172.8° is 7.68 of a sector: floor reads SSE, round reads S");
  // stations: unsorted output
  r = testUnit(fix("parseStations", "return out.sort((x,y)=>x.km-y.km);", "return out;"), stationsContract);
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /km|sorted/);
  // eia: reading the older-week cell instead of the newest
  r = testUnit(fix("parseEia", "class=\"Current2\">", "class=\"DataB\">"), eiaContract);
  assert.equal(r.ok, false);
  // geocode: dropping the region from the label
  r = testUnit(fix("parseGeocode", "[r.name,r.admin1,r.country]", "[r.name,r.country]"), geocodeContract);
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /label/);
});

test("a unit that throws, hangs, or declares nothing is a failure with a reason, not a crash", () => {
  assert.equal(testUnit("function parseGeocode(){ throw new Error('boom'); }", geocodeContract).ok, false);
  assert.match(testUnit("const x = 1;", geocodeContract).failures[0], /no function|does not compile/);
  assert.equal(testUnit("function parseGeocode(j){ while(true){} }", geocodeContract).ok, false);
  assert.equal(testUnit("function parseGeocode(j){ return require('fs'); }", geocodeContract).ok, false, "no require in the empty context");
});

test("the prompt shows a trimmed REAL sample and never the apparatus; eia shows an excerpt that holds the price row", () => {
  const p = unitPrompt(wttrContract);
  assert.match(p, /parseWttr\(json, units\)/);
  assert.match(p, /current_condition/);
  assert.ok(p.length < 9000, `prompt is ${p.length} chars`);
  const e = unitPrompt(eiaContract);
  assert.match(e, /Series5/); assert.match(e, /Current2/); assert.match(e, /4\.465/);
  for (const bad of [/passage/i, /the prompt/i, /stigmer/i, /oracle/i, /ledger/i]) assert.doesNotMatch(p + e, bad);
});

test("makeUnit: the mouth order is the stigmergy's, a pass deposits a trail, the second ask is a cache hit with zero calls", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "units-"));
  const cache = openUnitCache(dir);
  const events = [];
  const calls = [];
  // mouth A answers with a wrong function first, then (seeing the failures) the right one; mouth B never answers
  let n = 0;
  const mouth = async (model, prompt) => { calls.push(model); n++; return { text: n === 1 ? "```js\nfunction parseGeocode(j){ return []; }\n```" : "```js\n" + REFERENCE.parseGeocode + "\n```", ms: 5, promptTokens: 10, outTokens: 10 }; };
  const r1 = await makeUnit(geocodeContract, { mouths: ["A", "B"], mouth, cache, see: (e, f) => events.push([e, f]), rng: () => 0.99, now: 1_000_000 });
  assert.equal(r1.ok, true); assert.equal(r1.calls, 2); assert.equal(r1.rounds, 1); assert.equal(r1.model, "A");
  assert.ok(Object.keys(r1.trails).length > 0, "success deposited a trail");
  const repairAsk = unitPrompt(geocodeContract, { failures: ["output.length is 0, the recorded data says 3"], previous: "function parseGeocode(j){ return []; }" });
  assert.match(repairAsk, /previous version was run against the real data and failed/);
  const r2 = await makeUnit(geocodeContract, { mouths: ["A", "B"], mouth, cache, trails: r1.trails, see: (e, f) => events.push([e, f]), now: 1_000_001 });
  assert.equal(r2.cached, true); assert.equal(r2.calls, 0); assert.equal(calls.length, 2, "no new call");
  // a changed oracle is a NEW unit: same name, different contract hash
  const changed = { ...geocodeContract, doc: geocodeContract.doc + " Also." };
  assert.notEqual(contractHash(changed), contractHash(geocodeContract));
  // a stale cache entry (code that no longer passes) is re-tested and NOT trusted
  cache.put(contractHash(geocodeContract), { name: "parseGeocode", model: "A", code: "function parseGeocode(){return []}", hash: "x" });
  const r3 = await makeUnit(geocodeContract, { mouths: ["A"], mouth, cache, trails: r1.trails, see: (e, f) => events.push([e, f]), rng: () => 0.99 });
  assert.equal(r3.cached, false); assert.ok(events.some(([e]) => e === "unit-cache-stale"));
});

test("a unit no mouth can make pass is a typed gap, never shipped", async () => {
  const mouth = async () => ({ text: "function parseGeocode(){ return 7; }", ms: 1, outTokens: 1 });
  const r = await makeUnit(geocodeContract, { mouths: ["A"], mouth, rng: () => 0.99 });
  assert.equal(r.ok, false); assert.equal(r.code, null); assert.ok(r.failures.length > 0);
});

test("compass16 and haversineKm agree with known values", () => {
  assert.equal(compass16(0), "N"); assert.equal(compass16(301), "WNW"); assert.equal(compass16(315), "NW"); assert.equal(compass16(359), "N"); assert.equal(compass16(172.8), "S");
  assert.ok(Math.abs(haversineKm(51.5085, -0.1257, 48.8566, 2.3522) - 343.6) < 1.5);
});

test("extractCode and trimSample behave", () => {
  assert.equal(extractCode("Sure!\n```js\nfunction f(){return 1}\n```\nDone", "f"), "function f(){return 1}");
  assert.equal(extractCode("no code here", "f"), null);
  assert.deepEqual(trimSample({ a: [1, 2, 3, 4], s: "x".repeat(100) }, { items: 2, str: 5 }), { a: [1, 2, "… 2 more like these"], s: "xxxxx…" });
});

test("locate points at where an expected value sits in the input — and at nothing when it is ambiguous", () => {
  assert.deepEqual(locate([{ name: "London", timezone: "Europe/London" }], ["result"], "Europe/London"), ["result.timezone"]);
  assert.deepEqual(locate([{ a: 18, b: 18, c: 18 }], ["x"], 18), [], "a number that equals three fields points at none");
  assert.deepEqual(locate([{ tempC: "18" }], ["current"], 18), ["current.tempC"], "a number string matches its number");
  assert.deepEqual(locate([{ a: 1 }], ["x"], { not: "a scalar" }), []);
});

test("the repair feedback names the field where the recorded value lives, and the message is clean of the marker", () => {
  const r = testUnit("function parseGeocode(json){return json.results.map(x=>({name:x.name,lat:x.latitude,lon:x.longitude,country:x.country,region:x.admin1,tz:x.tz,label:x.name}));}", geocodeContract);
  const msg = r.failures.find((f) => /\.tz is/.test(f));
  assert.match(msg, /that value is at `json\.results\[0\]\.timezone`/);
  assert.ok(!msg.includes("\u0001"));
});

test("a mouth that repeats its own code after seeing the failures is spent: no more rounds are wasted on it", async () => {
  const seen = [];
  const mouth = async (model) => { seen.push(model); return { text: "function parseGeocode(){ return []; }", ms: 1, outTokens: 1 }; };
  const events = [];
  const r = await makeUnit(geocodeContract, { mouths: ["A"], mouth, see: (e, f) => events.push([e, f]), rng: () => 0.99 });
  assert.equal(r.ok, false);
  assert.equal(seen.length, 2, "one draw, one redraw that came back identical, then stop (not the full 3 rounds)");
  assert.ok(events.some(([e, f]) => e === "unit-draw" && /identical/.test(f.skipped ?? "")));
});
