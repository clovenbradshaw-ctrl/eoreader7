// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 5 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-weather-fuel.mjs — the DECLARED half of the weather + fuel-price app: the
// sources the comps' fields bind to, and the contract + oracle of every unit a
// model is asked to draw. Nothing here is generated; everything the generator
// trusts is here.
//
// The binding (comp field -> source field) is declared by whoever wired the source
// — the comp says WHAT is on screen (a headline temperature, a wind fact, a list
// of stations each with a price per grade); the source says WHERE the number
// lives. A unit is a pure function from one REAL recorded response to a declared
// shape, and its oracle reads the same paths straight off the JSON, independently
// of whatever the mouth wrote. Each contract also runs the unit on a MUTATED copy
// of the sample (changed values, reordered rows): a function that hard-coded the
// example it was shown fails there, because the oracle re-reads the mutated bytes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.join(here, "fixtures", "weather-fuel");
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(FIXTURES, f), "utf8"));
const readText = (f) => fs.readFileSync(path.join(FIXTURES, f), "utf8");
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---- the oracle's own little tools (written beside the tests, never shared with a mouth) ----
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compass16 = (deg) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0088, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const num = (x) => (x === undefined || x === null || x === "" ? NaN : Number(x));

/** expect(path, got, want) — pushes a failure that names the path, what came back and what the recorded bytes say. */
function expect(out, path_, got, want, tol = 0) {
  const same = typeof want === "number" ? typeof got === "number" && Number.isFinite(got) && Math.abs(got - want) <= tol : got === want;
  // the \u0001 tail carries the expected value to the runner, which LOCATES it in the input (app-units.mjs `locate`) and strips it before anyone reads the message
  if (!same) out.push(`${path_} is ${JSON.stringify(got)}, the recorded data says ${JSON.stringify(want)}${tol ? ` (±${tol})` : ""}${tol ? "" : `\u0001${JSON.stringify(want)}`}`);
}
const isArr = (out, p, v) => { if (!Array.isArray(v)) { out.push(`${p} must be an array, got ${typeof v}`); return false; } return true; };
const isObj = (out, p, v) => { if (!v || typeof v !== "object" || Array.isArray(v)) { out.push(`${p} must be an object, got ${Array.isArray(v) ? "array" : typeof v}`); return false; } return true; };

// ============================ 1. geocode (Open-Meteo) ============================
const geocodeSample = readJson("geocode.json");
const geocodeMutated = (s) => { const c = clone(s); c.results.reverse(); c.results[0].name = "Springfield"; c.results[0].admin1 = "Missouri"; c.results[0].latitude = 37.21533; c.results[0].longitude = -93.29824; return c; };
function geocodeCheck(out, s) {
  const f = [];
  if (!isArr(f, "output", out)) return f;
  expect(f, "output.length", out.length, s.results.length);
  s.results.forEach((r, i) => {
    const o = out[i]; if (!o) return;
    expect(f, `[${i}].name`, o.name, r.name);
    expect(f, `[${i}].lat`, o.lat, r.latitude, 1e-6);
    expect(f, `[${i}].lon`, o.lon, r.longitude, 1e-6);
    expect(f, `[${i}].country`, o.country, r.country ?? null);
    expect(f, `[${i}].region`, o.region ?? null, r.admin1 ?? null);
    expect(f, `[${i}].tz`, o.tz ?? null, r.timezone ?? null);
    expect(f, `[${i}].label`, o.label, [r.name, r.admin1, r.country].filter(Boolean).join(", "));
  });
  return f;
}
const geocodeWant = (s) => s.results.map((r) => ({ name: r.name, lat: r.latitude, lon: r.longitude, country: r.country ?? null, region: r.admin1 ?? null, tz: r.timezone ?? null, label: [r.name, r.admin1, r.country].filter(Boolean).join(", ") }));
export const geocodeContract = {
  name: "parseGeocode", kind: "parse", params: ["json"], paramDoc: "geocoding response",
  doc: "Turn a place-search response into a list of places, in the order given.",
  returns: "an array, one object per entry of `results`: { name, lat, lon, country, region, tz, label }\n  name = the entry's name, lat = its latitude, lon = its longitude, country = its country name, region = its admin1 (or null), tz = its timezone (or null),\n  label = the entry's `name`, `admin1` and `country` joined with \", \" (leave out any that are missing)",
  notes: "If `results` is missing or empty, return an empty array.",
  sampleJson: geocodeSample, example: { args: "(the response above)", output: (s) => geocodeWant(s) },
  runs: [
    { label: "recorded sample", args: (s) => [s], check: (o, s) => geocodeCheck(o, s) },
    { label: "mutated sample", args: (s) => [geocodeMutated(s)], check: (o, s) => geocodeCheck(o, geocodeMutated(s)) },
    { label: "no results", args: () => [{ generationtime_ms: 0.1 }], check: (o) => (Array.isArray(o) && o.length === 0 ? [] : [`a response with no \`results\` must give [], got ${JSON.stringify(o)}`]) },
  ],
};

