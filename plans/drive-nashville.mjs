// drive-nashville.mjs — the Nashville instance, composed ONLY of the fold's
// surface blocks. Chain: ground → cast → extract → metrics → derive → gate →
// surface. The gate is a hard precondition: when it refuses, no HTML is
// written and the driver exits non-zero — an ungrounded surface is refused.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSnippet } from "../cli/holograph.mjs";
import { retainGround } from "../native/the-fold/surface/block-ground.mjs";
import { castTexts } from "../native/the-fold/surface/block-cast.mjs";
import { extractLinks } from "../native/the-fold/surface/block-extract.mjs";
import { foldFieldRows } from "../native/the-fold/surface/block-metrics.mjs";
import { deriveProjections } from "../native/the-fold/surface/block-derive.mjs";
import { gateSurface } from "../native/the-fold/surface/block-gate.mjs";
import { renderSurface } from "../native/the-fold/surface/block-surface.mjs";
import { buildNativePages } from "../native/the-fold/surface/block-native.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NASH = join(HERE, "nashville");
const GROUND = join(NASH, "ground");
const DATA = join(NASH, "data");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ── instance: manifest + def ──────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(join(NASH, "manifest.json"), "utf8"));
const def = JSON.parse(readFileSync(join(NASH, "nashville.surfacedef.json"), "utf8"));
// The place->district lighting map is OWNED by this pipeline, not by the
// live surfacedef: plans/discover-nashville.mjs rewrites the whole file
// (including metrics.placeDistricts) on every autonomous cycle and has no
// concept of districts, so trusting that field from the live file makes
// the lighting projection flicker to empty whenever that process runs
// concurrently. Merge the pinned mapping in unconditionally, every build.
// See CODING-LESSONS.md — "the discovery-dialogue write race."
def.metrics = def.metrics ?? {};
def.metrics.placeDistricts = JSON.parse(readFileSync(join(NASH, "placeDistricts.json"), "utf8"));
delete def.metrics.placeDistricts._comment;

// ── block 1 · ground (Void): retain or verify ─────────────────────────────
const ground = await retainGround({ manifest, dir: GROUND, seedBase: HERE });

// ── block 2 · cast (Entity/Kind): the beings of the retained corpus ───────
const texts = ground.docs.map((d) => ({ name: d.title, text: readFileSync(d.txtPath, "utf8") }));
const cast = castTexts({ texts });

// ── block 3 · extract (Link): byte-anchored rows ──────────────────────────
// The extractor's vocabulary is the DISCOVERY DIALOGUE's product when a
// surfacedef carries one (plans/discover-nashville.mjs writes `vocab` from
// the person's answers — never a model's list). Absent a vocab, the
// extractor falls back to its received defaults.
const links = ground.docs.flatMap((d) => {
  const pagemap = JSON.parse(readFileSync(d.pagemapPath, "utf8"));
  return extractLinks({ text: readFileSync(d.txtPath, "utf8"), doc: `nashville/ground/${d.id}.txt`, mode: d.extraction, pagemap, vocab: def.vocab ?? null });
});

// ── block 4 · metrics (Field): the provenance-stamped snapshot ────────────
const geo = JSON.parse(readFileSync(join(dirname(HERE), "..", "municipal-db", "nashville-geo.json"), "utf8"));
const provenance = { dataset: "municipal-db/nashville-geo.json", source: geo.metadata.source, asOf: geo.metadata.asOf };
const metrics = foldFieldRows({
  snapshot: geo.datasets,
  provenance,
  adapters: [
    { registry: "districts", run: ({ snapshot, push }) => { for (const d of snapshot.districts?.rows ?? []) push("districts", d, { district: d.district }); } },
    { registry: "violations-by-district", run: ({ snapshot, push }) => {
        const open = {};
        for (const f of snapshot.violations?.features ?? []) { const p = f.properties ?? {}; const k = p.district; open[k] ??= { open: 0, total: 0 }; open[k].total++; if (/^open$/i.test(String(p.status ?? ""))) open[k].open++; }
        for (const [d, c] of Object.entries(open)) push("violations-by-district", c, { district: Number(d) });
      } },
    { registry: "landlords", run: ({ snapshot, push }) => {
        const m = new Map();
        for (const f of snapshot.properties?.features ?? []) { const p = f.properties ?? {}; const n = p.landlord ?? "unknown"; const c = m.get(n) ?? { landlord: n, properties: 0, evictions: 0 }; c.properties++; c.evictions += Number(p.evictions ?? 0); m.set(n, c); }
        for (const l of [...m.values()].sort((a, b) => b.properties - a.properties).slice(0, 20)) push("landlords", l);
      } },
    { registry: "housing-stress", run: ({ snapshot, push }) => {
        const props = snapshot.properties?.features ?? [];
        push("housing-stress", { totalEvictionFilings: props.reduce((a, f) => a + Number(f.properties?.evictions ?? 0), 0), propertyRows: props.length, distinctLandlords: new Set(props.map((f) => f.properties?.landlord)).size });
      } },
  ],
});

