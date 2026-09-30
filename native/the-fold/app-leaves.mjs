// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 5, 6, 7 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-leaves.mjs — the leaf units a model is actually asked to draw: one small pure function
// of ONE real row, each with an oracle that reads the same bytes by independent paths.
//
// Why leaves. Whole-response parsers (a hundred-field weather JSON, a 22KB HTML table) are
// exactly where a small model slips — a day's worth of rows instead of three, a field it
// renamed on the way in — and a slip there costs a long draw and a long repair. Everything
// that WALKS rows (flatMap over days, slice, sort, filter) is computed in app-compose.mjs;
// what is drawn is "read this row", which a 1.5B model does in one short call. The composed
// whole is then held to the whole-response oracles in app-weather-fuel.mjs.
//
// A leaf's runs cover the rows the model was NOT shown (other hours of the day, a way with a
// `center`, a relation with no position, a station with only a brand) and a mutated copy of the
// sample, so a function that only reproduces the example row it was handed fails here.
import { ORACLE as O, eiaContract } from "./app-weather-fuel.mjs";
import { trimSample } from "./app-units.mjs";
import crypto from "node:crypto";

const { expect, isObj } = O;
const cut = (v, o = {}) => JSON.stringify(trimSample(v, { items: 2, str: 70, ...o }), null, 1);
const same = (f, p, got, want, tol = 0) => expect(f, p, got, want, tol);

/** per-row object check over a list of keys */
function rowCheck(out, want, keys, tol = {}) {
  const f = [];
  if (want === null) { if (out !== null) f.push(`must return null for this row, got ${JSON.stringify(out)?.slice(0, 80)}`); return f; }
  if (!isObj(f, "output", out)) return f;
  for (const k of keys) same(f, k, out[k] ?? (want[k] === null ? null : out[k]), want[k], tol[k] ?? 0);
  return f;
}

// ============================ parsePlace ============================
const geoRows = (s) => s.results;
export const parsePlaceContract = {
  name: "parsePlace", kind: "leaf", params: ["result"], paramDoc: "place-search result (one entry of `results`)",
  doc: "Turn ONE place-search result into a place.",
  returns: "an object { name, lat, lon, country, region, tz, label }\n  name = the result's `name`; lat = its `latitude`; lon = its `longitude`; country = its `country`; region = its `admin1` (or null); tz = its `timezone` (or null);\n  label = the result's `name`, `admin1` and `country` joined with \", \" (leave out any that are missing)",
  sampleJson: geoRows(O.geocodeSample)[0], example: { args: "(the result above)", output: () => O.geocodeWant(O.geocodeSample)[0] },
  runs: [],
};
parsePlaceContract.runs = [0, 1, 2].flatMap((i) => [
  { label: `recorded result ${i}`, args: () => [geoRows(O.geocodeSample)[i]], check: (out) => rowCheck(out, O.geocodeWant(O.geocodeSample)[i], ["name", "lat", "lon", "country", "region", "tz", "label"], { lat: 1e-6, lon: 1e-6 }) },
  { label: `mutated result ${i}`, args: () => [geoRows(O.geocodeMutated(O.geocodeSample))[i]], check: (out) => rowCheck(out, O.geocodeWant(O.geocodeMutated(O.geocodeSample))[i], ["name", "lat", "lon", "country", "region", "tz", "label"], { lat: 1e-6, lon: 1e-6 }) },
]).concat([{ label: "a result with no admin1 and no timezone", args: () => [{ name: "Nowhere", latitude: 1.5, longitude: -2.5, country: "Testland" }], check: (out) => rowCheck(out, { name: "Nowhere", lat: 1.5, lon: -2.5, country: "Testland", region: null, tz: null, label: "Nowhere, Testland" }, ["name", "lat", "lon", "country", "region", "tz", "label"]) }]);

