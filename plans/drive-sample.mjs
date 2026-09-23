// drive-sample.mjs — the SAMPLE instance: same blocks, zero real data.
// Three fictional plans are retained (synthetic text layers), extracted to
// byte-anchored links, cast, folded with sample metrics, gated, and rendered
// through the SAME surface block as the real instance — so the nine-terrain
// surface design can be iterated without the real ground. Every sample ref
// resolves verbatim against the sample ground; the gate still passes or the
// sample refuses to render.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSnippet } from "../cli/holograph.mjs";
import { groundDigest } from "../native/the-fold/surface/block-ground.mjs";
import { castTexts } from "../native/the-fold/surface/block-cast.mjs";
import { extractLinks } from "../native/the-fold/surface/block-extract.mjs";
import { foldFieldRows } from "../native/the-fold/surface/block-metrics.mjs";
import { deriveProjections } from "../native/the-fold/surface/block-derive.mjs";
import { gateSurface } from "../native/the-fold/surface/block-gate.mjs";
import { renderSurface } from "../native/the-fold/surface/block-surface.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE = join(HERE, "sample");
const GROUND = join(SAMPLE, "ground");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ── the sample corpus: fictional plans, clean single-column text ──────────
const PLANS = {
  "arcadia-transit": "Arcadia Transit Vision 2030",
  "arcadia-housing": "Arcadia Housing Strategy",
  "arcadia-climate": "Arcadia Climate Action Plan",
};
const TEXTS = {
  "arcadia-transit":
    "The Arcadia Transit Vision 2030 is the region's 2030 transit plan.\n" +
    "Goal: MTA will expand the bus network to 24 miles of dedicated lanes.\n" +
    "Action: the city will coordinate with NDOT on East Bank corridor signals.\n" +
    "Target: 40 percent of residents within a 10-minute walk of transit.\n",
  "arcadia-housing":
    "The Arcadia Housing Strategy sets housing goals for the decade.\n" +
    "Goal: the Housing Division will fund 1,500 affordable units by 2032.\n" +
    "Action: MDHA will preserve 500 existing units across North Nashville.\n" +
    "Number: the Barnes Fund allocation will reach $30 million per year.\n",
  "arcadia-climate":
    "The Arcadia Climate Action Plan responds to flooding and heat.\n" +
    "Goal: plant 1,000 trees per year in Antioch and Bordeaux.\n" +
    "Action: NDOT will complete 12 miles of flood-resilient greenways.\n" +
    "Target: reduce emissions 45 percent by 2035.\n",
};

// ── block 1 · ground (Void): the sample corpus, retained + digested ───────
mkdirSync(GROUND, { recursive: true });
const docs = Object.entries(PLANS).map(([id, title], i) => {
  const txt = join(GROUND, `${id}.txt`);
  writeFileSync(txt, TEXTS[id]);
  return { id, title, category: ["transit", "housing", "climate"][i], scale: "city", adopted: String(2024 + i),
    url: "sample://" + id, license: "sample — fictional document", extraction: "layout",
    pdf_sha256: "sample", txt_sha256: sha(txt), chars: TEXTS[id].length, pages: 1,
    pdfPath: txt, txtPath: txt, sidecarPath: txt + ".provenance.json", pagemapPath: txt + ".pagemap.json" };
});
const ground = { schema: "EOGround@1", digest: groundDigest({ docs }), docs };

// ── block 2 · cast (Entity/Kind) ──────────────────────────────────────────
const cast = castTexts({ texts: docs.map((d) => ({ name: d.title, text: TEXTS[d.id] })) });

// ── block 3 · extract (Link) ──────────────────────────────────────────────
const links = docs.flatMap((d) => extractLinks({ text: TEXTS[d.id], doc: `sample/ground/${d.id}.txt`, mode: "layout" }));

// ── block 4 · metrics (Field): sample snapshot, provenance-stamped ────────
// the sample metrics still need a retained byte source — same rule as the
// real instance — so the raw rows are written to a snapshot file first and
// the adapters read back out of it.
const dataDir = join(SAMPLE, "data");
mkdirSync(dataDir, { recursive: true });
const snapshotPath = join(dataDir, "snapshot.json");
const snapshotData = {
  districts: [
    { district: 1, name: "Arcadia North", population: 48_000, median_household_income: 64_500, pct_renter: 72, pct_child_poverty: 14 },
    { district: 2, name: "Arcadia South", population: 31_000, median_household_income: 52_000, pct_renter: 61, pct_child_poverty: 14 },
    { district: 3, name: "East Arcadia", population: 22_000, median_household_income: 58_000, pct_renter: 66, pct_child_poverty: 14 },
  ],
  violationsByDistrict: [
    { district: 1, open: 47, total: 120 }, { district: 2, open: 12, total: 58 }, { district: 3, open: 31, total: 96 },
  ],
  landlords: [{ landlord: "Sample Holdings LLC", properties: 240, evictions: 512 }],
  housingStress: { totalEvictionFilings: 2048, propertyRows: 5000, distinctLandlords: 900 },
};
writeFileSync(snapshotPath, JSON.stringify(snapshotData));
const snapshotText = readFileSync(snapshotPath, "utf8");
const snapshotRef = "sample/data/snapshot.json";