// ── metric byte-sourcing: raw rows carry byte refs into the retained
// snapshot; aggregates declare their derivation (derivedFrom), so EVERY
// metric is sourceable — to the byte, or to the deterministic fold. ───────
mkdirSync(DATA, { recursive: true });
const SNAP = join(DATA, "nashville-geo.json");
copyFileSync(join(dirname(HERE), "..", "municipal-db", "nashville-geo.json"), SNAP);
const snapSha = sha(SNAP);
writeFileSync(join(DATA, "nashville-geo.json.sidecar.json"), JSON.stringify({
  schema: "EODataArtifact@1", path: "nashville/data/nashville-geo.json", sha256: snapSha,
  chars: readFileSync(SNAP, "utf8").length, source: provenance.source, asOf: provenance.asOf,
}, null, 2));
const snapText = readFileSync(SNAP, "utf8");
const DERIVED_ADDR = {
  "violations-by-district": "/datasets/violations/features",
  "landlords": "/datasets/properties/features",
  "housing-stress": "/datasets/properties/features",
};
const districtsMark = snapText.indexOf('"districts"');
const rowsMark = snapText.indexOf('"rows":', districtsMark);
if (rowsMark < 0) throw new Error("districts rows not found in the retained snapshot");
const rowsText = snapText.slice(rowsMark);
for (const m of metrics) {
  if (m.registry === "districts") {
    const n = Number(m.district);
    const rel = rowsText.indexOf(`"district":${n}`);
    if (rel < 0) throw new Error(`district ${n} not found in the retained snapshot`);
    const start = rowsMark + rel;
    const nextRel = rowsText.indexOf(`"district":${n + 1}`, rel);
    const end = nextRel > rel ? rowsMark + nextRel : snapText.length;
    m.at = [start, end];
    m.ref = `nashville/data/nashville-geo.json#${start}-${end}`;
    m.verbatim = snapText.slice(start, end).replace(/\s+/g, " ").trim();
  } else {
    m.derivedFrom = { address: `nashville/data/nashville-geo.json#${DERIVED_ADDR[m.registry] ?? ""}`, basis: "deterministic fold over the retained snapshot" };
  }
}

// ── block 5 · derive (Network/Paradigm/Atmosphere) ────────────────────────
const projections = deriveProjections({ links, cast, def, metrics });

// ── block 6 · gate (Paradigm): refuse an ungrounded surface ───────────────
const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE, snapshotSidecar: { path: SNAP, sha256: snapSha } });
console.log("gate:", gate.ok ? "PASS" : "REFUSE");
for (const c of gate.checks) console.log(`  ${c.ok ? "●" : "✗"} ${c.name} · ${c.detail}`);
if (!gate.ok) { console.error("\nrefusing to render — the surface is ungrounded."); process.exit(1); }
gate.source = provenance.source;
gate.asOf = provenance.asOf;

// ── artifacts: the instance's ledger + metrics (cache) ────────────────────
mkdirSync(join(NASH, "ledger"), { recursive: true });
writeFileSync(join(NASH, "ledger", "plans-nashville.jsonl"), links.map((l) => JSON.stringify(l)).join("\n") + "\n");
mkdirSync(join(NASH, "metrics"), { recursive: true });
writeFileSync(join(NASH, "metrics", "metrics-nashville.json"), JSON.stringify(metrics, null, 2));