// ============================ shared weather shape ============================
const conv = {
  temp: (c, units) => (units === "imperial" ? (c * 9) / 5 + 32 : c),
  wind: (kmh, units) => (units === "imperial" ? kmh / 1.609344 : kmh),
};
const WEATHER_RETURNS = `an object { now, hours, clock }
  now = { temp, feels, condition, windSpeed, windDir, pressure, humidity, uv, sunrise, sunset }
  hours = an array of { at, temp, condition, windSpeed, humidity, rain }
  clock = "local" or "utc" (see the notes)
  Units: when units is "metric", temperatures are degrees Celsius and wind speeds km/h; when "imperial", degrees Fahrenheit and mph.
  Pressure is hPa and humidity is percent, always. Round temp, feels, windSpeed, pressure and humidity to whole numbers; rain is millimetres (a number).`;

function weatherCheck(out, s, units, spec) {
  const f = [];
  if (!isObj(f, "output", out)) return f;
  if (!isObj(f, "output.now", out.now)) return f;
  const n = out.now, w = spec.now(s, units);
  expect(f, "now.temp", n.temp, Math.round(w.temp), spec.tol);
  expect(f, "now.feels", n.feels, Math.round(w.feels), spec.tol);
  expect(f, "now.condition", spec.cond(n.condition), spec.cond(w.condition));
  expect(f, "now.windSpeed", n.windSpeed, Math.round(w.windSpeed), spec.tol);
  expect(f, "now.windDir", n.windDir, w.windDir);
  expect(f, "now.pressure", n.pressure, Math.round(w.pressure), spec.tol ? 1 : 0);
  expect(f, "now.humidity", n.humidity, Math.round(w.humidity), spec.tol ? 1 : 0);
  expect(f, "now.uv", n.uv ?? null, w.uv, w.uv === null ? 0 : 1e-9);
  expect(f, "now.sunrise", n.sunrise ?? null, w.sunrise);
  expect(f, "now.sunset", n.sunset ?? null, w.sunset);
  expect(f, "clock", out.clock, spec.clock);
  if (!isArr(f, "hours", out.hours)) return f;
  const hw = spec.hours(s, units);
  expect(f, "hours.length", out.hours.length, hw.length);
  hw.forEach((h, i) => {
    const o = out.hours[i]; if (!o) return;
    expect(f, `hours[${i}].at`, o.at, h.at);
    expect(f, `hours[${i}].temp`, o.temp, Math.round(h.temp), spec.tol);
    expect(f, `hours[${i}].condition`, spec.cond(o.condition), spec.cond(h.condition));
    expect(f, `hours[${i}].windSpeed`, o.windSpeed, Math.round(h.windSpeed), spec.tol);
    expect(f, `hours[${i}].humidity`, o.humidity, Math.round(h.humidity), spec.tol ? 1 : 0);
    expect(f, `hours[${i}].rain`, o.rain, h.rain, 0.051);
  });
  return f.slice(0, 8);
}

const wantWeather = (s, units, spec) => { const w = spec.now(s, units); const r = (x) => Math.round(x); return { now: { temp: r(w.temp), feels: r(w.feels), condition: w.condition, windSpeed: r(w.windSpeed), windDir: w.windDir, pressure: r(w.pressure), humidity: r(w.humidity), uv: w.uv, sunrise: w.sunrise, sunset: w.sunset }, hours: spec.hours(s, units).map((h) => ({ at: h.at, temp: r(h.temp), condition: h.condition, windSpeed: r(h.windSpeed), humidity: r(h.humidity), rain: h.rain })), clock: spec.clock }; };

