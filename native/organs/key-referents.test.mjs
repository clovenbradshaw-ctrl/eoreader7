import test from "node:test";
import assert from "node:assert/strict";
import { resolveKey, keyTier, declaredFromExample, residentSource, foldKey, keyTokens, nearKeys } from "./key-referents.js";
import { loadUnit } from "../the-fold/unit-wall.mjs";

const PLACE = ["id", "name", "latitude", "longitude", "elevation", "feature_code", "country_code", "timezone", "population", "country", "admin1", "admin2"];

test("the slip that cost a day: tz resolves to timezone, lat/lon to latitude/longitude — each alone at its tier", () => {
  // two letters name nothing from their SHAPE (`at` would bind `admitted_at`): tz resolves on the contract's worked example, which is stronger evidence
  assert.equal(resolveKey("tz", PLACE).resolved, false, "tz from string shape alone is refused");
  assert.deepEqual(resolveKey("tz", PLACE, { declared: { tz: "timezone" } }), { resolved: true, real: "timezone", tier: 1, basis: "declared by the contract's worked example" });
  assert.equal(resolveKey("lng", PLACE).real, "longitude", "three letters, in order, same first letter, a third of the key");
  assert.equal(resolveKey("lat", PLACE).real, "latitude");
  assert.equal(resolveKey("lon", PLACE).real, "longitude");
  assert.equal(resolveKey("name", PLACE).basis, "exact");
  assert.equal(resolveKey("windSpeed", ["wind_speed", "wind_dir"]).real, "wind_speed");
  assert.equal(resolveKey("temp", ["temperature", "wind_speed"]).real, "temperature", "the start of the whole key");
  assert.equal(resolveKey("temp", ["air_temperature", "wind_speed"]).resolved, false, "a word INSIDE a compound key is a different referent: the model says which, or the contract declares it");
});

test("a name that only SHARES A WORD with several keys is not resolved — it is offered (near) so the model can point; a true tie stays an ambiguity", () => {
  const r = resolveKey("windSpeed", ["windspeedKmph", "windspeedMiles", "winddir16Point"]);
  assert.equal(r.resolved, false); assert.equal(r.ambiguous, false);
  assert.deepEqual(r.near.sort(), ["windspeedKmph", "windspeedMiles"], "the units differ, so the model must say which");
  assert.deepEqual(resolveKey("temp", ["temp_C", "temp_F"]).near, ["temp_C", "temp_F"]);
  assert.deepEqual(nearKeys("place", ["place_id", "lat"]), ["place_id"]);
  const t = resolveKey("lng", ["longitude", "language"]);
  assert.equal(t.ambiguous, true); assert.deepEqual(t.candidates.sort(), ["language", "longitude"]);
});

test("an absence stays an absence: nothing is minted, nothing is invented for a name no key refers to", () => {
  for (const asked of ["region", "zone", "elevation2", "county", "x"]) { const r = resolveKey(asked, PLACE); assert.equal(r.resolved, false, asked); }
  assert.equal(resolveKey("region", PLACE).ambiguous, false);
  assert.equal(resolveKey("a", ["alpha"]).resolved, false, "one letter names nothing");
});

test("the strongest tier wins, and resolution depends on the NAMES, never their order", () => {
  assert.equal(resolveKey("lat", ["lat", "latitude"]).real, "lat", "exact outranks prefix");
  assert.equal(resolveKey("lng", ["longitude", "language"]).ambiguous, true, "two keys hold the letters in order: nothing is chosen");
  for (let i = 0; i < 6; i++) { const k = [...PLACE].sort(() => Math.random() - 0.5); assert.equal(resolveKey("lng", k).real, "longitude"); }
});

test("a declared map (the contract's own worked example) outranks string shape, and only binds to a key that exists", () => {
  assert.equal(resolveKey("region", PLACE, { declared: { region: "admin1" } }).real, "admin1");
  assert.equal(resolveKey("region", PLACE, { declared: { region: "admin1" } }).tier, 1);
  assert.equal(resolveKey("region", PLACE, { declared: { region: "nowhere" } }).resolved, false);
  const d = declaredFromExample({ results: [{ name: "London", admin1: "England", timezone: "Europe/London", latitude: 51.5 }] }, { region: "England", tz: "Europe/London", lat: 51.5, label: "London, England" });
  assert.deepEqual(d, { region: "admin1", tz: "timezone", lat: "latitude" });
  assert.deepEqual(declaredFromExample({ a: 1, b: 1 }, { x: 1 }), {}, "a value that sits under two keys binds to neither");
  // the coincidence that nearly shipped: a DERIVED 17 (17.3 rounded) equalled air_temperature_max's 17 and bound temp to the wrong key
  assert.deepEqual(declaredFromExample({ air_temperature: 17.3, air_temperature_max: 17 }, { temp: 17 }), {}, "a short integer binds nothing");
  assert.deepEqual(declaredFromExample({ name: "Esso", km_raw: 2.94 }, { name: "Esso", km: 2.9 }), {}, "a rounded value is derived, not copied");
  assert.equal(declaredFromExample({ timezone: "Europe/London" }, { tz: "Europe/London" }).tz, "timezone", "a copied string binds");
});

