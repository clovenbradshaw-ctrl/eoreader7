// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 6 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-assemble.mjs — set the generated app down as a directory that runs on its own.
//
//   index.html          computed from the comp specs (app-render.mjs)
//   server.mjs          computed glue (app-template/server.mjs), verbatim
//   lib/unit-wall.mjs   the empty-context wall the units run behind
//   lib/stigmergy.js    the trail layer the provider order is learned with (kernel/stigmergy.js, verbatim)
//   lib/compose.mjs     the computed walk over rows that turns leaves into the five full parsers
//   units/<name>.js     the verified LEAVES, each exactly the bytes that passed its oracle
//   manifest.json       what the server needs to load them + what the audit page shows
//   about.html          provenance: the comps seen (license signals), the units and who drew them, the checks, the gaps
//   binding-report.json every comp field and what it was bound to — or why it was not
//
// Nothing is written until every unit is present and passing: an assembly with a missing unit is a
// typed gap, not a half-built app.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { renderPage } from "./app-render.mjs";
import { WEATHER_TABLE, WEATHER_NAMES, FUEL_TABLE, FUEL_NAMES } from "./app-bindings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
import { LEAF_NAMES, FULL_UNITS, LEAVES_OF } from "./app-compose.mjs";
export const REQUIRED_UNITS = LEAF_NAMES;

/**
 * assembleApp({ outDir, appName, weatherSpec, fuelSpec, units, theme?, defaultPlace?, provenance? })
 *   units: { [name]: { code, model, rounds, calls, cached, hash } } — every name in REQUIRED_UNITS
 * -> { ok, dir, files, binding, theme } | { ok:false, gap }
 */
export function assembleApp({ outDir, appName = "Weather & Fuel", weatherSpec, fuelSpec = null, units, theme = null, defaultPlace = "London", provenance = {} }) {
  const missing = REQUIRED_UNITS.filter((n) => !units?.[n]?.code);
  if (missing.length) return { ok: false, gap: { type: "units_missing", missing, detail: "an app is not assembled around a unit no mouth could make pass" } };
  const page = renderPage({ appName, weather: { spec: weatherSpec, table: WEATHER_TABLE, displayNames: WEATHER_NAMES }, fuel: fuelSpec ? { spec: fuelSpec, table: FUEL_TABLE, displayNames: FUEL_NAMES, heading: "Fuel nearby" } : null, theme, defaultPlace });
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const d of ["lib", "units", "state"]) fs.mkdirSync(path.join(outDir, d), { recursive: true });
  const w = (rel, data) => { fs.writeFileSync(path.join(outDir, rel), data); return rel; };
  const files = [];
  files.push(w("index.html", page.html));
  files.push(w("server.mjs", fs.readFileSync(path.join(here, "app-template", "server.mjs"))));
  // the wall imports the key-referent layer by its repo path; in the bundle both sit in lib/
  files.push(w("lib/unit-wall.mjs", fs.readFileSync(path.join(here, "unit-wall.mjs"), "utf8").replace('"../organs/key-referents.js"', '"./key-referents.js"')));
  files.push(w("lib/key-referents.js", fs.readFileSync(path.join(here, "..", "organs", "key-referents.js"))));
  files.push(w("lib/compose.mjs", fs.readFileSync(path.join(here, "app-compose.mjs"))));
  files.push(w("lib/stigmergy.js", fs.readFileSync(path.join(here, "..", "kernel", "stigmergy.js"))));
  const manifest = {
    schema: "EOGeneratedApp@1", appName, generatedBy: "eoreader7 native/the-fold/app-assemble.mjs",
    userAgent: "generated-weather-fuel-app/1 (local demo; built by eoreader7)",
    composed: Object.fromEntries(FULL_UNITS.map((n) => [n, LEAVES_OF[n]])), wholeOracle: provenance.wholeOracle ?? null,
    units: REQUIRED_UNITS.map((n) => ({ name: n, sha256: sha(units[n].code), model: units[n].model ?? null, rounds: units[n].rounds ?? null, calls: units[n].calls ?? null, cached: !!units[n].cached, contract: units[n].hash ?? null, declared: units[n].declared ?? {}, resolutions: units[n].resolutions ?? [] })),
    theme: page.theme, defaultPlace,
    comps: provenance.comps ?? null, likeness: provenance.likeness ?? null, variant: provenance.variant ?? null,
  };
  for (const n of REQUIRED_UNITS) files.push(w(`units/${n}.js`, units[n].code.endsWith("\n") ? units[n].code : units[n].code + "\n"));
  files.push(w("manifest.json", JSON.stringify(manifest, null, 1)));
  files.push(w("binding-report.json", JSON.stringify(page.binding, null, 1)));
  files.push(w("about.html", aboutHtml({ appName, manifest, binding: page.binding, provenance })));
  return { ok: true, dir: outDir, files, binding: page.binding, theme: page.theme, manifest };
}

