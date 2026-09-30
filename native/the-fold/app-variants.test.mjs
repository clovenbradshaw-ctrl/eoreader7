import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compSpecOf } from "../organs/comp-read.js";
import { variantMatrix, buildVariants } from "./app-variants.mjs";
import { generateUnits } from "./app-generate.mjs";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { openUnitCache } from "./app-units.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { FIXTURES } from "./app-weather-fuel.mjs";

const comp = (f) => compSpecOf(JSON.parse(fs.readFileSync(path.join(FIXTURES, "comps", f), "utf8")));
const weather = comp("weather-comp-detect.json"), fuel = comp("fuel-comp-detect.json");

// a stand-in mouth that answers each leaf with the reference body (so the test asks no model anything) and counts what it was asked
function referenceMouth() {
  const asked = [];
  const mouth = async (model, prompt) => { const name = /exactly one function: `(\w+)\(/.exec(prompt)[1]; asked.push(name); return { text: "```js\n" + REFERENCE_LEAVES[name] + "\n```", ms: 1, promptTokens: 1, outTokens: 1 }; };
  return { mouth, asked };
}

test("variantMatrix is the full cross product in a stable order, with stable ids", () => {
  const m = variantMatrix({ layout: ["a", "b"], theme: [null, "dark"], place: ["Paris", "Nashville, TN"], fuel: [true, false] });
  assert.equal(m.length, 16);
  assert.equal(new Set(m.map((x) => x.id)).size, 16);
  assert.equal(m[0].id, "a_comp_paris_fuel");
  assert.deepEqual(variantMatrix({}).map((x) => x.id), ["default_comp_london_fuel"]);
});

test("every leaf drawn, then the composed whole passes the whole-response oracles: a verified set of units", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-"));
  const { mouth, asked } = referenceMouth();
  const r = await generateUnits({ mouths: ["ref"], mouth, cache: openUnitCache(path.join(dir, "cache")), rng: () => 0.99 });
  assert.equal(r.ok, true, JSON.stringify(r.gap));
  assert.equal(asked.length, LEAF_CONTRACTS.length);
  assert.equal(Object.keys(r.whole).length, 6, "every full unit was composed and checked");
  assert.ok(Object.values(r.whole).every((w) => w.ok));
});

test("a second build of the same contracts costs ZERO model calls; a revised contract costs exactly ONE leaf", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-"));
  const cache = openUnitCache(path.join(dir, "cache"));
  const a = referenceMouth();
  await generateUnits({ mouths: ["ref"], mouth: a.mouth, cache, rng: () => 0.99 });
  const b = referenceMouth();
  const again = await generateUnits({ mouths: ["ref"], mouth: b.mouth, cache, rng: () => 0.99 });
  assert.equal(again.ok, true); assert.equal(b.asked.length, 0, "every leaf was a cache hit, re-tested against its oracle");
  assert.ok(Object.values(again.leaves).every((l) => l.cached));
  // revise ONE contract (a new revision of the leaf): only it is drawn again
  const revised = LEAF_CONTRACTS.map((c) => (c.name === "wttrHour" ? { ...c, doc: c.doc + " (revision 2)" } : c));
  const { makeUnit } = await import("./app-units.mjs");
  const c = referenceMouth(); const results = [];
  for (const k of revised) results.push(await makeUnit(k, { mouths: ["ref"], mouth: c.mouth, cache, rng: () => 0.99 }));
  assert.deepEqual(c.asked, ["wttrHour"], "only the revised leaf was drawn; the other seven were cache hits");
  assert.equal(results.filter((x) => x.cached).length, LEAF_CONTRACTS.length - 1);
});

test("a cached leaf whose code no longer passes is NOT trusted: it is redrawn", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-"));
  const cache = openUnitCache(path.join(dir, "cache"));
  const a = referenceMouth();
  await generateUnits({ mouths: ["ref"], mouth: a.mouth, cache, rng: () => 0.99, only: ["parsePlace"] });
  const { contractHash } = await import("./app-units.mjs");
  const place = LEAF_CONTRACTS.find((c) => c.name === "parsePlace");
  cache.put(contractHash(place), { name: "parsePlace", model: "ref", code: "function parsePlace(){ return null; }", hash: "x" });
  const b = referenceMouth();
  const r = await generateUnits({ mouths: ["ref"], mouth: b.mouth, cache, rng: () => 0.99, only: ["parsePlace"] });
  assert.deepEqual(b.asked, ["parsePlace"]); assert.equal(r.leaves.parsePlace.cached, false);
});

test("a leaf no mouth can make pass stops the build with a typed gap; nothing composes", async () => {
  const mouth = async () => ({ text: "function parsePlace(){ return 1; }", ms: 1, outTokens: 1 });
  const r = await generateUnits({ mouths: ["x"], mouth, rng: () => 0.99, only: ["parsePlace"] });
  assert.equal(r.ok, false);
  assert.equal(r.gap.type, "leaf_failed"); assert.equal(r.gap.leaf, "parsePlace");
});

test("buildVariants writes N distinct pages from one verified set — a layout change and a theme change each change the page", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "variants-"));
  const units = Object.fromEntries(LEAF_CONTRACTS.map((c) => [c.name, { code: REFERENCE_LEAVES[c.name], model: "reference" }]));
  const r = buildVariants({ root, axes: { layout: ["forecastie"], theme: [null, "dark"], place: ["Paris", "Tokyo"], fuel: [true, false] }, units, specs: { forecastie: { weather, fuel } } });
  assert.equal(r.cells.length, 8);
  assert.ok(r.cells.every((c) => c.ok), JSON.stringify(r.cells.filter((c) => !c.ok)));
  assert.equal(r.distinctPages, 8, "every axis changes the bytes");
  assert.notEqual(r.cells.find((c) => c.axes.theme === "dark").accent, undefined);
  const light = r.cells.find((c) => c.axes.theme === null && c.axes.fuel), dark = r.cells.find((c) => c.axes.theme === "dark" && c.axes.fuel && c.axes.place === light.axes.place);
  assert.equal(light.scheme, "light"); assert.equal(dark.scheme, "dark");
  const miss = buildVariants({ root, axes: { layout: ["nope"] }, units, specs: {} });
  assert.equal(miss.cells[0].ok, false); assert.equal(miss.cells[0].gap.type, "no_spec");
});