// ============================ 2. wttr.in ============================
const wttrSample = readJson("wttr.json");
const wttrMutated = (s) => { const c = clone(s); const cur = c.current_condition[0]; cur.temp_C = "-4"; cur.temp_F = "25"; cur.FeelsLikeC = "-9"; cur.FeelsLikeF = "16"; cur.windspeedKmph = "31"; cur.windspeedMiles = "19"; cur.winddir16Point = "NW"; cur.humidity = "91"; cur.pressure = "998"; cur.uvIndex = "1"; cur.weatherDesc[0].value = "Light snow "; c.weather[0].astronomy[0].sunrise = "07:41 AM"; c.weather[0].astronomy[0].sunset = "04:12 PM"; c.weather[1].hourly[2].tempC = "-2"; c.weather[1].hourly[2].tempF = "28"; c.weather[1].hourly[2].weatherDesc[0].value = "Heavy snow"; c.weather[1].hourly[2].precipMM = "3.4"; c.weather.pop(); return c; };
const wttrSpec = {
  tol: 0, clock: "local", cond: (x) => String(x ?? "").trim().toLowerCase(),
  now: (s, u) => { const c = s.current_condition[0], a = s.weather[0].astronomy[0]; return { temp: u === "imperial" ? num(c.temp_F) : num(c.temp_C), feels: u === "imperial" ? num(c.FeelsLikeF) : num(c.FeelsLikeC), condition: c.weatherDesc[0].value, windSpeed: u === "imperial" ? num(c.windspeedMiles) : num(c.windspeedKmph), windDir: c.winddir16Point, pressure: num(c.pressure), humidity: num(c.humidity), uv: Number.isFinite(num(c.uvIndex)) ? num(c.uvIndex) : null, sunrise: a.sunrise ?? null, sunset: a.sunset ?? null }; },
  hours: (s, u) => s.weather.flatMap((d) => d.hourly.map((h) => { const t = String(h.time).padStart(4, "0"); return { at: `${d.date}T${t.slice(0, 2)}:${t.slice(2)}`, temp: u === "imperial" ? num(h.tempF) : num(h.tempC), condition: h.weatherDesc[0].value, windSpeed: u === "imperial" ? num(h.windspeedMiles) : num(h.windspeedKmph), humidity: num(h.humidity), rain: num(h.precipMM) }; })),
};
export const wttrContract = {
  name: "parseWttr", kind: "parse", params: ["json", "units"], paramDoc: "weather response",
  doc: "Turn a wttr.in weather response into the current conditions and an hour-by-hour forecast.",
  returns: WEATHER_RETURNS,
  notes: [
    "now comes from `current_condition[0]`: temp/feels from the _C or _F fields by units, condition = weatherDesc[0].value trimmed of spaces, windSpeed from windspeedKmph or windspeedMiles by units, windDir = winddir16Point, pressure, humidity, uv = uvIndex as a number.",
    "sunrise and sunset come from `weather[0].astronomy[0]` as the strings given (e.g. \"06:59 AM\"); null if missing.",
    "hours has one entry for every item of every day's `hourly` list, in order. `at` = the day's date + \"T\" + the item's `time` as HH:MM (the source writes 0 as \"0\", 300 as \"300\", 1200 as \"1200\": pad to four digits, then HH:MM) — for example \"2026-09-30T03:00\". rain = precipMM as a number. temp, condition, windSpeed, humidity read like now.",
    "clock is always \"local\" for this source.",
  ].join("\n"),
  sampleJson: wttrSample, example: { args: "(the response above, \"metric\")", output: (s) => wantWeather(s, "metric", wttrSpec) },
  runs: [
    { label: "recorded, metric", args: (s) => [s, "metric"], check: (o, s) => weatherCheck(o, s, "metric", wttrSpec) },
    { label: "recorded, imperial", args: (s) => [s, "imperial"], check: (o, s) => weatherCheck(o, s, "imperial", wttrSpec) },
    { label: "mutated, metric", args: (s) => [wttrMutated(s), "metric"], check: (o, s) => weatherCheck(o, wttrMutated(s), "metric", wttrSpec) },
  ],
};

