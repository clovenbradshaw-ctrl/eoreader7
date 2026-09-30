// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 4, 11 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// server.mjs — the generated app's server. COMPUTED glue: fetch, route, convert clocks, rank
// providers by learned trails, walk the rows (lib/compose.mjs). Every read of ONE row of a response
// goes through a LEAF — code a model drew and an oracle verified against real recorded rows — run
// behind the empty-context wall (lib/unit-wall.mjs). No dependencies; Node >= 18.
//
//   GET /                      the page
//   GET /api/geocode?q=        places (unit: parseGeocode)
//   GET /api/weather?lat&lon&units&tz   conditions + hours; providers ranked by trails (units: parseWttr, parseMetNo)
//   GET /api/fuel?lat&lon&country       stations near (unit: parseStations) + U.S. average prices (unit: parseEia)
//   GET /api/trails            what the stigmergy has learned (per provider: deposits, strength, mean ms)
//   GET /about                 how this app was made (provenance: comps seen, units and their mouths, checks)
//
// Run: node server.mjs [port]   (set NODE_USE_ENV_PROXY=1 behind an HTTP proxy)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUnit } from "./lib/unit-wall.mjs";
import { COMPOSE, LEAVES_OF, FULL_UNITS } from "./lib/compose.mjs";
import { deposit, routeOrderFor, trailStats } from "./lib/stigmergy.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8850);
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
const UA = manifest.userAgent ?? "generated-weather-fuel-app/1 (local demo)";
const STATE = path.join(DIR, "state");
fs.mkdirSync(STATE, { recursive: true });
const TRAILS_FILE = path.join(STATE, "trails.json");
let trails = {}; try { trails = JSON.parse(fs.readFileSync(TRAILS_FILE, "utf8")); } catch {}
const saveTrails = () => { try { fs.writeFileSync(TRAILS_FILE + ".tmp", JSON.stringify(trails)); fs.renameSync(TRAILS_FILE + ".tmp", TRAILS_FILE); } catch {} };

// ---- the leaves (verified code a model drew), each behind the wall, and the computed composition around them ----
const leaf = {};
for (const u of manifest.units) leaf[u.name] = loadUnit(fs.readFileSync(path.join(DIR, "units", `${u.name}.js`), "utf8"), u.name);
const unit = Object.fromEntries(FULL_UNITS.map((n) => [n, COMPOSE[n](Object.fromEntries(LEAVES_OF[n].map((l) => [l, leaf[l]])))]));

// ---- a polite, cached, time-limited fetch ----
const cache = new Map();
const TTL_MS = 10 * 60 * 1000;
async function getText(url, { method = "GET", body, headers = {}, ttl = TTL_MS, timeout = 20000 } = {}) {
  const key = method + url + (body ?? "");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.text;
  const r = await fetch(url, { method, body, headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`${new URL(url).host} answered ${r.status}`);
  const text = await r.text();
  cache.set(key, { at: Date.now(), text });
  return text;
}
const getJson = async (url, o) => JSON.parse(await getText(url, o));

// ---- computed helpers (no model writes these) ----
const WORDS = ["thunderstorm", "thunder", "showers", "shower", "drizzle", "sleet", "snow", "rain", "fog", "mist", "haze", "cloudy", "clear", "sky", "fair", "partly", "light", "heavy", "and", "sunny", "overcast", "patchy", "moderate", "freezing", "blowing", "possible", "nearby", "in", "vicinity"];
const pretty = (s) => { const t = String(s ?? "").trim(); if (!t) return "—"; if (/\s/.test(t) || /[A-Z]/.test(t)) return t[0].toUpperCase() + t.slice(1); let rest = t.toLowerCase(), out = []; while (rest) { const w = WORDS.filter((x) => rest.startsWith(x)).sort((a, b) => b.length - a.length)[0]; if (!w) { out.push(rest); break; } out.push(w); rest = rest.slice(w.length); } const x = out.join(" "); return x[0].toUpperCase() + x.slice(1); };
const localParts = (isoUtc, tz) => { try { const f = new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(isoUtc + ":00Z")); return f.replace(" ", "T").slice(0, 16); } catch { return null; } };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (date, i) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAYS[new Date(date + "T12:00:00Z").getUTCDay()]);

// ---- providers, in a structural default order; the learned order reorders them ----
const PROVIDERS = {
  wttr: { unit: "parseWttr", url: (p) => `https://wttr.in/${p.lat},${p.lon}?format=j1`, headers: { accept: "application/json" } },
  metno: { unit: "parseMetNo", url: (p) => `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${Number(p.lat).toFixed(4)}&lon=${Number(p.lon).toFixed(4)}`, headers: {} },
};

