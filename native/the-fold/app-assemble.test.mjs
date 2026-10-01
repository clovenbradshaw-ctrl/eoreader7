import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compSpecOf } from "../organs/comp-read.js";
import { layoutOf, bindingFor, themeOf, renderPage } from "./app-render.mjs";
import { assembleApp, REQUIRED_UNITS } from "./app-assemble.mjs";
import { WEATHER_TABLE, FUEL_TABLE } from "./app-bindings.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { FIXTURES } from "./app-weather-fuel.mjs";

const comp = (f) => compSpecOf(JSON.parse(fs.readFileSync(path.join(FIXTURES, "comps", f), "utf8")));
const weatherSpec = comp("weather-comp-detect.json"), fuelSpec = comp("fuel-comp-detect.json");

test("layoutOf drops the device's chrome and keeps the comp's own order", () => {
  const l = layoutOf(weatherSpec);
  assert.deepEqual(l.dropped.map((d) => d.zone), ["z0"]);
  assert.deepEqual(l.blocks.map((b) => b.kind), ["title", "summary", "tabs", "list"]);
});

test("bindingFor binds what the source side declared and reports every field it could not bind, by slot", () => {
  const b = bindingFor(weatherSpec, WEATHER_TABLE);
  const slots = b.bound.map((x) => x.slot);
  for (const s of ["title", "headline", "caption", "fact", "aside", "tabs", "entry.heading", "entry.caption", "entry.aside", "entry.fact", "list"]) assert.ok(slots.includes(s), `bound ${s}`);
  // the comp shows pressure on every forecast row; the contract has none per hour: a named gap, not an invention
  assert.ok(b.gaps.some((g) => g.slot === "entry.fact" && /pressure/i.test(g.label)), JSON.stringify(b.gaps));
  assert.ok(b.bound.filter((x) => x.slot === "fact").length >= 6, "all six summary facts bound by label");
});

test("the fuel comp's per-station prices have no source field: they are gaps, and the entry still gets heading/caption/aside", () => {
  const b = bindingFor(fuelSpec, FUEL_TABLE);
  const gapLabels = b.gaps.map((g) => g.label).filter(Boolean);
  for (const l of ["E5", "E10", "D"]) assert.ok(gapLabels.includes(l), `${l} is reported as unbound`);
  for (const s of ["entry.heading", "entry.caption", "entry.aside"]) assert.ok(b.bound.some((x) => x.slot === s), s);
});

test("themeOf reads only measured colours; the comp's blue becomes the accent", () => {
  const t = themeOf(weatherSpec);
  assert.equal(t.accent, "#2195f2");
  assert.equal(t.scheme, "light");
  assert.match(themeOf({ palette: [] }).basis, /no palette/);
  assert.equal(themeOf(weatherSpec, { scheme: "dark" }).scheme, "dark");
  assert.notEqual(themeOf(weatherSpec, { scheme: "dark" }).surface, t.surface);
});

test("the page carries the comp's ARRANGEMENT and none of its words", () => {
  const p = renderPage({ appName: "Weather & Fuel", weather: { spec: weatherSpec, table: WEATHER_TABLE, displayNames: {} }, fuel: { spec: fuelSpec, table: FUEL_TABLE, displayNames: {} } });
  for (const copied of ["London, GB", "Overcast clouds", "Saturday 09/05/2020", "Scattered clouds", "TOMORROW", "LATER", "HAMBURG", "Hoyer", "BAUMEISTERSTRASSE", "Prices", "Forecastie", "Spritpreise"]) assert.ok(!p.html.includes(copied), `the page must not contain the comp's text "${copied}"`);
  assert.match(p.html, /id="tabs" data-n="3"/);
  assert.match(p.html, /id="entry-tpl"/);
  assert.match(p.html, /id="station-tpl"/);
  assert.match(p.html, /--accent:#2195f2/);
  // the client script must parse
  const script = /<script>([\s\S]*)<\/script>/.exec(p.html)[1];
  assert.doesNotThrow(() => new Function(script));
});

test("a missing unit is a typed gap, nothing is written", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asm-"));
  const out = path.join(dir, "app");
  const r = assembleApp({ outDir: out, weatherSpec, fuelSpec, units: { parsePlace: { code: REFERENCE_LEAVES.parsePlace } } });
  assert.equal(r.ok, false); assert.equal(r.gap.type, "units_missing"); assert.ok(r.gap.missing.includes("priceAfter"));
  assert.equal(fs.existsSync(out), false);
});

test("an assembled app boots on its own, serves the page and the provenance, and refuses a bad request", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asm-"));
  const out = path.join(dir, "app");
  const units = Object.fromEntries(REQUIRED_UNITS.map((n) => [n, { code: REFERENCE_LEAVES[n], model: "reference", rounds: 0, calls: 0 }]));
  const r = assembleApp({ outDir: out, weatherSpec, fuelSpec, units, provenance: { comps: JSON.parse(fs.readFileSync(path.join(FIXTURES, "comps", "PROVENANCE.json"), "utf8")), likeness: { verdict: "no verbatim run and no near-copy found", compared: 12, nullCount: 3 } } });
  assert.equal(r.ok, true);
  for (const f of ["index.html", "server.mjs", "lib/unit-wall.mjs", "lib/stigmergy.js", "lib/compose.mjs", "lib/key-referents.js", "manifest.json", "about.html", "binding-report.json", ...REQUIRED_UNITS.map((n) => `units/${n}.js`)]) assert.ok(fs.existsSync(path.join(out, f)), f);
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [path.join(out, "server.mjs"), String(port)], { stdio: ["ignore", "pipe", "pipe"] });
  try {
    await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("server did not start")), 8000); child.stdout.on("data", (d) => { if (String(d).includes("http://")) { clearTimeout(t); res(); } }); child.on("exit", (c) => rej(new Error("server exited " + c))); });
    const get = (p) => new Promise((res, rej) => http.get({ host: "127.0.0.1", port, path: p }, (x) => { let b = ""; x.on("data", (d) => (b += d)); x.on("end", () => res({ status: x.statusCode, body: b })); }).on("error", rej));
    const idx = await get("/"); assert.equal(idx.status, 200); assert.match(idx.body, /<title>Weather &amp; Fuel<\/title>/);
    const about = await get("/about"); assert.equal(about.status, 200); assert.match(about.body, /GPL-3.0/); assert.match(about.body, /no verbatim run/);
    const bad = await get("/api/weather?lat=abc&lon=1"); assert.equal(bad.status, 400);
    const nope = await get("/api/nothing"); assert.equal(nope.status, 404);
    const noq = await get("/api/geocode"); assert.equal(noq.status, 400);
    const trails = await get("/api/trails"); assert.equal(trails.status, 200);
  } finally { child.kill(); }
});