// ============================ 3. MET Norway ============================
const metnoSample = readJson("metno.json");
const symbolBase = (code) => String(code ?? "").replace(/_(day|night|polartwilight)$/, "").replace(/_/g, " ");
const metnoMutated = (s) => { const c = clone(s); const t = c.properties.timeseries; const d = t[0].data.instant.details; d.air_temperature = -3.6; d.apparent_air_temperature = -8.2; d.wind_speed = 11.4; d.wind_from_direction = 301; d.relative_humidity = 93.4; d.air_pressure_at_sea_level = 987.6; d.ultraviolet_index_clear_sky = 0.4; t[0].data.next_1_hours.summary.symbol_code = "heavysnow"; t[3].data.next_1_hours.details.precipitation_amount = 2.6; t.splice(5, 1); return c; };
const metnoSpec = {
  tol: 1, clock: "utc", cond: (x) => String(x ?? "").trim().toLowerCase(),
  now: (s, u) => { const d = s.properties.timeseries[0].data; const i = d.instant.details; const tc = num(i.air_temperature), fc = num(i.apparent_air_temperature ?? i.air_temperature); const kmh = num(i.wind_speed) * 3.6;
    return { temp: conv.temp(tc, u), feels: conv.temp(fc, u), condition: symbolBase((d.next_1_hours ?? d.next_6_hours ?? d.next_12_hours)?.summary?.symbol_code), windSpeed: conv.wind(kmh, u), windDir: compass16(num(i.wind_from_direction)), pressure: num(i.air_pressure_at_sea_level), humidity: num(i.relative_humidity), uv: Number.isFinite(num(i.ultraviolet_index_clear_sky)) ? num(i.ultraviolet_index_clear_sky) : null, sunrise: null, sunset: null }; },
  hours: (s, u) => s.properties.timeseries.slice(0, 24).map((t) => { const i = t.data.instant.details; const nx = t.data.next_1_hours ?? t.data.next_6_hours; return { at: String(t.time).slice(0, 16), temp: conv.temp(num(i.air_temperature), u), condition: symbolBase(nx?.summary?.symbol_code), windSpeed: conv.wind(num(i.wind_speed) * 3.6, u), humidity: num(i.relative_humidity), rain: nx?.details?.precipitation_amount ?? 0 }; }),
};
export const metnoContract = {
  name: "parseMetNo", kind: "parse", params: ["json", "units"], paramDoc: "weather response",
  doc: "Turn a MET Norway locationforecast response into the current conditions and an hour-by-hour forecast.",
  returns: WEATHER_RETURNS,
  notes: [
    "The data is `properties.timeseries`, a list of hourly entries; entry 0 is now. Its numbers are in `data.instant.details`: air_temperature (Celsius), apparent_air_temperature (Celsius, feels-like), wind_speed (METRES PER SECOND), wind_from_direction (degrees), air_pressure_at_sea_level, relative_humidity, ultraviolet_index_clear_sky.",
    "Convert: km/h = m/s × 3.6; mph = m/s × 2.23694; Fahrenheit = C × 9/5 + 32. windDir is the 16-point compass name (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW) of wind_from_direction: index = Math.round(degrees / 22.5) % 16.",
    "condition = the symbol_code at `data.next_1_hours.summary.symbol_code` (use next_6_hours if next_1_hours is missing) with any ending _day, _night or _polartwilight removed and other underscores replaced by spaces — e.g. \"lightrain\" or \"partlycloudy\". This source has no sunrise or sunset: both are null.",
    "hours = the FIRST 24 entries of the timeseries: `at` = the entry's `time` cut to \"YYYY-MM-DDTHH:MM\" (drop the seconds and the Z); rain = next_1_hours.details.precipitation_amount (0 if there is none); the rest read like now.",
    "clock is always \"utc\" for this source (its times are UTC).",
  ].join("\n"),
  sampleJson: metnoSample, example: { args: "(the response above, \"metric\")", output: (s) => wantWeather(s, "metric", metnoSpec) },
  runs: [
    { label: "recorded, metric", args: (s) => [s, "metric"], check: (o, s) => weatherCheck(o, s, "metric", metnoSpec) },
    { label: "recorded, imperial", args: (s) => [s, "imperial"], check: (o, s) => weatherCheck(o, s, "imperial", metnoSpec) },
    { label: "mutated, metric", args: (s) => [metnoMutated(s), "metric"], check: (o, s) => weatherCheck(o, metnoMutated(s), "metric", metnoSpec) },
  ],
};