const metrics = foldFieldRows({
  snapshot: {},
  provenance: { dataset: "sample-fixture", source: "sample fixture — not a real city", asOf: "2026-01-01" },
  adapters: [
    { registry: "districts", run: ({ push }) => snapshotData.districts.forEach((row) =>
        push("districts", { ...row }, { district: row.district })) },
    { registry: "violations-by-district", run: ({ push }) => snapshotData.violationsByDistrict.forEach((row) =>
        push("violations-by-district", { open: row.open, total: row.total }, { district: row.district })) },
    { registry: "landlords", run: ({ push }) => snapshotData.landlords.forEach((row) => push("landlords", { ...row })) },
    { registry: "housing-stress", run: ({ push }) => push("housing-stress", { ...snapshotData.housingStress }) },
  ],
});

// every metric earns a byte ref into the retained snapshot, or a derivedFrom
// address into it — the same requirement gateSurface enforces on the real
// instance (see surface-blocks.test.mjs's syntheticMetrics()).
for (const m of metrics) {
  if (m.registry === "districts") {
    const row = snapshotData.districts.find((r) => r.district === m.district);
    const rowText = JSON.stringify(row);
    const start = snapshotText.indexOf(rowText);
    const end = start + rowText.length;
    m.at = [start, end];
    m.ref = `${snapshotRef}#${start}-${end}`;
    m.verbatim = snapshotText.slice(start, end);
  } else if (m.registry === "violations-by-district") {
    m.derivedFrom = { address: `${snapshotRef}#/violationsByDistrict`, basis: "district violation totals folded from the sample snapshot" };
  } else if (m.registry === "landlords") {
    m.derivedFrom = { address: `${snapshotRef}#/landlords`, basis: "landlord roster folded from the sample snapshot" };
  } else {
    m.derivedFrom = { address: `${snapshotRef}#/housingStress`, basis: "citywide housing-stress aggregate folded from the sample snapshot" };
  }
}
const snapshotSidecar = { path: snapshotPath, sha256: sha(snapshotPath) };

// ── block 5 · derive (Network/Paradigm/Atmosphere) ────────────────────────
const def = {
  city: "sample", name: "Sample City — Arcadia",
  topics: [
    { id: "housing", label: "Housing", queries: ["housing", "units", "barnes fund", "mdha"] },
    { id: "mobility", label: "Mobility", queries: ["transit", "mta", "bus", "lanes", "corridor"] },
    { id: "resilience", label: "Climate", queries: ["climate", "flood", "trees", "emissions", "greenways"] },
  ],
  metrics: { placeDistricts: { "East Bank": [3], "North Nashville": [1], "Antioch": [2], "Bordeaux": [1] } },
  analysis: [
    { text: "In this sample, the housing and mobility commitments overlap most in East Arcadia — a claim no sample document states; it is the model's prose." },
  ],
};
const projections = deriveProjections({ links, cast, def, metrics });

// ── block 6 · gate (Paradigm): the sample must earn its render ────────────
const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE, snapshotSidecar });
console.log("sample gate:", gate.ok ? "PASS" : "REFUSE");
for (const c of gate.checks) console.log(`  ${c.ok ? "●" : "✗"} ${c.name} · ${c.detail}`);
if (!gate.ok) { console.error("\nrefusing to render the sample — ungrounded."); process.exit(1); }
gate.source = "sample fixture";
gate.asOf = "2026-01-01";

// ── block 7 · surface (Lens): the same renderer, the same nine terrains ───
const html = renderSurface({ def, ground, links, metrics, projections, gate });
const out = join(HERE, "..", "native", "the-fold", "sample-surface.html");
writeFileSync(out, html);
console.log("\nwrote", out, (html.length / 1e6).toFixed(2), "MB");
console.log("links:", links.length, "· metrics:", metrics.length, "· networks:", projections.networks.length, "· lit places:", projections.places.filter((p) => p.state === "lit").length);