// ============================ weather leaves ============================
const NOW_KEYS = ["temp", "feels", "condition", "windSpeed", "windDir", "pressure", "humidity", "uv", "sunrise", "sunset"];
const HOUR_KEYS = ["at", "temp", "condition", "windSpeed", "humidity", "rain"];
const norm = (spec, o) => ({ ...o, condition: spec.cond(o?.condition) });
function nowLeafCheck(out, s, units, spec) {
  const f = [];
  if (!isObj(f, "output", out)) return f;
  const w = O.wantWeather(s, units, spec).now;
  same(f, "temp", out.temp, w.temp, spec.tol); same(f, "feels", out.feels, w.feels, spec.tol);
  same(f, "condition", spec.cond(out.condition), spec.cond(w.condition));
  same(f, "windSpeed", out.windSpeed, w.windSpeed, spec.tol); same(f, "windDir", out.windDir, w.windDir);
  same(f, "pressure", out.pressure, w.pressure, spec.tol ? 1 : 0); same(f, "humidity", out.humidity, w.humidity, spec.tol ? 1 : 0);
  same(f, "uv", out.uv ?? null, w.uv, w.uv === null ? 0 : 1e-9);
  same(f, "sunrise", out.sunrise ?? null, w.sunrise); same(f, "sunset", out.sunset ?? null, w.sunset);
  return f;
}
function hourLeafCheck(out, s, units, spec, idx) {
  const f = [];
  if (!isObj(f, "output", out)) return f;
  const w = O.wantWeather(s, units, spec).hours[idx];
  same(f, "at", out.at, w.at); same(f, "temp", out.temp, w.temp, spec.tol); same(f, "condition", spec.cond(out.condition), spec.cond(w.condition));
  same(f, "windSpeed", out.windSpeed, w.windSpeed, spec.tol); same(f, "humidity", out.humidity, w.humidity, spec.tol ? 1 : 0); same(f, "rain", out.rain, w.rain, 0.051);
  return f;
}
const NOW_RETURNS = "an object { temp, feels, condition, windSpeed, windDir, pressure, humidity, uv, sunrise, sunset }\n  Units: when units is \"metric\", temperatures are degrees Celsius and wind speeds km/h; when \"imperial\", degrees Fahrenheit and mph. Pressure is hPa and humidity percent, always. Round temp, feels, windSpeed, pressure and humidity to whole numbers.";
const HOUR_RETURNS = "an object { at, temp, condition, windSpeed, humidity, rain }\n  Units: when units is \"metric\", temperature is degrees Celsius and wind speed km/h; when \"imperial\", degrees Fahrenheit and mph. Round temp, windSpeed and humidity to whole numbers; rain is millimetres (a number).";

// ---- wttr.in ----
const W = O.wttrSample, Wm = O.wttrMutated(O.wttrSample);
const wFlat = (s, i) => { let n = i; for (const d of s.weather) { if (n < d.hourly.length) return [d.date, d.hourly[n]]; n -= d.hourly.length; } return null; };
export const wttrNowContract = {
  name: "wttrNow", kind: "leaf", params: ["current", "astronomy", "units"], paramDoc: "current conditions",
  doc: "Turn a wttr.in response's current conditions into the `now` reading.",
  returns: NOW_RETURNS,
  notes: "temp/feels come from the _C or _F fields by units; condition = weatherDesc[0].value trimmed of spaces; windSpeed from windspeedKmph or windspeedMiles by units; windDir = winddir16Point; pressure, humidity as numbers; uv = uvIndex as a number. sunrise and sunset come from `astronomy` (it may be {}) as the strings given, e.g. \"06:59 AM\" — null if missing.",
  shown: `current = ${cut(W.current_condition[0], { items: 1 })}\nastronomy = ${cut(W.weather[0].astronomy[0])}\nunits = "metric"`,
  example: { args: "", output: () => O.wantWeather(W, "metric", O.wttrSpec).now },
  runs: [
    { label: "recorded, metric", args: () => [W.current_condition[0], W.weather[0].astronomy[0], "metric"], check: (o) => nowLeafCheck(o, W, "metric", O.wttrSpec) },
    { label: "recorded, imperial", args: () => [W.current_condition[0], W.weather[0].astronomy[0], "imperial"], check: (o) => nowLeafCheck(o, W, "imperial", O.wttrSpec) },
    { label: "mutated, metric", args: () => [Wm.current_condition[0], Wm.weather[0].astronomy[0], "metric"], check: (o) => nowLeafCheck(o, Wm, "metric", O.wttrSpec) },
    { label: "mutated, imperial", args: () => [Wm.current_condition[0], Wm.weather[0].astronomy[0], "imperial"], check: (o) => nowLeafCheck(o, Wm, "imperial", O.wttrSpec) },
  ],
};
export const wttrHourContract = {
  name: "wttrHour", kind: "leaf", params: ["date", "hour", "units"], paramDoc: "one hourly item (and its day's date)",
  doc: "Turn one item of a wttr.in day's `hourly` list into an hour of the forecast.",
  returns: HOUR_RETURNS,
  notes: "at = the date + \"T\" + the item's `time` as HH:MM. The source writes the time without padding — 0 is \"0\", 300 is \"300\", 1200 is \"1200\": pad it to four digits, then HH:MM. So date \"2026-09-30\" and time \"300\" give \"2026-09-30T03:00\". temp from tempC or tempF by units; condition = weatherDesc[0].value trimmed of spaces; windSpeed from windspeedKmph or windspeedMiles by units; humidity as a number; rain = precipMM as a number.",
  shown: `date = ${JSON.stringify(W.weather[0].date)}\nhour = ${cut(W.weather[0].hourly[0], { items: 1 })}\nunits = "metric"`,
  example: { args: "", output: () => O.wantWeather(W, "metric", O.wttrSpec).hours[0] },
  runs: [
    ...[[0, "metric"], [4, "metric"], [7, "imperial"], [9, "metric"], [16, "imperial"], [23, "metric"]].map(([i, u]) => ({ label: `recorded hour ${i}, ${u}`, args: () => [...wFlat(W, i), u], check: (o) => hourLeafCheck(o, W, u, O.wttrSpec, i) })),
    ...[[2, "metric"], [10, "imperial"]].map(([i, u]) => ({ label: `mutated hour ${i}, ${u}`, args: () => [...wFlat(Wm, i), u], check: (o) => hourLeafCheck(o, Wm, u, O.wttrSpec, i) })),
  ],
};

