import test from "node:test";
import assert from "node:assert/strict";
import { resolveKey, keyTier, declaredFromExample, residentSource, foldKey, keyTokens } from "./key-referents.js";
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
});

test("a tie is an AMBIGUITY, never broken: the units differ (Kmph / Miles), so the model must say which", () => {
  const r = resolveKey("windSpeed", ["windspeedKmph", "windspeedMiles", "winddir16Point"]);
  assert.equal(r.resolved, false); assert.equal(r.ambiguous, true);
  assert.deepEqual(r.candidates.sort(), ["windspeedKmph", "windspeedMiles"]);
  assert.equal(resolveKey("temp", ["temp_C", "temp_F"]).ambiguous, true);
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
});

test("tiers are named, tokens split camel and snake, and the fold drops separators", () => {
  assert.equal(keyTier("a", "a"), 0); assert.equal(keyTier("windSpeed", "wind_speed"), 2);
  assert.equal(keyTier("speed", "wind_speed"), 3); assert.equal(keyTier("tz", "timezone"), null); assert.equal(keyTier("lng", "longitude"), 4); assert.equal(keyTier("county", "country"), null, "six of seven letters is not an abbreviation"); assert.equal(keyTier("zt", "timezone"), null);
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

test("inside the wall: an ambiguous read returns undefined and is DISCLOSED as ambiguous with its candidates", () => {
  const fn = loadUnit("function f(c){ return { w: c.wind }; }", "f", { resolve: {} });
  assert.deepEqual(fn({ windspeedKmph: 8, windspeedMiles: 5 }), {});
  const [r] = fn.resolutions();
  assert.equal(r.ambiguous, true); assert.deepEqual(r.candidates.sort(), ["windspeedKmph", "windspeedMiles"]);
});

test("the layer adds no authority: the vm still has no require, process or fetch, and results cross as JSON", () => {
  const fn = loadUnit("function f(){ return typeof require + typeof process + typeof fetch; }", "f", { resolve: {} });
  assert.equal(fn({}), "undefinedundefinedundefined");
  assert.throws(() => loadUnit("function f(){ while(true){} }", "f", { resolve: {}, timeout: 200 })({}), /timed out|Script execution/);
  assert.match(residentSource({}), /function resolveKey/);
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
  assert.equal(resolveKey("ward", keys).real, "ward_name");
  assert.equal(resolveKey("bed", keys).real, "bed_number");
  assert.equal(resolveKey("patient", keys).real, "patient_id");
  assert.equal(resolveKey("at", keys).resolved, false, "too short and too common to bind");
  assert.equal(resolveKey("admit", keys).real, "admitted_at", "the prefix of the real key");
  assert.equal(resolveKey("doctor", keys).resolved, false);
});