// ── block 7 · surface (Lens): render only a gated surface ─────────────────
const nativePages = {};
// SKIP_NATIVE=1 skips the slow pdftoppm/pdf.js render (ESCAPE HATCH for slow
// machines or partial verification — the native view degrades to a notice;
// verified full renders live in the committed artifact).
if (!process.env.SKIP_NATIVE) {
for (const d of ground.docs) {
  const pages = await buildNativePages(d);
  if (pages) { nativePages[d.id] = pages; console.log(`native: ${d.id} — ${pages.length} pages rendered + word-linked`); }
  else console.log(`native: ${d.id} — skipped (pdf.js/pdftoppm unavailable or failed)`);
}
} else console.log("native: skipped via SKIP_NATIVE — artifact will degrade to reader/source");
const geoPoints = (() => {
  try {
    const geo = JSON.parse(readFileSync(join(NASH, "data", "nashville-geo.json"), "utf8"));
    const props = geo.datasets?.properties?.features ?? [];
    const viols = geo.datasets?.violations?.features ?? [];
    const GRID = 0.004;
    const NASH_BOX = { minLon: -87.3, maxLon: -86.3, minLat: 35.85, maxLat: 36.55 };
    const inNash = (lon, lat) => lon >= NASH_BOX.minLon && lon <= NASH_BOX.maxLon && lat >= NASH_BOX.minLat && lat <= NASH_BOX.maxLat;
    const buckets = new Map();
    for (const f of props) {
      const [lon, lat] = f.geometry?.coordinates ?? [null, null];
      if (lon == null || !inNash(lon, lat)) continue;
      const key = Math.floor(lon / GRID) + "," + Math.floor(lat / GRID);
      const b = buckets.get(key) ?? { x: lon, y: lat, n: 0, ev: 0 };
      b.n++;
      b.ev += Number(f.properties?.evictions ?? 0);
      buckets.set(key, b);
    }
    const propArr = [...buckets.values()].map((b) => [b.x, b.y, b.n, b.ev]);
    const violArr = viols.map((v) => {
      const c = v.geometry?.coordinates ?? [];
      return [c[0] ?? null, c[1] ?? null, v.properties?.district ?? null].filter((x) => x != null);
    }).filter((v) => v.length === 3 && inNash(v[0], v[1]));
    const lons = [...propArr.map((p) => p[0]), ...violArr.map((v) => v[0])].filter((x) => x != null);
    const lats = [...propArr.map((p) => p[1]), ...violArr.map((v) => v[1])].filter((x) => x != null);
    if (!lons.length || !lats.length) return null;
    const pad = 0.03;
    const bounds = [Math.min(...lons) - pad, Math.min(...lats) - pad, Math.max(...lons) + pad, Math.max(...lats) + pad];
    console.log(`map: ${propArr.length} property clusters · ${violArr.length} violations · bounds ${bounds.map((x) => x.toFixed(3)).join(" ")}`);
    return { props: propArr, viols: violArr, bounds };
  } catch (e) {
    console.log("map: skipped —", e.message);
    return null;
  }
})();
const html = renderSurface({ def, ground, links, metrics, projections, gate, nativePages, geoPoints });
// RESOLVED OUTPUT COLLISION (see CODING-LESSONS.md #11): the autonomous
// discover session intermittently rebuilds plans-surface.html with its own
// pipeline, clobbering this driver's output mid-session. This pipeline
// writes its own distinct artifact so the two never share an output file.
const out = join(dirname(HERE), "native", "the-fold", "plans-surface-holograph.html");
writeFileSync(out, html);
console.log("\nwrote", out, (html.length / 1e6).toFixed(2), "MB");
console.log("cast:", cast.referents.size, "referents · links:", links.length, "· metrics:", metrics.length, "· networks:", projections.networks.length, "· lit places:", projections.places.filter((p) => p.state === "lit").length);