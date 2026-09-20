// build-nashville-metrics.mjs — fold municipal-db/nashville-geo.json (Tier A
// snapshot) into MetricRow@1 rows with per-row provenance. Every row rendered
// on the surface carries its dataset id + source + asOf; a metric without
// provenance is never rendered.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const METRICS_DIR = join(HERE, "nashville", "metrics");
const SRC = join(dirname(HERE), "..", "municipal-db", "nashville-geo.json");

const geo = JSON.parse(readFileSync(SRC, "utf8"));
const { properties, violations, districts } = geo.datasets;
const prov = {
  dataset: "municipal-db/nashville-geo.json",
  source: geo.metadata.source,
  asOf: geo.metadata.asOf,
};

const rows = [];
let seq = 0;
const push = (registry, fields, extra = {}) => rows.push({
  schema: "MetricRow@1",
  registry,
  id: `nashville:metrics:${registry}:${String(++seq).padStart(4, "0")}`,
  ...extra,
  fields,
  provenance: { ...prov, registry },
});

for (const d of districts.rows ?? []) {
  push("districts", d, { district: d.district });
}

const raw = violations.features ?? [];
const openByDistrict = {};
for (const f of raw) {
  const p = f.properties ?? {};
  const dist = p.district;
  openByDistrict[dist] ??= { open: 0, total: 0 };
  openByDistrict[dist].total++;
  if (/^open$/i.test(String(p.status ?? ""))) openByDistrict[dist].open++;
}
for (const [dist, counts] of Object.entries(openByDistrict)) {
  push("violations-by-district", counts, { district: Number(dist) });
}
for (const f of raw) {
  const p = f.properties ?? {};
  push("violations", p, { district: p.district, request_nbr: p.request_nbr });
}

const props = properties.features ?? [];
const evictions = props.reduce((a, f) => a + Number(f.properties?.evictions ?? 0), 0);
const byLandlord = new Map();
for (const f of props) {
  const p = f.properties ?? {};
  const name = p.landlord ?? "unknown";
  const cur = byLandlord.get(name) ?? { landlord: name, properties: 0, evictions: 0 };
  cur.properties += 1;
  cur.evictions += Number(p.evictions ?? 0);
  byLandlord.set(name, cur);
}
for (const l of [...byLandlord.values()].sort((a, b) => b.properties - a.properties).slice(0, 20)) {
  push("landlords", l);
}
push("housing-stress", { totalEvictionFilings: evictions, propertyRows: props.length, distinctLandlords: byLandlord.size });

mkdirSync(METRICS_DIR, { recursive: true });
writeFileSync(join(METRICS_DIR, "metrics-nashville.json"), JSON.stringify(rows, null, 2));
console.log(JSON.stringify({
  total: rows.length,
  byRegistry: rows.reduce((a, r) => ((a[r.registry] = (a[r.registry] ?? 0) + 1), a), {}),
  housingStress: rows.find((r) => r.registry === "housing-stress").fields,
}, null, 2));