// ---- MET Norway ----
const M = O.metnoSample, Mm = O.metnoMutated(O.metnoSample);
export const metnoNowContract = {
  name: "metnoNow", kind: "leaf", params: ["entry", "units"], paramDoc: "first timeseries entry (now)",
  doc: "Turn the first entry of a MET Norway timeseries into the `now` reading.",
  returns: NOW_RETURNS,
  notes: "The numbers are in `entry.data.instant.details`: air_temperature (Celsius), apparent_air_temperature (Celsius, the feels-like), wind_speed (METRES PER SECOND), wind_from_direction (degrees), air_pressure_at_sea_level, relative_humidity, ultraviolet_index_clear_sky (uv). Convert: km/h = m/s × 3.6; mph = m/s × 2.23694; Fahrenheit = C × 9/5 + 32. windDir is the 16-point compass name — N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW — of wind_from_direction: index = Math.round(degrees / 22.5) % 16. condition = the symbol_code at `entry.data.next_1_hours.summary.symbol_code` (next_6_hours if there is no next_1_hours) with any ending _day, _night or _polartwilight removed and other underscores replaced by spaces, e.g. \"lightrain\". This source has no sunrise or sunset: both are null.",
  shown: `entry = ${cut(M.properties.timeseries[0], { items: 1, str: 40 })}\nunits = "metric"`,
  example: { args: "", output: () => O.wantWeather(M, "metric", O.metnoSpec).now },
  runs: [
    { label: "recorded, metric", args: () => [M.properties.timeseries[0], "metric"], check: (o) => nowLeafCheck(o, M, "metric", O.metnoSpec) },
    { label: "recorded, imperial", args: () => [M.properties.timeseries[0], "imperial"], check: (o) => nowLeafCheck(o, M, "imperial", O.metnoSpec) },
    { label: "mutated, metric", args: () => [Mm.properties.timeseries[0], "metric"], check: (o) => nowLeafCheck(o, Mm, "metric", O.metnoSpec) },
    { label: "mutated, imperial", args: () => [Mm.properties.timeseries[0], "imperial"], check: (o) => nowLeafCheck(o, Mm, "imperial", O.metnoSpec) },
  ],
};
export const metnoHourContract = {
  name: "metnoHour", kind: "leaf", params: ["entry", "units"], paramDoc: "one timeseries entry",
  doc: "Turn one entry of a MET Norway timeseries into an hour of the forecast.",
  returns: HOUR_RETURNS,
  notes: "at = the entry's `time` cut to \"YYYY-MM-DDTHH:MM\" (drop the seconds and the Z). The numbers are in `entry.data.instant.details`: air_temperature (Celsius), wind_speed (METRES PER SECOND), relative_humidity. Convert: km/h = m/s × 3.6; mph = m/s × 2.23694; Fahrenheit = C × 9/5 + 32. condition = the symbol_code at `entry.data.next_1_hours.summary.symbol_code` (next_6_hours if there is no next_1_hours) with any ending _day, _night or _polartwilight removed and other underscores replaced by spaces. rain = `entry.data.next_1_hours.details.precipitation_amount` (0 if there is none).",
  shown: `entry = ${cut(M.properties.timeseries[1], { items: 1, str: 40 })}\nunits = "metric"`,
  example: { args: "", output: () => O.wantWeather(M, "metric", O.metnoSpec).hours[1] },
  runs: [
    ...[[0, "metric"], [1, "metric"], [5, "imperial"], [12, "metric"], [23, "imperial"]].map(([i, u]) => ({ label: `recorded entry ${i}, ${u}`, args: () => [M.properties.timeseries[i], u], check: (o) => hourLeafCheck(o, M, u, O.metnoSpec, i) })),
    ...[[3, "metric"], [4, "imperial"]].map(([i, u]) => ({ label: `mutated entry ${i}, ${u}`, args: () => [Mm.properties.timeseries[i], u], check: (o) => hourLeafCheck(o, Mm, u, O.metnoSpec, i) })),
  ],
};