// ============================ 4. fuel stations (Overpass) ============================
const stationsSample = readJson("stations.json");
const STATION_AT = { lat: 51.5085, lon: -0.1257 };
const stationsMutated = (s) => { const c = clone(s); c.elements.reverse(); c.elements[0].tags = { amenity: "fuel", brand: "Shell", "addr:street": "High Street" }; delete c.elements[0].tags.name; c.elements[1].lat = 51.52; c.elements[1].lon = -0.2; c.elements.push({ type: "way", id: 9, center: { lat: 51.51, lon: -0.13 }, tags: { amenity: "fuel", name: "Corner Garage", "addr:housenumber": "12", "addr:street": "Mill Lane" } }); c.elements.push({ type: "relation", id: 10, tags: { amenity: "fuel", name: "No Position" } }); return c; };
function stationsCheck(out, s, at) {
  const f = [];
  if (!isArr(f, "output", out)) return f;
  const want = s.elements.map((e) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null; const t = e.tags ?? {}; const addr = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null; return { name: t.name || t.brand || "Fuel station", brand: t.brand ?? null, km: haversineKm(at.lat, at.lon, lat, lon), address: addr }; }).filter(Boolean).sort((a, b) => a.km - b.km);
  expect(f, "output.length", out.length, want.length);
  want.forEach((w, i) => { const o = out[i]; if (!o) return;
    expect(f, `[${i}].km`, o.km, Math.round(w.km * 10) / 10, 0.061);
    expect(f, `[${i}].name`, o.name, w.name);
    expect(f, `[${i}].brand`, o.brand ?? null, w.brand);
    expect(f, `[${i}].address`, o.address ?? null, w.address);
  });
  for (let i = 1; i < out.length; i++) if (!(out[i - 1].km <= out[i].km)) { f.push(`output is not sorted by km ascending (index ${i - 1}: ${out[i - 1].km}, index ${i}: ${out[i].km})`); break; }
  return f.slice(0, 8);
}
const stationsWant = (s, at) => s.elements.map((e) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null; const t = e.tags ?? {}; return { name: t.name || t.brand || "Fuel station", brand: t.brand ?? null, km: Math.round(haversineKm(at.lat, at.lon, lat, lon) * 10) / 10, address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null }; }).filter(Boolean).sort((a, b) => a.km - b.km);
export const stationsContract = {
  name: "parseStations", kind: "parse", params: ["json", "lat", "lon"], paramDoc: "fuel-station response (and the point lat, lon the person searched from)",
  doc: "Turn an OpenStreetMap Overpass response into the fuel stations near a point, nearest first.",
  returns: "an array of { name, brand, km, address }, sorted by km ascending\n  name = tags.name, else tags.brand, else \"Fuel station\"; brand = tags.brand or null;\n  km = the great-circle (haversine) distance in kilometres from (lat, lon) to the station, rounded to one decimal;\n  address = tags[\"addr:housenumber\"] and tags[\"addr:street\"] joined by a space (whichever exist), or null if neither exists",
  notes: "Each element of `elements` has its position as `lat` and `lon` (nodes) or as `center.lat` and `center.lon` (ways). Skip an element that has neither. Earth radius 6371 km.",
  sampleJson: stationsSample, example: { args: `(the response above, ${STATION_AT.lat}, ${STATION_AT.lon})`, output: (s) => stationsWant(s, STATION_AT) },
  runs: [
    { label: "recorded sample", args: (s) => [s, STATION_AT.lat, STATION_AT.lon], check: (o, s) => stationsCheck(o, s, STATION_AT) },
    { label: "mutated sample, other point", args: (s) => [stationsMutated(s), 51.5, -0.12], check: (o, s) => stationsCheck(o, stationsMutated(s), { lat: 51.5, lon: -0.12 }) },
  ],
};