test("tiers are named, tokens split camel and snake, and the fold drops separators", () => {
  assert.equal(keyTier("a", "a"), 0); assert.equal(keyTier("windSpeed", "wind_speed"), 2);
  assert.equal(keyTier("speed", "wind_speed"), null, "a word inside a compound is not the compound"); assert.equal(keyTier("tz", "timezone"), null); assert.equal(keyTier("lng", "longitude"), 4); assert.equal(keyTier("county", "country"), null, "six of seven letters is not an abbreviation"); assert.equal(keyTier("zt", "timezone"), null);
  assert.deepEqual(keyTokens("windspeedKmph"), ["windspeed", "kmph"]); assert.deepEqual(keyTokens("FeelsLikeC"), ["feels", "like", "c"]);
  assert.equal(foldKey("Wind_Speed-Kmph"), "windspeedkmph");
});

test("inside the wall: a unit that reads result.tz works, is told what it resolved, and a real absence is still undefined", () => {
  const code = "function parsePlace(r){ return { name: r.name, lat: r.lat, tz: r.tz, region: r.region, missing: r.nonexistent }; }";
  const plain = loadUnit(code, "parsePlace");
  assert.equal(plain({ name: "London", latitude: 51.5, timezone: "Europe/London", admin1: "England" }).tz, undefined, "without the layer the slip is a failure");
  const fn = loadUnit(code, "parsePlace", { resolve: { declared: { region: "admin1", tz: "timezone" } } });
  const out = fn({ name: "London", latitude: 51.5, timezone: "Europe/London", admin1: "England" });
  assert.deepEqual(out, { name: "London", lat: 51.5, tz: "Europe/London", region: "England" });
  assert.equal(out.missing, undefined);
  assert.deepEqual(fn.resolutions().map((r) => [r.asked, r.real]).sort(), [["lat", "latitude"], ["region", "admin1"], ["tz", "timezone"]]);
});

test("inside the wall: nested objects and arrays resolve, destructuring resolves, arrays keep behaving as arrays", () => {
  const code = "function f(cur){ const { temp, humid } = cur.current[0]; return { t: temp, h: humid, n: cur.current.length, s: cur.current.map((x) => x.temp) }; }";
  const fn = loadUnit(code, "f", { resolve: {} });
  const out = fn({ current: [{ temperature: 18, humidity: 58 }, { temperature: 20, humidity: 50 }] });
  assert.deepEqual(out, { t: 18, h: 58, n: 2, s: [18, 20] });
});

test("inside the wall: an ambiguous read returns undefined and is DISCLOSED with its candidates; a read that only shares a word is disclosed with its near keys", () => {
  const fn = loadUnit("function f(c){ return { w: c.wind, s: c.windSpeed }; }", "f", { resolve: {} });
  assert.deepEqual(fn({ windspeedKmph: 8, windspeedMiles: 5 }), {});
  const log = fn.resolutions();
  const amb = log.find((r) => r.asked === "wind"), near = log.find((r) => r.asked === "windSpeed");
  assert.equal(amb.ambiguous, true); assert.deepEqual(amb.candidates.sort(), ["windspeedKmph", "windspeedMiles"]);
  assert.equal(near.unresolved, true); assert.deepEqual(near.near.sort(), ["windspeedKmph", "windspeedMiles"]);
});

test("the layer adds no authority: the vm still has no require, process or fetch, and results cross as JSON", () => {
  const fn = loadUnit("function f(){ return typeof require + typeof process + typeof fetch; }", "f", { resolve: {} });
  assert.equal(fn({}), "undefinedundefinedundefined");
  assert.throws(() => loadUnit("function f(){ while(true){} }", "f", { resolve: {}, timeout: 200 })({}), /timed out|Script execution/);
  assert.match(residentSource({}), /function resolveKey/);
});

// CONTROL FROM A REAL INCIDENT (2026-09-30): a row whose `name` was deliberately missing had it swallowed by `display_name`
test("control: `name` is not `display_name`, `type` is not `osm_type`, `id` is not `place_id` — an absence stays an absence", () => {
  const keys = ["place_id", "lat", "lon", "display_name", "osm_type", "address"];
  for (const asked of ["name", "type", "id", "place"]) assert.equal(resolveKey(asked, keys).resolved, false, asked);
  const fn = loadUnit("function f(e){ return { name: e.name || String(e.display_name).split(',')[0] }; }", "f", { resolve: {} });
  assert.deepEqual(fn({ display_name: "Corner Garage, Mill Lane", lat: "1" }), { name: "Corner Garage" }, "the model's own fallback is reached, not pre-empted");
  assert.deepEqual(fn.resolutions().filter((r) => r.real), [], "nothing was resolved: the near key is only disclosed");
});

// CONTROL BUILT TO FAIL (II.23): a resolver that resolved everything by best-guess would pass the slip test above and fail here.
test("control: a resolver that always picked the nearest key would answer for the ambiguous and the absent — this one does not", () => {
  const always = (asked, keys) => ({ resolved: true, real: keys.find((k) => foldKey(k).includes(foldKey(asked)[0])) });
  assert.equal(always("region", PLACE).resolved, true, "the naive resolver invents a binding for an absence");
  assert.equal(resolveKey("region", PLACE).resolved, false, "the shipped one refuses");
});

// CROSS-DOMAIN REPLAY: nothing in the layer knows weather; the same code on a hospital-bed schema.
test("replay on an unrelated schema (hospital beds): same rules, same refusals", () => {
  const keys = ["bed_number", "ward_name", "temperature", "admitted_at", "discharged_at", "patient_id"];
  assert.equal(resolveKey("temp", keys).real, "temperature");
  assert.equal(resolveKey("ward", keys).resolved, false, "ward is a word inside ward_name: a different referent");
  assert.equal(resolveKey("at", keys).resolved, false, "too short and too common to bind");
  assert.equal(resolveKey("admit", keys).real, "admitted_at", "the prefix of the real key");
  assert.equal(resolveKey("doctor", keys).resolved, false);
});