async function weather(p) {
  const order = routeOrderFor(trails, "weather", { routes: Object.keys(PROVIDERS) });
  const tried = [], errors = [];
  for (const name of order) {
    const prov = PROVIDERS[name], t0 = Date.now();
    try {
      const raw = await getJson(prov.url(p), { headers: prov.headers });
      const out = unit[prov.unit](raw, p.units);
      if (!out?.now || !Array.isArray(out.hours) || !out.hours.length) throw new Error("the unit returned no conditions");
      tried.push(name);
      trails = deposit(trails, { head: "weather", route: name, ok: true, ms: Date.now() - t0, at: Date.now() }); saveTrails();
      let hours = out.hours.map((h) => ({ ...h }));
      if (out.clock === "utc") hours = hours.map((h) => ({ ...h, at: localParts(h.at, p.tz) ?? h.at }));
      hours = hours.map((h) => { const [date, time] = String(h.at).split("T"); return { ...h, date, time, label: `${WEEKDAYS[new Date(date + "T12:00:00Z").getUTCDay()]} ${time}`, condition: pretty(h.condition) }; });
      const dates = [...new Set(hours.map((h) => h.date))];
      const days = dates.map((date, i) => ({ date, label: dayLabel(date, i) }));
      const now = { ...out.now, condition: pretty(out.now.condition) };
      const im = p.units === "imperial";
      return { source: name, tried: [...errors.map((e) => e.name), name], units: { temp: im ? "°F" : "°C", wind: im ? "mph" : "km/h", pressure: "hPa" }, now, hours, days, clock: out.clock === "utc" && !localParts("2000-01-01T00:00", p.tz) ? "utc" : "local", fetchedAt: new Date().toISOString().slice(11, 16) + " UTC" };
    } catch (e) {
      tried.push(name); errors.push({ name, error: String(e.message).slice(0, 160) }); // failure deposits nothing: evaporation alone demotes it
    }
  }
  const err = new Error("every weather provider failed: " + errors.map((e) => `${e.name}: ${e.error}`).join("; "));
  err.providers = errors; throw err;
}

const OVERPASS = "https://overpass-api.de/api/interpreter";
async function fuel(p) {
  const q = `[out:json][timeout:20];(node(around:4000,${p.lat},${p.lon})[amenity=fuel];way(around:4000,${p.lat},${p.lon})[amenity=fuel];);out center 60;`;
  const raw = await getJson(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "Mozilla/5.0 (compatible; generated-weather-fuel-app/1)" } });
  const stations = unit.parseStations(raw, Number(p.lat), Number(p.lon));
  let prices = null, priceGap = null;
  if (/^united states/i.test(p.country ?? "")) {
    try { const e = unit.parseEia(await getText("https://www.eia.gov/petroleum/gasdiesel/", { ttl: 6 * 3600 * 1000 })); prices = { week: e.week, grades: e.prices, scope: "U.S. weekly average retail price (EIA) — not a station price" }; }
    catch (e) { priceGap = "The U.S. average price page could not be read right now: " + String(e.message).slice(0, 120); }
  } else priceGap = `No open, current fuel-price feed is wired for ${p.country || "this country"}; stations are shown without prices.`;
  return { stations, prices, priceGap };
}

const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type + (type.startsWith("text") || type.includes("json") ? "; charset=utf-8" : ""), "cache-control": "no-store" }); res.end(Buffer.isBuffer(body) || typeof body === "string" ? body : JSON.stringify(body)); };
const read = (f) => fs.readFileSync(path.join(DIR, f));

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname === "/" || u.pathname === "/index.html") return send(res, 200, read("index.html"), "text/html");
    if (u.pathname === "/about") return send(res, 200, read("about.html"), "text/html");
    if (u.pathname === "/api/geocode") {
      const q = (u.searchParams.get("q") ?? "").trim(); if (!q) return send(res, 400, { error: "a place name is needed" });
      const raw = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`, { ttl: 24 * 3600 * 1000 });
      return send(res, 200, { places: unit.parseGeocode(raw) });
    }
    if (u.pathname === "/api/weather" || u.pathname === "/api/fuel") {
      const p = Object.fromEntries(u.searchParams); const lat = Number(p.lat), lon = Number(p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return send(res, 400, { error: "lat and lon are needed" });
      p.units = p.units === "imperial" ? "imperial" : "metric";
      return send(res, 200, u.pathname === "/api/weather" ? await weather(p) : await fuel(p));
    }
    if (u.pathname === "/api/trails") return send(res, 200, { head: "weather", stats: trailStats(trails, "weather", { routes: Object.keys(PROVIDERS) }), raw: trails });
    send(res, 404, { error: "not found" });
  } catch (e) { send(res, 502, { error: String(e.message).slice(0, 300), providers: e.providers }); }
}).listen(PORT, "127.0.0.1", () => console.log(`${manifest.appName} on http://127.0.0.1:${PORT}`));