// ============================ 4b. fuel stations (Nominatim) — a second, differently-shaped source for the same thing ============================
const nominatimSample = readJson("nominatim.json");
const nominatimMutated = (s) => { const c = clone(s); c.reverse(); delete c[0].name; c[0].display_name = "Corner Garage, Mill Lane, Somewhere"; delete c[0].address.house_number; c[1].lat = "51.52"; c[1].lon = "-0.2"; c[2].address = {}; c.push({ lat: "not a number", lon: "0", name: "Broken", address: {} }); return c; };
const nominatimOne = (e, at) => { const lat = Number(e.lat), lon = Number(e.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null; const a = e.address ?? {}; return { name: e.name || String(e.display_name ?? "").split(",")[0].trim() || "Fuel station", brand: e.name || null, km: Math.round(haversineKm(at.lat, at.lon, lat, lon) * 10) / 10, address: [a.house_number, a.road].filter(Boolean).join(" ") || null }; };
const nominatimWant = (s, at) => s.map((e) => nominatimOne(e, at)).filter(Boolean).sort((a, b) => a.km - b.km);
function nominatimCheck(out, s, at) {
  const f = [];
  if (!isArr(f, "output", out)) return f;
  const want = nominatimWant(s, at);
  expect(f, "output.length", out.length, want.length);
  want.forEach((w, i) => { const o = out[i]; if (!o) return; expect(f, `[${i}].km`, o.km, w.km, 0.061); expect(f, `[${i}].name`, o.name, w.name); expect(f, `[${i}].brand`, o.brand ?? null, w.brand); expect(f, `[${i}].address`, o.address ?? null, w.address); });
  for (let i = 1; i < out.length; i++) if (!(out[i - 1].km <= out[i].km)) { f.push(`output is not sorted by km ascending (index ${i - 1}: ${out[i - 1].km}, index ${i}: ${out[i].km})`); break; }
  return f.slice(0, 8);
}
export const nominatimContract = {
  name: "parseNominatim", kind: "parse", params: ["json", "lat", "lon"], paramDoc: "place-search response (and the point lat, lon searched from)",
  doc: "Turn a Nominatim search response for fuel stations into the stations near a point, nearest first.",
  returns: "an array of { name, brand, km, address }, sorted by km ascending (same shape as parseStations)",
  notes: "The response is an array of results, each with `lat` and `lon` as STRINGS, an optional `name`, a `display_name` and an `address` object. Skip a result whose lat or lon is not a number.",
  sampleJson: nominatimSample, example: { args: `(the response above, ${STATION_AT.lat}, ${STATION_AT.lon})`, output: (s) => nominatimWant(s, STATION_AT) },
  runs: [
    { label: "recorded sample", args: (s) => [s, STATION_AT.lat, STATION_AT.lon], check: (o, s) => nominatimCheck(o, s, STATION_AT) },
    { label: "mutated sample, other point", args: (s) => [nominatimMutated(s), 51.5, -0.12], check: (o, s) => nominatimCheck(o, nominatimMutated(s), { lat: 51.5, lon: -0.12 }) },
  ],
};

// ============================ 5. U.S. average prices (EIA) ============================
const eiaSample = readText("eia.html");
const eiaMutated = (h) => {
  let x = h.replace(/(class="Series5">)09\/28\/26/, "$109/28/99");
  // change the newest (Current2) cell of the Regular and Diesel rows, and an older cell to prove the newest one is the one read
  x = x.replace(/(class="DataStub1">Regular<[\s\S]*?class="DataB">)4\.085/, "$19.111").replace(/(class="DataStub1">Regular<[\s\S]*?class="Current2">)4\.465/, "$13.333");
  x = x.replace(/(class="DataStub1">Ultra Low Sulfur \(15 ppm and Under\)<[\s\S]*?class="Current2">)6\.382/, "$17.654");
  return x;
};
function eiaWant(h) {
  const weeks = [...h.matchAll(/class="Series5">([^<]*)</g)].map((m) => m[1].trim());
  const cell = (stub) => { const i = h.indexOf(`class="DataStub1">${stub}<`); if (i < 0) return null; const j = h.indexOf('class="Current2">', i); const m = /^([0-9.]+)</.exec(h.slice(j + 'class="Current2">'.length, j + 40)); return m ? Number(m[1]) : null; };
  return { week: weeks[weeks.length - 1] ?? null, prices: [["Regular", "Regular"], ["Midgrade", "Midgrade"], ["Premium", "Premium"], ["Diesel", "Ultra Low Sulfur (15 ppm and Under)"]].map(([grade, stub]) => ({ grade, price: cell(stub) })) };
}
function eiaCheck(out, h) {
  const f = [];
  if (!isObj(f, "output", out)) return f;
  const w = eiaWant(h);
  expect(f, "week", out.week, w.week);
  if (!isArr(f, "prices", out.prices)) return f;
  expect(f, "prices.length", out.prices.length, w.prices.length);
  w.prices.forEach((p, i) => { const o = out.prices[i]; if (!o) return; expect(f, `prices[${i}].grade`, o.grade, p.grade); expect(f, `prices[${i}].price`, o.price, p.price, 1e-9); });
  return f;
}
const squash = (t) => t.replace(/\s+/g, " ").replace(/<td width="\d+"><\/td>/g, "");
function eiaShown(h) {
  const s = squash(h);
  const heads = s.slice(s.indexOf('<th class="Series5">'), s.indexOf('<th class="Cross">') + 40);
  const row = (stub) => { const i = s.indexOf(`class="DataStub1">${stub}<`); const a = s.lastIndexOf("<tr", i); const b = s.indexOf("</tr>", s.indexOf("Current2", i)) + 5; return s.slice(a, b); };
  const tail = (x) => x.replace(/<td width="\d+" class="DataHist">[\s\S]*$/, "");
  return [heads, "…", tail(row("Regular")), "…", "(the rows for Midgrade, Premium and \"Ultra Low Sulfur (15 ppm and Under)\" read the same way; they are cut here)"].join("\n").slice(0, 2500);
}
export const eiaContract = {
  name: "parseEia", kind: "parse", params: ["html"], paramDoc: "page (an excerpt of its price table is shown)",
  doc: "Read the newest weekly U.S. retail prices off the EIA gasoline-and-diesel page.",
  returns: "an object { week, prices }\n  week = the text of the LAST <th class=\"Series5\"> header cell (the newest week, e.g. \"09/28/26\")\n  prices = exactly these four objects, in this order, { grade, price }: grades \"Regular\", \"Midgrade\", \"Premium\", \"Diesel\"; price = a number, dollars per gallon",
  notes: "Each price row has a <td class=\"DataStub1\"> naming it, then one <td> per week with the NEWEST week's cell marked class=\"Current2\". \"Regular\", \"Midgrade\" and \"Premium\" are the rows whose DataStub1 text is exactly that; the first Current2 cell after a DataStub1 is that row's price (the \"Conventional Areas\" and \"Reformulated Areas\" rows under each are different rows — ignore them). \"Diesel\" is the row whose DataStub1 text is \"Ultra Low Sulfur (15 ppm and Under)\".",
  sampleText: eiaSample, shown: eiaShown(eiaSample), example: { args: "(the whole page, of which an excerpt is shown above)", output: (h) => eiaWant(h) },
  runs: [
    { label: "recorded page", args: (h) => [h], check: (o, h) => eiaCheck(o, h) },
    { label: "mutated page", args: (h) => [eiaMutated(h)], check: (o, h) => eiaCheck(o, eiaMutated(h)) },
  ],
};

/** every unit of the app, in the order the assembly needs them */
export const UNIT_CONTRACTS = [geocodeContract, wttrContract, metnoContract, stationsContract, nominatimContract, eiaContract];

// the oracle's own readings, shared with the leaf contracts (app-leaves.mjs) so a leaf and the whole are judged by ONE set of independent paths
export const ORACLE = { geocodeSample, geocodeMutated, geocodeWant, wttrSample, wttrMutated, wttrSpec, metnoSample, metnoMutated, metnoSpec, wantWeather, stationsSample, stationsMutated, stationsWant, STATION_AT, eiaSample, eiaMutated, eiaWant, nominatimSample, nominatimMutated, nominatimOne, nominatimWant, expect, isObj, isArr, clone, num };