function aboutHtml({ appName, manifest, binding, provenance }) {
  const row = (cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  const comps = provenance.comps ? Object.entries(provenance.comps).filter(([k]) => k !== "note").map(([k, c]) => row([esc(k), `<a href="${esc(c.image?.url)}">${esc(c.image?.url)}</a>`, esc(c.license?.id ?? "unknown"), esc(c.license?.standing ?? ""), esc((c.image?.sha256 ?? "").slice(0, 12))])).join("") : "";
  const units = manifest.units.map((u) => row([esc(u.name), esc(u.model ?? "—"), esc(u.rounds ?? "—"), esc(u.calls ?? "—"), u.cached ? "cache hit (re-tested)" : "drawn", `<code>${esc(u.sha256.slice(0, 12))}</code>`])).join("");
  const gaps = (x) => (x?.gaps ?? []).map((g) => `<li><code>${esc(g.slot ?? "")}</code> ${esc(g.label ?? "")} — ${esc(g.why)}</li>`).join("");
  const lk = provenance.likeness;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>How ${esc(appName)} was made</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:860px;margin:0 auto;padding:16px;color:#111}table{border-collapse:collapse;width:100%;margin:8px 0 18px}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;font-size:.9rem}h2{margin:22px 0 4px}code{background:#f2f2f2;padding:0 4px;border-radius:4px}.warn{background:#fff7e0;border:1px solid #f0d890;border-radius:8px;padding:8px 12px}</style>
<h1>How ${esc(appName)} was made</h1>
<p>Generated locally by eoreader7. The layout and data binding are computed from measured comps; the small functions that read each source's response were written by local models and accepted only when they reproduced independent readings of real recorded responses.</p>
<h2>Comps looked at</h2><table><tr><th>role</th><th>screenshot</th><th>license</th><th>standing</th><th>sha256</th></tr>${comps}</table>
<p class="warn">Only the arrangement of each comp (what is grouped with what, relative sizes, the measured palette) was carried into this app — none of its text, images or code. Both comps are copyleft-licensed; this app copies none of their expression.</p>
<h2>Leaves (code drawn by local models; the walk over rows is computed)</h2><table><tr><th>leaf</th><th>mouth</th><th>repair rounds</th><th>calls</th><th>how</th><th>sha256</th></tr>${units}</table>
<h2>Copy check</h2><p>${lk ? esc(lk.verdict) + ` — compared against ${esc(lk.compared)} things seen, with ${esc(lk.nullCount ?? 0)} unrelated images as the null.` : "not run"}</p>
<h2>What the comps showed that this app does not</h2><p>Weather:</p><ul>${gaps(binding.weather) || "<li>none</li>"}</ul>${binding.fuel ? `<p>Fuel:</p><ul>${gaps(binding.fuel) || "<li>none</li>"}</ul>` : ""}
<h2>Data</h2><ul><li>Places: Open-Meteo geocoding (CC BY 4.0).</li><li>Weather: wttr.in, else MET Norway locationforecast (CC BY 4.0) — the order is learned by trails, see <code>/api/trails</code>.</li><li>Fuel stations: OpenStreetMap via Overpass (ODbL).</li><li>Fuel prices: U.S. EIA weekly national average by grade only — there is no open per-station price feed; outside the U.S. no prices are shown.</li></ul>
<p><a href="/">back to the app</a></p></html>`;
}