// ============================ parseStation ============================
const S = O.stationsSample, Sm = O.stationsMutated(O.stationsSample), AT = O.STATION_AT;
const stationWant = (e, at) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null; const t = e.tags ?? {}; return O.stationsWant({ elements: [e] }, at)[0]; };
const stationCheck = (out, e, at) => { const w = stationWant(e, at); if (w === null) return out === null ? [] : [`must return null for an element with no position, got ${JSON.stringify(out)?.slice(0, 80)}`]; return rowCheck(out, w, ["name", "brand", "km", "address"], { km: 0.061 }); };
export const parseStationContract = {
  name: "parseStation", kind: "leaf", params: ["element", "lat", "lon"], paramDoc: "fuel-station element (and the point lat, lon searched from)",
  doc: "Turn ONE OpenStreetMap element into a fuel station, or null if it has no position.",
  returns: "an object { name, brand, km, address }, or null\n  name = tags.name, else tags.brand, else \"Fuel station\"; brand = tags.brand or null;\n  km = the great-circle (haversine) distance in kilometres from (lat, lon) to the element, rounded to one decimal; address = tags[\"addr:housenumber\"] and tags[\"addr:street\"] joined by a space (whichever exist), or null if neither exists",
  notes: "The element's position is `lat` and `lon` (a node) or `center.lat` and `center.lon` (a way). If it has neither, return null. Earth radius 6371 km.",
  shown: `element = ${cut(S.elements[3])}\nlat = ${AT.lat}\nlon = ${AT.lon}`,
  example: { args: "", output: () => stationWant(S.elements[3], AT) },
  runs: [
    ...S.elements.map((e, i) => ({ label: `recorded element ${i}`, args: () => [e, AT.lat, AT.lon], check: (o) => stationCheck(o, e, AT) })),
    ...Sm.elements.map((e, i) => ({ label: `mutated element ${i}, other point`, args: () => [e, 51.5, -0.12], check: (o) => stationCheck(o, e, { lat: 51.5, lon: -0.12 }) })),
  ],
};

// ============================ nominatimStation ============================
const N = O.nominatimSample, Nm = O.nominatimMutated(O.nominatimSample);
const nominatimCheck = (out, e, at) => { const w = O.nominatimOne(e, at); if (w === null) return out === null ? [] : [`must return null for a result whose lat or lon is not a number, got ${JSON.stringify(out)?.slice(0, 80)}`]; return rowCheck(out, w, ["name", "brand", "km", "address"], { km: 0.061 }); };
export const nominatimStationContract = {
  name: "nominatimStation", kind: "leaf", params: ["item", "lat", "lon"], paramDoc: "place-search result (and the point lat, lon searched from)",
  doc: "Turn ONE Nominatim search result into a fuel station, or null if it has no usable position.",
  returns: "an object { name, brand, km, address }, or null\n  name = the item's `name`, else the first part of its `display_name` (before the first comma), else \"Fuel station\"; brand = the item's `name` or null;\n  km = the great-circle (haversine) distance in kilometres from (lat, lon) to the item, rounded to one decimal; address = address.house_number and address.road joined by a space (whichever exist), or null if neither exists",
  notes: "`item.lat` and `item.lon` are STRINGS: convert them to numbers. If either is not a number, return null. Earth radius 6371 km.",
  shown: `item = ${cut(N[2])}\nlat = ${AT.lat}\nlon = ${AT.lon}`,
  example: { args: "", output: () => O.nominatimOne(N[2], AT) },
  salt: crypto.createHash("sha256").update(JSON.stringify(N)).digest("hex").slice(0, 16),
  runs: [
    ...N.map((e, i) => ({ label: `recorded result ${i}`, args: () => [e, AT.lat, AT.lon], check: (o) => nominatimCheck(o, e, AT) })),
    ...Nm.map((e, i) => ({ label: `mutated result ${i}, other point`, args: () => [e, 51.5, -0.12], check: (o) => nominatimCheck(o, e, { lat: 51.5, lon: -0.12 }) })),
  ],
};

