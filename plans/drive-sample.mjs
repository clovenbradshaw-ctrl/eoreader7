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
const metrics = foldFieldRows({
  snapshot: {},
  provenance: { dataset: "sample-fixture", source: "sample fixture — not a real city", asOf: "2026-01-01" },
  adapters: [
    { registry: "districts", run: ({ push }) => [
        [1, "Arcadia North", 48_000, 64_500, 72], [2, "Arcadia South", 31_000, 52_000, 61], [3, "East Arcadia", 22_000, 58_000, 66],
      ].forEach(([d, name, pop, inc, ren]) => push("districts", { district: d, name, population: pop, median_household_income: inc, pct_renter: ren, pct_child_poverty: 14 }, { district: d })) },
    { registry: "violations-by-district", run: ({ push }) => [
        [1, 47, 120], [2, 12, 58], [3, 31, 96],
      ].forEach(([d, open, total]) => push("violations-by-district", { open, total }, { district: d })) },
    { registry: "landlords", run: ({ push }) => push("landlords", { landlord: "Sample Holdings LLC", properties: 240, evictions: 512 }) },
    { registry: "housing-stress", run: ({ push }) => push("housing-stress", { totalEvictionFilings: 2048, propertyRows: 5000, distinctLandlords: 900 }) },
  ],
});

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
const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE });
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