// ============================ EIA leaves ============================
const H = O.eiaSample, Hm = O.eiaMutated(O.eiaSample);
const cellOf = (h, stub) => { const i = h.indexOf(`class="DataStub1">${stub}<`); if (i < 0) return null; const j = h.indexOf('class="Current2">', i); const m = /^([0-9.]+)</.exec(h.slice(j + 'class="Current2">'.length, j + 40)); return m ? Number(m[1]) : null; };
const LABELS = ["Regular", "Midgrade", "Premium", "Ultra Low Sulfur (15 ppm and Under)"];
export const priceAfterContract = {
  name: "priceAfter", kind: "leaf", params: ["html", "label"], paramDoc: "page (an excerpt of its price table is shown) and the row label",
  doc: "Read one row's newest weekly price off the EIA page.",
  returns: "a number (dollars per gallon), or null if there is no row with that label",
  notes: "Each price row has a <td class=\"DataStub1\"> holding its name, then one <td> per week with the NEWEST week's cell marked class=\"Current2\". Find the DataStub1 cell whose text is exactly `label` (the first such cell), then return the number in the first class=\"Current2\" cell after it. Rows named \"Conventional Areas\" or \"Reformulated Areas\" are different rows: only an exact match on `label` counts.",
  shown: `${eiaContract.shown}\nlabel = "Regular"`,
  example: { args: "", output: () => cellOf(H, "Regular") },
  runs: [
    ...LABELS.map((l) => ({ label: `recorded page, ${l}`, args: () => [H, l], check: (o) => (typeof o === "number" && Math.abs(o - cellOf(H, l)) < 1e-9 ? [] : [`price for "${l}" is ${JSON.stringify(o)}, the recorded page says ${cellOf(H, l)}`]) })),
    ...["Regular", "Ultra Low Sulfur (15 ppm and Under)"].map((l) => ({ label: `mutated page, ${l}`, args: () => [Hm, l], check: (o) => (typeof o === "number" && Math.abs(o - cellOf(Hm, l)) < 1e-9 ? [] : [`price for "${l}" is ${JSON.stringify(o)}, the page says ${cellOf(Hm, l)}`]) })),
    { label: "a label with no row", args: () => [H, "Kerosene"], check: (o) => (o === null ? [] : [`must be null when no row has that label, got ${JSON.stringify(o)}`]) },
  ],
};
export const newestWeekContract = {
  name: "newestWeek", kind: "leaf", params: ["html"], paramDoc: "page (an excerpt of its price table is shown)",
  doc: "Read the newest week's date off the EIA page.",
  returns: "a string: the text of the LAST <th class=\"Series5\"> header cell (e.g. \"09/28/26\"), or null if there is none",
  notes: "The header row has one <th class=\"Series5\"> per week, oldest first.",
  shown: eiaContract.shown,
  example: { args: "", output: () => O.eiaWant(H).week },
  runs: [
    { label: "recorded page", args: () => [H], check: (o) => (o === O.eiaWant(H).week ? [] : [`week is ${JSON.stringify(o)}, the page says ${JSON.stringify(O.eiaWant(H).week)}`]) },
    { label: "mutated page", args: () => [Hm], check: (o) => (o === O.eiaWant(Hm).week ? [] : [`week is ${JSON.stringify(o)}, the page says ${JSON.stringify(O.eiaWant(Hm).week)}`]) },
    { label: "a page with no header", args: () => ["<html></html>"], check: (o) => (o === null ? [] : [`must be null with no header cell, got ${JSON.stringify(o)}`]) },
  ],
};

// a leaf's oracle reads whole recorded responses its shown row is only a piece of, so the hash of those bytes is part of the leaf's identity
const SALT = crypto.createHash("sha256").update(JSON.stringify([O.geocodeSample, O.wttrSample, O.metnoSample, O.stationsSample]) + O.eiaSample).digest("hex").slice(0, 16);
export const LEAF_CONTRACTS = [parsePlaceContract, wttrNowContract, wttrHourContract, metnoNowContract, metnoHourContract, parseStationContract, nominatimStationContract, newestWeekContract, priceAfterContract].map((c) => ({ ...c, salt: c.salt ?? SALT }));
export const leafContract = (name) => LEAF_CONTRACTS.find((c) => c.name === name);
